const nodemailer = require('nodemailer');
const db = require('../db/connection');

// ─── Transporter ──────────────────────────────────────────────────────────────

function criarTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
}

// ─── Persistência ─────────────────────────────────────────────────────────────

async function criarNotificacao({ idUsuario, emailDestinatario, idDemanda, numeroDemanda, tipo, titulo, mensagem, linkAcao, canal = 'SISTEMA' }) {
  await db('tb_notificacoes').insert({
    id_usuario_destinatario: idUsuario,
    email_destinatario: emailDestinatario,
    id_demanda: idDemanda,
    numero_demanda: numeroDemanda,
    tipo_notificacao: tipo,
    titulo_notificacao: titulo,
    mensagem_notificacao: mensagem,
    link_acao: linkAcao,
    canal_envio: canal,
    lido: 0,
    ativo: 1
  });
}

// ─── Email ────────────────────────────────────────────────────────────────────

async function enviarEmail({ para, assunto, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return;

  const transporter = criarTransporter();
  await transporter.sendMail({
    from: `"Agilize" <${process.env.SMTP_USER}>`,
    to: para,
    subject: assunto,
    html
  });
}

function templateEmail({ titulo, numeroDemanda, statusAnterior, statusNovo, mensagem, linkAcao }) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = linkAcao || `${baseUrl}/demandas/${numeroDemanda}`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Agilize — Gestão de Demandas</h1>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <h2 style="color:#1e293b;margin-top:0">${titulo}</h2>
        <p style="color:#475569">Demanda: <strong>${numeroDemanda}</strong></p>
        ${statusAnterior ? `<p style="color:#475569">Status: <strong>${statusAnterior}</strong> → <strong>${statusNovo}</strong></p>` : ''}
        <p style="color:#475569">${mensagem}</p>
        <a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:16px">
          Ver Demanda
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;text-align:center">
        Agilize 2.0 — Sistema de Gestão de Demandas de TI
      </p>
    </div>
  `;
}

// ─── Envio combinado (sistema + email) ────────────────────────────────────────

async function notificar({ idUsuario, emailDestinatario, idDemanda, numeroDemanda, tipo, titulo, mensagem, linkAcao }) {
  await criarNotificacao({
    idUsuario,
    emailDestinatario,
    idDemanda,
    numeroDemanda,
    tipo,
    titulo,
    mensagem,
    linkAcao,
    canal: 'SISTEMA'
  });

  if (emailDestinatario) {
    enviarEmail({
      para: emailDestinatario,
      assunto: titulo,
      html: templateEmail({ titulo, numeroDemanda, mensagem, linkAcao })
    }).catch(err => console.error(`[Notificacao] Falha ao enviar email para ${emailDestinatario}:`, err.message));
  }
}

// ─── Notificações por evento de workflow ──────────────────────────────────────

async function notificarMudancaStatus(demanda, statusNovo, usuarioAcao) {
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkAcao = `${baseUrl}/demandas/${demanda.numero_demanda}`;

    const [solicitante, gestor, analistas] = await Promise.all([
      db('tb_usuarios').where('id_usuario', demanda.id_solicitante).first(),
      demanda.id_gestor_unidade
        ? db('tb_usuarios').where('id_usuario', demanda.id_gestor_unidade).first()
        : Promise.resolve(null),
      statusNovo === 'FILA_STI'
        ? db('tb_usuarios').where('perfil_principal', 'ANALISTA_STI').where('ativo', 1)
        : Promise.resolve([])
    ]);

    const notificacoes = [];

    switch (statusNovo) {
      case 'PENDENTE_GESTOR':
        if (gestor) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_AGUARDANDO_VALIDACAO',
            titulo: `Nova demanda aguardando sua validação — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi enviada para sua validação.`
          });
        }
        break;

      case 'VALIDADA_GESTOR':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_VALIDADA_GESTOR',
            titulo: `Demanda validada pelo gestor — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi validada pelo gestor e seguirá para análise da STI.`
          });
        }
        break;

      case 'DEVOLVIDA_AJUSTES':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_DEVOLVIDA',
            titulo: `Demanda devolvida para ajustes — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi devolvida para ajustes. Acesse para ver o comentário do gestor.`
          });
        }
        break;

      case 'FILA_STI':
        for (const analista of analistas) {
          notificacoes.push({
            idUsuario: analista.id_usuario,
            emailDestinatario: analista.email,
            tipo: 'DEMANDA_FILA_STI',
            titulo: `Nova demanda na fila da STI — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi encaminhada para análise da STI.`
          });
        }
        break;

      case 'APROVADA_STI':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_APROVADA_STI',
            titulo: `Demanda aprovada pela STI — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi aprovada pela STI e entrará em desenvolvimento.`
          });
        }
        break;

      case 'REPROVADA_STI':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_REPROVADA_STI',
            titulo: `Demanda reprovada pela STI — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi reprovada pela STI. Acesse para ver o motivo.`
          });
        }
        if (gestor) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_REPROVADA_STI',
            titulo: `Demanda reprovada pela STI — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi reprovada pela STI.`
          });
        }
        break;

      case 'SOLICITADO_AJUSTES_STI':
        if (gestor) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_AJUSTES_STI',
            titulo: `STI solicitou ajustes — ${demanda.numero_demanda}`,
            mensagem: `A STI solicitou ajustes na demanda "${demanda.titulo}". Acesse para ver os detalhes.`
          });
        }
        break;

      case 'EM_DESENVOLVIMENTO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_EM_DESENVOLVIMENTO',
            titulo: `Demanda em desenvolvimento — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" entrou em desenvolvimento.`
          });
        }
        break;

      case 'EM_HOMOLOGACAO': {
        const responsaveisQA = await db('tb_usuarios')
          .where('perfil_principal', 'RESPONSAVEL_HOMOLOGACAO')
          .where('ativo', 1);
        for (const qa of responsaveisQA) {
          notificacoes.push({
            idUsuario: qa.id_usuario,
            emailDestinatario: qa.email,
            tipo: 'DEMANDA_EM_HOMOLOGACAO',
            titulo: `Demanda aguardando homologação — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" está pronta para homologação.`
          });
        }
        break;
      }

      case 'EM_PRODUCAO': {
        const responsaveisOps = await db('tb_usuarios')
          .where('perfil_principal', 'RESPONSAVEL_PRODUCAO')
          .where('ativo', 1);
        for (const ops of responsaveisOps) {
          notificacoes.push({
            idUsuario: ops.id_usuario,
            emailDestinatario: ops.email,
            tipo: 'DEMANDA_EM_PRODUCAO',
            titulo: `Demanda pronta para implantação — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi aprovada em homologação e está pronta para produção.`
          });
        }
        break;
      }

      case 'FINALIZADA':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_FINALIZADA',
            titulo: `Demanda finalizada — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi concluída com sucesso e está em produção.`
          });
        }
        break;

      case 'CANCELADA':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_CANCELADA',
            titulo: `Demanda cancelada — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi cancelada.`
          });
        }
        break;
    }

    await Promise.allSettled(
      notificacoes.map(n =>
        notificar({
          ...n,
          idDemanda: demanda.id_demanda,
          numeroDemanda: demanda.numero_demanda,
          linkAcao
        })
      )
    );
  } catch (err) {
    console.error('[Notificacao] Erro ao processar notificações:', err.message);
  }
}

// ─── Consultas ────────────────────────────────────────────────────────────────

async function listarPorUsuario(idUsuario, { pagina = 1, limite = 20, apenasNaoLidas = false } = {}) {
  let query = db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('ativo', 1);

  if (apenasNaoLidas) query = query.where('lido', 0);

  const total = await query.clone().count('* as count').first();
  const notificacoes = await query
    .orderBy('data_criacao', 'desc')
    .limit(limite)
    .offset((pagina - 1) * limite);

  return {
    notificacoes,
    total: parseInt(total.count),
    pagina,
    limite,
    totalPaginas: Math.ceil(parseInt(total.count) / limite)
  };
}

async function contarNaoLidas(idUsuario) {
  const resultado = await db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('lido', 0)
    .where('ativo', 1)
    .count('* as count')
    .first();
  return parseInt(resultado.count);
}

async function marcarComoLida(idNotificacao, idUsuario) {
  const notificacao = await db('tb_notificacoes')
    .where('id_notificacao', idNotificacao)
    .where('id_usuario_destinatario', idUsuario)
    .where('ativo', 1)
    .first();

  if (!notificacao) {
    const err = new Error('Notificação não encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (!notificacao.lido) {
    await db('tb_notificacoes')
      .where('id_notificacao', idNotificacao)
      .update({ lido: 1, data_leitura: db.fn.now() });
  }

  return db('tb_notificacoes').where('id_notificacao', idNotificacao).first();
}

async function marcarTodasComoLidas(idUsuario) {
  const count = await db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('lido', 0)
    .where('ativo', 1)
    .update({ lido: 1, data_leitura: db.fn.now() });

  return { atualizadas: count };
}

module.exports = {
  notificarMudancaStatus,
  listarPorUsuario,
  contarNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas
};
