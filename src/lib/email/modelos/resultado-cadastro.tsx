import type { Marca } from "@/lib/marca";
import { BotaoEmail, LayoutEmail, LinkAlternativo, Paragrafo } from "./layout";

export function EmailCadastroAprovado({
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
    <LayoutEmail marca={marca} previa="Seu acesso foi liberado" titulo="Seu acesso foi liberado">
      <Paragrafo>Olá, {nome.split(" ")[0]}!</Paragrafo>
      <Paragrafo>
        {orgao} aprovou o seu cadastro na {marca.nomePlataforma}. Você já pode entrar e acessar os cursos liberados para
        o seu órgão.
      </Paragrafo>
      <BotaoEmail marca={marca} href={link}>
        Entrar na plataforma
      </BotaoEmail>
      <LinkAlternativo href={link} />
    </LayoutEmail>
  );
}

export function EmailCadastroRecusado({
  marca,
  nome,
  orgao,
  motivo,
  link,
}: {
  marca: Marca;
  nome: string;
  orgao: string;
  motivo: string | null;
  link: string;
}) {
  return (
    <LayoutEmail marca={marca} previa="Seu cadastro não foi aprovado" titulo="Seu cadastro não foi aprovado">
      <Paragrafo>Olá, {nome.split(" ")[0]}!</Paragrafo>
      <Paragrafo>{orgao} não aprovou o seu cadastro na {marca.nomePlataforma}.</Paragrafo>
      {motivo ? <Paragrafo>Motivo informado: “{motivo}”</Paragrafo> : null}
      <Paragrafo>
        Se houve algum engano (por exemplo, nome incompleto ou órgão errado), entre na plataforma para corrigir os dados
        e reenviar a solicitação. Em caso de dúvida, fale com o responsável no seu órgão.
      </Paragrafo>
      <BotaoEmail marca={marca} href={link}>
        Corrigir e reenviar
      </BotaoEmail>
      <LinkAlternativo href={link} />
    </LayoutEmail>
  );
}
