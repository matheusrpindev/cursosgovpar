import { execSync } from "node:child_process";

/**
 * Descobre as chaves do Supabase local (supabase status) se não vierem do
 * ambiente. Os testes de permissão rodam SEMPRE contra um banco local/de teste.
 */
export default function prepararAmbiente() {
  if (!process.env.SUPABASE_TESTE_URL) {
    let status: Record<string, string>;
    try {
      status = JSON.parse(execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());
    } catch {
      throw new Error("Supabase local não está rodando. Rode `npm run db:start` antes dos testes de permissão.");
    }
    process.env.SUPABASE_TESTE_URL = status.API_URL;
    process.env.SUPABASE_TESTE_CHAVE_PUBLICA = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
    process.env.SUPABASE_TESTE_CHAVE_SECRETA = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  }

  const url = process.env.SUPABASE_TESTE_URL!;
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) && process.env.PERMITIR_TESTES_REMOTOS !== "1") {
    throw new Error("Os testes de permissão criam e apagam dados: use o Supabase local.");
  }
}
