import express, { Request, Response, NextFunction } from 'express';
import { autenticar } from '../middleware/auth';
import * as relatorioService from '../services/relatorio';
import type { HttpError } from '../types/http';
import type { Perfil } from '../types/models';

const router = express.Router();

router.use(autenticar);

// Gestores, analistas e Avaliador Técnico acessam relatórios
const perfisRelatorio: Perfil[] = ['GESTOR_SISTEMA', 'GESTOR_DEPARTAMENTO', 'GESTOR_UNIDADE', 'ANALISTA_STI', 'AVALIADOR_TECNICO'];

function verificarAcesso(req: Request, res: Response, next: NextFunction): void {
  if (!perfisRelatorio.includes(req.user.perfil_principal)) {
    const err: HttpError = new Error('Sem permissão para acessar relatórios');
    err.statusCode = 403;
    return next(err);
  }
  next();
}

function parseFiltrosPeriodo(query: Request['query']) {
  return {
    dataInicio: (query.data_inicio as string) || null,
    dataFim: (query.data_fim as string) || null,
  };
}

// GET /api/v1/relatorios/dashboard
router.get('/dashboard', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.dashboard(filtros);
    res.status(200).json({ success: true, relatorio: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-status
router.get('/por-status', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_status(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-prioridade
router.get('/por-prioridade', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_prioridade(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-tipo
router.get('/por-tipo', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_tipo(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/sla
router.get('/sla', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.sla_compliance(filtros);
    res.status(200).json({ success: true, sla: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/tempo-por-etapa
router.get('/tempo-por-etapa', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.tempo_medio_por_etapa(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/por-periodo
router.get('/por-periodo', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.demandas_por_periodo(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/relatorios/ranking-unidades
router.get('/ranking-unidades', verificarAcesso, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filtros = parseFiltrosPeriodo(req.query);
    const data = await relatorioService.ranking_unidades(filtros);
    res.status(200).json({ success: true, dados: data });
  } catch (error) {
    next(error);
  }
});

export default router;
