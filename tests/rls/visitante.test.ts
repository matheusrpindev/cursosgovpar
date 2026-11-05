import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteAnonimo, clienteServico, criarCenario, cpfAleatorio, type Cenario, type Cliente } from "./apoio";

let cenario: Cenario;
let anonimo: Cliente;

beforeAll(async () => {
  cenario = await criarCenario();
  anonimo = clienteAnonimo();
});
afterAll(async () => cenario?.limpar());

const TABELAS_PROTEGIDAS = [
  "perfis",
  "perfis_privados",
  "organizacoes",
  "aceites_termos",
  "cursos",
  "aulas",
  "organizacao_cursos",
  "progresso_aulas",
  "certificados",
  "auditoria",
] as const;

describe("visitante (sem login, chave pública)", () => {
  it("lê a marca pública", async () => {
    const { data, error } = await anonimo.from("configuracoes").select("nome_plataforma").single();
    expect(error).toBeNull();
    expect(data?.nome_plataforma).toBeTruthy();
  });

  it.each(TABELAS_PROTEGIDAS)("não lê nada de %s", async (tabela) => {
    const { data, error } = await anonimo.from(tabela).select("*").limit(5);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("não altera a marca", async () => {
    const { data } = await anonimo.from("configuracoes").update({ nome_plataforma: "Invadido" }).eq("id", 1).select();
    expect(data ?? []).toHaveLength(0);
    const { data: atual } = await clienteServico().from("configuracoes").select("nome_plataforma").single();
    expect(atual?.nome_plataforma).not.toBe("Invadido");
  });

  it("não cria órgão nem curso", async () => {
    const r1 = await anonimo.from("organizacoes").insert({ nome: "Hacker", slug: `hacker-${cenario.sufixo}` });
    const r2 = await anonimo.from("cursos").insert({ titulo: "Hacker", carga_horaria: 1 });
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();
  });

  it("não consegue se cadastrar direto pela API do Supabase (cadastro público desligado)", async () => {
    const { error } = await anonimo.auth.signUp({
      email: `direto.${cenario.sufixo}@teste.local`,
      password: "SenhaTeste123",
      options: { data: { nome: "Direto API", cpf: cpfAleatorio(), aceite_termos: true } },
    });
    expect(error?.code).toBe("signup_disabled");
  });

  it("vê só o nome de um órgão ATIVO pelo link de cadastro", async () => {
    const { data: ativo } = await anonimo.rpc("orgao_para_cadastro", { p_slug: cenario.orgA.slug });
    expect(ativo).toHaveLength(1);
    expect(Object.keys(ativo![0]).sort()).toEqual(["id", "nome"]);

    const { data: inativo } = await anonimo.rpc("orgao_para_cadastro", { p_slug: cenario.orgInativo.slug });
    expect(inativo).toHaveLength(0);
  });

  it("só lista os órgãos quando a lista pública está ligada", async () => {
    const servico = clienteServico();
    const { data: config } = await servico.from("configuracoes").select("cadastro_lista_publica").single();
    try {
      await servico.from("configuracoes").update({ cadastro_lista_publica: false }).eq("id", 1).throwOnError();
      const { data: desligada } = await anonimo.rpc("orgaos_para_cadastro");
      expect(desligada).toHaveLength(0);

      await servico.from("configuracoes").update({ cadastro_lista_publica: true }).eq("id", 1).throwOnError();
      const { data: ligada } = await anonimo.rpc("orgaos_para_cadastro");
      const slugs = (ligada ?? []).map((o) => o.slug);
      expect(slugs).toContain(cenario.orgA.slug);
      expect(slugs).not.toContain(cenario.orgInativo.slug);
    } finally {
      await servico.from("configuracoes").update({ cadastro_lista_publica: config!.cadastro_lista_publica }).eq("id", 1);
    }
  });

  it("não registra aceite de termos sem login", async () => {
    const { error } = await anonimo.rpc("aceitar_termos_atuais");
    expect(error).not.toBeNull();
  });

  it("não envia arquivos para o Storage", async () => {
    const { error } = await anonimo.storage
      .from("marca")
      .upload(`teste-${cenario.sufixo}.png`, new Blob(["x"], { type: "image/png" }));
    expect(error).not.toBeNull();
  });
});
