// Adiciona colunas de registro do DPO em tb_demandas (Fase 1 e Fase 3)
exports.up = async function (knex) {
  await knex.schema.alterTable('tb_demandas', (t) => {
    t.bigInteger('id_dpo').nullable().after('nome_analista_sti_homologacao');
    t.string('nome_dpo', 255).nullable().after('id_dpo');
    t.bigInteger('id_dpo_homologacao').nullable().after('nome_dpo');
    t.string('nome_dpo_homologacao', 255).nullable().after('id_dpo_homologacao');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('tb_demandas', (t) => {
    t.dropColumn('id_dpo');
    t.dropColumn('nome_dpo');
    t.dropColumn('id_dpo_homologacao');
    t.dropColumn('nome_dpo_homologacao');
  });
};
