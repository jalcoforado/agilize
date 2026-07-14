// agilize-backend/src/tests/fluxo_dpo.test.ts
// Testes: DPO (P-01 a P-09)
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  demandaPayload,
  avancarParaAGUARDANDO_DPO, avancarParaAGUARDANDO_DPO_HOMOLOGACAO,
  PARECER_GESTOR,
  criarDPO, limparUsuario,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TDPO';
let ctx: ContextoFluxo;
let idDpo: number;
let emailDpo: string;
let tokenDpo: string;
const demandas: Array<number | undefined> = [];

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista] = await Promise.all([
    login('solicitante'), login('gestor'), login('analista'),
  ]);
  ctx = await criarContextoFluxo(SIGLA);
  const admin = await login('admin');
  const dpoInfo = await criarDPO(admin);
  idDpo = dpoInfo.idDpo;
  emailDpo = dpoInfo.email;
  tokenDpo = dpoInfo.token;
});

afterAll(async () => {
  for (const id of demandas) await limparDemanda(id);
  await limparContexto({ ...ctx, sigla: SIGLA });
  await limparUsuario(emailDpo);
  await db.destroy();
});

// ─── P-01: Auto-routing para AGUARDANDO_DPO quando dados_sensiveis=true ─────

describe('P-01 — Auto-routing para AGUARDANDO_DPO quando dados_sensiveis=true', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO(tokens, ctx.idUnidade, ctx.idDept, 'P01 Auto DPO');
    demandas.push(id);
  });

  test('P-01 — demanda com dados_sensiveis=true vai para AGUARDANDO_DPO ao enviar para STI', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AGUARDANDO_DPO');
    expect(res.body.demanda.id_dpo).toBeTruthy();
  });

  test('P-01 — demanda SEM dados_sensiveis vai direto para FILA_STI', async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'P01 Sem Dados Sensiveis'));
    const idSem = r.body.demanda?.id_demanda;
    demandas.push(idSem);

    await request(app).post(`/api/v1/demandas/${idSem}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${idSem}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${idSem}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);

    const res = await request(app)
      .get(`/api/v1/demandas/${idSem}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });
});

// ─── P-02: DPO aprova → FILA_STI (Fase 1) ────────────────────────────────────

describe('P-02 — DPO aprova demanda (Fase 1) → FILA_STI', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO(tokens, ctx.idUnidade, ctx.idDept, 'P02 DPO Aprovar');
    demandas.push(id);
  });

  test('P-02 — AGUARDANDO_DPO → FILA_STI após DPO aprovar', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/dpo-aprovar`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Dados sensíveis verificados e conformes com a LGPD. Aprovado para análise STI.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });
});

// ─── P-03: DPO solicita ajustes → SOLICITANTE_AJUSTANDO (Fase 1) ─────────────

describe('P-03 — DPO solicita ajustes (Fase 1) → SOLICITANTE_AJUSTANDO', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO(tokens, ctx.idUnidade, ctx.idDept, 'P03 DPO Ajustes');
    demandas.push(id);
  });

  test('P-03 — AGUARDANDO_DPO → SOLICITANTE_AJUSTANDO após DPO solicitar ajustes', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/dpo-solicitar-ajustes`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Necessário detalhar o mapeamento dos dados sensíveis e a base legal do tratamento conforme LGPD.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });
});

// ─── P-04: Analista encaminha manualmente ao DPO de FILA_STI ─────────────────

describe('P-04 — Analista encaminha manualmente ao DPO a partir de FILA_STI', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'P04 Encaminhar Manual DPO'));
    id = r.body.demanda?.id_demanda;
    if (!id) throw new Error(`Falha ao criar demanda: ${JSON.stringify(r.body)}`);
    demandas.push(id);

    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('P-04 — demanda vai para FILA_STI (dados_sensiveis=false)', async () => {
    const res = await request(app).get(`/api/v1/demandas/${id}`).set('Authorization', `Bearer ${tokens.analista}`);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('P-04 — Analista encaminha manualmente ao DPO → AGUARDANDO_DPO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/encaminhar-dpo`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ id_dpo: idDpo, comentario: 'Identificei possível tratamento de dados pessoais não declarado.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AGUARDANDO_DPO');
    expect(Number(res.body.demanda.id_dpo)).toBe(Number(idDpo));
  });
});

// ─── P-05: Auto-routing para AGUARDANDO_DPO_HOMOLOGACAO (Fase 3) ──────────────

describe('P-05 — Auto-routing para AGUARDANDO_DPO_HOMOLOGACAO na Fase 3', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO_HOMOLOGACAO(tokens, idDpo, ctx.idUnidade, ctx.idDept, tokenDpo, 'P05 DPO Hom Auto');
    demandas.push(id);
  });

  test('P-05 — produto com dados_sensiveis=true vai para AGUARDANDO_DPO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokenDpo}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AGUARDANDO_DPO_HOMOLOGACAO');
    expect(res.body.demanda.id_dpo_homologacao).toBeTruthy();
  });
});

// ─── P-06: DPO aprova homologação → FILA_HOMOLOGACAO_STI ─────────────────────

describe('P-06 — DPO aprova homologação (Fase 3) → FILA_HOMOLOGACAO_STI', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO_HOMOLOGACAO(tokens, idDpo, ctx.idUnidade, ctx.idDept, tokenDpo, 'P06 DPO Hom Aprovar');
    demandas.push(id);
  });

  test('P-06 — AGUARDANDO_DPO_HOMOLOGACAO → FILA_HOMOLOGACAO_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/dpo-aprovar`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Produto verificado. Tratamento de dados sensíveis conforme LGPD. Aprovado para homologação STI.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });
});

// ─── P-07: DPO solicita ajustes na homologação → AJUSTANDO_HOMOLOGACAO ────────

describe('P-07 — DPO solicita ajustes (Fase 3) → AJUSTANDO_HOMOLOGACAO', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_DPO_HOMOLOGACAO(tokens, idDpo, ctx.idUnidade, ctx.idDept, tokenDpo, 'P07 DPO Hom Ajustes');
    demandas.push(id);
  });

  test('P-07 — AGUARDANDO_DPO_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/dpo-solicitar-ajustes`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Produto não possui política de retenção de dados. Necessário ajustar antes de homologar.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AJUSTANDO_HOMOLOGACAO');
  });
});

// ─── P-08/P-09: Restrições e proibições do DPO ───────────────────────────────

describe('P-08/P-09 — DPO não pode agir fora do seu escopo', () => {
  let idAguardando: number;
  let idFilaSTI: number;

  beforeAll(async () => {
    idAguardando = await avancarParaAGUARDANDO_DPO(tokens, ctx.idUnidade, ctx.idDept, 'P08 DPO Escopo');
    demandas.push(idAguardando);

    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'P09 Fila STI Sem DPO'));
    idFilaSTI = r.body.demanda?.id_demanda;
    demandas.push(idFilaSTI);
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('P-08 — DPO não pode aprovar STI diretamente', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idAguardando}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Tentativa indevida.' });

    expect([400, 403]).toContain(res.status);
  });

  test('P-09 — DPO não pode agir em demanda em FILA_STI (não-designada)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idFilaSTI}/dpo-aprovar`)
      .set('Authorization', `Bearer ${tokenDpo}`)
      .send({ parecer: 'Tentativa indevida em demanda sem DPO.' });

    expect([400, 403, 409]).toContain(res.status);
  });
});
