import type { Metadata } from "next";
import Link from "next/link";
import { CamposCurso } from "@/components/admin/campos-curso";
import { Secao } from "@/components/admin/secao";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { salvarCurso } from "@/lib/admin/acoes";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Novo curso" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function NovoCurso() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  return (
    <>
      <p className="mb-3 text-sm">
        <Link href="/admin/cursos" className="text-primary underline-offset-4 hover:underline">
          ← Cursos
        </Link>
      </p>
      <CabecalhoPagina titulo="Novo curso" descricao="O curso nasce como rascunho. Depois de salvar, você adiciona as aulas e publica." />
      <Secao titulo="Dados do curso" className="max-w-2xl">
        <FormularioAcao acao={salvarCurso} rotulo="Criar curso" rotuloEnviando="Criando…" classeBotao="h-11">
          <CamposCurso />
        </FormularioAcao>
      </Secao>
    </>
  );
}
