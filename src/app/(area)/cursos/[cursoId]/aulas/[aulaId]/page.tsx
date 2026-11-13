import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, Circle } from "lucide-react";
import { Player } from "@/components/cursos/player";
import { exigirPerfil } from "@/lib/auth/sessao";
import { obterMeuCurso } from "@/lib/cursos/dados";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Aula" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Aula({ params }: PageProps<"/cursos/[cursoId]/aulas/[aulaId]">) {
  const perfil = await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  const { cursoId, aulaId } = await params;
  const curso = await obterMeuCurso(perfil.id, cursoId);
  const indice = curso?.aulas.findIndex((a) => a.id === aulaId) ?? -1;
  if (!curso || indice < 0) notFound();

  const aula = curso.aulas[indice];
  const seguinte = curso.aulas[indice + 1];
  const anterior = curso.aulas[indice - 1];
  const base = `/cursos/${curso.id}`;
  const outrasPendentes = curso.aulas.some((a) => !a.concluida && a.id !== aula.id);

  return (
    <>
      <p className="mb-3 text-sm">
        <Link href={base} className="text-primary underline-offset-4 hover:underline">
          ← {curso.titulo}
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="grid gap-4">
          <div>
            <p className="text-muted-foreground text-sm">
              Aula {indice + 1} de {curso.aulas.length}
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{aula.titulo}</h1>
          </div>
          <Player
            key={aula.id}
            aulaId={aula.id}
            titulo={aula.titulo}
            provedor={aula.provedor}
            videoId={aula.videoId}
            videoHash={aula.videoHash}
            exigirVideoCompleto={aula.exigirVideoCompleto}
            concluida={aula.concluida}
            proximo={
              !outrasPendentes
                ? { href: base, rotulo: curso.certificado ? "Voltar ao curso" : "Emitir meu certificado" }
                : seguinte
                  ? { href: `${base}/aulas/${seguinte.id}`, rotulo: "Ir para a próxima aula" }
                  : { href: base, rotulo: "Voltar ao curso" }
            }
          />
          {aula.descricao ? <p className="leading-relaxed whitespace-pre-line">{aula.descricao}</p> : null}
          <nav aria-label="Aula anterior e próxima" className="flex justify-between gap-3 text-sm">
            {anterior ? (
              <Link href={`${base}/aulas/${anterior.id}`} className="text-primary underline-offset-4 hover:underline">
                ← Aula anterior
              </Link>
            ) : (
              <span />
            )}
            {seguinte ? (
              <Link href={`${base}/aulas/${seguinte.id}`} className="text-primary underline-offset-4 hover:underline">
                Próxima aula →
              </Link>
            ) : null}
          </nav>
        </div>

        <aside aria-label="Aulas do curso" className="bg-background rounded-xl border">
          <p className="border-b px-4 py-3 text-sm font-semibold">
            {curso.concluidas} de {curso.aulas.length} concluídas
          </p>
          <ol className="divide-y">
            {curso.aulas.map((item, i) => (
              <li key={item.id}>
                <Link
                  href={`${base}/aulas/${item.id}`}
                  aria-current={item.id === aula.id ? "page" : undefined}
                  className={cn("hover:bg-muted/60 flex items-start gap-2.5 px-4 py-3 text-sm", item.id === aula.id && "bg-muted font-medium")}
                >
                  {item.concluida ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Concluída" />
                  ) : (
                    <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-label="Não concluída" />
                  )}
                  <span>
                    {i + 1}. {item.titulo}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
