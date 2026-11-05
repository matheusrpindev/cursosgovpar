import type { Marca } from "@/lib/marca";
import { BotaoEmail, LayoutEmail, LinkAlternativo, Paragrafo } from "./layout";

export function EmailRecuperacaoSenha({ marca, nome, link }: { marca: Marca; nome: string; link: string }) {
  return (
    <LayoutEmail marca={marca} previa="Crie uma nova senha" titulo="Redefinição de senha">
      <Paragrafo>Olá, {nome.split(" ")[0]}!</Paragrafo>
      <Paragrafo>
        Recebemos um pedido para redefinir a sua senha na {marca.nomePlataforma}. Clique no botão abaixo para criar uma
        nova senha. O link vale por 1 hora.
      </Paragrafo>
      <BotaoEmail marca={marca} href={link}>
        Criar nova senha
      </BotaoEmail>
      <Paragrafo>Se você não pediu a redefinição, ignore este e-mail: a sua senha atual continua valendo.</Paragrafo>
      <LinkAlternativo href={link} />
    </LayoutEmail>
  );
}
