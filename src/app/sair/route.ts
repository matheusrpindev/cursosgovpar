import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Encerra a sessão e redireciona para /entrar com navegação completa (303),
 * para que nenhuma tela da sessão anterior fique na memória do navegador.
 */
export async function POST(request: NextRequest) {
  const origem = request.headers.get("origin");
  if (origem && origem !== request.nextUrl.origin) {
    return new NextResponse("Origem não permitida.", { status: 403 });
  }

  const supabase = await criarClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/entrar", request.url), 303);
}
