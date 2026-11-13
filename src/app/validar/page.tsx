import type { Metadata } from "next";
import { FormularioValidar } from "@/components/formulario-validar";
import { PaginaPublica } from "@/components/layout/pagina-publica";

export const metadata: Metadata = { title: "Validar certificado" };

export default function Validar() {
  return (
    <PaginaPublica titulo="Validar certificado" descricao="Confira se um certificado foi mesmo emitido por esta plataforma.">
      <FormularioValidar />
    </PaginaPublica>
  );
}
