exports.up = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    t.text('objetivo_principal').nullable();
    t.string('publico_alvo', 500).nullable();
    t.string('frequencia_uso', 20).nullable();
    t.integer('quantidade_usuarios_estimada').nullable();
    t.jsonb('dependencias_externas').nullable();
    t.jsonb('dados_tecnicos').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.table('tb_demandas', (t) => {
    t.dropColumn('objetivo_principal');
    t.dropColumn('publico_alvo');
    t.dropColumn('frequencia_uso');
    t.dropColumn('quantidade_usuarios_estimada');
    t.dropColumn('dependencias_externas');
    t.dropColumn('dados_tecnicos');
  });
};
