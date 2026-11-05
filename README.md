# Plataforma de cursos

Plataforma de cursos online com aprovação de acesso por órgão e certificados com
validação pública. É **white-label**: nome, logo, cores, textos, e-mails e
modelo do certificado vêm do banco, configurados pelo painel do administrador.
Cada cliente tem a sua própria instalação (deploy + banco).

> Em construção. Plano, decisões e regras de acesso: [`docs/PLANO.md`](docs/PLANO.md).
> O guia completo de deploy e de nova instalação chega na etapa 6.

## Tecnologias

Next.js 16 (App Router) · TypeScript · Supabase (Auth, Postgres com RLS, Storage) ·
Tailwind CSS + shadcn/ui · Zod · Resend · Vitest + pgTAP.

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

Crie os usuários de exemplo (senha de todos: `Senha1234`) e rode o app:

```bash
npm run seed:usuarios
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
| aluna.vila@aurora.exemplo | Aluna aprovada (Vila Serena) |
| aluno.pendente@aurora.exemplo | Aluno aguardando aprovação |
| aluno.recusado@aurora.exemplo | Aluno recusado |
| aluno.desativado@aurora.exemplo | Aluno desativado |

Link de cadastro de exemplo: http://localhost:3000/cadastro/vila-serena

Para testar a aprovação, entre como `gestora.vila@aurora.exemplo`: a fila de
cadastros, a lista de alunos e o histórico ficam em `/gestor`.

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
src/lib/            regras do servidor: sessão, ações, e-mails, marca, validação
supabase/migrations esquema do banco com RLS
supabase/tests      testes estruturais do banco (pgTAP)
tests/              testes de unidade e de permissão (Vitest)
scripts/            criar-admin e seed de usuários
```

## Segurança

- RLS em todas as tabelas desde a primeira migration; as regras estão em
  linguagem simples em [`docs/PLANO.md`](docs/PLANO.md).
- A chave secreta do Supabase (`SUPABASE_SECRET_KEY`) só é usada no servidor,
  em arquivos marcados com `server-only`.
- O cadastro público do Supabase fica desligado: contas são criadas pelo
  servidor, e papel/status são decididos pelo banco.
