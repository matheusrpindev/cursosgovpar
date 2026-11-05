import { describe, expect, it } from "vitest";
import { corDeTextoSobre, razaoDeContraste, variaveisDeTema } from "@/lib/tema";

describe("tema da marca", () => {
  it("calcula o contraste máximo entre preto e branco", () => {
    expect(razaoDeContraste("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("usa texto branco sobre cores escuras e escuro sobre cores claras", () => {
    expect(corDeTextoSobre("#1e5aa8")).toBe("#ffffff");
    expect(corDeTextoSobre("#0f172a")).toBe("#ffffff");
    expect(corDeTextoSobre("#facc15")).toBe("#0a0a0a");
    expect(corDeTextoSobre("#f5f5f5")).toBe("#0a0a0a");
  });

  it("gera as variáveis CSS do tema", () => {
    expect(variaveisDeTema("#1e5aa8", "#facc15")).toEqual({
      "--primary": "#1e5aa8",
      "--primary-foreground": "#ffffff",
      "--ring": "#1e5aa8",
      "--marca-secundaria": "#facc15",
      "--marca-secundaria-foreground": "#0a0a0a",
    });
  });
});
