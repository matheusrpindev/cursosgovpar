import "server-only";
import { z } from "zod";

/** Variáveis que só existem no servidor. Nunca importe este arquivo no cliente. */
const esquemaServidor = z.object({
  SUPABASE_SECRET_KEY: z
    .string({ error: "SUPABASE_SECRET_KEY ausente." })
    .min(20, "SUPABASE_SECRET_KEY inválida."),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_REMETENTE: z.string().optional(),
  EMAIL_TRANSPORTE: z.enum(["resend", "arquivo"]).optional(),
});

export type EnvServidor = z.infer<typeof esquemaServidor>;

let cache: EnvServidor | undefined;

export function envServidor(): EnvServidor {
  cache ??= esquemaServidor.parse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_REMETENTE: process.env.EMAIL_REMETENTE || undefined,
    EMAIL_TRANSPORTE: process.env.EMAIL_TRANSPORTE || undefined,
  });
  return cache;
}
