const express = require('express');
const { autenticar, validarPermissao } = require('../middleware/auth');
const relatorioService = require('../services/relatorio');

const router = express.Router();

router.use(autenticar);

// Apenas gestores e analistas STI acessam relatórios
const perfisRelatorio = ['GESTOR_SISTEMA', 'GESTOR_DEPARTAMENTO', 'GESTOR_UNIDADE', 'ANALISTA_STI'];

function verificarAcesso(req, res, next) {
  if (!perfisRelatorio.includes(req.user.perfil_principal)) {
    const err = new Error('Sem permissão para acessar relatórios');
    err.statusCode = 403;
    return next(err);
  }
  next();
}

function parseFiltrosPeriodo(query) {
  return {
    dataInicio: query.data_inicio || null,
    dataFim: query.data_fim || null
  };
}

// GET /api/v1/relatorios/dashboard
router.get('/dashboard', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.dashboard(filtros);
    res.status(200).json({ success: true, relatorio: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-status
router.get('/por-status', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_status(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-prioridade
router.get('/por-prioridade', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_prioridade(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-tipo
router.get('/por-tipo', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_tipo(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/sla
router.get('/sla', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.sla_compliance(filtros);
    res.status(200).json({ success: true, sla: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/tempo-por-etapa
router.get('/tempo-por-etapa', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.tempo_medio_por_etapa(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-periodo
router.get('/por-periodo', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_periodo(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/ranking-unidades
router.get('/ranking-unidades', verificarAcesso, async (req, res, next) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.ranking_unidades(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
