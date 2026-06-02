const jwt = require('jsonwebtoken');

const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    const err = new Error('Token não fornecido');
    err.statusCode = 401;
    err.code = 'NAO_AUTENTICADO';
    return next(err);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    const err = new Error('Token inválido ou expirado');
    err.statusCode = 401;
    err.code = 'NAO_AUTENTICADO';
    next(err);
  }
};

const validarPermissao = (perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Usuário não autenticado');
      err.statusCode = 401;
      return next(err);
    }

    const perfil = req.user.perfil_principal;
    
    if (!perfisPermitidos.includes(perfil)) {
      const err = new Error(`Perfil ${perfil} não tem permissão para esta ação`);
      err.statusCode = 403;
      err.code = 'PERMISSAO_NEGADA';
      return next(err);
    }

    next();
  };
};

const validarContexto = (campo, origem) => {
  return (req, res, next) => {
    // Valida se o usuário tem contexto para acessar o recurso
    // Ex: Gestor pode validar demanda apenas de sua unidade
    
    if (req.user.perfil_principal === 'GESTOR_SISTEMA') {
      return next(); // Admin pode tudo
    }

    if (req.user.perfil_principal === 'GESTOR_UNIDADE') {
      if (req.user.id_unidade !== req.params[origem]) {
        const err = new Error('Você não tem contexto para esta ação');
        err.statusCode = 403;
        err.code = 'PERMISSAO_NEGADA';
        return next(err);
      }
    }

    next();
  };
};

module.exports = {
  autenticar,
  validarPermissao,
  validarContexto
};
