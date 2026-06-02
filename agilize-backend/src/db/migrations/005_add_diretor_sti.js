exports.up = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    t.bigInteger('id_diretor_sti').nullable();
    t.string('nome_diretor_sti', 255).nullable();
    t.bigInteger('id_diretor_sti_homologacao').nullable();
    t.string('nome_diretor_sti_homologacao', 255).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    t.dropColumn('id_diretor_sti');
    t.dropColumn('nome_diretor_sti');
    t.dropColumn('id_diretor_sti_homologacao');
    t.dropColumn('nome_diretor_sti_homologacao');
  });
};
