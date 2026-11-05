import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { obterMarca } from "@/lib/marca";

export default async function Inicio() {
  const marca = await obterMarca();

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Logo marca={marca} />
          <Button asChild variant="outline" className="h-10">
            <Link href="/entrar">Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 px-4 py-14">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">
          {marca.nomeEmpresa || marca.nomePlataforma}
        </p>
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
          Capacitação para as equipes dos órgãos parceiros
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg">
          Acesse os cursos liberados para o seu órgão, acompanhe o seu progresso e emita certificados com validação
          pública.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-12 px-6 text-base">
            <Link href="/entrar">Entrar na plataforma</Link>
          </Button>
          {marca.cadastroListaPublica ? (
            <Button asChild variant="outline" className="h-12 px-6 text-base">
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          ) : null}
        </div>
        {!marca.cadastroListaPublica ? (
          <p className="text-muted-foreground text-sm">
            Ainda não tem conta? Use o link de cadastro enviado pelo seu órgão.
          </p>
        ) : null}
      </section>
    </main>
  );
}
