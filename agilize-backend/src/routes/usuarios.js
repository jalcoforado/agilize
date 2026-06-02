const express = require('express');
const db = require('../db/connection');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/diretores', async (req, res, next) => {
  try {
    const diretores = await db('tb_usuarios')
      .where('perfil_principal', 'DIRETOR_STI')
      .where('ativo', true)
      .select('id_usuario', 'nome', 'email')
      .orderBy('nome', 'asc');
    res.json({ success: true, diretores });
  } catch (error) { next(error); }
});

module.exports = router;
