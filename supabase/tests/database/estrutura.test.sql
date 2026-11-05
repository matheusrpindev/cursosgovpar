-- Testes estruturais de segurança do banco (pgTAP). Rodam com `npm run db:test`.
-- Eles valem também para tabelas e funções criadas no futuro.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- RLS -----------------------------------------------------------------------

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'Todas as tabelas do schema public têm RLS ligado'
);

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid) $$,
  'Todas as tabelas do schema public têm ao menos uma política'
);

-- Permissões de quem acessa pelo navegador ---------------------------------

select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where grantee = 'anon' and table_schema = 'public'
       and not (table_name = 'configuracoes' and privilege_type = 'SELECT') $$,
  'Visitante (anon) só pode ler a tabela configuracoes'
);

select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where grantee in ('anon', 'authenticated') and table_schema = 'public'
       and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER') $$,
  'Navegador não tem TRUNCATE/REFERENCES/TRIGGER (a RLS não cobre TRUNCATE)'
);

select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where grantee = 'authenticated' and table_schema = 'public'
       and (table_name, privilege_type) in (
         ('perfis', 'INSERT'), ('perfis', 'DELETE'),
         ('perfis_privados', 'INSERT'), ('perfis_privados', 'DELETE'),
         ('aceites_termos', 'INSERT'), ('aceites_termos', 'UPDATE'), ('aceites_termos', 'DELETE'),
         ('auditoria', 'INSERT'), ('auditoria', 'UPDATE'), ('auditoria', 'DELETE'),
         ('certificados', 'INSERT'), ('certificados', 'DELETE'),
         ('progresso_aulas', 'UPDATE'), ('progresso_aulas', 'DELETE'),
         ('configuracoes', 'INSERT'), ('configuracoes', 'DELETE')
       ) $$,
  'Usuário logado não cria/apaga perfis, aceites, auditoria e certificados diretamente'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
       and p.proname not in ('orgao_para_cadastro', 'orgaos_para_cadastro') $$,
  'Visitante só executa as funções públicas de cadastro'
);

select is_empty(
  $$ select n.nspname || '.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'app') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'Funções SECURITY DEFINER têm search_path fixo'
);

-- CPF -----------------------------------------------------------------------

select ok(app.cpf_valido('52998224725'), 'CPF válido é aceito');
select ok(not app.cpf_valido('52998224724'), 'CPF com dígito verificador errado é recusado');
select ok(not app.cpf_valido('11111111111'), 'CPF com dígitos repetidos é recusado');
select is(app.mascarar_cpf('12345678909'), '***.456.789-**', 'CPF é mascarado como ***.456.789-**');

select throws_ok(
  $$ insert into public.perfis_privados (perfil_id, cpf) values (gen_random_uuid(), '12345678900') $$,
  '23514',
  null,
  'Banco recusa CPF inválido mesmo vindo do servidor'
);

-- Configurações -------------------------------------------------------------

select throws_ok(
  $$ insert into public.configuracoes (id) values (2) $$,
  '23514',
  null,
  'Configurações têm uma única linha'
);

create temporary table versao_antes as select termos_versao as v from public.configuracoes where id = 1;
update public.configuracoes set termos_uso = termos_uso || ' (alterado)' where id = 1;
select is(
  (select termos_versao from public.configuracoes where id = 1),
  (select v + 1 from versao_antes),
  'Versão dos termos sobe sozinha quando o texto muda'
);

update public.configuracoes set termos_versao = 999 where id = 1;
select isnt(
  (select termos_versao from public.configuracoes where id = 1),
  999,
  'Versão dos termos não pode ser definida manualmente'
);

-- Auditoria -----------------------------------------------------------------

select ok(
  exists (select 1 from public.auditoria where acao = 'alterou_configuracoes'),
  'Alteração de configurações fica registrada na auditoria'
);

select * from finish();
rollback;
