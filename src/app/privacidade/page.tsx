import type { Metadata } from "next";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { TextoLegal } from "@/components/layout/texto-legal";
import { obterMarca } from "@/lib/marca";

export const metadata: Metadata = { title: "Política de privacidade" };

export default async function Privacidade() {
  const marca = await obterMarca();
  return (
    <PaginaPublica titulo="Política de privacidade" descricao={`Versão ${marca.termosVersao}`} larga>
      <TextoLegal texto={marca.politicaPrivacidade} />
    </PaginaPublica>
  );
}
