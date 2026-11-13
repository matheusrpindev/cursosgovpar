import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";
import { Campo } from "@/components/formulario/campo";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { revogarCertificado } from "@/lib/admin/acoes";
import { listarCertificadosAdmin } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarData } from "@/lib/formatacao";

export const metadata: Metadata = { title: "Certificados" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function CertificadosAdmin() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const certificados = await listarCertificadosAdmin();
  return (
    <>
      <CabecalhoPagina titulo="Certificados" descricao="Certificados emitidos em toda a plataforma (os 300 mais recentes)." />
      {certificados.length === 0 ? (
        <EstadoVazio Icone={Award} titulo="Nenhum certificado emitido ainda" />
      ) : (
        <ul className="bg-background divide-y rounded-xl border" aria-label="Certificados">
          {certificados.map((c) => (
            <li key={c.id} className="grid gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.nome}</span>
                {c.revogadoEm ? (
                  <Badge className="h-6 bg-red-100 px-2.5 text-red-900">Revogado</Badge>
                ) : (
                  <Badge className="h-6 bg-emerald-100 px-2.5 text-emerald-900">Válido</Badge>
                )}
              </div>
              <p className="text-sm">{c.curso}</p>
              <p className="text-muted-foreground text-sm">
                {c.orgao} · Emitido em {formatarData(c.emitidoEm)} · <span className="font-mono">{c.codigo}</span>
              </p>
              {c.revogadoEm ? (
                <p className="text-muted-foreground text-sm">
                  Revogado em {formatarData(c.revogadoEm)}
                  {c.motivo ? `: “${c.motivo}”` : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <a href={`/certificados/${c.id}/pdf`} target="_blank" rel="noopener" className="text-primary underline-offset-4 hover:underline">
                  Abrir PDF
                </a>
                <Link href={`/validar/${c.codigo}`} className="text-primary underline-offset-4 hover:underline">
                  Ver página de validação
                </Link>
              </div>
              {c.revogadoEm ? null : (
                <details className="text-sm">
                  <summary className="text-primary cursor-pointer">Revogar</summary>
                  <div className="mt-3 max-w-md">
                    <FormularioAcao
                      acao={revogarCertificado}
                      rotulo="Revogar certificado"
                      variante="destructive"
                      confirmar="Revogar este certificado? A validação pública passa a mostrar que ele não é mais válido. Não tem volta."
                    >
                      <input type="hidden" name="certificadoId" value={c.id} />
                      <Campo id={`motivo-${c.id}`} nome="motivo" rotulo="Motivo (opcional, fica só no registro interno)" maxLength={500} />
                    </FormularioAcao>
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
