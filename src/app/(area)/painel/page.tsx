import { redirect } from "next/navigation";
import { destinoInicial, exigirPerfil } from "@/lib/auth/sessao";

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

/** Ponto de entrada após login/confirmação: leva cada pessoa para a sua área. */
export default async function Painel() {
  const perfil = await exigirPerfil({ permitirTermosPendentes: true });
  redirect(destinoInicial(perfil));
}
