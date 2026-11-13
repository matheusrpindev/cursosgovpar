"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPerfil } from "@/lib/auth/sessao";
import { garantirPdfDoCertificado } from "@/lib/certificados/arquivo";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoFormulario } from "@/lib/validacao";

/**
 * Marca a aula como concluída para quem está logado. A RLS confere, no banco,
 * que a pessoa está aprovada e que a aula é de um curso liberado para o órgão dela.
 */
export async function concluirAula(aulaId: string): Promise<{ ok: boolean }> {
  const perfil = await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  const id = z.uuid().safeParse(aulaId);
  if (!id.success) return { ok: false };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("progresso_aulas").insert({ perfil_id: perfil.id, aula_id: id.data });
  // 23505 = já estava concluída.
  if (error && error.code !== "23505") {
    console.error("[aula] falha ao concluir", error.code, error.message);
    return { ok: false };
  }
  refresh();
  return { ok: true };
}

/** Emite o certificado (o banco confere se todas as aulas foram concluídas) e gera o PDF. */
export async function emitirCertificado(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  const cursoId = z.uuid().safeParse(formData.get("cursoId"));
  if (!cursoId.success) return { status: "erro", mensagem: "Curso inválido." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("emitir_certificado", { p_curso: cursoId.data });
  if (error || !data) {
    if (error?.code === "23514") return { status: "erro", mensagem: "Conclua todas as aulas para emitir o certificado." };
    console.error("[certificado] falha ao emitir", error?.code, error?.message);
    return { status: "erro", mensagem: "Não foi possível emitir o certificado agora. Tente novamente." };
  }

  try {
    await garantirPdfDoCertificado(data.id);
  } catch (erro) {
    // O certificado existe; o PDF é gerado de novo no primeiro download.
    console.error("[certificado] falha ao gerar PDF", erro);
  }
  redirect(`/certificados?novo=${encodeURIComponent(data.codigo)}`);
}
