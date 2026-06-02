const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const jaExiste = await knex('tb_usuarios').where('email', 'diretor@agilize.com.br').first();
  if (jaExiste) return;

  const senhaHash = await bcrypt.hash('senha123', 10);

  const unidSti = await knex('tb_unidades').where('sigla', 'STI-GOV').first();

  await knex('tb_usuarios').insert({
    nome: 'Roberto Menezes',
    email: 'diretor@agilize.com.br',
    cpf: '12345678910',
    senha_hash: senhaHash,
    perfil_principal: 'DIRETOR_STI',
    id_unidade: unidSti?.id_unidade || null,
    ativo: true,
  });
};
