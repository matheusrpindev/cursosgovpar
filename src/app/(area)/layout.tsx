import { Suspense, type ReactNode } from "react";
import { CabecalhoArea, CabecalhoAreaEsqueleto } from "@/components/layout/cabecalho-area";

/**
 * Área logada. Tudo aqui depende da sessão, então cabeçalho e conteúdo são
 * renderizados por requisição: o cabeçalho dentro de <Suspense> e as páginas
 * dentro do loading.tsx. O proxy já barra quem não está logado; cada página
 * confere papel e status com exigirPerfil().
 */
// Páginas logadas dependem da sessão e não podem ser pré-renderizadas: elas
// podem "bloquear" a navegação, e o loading.tsx mostra o esqueleto enquanto isso.
export const instant = false;

export default function LayoutArea({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<CabecalhoAreaEsqueleto />}>
        <CabecalhoArea />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
        {children}
      </main>
    </>
  );
}
