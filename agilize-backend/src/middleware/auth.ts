import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser, Perfil } from '../types/models';
import type { HttpError } from '../types/http';

export const autenticar = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    const err: HttpError = new Error('Token não fornecido');
    err.statusCode = 401;
    err.code = 'NAO_AUTENTICADO';
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded as AuthUser;
    next();
  } catch {
    const err: HttpError = new Error('Token inválido ou expirado');
    err.statusCode = 401;
    err.code = 'NAO_AUTENTICADO';
    next(err);
  }
};

export const validarPermissao = (perfisPermitidos: Perfil[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const err: HttpError = new Error('Usuário não autenticado');
      err.statusCode = 401;
      return next(err);
    }

    const perfil = req.user.perfil_principal;

    if (!perfisPermitidos.includes(perfil)) {
      const err: HttpError = new Error(`Perfil ${perfil} não tem permissão para esta ação`);
      err.statusCode = 403;
      err.code = 'PERMISSAO_NEGADA';
      return next(err);
    }

    next();
  };
};

export const validarContexto = (campo: string, origem: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Valida se o usuário tem contexto para acessar o recurso
    // Ex: Gestor pode validar demanda apenas de sua unidade

    if (req.user.perfil_principal === 'GESTOR_SISTEMA') {
      return next(); // Admin pode tudo
    }

    if (req.user.perfil_principal === 'GESTOR_UNIDADE') {
      if (req.user.id_unidade !== req.params[origem]) {
        const err: HttpError = new Error('Você não tem contexto para esta ação');
        err.statusCode = 403;
        err.code = 'PERMISSAO_NEGADA';
        return next(err);
      }
    }

    next();
  };
};
