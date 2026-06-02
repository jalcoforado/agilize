require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');
const db = require('../db/connection');

const USUARIOS_TESTE = {
  solicitante: { email: 'jorge@agilize.com.br', senha: 'senha123' },
  gestor:      { email: 'maria@agilize.com.br', senha: 'senha123' },
  analista:    { email: 'joao@agilize.com.br',  senha: 'senha123' },
  ops:         { email: 'carlos@agilize.com.br', senha: 'senha123' },
  admin:       { email: 'admin@agilize.com.br', senha: 'senha123' },
};

async function login(perfil) {
  const creds = USUARIOS_TESTE[perfil];
  const res = await request(app).post('/api/v1/auth/login').send(creds);
  if (!res.body.token) throw new Error(`Login falhou para ${perfil}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

module.exports = { request, app, db, login, USUARIOS_TESTE };
