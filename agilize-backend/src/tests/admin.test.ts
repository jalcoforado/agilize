// Testes: GESTOR_SISTEMA / Admin (AD-01 a AD-09)
import { login } from './helpers';
import { request, app, db } from './setup_helpers';

let tokenAdmin: string;
let tokenSolicitante: string;

// IDs criados durante os testes, para cleanup
let idUsuarioCriado: number | undefined;
let emailUsuarioCriado: string;

beforeAll(async () => {
  [tokenAdmin, tokenSolicitante] = await Promise.all([login('admin'), login('solicitante')]);
});

afterAll(async () => {
  if (idUsuarioCriado) {
    await db('tb_usuarios').where('id_usuario', idUsuarioCriado).del().catch(() => {});
  }
  await db.destroy();
});

// ─── AD-01: Admin acessa painel de administração ──────────────────────────────

describe('AD-01 — Admin acessa painel de usuários', () => {
  test('AD-01 — GET /admin/usuarios retorna lista de usuários para o admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.usuarios)).toBe(true);
    expect(res.body.usuarios.length).toBeGreaterThan(0);
  });
});

// ─── AD-02: Admin cria novo usuário ───────────────────────────────────────────

describe('AD-02 — Admin cria novo usuário', () => {
  test('AD-02 — cria usuário com qualquer perfil', async () => {
    emailUsuarioCriado = `jest-admin-${Date.now()}@agilize.com.br`;
    const res = await request(app)
      .post('/api/v1/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Usuário Criado por Jest',
        email: emailUsuarioCriado,
        senha: 'Senha123Jest',
        perfil_principal: 'GESTOR_UNIDADE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.usuario.email).toBe(emailUsuarioCriado);
    expect(res.body.usuario.perfil_principal).toBe('GESTOR_UNIDADE');
    idUsuarioCriado = res.body.usuario.id_usuario;
  });

  test('AD-02 — não permite criar usuário com email duplicado', async () => {
    const res = await request(app)
      .post('/api/v1/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Duplicado Jest',
        email: emailUsuarioCriado,
        senha: 'Senha123Jest',
        perfil_principal: 'SOLICITANTE',
      });

    expect([400, 409]).toContain(res.status);
  });

  test('AD-02 — não permite criar usuário com senha fraca', async () => {
    const res = await request(app)
      .post('/api/v1/admin/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nome: 'Senha Fraca Jest',
        email: `fraca-${Date.now()}@agilize.com.br`,
        senha: '1234',
        perfil_principal: 'SOLICITANTE',
      });

    expect([400, 422]).toContain(res.status);
  });
});

// ─── AD-03: Admin edita perfil de usuário ─────────────────────────────────────

describe('AD-03 — Admin edita perfil de usuário existente', () => {
  test('AD-03 — altera perfil do usuário criado para ANALISTA_STI', async () => {
    if (!idUsuarioCriado) return;
    const res = await request(app)
      .put(`/api/v1/admin/usuarios/${idUsuarioCriado}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ perfil_principal: 'ANALISTA_STI' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.usuario.perfil_principal).toBe('ANALISTA_STI');
  });

  test('AD-03 — não permite perfil inválido', async () => {
    if (!idUsuarioCriado) return;
    const res = await request(app)
      .put(`/api/v1/admin/usuarios/${idUsuarioCriado}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ perfil_principal: 'PERFIL_INEXISTENTE' });

    expect([400, 422]).toContain(res.status);
  });
});

// ─── AD-04: Admin desativa usuário ────────────────────────────────────────────

describe('AD-04 — Admin desativa usuário, que não consegue mais logar', () => {
  test('AD-04 — desativa o usuário criado', async () => {
    if (!idUsuarioCriado) return;
    const res = await request(app)
      .patch(`/api/v1/admin/usuarios/${idUsuarioCriado}/ativo`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ativo).toBe(false);
  });

  test('AD-04 — usuário desativado não consegue fazer login', async () => {
    if (!emailUsuarioCriado) return;
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: emailUsuarioCriado, senha: 'Senha123Jest' });

    expect([401, 403]).toContain(res.status);
  });
});

// ─── AD-05: Admin vê todas as demandas ────────────────────────────────────────

describe('AD-05 — Admin vê todas as demandas de todas as unidades', () => {
  test('AD-05 — listagem do admin retorna demandas', async () => {
    const res = await request(app)
      .get('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.demandas)).toBe(true);
  });
});

// ─── AD-07: Histórico registra cada transição ─────────────────────────────────

describe('AD-07 — Histórico registra transições com ator, ação e data', () => {
  let idDemanda: number | undefined;

  beforeAll(async () => {
    const tokenSol = await login('solicitante');
    const r1 = await request(app)
      .get('/api/v1/admin/unidades')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const unidades = r1.body.unidades || [];
    if (!unidades.length) return;

    const r2 = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokenSol}`)
      .send({
        titulo: `AD07 Historico Jest — ${Date.now()}`,
        descricao: 'Demanda criada para verificar o registro do histórico de tramitação.',
        tipo_solucao: 'SCRIPT', prioridade: 'MEDIA',
        justificativa: 'Verificar que o histórico registra ator, ação e data de cada transição.',
        id_unidade: unidades[0].id_unidade,
        id_departamento: null,
        objetivo_principal: 'Garantir rastreabilidade das decisões no histórico do sistema Agilize.',
        publico_alvo: 'QA', frequencia_uso: 'PONTUAL', quantidade_usuarios_estimada: 1,
      });
    idDemanda = r2.body.demanda?.id_demanda;
    if (idDemanda) {
      await request(app).post(`/api/v1/demandas/${idDemanda}/enviar-gestor`)
        .set('Authorization', `Bearer ${tokenSol}`);
    }
  });

  afterAll(async () => {
    if (idDemanda) {
      await db('tb_notificacoes').where('id_demanda', idDemanda).del().catch(() => {});
      await db('tb_historico_decisoes').where('id_demanda', idDemanda).del().catch(() => {});
      await db('tb_demandas').where('id_demanda', idDemanda).del().catch(() => {});
    }
  });

  test('AD-07 — histórico da demanda contém entrada com ator, ação e data', async () => {
    if (!idDemanda) return;
    const res = await request(app)
      .get(`/api/v1/demandas/${idDemanda}/historico`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.historico.length).toBeGreaterThan(0);

    const entrada = res.body.historico[0];
    expect(entrada).toHaveProperty('id_usuario');
    expect(entrada).toHaveProperty('tipo_acao');
    expect(entrada).toHaveProperty('status_novo');
    expect(entrada).toHaveProperty('data_decisao');
  });
});

// ─── AD-08/AD-09: Histórico não pode ser apagado ─────────────────────────────

describe('AD-08/AD-09 — Histórico de decisões não pode ser deletado', () => {
  let idHistorico: number | string | undefined;

  beforeAll(async () => {
    const entrada = await db('tb_historico_decisoes').orderBy('id_historico', 'desc').first();
    idHistorico = entrada?.id_historico;
  });

  test('AD-08 — não existe endpoint DELETE para histórico de decisões', async () => {
    if (!idHistorico) return;
    const res = await request(app)
      .delete(`/api/v1/demandas/historico/${idHistorico}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    // Endpoint não existe: 404 ou 405
    expect([404, 405]).toContain(res.status);
  });

  test('AD-09 — entrada de histórico permanece no banco após tentativa de deleção', async () => {
    if (!idHistorico) return;
    const entrada = await db('tb_historico_decisoes').where('id_historico', idHistorico).first();
    expect(entrada).toBeTruthy();
  });

  test('AD-09 — não-admin não pode deletar histórico (sem endpoint disponível)', async () => {
    if (!idHistorico) return;
    const res = await request(app)
      .delete(`/api/v1/demandas/historico/${idHistorico}`)
      .set('Authorization', `Bearer ${tokenSolicitante}`);

    expect([401, 403, 404, 405]).toContain(res.status);
  });
});
