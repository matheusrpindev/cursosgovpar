import type { Metadata } from "next";
import Link from "next/link";
import { Award, BookOpen, Clock, PlayCircle } from "lucide-react";
import { BarraProgresso, CapaCurso } from "@/components/cursos/progresso";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarCarga, listarMeusCursos } from "@/lib/cursos/dados";

export const metadata: Metadata = { title: "Meus cursos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function MeusCursos() {
  const perfil = await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  const cursos = await listarMeusCursos(perfil.id);

  return (
    <>
      <CabecalhoPagina
        titulo={`Olá, ${perfil.nome.split(" ")[0]}!`}
        descricao={`Estes são os cursos liberados para ${perfil.organizacao?.nome ?? "o seu órgão"}.`}
      />
      {cursos.length === 0 ? (
        <EstadoVazio Icone={BookOpen} titulo="Nenhum curso liberado ainda">
          Quando o seu órgão tiver cursos disponíveis, eles vão aparecer aqui.
        </EstadoVazio>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cursos">
          {cursos.map((curso) => {
            const proxima = curso.aulas.find((a) => !a.concluida);
            const rotulo = curso.percentual === 100 ? "Concluído" : curso.concluidas ? "Continuar" : "Começar";
            return (
              <li key={curso.id}>
                <Link
                  href={`/cursos/${curso.id}`}
                  className="bg-background hover:ring-primary/40 flex h-full flex-col overflow-hidden rounded-xl border transition hover:ring-2"
                >
                  <CapaCurso url={curso.capaUrl} titulo={curso.titulo} />
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h2 className="text-base leading-snug font-semibold">{curso.titulo}</h2>
                    <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-4" aria-hidden />
                        {formatarCarga(curso.cargaHoraria)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <PlayCircle className="size-4" aria-hidden />
                        {curso.aulas.length} {curso.aulas.length === 1 ? "aula" : "aulas"}
                      </span>
                    </p>
                    <BarraProgresso
                      className="mt-auto"
                      percentual={curso.percentual}
                      rotulo={`${curso.concluidas} de ${curso.aulas.length} aulas · ${curso.percentual}%`}
                    />
                    <p className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
                      {curso.certificado ? (
                        <>
                          <Award className="size-4" aria-hidden />
                          Certificado emitido
                        </>
                      ) : (
                        <>
                          {rotulo}
                          {proxima && curso.percentual < 100 ? <span aria-hidden>→</span> : null}
                        </>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
