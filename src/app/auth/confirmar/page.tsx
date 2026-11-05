import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmarLink } from "@/components/auth/confirmar-link";
import { PaginaPublica } from "@/components/layout/pagina-publica";

export const metadata: Metadata = { title: "Confirmação", robots: { index: false } };

export default function Confirmar() {
  return (
    <PaginaPublica titulo="Quase lá">
      <Suspense>
        <ConfirmarLink />
      </Suspense>
    </PaginaPublica>
  );
}
