require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const { request, app, db } = require('./helpers');

afterAll(async () => db.destroy());

describe('POST /api/v1/auth/login', () => {
  test('login com credenciais válidas retorna token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jorge@agilize.com.br', senha: 'senha123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario.email).toBe('jorge@agilize.com.br');
  });

  test('login com senha errada retorna 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jorge@agilize.com.br', senha: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login com email inexistente retorna 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'naoexiste@agilize.com.br', senha: 'qualquer' });

    expect(res.status).toBe(401);
  });

  test('login sem campos obrigatórios retorna 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jorge@agilize.com.br' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/refresh-token', () => {
  test('refresh com token válido retorna novo token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'jorge@agilize.com.br', senha: 'senha123' });
    const token = loginRes.body.token;

    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('refresh sem token retorna 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token');
    expect(res.status).toBe(401);
  });
});

describe('Rota protegida sem token', () => {
  test('GET /api/v1/demandas sem token retorna 401', async () => {
    const res = await request(app).get('/api/v1/demandas');
    expect(res.status).toBe(401);
  });
});
