require('dotenv').config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

const { request, app, db, login } = require('./helpers');

let tokens = {};
let idDemanda;
let idUnidadeTeste;
let idDeptTeste;
let idAtribuicaoTeste;

beforeAll(async () => {
  [tokens.solicitante, tokens.gestor, tokens.analista] = await Promise.all([
    login('solicitante'),
    login('gestor'),
    login('analista'),
  ]);

  // Criar unidade e departamento de teste se não existirem
  let unidade = await db('tb_unidades').where('sigla', 'TEST').first();
  if (!unidade) {
    const [row] = await db('tb_unidades').insert({
      nome_unidade: 'Unidade Teste Jest',
      sigla: 'TEST',
      ativo: true,
    }).returning('id_unidade');
    idUnidadeTeste = row.id_unidade;
  } else {
    idUnidadeTeste = unidade.id_unidade;
  }

  let dept = await db('tb_departamentos').where('nome_departamento', 'Dept Teste Jest').first();
  if (!dept) {
    const [row] = await db('tb_departamentos').insert({
      nome_departamento: 'Dept Teste Jest',
      id_unidade: idUnidadeTeste,
      ativo: true,
    }).returning('id_departamento');
    idDeptTeste = row.id_departamento;
  } else {
    idDeptTeste = dept.id_departamento;
  }

  // Atribuir gestor (maria) à unidade de teste (hard delete para evitar violação de unique constraint)
  const gestorUser = await db('tb_usuarios').where('email', 'maria@agilize.com.br').first();
  await db('tb_atribuicoes_gestor')
    .where('id_gestor', gestorUser.id_usuario)
    .where('id_unidade', idUnidadeTeste)
    .del();
  const [atrib] = await db('tb_atribuicoes_gestor').insert({
    id_gestor: gestorUser.id_usuario,
    nome_gestor: gestorUser.nome,
    email_gestor: gestorUser.email,
    perfil_gestor: gestorUser.perfil_principal,
    id_unidade: idUnidadeTeste,
    id_usuario_criacao: gestorUser.id_usuario,
    ativo: true,
  }).returning('id_atribuicao');
  idAtribuicaoTeste = atrib.id_atribuicao;

  // Cria demanda em DRAFT para usar no fluxo
  const res = await request(app)
    .post('/api/v1/demandas')
    .set('Authorization', `Bearer ${tokens.solicitante}`)
    .send({
      titulo: 'Fluxo Fase 1 completo — Jest',
      descricao: 'Teste automatizado do fluxo completo da Fase 1. Esta descrição tem mais de 50 caracteres obrigatórios.',
      tipo_solucao: 'SCRIPT',
      prioridade: 'ALTA',
      justificativa: 'Teste de integração do workflow completo.',
      id_unidade: idUnidadeTeste,
      id_departamento: idDeptTeste,
      objetivo_principal: 'Testar o fluxo completo de aprovação da Fase 1 do sistema Agilize de forma automatizada.',
      publico_alvo: 'Equipe de testes automatizados Jest',
      frequencia_uso: 'PONTUAL',
      quantidade_usuarios_estimada: 2,
    });

  idDemanda = res.body.demanda?.id_demanda;
  if (!idDemanda) throw new Error(`Falha ao criar demanda para teste de fluxo: ${JSON.stringify(res.body)}`);
});

async function limparDemanda(id) {
  if (!id) return;
  await db('tb_notificacoes').where('id_demanda', id).del().catch(() => {});
  await db('tb_historico_decisoes').where('id_demanda', id).del().catch(() => {});
  await db('tb_demandas').where('id_demanda', id).del().catch(() => {});
}

afterAll(async () => {
  await limparDemanda(idDemanda);
  if (idAtribuicaoTeste) await db('tb_atribuicoes_gestor').where('id_atribuicao', idAtribuicaoTeste).del().catch(() => {});
  if (idDeptTeste) await db('tb_departamentos').where('id_departamento', idDeptTeste).del().catch(() => {});
  if (idUnidadeTeste) await db('tb_unidades').where('id_unidade', idUnidadeTeste).del().catch(() => {});
  await db.destroy();
});

describe('Fase 1 — Fluxo completo DRAFT → APROVADA_STI', () => {
  test('DRAFT → PENDENTE_GESTOR (enviar para gestor)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemanda}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('PENDENTE_GESTOR');
  });

  test('Solicitante NÃO pode enviar diretamente para STI (regra central)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemanda}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    // Deve ser proibido — solicitante nunca encaminha direto para STI
    expect([400, 403]).toContain(res.status);
  });

  test('PENDENTE_GESTOR → VALIDADA_GESTOR (gestor valida)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemanda}/validar-gestor`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Demanda analisada e aprovada. Está adequada e bem elaborada.', comentario: 'Demanda bem elaborada, prosseguir.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('VALIDADA_GESTOR');
  });

  test('VALIDADA_GESTOR → FILA_STI (gestor envia para STI)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemanda}/enviar-sti`)
      .set('Authorization', `Bearer ${tokens.gestor}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('FILA_STI');
  });

  test('FILA_STI → APROVADA_STI (analista STI aprova)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemanda}/aprovar-sti`)
      .set('Authorization', `Bearer ${tokens.analista}`)
      .send({ parecer: 'Analisado tecnicamente e aprovado pela STI Governança. Solução viável.', comentario: 'Viável tecnicamente.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('APROVADA_STI');
  });
});

describe('Fase 1 — Fluxo de devolução', () => {
  let idDemandaDevolucao;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/demandas')
      .set('Authorization', `Bearer ${tokens.solicitante}`)
      .send({
        titulo: 'Fluxo de Devolução pelo Gestor — Jest',
        descricao: 'Teste automatizado de devolução pelo gestor. Esta descrição precisa de mais de 50 caracteres.',
        tipo_solucao: 'PAINEL_BI',
        prioridade: 'BAIXA',
        justificativa: 'Teste do fluxo de devolução.',
        id_unidade: idUnidadeTeste,
        id_departamento: idDeptTeste,
        objetivo_principal: 'Validar o caminho de devolução de demandas pelo gestor no fluxo de aprovação.',
        publico_alvo: 'Equipe de testes da STI',
        frequencia_uso: 'PONTUAL',
        quantidade_usuarios_estimada: 1,
      });
    idDemandaDevolucao = res.body.demanda?.id_demanda;

    await request(app)
      .post(`/api/v1/demandas/${idDemandaDevolucao}/enviar-gestor`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);
  });

  afterAll(async () => {
    await limparDemanda(idDemandaDevolucao);
  });

  test('PENDENTE_GESTOR → DEVOLVIDA_AJUSTES (gestor devolve)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemandaDevolucao}/devolver`)
      .set('Authorization', `Bearer ${tokens.gestor}`)
      .send({ parecer: 'Demanda devolvida para ajustes. Falta justificativa mais detalhada e completa.', comentario: 'Revisar justificativa.' });

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('DEVOLVIDA_AJUSTES');
  });

  test('DEVOLVIDA_AJUSTES → SOLICITANTE_AJUSTANDO (solicitante inicia ajuste)', async () => {
    const res = await request(app)
      .post(`/api/v1/demandas/${idDemandaDevolucao}/iniciar-ajuste`)
      .set('Authorization', `Bearer ${tokens.solicitante}`);

    expect(res.status).toBe(200);
    expect(res.body.demanda.status_atual).toBe('SOLICITANTE_AJUSTANDO');
  });
});
