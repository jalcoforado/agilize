import knex, { Knex } from 'knex';

// O knexfile permanece em JavaScript (decisão de projeto) e fica fora de rootDir,
// por isso é carregado via require em vez de import estático.
const config = require('../../knexfile') as Record<string, Knex.Config>;

const env = process.env.NODE_ENV === 'test' ? 'development' : process.env.NODE_ENV || 'development';
const db: Knex = knex(config[env]);

export default db;
