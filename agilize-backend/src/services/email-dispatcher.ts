import db from '../db/connection';
import { enviar } from './email.service';
import type { Demanda as DemandaRow, Usuario } from '../types/models';

interface EmailEvento {
  para: string;
  assunto: string;
  titulo: string;
  mensagem: string;
  numeroDemanda?: string | null;
  linkAcao?: string;
}

function disparar(evento: EmailEvento): void {
  enviar(evento)
    .then((r) => console.info('[EmailDispatcher]', r.mensagem))
    .catch((err: Error) => console.error(`[EmailDispatcher] Falha para ${evento.para}:`, err.message));
}

function dispararParaGestores(gestores: Usuario[], evento: Omit<EmailEvento, 'para'>): void {
  for (const g of gestores) {
    if (g.email) disparar({ ...evento, para: g.email });
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function dispararEmailMudancaStatus(demanda: DemandaRow | undefined, statusNovo: string): Promise<void> {
  if (!demanda) return;

  try {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkAcao = `${baseUrl}/demandas/${demanda.numero_demanda}`;
    const num = demanda.numero_demanda ?? undefined;

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

    switch (statusNovo) {
      case 'DRAFT':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda criada — ${num}`, titulo: `Demanda criada com sucesso — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi registrada. Acesse o sistema para enviá-la ao seu gestor quando estiver pronta.`, numeroDemanda: num, linkAcao });
        break;

      case 'PENDENTE_GESTOR':
        dispararParaGestores(gestores, { assunto: `Nova demanda aguardando validação — ${num}`, titulo: `Nova demanda aguardando sua validação — ${num}`, mensagem: `A demanda "${demanda.titulo}" foi enviada para sua validação.`, numeroDemanda: num, linkAcao });
        break;

      case 'VALIDADA_GESTOR':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda validada pelo gestor — ${num}`, titulo: `Demanda validada pelo gestor — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi validada pelo gestor e seguirá para análise da STI.`, numeroDemanda: num, linkAcao });
        break;

      case 'DEVOLVIDA_AJUSTES':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda devolvida para ajustes — ${num}`, titulo: `Demanda devolvida para ajustes — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi devolvida para ajustes pelo gestor. Acesse para ver o comentário.`, numeroDemanda: num, linkAcao });
        break;

      case 'FILA_STI':
        for (const analista of analistas)
          if (analista.email)
            disparar({ para: analista.email, assunto: `Nova demanda na fila da STI — ${num}`, titulo: `Nova demanda na fila da STI — ${num}`, mensagem: `A demanda "${demanda.titulo}" foi encaminhada para análise da STI.`, numeroDemanda: num, linkAcao });
        break;

      case 'APROVADA_STI':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda aprovada pela STI — ${num}`, titulo: `Demanda aprovada pela STI — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi aprovada pela STI. Você já pode iniciar o desenvolvimento.`, numeroDemanda: num, linkAcao });
        break;

      case 'REPROVADA_STI':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda reprovada pela STI — ${num}`, titulo: `Demanda reprovada pela STI — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi reprovada pela STI. Acesse para ver o motivo.`, numeroDemanda: num, linkAcao });
        dispararParaGestores(gestores, { assunto: `Demanda reprovada pela STI — ${num}`, titulo: `Demanda reprovada pela STI — ${num}`, mensagem: `A demanda "${demanda.titulo}" de sua unidade foi reprovada pela STI.`, numeroDemanda: num, linkAcao });
        break;

      case 'SOLICITADO_AJUSTES_STI':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `STI solicitou ajustes — ${num}`, titulo: `STI solicitou ajustes — ${num}`, mensagem: `A STI solicitou ajustes na sua demanda "${demanda.titulo}". Acesse para ver os detalhes e faça as correções.`, numeroDemanda: num, linkAcao });
        dispararParaGestores(gestores, { assunto: `STI solicitou ajustes — ${num}`, titulo: `STI solicitou ajustes — ${num}`, mensagem: `A STI solicitou ajustes na demanda "${demanda.titulo}" de sua unidade.`, numeroDemanda: num, linkAcao });
        break;

      case 'EM_DESENVOLVIMENTO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda em desenvolvimento — ${num}`, titulo: `Demanda em desenvolvimento — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" entrou em desenvolvimento. Submeta o produto quando estiver pronto.`, numeroDemanda: num, linkAcao });
        break;

      case 'SUBMETIDO_HOMOLOGACAO':
        dispararParaGestores(gestores, { assunto: `Produto submetido para homologação — ${num}`, titulo: `Produto submetido para homologação — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" foi submetido para homologação e aguarda sua validação.`, numeroDemanda: num, linkAcao });
        break;

      case 'VALIDADA_HOMOLOGACAO_GESTOR':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Produto validado pelo gestor — ${num}`, titulo: `Produto validado pelo gestor — ${num}`, mensagem: `O produto da sua demanda "${demanda.titulo}" foi validado pelo gestor e seguirá para homologação da STI.`, numeroDemanda: num, linkAcao });
        break;

      case 'DEVOLVIDA_HOMOLOGACAO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Produto devolvido para ajustes — ${num}`, titulo: `Produto devolvido para ajustes — ${num}`, mensagem: `O produto da sua demanda "${demanda.titulo}" foi devolvido pelo gestor para ajustes. Acesse para ver o comentário.`, numeroDemanda: num, linkAcao });
        break;

      case 'FILA_HOMOLOGACAO_STI':
        for (const analista of analistas)
          if (analista.email)
            disparar({ para: analista.email, assunto: `Produto aguardando homologação — ${num}`, titulo: `Produto aguardando homologação — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" foi encaminhado para homologação da STI.`, numeroDemanda: num, linkAcao });
        break;

      case 'SOLICITADO_AJUSTES_HOMOLOGACAO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `STI solicitou ajustes no produto — ${num}`, titulo: `STI solicitou ajustes no produto — ${num}`, mensagem: `A STI solicitou ajustes no produto da sua demanda "${demanda.titulo}". Acesse para ver os detalhes.`, numeroDemanda: num, linkAcao });
        break;

      case 'HOMOLOGADA':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Produto homologado pela STI — ${num}`, titulo: `Produto homologado pela STI — ${num}`, mensagem: `Parabéns! O produto da sua demanda "${demanda.titulo}" foi homologado pela STI e seguirá para produção.`, numeroDemanda: num, linkAcao });
        break;

      case 'REJEITADA':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Produto rejeitado na homologação — ${num}`, titulo: `Produto rejeitado na homologação — ${num}`, mensagem: `O produto da sua demanda "${demanda.titulo}" foi rejeitado. Acesse para ver o motivo.`, numeroDemanda: num, linkAcao });
        dispararParaGestores(gestores, { assunto: `Produto rejeitado na homologação — ${num}`, titulo: `Produto rejeitado na homologação — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" de sua unidade foi rejeitado na homologação.`, numeroDemanda: num, linkAcao });
        break;

      case 'EM_PRODUCAO': {
        if (demanda.tipo_deploy === 'OPS_DEPLOY' && demanda.id_responsavel_deploy) {
          const responsavel = await db('tb_usuarios').where('id_usuario', demanda.id_responsavel_deploy).where('ativo', 1).first();
          if (responsavel?.email)
            disparar({ para: responsavel.email, assunto: `Produto pronto para implantação — ${num}`, titulo: `Produto pronto para implantação — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" foi homologado e está pronto para ser implantado em produção.`, numeroDemanda: num, linkAcao });
        } else {
          const opsTeam = await db('tb_usuarios').where('perfil_principal', 'RESPONSAVEL_PRODUCAO').where('ativo', 1);
          for (const ops of opsTeam)
            if (ops.email)
              disparar({ para: ops.email, assunto: `Produto pronto para implantação — ${num}`, titulo: `Produto pronto para implantação — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" foi homologado e está pronto para ser implantado em produção.`, numeroDemanda: num, linkAcao });
        }
        break;
      }

      case 'EM_MONITORAMENTO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Solução implantada em produção — ${num}`, titulo: `Solução implantada em produção — ${num}`, mensagem: `Sua solução "${demanda.titulo}" foi implantada com sucesso e está em monitoramento.`, numeroDemanda: num, linkAcao });
        break;

      case 'AGUARDANDO_DPO': {
        const dpos = demanda.id_dpo
          ? await db('tb_usuarios').where('id_usuario', demanda.id_dpo).where('ativo', 1)
          : await db('tb_usuarios').where('perfil_principal', 'DPO').where('ativo', 1);
        for (const dpo of dpos)
          if (dpo.email)
            disparar({ para: dpo.email, assunto: `Demanda aguardando análise LGPD — ${num}`, titulo: `Demanda aguardando análise LGPD — ${num}`, mensagem: `A demanda "${demanda.titulo}" contém dados sensíveis e aguarda sua análise de conformidade LGPD (Fase 1).`, numeroDemanda: num, linkAcao });
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda encaminhada ao DPO — ${num}`, titulo: `Demanda encaminhada ao DPO — ${num}`, mensagem: `Sua demanda "${demanda.titulo}" foi encaminhada ao DPO para análise de conformidade LGPD antes de prosseguir.`, numeroDemanda: num, linkAcao });
        break;
      }

      case 'AGUARDANDO_DPO_HOMOLOGACAO': {
        const dpos = demanda.id_dpo_homologacao
          ? await db('tb_usuarios').where('id_usuario', demanda.id_dpo_homologacao).where('ativo', 1)
          : await db('tb_usuarios').where('perfil_principal', 'DPO').where('ativo', 1);
        for (const dpo of dpos)
          if (dpo.email)
            disparar({ para: dpo.email, assunto: `Produto aguardando análise LGPD — ${num}`, titulo: `Produto aguardando análise LGPD — ${num}`, mensagem: `O produto da demanda "${demanda.titulo}" contém dados sensíveis e aguarda sua análise de conformidade LGPD (Fase 3).`, numeroDemanda: num, linkAcao });
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Produto encaminhado ao DPO — ${num}`, titulo: `Produto encaminhado ao DPO — ${num}`, mensagem: `O produto da sua demanda "${demanda.titulo}" foi encaminhado ao DPO para análise de conformidade LGPD antes de prosseguir.`, numeroDemanda: num, linkAcao });
        break;
      }

      case 'SOLICITANTE_AJUSTANDO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Ajustes solicitados na sua demanda — ${num}`, titulo: `Ajustes solicitados na sua demanda — ${num}`, mensagem: `Foram solicitados ajustes na sua demanda "${demanda.titulo}". Acesse para ver o parecer e faça as correções.`, numeroDemanda: num, linkAcao });
        break;

      case 'AJUSTANDO_HOMOLOGACAO':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Ajustes solicitados no produto — ${num}`, titulo: `Ajustes solicitados no produto — ${num}`, mensagem: `Foram solicitados ajustes no produto da sua demanda "${demanda.titulo}". Acesse para ver o parecer e faça as correções.`, numeroDemanda: num, linkAcao });
        break;

      case 'CANCELADA':
        if (solicitante?.email)
          disparar({ para: solicitante.email, assunto: `Demanda cancelada — ${num}`, titulo: `Demanda cancelada — ${num}`, mensagem: `A demanda "${demanda.titulo}" foi cancelada.`, numeroDemanda: num, linkAcao });
        break;
    }
  } catch (err) {
    console.error('[EmailDispatcher] Erro ao processar emails:', (err as Error).message);
  }
}
