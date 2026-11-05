import { describe, expect, it } from "vitest";
import { formatarData, formatarDataHora } from "@/lib/formatacao";

describe("formatação de datas (horário de Brasília)", () => {
  it("formata data", () => {
    expect(formatarData("2026-11-05T02:30:00Z")).toBe("04/11/2026");
    expect(formatarData(null)).toBe("—");
  });

  it("formata data e hora", () => {
    expect(formatarDataHora("2026-11-05T14:32:00Z")).toBe("05/11/2026 às 11:32");
  });
});
