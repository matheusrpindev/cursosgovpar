/**
 * Modo demonstração (MODO_DEMONSTRACAO=1): para ambientes de teste sem envio de
 * e-mail. O cadastro já nasce com o e-mail confirmado e a tela de login mostra as
 * contas de exemplo. NUNCA ligue em produção.
 */
export function modoDemonstracao(): boolean {
  return process.env.MODO_DEMONSTRACAO === "1";
}

export const SENHA_DEMONSTRACAO = "Senha1234";

export const CONTAS_DEMONSTRACAO = [
  { email: "admin@aurora.exemplo", papel: "Administrador" },
  { email: "gestora.vila@aurora.exemplo", papel: "Gestora (Vila Serena)" },
  { email: "aluna.vila@aurora.exemplo", papel: "Aluna com cursos em andamento" },
  { email: "aluno.concluiu@aurora.exemplo", papel: "Aluno com certificado emitido" },
] as const;
