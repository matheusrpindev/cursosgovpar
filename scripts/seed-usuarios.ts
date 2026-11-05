/**
 * Cria usuários de exemplo para desenvolvimento e demonstração.
 * SÓ roda contra o Supabase local (127.0.0.1/localhost), porque usa senhas conhecidas.
 *
 *   npm run seed:usuarios
 *
 * Todos usam a senha "Senha1234".
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const chave = process.env.SUPABASE_SECRET_KEY ?? "";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
  console.error("Este script só pode ser usado com o Supabase local.");
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

console.log(`\nSenha de todos os usuários de exemplo: ${SENHA}`);
