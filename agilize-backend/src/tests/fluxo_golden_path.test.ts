// Testes de Fluxo Completo — Golden Path (F-01 a F-05)
// Cada describe representa um cenário end-to-end independente
import { login } from './helpers';
import {
  request, app, db,
  criarContextoFluxo, limparContexto, limparDemanda,
  demandaPayload,
  PARECER, PARECER_GESTOR, PARECER_STI, PARECER_HOMOLOGACAO, MOTIVO_CANCELAMENTO,
  criarAvaliadorTecnico, limparUsuario,
  type ContextoFluxo,
} from './setup_helpers';

const tokens: Record<string, string> = {};
const SIGLA = 'TGP';
let ctx: ContextoFluxo;
const demandas: Array<number | undefined> = [];
let emailAvaliador: string;
let idAvaliador: number;

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista, tokens.ops] = await Promise.all([
    login('solicitante'), login('gestor'), login('analista'), login('ops'),
  ]);
  tokens.admin = await login('admin');
  ctx = await criarContextoFluxo(SIGLA);

  const dir = await criarAvaliadorTecnico(tokens.admin);
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

// ─── F-01: Golden Path completo sem intercorrências ──────────────────────────
// DRAFT → PENDENTE_GESTOR → VALIDADA_GESTOR → FILA_STI → APROVADA_STI →
// EM_DESENVOLVIMENTO → SUBMETIDO_HOMOLOGACAO → VALIDADA_HOMOLOGACAO_GESTOR →
// FILA_HOMOLOGACAO_STI → HOMOLOGADA → EM_PRODUCAO → EM_MONITORAMENTO

describe('F-01 — Aprovação completa sem intercorrências', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'F01 Golden Path'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
  });

  test('DRAFT criado com sucesso', async () => {
    expect(id).toBeTruthy();
    const res = await request(app).get(`/api/v1/demandas/${id}`).set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.body.demanda.status_atual).toBe('DRAFT');
  });

  test('DRAFT → PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('PENDENTE_GESTOR → VALIDADA_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_GESTOR');
  });

  test('VALIDADA_GESTOR → FILA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('FILA_STI → APROVADA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });

  test('APROVADA_STI → EM_DESENVOLVIMENTO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_DESENVOLVIMENTO');
  });

  test('EM_DESENVOLVIMENTO → SUBMETIDO_HOMOLOGACAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/submeter-produto`)
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({ parecer: 'Produto desenvolvido e entregue. Pronto para homologação pela STI Governança.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SUBMETIDO_HOMOLOGACAO');
  });

  test('SUBMETIDO_HOMOLOGACAO → VALIDADA_HOMOLOGACAO_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-homologacao-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_HOMOLOGACAO_GESTOR');
  });

  test('VALIDADA_HOMOLOGACAO_GESTOR → FILA_HOMOLOGACAO_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-homologacao-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_HOMOLOGACAO_STI');
  });

  test('FILA_HOMOLOGACAO_STI → HOMOLOGADA', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/homologar`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_HOMOLOGACAO, tipo_deploy: 'OPS_DEPLOY' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('HOMOLOGADA');
  });

  test('HOMOLOGADA → EM_PRODUCAO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy iniciado pela equipe de Operações. Ambiente configurado e pronto.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_PRODUCAO');
  });

  test('EM_PRODUCAO → EM_MONITORAMENTO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/confirmar-deploy`)
      .set('Authorization', `Bearer ${tokens.ops}`)
      .send({ parecer: 'Deploy confirmado com sucesso. Solução em operação e monitoramento.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('EM_MONITORAMENTO');
  });

  test('F-01 — inventário TCE gerado automaticamente', async () => {
    const inventario = await db('tb_inventario_aplicacoes').where('id_demanda', id).first();
    expect(inventario).toBeTruthy();
  });
});

// ─── F-02: Com devolução pelo Gestor na Fase 1 ────────────────────────────────

describe('F-02 — Gestor devolve → Solicitante ajusta → Gestor valida → Segue fluxo', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'F02 Com Devolucao Gestor'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('Gestor devolve → DEVOLVIDA_AJUSTES', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/devolver`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Demanda devolvida para revisão da justificativa técnica e alinhamento com os objetivos.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DEVOLVIDA_AJUSTES');
  });

  test('Solicitante inicia ajuste → SOLICITANTE_AJUSTANDO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-ajuste`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });

  test('Solicitante reenvia ao gestor → PENDENTE_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('Gestor valida → VALIDADA_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_GESTOR');
  });

  test('Gestor envia à STI → FILA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });
});

// ─── F-03: Com encaminhamento ao Avaliador Técnico ───────────────────────────

describe('F-03 — Analista encaminha ao Avaliador Técnico → Avaliador devolve → Analista aprova', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'F03 Avaliador Tecnico'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('Analista encaminha ao Avaliador Técnico → AGUARDANDO_AVALIADOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/encaminhar-avaliador-tecnico`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ comentario: 'Encaminhado para revisão do Avaliador Técnico.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('AGUARDANDO_AVALIADOR');
  });

  test('Avaliador Técnico devolve ao analista → FILA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/avaliador-devolver-analista`)
      .set('Authorization', `Bearer ${tokens.avaliador}`)
      .send({ parecer: 'Demanda revisada. Devolvida ao analista para conclusão da análise de viabilidade.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('Analista aprova após retorno do Avaliador Técnico → APROVADA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});

// ─── F-04: Com ajustes STI e ciclo completo (regra central) ──────────────────

describe('F-04 — STI solicita ajustes → Solicitante ajusta → Gestor revalida → STI aprova', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'F04 Ajustes STI Ciclo'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
    await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  });

  test('STI solicita ajustes → SOLICITADO_AJUSTES_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/solicitar-ajustes-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Necessário detalhar a arquitetura técnica e especificar as dependências do sistema.' });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITADO_AJUSTES_STI');
  });

  test('Solicitante inicia ajuste → SOLICITANTE_AJUSTANDO', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/iniciar-ajuste`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });

  test('F-04 (regra N-PSI-016) — Solicitante envia ao GESTOR (não direto à STI)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('Gestor revalida → VALIDADA_GESTOR', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: PARECER_GESTOR });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_GESTOR');
  });

  test('Gestor envia à STI → FILA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('STI aprova → APROVADA_STI', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: PARECER_STI });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});

// ─── F-05: Cancelamento pelo Gestor em PENDENTE_GESTOR ───────────────────────

describe('F-05 — Gestor cancela demanda em PENDENTE_GESTOR → CANCELADA (terminal)', () => {
  let id: number;

  beforeAll(async () => {
    const r = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send(demandaPayload(ctx.idUnidade, ctx.idDept, 'F05 Cancelamento Gestor'));
    id = r.body.demanda?.id_demanda;
    demandas.push(id);
    await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  test('Gestor cancela → CANCELADA', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/cancelar`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ motivo: MOTIVO_CANCELAMENTO });
    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('CANCELADA');
  });

  test('Demanda CANCELADA aparece como terminal — não há transições disponíveis', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
    // Deve rejeitar: não é possível sair de CANCELADA
    expect([400, 409]).toContain(res.status);
  });

  test('Demanda CANCELADA — tentativa de aprovação pela STI também bloqueada', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${id}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Tentativa de aprovação de demanda cancelada.' });
    expect([400, 403, 409]).toContain(res.status);
  });
});
