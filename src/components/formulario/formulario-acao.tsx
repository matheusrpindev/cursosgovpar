"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Aviso } from "@/components/formulario/aviso";
import { Button } from "@/components/ui/button";
import { estadoInicial, type EstadoFormulario } from "@/lib/validacao";
import { cn } from "@/lib/utils";

type Props = {
  acao: (anterior: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  /** Campos do formulário (inclusive os ocultos). */
  children?: ReactNode;
  rotulo: ReactNode;
  rotuloEnviando?: string;
  variante?: ComponentProps<typeof Button>["variant"];
  classeBotao?: string;
  className?: string;
  /** Pede uma confirmação antes de enviar (ações que não têm volta). */
  confirmar?: ReactNode;
  /** Limpa os campos depois de salvar (formulários de "adicionar"). */
  limparAoConcluir?: boolean;
  /** Texto para leitores de tela quando o botão só tem ícone. */
  rotuloAcessivel?: string;
};

/**
 * Formulário ligado a uma ação do servidor. Mostra o resultado (erro ou
 * sucesso), mantém o que foi digitado quando há erro e, se a resposta trouxer
 * um link (ex.: link para definir senha), mostra-o com botão de copiar.
 */
export function FormularioAcao({
  acao,
  children,
  rotulo,
  rotuloEnviando = "Salvando…",
  variante = "default",
  classeBotao,
  className,
  confirmar,
  limparAoConcluir,
  rotuloAcessivel,
}: Props) {
  const [estado, despachar] = useActionState(acao, estadoInicial);
  const [enviando, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (limparAoConcluir && estado.status === "sucesso") formulario.current?.reset();
  }, [estado, limparAoConcluir]);

  const link = estado.status === "sucesso" ? estado.valores?.link : undefined;
  const classe = cn("h-10", classeBotao);

  return (
    <form
      ref={formulario}
      className={cn("grid gap-3", className)}
      onSubmit={(evento) => {
        evento.preventDefault();
        const dados = new FormData(evento.currentTarget);
        setConfirmando(false);
        iniciar(() => despachar(dados));
      }}
    >
      {children}
      {estado.mensagem ? <Aviso tipo={estado.status === "erro" ? "erro" : "sucesso"}>{estado.mensagem}</Aviso> : null}
      {link ? (
        <div className="bg-muted flex flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center">
          <code className="flex-1 text-xs break-all">{link}</code>
          <Button
            type="button"
            variant="outline"
            className="h-9 shrink-0"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
            }}
          >
            {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copiado ? "Copiado" : "Copiar link"}
          </Button>
        </div>
      ) : null}
      {confirmar && confirmando ? (
        <div className="grid gap-2">
          <p className="text-sm">{confirmar}</p>
          <div className="flex gap-2">
            <Button type="submit" variant={variante} className={classe} disabled={enviando}>
              Confirmar
            </Button>
            <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type={confirmar ? "button" : "submit"}
          variant={variante}
          className={cn(classe, "justify-self-start")}
          disabled={enviando}
          aria-busy={enviando}
          aria-label={rotuloAcessivel}
          onClick={confirmar ? () => setConfirmando(true) : undefined}
        >
          {enviando ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {rotuloAcessivel ? null : rotuloEnviando}
            </>
          ) : (
            rotulo
          )}
        </Button>
      )}
    </form>
  );
}
