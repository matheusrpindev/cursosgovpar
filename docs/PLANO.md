# Plano do projeto

Plataforma de cursos online com aprovação por órgão e certificados, revendável
(white-label). Primeiro cliente: GovPar – Instituto Governos & Parcerias.

## Decisões aprovadas

| Tema | Decisão |
|---|---|
| Stack | Next.js 16 (App Router) + TypeScript, Supabase (Auth, Postgres com RLS, Storage), Tailwind + shadcn/ui, Zod, Resend, Vercel |
| Instalações | Uma instalação por cliente (deploy + banco próprios). Marca toda no banco, nada fixo no código |
| Contas | Pacote de contas dedicado por cliente; quem paga e onde fica a Vercel: decidir na etapa 6 |
| Atualizações | Automáticas para todas as instalações, sempre depois de os testes passarem |
| CPF no PDF | Configurável por instalação; padrão mascarado |
| Cadastro | Link próprio por órgão (`/cadastro/<slug>`); lista pública opcional na configuração |
| Gestor | Também faz cursos e emite certificado; convite pede CPF |
| Aula | Concluída automaticamente quando o vídeo termina; opção por aula para desligar a trava; posição salva no navegador |
| Certificado | PDF gerado na emissão e guardado em bucket privado (novo download idêntico) + dados congelados no banco |
| LGPD | Botão "anonimizar" no admin já na primeira versão |
| Acompanhamento | Screenshots de desktop e celular ao fim de cada etapa |
| Ambiente de teste | Publicado **depois da Etapa 3**, com a marca fictícia. Sem domínio por enquanto: as contas de teste da GovPar são criadas já confirmadas pelo admin (cadastro novo e recuperação de senha só funcionam quando houver domínio no Resend). Configuração feita pelo Claude com chaves salvas como segredos do ambiente (`SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`) |

### Premissas adotadas

- O gestor só é avisado depois que o aluno confirma o e-mail.
- Uma pessoa pertence a um órgão; transferência só pelo admin.
- Recusado pode corrigir os dados e reenviar a solicitação.
- Desativado entra só para baixar os próprios certificados; o gestor pode reativar.
- Gestor vê CPF completo só de cadastros pendentes; mascarado no resto.
- Gestor gerencia só alunos; gestores são gerenciados pelo admin.
- Aluno não edita nome/CPF depois de aprovado; correção pelo gestor (nome) ou admin.
- Data de conclusão = data da última aula concluída.
- Nova aula num curso: quem já emitiu mantém o certificado.
- Órgão inativado ou curso retirado: progresso guardado, certificados válidos.
- Admin pode revogar certificado.
- Termos com versão; quando mudam, todos aceitam de novo no próximo login.
- Supabase na região São Paulo.

### Decisões técnicas

- **PDF com `@react-pdf/renderer`**: layout declarativo em JSX, quebra de linha automática, fácil de aplicar a marca.
- **E-mails de autenticação pelo Resend**: o servidor gera os links com a API do Supabase (`generateLink`) e envia com os modelos da marca. Nenhum modelo de e-mail é configurado no painel do Supabase.
- **Links de e-mail com botão**: `/auth/confirmar` só valida o token quando a pessoa clica, para que programas de segurança de e-mail corporativo não gastem o link.
- **Cadastro público do Supabase desligado**: contas só são criadas pelo servidor. Papel e status são decididos no banco (gatilho), nunca a partir de dados do navegador.
- **Permissões lidas do banco a cada requisição** (não do token): desativar alguém vale na hora.
- **Login no navegador** (direto no Supabase), para que o limite de tentativas conte por pessoa e não pelo IP do servidor.
- **Logout com recarga completa** da página: o Next 16 mantém telas visitadas em memória; o recarregamento apaga tudo da sessão anterior.
- **CPF completo em tabela separada** (`perfis_privados`), com regra de leitura mais restrita que o perfil.

## Etapas

| Etapa | Entrega | Situação |
|---|---|---|
| 1. Fundação e autenticação | Projeto, banco com todas as tabelas e RLS, marca dinâmica, cadastro, confirmação de e-mail, login, recuperação de senha, "aguardando aprovação", aceite de termos, testes de permissão e CI | **Concluída** |
| 2. Aprovação e painel do gestor | E-mail aos gestores, fila de pendentes, aprovar/recusar, desativar/reativar, lista de alunos, histórico, reenvio pelo recusado | **Concluída** |
| 3. Cursos, aulas e progresso | CRUD de cursos/aulas, liberação por órgão, player com trava de fim de vídeo, progresso, progresso dos alunos no painel do gestor | Próxima |
| 4. Certificados | Emissão, PDF, QR code, validação pública, revogação | |
| 5. Painel do admin | Órgãos, gestores (convite), visão geral, marca, anonimização, bateria completa de testes | |
| 6. Acabamento e entrega | Responsividade, seed de demonstração, README, guia de nova instalação, deploy | |

## Modelo de dados

| Tabela | Conteúdo |
|---|---|
| `configuracoes` | Linha única com a marca: nome, logo, favicon, cores, rodapé, e-mail de contato, textos do certificado, termos e política (com versão) |
| `organizacoes` | Órgãos/clientes: nome, slug (link de cadastro), ativo |
| `perfis` | 1:1 com o usuário: nome, e-mail, CPF mascarado, papel, órgão, status, motivo da recusa, quem/quando aprovou |
| `perfis_privados` | Só o CPF completo |
| `aceites_termos` | Prova de consentimento: pessoa, documento, versão, data |
| `cursos` | Título, descrição, capa, carga horária, rascunho/publicado |
| `aulas` | Curso, título, descrição, provedor e ID do vídeo, hash do Vimeo, exigir vídeo completo, ordem |
| `organizacao_cursos` | Quais cursos cada órgão acessa |
| `progresso_aulas` | Pessoa, aula, concluída em |
| `certificados` | Código, pessoa, curso, órgão na emissão, dados congelados (CPF mascarado), PDF, emissão, revogação |
| `auditoria` | Quem fez o quê, com quem e quando (gravada só pelo banco) |

Arquivos (Storage): `marca` e `cursos` públicos; `assinaturas` e `certificados` privados.

## Regras de acesso (RLS) em linguagem simples

"Aluno" = aprovado e de órgão ativo. Pendente e recusado veem só o próprio perfil;
desativado vê só o próprio perfil e os próprios certificados.

| Tabela | Visitante | Aluno | Gestor | Admin |
|---|---|---|---|---|
| configuracoes | lê | lê | lê | lê e altera |
| organizacoes | só o nome do órgão do link (ou a lista, se ligada) | o próprio | o próprio | tudo |
| perfis | — | o próprio | os do próprio órgão; aprova, recusa, desativa e reativa **alunos** | tudo |
| perfis_privados (CPF) | — | o próprio | só de pendentes do próprio órgão (e o próprio) | tudo |
| aceites_termos | — | os próprios | — | lê |
| cursos e aulas | — | publicados e liberados para o órgão | idem (o gestor também estuda) | tudo |
| organizacao_cursos | — | do próprio órgão | do próprio órgão | tudo |
| progresso_aulas | — | lê e marca o próprio, só em aulas visíveis | lê o do órgão | lê tudo |
| certificados | valida por código (etapa 4) | os próprios | os do órgão | tudo, inclusive revogar |
| auditoria | — | — | a do próprio órgão | tudo |

Travas além da tabela (gatilhos no banco, valem mesmo para quem chama a API direto):

1. Gestor não altera a si mesmo, não muda papel/órgão/CPF/e-mail de ninguém, não mexe em outro gestor e só faz mudanças de status válidas (pendente→aprovado/recusado, aprovado→desativado, desativado→aprovado). Só aprova quem já confirmou o e-mail.
2. "Quem aprovou" e "quando" são carimbados pelo banco.
3. Admin não altera o próprio papel nem o próprio status.
4. Dados impressos de certificado nunca mudam; só a revogação.
5. A versão dos termos sobe sozinha quando o texto muda.
6. Navegador não tem permissão de TRUNCATE/REFERENCES/TRIGGER; visitante só lê `configuracoes`.
7. Reenvio pelo recusado só pela função `reenviar_solicitacao`: só o próprio, só se estiver recusado, no máximo 3 vezes, e só para órgão ativo.
8. O registro de "gestores avisados" (`notificado_em`) só é alterado pelo servidor.

### Avisos por e-mail (etapa 2)

| Quando | Quem recebe |
|---|---|
| Aluno confirma o e-mail (ou reenvia a solicitação) | Gestores ativos do órgão; se o órgão não tiver gestor, os administradores. Uma vez por pedido |
| Gestor aprova | O aluno |
| Gestor recusa | O aluno, com o motivo (se informado) e o convite para corrigir e reenviar |

Desativar e reativar não geram e-mail.

## Pendências registradas

- Proteção contra cadastros em massa (captcha) e limite de pedidos de recuperação por e-mail: avaliar na etapa 6.
- Configuração de autenticação de cada instalação remota (URL do site, cadastro desligado, senha mínima): via API de gerenciamento do Supabase no script de nova instalação (etapa 6). Não usar `supabase config push`, que levaria os limites de desenvolvimento para produção.
