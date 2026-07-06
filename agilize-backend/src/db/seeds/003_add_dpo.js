const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const jaExiste = await knex('tb_usuarios').where('email', 'dpo@agilize.com.br').first();
  if (jaExiste) return;

  const senhaHash = await bcrypt.hash('senha123', 10);

  await knex('tb_usuarios').insert({
    nome: 'Beatriz Almeida',
    email: 'dpo@agilize.com.br',
    senha_hash: senhaHash,
    perfil_principal: 'DPO',
    id_unidade: null,
    ativo: true,
  });
};
