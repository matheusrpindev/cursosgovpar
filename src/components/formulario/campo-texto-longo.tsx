import type { ComponentProps, ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Área de texto com rótulo e ajuda. */
export function CampoTextoLongo({
  nome,
  rotulo,
  ajuda,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "name"> & { nome: string; rotulo: string; ajuda?: ReactNode }) {
  const id = props.id ?? `campo-${nome}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea id={id} name={nome} className={cn("min-h-24 text-base", className)} {...props} />
      {ajuda ? <p className="text-muted-foreground text-xs">{ajuda}</p> : null}
    </div>
  );
}

/** Caixa de marcar com rótulo e explicação. */
export function CampoMarcar({
  nome,
  rotulo,
  ajuda,
  ...props
}: Omit<ComponentProps<"input">, "name" | "type"> & { nome: string; rotulo: ReactNode; ajuda?: ReactNode }) {
  const id = props.id ?? `campo-${nome}-${props.value ?? ""}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm">
      <input id={id} name={nome} type="checkbox" className="accent-primary mt-0.5 size-5 shrink-0" {...props} />
      <span>
        <span className="font-medium">{rotulo}</span>
        {ajuda ? <span className="text-muted-foreground block text-xs">{ajuda}</span> : null}
      </span>
    </label>
  );
}
