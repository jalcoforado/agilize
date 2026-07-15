import dotenv from 'dotenv';
dotenv.config({ path: '.env.test', override: true });

// ── Mocks declarados ANTES dos imports do módulo testado ─────────────────────

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));

jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(() => '<html>{{titulo}} {{numeroDemanda}} {{mensagem}} {{linkAcao}}</html>'),
}));


// ── Import do módulo após os mocks ───────────────────────────────────────────

import { enviar } from '../services/email.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ENV_BASE = {
  SMTP_ENABLED: 'true',
  SMTP_HOST: 'smtp-relay.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'agilize@tce.ce.gov.br',
  SMTP_PASSWORD: 'app-password-16chars', // eslint-disable-line sonarjs/no-hardcoded-passwords
  SMTP_FROM_NAME: 'Agilize TCE-CE',
  SMTP_FROM_EMAIL: 'agilize@tce.ce.gov.br',
  NODE_ENV: 'test',
};

const PARAMS_BASE = {
  para: 'jorge@agilize.com.br',
  assunto: 'Demanda aprovada',
  titulo: 'Demanda aprovada pela STI',
  mensagem: 'Sua demanda foi aprovada.',
  numeroDemanda: 'AGZ-2025-001',
  linkAcao: 'http://localhost:5173/demandas/AGZ-2025-001',
};

function setEnv(overrides: Partial<typeof ENV_BASE> = {}) {
  Object.assign(process.env, { ...ENV_BASE, ...overrides });
}

function clearSmtpEnv() {
  ['SMTP_ENABLED', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE',
    'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_NAME', 'SMTP_FROM_EMAIL'].forEach(k => {
    // eslint-disable-next-line security/detect-object-injection
    delete process.env[k];
  });
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('email.service — enviar()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setEnv();
    mockSendMail.mockResolvedValue({ messageId: 'test-id' });
  });

  afterEach(() => {
    clearSmtpEnv();
  });

  // ── SMTP_ENABLED=false ────────────────────────────────────────────────────

  describe('quando SMTP_ENABLED=false', () => {
    it('retorna ok sem tentar conexão', async () => {
      setEnv({ SMTP_ENABLED: 'false' });

      const result = await enviar(PARAMS_BASE);

      expect(result).toEqual({ ok: true, mensagem: 'Envio de email desativado (SMTP_ENABLED=false)' });
      expect(mockCreateTransport).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  // ── Validação de configuração ─────────────────────────────────────────────

  describe('validação de configuração', () => {
    it('lança erro se SMTP_HOST não está configurado', async () => {
      delete process.env.SMTP_HOST;

      await expect(enviar(PARAMS_BASE)).rejects.toThrow('SMTP_HOST não configurado');
    });

    it('lança erro se SMTP_USER não está configurado', async () => {
      delete process.env.SMTP_USER;

      await expect(enviar(PARAMS_BASE)).rejects.toThrow('SMTP_USER não configurado');
    });

    it('lança erro se SMTP_PASSWORD não está configurado', async () => {
      delete process.env.SMTP_PASSWORD;

      await expect(enviar(PARAMS_BASE)).rejects.toThrow('SMTP_PASSWORD não configurado');
    });

    it('lança erro se Ethereal for usado em produção', async () => {
      // A verificação de Ethereal em produção ocorre no módulo load-time.
      // Este teste verifica que a guard existe via importação condicional.
      // Em produção real, o processo encerraria — aqui validamos a mensagem.
      const originalEnv = process.env.NODE_ENV;
      const originalHost = process.env.SMTP_HOST;
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.ethereal.email';

      // Reimporta o módulo para ativar a guard de produção
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(() => require('../services/email.service')).toThrow('Ethereal');
      });

      process.env.NODE_ENV = originalEnv;
      process.env.SMTP_HOST = originalHost;
    });
  });

  // ── Validação de parâmetros ───────────────────────────────────────────────

  describe('validação de parâmetros', () => {
    it('lança erro se "para" está vazio', async () => {
      await expect(enviar({ ...PARAMS_BASE, para: '' })).rejects.toThrow('"para" e "assunto" são requeridos');
    });

    it('lança erro se "assunto" está vazio', async () => {
      await expect(enviar({ ...PARAMS_BASE, assunto: '' })).rejects.toThrow('"para" e "assunto" são requeridos');
    });
  });

  // ── Envio bem-sucedido ────────────────────────────────────────────────────

  describe('envio bem-sucedido', () => {
    it('retorna { ok: true } com mensagem contendo o endereço do destinatário', async () => {
      const result = await enviar(PARAMS_BASE);

      expect(result).toEqual({
        ok: true,
        mensagem: `Email enviado com sucesso para ${PARAMS_BASE.para}`,
      });
    });

    it('chama sendMail com from, to e subject corretos', async () => {
      await enviar(PARAMS_BASE);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.to).toBe(PARAMS_BASE.para);
      expect(chamada.subject).toBe(PARAMS_BASE.assunto);
      expect(chamada.from).toContain('agilize@tce.ce.gov.br');
    });

    it('usa SMTP_FROM_EMAIL como remetente quando definido', async () => {
      setEnv({ SMTP_FROM_EMAIL: 'noreply@tce.ce.gov.br' });

      await enviar(PARAMS_BASE);

      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.from).toContain('noreply@tce.ce.gov.br');
    });

    it('usa SMTP_USER como remetente quando SMTP_FROM_EMAIL não está definido', async () => {
      delete process.env.SMTP_FROM_EMAIL;

      await enviar(PARAMS_BASE);

      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.from).toContain(process.env.SMTP_USER);
    });
  });

  // ── Envio com falha ───────────────────────────────────────────────────────

  describe('quando o Nodemailer falha', () => {
    beforeEach(() => {
      mockSendMail.mockRejectedValue(new Error('Connection refused'));
    });

    it('lança Error com mensagem descritiva', async () => {
      await expect(enviar(PARAMS_BASE)).rejects.toThrow(
        `Falha ao enviar email para ${PARAMS_BASE.para}: Connection refused`
      );
    });

    it('não faz retry — sendMail é chamado exatamente uma vez', async () => {
      await expect(enviar(PARAMS_BASE)).rejects.toThrow();

      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ── Segurança do template ─────────────────────────────────────────────────

  describe('segurança do template HTML', () => {
    it('escapa tags HTML no título', async () => {
      await enviar({ ...PARAMS_BASE, titulo: '<script>alert(1)</script>' });

      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.html).not.toContain('<script>');
      expect(chamada.html).toContain('&lt;script&gt;');
    });

    it('escapa tags HTML na mensagem', async () => {
      await enviar({ ...PARAMS_BASE, mensagem: '<img src=x onerror=alert(1)>' });

      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.html).not.toContain('<img');
      expect(chamada.html).toContain('&lt;img');
    });

    it('rejeita linkAcao que não começa com http:// ou https://', async () => {
      await enviar({ ...PARAMS_BASE, linkAcao: 'javascript:alert(1)' });

      const chamada = mockSendMail.mock.calls[0][0];
      expect(chamada.html).not.toContain('javascript:');
    });
  });
});
