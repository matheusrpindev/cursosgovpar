/**
 * Dados de demonstração: usuários de exemplo, cursos com vídeos públicos do
 * YouTube, progresso e um certificado emitido. Pode rodar mais de uma vez.
 *
 *   npm run seed:demo
 *
 * Todos usam a senha "Senha1234". Por usar senha conhecida, só roda contra o
 * Supabase local; para um ambiente de demonstração na internet (só com dados
 * fictícios!), defina SEED_PERMITIR_REMOTO=1.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const chave = process.env.SUPABASE_SECRET_KEY ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) && process.env.SEED_PERMITIR_REMOTO !== "1") {
  console.error("Este script só pode ser usado com o Supabase local (ou com SEED_PERMITIR_REMOTO=1 numa demonstração).");
  process.exit(1);
}

const SENHA = "Senha1234";
const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

/** Gera um CPF válido a partir de 9 dígitos base. */
function cpfDe(base: string): string {
  const digitos = base.split("").map(Number);
  for (const tamanho of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += digitos[i] * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    digitos.push(resto === 10 ? 0 : resto);
  }
  return digitos.join("");
}

type Pessoa = {
  email: string;
  nome: string;
  papel: "admin" | "gestor" | "aluno";
  orgao?: string;
  cpfBase?: string;
  status?: "pendente" | "aprovado" | "recusado" | "desativado";
  motivo?: string;
  confirmado?: boolean;
};

const pessoas: Pessoa[] = [
  { email: "admin@aurora.exemplo", nome: "Ana Administradora", papel: "admin" },
  { email: "gestora.vila@aurora.exemplo", nome: "Gabriela Gestora Vila", papel: "gestor", orgao: "vila-serena", cpfBase: "100000001" },
  { email: "gestor.campo@aurora.exemplo", nome: "Gustavo Gestor Campo", papel: "gestor", orgao: "campo-alegre", cpfBase: "100000002" },
  { email: "aluna.vila@aurora.exemplo", nome: "Alice Aprovada Vila", papel: "aluno", orgao: "vila-serena", cpfBase: "200000001", status: "aprovado" },
  { email: "aluno.concluiu@aurora.exemplo", nome: "Carlos Concluinte Vila", papel: "aluno", orgao: "vila-serena", cpfBase: "200000007", status: "aprovado" },
  { email: "marina.vila@aurora.exemplo", nome: "Marina Souza Lima", papel: "aluno", orgao: "vila-serena", cpfBase: "200000008", status: "aprovado" },
  { email: "jorge.vila@aurora.exemplo", nome: "Jorge Almeida Prado", papel: "aluno", orgao: "vila-serena", cpfBase: "200000009", status: "aprovado" },
  { email: "aluno.pendente@aurora.exemplo", nome: "Paulo Pendente Vila", papel: "aluno", orgao: "vila-serena", cpfBase: "200000002", status: "pendente" },
  { email: "aluno.naoconfirmado@aurora.exemplo", nome: "Nara Nao Confirmada", papel: "aluno", orgao: "vila-serena", cpfBase: "200000003", status: "pendente", confirmado: false },
  { email: "aluno.campo@aurora.exemplo", nome: "Bruno Aprovado Campo", papel: "aluno", orgao: "campo-alegre", cpfBase: "200000004", status: "aprovado" },
  { email: "aluno.recusado@aurora.exemplo", nome: "Rita Recusada Campo", papel: "aluno", orgao: "campo-alegre", cpfBase: "200000005", status: "recusado", motivo: "Não faz parte da equipe da Secretaria." },
  { email: "aluno.desativado@aurora.exemplo", nome: "Davi Desativado Campo", papel: "aluno", orgao: "campo-alegre", cpfBase: "200000006", status: "desativado" },
];

const { data: orgaos, error: erroOrgaos } = await admin.from("organizacoes").select("id, slug");
if (erroOrgaos) throw erroOrgaos;
const idDoOrgao = new Map(orgaos.map((o) => [o.slug, o.id]));

for (const pessoa of pessoas) {
  const { data: existente } = await admin.from("perfis").select("id").eq("email", pessoa.email).maybeSingle();
  if (existente) {
    console.log(`já existe: ${pessoa.email}`);
    continue;
  }
  const organizacaoId = pessoa.orgao ? idDoOrgao.get(pessoa.orgao) : undefined;
  const { data, error } = await admin.auth.admin.createUser({
    email: pessoa.email,
    password: SENHA,
    email_confirm: pessoa.confirmado !== false,
    user_metadata: {
      nome: pessoa.nome,
      cpf: pessoa.cpfBase ? cpfDe(pessoa.cpfBase) : undefined,
      aceite_termos: true,
    },
    app_metadata: { papel: pessoa.papel, organizacao_id: organizacaoId },
  });
  if (error) {
    console.error(`erro ao criar ${pessoa.email}: ${error.message}`);
    continue;
  }

  if (pessoa.status && pessoa.status !== "pendente") {
    // Passa por "aprovado" primeiro, como no fluxo real (o banco carimba data/aprovador).
    await admin.from("perfis").update({ status: pessoa.status === "recusado" ? "recusado" : "aprovado", motivo_recusa: pessoa.motivo ?? null }).eq("id", data.user.id);
    if (pessoa.status === "desativado") {
      await admin.from("perfis").update({ status: "desativado" }).eq("id", data.user.id);
    }
  }
  console.log(`criado: ${pessoa.email} (${pessoa.papel}${pessoa.status ? `, ${pessoa.status}` : ""})`);
}

// ------------------------------------------------------------------ cursos

type CursoDemo = {
  titulo: string;
  descricao: string;
  carga: number;
  status: "rascunho" | "publicado";
  orgaos: string[];
  aulas: { titulo: string; video: string; exigir?: boolean }[];
};

// Vídeos públicos do YouTube, usados só como exemplo de conteúdo.
const cursos: CursoDemo[] = [
  {
    titulo: "Demonstração rápida (vídeos curtos)",
    descricao:
      "Curso de teste com vídeos de poucos segundos, para ver em um minuto como funcionam a conclusão das aulas e a emissão do certificado.",
    carga: 1,
    status: "publicado",
    orgaos: ["vila-serena", "campo-alegre"],
    aulas: [
      { titulo: "Vídeo de 19 segundos (conclui sozinho no fim)", video: "jNQXAC9IVRw" },
      { titulo: "Aula sem trava (pode marcar como concluída)", video: "dMX5-l3Z42g", exigir: false },
    ],
  },
  {
    titulo: "Nova Lei de Licitações e Contratos (Lei 14.133/2021)",
    descricao:
      "Visão geral da nova lei de licitações: princípios, modalidades, fases do processo e contratos administrativos.",
    carga: 8,
    status: "publicado",
    orgaos: ["vila-serena", "campo-alegre"],
    aulas: [
      { titulo: "Resumo da Lei 14.133/2021", video: "A_Q1o_m0IRk" },
      { titulo: "Guia da nova lei: conceitos iniciais", video: "qMHYuUvB5vU" },
      { titulo: "Modalidades e contratos administrativos", video: "TGKWT0Cdm-M" },
    ],
  },
  {
    titulo: "LGPD no Setor Público",
    descricao: "O que a Lei Geral de Proteção de Dados muda na rotina do servidor e do órgão público.",
    carga: 4,
    status: "publicado",
    orgaos: ["vila-serena"],
    aulas: [
      { titulo: "LGPD no setor público em 2 minutos", video: "dMX5-l3Z42g" },
      { titulo: "LGPD para o servidor público", video: "-346f03gOEg" },
      { titulo: "Conceitos da Lei Geral de Proteção de Dados", video: "So9Lhgbq2sk" },
    ],
  },
  {
    titulo: "Atendimento ao Cidadão e Qualidade no Serviço Público",
    descricao: "Postura, comunicação e qualidade no atendimento prestado pelos órgãos públicos.",
    carga: 6,
    status: "publicado",
    orgaos: ["campo-alegre"],
    aulas: [
      { titulo: "Atendimento ao cidadão e qualidade dos serviços", video: "yucswVERRHU" },
      { titulo: "Postura no atendimento ao público", video: "kEOPJUGRZYQ" },
    ],
  },
  {
    titulo: "Parcerias com a Sociedade Civil (MROSC)",
    descricao: "Marco Regulatório das Organizações da Sociedade Civil (Lei 13.019/2014). Curso ainda em preparação.",
    carga: 5,
    status: "rascunho",
    orgaos: [],
    aulas: [{ titulo: "Conheça o MROSC", video: "BfoLdcPIZaU" }],
  },
];

const aulasPorCurso = new Map<string, string[]>();
for (const curso of cursos) {
  const { data: existente } = await admin.from("cursos").select("id, aulas ( id, ordem )").eq("titulo", curso.titulo).maybeSingle();
  if (existente) {
    aulasPorCurso.set(curso.titulo, [...existente.aulas].sort((a, b) => a.ordem - b.ordem).map((a) => a.id));
    console.log(`já existe: curso "${curso.titulo}"`);
    continue;
  }
  const { data: criado, error } = await admin
    .from("cursos")
    .insert({ titulo: curso.titulo, descricao: curso.descricao, carga_horaria: curso.carga, status: curso.status })
    .select("id")
    .single();
  if (error) throw error;
  const { data: aulas, error: erroAulas } = await admin
    .from("aulas")
    .insert(
      curso.aulas.map((aula, i) => ({
        curso_id: criado.id,
        titulo: aula.titulo,
        video_provedor: "youtube",
        video_id: aula.video,
        exigir_video_completo: aula.exigir ?? true,
        ordem: i + 1,
      })),
    )
    .select("id, ordem");
  if (erroAulas) throw erroAulas;
  aulasPorCurso.set(curso.titulo, aulas.sort((a, b) => a.ordem - b.ordem).map((a) => a.id));
  if (curso.orgaos.length) {
    await admin
      .from("organizacao_cursos")
      .insert(curso.orgaos.map((slug) => ({ organizacao_id: idDoOrgao.get(slug), curso_id: criado.id })));
  }
  console.log(`criado: curso "${curso.titulo}" (${curso.status})`);
}

// --------------------------------------------------------------- progresso

const LICITACOES = cursos[1].titulo;
const LGPD = cursos[2].titulo;
const progresso: { email: string; curso: string; aulas: number; certificado?: boolean }[] = [
  { email: "aluno.concluiu@aurora.exemplo", curso: LICITACOES, aulas: 3, certificado: true },
  { email: "aluno.concluiu@aurora.exemplo", curso: LGPD, aulas: 1 },
  { email: "aluna.vila@aurora.exemplo", curso: LICITACOES, aulas: 2 },
  { email: "marina.vila@aurora.exemplo", curso: LGPD, aulas: 2 },
  { email: "marina.vila@aurora.exemplo", curso: LICITACOES, aulas: 1 },
  { email: "aluno.campo@aurora.exemplo", curso: LICITACOES, aulas: 1 },
];

for (const item of progresso) {
  const { data: pessoa } = await admin.from("perfis").select("id").eq("email", item.email).maybeSingle();
  const aulas = (aulasPorCurso.get(item.curso) ?? []).slice(0, item.aulas);
  if (!pessoa || !aulas.length) continue;
  await admin
    .from("progresso_aulas")
    .upsert(aulas.map((aula_id) => ({ perfil_id: pessoa.id, aula_id })), { onConflict: "perfil_id,aula_id", ignoreDuplicates: true });

  if (item.certificado) {
    // A emissão passa pela mesma função que o site usa, com o login da própria pessoa.
    const comoAluno = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await comoAluno.auth.signInWithPassword({ email: item.email, password: SENHA });
    const { data: cursoId } = await admin.from("cursos").select("id").eq("titulo", item.curso).single();
    const { data: cert, error } = await comoAluno.rpc("emitir_certificado", { p_curso: cursoId!.id });
    console.log(error ? `erro ao emitir certificado: ${error.message}` : `certificado de ${item.email}: ${cert.codigo}`);
  }
}

console.log(`\nSenha de todos os usuários de exemplo: ${SENHA}`);
