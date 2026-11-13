import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CircleCheck, Circle, Clock, Download, PlayCircle } from "lucide-react";
import { BarraProgresso, CapaCurso } from "@/components/cursos/progresso";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { Button } from "@/components/ui/button";
import { exigirPerfil } from "@/lib/auth/sessao";
import { emitirCertificado } from "@/lib/cursos/acoes";
import { formatarCarga, obterMeuCurso } from "@/lib/cursos/dados";

export const metadata: Metadata = { title: "Curso" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Curso({ params }: PageProps<"/cursos/[cursoId]">) {
  const perfil = await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  const { cursoId } = await params;
  const curso = await obterMeuCurso(perfil.id, cursoId);
  if (!curso) notFound();

  const proxima = curso.aulas.find((a) => !a.concluida) ?? curso.aulas[0];
  const completo = curso.aulas.length > 0 && curso.concluidas === curso.aulas.length;

  return (
    <>
      <p className="mb-3 text-sm">
        <Link href="/cursos" className="text-primary underline-offset-4 hover:underline">
          ← Meus cursos
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{curso.titulo}</h1>
            <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-4" aria-hidden />
                Carga horária: {formatarCarga(curso.cargaHoraria)}
              </span>
              <span className="inline-flex items-center gap-1">
                <PlayCircle className="size-4" aria-hidden />
                {curso.aulas.length} {curso.aulas.length === 1 ? "aula" : "aulas"}
              </span>
            </p>
          </div>
          {curso.descricao ? <p className="leading-relaxed whitespace-pre-line">{curso.descricao}</p> : null}

          <section aria-labelledby="titulo-aulas" className="grid gap-2">
            <h2 id="titulo-aulas" className="text-lg font-semibold">
              Aulas
            </h2>
            <ol className="bg-background divide-y rounded-xl border">
              {curso.aulas.map((aula, indice) => (
                <li key={aula.id}>
                  <Link href={`/cursos/${curso.id}/aulas/${aula.id}`} className="hover:bg-muted/60 flex items-center gap-3 p-4">
                    {aula.concluida ? (
                      <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-label="Concluída" />
                    ) : (
                      <Circle className="text-muted-foreground size-5 shrink-0" aria-label="Não concluída" />
                    )}
                    <span className="flex-1">
                      <span className="text-muted-foreground text-xs">Aula {indice + 1}</span>
                      <span className="block font-medium">{aula.titulo}</span>
                    </span>
                    <span className="text-primary text-sm" aria-hidden>
                      Assistir
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="bg-background grid gap-4 overflow-hidden rounded-xl border lg:sticky lg:top-6">
          <CapaCurso url={curso.capaUrl} titulo={curso.titulo} />
          <div className="grid gap-4 px-4 pb-4">
            <BarraProgresso
              percentual={curso.percentual}
              rotulo={`${curso.concluidas} de ${curso.aulas.length} aulas concluídas · ${curso.percentual}%`}
            />
            {curso.certificado ? (
              <div className="grid gap-2">
                <p className="flex items-center gap-2 font-medium">
                  <Award className="text-primary size-5" aria-hidden />
                  Certificado emitido
                </p>
                <Button asChild className="h-11">
                  <a href={`/certificados/${curso.certificado.id}/pdf`} target="_blank" rel="noopener">
                    <Download aria-hidden />
                    Baixar certificado (PDF)
                  </a>
                </Button>
                <p className="text-muted-foreground text-xs">Código de validação: {curso.certificado.codigo}</p>
              </div>
            ) : completo ? (
              <div className="grid gap-2">
                <p className="font-medium">Parabéns, você concluiu o curso!</p>
                <FormularioAcao
                  acao={emitirCertificado}
                  rotulo={
                    <>
                      <Award aria-hidden />
                      Emitir certificado
                    </>
                  }
                  rotuloEnviando="Emitindo…"
                  classeBotao="h-11 w-full"
                  className="[&>button]:justify-self-stretch"
                >
                  <input type="hidden" name="cursoId" value={curso.id} />
                </FormularioAcao>
              </div>
            ) : proxima ? (
              <>
                <Button asChild className="h-11">
                  <Link href={`/cursos/${curso.id}/aulas/${proxima.id}`}>
                    {curso.concluidas ? "Continuar de onde parei" : "Começar o curso"}
                  </Link>
                </Button>
                <p className="text-muted-foreground text-xs">
                  O certificado fica disponível quando todas as aulas estiverem concluídas.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Este curso ainda não tem aulas.</p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
