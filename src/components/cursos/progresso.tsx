import { cn } from "@/lib/utils";

/** Barra de progresso com o percentual escrito. */
export function BarraProgresso({ percentual, rotulo, className }: { percentual: number; rotulo?: string; className?: string }) {
  return (
    <div className={cn("grid gap-1", className)}>
      <div
        className="bg-muted h-2 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo ?? "Progresso"}
      >
        <div
          className={cn("h-full rounded-full transition-all", percentual === 100 ? "bg-emerald-600" : "bg-primary")}
          style={{ width: `${percentual}%` }}
        />
      </div>
      {rotulo ? <p className="text-muted-foreground text-xs">{rotulo}</p> : null}
    </div>
  );
}

/** Capa do curso: imagem enviada, miniatura do primeiro vídeo ou um fundo com a cor da marca. */
export function CapaCurso({ url, titulo, className }: { url: string | null; titulo: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- capa vem do Storage da instalação ou do YouTube
    <img src={url} alt="" loading="lazy" className={cn("aspect-video w-full object-cover", className)} />
  ) : (
    <div
      aria-hidden
      className={cn(
        "from-primary to-(--marca-secundaria) text-primary-foreground flex aspect-video w-full items-center justify-center bg-linear-to-br p-4 text-center text-lg font-semibold",
        className,
      )}
    >
      {titulo}
    </div>
  );
}
