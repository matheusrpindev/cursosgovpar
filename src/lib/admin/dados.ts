import "server-only";
import type { Papel, StatusPerfil } from "@/lib/auth/sessao";
import { urlDaCapa } from "@/lib/cursos/dados";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Consultas do painel do admin. Usam a sessão do admin: a RLS libera tudo só para ele. */

/* eslint-disable @typescript-eslint/no-explicit-any -- construtor de consulta genérico, só para contagens */
async function contar(tabela: "organizacoes" | "cursos" | "certificados" | "perfis", filtro: (q: any) => any) {
  const supabase = await criarClienteServidor();
  const { count } = await filtro(supabase.from(tabela).select("*", { count: "exact", head: true }));
  return (count as number | null) ?? 0;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function obterVisaoGeral() {
  const supabase = await criarClienteServidor();
  const [orgaos, cursosPublicados, rascunhos, alunos, gestores, pendentes, certificados, recentes] = await Promise.all([
    contar("organizacoes", (q) => q.eq("ativo", true)),
    contar("cursos", (q) => q.eq("status", "publicado")),
    contar("cursos", (q) => q.eq("status", "rascunho")),
    contar("perfis", (q) => q.eq("papel", "aluno").eq("status", "aprovado")),
    contar("perfis", (q) => q.eq("papel", "gestor").eq("status", "aprovado")),
    contar("perfis", (q) => q.eq("papel", "aluno").eq("status", "pendente")),
    contar("certificados", (q) => q.is("revogado_em", null)),
    supabase
      .from("auditoria")
      .select("id, acao, criado_em, ator:perfis!auditoria_ator_id_fkey ( nome ), alvo:perfis!auditoria_alvo_perfil_id_fkey ( nome ), organizacoes ( nome )")
      .order("criado_em", { ascending: false })
      .limit(12),
  ]);
  return {
    orgaos,
    cursosPublicados,
    rascunhos,
    alunos,
    gestores,
    pendentes,
    certificados,
    recentes: (recentes.data ?? []).map((e) => ({
      id: e.id,
      acao: e.acao,
      criadoEm: e.criado_em,
      ator: e.ator?.nome ?? "Sistema",
      alvo: e.alvo?.nome ?? null,
      orgao: e.organizacoes?.nome ?? null,
    })),
  };
}

export type CursoAdmin = {
  id: string;
  titulo: string;
  status: "rascunho" | "publicado";
  cargaHoraria: number;
  capaUrl: string | null;
  totalAulas: number;
  totalOrgaos: number;
};

export async function listarCursosAdmin(): Promise<CursoAdmin[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("cursos")
    .select("id, titulo, status, carga_horaria, capa_path, aulas ( video_provedor, video_id, ordem ), organizacao_cursos ( organizacao_id )")
    .order("titulo");
  if (error) throw new Error(`Falha ao listar cursos: ${error.message}`);
  return (data ?? []).map((c) => {
    const aulas = [...c.aulas].sort((a, b) => a.ordem - b.ordem).map((a) => ({ provedor: a.video_provedor, videoId: a.video_id }));
    return {
      id: c.id,
      titulo: c.titulo,
      status: c.status,
      cargaHoraria: Number(c.carga_horaria),
      capaUrl: urlDaCapa(supabase, c.capa_path, aulas),
      totalAulas: aulas.length,
      totalOrgaos: c.organizacao_cursos.length,
    };
  });
}

export async function obterCursoAdmin(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await criarClienteServidor();
  const [{ data: curso }, { data: orgaos }] = await Promise.all([
    supabase
      .from("cursos")
      .select(
        "id, titulo, descricao, status, carga_horaria, capa_path, aulas ( id, titulo, descricao, video_provedor, video_id, video_hash, exigir_video_completo, ordem ), organizacao_cursos ( organizacao_id )",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("organizacoes").select("id, nome, ativo").order("nome"),
  ]);
  if (!curso) return null;
  const aulas = [...curso.aulas].sort((a, b) => a.ordem - b.ordem);
  return {
    id: curso.id,
    titulo: curso.titulo,
    descricao: curso.descricao,
    status: curso.status,
    cargaHoraria: Number(curso.carga_horaria),
    capaUrl: curso.capa_path ? supabase.storage.from("cursos").getPublicUrl(curso.capa_path).data.publicUrl : null,
    aulas,
    liberados: new Set(curso.organizacao_cursos.map((o) => o.organizacao_id)),
    orgaos: orgaos ?? [],
  };
}

export async function listarOrgaosAdmin() {
  const supabase = await criarClienteServidor();
  const [{ data: orgaos, error }, { data: perfis }] = await Promise.all([
    supabase.from("organizacoes").select("id, nome, slug, ativo, criado_em, organizacao_cursos ( curso_id )").order("nome"),
    supabase.from("perfis").select("organizacao_id, papel, status").not("organizacao_id", "is", null).limit(5000),
  ]);
  if (error) throw new Error(`Falha ao listar órgãos: ${error.message}`);
  return (orgaos ?? []).map((o) => {
    const pessoas = (perfis ?? []).filter((p) => p.organizacao_id === o.id);
    return {
      id: o.id,
      nome: o.nome,
      slug: o.slug,
      ativo: o.ativo,
      cursos: o.organizacao_cursos.length,
      gestores: pessoas.filter((p) => p.papel === "gestor" && p.status === "aprovado").length,
      alunos: pessoas.filter((p) => p.papel === "aluno" && p.status === "aprovado").length,
      pendentes: pessoas.filter((p) => p.papel === "aluno" && p.status === "pendente").length,
    };
  });
}

export const PESSOAS_POR_PAGINA = 30;

export type PessoaAdmin = {
  id: string;
  nome: string;
  email: string;
  cpfMascarado: string | null;
  papel: Papel;
  status: StatusPerfil;
  orgao: string | null;
  anonimizada: boolean;
};

export async function listarPessoasAdmin(opcoes: { busca: string; orgaoId: string; pagina: number }) {
  const supabase = await criarClienteServidor();
  const inicio = (opcoes.pagina - 1) * PESSOAS_POR_PAGINA;
  let consulta = supabase
    .from("perfis")
    .select("id, nome, email, cpf_mascarado, papel, status, anonimizado_em, organizacoes ( nome )", { count: "exact" })
    .order("nome")
    .range(inicio, inicio + PESSOAS_POR_PAGINA - 1);
  if (/^[0-9a-f-]{36}$/i.test(opcoes.orgaoId)) consulta = consulta.eq("organizacao_id", opcoes.orgaoId);
  const busca = opcoes.busca.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (busca) consulta = consulta.or(`nome.ilike.*${busca}*,email.ilike.*${busca}*`);

  const [{ data, count, error }, { data: orgaos }] = await Promise.all([
    consulta,
    supabase.from("organizacoes").select("id, nome, ativo").order("nome"),
  ]);
  if (error) throw new Error(`Falha ao listar pessoas: ${error.message}`);
  return {
    total: count ?? 0,
    orgaos: orgaos ?? [],
    pessoas: (data ?? []).map(
      (p): PessoaAdmin => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        cpfMascarado: p.cpf_mascarado,
        papel: p.papel,
        status: p.status,
        orgao: p.organizacoes?.nome ?? null,
        anonimizada: Boolean(p.anonimizado_em),
      }),
    ),
  };
}

export async function listarCertificadosAdmin() {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("certificados")
    .select("id, codigo, dados, emitido_em, revogado_em, motivo_revogacao")
    .order("emitido_em", { ascending: false })
    .limit(300);
  if (error) throw new Error(`Falha ao listar certificados: ${error.message}`);
  return (data ?? []).map((c) => {
    const dados = (c.dados ?? {}) as { nome?: string; curso?: string; orgao?: string };
    return {
      id: c.id,
      codigo: c.codigo,
      nome: dados.nome ?? "—",
      curso: dados.curso ?? "—",
      orgao: dados.orgao ?? "—",
      emitidoEm: c.emitido_em,
      revogadoEm: c.revogado_em,
      motivo: c.motivo_revogacao,
    };
  });
}

export async function obterConfiguracoes() {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  if (error) throw new Error(`Falha ao ler configurações: ${error.message}`);
  return {
    ...data,
    logoUrl: data.logo_path ? supabase.storage.from("marca").getPublicUrl(data.logo_path).data.publicUrl : null,
  };
}
