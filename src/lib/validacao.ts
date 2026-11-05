import { z } from "zod";
import { cpfValido, somenteDigitos } from "@/lib/cpf";

/** Esquemas de formulário compartilhados entre navegador e servidor. */

export const esquemaEmail = z
  .string({ error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .max(254, "E-mail muito longo.")
  .pipe(z.email({ error: "E-mail inválido." }));

// Mesmas regras configuradas no Supabase Auth (mínimo 8, letras e números).
export const esquemaSenha = z
  .string({ error: "Informe a senha." })
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "A senha precisa ter letras.")
  .regex(/\d/, "A senha precisa ter números.");

export const esquemaCadastro = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]{1,80}$/, "Link de cadastro inválido."),
    nome: z
      .string({ error: "Informe o nome completo." })
      .transform((v) => v.trim().replace(/\s+/g, " "))
      .pipe(
        z
          .string()
          .min(3, "Informe o nome completo.")
          .max(160, "Nome muito longo.")
          .refine((v) => v.includes(" "), "Informe nome e sobrenome."),
      ),
    cpf: z
      .string({ error: "Informe o CPF." })
      .transform(somenteDigitos)
      .refine(cpfValido, "CPF inválido. Confira os números."),
    email: esquemaEmail,
    senha: esquemaSenha,
    confirmacaoSenha: z.string({ error: "Repita a senha." }),
    aceite: z.literal("on", { error: "Para continuar, aceite os termos de uso e a política de privacidade." }),
  })
  .refine((d) => d.senha === d.confirmacaoSenha, {
    path: ["confirmacaoSenha"],
    message: "As senhas não conferem.",
  });

export const esquemaLogin = z.object({
  email: esquemaEmail,
  senha: z.string({ error: "Informe a senha." }).min(1, "Informe a senha."),
});

export const esquemaSoEmail = z.object({ email: esquemaEmail });

export const esquemaNovaSenha = z
  .object({ senha: esquemaSenha, confirmacaoSenha: z.string({ error: "Repita a senha." }) })
  .refine((d) => d.senha === d.confirmacaoSenha, {
    path: ["confirmacaoSenha"],
    message: "As senhas não conferem.",
  });

export type EstadoFormulario = {
  status: "ocioso" | "erro" | "sucesso";
  mensagem?: string;
  erros?: Partial<Record<string, string[]>>;
  valores?: Record<string, string>;
};

export const estadoInicial: EstadoFormulario = { status: "ocioso" };

export function errosDeCampo(erro: z.ZodError): EstadoFormulario["erros"] {
  return z.flattenError(erro).fieldErrors as EstadoFormulario["erros"];
}

/** Aceita só caminhos internos (evita redirecionamento para outro site). */
export function caminhoInternoSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return null;
  return valor;
}

/**
 * Aceita o link de cadastro de um órgão (https://.../cadastro/<slug>) ou só o
 * slug, e devolve o slug. Vazio = sem mudança de órgão; null = inválido.
 */
export function slugDoLinkDeCadastro(valor: string): string | null | "" {
  const texto = valor.trim();
  if (!texto) return "";
  const candidato = texto.includes("/cadastro/")
    ? texto.split("/cadastro/")[1]?.split(/[/?#]/)[0] ?? ""
    : texto;
  const slug = candidato.toLowerCase();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 ? slug : null;
}

export const esquemaReenvio = z.object({
  nome: z
    .string({ error: "Informe o nome completo." })
    .transform((v) => v.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(3, "Informe o nome completo.")
        .max(160, "Nome muito longo.")
        .refine((v) => v.includes(" "), "Informe nome e sobrenome."),
    ),
  linkOrgao: z
    .string()
    .default("")
    .transform((v, ctx) => {
      const slug = slugDoLinkDeCadastro(v);
      if (slug === null) {
        ctx.addIssue({ code: "custom", message: "Link de cadastro inválido. Copie o link completo enviado pelo órgão." });
        return z.NEVER;
      }
      return slug;
    }),
});

export const esquemaMotivoRecusa = z
  .string()
  .default("")
  .transform((v) => v.trim())
  .pipe(z.string().max(500, "O motivo pode ter no máximo 500 caracteres."));
