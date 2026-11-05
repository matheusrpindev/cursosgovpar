import type { Metadata } from "next";
import { History } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarDataHora } from "@/lib/formatacao";
import { listarHistorico, type EventoHistorico } from "@/lib/gestor/dados";

export const metadata: Metadata = { title: "Histórico" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

const VERBOS: Record<string, string> = {
  aprovou_cadastro: "aprovou o cadastro de",
  recusou_cadastro: "recusou o cadastro de",
  desativou_acesso: "desativou o acesso de",
  reativou_acesso: "reativou o acesso de",
  transferiu_orgao: "alterou o órgão de",
  alterou_papel: "alterou o papel de",
  alterou_status: "alterou a situação de",
};

function descrever(evento: EventoHistorico): string {
  if (evento.acao === "reenviou_solicitacao") {
    return `${evento.alvo ?? "Uma pessoa"} corrigiu os dados e reenviou a solicitação`;
  }
  const verbo = VERBOS[evento.acao] ?? "alterou o cadastro de";
  return `${evento.ator} ${verbo} ${evento.alvo ?? "uma pessoa"}`;
}

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
              <span>{descrever(evento)}</span>
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
