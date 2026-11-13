"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos-banco";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/**
 * Opção de desenvolvimento: quando o Supabase local não é acessível pelo
 * navegador (ex.: prévia remota), as chamadas passam pelo próprio site
 * (/supabase-local, ver next.config.ts). O nome do cookie da sessão continua o
 * mesmo que o servidor usa.
 */
function enderecoParaNavegador(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_VIA_SITE === "1" ? `${window.location.origin}/supabase-local` : URL_SUPABASE;
}

const NOME_COOKIE_SESSAO = `sb-${new URL(URL_SUPABASE).hostname.split(".")[0]}-auth-token`;

/**
 * Cliente do navegador. Usado só para login e confirmação de links, para que o
 * limite de tentativas do Supabase conte por pessoa (IP de quem acessa) e não
 * pelo IP do servidor. A sessão fica em cookies, lidos pelo servidor.
 */
export function criarClienteNavegador() {
  return createBrowserClient<Database>(enderecoParaNavegador(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { name: NOME_COOKIE_SESSAO },
  });
}
