/**
 * Converte as cores da marca em variáveis CSS do tema (shadcn/Tailwind).
 * A cor do texto sobre a cor da marca é escolhida automaticamente
 * (preto ou branco) pelo maior contraste, seguindo a fórmula da WCAG.
 */

const BRANCO = "#ffffff";
const QUASE_PRETO = "#0a0a0a";

function canalLinear(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex: string): number {
  const limpo = hex.replace("#", "");
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

export function razaoDeContraste(corA: string, corB: string): number {
  const [maior, menor] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (maior + 0.05) / (menor + 0.05);
}

export function corDeTextoSobre(fundo: string): string {
  return razaoDeContraste(fundo, BRANCO) >= razaoDeContraste(fundo, QUASE_PRETO)
    ? BRANCO
    : QUASE_PRETO;
}

export function variaveisDeTema(corPrimaria: string, corSecundaria: string) {
  return {
    "--primary": corPrimaria,
    "--primary-foreground": corDeTextoSobre(corPrimaria),
    "--ring": corPrimaria,
    "--marca-secundaria": corSecundaria,
    "--marca-secundaria-foreground": corDeTextoSobre(corSecundaria),
  } as Record<string, string>;
}
