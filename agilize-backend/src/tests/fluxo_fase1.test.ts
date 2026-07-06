// Testes: Fase 1 — Solicitação (S-01 a S-08, G-01 a G-06, A-01 a A-03)
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  demandaPayload,
  PARECER_GESTOR, PARECER_STI, MOTIVO_REJEICAO, MOTIVO_CANCELAMENTO,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TF1';
let ctx: ContextoFluxo;
const demandas: Array<number | undefined> = [];

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista] = await Promise.all([
    login('solicitante'), login('gestor'), login('analista'),
  ]);
  ctx = await criarContextoFluxo(SIGLA);
});

afterAll(async () => {
  for (const id of demandas) await limparDemanda(id);
  await limparContexto({ ...ctx, sigla: SIGLA });
  await db.destroy();
});

// ─── S-01/S-02: DRAFT → PENDENTE_GESTOR ─────────────────────────────────────

describe('S-01/S-02 — Solicitante cria demanda e envia ao Gestor', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'S01 S02 Draft Gestor'));
    id = r.body.demanda?.id_demanda;
    if (!id) throw new Error(`Falha ao criar demanda: ${JSON.stringify(r.body)}`);
    demandas.push(id);
  });

  test('S-01 — demanda criada em status DRAFT', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DRAFT');
  });

  test('S-02 — DRAFT → PENDENTE_GESTOR (enviar-gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('S-02 — solicitante NÃO pode enviar direto para STI (regra N-PSI-016)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect([400, 403]).toContain(res.status);
  });
});

// ─── G-01/G-02: PENDENTE_GESTOR → VALIDADA_GESTOR → FILA_STI ────────────────

describe('G-01/G-02 — Gestor valida e encaminha para STI', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'G01 G02 Validar Gestor'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('G-01 — PENDENTE_GESTOR → VALIDADA_GESTOR (validar-gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_GESTOR');
  });

  test('G-02 — VALIDADA_GESTOR → FILA_STI (enviar-sti pelo gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });
});

// ─── A-01: FILA_STI → APROVADA_STI ──────────────────────────────────────────

describe('A-01 — Analista STI aprova demanda', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'A01 Aprovar STI'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-01 — FILA_STI → APROVADA_STI (aprovar-sti)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});

// ─── G-03/S-05/S-06: Devolução e reenvio pelo Solicitante ───────────────────

describe('G-03/S-05/S-06 — Gestor devolve; Solicitante ajusta e reenvia ao Gestor', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'G03 S05 S06 Devolucao'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('G-03 — PENDENTE_GESTOR → DEVOLVIDA_AJUSTES (devolver)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/devolver`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Demanda devolvida para revisão da justificativa técnica e alinhamento de escopo com a N-PSI-016.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DEVOLVIDA_AJUSTES');
  });

  test('S-05 — DEVOLVIDA_AJUSTES → SOLICITANTE_AJUSTANDO (iniciar-ajuste)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-ajuste`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });

  test('S-06 — SOLICITANTE_AJUSTANDO → PENDENTE_GESTOR (enviar-gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });
});

// ─── G-05: PENDENTE_GESTOR → REJEITADA (terminal) ───────────────────────────

describe('G-05 — Gestor rejeita demanda (estado terminal REJEITADA)', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'G05 Rejeitar Gestor'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('G-05 — PENDENTE_GESTOR → REJEITADA (rejeitar-gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/rejeitar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({
        motivo_rejeicao: MOTIVO_REJEICAO,
        parecer: 'Demanda rejeitada: não atende os critérios mínimos definidos pela N-PSI-016 para soluções setoriais leves.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('REJEITADA');
  });

  test('G-05 — demanda REJEITADA é estado terminal (enviar-gestor deve falhar)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect([400, 409]).toContain(res.status);
  });
});

// ─── A-02: FILA_STI → REPROVADA_STI (terminal) ───────────────────────────────

describe('A-02 — Analista STI reprova demanda (estado terminal REPROVADA_STI)', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'A02 Reprovar STI'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-02 — FILA_STI → REPROVADA_STI (reprovar-sti)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/reprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({
        motivo_rejeicao: MOTIVO_REJEICAO,
        parecer: 'Demanda reprovada pela STI: solução não é viável com a infraestrutura disponível e apresenta riscos de segurança não mitigáveis.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('REPROVADA_STI');
  });

  test('A-02 — demanda REPROVADA_STI é estado terminal (aprovar-sti deve falhar)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Tentativa de aprovação após reprovação — deve ser bloqueada.' });

    expect([400, 403, 409]).toContain(res.status);
  });
});

// ─── A-03/G-06: FILA_STI → SOLICITADO_AJUSTES_STI → reenvio direto Gestor ──

describe('A-03/G-06 — STI solicita ajustes; Gestor reenvio direto (reenviar-sti)', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'A03 G06 Ajuste STI Reenvio'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-03 — FILA_STI → SOLICITADO_AJUSTES_STI (solicitar-ajustes-sti)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/solicitar-ajustes-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Necessário detalhar a arquitetura técnica, especificar tecnologias utilizadas e mapear volumetria de dados.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITADO_AJUSTES_STI');
  });

  test('G-06 — SOLICITADO_AJUSTES_STI → FILA_STI via reenviar-sti (shortcut do Gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/reenviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('G-06 — após reenvio-sti, analista pode aprovar normalmente', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});

// ─── S-07: Cancelamento em DRAFT ────────────────────────────────────────────

describe('S-07 — Solicitante cancela demanda em DRAFT', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'S07 Cancelar Draft'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
  });

  test('S-07 — cancelamento disponível em DRAFT', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });
});

// ─── S-08: Cancelamento em PENDENTE_GESTOR pelo Solicitante ─────────────────

describe('S-08 — Solicitante cancela demanda em PENDENTE_GESTOR', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'S08 Cancelar Pendente'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('S-08 — cancelamento disponível em PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });
});

// ─── A-04: Cancelamento em FILA_STI pelo Analista ───────────────────────────

describe('A-04 — Analista STI cancela demanda em FILA_STI', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'A04 Cancelar FilaSTI'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-04 — cancelamento disponível em FILA_STI pelo Analista', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });
});
