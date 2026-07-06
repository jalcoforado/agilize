import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { inserirEmailLog } from '../repositories/email-log.repository';

interface EnviarEmailParams {
  para: string;
  assunto: string;
  titulo: string;
  numeroDemanda?: string | null;
  statusAnterior?: string;
  statusNovo?: string;
  mensagem: string;
  linkAcao?: string;
}

const TEMPLATE_PATH = path.resolve(__dirname, '../templates/workflow-update.html');
const MAX_TENTATIVAS = 3;
const DELAYS_MS = [1000, 2000, 3000];

if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST?.includes('ethereal')) {
  throw new Error('[EmailService] Credencial de teste (Ethereal) detectada em produção. Configure SMTP_HOST com o servidor real antes de iniciar.');
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
  });
}

function carregarTemplate(params: EnviarEmailParams): string {
  let html = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  html = html
    .replace(/\{\{titulo\}\}/g, params.titulo)
    .replace(/\{\{numeroDemanda\}\}/g, params.numeroDemanda ?? '')
    .replace(/\{\{mensagem\}\}/g, params.mensagem)
    .replace(/\{\{linkAcao\}\}/g, params.linkAcao ?? '');

  if (params.statusAnterior && params.statusNovo) {
    html = html
      .replace('{{#if statusAnterior}}', '')
      .replace('{{/if}}', '')
      .replace('{{statusAnterior}}', params.statusAnterior)
      .replace('{{statusNovo}}', params.statusNovo);
  } else {
    // Remove the conditional block entirely
    html = html.replace(/\{\{#if statusAnterior\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  return html;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enviar(params: EnviarEmailParams): Promise<void> {
  if (process.env.SMTP_ENABLED === 'false') return;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  if (!params.para || !params.assunto) return;

  const enderecoRemetente = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const remetente = `"${process.env.SMTP_FROM_NAME || 'Agilize'}" <${enderecoRemetente}>`;
  const html = carregarTemplate(params);
  let ultimoErro: Error | null = null;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      const transporter = criarTransporter();
      await transporter.sendMail({
        from: remetente,
        to: params.para,
        subject: params.assunto,
        html,
      });

      await inserirEmailLog({
        destinatario: params.para,
        assunto: params.assunto,
        status: 'enviado',
        tentativas: tentativa,
      });

      return;
    } catch (err) {
      ultimoErro = err as Error;
      console.error(`[EmailService] Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou para ${params.para}:`, ultimoErro.message);

      if (tentativa < MAX_TENTATIVAS) {
        await delay(DELAYS_MS[tentativa - 1]);
      }
    }
  }

  await inserirEmailLog({
    destinatario: params.para,
    assunto: params.assunto,
    status: 'falha',
    tentativas: MAX_TENTATIVAS,
    erro: ultimoErro?.message ?? 'Erro desconhecido',
  });

  throw ultimoErro;
}
