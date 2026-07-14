import { Request, Response, NextFunction } from 'express';
import { Demanda } from '../models';
import type { Perfil } from '../types/models';
import type { HttpError } from '../types/http';

// Perfis que podem ver qualquer demanda, independente de dono/unidade
const ACESSO_TOTAL: Perfil[] = ['ANALISTA_STI', 'AVALIADOR_TECNICO', 'DPO', 'RESPONSAVEL_PRODUCAO', 'GESTOR_SISTEMA'];

/**
 * Middleware de leitura: verifica se o usuário pode acessar a demanda pelo ID.
 * Compatível com rotas que usam :id e :idDemanda.
 * Anexa a demanda em req.demandaCarregada para evitar 2ª consulta no controller.
 */
export const verificarAcessoDemanda = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id ?? req.params.idDemanda;
    const demanda = await Demanda.obterPorId(id);

    if (!demanda) {
      const err: HttpError = new Error('Demanda não encontrada');
      err.statusCode = 404;
      err.code = 'NAO_ENCONTRADO';
      return next(err);
    }

    const { perfil_principal, perfis_secundarios, id_usuario, id_unidade } = req.user;
    const todosPerfis: Perfil[] = [perfil_principal, ...(perfis_secundarios ?? [])];

    if (todosPerfis.some(p => ACESSO_TOTAL.includes(p))) {
      req.demandaCarregada = demanda;
      return next();
    }

    if (todosPerfis.includes('SOLICITANTE')) {
      if (Number(demanda.id_solicitante) !== Number(id_usuario)) {
        return next(_erroAcesso());
      }
      req.demandaCarregada = demanda;
      return next();
    }

    if (todosPerfis.includes('GESTOR_UNIDADE')) {
      if (!id_unidade || Number(demanda.id_unidade) !== Number(id_unidade)) {
        return next(_erroAcesso());
      }
      req.demandaCarregada = demanda;
      return next();
    }

    if (todosPerfis.includes('GESTOR_DEPARTAMENTO')) {
      if (!req.user.id_departamento || Number(demanda.id_departamento) !== Number(req.user.id_departamento)) {
        return next(_erroAcesso());
      }
      req.demandaCarregada = demanda;
      return next();
    }

    return next(_erroAcesso());
  } catch (error) {
    next(error);
  }
};

function _erroAcesso(): HttpError {
  const err: HttpError = new Error('Você não tem permissão para acessar esta demanda');
  err.statusCode = 403;
  err.code = 'ACESSO_NEGADO';
  return err;
}
