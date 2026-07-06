import dotenv from 'dotenv';
import request from 'supertest';
import type { Knex } from 'knex';

dotenv.config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

// app e db são carregados via require APÓS configurar o ambiente, garantindo que
// NODE_ENV='test' esteja definido antes de o app inicializar (imports são içados).
const app = require('../index').default;
const db = require('../db/connection').default as Knex;

const USUARIOS_TESTE = {
  solicitante: { email: 'jorge@agilize.com.br', senha: 'senha123' },
  gestor: { email: 'maria@agilize.com.br', senha: 'senha123' },
  analista: { email: 'joao@agilize.com.br', senha: 'senha123' },
  ops: { email: 'carlos@agilize.com.br', senha: 'senha123' },
  admin: { email: 'admin@agilize.com.br', senha: 'senha123' },
};

async function login(perfil: keyof typeof USUARIOS_TESTE): Promise<string> {
  const creds = USUARIOS_TESTE[perfil];
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  if (!res.body.token) throw new Error(`Login falhou para ${perfil}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

export { request, app, db, login, USUARIOS_TESTE };
