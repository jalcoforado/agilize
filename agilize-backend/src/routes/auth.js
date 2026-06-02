const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');

const router = express.Router();

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      const err = new Error('Email e senha são obrigatórios');
      err.statusCode = 400;
      throw err;
    }

    const usuario = await db('tb_usuarios')
      .where('email', email)
      .where('ativo', true)
      .first();

    if (!usuario) {
      const err = new Error('Usuário não encontrado');
      err.statusCode = 401;
      throw err;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      const err = new Error('Senha incorreta');
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        nome: usuario.nome,
        perfil_principal: usuario.perfil_principal,
        id_unidade: usuario.id_unidade,
        id_departamento: usuario.id_departamento
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30m' }
    );

    res.status(200).json({
      success: true,
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil_principal: usuario.perfil_principal,
        unidade: usuario.id_unidade ? `Unidade ${usuario.id_unidade}` : null
      },
      expire_em: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Refresh Token
router.post('/refresh-token', (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      const err = new Error('Token não fornecido');
      err.statusCode = 401;
      throw err;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    const novoToken = jwt.sign(
      {
        id_usuario: decoded.id_usuario,
        email: decoded.email,
        nome: decoded.nome,
        perfil_principal: decoded.perfil_principal,
        id_unidade: decoded.id_unidade
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30m' }
    );

    res.status(200).json({
      success: true,
      token: novoToken,
      expire_em: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Logout (apenas registra no cliente)
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

module.exports = router;
