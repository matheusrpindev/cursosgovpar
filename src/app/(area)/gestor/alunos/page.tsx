import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { AcaoAcesso } from "@/components/gestor/acao-acesso";
import { SeloStatus } from "@/components/gestor/selo-status";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarData } from "@/lib/formatacao";
import { FILTROS_STATUS, listarAlunos, POR_PAGINA, type FiltroStatus } from "@/lib/gestor/dados";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Alunos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

function texto(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor : "";
}

function endereco(parametros: { busca: string; filtro: FiltroStatus; pagina: number }) {
  const p = new URLSearchParams();
  if (parametros.busca) p.set("busca", parametros.busca);
  if (parametros.filtro !== "todos") p.set("situacao", parametros.filtro);
  if (parametros.pagina > 1) p.set("pagina", String(parametros.pagina));
  const consulta = p.toString();
  return `/gestor/alunos${consulta ? `?${consulta}` : ""}`;
}

export default async function Alunos({ searchParams }: PageProps<"/gestor/alunos">) {
  const perfil = await exigirPerfil({ papeis: ["gestor"], acessoAtivo: true });
  const params = await searchParams;
  const busca = texto(params.busca).slice(0, 80);
  const filtro = (texto(params.situacao) in FILTROS_STATUS ? texto(params.situacao) : "todos") as FiltroStatus;
  const pagina = Math.max(1, Number.parseInt(texto(params.pagina), 10) || 1);

  const { alunos, total } = await listarAlunos(perfil.organizacao!.id, { busca, filtro, pagina });
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <CabecalhoPagina titulo="Alunos" descricao={`Pessoas de ${perfil.organizacao!.nome} com cadastro analisado.`} />

      <form action="/gestor/alunos" className="mb-4 flex flex-col gap-2 sm:flex-row" role="search">
        {filtro !== "todos" ? <input type="hidden" name="situacao" value={filtro} /> : null}
        <label htmlFor="busca" className="sr-only">
          Buscar por nome ou e-mail
        </label>
        <Input
          id="busca"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome ou e-mail"
          className="h-11 text-base sm:max-w-sm"
        />
        <Button type="submit" variant="outline" className="h-11">
          <Search aria-hidden />
          Buscar
        </Button>
      </form>

      <nav aria-label="Filtrar por situação" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(FILTROS_STATUS) as FiltroStatus[]).map((chave) => (
          <Link
            key={chave}
            href={endereco({ busca, filtro: chave, pagina: 1 })}
            aria-current={chave === filtro ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm whitespace-nowrap",
              chave === filtro ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
            )}
          >
            {FILTROS_STATUS[chave].rotulo}
          </Link>
        ))}
      </nav>

      {alunos.length === 0 ? (
        <EstadoVazio Icone={Users} titulo={busca ? "Ninguém encontrado" : "Nenhum aluno nesta situação"}>
          {busca ? "Confira a grafia ou busque por outra parte do nome ou do e-mail." : null}
        </EstadoVazio>
      ) : (
        <>
          <p className="text-muted-foreground mb-2 text-sm">
            {total} {total === 1 ? "pessoa" : "pessoas"}
          </p>
          <ul className="bg-background divide-y rounded-xl border" aria-label="Alunos">
            {alunos.map((aluno) => (
              <li key={aluno.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{aluno.nome}</span>
                    <SeloStatus status={aluno.status} />
                  </div>
                  <p className="text-muted-foreground text-sm break-all">
                    {aluno.email} · CPF {aluno.cpfMascarado ?? "—"}
                  </p>
                  {aluno.status === "recusado" ? (
                    <p className="text-muted-foreground text-sm">
                      Recusado{aluno.motivoRecusa ? `: “${aluno.motivoRecusa}”` : ""}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">Aprovado em {formatarData(aluno.aprovadoEm)}</p>
                  )}
                </div>
                {aluno.status === "aprovado" || aluno.status === "desativado" ? (
                  <AcaoAcesso key={`${aluno.id}-${aluno.status}`} id={aluno.id} nome={aluno.nome} status={aluno.status} />
                ) : null}
              </li>
            ))}
          </ul>
          {totalPaginas > 1 ? (
            <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-2 text-sm">
              {pagina > 1 ? (
                <Link href={endereco({ busca, filtro, pagina: pagina - 1 })} className="text-primary underline-offset-4 hover:underline">
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Página {pagina} de {totalPaginas}
              </span>
              {pagina < totalPaginas ? (
                <Link href={endereco({ busca, filtro, pagina: pagina + 1 })} className="text-primary underline-offset-4 hover:underline">
                  Próxima →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
