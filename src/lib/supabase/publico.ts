import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envPublico } from "@/lib/env";
import type { Database } from "./tipos-banco";

/**
 * Cliente anônimo, sem cookies. Serve para dados públicos que podem ser
 * cacheados (marca, nome do órgão do link de cadastro).
 */
export function criarClientePublico() {
  const env = envPublico();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
