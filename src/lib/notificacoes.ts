import "server-only";
import { urlDoSite } from "@/lib/env";
import { enviarEmail } from "@/lib/email/enviar";
import { EmailNovoCadastro } from "@/lib/email/modelos/novo-cadastro";
import { EmailCadastroAprovado, EmailCadastroRecusado } from "@/lib/email/modelos/resultado-cadastro";
import { obterMarca } from "@/lib/marca";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/**
 * Avisa os gestores do órgão de que há um cadastro pendente para analisar.
 *
 * Idempotente: o pedido é "reservado" com notificado_em numa única operação no
 * banco, então chamadas repetidas (ou simultâneas) avisam uma vez só. Se o órgão
 * não tiver gestor ativo, os administradores são avisados para o pedido não ficar parado.
 * Usa a chave de serviço porque precisa ler e-mails de outras pessoas.
 */
export async function avisarGestoresDoPedido(perfilId: string): Promise<void> {
  const admin = criarClienteAdmin();

  const { data: pedido } = await admin
    .from("perfis")
    .update({ notificado_em: new Date().toISOString() })
    .eq("id", perfilId)
    .eq("papel", "aluno")
    .eq("status", "pendente")
    .not("email_confirmado_em", "is", null)
    .is("notificado_em", null)
    .select("nome, organizacao_id, organizacoes ( nome )")
    .maybeSingle();
  if (!pedido?.organizacao_id) return;

  const { data: gestores } = await admin
    .from("perfis")
    .select("nome, email")
    .eq("organizacao_id", pedido.organizacao_id)
    .eq("papel", "gestor")
    .eq("status", "aprovado")
    .is("anonimizado_em", null);

  let destinatarios = gestores ?? [];
  let link = urlDoSite("/gestor");
  if (destinatarios.length === 0) {
    const { data: admins } = await admin
      .from("perfis")
      .select("nome, email")
      .eq("papel", "admin")
      .eq("status", "aprovado");
    destinatarios = admins ?? [];
    link = urlDoSite("/admin");
  }

  const marca = await obterMarca();
  const orgao = pedido.organizacoes?.nome ?? "seu órgão";
  const resultados = await Promise.allSettled(
    destinatarios.map((destinatario) =>
      enviarEmail({
        para: destinatario.email,
        assunto: `Novo cadastro para aprovar — ${marca.nomePlataforma}`,
        conteudo: EmailNovoCadastro({
          marca,
          nomeDestinatario: destinatario.nome,
          nomeAluno: pedido.nome,
          orgao,
          link,
        }),
      }),
    ),
  );

  const falhas = resultados.filter((r) => r.status === "rejected");
  if (falhas.length > 0) {
    console.error("[aviso-gestores] falhas no envio", falhas.map((f) => (f as PromiseRejectedResult).reason));
  }
  if (destinatarios.length > 0 && falhas.length === destinatarios.length) {
    // Nenhum aviso saiu: libera para tentar de novo no próximo acesso da pessoa.
    await admin.from("perfis").update({ notificado_em: null }).eq("id", perfilId);
  }
}

type Resultado = { email: string; nome: string; orgao: string } & (
  | { aprovado: true }
  | { aprovado: false; motivo: string | null }
);

/** Envia ao aluno o resultado da análise do cadastro. */
export async function avisarResultadoDoCadastro(resultado: Resultado): Promise<void> {
  const marca = await obterMarca();
  const link = urlDoSite("/entrar");
  try {
    await enviarEmail(
      resultado.aprovado
        ? {
            para: resultado.email,
            assunto: `Seu acesso foi liberado — ${marca.nomePlataforma}`,
            conteudo: EmailCadastroAprovado({ marca, nome: resultado.nome, orgao: resultado.orgao, link }),
          }
        : {
            para: resultado.email,
            assunto: `Seu cadastro não foi aprovado — ${marca.nomePlataforma}`,
            conteudo: EmailCadastroRecusado({
              marca,
              nome: resultado.nome,
              orgao: resultado.orgao,
              motivo: resultado.motivo,
              link,
            }),
          },
    );
  } catch (erro) {
    console.error("[resultado-cadastro] falha no envio", erro);
  }
}
