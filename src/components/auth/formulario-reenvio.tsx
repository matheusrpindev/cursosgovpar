"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { reenviarConfirmacao } from "@/lib/auth/acoes";
import { estadoInicial } from "@/lib/validacao";

export function FormularioReenvio({ emailInicial = "" }: { emailInicial?: string }) {
  const [estado, acao] = useActionState(reenviarConfirmacao, estadoInicial);

  if (estado.status === "sucesso") {
    return <Aviso tipo="sucesso">{estado.mensagem}</Aviso>;
  }

  return (
    <form action={acao} className="grid gap-3">
      <Campo
        nome="email"
        id="reenvio-email"
        rotulo="E-mail do cadastro"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={estado.valores?.email ?? emailInicial}
        erros={estado.erros?.email}
        required
      />
      <BotaoEnviar variant="outline">Reenviar e-mail de confirmação</BotaoEnviar>
    </form>
  );
}
