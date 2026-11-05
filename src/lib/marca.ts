import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { criarClientePublico } from "@/lib/supabase/publico";

/** Tag de cache da marca: chame updateTag(TAG_MARCA) depois de salvar as configurações. */
export const TAG_MARCA = "configuracoes";

export type Marca = {
  nomePlataforma: string;
  nomeEmpresa: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  corPrimaria: string;
  corSecundaria: string;
  textoRodape: string;
  emailContato: string | null;
  cadastroListaPublica: boolean;
  termosUso: string;
  politicaPrivacidade: string;
  termosVersao: number;
};

/**
 * Lê a marca (white-label) da tabela `configuracoes`. Fica em cache e entra
 * no HTML estático; é invalidada pela tag TAG_MARCA quando o admin salva.
 */
export async function obterMarca(): Promise<Marca> {
  "use cache";
  cacheTag(TAG_MARCA);
  cacheLife("days");

  const supabase = criarClientePublico();
  const { data, error } = await supabase
    .from("configuracoes")
    .select(
      "nome_plataforma, nome_empresa, logo_path, favicon_path, cor_primaria, cor_secundaria, texto_rodape, email_contato, cadastro_lista_publica, termos_uso, politica_privacidade, termos_versao",
    )
    .eq("id", 1)
    .single();

  if (error || !data) {
    throw new Error(
      `Não foi possível ler as configurações da marca: ${error?.message ?? "linha ausente"}`,
    );
  }

  const urlPublica = (caminho: string | null) =>
    caminho ? supabase.storage.from("marca").getPublicUrl(caminho).data.publicUrl : null;

  return {
    nomePlataforma: data.nome_plataforma,
    nomeEmpresa: data.nome_empresa,
    logoUrl: urlPublica(data.logo_path),
    faviconUrl: urlPublica(data.favicon_path),
    corPrimaria: data.cor_primaria,
    corSecundaria: data.cor_secundaria,
    textoRodape: data.texto_rodape,
    emailContato: data.email_contato,
    cadastroListaPublica: data.cadastro_lista_publica,
    termosUso: data.termos_uso,
    politicaPrivacidade: data.politica_privacidade,
    termosVersao: data.termos_versao,
  };
}
