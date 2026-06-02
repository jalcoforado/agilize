require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const { request, app, db, login } = require('./helpers');

let tokenSolicitante;
let idDemandaCriada;

beforeAll(async () => {
  tokenSolicitante = await login('solicitante');
});

afterAll(async () => {
  if (idDemandaCriada) {
    await db('tb_notificacoes').where('id_demanda', idDemandaCriada).del().catch(() => {});
    await db('tb_historico_decisoes').where('id_demanda', idDemandaCriada).del().catch(() => {});
    await db('tb_demandas').where('id_demanda', idDemandaCriada).del().catch(() => {});
  }
  await db.destroy();
});

describe('POST /api/v1/demandas — criar demanda', () => {
  test('cria demanda com dados válidos', async () => {
    const res = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .send({
        titulo: 'Teste de integração automatizado Jest',
        descricao: 'Demanda criada pelo Jest para validar o fluxo de criação via API. Esta descrição tem mais de 50 caracteres.',
        tipo_solucao: 'SCRIPT',
        prioridade: 'MEDIA',
        justificativa: 'Validar fluxo de criação via API nos testes automatizados.',
        id_unidade: 1,
        id_departamento: 1,
        objetivo_principal: 'Automatizar o processo de teste de integração da API do sistema Agilize.',
        publico_alvo: 'Equipe de desenvolvimento e QA',
        frequencia_uso: 'DIARIO',
        quantidade_usuarios_estimada: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.demanda).toBeDefined();
    expect(res.body.demanda.status_atual).toBe('DRAFT');
    idDemandaCriada = res.body.demanda.id_demanda;
  });

  test('criação sem título retorna 400', async () => {
    const res = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokenSolicitante}`)
      .send({ descricao: 'Sem título definido', tipo_solucao: 'SCRIPT', prioridade: 'MEDIA' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/demandas — listar', () => {
  test('retorna lista com paginação', async () => {
    const res = await request(app)
      .get('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokenSolicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.demandas)).toBe(true);
  });

  test('filtro por status retorna apenas demandas do status', async () => {
    const res = await request(app)
      .get('/api/v1/demandas?status=DRAFT')
      .set('Authorization', `Bearer ${tokenSolicitante}`);

    expect(res.status).toBe(200);
    if (res.body.demandas.length > 0) {
      res.body.demandas.forEach((d) => expect(d.status_atual).toBe('DRAFT'));
    }
  });
});

describe('GET /api/v1/demandas/:id — obter', () => {
  test('retorna demanda existente', async () => {
    if (!idDemandaCriada) return;
    const res = await request(app)
      .get(`/api/v1/demandas/${idDemandaCriada}`)
      .set('Authorization', `Bearer ${tokenSolicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.id_demanda).toBe(idDemandaCriada);
  });

  test('demanda inexistente retorna 404', async () => {
    const res = await request(app)
      .get('/api/v1/demandas/99999999')
      .set('Authorization', `Bearer ${tokenSolicitante}`);

    expect(res.status).toBe(404);
  });
});
