import dotenv from 'dotenv';
import type { Knex } from 'knex';

dotenv.config({ path: '.env.test', override: true });
process.env.NODE_ENV = 'test';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require('../index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../db/connection').default as Knex;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

// ─── Payloads reutilizáveis ───────────────────────────────────────────────────

export const PARECER = 'Parecer válido e completo para os testes automatizados do Agilize.';
export const PARECER_GESTOR = 'Demanda analisada e validada pelo gestor. Está adequada e bem elaborada para prosseguir.';
export const PARECER_STI = 'Demanda analisada tecnicamente e aprovada pela STI Governança. Solução viável e alinhada.';
export const PARECER_HOMOLOGACAO = 'Produto homologado pela STI Governança. Atende todos os requisitos técnicos e funcionais.';
export const MOTIVO_REJEICAO = 'Solução não atende os requisitos mínimos definidos pela N-PSI-016.';
export const MOTIVO_CANCELAMENTO = 'Cancelamento solicitado para fins de teste automatizado do sistema.';
export const MOTIVO_DESATIVACAO = 'Desativação solicitada para fins de teste automatizado do sistema Agilize.';

export function demandaPayload(idUnidade: number | string, idDept: number | string | null, titulo = 'Teste Jest') {
  return {
    titulo: `${titulo} — ${Date.now()}`,
    descricao: 'Demanda de teste automatizado criada pelo Jest para validar o fluxo completo do sistema Agilize.',
    tipo_solucao: 'SCRIPT',
    prioridade: 'MEDIA',
    justificativa: 'Validar o fluxo automatizado do sistema Agilize nos testes de integração contínua.',
    id_unidade: idUnidade,
    id_departamento: idDept,
    objetivo_principal: 'Testar automaticamente o fluxo de aprovação do sistema Agilize de forma completa e confiável.',
    publico_alvo: 'Equipe de desenvolvimento e QA da STI',
    frequencia_uso: 'PONTUAL',
    quantidade_usuarios_estimada: 3,
  };
}

// ─── Contexto de fluxo (unidade + dept + atribuição gestor) ──────────────────

export interface ContextoFluxo {
  idUnidade: number | string;
  idDept: number | string;
  idAtribuicao: number | string;
}

export async function criarContextoFluxo(sigla: string): Promise<ContextoFluxo> {
  let idUnidade: number | string;
  let idDept: number | string;

  // Departamento é raiz — criar primeiro
  const deptNome = `Dept Teste ${sigla}`;
  const deptExistente = await db('tb_departamentos').where('nome_departamento', deptNome).first();
  if (deptExistente) {
    idDept = deptExistente.id_departamento;
  } else {
    const [row] = await db('tb_departamentos')
      .insert({ nome_departamento: deptNome, ativo: true })
      .returning('id_departamento');
    idDept = row.id_departamento;
  }

  // Unidade pertence ao departamento
  const unidadeExistente = await db('tb_unidades').where('sigla', sigla).first();
  if (unidadeExistente) {
    idUnidade = unidadeExistente.id_unidade;
  } else {
    const [row] = await db('tb_unidades')
      .insert({ nome_unidade: `Unidade Teste ${sigla}`, sigla, id_departamento: idDept, ativo: true })
      .returning('id_unidade');
    idUnidade = row.id_unidade;
  }

  const gestorUser = await db('tb_usuarios').where('email', 'maria@agilize.com.br').first();
  if (!gestorUser) throw new Error('Usuário gestor (maria) não encontrado no banco de dados');
  await db('tb_atribuicoes_gestor')
    .where('id_gestor', gestorUser.id_usuario)
    .where('id_unidade', idUnidade)
    .del();
  const [atrib] = await db('tb_atribuicoes_gestor').insert({
    id_gestor: gestorUser.id_usuario,
    nome_gestor: gestorUser.nome,
    email_gestor: gestorUser.email,
    perfil_gestor: gestorUser.perfil_principal,
    id_unidade: idUnidade,
    id_usuario_criacao: gestorUser.id_usuario,
    ativo: true,
  }).returning('id_atribuicao');
  const idAtribuicao = atrib.id_atribuicao;

  return { idUnidade, idDept, idAtribuicao };
}

export async function limparContexto(ctx: ContextoFluxo & { sigla: string }): Promise<void> {
  await db('tb_atribuicoes_gestor').where('id_atribuicao', ctx.idAtribuicao).del().catch(() => {});
  await db('tb_departamentos').where('id_departamento', ctx.idDept).del().catch(() => {});
  await db('tb_unidades').where('sigla', ctx.sigla).del().catch(() => {});
}

export async function limparDemanda(id: number | string | undefined): Promise<void> {
  if (!id) return;
  await db('tb_notificacoes').where('id_demanda', id).del().catch(() => {});
  await db('tb_historico_decisoes').where('id_demanda', id).del().catch(() => {});
  await db('tb_inventario_aplicacoes').where('id_demanda', id).del().catch(() => {});
  await db('tb_demandas').where('id_demanda', id).del().catch(() => {});
}

// ─── Funções de avanço de fluxo ──────────────────────────────────────────────

async function _login(email: string, senha: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, senha });
  if (!res.body.token) throw new Error(`Login falhou para ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

export async function avancarParaAPROVADA_STI(
  tokens: Record<string, string>,
  idUnidade: number | string,
  idDept: number | string,
  titulo = 'Fluxo Setup Jest',
): Promise<number> {
  const r1 = await request(app)
    .post('/api/v1/demandas')
    .set('Authorization', `Bearer ${tokens.solicitante}`)
    .send(demandaPayload(idUnidade, idDept, titulo));
  const id = r1.body.demanda?.id_demanda;
  if (!id) throw new Error(`Falha ao criar demanda: ${JSON.stringify(r1.body)}`);

  await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
    .send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  await request(app).post(`/api/v1/demandas/${id}/aprovar-sti`).set('Authorization', `Bearer ${tokens.analista}`)
    .send({ parecer: PARECER_STI });

  return id;
}

export async function avancarParaSUBMETIDO_HOMOLOGACAO(
  tokens: Record<string, string>,
  idUnidade: number | string,
  idDept: number | string,
  titulo = 'Fluxo Setup Fase3 Jest',
): Promise<number> {
  const id = await avancarParaAPROVADA_STI(tokens, idUnidade, idDept, titulo);
  await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`).set('Authorization', `Bearer ${tokens.solicitante}`);
  await request(app).post(`/api/v1/demandas/${id}/submeter-produto`).set('Authorization', `Bearer ${tokens.solicitante}`)
    .send({ parecer: PARECER });
  return id;
}

export async function avancarParaHOMOLOGADA(
  tokens: Record<string, string>,
  idUnidade: number | string,
  idDept: number | string,
  titulo = 'Fluxo Setup Fase4 Jest',
): Promise<number> {
  const id = await avancarParaSUBMETIDO_HOMOLOGACAO(tokens, idUnidade, idDept, titulo);
  await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
    .send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  await request(app).post(`/api/v1/demandas/${id}/homologar`).set('Authorization', `Bearer ${tokens.analista}`)
    .send({ parecer: PARECER_HOMOLOGACAO, tipo_deploy: 'OPS_DEPLOY' });
  return id;
}

export function demandaPayloadComDadosSensiveis(idUnidade: number | string, idDept: number | string | null, titulo = 'Dados Sensíveis Teste') {
  return {
    ...demandaPayload(idUnidade, idDept, titulo),
    dados_sensiveis: true,
    dados_sensiveis_desc: 'Contém CPF e dados de saúde dos servidores.',
  };
}

export async function criarDPO(tokenAdmin: string): Promise<{ idDpo: number; email: string; token: string }> {
  const email = `dpo-jest-${Date.now()}@agilize.com.br`;
  const senha = 'Senha123Jest';
  const res = await request(app)
    .post('/api/v1/admin/usuarios')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nome: 'DPO Teste Jest', email, senha, perfil_principal: 'DPO' });
  if (!res.body.usuario) throw new Error(`Falha ao criar DPO: ${JSON.stringify(res.body)}`);
  const idDpo = res.body.usuario.id_usuario;
  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, senha });
  return { idDpo, email, token: loginRes.body.token };
}

export async function avancarParaAGUARDANDO_DPO(
  tokens: Record<string, string>,
  idUnidade: number | string,
  idDept: number | string,
  titulo = 'Fluxo DPO Setup Jest',
): Promise<number> {
  const r = await request(app)
    .post('/api/v1/demandas')
    .set('Authorization', `Bearer ${tokens.solicitante}`)
    .send(demandaPayloadComDadosSensiveis(idUnidade, idDept, titulo));
  const id = r.body.demanda?.id_demanda;
  if (!id) throw new Error(`Falha ao criar demanda: ${JSON.stringify(r.body)}`);

  await request(app).post(`/api/v1/demandas/${id}/enviar-gestor`).set('Authorization', `Bearer ${tokens.solicitante}`);
  await request(app).post(`/api/v1/demandas/${id}/validar-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
    .send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  return id;
}

export async function avancarParaAGUARDANDO_DPO_HOMOLOGACAO(
  tokens: Record<string, string>,
  idDpo: number | string,
  idUnidade: number | string,
  idDept: number | string,
  tokenDpo: string,
  titulo = 'Fluxo DPO Hom Setup Jest',
): Promise<number> {
  const id = await avancarParaAGUARDANDO_DPO(tokens, idUnidade, idDept, titulo);
  // DPO aprova para seguir o fluxo até Fase 3
  await request(app).post(`/api/v1/demandas/${id}/dpo-aprovar`).set('Authorization', `Bearer ${tokenDpo}`)
    .send({ parecer: 'Dados sensíveis verificados. Aprovado para análise STI.' });
  await request(app).post(`/api/v1/demandas/${id}/aprovar-sti`).set('Authorization', `Bearer ${tokens.analista}`)
    .send({ parecer: PARECER_STI });
  await request(app).post(`/api/v1/demandas/${id}/iniciar-desenvolvimento`).set('Authorization', `Bearer ${tokens.solicitante}`);
  await request(app).post(`/api/v1/demandas/${id}/submeter-produto`).set('Authorization', `Bearer ${tokens.solicitante}`)
    .send({ parecer: PARECER });
  await request(app).post(`/api/v1/demandas/${id}/validar-homologacao-gestor`).set('Authorization', `Bearer ${tokens.gestor}`)
    .send({ parecer: PARECER_GESTOR });
  await request(app).post(`/api/v1/demandas/${id}/enviar-homologacao-sti`).set('Authorization', `Bearer ${tokens.gestor}`);
  return id;
}

export async function criarAvaliadorTecnico(tokenAdmin: string): Promise<{ idAvaliador: number; email: string; token: string }> {
  const email = `avaliador-jest-${Date.now()}@agilize.com.br`;
  const senha = 'Senha123Jest';
  const res = await request(app)
    .post('/api/v1/admin/usuarios')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nome: 'Avaliador Técnico Teste Jest', email, senha, perfil_principal: 'AVALIADOR_TECNICO' });
  if (!res.body.usuario) throw new Error(`Falha ao criar avaliador técnico: ${JSON.stringify(res.body)}`);
  const idAvaliador = res.body.usuario.id_usuario;
  const loginRes = await request(app).post('/api/v1/auth/login').send({ email, senha });
  return { idAvaliador, email, token: loginRes.body.token };
}

export async function limparUsuario(email: string): Promise<void> {
  await db('tb_usuarios').where('email', email).del().catch(() => {});
}

export { request, app, db };
