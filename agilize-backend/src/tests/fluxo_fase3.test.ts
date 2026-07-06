// Testes: Fase 3 — Homologação (G-11 a G-14, S-21 a S-23, A-09 a A-12, R-04)
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  avancarParaSUBMETIDO_HOMOLOGACAO,
  PARECER_GESTOR, PARECER_HOMOLOGACAO,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TF3';
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

// ─── G-11/G-12: Gestor recebe SUBMETIDO_HOMOLOGACAO — devolver ───────────────

describe('G-11/G-12 — Gestor devolve produto (DEVOLVIDA_HOMOLOGACAO)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'G11 G12 Devolucao Homologacao');
    demandas.push(id);
  });

  test('G-11 — demanda existe em SUBMETIDO_HOMOLOGACAO (pendente gestor de homologação)', async () => {
    // Usa analista (ACESSO_TOTAL) para confirmar o estado; gestor é bloqueado pelo middleware
    // de leitura (verifica id_unidade do perfil, não a atribuição) — comportamento atual do sistema
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
  });

  test('G-12 — SUBMETIDO_HOMOLOGACAO → DEVOLVIDA_HOMOLOGACAO (gestor devolve)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/devolver-homologacao`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Produto devolvido para ajustes. Faltam evidências de testes realizados pelo solicitante.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DEVOLVIDA_HOMOLOGACAO');
  });
});

// ─── G-13/G-14: Gestor valida e envia para STI ───────────────────────────────

describe('G-13/G-14 — Gestor valida e encaminha para STI de homologação', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'G13 G14 Validar Homologacao');
    demandas.push(id);
  });

  test('G-13 — SUBMETIDO_HOMOLOGACAO → VALIDADA_HOMOLOGACAO_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_HOMOLOGACAO_GESTOR');
  });

  test('G-14 — VALIDADA_HOMOLOGACAO_GESTOR → FILA_HOMOLOGACAO_STI (gestor envia)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });
});

// ─── S-21/S-22: Devolução de homologação e reenvio pelo solicitante ──────────

describe('S-21/S-22 — Solicitante ajusta e reenvia após devolução de homologação', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'S21 S22 Ajuste Homologacao');
    demandas.push(id);
    // Gestor devolve
    await request(app).post(`/api/v1/demandas/${id}/devolver-homologacao`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Produto devolvido para ajustes técnicos antes de prosseguir com a homologação.' });
  });

  test('S-21 — DEVOLVIDA_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO (iniciar-ajuste-homologacao)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-ajuste-homologacao`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AJUSTANDO_HOMOLOGACAO');
  });

  test('S-22 — AJUSTANDO_HOMOLOGACAO → SUBMETIDO_HOMOLOGACAO (submissão direta ao gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto ajustado e pronto para nova revisão pela equipe gestora da unidade.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
  });
});

// ─── S-23: Ajuste solicitado pela STI na homologação ─────────────────────────

describe('S-23 — STI solicita ajustes na homologação → Solicitante ajusta → Gestor', () => {
  let id: number;

  beforeAll(async () => {
    // Avança até FILA_HOMOLOGACAO_STI
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'S23 Ajuste STI Homologacao');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    // STI solicita ajustes
    await request(app).post(`/api/v1/demandas/${id}/solicitar-ajustes-homologacao`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Produto necessita de ajustes: documentação de testes incompleta e volumetria não informada.' });
  });

  test('S-23 — SOLICITADO_AJUSTES_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-ajuste-homologacao`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AJUSTANDO_HOMOLOGACAO');
  });

  test('S-23a — AJUSTANDO_HOMOLOGACAO → SUBMETIDO_HOMOLOGACAO (submissão direta ao gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto corrigido com todos os ajustes solicitados pela STI Governança.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
  });
});

// ─── A-09/A-10: STI homologa produto ─────────────────────────────────────────

describe('A-09/A-10 — Analista STI homologa produto', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'A09 A10 Homologar');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-09 — demanda em FILA_HOMOLOGACAO_STI visível ao analista', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });

  test('A-10 — FILA_HOMOLOGACAO_STI → HOMOLOGADA (analista homologa)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/homologar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_HOMOLOGACAO, tipo_deploy: 'OPS_DEPLOY' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('HOMOLOGADA');
  });
});

// ─── A-11: STI solicita ajustes na homologação ───────────────────────────────

describe('A-11 — Analista STI solicita ajustes de homologação', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'A11 Solicitar Ajustes Hom');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-11 — FILA_HOMOLOGACAO_STI → SOLICITADO_AJUSTES_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/solicitar-ajustes-homologacao`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Produto necessita de ajustes: adicionar documentação de instalação e configuração do ambiente.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITADO_AJUSTES_HOMOLOGACAO');
  });
});

// ─── A-12: Rejeição do produto na homologação (FILA_HOMOLOGACAO_STI → REJEITADA) ─

describe('A-12 — Analista STI rejeita produto na homologação (REJEITADA terminal)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'A12 Rejeitar Homologacao');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('A-12 — FILA_HOMOLOGACAO_STI → REJEITADA (rejeitar)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/rejeitar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({
        motivo_rejeicao: 'Produto não atende os requisitos técnicos aprovados na Fase 1: arquitetura incompatível com a infraestrutura do TCE-CE.',
        parecer: 'Produto rejeitado na homologação. A implementação diverge significativamente da especificação aprovada.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('REJEITADA');
  });

  test('A-12 — demanda REJEITADA na homologação é estado terminal', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/homologar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Tentativa de homologar após rejeição — deve ser bloqueada.', tipo_deploy: 'OPS_DEPLOY' });

    expect([400, 403, 409]).toContain(res.status);
  });
});

// ─── G-15: SOLICITADO_AJUSTES_HOMOLOGACAO → FILA_HOMOLOGACAO_STI (reenvio Gestor) ─

describe('G-15 — Gestor reenvio direto de homologação (reenviar-homologacao-sti)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'G15 Reenvio Homologacao');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    await request(app).post(`/api/v1/demandas/${id}/solicitar-ajustes-homologacao`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Produto necessita de ajustes: adicionar documentação de segurança e evidências de testes de carga.' });
  });

  test('G-15 — SOLICITADO_AJUSTES_HOMOLOGACAO → FILA_HOMOLOGACAO_STI (reenviar-homologacao-sti)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/reenviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });

  test('G-15 — após reenvio, analista pode homologar normalmente', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/homologar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_HOMOLOGACAO, tipo_deploy: 'OPS_DEPLOY' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('HOMOLOGADA');
  });
});

// ─── R-04: Após ajuste homologação, deve voltar ao GESTOR (não direto à STI) ─

describe('R-04 — Após AJUSTANDO_HOMOLOGACAO vai a SUBMETIDO_HOMOLOGACAO (não FILA_HOMOLOGACAO_STI)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, 'R04 Regra Central Hom');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    await request(app).post(`/api/v1/demandas/${id}/solicitar-ajustes-homologacao`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Ajustes necessários: revisar critérios de segurança e acessibilidade da solução.' });
    await request(app).post(`/api/v1/demandas/${id}/iniciar-ajuste-homologacao`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('R-04 — submeter produto vai a SUBMETIDO_HOMOLOGACAO (passa pelo gestor, não direto à STI)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto ajustado e pronto para nova revisão completa pelo gestor da unidade.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
    // Confirmar que NÃO foi direto à FILA_HOMOLOGACAO_STI
    expect(res.body.demanda.status_atual).not.toBe('FILA_HOMOLOGACAO_STI');
  });

  test('R-04 — solicitante NÃO pode enviar direto à fila STI de homologação', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect([400, 403]).toContain(res.status);
  });
});
