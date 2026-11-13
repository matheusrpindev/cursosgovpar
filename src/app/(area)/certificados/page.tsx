import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, Download } from "lucide-react";
import { Aviso } from "@/components/formulario/aviso";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exigirPerfil } from "@/lib/auth/sessao";
import { listarMeusCertificados } from "@/lib/cursos/dados";
import { formatarData } from "@/lib/formatacao";

export const metadata: Metadata = { title: "Meus certificados" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function MeusCertificados({ searchParams }: PageProps<"/certificados">) {
  // Quem foi desativado ainda entra aqui: os certificados já emitidos continuam dele.
  const perfil = await exigirPerfil();
  if (perfil.papel === "admin") redirect("/admin/certificados");
  if (perfil.status !== "aprovado" && perfil.status !== "desativado") redirect("/aguardando");

  const { novo } = await searchParams;
  const certificados = await listarMeusCertificados(perfil.id);

  return (
    <>
      <CabecalhoPagina
        titulo="Meus certificados"
        descricao="Baixe quando quiser: o arquivo é sempre o mesmo. Qualquer pessoa pode conferir a autenticidade pelo código."
      />
      {typeof novo === "string" && certificados.some((c) => c.codigo === novo) ? (
        <div className="mb-4">
          <Aviso tipo="sucesso">Certificado emitido! O código de validação é {novo}.</Aviso>
        </div>
      ) : null}
      {certificados.length === 0 ? (
        <EstadoVazio Icone={Award} titulo="Você ainda não tem certificados">
          Conclua todas as aulas de um curso para emitir o certificado.
        </EstadoVazio>
      ) : (
        <ul className="bg-background divide-y rounded-xl border" aria-label="Certificados">
          {certificados.map((c) => (
            <li key={c.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.curso}</span>
                  {c.revogadoEm ? <Badge className="h-6 bg-red-100 px-2.5 text-red-900">Revogado</Badge> : null}
                </div>
                <p className="text-muted-foreground text-sm">
                  {c.cargaHoraria ? `${c.cargaHoraria} h · ` : ""}Concluído em {c.dataConclusao} · Emitido em {formatarData(c.emitidoEm)}
                </p>
                <p className="text-sm">
                  Código:{" "}
                  <Link href={`/validar/${c.codigo}`} className="text-primary font-mono underline-offset-4 hover:underline">
                    {c.codigo}
                  </Link>
                </p>
              </div>
              {c.revogadoEm ? null : (
                <Button asChild variant="outline" className="h-11">
                  <a href={`/certificados/${c.id}/pdf`} target="_blank" rel="noopener">
                    <Download aria-hidden />
                    Baixar PDF
                  </a>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
