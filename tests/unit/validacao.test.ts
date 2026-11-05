import { describe, expect, it } from "vitest";
import { caminhoInternoSeguro, esquemaCadastro, esquemaNovaSenha } from "@/lib/validacao";

const valido = {
  slug: "vila-serena",
  nome: "  Maria   da Silva ",
  cpf: "529.982.247-25",
  email: " Maria@Exemplo.COM ",
  senha: "Senha1234",
  confirmacaoSenha: "Senha1234",
  aceite: "on",
};

describe("esquemaCadastro", () => {
  it("normaliza nome, CPF e e-mail", () => {
    const r = esquemaCadastro.parse(valido);
    expect(r.nome).toBe("Maria da Silva");
    expect(r.cpf).toBe("52998224725");
    expect(r.email).toBe("maria@exemplo.com");
  });

  it("exige nome e sobrenome", () => {
    expect(esquemaCadastro.safeParse({ ...valido, nome: "Maria" }).success).toBe(false);
  });

  it("recusa CPF inválido", () => {
    expect(esquemaCadastro.safeParse({ ...valido, cpf: "529.982.247-24" }).success).toBe(false);
  });

  it("exige senha com letras e números e confirmação igual", () => {
    expect(esquemaCadastro.safeParse({ ...valido, senha: "somenteletras", confirmacaoSenha: "somenteletras" }).success).toBe(false);
    expect(esquemaCadastro.safeParse({ ...valido, senha: "12345678", confirmacaoSenha: "12345678" }).success).toBe(false);
    expect(esquemaCadastro.safeParse({ ...valido, confirmacaoSenha: "Outra1234" }).success).toBe(false);
  });

  it("exige o aceite dos termos", () => {
    expect(esquemaCadastro.safeParse({ ...valido, aceite: undefined }).success).toBe(false);
  });

  it("recusa slug com caracteres estranhos", () => {
    expect(esquemaCadastro.safeParse({ ...valido, slug: "../admin" }).success).toBe(false);
  });
});

describe("esquemaNovaSenha", () => {
  it("valida a nova senha", () => {
    expect(esquemaNovaSenha.safeParse({ senha: "NovaSenha1", confirmacaoSenha: "NovaSenha1" }).success).toBe(true);
    expect(esquemaNovaSenha.safeParse({ senha: "curta1", confirmacaoSenha: "curta1" }).success).toBe(false);
  });
});

describe("caminhoInternoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(caminhoInternoSeguro("/cursos")).toBe("/cursos");
  });

  it.each(["https://malicioso.com", "//malicioso.com", "/\\malicioso.com", "cursos", null, 42])(
    "recusa %s",
    (valor) => {
      expect(caminhoInternoSeguro(valor)).toBeNull();
    },
  );
});
