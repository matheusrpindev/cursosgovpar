import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { obterMarca } from "@/lib/marca";
import { orgaosComCadastroPublico } from "@/lib/orgaos-publicos";

export const metadata: Metadata = { title: "Criar conta" };

export default async function Cadastro() {
  const marca = await obterMarca();
  const orgaos = marca.cadastroListaPublica ? await orgaosComCadastroPublico() : [];

  if (!marca.cadastroListaPublica || orgaos.length === 0) {
    return (
      <PaginaPublica titulo="Criar conta">
        <p className="text-sm leading-relaxed">
          O cadastro é feito pelo link enviado pelo seu órgão. Se você não recebeu o link, fale com o responsável pela
          capacitação no seu órgão.
        </p>
      </PaginaPublica>
    );
  }

  return (
    <PaginaPublica titulo="Criar conta" descricao="Escolha o órgão em que você trabalha.">
      <ul className="divide-y rounded-lg border">
        {orgaos.map((orgao) => (
          <li key={orgao.id}>
            <Link href={`/cadastro/${orgao.slug}`} className="hover:bg-muted flex items-center justify-between px-4 py-3">
              <span>{orgao.nome}</span>
              <ChevronRight className="text-muted-foreground size-4" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PaginaPublica>
  );
}
