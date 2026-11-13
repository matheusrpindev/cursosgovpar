import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { BadgeCheck, CircleX, TriangleAlert } from "lucide-react";
import { PaginaPublica } from "@/components/layout/pagina-publica";
import { formatarData } from "@/lib/formatacao";
import { criarClientePublico } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Validar certificado", robots: { index: false } };

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[150px_1fr]">
      <dt className="text-muted-foreground text-sm">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

/**
 * Consulta pública: mostra só o necessário para conferir a autenticidade
 * (nome, curso, carga horária, datas e situação). Nada de CPF ou e-mail.
 */
async function Resultado({ params }: { params: Promise<{ codigo: string }> }) {
  await connection(); // sempre consulta na hora: uma revogação vale imediatamente
  const { codigo } = await params;
  const limpo = decodeURIComponent(codigo).trim().toUpperCase();
  const valido = /^[A-Z0-9-]{8,40}$/.test(limpo);
  const { data } = valido ? await criarClientePublico().rpc("validar_certificado", { p_codigo: limpo }) : { data: null };
  const cert = data?.[0];

  if (!cert) {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3">
          <CircleX className="text-destructive mt-0.5 size-6 shrink-0" aria-hidden />
          <p>
            <strong>Certificado não encontrado.</strong> Não existe certificado com o código{" "}
            <span className="font-mono break-all">{limpo.slice(0, 40)}</span>. Confira se digitou igual ao documento.
          </p>
        </div>
        <Link href="/validar" className="text-primary text-sm underline underline-offset-4">
          Tentar outro código
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {cert.valido ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
          <BadgeCheck className="mt-0.5 size-6 shrink-0 text-emerald-700" aria-hidden />
          <p>
            <strong>Certificado válido.</strong> Este documento foi emitido por esta plataforma e os dados abaixo conferem com o
            nosso registro.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-950">
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-red-700" aria-hidden />
          <p>
            <strong>Certificado revogado.</strong> Este certificado foi emitido, mas foi cancelado depois e não é mais válido.
          </p>
        </div>
      )}
      <dl className="divide-y">
        <Linha rotulo="Nome" valor={cert.nome} />
        <Linha rotulo="Curso" valor={cert.curso} />
        <Linha rotulo="Carga horária" valor={`${cert.carga_horaria} horas`} />
        <Linha rotulo="Concluído em" valor={cert.data_conclusao} />
        {cert.orgao ? <Linha rotulo="Órgão" valor={cert.orgao} /> : null}
        <Linha rotulo="Emitido em" valor={formatarData(cert.emitido_em)} />
        <Linha rotulo="Código" valor={cert.codigo} />
      </dl>
      <Link href="/validar" className="text-primary text-sm underline underline-offset-4">
        Conferir outro certificado
      </Link>
    </div>
  );
}

export default function ValidarCodigo({ params }: PageProps<"/validar/[codigo]">) {
  return (
    <PaginaPublica titulo="Validação de certificado" larga>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Conferindo…</p>}>
        <Resultado params={params} />
      </Suspense>
    </PaginaPublica>
  );
}
