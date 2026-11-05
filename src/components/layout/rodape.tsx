import Link from "next/link";
import type { Marca } from "@/lib/marca";

export function Rodape({ marca }: { marca: Marca }) {
  return (
    <footer className="text-muted-foreground border-t bg-background px-4 py-6 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{marca.textoRodape || marca.nomeEmpresa || marca.nomePlataforma}</p>
        <nav aria-label="Links institucionais" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/termos" className="hover:text-foreground underline-offset-4 hover:underline">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:text-foreground underline-offset-4 hover:underline">
            Política de privacidade
          </Link>
          {marca.emailContato ? (
            <a href={`mailto:${marca.emailContato}`} className="hover:text-foreground underline-offset-4 hover:underline">
              {marca.emailContato}
            </a>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
