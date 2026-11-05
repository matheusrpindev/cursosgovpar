import type { Metadata } from "next";
import { Users } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Meu órgão" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function PainelGestor() {
  const perfil = await exigirPerfil({ papeis: ["gestor"], acessoAtivo: true });
  return (
    <>
      <CabecalhoPagina titulo={perfil.organizacao?.nome ?? "Meu órgão"} descricao="Cadastros, alunos e certificados do seu órgão." />
      <EstadoVazio Icone={Users} titulo="Painel do gestor em construção">
        A fila de aprovação de cadastros chega na próxima etapa.
      </EstadoVazio>
    </>
  );
}
