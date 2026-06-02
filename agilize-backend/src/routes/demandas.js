const express = require('express');
const { DemandaController, HistoricoController } = require('../controllers');
const { autenticar } = require('../middleware/auth');
const { validarDemanda, validarValidacao, validarHomologacao, validarRejeicao, validarCancelamento } = require('../middleware/validacao');

const router = express.Router();
router.use(autenticar);

// CRUD
router.post('/', validarDemanda, DemandaController.criar);
router.put('/:id', validarDemanda, DemandaController.atualizar);
router.get('/', DemandaController.listar);
router.get('/:id', DemandaController.obter);

// ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────
router.post('/:id/enviar-gestor', DemandaController.enviarParaGestor);
router.post('/:id/validar-gestor', validarValidacao, DemandaController.validarGestor);
router.post('/:id/devolver', validarValidacao, DemandaController.devolver);
router.post('/:id/rejeitar-gestor', validarRejeicao, DemandaController.rejeitarGestor);
router.post('/:id/iniciar-ajuste', DemandaController.iniciarAjuste);
router.post('/:id/enviar-sti', DemandaController.enviarParaSTI);
router.post('/:id/aprovar-sti', validarValidacao, DemandaController.aprovarSTI);
router.post('/:id/reprovar-sti', validarRejeicao, DemandaController.reprovarSTI);
router.post('/:id/solicitar-ajustes-sti', validarValidacao, DemandaController.solicitarAjustesSTI);
router.post('/:id/reenviar-sti', DemandaController.reenviarParaSTI);

// ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────
router.post('/:id/iniciar-desenvolvimento', DemandaController.iniciarDesenvolvimento);
router.post('/:id/submeter-produto', validarValidacao, DemandaController.submeterProduto);

// ─── FASE 3: HOMOLOGAÇÃO ──────────────────────────────────────────────────
router.post('/:id/validar-homologacao-gestor', validarValidacao, DemandaController.validarHomologacaoGestor);
router.post('/:id/devolver-homologacao', validarValidacao, DemandaController.devolverHomologacao);
router.post('/:id/iniciar-ajuste-homologacao', DemandaController.iniciarAjusteHomologacao);
router.post('/:id/enviar-homologacao-sti', DemandaController.enviarHomologacaoSTI);
router.post('/:id/solicitar-ajustes-homologacao', validarValidacao, DemandaController.solicitarAjustesHomologacao);
router.post('/:id/homologar', validarHomologacao, DemandaController.homologar);
router.post('/:id/rejeitar', validarRejeicao, DemandaController.rejeitar);
router.post('/:id/reenviar-homologacao-sti', DemandaController.reenviarHomologacaoSTI);

// ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────
router.post('/:id/iniciar-deploy', validarValidacao, DemandaController.iniciarDeploy);
router.post('/:id/confirmar-deploy', validarValidacao, DemandaController.confirmarDeploy);
router.post('/:id/desativar', validarCancelamento, DemandaController.desativar);

// ─── DIRETOR STI ─────────────────────────────────────────────────────────
router.post('/:id/encaminhar-diretor', DemandaController.encaminharDiretor);
router.post('/:id/diretor-solicitar-ajustes', DemandaController.diretorSolicitarAjustes);
router.post('/:id/diretor-devolver-analista', DemandaController.diretorDevolverAnalista);

// ─── CANCELAMENTO ─────────────────────────────────────────────────────────
router.post('/:id/cancelar', validarCancelamento, DemandaController.cancelar);

// Diagnóstico IA
router.get('/:id/diagnostico', DemandaController.obterDiagnostico);

// Histórico
router.get('/:idDemanda/historico', HistoricoController.obterPorDemanda);

module.exports = router;
