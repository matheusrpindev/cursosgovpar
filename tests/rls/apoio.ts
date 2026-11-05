import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos-banco";

export type Cliente = SupabaseClient<Database>;

const url = () => process.env.SUPABASE_TESTE_URL!;
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Cliente com a chave secreta: só para MONTAR o cenário (ignora a RLS). */
export function clienteServico(): Cliente {
  return createClient<Database>(url(), process.env.SUPABASE_TESTE_CHAVE_SECRETA!, opcoes);
}

/** Visitante sem login, com a chave pública (a mesma que vai para o navegador). */
export function clienteAnonimo(): Cliente {
  return createClient<Database>(url(), process.env.SUPABASE_TESTE_CHAVE_PUBLICA!, opcoes);
}

export const SENHA = "SenhaTeste123";

export async function clienteLogado(email: string): Promise<Cliente> {
  const cliente = clienteAnonimo();
  const { error } = await cliente.auth.signInWithPassword({ email, password: SENHA });
  if (error) throw new Error(`Falha no login de ${email}: ${error.message}`);
  return cliente;
}

/** Gera um CPF válido aleatório. */
export function cpfAleatorio(): string {
  const d = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += d[i] * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    d.push(resto === 10 ? 0 : resto);
  }
  return d.join("");
}

type Status = Database["public"]["Enums"]["status_perfil"];
type Papel = Database["public"]["Enums"]["papel"];

export type Pessoa = { id: string; email: string; cpf: string | null; organizacaoId: string | null };

/**
 * Cenário isolado por execução: dois órgãos (A e B) + um órgão inativo,
 * gestores, alunos em cada situação, cursos liberados para cada órgão,
 * um rascunho e um certificado. Tudo com sufixo único e apagado no final.
 */
export async function criarCenario() {
  const servico = clienteServico();
  const sufixo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const criados: string[] = [];

  async function criarOrgao(nome: string) {
    const { data, error } = await servico
      .from("organizacoes")
      .insert({ nome: `${nome} ${sufixo}`, slug: `${nome.toLowerCase().replace(/\s+/g, "-")}-${sufixo}` })
      .select("id, slug")
      .single();
    if (error) throw error;
    return data;
  }

  const orgA = await criarOrgao("Orgao A");
  const orgB = await criarOrgao("Orgao B");
  const orgInativo = await criarOrgao("Orgao Inativo");

  async function criarPessoa(
    apelido: string,
    papel: Papel,
    organizacaoId: string | null,
    opcoesPessoa: { status?: Status; confirmado?: boolean } = {},
  ): Promise<Pessoa> {
    const email = `${apelido}.${sufixo}@teste.local`;
    const cpf = papel === "admin" ? null : cpfAleatorio();
    const { data, error } = await servico.auth.admin.createUser({
      email,
      password: SENHA,
      email_confirm: opcoesPessoa.confirmado !== false,
      user_metadata: { nome: `Pessoa ${apelido}`, cpf: cpf ?? undefined, aceite_termos: true },
      app_metadata: { papel, organizacao_id: organizacaoId ?? undefined },
    });
    if (error) throw new Error(`criar ${apelido}: ${error.message}`);
    criados.push(data.user.id);

    const status = opcoesPessoa.status;
    if (status && status !== "pendente" && papel === "aluno") {
      const primeiro = status === "recusado" ? "recusado" : "aprovado";
      await servico.from("perfis").update({ status: primeiro }).eq("id", data.user.id).throwOnError();
      if (status === "desativado") {
        await servico.from("perfis").update({ status: "desativado" }).eq("id", data.user.id).throwOnError();
      }
    }
    return { id: data.user.id, email, cpf, organizacaoId };
  }

  const pessoas = {
    admin: await criarPessoa("admin", "admin", null),
    gestorA: await criarPessoa("gestora", "gestor", orgA.id),
    gestorA2: await criarPessoa("gestora2", "gestor", orgA.id),
    gestorB: await criarPessoa("gestorb", "gestor", orgB.id),
    alunoA: await criarPessoa("alunoa", "aluno", orgA.id, { status: "aprovado" }),
    alunoA2: await criarPessoa("alunoa2", "aluno", orgA.id, { status: "aprovado" }),
    pendenteA: await criarPessoa("pendentea", "aluno", orgA.id, { status: "pendente" }),
    naoConfirmadoA: await criarPessoa("naoconfa", "aluno", orgA.id, { status: "pendente", confirmado: false }),
    recusadoA: await criarPessoa("recusadoa", "aluno", orgA.id, { status: "recusado" }),
    desativadoA: await criarPessoa("desativadoa", "aluno", orgA.id, { status: "desativado" }),
    alunoB: await criarPessoa("alunob", "aluno", orgB.id, { status: "aprovado" }),
    pendenteB: await criarPessoa("pendenteb", "aluno", orgB.id, { status: "pendente" }),
    alunoInativo: await criarPessoa("alunoinativo", "aluno", orgInativo.id, { status: "aprovado" }),
  };

  // O órgão é inativado depois de ter pessoas (cadastro novo exige órgão ativo).
  await servico.from("organizacoes").update({ ativo: false }).eq("id", orgInativo.id).throwOnError();

  async function criarCurso(titulo: string, status: "rascunho" | "publicado", orgaos: string[]) {
    const { data: curso } = await servico
      .from("cursos")
      .insert({ titulo: `${titulo} ${sufixo}`, carga_horaria: 4, status })
      .select("id")
      .single()
      .throwOnError();
    const { data: aula } = await servico
      .from("aulas")
      .insert({ curso_id: curso.id, titulo: `Aula de ${titulo}`, video_provedor: "youtube", video_id: "dQw4w9WgXcQ", ordem: 1 })
      .select("id")
      .single()
      .throwOnError();
    if (orgaos.length) {
      await servico
        .from("organizacao_cursos")
        .insert(orgaos.map((organizacao_id) => ({ organizacao_id, curso_id: curso.id })))
        .throwOnError();
    }
    return { id: curso.id, aulaId: aula.id };
  }

  const cursos = {
    deA: await criarCurso("Curso A", "publicado", [orgA.id]),
    deB: await criarCurso("Curso B", "publicado", [orgB.id]),
    rascunhoA: await criarCurso("Rascunho A", "rascunho", [orgA.id]),
    doInativo: await criarCurso("Curso Inativo", "publicado", [orgInativo.id]),
  };

  // Certificados emitidos diretamente pelo serviço (a emissão de verdade chega na etapa 4).
  async function criarCertificado(pessoa: Pessoa, cursoId: string, codigo: string) {
    const { data } = await servico
      .from("certificados")
      .insert({
        codigo: `${codigo}-${sufixo}`,
        perfil_id: pessoa.id,
        curso_id: cursoId,
        organizacao_id: pessoa.organizacaoId,
        dados: { nome: "Teste", cpf: "***.000.000-**" },
      })
      .select("id")
      .single()
      .throwOnError();
    return data.id;
  }

  const certificados = {
    deA: await criarCertificado(pessoas.alunoA, cursos.deA.id, "CERT-A"),
    deB: await criarCertificado(pessoas.alunoB, cursos.deB.id, "CERT-B"),
    doDesativadoA: await criarCertificado(pessoas.desativadoA, cursos.deA.id, "CERT-D"),
  };

  async function limpar() {
    await servico.from("certificados").delete().in("id", Object.values(certificados));
    await servico.from("cursos").delete().in("id", Object.values(cursos).map((c) => c.id));
    for (const id of criados) {
      await servico.auth.admin.deleteUser(id);
    }
    await servico.from("organizacoes").delete().in("id", [orgA.id, orgB.id, orgInativo.id]);
  }

  return { sufixo, orgA, orgB, orgInativo, pessoas, cursos, certificados, limpar };
}

export type Cenario = Awaited<ReturnType<typeof criarCenario>>;
