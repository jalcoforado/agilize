// Dropa e recria o schema público, apagando todas as tabelas e sequences.
// Chamado por db:reset — o backup dos seeds já foi feito antes deste script.
require('dotenv').config();
const knex = require('knex')(require('../../../knexfile').development);

knex.raw('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  .then(() => { console.log('[reset] Schema recriado.'); })
  .catch(err => { console.error('[reset] Erro:', err.message); process.exit(1); })
  .finally(() => knex.destroy());
