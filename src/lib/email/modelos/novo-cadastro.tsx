import type { Marca } from "@/lib/marca";
import { BotaoEmail, LayoutEmail, LinkAlternativo, Paragrafo } from "./layout";

/** Aviso ao gestor (ou ao admin, se o órgão não tiver gestor) de que há cadastro para analisar. */
export function EmailNovoCadastro({
  marca,
  nomeDestinatario,
  nomeAluno,
  orgao,
  link,
}: {
  marca: Marca;
  nomeDestinatario: string;
  nomeAluno: string;
  orgao: string;
  link: string;
}) {
  return (
    <LayoutEmail marca={marca} previa={`${nomeAluno} pediu acesso à plataforma`} titulo="Novo cadastro para aprovar">
      <Paragrafo>Olá, {nomeDestinatario.split(" ")[0]}!</Paragrafo>
      <Paragrafo>
        <strong>{nomeAluno}</strong> se cadastrou na {marca.nomePlataforma} como integrante de {orgao} e aguarda a sua
        aprovação.
      </Paragrafo>
      <BotaoEmail marca={marca} href={link}>
        Analisar cadastro
      </BotaoEmail>
      <Paragrafo>Enquanto o cadastro não for aprovado, a pessoa não tem acesso aos cursos.</Paragrafo>
      <LinkAlternativo href={link} />
    </LayoutEmail>
  );
}
