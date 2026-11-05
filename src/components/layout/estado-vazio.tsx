import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EstadoVazio({ Icone, titulo, children }: { Icone: LucideIcon; titulo: string; children?: ReactNode }) {
  return (
    <div className="bg-background flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <Icone className="text-muted-foreground size-10" aria-hidden />
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children ? <div className="text-muted-foreground max-w-md text-sm">{children}</div> : null}
    </div>
  );
}
