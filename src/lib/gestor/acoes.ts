"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { exigirPerfil } from "@/lib/auth/sessao";
import { avisarResultadoDoCadastro } from "@/lib/notificacoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { esquemaMotivoRecusa, type EstadoFormulario } from "@/lib/validacao";

/**
 * Ações do gestor (e do admin) sobre cadastros. Cada uma confere o papel aqui e
 * grava com a sessão de quem está logado: a RLS e as travas do banco decidem o
 * que é permitido (ex.: gestor só altera alunos do próprio órgão).
 */

const NAO_ENCONTRADO = "Este cadastro não está mais na situação esperada. Atualize a página.";

async function contexto(formData: FormData) {
  await exigirPerfil({ papeis: ["gestor", "admin"], acessoAtivo: true });
  const id = z.uuid().safeParse(formData.get("perfilId"));
  return { id: id.success ? id.data : null, supabase: await criarClienteServidor() };
}

function mensagemDeErro(erro: { code?: string; message: string }): string {
  if (erro.code === "42501") return "Você não tem permissão para esta alteração.";
  console.error("[gestor] falha ao alterar perfil", erro.code, erro.message);
  return "Não foi possível salvar agora. Tente novamente.";
}

export async function aprovarCadastro(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { id, supabase } = await contexto(formData);
  if (!id) return { status: "erro", mensagem: NAO_ENCONTRADO };

  const { data, error } = await supabase
    .from("perfis")
    .update({ status: "aprovado" })
    .eq("id", id)
    .eq("papel", "aluno")
    .eq("status", "pendente")
    .select("nome, email, organizacoes ( nome )")
    .maybeSingle();
  if (error) return { status: "erro", mensagem: mensagemDeErro(error) };
  if (!data) return { status: "erro", mensagem: NAO_ENCONTRADO };

  after(() =>
    avisarResultadoDoCadastro({
      aprovado: true,
      email: data.email,
      nome: data.nome,
      orgao: data.organizacoes?.nome ?? "Seu órgão",
    }),
  );
  refresh();
  return { status: "sucesso", mensagem: `${data.nome} foi aprovado(a).` };
}

export async function recusarCadastro(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { id, supabase } = await contexto(formData);
  if (!id) return { status: "erro", mensagem: NAO_ENCONTRADO };

  const motivo = esquemaMotivoRecusa.safeParse(formData.get("motivo") ?? "");
  if (!motivo.success) {
    return { status: "erro", erros: { motivo: motivo.error.issues.map((i) => i.message) } };
  }

  const { data, error } = await supabase
    .from("perfis")
    .update({ status: "recusado", motivo_recusa: motivo.data || null })
    .eq("id", id)
    .eq("papel", "aluno")
    .eq("status", "pendente")
    .select("nome, email, motivo_recusa, organizacoes ( nome )")
    .maybeSingle();
  if (error) return { status: "erro", mensagem: mensagemDeErro(error) };
  if (!data) return { status: "erro", mensagem: NAO_ENCONTRADO };

  after(() =>
    avisarResultadoDoCadastro({
      aprovado: false,
      email: data.email,
      nome: data.nome,
      orgao: data.organizacoes?.nome ?? "Seu órgão",
      motivo: data.motivo_recusa,
    }),
  );
  refresh();
  return { status: "sucesso", mensagem: `O cadastro de ${data.nome} foi recusado.` };
}

async function mudarAcesso(formData: FormData, de: "aprovado" | "desativado", para: "aprovado" | "desativado") {
  const { id, supabase } = await contexto(formData);
  if (!id) return { status: "erro", mensagem: NAO_ENCONTRADO } satisfies EstadoFormulario;

  const { data, error } = await supabase
    .from("perfis")
    .update({ status: para })
    .eq("id", id)
    .eq("papel", "aluno")
    .eq("status", de)
    .select("nome")
    .maybeSingle();
  if (error) return { status: "erro", mensagem: mensagemDeErro(error) } satisfies EstadoFormulario;
  if (!data) return { status: "erro", mensagem: NAO_ENCONTRADO } satisfies EstadoFormulario;

  refresh();
  return {
    status: "sucesso",
    mensagem: para === "desativado" ? `O acesso de ${data.nome} foi desativado.` : `O acesso de ${data.nome} foi reativado.`,
  } satisfies EstadoFormulario;
}

/** A pessoa perde o acesso; certificados já emitidos continuam válidos. */
export async function desativarAcesso(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  return mudarAcesso(formData, "aprovado", "desativado");
}

export async function reativarAcesso(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  return mudarAcesso(formData, "desativado", "aprovado");
}
