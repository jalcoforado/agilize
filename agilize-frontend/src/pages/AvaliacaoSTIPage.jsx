import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Shield, Bot, Cpu, BarChart2,
  Terminal, Globe, Package, Server, Info, Sparkles, UserCog, X, User, ShieldAlert,
} from 'lucide-react';
import { demandaService, usuarioService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import FormParecer from '../components/FormParecer';

// ─── Constantes ──────────────────────────────────────────────────────────────

const FASES_STI = {
  FILA_STI:              { fase: 1, label: 'Análise de Viabilidade',  cor: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  FILA_HOMOLOGACAO_STI:  { fase: 3, label: 'Homologação Técnica',     cor: 'bg-purple-50 border-purple-200 text-purple-800' },
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

const DADOS_TEC_LABELS = {
  ferramenta_bi: 'Ferramenta BI', fontes_dados: 'Fontes de dados',
  frequencia_atualizacao: 'Freq. atualização', conexao_direta: 'Conexão direta com BD', banco_bi: 'Banco BI',
  linguagem: 'Linguagem', execucao: 'Execução', agendamento: 'Agendamento', escopo: 'Escopo',
  provedor_llm: 'Provedor LLM', modelo_llm: 'Modelo LLM',
  estimativa_tokens_mes: 'Tokens/mês (est.)', custo_llm_mes_estimado: 'Custo LLM/mês (R$)',
  usa_rag: 'Usa RAG', fontes_rag: 'Fontes RAG',
  acoes_autonomas: 'Ações autônomas', descricao_acoes: 'Desc. ações autônomas',
  tem_memoria_persistente: 'Memória persistente', usa_git: 'Usa Git',
  tipo_interface: 'Interface', tecnologia: 'Tecnologias', banco_dados: 'Banco de dados',
  usuarios_simultaneos: 'Usuários simultâneos', requer_servidor_dedicado: 'Servidor dedicado',
  tem_autenticacao: 'Autenticação', tipo_autenticacao: 'Tipo de auth', expoe_api: 'Expõe API',
  descricao_tecnologia: 'Tecnologia / abordagem',
};

const DEP_LABELS = {
  usa_internet: 'Acessa internet', usa_dados_tcece: 'Acessa dados TCE-CE',
  acesso_banco_dados: 'Acessa banco de dados', nome_banco: 'Banco utilizado',
  repositorio_git: 'Repositório Git', url_repositorio: 'URL do repositório',
  apis_externas: 'APIs externas', sistemas_integrados: 'Sistemas integrados', outras: 'Outras dependências',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDt = (d) => d
  ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : '—';

const fmtBool = (v) => (typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : null);

// ─── Componentes internos ─────────────────────────────────────────────────────

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

function DiagnosticoIA({ diagnostico, carregando }) {
  if (carregando) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" />
        <p className="text-sm text-indigo-700">Carregando diagnóstico IA...</p>
      </div>
    );
  }

  if (!diagnostico) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Bot size={16} className="text-neutral-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-neutral-600">Diagnóstico IA não disponível</p>
          <p className="text-xs text-neutral-400 mt-0.5">O agente de análise ainda não processou esta demanda.</p>
        </div>
      </div>
    );
  }

  if (diagnostico.status_diagnostico === 'PROCESSANDO') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-amber-500 shrink-0" />
        <p className="text-sm text-amber-700">Diagnóstico IA em processamento...</p>
      </div>
    );
  }

  if (diagnostico.status_diagnostico === 'ERRO') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-sm text-red-700">O diagnóstico IA retornou um erro.</p>
      </div>
    );
  }

  const diag = diagnostico.diagnostico || {};

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-indigo-100">
        <Sparkles size={15} className="text-indigo-600" />
        <span className="text-sm font-semibold text-indigo-800">Diagnóstico IA</span>
        {diagnostico.modelo_ia && (
          <span className="ml-auto text-[10px] text-indigo-400 font-mono">{diagnostico.modelo_ia}</span>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        {diag.resumo && (
          <p className="text-sm text-neutral-700 leading-relaxed">{diag.resumo}</p>
        )}
        {diag.pontos_atencao?.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Pontos de atenção</p>
            <ul className="space-y-1">
              {diag.pontos_atencao.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-neutral-600">
                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {diag.recomendacao && (
          <div className="bg-white/70 rounded-lg px-3 py-2.5 border border-indigo-100">
            <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide mb-1">Recomendação</p>
            <p className="text-sm text-neutral-700">{diag.recomendacao}</p>
          </div>
        )}
        {diag.viabilidade !== undefined && (
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
            diag.viabilidade === 'VIAVEL'   ? 'bg-green-100 text-green-700' :
            diag.viabilidade === 'INVIAVEL' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {diag.viabilidade === 'VIAVEL'   && <CheckCircle size={11} />}
            {diag.viabilidade === 'INVIAVEL' && <XCircle size={11} />}
            {diag.viabilidade === 'REVISAR'  && <AlertTriangle size={11} />}
            {diag.viabilidade || 'Análise pendente'}
          </div>
        )}
      </div>
    </div>
  );
}

function FormularioAvaliacao({ status, idDemanda, onSucesso, onErro }) {
  const [parecer, setParecer]           = useState('');
  const [parecerText, setParecerText]   = useState('');
  const [comentario, setComentario]     = useState('');
  const [motivo, setMotivo]             = useState('');
  const [tipoDeploy, setTipoDeploy]     = useState('');
  const [acaoAtiva, setAcaoAtiva]       = useState(null);
  const [enviando, setEnviando]         = useState(false);
  const [erroLocal, setErroLocal]       = useState('');
  const [anexos, setAnexos]             = useState([]);
  const [responsaveis, setResponsaveis]                     = useState([]);
  const [loadingResponsaveis, setLoadingResponsaveis]       = useState(false);
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('');
  const [erroResponsaveis, setErroResponsaveis]             = useState('');

  // Modal encaminhar ao Avaliador Técnico
  const [showAvaliadorModal, setShowAvaliadorModal] = useState(false);
  const [comentarioAvaliador, setComentarioAvaliador] = useState('');
  const [enviandoAvaliador, setEnviandoAvaliador]     = useState(false);
  const [erroAvaliador, setErroAvaliador]             = useState('');

  // Modal encaminhar ao DPO
  const [showDPOModal, setShowDPOModal]         = useState(false);
  const [comentarioDPO, setComentarioDPO]       = useState('');
  const [enviandoDPO, setEnviandoDPO]           = useState(false);
  const [erroDPO, setErroDPO]                   = useState('');

  const abrirModalDPO = () => {
    setShowDPOModal(true);
    setErroDPO('');
    setComentarioDPO('');
  };

  const confirmarEncaminharDPO = async () => {
    setEnviandoDPO(true);
    setErroDPO('');
    try {
      await demandaService.encaminharDPO(idDemanda, comentarioDPO);
      setShowDPOModal(false);
      onSucesso('encaminhar-dpo');
    } catch (err) {
      setErroDPO(err.response?.data?.message || 'Erro ao encaminhar ao DPO');
    } finally {
      setEnviandoDPO(false);
    }
  };

  const abrirModalAvaliador = () => {
    setShowAvaliadorModal(true);
    setErroAvaliador('');
    setComentarioAvaliador('');
  };

  const confirmarEncaminharAvaliador = async () => {
    setEnviandoAvaliador(true);
    setErroAvaliador('');
    try {
      await demandaService.encaminharAvaliador(idDemanda, comentarioAvaliador);
      setShowAvaliadorModal(false);
      onSucesso('encaminhar-avaliador');
    } catch (err) {
      setErroAvaliador(err.response?.data?.message || 'Erro ao encaminhar ao Avaliador Técnico');
    } finally {
      setEnviandoAvaliador(false);
    }
  };

  const isFase1 = status === 'FILA_STI';
  const isFase3 = status === 'FILA_HOMOLOGACAO_STI';

  if (!isFase1 && !isFase3) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-center">
        <Info size={20} className="text-neutral-300 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">Esta demanda não está disponível para avaliação.</p>
        <p className="text-xs text-neutral-400 mt-1">Status atual: <strong>{status}</strong></p>
      </div>
    );
  }

  const handleTipoDeploy = async (valor) => {
    setTipoDeploy(valor);
    setResponsavelSelecionado('');
    if (valor === 'OPS_DEPLOY' && responsaveis.length === 0) {
      setLoadingResponsaveis(true);
      setErroResponsaveis('');
      try {
        const { data } = await usuarioService.listarResponsaveisProducao();
        setResponsaveis(data.responsaveis || []);
      } catch {
        setErroResponsaveis('Não foi possível carregar os responsáveis de produção.');
      } finally {
        setLoadingResponsaveis(false);
      }
    }
  };

  const validar = (acao) => {
    setErroLocal('');
    if (['reprovar-sti', 'rejeitar-homologacao'].includes(acao)) {
      if (!motivo.trim()) { setErroLocal('Informe o motivo'); return false; }
      if (parecerText.trim().length < 20) { setErroLocal('Parecer precisa ter pelo menos 20 caracteres'); return false; }
    } else if (acao === 'homologar') {
      if (!tipoDeploy) { setErroLocal('Selecione o tipo de deploy'); return false; }
      if (tipoDeploy === 'OPS_DEPLOY' && !responsavelSelecionado) {
        setErroLocal('Selecione o responsável de produção para deploy OPS/Infra'); return false;
      }
    } else {
      // parecer é opcional em ações de aprovação
    }
    return true;
  };

  const executar = async (acao) => {
    if (!validar(acao)) return;
    setEnviando(true);
    setAcaoAtiva(acao);
    try {
      if (acao === 'aprovar-sti')
        await demandaService.aprovarSTI(idDemanda, parecer, comentario, anexos);
      else if (acao === 'solicitar-ajustes-sti')
        await demandaService.solicitarAjustesSTI(idDemanda, parecer, comentario, anexos);
      else if (acao === 'reprovar-sti')
        await demandaService.reprovarSTI(idDemanda, motivo, parecer, anexos);
      else if (acao === 'homologar')
        await demandaService.homologar(
          idDemanda, parecer, comentario, tipoDeploy,
          tipoDeploy === 'OPS_DEPLOY' ? responsavelSelecionado : null,
          anexos
        );
      else if (acao === 'solicitar-ajustes-homologacao')
        await demandaService.solicitarAjustesHomologacao(idDemanda, parecer, comentario, anexos);
      else if (acao === 'rejeitar-homologacao')
        await demandaService.rejeitarHomologacao(idDemanda, motivo, parecer, anexos);
      onSucesso(acao);
    } catch (err) {
      onErro(err.response?.data?.message || 'Erro ao executar a ação');
    } finally {
      setEnviando(false);
      setAcaoAtiva(null);
    }
  };

  const ic = `w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition`;

  const BtnAcao = ({ acao, label, variante, icon: Icon }) => {
    const cls = {
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      warning: 'bg-amber-500 hover:bg-amber-600 text-white',
      danger:  'border border-red-300 text-red-600 hover:bg-red-50',
    }[variante];
    return (
      <button onClick={() => executar(acao)} disabled={enviando}
        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${cls}`}>
        {enviando && acaoAtiva === acao
          ? <Loader2 size={14} className="animate-spin" />
          : Icon && <Icon size={14} />}
        {label}
      </button>
    );
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center gap-2">
        <Shield size={15} className="text-tce-600" />
        <h3 className="text-sm font-semibold text-neutral-700">
          {isFase1 ? 'Parecer de Viabilidade' : 'Parecer de Homologação'}
        </h3>
      </div>
      <div className="px-5 py-4 space-y-4">

        {/* Motivo — só visível quando a ação selecionada é reprovação/rejeição */}
        {['reprovar-sti', 'rejeitar-homologacao'].includes(acaoAtiva) && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Motivo de reprovação / rejeição <span className="text-red-500">*</span>
            </label>
            <textarea className={ic + ' resize-none'} rows={2} value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da reprovação ou rejeição..." />
          </div>
        )}

        {/* Parecer + comentário */}
        <FormParecer
          parecer={parecer}
          onParecerChange={setParecer}
          onTextChange={setParecerText}
          comentario={comentario}
          onComentarioChange={setComentario}
          onAnexosChange={setAnexos}
          label={isFase1 ? 'Parecer técnico' : 'Parecer de homologação'}
          placeholder={isFase1
            ? 'Descreva a análise de viabilidade: adequação técnica, riscos, dependências, alinhamento com a política institucional...'
            : 'Descreva o resultado da homologação: qualidade técnica, conformidade, testes realizados, critérios de aceite...'
          }
          comentarioPlaceholder="Observações internas que não constam no parecer oficial..."
          minRows={5}
        />

        {/* Tipo de deploy — só fase 3 / homologação */}
        {isFase3 && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Tipo de deploy <span className="font-normal text-neutral-400">(obrigatório ao homologar)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'SELF_DEPLOY', label: 'Self-deploy', desc: 'O solicitante faz o deploy', Icon: User   },
                { value: 'OPS_DEPLOY',  label: 'Ops / Infra',  desc: 'Equipe de Operações faz',  Icon: Server },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => handleTipoDeploy(opt.value)}
                  className={`text-left rounded-lg border-2 p-2.5 transition-all ${
                    tipoDeploy === opt.value
                      ? 'border-tce-500 bg-tce-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700">
                    <opt.Icon size={14} />
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            {tipoDeploy === 'OPS_DEPLOY' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Responsável de produção <span className="text-red-500">*</span>
                </label>
                {loadingResponsaveis ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-neutral-400">
                    <Loader2 size={14} className="animate-spin" /> Carregando responsáveis...
                  </div>
                ) : erroResponsaveis ? (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <AlertTriangle size={13} />{erroResponsaveis}
                  </p>
                ) : (
                  <select
                    value={responsavelSelecionado}
                    onChange={e => setResponsavelSelecionado(e.target.value)}
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500"
                  >
                    <option value="">Selecione um responsável...</option>
                    {responsaveis.map(r => (
                      <option key={r.id_usuario} value={r.id_usuario}>{r.nome}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {erroLocal && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={13} />{erroLocal}
          </p>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 pt-1">
          {isFase1 && <>
            <BtnAcao acao="aprovar-sti"           label="Aprovar"           variante="success" icon={CheckCircle} />
            <BtnAcao acao="solicitar-ajustes-sti" label="Solicitar Ajustes" variante="warning" icon={AlertTriangle} />
            <BtnAcao acao="reprovar-sti"          label="Reprovar"          variante="danger"  icon={XCircle} />
          </>}
          {isFase3 && <>
            <BtnAcao acao="homologar"                      label="Homologar"         variante="success" icon={CheckCircle} />
            <BtnAcao acao="solicitar-ajustes-homologacao"  label="Solicitar Ajustes" variante="warning" icon={AlertTriangle} />
            <BtnAcao acao="rejeitar-homologacao"           label="Rejeitar"          variante="danger"  icon={XCircle} />
          </>}
        </div>

        {/* Encaminhar ao Avaliador Técnico */}
        <div className="border-t border-neutral-100 pt-3 space-y-2">
          <button onClick={abrirModalAvaliador} disabled={enviando}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       border border-neutral-200 text-neutral-600 hover:border-tce-300 hover:text-tce-700
                       hover:bg-tce-50 transition disabled:opacity-40">
            <UserCog size={14} />
            Encaminhar ao Avaliador Técnico
          </button>
          <button onClick={abrirModalDPO} disabled={enviando}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                       border border-amber-200 text-amber-700 hover:border-amber-400 hover:text-amber-800
                       hover:bg-amber-50 transition disabled:opacity-40">
            <ShieldAlert size={14} />
            Encaminhar ao DPO
          </button>
        </div>

      </div>
    </div>

    {/* Modal encaminhar ao Avaliador Técnico */}
    {showAvaliadorModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <UserCog size={16} className="text-tce-600" />
              <h3 className="text-sm font-semibold text-neutral-800">Encaminhar ao Avaliador Técnico</h3>
            </div>
            <button onClick={() => setShowAvaliadorModal(false)}
              className="text-neutral-400 hover:text-neutral-600 transition">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
              A demanda será encaminhada para revisão. Qualquer Avaliador Técnico ativo poderá analisá-la.
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Comentário <span className="font-normal text-neutral-400">(opcional)</span>
              </label>
              <textarea value={comentarioAvaliador} onChange={e => setComentarioAvaliador(e.target.value)}
                rows={3} placeholder="Motivo do encaminhamento, pontos a verificar..."
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-tce-500" />
            </div>

            {erroAvaliador && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={13} /> {erroAvaliador}
              </p>
            )}
          </div>

          <div className="px-5 py-3 border-t border-neutral-100 flex gap-2 justify-end">
            <button onClick={() => setShowAvaliadorModal(false)}
              className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition">
              Cancelar
            </button>
            <button onClick={confirmarEncaminharAvaliador} disabled={enviandoAvaliador}
              className="px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition disabled:opacity-50 flex items-center gap-2">
              {enviandoAvaliador && <Loader2 size={14} className="animate-spin" />}
              Encaminhar
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal encaminhar ao DPO */}
    {showDPOModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-neutral-800">Encaminhar ao DPO</h3>
            </div>
            <button onClick={() => setShowDPOModal(false)}
              className="text-neutral-400 hover:text-neutral-600 transition">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              A demanda será encaminhada ao DPO para análise LGPD. Qualquer DPO ativo poderá analisá-la.
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Observação <span className="font-normal text-neutral-400">(opcional)</span>
              </label>
              <textarea
                value={comentarioDPO}
                onChange={e => setComentarioDPO(e.target.value)}
                rows={3}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Descreva o motivo do encaminhamento ao DPO..."
              />
            </div>

            {erroDPO && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={13} />{erroDPO}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowDPOModal(false)}
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition">
                Cancelar
              </button>
              <button onClick={confirmarEncaminharDPO} disabled={enviandoDPO}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition disabled:opacity-50">
                {enviandoDPO ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                Encaminhar ao DPO
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AvaliacaoSTIPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [demanda,      setDemanda]      = useState(null);
  const [diagnostico,  setDiagnostico]  = useState(null);
  const [carregando,   setCarregando]   = useState(true);
  const [carregDiag,   setCarregDiag]   = useState(true);
  const [erro,         setErro]         = useState('');
  const [sucesso,      setSucesso]      = useState('');

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

  const carregarDiagnostico = useCallback(async () => {
    try {
      const { data } = await demandaService.obterDiagnostico(id);
      setDiagnostico(data.diagnostico);
    } catch {
      setDiagnostico(null);
    } finally {
      setCarregDiag(false);
    }
  }, [id]);

  useEffect(() => {
    carregar();
    carregarDiagnostico();
  }, [carregar, carregarDiagnostico]);

  const handleSucesso = (acao) => {
    const msgs = {
      'aprovar-sti':                   'Viabilidade aprovada com sucesso.',
      'solicitar-ajustes-sti':         'Ajustes solicitados ao solicitante.',
      'reprovar-sti':                  'Solicitação reprovada.',
      'homologar':                     'Demanda homologada com sucesso.',
      'solicitar-ajustes-homologacao': 'Ajustes de homologação solicitados.',
      'rejeitar-homologacao':          'Produto rejeitado na homologação.',
      'encaminhar-avaliador':          'Demanda encaminhada ao Avaliador Técnico.',
      'encaminhar-dpo':               'Demanda encaminhada ao DPO.',
    };
    setSucesso(msgs[acao] || 'Ação realizada.');
    setTimeout(() => { setSucesso(''); navigate('/validacao'); }, 2500);
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

  if (erro || !demanda) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <AlertTriangle size={40} className="text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{erro || 'Demanda não encontrada.'}</p>
          <button onClick={() => navigate('/validacao')}
            className="mt-4 text-sm text-tce-600 hover:underline">Voltar para a fila</button>
        </div>
      </Layout>
    );
  }

  const faseInfo = FASES_STI[demanda.status_atual];
  const TipoIcone = TIPO_ICONE[demanda.tipo_solucao] || Package;
  const tec = demanda.dados_tecnicos || {};
  const deps = demanda.dependencias_externas || {};

  // Dependências relevantes (só as que são true ou têm valor)
  const depsAtivas = Object.entries(deps).filter(([, v]) =>
    typeof v === 'boolean' ? v : v !== null && v !== undefined && v !== ''
  );

  const tecEntries = Object.entries(tec).filter(([, v]) =>
    v !== null && v !== undefined && v !== ''
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <button onClick={() => navigate('/validacao')}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition mt-0.5 shrink-0">
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
              {faseInfo && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${faseInfo.cor}`}>
                  Fase {faseInfo.fase} — {faseInfo.label}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-neutral-800 leading-tight">{demanda.titulo}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {demanda.nome_solicitante} · {demanda.nome_unidade}
              {demanda.nome_departamento && ` / ${demanda.nome_departamento}`}
            </p>
          </div>
          <button onClick={() => navigate(`/demanda/${id}`)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition">
            Ver detalhes completos
          </button>
        </div>

        {/* Alertas globais */}
        {erro && (
          <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />{erro}
          </div>
        )}
        {sucesso && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            <CheckCircle size={15} className="shrink-0" />{sucesso}
          </div>
        )}

        {/* Layout principal: conteúdo (esquerda) + avaliação (direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Coluna esquerda: conteúdo da demanda ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Card de meta-dados */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-tce-50 flex items-center justify-center shrink-0">
                  <TipoIcone size={17} className="text-tce-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-700">{TIPO_LABEL[demanda.tipo_solucao] || demanda.tipo_solucao}</p>
                  <p className="text-xs text-neutral-400">Submetido em {fmtDt(demanda.data_criacao)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoLinha label="Solicitante"     value={demanda.nome_solicitante} />
                <InfoLinha label="Unidade"          value={demanda.nome_unidade} />
                <InfoLinha label="Departamento"     value={demanda.nome_departamento} />
                <InfoLinha label="Público-alvo"     value={demanda.publico_alvo} />
                <InfoLinha label="Frequência de uso" value={demanda.frequencia_uso} />
                <InfoLinha label="Usuários estimados" value={demanda.quantidade_usuarios_estimada != null ? String(demanda.quantidade_usuarios_estimada) : null} />
                {demanda.tempo_estimado_horas && (
                  <InfoLinha label="Horas estimadas" value={`${demanda.tempo_estimado_horas}h`} />
                )}
                {demanda.investimento_estimado && (
                  <InfoLinha label="Investimento (R$)"
                    value={parseFloat(demanda.investimento_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} />
                )}
              </div>
            </div>

            {/* Descrição + objetivos */}
            <Secao titulo="Conteúdo da solicitação" defaultOpen={true}>
              <div className="space-y-4 pt-2">
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Descrição</p>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">{demanda.descricao}</p>
                </div>
                {demanda.objetivo_principal && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Objetivo principal</p>
                    <p className="text-sm text-neutral-700 leading-relaxed">{demanda.objetivo_principal}</p>
                  </div>
                )}
                {demanda.justificativa && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Justificativa</p>
                    <p className="text-sm text-neutral-600 whitespace-pre-wrap leading-relaxed">{demanda.justificativa}</p>
                  </div>
                )}
              </div>
            </Secao>

            {/* Configuração técnica */}
            {tecEntries.length > 0 && (
              <Secao titulo="Configuração técnica" defaultOpen={true}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                  {tecEntries.map(([k, v]) => {
                    const label = DADOS_TEC_LABELS[k] || k;
                    const val = typeof v === 'boolean' ? fmtBool(v) : (typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v));
                    if (!val) return null;
                    return <InfoLinha key={k} label={label} value={val} />;
                  })}
                </div>
              </Secao>
            )}

            {/* Dependências */}
            {depsAtivas.length > 0 && (
              <Secao titulo="Dependências externas" defaultOpen={false}>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                  {depsAtivas.map(([k, v]) => (
                    <InfoLinha key={k} label={DEP_LABELS[k] || k}
                      value={typeof v === 'boolean' ? 'Sim' : String(v)} />
                  ))}
                </div>
              </Secao>
            )}
          </div>

          {/* ── Coluna direita: painel de avaliação ── */}
          <div className="lg:col-span-2 space-y-4">
            <DiagnosticoIA diagnostico={diagnostico} carregando={carregDiag} />
            <FormularioAvaliacao
              status={demanda.status_atual}
              idDemanda={id}
              onSucesso={handleSucesso}
              onErro={setErro}
            />
          </div>

        </div>
      </div>
    </Layout>
  );
}
