import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Ban, Clock, ShieldAlert, XCircle } from "lucide-react";
import { FormularioNovaSolicitacao } from "@/components/auth/formulario-nova-solicitacao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { destinoInicial, exigirPerfil, temAcessoAtivo, type PerfilAtual } from "@/lib/auth/sessao";
import { avisarGestoresDoPedido } from "@/lib/notificacoes";

export const metadata: Metadata = { title: "Situação do cadastro" };

function conteudo(perfil: PerfilAtual) {
  const orgao = perfil.organizacao?.nome ?? "seu órgão";

  if (perfil.organizacao && !perfil.organizacao.ativo) {
    return {
      Icone: ShieldAlert,
      titulo: "Acesso do órgão suspenso",
      texto: `O acesso de ${orgao} à plataforma está suspenso no momento. Os certificados já emitidos continuam válidos.`,
    };
  }
  switch (perfil.status) {
    case "pendente":
      return {
        Icone: Clock,
        titulo: "Aguardando aprovação do seu órgão",
        texto: `Seu cadastro foi enviado para ${orgao}. Assim que for analisado, você receberá um e-mail com o resultado.`,
      };
    case "recusado":
      return {
        Icone: XCircle,
        titulo: "Cadastro não aprovado",
        texto: `${orgao} não aprovou o seu cadastro.${perfil.motivoRecusa ? ` Motivo informado: “${perfil.motivoRecusa}”.` : ""}`,
      };
    case "desativado":
      return {
        Icone: Ban,
        titulo: "Acesso desativado",
        texto: `O seu acesso foi desativado por ${orgao}. Os certificados que você já emitiu continuam válidos.`,
      };
    default:
      return {
        Icone: Clock,
        titulo: "Situação do cadastro",
        texto: "Seu acesso ainda não está liberado.",
      };
  }
}

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function Aguardando() {
  const perfil = await exigirPerfil();
  if (temAcessoAtivo(perfil)) redirect(destinoInicial(perfil));

  // Logo depois de confirmar o e-mail a pessoa cai aqui: é quando os gestores são
  // avisados. O aviso é idempotente e roda depois da resposta (não atrasa a página).
  if (perfil.status === "pendente") {
    after(() => avisarGestoresDoPedido(perfil.id));
  }

  const { Icone, titulo, texto } = conteudo(perfil);
  const podeReenviar = perfil.status === "recusado" && perfil.organizacao?.ativo !== false;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="items-center text-center">
        <Icone className="text-primary mx-auto mb-2 size-10" aria-hidden />
        <CardTitle className="text-xl">
          <h1>{titulo}</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-center text-sm leading-relaxed">
        <p>{texto}</p>
        {podeReenviar ? (
          <div className="mt-2 grid gap-3 border-t pt-5">
            <p className="text-left font-medium">Houve algum engano?</p>
            <p className="text-muted-foreground text-left">
              Corrija o seu nome ou informe o órgão certo e reenvie a solicitação. Você pode reenviar até 3 vezes.
            </p>
            <FormularioNovaSolicitacao nomeAtual={perfil.nome} />
          </div>
        ) : (
          <p className="text-muted-foreground">Enquanto isso, você não tem acesso aos cursos.</p>
        )}
      </CardContent>
    </Card>
  );
}
