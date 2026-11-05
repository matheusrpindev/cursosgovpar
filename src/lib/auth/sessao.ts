import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/tipos-banco";

export type Papel = Database["public"]["Enums"]["papel"];
export type StatusPerfil = Database["public"]["Enums"]["status_perfil"];

export type PerfilAtual = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  status: StatusPerfil;
  motivoRecusa: string | null;
  organizacao: { id: string; nome: string; ativo: boolean } | null;
  precisaAceitarTermos: boolean;
};

/**
 * Camada de acesso à sessão (DAL). Lê o usuário logado e o perfil dele com a
 * própria sessão (RLS). Memorizado por requisição.
 */
export const obterPerfilAtual = cache(async (): Promise<PerfilAtual | null> => {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const usuarioId = claims?.claims?.sub;
  if (!usuarioId) return null;

  // A versão dos termos é lida do banco (não do cache da marca): exigir o novo
  // aceite é uma regra legal e precisa valer assim que o texto muda.
  const [{ data: perfil }, { data: config }] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, email, papel, status, motivo_recusa, organizacoes ( id, nome, ativo )")
      .eq("id", usuarioId)
      .maybeSingle(),
    supabase.from("configuracoes").select("termos_versao").eq("id", 1).single(),
  ]);
  if (!perfil) return null;

  let precisaAceitarTermos = false;
  if (perfil.papel !== "admin") {
    const { count } = await supabase
      .from("aceites_termos")
      .select("id", { count: "exact", head: true })
      .eq("perfil_id", usuarioId)
      .eq("versao", config?.termos_versao ?? 1);
    precisaAceitarTermos = (count ?? 0) < 2;
  }

  return {
    id: perfil.id,
    nome: perfil.nome,
    email: perfil.email,
    papel: perfil.papel,
    status: perfil.status,
    motivoRecusa: perfil.motivo_recusa,
    organizacao: perfil.organizacoes,
    precisaAceitarTermos,
  };
});

/** Aluno/gestor aprovado de órgão ativo (admin não depende de órgão). */
export function temAcessoAtivo(perfil: PerfilAtual): boolean {
  if (perfil.papel === "admin") return perfil.status === "aprovado";
  return perfil.status === "aprovado" && perfil.organizacao?.ativo === true;
}

/** Para onde a pessoa vai depois do login, conforme papel e situação. */
export function destinoInicial(perfil: PerfilAtual): string {
  if (perfil.precisaAceitarTermos) return "/aceitar-termos";
  if (!temAcessoAtivo(perfil)) return "/aguardando";
  if (perfil.papel === "admin") return "/admin";
  if (perfil.papel === "gestor") return "/gestor";
  return "/cursos";
}

type Exigencias = {
  /** Papéis que podem abrir a página. */
  papeis?: Papel[];
  /** Exige status aprovado e órgão ativo. */
  acessoAtivo?: boolean;
  /** Permite abrir a página mesmo sem aceitar a versão atual dos termos. */
  permitirTermosPendentes?: boolean;
};

/**
 * Garante que há alguém logado e que atende às exigências; caso contrário,
 * redireciona. É uma proteção de navegação: a proteção dos dados é a RLS.
 */
export async function exigirPerfil(exigencias: Exigencias = {}): Promise<PerfilAtual> {
  const perfil = await obterPerfilAtual();
  if (!perfil) redirect("/entrar");

  if (perfil.precisaAceitarTermos && !exigencias.permitirTermosPendentes) {
    redirect("/aceitar-termos");
  }
  if (exigencias.papeis && !exigencias.papeis.includes(perfil.papel)) {
    redirect(destinoInicial(perfil));
  }
  if (exigencias.acessoAtivo && !temAcessoAtivo(perfil)) {
    redirect("/aguardando");
  }
  return perfil;
}
