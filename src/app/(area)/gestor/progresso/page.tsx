import type { Metadata } from "next";
import { Award, BarChart3 } from "lucide-react";
import { BarraProgresso } from "@/components/cursos/progresso";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";
import { listarProgressoDoOrgao } from "@/lib/gestor/dados";

export const metadata: Metadata = { title: "Progresso" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Progresso() {
  const perfil = await exigirPerfil({ papeis: ["gestor"], acessoAtivo: true });
  const { cursos, pessoas } = await listarProgressoDoOrgao(perfil.organizacao!.id);

  return (
    <>
      <CabecalhoPagina titulo="Progresso" descricao={`Andamento das pessoas de ${perfil.organizacao!.nome} em cada curso liberado.`} />
      {cursos.length === 0 ? (
        <EstadoVazio Icone={BarChart3} titulo="Nenhum curso liberado para o órgão ainda" />
      ) : (
        <div className="grid gap-6">
          {cursos.map((curso) => {
            const linhas = pessoas.map((p) => ({ pessoa: p, item: p.cursos.find((c) => c.cursoId === curso.id)! }));
            const concluiram = linhas.filter((l) => l.item.total > 0 && l.item.concluidas === l.item.total).length;
            const comecaram = linhas.filter((l) => l.item.concluidas > 0).length;
            return (
              <section key={curso.id} aria-labelledby={`curso-${curso.id}`} className="bg-background rounded-xl border">
                <div className="border-b p-4">
                  <h2 id={`curso-${curso.id}`} className="font-semibold">
                    {curso.titulo}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {curso.total} {curso.total === 1 ? "aula" : "aulas"} · {comecaram} de {linhas.length} começaram · {concluiram} concluíram
                  </p>
                </div>
                <ul className="divide-y">
                  {linhas.map(({ pessoa, item }) => {
                    const percentual = item.total ? Math.round((item.concluidas / item.total) * 100) : 0;
                    return (
                      <li key={pessoa.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_220px_130px] sm:items-center">
                        <span className="text-sm font-medium">
                          {pessoa.nome}
                          {pessoa.papel === "gestor" ? <span className="text-muted-foreground font-normal"> (gestor)</span> : null}
                        </span>
                        <BarraProgresso percentual={percentual} rotulo={`${item.concluidas} de ${item.total} aulas · ${percentual}%`} />
                        <span className="text-sm">
                          {item.certificado ? (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <Award className="size-4" aria-hidden />
                              Certificado
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem certificado</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
