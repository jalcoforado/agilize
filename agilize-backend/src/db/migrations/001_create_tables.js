exports.up = async function(knex) {
  await knex.schema.createTable('tb_unidades', (table) => {
    table.bigIncrements('id_unidade').primary();
    table.string('nome_unidade', 255).notNullable();
    table.string('sigla', 20).notNullable().unique();
    table.text('descricao').nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.index('nome_unidade');
  });

  await knex.schema.createTable('tb_departamentos', (table) => {
    table.bigIncrements('id_departamento').primary();
    table.string('nome_departamento', 255).notNullable();
    table.bigInteger('id_unidade').notNullable();
    table.text('descricao').nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.foreign('id_unidade').references('tb_unidades.id_unidade');
  });

  await knex.schema.createTable('tb_usuarios', (table) => {
    table.bigIncrements('id_usuario').primary();
    table.string('nome', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('cpf', 11).unique();
    table.string('senha_hash', 255).notNullable();
    table.string('perfil_principal', 50).notNullable();
    table.jsonb('perfis_secundarios').nullable();
    table.bigInteger('id_unidade').nullable();
    table.bigInteger('id_departamento').nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.timestamp('data_ultima_atualizacao').defaultTo(knex.fn.now());
    table.index('email');
    table.index('perfil_principal');
  });

  // 23 estados: DRAFT, PENDENTE_GESTOR, DEVOLVIDA_AJUSTES, SOLICITANTE_AJUSTANDO,
  // VALIDADA_GESTOR, FILA_STI, SOLICITADO_AJUSTES_STI, APROVADA_STI, REPROVADA_STI,
  // EM_DESENVOLVIMENTO, SUBMETIDO_HOMOLOGACAO,
  // VALIDADA_HOMOLOGACAO_GESTOR, DEVOLVIDA_HOMOLOGACAO, AJUSTANDO_HOMOLOGACAO,
  // FILA_HOMOLOGACAO_STI, SOLICITADO_AJUSTES_HOMOLOGACAO, HOMOLOGADA, REJEITADA,
  // EM_PRODUCAO, EM_MONITORAMENTO, CANCELADA, DESATIVADA
  await knex.schema.createTable('tb_demandas', (table) => {
    table.bigIncrements('id_demanda').primary();
    table.string('numero_demanda', 20).notNullable().unique();
    table.string('titulo', 255).notNullable();
    table.text('descricao').notNullable();
    table.text('justificativa').nullable();

    // Classificação — tipo_solucao: PAINEL_BI, SCRIPT, AGENTE_IA, SISTEMA_SIMPLES, OUTRO
    table.string('tipo_solucao', 100).notNullable();
    table.string('prioridade', 50).notNullable();
    table.string('categoria', 100).nullable();
    table.decimal('investimento_estimado', 15, 2).nullable();
    table.integer('tempo_estimado_horas').nullable();

    // Solicitante (denormalizado para histórico)
    table.bigInteger('id_solicitante').notNullable();
    table.string('nome_solicitante', 255).nullable();
    table.string('email_solicitante', 255).nullable();

    // Unidade / Departamento
    table.bigInteger('id_unidade').notNullable();
    table.string('nome_unidade', 255).nullable();
    table.bigInteger('id_departamento').notNullable();
    table.string('nome_departamento', 255).nullable();

    // Gestor Unidade (Fase 1 e 3 — mesmo gestor)
    table.bigInteger('id_gestor_unidade').nullable();
    table.string('nome_gestor_unidade', 255).nullable();

    // Analista STI — Fase 1: Análise
    table.bigInteger('id_analista_sti').nullable();
    table.string('nome_analista_sti', 255).nullable();

    // Analista STI — Fase 3: Homologação
    table.bigInteger('id_analista_sti_homologacao').nullable();
    table.string('nome_analista_sti_homologacao', 255).nullable();

    // Deploy — Fase 4
    table.bigInteger('id_analista_deploy').nullable();
    table.string('nome_analista_deploy', 255).nullable();

    // Status (max 60 chars — SOLICITADO_AJUSTES_HOMOLOGACAO = 30 chars)
    table.string('status_atual', 60).notNullable().defaultTo('DRAFT');

    // Timestamps por fase
    table.timestamp('data_envio_gestor').nullable();
    table.timestamp('data_validacao_gestor').nullable();
    table.timestamp('data_fila_sti').nullable();
    table.timestamp('data_aprovacao_sti').nullable();
    table.timestamp('data_inicio_desenvolvimento').nullable();
    table.timestamp('data_submissao_homologacao').nullable();
    table.timestamp('data_validacao_homologacao_gestor').nullable();
    table.timestamp('data_fila_homologacao_sti').nullable();
    table.timestamp('data_homologacao').nullable();
    table.timestamp('data_inicio_producao').nullable();
    table.timestamp('data_monitoramento').nullable();
    table.timestamp('data_conclusao').nullable();

    // Cancelamento / Desativação
    table.text('motivo_cancelamento').nullable();
    table.bigInteger('id_usuario_cancelamento').nullable();

    // Controle
    table.string('ip_criacao', 50).nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_exclusao').nullable();

    // Rastreamento
    table.bigInteger('id_usuario_criacao').notNullable();
    table.bigInteger('id_usuario_ultima_atualizacao').nullable();
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.timestamp('data_ultima_atualizacao').defaultTo(knex.fn.now());

    table.index('numero_demanda');
    table.index('id_solicitante');
    table.index('id_gestor_unidade');
    table.index('status_atual');
    table.index('id_unidade');
    table.index('data_criacao');
    table.foreign('id_unidade').references('tb_unidades.id_unidade');
    table.foreign('id_departamento').references('tb_departamentos.id_departamento');
  });

  await knex.schema.createTable('tb_historico_decisoes', (table) => {
    table.bigIncrements('id_historico').primary();
    table.bigInteger('id_demanda').notNullable();
    table.string('numero_demanda', 20).notNullable();
    table.bigInteger('id_usuario').notNullable();
    table.string('nome_usuario', 255).notNullable();
    table.string('email_usuario', 255).nullable();
    table.string('perfil_usuario', 100).notNullable();
    table.string('status_anterior', 60).nullable();
    table.string('status_novo', 60).notNullable();
    table.string('tipo_acao', 60).notNullable();
    table.text('parecer').nullable();
    table.text('comentario').nullable();
    table.string('motivo_rejeicao', 200).nullable();
    table.integer('duracao_etapa_dias').nullable();
    table.boolean('sla_em_dia').defaultTo(true);
    table.timestamp('data_hora').defaultTo(knex.fn.now());
    table.string('timezone', 50).defaultTo('America/Sao_Paulo');
    table.string('dia_semana', 20).nullable();
    table.integer('hora_do_dia').nullable();
    table.string('ip_usuario', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.string('endpoint_chamado', 255).nullable();
    table.string('metodo_http', 10).nullable();
    table.bigInteger('id_unidade_demanda').nullable();
    table.string('nome_unidade_demanda', 255).nullable();
    table.index('id_demanda');
    table.index('id_usuario');
    table.index('data_hora');
    table.index('status_novo');
    table.index('tipo_acao');
    table.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_notificacoes', (table) => {
    table.bigIncrements('id_notificacao').primary();
    table.bigInteger('id_usuario_destinatario').notNullable();
    table.string('email_destinatario', 255).nullable();
    table.bigInteger('id_demanda').nullable();
    table.string('numero_demanda', 20).nullable();
    table.string('tipo_notificacao', 100).notNullable();
    table.string('titulo_notificacao', 255).notNullable();
    table.text('mensagem_notificacao').nullable();
    table.string('link_acao', 500).nullable();
    table.boolean('lido').defaultTo(false);
    table.timestamp('data_leitura').nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.string('canal_envio', 50).defaultTo('EMAIL');
    table.timestamp('data_envio').nullable();
    table.index('id_usuario_destinatario');
    table.index('id_demanda');
    table.index('lido');
    table.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_atribuicoes_gestor', (table) => {
    table.bigIncrements('id_atribuicao').primary();
    table.bigInteger('id_gestor').notNullable();
    table.string('nome_gestor', 255).nullable();
    table.string('email_gestor', 255).nullable();
    table.string('perfil_gestor', 50).notNullable();
    table.bigInteger('id_unidade').nullable();
    table.bigInteger('id_departamento').nullable();
    table.timestamp('data_inicio').defaultTo(knex.fn.now());
    table.timestamp('data_fim').nullable();
    table.boolean('ativo').defaultTo(true);
    table.bigInteger('id_usuario_criacao').notNullable();
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.unique(['id_gestor', 'id_unidade']);
    table.foreign('id_unidade').references('tb_unidades.id_unidade');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('tb_atribuicoes_gestor');
  await knex.schema.dropTableIfExists('tb_notificacoes');
  await knex.schema.dropTableIfExists('tb_historico_decisoes');
  await knex.schema.dropTableIfExists('tb_demandas');
  await knex.schema.dropTableIfExists('tb_usuarios');
  await knex.schema.dropTableIfExists('tb_departamentos');
  await knex.schema.dropTableIfExists('tb_unidades');
};
