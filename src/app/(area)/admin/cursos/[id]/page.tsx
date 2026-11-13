import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { CamposCurso } from "@/components/admin/campos-curso";
import { Secao } from "@/components/admin/secao";
import { Campo } from "@/components/formulario/campo";
import { CampoMarcar, CampoTextoLongo } from "@/components/formulario/campo-texto-longo";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Badge } from "@/components/ui/badge";
import {
  excluirAula,
  excluirCurso,
  moverAula,
  mudarStatusCurso,
  salvarAula,
  salvarCurso,
  salvarLiberacoes,
} from "@/lib/admin/acoes";
import { obterCursoAdmin } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";
import { linkDoVideo } from "@/lib/video";

export const metadata: Metadata = { title: "Editar curso" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

type Aula = NonNullable<Awaited<ReturnType<typeof obterCursoAdmin>>>["aulas"][number];

function CamposAula({ cursoId, aula }: { cursoId: string; aula?: Aula }) {
  const sufixo = aula?.id ?? "nova";
  return (
    <>
      <input type="hidden" name="cursoId" value={cursoId} />
      {aula ? <input type="hidden" name="aulaId" value={aula.id} /> : null}
      <Campo id={`titulo-${sufixo}`} nome="titulo" rotulo="Título da aula" defaultValue={aula?.titulo} maxLength={200} required />
      <Campo
        id={`video-${sufixo}`}
        nome="video"
        rotulo="Link do vídeo (YouTube ou Vimeo)"
        defaultValue={aula ? linkDoVideo({ provedor: aula.video_provedor, id: aula.video_id, hash: aula.video_hash }) : ""}
        placeholder="https://www.youtube.com/watch?v=..."
        inputMode="url"
        ajuda="Cole o link como aparece no navegador. Vídeos “não listados” funcionam; vídeos “privados”, não."
        required
      />
      <CampoTextoLongo id={`descricao-${sufixo}`} nome="descricao" rotulo="Descrição (opcional)" defaultValue={aula?.descricao} rows={3} />
      <CampoMarcar
        id={`exigir-${sufixo}`}
        nome="exigirVideoCompleto"
        rotulo="Só concluir quando o vídeo terminar"
        ajuda="Marcado: a aula é concluída sozinha no fim do vídeo. Desmarcado: o aluno pode marcar como concluída a qualquer momento."
        defaultChecked={aula?.exigir_video_completo ?? true}
      />
    </>
  );
}

export default async function EditarCurso({ params }: PageProps<"/admin/cursos/[id]">) {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const { id } = await params;
  const curso = await obterCursoAdmin(id);
  if (!curso) notFound();
  const publicado = curso.status === "publicado";

  return (
    <>
      <p className="mb-3 text-sm">
        <Link href="/admin/cursos" className="text-primary underline-offset-4 hover:underline">
          ← Cursos
        </Link>
      </p>
      <CabecalhoPagina
        titulo={curso.titulo}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {publicado ? (
              <Badge className="h-6 bg-emerald-100 px-2.5 text-emerald-900">Publicado</Badge>
            ) : (
              <Badge className="h-6 bg-amber-100 px-2.5 text-amber-900">Rascunho</Badge>
            )}
            {publicado ? "Visível para os órgãos liberados." : "Ainda não aparece para ninguém."}
          </span>
        }
        acoes={
          <FormularioAcao
            acao={mudarStatusCurso}
            rotulo={publicado ? "Voltar para rascunho" : "Publicar curso"}
            variante={publicado ? "outline" : "default"}
            classeBotao="h-11"
          >
            <input type="hidden" name="cursoId" value={curso.id} />
            <input type="hidden" name="status" value={publicado ? "rascunho" : "publicado"} />
          </FormularioAcao>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="grid gap-6">
          <Secao titulo="Aulas" descricao="Os alunos veem as aulas nesta ordem. Use as setas para reordenar.">
            {curso.aulas.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma aula ainda. Adicione a primeira abaixo.</p>
            ) : (
              <ol className="divide-y rounded-lg border">
                {curso.aulas.map((aula, indice) => (
                  <li key={aula.id} className="grid gap-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-6 text-sm tabular-nums">{indice + 1}.</span>
                      <span className="flex-1 text-sm font-medium">{aula.titulo}</span>
                      <FormularioAcao
                        acao={moverAula}
                        rotulo={<ArrowUp aria-hidden />}
                        rotuloAcessivel={`Subir a aula ${aula.titulo}`}
                        variante="outline"
                        classeBotao="size-9 p-0"
                        className={indice === 0 ? "invisible" : undefined}
                      >
                        <input type="hidden" name="aulaId" value={aula.id} />
                        <input type="hidden" name="direcao" value="sobe" />
                      </FormularioAcao>
                      <FormularioAcao
                        acao={moverAula}
                        rotulo={<ArrowDown aria-hidden />}
                        rotuloAcessivel={`Descer a aula ${aula.titulo}`}
                        variante="outline"
                        classeBotao="size-9 p-0"
                        className={indice === curso.aulas.length - 1 ? "invisible" : undefined}
                      >
                        <input type="hidden" name="aulaId" value={aula.id} />
                        <input type="hidden" name="direcao" value="desce" />
                      </FormularioAcao>
                    </div>
                    <details className="ml-8 text-sm">
                      <summary className="text-primary cursor-pointer">Editar ou excluir</summary>
                      <div className="mt-3 grid gap-4">
                        <FormularioAcao acao={salvarAula} rotulo="Salvar aula">
                          <CamposAula cursoId={curso.id} aula={aula} />
                        </FormularioAcao>
                        <FormularioAcao
                          acao={excluirAula}
                          rotulo={
                            <>
                              <Trash2 aria-hidden />
                              Excluir aula
                            </>
                          }
                          variante="destructive"
                          confirmar={`Excluir a aula “${aula.titulo}”? O progresso dos alunos nesta aula também é apagado.`}
                        >
                          <input type="hidden" name="aulaId" value={aula.id} />
                        </FormularioAcao>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            )}
            <div className="grid gap-3 border-t pt-4">
              <h3 className="font-medium">Adicionar aula</h3>
              <FormularioAcao acao={salvarAula} rotulo="Adicionar aula" rotuloEnviando="Adicionando…" limparAoConcluir>
                <CamposAula cursoId={curso.id} />
              </FormularioAcao>
            </div>
          </Secao>

          <Secao titulo="Dados do curso">
            <FormularioAcao acao={salvarCurso} rotulo="Salvar dados do curso">
              <input type="hidden" name="cursoId" value={curso.id} />
              <CamposCurso curso={curso} />
            </FormularioAcao>
          </Secao>
        </div>

        <div className="grid gap-6">
          <Secao titulo="Órgãos com acesso" descricao="Só as pessoas dos órgãos marcados veem este curso.">
            {curso.orgaos.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum órgão cadastrado.{" "}
                <Link href="/admin/orgaos" className="text-primary underline underline-offset-4">
                  Cadastrar órgão
                </Link>
              </p>
            ) : (
              <FormularioAcao acao={salvarLiberacoes} rotulo="Salvar liberações">
                <input type="hidden" name="cursoId" value={curso.id} />
                {curso.orgaos.map((orgao) => (
                  <CampoMarcar
                    key={orgao.id}
                    nome="orgao"
                    value={orgao.id}
                    rotulo={orgao.nome}
                    ajuda={orgao.ativo ? undefined : "Órgão inativo"}
                    defaultChecked={curso.liberados.has(orgao.id)}
                  />
                ))}
              </FormularioAcao>
            )}
          </Secao>

          <Secao titulo="Excluir curso" descricao="Não tem volta. Cursos com certificados emitidos não podem ser excluídos.">
            <FormularioAcao
              acao={excluirCurso}
              rotulo="Excluir este curso"
              variante="destructive"
              confirmar="Excluir o curso, as aulas e o progresso dos alunos nele?"
            >
              <input type="hidden" name="cursoId" value={curso.id} />
            </FormularioAcao>
          </Secao>
        </div>
      </div>
    </>
  );
}
