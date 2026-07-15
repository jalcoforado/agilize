// Testes: Fase 4 — Produção (O-01 a O-04, A-13)
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  avancarParaHOMOLOGADA, MOTIVO_DESATIVACAO,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TF4';
let ctx: ContextoFluxo;
const demandas: Array<number | undefined> = [];

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista, tokens.ops] = await Promise.all([
    login('solicitante'), login('gestor'), login('analista'), login('ops'),
  ]);
  ctx = await criarContextoFluxo(SIGLA);
});

afterAll(async () => {
  for (const id of demandas) await limparDemanda(id);
  await limparContexto({ ...ctx, sigla: SIGLA });
  await db.destroy();
});

// ─── O-01/O-02: Deploy inicial ───────────────────────────────────────────────

describe('O-01/O-02 — Ops inicia deploy', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaHOMOLOGADA(tokens, ctx.idUnidade, ctx.idDept, 'O01 O02 Iniciar Deploy');
    demandas.push(id);
  });

  test('O-01 — demanda aparece em HOMOLOGADA para o Ops', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.ops}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('HOMOLOGADA');
  });

  test('O-02 — HOMOLOGADA → EM_PRODUCAO (ops inicia deploy)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy iniciado pela equipe de Operações STI. Ambiente preparado e validado.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_PRODUCAO');
  });
});

// ─── O-03/O-04: Confirmar deploy e verificar inventário ─────────────────────

describe('O-03/O-04 — Ops confirma deploy e inventário gerado', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaHOMOLOGADA(tokens, ctx.idUnidade, ctx.idDept, 'O03 O04 Confirmar Deploy');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy iniciado pela equipe de Operações STI. Ambiente preparado.' });
  });

  test('O-03 — EM_PRODUCAO → EM_MONITORAMENTO (ops confirma deploy)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/confirmar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy confirmado com sucesso. Solução em monitoramento pela equipe STI.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_MONITORAMENTO');
  });

  test('O-04 — inventário TCE gerado automaticamente ao entrar em EM_MONITORAMENTO', async () => {
    const inventario = await db('tb_inventario_aplicacoes').where('id_demanda', id).first();
    expect(inventario).toBeTruthy();
    expect(inventario?.id_demanda).toBe(id);
  });
});

// ─── A-13: Analista STI desativa solução em EM_MONITORAMENTO ─────────────────

describe('A-13 — Analista STI desativa solução em EM_MONITORAMENTO', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaHOMOLOGADA(tokens, ctx.idUnidade, ctx.idDept, 'A13 Desativar');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy iniciado pela equipe de Operações para teste de desativação.' });
    await request(app).post(`/api/v1/demandas/${id}/confirmar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy confirmado. Solução em monitoramento para fins de teste de desativação.' });
  });

  test('A-13 — EM_MONITORAMENTO → DESATIVADA (analista desativa)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/desativar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ motivo: MOTIVO_DESATIVACAO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DESATIVADA');
  });
});

// ─── O-05/O-06/O-07: Proibições do Ops ──────────────────────────────────────

describe('O-05/O-06/O-07 — Ops não vê nem age fora da Fase 4', () => {
  let idFase1: number;

  beforeAll(async () => {
    // Demanda em FILA_STI (Fase 1) — ops não deve ver/agir
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({
        titulo: `O05 Fila STI Ops — ${Date.now()}`,
        descricao: 'Demanda em Fase 1 usada para testar que o Ops não age nela.',
        tipo_solucao: 'SCRIPT', prioridade: 'MEDIA',
        justificativa: 'Testar restrições de acesso do perfil Ops nas fases anteriores.',
        id_unidade: ctx.idUnidade, id_departamento: ctx.idDept,
        objetivo_principal: 'Verificar que o Ops não pode agir sobre demandas da Fase 1 do fluxo.',
        publico_alvo: 'QA', frequencia_uso: 'PONTUAL', quantidade_usuarios_estimada: 1,
      });
    idFase1 = r.body.demanda?.id_demanda;
    demandas.push(idFase1);
    await request(app).post(`/api/v1/demandas/${idFase1}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('O-06 — Ops não pode aprovar demanda em PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idFase1}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Tentativa de validação indevida pelo Ops nas fases anteriores.' });

    expect([400, 403]).toContain(res.status);
  });

  test('O-07 — Ops não pode alterar dados da demanda', async () => {
    const res = await request(app)
      .put(`/api/v1/demandas/${idFase1}`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({
        titulo: 'Alterado indevidamente pelo Ops',
        descricao: 'Tentativa de alteração de dados pelo Ops que não deve ser permitida.',
        tipo_solucao: 'SCRIPT', prioridade: 'MEDIA',
        justificativa: 'Alteração indevida.',
        id_unidade: ctx.idUnidade, id_departamento: ctx.idDept,
        objetivo_principal: 'Testar que o Ops não pode editar dados de demanda.',
        publico_alvo: 'QA', frequencia_uso: 'PONTUAL', quantidade_usuarios_estimada: 1,
      });

    expect([400, 403]).toContain(res.status);
  });
});
