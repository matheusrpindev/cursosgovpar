import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { StatusPerfil } from "@/lib/auth/sessao";

/**
 * Consultas do painel do gestor. Todas usam a sessão de quem está logado, então
 * a RLS garante que só voltam pessoas do próprio órgão (e CPF completo só de pendentes).
 */

export type Pendente = {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  criadoEm: string;
};

export async function listarPendentes(organizacaoId: string): Promise<Pendente[]> {
  const supabase = await criarClienteServidor();
  const { data: perfis, error } = await supabase
    .from("perfis")
    .select("id, nome, email, criado_em")
    .eq("organizacao_id", organizacaoId)
    .eq("papel", "aluno")
    .eq("status", "pendente")
    .order("criado_em", { ascending: true })
    .limit(200);
  if (error) throw new Error(`Falha ao listar pendentes: ${error.message}`);
  if (!perfis.length) return [];

  const { data: cpfs } = await supabase
    .from("perfis_privados")
    .select("perfil_id, cpf")
    .in(
      "perfil_id",
      perfis.map((p) => p.id),
    );
  const cpfPorId = new Map((cpfs ?? []).map((c) => [c.perfil_id, c.cpf]));

  return perfis.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    cpf: cpfPorId.get(p.id) ?? null,
    criadoEm: p.criado_em,
  }));
}

export async function contarPendentes(organizacaoId: string): Promise<number> {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("perfis")
    .select("id", { count: "exact", head: true })
    .eq("organizacao_id", organizacaoId)
    .eq("papel", "aluno")
    .eq("status", "pendente");
  return count ?? 0;
}

export const FILTROS_STATUS = {
  todos: { rotulo: "Todos", status: ["aprovado", "desativado", "recusado"] },
  ativos: { rotulo: "Com acesso", status: ["aprovado"] },
  desativados: { rotulo: "Desativados", status: ["desativado"] },
  recusados: { rotulo: "Recusados", status: ["recusado"] },
} as const satisfies Record<string, { rotulo: string; status: StatusPerfil[] }>;

export type FiltroStatus = keyof typeof FILTROS_STATUS;

export const POR_PAGINA = 30;

export type Aluno = {
  id: string;
  nome: string;
  email: string;
  cpfMascarado: string | null;
  status: StatusPerfil;
  aprovadoEm: string | null;
  motivoRecusa: string | null;
};

/** Remove caracteres que têm significado nos filtros da API (vírgula, parênteses etc.). */
function limparBusca(busca: string): string {
  return busca.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listarAlunos(
  organizacaoId: string,
  opcoes: { busca: string; filtro: FiltroStatus; pagina: number },
): Promise<{ alunos: Aluno[]; total: number }> {
  const supabase = await criarClienteServidor();
  const inicio = (opcoes.pagina - 1) * POR_PAGINA;

  let consulta = supabase
    .from("perfis")
    .select("id, nome, email, cpf_mascarado, status, aprovado_em, motivo_recusa", { count: "exact" })
    .eq("organizacao_id", organizacaoId)
    .eq("papel", "aluno")
    .in("status", [...FILTROS_STATUS[opcoes.filtro].status])
    .order("nome", { ascending: true })
    .range(inicio, inicio + POR_PAGINA - 1);

  const busca = limparBusca(opcoes.busca);
  if (busca) {
    consulta = consulta.or(`nome.ilike.*${busca}*,email.ilike.*${busca}*`);
  }

  const { data, count, error } = await consulta;
  if (error) throw new Error(`Falha ao listar alunos: ${error.message}`);

  return {
    total: count ?? 0,
    alunos: (data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      cpfMascarado: p.cpf_mascarado,
      status: p.status,
      aprovadoEm: p.aprovado_em,
      motivoRecusa: p.motivo_recusa,
    })),
  };
}

export type EventoHistorico = {
  id: number;
  acao: string;
  criadoEm: string;
  ator: string;
  alvo: string | null;
  autoria: "propria" | "outra";
  motivo: string | null;
};

export async function listarHistorico(organizacaoId: string): Promise<EventoHistorico[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("auditoria")
    .select(
      "id, acao, criado_em, ator_id, alvo_perfil_id, detalhes, ator:perfis!auditoria_ator_id_fkey ( nome ), alvo:perfis!auditoria_alvo_perfil_id_fkey ( nome )",
    )
    .eq("organizacao_id", organizacaoId)
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Falha ao listar histórico: ${error.message}`);

  return (data ?? []).map((e) => {
    const detalhes = (e.detalhes ?? {}) as { motivo?: string | null };
    return {
      id: e.id,
      acao: e.acao,
      criadoEm: e.criado_em,
      // Sem autor = feito pelo sistema; autor invisível ao gestor = administração da plataforma.
      ator: !e.ator_id ? "Sistema" : (e.ator?.nome ?? "Administração da plataforma"),
      alvo: e.alvo?.nome ?? null,
      autoria: e.ator_id && e.ator_id === e.alvo_perfil_id ? "propria" : "outra",
      motivo: e.acao === "recusou_cadastro" ? (detalhes.motivo ?? null) : null,
    };
  });
}
