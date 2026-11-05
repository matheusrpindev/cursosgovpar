import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clienteLogado, clienteServico, criarCenario, type Cenario, type Cliente } from "./apoio";

let cenario: Cenario;
let admin: Cliente;

beforeAll(async () => {
  cenario = await criarCenario();
  admin = await clienteLogado(cenario.pessoas.admin.email);
});
afterAll(async () => cenario?.limpar());

describe("administrador da plataforma", () => {
  it("vê pessoas de todos os órgãos", async () => {
    const { data } = await admin
      .from("perfis")
      .select("id")
      .in("id", [cenario.pessoas.alunoA.id, cenario.pessoas.alunoB.id, cenario.pessoas.naoConfirmadoA.id]);
    expect(data).toHaveLength(3);
  });

  it("vê todos os cursos, inclusive rascunhos", async () => {
    const { data } = await admin.from("cursos").select("id").in("id", Object.values(cenario.cursos).map((c) => c.id));
    expect(data).toHaveLength(4);
  });

  it("altera a marca", async () => {
    const servico = clienteServico();
    const { data: antes } = await servico.from("configuracoes").select("texto_rodape, termos_versao").single();
    try {
      const { error } = await admin.from("configuracoes").update({ texto_rodape: `Rodapé ${cenario.sufixo}` }).eq("id", 1);
      expect(error).toBeNull();
      const { data: depois } = await servico.from("configuracoes").select("texto_rodape, termos_versao, atualizado_por").single();
      expect(depois?.texto_rodape).toBe(`Rodapé ${cenario.sufixo}`);
      expect(depois?.termos_versao).toBe(antes?.termos_versao);
      expect(depois?.atualizado_por).toBe(cenario.pessoas.admin.id);
    } finally {
      await servico.from("configuracoes").update({ texto_rodape: antes!.texto_rodape }).eq("id", 1);
    }
  });

  it("não altera o próprio papel (evita ficar sem administrador)", async () => {
    const { error } = await admin.from("perfis").update({ papel: "aluno" }).eq("id", cenario.pessoas.admin.id);
    expect(error).not.toBeNull();
  });

  it("transfere aluno de órgão e a auditoria registra", async () => {
    const id = cenario.pessoas.alunoA2.id;
    const { error } = await admin.from("perfis").update({ organizacao_id: cenario.orgB.id }).eq("id", id);
    expect(error).toBeNull();
    const { data } = await admin.from("auditoria").select("acao").eq("alvo_perfil_id", id);
    expect(data?.map((a) => a.acao)).toContain("transferiu_orgao");
  });

  it("revoga certificado, mas não altera os dados impressos", async () => {
    const alterarDados = await admin.from("certificados").update({ dados: { nome: "Outro Nome" } }).eq("id", cenario.certificados.deB);
    expect(alterarDados.error).not.toBeNull();

    const revogar = await admin
      .from("certificados")
      .update({ revogado_em: new Date().toISOString(), motivo_revogacao: "Teste" })
      .eq("id", cenario.certificados.deB);
    expect(revogar.error).toBeNull();
    const { data } = await clienteServico()
      .from("certificados")
      .select("revogado_em, revogado_por, motivo_revogacao")
      .eq("id", cenario.certificados.deB)
      .single();
    expect(data?.revogado_em).not.toBeNull();
    expect(data?.revogado_por).toBe(cenario.pessoas.admin.id);
  });

  it("envia e apaga arquivos da marca no Storage", async () => {
    const caminho = `teste-${cenario.sufixo}.png`;
    const envio = await admin.storage.from("marca").upload(caminho, new Blob(["x"], { type: "image/png" }));
    expect(envio.error).toBeNull();
    const remocao = await admin.storage.from("marca").remove([caminho]);
    expect(remocao.error).toBeNull();
  });

  it("nem o admin acessa o bucket de certificados pelo navegador (só o servidor)", async () => {
    const { error } = await admin.storage
      .from("certificados")
      .upload(`falso-${cenario.sufixo}.pdf`, new Blob(["x"], { type: "application/pdf" }));
    expect(error).not.toBeNull();
  });
});
