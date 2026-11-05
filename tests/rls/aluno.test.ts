import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteLogado, clienteServico, criarCenario, type Cenario, type Cliente } from "./apoio";

let cenario: Cenario;
let aluno: Cliente;

beforeAll(async () => {
  cenario = await criarCenario();
  aluno = await clienteLogado(cenario.pessoas.alunoA.email);
});
afterAll(async () => cenario?.limpar());

async function statusNoBanco(id: string) {
  const { data } = await clienteServico().from("perfis").select("status, papel, organizacao_id").eq("id", id).single();
  return data!;
}

describe("aluno aprovado", () => {
  it("vê somente o próprio perfil", async () => {
    const { data } = await aluno.from("perfis").select("id");
    expect(data?.map((p) => p.id)).toEqual([cenario.pessoas.alunoA.id]);
  });

  it("vê somente o próprio CPF completo", async () => {
    const { data } = await aluno.from("perfis_privados").select("perfil_id, cpf");
    expect(data).toEqual([{ perfil_id: cenario.pessoas.alunoA.id, cpf: cenario.pessoas.alunoA.cpf }]);
  });

  it("vê somente o próprio órgão", async () => {
    const { data } = await aluno.from("organizacoes").select("id");
    expect(data?.map((o) => o.id)).toEqual([cenario.orgA.id]);
  });

  it("não se promove a admin nem a gestor", async () => {
    for (const papel of ["admin", "gestor"] as const) {
      await aluno.from("perfis").update({ papel }).eq("id", cenario.pessoas.alunoA.id);
    }
    expect((await statusNoBanco(cenario.pessoas.alunoA.id)).papel).toBe("aluno");
  });

  it("não altera o próprio status nem o órgão", async () => {
    await aluno.from("perfis").update({ status: "desativado", organizacao_id: cenario.orgB.id }).eq("id", cenario.pessoas.alunoA.id);
    const atual = await statusNoBanco(cenario.pessoas.alunoA.id);
    expect(atual.status).toBe("aprovado");
    expect(atual.organizacao_id).toBe(cenario.orgA.id);
  });

  it("não aprova colega pendente do mesmo órgão", async () => {
    await aluno.from("perfis").update({ status: "aprovado" }).eq("id", cenario.pessoas.pendenteA.id);
    expect((await statusNoBanco(cenario.pessoas.pendenteA.id)).status).toBe("pendente");
  });

  it("não lê a auditoria", async () => {
    const { data } = await aluno.from("auditoria").select("id");
    expect(data ?? []).toHaveLength(0);
  });

  it("não altera a marca nem cria órgãos, cursos ou certificados", async () => {
    await aluno.from("configuracoes").update({ nome_plataforma: "Invadido" }).eq("id", 1);
    const { data: config } = await clienteServico().from("configuracoes").select("nome_plataforma").single();
    expect(config?.nome_plataforma).not.toBe("Invadido");

    const r1 = await aluno.from("organizacoes").insert({ nome: "Novo", slug: `novo-${cenario.sufixo}` });
    const r2 = await aluno.from("cursos").insert({ titulo: "Novo curso", carga_horaria: 1 });
    const r3 = await aluno.from("certificados").insert({
      codigo: `FALSO-${cenario.sufixo}`,
      perfil_id: cenario.pessoas.alunoA.id,
      curso_id: cenario.cursos.deA.id,
      dados: {},
    });
    const r4 = await aluno.from("organizacao_cursos").insert({ organizacao_id: cenario.orgA.id, curso_id: cenario.cursos.deB.id });
    for (const r of [r1, r2, r3, r4]) expect(r.error).not.toBeNull();
  });

  it("vê os próprios certificados e não os de outras pessoas", async () => {
    const { data } = await aluno.from("certificados").select("id");
    expect(data?.map((c) => c.id)).toEqual([cenario.certificados.deA]);
  });

  it("não grava aceite de termos diretamente (só pela função do banco)", async () => {
    const direto = await aluno.from("aceites_termos").insert({ perfil_id: cenario.pessoas.alunoA.id, documento: "termos_uso", versao: 999 });
    expect(direto.error).not.toBeNull();
    const pelaFuncao = await aluno.rpc("aceitar_termos_atuais");
    expect(pelaFuncao.error).toBeNull();
  });

  it("não envia arquivos para o Storage da marca", async () => {
    const { error } = await aluno.storage
      .from("marca")
      .upload(`aluno-${cenario.sufixo}.png`, new Blob(["x"], { type: "image/png" }));
    expect(error).not.toBeNull();
  });
});
