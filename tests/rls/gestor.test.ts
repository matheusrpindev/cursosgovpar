import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteLogado, clienteServico, criarCenario, type Cenario, type Cliente } from "./apoio";

/**
 * Isolamento entre órgãos: o gestor do órgão A não vê nem altera nada do órgão B.
 */
let cenario: Cenario;
let gestorA: Cliente;
let gestorB: Cliente;

beforeAll(async () => {
  cenario = await criarCenario();
  gestorA = await clienteLogado(cenario.pessoas.gestorA.email);
  gestorB = await clienteLogado(cenario.pessoas.gestorB.email);
});
afterAll(async () => cenario?.limpar());

async function perfilNoBanco(id: string) {
  const { data } = await clienteServico()
    .from("perfis")
    .select("status, papel, organizacao_id, nome, aprovado_por, motivo_recusa")
    .eq("id", id)
    .single();
  return data!;
}

describe("gestor: o que vê", () => {
  it("vê as pessoas do próprio órgão e nenhuma do outro", async () => {
    const { data } = await gestorA.from("perfis").select("id, organizacao_id");
    const ids = (data ?? []).map((p) => p.id);
    expect((data ?? []).every((p) => p.organizacao_id === cenario.orgA.id)).toBe(true);
    expect(ids).toContain(cenario.pessoas.alunoA.id);
    expect(ids).toContain(cenario.pessoas.pendenteA.id);
    expect(ids).not.toContain(cenario.pessoas.alunoB.id);
    expect(ids).not.toContain(cenario.pessoas.pendenteB.id);
    expect(ids).not.toContain(cenario.pessoas.gestorB.id);
  });

  it("não vê cadastro pendente que ainda não confirmou o e-mail", async () => {
    const { data } = await gestorA.from("perfis").select("id").eq("id", cenario.pessoas.naoConfirmadoA.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("o gestor B também não vê ninguém do órgão A", async () => {
    const { data } = await gestorB.from("perfis").select("id").eq("organizacao_id", cenario.orgA.id);
    expect(data ?? []).toHaveLength(0);
  });

  it("vê o CPF completo apenas de pendentes do próprio órgão (além do próprio CPF)", async () => {
    const { data } = await gestorA.from("perfis_privados").select("perfil_id, cpf");
    const deOutros = (data ?? []).filter((p) => p.perfil_id !== cenario.pessoas.gestorA.id);
    expect(deOutros).toEqual([{ perfil_id: cenario.pessoas.pendenteA.id, cpf: cenario.pessoas.pendenteA.cpf }]);
  });

  it("vê só o próprio órgão", async () => {
    const { data } = await gestorA.from("organizacoes").select("id");
    expect(data?.map((o) => o.id)).toEqual([cenario.orgA.id]);
  });

  it("vê certificados do próprio órgão e não os do outro", async () => {
    const { data } = await gestorA.from("certificados").select("id");
    const ids = (data ?? []).map((c) => c.id);
    expect(ids).toContain(cenario.certificados.deA);
    expect(ids).not.toContain(cenario.certificados.deB);
  });

  it("vê o progresso de alunos do próprio órgão e não o do outro", async () => {
    const servico = clienteServico();
    await servico.from("progresso_aulas").insert([
      { perfil_id: cenario.pessoas.alunoA.id, aula_id: cenario.cursos.deA.aulaId },
      { perfil_id: cenario.pessoas.alunoB.id, aula_id: cenario.cursos.deB.aulaId },
    ]);
    const { data } = await gestorA.from("progresso_aulas").select("perfil_id");
    const pessoas = (data ?? []).map((p) => p.perfil_id);
    expect(pessoas).toContain(cenario.pessoas.alunoA.id);
    expect(pessoas).not.toContain(cenario.pessoas.alunoB.id);
  });
});

describe("gestor: o que altera", () => {
  it("não altera ninguém do outro órgão", async () => {
    await gestorA.from("perfis").update({ status: "aprovado" }).eq("id", cenario.pessoas.pendenteB.id);
    await gestorA.from("perfis").update({ status: "desativado" }).eq("id", cenario.pessoas.alunoB.id);
    expect((await perfilNoBanco(cenario.pessoas.pendenteB.id)).status).toBe("pendente");
    expect((await perfilNoBanco(cenario.pessoas.alunoB.id)).status).toBe("aprovado");
  });

  it("aprova um pendente do próprio órgão, e o banco registra quem aprovou", async () => {
    const { error } = await gestorA
      .from("perfis")
      .update({ status: "aprovado", aprovado_por: cenario.pessoas.gestorB.id })
      .eq("id", cenario.pessoas.pendenteA.id);
    expect(error).toBeNull();
    const atual = await perfilNoBanco(cenario.pessoas.pendenteA.id);
    expect(atual.status).toBe("aprovado");
    expect(atual.aprovado_por).toBe(cenario.pessoas.gestorA.id);

    const { data: auditoria } = await gestorA
      .from("auditoria")
      .select("acao, ator_id")
      .eq("alvo_perfil_id", cenario.pessoas.pendenteA.id);
    expect(auditoria).toContainEqual({ acao: "aprovou_cadastro", ator_id: cenario.pessoas.gestorA.id });
  });

  it("não aprova cadastro que ainda não confirmou o e-mail", async () => {
    await gestorA.from("perfis").update({ status: "aprovado" }).eq("id", cenario.pessoas.naoConfirmadoA.id);
    expect((await perfilNoBanco(cenario.pessoas.naoConfirmadoA.id)).status).toBe("pendente");
  });

  it.each(["admin", "gestor"] as const)("não promove aluno a %s", async (papel) => {
    const { error } = await gestorA.from("perfis").update({ papel }).eq("id", cenario.pessoas.alunoA.id);
    expect(error).not.toBeNull();
    expect((await perfilNoBanco(cenario.pessoas.alunoA.id)).papel).toBe("aluno");
  });

  it("não transfere aluno para outro órgão", async () => {
    await gestorA.from("perfis").update({ organizacao_id: cenario.orgB.id }).eq("id", cenario.pessoas.alunoA.id);
    expect((await perfilNoBanco(cenario.pessoas.alunoA.id)).organizacao_id).toBe(cenario.orgA.id);
  });

  it("não altera o próprio papel, status ou nome", async () => {
    await gestorA.from("perfis").update({ papel: "admin" }).eq("id", cenario.pessoas.gestorA.id);
    await gestorA.from("perfis").update({ status: "desativado" }).eq("id", cenario.pessoas.gestorA.id);
    await gestorA.from("perfis").update({ nome: "Gestor Alterado" }).eq("id", cenario.pessoas.gestorA.id);
    const atual = await perfilNoBanco(cenario.pessoas.gestorA.id);
    expect(atual.papel).toBe("gestor");
    expect(atual.status).toBe("aprovado");
    expect(atual.nome).not.toBe("Gestor Alterado");
  });

  it("não altera outro gestor do mesmo órgão", async () => {
    await gestorA.from("perfis").update({ status: "desativado" }).eq("id", cenario.pessoas.gestorA2.id);
    expect((await perfilNoBanco(cenario.pessoas.gestorA2.id)).status).toBe("aprovado");
  });

  it("não faz mudança de status inválida (recusado direto para aprovado)", async () => {
    const { error } = await gestorA.from("perfis").update({ status: "aprovado" }).eq("id", cenario.pessoas.recusadoA.id);
    expect(error).not.toBeNull();
    expect((await perfilNoBanco(cenario.pessoas.recusadoA.id)).status).toBe("recusado");
  });

  it("desativa e reativa aluno do próprio órgão", async () => {
    const id = cenario.pessoas.alunoA2.id;
    expect((await gestorA.from("perfis").update({ status: "desativado" }).eq("id", id)).error).toBeNull();
    expect((await perfilNoBanco(id)).status).toBe("desativado");
    expect((await gestorA.from("perfis").update({ status: "aprovado" }).eq("id", id)).error).toBeNull();
    expect((await perfilNoBanco(id)).status).toBe("aprovado");
  });

  it("vê a auditoria do próprio órgão e não a do outro", async () => {
    await gestorB.from("perfis").update({ status: "recusado", motivo_recusa: "teste" }).eq("id", cenario.pessoas.pendenteB.id);
    const { data: doOutro } = await gestorA.from("auditoria").select("id").eq("organizacao_id", cenario.orgB.id);
    expect(doOutro ?? []).toHaveLength(0);
    const { data: doProprio } = await gestorB.from("auditoria").select("acao").eq("alvo_perfil_id", cenario.pessoas.pendenteB.id);
    expect(doProprio?.map((a) => a.acao)).toContain("recusou_cadastro");
  });

  it("não altera a marca, cursos, liberações nem certificados", async () => {
    await gestorA.from("configuracoes").update({ nome_plataforma: "Invadido" }).eq("id", 1);
    const { data: config } = await clienteServico().from("configuracoes").select("nome_plataforma").single();
    expect(config?.nome_plataforma).not.toBe("Invadido");

    const r1 = await gestorA.from("cursos").insert({ titulo: "Curso do gestor", carga_horaria: 1 });
    const r2 = await gestorA.from("organizacao_cursos").insert({ organizacao_id: cenario.orgA.id, curso_id: cenario.cursos.deB.id });
    expect(r1.error).not.toBeNull();
    expect(r2.error).not.toBeNull();

    await gestorA.from("certificados").update({ revogado_em: new Date().toISOString() }).eq("id", cenario.certificados.deA);
    const { data: cert } = await clienteServico().from("certificados").select("revogado_em").eq("id", cenario.certificados.deA).single();
    expect(cert?.revogado_em).toBeNull();
  });
});
