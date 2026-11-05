import type { Marca } from "@/lib/marca";
import { BotaoEmail, LayoutEmail, LinkAlternativo, Paragrafo } from "./layout";

export function EmailConfirmacaoCadastro({
  marca,
  nome,
  orgao,
  link,
}: {
  marca: Marca;
  nome: string;
  orgao: string;
  link: string;
}) {
  return (
    <LayoutEmail marca={marca} previa="Confirme seu e-mail para continuar o cadastro" titulo="Confirme seu e-mail">
      <Paragrafo>Olá, {nome.split(" ")[0]}!</Paragrafo>
      <Paragrafo>
        Recebemos o seu cadastro na {marca.nomePlataforma}. Para continuar, confirme que este e-mail é seu.
      </Paragrafo>
      <BotaoEmail marca={marca} href={link}>
        Confirmar e-mail
      </BotaoEmail>
      <Paragrafo>
        Depois da confirmação, o seu cadastro segue para aprovação de {orgao}. Você receberá outro e-mail com o resultado.
      </Paragrafo>
      <Paragrafo>Se não foi você que se cadastrou, ignore esta mensagem.</Paragrafo>
      <LinkAlternativo href={link} />
    </LayoutEmail>
  );
}
