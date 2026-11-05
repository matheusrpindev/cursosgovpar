import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { obterPerfilAtual, temAcessoAtivo, type PerfilAtual } from "@/lib/auth/sessao";
import { contarPendentes } from "@/lib/gestor/dados";
import { obterMarca } from "@/lib/marca";
import { LinkNavegacao } from "./link-navegacao";
import { Logo } from "./logo";

const NOMES_PAPEIS = { admin: "Administração", gestor: "Gestor(a)", aluno: "Aluno(a)" } as const;

type LinkMenu = { href: string; rotulo: string; exato?: boolean; contador?: number };

async function linksDoPerfil(perfil: PerfilAtual): Promise<LinkMenu[]> {
  if (perfil.precisaAceitarTermos || !temAcessoAtivo(perfil)) return [];
  if (perfil.papel === "admin") return [{ href: "/admin", rotulo: "Administração" }];
  if (perfil.papel === "gestor" && perfil.organizacao) {
    const pendentes = await contarPendentes(perfil.organizacao.id);
    return [
      { href: "/gestor", rotulo: "Cadastros", exato: true, contador: pendentes },
      { href: "/gestor/alunos", rotulo: "Alunos" },
      { href: "/gestor/historico", rotulo: "Histórico" },
      { href: "/cursos", rotulo: "Meus cursos" },
    ];
  }
  return [{ href: "/cursos", rotulo: "Meus cursos" }];
}

/** Cabeçalho da área logada. Lê a sessão, por isso fica dentro de um <Suspense>. */
export async function CabecalhoArea() {
  const [marca, perfil] = await Promise.all([obterMarca(), obterPerfilAtual()]);
  const links = perfil ? await linksDoPerfil(perfil) : [];

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
            <LinkNavegacao key={link.href} href={link.href} exato={link.exato}>
              {link.rotulo}
              {link.contador ? (
                <span
                  className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs leading-5 tabular-nums"
                  aria-label={`${link.contador} pendentes`}
                >
                  {link.contador}
                </span>
              ) : null}
            </LinkNavegacao>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function CabecalhoAreaEsqueleto() {
  return <header className="bg-background h-[61px] border-b" aria-hidden />;
}
