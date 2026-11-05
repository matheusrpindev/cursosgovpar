import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { envServidor } from "@/lib/env-servidor";
import { obterMarca } from "@/lib/marca";

type Mensagem = {
  para: string | string[];
  assunto: string;
  conteudo: ReactElement;
};

/** Pasta onde os e-mails são gravados em desenvolvimento (transporte "arquivo"). */
export const PASTA_EMAILS_LOCAIS = path.join(process.cwd(), ".emails");

function remetente(nomePlataforma: string, endereco: string): string {
  const nome = nomePlataforma.replace(/["<>]/g, "").trim();
  return `"${nome}" <${endereco}>`;
}

/**
 * Envia um e-mail transacional.
 * - Produção: Resend (RESEND_API_KEY + EMAIL_REMETENTE). O nome do remetente vem da marca.
 * - Desenvolvimento: grava o HTML em .emails/ e mostra no console.
 */
export async function enviarEmail({ para, assunto, conteudo }: Mensagem): Promise<void> {
  const env = envServidor();
  const transporte = env.EMAIL_TRANSPORTE ?? (env.RESEND_API_KEY ? "resend" : "arquivo");
  const [html, texto] = await Promise.all([
    render(conteudo),
    render(conteudo, { plainText: true }),
  ]);

  if (transporte === "resend") {
    if (!env.RESEND_API_KEY || !env.EMAIL_REMETENTE) {
      throw new Error("Configure RESEND_API_KEY e EMAIL_REMETENTE para enviar e-mails.");
    }
    const marca = await obterMarca();
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: remetente(marca.nomePlataforma, env.EMAIL_REMETENTE),
      to: para,
      replyTo: marca.emailContato ?? undefined,
      subject: assunto,
      html,
      text: texto,
    });
    if (error) {
      throw new Error(`Falha ao enviar e-mail: ${error.message}`);
    }
    return;
  }

  if (process.env.VERCEL) {
    throw new Error("Transporte de e-mail 'arquivo' não funciona na Vercel. Configure o Resend.");
  }

  await mkdir(PASTA_EMAILS_LOCAIS, { recursive: true });
  const base = `${Date.now()}-${assunto.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").slice(0, 50)}`;
  await writeFile(path.join(PASTA_EMAILS_LOCAIS, `${base}.html`), html);
  await writeFile(
    path.join(PASTA_EMAILS_LOCAIS, `${base}.json`),
    JSON.stringify({ para, assunto, texto }, null, 2),
  );
  console.info(`[e-mail] "${assunto}" para ${[para].flat().join(", ")} — salvo em .emails/${base}.html`);
}
