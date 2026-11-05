import type { Metadata } from "next";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { TextoLegal } from "@/components/layout/texto-legal";
import { obterMarca } from "@/lib/marca";

export const metadata: Metadata = { title: "Termos de uso" };

export default async function Termos() {
  const marca = await obterMarca();
  return (
    <PaginaPublica titulo="Termos de uso" descricao={`Versão ${marca.termosVersao}`} larga>
      <TextoLegal texto={marca.termosUso} />
    </PaginaPublica>
  );
}
