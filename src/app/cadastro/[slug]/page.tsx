import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormularioCadastro } from "@/components/auth/formulario-cadastro";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { orgaoDoLinkDeCadastro } from "@/lib/orgaos-publicos";

export const metadata: Metadata = { title: "Criar conta" };

async function ConteudoCadastro({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const orgao = /^[a-z0-9-]{1,80}$/.test(slug) ? await orgaoDoLinkDeCadastro(slug) : null;

  if (!orgao) {
    return (
      <p className="text-sm leading-relaxed">
        Este link de cadastro não é válido ou o órgão não está ativo. Confira o link com o responsável no seu órgão.
      </p>
    );
  }
  return <FormularioCadastro slug={slug} orgao={orgao.nome} />;
}

export default function CadastroDoOrgao({ params }: PageProps<"/cadastro/[slug]">) {
  return (
    <PaginaPublica
      titulo="Criar conta"
      descricao={
        <>
          Depois do cadastro, confirme o seu e-mail. O acesso é liberado após a aprovação do seu órgão. Já tem conta?{" "}
          <Link href="/entrar" className="text-primary underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-muted-foreground text-sm">Carregando…</p>}>
        <ConteudoCadastro params={params} />
      </Suspense>
    </PaginaPublica>
  );
}
