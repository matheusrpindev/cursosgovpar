import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { obterPerfilAtual, temAcessoAtivo, type PerfilAtual } from "@/lib/auth/sessao";
import { obterMarca } from "@/lib/marca";
import { Logo } from "./logo";

const NOMES_PAPEIS = { admin: "Administração", gestor: "Gestor(a)", aluno: "Aluno(a)" } as const;

function linksDoPerfil(perfil: PerfilAtual) {
  if (perfil.precisaAceitarTermos || !temAcessoAtivo(perfil)) return [];
  if (perfil.papel === "admin") return [{ href: "/admin", rotulo: "Administração" }];
  if (perfil.papel === "gestor") {
    return [
      { href: "/gestor", rotulo: "Meu órgão" },
      { href: "/cursos", rotulo: "Meus cursos" },
    ];
  }
  return [{ href: "/cursos", rotulo: "Meus cursos" }];
}

/** Cabeçalho da área logada. Lê a sessão, por isso fica dentro de um <Suspense>. */
export async function CabecalhoArea() {
  const [marca, perfil] = await Promise.all([obterMarca(), obterPerfilAtual()]);
  const links = perfil ? linksDoPerfil(perfil) : [];

  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Logo marca={marca} href="/painel" />
        {perfil ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium">{perfil.nome}</p>
              <p className="text-muted-foreground">
                {NOMES_PAPEIS[perfil.papel]}
                {perfil.organizacao ? ` · ${perfil.organizacao.nome}` : ""}
              </p>
            </div>
            {/* POST comum (não Server Action): recarrega a página e apaga da memória
                do navegador as telas da sessão anterior. */}
            <form action="/sair" method="post">
              <Button type="submit" variant="outline" className="h-10">
                <LogOut aria-hidden />
                Sair
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      {links.length ? (
        <nav aria-label="Navegação principal" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:bg-muted rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap"
            >
              {link.rotulo}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function CabecalhoAreaEsqueleto() {
  return <header className="bg-background h-[61px] border-b" aria-hidden />;
}
