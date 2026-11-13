import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { BotaoCopiar } from "@/components/admin/botao-copiar";
import { Secao } from "@/components/admin/secao";
import { Campo } from "@/components/formulario/campo";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { Badge } from "@/components/ui/badge";
import { alternarOrgao, salvarOrgao } from "@/lib/admin/acoes";
import { listarOrgaosAdmin } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";
import { urlDoSite } from "@/lib/env";

export const metadata: Metadata = { title: "Órgãos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Orgaos() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const orgaos = await listarOrgaosAdmin();

  return (
    <>
      <CabecalhoPagina
        titulo="Órgãos"
        descricao="Cada órgão tem um link de cadastro próprio. Envie o link ao órgão: quem se cadastra por ele cai na fila do gestor."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        {orgaos.length === 0 ? (
          <EstadoVazio Icone={Building2} titulo="Nenhum órgão cadastrado" />
        ) : (
          <ul className="grid gap-4" aria-label="Órgãos">
            {orgaos.map((orgao) => {
              const link = urlDoSite(`/cadastro/${orgao.slug}`);
              return (
                <li key={orgao.id} className="bg-background grid gap-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{orgao.nome}</h2>
                    {orgao.ativo ? (
                      <Badge className="h-6 bg-emerald-100 px-2.5 text-emerald-900">Ativo</Badge>
                    ) : (
                      <Badge className="h-6 bg-zinc-200 px-2.5 text-zinc-800">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {orgao.gestores} {orgao.gestores === 1 ? "gestor" : "gestores"} · {orgao.alunos}{" "}
                    {orgao.alunos === 1 ? "aluno" : "alunos"} com acesso · {orgao.pendentes} aguardando aprovação · {orgao.cursos}{" "}
                    {orgao.cursos === 1 ? "curso liberado" : "cursos liberados"}
                  </p>
                  {orgao.gestores === 0 && orgao.ativo ? (
                    <p className="text-sm text-amber-800">
                      Este órgão ainda não tem gestor: os pedidos de cadastro são avisados aos administradores.
                    </p>
                  ) : null}
                  <div className="bg-muted flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="text-muted-foreground text-xs">Link de cadastro</p>
                      <code className="text-sm break-all">{link}</code>
                    </div>
                    <BotaoCopiar texto={link} />
                  </div>
                  <details className="text-sm">
                    <summary className="text-primary cursor-pointer">Editar ou {orgao.ativo ? "inativar" : "reativar"}</summary>
                    <div className="mt-3 grid gap-4">
                      <FormularioAcao acao={salvarOrgao} rotulo="Salvar">
                        <input type="hidden" name="orgaoId" value={orgao.id} />
                        <Campo id={`nome-${orgao.id}`} nome="nome" rotulo="Nome" defaultValue={orgao.nome} required />
                        <Campo
                          id={`slug-${orgao.id}`}
                          nome="slug"
                          rotulo="Final do link de cadastro"
                          defaultValue={orgao.slug}
                          ajuda="Se você mudar, o link antigo para de funcionar."
                          required
                        />
                      </FormularioAcao>
                      <FormularioAcao
                        acao={alternarOrgao}
                        rotulo={orgao.ativo ? "Inativar órgão" : "Reativar órgão"}
                        variante={orgao.ativo ? "destructive" : "outline"}
                        confirmar={
                          orgao.ativo
                            ? `Inativar ${orgao.nome}? Ninguém do órgão acessa os cursos até a reativação. Certificados já emitidos continuam válidos.`
                            : undefined
                        }
                      >
                        <input type="hidden" name="orgaoId" value={orgao.id} />
                        <input type="hidden" name="ativo" value={orgao.ativo ? "false" : "true"} />
                      </FormularioAcao>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}

        <Secao titulo="Novo órgão">
          <FormularioAcao acao={salvarOrgao} rotulo="Criar órgão" rotuloEnviando="Criando…" limparAoConcluir>
            <Campo nome="nome" rotulo="Nome do órgão" placeholder="Ex.: Prefeitura de Exemplo" required />
            <Campo
              nome="slug"
              rotulo="Final do link de cadastro (opcional)"
              placeholder="prefeitura-de-exemplo"
              ajuda="Só letras minúsculas, números e hífen. Em branco, é criado a partir do nome."
            />
          </FormularioAcao>
        </Secao>
      </div>
    </>
  );
}
