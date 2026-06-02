const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { autenticar, validarPermissao } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);
router.use(validarPermissao(['GESTOR_SISTEMA']));

const PERFIS = ['SOLICITANTE', 'GESTOR_UNIDADE', 'GESTOR_DEPARTAMENTO', 'ANALISTA_STI', 'DIRETOR_STI', 'RESPONSAVEL_PRODUCAO', 'GESTOR_SISTEMA'];

// Mínimo 8 chars, pelo menos 1 letra e 1 número
const SENHA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
function validarForcaSenha(senha) {
  if (!SENHA_REGEX.test(senha)) {
    const err = new Error('A senha deve ter no mínimo 8 caracteres, incluindo letras e números');
    err.statusCode = 400;
    throw err;
  }
}

const selectUsuario = () =>
  db('tb_usuarios as u')
    .leftJoin('tb_unidades as un', 'u.id_unidade', 'un.id_unidade')
    .leftJoin('tb_departamentos as d', 'u.id_departamento', 'd.id_departamento')
    .select(
      'u.id_usuario', 'u.nome', 'u.email', 'u.cpf',
      'u.perfil_principal', 'u.ativo', 'u.data_criacao',
      'u.id_unidade', 'un.nome_unidade', 'un.sigla',
      'u.id_departamento', 'd.nome_departamento'
    );

// ─── Usuários ─────────────────────────────────────────────────────────────────

router.get('/usuarios', async (req, res, next) => {
  try {
    const { perfil, ativo, busca, pagina = 1, limite = 20 } = req.query;

    let query = selectUsuario();
    if (perfil) query = query.where('u.perfil_principal', perfil);
    if (ativo !== undefined && ativo !== '') query = query.where('u.ativo', ativo === 'true');
    if (busca) query = query.where(function () {
      this.where('u.nome', 'ilike', `%${busca}%`).orWhere('u.email', 'ilike', `%${busca}%`);
    });

    const [{ count }] = await query.clone().count('* as count');
    const usuarios = await query
      .orderBy('u.nome', 'asc')
      .limit(parseInt(limite))
      .offset((parseInt(pagina) - 1) * parseInt(limite));

    res.json({ success: true, usuarios, total: parseInt(count), pagina: parseInt(pagina), totalPaginas: Math.ceil(parseInt(count) / parseInt(limite)) });
  } catch (error) { next(error); }
});

router.post('/usuarios', async (req, res, next) => {
  try {
    const { nome, email, cpf, senha, perfil_principal, id_unidade, id_departamento } = req.body;

    if (!nome || !email || !senha || !perfil_principal) {
      const err = new Error('Nome, email, senha e perfil são obrigatórios'); err.statusCode = 400; throw err;
    }
    validarForcaSenha(senha);
    if (!PERFIS.includes(perfil_principal)) {
      const err = new Error('Perfil inválido'); err.statusCode = 400; throw err;
    }
    if (await db('tb_usuarios').where('email', email).first()) {
      const err = new Error('Email já cadastrado'); err.statusCode = 409; throw err;
    }

    const [{ id_usuario }] = await db('tb_usuarios').insert({
      nome, email, cpf: cpf || null,
      senha_hash: await bcrypt.hash(senha, 10),
      perfil_principal,
      id_unidade: id_unidade || null,
      id_departamento: id_departamento || null,
      ativo: true
    }).returning('id_usuario');

    const usuario = await selectUsuario().where('u.id_usuario', id_usuario).first();
    res.status(201).json({ success: true, usuario, message: 'Usuário criado com sucesso' });
  } catch (error) { next(error); }
});

router.put('/usuarios/:id', async (req, res, next) => {
  try {
    const { nome, email, cpf, perfil_principal, id_unidade, id_departamento, senha } = req.body;

    const atual = await db('tb_usuarios').where('id_usuario', req.params.id).first();
    if (!atual) { const err = new Error('Usuário não encontrado'); err.statusCode = 404; throw err; }

    if (perfil_principal && !PERFIS.includes(perfil_principal)) {
      const err = new Error('Perfil inválido'); err.statusCode = 400; throw err;
    }
    if (email && email !== atual.email) {
      if (await db('tb_usuarios').where('email', email).whereNot('id_usuario', req.params.id).first()) {
        const err = new Error('Email já cadastrado'); err.statusCode = 409; throw err;
      }
    }

    const update = {
      nome: nome || atual.nome,
      email: email || atual.email,
      cpf: cpf !== undefined ? (cpf || null) : atual.cpf,
      perfil_principal: perfil_principal || atual.perfil_principal,
      id_unidade: id_unidade !== undefined ? (id_unidade || null) : atual.id_unidade,
      id_departamento: id_departamento !== undefined ? (id_departamento || null) : atual.id_departamento,
      data_ultima_atualizacao: db.fn.now()
    };
    if (senha) { validarForcaSenha(senha); update.senha_hash = await bcrypt.hash(senha, 10); }

    await db('tb_usuarios').where('id_usuario', req.params.id).update(update);
    const usuario = await selectUsuario().where('u.id_usuario', req.params.id).first();
    res.json({ success: true, usuario, message: 'Usuário atualizado com sucesso' });
  } catch (error) { next(error); }
});

router.patch('/usuarios/:id/ativo', async (req, res, next) => {
  try {
    const usuario = await db('tb_usuarios').where('id_usuario', req.params.id).first();
    if (!usuario) { const err = new Error('Usuário não encontrado'); err.statusCode = 404; throw err; }
    if (Number(req.params.id) === Number(req.user.id_usuario)) {
      const err = new Error('Você não pode desativar sua própria conta'); err.statusCode = 400; throw err;
    }

    await db('tb_usuarios').where('id_usuario', req.params.id).update({ ativo: !usuario.ativo });
    res.json({ success: true, ativo: !usuario.ativo, message: !usuario.ativo ? 'Usuário ativado' : 'Usuário desativado' });
  } catch (error) { next(error); }
});

// ─── Unidades e Departamentos ─────────────────────────────────────────────────

router.get('/unidades', async (req, res, next) => {
  try {
    const unidades = await db('tb_unidades').where('ativo', true).orderBy('nome_unidade', 'asc');
    res.json({ success: true, unidades });
  } catch (error) { next(error); }
});

router.get('/departamentos', async (req, res, next) => {
  try {
    const { id_unidade } = req.query;
    let query = db('tb_departamentos').where('ativo', true).orderBy('nome_departamento', 'asc');
    if (id_unidade) query = query.where('id_unidade', id_unidade);
    res.json({ success: true, departamentos: await query });
  } catch (error) { next(error); }
});

// ─── Atribuições de Gestor ────────────────────────────────────────────────────

router.get('/atribuicoes', async (req, res, next) => {
  try {
    const atribuicoes = await db('tb_atribuicoes_gestor as ag')
      .leftJoin('tb_unidades as un', 'ag.id_unidade', 'un.id_unidade')
      .select(
        'ag.id_atribuicao', 'ag.id_gestor', 'ag.nome_gestor', 'ag.email_gestor',
        'ag.perfil_gestor', 'ag.id_unidade', 'un.nome_unidade', 'un.sigla',
        'ag.ativo', 'ag.data_inicio'
      )
      .where('ag.ativo', true)
      .orderBy('un.nome_unidade', 'asc');
    res.json({ success: true, atribuicoes });
  } catch (error) { next(error); }
});

router.post('/atribuicoes', async (req, res, next) => {
  try {
    const { id_gestor, id_unidade } = req.body;
    if (!id_gestor || !id_unidade) {
      const err = new Error('Gestor e unidade são obrigatórios'); err.statusCode = 400; throw err;
    }

    const gestor = await db('tb_usuarios')
      .where('id_usuario', id_gestor)
      .whereIn('perfil_principal', ['GESTOR_UNIDADE', 'GESTOR_DEPARTAMENTO', 'GESTOR_SISTEMA'])
      .where('ativo', true)
      .first();
    if (!gestor) {
      const err = new Error('Usuário não encontrado ou sem perfil de gestor'); err.statusCode = 400; throw err;
    }

    await db('tb_atribuicoes_gestor')
      .where('id_unidade', id_unidade)
      .where('ativo', true)
      .update({ ativo: false, data_fim: db.fn.now() });

    const [{ id_atribuicao }] = await db('tb_atribuicoes_gestor').insert({
      id_gestor: gestor.id_usuario,
      nome_gestor: gestor.nome,
      email_gestor: gestor.email,
      perfil_gestor: gestor.perfil_principal,
      id_unidade,
      id_usuario_criacao: req.user.id_usuario,
      ativo: true
    }).returning('id_atribuicao');

    const atribuicao = await db('tb_atribuicoes_gestor as ag')
      .leftJoin('tb_unidades as un', 'ag.id_unidade', 'un.id_unidade')
      .select('ag.*', 'un.nome_unidade', 'un.sigla')
      .where('ag.id_atribuicao', id_atribuicao)
      .first();

    res.status(201).json({ success: true, atribuicao, message: 'Gestor atribuído com sucesso' });
  } catch (error) { next(error); }
});

router.delete('/atribuicoes/:id', async (req, res, next) => {
  try {
    const atribuicao = await db('tb_atribuicoes_gestor').where('id_atribuicao', req.params.id).first();
    if (!atribuicao) { const err = new Error('Atribuição não encontrada'); err.statusCode = 404; throw err; }

    await db('tb_atribuicoes_gestor')
      .where('id_atribuicao', req.params.id)
      .update({ ativo: false, data_fim: db.fn.now() });

    res.json({ success: true, message: 'Atribuição removida com sucesso' });
  } catch (error) { next(error); }
});

module.exports = router;
