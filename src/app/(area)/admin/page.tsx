import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Administração" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function PainelAdmin() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Órgãos, gestores, cursos e configurações da marca." />
      <EstadoVazio Icone={Settings} titulo="Painel do administrador em construção">
        Cursos chegam na etapa 3; órgãos, gestores e marca, na etapa 5.
      </EstadoVazio>
    </>
  );
}
