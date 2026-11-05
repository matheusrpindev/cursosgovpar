import type { Metadata } from "next";
import { FormularioNovaSenha } from "@/components/auth/formulario-nova-senha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Nova senha" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function RedefinirSenha() {
  await exigirPerfil({ permitirTermosPendentes: true });
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>Criar nova senha</h1>
        </CardTitle>
        <CardDescription>Escolha uma senha que você não usa em outros sites.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormularioNovaSenha />
      </CardContent>
    </Card>
  );
}
