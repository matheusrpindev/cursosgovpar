import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-primary text-sm font-semibold">Erro 404</p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-md">O endereço pode ter mudado ou não existe mais.</p>
      <Button asChild className="h-11 px-6">
        <Link href="/">Ir para o início</Link>
      </Button>
    </main>
  );
}
