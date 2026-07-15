require('dotenv').config();

const production = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false }
  },
  migrations: {
    directory: './src/db/migrations'
  }
};

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'agilize_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'agilize_db'
    },
    migrations: {
      directory: './src/db/migrations'
    },
    seeds: {
      directory: './src/db/seeds'
    }
  },
  production,
  // Mesma conexão de produção, mas aponta para os seeds de estrutura organizacional
  // (departamentos + unidades reais) — idempotentes e seguros de rodar em produção.
  // Uso: npm run db:seed-estrutura-producao
  producao_seed: {
    ...production,
    seeds: {
      directory: './src/db/seeds-producao'
    }
  }
};
