import express, { Request, Response, NextFunction } from 'express';
import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import db from '../db/connection';
import { autenticar, validarPermissao } from '../middleware/auth';
import type { HttpError } from '../types/http';
import type { Perfil, Usuario, Updatable } from '../types/models';

const router = express.Router();
router.use(autenticar);

const soAdmin = validarPermissao(['GESTOR_SISTEMA', 'ANALISTA_STI']);

const PERFIS: Perfil[] = ['SOLICITANTE', 'GESTOR_UNIDADE', 'GESTOR_DEPARTAMENTO', 'ANALISTA_STI', 'AVALIADOR_TECNICO', 'DPO', 'RESPONSAVEL_PRODUCAO', 'GESTOR_SISTEMA'];

// Perfis secundários permitidos por perfil principal — apenas usuários do departamento STI
const PERFIS_SEC_VALIDOS: Partial<Record<Perfil, Perfil[]>> = {
  ANALISTA_STI:      ['GESTOR_UNIDADE', 'AVALIADOR_TECNICO'],
  GESTOR_UNIDADE:    ['AVALIADOR_TECNICO', 'RESPONSAVEL_PRODUCAO'],
  AVALIADOR_TECNICO: ['RESPONSAVEL_PRODUCAO'],
};

async function _idDeptSti(): Promise<number | null> {
  const unidade = await db('tb_unidades').where('sigla', 'like', 'STI-%').first();
  return unidade?.id_departamento ? Number(unidade.id_departamento) : null;
}

function _validarPerfisSecundarios(perfilPrincipal: Perfil, perfisSecundarios: Perfil[]): void {
  if (!perfisSecundarios.length) return;
  // eslint-disable-next-line security/detect-object-injection
  const permitidos = PERFIS_SEC_VALIDOS[perfilPrincipal] ?? [];
  if (!permitidos.length) {
    const err: HttpError = new Error(`O perfil ${perfilPrincipal} não pode ter perfis secundários.`);
    err.statusCode = 400;
    throw err;
  }
  const invalidos = perfisSecundarios.filter(p => !permitidos.includes(p));
  if (invalidos.length) {
    const nomes = invalidos.join(', ');
    const err: HttpError = new Error(`Perfil(s) secundário(s) inválido(s) para ${perfilPrincipal}: ${nomes}. Permitidos: ${permitidos.join(', ')}.`);
    err.statusCode = 400;
    throw err;
  }
}

// Mínimo 8 chars, pelo menos 1 letra e 1 número
const SENHA_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
function validarForcaSenha(senha: string): void {
  if (!SENHA_REGEX.test(senha)) {
    const err: HttpError = new Error('A senha deve ter no mínimo 8 caracteres, incluindo letras e números');
    err.statusCode = 400;
    throw err;
  }
}

// Garante que GESTOR_UNIDADE (principal ou secundário) tenha exatamente uma atribuição ativa
async function _sincronizarAtribuicaoGestor(
  idUsuario: string | number,
  nome: string,
  email: string,
  perfil: Perfil,
  perfisSecundarios: Perfil[],
  idUnidade: string | number | null,
  idAdmin: string | number
): Promise<void> {
  const ehGestor = perfil === 'GESTOR_UNIDADE' || perfisSecundarios.includes('GESTOR_UNIDADE');
  if (!ehGestor || !idUnidade) return;

  const jaExiste = await db('tb_atribuicoes_gestor')
    .where('id_gestor', idUsuario)
    .where('id_unidade', idUnidade)
    .where('ativo', true)
    .first();

  if (!jaExiste) {
    // Regra 2: desativa TODAS as atribuições ativas do gestor (ele só pode gerenciar uma unidade)
    await db('tb_atribuicoes_gestor')
      .where('id_gestor', idUsuario)
      .where('ativo', true)
      .update({ ativo: false, data_fim: db.fn.now() });

    // Desativa qualquer outro gestor ativo na unidade de destino
    await db('tb_atribuicoes_gestor')
      .where('id_unidade', idUnidade)
      .where('ativo', true)
      .update({ ativo: false, data_fim: db.fn.now() });

    await db('tb_atribuicoes_gestor').insert({
      id_gestor: idUsuario,
      nome_gestor: nome,
      email_gestor: email,
      perfil_gestor: 'GESTOR_UNIDADE',
      id_unidade: idUnidade,
      id_usuario_criacao: idAdmin,
      ativo: true,
    });
  }
}

const selectUsuario = (): Knex.QueryBuilder =>
  db('tb_usuarios as u')
    .leftJoin('tb_unidades as un', 'u.id_unidade', 'un.id_unidade')
    .leftJoin('tb_departamentos as d', 'u.id_departamento', 'd.id_departamento')
    .select(
      'u.id_usuario', 'u.nome', 'u.email',
      'u.perfil_principal', 'u.perfis_secundarios', 'u.ativo', 'u.data_criacao',
      'u.id_unidade', 'un.nome_unidade', 'un.sigla',
      'u.id_departamento', 'd.nome_departamento'
    );

// ─── Usuários ─────────────────────────────────────────────────────────────────

router.get('/usuarios', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { perfil, ativo, busca, id_departamento, id_unidade } = req.query as Record<string, string | undefined>;
    const pagina = (req.query.pagina as string) ?? '1';
    const limite = (req.query.limite as string) ?? '20';

    let query = selectUsuario();
    if (perfil) query = query.where(function () {
      this.where('u.perfil_principal', perfil)
          .orWhereRaw("u.perfis_secundarios::jsonb \\? ?", [perfil]);
    });
    if (ativo !== undefined && ativo !== '') query = query.where('u.ativo', ativo === 'true');
    if (busca) query = query.where(function () {
      this.where('u.nome', 'ilike', `%${busca}%`).orWhere('u.email', 'ilike', `%${busca}%`);
    });
    if (id_departamento) query = query.where('u.id_departamento', id_departamento);
    if (id_unidade) query = query.where('u.id_unidade', id_unidade);

    const [{ count }] = (await query.clone().clearSelect().count('* as count')) as Array<{ count: string }>;
    const usuarios = await query
      .orderBy('u.nome', 'asc')
      .limit(parseInt(limite))
      .offset((parseInt(pagina) - 1) * parseInt(limite));

    res.json({ success: true, usuarios, total: parseInt(count), pagina: parseInt(pagina), totalPaginas: Math.ceil(parseInt(count) / parseInt(limite)) });
  } catch (error) { next(error); }
});

// eslint-disable-next-line sonarjs/cognitive-complexity
router.post('/usuarios', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, email, senha, perfil_principal, perfis_secundarios, id_unidade, id_departamento } = req.body;

    if (!nome || !email || !senha || !perfil_principal) {
      const err: HttpError = new Error('Nome, email, senha e perfil são obrigatórios'); err.statusCode = 400; throw err;
    }
    const precisaUnidade = perfil_principal !== 'GESTOR_DEPARTAMENTO';
    if (!id_departamento || (precisaUnidade && !id_unidade)) {
      const err: HttpError = new Error(
        precisaUnidade
          ? 'Departamento e unidade são obrigatórios para todos os usuários'
          : 'Departamento é obrigatório para Gestor de Departamento'
      ); err.statusCode = 400; throw err;
    }
    validarForcaSenha(senha);
    if (!PERFIS.includes(perfil_principal)) {
      const err: HttpError = new Error('Perfil inválido'); err.statusCode = 400; throw err;
    }
    if (perfil_principal === 'AVALIADOR_TECNICO') {
      const idDeptSti = await _idDeptSti();
      if (!idDeptSti || Number(id_departamento) !== Number(idDeptSti)) {
        const err: HttpError = new Error('O perfil Avaliador Técnico é exclusivo para usuários da Secretaria de Tecnologia da Informação'); err.statusCode = 400; throw err;
      }
    }
    if (await db('tb_usuarios').where('email', email).first()) {
      const err: HttpError = new Error('Email já cadastrado'); err.statusCode = 409; throw err;
    }

    const perfisSecNorm: Perfil[] = Array.isArray(perfis_secundarios) ? perfis_secundarios : [];
    if (perfisSecNorm.length) {
      _validarPerfisSecundarios(perfil_principal, perfisSecNorm);
      const idDeptSti = await _idDeptSti();
      if (!idDeptSti || Number(id_departamento) !== Number(idDeptSti)) {
        const err: HttpError = new Error('Perfis secundários só são permitidos para usuários do departamento STI'); err.statusCode = 400; throw err;
      }
    }

    const [{ id_usuario }] = await db('tb_usuarios').insert({
      nome, email,
      senha_hash: await bcrypt.hash(senha, 10),
      perfil_principal,
      perfis_secundarios: (perfisSecNorm.length ? JSON.stringify(perfisSecNorm) : null) as unknown as Perfil[] | null,
      id_unidade: id_unidade || null,
      id_departamento: id_departamento || null,
      ativo: true,
    }).returning('id_usuario');

    await _sincronizarAtribuicaoGestor(id_usuario, nome, email, perfil_principal, perfisSecNorm, id_unidade || null, req.user.id_usuario);

    const usuario = await selectUsuario().where('u.id_usuario', id_usuario).first();
    res.status(201).json({ success: true, usuario, message: 'Usuário criado com sucesso' });
  } catch (error) { next(error); }
});

// eslint-disable-next-line sonarjs/cognitive-complexity
router.put('/usuarios/:id', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, email, perfil_principal, perfis_secundarios, id_unidade, id_departamento, senha } = req.body;

    const atual = await db('tb_usuarios').where('id_usuario', req.params.id).first();
    if (!atual) { const err: HttpError = new Error('Usuário não encontrado'); err.statusCode = 404; throw err; }

    if (perfil_principal && !PERFIS.includes(perfil_principal)) {
      const err: HttpError = new Error('Perfil inválido'); err.statusCode = 400; throw err;
    }
    if (email && email !== atual.email) {
      if (await db('tb_usuarios').where('email', email).whereNot('id_usuario', req.params.id).first()) {
        const err: HttpError = new Error('Email já cadastrado'); err.statusCode = 409; throw err;
      }
    }

    const perfilFinal = (perfil_principal || atual.perfil_principal) as Perfil;
    const deptFinal = id_departamento !== undefined ? (id_departamento || null) : atual.id_departamento;
    const unidadeFinalChk = id_unidade !== undefined ? (id_unidade || null) : atual.id_unidade;
    const precisaUnidadeEdit = perfilFinal !== 'GESTOR_DEPARTAMENTO';
    if (!deptFinal || (precisaUnidadeEdit && !unidadeFinalChk)) {
      const err: HttpError = new Error(
        precisaUnidadeEdit
          ? 'Departamento e unidade são obrigatórios para todos os usuários'
          : 'Departamento é obrigatório para Gestor de Departamento'
      ); err.statusCode = 400; throw err;
    }
    if (perfilFinal === 'AVALIADOR_TECNICO') {
      const idDeptStiChk = await _idDeptSti();
      if (!idDeptStiChk || Number(deptFinal) !== Number(idDeptStiChk)) {
        const err: HttpError = new Error('O perfil Avaliador Técnico é exclusivo para usuários da Secretaria de Tecnologia da Informação'); err.statusCode = 400; throw err;
      }
    }
    let perfisSecFinal: Perfil[] | null = null;

    if (perfis_secundarios !== undefined) {
      const perfisSecNorm: Perfil[] = Array.isArray(perfis_secundarios) ? perfis_secundarios : [];
      if (perfisSecNorm.length) {
        _validarPerfisSecundarios(perfilFinal, perfisSecNorm);
        const idDeptSti = await _idDeptSti();
        if (!idDeptSti || Number(deptFinal) !== Number(idDeptSti)) {
          const err: HttpError = new Error('Perfis secundários só são permitidos para usuários do departamento STI'); err.statusCode = 400; throw err;
        }
      }
      perfisSecFinal = perfisSecNorm.length ? perfisSecNorm : null;
    }

    const update: Updatable<Usuario> = {
      nome: nome || atual.nome,
      email: email || atual.email,
      perfil_principal: perfilFinal,
      id_unidade: id_unidade !== undefined ? (id_unidade || null) : atual.id_unidade,
      id_departamento: deptFinal,
      data_ultima_atualizacao: db.fn.now(),
    };
    if (perfis_secundarios !== undefined) (update as Record<string, unknown>).perfis_secundarios = perfisSecFinal ? JSON.stringify(perfisSecFinal) : null;
    if (senha) { validarForcaSenha(senha); update.senha_hash = await bcrypt.hash(senha, 10); }

    await db('tb_usuarios').where('id_usuario', req.params.id).update(update);

    const nomeFinal: string = nome || atual.nome;
    const emailFinal: string = email || atual.email;
    const unidadeFinal = id_unidade !== undefined ? (id_unidade || null) : atual.id_unidade;
    const perfisSecSync = perfisSecFinal ?? [];
    await _sincronizarAtribuicaoGestor(req.params.id, nomeFinal, emailFinal, perfilFinal, perfisSecSync, unidadeFinal, req.user.id_usuario);

    const usuario = await selectUsuario().where('u.id_usuario', req.params.id).first();
    res.json({ success: true, usuario, message: 'Usuário atualizado com sucesso' });
  } catch (error) { next(error); }
});

router.patch('/usuarios/:id/ativo', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await db('tb_usuarios').where('id_usuario', req.params.id).first();
    if (!usuario) { const err: HttpError = new Error('Usuário não encontrado'); err.statusCode = 404; throw err; }
    if (Number(req.params.id) === Number(req.user.id_usuario)) {
      const err: HttpError = new Error('Você não pode desativar sua própria conta'); err.statusCode = 400; throw err;
    }

    await db('tb_usuarios').where('id_usuario', req.params.id).update({ ativo: !usuario.ativo });
    res.json({ success: true, ativo: !usuario.ativo, message: !usuario.ativo ? 'Usuário ativado' : 'Usuário desativado' });
  } catch (error) { next(error); }
});

// ─── Unidades e Departamentos ─────────────────────────────────────────────────

router.get('/unidades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id_departamento } = req.query as Record<string, string | undefined>;
    let query = db('tb_unidades').where('ativo', true).orderBy('nome_unidade', 'asc');
    if (id_departamento) query = query.where('id_departamento', id_departamento);
    res.json({ success: true, unidades: await query });
  } catch (error) { next(error); }
});

router.get('/departamentos', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const departamentos = await db('tb_departamentos').where('ativo', true).orderBy('nome_departamento', 'asc');
    res.json({ success: true, departamentos });
  } catch (error) { next(error); }
});

router.post('/departamentos', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome_departamento, descricao } = req.body as { nome_departamento?: string; descricao?: string };
    if (!nome_departamento?.trim()) {
      const err: HttpError = new Error('Nome do departamento é obrigatório'); err.statusCode = 400; throw err;
    }
    const jaExiste = await db('tb_departamentos')
      .whereRaw('LOWER(nome_departamento) = LOWER(?)', [nome_departamento.trim()])
      .first();
    if (jaExiste) {
      const err: HttpError = new Error('Já existe um departamento com este nome'); err.statusCode = 409; throw err;
    }
    const [dept] = await db('tb_departamentos').insert({
      nome_departamento: nome_departamento.trim(),
      descricao: descricao?.trim() || null,
      ativo: true,
    }).returning('*');
    res.status(201).json({ success: true, departamento: dept, message: 'Departamento criado com sucesso' });
  } catch (error) { next(error); }
});

router.post('/unidades', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sigla, nome_unidade, id_departamento, descricao } = req.body as {
      sigla?: string; nome_unidade?: string; id_departamento?: string | number; descricao?: string;
    };
    if (!sigla?.trim() || !nome_unidade?.trim() || !id_departamento) {
      const err: HttpError = new Error('Sigla, nome da unidade e departamento são obrigatórios'); err.statusCode = 400; throw err;
    }
    const siglaUpper = sigla.trim().toUpperCase();
    if (await db('tb_unidades').where('sigla', siglaUpper).first()) {
      const err: HttpError = new Error('Já existe uma unidade com esta sigla'); err.statusCode = 409; throw err;
    }
    const dept = await db('tb_departamentos').where('id_departamento', id_departamento).where('ativo', true).first();
    if (!dept) {
      const err: HttpError = new Error('Departamento não encontrado'); err.statusCode = 400; throw err;
    }
    const [unidade] = await db('tb_unidades').insert({
      sigla: siglaUpper,
      nome_unidade: nome_unidade.trim(),
      id_departamento,
      descricao: descricao?.trim() || null,
      ativo: true,
    }).returning('*');
    res.status(201).json({ success: true, unidade, message: 'Unidade criada com sucesso' });
  } catch (error) { next(error); }
});

// ─── Atribuições de Gestor ────────────────────────────────────────────────────

router.get('/atribuicoes', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
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

router.post('/atribuicoes', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id_gestor, id_unidade } = req.body;
    if (!id_gestor || !id_unidade) {
      const err: HttpError = new Error('Gestor e unidade são obrigatórios'); err.statusCode = 400; throw err;
    }

    const gestor = await db('tb_usuarios')
      .where('id_usuario', id_gestor)
      .where('ativo', true)
      .first();
    let perfisSecGestor: Perfil[];
    if (Array.isArray(gestor?.perfis_secundarios)) perfisSecGestor = gestor.perfis_secundarios;
    else if (typeof gestor?.perfis_secundarios === 'string') perfisSecGestor = JSON.parse(gestor.perfis_secundarios);
    else perfisSecGestor = [];
    const ehGestor = gestor?.perfil_principal === 'GESTOR_UNIDADE' || perfisSecGestor.includes('GESTOR_UNIDADE');
    if (!gestor || !ehGestor) {
      const err: HttpError = new Error('Usuário não encontrado ou não possui perfil GESTOR_UNIDADE'); err.statusCode = 400; throw err;
    }

    // Regra 2: desativa TODAS as atribuições ativas do gestor (uma unidade por vez)
    await db('tb_atribuicoes_gestor')
      .where('id_gestor', gestor.id_usuario)
      .where('ativo', true)
      .update({ ativo: false, data_fim: db.fn.now() });

    // Desativa qualquer outro gestor ativo na unidade de destino
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
      ativo: true,
    }).returning('id_atribuicao');

    const atribuicao = await db('tb_atribuicoes_gestor as ag')
      .leftJoin('tb_unidades as un', 'ag.id_unidade', 'un.id_unidade')
      .select('ag.*', 'un.nome_unidade', 'un.sigla')
      .where('ag.id_atribuicao', id_atribuicao)
      .first();

    res.status(201).json({ success: true, atribuicao, message: 'Gestor atribuído com sucesso' });
  } catch (error) { next(error); }
});

router.delete('/atribuicoes/:id', soAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const atribuicao = await db('tb_atribuicoes_gestor').where('id_atribuicao', req.params.id).first();
    if (!atribuicao) { const err: HttpError = new Error('Atribuição não encontrada'); err.statusCode = 404; throw err; }

    await db('tb_atribuicoes_gestor')
      .where('id_atribuicao', req.params.id)
      .update({ ativo: false, data_fim: db.fn.now() });

    res.json({ success: true, message: 'Atribuição removida com sucesso' });
  } catch (error) { next(error); }
});

// ─── Diagnóstico: gestores sem atribuição ─────────────────────────────────────

router.get('/diagnostico/gestores-sem-atribuicao', soAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const gestoresSemAtribuicao = await db('tb_usuarios as u')
      .leftJoin('tb_unidades as un', 'u.id_unidade', 'un.id_unidade')
      .where('u.ativo', true)
      .where(function () {
        this.where('u.perfil_principal', 'GESTOR_UNIDADE')
          .orWhereRaw("u.perfis_secundarios::jsonb ? 'GESTOR_UNIDADE'");
      })
      .whereNotExists(
        db('tb_atribuicoes_gestor as ag')
          .whereRaw('ag.id_gestor = u.id_usuario')
          .where('ag.ativo', true)
      )
      .select(
        'u.id_usuario', 'u.nome', 'u.email', 'u.perfil_principal',
        'un.id_unidade', 'un.nome_unidade', 'un.sigla'
      )
      .orderBy('u.nome');

    res.json({ success: true, gestores_sem_atribuicao: gestoresSemAtribuicao, total: gestoresSemAtribuicao.length });
  } catch (error) { next(error); }
});

export default router;
