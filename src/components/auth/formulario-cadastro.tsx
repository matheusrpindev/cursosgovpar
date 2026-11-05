"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/formulario/aviso";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { Campo, MensagensDeErro } from "@/components/formulario/campo";
import { CampoCpf } from "@/components/formulario/campo-cpf";
import { CampoSenha } from "@/components/formulario/campo-senha";
import { cadastrar } from "@/lib/auth/acoes";
import { estadoInicial } from "@/lib/validacao";

export function FormularioCadastro({ slug, orgao }: { slug: string; orgao: string }) {
  const [estado, acao] = useActionState(cadastrar, estadoInicial);
  const erros = estado.erros ?? {};

  return (
    <form action={acao} className="grid gap-4">
      {estado.mensagem ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      <input type="hidden" name="slug" value={slug} />

      <div className="bg-muted rounded-lg px-3 py-2 text-sm">
        Órgão: <strong>{orgao}</strong>
      </div>

      <Campo
        nome="nome"
        rotulo="Nome completo"
        autoComplete="name"
        defaultValue={estado.valores?.nome}
        erros={erros.nome}
        ajuda="Como deve aparecer no certificado."
        required
      />
      <CampoCpf defaultValue={estado.valores?.cpf} erros={erros.cpf} required />
      <Campo
        nome="email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        defaultValue={estado.valores?.email}
        erros={erros.email}
        required
      />
      <CampoSenha
        nome="senha"
        rotulo="Senha"
        autoComplete="new-password"
        ajuda="Mínimo de 8 caracteres, com letras e números."
        erros={erros.senha}
        required
      />
      <CampoSenha
        nome="confirmacaoSenha"
        rotulo="Repita a senha"
        autoComplete="new-password"
        erros={erros.confirmacaoSenha}
        required
      />

      <div className="grid gap-1.5">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            name="aceite"
            required
            defaultChecked={estado.valores?.aceite === "on"}
            aria-invalid={erros.aceite?.length ? true : undefined}
            className="accent-primary mt-1 size-5 shrink-0"
          />
          <span>
            Li e aceito os{" "}
            <a href="/termos" target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
              termos de uso
            </a>{" "}
            e a{" "}
            <a href="/privacidade" target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
              política de privacidade
            </a>
            , e autorizo o uso dos meus dados para as finalidades descritas nela.
          </span>
        </label>
        <MensagensDeErro erros={erros.aceite} />
      </div>

      <BotaoEnviar textoEnviando="Criando conta…">Criar conta</BotaoEnviar>
    </form>
  );
}
