"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Aviso } from "@/components/formulario/aviso";
import { Button } from "@/components/ui/button";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

/**
 * Valida o link recebido por e-mail só quando a pessoa clica no botão.
 * Programas de segurança de e-mail que "abrem" links não gastam o token.
 */
export function ConfirmarLink() {
  const router = useRouter();
  const parametros = useSearchParams();
  const tipo = parametros.get("tipo") === "recuperacao" ? "recuperacao" : "cadastro";
  const tokenHash = parametros.get("token_hash");
  const [enviando, setEnviando] = useState(false);
  const [navegando, iniciarNavegacao] = useTransition();
  const [erro, setErro] = useState(false);

  async function confirmar() {
    if (!tokenHash) return;
    setEnviando(true);
    const { error } = await criarClienteNavegador().auth.verifyOtp({
      token_hash: tokenHash,
      type: tipo === "recuperacao" ? "recovery" : "magiclink",
    });
    if (error) {
      setEnviando(false);
      setErro(true);
      return;
    }
    setEnviando(false);
    iniciarNavegacao(() => {
      router.replace(tipo === "recuperacao" ? "/redefinir-senha" : "/painel");
      router.refresh();
    });
  }

  if (!tokenHash || erro) {
    return (
      <div className="grid gap-4">
        <Aviso tipo="erro">Este link é inválido ou já expirou.</Aviso>
        <p className="text-muted-foreground text-sm">
          {tipo === "recuperacao" ? (
            <>
              Peça um novo link em <Link href="/recuperar-senha" className="text-primary underline">Esqueci minha senha</Link>.
            </>
          ) : (
            <>
              Se você já confirmou, basta <Link href="/entrar" className="text-primary underline">entrar</Link>. Caso
              contrário, peça um novo link na tela de entrada.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm">
        {tipo === "recuperacao"
          ? "Clique no botão para continuar e criar uma nova senha."
          : "Clique no botão para confirmar o seu e-mail e enviar o cadastro para aprovação do seu órgão."}
      </p>
      <Button onClick={confirmar} disabled={enviando || navegando} className="h-11 w-full text-base">
        {enviando || navegando ? "Confirmando…" : tipo === "recuperacao" ? "Continuar" : "Confirmar e-mail"}
      </Button>
    </div>
  );
}
