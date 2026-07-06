// Testes: Avaliador Técnico (D-01 a D-08)
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  demandaPayload, avancarParaAPROVADA_STI, avancarParaSUBMETIDO_HOMOLOGACAO,
  PARECER, PARECER_GESTOR, PARECER_STI,
  criarAvaliadorTecnico, limparUsuario,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TDIR';
let ctx: ContextoFluxo;
let idAvaliador: number;
let emailAvaliador: string;
const demandas: Array<number | undefined> = [];

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista] = await Promise.all([
    login('solicitante'), login('gestor'), login('analista'),
  ]);
  ctx = await criarContextoFluxo(SIGLA);

  // Avaliador Técnico não tem seed — criamos via admin API
  const admin = await login('admin');
  const dir = await criarAvaliadorTecnico(admin);
  idAvaliador = dir.idAvaliador;
  emailAvaliador = dir.email;
  tokens.avaliador = dir.token;
});

afterAll(async () => {
  for (const id of demandas) await limparDemanda(id);
  await limparContexto({ ...ctx, sigla: SIGLA });
  await limparUsuario(emailAvaliador);
  await db.destroy();
});

// ─── Helper: avança demanda até AGUARDANDO_AVALIADOR ───────────────────────────

async function avancarParaAGUARDANDO_AVALIADOR(titulo: string): Promise<number> {
  const r = await request(app)
    .post('/api/v1/demandas')
    .set('Authorization', `Bearer ${tokens.solicitante}`)
    .send(demandaPayload(ctx.idUnidade, ctx.idDept, titulo));
  const id = r.body.demanda?.id_demanda;
  if (!id) throw new Error(`Falha ao criar demanda: ${JSON.stringify(r.body)}`);

  await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
    .send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  await request(app).post(`/api/v1/demandas/${id}/encaminhar-avaliador-tecnico`).set('Authorization', `Bearer ${tokens.analista}`)
    .send({ comentario: 'Encaminhado ao Avaliador Técnico para revisão superior.' });

  return id;
}

async function avancarParaAGUARDANDO_AVALIADOR_HOMOLOGACAO(titulo: string): Promise<number> {
  const id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, ctx.idUnidade, ctx.idDept, titulo);
  await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
    .set('Authorization', `Bearer ${tokens.gestor}`).send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
    .set('Authorization', `Bearer ${tokens.gestor}`);
  await request(app).post(`/api/v1/demandas/${id}/encaminhar-avaliador-tecnico`)
    .set('Authorization', `Bearer ${tokens.analista}`)
    .send({ comentario: 'Encaminhado ao Avaliador Técnico para revisão da homologação.' });
  return id;
}

// ─── D-01: Avaliador Técnico só vê AGUARDANDO_AVALIADOR ────────────────────────

describe('D-01 — Avaliador Técnico só vê demandas aguardando sua revisão', () => {
  let idDir: number;

  beforeAll(async () => {
    idDir = await avancarParaAGUARDANDO_AVALIADOR('D01 Avaliador Ver');
    demandas.push(idDir);
  });

  test('D-01 — demanda encaminhada está em AGUARDANDO_AVALIADOR', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${idDir}`)
      .set('Authorization', `Bearer ${tokens.avaliador}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AGUARDANDO_AVALIADOR');
  });

  test('D-01 — listagem do Avaliador Técnico inclui a demanda encaminhada', async () => {
    const res = await request(app)
      .get('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.avaliador}`);

    expect(res.status).toBe(200);
    const ids = res.body.demandas.map((d: { id_demanda: number }) => d.id_demanda);
    expect(ids).toContain(idDir);
  });
});

// ─── D-02: Avaliador Técnico devolve ao Analista (Fase 1) ────────────────────

describe('D-02 — Avaliador Técnico devolve ao analista (Fase 1)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_AVALIADOR('D02 Devolver Analista');
    demandas.push(id);
  });

  test('D-02 — AGUARDANDO_AVALIADOR → FILA_STI (Avaliador Técnico devolve ao analista)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/avaliador-devolver-analista`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Demanda devolvida ao analista para complementação da análise técnica de viabilidade.',
        comentario: 'Revisar análise de impacto.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('D-02 — demanda volta a aparecer na fila do analista após devolução', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });
});

// ─── D-03: Avaliador Técnico solicita ajustes ao solicitante (Fase 1) ─────────

describe('D-03 — Avaliador Técnico solicita ajustes ao solicitante (Fase 1)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_AVALIADOR('D03 Avaliador Ajustes Solicitante');
    demandas.push(id);
  });

  test('D-03 — AGUARDANDO_AVALIADOR → SOLICITANTE_AJUSTANDO (Avaliador Técnico solicita ajustes)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/avaliador-solicitar-ajustes`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Necessário detalhar melhor o impacto organizacional e o retorno esperado desta solução.',
        comentario: 'Complementar justificativa com métricas.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });
});

// ─── D-04: Avaliador Técnico devolve ao Analista (Fase 3) ────────────────────

describe('D-04 — Avaliador Técnico devolve ao analista (Fase 3 — homologação)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_AVALIADOR_HOMOLOGACAO('D04 Devolver Analista Homologacao');
    demandas.push(id);
  });

  test('D-04 — AGUARDANDO_AVALIADOR_HOMOLOGACAO → FILA_HOMOLOGACAO_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/avaliador-devolver-analista`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Produto devolvido ao analista para complementação da análise de homologação técnica.',
        comentario: 'Revisar critérios de aceitação.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });
});

// ─── D-05: Avaliador Técnico solicita ajustes ao solicitante (Fase 3) ─────────

describe('D-05 — Avaliador Técnico solicita ajustes ao solicitante (Fase 3)', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_AVALIADOR_HOMOLOGACAO('D05 Avaliador Ajustes Solicitante Hom');
    demandas.push(id);
  });

  test('D-05 — AGUARDANDO_AVALIADOR_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/avaliador-solicitar-ajustes`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Necessário complementar documentação técnica do produto e evidências de testes realizados.',
        comentario: 'Adicionar manual do usuário.',
      });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AJUSTANDO_HOMOLOGACAO');
  });
});

// ─── D-06/D-07/D-08: Proibições do Avaliador Técnico ─────────────────────────

describe('D-06/D-07/D-08 — Avaliador Técnico não pode aprovar, homologar nem agir fora do seu escopo', () => {
  let idFilaSTI: number;
  let idAguardando: number;

  beforeAll(async () => {
    // Demanda em FILA_STI (não encaminhada ao Avaliador Técnico)
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'D08 Fila STI Sem Avaliador'));
    idFilaSTI = r.body.demanda?.id_demanda;
    demandas.push(idFilaSTI);
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${idFilaSTI}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);

    // Demanda aguardando o Avaliador Técnico (para testar D-06 e D-07)
    idAguardando = await avancarParaAGUARDANDO_AVALIADOR('D06 D07 Nao Aprovar');
    demandas.push(idAguardando);
  });

  test('D-06 — Avaliador Técnico não pode aprovar demanda (endpoint aprovar-sti bloqueado)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idAguardando}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({ parecer: 'Tentativa indevida de aprovação pelo Avaliador Técnico.' });

    expect([400, 403]).toContain(res.status);
  });

  test('D-07 — Avaliador Técnico não pode enviar demanda para fila de produção', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idAguardando}/iniciar-deploy`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({ parecer: 'Tentativa indevida de deploy pelo Avaliador Técnico.' });

    expect([400, 403]).toContain(res.status);
  });

  test('D-08 — Avaliador Técnico não pode agir em demanda em FILA_STI (não encaminhada a ele)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idFilaSTI}/avaliador-devolver-analista`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Tentativa indevida de devolução pelo Avaliador Técnico em demanda que não lhe foi encaminhada.',
      });

    // Deve falhar: demanda não está em AGUARDANDO_AVALIADOR
    expect([400, 403, 409]).toContain(res.status);
  });
});

// ─── A-08: Após devolução do Avaliador Técnico, demanda volta à fila do analista

describe('A-08 — Demanda volta à FILA_STI após devolução do Avaliador Técnico', () => {
  let id: number;

  beforeAll(async () => {
    id = await avancarParaAGUARDANDO_AVALIADOR('A08 Avaliador Devolver Volta Fila');
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/avaliador-devolver-analista`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({
        parecer: 'Demanda devolvida ao analista para nova análise completa da viabilidade técnica.',
      });
  });

  test('A-08 — demanda volta a FILA_STI e analista pode agir novamente', async () => {
    const res = await request(app)
      .get(`/api/v1/demandas/${id}`)
      .set('Authorization', `Bearer ${tokens.analista}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('A-08 — analista consegue aprovar após retorno do Avaliador Técnico', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});
