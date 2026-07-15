import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { demandaService, usuarioService, adminService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import FormParecer from '../components/FormParecer';
import {
  ArrowLeft, AlertTriangle, CheckCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Server, Info,
  RotateCcw, FileText, File, UserCheck, Shield, ShieldCheck,
  Code2, PackageCheck, Rocket, Ban, Pencil,
  X, Download, Paperclip, ArrowLeftRight,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────

const COR_AVATAR_HIST = {
  GESTOR_SISTEMA:       'bg-gray-900 text-white',
  AVALIADOR_TECNICO:    'bg-violet-100 text-violet-700',
  ANALISTA_STI:         'bg-red-100 text-red-700',
  DPO:                  'bg-pink-100 text-pink-800',
  RESPONSAVEL_PRODUCAO: 'bg-green-100 text-green-700',
  GESTOR_DEPARTAMENTO:  'bg-orange-100 text-orange-700',
  GESTOR_UNIDADE:       'bg-amber-100 text-amber-700',
  SOLICITANTE:          'bg-blue-100 text-blue-700',
};

const FASES = [
  { num: 1, label: 'Solicitação' },
  { num: 2, label: 'Desenvolvimento' },
  { num: 3, label: 'Homologação' },
  { num: 4, label: 'Produção' },
];

function getFaseAtual(status, demanda = null) {
  if (status === 'SUSPENSO' && demanda?.status_antes_suspensao) {
    return getFaseAtual(demanda.status_antes_suspensao);
  }
  if (['DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO',
    'VALIDADA_GESTOR', 'AGUARDANDO_DPO', 'FILA_STI', 'AGUARDANDO_AVALIADOR', 'APROVADA_STI',
    'REPROVADA_STI', 'REJEITADA', 'SOLICITADO_AJUSTES_STI'].includes(status)) return 1;
  if (['EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO'].includes(status)) return 2;
  if (['DEVOLVIDA_HOMOLOGACAO', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO',
    'VALIDADA_HOMOLOGACAO_GESTOR', 'AGUARDANDO_DPO_HOMOLOGACAO', 'FILA_HOMOLOGACAO_STI',
    'SOLICITADO_AJUSTES_HOMOLOGACAO', 'HOMOLOGADA'].includes(status)) return 3;
  if (['EM_PRODUCAO', 'EM_MONITORAMENTO', 'DESATIVADA'].includes(status)) return 4;
  return 0;
}

const CANCELAVEIS = [
  'DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO',
  'VALIDADA_GESTOR', 'FILA_STI', 'SOLICITADO_AJUSTES_STI',
  'APROVADA_STI', 'EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO',
  'SUSPENSO',
];

function getAcoesDisponiveis(usuario, demanda, historico = []) {
  if (!demanda) return [];
  const s = demanda.status_atual;
  const dpjHomFeito = historico.some(h => h.status_novo === 'AGUARDANDO_DPO_HOMOLOGACAO');
  const p = usuario.perfil_principal;
  const todosPerfis = [p, ...(Array.isArray(usuario.perfis_secundarios) ? usuario.perfis_secundarios : [])];
  const ehDono = Number(usuario.id_usuario) === Number(demanda.id_solicitante);
  const ehGestor = todosPerfis.includes('GESTOR_UNIDADE');
  const isAdmin = todosPerfis.includes('GESTOR_SISTEMA');
  const map = new Map();
  const add = (a) => { if (!map.has(a.id)) map.set(a.id, a); };

  // ── Solicitante ───────────────────────────────────────────────────────
  if ((todosPerfis.includes('SOLICITANTE') && ehDono) || isAdmin) {
    if (s === 'DRAFT') {
      if (demanda.gestor_unidade_disponivel !== false)
        add({ id: 'enviar-gestor', label: 'Enviar para Gestor', tipo: 'confirmar', variante: 'primary' });
    }
    if (s === 'DEVOLVIDA_AJUSTES' || s === 'SOLICITADO_AJUSTES_STI')
      add({ id: 'iniciar-ajuste', label: 'Iniciar Ajustes', tipo: 'confirmar', variante: 'warning' });
    if (s === 'SOLICITANTE_AJUSTANDO')
      add({ id: 'enviar-gestor', label: 'Reenviar para Gestor', tipo: 'confirmar', variante: 'primary' });
    if (s === 'APROVADA_STI')
      add({ id: 'iniciar-desenvolvimento', label: 'Iniciar Desenvolvimento', tipo: 'confirmar', variante: 'primary' });
    if (s === 'EM_DESENVOLVIMENTO')
      add({ id: 'submeter-produto', label: 'Submeter para Homologação', tipo: 'parecer', variante: 'primary' });
    if (['DEVOLVIDA_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO'].includes(s))
      add({ id: 'iniciar-ajuste-homologacao', label: 'Iniciar Ajustes (Hom.)', tipo: 'confirmar', variante: 'warning' });
    if (s === 'AJUSTANDO_HOMOLOGACAO')
      add({ id: 'submeter-produto', label: 'Submeter para Homologação', tipo: 'parecer', variante: 'primary' });
    // Self-deploy
    if (demanda.tipo_deploy === 'SELF_DEPLOY') {
      if (s === 'HOMOLOGADA')
        add({ id: 'iniciar-deploy', label: 'Iniciar Deploy', tipo: 'parecer', variante: 'primary' });
      if (s === 'EM_PRODUCAO')
        add({ id: 'confirmar-deploy', label: 'Confirmar Deploy', tipo: 'parecer', variante: 'success' });
    }
  }

  // ── Gestor ────────────────────────────────────────────────────────────
  if (ehGestor || isAdmin) {
    if (s === 'PENDENTE_GESTOR') {
      add({ id: 'validar-gestor', label: 'Validar', tipo: 'parecer', variante: 'success' });
      add({ id: 'devolver', label: 'Devolver p/ Ajustes', tipo: 'parecer', variante: 'warning' });
      add({ id: 'rejeitar-gestor', label: 'Rejeitar', tipo: 'rejeicao', variante: 'danger' });
    }
    if (s === 'VALIDADA_GESTOR' && !demanda.dados_sensiveis)
      add({ id: 'enviar-sti', label: 'Encaminhar para STI', tipo: 'confirmar', variante: 'primary' });
    if (s === 'VALIDADA_GESTOR' && demanda.dados_sensiveis)
      add({ id: 'enviar-sti', label: 'Encaminhar para análise LGPD', tipo: 'confirmar', variante: 'primary' });
    if (s === 'SUBMETIDO_HOMOLOGACAO') {
      add({ id: 'validar-homologacao-gestor', label: 'Validar Produto', tipo: 'parecer', variante: 'success' });
      add({ id: 'devolver-homologacao', label: 'Devolver p/ Ajustes', tipo: 'parecer', variante: 'warning' });
    }
    if (s === 'VALIDADA_HOMOLOGACAO_GESTOR' && (!demanda.dados_sensiveis || dpjHomFeito))
      add({ id: 'enviar-homologacao-sti', label: 'Enviar para STI (Hom.)', tipo: 'confirmar', variante: 'primary' });
    if (s === 'VALIDADA_HOMOLOGACAO_GESTOR' && demanda.dados_sensiveis && !dpjHomFeito)
      add({ id: 'enviar-homologacao-sti', label: 'Encaminhar para análise LGPD (Hom.)', tipo: 'confirmar', variante: 'primary' });
  }

  // ── Analista STI ──────────────────────────────────────────────────────
  if (todosPerfis.includes('ANALISTA_STI') || isAdmin) {
    if (s === 'FILA_STI') {
      add({ id: 'aprovar-sti', label: 'Aprovar Viabilidade', tipo: 'parecer', variante: 'success' });
      add({ id: 'solicitar-ajustes-sti', label: 'Solicitar Ajustes', tipo: 'parecer', variante: 'warning' });
      add({ id: 'reprovar-sti', label: 'Reprovar', tipo: 'rejeicao', variante: 'danger' });
      add({ id: 'encaminhar-avaliador', label: 'Encaminhar ao Avaliador Técnico', tipo: 'encaminhar-avaliador', variante: 'primary' });
      add({ id: 'suspender', label: 'Suspender Demanda', tipo: 'motivo', variante: 'neutral' });
    }
    if (s === 'FILA_HOMOLOGACAO_STI') {
      add({ id: 'homologar', label: 'Homologar', tipo: 'homologar', variante: 'success' });
      add({ id: 'solicitar-ajustes-homologacao', label: 'Solicitar Ajustes', tipo: 'parecer', variante: 'warning' });
      add({ id: 'rejeitar-homologacao', label: 'Rejeitar Produto', tipo: 'rejeicao', variante: 'danger' });
      add({ id: 'encaminhar-avaliador-hom', label: 'Encaminhar ao Avaliador Técnico', tipo: 'encaminhar-avaliador', variante: 'primary' });
      add({ id: 'suspender', label: 'Suspender Demanda', tipo: 'motivo', variante: 'neutral' });
    }
  }

  // ── Avaliador Técnico ─────────────────────────────────────────────────
  const ehAvaliador = todosPerfis.includes('AVALIADOR_TECNICO');
  const ehAvaliadorFase1 = ehAvaliador && s === 'AGUARDANDO_AVALIADOR' &&
    demanda.id_unidade_avaliador && Number(demanda.id_unidade_avaliador) === Number(usuario.id_unidade);
  const ehAvaliadorFase3 = ehAvaliador && s === 'AGUARDANDO_AVALIADOR_HOMOLOGACAO' &&
    demanda.id_unidade_avaliador && Number(demanda.id_unidade_avaliador) === Number(usuario.id_unidade);

  if ((ehAvaliadorFase1 || ehAvaliadorFase3) || isAdmin) {
    if (ehAvaliadorFase1 || (isAdmin && s === 'AGUARDANDO_AVALIADOR')) {
      add({ id: 'avaliador-solicitar-ajustes', label: 'Solicitar Ajustes ao Solicitante', tipo: 'parecer', variante: 'warning' });
      add({ id: 'avaliador-devolver-analista', label: 'Devolver ao Analista', tipo: 'parecer', variante: 'primary' });
      add({ id: 'suspender', label: 'Suspender Demanda', tipo: 'motivo', variante: 'neutral' });
    }
    if (ehAvaliadorFase3 || (isAdmin && s === 'AGUARDANDO_AVALIADOR_HOMOLOGACAO')) {
      add({ id: 'avaliador-solicitar-ajustes', label: 'Solicitar Ajustes ao Solicitante', tipo: 'parecer', variante: 'warning' });
      add({ id: 'avaliador-devolver-analista', label: 'Devolver ao Analista (Hom.)', tipo: 'parecer', variante: 'primary' });
      add({ id: 'suspender', label: 'Suspender Demanda', tipo: 'motivo', variante: 'neutral' });
    }
  }

  // ── DPO ──────────────────────────────────────────────────────────────
  if (p === 'DPO' || isAdmin) {
    if (s === 'AGUARDANDO_DPO') {
      add({ id: 'dpo-aprovar', label: 'Encaminhar para STI', tipo: 'parecer', variante: 'success' });
      add({ id: 'dpo-solicitar-ajustes', label: 'Solicitar Ajustes', tipo: 'parecer', variante: 'warning' });
    }
    if (s === 'AGUARDANDO_DPO_HOMOLOGACAO') {
      add({ id: 'dpo-aprovar', label: 'Encaminhar para Homologação STI', tipo: 'parecer', variante: 'success' });
      add({ id: 'dpo-solicitar-ajustes', label: 'Solicitar Ajustes', tipo: 'parecer', variante: 'warning' });
    }
  }

  // ── Ops / STI — deploy (por unidade STI, não por pessoa) ─────────────
  const podeDeployOps = isAdmin || (
    demanda.tipo_deploy === 'OPS_DEPLOY' &&
    demanda.id_unidade_producao &&
    Number(demanda.id_unidade_producao) === Number(usuario.id_unidade) &&
    todosPerfis.some(p => ['RESPONSAVEL_PRODUCAO', 'ANALISTA_STI'].includes(p))
  );
  if (podeDeployOps) {
    if (s === 'HOMOLOGADA')
      add({ id: 'iniciar-deploy', label: 'Iniciar Deploy', tipo: 'parecer', variante: 'primary' });
    if (s === 'EM_PRODUCAO')
      add({ id: 'confirmar-deploy', label: 'Confirmar Deploy', tipo: 'parecer', variante: 'success' });
  }
  if ((todosPerfis.some(p => ['ANALISTA_STI', 'RESPONSAVEL_PRODUCAO'].includes(p)) || isAdmin) && s === 'EM_MONITORAMENTO')
    add({ id: 'desativar', label: 'Desativar Solução', tipo: 'motivo', variante: 'danger' });

  // ── Suspensão — retorno ──────────────────────────────────────────────
  if (s === 'SUSPENSO') {
    const ehAvaliadorDesignado = todosPerfis.includes('AVALIADOR_TECNICO') &&
      demanda.id_unidade_avaliador &&
      Number(demanda.id_unidade_avaliador) === Number(usuario.id_unidade);
    const podeRetornar = todosPerfis.includes('ANALISTA_STI') || isAdmin || ehAvaliadorDesignado;
    if (podeRetornar)
      add({ id: 'retornar-suspensao', label: 'Retomar Demanda', tipo: 'confirmar', variante: 'primary' });
  }

  // ── Cancelamento ─────────────────────────────────────────────────────
  const podeCancelar = ['SOLICITANTE', 'GESTOR_UNIDADE', 'ANALISTA_STI'];
  if ((todosPerfis.some(pf => podeCancelar.includes(pf)) || isAdmin) && CANCELAVEIS.includes(s))
    add({ id: 'cancelar', label: 'Cancelar Demanda', tipo: 'motivo', variante: 'danger' });

  return [...map.values()];
}

const ACAO_HANDLERS = {
  'enviar-gestor': (id) => demandaService.enviarParaGestor(id),
  'iniciar-ajuste': (id) => demandaService.iniciarAjuste(id),
  'validar-gestor': (id, { parecer, comentario, anexos }) => demandaService.validarGestor(id, parecer, comentario, anexos),
  'devolver': (id, { parecer, comentario, anexos }) => demandaService.devolver(id, parecer, comentario, anexos),
  'rejeitar': (id, { motivo, parecer, anexos }) => demandaService.rejeitar(id, motivo, parecer, anexos),
  'rejeitar-gestor': (id, { motivo, parecer, anexos }) => demandaService.rejeitarGestor(id, motivo, parecer, anexos),
  'enviar-sti': (id) => demandaService.enviarParaSTI(id),
  'aprovar-sti': (id, { parecer, comentario, anexos }) => demandaService.aprovarSTI(id, parecer, comentario, anexos),
  'reprovar-sti': (id, { motivo, parecer, anexos }) => demandaService.reprovarSTI(id, motivo, parecer, anexos),
  'solicitar-ajustes-sti': (id, { parecer, comentario, anexos }) => demandaService.solicitarAjustesSTI(id, parecer, comentario, anexos),
  'reenviar-sti': (id) => demandaService.reenviarParaSTI(id),
  'dpo-aprovar': (id, { parecer, comentario, anexos }) => demandaService.dpoAprovar(id, parecer, comentario, anexos),
  'dpo-solicitar-ajustes': (id, { parecer, comentario, anexos }) => demandaService.dpoSolicitarAjustes(id, parecer, comentario, anexos),
  'iniciar-desenvolvimento': (id) => demandaService.iniciarDesenvolvimento(id),
  'submeter-produto': (id, { parecer, comentario, anexos }) => demandaService.submeterProduto(id, parecer, comentario, anexos),
  'validar-homologacao-gestor': (id, { parecer, comentario, anexos }) => demandaService.validarHomologacaoGestor(id, parecer, comentario, anexos),
  'devolver-homologacao': (id, { parecer, comentario, anexos }) => demandaService.devolverHomologacao(id, parecer, comentario, anexos),
  'iniciar-ajuste-homologacao': (id) => demandaService.iniciarAjusteHomologacao(id),
  'enviar-homologacao-sti': (id) => demandaService.enviarHomologacaoSTI(id),
  'solicitar-ajustes-homologacao': (id, { parecer, comentario, anexos }) => demandaService.solicitarAjustesHomologacao(id, parecer, comentario, anexos),
  'homologar': (id, { parecer, comentario, tipo_deploy, id_unidade_producao, anexos }) => demandaService.homologar(id, parecer, comentario, tipo_deploy, id_unidade_producao, anexos),
  'rejeitar-homologacao': (id, { motivo, parecer, anexos }) => demandaService.rejeitarHomologacao(id, motivo, parecer, anexos),
  'reenviar-homologacao-sti': (id) => demandaService.reenviarHomologacaoSTI(id),
  'iniciar-deploy': (id, { parecer, anexos }) => demandaService.iniciarDeploy(id, parecer, anexos),
  'confirmar-deploy': (id, { parecer, anexos }) => demandaService.confirmarDeploy(id, parecer, anexos),
  'desativar': (id, { motivo }) => demandaService.desativar(id, motivo),
  'encaminhar-avaliador': (id, { id_unidade_avaliador, comentario }) => demandaService.encaminharAvaliador(id, id_unidade_avaliador, comentario),
  'encaminhar-avaliador-hom': (id, { id_unidade_avaliador, comentario }) => demandaService.encaminharAvaliador(id, id_unidade_avaliador, comentario),
  'avaliador-solicitar-ajustes': (id, { parecer, comentario, anexos }) => demandaService.avaliadorSolicitarAjustes(id, parecer, comentario, anexos),
  'avaliador-devolver-analista': (id, { parecer, comentario, anexos }) => demandaService.avaliadorDevolverAnalista(id, parecer, comentario, anexos),
  'suspender': (id, { motivo }) => demandaService.suspender(id, motivo),
  'retornar-suspensao': (id) => demandaService.retornarSuspensao(id),
  'cancelar': (id, { motivo }) => demandaService.cancelar(id, motivo),
};

async function executarAcao(idDemanda, acaoId, params) {
  const handler = ACAO_HANDLERS[acaoId];
  if (!handler) throw new Error(`Ação desconhecida: ${acaoId}`);
  return handler(idDemanda, params);
}

// ─── Timeline do processo ──────────────────────────────────────────────────

const STATUS_IDX = {
  DRAFT: 0,
  PENDENTE_GESTOR: 1, DEVOLVIDA_AJUSTES: 1.5, SOLICITANTE_AJUSTANDO: 1.8,
  VALIDADA_GESTOR: 2, AGUARDANDO_DPO: 2.5, FILA_STI: 3, AGUARDANDO_AVALIADOR: 3.3, SOLICITADO_AJUSTES_STI: 3.5,
  APROVADA_STI: 4,
  EM_DESENVOLVIMENTO: 5,
  SUBMETIDO_HOMOLOGACAO: 6, DEVOLVIDA_HOMOLOGACAO: 6.5,
  AJUSTANDO_HOMOLOGACAO: 5,
  VALIDADA_HOMOLOGACAO_GESTOR: 7, AGUARDANDO_DPO_HOMOLOGACAO: 7.5, FILA_HOMOLOGACAO_STI: 8, AGUARDANDO_AVALIADOR_HOMOLOGACAO: 8.2, SOLICITADO_AJUSTES_HOMOLOGACAO: 8.5,
  HOMOLOGADA: 9,
  EM_PRODUCAO: 10,
  EM_MONITORAMENTO: 11,
  DESATIVADA: 12,
  REJEITADA: -1, REPROVADA_STI: -2, CANCELADA: -3,
  SUSPENSO: -4,
};

const PASSOS_TIMELINE = [
  {
    id: 'criacao', label: 'Criação', atorLabel: 'Solicitante', icon: FileText,
    activeIdx: 0, doneIdx: 1,
    eventoHistorico: null,
  },
  {
    id: 'gestor1', label: 'Análise do Gestor', atorLabel: 'Gestor da Unidade', icon: UserCheck,
    activeIdx: 1, doneIdx: 2,
    eventoHistorico: 'VALIDADA_GESTOR',
    eventoRetorno: ['DEVOLVIDA_AJUSTES'],
    terminalStatus: 'REJEITADA',
  },
  {
    id: 'dpo1', label: 'Análise DPO', atorLabel: 'DPO', icon: ShieldCheck,
    activeIdx: 2.5, doneIdx: 3,
    eventoHistorico: 'FILA_STI',
    eventoRetornoFiltro: { status_anterior: 'AGUARDANDO_DPO', tipo_acao: 'DPO_SOLICITAR_AJUSTES' },
    _dpoCampo: 'id_dpo',
  },
  {
    id: 'sti1', label: 'Viabilidade STI', atorLabel: 'Analista STI', icon: Shield,
    activeIdx: 3, doneIdx: 4,
    eventoHistorico: 'APROVADA_STI',
    eventoRetorno: ['SOLICITADO_AJUSTES_STI'],
    terminalStatus: 'REPROVADA_STI',
  },
  {
    id: 'dev', label: 'Desenvolvimento', atorLabel: 'Solicitante', icon: Code2,
    activeIdx: 5, doneIdx: 6,
    eventoHistorico: 'SUBMETIDO_HOMOLOGACAO',
  },
  {
    id: 'gestor2', label: 'Homologação do Gestor', atorLabel: 'Gestor da Unidade', icon: PackageCheck,
    activeIdx: 6, doneIdx: 7,
    eventoHistorico: 'VALIDADA_HOMOLOGACAO_GESTOR',
    eventoRetorno: ['DEVOLVIDA_HOMOLOGACAO'],
  },
  {
    id: 'dpo2', label: 'Homologação DPO', atorLabel: 'DPO', icon: ShieldCheck,
    activeIdx: 7.5, doneIdx: 8,
    eventoHistorico: 'FILA_HOMOLOGACAO_STI',
    eventoRetornoFiltro: { status_anterior: 'AGUARDANDO_DPO_HOMOLOGACAO', tipo_acao: 'DPO_SOLICITAR_AJUSTES' },
    _dpoCampo: 'id_dpo_homologacao',
  },
  {
    id: 'sti2', label: 'Homologação STI', atorLabel: 'Analista STI', icon: Shield,
    activeIdx: 8, doneIdx: 9,
    eventoHistorico: 'HOMOLOGADA',
    eventoRetorno: ['SOLICITADO_AJUSTES_HOMOLOGACAO'],
  },
  {
    id: 'producao', label: 'Em Produção', atorLabel: 'Ops / Solicitante', icon: Rocket,
    activeIdx: 10, doneIdx: 11,
    eventoHistorico: 'EM_MONITORAMENTO',
  },
];

function computarPassos(demanda, historico) {
  const status = demanda.status_atual;
  const statusEfetivo = (status === 'SUSPENSO' && demanda.status_antes_suspensao)
    ? demanda.status_antes_suspensao
    : status;
  const idx = STATUS_IDX[statusEfetivo] ?? -99;
  const isCancelada = status === 'CANCELADA';
  const isTerminal = idx < 0 && status !== 'SUSPENSO';

  const dpoPorCampo = (campo) =>
    demanda.dados_sensiveis === true ||
    historico.some(h => h.status_novo === (campo === 'id_dpo' ? 'AGUARDANDO_DPO' : 'AGUARDANDO_DPO_HOMOLOGACAO'));

  const passosFiltrados = PASSOS_TIMELINE.filter(p =>
    !p._dpoCampo || dpoPorCampo(p._dpoCampo)
  );

  return passosFiltrados.map(passo => {
    // Estado do nó
    let estado;
    if (idx >= passo.doneIdx) {
      estado = 'done';
    } else if (!isTerminal && idx >= passo.activeIdx) {
      estado = 'active';
    } else if (isCancelada && idx >= passo.activeIdx - 0.5) {
      estado = 'cancelled';
    } else if (status === passo.terminalStatus) {
      estado = 'error';
    } else if (isTerminal && idx < 0 && passo.activeIdx <= idx + 99) {
      // terminal before this checkpoint was reached
      estado = 'pending';
    } else {
      estado = 'pending';
    }

    // Dado do evento que concluiu o passo (do historico)
    const eventoConcluso = passo.eventoHistorico
      ? historico.find(h => h.status_novo === passo.eventoHistorico)
      : null;

    // Dado do evento de criação (especial)
    const eventoCriacao = passo.id === 'criacao'
      ? { nome_usuario: demanda.nome_solicitante, data_hora: demanda.data_criacao }
      : null;

    // Contagem de retornos/ajustes neste passo
    let retornos;
    if (passo.eventoRetornoFiltro) {
      retornos = historico.filter(h =>
        h.status_anterior === passo.eventoRetornoFiltro.status_anterior &&
        h.tipo_acao === passo.eventoRetornoFiltro.tipo_acao
      ).length;
    } else if (passo.eventoRetorno) {
      retornos = historico.filter(h => passo.eventoRetorno.includes(h.status_novo)).length;
    } else {
      retornos = 0;
    }

    // Evento terminal (rejeição/reprovação) se ocorreu neste passo
    const eventoTerminal = passo.terminalStatus && status === passo.terminalStatus
      ? historico.find(h => h.status_novo === passo.terminalStatus)
      : null;

    const statusAtualLabel = estado === 'active' ? (STATUS_LABEL_ATIVO[status] || 'Em andamento') : null;

    return { ...passo, estado, eventoConcluso, eventoCriacao, retornos, eventoTerminal, statusAtualLabel };
  });
}

const fmtDtCurta = (d) => d
  ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  : null;

const STATUS_LABEL_ATIVO = {
  DRAFT: 'Rascunho',
  PENDENTE_GESTOR: 'Aguardando análise',
  DEVOLVIDA_AJUSTES: 'Devolvida p/ ajustes',
  SOLICITANTE_AJUSTANDO: 'Ajustes em andamento',
  VALIDADA_GESTOR: 'Validado, enviando à STI',
  AGUARDANDO_DPO: 'Aguardando análise do DPO',
  FILA_STI: 'Na fila da STI',
  AGUARDANDO_AVALIADOR: 'Aguardando parecer do Avaliador Técnico',
  SOLICITADO_AJUSTES_STI: 'STI solicitou ajustes',
  APROVADA_STI: 'Aprovada, iniciando dev.',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  SUBMETIDO_HOMOLOGACAO: 'Submetido, aguardando gestor',
  DEVOLVIDA_HOMOLOGACAO: 'Devolvida p/ ajustes',
  AJUSTANDO_HOMOLOGACAO: 'Ajustes em andamento',
  VALIDADA_HOMOLOGACAO_GESTOR: 'Validado, aguardando STI',
  AGUARDANDO_DPO_HOMOLOGACAO: 'Aguardando análise do DPO',
  FILA_HOMOLOGACAO_STI: 'Na fila STI (hom.)',
  AGUARDANDO_AVALIADOR_HOMOLOGACAO: 'Aguardando parecer do Avaliador Técnico (hom.)',
  SOLICITADO_AJUSTES_HOMOLOGACAO: 'STI solicitou ajustes',
  HOMOLOGADA: 'Aguardando deploy',
  EM_PRODUCAO: 'Deploy em andamento',
};

function PassoTimeline({ passo, isLast }) {
  const Icone = passo.icon;

  const nodeStyle = {
    done: 'bg-emerald-500 border-emerald-500 text-white',
    active: 'bg-tce-700 border-tce-700 text-white',
    error: 'bg-red-500 border-red-500 text-white',
    cancelled: 'bg-neutral-300 border-neutral-300 text-white',
    pending: 'bg-white border-neutral-200 text-neutral-300',
  }[passo.estado] || 'bg-white border-neutral-200 text-neutral-300';

  const lineStyle = passo.estado === 'done' ? 'bg-emerald-200' : 'bg-neutral-100';

  const corLabelPasso = {
    done: 'text-neutral-700',
    active: 'text-tce-700',
    error: 'text-red-600',
  }[passo.estado] || 'text-neutral-400';

  const evento = passo.eventoCriacao || passo.eventoConcluso;

  return (
    <div className="flex gap-3">
      {/* Linha + nó */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${nodeStyle} ${passo.estado === 'active' ? 'ring-2 ring-tce-300 ring-offset-1' : ''}`}>
          {passo.estado === 'done' && <CheckCircle size={13} />}
          {passo.estado === 'active' && <Loader2 size={12} className="animate-spin" />}
          {passo.estado === 'error' && <XCircle size={13} />}
          {passo.estado === 'cancelled' && <Ban size={12} />}
          {passo.estado === 'pending' && <Icone size={12} />}
        </div>
        {!isLast && <div className={`w-px flex-1 mt-1 ${lineStyle}`} style={{ minHeight: 20 }} />}
      </div>

      {/* Conteúdo */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${corLabelPasso}`}>
            {passo.label}
          </span>
          {passo.retornos > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">
              <RotateCcw size={9} /> {passo.retornos}×
            </span>
          )}
        </div>

        {/* Done: quem fez + quando */}
        {passo.estado === 'done' && evento && (
          <p className="text-[11px] text-neutral-400 mt-0.5">
            {evento.nome_usuario}
            {evento.data_hora && <span className="text-neutral-300"> · {fmtDtCurta(evento.data_hora)}</span>}
          </p>
        )}

        {/* Criação done sem evento */}
        {passo.estado === 'done' && passo.id === 'criacao' && !evento && (
          <p className="text-[11px] text-neutral-400 mt-0.5">{passo.atorLabel}</p>
        )}

        {/* Active: status atual */}
        {passo.estado === 'active' && (
          <p className="text-[11px] text-tce-600 mt-0.5 font-medium">
            {passo.statusAtualLabel || 'Em andamento'}
          </p>
        )}

        {/* Error: quem rejeitou */}
        {passo.estado === 'error' && passo.eventoTerminal && (
          <p className="text-[11px] text-red-500 mt-0.5">
            {passo.eventoTerminal.nome_usuario}
            {passo.eventoTerminal.data_hora && <span className="text-red-300"> · {fmtDtCurta(passo.eventoTerminal.data_hora)}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function TimelineProcesso({ demanda, historico }) {
  const passos = computarPassos(demanda, historico);
  const isCancelada = demanda.status_atual === 'CANCELADA';

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-neutral-700">Linha do tempo</h2>
        {isCancelada && (
          <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
            Cancelada
          </span>
        )}
      </div>
      <div>
        {passos.map((passo, i) => (
          <PassoTimeline key={passo.id} passo={passo} isLast={i === passos.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ─── Componentes ───────────────────────────────────────────────────────────

function FaseIndicador({ status, demanda = null }) {
  const fase = getFaseAtual(status, demanda);
  const cancelado = status === 'CANCELADA';
  const terminal = ['REPROVADA_STI', 'REJEITADA', 'DESATIVADA'].includes(status);

  if (cancelado || terminal) {
    return (
      <div className="flex items-center gap-2">
        <XCircle size={14} className={cancelado ? 'text-gray-400' : 'text-red-500'} />
        <span className={`text-xs font-medium ${cancelado ? 'text-gray-400' : 'text-red-600'}`}>
          {cancelado ? 'Cancelada' : 'Encerrada'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {FASES.map((f, i) => {
        let corFase;
        if (f.num === fase) corFase = 'bg-tce-700 text-white';
        else if (f.num < fase) corFase = 'bg-tce-100 text-tce-600';
        else corFase = 'bg-neutral-100 text-neutral-400';

        return (
          <div key={f.num} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${corFase}`}>
              {f.num < fase && <CheckCircle size={10} />}
              {f.label}
            </div>
            {i < FASES.length - 1 && (
              <div className={`w-4 h-px ${f.num < fase ? 'bg-tce-300' : 'bg-neutral-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BotaoAcao({ acao, onClick }) {
  const cls = {
    primary: 'bg-tce-700 hover:bg-tce-800 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    danger: 'border border-red-300 text-red-600 hover:bg-red-50',
    neutral: 'border border-neutral-300 text-neutral-600 hover:bg-neutral-50',
  }[acao.variante] || 'bg-neutral-600 text-white';

  return (
    <button onClick={() => onClick(acao)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${cls}`}>
      {acao.label}
    </button>
  );
}

function InfoLinha({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-neutral-700 mt-0.5">{value}</p>
    </div>
  );
}

// ─── Helpers para arquivos no histórico ──────────────────────────────────────

const HIST_EXT = {
  pdf:  { label: 'PDF',  cor: 'text-red-500',     fundo: 'bg-red-50 border-red-200'          },
  doc:  { label: 'DOC',  cor: 'text-blue-600',    fundo: 'bg-blue-50 border-blue-200'        },
  docx: { label: 'DOCX', cor: 'text-blue-600',    fundo: 'bg-blue-50 border-blue-200'        },
  xls:  { label: 'XLS',  cor: 'text-emerald-600', fundo: 'bg-emerald-50 border-emerald-200'  },
  xlsx: { label: 'XLSX', cor: 'text-emerald-600', fundo: 'bg-emerald-50 border-emerald-200'  },
  ppt:  { label: 'PPT',  cor: 'text-orange-500',  fundo: 'bg-orange-50 border-orange-200'    },
  pptx: { label: 'PPTX', cor: 'text-orange-500',  fundo: 'bg-orange-50 border-orange-200'    },
  txt:  { label: 'TXT',  cor: 'text-neutral-500', fundo: 'bg-neutral-100 border-neutral-200' },
  csv:  { label: 'CSV',  cor: 'text-teal-600',    fundo: 'bg-teal-50 border-teal-200'        },
};
const HIST_TIPOS_DOC = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'csv'];

function histExt(nome) { return nome.split('.').pop()?.toLowerCase() || ''; }
function histCfg(nome) {
  const ext = histExt(nome);
  return HIST_EXT[ext] || { label: ext.toUpperCase() || 'ARQ', cor: 'text-neutral-400', fundo: 'bg-neutral-50 border-neutral-200' };
}
function fmtBytes(b) {
  if (b < 1024)      return `${b} B`;
  if (b < 1_048_576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1_048_576).toFixed(1)} MB`;
}

// ─── Item do histórico ────────────────────────────────────────────────────────

function HistoricoItem({ item, anexosSolicitacao, onRemoverAnexo }) {
  const [imgExpandida, setImgExpandida] = useState(null);

  const dt = new Date(item.data_hora);
  const dtFmt = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Fecha lightbox com ESC
  useEffect(() => {
    if (!imgExpandida) return;
    const onKey = (e) => { if (e.key === 'Escape') setImgExpandida(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [imgExpandida]);

  const handleParecerClick = (e) => {
    if (e.target.tagName === 'IMG') setImgExpandida(e.target.src);
  };

  return (
    <>
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold tracking-tight select-none ${COR_AVATAR_HIST[item.perfil_usuario] || 'bg-tce-100 text-tce-600'}`}>
            {(item.nome_usuario || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')}
          </div>
          <div className="w-px flex-1 bg-neutral-100 mt-1" />
        </div>
        <div className="pb-5 flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-700">{item.nome_usuario}</span>
            <span className="text-[11px] text-neutral-400">{item.perfil_usuario?.replace('_', ' ')}</span>
            <span className="text-[11px] text-neutral-300 ml-auto">{dtFmt}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {item.status_anterior && <><StatusBadge status={item.status_anterior} /><span className="text-neutral-300 text-xs">→</span></>}
            <StatusBadge status={item.status_novo} />
          </div>

          {/* Parecer — imagens clicáveis para ampliar */}
          {item.parecer && (
            <div
              className="mt-2 text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100 leading-relaxed rich-text-content rich-text-history"
              // eslint-disable-next-line react/no-danger -- conteúdo passa por DOMPurify.sanitize antes de renderizar
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.parecer) }}
              onClick={handleParecerClick}
            />
          )}

          {/* Documentos anexados */}
          {item.anexos?.length > 0 && (
            <div className="mt-2 space-y-1">
              {item.anexos.map((anexo, i) => {
                const { label: extLabel, cor, fundo } = histCfg(anexo.nome);
                const ext = histExt(anexo.nome);
                const TipoIcone = HIST_TIPOS_DOC.includes(ext) ? FileText : File;
                return (
                  <a
                    key={i}
                    href={anexo.url}
                    download={anexo.nome}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 bg-white border border-neutral-200 rounded-lg px-3 py-2 hover:border-tce-300 hover:bg-tce-50 transition group"
                  >
                    <TipoIcone size={14} className={`${cor} shrink-0`} />
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide shrink-0 ${cor} ${fundo}`}>
                      {extLabel}
                    </span>
                    <p className="flex-1 text-xs font-medium text-neutral-700 truncate min-w-0" title={anexo.nome}>
                      {anexo.nome}
                    </p>
                    {anexo.tamanho && (
                      <span className="text-[11px] text-neutral-400 shrink-0 tabular-nums">{fmtBytes(anexo.tamanho)}</span>
                    )}
                    <Download size={12} className="text-neutral-300 group-hover:text-tce-600 transition shrink-0" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Documentos da solicitação (injetados no primeiro evento) */}
          {anexosSolicitacao?.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Paperclip size={10} />Documentos da solicitação
              </p>
              {anexosSolicitacao.map((a, i) => {
                const { label: extLbl, cor, fundo } = histCfg(a.nome);
                const ext = histExt(a.nome);
                const TipoIcone = HIST_TIPOS_DOC.includes(ext) ? FileText : File;
                return (
                  <div key={i} className="flex items-center gap-2.5 bg-white border border-neutral-200 rounded-lg px-3 py-2 hover:border-tce-300 hover:bg-tce-50 transition group">
                    <a href={a.conteudo} download={a.nome} className="flex items-center gap-2.5 flex-1 min-w-0">
                      <TipoIcone size={14} className={`${cor} shrink-0`} />
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide shrink-0 ${cor} ${fundo}`}>{extLbl}</span>
                      <p className="flex-1 text-xs font-medium text-neutral-700 truncate min-w-0" title={a.nome}>{a.nome}</p>
                      {a.tamanho && <span className="text-[11px] text-neutral-400 shrink-0 tabular-nums">{fmtBytes(a.tamanho)}</span>}
                      <Download size={12} className="text-neutral-300 group-hover:text-tce-600 transition shrink-0" />
                    </a>
                    {onRemoverAnexo && (
                      <button type="button" onClick={() => onRemoverAnexo(i)}
                        title="Remover documento"
                        className="ml-1 text-neutral-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {item.comentario && <p className="mt-1 text-xs text-neutral-400 italic">{item.comentario}</p>}
          {item.motivo_rejeicao && (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={11} /> {item.motivo_rejeicao}
            </p>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {imgExpandida && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          onClick={() => setImgExpandida(null)}
        >
          <button
            type="button"
            onClick={() => setImgExpandida(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X size={18} />
          </button>
          <img
            src={imgExpandida}
            alt="Imagem ampliada"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

function DadosTecnicos({ demanda }) {
  const [aberto, setAberto] = useState(false);
  const dados = demanda.dados_tecnicos;
  if (!dados || Object.keys(dados).length === 0) return null;

  const LABELS = {
    ferramenta_bi: 'Ferramenta BI', fontes_dados: 'Fontes de dados',
    frequencia_atualizacao: 'Freq. atualização', conexao_direta: 'Conexão direta com BD', banco_bi: 'Banco de dados',
    linguagem: 'Linguagem', execucao: 'Execução', agendamento: 'Agendamento', escopo: 'Escopo',
    provedor_llm: 'Provedor LLM', modelo_llm: 'Modelo', estimativa_tokens_mes: 'Tokens/mês (est.)',
    custo_llm_mes_estimado: 'Custo LLM/mês (est.)', usa_rag: 'Usa RAG', fontes_rag: 'Fontes RAG',
    acoes_autonomas: 'Ações autônomas', descricao_acoes: 'Descrição das ações', tem_memoria_persistente: 'Memória persistente',
    usa_git: 'Usa Git',
    tipo_interface: 'Tipo de interface', tecnologia: 'Tecnologias', banco_dados: 'Banco de dados',
    usuarios_simultaneos: 'Usuários simultâneos', requer_servidor_dedicado: 'Servidor dedicado',
    tem_autenticacao: 'Autenticação', tipo_autenticacao: 'Tipo de autenticação', expoe_api: 'Expõe API',
    descricao_tecnologia: 'Descrição da tecnologia',
  };

  const fmtValue = (v) => {
    if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v.toLocaleString('pt-BR');
    return String(v);
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition">
        <h2 className="text-sm font-semibold text-neutral-700">Configuração técnica</h2>
        {aberto ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>
      {aberto && (
        <div className="px-5 pb-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-neutral-100 pt-4">
          {Object.entries(dados).map(([k, v]) => {
            const label = LABELS[k] || k;
            const val = fmtValue(v);
            if (!val) return null;
            return <InfoLinha key={k} label={label} value={val} />;
          })}
        </div>
      )}
    </div>
  );
}

function Dependencias({ demanda }) {
  const [aberto, setAberto] = useState(false);
  const deps = demanda.dependencias_externas;
  if (!deps || Object.keys(deps).length === 0) return null;

  const LABELS = {
    usa_internet: 'Acessa a internet', usa_dados_tcece: 'Acessa dados internos TCE-CE',
    acesso_banco_dados: 'Acessa banco de dados', nome_banco: 'Banco utilizado',
    repositorio_git: 'Repositório Git', url_repositorio: 'URL do repositório',
    apis_externas: 'APIs externas', sistemas_integrados: 'Sistemas integrados', outras: 'Outras dependências',
  };

  const itens = Object.entries(deps).filter(([, v]) => {
    if (typeof v === 'boolean') return v;
    return v !== null && v !== undefined && v !== '';
  });

  if (itens.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-neutral-50 transition">
        <h2 className="text-sm font-semibold text-neutral-700">Dependências externas</h2>
        {aberto ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
      </button>
      {aberto && (
        <div className="px-5 pb-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-neutral-100 pt-4">
          {itens.map(([k, v]) => (
            <InfoLinha key={k} label={LABELS[k] || k}
              value={typeof v === 'boolean' ? 'Sim' : String(v)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal de ação ─────────────────────────────────────────────────────────

const LEGENDA_PADRAO = {
  'submeter-produto':           'Demanda submetida para homologação.',
  'validar-gestor':             'Solicitação validada pelo gestor da unidade.',
  'validar-homologacao-gestor': 'Produto validado pelo gestor da unidade.',
  'aprovar-sti':                'Viabilidade aprovada pela STI.',
  'homologar':                  'Produto homologado pela STI.',
  'dpo-aprovar':                'Análise LGPD concluída. Demanda encaminhada.',
  'rejeitar-gestor':            'Demanda rejeitada pelo gestor da unidade.',
  'reprovar-sti':               'Demanda reprovada pela STI.',
  'rejeitar-homologacao':       'Produto rejeitado pela STI na fase de homologação.',
  'iniciar-deploy':             'Iniciado o processo de deploy em produção.',
  'confirmar-deploy':           'Deploy confirmado. Solução em produção.',
};

function SeletorUnidade({ carregando, erro, valor, onChange, opcoes }) {
  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-neutral-400">
        <Loader2 size={14} className="animate-spin" /> Carregando unidades...
      </div>
    );
  }
  if (erro) {
    return (
      <p className="text-sm text-red-500 flex items-center gap-1.5">
        <AlertTriangle size={13} />{erro}
      </p>
    );
  }
  return (
    <select
      value={valor}
      onChange={onChange}
      className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500"
    >
      <option value="">Selecione a unidade...</option>
      {opcoes.map(u => (
        <option key={u.id_unidade} value={u.id_unidade}>{u.sigla} — {u.nome_unidade}</option>
      ))}
    </select>
  );
}

function ModalAcao({ acao, onConfirmar, onFechar, executando }) {
  const defaultParecer = LEGENDA_PADRAO[acao.id] ?? '';
  const [parecer, setParecer] = useState(defaultParecer ? `<p>${defaultParecer}</p>` : '');
  const [parecerText, setParecerText] = useState(defaultParecer);
  const [comentario, setComentario] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoDeploy, setTipoDeploy] = useState('');
  const [anexos, setAnexos] = useState([]);
  const [unidadesProducao, setUnidadesProducao]               = useState([]);
  const [loadingUnidades, setLoadingUnidades]                 = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada]           = useState('');
  const [erroUnidades, setErroUnidades]                       = useState('');
  const [unidadesAvaliador, setUnidadesAvaliador]             = useState([]);
  const [loadingUnidadesAv, setLoadingUnidadesAv]             = useState(false);
  const [unidadeAvaliadorSelecionada, setUnidadeAvaliadorSelecionada] = useState('');
  const [erroUnidadesAv, setErroUnidadesAv]                   = useState('');
  const [erro, setErro] = useState('');

  const ic = `w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition`;

  useEffect(() => {
    if (acao.tipo === 'encaminhar-avaliador' && unidadesAvaliador.length === 0) {
      setLoadingUnidadesAv(true);
      setErroUnidadesAv('');
      usuarioService.listarUnidadesAvaliadores()
        .then(({ data }) => setUnidadesAvaliador(data.unidades || []))
        .catch(() => setErroUnidadesAv('Não foi possível carregar as unidades.'))
        .finally(() => setLoadingUnidadesAv(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unidadesAvaliador.length intencionalmente fora (evita loop); revisar depois
  }, [acao.tipo]);

  const handleTipoDeploy = async (valor) => {
    setTipoDeploy(valor);
    setUnidadeSelecionada('');
    if (valor === 'OPS_DEPLOY' && unidadesProducao.length === 0) {
      setLoadingUnidades(true);
      setErroUnidades('');
      try {
        const { data } = await usuarioService.listarUnidadesProducao();
        setUnidadesProducao(data.unidades || []);
      } catch {
        setErroUnidades('Não foi possível carregar as unidades de produção.');
      } finally {
        setLoadingUnidades(false);
      }
    }
  };

  const handleConfirmar = () => {
    if (acao.tipo === 'rejeicao') {
      if (!motivo.trim()) { setErro('Informe o motivo'); return; }
      if (parecerText.trim().length < 20) { setErro('O parecer precisa ter pelo menos 20 caracteres'); return; }
    }
    if (acao.tipo === 'parecer') {
      if (parecerText.trim().length < 20) { setErro('O parecer precisa ter pelo menos 20 caracteres'); return; }
    }
    if (acao.tipo === 'homologar') {
      if (parecerText.trim().length < 20) { setErro('O parecer precisa ter pelo menos 20 caracteres'); return; }
      if (!tipoDeploy) { setErro('Defina o tipo de deploy'); return; }
      if (tipoDeploy === 'OPS_DEPLOY' && !unidadeSelecionada) {
        setErro('Selecione a unidade de produção STI'); return;
      }
    }
    if (acao.tipo === 'encaminhar-avaliador' && !unidadeAvaliadorSelecionada) {
      setErro('Selecione a unidade do Avaliador Técnico'); return;
    }
    if (acao.tipo === 'motivo' && !motivo.trim()) {
      setErro('Informe o motivo'); return;
    }
    onConfirmar({
      parecer, comentario, motivo,
      tipo_deploy: tipoDeploy,
      id_unidade_producao: tipoDeploy === 'OPS_DEPLOY' ? unidadeSelecionada : null,
      id_unidade_avaliador: acao.tipo === 'encaminhar-avaliador' ? unidadeAvaliadorSelecionada : null,
      anexos,
    });
  };

  return (
    <Modal titulo={acao.label} onFechar={onFechar}>
      <div className="space-y-3">

        {acao.tipo === 'confirmar' && (
          <p className="text-sm text-neutral-600">
            Confirmar: <strong>{acao.label}</strong>?
          </p>
        )}

        {(acao.tipo === 'rejeicao' || acao.tipo === 'motivo') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea className={ic + ' resize-none'} rows={2} value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo..." />
          </div>
        )}

        {(acao.tipo === 'parecer' || acao.tipo === 'rejeicao' || acao.tipo === 'homologar') && (
          <FormParecer
            parecer={parecer}
            onParecerChange={setParecer}
            onTextChange={setParecerText}
            comentario={comentario}
            onComentarioChange={setComentario}
            onAnexosChange={setAnexos}
            showComentario={acao.tipo !== 'rejeicao'}
            minRows={4}
            placeholder="Descreva sua análise ou decisão..."
            label="Parecer"
            defaultText={defaultParecer}
          />
        )}

        {acao.tipo === 'homologar' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Tipo de deploy <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'SELF_DEPLOY', label: 'Self-deploy', desc: 'O solicitante faz o deploy', icon: '👤' },
                { value: 'OPS_DEPLOY', label: 'Ops / Infra', desc: 'Equipe de Operações faz', icon: '🏗️' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => handleTipoDeploy(opt.value)}
                  className={`text-left rounded-lg border-2 p-2.5 transition-all ${tipoDeploy === opt.value
                      ? 'border-tce-500 bg-tce-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                    }`}>
                  <p className="text-sm font-semibold text-neutral-700">{opt.icon} {opt.label}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {acao.tipo === 'homologar' && tipoDeploy === 'OPS_DEPLOY' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Unidade de produção STI <span className="text-red-500">*</span>
            </label>
            <SeletorUnidade
              carregando={loadingUnidades}
              erro={erroUnidades}
              valor={unidadeSelecionada}
              onChange={e => setUnidadeSelecionada(e.target.value)}
              opcoes={unidadesProducao}
            />
          </div>
        )}

        {acao.tipo === 'encaminhar-avaliador' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Unidade do Avaliador Técnico <span className="text-red-500">*</span>
            </label>
            <SeletorUnidade
              carregando={loadingUnidadesAv}
              erro={erroUnidadesAv}
              valor={unidadeAvaliadorSelecionada}
              onChange={e => setUnidadeAvaliadorSelecionada(e.target.value)}
              opcoes={unidadesAvaliador}
            />
            <p className="text-[11px] text-violet-600 mt-1.5">
              Todos os Avaliadores Técnicos da unidade selecionada poderão analisar a demanda.
            </p>
          </div>
        )}

        {erro && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={13} />{erro}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onFechar} disabled={executando}
            className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={executando}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition disabled:opacity-50">
            {executando && <Loader2 size={13} className="animate-spin" />}
            {executando ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────

const PRIORIDADE_CLS = {
  CRITICA: 'bg-red-100 text-red-700',
  ALTA: 'bg-orange-100 text-orange-700',
  MEDIA: 'bg-yellow-100 text-yellow-700',
  BAIXA: 'bg-green-100 text-green-700',
};

const TIPO_SOLUCAO_LABEL = {
  PAINEL_BI: 'Painel BI', SCRIPT: 'Script / Automação',
  AGENTE_IA: 'Agente IA', SISTEMA_SIMPLES: 'Sistema / Aplicação', OUTRO: 'Outro',
};

export default function DemandaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [demanda, setDemanda] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');
  const [erroStatus, setErroStatus] = useState(null);
  const [sucesso, setSucesso] = useState('');
  const [acaoAtiva, setAcaoAtiva] = useState(null);
  const [executando, setExecutando] = useState(false);

  const [modalTransferencia, setModalTransferencia]   = useState(false);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [departamentos, setDepartamentos]             = useState([]);
  const [transferDepartamento, setTransferDepartamento] = useState('');
  const [transferUnidade, setTransferUnidade]         = useState('');
  const [transferMotivo, setTransferMotivo]           = useState('');
  const [transferErro, setTransferErro]               = useState('');
  const [transferSalvando, setTransferSalvando]       = useState(false);

  const carregar = useCallback(async () => {
    setErroGeral('');
    setErroStatus(null);
    try {
      const [{ data: d }, { data: h }] = await Promise.all([
        demandaService.obter(id),
        demandaService.obterHistorico(id),
      ]);
      setDemanda(d.demanda);
      setHistorico(h.historico || []);
    } catch (err) {
      setErroStatus(err.response?.status ?? null);
      setErroGeral(err.response?.data?.message || 'Erro ao carregar a demanda');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirModalTransferencia = async () => {
    if (!unidadesDisponiveis.length) {
      const [resUnidades, resDepts] = await Promise.all([
        adminService.listarUnidades(),
        adminService.listarDepartamentos(),
      ]);
      setUnidadesDisponiveis(resUnidades.data?.unidades ?? resUnidades.data ?? []);
      setDepartamentos(resDepts.data?.departamentos ?? resDepts.data ?? []);
    }
    setTransferDepartamento(''); setTransferUnidade(''); setTransferMotivo(''); setTransferErro('');
    setModalTransferencia(true);
  };

  const confirmarTransferencia = async () => {
    if (!transferUnidade) { setTransferErro('Selecione a nova unidade.'); return; }
    if (transferMotivo.trim().length < 10) { setTransferErro('Motivo deve ter ao menos 10 caracteres.'); return; }
    setTransferSalvando(true); setTransferErro('');
    try {
      await demandaService.transferirLocacao(demanda.id_demanda, Number(transferUnidade), transferMotivo.trim());
      setModalTransferencia(false);
      carregar();
    } catch (err) {
      setTransferErro(err.response?.data?.message ?? 'Erro ao transferir locação.');
    } finally { setTransferSalvando(false); }
  };

  const podeEditarAnexos =
    ['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda?.status_atual) &&
    Number(usuario.id_usuario) === Number(demanda?.id_solicitante);

  const handleRemoverAnexo = async (idx) => {
    const novos = (demanda.anexos || []).filter((_, i) => i !== idx);
    try {
      const { data } = await demandaService.atualizarAnexos(id, novos);
      setDemanda(data.demanda);
    } catch {
      setErroGeral('Erro ao remover o documento.');
    }
  };

  const handleAcao = async (dados) => {
    setExecutando(true);
    try {
      await executarAcao(id, acaoAtiva.id, dados);
      setSucesso(`"${acaoAtiva.label}" realizado com sucesso`);
      setAcaoAtiva(null);
      await carregar();
      setTimeout(() => setSucesso(''), 5000);
    } catch (err) {
      setErroGeral(err.response?.data?.message || 'Erro ao executar a ação');
    } finally {
      setExecutando(false);
    }
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 gap-3 text-neutral-400">
          <Loader2 size={24} className="animate-spin text-tce-500" />
          <span className="text-sm">Carregando...</span>
        </div>
      </Layout>
    );
  }

  if (!demanda) {
    const acesso403 = erroStatus === 403;
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          {acesso403
            ? <XCircle size={40} className="text-red-300 mx-auto mb-3" />
            : <Info size={40} className="text-neutral-300 mx-auto mb-3" />
          }
          <p className="font-semibold text-neutral-700 mb-1">
            {acesso403 ? 'Acesso negado' : 'Demanda não encontrada'}
          </p>
          <p className="text-sm text-neutral-500">
            {acesso403
              ? 'Você não tem permissão para visualizar esta demanda.'
              : 'Esta demanda não existe ou foi removida.'}
          </p>
          <button onClick={() => navigate('/dashboard')}
            className="mt-5 text-sm text-tce-600 hover:underline">Voltar ao dashboard</button>
        </div>
      </Layout>
    );
  }

  const acoes = getAcoesDisponiveis(usuario, demanda, historico);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition mt-1">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded">
                {demanda.numero_demanda}
              </span>
              <StatusBadge status={demanda.status_atual} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORIDADE_CLS[demanda.prioridade] || 'bg-gray-100 text-gray-600'}`}>
                {demanda.prioridade}
              </span>
            </div>
            <h1 className="text-xl font-bold text-neutral-800 leading-tight">{demanda.titulo}</h1>
            <div className="mt-2">
              <FaseIndicador status={demanda.status_atual} demanda={demanda} />
            </div>
          </div>
          {['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual) &&
            Number(usuario.id_usuario) === Number(demanda.id_solicitante) && (
              <button onClick={() => navigate(`/demanda/${id}/editar`)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-tce-700 border border-tce-300 rounded-lg hover:bg-tce-50 transition mt-1 shrink-0">
                <Pencil size={14} />
                Editar
              </button>
            )}
        </div>

        {/* Alertas */}
        {erroGeral && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {erroGeral}
          </div>
        )}
        {demanda.status_atual === 'DRAFT' && demanda.gestor_unidade_disponivel === false && (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <span>
              <strong>Sem gestor ativo na unidade.</strong> Esta demanda não pode ser enviada ao gestor enquanto a unidade <em>{demanda.nome_unidade}</em> não tiver um gestor designado e ativo. Entre em contato com o administrador do sistema.
            </span>
          </div>
        )}
        {sucesso && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <CheckCircle size={15} className="shrink-0" />
            {sucesso}
          </div>
        )}

        {/* Ações */}
        {(acoes.length > 0 || (['GESTOR_SISTEMA', 'ANALISTA_STI'].includes(usuario?.perfil_principal) && demanda?.status_atual === 'EM_MONITORAMENTO')) && (
          <div className="mb-6 bg-white rounded-xl border border-neutral-200 px-5 py-4">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Ações disponíveis para você
            </p>
            <div className="flex flex-wrap gap-2">
              {acoes.map(a => <BotaoAcao key={a.id} acao={a} onClick={setAcaoAtiva} />)}
              {['GESTOR_SISTEMA', 'ANALISTA_STI'].includes(usuario?.perfil_principal) && demanda?.status_atual === 'EM_MONITORAMENTO' && (
                <button
                  onClick={abrirModalTransferencia}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-tce-200 text-tce-700 bg-white hover:bg-tce-50 transition-colors"
                >
                  <ArrowLeftRight size={15} />
                  Transferir Locação
                </button>
              )}
            </div>
          </div>
        )}

        {/* Corpo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-4">

            {/* Descrição */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-700 mb-2">Descrição</h2>
                <p className="text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed">{demanda.descricao}</p>
              </div>
              {demanda.objetivo_principal && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Objetivo principal</h3>
                  <p className="text-sm text-neutral-600">{demanda.objetivo_principal}</p>
                </div>
              )}
              {demanda.justificativa && (
                <div>
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Justificativa</h3>
                  <p className="text-sm text-neutral-500 whitespace-pre-wrap">{demanda.justificativa}</p>
                </div>
              )}
            </div>

            <DadosTecnicos demanda={demanda} />
            <Dependencias demanda={demanda} />

            {/* Histórico */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-semibold text-neutral-700 mb-4">Histórico de tramitação</h2>
              {historico.length === 0 && (
                <>
                  <p className="text-sm text-neutral-400 text-center py-4">Nenhum registro ainda</p>
                  {/* Documentos anexados no rascunho antes de qualquer envio */}
                  {(demanda.anexos?.length > 0) && (
                    <div className="border-t border-neutral-100 pt-4 space-y-1.5">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Paperclip size={10} />Documentos da solicitação
                      </p>
                      {demanda.anexos.map((a, i) => {
                        const { label: extLbl, cor, fundo } = histCfg(a.nome);
                        const ext = histExt(a.nome);
                        const TipoIcone = HIST_TIPOS_DOC.includes(ext) ? FileText : File;
                        return (
                          <div key={i} className="flex items-center gap-2.5 bg-white border border-neutral-200 rounded-lg px-3 py-2 hover:border-tce-300 hover:bg-tce-50 transition group">
                            <a href={a.conteudo} download={a.nome} className="flex items-center gap-2.5 flex-1 min-w-0">
                              <TipoIcone size={14} className={`${cor} shrink-0`} />
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide shrink-0 ${cor} ${fundo}`}>{extLbl}</span>
                              <p className="flex-1 text-xs font-medium text-neutral-700 truncate min-w-0" title={a.nome}>{a.nome}</p>
                              {a.tamanho && <span className="text-[11px] text-neutral-400 shrink-0 tabular-nums">{fmtBytes(a.tamanho)}</span>}
                              <Download size={12} className="text-neutral-300 group-hover:text-tce-600 transition shrink-0" />
                            </a>
                            {podeEditarAnexos && (
                              <button type="button" onClick={() => handleRemoverAnexo(i)}
                                title="Remover documento"
                                className="ml-1 text-neutral-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100">
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {historico.length > 0 && historico.map((item, idx) => (
                    <HistoricoItem
                      key={item.id_historico}
                      item={item}
                      anexosSolicitacao={idx === historico.length - 1 ? (demanda.anexos || []) : undefined}
                      onRemoverAnexo={idx === historico.length - 1 && podeEditarAnexos ? handleRemoverAnexo : undefined}
                    />
                  ))
              }
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3.5">
              <h2 className="text-sm font-semibold text-neutral-700">Informações</h2>
              <InfoLinha label="Tipo de solução" value={TIPO_SOLUCAO_LABEL[demanda.tipo_solucao] || demanda.tipo_solucao} />
              <InfoLinha label="Solicitante" value={demanda.nome_solicitante} />
              <InfoLinha label="Unidade" value={demanda.nome_unidade} />
              <InfoLinha label="Departamento" value={demanda.nome_departamento} />
              {demanda.publico_alvo && <InfoLinha label="Público-alvo" value={demanda.publico_alvo} />}
              {demanda.frequencia_uso && <InfoLinha label="Frequência de uso" value={demanda.frequencia_uso} />}
              {demanda.quantidade_usuarios_estimada && (
                <InfoLinha label="Usuários estimados" value={String(demanda.quantidade_usuarios_estimada)} />
              )}

              {demanda.solucao_em_uso != null && (
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Solução em uso</p>
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                    demanda.solucao_em_uso ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {demanda.solucao_em_uso ? 'Sim' : 'Não'}
                  </span>
                </div>
              )}

              {demanda.dados_sensiveis != null && (
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Dados sensíveis</p>
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                    demanda.dados_sensiveis ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {demanda.dados_sensiveis ? 'Sim' : 'Não'}
                  </span>
                  {demanda.dados_sensiveis && demanda.dados_sensiveis_desc && (
                    <p className="text-xs text-neutral-500 mt-0.5">{demanda.dados_sensiveis_desc}</p>
                  )}
                </div>
              )}

              {demanda.impacta_outras_areas != null && (
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Impacta outras áreas</p>
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                    demanda.impacta_outras_areas ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {demanda.impacta_outras_areas ? 'Sim' : 'Não'}
                  </span>
                  {demanda.impacta_outras_areas && demanda.areas_impactadas && (
                    <p className="text-xs text-neutral-500 mt-0.5">{demanda.areas_impactadas}</p>
                  )}
                </div>
              )}

              {demanda.tipo_solucao !== 'AGENTE_IA' && demanda.usa_ia_desenvolvimento != null && (
                <div>
                  <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Usa IA no desenvolvimento</p>
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                    demanda.usa_ia_desenvolvimento ? 'bg-indigo-100 text-indigo-700' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {demanda.usa_ia_desenvolvimento ? 'Sim' : 'Não'}
                  </span>
                </div>
              )}
            </div>

            {(demanda.investimento_estimado || demanda.tempo_estimado_horas) && (
              <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3.5">
                <h2 className="text-sm font-semibold text-neutral-700">Estimativas</h2>
                {demanda.investimento_estimado && (
                  <InfoLinha label="Investimento (R$)"
                    value={parseFloat(demanda.investimento_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                )}
                {demanda.tempo_estimado_horas && (
                  <InfoLinha label="Horas de desenvolvimento" value={`${demanda.tempo_estimado_horas}h`} />
                )}
              </div>
            )}

            <TimelineProcesso demanda={demanda} historico={historico} />

            {demanda.tipo_deploy && (
              <div className="bg-white rounded-xl border border-neutral-200 px-5 py-3.5">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Tipo de deploy</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  demanda.tipo_deploy === 'SELF_DEPLOY' ? 'bg-tce-100 text-tce-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <Server size={10} />
                  {demanda.tipo_deploy === 'SELF_DEPLOY' ? 'Self-deploy (Solicitante)' : 'Ops / Infra'}
                </span>
                {demanda.nome_unidade_producao && (
                  <p className="text-xs text-neutral-500 mt-1.5">
                    Unidade: <span className="font-medium text-neutral-700">{demanda.nome_unidade_producao}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {acaoAtiva && (
        <ModalAcao
          acao={acaoAtiva}
          onConfirmar={handleAcao}
          onFechar={() => { setAcaoAtiva(null); setErroGeral(''); }}
          executando={executando}
        />
      )}

      {modalTransferencia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-tce-700" />
              Transferir Locação no Inventário
            </h2>

            <p className="text-sm text-neutral-500">
              Locação atual:{' '}
              <span className="font-medium text-neutral-700">{demanda?.nome_departamento} / {demanda?.nome_unidade}</span>
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Departamento de destino</label>
              <select
                value={transferDepartamento}
                onChange={e => { setTransferDepartamento(e.target.value); setTransferUnidade(''); }}
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-300"
              >
                <option value="">Todos os departamentos</option>
                {departamentos.map(d => (
                  <option key={d.id_departamento} value={d.id_departamento}>{d.nome_departamento}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Nova unidade responsável</label>
              <select
                value={transferUnidade}
                onChange={e => setTransferUnidade(e.target.value)}
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-300"
              >
                <option value="">Selecione...</option>
                {unidadesDisponiveis
                  .filter(u =>
                    String(u.id_unidade) !== String(demanda?.id_unidade) &&
                    (!transferDepartamento || String(u.id_departamento) === String(transferDepartamento))
                  )
                  .map(u => (
                    <option key={u.id_unidade} value={u.id_unidade}>{u.nome_unidade}</option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-600">Motivo</label>
              <textarea
                value={transferMotivo}
                onChange={e => setTransferMotivo(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo (mín. 10 caracteres)..."
                className="border border-neutral-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-tce-300"
              />
              <span className={`text-xs ${transferMotivo.trim().length < 10 ? 'text-neutral-400' : 'text-green-600'}`}>
                {transferMotivo.trim().length}/10 mínimo
              </span>
            </div>

            {transferErro && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {transferErro}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalTransferencia(false)}
                disabled={transferSalvando}
                className="px-4 py-2 text-sm rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTransferencia}
                disabled={transferSalvando}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-tce-700 text-white hover:bg-tce-800 disabled:opacity-50 flex items-center gap-2"
              >
                {transferSalvando && <Loader2 size={14} className="animate-spin" />}
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
