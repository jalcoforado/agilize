import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, RotateCcw,
  ChevronDown, ChevronUp, UserCog, Cpu, BarChart2,
  Terminal, Globe, Package, Info,
} from 'lucide-react';
import { demandaService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

// ─── Constantes ──────────────────────────────────────────────────────────────

const FASES_DIRETOR = {
  AGUARDANDO_DIRETOR:              { fase: 1, label: 'Revisão — Viabilidade',  cor: 'bg-violet-50 border-violet-200 text-violet-800' },
  AGUARDANDO_DIRETOR_HOMOLOGACAO:  { fase: 3, label: 'Revisão — Homologação', cor: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800' },
};

const TIPO_LABEL = {
  PAINEL_BI: 'Painel BI', SCRIPT: 'Script / Automação',
  AGENTE_IA: 'Agente IA', SISTEMA_SIMPLES: 'Sistema / Aplicação', OUTRO: 'Outro',
};

const TIPO_ICONE = {
  PAINEL_BI: BarChart2, SCRIPT: Terminal, AGENTE_IA: Cpu,
  SISTEMA_SIMPLES: Globe, OUTRO: Package,
};

const PRIORIDADE_CLS = {
  CRITICA: 'bg-red-100 text-red-700',
  ALTA:    'bg-orange-100 text-orange-700',
  MEDIA:   'bg-yellow-100 text-yellow-700',
  BAIXA:   'bg-green-100 text-green-700',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDt = (d) => d
  ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

// ─── Componentes ─────────────────────────────────────────────────────────────

function InfoLinha({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-neutral-700 mt-0.5">{value}</p>
    </div>
  );
}

function Secao({ titulo, children, defaultOpen = true }) {
  const [aberto, setAberto] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <button onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-neutral-50 transition">
        <h3 className="text-sm font-semibold text-neutral-700">{titulo}</h3>
        {aberto ? <ChevronUp size={15} className="text-neutral-400"/> : <ChevronDown size={15} className="text-neutral-400"/>}
      </button>
      {aberto && <div className="px-5 pb-5 pt-1 border-t border-neutral-100">{children}</div>}
    </div>
  );
}

function FormularioDiretor({ status, idDemanda, onSucesso, onErro }) {
  const [parecer, setParecer]       = useState('');
  const [comentario, setComentario] = useState('');
  const [acaoAtiva, setAcaoAtiva]   = useState(null);
  const [enviando, setEnviando]     = useState(false);
  const [erroLocal, setErroLocal]   = useState('');

  const isFase1 = status === 'AGUARDANDO_DIRETOR';
  const isFase3 = status === 'AGUARDANDO_DIRETOR_HOMOLOGACAO';

  if (!isFase1 && !isFase3) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
        <Info size={20} className="text-neutral-300 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">Esta demanda não está aguardando decisão do diretor.</p>
        <p className="text-xs text-neutral-400 mt-1">Status atual: <strong>{status}</strong></p>
      </div>
    );
  }

  const validar = () => {
    setErroLocal('');
    if (parecer.trim().length < 10) {
      setErroLocal('Parecer precisa ter pelo menos 10 caracteres');
      return false;
    }
    return true;
  };

  const executar = async (acao) => {
    if (!validar()) return;
    setEnviando(true);
    setAcaoAtiva(acao);
    try {
      if (acao === 'solicitar-ajustes')
        await demandaService.diretorSolicitarAjustes(idDemanda, parecer, comentario);
      else if (acao === 'devolver-analista')
        await demandaService.diretorDevolverAnalista(idDemanda, parecer, comentario);
      onSucesso(acao);
    } catch (err) {
      onErro(err.response?.data?.message || 'Erro ao executar a ação');
    } finally {
      setEnviando(false);
      setAcaoAtiva(null);
    }
  };

  const ic = `w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition`;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center gap-2">
        <UserCog size={15} className="text-violet-600" />
        <h3 className="text-sm font-semibold text-neutral-700">
          {isFase1 ? 'Revisão — Viabilidade Técnica' : 'Revisão — Homologação'}
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">

        <p className="text-xs text-neutral-500 leading-relaxed bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5">
          Como diretor, você pode <strong>solicitar ajustes</strong> diretamente ao solicitante, ou <strong>devolver ao analista</strong> com orientações para que ele continue a análise.
        </p>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Parecer / Orientação <span className="text-red-500">*</span>
            <span className="font-normal text-neutral-400 ml-1">(mín. 10 caracteres)</span>
          </label>
          <textarea className={ic + ' resize-none'} rows={5} value={parecer}
            onChange={e => setParecer(e.target.value)}
            placeholder="Descreva sua orientação, pontos críticos identificados, ou o motivo para solicitar ajustes..." />
          <p className="text-right text-[11px] text-neutral-400 mt-0.5">{parecer.length} / 5000</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Comentário interno <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <textarea className={ic + ' resize-none'} rows={2} value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="Notas internas para o time STI..." />
        </div>

        {erroLocal && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={13} />{erroLocal}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => executar('solicitar-ajustes')} disabled={enviando}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white">
            {enviando && acaoAtiva === 'solicitar-ajustes'
              ? <Loader2 size={14} className="animate-spin" />
              : <AlertTriangle size={14} />}
            Solicitar Ajustes
          </button>
          <button onClick={() => executar('devolver-analista')} disabled={enviando}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-tce-700 hover:bg-tce-800 text-white">
            {enviando && acaoAtiva === 'devolver-analista'
              ? <Loader2 size={14} className="animate-spin" />
              : <RotateCcw size={14} />}
            Devolver ao Analista
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AvaliacaoDiretorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [demanda,    setDemanda]    = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState('');
  const [sucesso,    setSucesso]    = useState('');

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const { data } = await demandaService.obter(id);
      setDemanda(data.demanda);
    } catch {
      setErro('Não foi possível carregar a demanda.');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSucesso = (acao) => {
    const msgs = {
      'solicitar-ajustes':  'Ajustes solicitados ao solicitante.',
      'devolver-analista':  'Demanda devolvida ao analista com suas orientações.',
    };
    setSucesso(msgs[acao] || 'Ação realizada com sucesso.');
    setTimeout(() => { setSucesso(''); navigate('/validacao'); }, 2500);
  };

  const handleErro = (msg) => setErro(msg);

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

  if (erro && !demanda) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <AlertTriangle size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{erro}</p>
          <button onClick={() => navigate('/validacao')}
            className="mt-4 text-sm text-tce-600 hover:underline">Voltar para a fila</button>
        </div>
      </Layout>
    );
  }

  const faseInfo = FASES_DIRETOR[demanda?.status_atual];
  const TipoIcone = TIPO_ICONE[demanda?.tipo_solucao] || Package;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <button onClick={() => navigate('/validacao')}
            className="mt-0.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition shrink-0">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-mono text-neutral-400">{demanda?.numero_demanda}</span>
              {faseInfo && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${faseInfo.cor}`}>
                  Fase {faseInfo.fase} — {faseInfo.label}
                </span>
              )}
              <StatusBadge status={demanda?.status_atual} />
            </div>
            <h1 className="text-xl font-bold text-neutral-800 truncate">{demanda?.titulo}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {demanda?.nome_unidade} · {demanda?.nome_solicitante}
              {demanda?.nome_analista_sti && ` · Analista: ${demanda.nome_analista_sti}`}
            </p>
          </div>
          <div className="shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORIDADE_CLS[demanda?.prioridade] || 'bg-neutral-100 text-neutral-600'}`}>
              {demanda?.prioridade}
            </span>
          </div>
        </div>

        {/* Mensagens */}
        {sucesso && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
            <CheckCircle2 size={16} />
            {sucesso}
          </div>
        )}
        {erro && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertTriangle size={16} />
            {erro}
          </div>
        )}

        {/* Corpo: 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Coluna esquerda — detalhes da demanda */}
          <div className="lg:col-span-3 space-y-4">

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-tce-50 flex items-center justify-center shrink-0">
                  <TipoIcone size={18} className="text-tce-600" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400">{TIPO_LABEL[demanda?.tipo_solucao] || demanda?.tipo_solucao}</p>
                  <p className="text-sm font-semibold text-neutral-700">{demanda?.nome_unidade} — {demanda?.nome_departamento}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoLinha label="Solicitante"  value={demanda?.nome_solicitante} />
                <InfoLinha label="Analista STI" value={demanda?.nome_analista_sti || demanda?.nome_analista_sti_homologacao} />
                <InfoLinha label="Data criação" value={fmtDt(demanda?.data_criacao)} />
                <InfoLinha label="Prioridade"   value={demanda?.prioridade} />
              </div>
            </div>

            {/* Conteúdo */}
            <Secao titulo="Descrição e Objetivo">
              <div className="space-y-3 pt-2">
                <InfoLinha label="Descrição"          value={demanda?.descricao} />
                <InfoLinha label="Objetivo principal" value={demanda?.objetivo_principal} />
                <InfoLinha label="Justificativa"      value={demanda?.justificativa} />
                <InfoLinha label="Público-alvo"       value={demanda?.publico_alvo} />
                <InfoLinha label="Frequência de uso"  value={demanda?.frequencia_uso} />
                {demanda?.quantidade_usuarios_estimada && (
                  <InfoLinha label="Usuários estimados" value={String(demanda.quantidade_usuarios_estimada)} />
                )}
              </div>
            </Secao>

          </div>

          {/* Coluna direita — formulário de decisão */}
          <div className="lg:col-span-2 space-y-4">
            <FormularioDiretor
              status={demanda?.status_atual}
              idDemanda={id}
              onSucesso={handleSucesso}
              onErro={handleErro}
            />
          </div>

        </div>
      </div>
    </Layout>
  );
}
