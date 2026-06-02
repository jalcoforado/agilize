const express = require('express');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.use(autenticar);

router.get('/:idDemanda', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint de histórico'
  });
});

module.exports = router;
