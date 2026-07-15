import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db/connection';
import type { HttpError } from '../types/http';
import type { AuthUser } from '../types/models';

const router = express.Router();

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      const err: HttpError = new Error('Email e senha são obrigatórios');
      err.statusCode = 400;
      throw err;
    }

    const usuario = await db('tb_usuarios as u')
      .leftJoin('tb_unidades as un', 'u.id_unidade', 'un.id_unidade')
      .leftJoin('tb_departamentos as d', 'u.id_departamento', 'd.id_departamento')
      .select(
        'u.id_usuario', 'u.nome', 'u.email', 'u.senha_hash',
        'u.perfil_principal', 'u.perfis_secundarios', 'u.ativo',
        'u.id_unidade', 'un.nome_unidade', 'un.sigla',
        'u.id_departamento', 'd.nome_departamento'
      )
      .where('u.email', email)
      .where('u.ativo', true)
      .first();

    if (!usuario) {
      const err: HttpError = new Error('Usuário não encontrado');
      err.statusCode = 401;
      throw err;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const err: HttpError = new Error('Senha incorreta');
      err.statusCode = 401;
      throw err;
    }

    const signOptions: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRE || '30m') as jwt.SignOptions['expiresIn'],
    };
    let perfisSecundarios: string[];
    if (Array.isArray(usuario.perfis_secundarios)) perfisSecundarios = usuario.perfis_secundarios;
    else if (typeof usuario.perfis_secundarios === 'string') perfisSecundarios = JSON.parse(usuario.perfis_secundarios);
    else perfisSecundarios = [];

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        nome: usuario.nome,
        perfil_principal: usuario.perfil_principal,
        perfis_secundarios: perfisSecundarios,
        id_unidade: usuario.id_unidade,
        id_departamento: usuario.id_departamento,
      },
      process.env.JWT_SECRET as string,
      signOptions
    );

    res.status(200).json({
      success: true,
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil_principal: usuario.perfil_principal,
        perfis_secundarios: perfisSecundarios,
        id_unidade: usuario.id_unidade ?? null,
        nome_unidade: usuario.nome_unidade ?? null,
        sigla_unidade: usuario.sigla ?? null,
        id_departamento: usuario.id_departamento ?? null,
        nome_departamento: usuario.nome_departamento ?? null,
      },
      expire_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Refresh Token
router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      const err: HttpError = new Error('Token não fornecido');
      err.statusCode = 401;
      throw err;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'], ignoreExpiration: true }) as AuthUser;

    const usuario = await db('tb_usuarios as u')
      .leftJoin('tb_unidades as un', 'u.id_unidade', 'un.id_unidade')
      .leftJoin('tb_departamentos as d', 'u.id_departamento', 'd.id_departamento')
      .select(
        'u.id_usuario', 'u.nome', 'u.email',
        'u.perfil_principal', 'u.perfis_secundarios', 'u.ativo',
        'u.id_unidade', 'u.id_departamento'
      )
      .where('u.id_usuario', decoded.id_usuario)
      .where('u.ativo', true)
      .first();

    if (!usuario) {
      const err: HttpError = new Error('Acesso revogado');
      err.statusCode = 401;
      throw err;
    }

    let perfisSecundarios: string[];
    if (Array.isArray(usuario.perfis_secundarios)) perfisSecundarios = usuario.perfis_secundarios;
    else if (typeof usuario.perfis_secundarios === 'string') perfisSecundarios = JSON.parse(usuario.perfis_secundarios);
    else perfisSecundarios = [];

    const signOptions: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRE || '30m') as jwt.SignOptions['expiresIn'],
    };
    const novoToken = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        nome: usuario.nome,
        perfil_principal: usuario.perfil_principal,
        perfis_secundarios: perfisSecundarios,
        id_unidade: usuario.id_unidade,
        id_departamento: usuario.id_departamento,
      },
      process.env.JWT_SECRET as string,
      signOptions
    );

    res.status(200).json({
      success: true,
      token: novoToken,
      expire_em: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Logout (apenas registra no cliente)
router.post('/logout', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logout realizado com sucesso',
  });
});

export default router;
