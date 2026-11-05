import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env";
import { envServidor } from "@/lib/env-servidor";
import type { Database } from "./tipos-banco";

/**
 * Cliente com a chave secreta (service_role): IGNORA a RLS.
 * Use somente no servidor e apenas onde for inevitável:
 * criar contas, gerar links de e-mail, ler e-mails para notificação e
 * gravar/ler PDFs de certificados. Toda outra operação usa a sessão do usuário.
 */
export function criarClienteAdmin() {
  return createClient<Database>(
    envPublico().NEXT_PUBLIC_SUPABASE_URL,
    envServidor().SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
