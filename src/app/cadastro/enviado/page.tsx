import type { Metadata } from "next";
import { MailCheck } from "lucide-react";
import { FormularioReenvio } from "@/components/auth/formulario-reenvio";
import { PaginaPublica } from "@/components/layout/pagina-publica";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default function CadastroEnviado() {
  return (
    <PaginaPublica titulo="Confirme seu e-mail">
      <div className="grid gap-5">
        <div className="flex items-start gap-3">
          <MailCheck className="text-primary mt-0.5 size-6 shrink-0" aria-hidden />
          <p className="text-sm leading-relaxed">
            Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e clique em{" "}
            <strong>Confirmar e-mail</strong>. Depois disso, o seu cadastro vai para aprovação do seu órgão.
          </p>
        </div>
        <details className="text-sm">
          <summary className="text-primary cursor-pointer">Não recebeu o e-mail?</summary>
          <div className="mt-3 grid gap-3">
            <p className="text-muted-foreground">Confira a caixa de spam. Se não estiver lá, peça um novo envio:</p>
            <FormularioReenvio />
          </div>
        </details>
      </div>
    </PaginaPublica>
  );
}
