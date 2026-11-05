import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Meus cursos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function MeusCursos() {
  const perfil = await exigirPerfil({ papeis: ["aluno", "gestor"], acessoAtivo: true });
  return (
    <>
      <CabecalhoPagina titulo={`Olá, ${perfil.nome.split(" ")[0]}!`} descricao="Estes são os cursos liberados para o seu órgão." />
      <EstadoVazio Icone={BookOpen} titulo="Nenhum curso liberado ainda">
        Quando o seu órgão tiver cursos disponíveis, eles vão aparecer aqui.
      </EstadoVazio>
    </>
  );
}
