import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { CartaoPendente } from "@/components/gestor/cartao-pendente";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { EstadoVazio } from "@/components/layout/estado-vazio";
import { exigirPerfil } from "@/lib/auth/sessao";
import { formatarDataHora } from "@/lib/formatacao";
import { listarPendentes } from "@/lib/gestor/dados";

export const metadata: Metadata = { title: "Cadastros para aprovar" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function CadastrosPendentes() {
  const perfil = await exigirPerfil({ papeis: ["gestor"], acessoAtivo: true });
  const pendentes = await listarPendentes(perfil.organizacao!.id);

  return (
    <>
      <CabecalhoPagina
        titulo="Cadastros para aprovar"
        descricao={`Pessoas que se cadastraram como integrantes de ${perfil.organizacao!.nome} e já confirmaram o e-mail. Confira nome e CPF antes de aprovar.`}
      />
      {pendentes.length === 0 ? (
        <EstadoVazio Icone={Inbox} titulo="Nenhum cadastro aguardando">
          Quando alguém se cadastrar pelo link do seu órgão, você recebe um e-mail e o pedido aparece aqui.
        </EstadoVazio>
      ) : (
        <ul className="grid gap-3" aria-label="Cadastros pendentes">
          {pendentes.map((p) => (
            <CartaoPendente
              key={p.id}
              id={p.id}
              nome={p.nome}
              email={p.email}
              cpf={p.cpf}
              cadastradoEm={formatarDataHora(p.criadoEm)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
