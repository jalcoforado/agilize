import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { demandaService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import {
  ArrowLeft, User, AlertTriangle, CheckCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Server, Info,
  RotateCcw, Clock, FileText, UserCheck, Shield,
  Code2, PackageCheck, Rocket, Activity, Ban, Pencil,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────

const FASES = [
  { num: 1, label: 'Solicitação' },
  { num: 2, label: 'Desenvolvimento' },
  { num: 3, label: 'Homologação' },
  { num: 4, label: 'Produção' },
];

function getFaseAtual(status) {
  if (['DRAFT','PENDENTE_GESTOR','DEVOLVIDA_AJUSTES','SOLICITANTE_AJUSTANDO',
       'VALIDADA_GESTOR','FILA_STI','AGUARDANDO_DIRETOR','APROVADA_STI',
       'REPROVADA_STI','REJEITADA','SOLICITADO_AJUSTES_STI'].includes(status)) return 1;
  if (['EM_DESENVOLVIMENTO','SUBMETIDO_HOMOLOGACAO'].includes(status)) return 2;
  if (['DEVOLVIDA_HOMOLOGACAO','AJUSTANDO_HOMOLOGACAO','AGUARDANDO_DIRETOR_HOMOLOGACAO',
       'VALIDADA_HOMOLOGACAO_GESTOR','FILA_HOMOLOGACAO_STI',
       'SOLICITADO_AJUSTES_HOMOLOGACAO','HOMOLOGADA'].includes(status)) return 3;
  if (['EM_PRODUCAO','EM_MONITORAMENTO','DESATIVADA'].includes(status)) return 4;
  return 0;
}

const CANCELAVEIS = [
  'DRAFT','PENDENTE_GESTOR','DEVOLVIDA_AJUSTES','SOLICITANTE_AJUSTANDO',
  'VALIDADA_GESTOR','FILA_STI','SOLICITADO_AJUSTES_STI',
  'APROVADA_STI','EM_DESENVOLVIMENTO','SUBMETIDO_HOMOLOGACAO',
];

function getAcoesDisponiveis(usuario, demanda) {
  if (!demanda) return [];
  const s = demanda.status_atual;
  const p = usuario.perfil_principal;
  const ehDono    = Number(usuario.id_usuario) === Number(demanda.id_solicitante);
  const ehGestor  = Number(usuario.id_usuario) === Number(demanda.id_gestor_unidade);
  const isAdmin   = p === 'GESTOR_SISTEMA';
  const map = new Map();
  const add = (a) => { if (!map.has(a.id)) map.set(a.id, a); };

  // ── Solicitante ───────────────────────────────────────────────────────
  if ((p === 'SOLICITANTE' && ehDono) || isAdmin) {
    if (s === 'DRAFT')
      add({ id: 'enviar-gestor', label: 'Enviar para Gestor', tipo: 'confirmar', variante: 'primary' });
    if (s === 'DEVOLVIDA_AJUSTES')
      add({ id: 'iniciar-ajuste', label: 'Iniciar Ajustes', tipo: 'confirmar', variante: 'warning' });
    if (s === 'SOLICITANTE_AJUSTANDO')
      add({ id: 'enviar-gestor', label: 'Reenviar para Gestor', tipo: 'confirmar', variante: 'primary' });
    if (s === 'APROVADA_STI')
      add({ id: 'iniciar-desenvolvimento', label: 'Iniciar Desenvolvimento', tipo: 'confirmar', variante: 'primary' });
    if (s === 'EM_DESENVOLVIMENTO')
      add({ id: 'submeter-produto', label: 'Submeter para Homologação', tipo: 'parecer', variante: 'primary' });
    if (['DEVOLVIDA_HOMOLOGACAO','SOLICITADO_AJUSTES_HOMOLOGACAO'].includes(s))
      add({ id: 'iniciar-ajuste-homologacao', label: 'Iniciar Ajustes (Hom.)', tipo: 'confirmar', variante: 'warning' });
    if (s === 'AJUSTANDO_HOMOLOGACAO')
      add({ id: 'submeter-produto', label: 'Resubmeter para Homologação', tipo: 'parecer', variante: 'primary' });
    // Self-deploy
    if (demanda.tipo_deploy === 'SELF_DEPLOY') {
      if (s === 'HOMOLOGADA')
        add({ id: 'iniciar-deploy', label: 'Iniciar Deploy', tipo: 'parecer', variante: 'primary' });
      if (s === 'EM_PRODUCAO')
        add({ id: 'confirmar-deploy', label: 'Confirmar Deploy', tipo: 'parecer', variante: 'success' });
    }
  }

  // ── Gestor ────────────────────────────────────────────────────────────
  if ((p === 'GESTOR_UNIDADE' && ehGestor) || isAdmin) {
    if (s === 'PENDENTE_GESTOR') {
      add({ id: 'validar-gestor',  label: 'Validar',              tipo: 'parecer',  variante: 'success' });
      add({ id: 'devolver',        label: 'Devolver p/ Ajustes',  tipo: 'parecer',  variante: 'warning' });
      add({ id: 'rejeitar-gestor', label: 'Rejeitar',             tipo: 'rejeicao', variante: 'danger'  });
    }
    if (s === 'VALIDADA_GESTOR')
      add({ id: 'enviar-sti', label: 'Encaminhar para STI', tipo: 'confirmar', variante: 'primary' });
    if (s === 'SOLICITADO_AJUSTES_STI')
      add({ id: 'reenviar-sti', label: 'Reenviar para STI', tipo: 'confirmar', variante: 'primary' });
    if (s === 'SUBMETIDO_HOMOLOGACAO') {
      add({ id: 'validar-homologacao-gestor', label: 'Validar Produto',      tipo: 'parecer',  variante: 'success' });
      add({ id: 'devolver-homologacao',       label: 'Devolver p/ Ajustes',  tipo: 'parecer',  variante: 'warning' });
    }
    if (s === 'VALIDADA_HOMOLOGACAO_GESTOR')
      add({ id: 'enviar-homologacao-sti', label: 'Enviar para STI (Hom.)', tipo: 'confirmar', variante: 'primary' });
    if (s === 'SOLICITADO_AJUSTES_HOMOLOGACAO')
      add({ id: 'reenviar-homologacao-sti', label: 'Reenviar para STI (Hom.)', tipo: 'confirmar', variante: 'primary' });
  }

  // ── Analista STI ──────────────────────────────────────────────────────
  if (p === 'ANALISTA_STI' || isAdmin) {
    if (s === 'FILA_STI') {
      add({ id: 'aprovar-sti',           label: 'Aprovar Viabilidade', tipo: 'parecer',  variante: 'success' });
      add({ id: 'solicitar-ajustes-sti', label: 'Solicitar Ajustes',  tipo: 'parecer',  variante: 'warning' });
      add({ id: 'reprovar-sti',          label: 'Reprovar',            tipo: 'rejeicao', variante: 'danger'  });
    }
    if (s === 'FILA_HOMOLOGACAO_STI') {
      add({ id: 'homologar',                    label: 'Homologar',           tipo: 'homologar', variante: 'success' });
      add({ id: 'solicitar-ajustes-homologacao',label: 'Solicitar Ajustes',   tipo: 'parecer',   variante: 'warning' });
      add({ id: 'rejeitar-homologacao',         label: 'Rejeitar Produto',    tipo: 'rejeicao',  variante: 'danger'  });
    }
  }

  // ── Ops / STI — deploy ────────────────────────────────────────────────
  const podeDeployOps = p === 'RESPONSAVEL_PRODUCAO' || p === 'ANALISTA_STI' || isAdmin;
  if (podeDeployOps) {
    if (s === 'HOMOLOGADA')
      add({ id: 'iniciar-deploy',   label: 'Iniciar Deploy',   tipo: 'parecer', variante: 'primary' });
    if (s === 'EM_PRODUCAO')
      add({ id: 'confirmar-deploy', label: 'Confirmar Deploy', tipo: 'parecer', variante: 'success' });
    if (s === 'EM_MONITORAMENTO')
      add({ id: 'desativar', label: 'Desativar Solução', tipo: 'motivo', variante: 'danger' });
  }

  // ── Cancelamento ─────────────────────────────────────────────────────
  const podeCancelar = ['SOLICITANTE','GESTOR_UNIDADE','ANALISTA_STI','GESTOR_SISTEMA'];
  if (podeCancelar.includes(p) && CANCELAVEIS.includes(s))
    add({ id: 'cancelar', label: 'Cancelar Demanda', tipo: 'motivo', variante: 'danger' });

  return [...map.values()];
}

async function executarAcao(idDemanda, acaoId, { parecer, comentario, motivo, tipo_deploy }) {
  switch (acaoId) {
    case 'enviar-gestor':               return demandaService.enviarParaGestor(idDemanda);
    case 'iniciar-ajuste':              return demandaService.iniciarAjuste(idDemanda);
    case 'validar-gestor':              return demandaService.validarGestor(idDemanda, parecer, comentario);
    case 'devolver':                    return demandaService.devolver(idDemanda, parecer, comentario);
    case 'rejeitar':                    return demandaService.rejeitar(idDemanda, motivo, parecer);
    case 'rejeitar-gestor':             return demandaService.rejeitarGestor(idDemanda, motivo, parecer);
    case 'enviar-sti':                  return demandaService.enviarParaSTI(idDemanda);
    case 'aprovar-sti':                 return demandaService.aprovarSTI(idDemanda, parecer, comentario);
    case 'reprovar-sti':                return demandaService.reprovarSTI(idDemanda, motivo, parecer);
    case 'solicitar-ajustes-sti':       return demandaService.solicitarAjustesSTI(idDemanda, parecer, comentario);
    case 'reenviar-sti':                return demandaService.reenviarParaSTI(idDemanda);
    case 'iniciar-desenvolvimento':     return demandaService.iniciarDesenvolvimento(idDemanda);
    case 'submeter-produto':            return demandaService.submeterProduto(idDemanda, parecer, comentario);
    case 'validar-homologacao-gestor':  return demandaService.validarHomologacaoGestor(idDemanda, parecer, comentario);
    case 'devolver-homologacao':        return demandaService.devolverHomologacao(idDemanda, parecer, comentario);
    case 'iniciar-ajuste-homologacao':  return demandaService.iniciarAjusteHomologacao(idDemanda);
    case 'enviar-homologacao-sti':      return demandaService.enviarHomologacaoSTI(idDemanda);
    case 'solicitar-ajustes-homologacao': return demandaService.solicitarAjustesHomologacao(idDemanda, parecer, comentario);
    case 'homologar':                   return demandaService.homologar(idDemanda, parecer, comentario, tipo_deploy);
    case 'rejeitar-homologacao':        return demandaService.rejeitarHomologacao(idDemanda, motivo, parecer);
    case 'reenviar-homologacao-sti':    return demandaService.reenviarHomologacaoSTI(idDemanda);
    case 'iniciar-deploy':              return demandaService.iniciarDeploy(idDemanda, parecer);
    case 'confirmar-deploy':            return demandaService.confirmarDeploy(idDemanda, parecer);
    case 'desativar':                   return demandaService.desativar(idDemanda, motivo);
    case 'cancelar':                    return demandaService.cancelar(idDemanda, motivo);
    default: throw new Error(`Ação desconhecida: ${acaoId}`);
  }
}

// ─── Timeline do processo ──────────────────────────────────────────────────

const STATUS_IDX = {
  DRAFT: 0,
  PENDENTE_GESTOR: 1, DEVOLVIDA_AJUSTES: 1.5, SOLICITANTE_AJUSTANDO: 1.8,
  VALIDADA_GESTOR: 2, FILA_STI: 3, AGUARDANDO_DIRETOR: 3.3, SOLICITADO_AJUSTES_STI: 3.5,
  APROVADA_STI: 4,
  EM_DESENVOLVIMENTO: 5,
  SUBMETIDO_HOMOLOGACAO: 6, DEVOLVIDA_HOMOLOGACAO: 6.5, AJUSTANDO_HOMOLOGACAO: 6.8,
  VALIDADA_HOMOLOGACAO_GESTOR: 7, FILA_HOMOLOGACAO_STI: 8, AGUARDANDO_DIRETOR_HOMOLOGACAO: 8.2, SOLICITADO_AJUSTES_HOMOLOGACAO: 8.5,
  HOMOLOGADA: 9,
  EM_PRODUCAO: 10,
  EM_MONITORAMENTO: 11,
  DESATIVADA: 12,
  REJEITADA: -1, REPROVADA_STI: -2, CANCELADA: -3,
};

const PASSOS_TIMELINE = [
  {
    id: 'criacao',  label: 'Criação',                atorLabel: 'Solicitante',       icon: FileText,
    activeIdx: 0,   doneIdx: 1,
    eventoHistorico: null,
  },
  {
    id: 'gestor1',  label: 'Análise do Gestor',       atorLabel: 'Gestor da Unidade', icon: UserCheck,
    activeIdx: 1,   doneIdx: 2,
    eventoHistorico: 'VALIDADA_GESTOR',
    eventoRetorno: ['DEVOLVIDA_AJUSTES'],
    terminalStatus: 'REJEITADA',
  },
  {
    id: 'sti1',     label: 'Viabilidade STI',         atorLabel: 'Analista STI',      icon: Shield,
    activeIdx: 3,   doneIdx: 4,
    eventoHistorico: 'APROVADA_STI',
    eventoRetorno: ['SOLICITADO_AJUSTES_STI'],
    terminalStatus: 'REPROVADA_STI',
  },
  {
    id: 'dev',      label: 'Desenvolvimento',         atorLabel: 'Solicitante',       icon: Code2,
    activeIdx: 5,   doneIdx: 6,
    eventoHistorico: 'SUBMETIDO_HOMOLOGACAO',
  },
  {
    id: 'gestor2',  label: 'Validação (Hom.)',         atorLabel: 'Gestor da Unidade', icon: PackageCheck,
    activeIdx: 6,   doneIdx: 7,
    eventoHistorico: 'VALIDADA_HOMOLOGACAO_GESTOR',
    eventoRetorno: ['DEVOLVIDA_HOMOLOGACAO'],
  },
  {
    id: 'sti2',     label: 'Homologação STI',          atorLabel: 'Analista STI',      icon: Shield,
    activeIdx: 8,   doneIdx: 9,
    eventoHistorico: 'HOMOLOGADA',
    eventoRetorno: ['SOLICITADO_AJUSTES_HOMOLOGACAO'],
  },
  {
    id: 'producao', label: 'Em Produção',              atorLabel: 'Ops / Solicitante', icon: Rocket,
    activeIdx: 10,  doneIdx: 11,
    eventoHistorico: 'EM_MONITORAMENTO',
  },
];

function computarPassos(demanda, historico) {
  const status = demanda.status_atual;
  const idx = STATUS_IDX[status] ?? -99;
  const isCancelada = status === 'CANCELADA';
  const isTerminal = idx < 0;

  return PASSOS_TIMELINE.map(passo => {
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
    const retornos = passo.eventoRetorno
      ? historico.filter(h => passo.eventoRetorno.includes(h.status_novo)).length
      : 0;

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
  FILA_STI: 'Na fila da STI',
  AGUARDANDO_DIRETOR: 'Aguardando parecer do Diretor STI',
  SOLICITADO_AJUSTES_STI: 'STI solicitou ajustes',
  APROVADA_STI: 'Aprovada, iniciando dev.',
  EM_DESENVOLVIMENTO: 'Em desenvolvimento',
  SUBMETIDO_HOMOLOGACAO: 'Submetido, aguardando gestor',
  DEVOLVIDA_HOMOLOGACAO: 'Devolvida p/ ajustes',
  AJUSTANDO_HOMOLOGACAO: 'Ajustes em andamento',
  VALIDADA_HOMOLOGACAO_GESTOR: 'Validado, aguardando STI',
  FILA_HOMOLOGACAO_STI: 'Na fila STI (hom.)',
  AGUARDANDO_DIRETOR_HOMOLOGACAO: 'Aguardando parecer do Diretor STI (hom.)',
  SOLICITADO_AJUSTES_HOMOLOGACAO: 'STI solicitou ajustes',
  HOMOLOGADA: 'Aguardando deploy',
  EM_PRODUCAO: 'Deploy em andamento',
};

function PassoTimeline({ passo, isLast }) {
  const Icone = passo.icon;

  const nodeStyle = {
    done:      'bg-emerald-500 border-emerald-500 text-white',
    active:    'bg-tce-700 border-tce-700 text-white',
    error:     'bg-red-500 border-red-500 text-white',
    cancelled: 'bg-neutral-300 border-neutral-300 text-white',
    pending:   'bg-white border-neutral-200 text-neutral-300',
  }[passo.estado] || 'bg-white border-neutral-200 text-neutral-300';

  const lineStyle = passo.estado === 'done' ? 'bg-emerald-200' : 'bg-neutral-100';

  const evento = passo.eventoCriacao || passo.eventoConcluso;

  return (
    <div className="flex gap-3">
      {/* Linha + nó */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${nodeStyle} ${passo.estado === 'active' ? 'ring-2 ring-tce-300 ring-offset-1' : ''}`}>
          {passo.estado === 'done'      && <CheckCircle size={13} />}
          {passo.estado === 'active'    && <Loader2 size={12} className="animate-spin" />}
          {passo.estado === 'error'     && <XCircle size={13} />}
          {passo.estado === 'cancelled' && <Ban size={12} />}
          {passo.estado === 'pending'   && <Icone size={12} />}
        </div>
        {!isLast && <div className={`w-px flex-1 mt-1 ${lineStyle}`} style={{ minHeight: 20 }} />}
      </div>

      {/* Conteúdo */}
      <div className={`pb-4 flex-1 min-w-0 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold ${
            passo.estado === 'done'    ? 'text-neutral-700'
            : passo.estado === 'active' ? 'text-tce-700'
            : passo.estado === 'error'  ? 'text-red-600'
            : 'text-neutral-400'
          }`}>
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

function FaseIndicador({ status }) {
  const fase = getFaseAtual(status);
  const cancelado = status === 'CANCELADA';
  const terminal = ['REPROVADA_STI','REJEITADA','DESATIVADA'].includes(status);

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
      {FASES.map((f, i) => (
        <div key={f.num} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            f.num === fase  ? 'bg-tce-700 text-white'
            : f.num < fase  ? 'bg-tce-100 text-tce-600'
                            : 'bg-neutral-100 text-neutral-400'
          }`}>
            {f.num < fase && <CheckCircle size={10} />}
            {f.label}
          </div>
          {i < FASES.length - 1 && (
            <div className={`w-4 h-px ${f.num < fase ? 'bg-tce-300' : 'bg-neutral-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function BotaoAcao({ acao, onClick }) {
  const cls = {
    primary: 'bg-tce-700 hover:bg-tce-800 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    danger:  'border border-red-300 text-red-600 hover:bg-red-50',
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

function HistoricoItem({ item }) {
  const dt = new Date(item.data_hora);
  const dtFmt = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-7 rounded-full bg-tce-100 text-tce-600 flex items-center justify-center">
          <User size={13} />
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
        {item.parecer && (
          <div
            className="mt-2 text-sm text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100 leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: item.parecer }}
          />
        )}
        {item.comentario && <p className="mt-1 text-xs text-neutral-400 italic">{item.comentario}</p>}
        {item.motivo_rejeicao && (
          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={11}/> {item.motivo_rejeicao}
          </p>
        )}
      </div>
    </div>
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
        {aberto ? <ChevronUp size={16} className="text-neutral-400"/> : <ChevronDown size={16} className="text-neutral-400"/>}
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
        {aberto ? <ChevronUp size={16} className="text-neutral-400"/> : <ChevronDown size={16} className="text-neutral-400"/>}
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

function ModalAcao({ acao, onConfirmar, onFechar, executando }) {
  const [parecer, setParecer]         = useState('');
  const [parecerText, setParecerText] = useState('');
  const [comentario, setComentario]   = useState('');
  const [motivo, setMotivo]           = useState('');
  const [tipoDeploy, setTipoDeploy]   = useState('');
  const [erro, setErro]               = useState('');

  const ic = `w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition`;

  const handleConfirmar = () => {
    if (acao.tipo === 'parecer' && parecerText.trim().length < 20) {
      setErro('O parecer precisa ter pelo menos 20 caracteres'); return;
    }
    if (acao.tipo === 'rejeicao') {
      if (!motivo.trim()) { setErro('Informe o motivo'); return; }
      if (parecerText.trim().length < 20) { setErro('O parecer precisa ter pelo menos 20 caracteres'); return; }
    }
    if (acao.tipo === 'homologar') {
      if (parecerText.trim().length < 20) { setErro('O parecer precisa ter pelo menos 20 caracteres'); return; }
      if (!tipoDeploy) { setErro('Defina o tipo de deploy'); return; }
    }
    if (acao.tipo === 'motivo' && !motivo.trim()) {
      setErro('Informe o motivo'); return;
    }
    onConfirmar({ parecer, comentario, motivo, tipo_deploy: tipoDeploy });
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
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Parecer <span className="text-red-500">*</span>
              <span className="font-normal text-neutral-400 ml-1">(mín. 20 caracteres)</span>
            </label>
            <RichTextEditor
              value={parecer}
              onChange={setParecer}
              onTextChange={setParecerText}
              minRows={4}
              placeholder="Descreva sua análise ou decisão..."
            />
          </div>
        )}

        {acao.tipo === 'homologar' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Tipo de deploy <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'SELF_DEPLOY', label: 'Self-deploy', desc: 'O solicitante faz o deploy', icon: '👤' },
                { value: 'OPS_DEPLOY',  label: 'Ops / Infra',  desc: 'Equipe de Operações faz', icon: '🏗️'  },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setTipoDeploy(opt.value)}
                  className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                    tipoDeploy === opt.value
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

        {(acao.tipo === 'parecer' || acao.tipo === 'homologar') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Comentário adicional <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <textarea className={ic + ' resize-none'} rows={2} value={comentario}
              onChange={e => setComentario(e.target.value)} placeholder="Observações internas..." />
          </div>
        )}

        {erro && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={13}/>{erro}
          </p>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onFechar} disabled={executando}
            className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={executando}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition disabled:opacity-50">
            {executando && <Loader2 size={13} className="animate-spin"/>}
            {executando ? 'Aguarde...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────

const fmtDt = (d) => d
  ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : null;

const PRIORIDADE_CLS = {
  CRITICA: 'bg-red-100 text-red-700',
  ALTA:    'bg-orange-100 text-orange-700',
  MEDIA:   'bg-yellow-100 text-yellow-700',
  BAIXA:   'bg-green-100 text-green-700',
};

const TIPO_SOLUCAO_LABEL = {
  PAINEL_BI: 'Painel BI', SCRIPT: 'Script / Automação',
  AGENTE_IA: 'Agente IA', SISTEMA_SIMPLES: 'Sistema / Aplicação', OUTRO: 'Outro',
};

export default function DemandaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [demanda,   setDemanda]   = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral,  setErroGeral]  = useState('');
  const [sucesso,    setSucesso]    = useState('');
  const [acaoAtiva,  setAcaoAtiva]  = useState(null);
  const [executando, setExecutando] = useState(false);

  const carregar = useCallback(async () => {
    setErroGeral('');
    try {
      const [{ data: d }, { data: h }] = await Promise.all([
        demandaService.obter(id),
        demandaService.obterHistorico(id),
      ]);
      setDemanda(d.demanda);
      setHistorico(h.historico || []);
    } catch (err) {
      setErroGeral(err.response?.data?.message || 'Erro ao carregar a demanda');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

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
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <Info size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">Demanda não encontrada.</p>
          <button onClick={() => navigate('/dashboard')}
            className="mt-4 text-sm text-tce-600 hover:underline">Voltar ao dashboard</button>
        </div>
      </Layout>
    );
  }

  const acoes = getAcoesDisponiveis(usuario, demanda);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition mt-1">
            <ArrowLeft size={20}/>
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
              <FaseIndicador status={demanda.status_atual} />
            </div>
          </div>
          {['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual) &&
           (Number(usuario.id_usuario) === Number(demanda.id_solicitante) || usuario.perfil_principal === 'GESTOR_SISTEMA') && (
            <button onClick={() => navigate(`/demanda/${id}/editar`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-tce-700 border border-tce-300 rounded-lg hover:bg-tce-50 transition mt-1 shrink-0">
              <Pencil size={14}/>
              Editar
            </button>
          )}
        </div>

        {/* Alertas */}
        {erroGeral && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0"/>
            {erroGeral}
          </div>
        )}
        {sucesso && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <CheckCircle size={15} className="shrink-0"/>
            {sucesso}
          </div>
        )}

        {/* Ações */}
        {acoes.length > 0 && (
          <div className="mb-6 bg-white rounded-xl border border-neutral-200 px-5 py-4">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Ações disponíveis para você
            </p>
            <div className="flex flex-wrap gap-2">
              {acoes.map(a => <BotaoAcao key={a.id} acao={a} onClick={setAcaoAtiva}/>)}
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
              {historico.length === 0
                ? <p className="text-sm text-neutral-400 text-center py-4">Nenhum registro ainda</p>
                : historico.map(item => <HistoricoItem key={item.id_historico} item={item}/>)
              }
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3.5">
              <h2 className="text-sm font-semibold text-neutral-700">Informações</h2>
              <InfoLinha label="Tipo de solução"   value={TIPO_SOLUCAO_LABEL[demanda.tipo_solucao] || demanda.tipo_solucao} />
              <InfoLinha label="Solicitante"        value={demanda.nome_solicitante} />
              <InfoLinha label="Unidade"            value={demanda.nome_unidade} />
              <InfoLinha label="Departamento"       value={demanda.nome_departamento} />
              {demanda.publico_alvo && <InfoLinha label="Público-alvo" value={demanda.publico_alvo}/>}
              {demanda.frequencia_uso && <InfoLinha label="Frequência de uso" value={demanda.frequencia_uso}/>}
              {demanda.quantidade_usuarios_estimada && (
                <InfoLinha label="Usuários estimados" value={String(demanda.quantidade_usuarios_estimada)}/>
              )}
            </div>

            <TimelineProcesso demanda={demanda} historico={historico} />

            {demanda.tipo_deploy && (
              <div className="bg-white rounded-xl border border-neutral-200 px-5 py-3.5">
                <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">Tipo de deploy</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  demanda.tipo_deploy === 'SELF_DEPLOY'
                    ? 'bg-tce-100 text-tce-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <Server size={10}/>
                  {demanda.tipo_deploy === 'SELF_DEPLOY' ? 'Self-deploy (Solicitante)' : 'Ops / Infra'}
                </span>
              </div>
            )}

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
    </Layout>
  );
}
