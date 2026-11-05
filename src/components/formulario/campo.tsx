import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CampoProps = Omit<ComponentProps<"input">, "name"> & {
  nome: string;
  rotulo: string;
  erros?: string[];
  ajuda?: ReactNode;
};

/** Campo de formulário acessível: rótulo, ajuda e mensagens de erro ligadas ao input. */
export function Campo({ nome, rotulo, erros, ajuda, className, id, ...props }: CampoProps) {
  const idCampo = id ?? `campo-${nome}`;
  const idAjuda = ajuda ? `${idCampo}-ajuda` : undefined;
  const idErro = erros?.length ? `${idCampo}-erro` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idCampo}>{rotulo}</Label>
      <Input
        id={idCampo}
        name={nome}
        aria-invalid={erros?.length ? true : undefined}
        aria-describedby={[idAjuda, idErro].filter(Boolean).join(" ") || undefined}
        className={cn("h-11 text-base", className)}
        {...props}
      />
      {ajuda ? (
        <p id={idAjuda} className="text-muted-foreground text-xs">
          {ajuda}
        </p>
      ) : null}
      <MensagensDeErro id={idErro} erros={erros} />
    </div>
  );
}

export function MensagensDeErro({ id, erros }: { id?: string; erros?: string[] }) {
  if (!erros?.length) return null;
  return (
    <p id={id} className="text-destructive text-sm" role="alert">
      {erros[0]}
    </p>
  );
}
