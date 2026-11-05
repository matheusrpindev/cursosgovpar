-- =====================================================================
-- Esquema inicial da plataforma de cursos
--
-- Princípios:
--   * Toda tabela nasce com Row Level Security (RLS) ligado.
--   * Permissões são lidas do banco a cada requisição (nunca do token),
--     então desativar alguém tem efeito imediato.
--   * Papel e status de quem se cadastra são decididos aqui, nunca a partir
--     de dados enviados pelo navegador.
--   * As regras em linguagem simples estão em docs/PLANO.md.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Schema interno (não exposto pela API) para funções auxiliares
-- ---------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- Novas tabelas e funções em "public" NÃO ficam acessíveis automaticamente
-- para anon/authenticated: cada acesso precisa de GRANT explícito.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;
alter default privileges for role postgres in schema app revoke execute on functions from public;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel as enum ('admin', 'gestor', 'aluno');
create type public.status_perfil as enum ('pendente', 'aprovado', 'recusado', 'desativado');
create type public.status_curso as enum ('rascunho', 'publicado');
create type public.provedor_video as enum ('youtube', 'vimeo');
create type public.documento_legal as enum ('termos_uso', 'politica_privacidade');

-- ---------------------------------------------------------------------
-- Funções utilitárias puras
-- ---------------------------------------------------------------------

-- Valida os dígitos verificadores de um CPF (somente dígitos, 11 caracteres).
create function app.cpf_valido(cpf text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  soma integer;
  resto integer;
  digito integer;
  i integer;
begin
  if cpf is null or cpf !~ '^\d{11}$' or cpf ~ '^(\d)\1{10}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..9 loop
    soma := soma + substr(cpf, i, 1)::integer * (11 - i);
  end loop;
  resto := (soma * 10) % 11;
  digito := case when resto = 10 then 0 else resto end;
  if digito <> substr(cpf, 10, 1)::integer then
    return false;
  end if;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substr(cpf, i, 1)::integer * (12 - i);
  end loop;
  resto := (soma * 10) % 11;
  digito := case when resto = 10 then 0 else resto end;
  return digito = substr(cpf, 11, 1)::integer;
end;
$$;

-- 12345678909 -> ***.456.789-**
create function app.mascarar_cpf(cpf text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when cpf ~ '^\d{11}$' then '***.' || substr(cpf, 4, 3) || '.' || substr(cpf, 7, 3) || '-**'
    else null
  end;
$$;

grant execute on function app.cpf_valido(text) to anon, authenticated, service_role;
grant execute on function app.mascarar_cpf(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

-- Configurações da marca (white-label). Sempre uma única linha (id = 1).
create table public.configuracoes (
  id smallint primary key default 1 check (id = 1),
  nome_plataforma text not null default 'Plataforma de Cursos'
    check (length(trim(nome_plataforma)) between 2 and 80),
  nome_empresa text not null default ''
    check (length(nome_empresa) <= 160),
  logo_path text,
  favicon_path text,
  cor_primaria text not null default '#1d4ed8' check (cor_primaria ~ '^#[0-9a-fA-F]{6}$'),
  cor_secundaria text not null default '#0f766e' check (cor_secundaria ~ '^#[0-9a-fA-F]{6}$'),
  texto_rodape text not null default '' check (length(texto_rodape) <= 500),
  email_contato text check (email_contato is null or email_contato ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  cadastro_lista_publica boolean not null default false,
  -- Certificado
  cert_titulo text not null default 'Certificado de Conclusão',
  cert_frase text not null default
    'Certificamos que {nome}, CPF {cpf}, concluiu o curso {curso}, com carga horária de {carga_horaria} horas, em {data_conclusao}.',
  cert_responsavel_nome text not null default '',
  cert_responsavel_cargo text not null default '',
  cert_assinatura_path text,
  cert_prefixo_codigo text not null default 'CERT' check (cert_prefixo_codigo ~ '^[A-Z0-9]{1,6}$'),
  cert_cpf_completo boolean not null default false,
  -- Documentos legais (LGPD). A versão sobe sozinha quando o texto muda.
  termos_uso text not null default '',
  politica_privacidade text not null default '',
  termos_versao integer not null default 1 check (termos_versao >= 1),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null
);

-- Órgãos / clientes. Nunca são apagados se tiverem pessoas: são inativados.
create table public.organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Perfil de cada usuário (1:1 com auth.users). O CPF completo fica em perfis_privados.
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) between 3 and 160),
  email text not null,
  cpf_mascarado text,
  papel public.papel not null default 'aluno',
  organizacao_id uuid references public.organizacoes (id) on delete restrict,
  status public.status_perfil not null default 'pendente',
  motivo_recusa text check (length(motivo_recusa) <= 500),
  aprovado_por uuid references public.perfis (id) on delete set null,
  aprovado_em timestamptz,
  email_confirmado_em timestamptz,
  anonimizado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint perfis_orgao_obrigatorio check (papel = 'admin' or organizacao_id is not null)
);
create index perfis_organizacao_status_idx on public.perfis (organizacao_id, status);
create unique index perfis_email_unico on public.perfis (email);

-- CPF completo, separado para ter regras de leitura mais restritas que o perfil.
create table public.perfis_privados (
  perfil_id uuid primary key references public.perfis (id) on delete cascade,
  cpf text unique check (cpf is null or app.cpf_valido(cpf))
);

-- Registro de aceite dos termos (prova de consentimento - LGPD).
create table public.aceites_termos (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  documento public.documento_legal not null,
  versao integer not null,
  aceito_em timestamptz not null default now(),
  unique (perfil_id, documento, versao)
);

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) between 3 and 200),
  descricao text not null default '',
  capa_path text,
  carga_horaria numeric(5, 1) not null check (carga_horaria > 0),
  status public.status_curso not null default 'rascunho',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) between 3 and 200),
  descricao text not null default '',
  video_provedor public.provedor_video not null,
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  video_hash text check (video_hash is null or video_hash ~ '^[A-Za-z0-9]{1,64}$'),
  exigir_video_completo boolean not null default true,
  ordem integer not null check (ordem >= 1),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint aulas_ordem_unica unique (curso_id, ordem) deferrable initially deferred
);

-- Quais cursos cada órgão acessa.
create table public.organizacao_cursos (
  organizacao_id uuid not null references public.organizacoes (id) on delete cascade,
  curso_id uuid not null references public.cursos (id) on delete cascade,
  liberado_em timestamptz not null default now(),
  liberado_por uuid references public.perfis (id) on delete set null,
  primary key (organizacao_id, curso_id)
);
create index organizacao_cursos_curso_idx on public.organizacao_cursos (curso_id);

create table public.progresso_aulas (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  aula_id uuid not null references public.aulas (id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (perfil_id, aula_id)
);
create index progresso_aulas_aula_idx on public.progresso_aulas (aula_id);

-- Certificados. "dados" é a fotografia do que foi impresso (CPF já mascarado);
-- o PDF original fica no bucket privado "certificados".
create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  perfil_id uuid references public.perfis (id) on delete set null,
  curso_id uuid not null references public.cursos (id) on delete restrict,
  organizacao_id uuid references public.organizacoes (id) on delete restrict,
  dados jsonb not null,
  pdf_path text,
  emitido_em timestamptz not null default now(),
  revogado_em timestamptz,
  revogado_por uuid references public.perfis (id) on delete set null,
  motivo_revogacao text check (length(motivo_revogacao) <= 500)
);
create unique index certificados_um_valido_por_curso
  on public.certificados (perfil_id, curso_id) where revogado_em is null;
create index certificados_organizacao_idx on public.certificados (organizacao_id);

-- Trilha de auditoria. Só o próprio banco grava; ninguém altera ou apaga.
create table public.auditoria (
  id bigint generated always as identity primary key,
  ator_id uuid references public.perfis (id) on delete set null,
  acao text not null,
  alvo_perfil_id uuid references public.perfis (id) on delete set null,
  organizacao_id uuid references public.organizacoes (id) on delete set null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);
create index auditoria_organizacao_idx on public.auditoria (organizacao_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Funções auxiliares das políticas (SECURITY DEFINER evita recursão de RLS)
-- ---------------------------------------------------------------------

-- Contexto confiável: servidor com a chave service_role ou funções internas.
create function app.contexto_confiavel()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'service_role', 'supabase_admin');
$$;

create function app.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.papel = 'admin' and p.status = 'aprovado'
  );
$$;

create function app.minha_organizacao()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organizacao_id from public.perfis p where p.id = (select auth.uid());
$$;

-- Aluno ou gestor aprovado, de órgão ativo: pode estudar.
create function app.posso_estudar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis p
    join public.organizacoes o on o.id = p.organizacao_id
    where p.id = (select auth.uid())
      and p.papel in ('aluno', 'gestor')
      and p.status = 'aprovado'
      and o.ativo
  );
$$;

-- Sou gestor aprovado do órgão informado (e o órgão está ativo).
create function app.gestor_de(p_organizacao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_organizacao is not null and exists (
    select 1
    from public.perfis p
    join public.organizacoes o on o.id = p.organizacao_id
    where p.id = (select auth.uid())
      and p.papel = 'gestor'
      and p.status = 'aprovado'
      and o.ativo
      and p.organizacao_id = p_organizacao
  );
$$;

-- Sou gestor do órgão a que a pessoa informada pertence.
create function app.gestor_do_perfil(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis alvo
    where alvo.id = p_perfil and app.gestor_de(alvo.organizacao_id)
  );
$$;

grant execute on function
  app.contexto_confiavel(),
  app.sou_admin(),
  app.minha_organizacao(),
  app.posso_estudar(),
  app.gestor_de(uuid),
  app.gestor_do_perfil(uuid)
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

create function app.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger cursos_atualizado_em before update on public.cursos
  for each row execute function app.tocar_atualizado_em();
create trigger aulas_atualizado_em before update on public.aulas
  for each row execute function app.tocar_atualizado_em();

-- Configurações: versão dos termos sobe sozinha quando o texto muda.
create function app.configuracoes_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := 1;
  if new.termos_uso is distinct from old.termos_uso
     or new.politica_privacidade is distinct from old.politica_privacidade then
    new.termos_versao := old.termos_versao + 1;
  else
    new.termos_versao := old.termos_versao;
  end if;
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  return new;
end;
$$;

create trigger configuracoes_antes_de_atualizar before update on public.configuracoes
  for each row execute function app.configuracoes_antes_de_atualizar();

-- Cria o perfil quando um usuário é criado em auth.users.
-- Papel e órgão vêm de raw_app_meta_data, que só o servidor (service_role) consegue definir.
-- Quem não tiver papel definido vira aluno pendente.
--
-- O gatilho é adiado para o fim da transação (constraint trigger) porque a API de
-- administração do Supabase grava o app_metadata logo depois do INSERT, na mesma
-- transação. Por isso a linha é relida aqui, já no estado final.
create function app.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario auth.users%rowtype;
  v_papel public.papel;
  v_org uuid;
  v_nome text;
  v_cpf text;
  v_aceite boolean;
  v_versao integer;
begin
  select * into v_usuario from auth.users u where u.id = new.id;
  if not found or exists (select 1 from public.perfis p where p.id = new.id) then
    return null;
  end if;

  v_papel := coalesce(nullif(v_usuario.raw_app_meta_data ->> 'papel', ''), 'aluno')::public.papel;
  v_org := nullif(v_usuario.raw_app_meta_data ->> 'organizacao_id', '')::uuid;
  v_nome := trim(coalesce(v_usuario.raw_user_meta_data ->> 'nome', ''));
  v_cpf := nullif(regexp_replace(coalesce(v_usuario.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g'), '');
  v_aceite := coalesce((v_usuario.raw_user_meta_data ->> 'aceite_termos')::boolean, false);

  if v_papel = 'admin' then
    v_org := null;
  elsif v_org is null or not exists (
    select 1 from public.organizacoes o where o.id = v_org and o.ativo
  ) then
    raise exception 'Órgão inválido ou inativo.' using errcode = 'check_violation';
  end if;

  if v_papel = 'aluno' then
    if v_cpf is null then
      raise exception 'CPF obrigatório.' using errcode = 'check_violation';
    end if;
    if not v_aceite then
      raise exception 'É obrigatório aceitar os termos de uso e a política de privacidade.'
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.perfis (id, nome, email, cpf_mascarado, papel, organizacao_id, status, email_confirmado_em)
  values (
    v_usuario.id,
    v_nome,
    lower(v_usuario.email),
    app.mascarar_cpf(v_cpf),
    v_papel,
    v_org,
    case when v_papel = 'aluno' then 'pendente'::public.status_perfil else 'aprovado'::public.status_perfil end,
    v_usuario.email_confirmed_at
  );

  if v_cpf is not null then
    insert into public.perfis_privados (perfil_id, cpf) values (v_usuario.id, v_cpf);
  end if;

  if v_aceite then
    select c.termos_versao into v_versao from public.configuracoes c where c.id = 1;
    insert into public.aceites_termos (perfil_id, documento, versao)
    values (v_usuario.id, 'termos_uso', v_versao), (v_usuario.id, 'politica_privacidade', v_versao);
  end if;

  return null;
end;
$$;

create constraint trigger criar_perfil_para_novo_usuario
  after insert on auth.users
  deferrable initially deferred
  for each row execute function app.criar_perfil_para_novo_usuario();

-- Mantém e-mail e data de confirmação do perfil em sincronia com auth.users.
create function app.sincronizar_email_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis
     set email = lower(new.email),
         email_confirmado_em = new.email_confirmed_at
   where id = new.id;
  return new;
end;
$$;

create trigger sincronizar_email_do_usuario
  after update of email, email_confirmed_at on auth.users
  for each row execute function app.sincronizar_email_do_usuario();

-- Mantém o CPF mascarado do perfil em sincronia com o CPF completo.
create function app.sincronizar_cpf_mascarado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfis set cpf_mascarado = app.mascarar_cpf(new.cpf) where id = new.perfil_id;
  return new;
end;
$$;

create trigger sincronizar_cpf_mascarado
  after insert or update of cpf on public.perfis_privados
  for each row execute function app.sincronizar_cpf_mascarado();

-- Travas de alteração de perfis (valem mesmo para quem chama a API diretamente).
create function app.perfis_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_primeira_aprovacao boolean := old.status = 'pendente' and new.status = 'aprovado';
begin
  if not app.contexto_confiavel() then
    if app.sou_admin() then
      if new.id = v_uid and (new.papel is distinct from old.papel or new.status is distinct from old.status) then
        raise exception 'Um administrador não pode alterar o próprio papel ou status.'
          using errcode = 'insufficient_privilege';
      end if;
    elsif app.gestor_de(old.organizacao_id) then
      if new.id = v_uid then
        raise exception 'Gestor não pode alterar o próprio perfil.' using errcode = 'insufficient_privilege';
      end if;
      if old.papel <> 'aluno' then
        raise exception 'Gestor só gerencia alunos.' using errcode = 'insufficient_privilege';
      end if;
      if new.papel is distinct from old.papel
         or new.organizacao_id is distinct from old.organizacao_id
         or new.email is distinct from old.email
         or new.cpf_mascarado is distinct from old.cpf_mascarado
         or new.email_confirmado_em is distinct from old.email_confirmado_em
         or new.anonimizado_em is distinct from old.anonimizado_em
         or new.criado_em is distinct from old.criado_em then
        raise exception 'Alteração não permitida para gestor.' using errcode = 'insufficient_privilege';
      end if;
      if new.status is distinct from old.status and not (
           (old.status = 'pendente' and new.status in ('aprovado', 'recusado') and old.email_confirmado_em is not null)
        or (old.status = 'aprovado' and new.status = 'desativado')
        or (old.status = 'desativado' and new.status = 'aprovado')
      ) then
        raise exception 'Mudança de status não permitida: % -> %.', old.status, new.status
          using errcode = 'insufficient_privilege';
      end if;
    else
      raise exception 'Sem permissão para alterar perfis.' using errcode = 'insufficient_privilege';
    end if;

    -- Campos carimbados pelo banco: quem chama pela API não escolhe.
    new.aprovado_por := old.aprovado_por;
    new.aprovado_em := old.aprovado_em;
    if new.status is not distinct from old.status or new.status <> 'recusado' then
      new.motivo_recusa := case when new.status = 'recusado' then old.motivo_recusa else null end;
    end if;
  end if;

  if v_primeira_aprovacao and (new.aprovado_em is null or not app.contexto_confiavel()) then
    new.aprovado_por := coalesce(v_uid, new.aprovado_por);
    new.aprovado_em := now();
    new.motivo_recusa := null;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger perfis_antes_de_atualizar before update on public.perfis
  for each row execute function app.perfis_antes_de_atualizar();

-- Auditoria automática de mudanças de status, papel e órgão.
create function app.auditar_perfis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acao text;
begin
  if new.status is distinct from old.status then
    v_acao := case
      when old.status = 'pendente' and new.status = 'aprovado' then 'aprovou_cadastro'
      when old.status = 'pendente' and new.status = 'recusado' then 'recusou_cadastro'
      when new.status = 'desativado' then 'desativou_acesso'
      when old.status = 'desativado' and new.status = 'aprovado' then 'reativou_acesso'
      when old.status = 'recusado' and new.status = 'pendente' then 'reenviou_solicitacao'
      else 'alterou_status'
    end;
    insert into public.auditoria (ator_id, acao, alvo_perfil_id, organizacao_id, detalhes)
    values (auth.uid(), v_acao, new.id, new.organizacao_id,
            jsonb_build_object('de', old.status, 'para', new.status, 'motivo', new.motivo_recusa));
  end if;

  if new.papel is distinct from old.papel then
    insert into public.auditoria (ator_id, acao, alvo_perfil_id, organizacao_id, detalhes)
    values (auth.uid(), 'alterou_papel', new.id, new.organizacao_id,
            jsonb_build_object('de', old.papel, 'para', new.papel));
  end if;

  if new.organizacao_id is distinct from old.organizacao_id then
    insert into public.auditoria (ator_id, acao, alvo_perfil_id, organizacao_id, detalhes)
    values (auth.uid(), 'transferiu_orgao', new.id, new.organizacao_id,
            jsonb_build_object('de', old.organizacao_id, 'para', new.organizacao_id));
  end if;

  return new;
end;
$$;

create trigger auditar_perfis after update on public.perfis
  for each row execute function app.auditar_perfis();

create function app.auditar_configuracoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.auditoria (ator_id, acao, detalhes)
  values (auth.uid(), 'alterou_configuracoes',
          jsonb_build_object('termos_versao', new.termos_versao));
  return new;
end;
$$;

create trigger auditar_configuracoes after update on public.configuracoes
  for each row execute function app.auditar_configuracoes();

-- Certificados: o que foi emitido não muda. Só a revogação (e o caminho do PDF,
-- gravado pelo servidor) pode ser alterada depois.
create function app.certificados_antes_de_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo is distinct from old.codigo
     or new.curso_id is distinct from old.curso_id
     or new.organizacao_id is distinct from old.organizacao_id
     or new.dados is distinct from old.dados
     or new.emitido_em is distinct from old.emitido_em
     or (new.perfil_id is distinct from old.perfil_id and new.perfil_id is not null) then
    raise exception 'Dados de certificado emitido não podem ser alterados.'
      using errcode = 'insufficient_privilege';
  end if;

  if not app.contexto_confiavel() then
    if new.pdf_path is distinct from old.pdf_path then
      raise exception 'Somente o servidor grava o PDF.' using errcode = 'insufficient_privilege';
    end if;
    if old.revogado_em is not null and new.revogado_em is distinct from old.revogado_em then
      raise exception 'Certificado já revogado.' using errcode = 'insufficient_privilege';
    end if;
    if new.revogado_em is distinct from old.revogado_em then
      new.revogado_em := now();
      new.revogado_por := auth.uid();
    else
      new.revogado_por := old.revogado_por;
      new.motivo_revogacao := old.motivo_revogacao;
    end if;
  end if;

  return new;
end;
$$;

create trigger certificados_antes_de_atualizar before update on public.certificados
  for each row execute function app.certificados_antes_de_atualizar();

-- ---------------------------------------------------------------------
-- Permissões de tabela (GRANT) - a RLS filtra as linhas em seguida
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.configuracoes to anon, authenticated;
grant update on public.configuracoes to authenticated;
grant select, insert, update, delete on public.organizacoes to authenticated;
grant select, update on public.perfis to authenticated;
grant select, update on public.perfis_privados to authenticated;
grant select on public.aceites_termos to authenticated;
grant select, insert, update, delete on public.cursos to authenticated;
grant select, insert, update, delete on public.aulas to authenticated;
grant select, insert, delete on public.organizacao_cursos to authenticated;
grant select, insert on public.progresso_aulas to authenticated;
grant select, update on public.certificados to authenticated;
grant select on public.auditoria to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.configuracoes enable row level security;
alter table public.organizacoes enable row level security;
alter table public.perfis enable row level security;
alter table public.perfis_privados enable row level security;
alter table public.aceites_termos enable row level security;
alter table public.cursos enable row level security;
alter table public.aulas enable row level security;
alter table public.organizacao_cursos enable row level security;
alter table public.progresso_aulas enable row level security;
alter table public.certificados enable row level security;
alter table public.auditoria enable row level security;

-- configuracoes: todos leem (é a marca pública); só admin altera.
create policy "todos leem a marca" on public.configuracoes
  for select to anon, authenticated using (true);
create policy "admin altera a marca" on public.configuracoes
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));

-- organizacoes: cada um vê o próprio órgão; admin vê e gerencia todos.
-- Visitantes usam as funções orgao_para_cadastro/orgaos_para_cadastro.
create policy "ver o proprio orgao ou admin" on public.organizacoes
  for select to authenticated
  using (id = (select app.minha_organizacao()) or (select app.sou_admin()));
create policy "admin cria orgaos" on public.organizacoes
  for insert to authenticated with check ((select app.sou_admin()));
create policy "admin altera orgaos" on public.organizacoes
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));
create policy "admin apaga orgaos" on public.organizacoes
  for delete to authenticated using ((select app.sou_admin()));

-- perfis: cada um vê o próprio; gestor vê o próprio órgão (pendentes só depois
-- de confirmarem o e-mail); admin vê todos. Alterações passam pelas travas do gatilho.
create policy "ver perfis permitidos" on public.perfis
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select app.sou_admin())
    or (
      (select app.gestor_de(organizacao_id))
      and (status <> 'pendente' or email_confirmado_em is not null)
    )
  );
create policy "admin altera perfis" on public.perfis
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));
create policy "gestor altera alunos do proprio orgao" on public.perfis
  for update to authenticated
  using (
    papel = 'aluno'
    and id <> (select auth.uid())
    and (select app.gestor_de(organizacao_id))
  )
  with check (
    papel = 'aluno'
    and id <> (select auth.uid())
    and (select app.gestor_de(organizacao_id))
  );

-- perfis_privados (CPF completo): o próprio, o admin, e o gestor do órgão
-- somente enquanto o cadastro está pendente (para conferir antes de aprovar).
create policy "ver cpf completo quando necessario" on public.perfis_privados
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select app.sou_admin())
    or exists (
      select 1 from public.perfis p
      where p.id = perfis_privados.perfil_id
        and p.papel = 'aluno'
        and p.status = 'pendente'
        and p.email_confirmado_em is not null
        and app.gestor_de(p.organizacao_id)
    )
  );
create policy "admin corrige cpf" on public.perfis_privados
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));

-- aceites_termos: o próprio e o admin leem; gravação só por funções do banco.
create policy "ver aceites" on public.aceites_termos
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select app.sou_admin()));

-- cursos: admin vê e gerencia todos; quem pode estudar vê os publicados
-- liberados para o seu órgão.
create policy "ver cursos permitidos" on public.cursos
  for select to authenticated
  using (
    (select app.sou_admin())
    or (
      status = 'publicado'
      and (select app.posso_estudar())
      and exists (
        select 1 from public.organizacao_cursos oc
        where oc.curso_id = cursos.id and oc.organizacao_id = (select app.minha_organizacao())
      )
    )
  );
create policy "admin cria cursos" on public.cursos
  for insert to authenticated with check ((select app.sou_admin()));
create policy "admin altera cursos" on public.cursos
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));
create policy "admin apaga cursos" on public.cursos
  for delete to authenticated using ((select app.sou_admin()));

-- aulas: visíveis para quem vê o curso (a RLS de cursos se aplica na subconsulta).
create policy "ver aulas de cursos visiveis" on public.aulas
  for select to authenticated
  using (
    (select app.sou_admin())
    or exists (select 1 from public.cursos c where c.id = aulas.curso_id)
  );
create policy "admin cria aulas" on public.aulas
  for insert to authenticated with check ((select app.sou_admin()));
create policy "admin altera aulas" on public.aulas
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));
create policy "admin apaga aulas" on public.aulas
  for delete to authenticated using ((select app.sou_admin()));

-- organizacao_cursos: o órgão vê as próprias liberações; admin gerencia.
create policy "ver liberacoes do proprio orgao" on public.organizacao_cursos
  for select to authenticated
  using (
    (select app.sou_admin())
    or (organizacao_id = (select app.minha_organizacao()) and (select app.posso_estudar()))
  );
create policy "admin libera cursos" on public.organizacao_cursos
  for insert to authenticated with check ((select app.sou_admin()));
create policy "admin remove liberacoes" on public.organizacao_cursos
  for delete to authenticated using ((select app.sou_admin()));

-- progresso_aulas: o próprio, o gestor do órgão e o admin leem;
-- só o próprio marca, e só em aulas que consegue ver.
create policy "ver progresso permitido" on public.progresso_aulas
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select app.sou_admin())
    or (select app.gestor_do_perfil(perfil_id))
  );
create policy "marcar a propria aula" on public.progresso_aulas
  for insert to authenticated
  with check (
    perfil_id = (select auth.uid())
    and (select app.posso_estudar())
    and exists (select 1 from public.aulas a where a.id = progresso_aulas.aula_id)
  );

-- certificados: o próprio (mesmo desativado), o gestor do órgão e o admin leem.
-- Emissão só pela função do banco (etapa 4). Só admin revoga.
create policy "ver certificados permitidos" on public.certificados
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select app.sou_admin())
    or (select app.gestor_de(organizacao_id))
  );
create policy "admin revoga certificados" on public.certificados
  for update to authenticated
  using ((select app.sou_admin())) with check ((select app.sou_admin()));

-- auditoria: admin lê tudo; gestor lê a do próprio órgão.
create policy "ver auditoria permitida" on public.auditoria
  for select to authenticated
  using ((select app.sou_admin()) or (select app.gestor_de(organizacao_id)));

-- ---------------------------------------------------------------------
-- Funções públicas (RPC)
-- ---------------------------------------------------------------------

-- Nome do órgão de um link de cadastro (/cadastro/<slug>). Só órgãos ativos.
create function public.orgao_para_cadastro(p_slug text)
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.nome from public.organizacoes o
  where o.slug = lower(trim(p_slug)) and o.ativo;
$$;

-- Lista de órgãos ativos, somente se a lista pública estiver ligada na configuração.
create function public.orgaos_para_cadastro()
returns table (id uuid, nome text, slug text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.nome, o.slug
  from public.organizacoes o
  where o.ativo
    and coalesce((select c.cadastro_lista_publica from public.configuracoes c where c.id = 1), false)
  order by o.nome;
$$;

-- Registra o aceite da versão atual dos termos para o usuário logado.
create function public.aceitar_termos_atuais()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao integer;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.' using errcode = 'insufficient_privilege';
  end if;
  select c.termos_versao into v_versao from public.configuracoes c where c.id = 1;
  insert into public.aceites_termos (perfil_id, documento, versao)
  values (auth.uid(), 'termos_uso', v_versao), (auth.uid(), 'politica_privacidade', v_versao)
  on conflict (perfil_id, documento, versao) do nothing;
end;
$$;

revoke all on function public.orgao_para_cadastro(text) from public;
revoke all on function public.orgaos_para_cadastro() from public;
revoke all on function public.aceitar_termos_atuais() from public;
grant execute on function public.orgao_para_cadastro(text) to anon, authenticated;
grant execute on function public.orgaos_para_cadastro() to anon, authenticated;
grant execute on function public.aceitar_termos_atuais() to authenticated;

-- ---------------------------------------------------------------------
-- Storage (arquivos)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('marca', 'marca', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']),
  ('cursos', 'cursos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('assinaturas', 'assinaturas', false, 1048576, array['image/png', 'image/jpeg']),
  ('certificados', 'certificados', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- Só admin envia/altera arquivos de marca, capas e assinatura.
-- O bucket "certificados" não tem política: só o servidor (service_role) acessa.
create policy "admin le arquivos administrativos" on storage.objects
  for select to authenticated
  using (bucket_id in ('marca', 'cursos', 'assinaturas') and (select app.sou_admin()));
create policy "admin envia arquivos administrativos" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('marca', 'cursos', 'assinaturas') and (select app.sou_admin()));
create policy "admin altera arquivos administrativos" on storage.objects
  for update to authenticated
  using (bucket_id in ('marca', 'cursos', 'assinaturas') and (select app.sou_admin()))
  with check (bucket_id in ('marca', 'cursos', 'assinaturas') and (select app.sou_admin()));
create policy "admin apaga arquivos administrativos" on storage.objects
  for delete to authenticated
  using (bucket_id in ('marca', 'cursos', 'assinaturas') and (select app.sou_admin()));

-- ---------------------------------------------------------------------
-- Linha única de configuração
-- ---------------------------------------------------------------------
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;
