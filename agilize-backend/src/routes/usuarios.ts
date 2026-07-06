import express, { Request, Response, NextFunction } from 'express';
import db from '../db/connection';
import { autenticar } from '../middleware/auth';

const router = express.Router();
router.use(autenticar);

router.get('/avaliadores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const avaliadores = await db('tb_usuarios')
      .where('perfil_principal', 'AVALIADOR_TECNICO')
      .where('ativo', true)
      .select('id_usuario', 'nome', 'email')
      .orderBy('nome', 'asc');
    res.json({ success: true, avaliadores });
  } catch (error) { next(error); }
});

router.get('/dpos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dpos = await db('tb_usuarios')
      .where('perfil_principal', 'DPO')
      .where('ativo', true)
      .select('id_usuario', 'nome', 'email')
      .orderBy('nome', 'asc');
    res.json({ success: true, dpos });
  } catch (error) { next(error); }
});

router.get('/responsaveis-producao', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const responsaveis = await db('tb_usuarios')
      .where('perfil_principal', 'RESPONSAVEL_PRODUCAO')
      .where('ativo', true)
      .select('id_usuario', 'nome', 'email')
      .orderBy('nome', 'asc');
    res.json({ success: true, responsaveis });
  } catch (error) { next(error); }
});

// Unidades STI que possuem ao menos um Avaliador Técnico ativo (principal ou secundário)
router.get('/unidades-avaliadores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unidades = await db('tb_unidades as u')
      .join('tb_usuarios as usr', 'usr.id_unidade', 'u.id_unidade')
      .where('usr.ativo', true)
      .where(function () {
        this.where('usr.perfil_principal', 'AVALIADOR_TECNICO')
            .orWhereRaw("usr.perfis_secundarios::jsonb \\? 'AVALIADOR_TECNICO'");
      })
      .distinct('u.id_unidade', 'u.sigla', 'u.nome_unidade')
      .orderBy('u.nome_unidade', 'asc');
    res.json({ success: true, unidades });
  } catch (error) { next(error); }
});

// Unidades que possuem ao menos um Responsável de Produção ativo (principal ou secundário)
router.get('/unidades-producao', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const unidades = await db('tb_unidades as u')
      .join('tb_usuarios as usr', 'usr.id_unidade', 'u.id_unidade')
      .where('usr.ativo', true)
      .where(function () {
        this.where('usr.perfil_principal', 'RESPONSAVEL_PRODUCAO')
            .orWhereRaw("usr.perfis_secundarios::jsonb \\? 'RESPONSAVEL_PRODUCAO'");
      })
      .distinct('u.id_unidade', 'u.sigla', 'u.nome_unidade')
      .orderBy('u.nome_unidade', 'asc');
    res.json({ success: true, unidades });
  } catch (error) { next(error); }
});

export default router;
