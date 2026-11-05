import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteAnonimo, clienteLogado, criarCenario, SENHA, type Cenario } from "./apoio";

let cenario: Cenario;

beforeAll(async () => {
  cenario = await criarCenario();
});
afterAll(async () => cenario?.limpar());

async function cursosVisiveis(email: string) {
  const cliente = await clienteLogado(email);
  const [{ data: cursos }, { data: aulas }] = await Promise.all([
    cliente.from("cursos").select("id"),
    cliente.from("aulas").select("id"),
  ]);
  return { cliente, cursos: (cursos ?? []).map((c) => c.id), aulas: (aulas ?? []).map((a) => a.id) };
}

describe("acesso a cursos conforme situação do cadastro", () => {
  it("aluno aprovado vê só os cursos publicados liberados para o seu órgão", async () => {
    const { cursos, aulas } = await cursosVisiveis(cenario.pessoas.alunoA.email);
    expect(cursos).toEqual([cenario.cursos.deA.id]);
    expect(aulas).toEqual([cenario.cursos.deA.aulaId]);
  });

  it("aluno aprovado não vê rascunho nem curso de outro órgão", async () => {
    const { cursos } = await cursosVisiveis(cenario.pessoas.alunoA.email);
    expect(cursos).not.toContain(cenario.cursos.rascunhoA.id);
    expect(cursos).not.toContain(cenario.cursos.deB.id);
  });

  it.each([
    ["pendente", "pendenteA"],
    ["recusado", "recusadoA"],
    ["desativado", "desativadoA"],
    ["de órgão inativo", "alunoInativo"],
  ] as const)("aluno %s não vê nenhum curso nem aula", async (_, apelido) => {
    const { cursos, aulas, cliente } = await cursosVisiveis(cenario.pessoas[apelido].email);
    expect(cursos).toHaveLength(0);
    expect(aulas).toHaveLength(0);
    const { data: liberacoes } = await cliente.from("organizacao_cursos").select("curso_id");
    expect(liberacoes ?? []).toHaveLength(0);
  });

  it("aluno pendente não consegue marcar aula como concluída", async () => {
    const pendente = await clienteLogado(cenario.pessoas.pendenteA.email);
    const { error } = await pendente
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.pendenteA.id, aula_id: cenario.cursos.deA.aulaId });
    expect(error).not.toBeNull();
  });

  it("cadastro com e-mail não confirmado não consegue nem entrar", async () => {
    const { error } = await clienteAnonimo().auth.signInWithPassword({
      email: cenario.pessoas.naoConfirmadoA.email,
      password: SENHA,
    });
    expect(error?.code).toBe("email_not_confirmed");
  });

  it("aluno desativado continua vendo os próprios certificados", async () => {
    const desativado = await clienteLogado(cenario.pessoas.desativadoA.email);
    const { data } = await desativado.from("certificados").select("id");
    expect(data?.map((c) => c.id)).toEqual([cenario.certificados.doDesativadoA]);
  });

  it("gestor também pode estudar os cursos do próprio órgão", async () => {
    const { cursos } = await cursosVisiveis(cenario.pessoas.gestorA.email);
    expect(cursos).toEqual([cenario.cursos.deA.id]);
  });
});

describe("progresso nas aulas", () => {
  it("aluno marca aula de curso liberado", async () => {
    const aluno = await clienteLogado(cenario.pessoas.alunoA.email);
    const { error } = await aluno
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.alunoA.id, aula_id: cenario.cursos.deA.aulaId });
    expect(error).toBeNull();
  });

  it("aluno não marca aula de curso de outro órgão", async () => {
    const aluno = await clienteLogado(cenario.pessoas.alunoA.email);
    const { error } = await aluno
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.alunoA.id, aula_id: cenario.cursos.deB.aulaId });
    expect(error).not.toBeNull();
  });

  it("aluno não marca aula em nome de outra pessoa", async () => {
    const aluno = await clienteLogado(cenario.pessoas.alunoA.email);
    const { error } = await aluno
      .from("progresso_aulas")
      .insert({ perfil_id: cenario.pessoas.alunoA2.id, aula_id: cenario.cursos.deA.aulaId });
    expect(error).not.toBeNull();
  });

  it("aluno não vê o progresso de colegas", async () => {
    const colega = await clienteLogado(cenario.pessoas.alunoA2.email);
    const { data } = await colega.from("progresso_aulas").select("perfil_id");
    expect((data ?? []).every((p) => p.perfil_id === cenario.pessoas.alunoA2.id)).toBe(true);
  });
});
