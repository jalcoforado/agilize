const { Demanda, HistoricoDecisao } = require('../models');
const { notificarMudancaStatus } = require('../services/notificacao');

const STI = ['ANALISTA_STI', 'GESTOR_SISTEMA'];
const GESTOR = ['GESTOR_UNIDADE', 'GESTOR_SISTEMA'];
const SOLICITANTE = ['SOLICITANTE', 'GESTOR_SISTEMA'];
const PRODUCAO = ['SOLICITANTE', 'RESPONSAVEL_PRODUCAO', 'ANALISTA_STI', 'GESTOR_SISTEMA'];
const DIRETOR = ['DIRETOR_STI', 'GESTOR_SISTEMA'];

function checkPerfil(req, permitidos) {
  if (!permitidos.includes(req.user.perfil_principal)) {
    const err = new Error('Sem permissão para esta ação');
    err.statusCode = 403;
    throw err;
  }
}

class DemandaController {
  static async criar(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.criar(req.demandaValidada, req.user.id_usuario, req.ip);
      res.status(201).json({ success: true, demanda, message: 'Demanda criada com sucesso' });
    } catch (error) { next(error); }
  }

  static async atualizar(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.obterPorId(req.params.id);
      if (!demanda) {
        const err = new Error('Demanda não encontrada'); err.statusCode = 404; err.code = 'NAO_ENCONTRADO';
        return next(err);
      }
      if (!['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual)) {
        const err = new Error('Só é possível editar demandas em rascunho ou em fase de ajuste');
        err.statusCode = 409; err.code = 'STATUS_INVALIDO';
        return next(err);
      }
      if (Number(demanda.id_solicitante) !== Number(req.user.id_usuario) && req.user.perfil_principal !== 'GESTOR_SISTEMA') {
        const err = new Error('Sem permissão para editar esta demanda'); err.statusCode = 403;
        return next(err);
      }
      const atualizada = await Demanda.atualizar(req.params.id, req.demandaValidada);
      res.status(200).json({ success: true, demanda: atualizada, message: 'Demanda atualizada com sucesso' });
    } catch (error) { next(error); }
  }

  static async obterDiagnostico(req, res, next) {
    try {
      const db = require('../db/connection');
      const diagnostico = await db('tb_diagnosticos_ia')
        .where('id_demanda', req.params.id)
        .orderBy('id_diagnostico', 'desc')
        .first();
      res.status(200).json({ success: true, diagnostico: diagnostico || null });
    } catch (error) { next(error); }
  }

  static async obter(req, res, next) {
    try {
      const demanda = await Demanda.obterPorId(req.params.id);
      if (!demanda) {
        const err = new Error('Demanda não encontrada'); err.statusCode = 404; err.code = 'NAO_ENCONTRADO';
        return next(err);
      }
      res.status(200).json({ success: true, demanda });
    } catch (error) { next(error); }
  }

  static async listar(req, res, next) {
    try {
      const { status, statusIn, prioridade, tipo_solucao, pagina = 1, limite = 20 } = req.query;
      const filtros = {};
      if (statusIn) filtros.statusIn = statusIn.split(',').map(s => s.trim()).filter(Boolean);
      else if (status) filtros.status = status;
      if (prioridade) filtros.prioridade = prioridade;
      if (tipo_solucao) filtros.tipo_solucao = tipo_solucao;
      if (req.user.perfil_principal === 'SOLICITANTE') filtros.id_solicitante = req.user.id_usuario;
      if (req.user.perfil_principal === 'GESTOR_UNIDADE') filtros.id_unidade = req.user.id_unidade;
      if (req.user.perfil_principal === 'DIRETOR_STI') filtros.id_diretor_sti = req.user.id_usuario;
      const resultado = await Demanda.listar(filtros, parseInt(pagina), parseInt(limite));
      res.status(200).json({ success: true, ...resultado });
    } catch (error) { next(error); }
  }

  // ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────

  static async enviarParaGestor(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.enviarParaGestor(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Enviado para validação do gestor' });
      notificarMudancaStatus(demanda, 'PENDENTE_GESTOR', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async validarGestor(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.validarGestor(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda validada pelo gestor' });
      notificarMudancaStatus(demanda, 'VALIDADA_GESTOR', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async devolver(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.devolver(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda devolvida para ajustes' });
      notificarMudancaStatus(demanda, 'DEVOLVIDA_AJUSTES', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async rejeitarGestor(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const { motivo_rejeicao, parecer } = req.rejeicao;
      const demanda = await Demanda.rejeitarGestor(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda rejeitada pelo Gestor' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async iniciarAjuste(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarAjuste(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Ajustes iniciados' });
    } catch (error) { next(error); }
  }

  static async enviarParaSTI(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.enviarParaSTI(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Encaminhado para fila da STI' });
      notificarMudancaStatus(demanda, 'FILA_STI', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async aprovarSTI(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.aprovarSTI(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Aprovado pela STI — desenvolvimento autorizado' });
      notificarMudancaStatus(demanda, 'APROVADA_STI', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async reprovarSTI(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { motivo_rejeicao, parecer } = req.rejeicao;
      const demanda = await Demanda.reprovarSTI(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Reprovado pela STI' });
      notificarMudancaStatus(demanda, 'REPROVADA_STI', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async solicitarAjustesSTI(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.solicitarAjustesSTI(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Ajustes solicitados pela STI' });
      notificarMudancaStatus(demanda, 'SOLICITADO_AJUSTES_STI', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async reenviarParaSTI(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.reenviarParaSTI(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Reenviado para fila da STI' });
    } catch (error) { next(error); }
  }

  // ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────

  static async iniciarDesenvolvimento(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarDesenvolvimento(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Desenvolvimento iniciado' });
      notificarMudancaStatus(demanda, 'EM_DESENVOLVIMENTO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async submeterProduto(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.submeterProduto(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Produto submetido para homologação' });
      notificarMudancaStatus(demanda, 'SUBMETIDO_HOMOLOGACAO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  // ─── FASE 3: HOMOLOGAÇÃO ──────────────────────────────────────────────────

  static async validarHomologacaoGestor(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.validarHomologacaoGestor(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Homologação validada pelo gestor' });
      notificarMudancaStatus(demanda, 'VALIDADA_HOMOLOGACAO_GESTOR', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async devolverHomologacao(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.devolverHomologacao(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Produto devolvido para ajustes' });
      notificarMudancaStatus(demanda, 'DEVOLVIDA_HOMOLOGACAO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async iniciarAjusteHomologacao(req, res, next) {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarAjusteHomologacao(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Ajuste de homologação iniciado' });
    } catch (error) { next(error); }
  }

  static async enviarHomologacaoSTI(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.enviarHomologacaoSTI(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Enviado para fila de homologação da STI' });
      notificarMudancaStatus(demanda, 'FILA_HOMOLOGACAO_STI', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async solicitarAjustesHomologacao(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario } = req.parecer;
      const demanda = await Demanda.solicitarAjustesHomologacao(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Ajustes no produto solicitados pela STI' });
      notificarMudancaStatus(demanda, 'SOLICITADO_AJUSTES_HOMOLOGACAO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async homologar(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario, tipo_deploy } = req.homologacao;
      const demanda = await Demanda.homologar(req.params.id, req.user.id_usuario, parecer, comentario, tipo_deploy, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Solução homologada pela STI' });
      notificarMudancaStatus(demanda, 'HOMOLOGADA', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async rejeitar(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { motivo_rejeicao, parecer } = req.rejeicao;
      const demanda = await Demanda.rejeitar(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Produto rejeitado na homologação' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async reenviarHomologacaoSTI(req, res, next) {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.reenviarHomologacaoSTI(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Produto reenviado para fila de homologação da STI' });
    } catch (error) { next(error); }
  }

  // ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────

  static async iniciarDeploy(req, res, next) {
    try {
      checkPerfil(req, PRODUCAO);
      const { parecer } = req.parecer;
      const demanda = await Demanda.iniciarDeploy(req.params.id, req.user.id_usuario, req.user.perfil_principal, parecer, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Deploy iniciado' });
      notificarMudancaStatus(demanda, 'EM_PRODUCAO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async confirmarDeploy(req, res, next) {
    try {
      checkPerfil(req, PRODUCAO);
      const { parecer } = req.parecer;
      const demanda = await Demanda.confirmarDeploy(req.params.id, req.user.id_usuario, req.user.perfil_principal, parecer, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Deploy confirmado — solução em monitoramento' });
      notificarMudancaStatus(demanda, 'EM_MONITORAMENTO', req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async desativar(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { motivo } = req.cancelamento;
      const demanda = await Demanda.desativar(req.params.id, req.user.id_usuario, motivo, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Solução desativada' });
    } catch (error) { next(error); }
  }

  // ─── CANCELAMENTO ─────────────────────────────────────────────────────────

  // ─── DIRETOR STI ─────────────────────────────────────────────────────────

  static async encaminharDiretor(req, res, next) {
    try {
      checkPerfil(req, STI);
      const { id_diretor, comentario } = req.body;
      if (!id_diretor) {
        const err = new Error('Informe o diretor para encaminhar'); err.statusCode = 400; return next(err);
      }
      const demanda = await Demanda.encaminharDiretor(req.params.id, req.user.id_usuario, id_diretor, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda encaminhada ao Diretor STI' });
      notificarMudancaStatus(demanda, demanda.status_atual, req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async diretorSolicitarAjustes(req, res, next) {
    try {
      checkPerfil(req, DIRETOR);
      const { parecer, comentario } = req.body;
      if (!parecer || parecer.trim().length < 10) {
        const err = new Error('Parecer obrigatório (mín. 10 caracteres)'); err.statusCode = 400; return next(err);
      }
      const demanda = await Demanda.diretorSolicitarAjustes(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Ajustes solicitados ao solicitante pelo Diretor STI' });
      notificarMudancaStatus(demanda, demanda.status_atual, req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async diretorDevolverAnalista(req, res, next) {
    try {
      checkPerfil(req, DIRETOR);
      const { parecer, comentario } = req.body;
      if (!parecer || parecer.trim().length < 10) {
        const err = new Error('Parecer obrigatório (mín. 10 caracteres)'); err.statusCode = 400; return next(err);
      }
      const demanda = await Demanda.diretorDevolverAnalista(req.params.id, req.user.id_usuario, parecer, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda devolvida ao analista' });
      notificarMudancaStatus(demanda, demanda.status_atual, req.user).catch(() => {});
    } catch (error) { next(error); }
  }

  static async cancelar(req, res, next) {
    try {
      checkPerfil(req, ['SOLICITANTE', 'GESTOR_UNIDADE', 'ANALISTA_STI', 'GESTOR_SISTEMA']);
      const { motivo } = req.cancelamento;
      const demanda = await Demanda.cancelar(req.params.id, req.user.id_usuario, motivo, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda cancelada' });
      notificarMudancaStatus(demanda, 'CANCELADA', req.user).catch(() => {});
    } catch (error) { next(error); }
  }
}

class HistoricoController {
  static async obterPorDemanda(req, res, next) {
    try {
      const { idDemanda } = req.params;
      const { pagina = 1, limite = 50 } = req.query;
      const resultado = await HistoricoDecisao.obterPorDemanda(idDemanda, parseInt(limite), parseInt(pagina));
      res.status(200).json({ success: true, ...resultado });
    } catch (error) { next(error); }
  }
}

module.exports = { DemandaController, HistoricoController };
