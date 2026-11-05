"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./tipos-banco";

/**
 * Cliente do navegador. Usado só para login e confirmação de links, para que o
 * limite de tentativas do Supabase conte por pessoa (IP de quem acessa) e não
 * pelo IP do servidor. A sessão fica em cookies, lidos pelo servidor.
 */
export function criarClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
