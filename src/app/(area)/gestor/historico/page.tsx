import type { Metadata } from "next";
import { History } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarDataHora } from "@/lib/formatacao";
import { listarHistorico } from "@/lib/gestor/dados";
import { descreverEvento } from "@/lib/historico";

export const metadata: Metadata = { title: "Histórico" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Historico() {
  const perfil = await exigirPerfil({ papeis: ["gestor"], acessoAtivo: true });
  const eventos = await listarHistorico(perfil.organizacao!.id);

  return (
    <>
      <CabecalhoPagina titulo="Histórico" descricao="As 100 alterações mais recentes de cadastros do seu órgão." />
      {eventos.length === 0 ? (
        <EstadoVazio Icone={History} titulo="Nada registrado ainda" />
      ) : (
        <ol className="bg-background divide-y rounded-xl border">
          {eventos.map((evento) => (
            <li key={evento.id} className="grid gap-0.5 p-4 text-sm">
              <span>{descreverEvento(evento)}</span>
              {evento.motivo ? <span className="text-muted-foreground">Motivo: “{evento.motivo}”</span> : null}
              <time dateTime={evento.criadoEm} className="text-muted-foreground text-xs">
                {formatarDataHora(evento.criadoEm)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
