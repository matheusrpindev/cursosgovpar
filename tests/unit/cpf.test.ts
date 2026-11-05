import { describe, expect, it } from "vitest";
import { cpfValido, formatarCpf, mascararCpf, somenteDigitos } from "@/lib/cpf";

describe("cpfValido", () => {
  it.each(["529.982.247-25", "52998224725", "111.444.777-35", "123.456.789-09"])("aceita %s", (cpf) => {
    expect(cpfValido(cpf)).toBe(true);
  });

  it.each([
    ["dígito verificador errado", "529.982.247-24"],
    ["todos iguais", "111.111.111-11"],
    ["curto", "5299822472"],
    ["longo", "529982247250"],
    ["vazio", ""],
    ["letras", "abc.def.ghi-jk"],
  ])("recusa %s", (_, cpf) => {
    expect(cpfValido(cpf)).toBe(false);
  });
});

describe("formatação e máscara", () => {
  it("remove tudo que não é dígito", () => {
    expect(somenteDigitos("529.982.247-25")).toBe("52998224725");
  });

  it("formata parcialmente enquanto digita", () => {
    expect(formatarCpf("529")).toBe("529");
    expect(formatarCpf("5299")).toBe("529.9");
    expect(formatarCpf("5299822")).toBe("529.982.2");
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
    expect(formatarCpf("5299822472599")).toBe("529.982.247-25");
  });

  it("mascara no formato ***.456.789-**", () => {
    expect(mascararCpf("123.456.789-09")).toBe("***.456.789-**");
    expect(mascararCpf("123")).toBe("");
  });
});
