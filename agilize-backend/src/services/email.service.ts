import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

export interface EnviarEmailParams {
  para: string;
  assunto: string;
  titulo: string;
  numeroDemanda?: string | null;
  statusAnterior?: string;
  statusNovo?: string;
  mensagem: string;
  linkAcao?: string;
}

export interface EmailEnviadoResult {
  ok: true;
  mensagem: string;
}

const TEMPLATE_PATH = path.resolve(__dirname, '../templates/workflow-update.html');

if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST?.includes('ethereal')) {
  throw new Error('[EmailService] Credencial Ethereal detectada em produção. Configure o Google Workspace SMTP Relay.');
}

function validarConfiguracao(): void {
  if (!process.env.SMTP_HOST) throw new Error('[EmailService] SMTP_HOST não configurado.');
  if (!process.env.SMTP_USER) throw new Error('[EmailService] SMTP_USER não configurado.');
  if (!process.env.SMTP_PASSWORD) throw new Error('[EmailService] SMTP_PASSWORD não configurado.');
}

function criarTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function carregarTemplate(params: EnviarEmailParams): string {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const linkSeguro = /^https?:\/\//.test(params.linkAcao ?? '') ? params.linkAcao! : '';

  html = html
    .replace(/\{\{titulo\}\}/g, escapeHtml(params.titulo))
    .replace(/\{\{numeroDemanda\}\}/g, escapeHtml(params.numeroDemanda ?? ''))
    .replace(/\{\{mensagem\}\}/g, escapeHtml(params.mensagem))
    .replace(/\{\{linkAcao\}\}/g, escapeHtml(linkSeguro));

  if (params.statusAnterior && params.statusNovo) {
    html = html
      .replace('{{#if statusAnterior}}', '')
      .replace('{{/if}}', '')
      .replace('{{statusAnterior}}', params.statusAnterior)
      .replace('{{statusNovo}}', params.statusNovo);
  } else {
    html = html.replace(/\{\{#if statusAnterior\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  return html;
}

export async function enviar(params: EnviarEmailParams): Promise<EmailEnviadoResult> {
  if (process.env.SMTP_ENABLED === 'false') {
    return { ok: true, mensagem: 'Envio de email desativado (SMTP_ENABLED=false)' };
  }

  validarConfiguracao();

  if (!params.para || !params.assunto) {
    throw new Error('[EmailService] Parâmetros obrigatórios ausentes: "para" e "assunto" são requeridos.');
  }

  const enderecoRemetente = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const remetente = `"${process.env.SMTP_FROM_NAME || 'Agilize'}" <${enderecoRemetente}>`;
  const html = carregarTemplate(params);

  try {
    const transporter = criarTransporter();
    await transporter.sendMail({
      from: remetente,
      to: params.para,
      subject: params.assunto,
      html,
    });

    return { ok: true, mensagem: `Email enviado com sucesso para ${params.para}` };
  } catch (err) {
    const erro = err as Error;
    throw new Error(`[EmailService] Falha ao enviar email para ${params.para}: ${erro.message}`);
  }
}
