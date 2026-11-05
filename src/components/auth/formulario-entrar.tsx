"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo } from "@/components/formulario/campo";
import { CampoSenha } from "@/components/formulario/campo-senha";
import { criarClienteNavegador } from "@/lib/supabase/navegador";
import { caminhoInternoSeguro, esquemaLogin } from "@/lib/validacao";
import { FormularioReenvio } from "./formulario-reenvio";

type Erros = Partial<Record<"email" | "senha", string[]>>;

/**
 * O login acontece no navegador (direto com o Supabase) para que o limite de
 * tentativas seja contado por pessoa. A sessão fica em cookies lidos pelo servidor.
 */
export function FormularioEntrar() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [navegando, iniciarNavegacao] = useTransition();

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    setMensagem(null);
    setEmailNaoConfirmado(null);

    const dados = new FormData(formulario);
    const resultado = esquemaLogin.safeParse({ email: dados.get("email"), senha: dados.get("senha") });
    if (!resultado.success) {
      setErros(z.flattenError(resultado.error).fieldErrors);
      return;
    }
    setErros({});
    setEnviando(true);

    const { error } = await criarClienteNavegador().auth.signInWithPassword({
      email: resultado.data.email,
      password: resultado.data.senha,
    });

    if (error) {
      setEnviando(false);
      if (error.code === "email_not_confirmed") {
        setEmailNaoConfirmado(resultado.data.email);
      } else if (error.status === 429 || error.code === "over_request_rate_limit") {
        setMensagem("Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.");
      } else if (error.code === "invalid_credentials") {
        setMensagem("E-mail ou senha incorretos.");
      } else {
        setMensagem("Não foi possível entrar agora. Verifique sua conexão e tente de novo.");
      }
      return;
    }

    // O Next mantém telas visitadas em memória: limpe a senha digitada.
    formulario.reset();
    setEnviando(false);
    iniciarNavegacao(() => {
      router.replace(caminhoInternoSeguro(parametros.get("proximo")) ?? "/painel");
      router.refresh();
    });
  }

  const erroDoLink = parametros.get("erro") === "link";

  return (
    <div className="grid gap-5">
      {erroDoLink ? (
        <Aviso tipo="erro">O link usado é inválido ou expirou. Entre com sua senha ou peça um novo link.</Aviso>
      ) : null}
      {mensagem ? <Aviso tipo="erro">{mensagem}</Aviso> : null}

      {emailNaoConfirmado ? (
        <div className="grid gap-3">
          <Aviso tipo="erro">
            Você ainda não confirmou o seu e-mail. Abra o link que enviamos ou peça um novo abaixo.
          </Aviso>
          <FormularioReenvio emailInicial={emailNaoConfirmado} />
        </div>
      ) : null}

      <form onSubmit={entrar} noValidate className="grid gap-4">
        <Campo nome="email" rotulo="E-mail" type="email" autoComplete="email" inputMode="email" erros={erros.email} required />
        <CampoSenha nome="senha" rotulo="Senha" autoComplete="current-password" erros={erros.senha} required />
        <BotaoEnviar enviando={enviando || navegando} textoEnviando="Entrando…">
          Entrar
        </BotaoEnviar>
      </form>

      <div className="flex flex-col gap-2 text-center text-sm">
        <Link href="/recuperar-senha" className="text-primary underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </div>
    </div>
  );
}
