import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/formulario/botao-enviar";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { TextoLegal } from "@/components/layout/texto-legal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aceitarTermos } from "@/lib/auth/acoes";
import { destinoInicial, exigirPerfil } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Termos atualizados" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

export default async function AceitarTermos() {
  const perfil = await exigirPerfil({ permitirTermosPendentes: true });
  if (!perfil.precisaAceitarTermos) redirect(destinoInicial(perfil));

  // Texto lido direto do banco: a pessoa aceita exatamente a versão em vigor.
  const supabase = await criarClienteServidor();
  const { data: termos } = await supabase
    .from("configuracoes")
    .select("termos_uso, politica_privacidade, termos_versao")
    .eq("id", 1)
    .single();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <CabecalhoPagina
        titulo="Termos de uso e política de privacidade"
        descricao={`Para continuar, leia e aceite a versão ${termos?.termos_versao ?? ""} dos documentos abaixo.`}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Termos de uso</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          <TextoLegal texto={termos?.termos_uso ?? ""} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Política de privacidade</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-80 overflow-y-auto">
          <TextoLegal texto={termos?.politica_privacidade ?? ""} />
        </CardContent>
      </Card>
      <form action={aceitarTermos} className="grid gap-4">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="aceite" required className="accent-primary mt-1 size-5 shrink-0" />
          <span>Li e aceito os termos de uso e a política de privacidade.</span>
        </label>
        <BotaoEnviar className="sm:w-auto sm:justify-self-start sm:px-8">Aceitar e continuar</BotaoEnviar>
      </form>
    </div>
  );
}
