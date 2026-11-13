import "server-only";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

export type DadosDoCertificado = {
  titulo: string;
  frase: string;
  nome: string;
  curso: string;
  orgao: string;
  responsavel_nome: string;
  responsavel_cargo: string;
  nome_plataforma: string;
  nome_empresa: string;
  cor_primaria: string;
  cor_secundaria: string;
};

type Entrada = {
  codigo: string;
  emitidoEm: string;
  dados: DadosDoCertificado;
  urlValidacao: string;
  qrCode: string;
  logo: string | null;
  assinatura: string | null;
};

const CINZA = "#4b5563";

const estilos = StyleSheet.create({
  pagina: { padding: 24, fontFamily: "Helvetica", color: "#111827" },
  moldura: { flex: 1, borderWidth: 2, borderStyle: "solid", padding: 4 },
  miolo: { flex: 1, borderWidth: 0.75, borderStyle: "solid", paddingHorizontal: 48, paddingTop: 30, paddingBottom: 22 },
  topo: { alignItems: "center", marginBottom: 14 },
  logo: { height: 44, maxWidth: 220, objectFit: "contain" },
  marca: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  empresa: { fontSize: 10, color: CINZA, marginTop: 4 },
  titulo: { fontSize: 30, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1, marginTop: 6 },
  faixa: { height: 3, width: 90, alignSelf: "center", marginTop: 10, marginBottom: 20 },
  nome: { fontSize: 24, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 14 },
  frase: { fontSize: 13.5, lineHeight: 1.6, textAlign: "center", color: "#1f2937", paddingHorizontal: 20 },
  orgao: { fontSize: 11, textAlign: "center", color: CINZA, marginTop: 12 },
  rodape: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: "auto" },
  assinaturaBloco: { width: 250, alignItems: "center" },
  assinaturaImagem: { height: 46, maxWidth: 200, objectFit: "contain", marginBottom: 2 },
  assinaturaLinha: { borderTopWidth: 0.75, borderTopColor: "#111827", borderTopStyle: "solid", width: 230, paddingTop: 5, alignItems: "center" },
  assinaturaNome: { fontSize: 11.5, fontFamily: "Helvetica-Bold" },
  assinaturaCargo: { fontSize: 10, color: CINZA, marginTop: 2 },
  validacao: { flexDirection: "row", alignItems: "center", gap: 10 },
  validacaoTexto: { fontSize: 8.5, color: CINZA, maxWidth: 190, lineHeight: 1.45 },
  codigo: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#111827" },
  qr: { width: 76, height: 76 },
});

function Certificado({ codigo, emitidoEm, dados, urlValidacao, qrCode, logo, assinatura }: Entrada) {
  const primaria = dados.cor_primaria || "#1d4ed8";
  const secundaria = dados.cor_secundaria || primaria;
  const emissao = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(emitidoEm));

  return (
    <Document title={`${dados.titulo} — ${dados.curso}`} author={dados.nome_empresa || dados.nome_plataforma} subject={codigo}>
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={[estilos.moldura, { borderColor: primaria }]}>
          <View style={[estilos.miolo, { borderColor: secundaria }]}>
            <View style={estilos.topo}>
              {logo ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- imagem de PDF (react-pdf), não é HTML
                <Image src={logo} style={estilos.logo} />
              ) : (
                <Text style={[estilos.marca, { color: primaria }]}>{dados.nome_plataforma}</Text>
              )}
              {dados.nome_empresa ? <Text style={estilos.empresa}>{dados.nome_empresa}</Text> : null}
            </View>

            <Text style={[estilos.titulo, { color: primaria }]}>{dados.titulo.toUpperCase()}</Text>
            <View style={[estilos.faixa, { backgroundColor: secundaria }]} />

            <Text style={estilos.nome}>{dados.nome}</Text>
            <Text style={estilos.frase}>{dados.frase}</Text>
            {dados.orgao ? <Text style={estilos.orgao}>{dados.orgao}</Text> : null}

            <View style={estilos.rodape}>
              <View style={estilos.assinaturaBloco}>
                {assinatura ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- imagem de PDF (react-pdf), não é HTML
                  <Image src={assinatura} style={estilos.assinaturaImagem} />
                ) : null}
                {dados.responsavel_nome ? (
                  <View style={estilos.assinaturaLinha}>
                    <Text style={estilos.assinaturaNome}>{dados.responsavel_nome}</Text>
                    {dados.responsavel_cargo ? <Text style={estilos.assinaturaCargo}>{dados.responsavel_cargo}</Text> : null}
                  </View>
                ) : null}
              </View>

              <View style={estilos.validacao}>
                <View style={estilos.validacaoTexto}>
                  <Text>Código de validação</Text>
                  <Text style={estilos.codigo}>{codigo}</Text>
                  <Text>Emitido em {emissao}</Text>
                  <Text>Confira a autenticidade em:</Text>
                  <Text>{urlValidacao.replace(/^https?:\/\//, "")}</Text>
                </View>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- imagem de PDF (react-pdf), não é HTML */}
                <Image src={qrCode} style={estilos.qr} />
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function gerarPdfDoCertificado(entrada: Entrada): Promise<Buffer> {
  return renderToBuffer(<Certificado {...entrada} />);
}
