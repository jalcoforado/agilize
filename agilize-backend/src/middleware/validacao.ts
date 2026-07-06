import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import type { HttpError } from '../types/http';
import type {
  DemandaInput,
  ParecerInput,
  RejeicaoInput,
  HomologacaoInput,
  CancelamentoInput,
} from '../types/models';

const TIPOS_SOLUCAO = ['PAINEL_BI', 'SCRIPT', 'AGENTE_IA', 'SISTEMA_SIMPLES', 'OUTRO'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const FREQUENCIAS = ['CONTINUO', 'DIARIO', 'SEMANAL', 'MENSAL', 'PONTUAL'];

export const validarDemanda = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    titulo: Joi.string().min(10).max(255).required(),
    descricao: Joi.string().min(50).max(5000).required(),
    justificativa: Joi.string().max(5000).optional().allow(''),
    tipo_solucao: Joi.string().valid(...TIPOS_SOLUCAO).required(),
    prioridade: Joi.string().valid(...PRIORIDADES).required(),
    id_unidade: Joi.number().required(),
    id_departamento: Joi.number().required(),
    investimento_estimado: Joi.number().optional(),
    tempo_estimado_horas: Joi.number().integer().optional(),
    // Novos campos contextuais
    objetivo_principal: Joi.string().min(30).max(2000).required(),
    publico_alvo: Joi.string().min(10).max(500).required(),
    frequencia_uso: Joi.string().valid(...FREQUENCIAS).required(),
    quantidade_usuarios_estimada: Joi.number().integer().min(1).required(),
    // JSONB — estrutura livre, validada no frontend por tipo
    dependencias_externas: Joi.object().optional(),
    dados_tecnicos: Joi.object().optional(),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
    // Avaliação de risco e impacto
    solucao_em_uso: Joi.boolean().optional(),
    dados_sensiveis: Joi.boolean().optional(),
    dados_sensiveis_desc: Joi.string().max(2000).optional().allow(''),
    impacta_outras_areas: Joi.boolean().optional(),
    areas_impactadas: Joi.string().max(1000).optional().allow(''),
    usa_ia_desenvolvimento: Joi.boolean().optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Campos da demanda inválidos', error));
  req.demandaValidada = value as DemandaInput;
  next();
};

const anexoSchema = Joi.object({
  nome: Joi.string().max(255).required(),
  tamanho: Joi.number().required(),
  tipo: Joi.string().max(100).required(),
  conteudo: Joi.string().required(),
});

export const validarValidacao = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    parecer: Joi.string().min(20).max(5000).required(),
    comentario: Joi.string().max(5000).optional().allow(''),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('O parecer precisa ter pelo menos 20 caracteres', error));
  req.parecer = value as ParecerInput;
  next();
};

export const validarAprovacao = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    parecer: Joi.string().max(5000).optional().allow(''),
    comentario: Joi.string().max(5000).optional().allow(''),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Dados de aprovação inválidos', error));
  req.parecer = value as ParecerInput;
  next();
};

export const validarRejeicao = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    motivo_rejeicao: Joi.string().min(10).max(1000).required(),
    parecer: Joi.string().min(20).max(5000).required(),
    comentario: Joi.string().max(5000).optional().allow(''),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Motivo e parecer são obrigatórios para rejeição', error));
  req.rejeicao = value as RejeicaoInput;
  next();
};

export const validarHomologacao = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    parecer: Joi.string().max(5000).optional().allow(''),
    comentario: Joi.string().max(5000).optional().allow(''),
    tipo_deploy: Joi.string().valid('SELF_DEPLOY', 'OPS_DEPLOY').required(),
    id_unidade_producao: Joi.when('tipo_deploy', {
      is: 'OPS_DEPLOY',
      then: Joi.number().integer().required(),
      otherwise: Joi.number().integer().optional(),
    }),
    anexos: Joi.array().items(anexoSchema).max(3).optional(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Tipo de deploy é obrigatório. Para OPS_DEPLOY, selecione a unidade de produção STI.', error));
  req.homologacao = value as HomologacaoInput;
  next();
};

export const validarCancelamento = (req: Request, res: Response, next: NextFunction): void => {
  const schema = Joi.object({
    motivo: Joi.string().min(10).max(1000).required(),
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Motivo obrigatório (mínimo 10 caracteres)', error));
  req.cancelamento = value as CancelamentoInput;
  next();
};

function buildValidationError(message: string, joiError: Joi.ValidationError): HttpError {
  const err: HttpError = new Error(message);
  err.statusCode = 400;
  err.code = 'VALIDACAO_ERRO';
  err.validation = true;
  err.details = joiError.details.map((d) => ({ campo: d.path[0], mensagem: d.message }));
  return err;
}
