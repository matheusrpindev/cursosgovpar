const FUSO = "America/Sao_Paulo";

const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2026-11-05T14:32:00Z" -> "05/11/2026" (horário de Brasília). */
export function formatarData(iso: string | null | undefined): string {
  return iso ? data.format(new Date(iso)) : "—";
}

/** "2026-11-05T14:32:00Z" -> "05/11/2026 às 11:32" (horário de Brasília). */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dataHora.format(new Date(iso)).replace(", ", " às ");
}
