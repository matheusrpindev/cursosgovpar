import "server-only";
import { urlDoSite } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Os links dos e-mails apontam para /auth/confirmar, que mostra um botão em vez
 * de validar o token direto. Assim, programas que "abrem" links de e-mail para
 * checar segurança (comuns em e-mails corporativos) não gastam o link da pessoa.
 */
export type TipoLink = "cadastro" | "recuperacao";

function montarLink(tipo: TipoLink, tokenHash: string): string {
  const params = new URLSearchParams({ tipo, token_hash: tokenHash });
  return urlDoSite(`/auth/confirmar?${params.toString()}`);
}

export async function gerarLinkDeConfirmacao(email: string): Promise<string> {
  const { data, error } = await criarClienteAdmin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`Falha ao gerar link de confirmação: ${error.message}`);
  return montarLink("cadastro", data.properties.hashed_token);
}

export async function gerarLinkDeRecuperacao(email: string): Promise<string | null> {
  const { data, error } = await criarClienteAdmin().auth.admin.generateLink({ type: "recovery", email });
  if (error) {
    if (error.status === 404) return null;
    throw new Error(`Falha ao gerar link de recuperação: ${error.message}`);
  }
  return montarLink("recuperacao", data.properties.hashed_token);
}
