import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck, Clock, RefreshCw, ChevronRight,
  AlertTriangle, CheckCircle2, Inbox, Server,
  Hourglass, ShieldCheck, Wrench, UploadCloud,
  FileText, AlertCircle, Rocket, Code2, ChevronDown
} from 'lucide-react';
import { demandaService } from '../services/api';
import Layout from '../components/Layout';

// ─── Configuração dos grupos por perfil ──────────────────────────────────────

const GRUPOS_SOLICITANTE = [
  {
    id: 'rascunhos',
    statuses: ['DRAFT'],
    titulo: 'Rascunhos — finalizar e enviar',
    descricao: 'Demandas iniciadas que ainda não foram enviadas para o gestor.',
    icone: FileText,
    cor: { fundo: 'bg-neutral-50', borda: 'border-neutral-300', texto: 'text-neutral-700', badge: 'bg-neutral-200 text-neutral-600', iconeBg: 'bg-neutral-100', iconeTexto: 'text-neutral-500' },
  },
  {
    id: 'ajustes_pendentes',
    statuses: ['DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO', 'SOLICITADO_AJUSTES_STI'],
    titulo: 'Ajustes solicitados',
    descricao: 'Demandas devolvidas pelo gestor ou STI que precisam de correção.',
    icone: AlertCircle,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
  {
    id: 'aprovadas_iniciar',
    statuses: ['APROVADA_STI'],
    titulo: 'Aprovadas — iniciar desenvolvimento',
    descricao: 'Demandas aprovadas pela STI. Você pode iniciar o desenvolvimento.',
    icone: Rocket,
    cor: { fundo: 'bg-green-50', borda: 'border-green-300', texto: 'text-green-800', badge: 'bg-green-100 text-green-700', iconeBg: 'bg-green-100', iconeTexto: 'text-green-600' },
  },
  {
    id: 'em_desenvolvimento',
    statuses: ['EM_DESENVOLVIMENTO'],
    titulo: 'Em desenvolvimento',
    descricao: 'Soluções em desenvolvimento. Submeta o produto quando estiver pronto.',
    icone: Code2,
    cor: { fundo: 'bg-orange-50', borda: 'border-orange-300', texto: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', iconeBg: 'bg-orange-100', iconeTexto: 'text-orange-600' },
  },
  {
    id: 'ajustes_homologacao',
    statuses: ['DEVOLVIDA_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO'],
    titulo: 'Ajustes de homologação',
    descricao: 'Produto devolvido durante homologação aguardando correção.',
    icone: Wrench,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
];

const GRUPOS_GESTOR = [
  {
    id: 'pendente_gestor',
    statuses: ['PENDENTE_GESTOR'],
    titulo: 'Aguardando sua validação — Fase 1',
    descricao: 'Demandas enviadas pelo solicitante para análise inicial.',
    icone: ClipboardCheck,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
  {
    id: 'validada_gestor',
    statuses: ['VALIDADA_GESTOR'],
    titulo: 'Validadas — aguardando envio à STI',
    descricao: 'Demandas que você validou. Envie para a fila da STI.',
    icone: CheckCircle2,
    cor: { fundo: 'bg-tce-50', borda: 'border-tce-300', texto: 'text-tce-800', badge: 'bg-tce-100 text-tce-700', iconeBg: 'bg-tce-100', iconeTexto: 'text-tce-600' },
  },
  {
    id: 'submetido_homologacao',
    statuses: ['SUBMETIDO_HOMOLOGACAO'],
    titulo: 'Produto submetido — aguardando sua validação',
    descricao: 'Produto desenvolvido submetido para sua análise antes de ir à STI.',
    icone: ShieldCheck,
    cor: { fundo: 'bg-indigo-50', borda: 'border-indigo-300', texto: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700', iconeBg: 'bg-indigo-100', iconeTexto: 'text-indigo-600' },
  },
  {
    id: 'validada_homologacao_gestor',
    statuses: ['VALIDADA_HOMOLOGACAO_GESTOR'],
    titulo: 'Homologação validada — aguardando envio à STI',
    descricao: 'Produto validado. Envie para a fila de homologação da STI.',
    icone: CheckCircle2,
    cor: { fundo: 'bg-tce-50', borda: 'border-tce-300', texto: 'text-tce-800', badge: 'bg-tce-100 text-tce-700', iconeBg: 'bg-tce-100', iconeTexto: 'text-tce-600' },
  },
];

const GRUPOS_STI = [
  {
    id: 'fila_sti',
    statuses: ['FILA_STI'],
    titulo: 'Fila de análise STI — Fase 1',
    descricao: 'Solicitações aguardando análise de viabilidade técnica.',
    icone: Inbox,
    cor: { fundo: 'bg-indigo-50', borda: 'border-indigo-300', texto: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700', iconeBg: 'bg-indigo-100', iconeTexto: 'text-indigo-600' },
  },
  {
    id: 'fila_homologacao_sti',
    statuses: ['FILA_HOMOLOGACAO_STI'],
    titulo: 'Fila de homologação STI — Fase 3',
    descricao: 'Produtos desenvolvidos aguardando validação técnica para produção.',
    icone: ShieldCheck,
    cor: { fundo: 'bg-purple-50', borda: 'border-purple-300', texto: 'text-purple-800', badge: 'bg-purple-100 text-purple-700', iconeBg: 'bg-purple-100', iconeTexto: 'text-purple-600' },
  },
];

const GRUPOS_AVALIADOR = [
  {
    id: 'aguardando_avaliador',
    statuses: ['AGUARDANDO_AVALIADOR'],
    titulo: 'Revisão solicitada — Análise de Viabilidade',
    descricao: 'Demandas encaminhadas pelo analista para revisão do Avaliador Técnico (Fase 1).',
    icone: ShieldCheck,
    cor: { fundo: 'bg-violet-50', borda: 'border-violet-300', texto: 'text-violet-800', badge: 'bg-violet-100 text-violet-700', iconeBg: 'bg-violet-100', iconeTexto: 'text-violet-600' },
  },
  {
    id: 'aguardando_avaliador_homologacao',
    statuses: ['AGUARDANDO_AVALIADOR_HOMOLOGACAO'],
    titulo: 'Revisão solicitada — Homologação',
    descricao: 'Demandas encaminhadas pelo analista para revisão do Avaliador Técnico (Fase 3).',
    icone: ShieldCheck,
    cor: { fundo: 'bg-fuchsia-50', borda: 'border-fuchsia-300', texto: 'text-fuchsia-800', badge: 'bg-fuchsia-100 text-fuchsia-700', iconeBg: 'bg-fuchsia-100', iconeTexto: 'text-fuchsia-600' },
  },
];

const GRUPOS_DPO = [
  {
    id: 'aguardando_dpo',
    statuses: ['AGUARDANDO_DPO'],
    titulo: 'Análise DPO — Dados Sensíveis (Fase 1)',
    descricao: 'Demandas encaminhadas ao DPO para verificação de conformidade com dados sensíveis.',
    icone: ShieldCheck,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
  {
    id: 'aguardando_dpo_homologacao',
    statuses: ['AGUARDANDO_DPO_HOMOLOGACAO'],
    titulo: 'Homologação DPO — Dados Sensíveis (Fase 3)',
    descricao: 'Produtos encaminhados ao DPO para verificação antes da homologação STI.',
    icone: ShieldCheck,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
];

const GRUPOS_OPS = [
  {
    id: 'homologada',
    statuses: ['HOMOLOGADA'],
    titulo: 'Aguardando deploy',
    descricao: 'Soluções homologadas com deploy designado à equipe de Operações.',
    icone: UploadCloud,
    cor: { fundo: 'bg-green-50', borda: 'border-green-300', texto: 'text-green-800', badge: 'bg-green-100 text-green-700', iconeBg: 'bg-green-100', iconeTexto: 'text-green-600' },
    filtroTipoDeploy: 'OPS_DEPLOY',
  },
  {
    id: 'em_producao_ops',
    statuses: ['EM_PRODUCAO'],
    titulo: 'Deploy em andamento — confirmar',
    descricao: 'Deploy iniciado aguardando confirmação de conclusão.',
    icone: Server,
    cor: { fundo: 'bg-tce-50', borda: 'border-tce-300', texto: 'text-tce-800', badge: 'bg-tce-100 text-tce-700', iconeBg: 'bg-tce-100', iconeTexto: 'text-tce-600' },
    filtroTipoDeploy: 'OPS_DEPLOY',
  },
];

const GRUPOS_DEPARTAMENTO = [
  {
    id: 'dept_fase1',
    statuses: ['PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO', 'VALIDADA_GESTOR', 'FILA_STI', 'SOLICITADO_AJUSTES_STI', 'AGUARDANDO_AVALIADOR', 'AGUARDANDO_DPO'],
    titulo: 'Fase 1 — Solicitação em andamento',
    descricao: 'Demandas do departamento em tramitação na fase de solicitação.',
    icone: ClipboardCheck,
    cor: { fundo: 'bg-amber-50', borda: 'border-amber-300', texto: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', iconeBg: 'bg-amber-100', iconeTexto: 'text-amber-600' },
  },
  {
    id: 'dept_fase2',
    statuses: ['APROVADA_STI', 'EM_DESENVOLVIMENTO'],
    titulo: 'Fase 2 — Em desenvolvimento',
    descricao: 'Demandas aprovadas sendo desenvolvidas pelas unidades do departamento.',
    icone: Code2,
    cor: { fundo: 'bg-orange-50', borda: 'border-orange-300', texto: 'text-orange-800', badge: 'bg-orange-100 text-orange-700', iconeBg: 'bg-orange-100', iconeTexto: 'text-orange-600' },
  },
  {
    id: 'dept_fase3',
    statuses: ['SUBMETIDO_HOMOLOGACAO', 'DEVOLVIDA_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO', 'VALIDADA_HOMOLOGACAO_GESTOR', 'FILA_HOMOLOGACAO_STI', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', 'AGUARDANDO_DPO_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO'],
    titulo: 'Fase 3 — Homologação',
    descricao: 'Produtos desenvolvidos em processo de homologação pela STI.',
    icone: ShieldCheck,
    cor: { fundo: 'bg-indigo-50', borda: 'border-indigo-300', texto: 'text-indigo-800', badge: 'bg-indigo-100 text-indigo-700', iconeBg: 'bg-indigo-100', iconeTexto: 'text-indigo-600' },
  },
  {
    id: 'dept_fase4',
    statuses: ['HOMOLOGADA', 'EM_PRODUCAO', 'EM_MONITORAMENTO'],
    titulo: 'Fase 4 — Em produção',
    descricao: 'Soluções homologadas implantadas ou em processo de implantação.',
    icone: Rocket,
    cor: { fundo: 'bg-green-50', borda: 'border-green-300', texto: 'text-green-800', badge: 'bg-green-100 text-green-700', iconeBg: 'bg-green-100', iconeTexto: 'text-green-600' },
  },
];

function gruposPorPerfil(perfil) {
  if (perfil === 'SOLICITANTE')          return GRUPOS_SOLICITANTE;
  if (perfil === 'GESTOR_UNIDADE')       return GRUPOS_GESTOR;
  if (perfil === 'GESTOR_DEPARTAMENTO')  return GRUPOS_DEPARTAMENTO;
  if (perfil === 'ANALISTA_STI')         return GRUPOS_STI;
  if (perfil === 'AVALIADOR_TECNICO')    return GRUPOS_AVALIADOR;
  if (perfil === 'DPO')                  return GRUPOS_DPO;
  if (perfil === 'RESPONSAVEL_PRODUCAO') return GRUPOS_OPS;
  if (perfil === 'GESTOR_SISTEMA')       return [...GRUPOS_GESTOR, ...GRUPOS_STI, ...GRUPOS_AVALIADOR, ...GRUPOS_DPO, ...GRUPOS_OPS];
  return [];
}

const TITULO_POR_PERFIL = {
  SOLICITANTE:         'Minhas Ações Pendentes',
  GESTOR_UNIDADE:      'Fila de Ação',
  GESTOR_DEPARTAMENTO: 'Visão do Departamento',
  ANALISTA_STI:        'Fila de Análise STI',
  AVALIADOR_TECNICO:   'Fila de Revisão — Avaliador Técnico',
  DPO:                 'Fila de Ação — Análise LGPD',
  RESPONSAVEL_PRODUCAO:'Fila de Deploy',
  GESTOR_SISTEMA:      'Fila de Ação — Visão Global',
};

const PERFIL_LABEL = {
  SOLICITANTE:         'Solicitante',
  GESTOR_UNIDADE:      'Gestor de Unidade',
  GESTOR_DEPARTAMENTO: 'Gestor de Departamento',
  ANALISTA_STI:        'Analista STI',
  AVALIADOR_TECNICO:   'Avaliador Técnico',
  DPO:                 'DPO',
  RESPONSAVEL_PRODUCAO:'Operações STI',
  GESTOR_SISTEMA:      'Gestor do Sistema',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORIDADE_COR = {
  CRITICA: 'bg-red-100 text-red-700 border border-red-200',
  ALTA:    'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIA:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
  BAIXA:   'bg-green-100 text-green-700 border border-green-200',
};

const PRIORIDADE_LABEL = { CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };

function tempoDecorrido(dataStr) {
  if (!dataStr) return '—';
  const diff = Date.now() - new Date(dataStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function urgenciaCor(dataStr, prioridade) {
  if (!dataStr) return '';
  const dias = (Date.now() - new Date(dataStr).getTime()) / 86400000;
  if (prioridade === 'CRITICA' && dias > 1) return 'bg-red-50';
  if (prioridade === 'ALTA' && dias > 3)    return 'bg-orange-50';
  if (dias > 7)                              return 'bg-yellow-50';
  return '';
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <p className="text-lg font-semibold text-neutral-700">Tudo em dia!</p>
      <p className="text-sm text-neutral-500 mt-1">Nenhuma demanda aguardando sua ação no momento.</p>
    </div>
  );
}

const GRUPOS_AVALIACAO_STI = ['fila_sti', 'fila_homologacao_sti'];
const GRUPOS_AVALIACAO_AVALIADOR = ['aguardando_avaliador', 'aguardando_avaliador_homologacao'];
const GRUPOS_AVALIACAO_DPO = ['aguardando_dpo', 'aguardando_dpo_homologacao'];

function LinhaDemanda({ demanda, navigate, grupoId }) {
  const urgencia = urgenciaCor(demanda.data_ultima_atualizacao, demanda.prioridade);
  const destino = GRUPOS_AVALIACAO_STI.includes(grupoId)
    ? `/avaliacao/${demanda.id_demanda}`
    : GRUPOS_AVALIACAO_AVALIADOR.includes(grupoId)
    ? `/avaliacao-avaliador/${demanda.id_demanda}`
    : GRUPOS_AVALIACAO_DPO.includes(grupoId)
    ? `/avaliacao-dpo/${demanda.id_demanda}`
    : `/demanda/${demanda.id_demanda}`;
  return (
    <button
      onClick={() => navigate(destino)}
      className={`w-full text-left flex items-center gap-4 px-4 py-3 border-t border-neutral-100 hover:bg-neutral-50 active:bg-neutral-100 transition group ${urgencia}`}
    >
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORIDADE_COR[demanda.prioridade] || 'bg-neutral-100 text-neutral-600'}`}>
        {PRIORIDADE_LABEL[demanda.prioridade] || demanda.prioridade}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-neutral-400 font-mono leading-none mb-0.5">{demanda.numero_demanda}</p>
        <p className="text-sm font-medium text-neutral-800 truncate leading-snug">{demanda.titulo}</p>
      </div>

      <div className="hidden sm:block shrink-0 w-36 text-right">
        <p className="text-xs text-neutral-500 truncate">{demanda.nome_unidade || '—'}</p>
        <p className="text-[10px] text-neutral-400 truncate">{demanda.nome_solicitante || '—'}</p>
      </div>

      <div className="shrink-0 flex items-center gap-1 text-xs text-neutral-400 w-14 justify-end">
        <Clock size={11} />
        {tempoDecorrido(demanda.data_ultima_atualizacao)}
      </div>

      <ChevronRight size={15} className="shrink-0 text-neutral-300 group-hover:text-tce-500 transition" />
    </button>
  );
}

const POR_PAGINA = 10;

function GrupoFila({ grupo, demandas, carregando, navigate, grupoId }) {
  const { icone: Icone, cor, titulo, descricao } = grupo;
  const [visiveis, setVisiveis] = useState(POR_PAGINA);

  const lista = grupo.filtroTipoDeploy
    ? demandas.filter(d => d.tipo_deploy === grupo.filtroTipoDeploy)
    : demandas;

  const listaPagina = lista.slice(0, visiveis);
  const temMais = lista.length > visiveis;

  if (!carregando && lista.length === 0) return null;

  return (
    <div className={`rounded-xl border ${cor.borda} overflow-hidden mb-4`}>
      <div className={`${cor.fundo} px-4 py-3 flex items-center gap-3`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cor.iconeBg}`}>
          <Icone size={16} className={cor.iconeTexto} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-sm font-semibold ${cor.texto}`}>{titulo}</h2>
          <p className="text-xs text-neutral-500 leading-tight mt-0.5">{descricao}</p>
        </div>
        {!carregando && (
          <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${cor.badge}`}>
            {lista.length} {lista.length === 1 ? 'item' : 'itens'}
          </span>
        )}
      </div>

      <div className="bg-white">
        {carregando ? (
          <div className="flex items-center justify-center py-8 gap-2 text-sm text-neutral-400">
            <RefreshCw size={14} className="animate-spin" />
            Carregando...
          </div>
        ) : lista.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-sm text-neutral-400 border-t border-neutral-100">
            <Hourglass size={14} className="mr-2 opacity-50" />
            Nenhum item neste grupo
          </div>
        ) : (
          <>
            {listaPagina.map(d => (
              <LinhaDemanda key={d.id_demanda} demanda={d} navigate={navigate} grupoId={grupo.id} />
            ))}
            {temMais && (
              <button
                onClick={() => setVisiveis(v => v + POR_PAGINA)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-neutral-500 hover:text-tce-700 hover:bg-neutral-50 border-t border-neutral-100 transition"
              >
                <ChevronDown size={13} />
                Ver mais {Math.min(POR_PAGINA, lista.length - visiveis)} itens
                <span className="text-neutral-400">({lista.length - visiveis} restantes)</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ValidacaoPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil_principal || '';

  const grupos = gruposPorPerfil(perfil);

  const [dados, setDados] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [ultimaAtt, setUltimaAtt] = useState(null);

  const carregar = useCallback(async () => {
    if (!grupos.length) { setCarregando(false); return; }
    setCarregando(true);
    try {
      const todosStatuses = [...new Set(grupos.flatMap(g => g.statuses))];
      const { data } = await demandaService.listarPorStatus(todosStatuses, { limite: 100 });
      const demandas = data.demandas || [];

      const mapa = {};
      for (const g of grupos) {
        mapa[g.id] = demandas.filter(d => g.statuses.includes(d.status_atual));
      }
      setDados(mapa);
      setUltimaAtt(new Date());
    } catch {
      // mantém estado anterior
    } finally {
      setCarregando(false);
    }
  }, [perfil]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalAcoes = grupos.reduce((acc, g) => {
    const lista = dados[g.id] || [];
    const filtrado = g.filtroTipoDeploy
      ? lista.filter(d => d.tipo_deploy === g.filtroTipoDeploy)
      : lista;
    return acc + filtrado.length;
  }, 0);

  const tituloPagina = TITULO_POR_PERFIL[perfil] || 'Fila de Ação';
  const perfilLabel = PERFIL_LABEL[perfil] || perfil;

  if (!grupos.length) {
    return (
      <Layout>
        <div className="p-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Wrench size={32} className="text-neutral-300 mb-3" />
            <p className="text-neutral-500 text-sm">Esta página não está disponível para o seu perfil.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck size={20} className="text-tce-600" />
              <h1 className="text-xl font-bold text-neutral-800">{tituloPagina}</h1>
              {!carregando && totalAcoes > 0 && (
                <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  {totalAcoes}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500">
              {perfilLabel}
              {!carregando && ' · '}
              {!carregando && (
                perfil === 'GESTOR_DEPARTAMENTO'
                  ? totalAcoes === 0
                    ? 'Nenhuma demanda ativa no departamento'
                    : `${totalAcoes} demanda${totalAcoes > 1 ? 's' : ''} ativa${totalAcoes > 1 ? 's' : ''} no departamento`
                  : totalAcoes === 0
                    ? 'Nenhuma demanda aguardando ação'
                    : `${totalAcoes} demanda${totalAcoes > 1 ? 's' : ''} aguardando ação`
              )}
            </p>
            {ultimaAtt && (
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Atualizado às {ultimaAtt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <button
            onClick={carregar}
            disabled={carregando}
            title="Atualizar"
            className="p-2 border border-neutral-200 rounded-lg text-neutral-500 hover:bg-neutral-100 transition disabled:opacity-40"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>

        {!carregando && totalAcoes > 0 && perfil !== 'GESTOR_DEPARTAMENTO' && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-sm">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <span className="text-amber-800">
              Itens com fundo vermelho ou laranja indicam prioridade alta com tempo de espera elevado.
              Clique em qualquer linha para abrir os detalhes e tomar ação.
            </span>
          </div>
        )}

        {/* Grupos */}
        {!carregando && totalAcoes === 0 ? (
          <EmptyState />
        ) : (
          grupos.map(g => (
            <GrupoFila
              key={g.id}
              grupo={g}
              grupoId={g.id}
              demandas={dados[g.id] || []}
              carregando={carregando}
              navigate={navigate}
            />
          ))
        )}

      </div>
    </Layout>
  );
}
