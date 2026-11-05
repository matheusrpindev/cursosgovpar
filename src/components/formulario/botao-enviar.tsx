"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof Button> & {
  /** Força o estado "enviando" (para formulários que não usam action). */
  enviando?: boolean;
  textoEnviando?: string;
};

export function BotaoEnviar({ children, enviando, textoEnviando = "Enviando…", className, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  const ocupado = enviando ?? pending;
  return (
    <Button
      type="submit"
      disabled={ocupado || disabled}
      aria-busy={ocupado}
      className={cn("h-11 w-full text-base", className)}
      {...props}
    >
      {ocupado ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {textoEnviando}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
