import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { CapaCurso } from "@/components/cursos/progresso";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listarCursosAdmin } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarCarga } from "@/lib/cursos/dados";

export const metadata: Metadata = { title: "Cursos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function CursosAdmin() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const cursos = await listarCursosAdmin();
  return (
    <>
      <CabecalhoPagina
        titulo="Cursos"
        descricao="Crie os cursos, adicione as aulas e escolha quais órgãos têm acesso."
        acoes={
          <Button asChild className="h-11">
            <Link href="/admin/cursos/novo">
              <Plus aria-hidden />
              Novo curso
            </Link>
          </Button>
        }
      />
      {cursos.length === 0 ? (
        <EstadoVazio Icone={BookOpen} titulo="Nenhum curso ainda">
          Comece criando o primeiro curso.
        </EstadoVazio>
      ) : (
        <ul className="bg-background divide-y rounded-xl border" aria-label="Cursos">
          {cursos.map((curso) => (
            <li key={curso.id}>
              <Link href={`/admin/cursos/${curso.id}`} className="hover:bg-muted/60 flex items-center gap-4 p-3 sm:p-4">
                <CapaCurso url={curso.capaUrl} titulo="" className="w-28 shrink-0 rounded-lg sm:w-36" />
                <span className="grid flex-1 gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{curso.titulo}</span>
                    {curso.status === "publicado" ? (
                      <Badge className="h-6 bg-emerald-100 px-2.5 text-emerald-900">Publicado</Badge>
                    ) : (
                      <Badge className="h-6 bg-amber-100 px-2.5 text-amber-900">Rascunho</Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {formatarCarga(curso.cargaHoraria)} · {curso.totalAulas} {curso.totalAulas === 1 ? "aula" : "aulas"} · liberado para{" "}
                    {curso.totalOrgaos} {curso.totalOrgaos === 1 ? "órgão" : "órgãos"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
