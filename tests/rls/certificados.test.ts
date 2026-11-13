import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteAnonimo, clienteLogado, clienteServico, criarCenario, type Cenario } from "./apoio";

let cenario: Cenario;
let segundaAulaId: string;

beforeAll(async () => {
  cenario = await criarCenario();
  const { data } = await clienteServico()
    .from("aulas")
    .insert({ curso_id: cenario.cursos.deA.id, titulo: "Segunda aula", video_provedor: "youtube", video_id: "jNQXAC9IVRw", ordem: 2 })
    .select("id")
    .single()
    .throwOnError();
  segundaAulaId = data.id;
});
afterAll(async () => {
  // Certificados emitidos nos testes precisam sair antes dos cursos.
  await clienteServico().from("certificados").delete().in("curso_id", Object.values(cenario.cursos).map((c) => c.id));
  await cenario?.limpar();
});

describe("progresso nas aulas", () => {
  it.each([
    ["pendente", "pendenteA"],
    ["recusado", "recusadoA"],
    ["desativado", "desativadoA"],
    ["de órgão inativo", "alunoInativo"],
  ] as const)("aluno %s não consegue marcar aula como concluída", async (_, apelido) => {
    const pessoa = cenario.pessoas[apelido];
    const cliente = await clienteLogado(pessoa.email);
    const { error } = await cliente.from("progresso_aulas").insert({ perfil_id: pessoa.id, aula_id: cenario.cursos.deA.aulaId });
    expect(error).not.toBeNull();
  });

  it("aluno não marca aula de curso de outro órgão nem de rascunho", async () => {
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    for (const aula of [cenario.cursos.deB.aulaId, cenario.cursos.rascunhoA.aulaId]) {
      const { error } = await cliente.from("progresso_aulas").insert({ perfil_id: cenario.pessoas.alunoA2.id, aula_id: aula });
      expect(error).not.toBeNull();
    }
  });

  it("aluno não marca progresso em nome de outra pessoa nem apaga o próprio", async () => {
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    const { error } = await cliente
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.alunoA.id, aula_id: cenario.cursos.deA.aulaId });
    expect(error).not.toBeNull();
  });
});

describe("emissão de certificado", () => {
  it("não emite sem concluir todas as aulas", async () => {
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    await cliente
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.alunoA2.id, aula_id: cenario.cursos.deA.aulaId })
      .throwOnError();
    const { data, error } = await cliente.rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(data).toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("emite depois de concluir tudo, com dados congelados e CPF mascarado; repetir devolve o mesmo", async () => {
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    await cliente.from("progresso_aulas").insert({ perfil_id: cenario.pessoas.alunoA2.id, aula_id: segundaAulaId }).throwOnError();

    const primeira = await cliente.rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(primeira.error).toBeNull();
    const dados = primeira.data!.dados as Record<string, string>;
    expect(primeira.data!.codigo).toMatch(/^[A-Z0-9]{1,6}-[0-9A-F]{5}-[0-9A-F]{5}$/);
    expect(dados.nome).toBe("Pessoa alunoa2");
    expect(dados.cpf).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
    expect(dados.frase).toContain("Pessoa alunoa2");
    expect(dados.frase).not.toContain("{");
    expect(JSON.stringify(dados)).not.toContain(cenario.pessoas.alunoA2.cpf!);

    const segunda = await cliente.rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(segunda.data!.codigo).toBe(primeira.data!.codigo);
  });

  it("não emite para curso de outro órgão nem rascunho", async () => {
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    for (const curso of [cenario.cursos.deB.id, cenario.cursos.rascunhoA.id]) {
      const { data, error } = await cliente.rpc("emitir_certificado", { p_curso: curso });
      expect(data).toBeNull();
      expect(error?.code).toBe("42501");
    }
  });

  it.each([
    ["pendente", "pendenteA"],
    ["desativado", "desativadoA"],
    ["de órgão inativo", "alunoInativo"],
  ] as const)("aluno %s não emite certificado", async (_, apelido) => {
    const cliente = await clienteLogado(cenario.pessoas[apelido].email);
    const { data, error } = await cliente.rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("visitante não chama a emissão", async () => {
    const { error } = await clienteAnonimo().rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(error).not.toBeNull();
  });
});

describe("validação pública e revogação", () => {
  async function codigoDoAlunoA2() {
    const { data } = await clienteServico()
      .from("certificados")
      .select("id, codigo")
      .eq("perfil_id", cenario.pessoas.alunoA2.id)
      .single()
      .throwOnError();
    return data;
  }

  it("visitante valida pelo código e recebe só os campos públicos", async () => {
    const { codigo } = await codigoDoAlunoA2();
    const { data, error } = await clienteAnonimo().rpc("validar_certificado", { p_codigo: codigo.toLowerCase() });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(Object.keys(data![0]).sort()).toEqual(
      ["carga_horaria", "codigo", "curso", "data_conclusao", "emitido_em", "nome", "orgao", "valido"].sort(),
    );
    expect(data![0].valido).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/\d{3}\.\d{3}/);
  });

  it("código inexistente ou curto demais não devolve nada; visitante não lista certificados", async () => {
    const anonimo = clienteAnonimo();
    expect((await anonimo.rpc("validar_certificado", { p_codigo: "AUR-00000-00000" })).data).toHaveLength(0);
    expect((await anonimo.rpc("validar_certificado", { p_codigo: "%" })).data).toHaveLength(0);
    const { data } = await anonimo.from("certificados").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("aluno e gestor não revogam nem alteram certificado", async () => {
    const { id } = await codigoDoAlunoA2();
    for (const email of [cenario.pessoas.alunoA2.email, cenario.pessoas.gestorA.email]) {
      const cliente = await clienteLogado(email);
      const { data } = await cliente.from("certificados").update({ revogado_em: new Date().toISOString() }).eq("id", id).select("id");
      expect(data ?? []).toHaveLength(0);
    }
    const { data } = await clienteServico().from("certificados").select("revogado_em").eq("id", id).single();
    expect(data?.revogado_em).toBeNull();
  });

  it("nem o admin altera os dados impressos; revogar funciona e aparece na validação", async () => {
    const { id, codigo } = await codigoDoAlunoA2();
    const admin = await clienteLogado(cenario.pessoas.admin.email);
    const alterar = await admin.from("certificados").update({ dados: { nome: "Outro Nome" } }).eq("id", id);
    expect(alterar.error?.code).toBe("42501");

    const revogar = await admin
      .from("certificados")
      .update({ revogado_em: "2000-01-01T00:00:00Z", motivo_revogacao: "teste" })
      .eq("id", id)
      .select("revogado_em, revogado_por")
      .single();
    expect(revogar.error).toBeNull();
    expect(revogar.data!.revogado_por).toBe(cenario.pessoas.admin.id);
    expect(new Date(revogar.data!.revogado_em!).getFullYear()).toBeGreaterThan(2020); // data carimbada pelo banco

    const { data } = await clienteAnonimo().rpc("validar_certificado", { p_codigo: codigo });
    expect(data![0].valido).toBe(false);
  });

  it("depois de revogado, a pessoa pode emitir um novo, com outro código", async () => {
    const { codigo } = await codigoDoAlunoA2().catch(() => ({ codigo: "" }));
    const cliente = await clienteLogado(cenario.pessoas.alunoA2.email);
    const { data, error } = await cliente.rpc("emitir_certificado", { p_curso: cenario.cursos.deA.id });
    expect(error).toBeNull();
    expect(data!.codigo).not.toBe(codigo);
  });
});

describe("reordenar aulas", () => {
  async function ordem() {
    const { data } = await clienteServico().from("aulas").select("id, ordem").eq("curso_id", cenario.cursos.deA.id).order("ordem");
    return (data ?? []).map((a) => a.id);
  }

  it("aluno e gestor não reordenam", async () => {
    const antes = await ordem();
    for (const email of [cenario.pessoas.alunoA.email, cenario.pessoas.gestorA.email]) {
      const cliente = await clienteLogado(email);
      await cliente.rpc("mover_aula", { p_aula: segundaAulaId, p_sobe: true });
      expect(await ordem()).toEqual(antes);
    }
  });

  it("admin reordena", async () => {
    const admin = await clienteLogado(cenario.pessoas.admin.email);
    const { error } = await admin.rpc("mover_aula", { p_aula: segundaAulaId, p_sobe: true });
    expect(error).toBeNull();
    expect(await ordem()).toEqual([segundaAulaId, cenario.cursos.deA.aulaId]);
  });
});
