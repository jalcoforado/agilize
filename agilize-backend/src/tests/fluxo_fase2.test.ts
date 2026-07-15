// Testes: Fase 2 — Desenvolvimento (S-15 a S-20) e regra central R-02
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  demandaPayload, avancarParaAPROVADA_STI,
  PARECER_GESTOR, MOTIVO_CANCELAMENTO,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TF2';
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

// ─── S-15 / S-16: APROVADA_STI → EM_DESENVOLVIMENTO ─────────────────────────

describe('S-15/S-16 — Iniciar Desenvolvimento', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAPROVADA_STI(tokens, ctx.idUnidade, ctx.idDept, 'S15 Desenvolvimento');
    demandas.push(id);
  });

  test('S-15 — demanda em APROVADA_STI existe e permite iniciar desenvolvimento', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });

  test('S-16 — APROVADA_STI → EM_DESENVOLVIMENTO (iniciar-desenvolvimento)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_DESENVOLVIMENTO');
  });
});

// ─── S-17: EM_DESENVOLVIMENTO → SUBMETIDO_HOMOLOGACAO ────────────────────────

describe('S-17 — Submeter produto para homologação', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAPROVADA_STI(tokens, ctx.idUnidade, ctx.idDept, 'S17 Submeter');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('S-17 — EM_DESENVOLVIMENTO → SUBMETIDO_HOMOLOGACAO (submeter-produto)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto desenvolvido e pronto para homologação pela STI Governança.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
  });
});

// ─── S-18: Cancelar em EM_DESENVOLVIMENTO ────────────────────────────────────

describe('S-18 — Cancelar demanda em EM_DESENVOLVIMENTO', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAPROVADA_STI(tokens, ctx.idUnidade, ctx.idDept, 'S18 Cancelar Desenv');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('S-18 — cancelamento disponível em EM_DESENVOLVIMENTO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });
});

// ─── S-19: Cancelar em SUBMETIDO_HOMOLOGACAO ─────────────────────────────────

describe('S-19 — Cancelar demanda em SUBMETIDO_HOMOLOGACAO', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAPROVADA_STI(tokens, ctx.idUnidade, ctx.idDept, 'S19 Cancelar Submetido');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto submetido para homologação nos testes automatizados Jest.' });
  });

  test('S-19 — cancelamento disponível em SUBMETIDO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });
});

// ─── S-20: NÃO deve cancelar após SUBMETIDO_HOMOLOGACAO (Gestor validou) ─────

describe('S-20 — Cancelamento bloqueado após gestor validar homologação', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAPROVADA_STI(tokens, ctx.idUnidade, ctx.idDept, 'S20 Cancelar Bloqueado');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto submetido e validado pelo gestor nos testes automatizados.' });
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
  });

  test('S-20 — cancelamento rejeitado após VALIDADA_HOMOLOGACAO_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect([400, 409]).toContain(res.status);
    expect(res.body.demanda?.status_atual).not.toBe('CANCELADA');
  });
});

// ─── R-02: Após ajuste STI, deve voltar ao GESTOR (não direto à STI) ─────────

describe('R-02 — Após ajuste solicitado pela STI, solicitante vai ao gestor (não à STI)', () => {
  let id: number;

  beforeAll(async () => {
    // Avança até FILA_STI e STI solicita ajustes → SOLICITANTE_AJUSTANDO
    const r1 = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'R02 Regra Central'));
    id = r1.body.demanda?.id_demanda;
    demandas.push(id);

    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
    await request(app).post(`/api/v1/demandas/${id}/solicitar-ajustes-sti`).set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Solicitamos ajustes técnicos na proposta: especificar tecnologias utilizadas e volumetria.' });
    await request(app).post(`/api/v1/demandas/${id}/iniciar-ajuste`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('R-02 — status atual deve ser SOLICITANTE_AJUSTANDO', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });

  test('R-02 — reenviar ao GESTOR (não direto à STI) → PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('R-02 — solicitante NÃO pode ir direto à FILA_STI estando em PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect([400, 403]).toContain(res.status);
  });
});
