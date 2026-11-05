/** Mostra um texto institucional digitado pelo admin, respeitando parágrafos e quebras de linha. */
export function TextoLegal({ texto }: { texto: string }) {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragrafos.length === 0) {
    return <p className="text-muted-foreground text-sm">Este texto ainda não foi publicado.</p>;
  }

  return (
    <div className="grid gap-4 text-sm leading-relaxed">
      {paragrafos.map((paragrafo, i) => (
        <p key={i} className="whitespace-pre-line">
          {paragrafo}
        </p>
      ))}
    </div>
  );
}
