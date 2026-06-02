const express = require('express');
const { autenticar } = require('../middleware/auth');
const notificacaoService = require('../services/notificacao');

const router = express.Router();

router.use(autenticar);

// GET /api/v1/notificacoes — listar notificações do usuário logado
router.get('/', async (req, res, next) => {
  try {
    const { pagina = 1, limite = 20, nao_lidas } = req.query;
    const resultado = await notificacaoService.listarPorUsuario(
      req.user.id_usuario,
      {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        apenasNaoLidas: nao_lidas === 'true'
      }
    );
    res.status(200).json({ success: true, ...resultado });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/notificacoes/nao-lidas/count — contador de não lidas
router.get('/nao-lidas/count', async (req, res, next) => {
  try {
    const total = await notificacaoService.contarNaoLidas(req.user.id_usuario);
    res.status(200).json({ success: true, total });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/notificacoes/todas-lidas — marcar todas como lidas
router.patch('/todas-lidas', async (req, res, next) => {
  try {
    const resultado = await notificacaoService.marcarTodasComoLidas(req.user.id_usuario);
    res.status(200).json({ success: true, ...resultado, message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/notificacoes/:id/lida — marcar uma notificação como lida
router.patch('/:id/lida', async (req, res, next) => {
  try {
    const notificacao = await notificacaoService.marcarComoLida(
      parseInt(req.params.id),
      req.user.id_usuario
    );
    res.status(200).json({ success: true, notificacao });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
