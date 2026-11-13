import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloco com título usado nas telas do admin. */
export function Secao({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-background grid gap-4 rounded-xl border p-4 sm:p-6", className)}>
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {descricao ? <p className="text-muted-foreground text-sm">{descricao}</p> : null}
      </div>
      {children}
    </section>
  );
}
