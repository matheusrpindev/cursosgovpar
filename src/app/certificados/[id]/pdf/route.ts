import { baixarPdfDoCertificado, garantirPdfDoCertificado } from "@/lib/certificados/arquivo";
import { criarClienteServidor } from "@/lib/supabase/server";

/**
 * Download do PDF. A permissão é decidida pela RLS: a consulta abaixo usa a
 * sessão de quem pede e só encontra o certificado se for da própria pessoa,
 * do órgão do gestor ou se quem pede for admin. Só depois o arquivo é lido.
 */
export async function GET(_: Request, { params }: RouteContext<"/certificados/[id]/pdf">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const supabase = await criarClienteServidor();
  const { data: cert } = await supabase.from("certificados").select("id, codigo").eq("id", id).maybeSingle();
  if (!cert) return new Response("Não encontrado", { status: 404 });

  try {
    const caminho = await garantirPdfDoCertificado(cert.id);
    const pdf = await baixarPdfDoCertificado(caminho);
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="certificado-${cert.codigo}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    console.error("[certificado] falha no download", erro);
    return new Response("Não foi possível gerar o certificado agora. Tente novamente.", { status: 500 });
  }
}
