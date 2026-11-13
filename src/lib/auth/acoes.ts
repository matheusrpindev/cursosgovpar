"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { EmailConfirmacaoCadastro } from "@/lib/email/modelos/confirmacao-cadastro";
import { EmailRecuperacaoSenha } from "@/lib/email/modelos/recuperacao-senha";
import { enviarEmail } from "@/lib/email/enviar";
import { modoDemonstracao } from "@/lib/demo";
import { obterMarca } from "@/lib/marca";
import { avisarGestoresDoPedido } from "@/lib/notificacoes";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import {
  errosDeCampo,
  esquemaCadastro,
  esquemaNovaSenha,
  esquemaReenvio,
  esquemaSoEmail,
  type EstadoFormulario,
} from "@/lib/validacao";
import { gerarLinkDeConfirmacao, gerarLinkDeRecuperacao } from "./links";

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

async function enviarConfirmacao(email: string, nome: string, orgao: string) {
  const [marca, link] = await Promise.all([obterMarca(), gerarLinkDeConfirmacao(email)]);
  await enviarEmail({
    para: email,
    assunto: `Confirme seu e-mail — ${marca.nomePlataforma}`,
    conteudo: EmailConfirmacaoCadastro({ marca, nome, orgao, link }),
  });
}

/**
 * Cadastro de aluno. A conta é criada pelo servidor (o cadastro público do
 * Supabase fica desligado) e nasce como aluno pendente: papel e status são
 * decididos pelo banco. CPF e órgão são validados aqui e de novo no banco.
 */
export async function cadastrar(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = {
    nome: texto(formData, "nome"),
    cpf: texto(formData, "cpf"),
    email: texto(formData, "email"),
    aceite: texto(formData, "aceite"),
  };
  const resultado = esquemaCadastro.safeParse({
    slug: texto(formData, "slug"),
    nome: valores.nome,
    cpf: valores.cpf,
    email: valores.email,
    senha: texto(formData, "senha"),
    confirmacaoSenha: texto(formData, "confirmacaoSenha"),
    aceite: formData.get("aceite") ?? undefined,
  });
  if (!resultado.success) {
    return { status: "erro", erros: errosDeCampo(resultado.error), valores };
  }
  const dados = resultado.data;
  const admin = criarClienteAdmin();

  const { data: orgao } = await admin
    .from("organizacoes")
    .select("id, nome")
    .eq("slug", dados.slug)
    .eq("ativo", true)
    .maybeSingle();
  if (!orgao) {
    return { status: "erro", mensagem: "Este link de cadastro não é válido ou o órgão está inativo.", valores };
  }

  const { count: cpfEmUso } = await admin
    .from("perfis_privados")
    .select("perfil_id", { count: "exact", head: true })
    .eq("cpf", dados.cpf);
  if (cpfEmUso) {
    return {
      status: "erro",
      erros: { cpf: ["Este CPF já está cadastrado. Se você esqueceu a senha, use “Esqueci minha senha”."] },
      valores,
    };
  }

  const { error } = await admin.auth.admin.createUser({
    email: dados.email,
    password: dados.senha,
    // Na demonstração não há envio de e-mail: a conta já nasce confirmada.
    email_confirm: modoDemonstracao(),
    user_metadata: { nome: dados.nome, cpf: dados.cpf, aceite_termos: true },
    app_metadata: { papel: "aluno", organizacao_id: orgao.id },
  });
  if (error) {
    if (error.code === "email_exists") {
      return { status: "erro", erros: { email: ["Este e-mail já está cadastrado."] }, valores };
    }
    if (error.code === "weak_password") {
      return { status: "erro", erros: { senha: ["Senha fraca. Use letras e números, com 8 ou mais caracteres."] }, valores };
    }
    console.error("[cadastro] falha ao criar usuário", error.code, error.message);
    return { status: "erro", mensagem: "Não foi possível concluir o cadastro. Tente novamente em instantes.", valores };
  }

  if (modoDemonstracao()) redirect("/entrar?cadastro=demo");

  try {
    await enviarConfirmacao(dados.email, dados.nome, orgao.nome);
  } catch (erro) {
    // A conta existe; a pessoa pode pedir o reenvio na próxima tela.
    console.error("[cadastro] falha ao enviar confirmação", erro);
  }

  redirect("/cadastro/enviado");
}

const MENSAGEM_REENVIO =
  "Se houver um cadastro aguardando confirmação para este e-mail, enviamos um novo link. Confira também a caixa de spam.";

/** Reenvia o link de confirmação. A resposta é sempre a mesma (não revela quem tem cadastro). */
export async function reenviarConfirmacao(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const resultado = esquemaSoEmail.safeParse({ email: texto(formData, "email") });
  if (!resultado.success) {
    return { status: "erro", erros: errosDeCampo(resultado.error), valores: { email: texto(formData, "email") } };
  }
  const { email } = resultado.data;

  const { data: perfil } = await criarClienteAdmin()
    .from("perfis")
    .select("nome, email_confirmado_em, organizacoes ( nome )")
    .eq("email", email)
    .maybeSingle();

  if (perfil && !perfil.email_confirmado_em) {
    try {
      await enviarConfirmacao(email, perfil.nome, perfil.organizacoes?.nome ?? "seu órgão");
    } catch (erro) {
      console.error("[reenvio] falha ao enviar confirmação", erro);
    }
  }
  return { status: "sucesso", mensagem: MENSAGEM_REENVIO };
}

const MENSAGEM_RECUPERACAO =
  "Se este e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.";

/** Envia o link de redefinição de senha. Resposta sempre igual (não revela quem tem cadastro). */
export async function solicitarRecuperacao(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const resultado = esquemaSoEmail.safeParse({ email: texto(formData, "email") });
  if (!resultado.success) {
    return { status: "erro", erros: errosDeCampo(resultado.error), valores: { email: texto(formData, "email") } };
  }
  const { email } = resultado.data;

  try {
    const { data: perfil } = await criarClienteAdmin()
      .from("perfis")
      .select("nome, anonimizado_em")
      .eq("email", email)
      .maybeSingle();
    if (perfil && !perfil.anonimizado_em) {
      const link = await gerarLinkDeRecuperacao(email);
      if (link) {
        const marca = await obterMarca();
        await enviarEmail({
          para: email,
          assunto: `Redefinição de senha — ${marca.nomePlataforma}`,
          conteudo: EmailRecuperacaoSenha({ marca, nome: perfil.nome, link }),
        });
      }
    }
  } catch (erro) {
    console.error("[recuperacao] falha", erro);
  }
  return { status: "sucesso", mensagem: MENSAGEM_RECUPERACAO };
}

/** Define a nova senha. Exige a sessão criada pelo link de recuperação. */
export async function redefinirSenha(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const resultado = esquemaNovaSenha.safeParse({
    senha: texto(formData, "senha"),
    confirmacaoSenha: texto(formData, "confirmacaoSenha"),
  });
  if (!resultado.success) {
    return { status: "erro", erros: errosDeCampo(resultado.error) };
  }

  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { status: "erro", mensagem: "Sua sessão expirou. Peça um novo link de redefinição de senha." };
  }

  const { error } = await supabase.auth.updateUser({ password: resultado.data.senha });
  if (error) {
    if (error.code === "same_password") {
      return { status: "erro", erros: { senha: ["A nova senha precisa ser diferente da anterior."] } };
    }
    if (error.code === "weak_password") {
      return { status: "erro", erros: { senha: ["Senha fraca. Use letras e números, com 8 ou mais caracteres."] } };
    }
    console.error("[redefinir-senha] falha", error.code, error.message);
    return { status: "erro", mensagem: "Não foi possível alterar a senha. Tente novamente." };
  }
  redirect("/painel");
}

/** Registra o aceite da versão atual dos termos de uso e da política de privacidade. */
export async function aceitarTermos(formData: FormData): Promise<void> {
  if (formData.get("aceite") !== "on") redirect("/aceitar-termos");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("aceitar_termos_atuais");
  if (error) {
    console.error("[termos] falha ao registrar aceite", error.message);
    redirect("/entrar");
  }
  redirect("/painel");
}

const ERROS_REENVIO: Record<string, string> = {
  AP001: "Você já reenviou a solicitação 3 vezes. Fale com o responsável no seu órgão.",
  AP002: "Não encontramos este órgão ou ele está inativo. Confira o link com o responsável no órgão.",
  AP003: "Informe nome e sobrenome.",
  AP004: "Seu cadastro não está recusado, então não precisa ser reenviado.",
};

/** O aluno recusado corrige o nome (e, se for o caso, o órgão) e reenvia o pedido. */
export async function reenviarSolicitacao(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const valores = { nome: texto(formData, "nome"), linkOrgao: texto(formData, "linkOrgao") };
  const resultado = esquemaReenvio.safeParse(valores);
  if (!resultado.success) {
    return { status: "erro", erros: errosDeCampo(resultado.error), valores };
  }

  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const usuarioId = claims?.claims?.sub;
  if (!usuarioId) redirect("/entrar");

  const { error } = await supabase.rpc("reenviar_solicitacao", {
    p_nome: resultado.data.nome,
    p_slug: resultado.data.linkOrgao || undefined,
  });
  if (error) {
    const mensagem = ERROS_REENVIO[error.code ?? ""];
    if (!mensagem) console.error("[reenvio] falha", error.code, error.message);
    return { status: "erro", mensagem: mensagem ?? "Não foi possível reenviar agora. Tente novamente.", valores };
  }

  after(() => avisarGestoresDoPedido(usuarioId));
  refresh();
  return { status: "sucesso", mensagem: "Solicitação reenviada." };
}
