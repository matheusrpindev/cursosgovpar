import type { Metadata } from "next";
import Link from "next/link";
import { Secao } from "@/components/admin/secao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { obterVisaoGeral } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarDataHora } from "@/lib/formatacao";
import { descreverEvento } from "@/lib/historico";

export const metadata: Metadata = { title: "Administração" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function PainelAdmin() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const visao = await obterVisaoGeral();

  const numeros = [
    { rotulo: "Órgãos ativos", valor: visao.orgaos, href: "/admin/orgaos" },
    { rotulo: "Alunos com acesso", valor: visao.alunos, href: "/admin/pessoas" },
    { rotulo: "Gestores", valor: visao.gestores, href: "/admin/pessoas" },
    { rotulo: "Cadastros aguardando gestor", valor: visao.pendentes, href: "/admin/pessoas" },
    { rotulo: "Cursos publicados", valor: visao.cursosPublicados, href: "/admin/cursos", extra: visao.rascunhos ? `+ ${visao.rascunhos} em rascunho` : undefined },
    { rotulo: "Certificados válidos", valor: visao.certificados, href: "/admin/certificados" },
  ];

  return (
    <>
      <CabecalhoPagina titulo="Visão geral" descricao="Resumo de toda a plataforma." />
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Números da plataforma">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <Link href={n.href} className="bg-background hover:ring-primary/40 grid gap-1 rounded-xl border p-4 transition hover:ring-2">
              <span className="text-3xl font-bold tabular-nums">{n.valor}</span>
              <span className="text-muted-foreground text-sm">{n.rotulo}</span>
              {n.extra ? <span className="text-muted-foreground text-xs">{n.extra}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <Secao titulo="Atividade recente" descricao="Últimas ações registradas em todos os órgãos.">
        {visao.recentes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada registrado ainda.</p>
        ) : (
          <ul className="divide-y">
            {visao.recentes.map((e) => (
              <li key={e.id} className="grid gap-0.5 py-2.5 text-sm">
                <span>{descreverEvento(e)}</span>
                <span className="text-muted-foreground text-xs">
                  {formatarDataHora(e.criadoEm)}
                  {e.orgao ? ` · ${e.orgao}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </>
  );
}
