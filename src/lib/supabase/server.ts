import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { envPublico } from "@/lib/env";
import type { Database } from "./tipos-banco";

/**
 * Cliente com a sessão do usuário (cookies). Toda consulta passa pela RLS
 * com as permissões de quem está logado. Crie um por requisição.
 *
 * `connection()` garante que nada que dependa da sessão seja pré-renderizado
 * ou guardado em cache: a checagem de login é sempre feita na hora.
 */
export async function criarClienteServidor() {
  await connection();
  const cookieStore = await cookies();
  const env = envPublico();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaGravar) {
          try {
            for (const { name, value, options } of cookiesParaGravar) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado a partir de um Server Component: o proxy renova a sessão.
          }
        },
      },
    },
  );
}
