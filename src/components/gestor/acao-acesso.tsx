"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Button } from "@/components/ui/button";
import { desativarAcesso, reativarAcesso } from "@/lib/gestor/acoes";
import { estadoInicial } from "@/lib/validacao";

/** Desativar (com confirmação) ou reativar o acesso de um aluno. */
export function AcaoAcesso({ id, nome, status }: { id: string; nome: string; status: "aprovado" | "desativado" }) {
  const desativar = status === "aprovado";
  const [estado, acao] = useActionState(desativar ? desativarAcesso : reativarAcesso, estadoInicial);
  const [confirmando, setConfirmando] = useState(false);

  if (desativar && !confirmando) {
    return (
      <Button type="button" variant="outline" className="h-10" onClick={() => setConfirmando(true)}>
        Desativar acesso
      </Button>
    );
  }

  return (
    <form action={acao} className="grid gap-2">
      <input type="hidden" name="perfilId" value={id} />
      {estado.status === "erro" ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      {desativar ? (
        <>
          <p className="text-sm">
            Desativar o acesso de <strong>{nome}</strong>? Os certificados já emitidos continuam válidos.
          </p>
          <div className="flex gap-2">
            <BotaoEnviar variant="destructive" className="h-10 w-auto px-4 text-sm" textoEnviando="Desativando…">
              Confirmar
            </BotaoEnviar>
            <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <BotaoEnviar variant="outline" className="h-10 w-auto px-4 text-sm" textoEnviando="Reativando…">
          Reativar acesso
        </BotaoEnviar>
      )}
    </form>
  );
}
