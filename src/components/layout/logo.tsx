import Link from "next/link";
import type { Marca } from "@/lib/marca";
import { cn } from "@/lib/utils";

/** Logo da marca (imagem enviada pelo admin) ou, na falta dela, o nome da plataforma. */
export function Logo({ marca, className, href = "/" }: { marca: Marca; className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold", className)}>
      {marca.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo vem do Storage de cada instalação
        <img src={marca.logoUrl} alt={marca.nomePlataforma} className="h-9 w-auto max-w-[200px] object-contain" />
      ) : (
        <>
          <span
            aria-hidden
            className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-lg font-bold"
          >
            {marca.nomePlataforma.charAt(0).toUpperCase()}
          </span>
          <span className="text-lg">{marca.nomePlataforma}</span>
        </>
      )}
    </Link>
  );
}
