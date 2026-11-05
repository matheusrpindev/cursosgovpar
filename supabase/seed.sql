-- Seed de desenvolvimento: marca fictícia e dois órgãos.
-- Usuários de exemplo são criados por `npm run seed:usuarios` (usa a API de
-- administração do Supabase, que respeita as mesmas regras do cadastro real).

update public.configuracoes set
  nome_plataforma = 'Aurora Cursos',
  nome_empresa = 'Instituto Aurora de Gestão Pública',
  cor_primaria = '#1e5aa8',
  cor_secundaria = '#0f8a6a',
  texto_rodape = 'Instituto Aurora de Gestão Pública — capacitação para o setor público.',
  email_contato = 'contato@aurora.exemplo',
  cadastro_lista_publica = false,
  cert_titulo = 'Certificado de Conclusão',
  cert_responsavel_nome = 'Maria Exemplo da Silva',
  cert_responsavel_cargo = 'Diretora de Formação',
  cert_prefixo_codigo = 'AUR',
  termos_uso = $termos$
MODELO — revise com o jurídico antes de publicar.

1. Objeto
Estes termos regulam o uso da plataforma de cursos oferecida pelo Instituto Aurora de Gestão Pública aos órgãos parceiros e às pessoas indicadas por eles.

2. Acesso
O acesso depende de aprovação do órgão ao qual você declarou pertencer. O órgão pode recusar ou desativar o acesso a qualquer momento.

3. Uso adequado
O conteúdo dos cursos é destinado exclusivamente à capacitação. É proibido compartilhar a sua senha ou redistribuir o conteúdo.

4. Certificados
Os certificados são emitidos com os dados do seu cadastro e podem ser validados publicamente pelo código impresso.
$termos$,
  politica_privacidade = $politica$
MODELO — revise com o jurídico antes de publicar.

1. Quais dados coletamos
Nome completo, CPF, e-mail, órgão a que você pertence e o seu progresso nos cursos.

2. Para que usamos
Para identificar você, permitir que o seu órgão aprove o acesso, registrar o seu progresso e emitir certificados.

3. Com quem compartilhamos
Com os gestores do seu órgão, que veem o seu cadastro e o seu progresso. Na validação pública de certificados, o CPF aparece mascarado.

4. Seus direitos (LGPD)
Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail de contato da plataforma.
$politica$
where id = 1;

insert into public.organizacoes (nome, slug) values
  ('Prefeitura de Vila Serena', 'vila-serena'),
  ('Prefeitura de Campo Alegre', 'campo-alegre')
on conflict (slug) do nothing;
