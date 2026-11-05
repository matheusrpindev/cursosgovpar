-- =====================================================================
-- Etapa 2: aprovação pelo gestor, avisos por e-mail e reenvio pelo recusado
-- =====================================================================

-- Quando os gestores foram avisados deste pedido pendente. Controlado pelo
-- servidor; serve para não avisar duas vezes (e para avisar de novo após um reenvio).
alter table public.perfis add column notificado_em timestamptz;

-- A trava de perfis passa a tratar notificado_em como campo do sistema
-- (quem chama pela API não altera).
create or replace function app.perfis_antes_de_atualizar()
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
    new.notificado_em := old.notificado_em;
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

-- ---------------------------------------------------------------------
-- Reenvio da solicitação pelo próprio aluno recusado
-- ---------------------------------------------------------------------
-- Códigos de erro (lidos pelo servidor para mostrar a mensagem certa):
--   AP001 limite de reenvios atingido
--   AP002 órgão inválido ou inativo
--   AP003 nome inválido
--   AP004 cadastro não está recusado
create function public.reenviar_solicitacao(p_nome text, p_slug text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfis%rowtype;
  v_nome text := trim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_org uuid;
  v_reenvios integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_perfil from public.perfis p where p.id = v_uid for update;
  if not found or v_perfil.papel <> 'aluno' or v_perfil.status <> 'recusado' then
    raise exception 'Só um cadastro recusado pode ser reenviado.' using errcode = 'AP004';
  end if;

  if length(v_nome) < 3 or length(v_nome) > 160 or position(' ' in v_nome) = 0 then
    raise exception 'Informe nome e sobrenome.' using errcode = 'AP003';
  end if;

  select count(*) into v_reenvios
  from public.auditoria a
  where a.alvo_perfil_id = v_uid and a.acao = 'reenviou_solicitacao';
  if v_reenvios >= 3 then
    raise exception 'Limite de reenvios atingido.' using errcode = 'AP001';
  end if;

  v_org := v_perfil.organizacao_id;
  if nullif(trim(coalesce(p_slug, '')), '') is not null then
    select o.id into v_org from public.organizacoes o where o.slug = lower(trim(p_slug));
  end if;
  if v_org is null or not exists (select 1 from public.organizacoes o where o.id = v_org and o.ativo) then
    raise exception 'Órgão não encontrado ou inativo.' using errcode = 'AP002';
  end if;

  update public.perfis
     set status = 'pendente',
         nome = v_nome,
         organizacao_id = v_org,
         motivo_recusa = null,
         notificado_em = null
   where id = v_uid;
end;
$$;

revoke all on function public.reenviar_solicitacao(text, text) from public;
grant execute on function public.reenviar_solicitacao(text, text) to authenticated;
