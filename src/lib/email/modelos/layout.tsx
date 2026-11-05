import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Marca } from "@/lib/marca";
import { corDeTextoSobre } from "@/lib/tema";

const fonte =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function LayoutEmail({
  marca,
  previa,
  titulo,
  children,
}: {
  marca: Marca;
  previa: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{previa}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: fonte, margin: 0, padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            maxWidth: 560,
            padding: "32px 28px",
            borderTop: `6px solid ${marca.corPrimaria}`,
          }}
        >
          {marca.logoUrl ? (
            <Img src={marca.logoUrl} alt={marca.nomePlataforma} height={40} style={{ marginBottom: 24 }} />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: 700, color: marca.corPrimaria, margin: "0 0 24px" }}>
              {marca.nomePlataforma}
            </Text>
          )}
          <Heading as="h1" style={{ fontSize: 22, color: "#18181b", margin: "0 0 16px" }}>
            {titulo}
          </Heading>
          {children}
          <Hr style={{ borderColor: "#e4e4e7", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: "#71717a", margin: 0 }}>
            {marca.textoRodape || marca.nomeEmpresa || marca.nomePlataforma}
            {marca.emailContato ? ` · Dúvidas: ${marca.emailContato}` : ""}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragrafo({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 15, lineHeight: "24px", color: "#3f3f46", margin: "0 0 14px" }}>{children}</Text>;
}

export function BotaoEmail({ marca, href, children }: { marca: Marca; href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "24px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: marca.corPrimaria,
          color: corDeTextoSobre(marca.corPrimaria),
          borderRadius: 8,
          padding: "12px 20px",
          fontSize: 15,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function LinkAlternativo({ href }: { href: string }) {
  return (
    <Text style={{ fontSize: 12, lineHeight: "18px", color: "#71717a", wordBreak: "break-all" }}>
      Se o botão não funcionar, copie e cole este endereço no navegador: {href}
    </Text>
  );
}
