import { Badge } from "@/components/ui/badge";
import type { StatusPerfil } from "@/lib/auth/sessao";
import { cn } from "@/lib/utils";

const ESTILOS: Record<StatusPerfil, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Pendente", classe: "bg-amber-100 text-amber-900" },
  aprovado: { rotulo: "Com acesso", classe: "bg-emerald-100 text-emerald-900" },
  recusado: { rotulo: "Recusado", classe: "bg-red-100 text-red-900" },
  desativado: { rotulo: "Desativado", classe: "bg-zinc-200 text-zinc-800" },
};

export function SeloStatus({ status }: { status: StatusPerfil }) {
  const { rotulo, classe } = ESTILOS[status];
  return <Badge className={cn("h-6 px-2.5", classe)}>{rotulo}</Badge>;
}
