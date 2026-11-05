import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperacao } from "@/components/auth/formulario-recuperacao";
import { PaginaPublica } from "@/components/layout/pagina-publica";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function RecuperarSenha() {
  return (
    <PaginaPublica
      titulo="Esqueci minha senha"
      descricao="Informe o e-mail do seu cadastro. Vamos enviar um link para você criar uma nova senha."
    >
      <div className="grid gap-4">
        <FormularioRecuperacao />
        <Link href="/entrar" className="text-primary text-center text-sm underline-offset-4 hover:underline">
          Voltar para a entrada
        </Link>
      </div>
    </PaginaPublica>
  );
}
