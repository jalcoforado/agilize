import dotenv from 'dotenv';
import knex from 'knex';

dotenv.config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const knexConfig = require('../../knexfile');

export = async (): Promise<void> => {
  const db = knex(knexConfig.development);
  await db.raw('SELECT 1'); // verifica conexão
  await db.destroy();
};
