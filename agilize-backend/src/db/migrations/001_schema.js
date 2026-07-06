// Schema completo do Agilize 2.0.
// Resultado final da consolidação das migrations 001-019.
exports.up = async function (knex) {

  await knex.schema.createTable('tb_departamentos', (t) => {
    t.bigIncrements('id_departamento').primary();
    t.string('nome_departamento', 255).notNullable();
    t.text('descricao').nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('tb_unidades', (t) => {
    t.bigIncrements('id_unidade').primary();
    t.string('nome_unidade', 255).notNullable();
    t.string('sigla', 20).notNullable().unique();
    t.text('descricao').nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.bigInteger('id_departamento').nullable();
    t.index('nome_unidade');
    t.foreign('id_departamento').references('tb_departamentos.id_departamento');
  });

  await knex.schema.createTable('tb_usuarios', (t) => {
    t.bigIncrements('id_usuario').primary();
    t.string('nome', 255).notNullable();
    t.string('email', 255).notNullable().unique();
    t.string('senha_hash', 255).notNullable();
    t.string('perfil_principal', 50).notNullable();
    t.jsonb('perfis_secundarios').nullable();
    t.bigInteger('id_unidade').nullable();
    t.bigInteger('id_departamento').nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.timestamp('data_ultima_atualizacao').defaultTo(knex.fn.now());
    t.index('email');
    t.index('perfil_principal');
  });

  // 25 estados — vide docs/FLUXO.md
  await knex.schema.createTable('tb_demandas', (t) => {
    t.bigIncrements('id_demanda').primary();
    t.string('numero_demanda', 20).notNullable().unique();
    t.string('titulo', 255).notNullable();
    t.text('descricao').notNullable();
    t.text('justificativa').nullable();

    // Classificação — tipo_solucao: PAINEL_BI, SCRIPT, AGENTE_IA, SISTEMA_SIMPLES, BI_RELATORIO, OUTRO
    t.string('tipo_solucao', 100).notNullable();
    t.string('prioridade', 50).notNullable();
    t.string('categoria', 100).nullable();
    t.decimal('investimento_estimado', 15, 2).nullable();
    t.integer('tempo_estimado_horas').nullable();

    // Formulário estendido
    t.text('objetivo_principal').nullable();
    t.string('publico_alvo', 500).nullable();
    t.string('frequencia_uso', 20).nullable();
    t.integer('quantidade_usuarios_estimada').nullable();
    t.jsonb('dependencias_externas').nullable();
    t.jsonb('dados_tecnicos').nullable();

    // Avaliação de risco
    t.boolean('solucao_em_uso').nullable();
    t.boolean('dados_sensiveis').nullable();
    t.text('dados_sensiveis_desc').nullable();
    t.boolean('impacta_outras_areas').nullable();
    t.text('areas_impactadas').nullable();
    t.boolean('usa_ia_desenvolvimento').nullable();

    // Solicitante (denormalizado para histórico)
    t.bigInteger('id_solicitante').notNullable();
    t.string('nome_solicitante', 255).nullable();
    t.string('email_solicitante', 255).nullable();

    // Unidade / Departamento
    t.bigInteger('id_unidade').notNullable();
    t.string('nome_unidade', 255).nullable();
    t.bigInteger('id_departamento').notNullable();
    t.string('nome_departamento', 255).nullable();

    // Analista STI — Fase 1 e Fase 3
    t.bigInteger('id_analista_sti').nullable();
    t.string('nome_analista_sti', 255).nullable();
    t.bigInteger('id_analista_sti_homologacao').nullable();
    t.string('nome_analista_sti_homologacao', 255).nullable();

    // Responsável pelo deploy — Fase 4 (SELF_DEPLOY = próprio solicitante)
    t.bigInteger('id_responsavel_deploy').nullable();
    t.string('nome_responsavel_deploy', 255).nullable();

    // Roteamento por unidade STI (sem designação individual)
    t.bigInteger('id_unidade_avaliador').nullable();
    t.string('nome_unidade_avaliador', 255).nullable();
    t.bigInteger('id_unidade_producao').nullable();
    t.string('nome_unidade_producao', 255).nullable();

    // Deploy — NULL até homologação; SELF_DEPLOY | OPS_DEPLOY
    t.string('tipo_deploy', 15).nullable();

    // Status (max 60 chars)
    t.string('status_atual', 60).notNullable().defaultTo('DRAFT');

    // Timestamps por fase
    t.timestamp('data_envio_gestor').nullable();
    t.timestamp('data_validacao_gestor').nullable();
    t.timestamp('data_fila_sti').nullable();
    t.timestamp('data_aprovacao_sti').nullable();
    t.timestamp('data_inicio_desenvolvimento').nullable();
    t.timestamp('data_submissao_homologacao').nullable();
    t.timestamp('data_validacao_homologacao_gestor').nullable();
    t.timestamp('data_fila_homologacao_sti').nullable();
    t.timestamp('data_homologacao').nullable();
    t.timestamp('data_inicio_producao').nullable();
    t.timestamp('data_monitoramento').nullable();
    t.timestamp('data_conclusao').nullable();

    // Cancelamento
    t.text('motivo_cancelamento').nullable();
    t.bigInteger('id_usuario_cancelamento').nullable();

    // Anexos e controle
    t.jsonb('anexos').nullable();
    t.string('ip_criacao', 50).nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_exclusao').nullable();
    t.bigInteger('id_usuario_criacao').notNullable();
    t.bigInteger('id_usuario_ultima_atualizacao').nullable();
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.timestamp('data_ultima_atualizacao').defaultTo(knex.fn.now());

    t.index('numero_demanda');
    t.index('id_solicitante');
    t.index('status_atual');
    t.index('id_unidade');
    t.index('data_criacao');
    t.foreign('id_unidade').references('tb_unidades.id_unidade');
    t.foreign('id_departamento').references('tb_departamentos.id_departamento');
  });

  await knex.schema.createTable('tb_historico_decisoes', (t) => {
    t.bigIncrements('id_historico').primary();
    t.bigInteger('id_demanda').notNullable();
    t.string('numero_demanda', 20).notNullable();
    t.bigInteger('id_usuario').notNullable();
    t.string('nome_usuario', 255).notNullable();
    t.string('email_usuario', 255).nullable();
    t.string('perfil_usuario', 100).notNullable();
    t.string('status_anterior', 60).nullable();
    t.string('status_novo', 60).notNullable();
    t.string('tipo_acao', 60).notNullable();
    t.text('parecer').nullable();
    t.text('comentario').nullable();
    t.string('motivo_rejeicao', 200).nullable();
    t.integer('duracao_etapa_dias').nullable();
    t.boolean('sla_em_dia').defaultTo(true);
    t.timestamp('data_hora').defaultTo(knex.fn.now());
    t.string('timezone', 50).defaultTo('America/Sao_Paulo');
    t.string('dia_semana', 20).nullable();
    t.integer('hora_do_dia').nullable();
    t.string('ip_usuario', 45).nullable();
    t.string('user_agent', 500).nullable();
    t.string('endpoint_chamado', 255).nullable();
    t.string('metodo_http', 10).nullable();
    t.bigInteger('id_unidade_demanda').nullable();
    t.string('nome_unidade_demanda', 255).nullable();
    t.jsonb('anexos').nullable();
    t.index('id_demanda');
    t.index('id_usuario');
    t.index('data_hora');
    t.index('status_novo');
    t.index('tipo_acao');
    t.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_notificacoes', (t) => {
    t.bigIncrements('id_notificacao').primary();
    t.bigInteger('id_usuario_destinatario').notNullable();
    t.string('email_destinatario', 255).nullable();
    t.bigInteger('id_demanda').nullable();
    t.string('numero_demanda', 20).nullable();
    t.string('tipo_notificacao', 100).notNullable();
    t.string('titulo_notificacao', 255).notNullable();
    t.text('mensagem_notificacao').nullable();
    t.string('link_acao', 500).nullable();
    t.boolean('lido').defaultTo(false);
    t.timestamp('data_leitura').nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.string('canal_envio', 50).defaultTo('EMAIL');
    t.timestamp('data_envio').nullable();
    t.index('id_usuario_destinatario');
    t.index('id_demanda');
    t.index('lido');
    t.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_atribuicoes_gestor', (t) => {
    t.bigIncrements('id_atribuicao').primary();
    t.bigInteger('id_gestor').notNullable();
    t.string('nome_gestor', 255).nullable();
    t.string('email_gestor', 255).nullable();
    t.string('perfil_gestor', 50).notNullable();
    t.bigInteger('id_unidade').nullable();
    t.bigInteger('id_departamento').nullable();
    t.timestamp('data_inicio').defaultTo(knex.fn.now());
    t.timestamp('data_fim').nullable();
    t.boolean('ativo').defaultTo(true);
    t.bigInteger('id_usuario_criacao').notNullable();
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.unique(['id_gestor', 'id_unidade']);
    t.foreign('id_unidade').references('tb_unidades.id_unidade');
  });

  await knex.schema.createTable('tb_diagnosticos_ia', (t) => {
    t.bigIncrements('id_diagnostico').primary();
    t.bigInteger('id_demanda').notNullable();
    // fase: ANALISE_STI | HOMOLOGACAO_STI
    t.string('fase', 50).notNullable();
    // status_diagnostico: PROCESSANDO | CONCLUIDO | ERRO
    t.string('status_diagnostico', 50).defaultTo('PROCESSANDO');
    t.jsonb('diagnostico').nullable();
    t.string('modelo_ia', 100).nullable();
    t.integer('tokens_usados').nullable();
    t.decimal('custo_usd', 10, 6).nullable();
    t.text('erro').nullable();
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.timestamp('data_conclusao').nullable();
    t.index('id_demanda');
    t.index('fase');
    t.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_inventario_aplicacoes', (t) => {
    t.bigIncrements('id_inventario').primary();
    t.bigInteger('id_demanda').notNullable().unique();
    t.string('numero_demanda', 20).notNullable();
    t.string('nome_aplicacao', 255).notNullable();
    t.text('descricao').nullable();
    // PAINEL_BI | SCRIPT | AGENTE_IA | SISTEMA_SIMPLES | BI_RELATORIO | OUTRO
    t.string('tipo_solucao', 100).notNullable();
    t.bigInteger('id_unidade').notNullable();
    t.string('nome_unidade', 255).nullable();
    t.bigInteger('id_responsavel').notNullable();
    t.string('nome_responsavel', 255).nullable();
    t.string('versao', 50).defaultTo('1.0.0');
    t.text('url_aplicacao').nullable();
    t.text('repositorio_url').nullable();
    t.text('documentacao_url').nullable();
    // status_inventario: ATIVO | DESATIVADO | DESCONTINUADO
    t.string('status_inventario', 50).defaultTo('ATIVO');
    t.timestamp('data_entrada_producao').nullable();
    t.timestamp('data_ultima_revisao').nullable();
    t.text('observacoes').nullable();
    t.boolean('ativo').defaultTo(true);
    t.timestamp('data_criacao').defaultTo(knex.fn.now());
    t.index('id_demanda');
    t.index('id_unidade');
    t.index('status_inventario');
    t.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('email_logs', (t) => {
    t.bigIncrements('id').primary();
    t.string('destinatario', 255).notNullable();
    t.string('assunto', 500).notNullable();
    t.string('status', 20).notNullable();
    t.integer('tentativas').notNullable().defaultTo(1);
    t.text('erro').nullable();
    t.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index('destinatario');
    t.index('status');
    t.index('criado_em');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('email_logs');
  await knex.schema.dropTableIfExists('tb_inventario_aplicacoes');
  await knex.schema.dropTableIfExists('tb_diagnosticos_ia');
  await knex.schema.dropTableIfExists('tb_atribuicoes_gestor');
  await knex.schema.dropTableIfExists('tb_notificacoes');
  await knex.schema.dropTableIfExists('tb_historico_decisoes');
  await knex.schema.dropTableIfExists('tb_demandas');
  await knex.schema.dropTableIfExists('tb_usuarios');
  await knex.schema.dropTableIfExists('tb_unidades');
  await knex.schema.dropTableIfExists('tb_departamentos');
};
