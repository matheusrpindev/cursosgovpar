import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { miniaturaDoVideo } from "@/lib/video";

/**
 * Consultas da área do aluno. Usam a sessão de quem está logado: a RLS só
 * devolve cursos publicados e liberados para o órgão da pessoa.
 */

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

export type AulaDoCurso = {
  id: string;
  titulo: string;
  descricao: string;
  provedor: "youtube" | "vimeo";
  videoId: string;
  videoHash: string | null;
  exigirVideoCompleto: boolean;
  ordem: number;
  concluida: boolean;
};

export type CursoDoAluno = {
  id: string;
  titulo: string;
  descricao: string;
  cargaHoraria: number;
  capaUrl: string | null;
  aulas: AulaDoCurso[];
  concluidas: number;
  percentual: number;
  certificado: { id: string; codigo: string } | null;
};

const CAMPOS_CURSO =
  "id, titulo, descricao, capa_path, carga_horaria, aulas ( id, titulo, descricao, video_provedor, video_id, video_hash, exigir_video_completo, ordem )";

export function urlDaCapa(supabase: Cliente, capaPath: string | null, aulas: { provedor: "youtube" | "vimeo"; videoId: string }[]) {
  if (capaPath) return supabase.storage.from("cursos").getPublicUrl(capaPath).data.publicUrl;
  const primeira = aulas[0];
  return primeira ? miniaturaDoVideo({ provedor: primeira.provedor, id: primeira.videoId }) : null;
}

async function montar(supabase: Cliente, perfilId: string, cursoId?: string): Promise<CursoDoAluno[]> {
  let consultaCursos = supabase.from("cursos").select(CAMPOS_CURSO).eq("status", "publicado").order("titulo");
  if (cursoId) consultaCursos = consultaCursos.eq("id", cursoId);

  const [{ data: cursos, error }, { data: progresso }, { data: certificados }] = await Promise.all([
    consultaCursos,
    supabase.from("progresso_aulas").select("aula_id").eq("perfil_id", perfilId),
    supabase.from("certificados").select("id, codigo, curso_id").eq("perfil_id", perfilId).is("revogado_em", null),
  ]);
  if (error) throw new Error(`Falha ao listar cursos: ${error.message}`);

  const feitas = new Set((progresso ?? []).map((p) => p.aula_id));
  const certPorCurso = new Map((certificados ?? []).map((c) => [c.curso_id, { id: c.id, codigo: c.codigo }]));

  return (cursos ?? []).map((curso) => {
    const aulas: AulaDoCurso[] = [...curso.aulas]
      .sort((a, b) => a.ordem - b.ordem)
      .map((a) => ({
        id: a.id,
        titulo: a.titulo,
        descricao: a.descricao,
        provedor: a.video_provedor,
        videoId: a.video_id,
        videoHash: a.video_hash,
        exigirVideoCompleto: a.exigir_video_completo,
        ordem: a.ordem,
        concluida: feitas.has(a.id),
      }));
    const concluidas = aulas.filter((a) => a.concluida).length;
    return {
      id: curso.id,
      titulo: curso.titulo,
      descricao: curso.descricao,
      cargaHoraria: Number(curso.carga_horaria),
      capaUrl: urlDaCapa(supabase, curso.capa_path, aulas),
      aulas,
      concluidas,
      percentual: aulas.length ? Math.round((concluidas / aulas.length) * 100) : 0,
      certificado: certPorCurso.get(curso.id) ?? null,
    };
  });
}

export async function listarMeusCursos(perfilId: string): Promise<CursoDoAluno[]> {
  return montar(await criarClienteServidor(), perfilId);
}

export async function obterMeuCurso(perfilId: string, cursoId: string): Promise<CursoDoAluno | null> {
  if (!/^[0-9a-f-]{36}$/i.test(cursoId)) return null;
  const [curso] = await montar(await criarClienteServidor(), perfilId, cursoId);
  return curso ?? null;
}

export type MeuCertificado = {
  id: string;
  codigo: string;
  curso: string;
  cargaHoraria: string;
  dataConclusao: string;
  emitidoEm: string;
  revogadoEm: string | null;
};

type DadosCertificado = { curso?: string; carga_horaria?: string; data_conclusao?: string; nome?: string; orgao?: string };

export async function listarMeusCertificados(perfilId: string): Promise<MeuCertificado[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("certificados")
    .select("id, codigo, dados, emitido_em, revogado_em")
    .eq("perfil_id", perfilId)
    .order("emitido_em", { ascending: false });
  if (error) throw new Error(`Falha ao listar certificados: ${error.message}`);
  return (data ?? []).map((c) => {
    const dados = (c.dados ?? {}) as DadosCertificado;
    return {
      id: c.id,
      codigo: c.codigo,
      curso: dados.curso ?? "Curso",
      cargaHoraria: dados.carga_horaria ?? "",
      dataConclusao: dados.data_conclusao ?? "",
      emitidoEm: c.emitido_em,
      revogadoEm: c.revogado_em,
    };
  });
}

/** Formata a carga horária: 4 -> "4 h", 1.5 -> "1,5 h". */
export function formatarCarga(horas: number): string {
  return `${String(horas).replace(".", ",")} h`;
}
