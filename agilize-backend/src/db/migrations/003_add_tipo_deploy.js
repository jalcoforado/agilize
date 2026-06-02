exports.up = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    // NULL até a STI homologar; obrigatório para iniciar Fase 4
    t.string('tipo_deploy', 15).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    t.dropColumn('tipo_deploy');
  });
};
