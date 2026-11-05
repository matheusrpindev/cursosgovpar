/** Esqueleto exibido enquanto a página confere a sessão e carrega os dados. */
export default function Carregando() {
  return (
    <div className="grid animate-pulse gap-4" aria-busy="true" aria-label="Carregando">
      <div className="bg-muted h-8 w-56 rounded-lg" />
      <div className="bg-muted h-4 w-80 max-w-full rounded" />
      <div className="bg-muted mt-4 h-40 rounded-xl" />
    </div>
  );
}
