import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obterMarca } from "@/lib/marca";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/** Moldura das telas públicas (entrar, cadastro, recuperação de senha...). */
export async function PaginaPublica({
  titulo,
  descricao,
  children,
  larga = false,
}: {
  titulo: string;
  descricao?: ReactNode;
  children: ReactNode;
  larga?: boolean;
}) {
  const marca = await obterMarca();
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:py-14">
      <Logo marca={marca} className="mb-6" />
      <Card className={cn("w-full", larga ? "max-w-2xl" : "max-w-md")}>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{titulo}</h1>
          </CardTitle>
          {descricao ? <CardDescription>{descricao}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
