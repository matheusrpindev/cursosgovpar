"use server";

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { gerarLinkDeRecuperacao } from "@/lib/auth/links";
import { exigirPerfil } from "@/lib/auth/sessao";
import { apagarPdfs } from "@/lib/certificados/arquivo";
import { cpfValido, somenteDigitos } from "@/lib/cpf";
import { TAG_MARCA } from "@/lib/marca";
import { TAG_ORGAOS } from "@/lib/orgaos-publicos";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaEmail, type EstadoFormulario } from "@/lib/validacao";
import { interpretarVideo } from "@/lib/video";

/**
 * Ações do administrador. Todas conferem o papel aqui, no servidor. As que
 * mexem em cursos, órgãos, certificados e marca gravam com a sessão do próprio
 * admin (a RLS confere de novo no banco). Só usam a chave de serviço as que
 * precisam criar contas, gerar links de senha ou anonimizar alguém.
 */

type Acao = Promise<EstadoFormulario>;

async function contexto() {
  const perfil = await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  return { perfil, supabase: await criarClienteServidor() };
}

const erro = (mensagem: string): EstadoFormulario => ({ status: "erro", mensagem });
const sucesso = (mensagem: string, valores?: Record<string, string>): EstadoFormulario => ({ status: "sucesso", mensagem, valores });
const invalido = (e: z.ZodError) => erro(e.issues[0]?.message ?? "Confira os dados informados.");

function falha(contextoDoErro: string, e: { code?: string; message: string }): EstadoFormulario {
  console.error(`[admin] ${contextoDoErro}`, e.code, e.message);
  if (e.code === "42501") return erro("Você não tem permissão para esta alteração.");
  return erro("Não foi possível salvar agora. Tente novamente.");
}

const texto = (fd: FormData, campo: string) => {
  const valor = fd.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
};
const uuid = (fd: FormData, campo: string) => {
  const r = z.uuid().safeParse(fd.get(campo));
  return r.success ? r.data : null;
};

// ------------------------------------------------------------------ imagens

const EXTENSOES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Envia uma imagem ao Storage. Devolve o caminho, null (nenhum arquivo) ou uma mensagem de erro. */
async function enviarImagem(
  supabase: Cliente,
  fd: FormData,
  campo: string,
  opcoes: { bucket: string; prefixo: string; tipos: string[]; maxMb: number },
): Promise<{ caminho: string | null } | { erro: string }> {
  const arquivo = fd.get(campo);
  if (!(arquivo instanceof File) || arquivo.size === 0) return { caminho: null };
  if (!opcoes.tipos.includes(arquivo.type)) {
    return { erro: `Formato de imagem não aceito. Use ${opcoes.tipos.map((t) => EXTENSOES[t].toUpperCase()).join(", ")}.` };
  }
  if (arquivo.size > opcoes.maxMb * 1024 * 1024) return { erro: `A imagem pode ter no máximo ${opcoes.maxMb} MB.` };

  const caminho = `${opcoes.prefixo}-${Date.now()}.${EXTENSOES[arquivo.type]}`;
  const { error } = await supabase.storage.from(opcoes.bucket).upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) {
    console.error("[admin] falha no envio de imagem", error.message);
    return { erro: "Não foi possível enviar a imagem. Tente novamente." };
  }
  return { caminho };
}

// ------------------------------------------------------------------- cursos

const esquemaCurso = z.object({
  titulo: z.string().min(3, "Informe o título do curso (3 letras ou mais).").max(200, "Título muito longo."),
  descricao: z.string().max(5000, "Descrição muito longa."),
  cargaHoraria: z
    .string()
    .transform((v) => Number(v.replace(",", ".")))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 10000, "Informe a carga horária em horas (ex.: 8 ou 1,5)."),
});

export async function salvarCurso(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const dados = esquemaCurso.safeParse({
    titulo: texto(fd, "titulo"),
    descricao: texto(fd, "descricao"),
    cargaHoraria: texto(fd, "cargaHoraria"),
  });
  if (!dados.success) return invalido(dados.error);

  const id = uuid(fd, "cursoId");
  const capa = await enviarImagem(supabase, fd, "capa", {
    bucket: "cursos",
    prefixo: "capa",
    tipos: ["image/png", "image/jpeg", "image/webp"],
    maxMb: 4,
  });
  if ("erro" in capa) return erro(capa.erro);

  const campos = {
    titulo: dados.data.titulo,
    descricao: dados.data.descricao,
    carga_horaria: Math.round(dados.data.cargaHoraria * 10) / 10,
    ...(capa.caminho ? { capa_path: capa.caminho } : fd.get("removerCapa") === "on" ? { capa_path: null } : {}),
  };

  if (!id) {
    const { data, error } = await supabase.from("cursos").insert(campos).select("id").single();
    if (error) return falha("criar curso", error);
    redirect(`/admin/cursos/${data.id}`);
  }
  const { error } = await supabase.from("cursos").update(campos).eq("id", id);
  if (error) return falha("salvar curso", error);
  refresh();
  return sucesso("Curso salvo.");
}

export async function mudarStatusCurso(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "cursoId");
  const publicar = fd.get("status") === "publicado";
  if (!id) return erro("Curso inválido.");

  if (publicar) {
    const { count } = await supabase.from("aulas").select("id", { count: "exact", head: true }).eq("curso_id", id);
    if (!count) return erro("Adicione pelo menos uma aula antes de publicar.");
  }
  const { error } = await supabase.from("cursos").update({ status: publicar ? "publicado" : "rascunho" }).eq("id", id);
  if (error) return falha("mudar status do curso", error);
  refresh();
  return sucesso(publicar ? "Curso publicado." : "Curso voltou para rascunho: os alunos deixam de vê-lo.");
}

export async function excluirCurso(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "cursoId");
  if (!id) return erro("Curso inválido.");
  const { error } = await supabase.from("cursos").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return erro("Este curso já tem certificados emitidos e não pode ser excluído. Volte-o para rascunho para escondê-lo.");
    }
    return falha("excluir curso", error);
  }
  redirect("/admin/cursos");
}

const esquemaAula = z.object({
  titulo: z.string().min(3, "Informe o título da aula (3 letras ou mais).").max(200, "Título muito longo."),
  descricao: z.string().max(5000, "Descrição muito longa."),
});

export async function salvarAula(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const cursoId = uuid(fd, "cursoId");
  if (!cursoId) return erro("Curso inválido.");
  const dados = esquemaAula.safeParse({ titulo: texto(fd, "titulo"), descricao: texto(fd, "descricao") });
  if (!dados.success) return invalido(dados.error);
  const video = interpretarVideo(texto(fd, "video"));
  if (!video) return erro("Não reconheci o link do vídeo. Cole o link do YouTube ou do Vimeo como aparece no navegador.");

  const campos = {
    titulo: dados.data.titulo,
    descricao: dados.data.descricao,
    video_provedor: video.provedor,
    video_id: video.id,
    video_hash: video.hash,
    exigir_video_completo: fd.get("exigirVideoCompleto") === "on",
  };

  const aulaId = uuid(fd, "aulaId");
  if (aulaId) {
    const { error } = await supabase.from("aulas").update(campos).eq("id", aulaId).eq("curso_id", cursoId);
    if (error) return falha("salvar aula", error);
    refresh();
    return sucesso("Aula salva.");
  }

  const { data: ultima } = await supabase
    .from("aulas")
    .select("ordem")
    .eq("curso_id", cursoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("aulas").insert({ ...campos, curso_id: cursoId, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return falha("criar aula", error);
  refresh();
  return sucesso("Aula adicionada.");
}

export async function excluirAula(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "aulaId");
  if (!id) return erro("Aula inválida.");
  const { error } = await supabase.from("aulas").delete().eq("id", id);
  if (error) return falha("excluir aula", error);
  refresh();
  return sucesso("Aula excluída.");
}

export async function moverAula(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "aulaId");
  if (!id) return erro("Aula inválida.");
  const { error } = await supabase.rpc("mover_aula", { p_aula: id, p_sobe: fd.get("direcao") === "sobe" });
  if (error) return falha("mover aula", error);
  refresh();
  return { status: "sucesso" };
}

/** Define para quais órgãos o curso está liberado (caixas marcadas no formulário). */
export async function salvarLiberacoes(_: EstadoFormulario, fd: FormData): Acao {
  const { perfil, supabase } = await contexto();
  const cursoId = uuid(fd, "cursoId");
  if (!cursoId) return erro("Curso inválido.");
  const marcados = new Set(fd.getAll("orgao").filter((v): v is string => typeof v === "string" && z.uuid().safeParse(v).success));

  const { data: atuais, error } = await supabase.from("organizacao_cursos").select("organizacao_id").eq("curso_id", cursoId);
  if (error) return falha("ler liberações", error);
  const jaLiberados = new Set((atuais ?? []).map((a) => a.organizacao_id));

  const adicionar = [...marcados].filter((id) => !jaLiberados.has(id));
  const remover = [...jaLiberados].filter((id) => !marcados.has(id));

  if (adicionar.length) {
    const r = await supabase
      .from("organizacao_cursos")
      .insert(adicionar.map((organizacao_id) => ({ organizacao_id, curso_id: cursoId, liberado_por: perfil.id })));
    if (r.error) return falha("liberar curso", r.error);
  }
  if (remover.length) {
    const r = await supabase.from("organizacao_cursos").delete().eq("curso_id", cursoId).in("organizacao_id", remover);
    if (r.error) return falha("remover liberação", r.error);
  }
  refresh();
  return sucesso("Liberações salvas.");
}

// ------------------------------------------------------------------- órgãos

function gerarSlug(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function salvarOrgao(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const nome = texto(fd, "nome").replace(/\s+/g, " ");
  if (nome.length < 2 || nome.length > 200) return erro("Informe o nome do órgão.");
  const slug = gerarSlug(texto(fd, "slug") || nome);
  if (!slug) return erro("Informe um endereço de cadastro com letras ou números.");

  const id = uuid(fd, "orgaoId");
  const { error } = id
    ? await supabase.from("organizacoes").update({ nome, slug }).eq("id", id)
    : await supabase.from("organizacoes").insert({ nome, slug });
  if (error) {
    if (error.code === "23505") return erro("Já existe um órgão com este endereço de cadastro. Escolha outro.");
    return falha("salvar órgão", error);
  }
  updateTag(TAG_ORGAOS);
  refresh();
  return sucesso(id ? "Órgão salvo." : "Órgão criado. O link de cadastro já está funcionando.");
}

export async function alternarOrgao(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "orgaoId");
  if (!id) return erro("Órgão inválido.");
  const ativar = fd.get("ativo") === "true";
  const { error } = await supabase.from("organizacoes").update({ ativo: ativar }).eq("id", id);
  if (error) return falha("alternar órgão", error);
  updateTag(TAG_ORGAOS);
  refresh();
  return sucesso(ativar ? "Órgão reativado." : "Órgão inativado: ninguém dele acessa os cursos até ser reativado.");
}

// ------------------------------------------------------------------ pessoas

const esquemaGestor = z.object({
  nome: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(3, "Informe o nome completo.").max(160, "Nome muito longo.")),
  email: esquemaEmail,
  cpf: z.string().transform(somenteDigitos).refine(cpfValido, "CPF inválido. Confira os números."),
});

/**
 * Cria a conta de um gestor (já aprovada) e devolve o link para ele definir a
 * senha. O link aparece na tela para o admin enviar pelo canal que preferir.
 */
export async function convidarGestor(_: EstadoFormulario, fd: FormData): Acao {
  await contexto();
  const orgaoId = uuid(fd, "orgaoId");
  if (!orgaoId) return erro("Escolha o órgão.");
  const dados = esquemaGestor.safeParse({ nome: texto(fd, "nome"), email: texto(fd, "email"), cpf: texto(fd, "cpf") });
  if (!dados.success) return invalido(dados.error);

  const admin = criarClienteAdmin();
  const { count: cpfEmUso } = await admin
    .from("perfis_privados")
    .select("perfil_id", { count: "exact", head: true })
    .eq("cpf", dados.data.cpf);
  if (cpfEmUso) return erro("Este CPF já está cadastrado.");

  const { error } = await admin.auth.admin.createUser({
    email: dados.data.email,
    password: `${randomBytes(18).toString("base64url")}a1`,
    email_confirm: true,
    user_metadata: { nome: dados.data.nome, cpf: dados.data.cpf },
    app_metadata: { papel: "gestor", organizacao_id: orgaoId },
  });
  if (error) {
    if (error.code === "email_exists") return erro("Este e-mail já está cadastrado.");
    console.error("[admin] falha ao criar gestor", error.code, error.message);
    return erro("Não foi possível criar a conta. Confira se o órgão está ativo e tente novamente.");
  }

  const link = await gerarLinkDeRecuperacao(dados.data.email);
  refresh();
  return sucesso(`Conta de ${dados.data.nome} criada. Envie a ele(a) o link abaixo para definir a senha:`, { link: link ?? "" });
}

/** Gera um link para a pessoa definir uma nova senha (útil quando o e-mail não chega). */
export async function gerarLinkDeSenha(_: EstadoFormulario, fd: FormData): Acao {
  await contexto();
  const id = uuid(fd, "perfilId");
  if (!id) return erro("Pessoa inválida.");
  const { data: alvo } = await criarClienteAdmin().from("perfis").select("nome, email, anonimizado_em").eq("id", id).maybeSingle();
  if (!alvo || alvo.anonimizado_em) return erro("Pessoa não encontrada.");
  const link = await gerarLinkDeRecuperacao(alvo.email);
  if (!link) return erro("Não foi possível gerar o link.");
  return sucesso(`Link para ${alvo.nome} definir uma nova senha (vale por pouco tempo e só uma vez):`, { link });
}

/** Desativa ou reativa o acesso de qualquer pessoa (aluno ou gestor). */
export async function mudarAcessoDaPessoa(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "perfilId");
  const para = fd.get("para") === "aprovado" ? "aprovado" : "desativado";
  if (!id) return erro("Pessoa inválida.");
  const { data, error } = await supabase
    .from("perfis")
    .update({ status: para })
    .eq("id", id)
    .neq("papel", "admin")
    .is("anonimizado_em", null)
    .select("nome")
    .maybeSingle();
  if (error) return falha("mudar acesso", error);
  if (!data) return erro("Pessoa não encontrada.");
  refresh();
  return sucesso(para === "aprovado" ? `O acesso de ${data.nome} foi liberado.` : `O acesso de ${data.nome} foi desativado.`);
}

/**
 * LGPD: remove os dados pessoais de alguém. O nome, o e-mail e o CPF são
 * apagados, a conta é bloqueada e os certificados (que carregam o nome) são
 * excluídos. O progresso fica, sem ligação com uma pessoa identificável.
 */
export async function anonimizarPessoa(_: EstadoFormulario, fd: FormData): Acao {
  const { perfil } = await contexto();
  const id = uuid(fd, "perfilId");
  if (!id || id === perfil.id) return erro("Pessoa inválida.");

  const admin = criarClienteAdmin();
  const { data: alvo } = await admin.from("perfis").select("id, papel, organizacao_id, anonimizado_em").eq("id", id).maybeSingle();
  if (!alvo || alvo.papel === "admin") return erro("Esta pessoa não pode ser anonimizada por aqui.");
  if (alvo.anonimizado_em) return erro("Esta pessoa já foi anonimizada.");

  const emailAnonimo = `anonimo-${id}@anonimizado.invalid`;
  const conta = await admin.auth.admin.updateUserById(id, {
    email: emailAnonimo,
    password: `${randomBytes(24).toString("base64url")}a1`,
    email_confirm: true,
    user_metadata: { nome: "Pessoa anonimizada", cpf: null },
    ban_duration: "876000h",
  });
  if (conta.error) return falha("anonimizar conta", conta.error);

  const { data: certificados } = await admin.from("certificados").select("id, pdf_path").eq("perfil_id", id);
  await apagarPdfs((certificados ?? []).map((c) => c.pdf_path).filter((c): c is string => Boolean(c)));

  const passos = await Promise.all([
    admin.from("certificados").delete().eq("perfil_id", id),
    admin.from("perfis_privados").update({ cpf: null }).eq("perfil_id", id),
    admin
      .from("perfis")
      .update({
        nome: "Pessoa anonimizada",
        email: emailAnonimo,
        cpf_mascarado: null,
        motivo_recusa: null,
        status: "desativado",
        anonimizado_em: new Date().toISOString(),
      })
      .eq("id", id),
  ]);
  const comErro = passos.find((p) => p.error);
  if (comErro?.error) return falha("anonimizar perfil", comErro.error);

  await admin.from("auditoria").insert({
    ator_id: perfil.id,
    acao: "anonimizou_pessoa",
    alvo_perfil_id: id,
    organizacao_id: alvo.organizacao_id,
    detalhes: { certificados_excluidos: certificados?.length ?? 0 },
  });
  refresh();
  return sucesso("Dados pessoais removidos. A conta foi bloqueada e os certificados dela foram excluídos.");
}

// ------------------------------------------------------------- certificados

export async function revogarCertificado(_: EstadoFormulario, fd: FormData): Acao {
  const { supabase } = await contexto();
  const id = uuid(fd, "certificadoId");
  if (!id) return erro("Certificado inválido.");
  const motivo = texto(fd, "motivo").slice(0, 500);
  const { data, error } = await supabase
    .from("certificados")
    .update({ revogado_em: new Date().toISOString(), motivo_revogacao: motivo || null })
    .eq("id", id)
    .is("revogado_em", null)
    .select("codigo")
    .maybeSingle();
  if (error) return falha("revogar certificado", error);
  if (!data) return erro("Este certificado já estava revogado.");
  refresh();
  return sucesso(`Certificado ${data.codigo} revogado. A validação pública passa a mostrar que ele não é mais válido.`);
}

// -------------------------------------------------------------------- marca

const cor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida.");

const esquemaMarca = z.object({
  nome_plataforma: z.string().min(2, "Informe o nome da plataforma.").max(80, "Nome da plataforma muito longo."),
  nome_empresa: z.string().max(160, "Nome da empresa muito longo."),
  cor_primaria: cor,
  cor_secundaria: cor,
  texto_rodape: z.string().max(500, "Texto do rodapé muito longo."),
  email_contato: z.union([z.literal(""), esquemaEmail]),
});

export async function salvarMarca(_: EstadoFormulario, fd: FormData): Acao {
  const { perfil, supabase } = await contexto();
  const dados = esquemaMarca.safeParse({
    nome_plataforma: texto(fd, "nome_plataforma"),
    nome_empresa: texto(fd, "nome_empresa"),
    cor_primaria: texto(fd, "cor_primaria"),
    cor_secundaria: texto(fd, "cor_secundaria"),
    texto_rodape: texto(fd, "texto_rodape"),
    email_contato: texto(fd, "email_contato"),
  });
  if (!dados.success) return invalido(dados.error);

  const logo = await enviarImagem(supabase, fd, "logo", {
    bucket: "marca",
    prefixo: "logo",
    tipos: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
    maxMb: 2,
  });
  if ("erro" in logo) return erro(logo.erro);

  const { error } = await supabase
    .from("configuracoes")
    .update({
      ...dados.data,
      email_contato: dados.data.email_contato || null,
      cadastro_lista_publica: fd.get("cadastro_lista_publica") === "on",
      ...(logo.caminho ? { logo_path: logo.caminho } : fd.get("removerLogo") === "on" ? { logo_path: null } : {}),
      atualizado_por: perfil.id,
    })
    .eq("id", 1);
  if (error) return falha("salvar marca", error);
  updateTag(TAG_MARCA);
  refresh();
  return sucesso("Marca salva. As mudanças já valem para todo o site.");
}

const esquemaCertificado = z.object({
  cert_titulo: z.string().min(3, "Informe o título do certificado.").max(120, "Título muito longo."),
  cert_frase: z
    .string()
    .min(20, "Escreva a frase do certificado.")
    .max(1000, "Frase muito longa.")
    .refine((v) => v.includes("{nome}") && v.includes("{curso}"), "A frase precisa conter pelo menos {nome} e {curso}."),
  cert_responsavel_nome: z.string().max(160),
  cert_responsavel_cargo: z.string().max(160),
  cert_prefixo_codigo: z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{1,6}$/, "O prefixo do código usa de 1 a 6 letras ou números.")),
});

export async function salvarModeloDoCertificado(_: EstadoFormulario, fd: FormData): Acao {
  const { perfil, supabase } = await contexto();
  const dados = esquemaCertificado.safeParse({
    cert_titulo: texto(fd, "cert_titulo"),
    cert_frase: texto(fd, "cert_frase"),
    cert_responsavel_nome: texto(fd, "cert_responsavel_nome"),
    cert_responsavel_cargo: texto(fd, "cert_responsavel_cargo"),
    cert_prefixo_codigo: texto(fd, "cert_prefixo_codigo"),
  });
  if (!dados.success) return invalido(dados.error);

  const assinatura = await enviarImagem(supabase, fd, "assinatura", {
    bucket: "assinaturas",
    prefixo: "assinatura",
    tipos: ["image/png", "image/jpeg"],
    maxMb: 1,
  });
  if ("erro" in assinatura) return erro(assinatura.erro);

  const { error } = await supabase
    .from("configuracoes")
    .update({
      ...dados.data,
      cert_cpf_completo: fd.get("cert_cpf_completo") === "on",
      ...(assinatura.caminho
        ? { cert_assinatura_path: assinatura.caminho }
        : fd.get("removerAssinatura") === "on"
          ? { cert_assinatura_path: null }
          : {}),
      atualizado_por: perfil.id,
    })
    .eq("id", 1);
  if (error) return falha("salvar modelo do certificado", error);
  refresh();
  return sucesso("Modelo salvo. Vale para os próximos certificados; os já emitidos não mudam.");
}

export async function salvarTextosLegais(_: EstadoFormulario, fd: FormData): Acao {
  const { perfil, supabase } = await contexto();
  const termos = texto(fd, "termos_uso");
  const politica = texto(fd, "politica_privacidade");
  if (termos.length > 50000 || politica.length > 50000) return erro("Texto muito longo.");
  const { error } = await supabase
    .from("configuracoes")
    .update({ termos_uso: termos, politica_privacidade: politica, atualizado_por: perfil.id })
    .eq("id", 1);
  if (error) return falha("salvar textos legais", error);
  updateTag(TAG_MARCA);
  refresh();
  return sucesso("Textos salvos. Se o conteúdo mudou, todos vão aceitar a nova versão no próximo acesso.");
}
