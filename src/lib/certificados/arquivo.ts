import "server-only";
import QRCode from "qrcode";
import { urlDoSite } from "@/lib/env";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarPdfDoCertificado, type DadosDoCertificado } from "./pdf";

/**
 * PDFs de certificados ficam num bucket privado. Só o servidor grava e lê,
 * com a chave de serviço; quem pode baixar é decidido antes, pela RLS
 * (ver a rota /certificados/[id]/pdf).
 */

type Admin = ReturnType<typeof criarClienteAdmin>;

async function imagemComoDataUri(admin: Admin, bucket: string, caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const tipo = /\.png$/i.test(caminho) ? "image/png" : /\.jpe?g$/i.test(caminho) ? "image/jpeg" : null;
  if (!tipo) return null; // o PDF só aceita PNG e JPG
  const { data } = await admin.storage.from(bucket).download(caminho);
  if (!data) return null;
  return `data:${tipo};base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`;
}

export function urlDeValidacao(codigo: string): string {
  return urlDoSite(`/validar/${encodeURIComponent(codigo)}`);
}

/**
 * Garante que o PDF do certificado existe no Storage e devolve o caminho.
 * O PDF é gerado uma vez, na emissão, a partir dos dados congelados; os
 * próximos downloads devolvem sempre o mesmo arquivo.
 */
export async function garantirPdfDoCertificado(certificadoId: string): Promise<string> {
  const admin = criarClienteAdmin();
  const { data: cert, error } = await admin
    .from("certificados")
    .select("id, codigo, dados, pdf_path, emitido_em")
    .eq("id", certificadoId)
    .single();
  if (error || !cert) throw new Error(`Certificado não encontrado: ${error?.message ?? certificadoId}`);
  if (cert.pdf_path) return cert.pdf_path;

  const { data: config } = await admin.from("configuracoes").select("logo_path, cert_assinatura_path").eq("id", 1).single();
  const url = urlDeValidacao(cert.codigo);
  const [logo, assinatura, qrCode] = await Promise.all([
    imagemComoDataUri(admin, "marca", config?.logo_path ?? null),
    imagemComoDataUri(admin, "assinaturas", config?.cert_assinatura_path ?? null),
    QRCode.toDataURL(url, { margin: 1, width: 320, errorCorrectionLevel: "M" }),
  ]);

  const pdf = await gerarPdfDoCertificado({
    codigo: cert.codigo,
    emitidoEm: cert.emitido_em,
    dados: cert.dados as DadosDoCertificado,
    urlValidacao: url,
    qrCode,
    logo,
    assinatura,
  });

  const caminho = `${cert.id}.pdf`;
  const envio = await admin.storage.from("certificados").upload(caminho, pdf, { contentType: "application/pdf", upsert: true });
  if (envio.error) throw new Error(`Falha ao guardar o PDF: ${envio.error.message}`);
  await admin.from("certificados").update({ pdf_path: caminho }).eq("id", cert.id).throwOnError();
  return caminho;
}

export async function baixarPdfDoCertificado(caminho: string): Promise<ArrayBuffer> {
  const { data, error } = await criarClienteAdmin().storage.from("certificados").download(caminho);
  if (error || !data) throw new Error(`Falha ao ler o PDF: ${error?.message}`);
  return data.arrayBuffer();
}

export async function apagarPdfs(caminhos: string[]): Promise<void> {
  if (caminhos.length) await criarClienteAdmin().storage.from("certificados").remove(caminhos);
}
