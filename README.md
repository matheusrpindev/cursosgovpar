# Plataforma de cursos

Plataforma de cursos online com aprovação de acesso por órgão e certificados com
validação pública. É **white-label**: nome, logo, cores, textos, e-mails e
modelo do certificado vêm do banco, configurados pelo painel do administrador.
Cada cliente tem a sua própria instalação (deploy + banco).

> Protótipo completo (cursos, certificados e painel do admin). Plano, decisões e
> regras de acesso: [`docs/PLANO.md`](docs/PLANO.md). O guia de nova instalação
> e o deploy automático chegam na etapa 6.

## Tecnologias

Next.js 16 (App Router) · TypeScript · Supabase (Auth, Postgres com RLS, Storage) ·
Tailwind CSS + shadcn/ui · Zod · Resend · @react-pdf/renderer + qrcode · Vitest + pgTAP.

## Rodar localmente

Pré-requisitos: Node.js 22.18+ e Docker (para o Supabase local).

```bash
npm install
```

```bash
npm run db:start
```

O comando acima sobe o Supabase local, cria as tabelas e aplica o seed (marca
fictícia "Aurora Cursos" e dois órgãos). Ele imprime as chaves locais. Copie o
`.env.example` para `.env.local` e preencha com elas:

```bash
cp .env.example .env.local
```

```bash
npx supabase status
```

Crie os dados de demonstração (usuários, cursos com vídeos públicos do YouTube,
progresso e um certificado; senha de todos: `Senha1234`) e rode o app:

```bash
npm run seed:demo
```

```bash
npm run dev
```

Abra http://localhost:3000. Usuários de exemplo:

| E-mail | Papel / situação |
|---|---|
| admin@aurora.exemplo | Administrador |
| gestora.vila@aurora.exemplo | Gestora da Prefeitura de Vila Serena |
| gestor.campo@aurora.exemplo | Gestor da Prefeitura de Campo Alegre |
| aluna.vila@aurora.exemplo | Aluna aprovada, com curso em andamento (Vila Serena) |
| aluno.concluiu@aurora.exemplo | Aluno com curso concluído e certificado emitido |
| aluno.pendente@aurora.exemplo | Aluno aguardando aprovação |
| aluno.recusado@aurora.exemplo | Aluno recusado |
| aluno.desativado@aurora.exemplo | Aluno desativado |

Link de cadastro de exemplo: http://localhost:3000/cadastro/vila-serena

Para testar a aprovação, entre como `gestora.vila@aurora.exemplo`: a fila de
cadastros, a lista de alunos, o progresso e o histórico ficam em `/gestor`.

O curso "Demonstração rápida" tem vídeos de poucos segundos: serve para ver a
aula ser concluída no fim do vídeo e emitir um certificado em um minuto. A
validação pública fica em `/validar`.

Com `MODO_DEMONSTRACAO=1` no `.env.local`, o cadastro dispensa a confirmação
por e-mail e a tela de login lista as contas de exemplo (só para ambientes de
teste).

Em desenvolvimento, os e-mails não são enviados: ficam gravados em `.emails/`
(HTML e texto) e o caminho aparece no console.

## Testes

```bash
npm test
```

```bash
npm run db:test
```

- `npm test` roda os testes de unidade e os **testes de permissão**: cada um
  monta um cenário com dois órgãos, gestores e alunos em todas as situações e
  prova, pela mesma API que o navegador usa, que ninguém vê ou altera o que não
  deve (ex.: gestor do órgão A não vê nem altera nada do órgão B; aluno pendente
  não vê cursos).
- `npm run db:test` roda os testes estruturais do banco (pgTAP): toda tabela
  tem RLS, visitante só lê a marca, funções privilegiadas têm `search_path` fixo,
  validação de CPF etc.

A CI (`.github/workflows/testes.yml`) roda lint, tipos, os dois conjuntos de
testes e o build a cada push e pull request.

## Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run db:reset` | Recria o banco local do zero (migrations + seed) |
| `npm run db:tipos` | Regera os tipos TypeScript a partir do banco local |
| `npm run criar-admin -- --email x@y.com --nome "Nome"` | Cria (ou promove) um administrador e imprime o link para definir a senha |

## Estrutura

```
src/app/            páginas (públicas e área logada em (area)/)
src/components/     componentes de interface (formulários, layout, shadcn/ui)
src/lib/            regras do servidor: sessão, ações (aluno, gestor, admin),
                    certificados (PDF), e-mails, marca, validação
supabase/migrations esquema do banco com RLS
supabase/tests      testes estruturais do banco (pgTAP)
tests/              testes de unidade e de permissão (Vitest)
scripts/            criar-admin e seed de demonstração
```

## Segurança

- RLS em todas as tabelas desde a primeira migration; as regras estão em
  linguagem simples em [`docs/PLANO.md`](docs/PLANO.md).
- A chave secreta do Supabase (`SUPABASE_SECRET_KEY`) só é usada no servidor,
  em arquivos marcados com `server-only`.
- Certificados: a emissão é feita por uma função do banco, que confere se todas
  as aulas foram concluídas; os dados impressos ficam congelados; o PDF fica
  num bucket privado e o download passa por uma rota que consulta a RLS.
- A validação pública devolve só nome, curso, carga horária, datas, órgão e
  situação (sem CPF nem e-mail).
- O cadastro público do Supabase fica desligado: contas são criadas pelo
  servidor, e papel/status são decididos pelo banco.
