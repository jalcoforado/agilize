import express, { Request, Response, NextFunction } from 'express';
import { DemandaController, HistoricoController } from '../controllers';
import { autenticar } from '../middleware/auth';
import { verificarAcessoDemanda } from '../middleware/acesso';
import { validarDemanda, validarValidacao, validarAprovacao, validarHomologacao, validarRejeicao, validarCancelamento } from '../middleware/validacao';
import db from '../db/connection';
import type { AnexoInfo } from '../types/models';

const router = express.Router();
router.use(autenticar);

// CRUD
router.post('/', validarDemanda, DemandaController.criar);
router.put('/:id', validarDemanda, DemandaController.atualizar);
router.patch('/:id/anexos', DemandaController.atualizarAnexos);
router.get('/', DemandaController.listar);
router.get('/:id', verificarAcessoDemanda, DemandaController.obter);

// ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────
router.post('/:id/enviar-gestor', DemandaController.enviarParaGestor);
router.post('/:id/validar-gestor', validarAprovacao, DemandaController.validarGestor);
router.post('/:id/devolver', validarValidacao, DemandaController.devolver);
router.post('/:id/rejeitar-gestor', validarRejeicao, DemandaController.rejeitarGestor);
router.post('/:id/iniciar-ajuste', DemandaController.iniciarAjuste);
router.post('/:id/enviar-sti', DemandaController.enviarParaSTI);
router.post('/:id/aprovar-sti', validarAprovacao, DemandaController.aprovarSTI);
router.post('/:id/reprovar-sti', validarRejeicao, DemandaController.reprovarSTI);
router.post('/:id/solicitar-ajustes-sti', validarValidacao, DemandaController.solicitarAjustesSTI);
router.post('/:id/reenviar-sti', DemandaController.reenviarParaSTI);

// ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────
router.post('/:id/iniciar-desenvolvimento', DemandaController.iniciarDesenvolvimento);
router.post('/:id/submeter-produto', validarAprovacao, DemandaController.submeterProduto);

// ─── FASE 3: HOMOLOGAÇÃO ──────────────────────────────────────────────────
router.post('/:id/validar-homologacao-gestor', validarAprovacao, DemandaController.validarHomologacaoGestor);
router.post('/:id/devolver-homologacao', validarValidacao, DemandaController.devolverHomologacao);
router.post('/:id/iniciar-ajuste-homologacao', DemandaController.iniciarAjusteHomologacao);
router.post('/:id/enviar-homologacao-sti', DemandaController.enviarHomologacaoSTI);
router.post('/:id/solicitar-ajustes-homologacao', validarValidacao, DemandaController.solicitarAjustesHomologacao);
router.post('/:id/homologar', validarHomologacao, DemandaController.homologar);
router.post('/:id/rejeitar', validarRejeicao, DemandaController.rejeitar);
router.post('/:id/reenviar-homologacao-sti', DemandaController.reenviarHomologacaoSTI);

// ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────
router.post('/:id/iniciar-deploy', validarAprovacao, DemandaController.iniciarDeploy);
router.post('/:id/confirmar-deploy', validarAprovacao, DemandaController.confirmarDeploy);
router.post('/:id/desativar', validarCancelamento, DemandaController.desativar);

// ─── AVALIADOR TÉCNICO ───────────────────────────────────────────────────
router.post('/:id/encaminhar-avaliador-tecnico', DemandaController.encaminharAvaliador);
router.post('/:id/avaliador-solicitar-ajustes', DemandaController.avaliadorSolicitarAjustes);
router.post('/:id/avaliador-devolver-analista', DemandaController.avaliadorDevolverAnalista);

// ─── DPO ─────────────────────────────────────────────────────────────────────
router.post('/:id/encaminhar-dpo',        DemandaController.encaminharDPO);
router.post('/:id/dpo-aprovar',           validarAprovacao, DemandaController.dpoAprovar);
router.post('/:id/dpo-solicitar-ajustes', validarValidacao, DemandaController.dpoSolicitarAjustes);

// ─── CANCELAMENTO ─────────────────────────────────────────────────────────
router.post('/:id/cancelar', validarCancelamento, DemandaController.cancelar);

// Diagnóstico IA
router.get('/:id/diagnostico', verificarAcessoDemanda, DemandaController.obterDiagnostico);

// Histórico
router.get('/:idDemanda/historico', verificarAcessoDemanda, HistoricoController.obterPorDemanda);

// Download de anexo do histórico
router.get('/:id/historico/:idHistorico/anexo/:idx', verificarAcessoDemanda, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idHistorico, idx } = req.params;
    const row = await db('tb_historico_decisoes').where('id_historico', idHistorico).first();
    if (!row?.anexos) return res.status(404).json({ success: false, message: 'Anexo não encontrado' });

    const lista: AnexoInfo[] = Array.isArray(row.anexos)
      ? (row.anexos as AnexoInfo[])
      : (JSON.parse(row.anexos as string) as AnexoInfo[]);

    const anexo = lista[parseInt(idx)];
    if (!anexo) return res.status(404).json({ success: false, message: 'Índice inválido' });

    const match = anexo.conteudo.match(/^data:(.+);base64,(.+)$/s);
    if (!match) return res.status(400).json({ success: false, message: 'Conteúdo inválido' });

    const [, mime, b64] = match;
    const buf = Buffer.from(b64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(anexo.nome)}`);
    res.setHeader('Content-Length', buf.length);
    res.end(buf);
  } catch (error) { next(error); }
});

export default router;
