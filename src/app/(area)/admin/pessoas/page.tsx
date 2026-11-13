import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Secao } from "@/components/admin/secao";
import { Campo } from "@/components/formulario/campo";
import { CampoCpf } from "@/components/formulario/campo-cpf";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { SeloStatus } from "@/components/gestor/selo-status";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { anonimizarPessoa, convidarGestor, gerarLinkDeSenha, mudarAcessoDaPessoa } from "@/lib/admin/acoes";
import { listarPessoasAdmin, PESSOAS_POR_PAGINA } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Pessoas" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

const PAPEIS = { admin: "Administrador", gestor: "Gestor", aluno: "Aluno" } as const;
const classeSelect = "border-input bg-background h-11 rounded-lg border px-3 text-base";

const texto = (valor: string | string[] | undefined) => (typeof valor === "string" ? valor : "");

export default async function Pessoas({ searchParams }: PageProps<"/admin/pessoas">) {
  const eu = await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const params = await searchParams;
  const busca = texto(params.busca).slice(0, 80);
  const orgaoId = texto(params.orgao);
  const pagina = Math.max(1, Number.parseInt(texto(params.pagina), 10) || 1);
  const { pessoas, total, orgaos } = await listarPessoasAdmin({ busca, orgaoId, pagina });
  const totalPaginas = Math.max(1, Math.ceil(total / PESSOAS_POR_PAGINA));

  const endereco = (p: number) => {
    const q = new URLSearchParams();
    if (busca) q.set("busca", busca);
    if (orgaoId) q.set("orgao", orgaoId);
    if (p > 1) q.set("pagina", String(p));
    return `/admin/pessoas${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Pessoas"
        descricao="Todos os cadastros da plataforma. Alunos são aprovados pelo gestor do órgão; gestores são criados aqui."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="grid gap-4">
          <form action="/admin/pessoas" className="flex flex-col gap-2 sm:flex-row" role="search">
            <label htmlFor="busca" className="sr-only">
              Buscar por nome ou e-mail
            </label>
            <Input id="busca" name="busca" defaultValue={busca} placeholder="Buscar por nome ou e-mail" className="h-11 text-base" />
            <label htmlFor="orgao" className="sr-only">
              Órgão
            </label>
            <select id="orgao" name="orgao" defaultValue={orgaoId} className={classeSelect}>
              <option value="">Todos os órgãos</option>
              {orgaos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="h-11">
              <Search aria-hidden />
              Buscar
            </Button>
          </form>

          {pessoas.length === 0 ? (
            <EstadoVazio Icone={Users} titulo="Ninguém encontrado" />
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {total} {total === 1 ? "pessoa" : "pessoas"}
              </p>
              <ul className="bg-background divide-y rounded-xl border" aria-label="Pessoas">
                {pessoas.map((p) => (
                  <li key={p.id} className="grid gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{p.nome}</span>
                      <Badge variant="outline" className="h-6 px-2.5">
                        {PAPEIS[p.papel]}
                      </Badge>
                      {p.anonimizada ? (
                        <Badge className="h-6 bg-zinc-200 px-2.5 text-zinc-800">Anonimizada</Badge>
                      ) : (
                        <SeloStatus status={p.status} />
                      )}
                    </div>
                    {p.anonimizada ? (
                      <p className="text-muted-foreground text-sm">Dados pessoais removidos · {p.orgao ?? "sem órgão"}</p>
                    ) : (
                      <p className="text-muted-foreground text-sm break-all">
                        {p.email} · CPF {p.cpfMascarado ?? "—"} · {p.orgao ?? "Toda a plataforma"}
                      </p>
                    )}
                    {!p.anonimizada && p.id !== eu.id && p.papel !== "admin" ? (
                      <details className="text-sm">
                        <summary className="text-primary cursor-pointer">Ações</summary>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <FormularioAcao acao={gerarLinkDeSenha} rotulo="Gerar link de nova senha" variante="outline" rotuloEnviando="Gerando…" className="sm:col-span-2">
                            <input type="hidden" name="perfilId" value={p.id} />
                          </FormularioAcao>
                          {p.status === "aprovado" || p.status === "desativado" ? (
                            <FormularioAcao
                              key={p.status}
                              acao={mudarAcessoDaPessoa}
                              rotulo={p.status === "aprovado" ? "Desativar acesso" : "Reativar acesso"}
                              variante="outline"
                              confirmar={p.status === "aprovado" ? `Desativar o acesso de ${p.nome}?` : undefined}
                            >
                              <input type="hidden" name="perfilId" value={p.id} />
                              <input type="hidden" name="para" value={p.status === "aprovado" ? "desativado" : "aprovado"} />
                            </FormularioAcao>
                          ) : null}
                          <FormularioAcao
                            acao={anonimizarPessoa}
                            rotulo="Anonimizar (LGPD)"
                            variante="destructive"
                            confirmar={`Remover os dados pessoais de ${p.nome}? Nome, e-mail e CPF são apagados, a conta é bloqueada e os certificados dela são excluídos. Não tem volta.`}
                          >
                            <input type="hidden" name="perfilId" value={p.id} />
                          </FormularioAcao>
                        </div>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
              {totalPaginas > 1 ? (
                <nav aria-label="Páginas" className="flex items-center justify-between gap-2 text-sm">
                  {pagina > 1 ? (
                    <Link href={endereco(pagina - 1)} className="text-primary underline-offset-4 hover:underline">
                      ← Anterior
                    </Link>
                  ) : (
                    <span />
                  )}
                  <span className="text-muted-foreground">
                    Página {pagina} de {totalPaginas}
                  </span>
                  {pagina < totalPaginas ? (
                    <Link href={endereco(pagina + 1)} className="text-primary underline-offset-4 hover:underline">
                      Próxima →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>

        <Secao
          titulo="Novo gestor"
          descricao="O gestor aprova os cadastros do órgão e acompanha o progresso. A conta já nasce liberada; você recebe um link para ele definir a senha."
        >
          <FormularioAcao acao={convidarGestor} rotulo="Criar gestor" rotuloEnviando="Criando…">
            <Campo nome="nome" rotulo="Nome completo" autoComplete="off" required />
            <Campo nome="email" rotulo="E-mail" type="email" autoComplete="off" required />
            <CampoCpf />
            <div className="grid gap-1.5">
              <Label htmlFor="orgao-gestor">Órgão</Label>
              <select id="orgao-gestor" name="orgaoId" required defaultValue="" className={classeSelect}>
                <option value="" disabled>
                  Escolha…
                </option>
                {orgaos
                  .filter((o) => o.ativo)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
              </select>
            </div>
          </FormularioAcao>
        </Secao>
      </div>
    </>
  );
}
