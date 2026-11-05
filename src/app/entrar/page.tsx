import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioEntrar } from "@/components/auth/formulario-entrar";
import { PaginaPublica } from "@/components/layout/pagina-publica";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <PaginaPublica titulo="Entrar" descricao="Use o e-mail e a senha do seu cadastro.">
      <Suspense>
        <FormularioEntrar />
      </Suspense>
    </PaginaPublica>
  );
}
