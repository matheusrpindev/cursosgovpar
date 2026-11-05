import { NextResponse, type NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

/** Áreas que exigem login. A checagem de papel/status acontece em cada página. */
const ROTAS_PROTEGIDAS = [
  "/painel",
  "/cursos",
  "/gestor",
  "/admin",
  "/aguardando",
  "/aceitar-termos",
  "/redefinir-senha",
  "/certificados",
];

function exigeLogin(caminho: string): boolean {
  return ROTAS_PROTEGIDAS.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}

export async function proxy(request: NextRequest) {
  const { resposta, usuarioId } = await atualizarSessao(request);
  const caminho = request.nextUrl.pathname;

  if (!usuarioId && exigeLogin(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    if (caminho !== "/painel") destino.searchParams.set("proximo", caminho);

    const redirecionamento = NextResponse.redirect(destino);
    for (const cookie of resposta.cookies.getAll()) {
      redirecionamento.cookies.set(cookie);
    }
    return redirecionamento;
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)"],
};
