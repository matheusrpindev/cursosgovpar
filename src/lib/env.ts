import { z } from "zod";

/**
 * Variáveis públicas (podem ir para o navegador). As referências a
 * process.env.NEXT_PUBLIC_* precisam ser estáticas para o Next.js embuti-las.
 */
const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: "NEXT_PUBLIC_SUPABASE_URL ausente ou inválida." }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente." })
    .min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY inválida."),
  NEXT_PUBLIC_SITE_URL: z.url({ error: "NEXT_PUBLIC_SITE_URL ausente ou inválida." }),
});

export type EnvPublico = z.infer<typeof esquemaPublico>;

let cache: EnvPublico | undefined;

export function envPublico(): EnvPublico {
  cache ??= esquemaPublico.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  return cache;
}

/** Monta uma URL absoluta do site (usada nos links dos e-mails). */
export function urlDoSite(caminho: string): string {
  return new URL(caminho, envPublico().NEXT_PUBLIC_SITE_URL).toString();
}
