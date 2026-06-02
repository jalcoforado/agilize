const Joi = require('joi');

const TIPOS_SOLUCAO = ['PAINEL_BI', 'SCRIPT', 'AGENTE_IA', 'SISTEMA_SIMPLES', 'OUTRO'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const FREQUENCIAS = ['CONTINUO', 'DIARIO', 'SEMANAL', 'MENSAL', 'PONTUAL'];

const validarDemanda = (req, res, next) => {
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
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Campos da demanda inválidos', error));
  req.demandaValidada = value;
  next();
};

const validarValidacao = (req, res, next) => {
  const schema = Joi.object({
    parecer: Joi.string().min(20).max(5000).required(),
    comentario: Joi.string().max(5000).optional()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('O parecer precisa ter pelo menos 20 caracteres', error));
  req.parecer = value;
  next();
};

const validarRejeicao = (req, res, next) => {
  const schema = Joi.object({
    motivo_rejeicao: Joi.string().min(10).max(1000).required(),
    parecer: Joi.string().min(20).max(5000).required(),
    comentario: Joi.string().max(5000).optional()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Motivo e parecer são obrigatórios para rejeição', error));
  req.rejeicao = value;
  next();
};

const validarHomologacao = (req, res, next) => {
  const schema = Joi.object({
    parecer: Joi.string().min(20).max(5000).required(),
    comentario: Joi.string().max(5000).optional(),
    tipo_deploy: Joi.string().valid('SELF_DEPLOY', 'OPS_DEPLOY').required()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Parecer (mín. 20 caracteres) e tipo de deploy são obrigatórios', error));
  req.homologacao = value;
  next();
};

const validarCancelamento = (req, res, next) => {
  const schema = Joi.object({
    motivo: Joi.string().min(10).max(1000).required()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) return next(buildValidationError('Motivo obrigatório (mínimo 10 caracteres)', error));
  req.cancelamento = value;
  next();
};

function buildValidationError(message, joiError) {
  const err = new Error(message);
  err.statusCode = 400;
  err.code = 'VALIDACAO_ERRO';
  err.validation = true;
  err.details = joiError.details.map(d => ({ campo: d.path[0], mensagem: d.message }));
  return err;
}

module.exports = { validarDemanda, validarValidacao, validarHomologacao, validarRejeicao, validarCancelamento };
