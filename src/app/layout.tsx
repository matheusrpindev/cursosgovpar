import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Rodape } from "@/components/layout/rodape";
import { obterMarca } from "@/lib/marca";
import { variaveisDeTema } from "@/lib/tema";
import "./globals.css";

const fonte = Geist({ variable: "--font-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const marca = await obterMarca();
  return {
    title: { default: marca.nomePlataforma, template: `%s · ${marca.nomePlataforma}` },
    description: marca.nomeEmpresa
      ? `Plataforma de cursos — ${marca.nomeEmpresa}`
      : `Plataforma de cursos ${marca.nomePlataforma}`,
    icons: { icon: marca.faviconUrl ?? "/icone-padrao.svg" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const marca = await obterMarca();
  return { themeColor: marca.corPrimaria, width: "device-width", initialScale: 1 };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const marca = await obterMarca();
  return (
    <html
      lang="pt-BR"
      className={`${fonte.variable} h-full antialiased`}
      style={variaveisDeTema(marca.corPrimaria, marca.corSecundaria)}
    >
      <body className="bg-muted/40 flex min-h-dvh flex-col">
        {children}
        <Rodape marca={marca} />
      </body>
    </html>
  );
}
