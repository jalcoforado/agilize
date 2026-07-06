// agilize-frontend/src/pages/AvaliacaoDPOPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, ShieldAlert, Cpu, BarChart2,
  Terminal, Globe, Package, Info,
} from 'lucide-react';
import { demandaService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FormParecer from '../components/FormParecer';

const FASES_DPO = {
  AGUARDANDO_DPO:              { label: 'Análise DPO — Dados Sensíveis',  cor: 'bg-amber-50 border-amber-200 text-amber-800' },
  AGUARDANDO_DPO_HOMOLOGACAO:  { label: 'Homologação DPO — Dados Sensíveis', cor: 'bg-amber-50 border-amber-200 text-amber-800' },
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
  CRITICA: 'bg-red-100 text-red-700', ALTA: 'bg-orange-100 text-orange-700',
  MEDIA: 'bg-yellow-100 text-yellow-700', BAIXA: 'bg-green-100 text-green-700',
};

const fmtDt = (d) => d
  ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

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

function FormularioDPO({ status, idDemanda, onSucesso, onErro }) {
  const [parecer, setParecer]         = useState('');
  const [parecerText, setParecerText] = useState('');
  const [comentario, setComentario]   = useState('');
  const [acaoAtiva, setAcaoAtiva]     = useState(null);
  const [enviando, setEnviando]       = useState(false);
  const [erroLocal, setErroLocal]     = useState('');
  const [anexos, setAnexos]           = useState([]);

  const isFase1 = status === 'AGUARDANDO_DPO';
  const isFase3 = status === 'AGUARDANDO_DPO_HOMOLOGACAO';

  if (!isFase1 && !isFase3) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
        <Info size={20} className="text-neutral-300 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">Esta demanda não está aguardando decisão do DPO.</p>
        <p className="text-xs text-neutral-400 mt-1">Status atual: <strong>{status}</strong></p>
      </div>
    );
  }

  const validar = () => {
    setErroLocal('');
    if (parecerText.trim().length < 10) {
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
      if (acao === 'aprovar')
        await demandaService.dpoAprovar(idDemanda, parecer, comentario, anexos);
      else if (acao === 'solicitar-ajustes')
        await demandaService.dpoSolicitarAjustes(idDemanda, parecer, comentario, anexos);
      onSucesso(acao);
    } catch (err) {
      onErro(err.response?.data?.message || 'Erro ao executar a ação');
    } finally {
      setEnviando(false);
      setAcaoAtiva(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center gap-2">
        <ShieldAlert size={15} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-neutral-700">
          {isFase1 ? 'Análise DPO — Dados Sensíveis' : 'Homologação DPO — Dados Sensíveis'}
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">

        <p className="text-xs text-neutral-500 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          {isFase1
            ? 'Como DPO, verifique se o tratamento de dados sensíveis declarado está em conformidade com a LGPD e as políticas institucionais. Você pode aprovar para seguir à STI ou solicitar ajustes diretamente ao solicitante.'
            : 'Como DPO, verifique se o produto entregue trata os dados sensíveis conforme aprovado. Você pode aprovar para seguir à homologação STI ou solicitar ajustes ao solicitante.'}
        </p>

        <FormParecer
          parecer={parecer}
          onParecerChange={setParecer}
          onTextChange={setParecerText}
          comentario={comentario}
          onComentarioChange={setComentario}
          onAnexosChange={setAnexos}
          label="Parecer DPO"
          minChars={10}
          placeholder="Descreva sua análise: conformidade com a LGPD, base legal do tratamento, riscos identificados, recomendações..."
          comentarioPlaceholder="Observações internas..."
          minRows={5}
        />

        {erroLocal && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={13} />{erroLocal}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => executar('aprovar')} disabled={enviando}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 text-white">
            {enviando && acaoAtiva === 'aprovar'
              ? <Loader2 size={14} className="animate-spin" />
              : <CheckCircle2 size={14} />}
            {isFase1 ? 'Aprovar — Encaminhar à STI' : 'Aprovar — Encaminhar à Homologação STI'}
          </button>
          <button onClick={() => executar('solicitar-ajustes')} disabled={enviando}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-amber-500 hover:bg-amber-600 text-white">
            {enviando && acaoAtiva === 'solicitar-ajustes'
              ? <Loader2 size={14} className="animate-spin" />
              : <AlertTriangle size={14} />}
            Solicitar Ajustes
          </button>
        </div>

      </div>
    </div>
  );
}

export default function AvaliacaoDPOPage() {
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
      'aprovar':          'Aprovado pelo DPO. Demanda encaminhada à STI.',
      'solicitar-ajustes':'Ajustes solicitados ao solicitante.',
    };
    setSucesso(msgs[acao] || 'Ação realizada com sucesso.');
    carregar();
  };

  const TipoIcone = demanda ? (TIPO_ICONE[demanda.tipo_solucao] || Package) : Package;
  const faseInfo  = demanda ? FASES_DPO[demanda.status_atual] : null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500 transition">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-400 font-mono">{demanda?.numero_demanda || '...'}</p>
            <h1 className="text-lg font-bold text-neutral-900 truncate">{demanda?.titulo || 'Carregando...'}</h1>
          </div>
          {demanda && <StatusBadge status={demanda.status_atual} />}
        </div>

        {/* Fase badge */}
        {faseInfo && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium ${faseInfo.cor}`}>
            <ShieldAlert size={15} />
            {faseInfo.label}
          </div>
        )}

        {/* Feedback */}
        {sucesso && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 size={15} />{sucesso}
          </div>
        )}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={15} />{erro}
          </div>
        )}

        {carregando ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-neutral-300" />
          </div>
        ) : demanda ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna esquerda — detalhes da demanda */}
            <div className="lg:col-span-2 space-y-4">
              <Secao titulo="Dados da Solicitação">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-2">
                  <InfoLinha label="Tipo" value={TIPO_LABEL[demanda.tipo_solucao]} />
                  <InfoLinha label="Prioridade" value={
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORIDADE_CLS[demanda.prioridade]}`}>
                      {demanda.prioridade}
                    </span>
                  } />
                  <InfoLinha label="Solicitante" value={demanda.nome_solicitante} />
                  <InfoLinha label="Unidade" value={demanda.nome_unidade} />
                  <InfoLinha label="Data criação" value={fmtDt(demanda.data_criacao)} />
                  <InfoLinha label="Gestor validador" value={demanda.nome_gestor_unidade} />
                </div>
              </Secao>

              <Secao titulo="Descrição e Justificativa">
                <div className="space-y-3 pt-2">
                  <InfoLinha label="Descrição" value={demanda.descricao} />
                  <InfoLinha label="Justificativa" value={demanda.justificativa} />
                  <InfoLinha label="Objetivo principal" value={demanda.objetivo_principal} />
                </div>
              </Secao>

              <Secao titulo="Dados Sensíveis — Base para Análise DPO" defaultOpen={true}>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                    <p className="text-sm font-semibold text-amber-800">Esta solução envolve dados sensíveis</p>
                  </div>
                  <InfoLinha label="Descrição dos dados sensíveis" value={demanda.dados_sensiveis_desc || 'Não informado'} />
                  <InfoLinha label="Impacta outras áreas" value={demanda.impacta_outras_areas === true ? 'Sim' : demanda.impacta_outras_areas === false ? 'Não' : null} />
                  <InfoLinha label="Áreas impactadas" value={demanda.areas_impactadas} />
                </div>
              </Secao>
            </div>

            {/* Coluna direita — formulário DPO */}
            <div className="space-y-4">
              <FormularioDPO
                status={demanda.status_atual}
                idDemanda={demanda.id_demanda}
                onSucesso={handleSucesso}
                onErro={(msg) => setErro(msg)}
              />
            </div>
          </div>
        ) : null}

      </div>
    </Layout>
  );
}
