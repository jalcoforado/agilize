require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const knex = require('knex');
const knexConfig = require('../../knexfile');

module.exports = async () => {
  const db = knex(knexConfig.development);
  await db.raw('SELECT 1'); // verifica conexão
  await db.destroy();
};
