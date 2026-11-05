import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { criarClientePublico } from "@/lib/supabase/publico";

export const TAG_ORGAOS = "organizacoes";

/** Nome do órgão de um link de cadastro (somente órgãos ativos). */
export async function orgaoDoLinkDeCadastro(slug: string): Promise<{ id: string; nome: string } | null> {
  "use cache";
  cacheTag(TAG_ORGAOS);
  cacheLife("minutes");

  const { data, error } = await criarClientePublico().rpc("orgao_para_cadastro", { p_slug: slug });
  if (error) throw new Error(`Falha ao buscar órgão: ${error.message}`);
  return data?.[0] ?? null;
}

/** Lista pública de órgãos (vazia se a opção estiver desligada na configuração). */
export async function orgaosComCadastroPublico(): Promise<{ id: string; nome: string; slug: string }[]> {
  "use cache";
  cacheTag(TAG_ORGAOS);
  cacheLife("minutes");

  const { data, error } = await criarClientePublico().rpc("orgaos_para_cadastro");
  if (error) throw new Error(`Falha ao listar órgãos: ${error.message}`);
  return data ?? [];
}
