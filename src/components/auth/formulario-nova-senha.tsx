"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { CampoSenha } from "@/components/formulario/campo-senha";
import { redefinirSenha } from "@/lib/auth/acoes";
import { estadoInicial } from "@/lib/validacao";

export function FormularioNovaSenha() {
  const [estado, acao] = useActionState(redefinirSenha, estadoInicial);
  const erros = estado.erros ?? {};

  return (
    <form action={acao} className="grid gap-4">
      {estado.mensagem ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      <CampoSenha
        nome="senha"
        rotulo="Nova senha"
        autoComplete="new-password"
        ajuda="Mínimo de 8 caracteres, com letras e números."
        erros={erros.senha}
        required
      />
      <CampoSenha
        nome="confirmacaoSenha"
        rotulo="Repita a nova senha"
        autoComplete="new-password"
        erros={erros.confirmacaoSenha}
        required
      />
      <BotaoEnviar textoEnviando="Salvando…">Salvar nova senha</BotaoEnviar>
    </form>
  );
}
