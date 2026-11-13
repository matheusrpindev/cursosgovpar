import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioEntrar } from "@/components/auth/formulario-entrar";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { CONTAS_DEMONSTRACAO, modoDemonstracao, SENHA_DEMONSTRACAO } from "@/lib/demo";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <PaginaPublica titulo="Entrar" descricao="Use o e-mail e a senha do seu cadastro.">
      <Suspense>
        <FormularioEntrar />
      </Suspense>
      {modoDemonstracao() ? (
        <div className="bg-muted mt-6 grid gap-2 rounded-lg p-4 text-sm">
          <p className="font-semibold">Ambiente de demonstração</p>
          <p className="text-muted-foreground">
            Os dados são fictícios e nenhum e-mail é enviado. Contas de exemplo (senha de todas:{" "}
            <code className="text-foreground font-semibold">{SENHA_DEMONSTRACAO}</code>):
          </p>
          <ul className="grid gap-1">
            {CONTAS_DEMONSTRACAO.map((conta) => (
              <li key={conta.email}>
                <code className="break-all">{conta.email}</code>
                <span className="text-muted-foreground"> — {conta.papel}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Para testar o cadastro de um aluno novo, use{" "}
            <Link href="/cadastro/vila-serena" className="text-primary underline underline-offset-4">
              o link de cadastro da Prefeitura de Vila Serena
            </Link>{" "}
            e depois aprove o pedido entrando como gestora.
          </p>
        </div>
      ) : null}
    </PaginaPublica>
  );
}
