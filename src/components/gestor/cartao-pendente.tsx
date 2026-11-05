"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { MensagensDeErro } from "@/components/formulario/campo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarCpf } from "@/lib/cpf";
import { aprovarCadastro, recusarCadastro } from "@/lib/gestor/acoes";
import { estadoInicial } from "@/lib/validacao";

type Props = { id: string; nome: string; email: string; cpf: string | null; cadastradoEm: string };

/** Um pedido de acesso na fila do gestor: confere os dados e aprova ou recusa. */
export function CartaoPendente({ id, nome, email, cpf, cadastradoEm }: Props) {
  const [estadoAprovar, aprovar] = useActionState(aprovarCadastro, estadoInicial);
  const [estadoRecusar, recusar] = useActionState(recusarCadastro, estadoInicial);
  const [recusando, setRecusando] = useState(false);
  const erro = [estadoAprovar, estadoRecusar].find((e) => e.status === "erro" && e.mensagem)?.mensagem;

  return (
    <li className="bg-background grid gap-4 rounded-xl border p-4 sm:p-5">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="text-base font-semibold">{nome}</h3>
          <span className="text-muted-foreground text-xs">Cadastro em {cadastradoEm}</span>
        </div>
        <dl className="text-muted-foreground grid gap-0.5 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-3">
          <dt className="sr-only sm:not-sr-only">E-mail</dt>
          <dd className="break-all">{email}</dd>
          <dt className="sr-only sm:not-sr-only">CPF</dt>
          <dd className="tabular-nums">{cpf ? formatarCpf(cpf) : "—"}</dd>
        </dl>
      </div>

      {erro ? <Aviso tipo="erro">{erro}</Aviso> : null}

      {recusando ? (
        <form action={recusar} className="grid gap-3">
          <input type="hidden" name="perfilId" value={id} />
          <div className="grid gap-1.5">
            <Label htmlFor={`motivo-${id}`}>Motivo da recusa (opcional)</Label>
            <Textarea
              id={`motivo-${id}`}
              name="motivo"
              maxLength={500}
              rows={3}
              placeholder="Ex.: não encontramos este nome na equipe da secretaria."
              aria-describedby={`motivo-${id}-ajuda`}
            />
            <p id={`motivo-${id}-ajuda`} className="text-muted-foreground text-xs">
              O motivo é enviado por e-mail para a pessoa.
            </p>
            <MensagensDeErro erros={estadoRecusar.erros?.motivo} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <BotaoEnviar variant="destructive" className="sm:w-auto sm:px-5" textoEnviando="Recusando…">
              Confirmar recusa
            </BotaoEnviar>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setRecusando(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <form action={aprovar} className="sm:w-auto">
            <input type="hidden" name="perfilId" value={id} />
            <BotaoEnviar className="sm:w-auto sm:px-5" textoEnviando="Aprovando…">
              <Check aria-hidden />
              Aprovar
            </BotaoEnviar>
          </form>
          <Button type="button" variant="outline" className="h-11 text-base sm:px-5" onClick={() => setRecusando(true)}>
            <X aria-hidden />
            Recusar
          </Button>
        </div>
      )}
    </li>
  );
}
