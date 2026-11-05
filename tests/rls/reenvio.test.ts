import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteAnonimo, clienteLogado, clienteServico, criarCenario, type Cenario } from "./apoio";

/** Reenvio da solicitação pelo recusado e o controle de avisos aos gestores. */
let cenario: Cenario;

beforeAll(async () => {
  cenario = await criarCenario();
});
afterAll(async () => cenario?.limpar());

async function perfil(id: string) {
  const { data } = await clienteServico()
    .from("perfis")
    .select("status, nome, organizacao_id, motivo_recusa, notificado_em")
    .eq("id", id)
    .single();
  return data!;
}

async function recusarDeNovo(id: string) {
  await clienteServico().from("perfis").update({ status: "recusado", motivo_recusa: "teste" }).eq("id", id).throwOnError();
}

describe("reenvio da solicitação", () => {
  it("visitante não consegue chamar a função", async () => {
    const { error } = await clienteAnonimo().rpc("reenviar_solicitacao", { p_nome: "Fulano de Tal" });
    expect(error).not.toBeNull();
  });

  it.each([
    ["aprovado", "alunoA"],
    ["pendente", "pendenteA"],
    ["desativado", "desativadoA"],
  ] as const)("aluno %s não pode reenviar", async (_, apelido) => {
    const cliente = await clienteLogado(cenario.pessoas[apelido].email);
    const { error } = await cliente.rpc("reenviar_solicitacao", { p_nome: "Nome Qualquer" });
    expect(error?.code).toBe("AP004");
  });

  it("recusado corrige o nome e volta para a fila, sem motivo e com novo aviso pendente", async () => {
    const id = cenario.pessoas.recusadoA.id;
    await clienteServico().from("perfis").update({ notificado_em: new Date().toISOString() }).eq("id", id);
    const recusado = await clienteLogado(cenario.pessoas.recusadoA.email);

    const { error } = await recusado.rpc("reenviar_solicitacao", { p_nome: "  Nome   Corrigido  " });
    expect(error).toBeNull();

    const atual = await perfil(id);
    expect(atual.status).toBe("pendente");
    expect(atual.nome).toBe("Nome Corrigido");
    expect(atual.motivo_recusa).toBeNull();
    expect(atual.notificado_em).toBeNull();
    expect(atual.organizacao_id).toBe(cenario.orgA.id);

    const { data: auditoria } = await clienteServico()
      .from("auditoria")
      .select("acao, ator_id")
      .eq("alvo_perfil_id", id)
      .eq("acao", "reenviou_solicitacao");
    expect(auditoria).toEqual([{ acao: "reenviou_solicitacao", ator_id: id }]);
  });

  it("recusa nome sem sobrenome", async () => {
    const id = cenario.pessoas.recusadoA.id;
    await recusarDeNovo(id);
    const recusado = await clienteLogado(cenario.pessoas.recusadoA.email);
    const { error } = await recusado.rpc("reenviar_solicitacao", { p_nome: "Sozinho" });
    expect(error?.code).toBe("AP003");
  });

  it("não move para órgão inativo ou inexistente", async () => {
    const recusado = await clienteLogado(cenario.pessoas.recusadoA.email);
    for (const slug of [cenario.orgInativo.slug, "nao-existe-mesmo"]) {
      const { error } = await recusado.rpc("reenviar_solicitacao", { p_nome: "Nome Corrigido", p_slug: slug });
      expect(error?.code).toBe("AP002");
    }
    expect((await perfil(cenario.pessoas.recusadoA.id)).organizacao_id).toBe(cenario.orgA.id);
  });

  it("move para outro órgão ativo: passa a aparecer só para o gestor do novo órgão", async () => {
    const id = cenario.pessoas.recusadoA.id;
    const recusado = await clienteLogado(cenario.pessoas.recusadoA.email);
    const { error } = await recusado.rpc("reenviar_solicitacao", { p_nome: "Nome Corrigido", p_slug: cenario.orgB.slug });
    expect(error).toBeNull();

    const gestorA = await clienteLogado(cenario.pessoas.gestorA.email);
    const gestorB = await clienteLogado(cenario.pessoas.gestorB.email);
    expect((await gestorA.from("perfis").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await gestorB.from("perfis").select("id").eq("id", id)).data).toHaveLength(1);
  });

  it("limita a 3 reenvios", async () => {
    const id = cenario.pessoas.recusadoA.id;
    const recusado = await clienteLogado(cenario.pessoas.recusadoA.email);
    // Já houve 2 reenvios bem-sucedidos nos testes anteriores.
    await recusarDeNovo(id);
    expect((await recusado.rpc("reenviar_solicitacao", { p_nome: "Nome Corrigido" })).error).toBeNull();
    await recusarDeNovo(id);
    const { error } = await recusado.rpc("reenviar_solicitacao", { p_nome: "Nome Corrigido" });
    expect(error?.code).toBe("AP001");
    expect((await perfil(id)).status).toBe("recusado");
  });
});

describe("controle de avisos (notificado_em)", () => {
  it("gestor e admin não alteram o registro de aviso pela API", async () => {
    const id = cenario.pessoas.pendenteA.id;
    const gestorA = await clienteLogado(cenario.pessoas.gestorA.email);
    const admin = await clienteLogado(cenario.pessoas.admin.email);
    await gestorA.from("perfis").update({ notificado_em: new Date().toISOString() }).eq("id", id);
    await admin.from("perfis").update({ notificado_em: new Date().toISOString() }).eq("id", id);
    expect((await perfil(id)).notificado_em).toBeNull();
  });
});
