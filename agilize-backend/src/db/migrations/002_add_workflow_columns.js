// Tabelas de suporte ao workflow: checklists, diagnósticos IA e inventário TCE
exports.up = async function(knex) {
  await knex.schema.createTable('tb_checklists', (table) => {
    table.bigIncrements('id_checklist').primary();
    table.bigInteger('id_demanda').notNullable();
    // fase: ANALISE_STI | HOMOLOGACAO_STI | DEPLOY
    table.string('fase', 50).notNullable();
    // status_checklist: PENDENTE | EM_ANDAMENTO | CONCLUIDO
    table.string('status_checklist', 50).defaultTo('PENDENTE');
    table.bigInteger('id_usuario_responsavel').nullable();
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.timestamp('data_conclusao').nullable();
    table.index('id_demanda');
    table.index('fase');
    table.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  await knex.schema.createTable('tb_checklist_itens', (table) => {
    table.bigIncrements('id_item').primary();
    table.bigInteger('id_checklist').notNullable();
    table.text('descricao').notNullable();
    table.boolean('obrigatorio').defaultTo(true);
    table.integer('ordem').defaultTo(0);
    table.index('id_checklist');
    table.foreign('id_checklist').references('tb_checklists.id_checklist');
  });

  await knex.schema.createTable('tb_checklist_respostas', (table) => {
    table.bigIncrements('id_resposta').primary();
    table.bigInteger('id_checklist').notNullable();
    table.bigInteger('id_item').notNullable();
    table.bigInteger('id_usuario').notNullable();
    // resposta: SIM | NAO | NAO_APLICAVEL
    table.string('resposta', 20).notNullable();
    table.text('observacao').nullable();
    table.timestamp('data_resposta').defaultTo(knex.fn.now());
    table.unique(['id_checklist', 'id_item']);
    table.foreign('id_checklist').references('tb_checklists.id_checklist');
    table.foreign('id_item').references('tb_checklist_itens.id_item');
  });

  // Diagnóstico assíncrono gerado por Claude ao entrar em FILA_STI ou FILA_HOMOLOGACAO_STI
  await knex.schema.createTable('tb_diagnosticos_ia', (table) => {
    table.bigIncrements('id_diagnostico').primary();
    table.bigInteger('id_demanda').notNullable();
    // fase: ANALISE_STI | HOMOLOGACAO_STI
    table.string('fase', 50).notNullable();
    // status_diagnostico: PROCESSANDO | CONCLUIDO | ERRO
    table.string('status_diagnostico', 50).defaultTo('PROCESSANDO');
    table.jsonb('diagnostico').nullable();
    table.string('modelo_ia', 100).nullable();
    table.integer('tokens_usados').nullable();
    table.decimal('custo_usd', 10, 6).nullable();
    table.text('erro').nullable();
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.timestamp('data_conclusao').nullable();
    table.index('id_demanda');
    table.index('fase');
    table.foreign('id_demanda').references('tb_demandas.id_demanda');
  });

  // Criado automaticamente ao confirmar deploy (EM_PRODUCAO → EM_MONITORAMENTO)
  await knex.schema.createTable('tb_inventario_aplicacoes', (table) => {
    table.bigIncrements('id_inventario').primary();
    table.bigInteger('id_demanda').notNullable().unique();
    table.string('numero_demanda', 20).notNullable();
    table.string('nome_aplicacao', 255).notNullable();
    table.text('descricao').nullable();
    // PAINEL_BI | SCRIPT | AGENTE_IA | SISTEMA_SIMPLES | OUTRO
    table.string('tipo_solucao', 100).notNullable();
    table.bigInteger('id_unidade').notNullable();
    table.string('nome_unidade', 255).nullable();
    table.bigInteger('id_responsavel').notNullable();
    table.string('nome_responsavel', 255).nullable();
    table.string('versao', 50).defaultTo('1.0.0');
    table.text('url_aplicacao').nullable();
    table.text('repositorio_url').nullable();
    table.text('documentacao_url').nullable();
    // status_inventario: ATIVO | DESATIVADO | DESCONTINUADO
    table.string('status_inventario', 50).defaultTo('ATIVO');
    table.timestamp('data_entrada_producao').nullable();
    table.timestamp('data_ultima_revisao').nullable();
    table.text('observacoes').nullable();
    table.boolean('ativo').defaultTo(true);
    table.timestamp('data_criacao').defaultTo(knex.fn.now());
    table.index('id_demanda');
    table.index('id_unidade');
    table.index('status_inventario');
    table.foreign('id_demanda').references('tb_demandas.id_demanda');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('tb_inventario_aplicacoes');
  await knex.schema.dropTableIfExists('tb_diagnosticos_ia');
  await knex.schema.dropTableIfExists('tb_checklist_respostas');
  await knex.schema.dropTableIfExists('tb_checklist_itens');
  await knex.schema.dropTableIfExists('tb_checklists');
};
