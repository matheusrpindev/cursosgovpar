-- =====================================================================
-- Etapas 3 a 5: reordenar aulas, emissão e validação de certificados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Reordenar aulas (botões ↑/↓). Roda com as permissões de quem chama:
-- a RLS de `aulas` só deixa o admin alterar. A troca acontece numa
-- única transação (a ordem única é conferida só no final).
-- ---------------------------------------------------------------------
create function public.mover_aula(p_aula uuid, p_sobe boolean)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_aula public.aulas%rowtype;
  v_vizinha public.aulas%rowtype;
begin
  select * into v_aula from public.aulas a where a.id = p_aula;
  if not found then
    raise exception 'Aula não encontrada.' using errcode = 'no_data_found';
  end if;

  if p_sobe then
    select * into v_vizinha from public.aulas a
    where a.curso_id = v_aula.curso_id and a.ordem < v_aula.ordem
    order by a.ordem desc limit 1;
  else
    select * into v_vizinha from public.aulas a
    where a.curso_id = v_aula.curso_id and a.ordem > v_aula.ordem
    order by a.ordem asc limit 1;
  end if;
  if not found then
    return;
  end if;

  update public.aulas set ordem = v_vizinha.ordem where id = v_aula.id;
  update public.aulas set ordem = v_aula.ordem where id = v_vizinha.id;
end;
$$;
grant execute on function public.mover_aula(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Emissão do certificado. Tudo é conferido aqui, no banco:
--   - quem pede está aprovado e o órgão está ativo;
--   - o curso está publicado e liberado para o órgão da pessoa;
--   - todas as aulas do curso foram concluídas.
-- Os dados impressos ficam congelados em `dados` (nome, CPF, curso etc.).
-- Chamar de novo devolve o mesmo certificado.
-- ---------------------------------------------------------------------
create function public.emitir_certificado(p_curso uuid)
returns public.certificados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfis%rowtype;
  v_orgao public.organizacoes%rowtype;
  v_curso public.cursos%rowtype;
  v_config public.configuracoes%rowtype;
  v_cert public.certificados%rowtype;
  v_total integer;
  v_feitas integer;
  v_conclusao timestamptz;
  v_cpf text;
  v_carga text;
  v_data text;
  v_frase text;
  v_codigo text;
  v_tentativa integer := 0;
begin
  if v_uid is null or not app.posso_estudar() then
    raise exception 'Seu acesso não permite emitir certificados.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_perfil from public.perfis p where p.id = v_uid;
  select * into v_orgao from public.organizacoes o where o.id = v_perfil.organizacao_id;

  select c.* into v_curso
  from public.cursos c
  join public.organizacao_cursos oc on oc.curso_id = c.id and oc.organizacao_id = v_perfil.organizacao_id
  where c.id = p_curso and c.status = 'publicado';
  if not found then
    raise exception 'Curso não disponível.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_cert from public.certificados c
  where c.perfil_id = v_uid and c.curso_id = p_curso and c.revogado_em is null;
  if found then
    return v_cert;
  end if;

  select count(*), count(pa.aula_id), max(pa.concluida_em)
    into v_total, v_feitas, v_conclusao
  from public.aulas a
  left join public.progresso_aulas pa on pa.aula_id = a.id and pa.perfil_id = v_uid
  where a.curso_id = p_curso;
  if v_total = 0 or v_feitas < v_total then
    raise exception 'Conclua todas as aulas para emitir o certificado.' using errcode = 'check_violation';
  end if;

  select * into v_config from public.configuracoes where id = 1;

  if v_config.cert_cpf_completo then
    select regexp_replace(pp.cpf, '^(\d{3})(\d{3})(\d{3})(\d{2})$', '\1.\2.\3-\4') into v_cpf
    from public.perfis_privados pp where pp.perfil_id = v_uid;
  end if;
  v_cpf := coalesce(v_cpf, v_perfil.cpf_mascarado, '—');
  v_carga := replace(trim(trailing '.' from trim(trailing '0' from v_curso.carga_horaria::text)), '.', ',');
  v_data := to_char(v_conclusao at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  v_frase := replace(replace(replace(replace(replace(v_config.cert_frase,
    '{nome}', v_perfil.nome),
    '{cpf}', v_cpf),
    '{curso}', v_curso.titulo),
    '{carga_horaria}', v_carga),
    '{data_conclusao}', v_data);

  loop
    v_tentativa := v_tentativa + 1;
    v_codigo := upper(replace(gen_random_uuid()::text, '-', ''));
    v_codigo := v_config.cert_prefixo_codigo || '-' || substr(v_codigo, 1, 5) || '-' || substr(v_codigo, 6, 5);
    begin
      insert into public.certificados (codigo, perfil_id, curso_id, organizacao_id, dados)
      values (
        v_codigo, v_uid, p_curso, v_perfil.organizacao_id,
        jsonb_build_object(
          'titulo', v_config.cert_titulo,
          'frase', v_frase,
          'nome', v_perfil.nome,
          'cpf', v_cpf,
          'curso', v_curso.titulo,
          'carga_horaria', v_carga,
          'data_conclusao', v_data,
          'orgao', v_orgao.nome,
          'responsavel_nome', v_config.cert_responsavel_nome,
          'responsavel_cargo', v_config.cert_responsavel_cargo,
          'nome_plataforma', v_config.nome_plataforma,
          'nome_empresa', v_config.nome_empresa,
          'cor_primaria', v_config.cor_primaria,
          'cor_secundaria', v_config.cor_secundaria
        )
      )
      returning * into v_cert;
      exit;
    exception when unique_violation then
      -- Outra chamada emitiu ao mesmo tempo: devolve o que já existe.
      select * into v_cert from public.certificados c
      where c.perfil_id = v_uid and c.curso_id = p_curso and c.revogado_em is null;
      if found then
        return v_cert;
      end if;
      if v_tentativa >= 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.auditoria (ator_id, acao, alvo_perfil_id, organizacao_id, detalhes)
  values (v_uid, 'emitiu_certificado', v_uid, v_perfil.organizacao_id,
          jsonb_build_object('codigo', v_cert.codigo, 'curso', v_curso.titulo));
  return v_cert;
end;
$$;
grant execute on function public.emitir_certificado(uuid) to authenticated;

-- Registro de revogação no histórico.
create function app.auditar_certificados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.revogado_em is null and new.revogado_em is not null then
    insert into public.auditoria (ator_id, acao, alvo_perfil_id, organizacao_id, detalhes)
    values (auth.uid(), 'revogou_certificado', new.perfil_id, new.organizacao_id,
            jsonb_build_object('codigo', new.codigo, 'motivo', new.motivo_revogacao));
  end if;
  return new;
end;
$$;
create trigger auditar_certificados after update on public.certificados
  for each row execute function app.auditar_certificados();

-- ---------------------------------------------------------------------
-- Validação pública por código. Devolve só o necessário para conferir a
-- autenticidade: nada de CPF, e-mail ou identificadores internos.
-- ---------------------------------------------------------------------
create function public.validar_certificado(p_codigo text)
returns table (
  codigo text,
  nome text,
  curso text,
  carga_horaria text,
  data_conclusao text,
  orgao text,
  emitido_em timestamptz,
  valido boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.codigo,
         c.dados ->> 'nome',
         c.dados ->> 'curso',
         c.dados ->> 'carga_horaria',
         c.dados ->> 'data_conclusao',
         c.dados ->> 'orgao',
         c.emitido_em,
         c.revogado_em is null
  from public.certificados c
  where length(p_codigo) between 8 and 40
    and c.codigo = upper(trim(p_codigo));
$$;
grant execute on function public.validar_certificado(text) to anon, authenticated;

-- Funções novas nascem executáveis por todos (PUBLIC) no Postgres: aqui isso é
-- retirado e cada papel recebe só o que precisa. Visitante: apenas a validação.
revoke execute on function public.mover_aula(uuid, boolean) from public, anon;
revoke execute on function public.emitir_certificado(uuid) from public, anon;
revoke execute on function public.validar_certificado(text) from public;
grant execute on function public.mover_aula(uuid, boolean) to authenticated, service_role;
grant execute on function public.emitir_certificado(uuid) to authenticated, service_role;
grant execute on function public.validar_certificado(text) to anon, authenticated, service_role;
