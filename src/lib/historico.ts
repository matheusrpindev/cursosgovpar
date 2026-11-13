const VERBOS: Record<string, string> = {
  aprovou_cadastro: "aprovou o cadastro de",
  recusou_cadastro: "recusou o cadastro de",
  desativou_acesso: "desativou o acesso de",
  reativou_acesso: "reativou o acesso de",
  transferiu_orgao: "alterou o órgão de",
  alterou_papel: "alterou o papel de",
  alterou_status: "alterou a situação de",
  revogou_certificado: "revogou um certificado de",
  anonimizou_pessoa: "removeu os dados pessoais de",
};

/** Frase em linguagem simples para um registro do histórico (auditoria). */
export function descreverEvento(evento: { acao: string; ator: string; alvo: string | null }): string {
  const alvo = evento.alvo ?? "uma pessoa";
  if (evento.acao === "reenviou_solicitacao") return `${alvo} corrigiu os dados e reenviou a solicitação`;
  if (evento.acao === "emitiu_certificado") return `${alvo} emitiu um certificado`;
  if (evento.acao === "alterou_configuracoes") return `${evento.ator} alterou as configurações da plataforma`;
  return `${evento.ator} ${VERBOS[evento.acao] ?? "alterou o cadastro de"} ${alvo}`;
}
