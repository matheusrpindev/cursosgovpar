/**
 * Cria o primeiro administrador de uma instalação (ou promove mais um).
 *
 * Uso:
 *   npm run criar-admin -- --email admin@cliente.com.br --nome "Nome Completo"
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY e NEXT_PUBLIC_SITE_URL do
 * ambiente (o script do package.json carrega o .env.local, se existir).
 * Imprime um link para a pessoa definir a própria senha.
 */
import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nome: { type: "string" },
  },
});

function exigir(valor: string | undefined, mensagem: string): string {
  if (!valor) {
    console.error(`Erro: ${mensagem}`);
    process.exit(1);
  }
  return valor;
}

const email = exigir(values.email?.trim().toLowerCase(), "informe --email");
const nome = exigir(values.nome?.trim(), 'informe --nome "Nome Completo"');
const url = exigir(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL não definida");
const chave = exigir(process.env.SUPABASE_SECRET_KEY, "SUPABASE_SECRET_KEY não definida");
const site = exigir(process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL não definida");

const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existente } = await admin.from("perfis").select("id, papel").eq("email", email).maybeSingle();

if (existente) {
  if (existente.papel === "admin") {
    console.log(`${email} já é administrador.`);
  } else {
    const { error } = await admin
      .from("perfis")
      .update({ papel: "admin", organizacao_id: null, status: "aprovado" })
      .eq("id", existente.id);
    if (error) {
      console.error("Não foi possível promover o usuário:", error.message);
      process.exit(1);
    }
    console.log(`${email} foi promovido a administrador.`);
  }
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome },
    app_metadata: { papel: "admin" },
  });
  if (error) {
    console.error("Não foi possível criar o administrador:", error.message);
    process.exit(1);
  }
  console.log(`Administrador ${email} criado.`);
}

const { data: link, error: erroLink } = await admin.auth.admin.generateLink({ type: "recovery", email });
if (erroLink) {
  console.error("Não foi possível gerar o link de senha:", erroLink.message);
  process.exit(1);
}
const params = new URLSearchParams({ tipo: "recuperacao", token_hash: link.properties.hashed_token });
console.log("\nEnvie este link para a pessoa definir a senha (vale por 1 hora):");
console.log(`${new URL(`/auth/confirmar?${params}`, site)}\n`);
