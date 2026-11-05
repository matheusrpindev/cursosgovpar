"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { reenviarSolicitacao } from "@/lib/auth/acoes";
import { estadoInicial } from "@/lib/validacao";

/** Para quem foi recusado: corrige o nome (e, se mudou de órgão, o órgão) e reenvia. */
export function FormularioNovaSolicitacao({ nomeAtual }: { nomeAtual: string }) {
  const [estado, acao] = useActionState(reenviarSolicitacao, estadoInicial);

  return (
    <form action={acao} className="grid gap-4 text-left">
      {estado.status === "erro" && estado.mensagem ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      <Campo
        nome="nome"
        rotulo="Nome completo"
        autoComplete="name"
        defaultValue={estado.valores?.nome ?? nomeAtual}
        erros={estado.erros?.nome}
        required
      />
      <Campo
        nome="linkOrgao"
        rotulo="Link de cadastro do órgão (só se você é de outro órgão)"
        inputMode="url"
        placeholder="Cole aqui o link enviado pelo seu órgão"
        defaultValue={estado.valores?.linkOrgao}
        erros={estado.erros?.linkOrgao}
        ajuda="Deixe em branco para manter o mesmo órgão."
      />
      <BotaoEnviar textoEnviando="Reenviando…">Corrigir e reenviar</BotaoEnviar>
    </form>
  );
}
