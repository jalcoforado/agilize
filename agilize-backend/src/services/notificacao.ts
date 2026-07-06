import db from '../db/connection';
import * as emailService from './email.service';
import type { Demanda as DemandaRow, Usuario, AuthUser, Id } from '../types/models';
import type { HttpError } from '../types/http';

interface NotificarParams {
  idUsuario: Id;
  emailDestinatario?: string | null;
  idDemanda?: Id | null;
  numeroDemanda?: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  linkAcao?: string;
  canal?: string;
}

interface NotificacaoEvento {
  idUsuario: Id;
  emailDestinatario: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
}

// ─── Persistência ─────────────────────────────────────────────────────────────

async function criarNotificacao({ idUsuario, emailDestinatario, idDemanda, numeroDemanda, tipo, titulo, mensagem, linkAcao, canal = 'SISTEMA' }: NotificarParams): Promise<void> {
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
    lido: false,
    ativo: true,
  });
}

// ─── Envio combinado (sistema + email) ────────────────────────────────────────

async function notificar({ idUsuario, emailDestinatario, idDemanda, numeroDemanda, tipo, titulo, mensagem, linkAcao }: NotificarParams): Promise<void> {
  await criarNotificacao({
    idUsuario,
    emailDestinatario,
    idDemanda,
    numeroDemanda,
    tipo,
    titulo,
    mensagem,
    linkAcao,
    canal: 'SISTEMA',
  });

  if (emailDestinatario) {
    emailService
      .enviar({ para: emailDestinatario, assunto: titulo, titulo, numeroDemanda, mensagem, linkAcao })
      .catch((err) => console.error(`[Notificacao] Falha ao enviar email para ${emailDestinatario}:`, (err as Error).message));
  }
}

// ─── Notificações por evento de workflow ──────────────────────────────────────

export async function notificarMudancaStatus(demanda: DemandaRow | undefined, statusNovo: string, _usuarioAcao: AuthUser): Promise<void> {
  if (!demanda) return;
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkAcao = `${baseUrl}/demandas/${demanda.numero_demanda}`;

    const precisaAnalistas = ['FILA_STI', 'FILA_HOMOLOGACAO_STI'].includes(statusNovo);

    const [solicitante, gestores, analistas] = await Promise.all([
      db('tb_usuarios').where('id_usuario', demanda.id_solicitante).first(),
      db('tb_atribuicoes_gestor')
        .join('tb_usuarios', 'tb_atribuicoes_gestor.id_gestor', 'tb_usuarios.id_usuario')
        .where('tb_atribuicoes_gestor.id_unidade', demanda.id_unidade)
        .where('tb_atribuicoes_gestor.ativo', true)
        .where('tb_usuarios.ativo', true)
        .select('tb_usuarios.*') as Promise<Usuario[]>,
      precisaAnalistas
        ? db('tb_usuarios').where('perfil_principal', 'ANALISTA_STI').where('ativo', 1)
        : Promise.resolve([] as Usuario[]),
    ]);

    const notificacoes: NotificacaoEvento[] = [];

    switch (statusNovo) {
      // ── Criação ────────────────────────────────────────────────────────────
      case 'DRAFT':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_CRIADA',
            titulo: `Demanda criada com sucesso — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi registrada. Acesse o sistema para enviá-la ao seu gestor quando estiver pronta.`,
          });
        }
        break;

      // ── Fase 1: Solicitação ────────────────────────────────────────────────
      case 'PENDENTE_GESTOR':
        for (const gestor of gestores) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_AGUARDANDO_VALIDACAO',
            titulo: `Nova demanda aguardando sua validação — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi enviada para sua validação.`,
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
            mensagem: `Sua demanda "${demanda.titulo}" foi validada pelo gestor e seguirá para análise da STI.`,
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
            mensagem: `Sua demanda "${demanda.titulo}" foi devolvida para ajustes pelo gestor. Acesse para ver o comentário.`,
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
            mensagem: `A demanda "${demanda.titulo}" foi encaminhada para análise da STI.`,
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
            mensagem: `Sua demanda "${demanda.titulo}" foi aprovada pela STI. Você já pode iniciar o desenvolvimento.`,
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
            mensagem: `Sua demanda "${demanda.titulo}" foi reprovada pela STI. Acesse para ver o motivo.`,
          });
        }
        for (const gestor of gestores) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_REPROVADA_STI',
            titulo: `Demanda reprovada pela STI — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" de sua unidade foi reprovada pela STI.`,
          });
        }
        break;

      case 'SOLICITADO_AJUSTES_STI':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AJUSTES_STI',
            titulo: `STI solicitou ajustes — ${demanda.numero_demanda}`,
            mensagem: `A STI solicitou ajustes na sua demanda "${demanda.titulo}". Acesse para ver os detalhes e faça as correções.`,
          });
        }
        for (const gestor of gestores) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_AJUSTES_STI',
            titulo: `STI solicitou ajustes — ${demanda.numero_demanda}`,
            mensagem: `A STI solicitou ajustes na demanda "${demanda.titulo}" de sua unidade.`,
          });
        }
        break;

      // ── Fase 2: Desenvolvimento ───────────────────────────────────────────
      case 'EM_DESENVOLVIMENTO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_EM_DESENVOLVIMENTO',
            titulo: `Demanda em desenvolvimento — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" entrou em desenvolvimento. Submeta o produto quando estiver pronto.`,
          });
        }
        break;

      // ── Fase 3: Homologação ───────────────────────────────────────────────
      case 'SUBMETIDO_HOMOLOGACAO':
        for (const gestor of gestores) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_SUBMETIDA_HOMOLOGACAO',
            titulo: `Produto submetido para homologação — ${demanda.numero_demanda}`,
            mensagem: `O produto da demanda "${demanda.titulo}" foi submetido para homologação e aguarda sua validação.`,
          });
        }
        break;

      case 'VALIDADA_HOMOLOGACAO_GESTOR':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_VALIDADA_HOMOLOGACAO_GESTOR',
            titulo: `Produto validado pelo gestor — ${demanda.numero_demanda}`,
            mensagem: `O produto da sua demanda "${demanda.titulo}" foi validado pelo gestor e seguirá para homologação da STI.`,
          });
        }
        break;

      case 'DEVOLVIDA_HOMOLOGACAO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_DEVOLVIDA_HOMOLOGACAO',
            titulo: `Produto devolvido para ajustes — ${demanda.numero_demanda}`,
            mensagem: `O produto da sua demanda "${demanda.titulo}" foi devolvido pelo gestor para ajustes. Acesse para ver o comentário.`,
          });
        }
        break;

      case 'FILA_HOMOLOGACAO_STI':
        for (const analista of analistas) {
          notificacoes.push({
            idUsuario: analista.id_usuario,
            emailDestinatario: analista.email,
            tipo: 'DEMANDA_FILA_HOMOLOGACAO_STI',
            titulo: `Produto aguardando homologação — ${demanda.numero_demanda}`,
            mensagem: `O produto da demanda "${demanda.titulo}" foi encaminhado para homologação da STI.`,
          });
        }
        break;

      case 'SOLICITADO_AJUSTES_HOMOLOGACAO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AJUSTES_HOMOLOGACAO',
            titulo: `STI solicitou ajustes no produto — ${demanda.numero_demanda}`,
            mensagem: `A STI solicitou ajustes no produto da sua demanda "${demanda.titulo}". Acesse para ver os detalhes.`,
          });
        }
        break;

      case 'HOMOLOGADA':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_HOMOLOGADA',
            titulo: `Produto homologado pela STI — ${demanda.numero_demanda}`,
            mensagem: `Parabéns! O produto da sua demanda "${demanda.titulo}" foi homologado pela STI e seguirá para produção.`,
          });
        }
        break;

      case 'REJEITADA':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_REJEITADA',
            titulo: `Produto rejeitado na homologação — ${demanda.numero_demanda}`,
            mensagem: `O produto da sua demanda "${demanda.titulo}" foi rejeitado na homologação. Acesse para ver o motivo.`,
          });
        }
        for (const gestor of gestores) {
          notificacoes.push({
            idUsuario: gestor.id_usuario,
            emailDestinatario: gestor.email,
            tipo: 'DEMANDA_REJEITADA',
            titulo: `Produto rejeitado na homologação — ${demanda.numero_demanda}`,
            mensagem: `O produto da demanda "${demanda.titulo}" de sua unidade foi rejeitado na homologação.`,
          });
        }
        break;

      // ── Fase 4: Produção ──────────────────────────────────────────────────
      case 'EM_PRODUCAO': {
        // Notifica responsáveis de produção da unidade designada (ou todos, se a unidade não estiver definida)
        const queryResponsaveis = db('tb_usuarios').where('ativo', true).where(function () {
          this.where('perfil_principal', 'RESPONSAVEL_PRODUCAO')
              .orWhereRaw("perfis_secundarios::jsonb \\? 'RESPONSAVEL_PRODUCAO'");
        });
        if (demanda.id_unidade_producao) queryResponsaveis.where('id_unidade', demanda.id_unidade_producao);
        const responsaveis = await queryResponsaveis;
        for (const resp of responsaveis) {
          notificacoes.push({
            idUsuario: resp.id_usuario,
            emailDestinatario: resp.email,
            tipo: 'DEMANDA_EM_PRODUCAO',
            titulo: `Produto pronto para implantação — ${demanda.numero_demanda}`,
            mensagem: `O produto da demanda "${demanda.titulo}" foi homologado e está pronto para ser implantado em produção.`,
          });
        }
        break;
      }

      case 'EM_MONITORAMENTO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_EM_MONITORAMENTO',
            titulo: `Solução implantada em produção — ${demanda.numero_demanda}`,
            mensagem: `Sua solução "${demanda.titulo}" foi implantada com sucesso e está em monitoramento.`,
          });
        }
        break;

      // ── DPO ───────────────────────────────────────────────────────────────
      case 'AGUARDANDO_DPO': {
        const dposFase1 = await db('tb_usuarios').where('perfil_principal', 'DPO').where('ativo', 1);
        for (const dpo of dposFase1) {
          notificacoes.push({
            idUsuario: dpo.id_usuario,
            emailDestinatario: dpo.email,
            tipo: 'DEMANDA_AGUARDANDO_DPO',
            titulo: `Demanda aguardando análise LGPD — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" contém dados sensíveis e aguarda sua análise de conformidade LGPD (Fase 1 — Solicitação).`,
          });
        }
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AGUARDANDO_DPO_SOLICITANTE',
            titulo: `Demanda encaminhada ao DPO — ${demanda.numero_demanda}`,
            mensagem: `Sua demanda "${demanda.titulo}" foi encaminhada ao DPO para análise de conformidade LGPD antes de prosseguir.`,
          });
        }
        break;
      }

      case 'AGUARDANDO_DPO_HOMOLOGACAO': {
        const dposFase3 = await db('tb_usuarios').where('perfil_principal', 'DPO').where('ativo', 1);
        for (const dpo of dposFase3) {
          notificacoes.push({
            idUsuario: dpo.id_usuario,
            emailDestinatario: dpo.email,
            tipo: 'DEMANDA_AGUARDANDO_DPO_HOMOLOGACAO',
            titulo: `Produto aguardando análise LGPD — ${demanda.numero_demanda}`,
            mensagem: `O produto da demanda "${demanda.titulo}" contém dados sensíveis e aguarda sua análise de conformidade LGPD (Fase 3 — Homologação).`,
          });
        }
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AGUARDANDO_DPO_HOMOLOGACAO_SOLICITANTE',
            titulo: `Produto encaminhado ao DPO — ${demanda.numero_demanda}`,
            mensagem: `O produto da sua demanda "${demanda.titulo}" foi encaminhado ao DPO para análise de conformidade LGPD antes de prosseguir.`,
          });
        }
        break;
      }

      // ── Avaliador Técnico — notifica apenas avaliadores da unidade STI designada
      case 'AGUARDANDO_AVALIADOR': {
        const queryAv = db('tb_usuarios').where('ativo', true).where(function () {
          this.where('perfil_principal', 'AVALIADOR_TECNICO')
              .orWhereRaw("perfis_secundarios::jsonb \\? 'AVALIADOR_TECNICO'");
        });
        if (demanda.id_unidade_avaliador) queryAv.where('id_unidade', demanda.id_unidade_avaliador);
        const avaliadores = await queryAv;
        for (const av of avaliadores) {
          notificacoes.push({
            idUsuario: av.id_usuario,
            emailDestinatario: av.email,
            tipo: 'DEMANDA_AGUARDANDO_AVALIADOR',
            titulo: `Demanda encaminhada para revisão — ${demanda.numero_demanda}`,
            mensagem: `O analista STI encaminhou a demanda "${demanda.titulo}" para revisão (Fase 1 — Solicitação).`,
          });
        }
        break;
      }

      case 'AGUARDANDO_AVALIADOR_HOMOLOGACAO': {
        const queryAvHom = db('tb_usuarios').where('ativo', true).where(function () {
          this.where('perfil_principal', 'AVALIADOR_TECNICO')
              .orWhereRaw("perfis_secundarios::jsonb \\? 'AVALIADOR_TECNICO'");
        });
        if (demanda.id_unidade_avaliador) queryAvHom.where('id_unidade', demanda.id_unidade_avaliador);
        const avaliadoresHom = await queryAvHom;
        for (const av of avaliadoresHom) {
          notificacoes.push({
            idUsuario: av.id_usuario,
            emailDestinatario: av.email,
            tipo: 'DEMANDA_AGUARDANDO_AVALIADOR_HOMOLOGACAO',
            titulo: `Produto encaminhado para revisão — ${demanda.numero_demanda}`,
            mensagem: `O analista STI encaminhou o produto da demanda "${demanda.titulo}" para revisão (Fase 3 — Homologação).`,
          });
        }
        break;
      }

      // Avaliador Técnico ou DPO pediu ajustes — mensagem genérica cobre ambos os caminhos
      case 'SOLICITANTE_AJUSTANDO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AJUSTES_SOLICITADOS',
            titulo: `Ajustes solicitados na sua demanda — ${demanda.numero_demanda}`,
            mensagem: `Foram solicitados ajustes na sua demanda "${demanda.titulo}". Acesse para ver o parecer e faça as correções.`,
          });
        }
        break;

      case 'AJUSTANDO_HOMOLOGACAO':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_AJUSTES_HOMOLOGACAO',
            titulo: `Ajustes solicitados no produto — ${demanda.numero_demanda}`,
            mensagem: `Foram solicitados ajustes no produto da sua demanda "${demanda.titulo}". Acesse para ver o parecer e faça as correções.`,
          });
        }
        break;

      // ── Cancelamento ──────────────────────────────────────────────────────
      case 'CANCELADA':
        if (solicitante) {
          notificacoes.push({
            idUsuario: solicitante.id_usuario,
            emailDestinatario: solicitante.email,
            tipo: 'DEMANDA_CANCELADA',
            titulo: `Demanda cancelada — ${demanda.numero_demanda}`,
            mensagem: `A demanda "${demanda.titulo}" foi cancelada.`,
          });
        }
        break;
    }

    await Promise.allSettled(
      notificacoes.map((n) =>
        notificar({
          ...n,
          idDemanda: demanda.id_demanda,
          numeroDemanda: demanda.numero_demanda,
          linkAcao,
        })
      )
    );
  } catch (err) {
    console.error('[Notificacao] Erro ao processar notificações:', (err as Error).message);
  }
}

// ─── Consultas ────────────────────────────────────────────────────────────────

export async function listarPorUsuario(
  idUsuario: Id,
  { pagina = 1, limite = 20, apenasNaoLidas = false }: { pagina?: number; limite?: number; apenasNaoLidas?: boolean } = {}
) {
  let query = db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('ativo', true);

  if (apenasNaoLidas) query = query.where('lido', false);

  const total = (await query.clone().count('* as count').first()) as unknown as { count: string };
  const notificacoes = await query
    .orderBy('data_criacao', 'desc')
    .limit(limite)
    .offset((pagina - 1) * limite);

  return {
    notificacoes,
    total: parseInt(total.count),
    pagina,
    limite,
    totalPaginas: Math.ceil(parseInt(total.count) / limite),
  };
}

export async function contarNaoLidas(idUsuario: Id): Promise<number> {
  const resultado = (await db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('lido', false)
    .where('ativo', true)
    .count('* as count')
    .first()) as unknown as { count: string };
  return parseInt(resultado.count);
}

export async function marcarComoLida(idNotificacao: number, idUsuario: Id) {
  const notificacao = await db('tb_notificacoes')
    .where('id_notificacao', idNotificacao)
    .where('id_usuario_destinatario', idUsuario)
    .where('ativo', true)
    .first();

  if (!notificacao) {
    const err: HttpError = new Error('Notificação não encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (!notificacao.lido) {
    await db('tb_notificacoes')
      .where('id_notificacao', idNotificacao)
      .update({ lido: true, data_leitura: db.fn.now() });
  }

  return db('tb_notificacoes').where('id_notificacao', idNotificacao).first();
}

export async function marcarTodasComoLidas(idUsuario: Id): Promise<{ atualizadas: number }> {
  const count = await db('tb_notificacoes')
    .where('id_usuario_destinatario', idUsuario)
    .where('lido', false)
    .where('ativo', true)
    .update({ lido: true, data_leitura: db.fn.now() });

  return { atualizadas: count };
}

export async function notificarUnidadeProducao(demanda: DemandaRow): Promise<void> {
  if (!demanda.id_unidade_producao) return;
  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const responsaveis = await db('tb_usuarios')
      .where('id_unidade', demanda.id_unidade_producao)
      .where('ativo', true)
      .where(function () {
        this.where('perfil_principal', 'RESPONSAVEL_PRODUCAO')
            .orWhereRaw("perfis_secundarios::jsonb \\? 'RESPONSAVEL_PRODUCAO'");
      });

    for (const responsavel of responsaveis) {
      await notificar({
        idUsuario: responsavel.id_usuario,
        emailDestinatario: responsavel.email,
        idDemanda: demanda.id_demanda,
        numeroDemanda: demanda.numero_demanda,
        tipo: 'ATRIBUICAO_RESPONSAVEL_DEPLOY',
        titulo: 'Sua unidade foi designada para o deploy em produção',
        mensagem: `A solução "${demanda.titulo}" (${demanda.numero_demanda}), solicitada por ${demanda.nome_solicitante}, foi homologada e aguarda o deploy pela sua unidade (${demanda.nome_unidade_producao}).`,
        linkAcao: `${baseUrl}/demanda/${demanda.id_demanda}`,
      });
    }
  } catch (err) {
    console.error('[Notificacao] Falha ao notificar responsável de deploy:', (err as Error).message);
  }
}
