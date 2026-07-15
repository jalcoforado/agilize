// Tipos de domínio do Agilize 2.0.
// Interfaces de linha (rows) derivadas das migrations em src/db/migrations.
//
// Convenções de tipagem:
// - IDs são bigint no PostgreSQL e retornam como string pelo driver `pg`,
//   mas o código frequentemente os recebe como number (input validado) — por
//   isso o alias `Id` aceita ambos. O código existente já normaliza com Number().
// - Colunas timestamp retornam Date (driver pg) e são serializadas para ISO no JSON.
// - Colunas decimais (numeric) retornam string pelo driver pg.

import type { Knex } from 'knex';

export type Id = number | string;
export type Timestamp = Date | string;

/** Objeto de insert/update parcial que também aceita expressões Knex.Raw (ex.: db.fn.now()). */
export type Updatable<T> = { [K in keyof T]?: T[K] | Knex.Raw };

// ─── Enumerações de domínio ────────────────────────────────────────────────────

export type Perfil =
  | 'SOLICITANTE'
  | 'GESTOR_UNIDADE'
  | 'GESTOR_DEPARTAMENTO'
  | 'ANALISTA_STI'
  | 'AVALIADOR_TECNICO'
  | 'DPO'
  | 'RESPONSAVEL_PRODUCAO'
  | 'GESTOR_SISTEMA';

export type TipoSolucao = 'PAINEL_BI' | 'SCRIPT' | 'AGENTE_IA' | 'SISTEMA_SIMPLES' | 'OUTRO';
export type Prioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type Frequencia = 'CONTINUO' | 'DIARIO' | 'SEMANAL' | 'MENSAL' | 'PONTUAL';
export type TipoDeploy = 'SELF_DEPLOY' | 'OPS_DEPLOY';

// ─── Linhas de tabela ───────────────────────────────────────────────────────────

export interface Usuario {
  id_usuario: Id;
  nome: string;
  email: string;
  senha_hash: string;
  perfil_principal: Perfil;
  perfis_secundarios: Perfil[] | null;
  id_unidade: Id | null;
  id_departamento: Id | null;
  ativo: boolean;
  data_criacao: Timestamp;
  data_ultima_atualizacao: Timestamp;
}

export interface Unidade {
  id_unidade: Id;
  nome_unidade: string;
  sigla: string;
  id_departamento: Id | null;
  descricao: string | null;
  ativo: boolean;
  data_criacao: Timestamp;
}

export interface Departamento {
  id_departamento: Id;
  nome_departamento: string;
  descricao: string | null;
  ativo: boolean;
  data_criacao: Timestamp;
}

export interface Demanda {
  id_demanda: Id;
  numero_demanda: string;
  titulo: string;
  descricao: string;
  justificativa: string | null;

  tipo_solucao: TipoSolucao;
  prioridade: Prioridade;
  categoria: string | null;
  investimento_estimado: number | string | null;
  tempo_estimado_horas: number | null;

  id_solicitante: Id;
  nome_solicitante: string | null;
  email_solicitante: string | null;

  id_unidade: Id;
  nome_unidade: string | null;
  id_departamento: Id;
  nome_departamento: string | null;

  id_analista_sti: Id | null;
  nome_analista_sti: string | null;

  id_analista_sti_homologacao: Id | null;
  nome_analista_sti_homologacao: string | null;

  id_dpo: Id | null;
  nome_dpo: string | null;
  id_dpo_homologacao: Id | null;
  nome_dpo_homologacao: string | null;

  id_responsavel_deploy: Id | null;
  nome_responsavel_deploy: string | null;

  id_unidade_avaliador: Id | null;
  nome_unidade_avaliador: string | null;
  id_unidade_producao: Id | null;
  nome_unidade_producao: string | null;

  // Mantido como string: há mais de 23 estados e transições comparam literais livremente.
  status_atual: string;

  data_envio_gestor: Timestamp | null;
  data_validacao_gestor: Timestamp | null;
  data_fila_sti: Timestamp | null;
  data_aprovacao_sti: Timestamp | null;
  data_inicio_desenvolvimento: Timestamp | null;
  data_submissao_homologacao: Timestamp | null;
  data_validacao_homologacao_gestor: Timestamp | null;
  data_fila_homologacao_sti: Timestamp | null;
  data_homologacao: Timestamp | null;
  data_inicio_producao: Timestamp | null;
  data_monitoramento: Timestamp | null;
  data_conclusao: Timestamp | null;

  motivo_cancelamento: string | null;
  id_usuario_cancelamento: Id | null;
  status_antes_suspensao: string | null;

  tipo_deploy: TipoDeploy | null;

  objetivo_principal: string | null;
  publico_alvo: string | null;
  frequencia_uso: Frequencia | null;
  quantidade_usuarios_estimada: number | null;
  dependencias_externas: unknown | null;
  dados_tecnicos: unknown | null;

  ip_criacao: string | null;
  ativo: boolean;
  data_exclusao: Timestamp | null;

  solucao_em_uso: boolean | null;
  dados_sensiveis: boolean | null;
  dados_sensiveis_desc: string | null;
  impacta_outras_areas: boolean | null;
  gestor_unidade_disponivel?: boolean;
  areas_impactadas: string | null;
  usa_ia_desenvolvimento: boolean | null;
  anexos: AnexoInfo[] | null;

  id_usuario_criacao: Id;
  id_usuario_ultima_atualizacao: Id | null;
  data_criacao: Timestamp;
  data_ultima_atualizacao: Timestamp;
}

/** Arquivo armazenado como base64 no JSONB do histórico */
export interface AnexoInfo {
  nome: string;
  tamanho: number;
  tipo: string;
  conteudo: string; // data URL base64
}

/** Referência de arquivo devolvida para o frontend (sem conteúdo) */
export interface AnexoRef {
  nome: string;
  tamanho: number;
  tipo: string;
  url: string;
}

export interface HistoricoDecisaoRow {
  id_historico: Id;
  id_demanda: Id;
  numero_demanda: string;
  id_usuario: Id;
  nome_usuario: string;
  email_usuario: string | null;
  perfil_usuario: string;
  status_anterior: string | null;
  status_novo: string;
  tipo_acao: string;
  parecer: string | null;
  comentario: string | null;
  motivo_rejeicao: string | null;
  anexos: AnexoInfo[] | null;
  duracao_etapa_dias: number | null;
  sla_em_dia: boolean;
  data_hora: Timestamp;
  timezone: string;
  dia_semana: string | null;
  hora_do_dia: number | null;
  ip_usuario: string | null;
  user_agent: string | null;
  endpoint_chamado: string | null;
  metodo_http: string | null;
  id_unidade_demanda: Id | null;
  nome_unidade_demanda: string | null;
}

export interface Notificacao {
  id_notificacao: Id;
  id_usuario_destinatario: Id;
  email_destinatario: string | null;
  id_demanda: Id | null;
  numero_demanda: string | null;
  tipo_notificacao: string;
  titulo_notificacao: string;
  mensagem_notificacao: string | null;
  link_acao: string | null;
  // Inserido como 0/1 pelo código atual; armazenado como boolean no banco.
  lido: boolean;
  data_leitura: Timestamp | null;
  ativo: boolean;
  data_criacao: Timestamp;
  canal_envio: string;
  data_envio: Timestamp | null;
}

export interface AtribuicaoGestor {
  id_atribuicao: Id;
  id_gestor: Id;
  nome_gestor: string | null;
  email_gestor: string | null;
  perfil_gestor: string;
  id_unidade: Id | null;
  id_departamento: Id | null;
  data_inicio: Timestamp;
  data_fim: Timestamp | null;
  ativo: boolean;
  id_usuario_criacao: Id;
  data_criacao: Timestamp;
}

export interface DiagnosticoIA {
  id_diagnostico: Id;
  id_demanda: Id;
  fase: string;
  status_diagnostico: string;
  diagnostico: unknown | null;
  modelo_ia: string | null;
  tokens_usados: number | null;
  custo_usd: number | string | null;
  erro: string | null;
  data_criacao: Timestamp;
  data_conclusao: Timestamp | null;
}

export interface InventarioAplicacao {
  id_inventario: Id;
  id_demanda: Id;
  numero_demanda: string;
  nome_aplicacao: string;
  descricao: string | null;
  tipo_solucao: string;
  id_unidade: Id;
  nome_unidade: string | null;
  id_responsavel: Id;
  nome_responsavel: string | null;
  versao: string;
  url_aplicacao: string | null;
  repositorio_url: string | null;
  documentacao_url: string | null;
  status_inventario: string;
  data_entrada_producao: Timestamp | null;
  data_ultima_revisao: Timestamp | null;
  observacoes: string | null;
  ativo: boolean;
  data_criacao: Timestamp;
}

// ─── Usuário autenticado (payload do JWT) ───────────────────────────────────────

export interface AuthUser {
  id_usuario: Id;
  email: string;
  nome: string;
  perfil_principal: Perfil;
  perfis_secundarios: Perfil[];
  id_unidade: Id | null;
  id_departamento?: Id | null;
  iat?: number;
  exp?: number;
}

// ─── Tipos de entrada validada (req.*) ──────────────────────────────────────────
// Em Category 2 estes passam a ser derivados de schemas Zod via z.infer<>.

export interface DemandaInput {
  titulo: string;
  descricao: string;
  justificativa?: string;
  tipo_solucao: TipoSolucao;
  prioridade: Prioridade;
  id_unidade: number;
  id_departamento: number;
  investimento_estimado?: number;
  tempo_estimado_horas?: number;
  objetivo_principal: string;
  publico_alvo: string;
  frequencia_uso: Frequencia;
  quantidade_usuarios_estimada: number;
  dependencias_externas?: Record<string, unknown>;
  dados_tecnicos?: Record<string, unknown>;
  solucao_em_uso?: boolean;
  dados_sensiveis?: boolean;
  dados_sensiveis_desc?: string;
  impacta_outras_areas?: boolean;
  areas_impactadas?: string;
  usa_ia_desenvolvimento?: boolean;
  anexos?: AnexoInfo[];
}

export interface ParecerInput {
  parecer?: string;
  comentario?: string;
  anexos?: AnexoInfo[];
}

export interface RejeicaoInput {
  motivo_rejeicao: string;
  parecer: string;
  comentario?: string;
  anexos?: AnexoInfo[];
}

export interface HomologacaoInput {
  parecer?: string;
  comentario?: string;
  tipo_deploy: TipoDeploy;
  id_unidade_producao?: number;
  anexos?: AnexoInfo[];
}

export interface CancelamentoInput {
  motivo: string;
}
