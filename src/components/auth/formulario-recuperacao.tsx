"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { solicitarRecuperacao } from "@/lib/auth/acoes";
import { estadoInicial } from "@/lib/validacao";

export function FormularioRecuperacao() {
  const [estado, acao] = useActionState(solicitarRecuperacao, estadoInicial);

  if (estado.status === "sucesso") {
    return <Aviso tipo="sucesso">{estado.mensagem}</Aviso>;
  }

  return (
    <form action={acao} className="grid gap-4">
      <Campo
        nome="email"
        rotulo="E-mail do cadastro"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={estado.valores?.email}
        erros={estado.erros?.email}
        required
      />
      <BotaoEnviar>Enviar link</BotaoEnviar>
    </form>
  );
}
