import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublico } from "@/lib/env";
import type { Database } from "./tipos-banco";

/**
 * Renova a sessão do Supabase a cada requisição e devolve o id do usuário
 * logado (ou null). Segue o padrão recomendado pelo @supabase/ssr.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const env = envPublico();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGravar, cabecalhos) {
          for (const { name, value } of cookiesParaGravar) {
            request.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
          for (const [chave, valor] of Object.entries(cabecalhos)) {
            resposta.headers.set(chave, valor);
          }
        },
      },
    },
  );

  // Não coloque código entre a criação do cliente e getClaims():
  // é aqui que o token é validado e renovado.
  const { data } = await supabase.auth.getClaims();
  const usuarioId = (data?.claims?.sub as string | undefined) ?? null;

  return { resposta, usuarioId };
}
