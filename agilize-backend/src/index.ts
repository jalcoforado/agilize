import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import db from './db/connection';
import authRoutes from './routes/auth';
import demandasRoutes from './routes/demandas';
import historicoRoutes from './routes/historico';
import notificacoesRoutes from './routes/notificacoes';
import relatoriosRoutes from './routes/relatorios';
import adminRoutes from './routes/admin';
import usuariosRoutes from './routes/usuarios';
import type { HttpError } from './types/http';
import { variaveisObrigatoriasAusentes } from './config/env';

// Validação de variáveis de ambiente obrigatórias (fail-fast, ignorada em teste)
if (process.env.NODE_ENV !== 'test') {
  const missingEnv = variaveisObrigatoriasAusentes(process.env);
  if (missingEnv.length) {
    console.error('❌ Variáveis de ambiente obrigatórias ausentes:', missingEnv.join(', '));
    process.exit(1);
  }
}

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
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'Limite de requisições atingido. Tente novamente mais tarde.' },
});
app.use(limiter);

// Rate limiting específico para login (brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT_LOGIN', message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});
app.use('/api/v1/auth/login', loginLimiter);

// Health check com verificação de dependências
app.get('/health', async (req: Request, res: Response) => {
  const checks: Record<string, string> = { api: 'ok', db: 'ok', timestamp: new Date().toISOString() };

  try {
    await db.raw('SELECT 1');
  } catch {
    checks.db = 'error';
  }

  res.status(checks.db === 'ok' ? 200 : 503).json({ success: checks.db === 'ok', ...checks });
});

// Rotas
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/demandas', demandasRoutes);
app.use('/api/v1/historico', historicoRoutes);
app.use('/api/v1/notificacoes', notificacoesRoutes);
app.use('/api/v1/relatorios', relatoriosRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);

// Middleware de erro
app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || 500;
  const isServerError = status >= 500;

  if (isServerError) {
    console.error('[ERRO]', req.method, req.path, err);
  }

  if (err.validation) {
    res.status(400).json({
      success: false,
      code: 'VALIDACAO_ERRO',
      message: err.message,
      errors: err.details,
    });
    return;
  }

  if (status === 401) {
    res.status(401).json({
      success: false,
      code: 'NAO_AUTENTICADO',
      message: err.message || 'Token inválido ou expirado',
    });
    return;
  }

  if (status === 403) {
    res.status(403).json({
      success: false,
      code: 'PERMISSAO_NEGADA',
      message: err.message || 'Você não tem permissão para esta ação',
    });
    return;
  }

  res.status(status).json({
    success: false,
    code: err.code || 'ERRO_INTERNO',
    // Em produção, não vaza detalhes de erros 5xx
    message: isServerError && isProd ? 'Erro interno do servidor' : err.message || 'Erro interno do servidor',
  });
});

// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    code: 'NAO_ENCONTRADO',
    message: 'Rota não encontrada',
  });
});

if (process.env.NODE_ENV !== 'test') {
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Agilize Backend rodando em http://localhost:${PORT}`);
    console.log(`📝 Documentação: http://localhost:${PORT}/api/docs`);
  });
}

export default app;
