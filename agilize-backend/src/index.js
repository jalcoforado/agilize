require('dotenv').config();

// Validação de variáveis de ambiente obrigatórias (fail-fast, ignorada em teste)
if (process.env.NODE_ENV !== 'test') {
  const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missingEnv.length) {
    console.error('❌ Variáveis de ambiente obrigatórias ausentes:', missingEnv.join(', '));
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();

// Segurança
app.use(helmet());
app.use(cors({
  origin: isProd ? FRONTEND_ORIGIN : true,
  credentials: true,
}));
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'Limite de requisições atingido. Tente novamente mais tarde.' }
});
app.use(limiter);

// Rate limiting específico para login (brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT_LOGIN', message: 'Muitas tentativas de login. Aguarde 15 minutos.' }
});
app.use('/api/v1/auth/login', loginLimiter);

// Health check com verificação de dependências
app.get('/health', async (req, res) => {
  const db = require('./db/connection');
  const checks = { api: 'ok', db: 'ok', timestamp: new Date().toISOString() };

  try {
    await db.raw('SELECT 1');
  } catch {
    checks.db = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok' || typeof v !== 'string' || v === checks.timestamp);
  res.status(checks.db === 'ok' ? 200 : 503).json({ success: checks.db === 'ok', ...checks });
});

// Rotas (serão importadas depois)
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/demandas', require('./routes/demandas'));
app.use('/api/v1/historico', require('./routes/historico'));
app.use('/api/v1/notificacoes', require('./routes/notificacoes'));
app.use('/api/v1/relatorios', require('./routes/relatorios'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/usuarios', require('./routes/usuarios'));

// Middleware de erro
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('[ERRO]', req.method, req.path, err);
  }

  if (err.validation) {
    return res.status(400).json({
      success: false,
      code: 'VALIDACAO_ERRO',
      message: err.message,
      errors: err.details
    });
  }

  if (status === 401) {
    return res.status(401).json({
      success: false,
      code: 'NAO_AUTENTICADO',
      message: err.message || 'Token inválido ou expirado'
    });
  }

  if (status === 403) {
    return res.status(403).json({
      success: false,
      code: 'PERMISSAO_NEGADA',
      message: err.message || 'Você não tem permissão para esta ação'
    });
  }

  res.status(status).json({
    success: false,
    code: err.code || 'ERRO_INTERNO',
    // Em produção, não vaza detalhes de erros 5xx
    message: isServerError && isProd ? 'Erro interno do servidor' : err.message || 'Erro interno do servidor'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    code: 'NAO_ENCONTRADO',
    message: 'Rota não encontrada'
  });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Agilize Backend rodando em http://localhost:${PORT}`);
    console.log(`📝 Documentação: http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app;
