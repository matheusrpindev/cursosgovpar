import type { ReactNode } from "react";

export function CabecalhoPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {descricao ? <p className="text-muted-foreground">{descricao}</p> : null}
      </div>
      {acoes}
    </div>
  );
}
