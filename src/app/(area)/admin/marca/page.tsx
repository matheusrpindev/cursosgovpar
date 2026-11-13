import type { Metadata } from "next";
import { Secao } from "@/components/admin/secao";
import { Campo } from "@/components/formulario/campo";
import { CampoMarcar, CampoTextoLongo } from "@/components/formulario/campo-texto-longo";
import { FormularioAcao } from "@/components/formulario/formulario-acao";
import { CabecalhoPagina } from "@/components/layout/cabecalho-pagina";
import { Label } from "@/components/ui/label";
import { salvarMarca, salvarModeloDoCertificado, salvarTextosLegais } from "@/lib/admin/acoes";
import { obterConfiguracoes } from "@/lib/admin/dados";
import { exigirPerfil } from "@/lib/auth/sessao";

export const metadata: Metadata = { title: "Marca e textos" };

// Depende da sessão: não é pré-renderizável (o loading.tsx cobre a espera).
export const instant = false;

function CampoCor({ nome, rotulo, valor }: { nome: string; rotulo: string; valor: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`campo-${nome}`}>{rotulo}</Label>
      <input id={`campo-${nome}`} name={nome} type="color" defaultValue={valor} className="h-11 w-24 cursor-pointer rounded-lg border p-1" />
    </div>
  );
}

export default async function Marca() {
  await exigirPerfil({ papeis: ["admin"], acessoAtivo: true });
  const c = await obterConfiguracoes();

  return (
    <>
      <CabecalhoPagina
        titulo="Marca e textos"
        descricao="Tudo o que identifica esta instalação: nome, logo, cores, modelo do certificado e textos legais."
      />
      <div className="grid max-w-3xl gap-6">
        <Secao titulo="Identidade" descricao="Aparece no site inteiro e nos e-mails.">
          <FormularioAcao acao={salvarMarca} rotulo="Salvar identidade" classeBotao="h-11">
            <Campo nome="nome_plataforma" rotulo="Nome da plataforma" defaultValue={c.nome_plataforma} maxLength={80} required />
            <Campo nome="nome_empresa" rotulo="Nome da empresa ou instituição" defaultValue={c.nome_empresa} maxLength={160} />
            <div className="grid gap-1.5">
              <Label htmlFor="campo-logo">Logo</Label>
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- logo vem do Storage da instalação
                <img src={c.logoUrl} alt="Logo atual" className="h-12 w-auto max-w-56 rounded border object-contain p-1" />
              ) : null}
              <input id="campo-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="text-sm" />
              <p className="text-muted-foreground text-xs">
                PNG, JPG, WebP ou SVG, até 2 MB. Para o logo sair também no certificado, use PNG ou JPG.
              </p>
              {c.logoUrl ? <CampoMarcar nome="removerLogo" rotulo="Remover o logo (mostrar o nome no lugar)" /> : null}
            </div>
            <div className="flex flex-wrap gap-6">
              <CampoCor nome="cor_primaria" rotulo="Cor principal" valor={c.cor_primaria} />
              <CampoCor nome="cor_secundaria" rotulo="Cor de apoio" valor={c.cor_secundaria} />
            </div>
            <CampoTextoLongo nome="texto_rodape" rotulo="Texto do rodapé" defaultValue={c.texto_rodape} rows={2} maxLength={500} />
            <Campo nome="email_contato" rotulo="E-mail de contato" type="email" defaultValue={c.email_contato ?? ""} />
            <CampoMarcar
              nome="cadastro_lista_publica"
              rotulo="Mostrar a lista de órgãos na página de cadastro"
              ajuda="Desligado (recomendado): só se cadastra quem recebeu o link do próprio órgão."
              defaultChecked={c.cadastro_lista_publica}
            />
          </FormularioAcao>
        </Secao>

        <Secao titulo="Modelo do certificado" descricao="Vale para os próximos certificados. Os já emitidos nunca mudam.">
          <FormularioAcao acao={salvarModeloDoCertificado} rotulo="Salvar modelo" classeBotao="h-11">
            <Campo nome="cert_titulo" rotulo="Título" defaultValue={c.cert_titulo} maxLength={120} required />
            <CampoTextoLongo
              nome="cert_frase"
              rotulo="Frase do certificado"
              defaultValue={c.cert_frase}
              rows={4}
              ajuda="Use {nome}, {cpf}, {curso}, {carga_horaria} e {data_conclusao}: eles são trocados pelos dados de cada pessoa."
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo nome="cert_responsavel_nome" rotulo="Quem assina (nome)" defaultValue={c.cert_responsavel_nome} maxLength={160} />
              <Campo nome="cert_responsavel_cargo" rotulo="Cargo de quem assina" defaultValue={c.cert_responsavel_cargo} maxLength={160} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="campo-assinatura">Imagem da assinatura (opcional)</Label>
              <input id="campo-assinatura" name="assinatura" type="file" accept="image/png,image/jpeg" className="text-sm" />
              <p className="text-muted-foreground text-xs">
                PNG (de preferência com fundo transparente) ou JPG, até 1 MB.
                {c.cert_assinatura_path ? " Já existe uma assinatura enviada." : ""}
              </p>
              {c.cert_assinatura_path ? <CampoMarcar nome="removerAssinatura" rotulo="Remover a assinatura atual" /> : null}
            </div>
            <Campo
              nome="cert_prefixo_codigo"
              rotulo="Prefixo do código de validação"
              defaultValue={c.cert_prefixo_codigo}
              maxLength={6}
              className="max-w-32 uppercase"
              ajuda="De 1 a 6 letras ou números. Ex.: com GOV, os códigos ficam GOV-1A2B3-C4D5E."
              required
            />
            <CampoMarcar
              nome="cert_cpf_completo"
              rotulo="Imprimir o CPF completo no certificado"
              ajuda="Desligado (recomendado): o CPF sai mascarado, como ***.456.789-**."
              defaultChecked={c.cert_cpf_completo}
            />
          </FormularioAcao>
        </Secao>

        <Secao
          titulo="Termos de uso e política de privacidade"
          descricao={`Versão atual: ${c.termos_versao}. Quando o texto muda, a versão sobe e todos precisam aceitar de novo no próximo acesso.`}
        >
          <FormularioAcao
            acao={salvarTextosLegais}
            rotulo="Salvar textos"
            classeBotao="h-11"
            confirmar="Salvar os textos? Se houver mudança, todas as pessoas terão de aceitar a nova versão no próximo acesso."
          >
            <CampoTextoLongo nome="termos_uso" rotulo="Termos de uso" defaultValue={c.termos_uso.trim()} rows={12} />
            <CampoTextoLongo nome="politica_privacidade" rotulo="Política de privacidade" defaultValue={c.politica_privacidade.trim()} rows={12} />
          </FormularioAcao>
        </Secao>
      </div>
    </>
  );
}
