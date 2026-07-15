import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Package, BarChart3, Terminal, Bot, Monitor,
  Search, ChevronRight, RefreshCw, Users,
  CalendarCheck, Server, Zap, Filter, X,
  ArrowLeftRight, Loader2,
} from 'lucide-react';
import { demandaService, adminService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

// ─── Configuração de tipos ────────────────────────────────────────────────────

const TIPO_CONFIG = {
  PAINEL_BI:       { label: 'Painel BI',  icone: BarChart3, bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   iconBg: 'bg-blue-100' },
  SCRIPT:          { label: 'Script',     icone: Terminal,  bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700',  iconBg: 'bg-green-100' },
  AGENTE_IA:       { label: 'Agente IA',  icone: Bot,       bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  SISTEMA_SIMPLES: { label: 'Sistema',    icone: Monitor,   bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  OUTRO:           { label: 'Outro',      icone: Package,   bg: 'bg-neutral-50', border: 'border-neutral-200',text: 'text-neutral-600',iconBg: 'bg-neutral-100' },
};

const FREQ_LABEL = {
  CONTINUO: 'Contínuo', DIARIO: 'Diário', SEMANAL: 'Semanal', MENSAL: 'Mensal', PONTUAL: 'Pontual',
};

const DEPLOY_CONFIG = {
  SELF_DEPLOY: { label: 'Auto',     bg: 'bg-tce-50 text-tce-700 border border-tce-200' },
  OPS_DEPLOY:  { label: 'Ops STI',  bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
};

const STATUS_PROD = [
  { value: '', label: 'Todos os status' },
  { value: 'EM_PRODUCAO',     label: 'Em Produção' },
  { value: 'EM_MONITORAMENTO',label: 'Em Monitoramento' },
];

const TIPOS_FILTRO = [
  { value: '',               label: 'Todos os tipos' },
  { value: 'PAINEL_BI',      label: 'Painel BI' },
  { value: 'SCRIPT',         label: 'Script' },
  { value: 'AGENTE_IA',      label: 'Agente IA' },
  { value: 'SISTEMA_SIMPLES',label: 'Sistema' },
  { value: 'OUTRO',          label: 'Outro' },
];

const LIMITE = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(dataStr) {
  if (!dataStr) return '—';
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.OUTRO;
  const Icone = cfg.icone;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
      <Icone size={11} />
      {cfg.label}
    </span>
  );
}

function DeployBadge({ tipo }) {
  if (!tipo) return <span className="text-neutral-400 text-xs">—</span>;
  const cfg = DEPLOY_CONFIG[tipo] || {};
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg}`}>
      <Server size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Tile de resumo por tipo ─────────────────────────────────────────────────

function TileTipo({ tipo, count, selecionado, onClick }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.OUTRO;
  const Icone = cfg.icone;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition text-center ${
        selecionado
          ? `${cfg.bg} ${cfg.border} shadow-sm`
          : 'bg-white border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.iconBg}`}>
        <Icone size={16} className={cfg.text} />
      </div>
      <span className={`text-xl font-bold leading-none ${selecionado ? cfg.text : 'text-neutral-800'}`}>{count}</span>
      <span className="text-[11px] text-neutral-500 leading-tight">{cfg.label}</span>
    </button>
  );
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

const PERFIS_TRANSFERENCIA = ['GESTOR_SISTEMA', 'ANALISTA_STI'];

function LinhaInventario({ demanda, navigate, podeTransferir, onTransferir }) {
  const locRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const onLocEnter = () => {
    if (!locRef.current) return;
    const r = locRef.current.getBoundingClientRect();
    setTooltipPos({ top: r.top + r.height / 2, left: r.right + 8 });
  };

  return (
    <tr
      onClick={() => navigate(`/demanda/${demanda.id_demanda}`)}
      className="cursor-pointer hover:bg-neutral-50 active:bg-neutral-100 transition border-b border-neutral-100 last:border-0 group"
    >
      {/* Solução */}
      <td className="px-4 py-3">
        <p className="text-[10px] font-mono text-neutral-400 leading-none mb-0.5">{demanda.numero_demanda}</p>
        <p className="text-sm font-medium text-neutral-800 leading-snug max-w-xs truncate">{demanda.titulo}</p>
      </td>

      {/* Tipo */}
      <td className="px-3 py-3 whitespace-nowrap">
        <TipoBadge tipo={demanda.tipo_solucao} />
      </td>

      {/* Locação */}
      <td
        ref={locRef}
        className="px-3 py-3 hidden md:table-cell cursor-default"
        onMouseEnter={onLocEnter}
        onMouseLeave={() => setTooltipPos(null)}
      >
        {demanda.sigla_unidade ? (
          <p className="text-sm font-mono font-medium text-neutral-700">
            <span className="text-neutral-500">{demanda.sigla_unidade.split('-')[0]}</span>
            <span className="text-neutral-300 mx-0.5">/</span>
            <span>{demanda.sigla_unidade.split('-').slice(1).join('-')}</span>
          </p>
        ) : (
          <p className="text-sm text-neutral-500">{demanda.nome_unidade || '—'}</p>
        )}
        {tooltipPos && (demanda.nome_unidade || demanda.nome_departamento) && createPortal(
          <div
            className="pointer-events-none fixed z-[9999]"
            style={{ top: tooltipPos.top, left: tooltipPos.left, transform: 'translateY(-50%)' }}
          >
            <div className="bg-neutral-900/95 text-white text-xs px-3 py-2 rounded-md shadow-xl ring-1 ring-white/10 whitespace-nowrap flex flex-col gap-0.5">
              <span className="font-semibold">{demanda.nome_unidade}</span>
              {demanda.nome_departamento && (
                <span className="text-neutral-300">{demanda.nome_departamento}</span>
              )}
            </div>
          </div>,
          document.body
        )}
      </td>

      {/* Desenvolvido por */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <p className="text-sm text-neutral-600 truncate max-w-[130px]">{demanda.nome_solicitante || '—'}</p>
      </td>

      {/* Usuários estimados */}
      <td className="px-3 py-3 hidden lg:table-cell text-center">
        {demanda.quantidade_usuarios_estimada ? (
          <span className="flex items-center justify-center gap-1 text-sm text-neutral-600">
            <Users size={12} className="text-neutral-400" />
            {demanda.quantidade_usuarios_estimada}
          </span>
        ) : <span className="text-neutral-300 text-sm">—</span>}
      </td>

      {/* Frequência */}
      <td className="px-3 py-3 hidden xl:table-cell text-center">
        {demanda.frequencia_uso ? (
          <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
            {FREQ_LABEL[demanda.frequencia_uso] || demanda.frequencia_uso}
          </span>
        ) : <span className="text-neutral-300 text-sm">—</span>}
      </td>

      {/* Em produção desde */}
      <td className="px-3 py-3 hidden sm:table-cell whitespace-nowrap">
        <span className="flex items-center gap-1 text-xs text-neutral-500">
          <CalendarCheck size={11} className="text-neutral-400" />
          {formatarData(demanda.data_inicio_producao || demanda.data_ultima_atualizacao)}
        </span>
      </td>

      {/* Deploy */}
      <td className="px-3 py-3 hidden md:table-cell">
        <DeployBadge tipo={demanda.tipo_deploy} />
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={demanda.status_atual} />
      </td>

      {/* Ações / Seta */}
      <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
        {podeTransferir && demanda.status_atual === 'EM_MONITORAMENTO' ? (
          <button
            onClick={() => onTransferir(demanda)}
            title="Transferir locação"
            className="opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-tce-200 text-tce-700 bg-white hover:bg-tce-50"
          >
            <ArrowLeftRight size={11} />
            Transferir
          </button>
        ) : (
          <ChevronRight size={14} className="text-neutral-300 group-hover:text-tce-500 transition ml-auto" />
        )}
      </td>
    </tr>
  );
}

const STATUSES_PROD = ['EM_PRODUCAO', 'EM_MONITORAMENTO'];

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InventarioPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const podeTransferir = PERFIS_TRANSFERENCIA.includes(usuario?.perfil_principal);

  const [demandas, setDemandas] = useState([]);
  const [todas, setTodas]       = useState([]);   // sem filtro de tipo/status — só para os tiles
  const [carregando, setCarregando] = useState(true);
  const [pagina, setPagina]     = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal]       = useState(0);

  const [busca, setBusca]       = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  const [demandaSelecionada, setDemandaSelecionada]   = useState(null);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [departamentos, setDepartamentos]             = useState([]);
  const [transferDepartamento, setTransferDepartamento] = useState('');
  const [transferUnidade, setTransferUnidade]         = useState('');
  const [transferMotivo, setTransferMotivo]           = useState('');
  const [transferErro, setTransferErro]               = useState('');
  const [transferSalvando, setTransferSalvando]       = useState(false);


  // Carrega demandas com filtros
  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina, limite: LIMITE };
      if (filtroTipo)   params.tipo_solucao = filtroTipo;
      if (filtroStatus) params.status = filtroStatus;

      const { data } = await demandaService.listarPorStatus(
        filtroStatus ? [filtroStatus] : STATUSES_PROD,
        params
      );
      setDemandas(data.demandas || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.totalPaginas || 1);
    } catch {
      // mantém estado anterior
    } finally {
      setCarregando(false);
    }
  }, [pagina, filtroTipo, filtroStatus]);

  // Carrega todos (sem filtro tipo/status) só para os tiles — rode 1x
  useEffect(() => {
    demandaService.listarPorStatus(STATUSES_PROD, { limite: 500 })
      .then(({ data }) => setTodas(data.demandas || []))
      .catch(() => {});
  }, []);

  useEffect(() => { setPagina(1); }, [filtroTipo, filtroStatus, busca]);
  useEffect(() => { carregar(); }, [carregar]);

  const abrirModalTransferencia = async (demanda) => {
    if (!unidadesDisponiveis.length) {
      const [resUnidades, resDepts] = await Promise.all([
        adminService.listarUnidades(),
        adminService.listarDepartamentos(),
      ]);
      setUnidadesDisponiveis(resUnidades.data?.unidades ?? resUnidades.data ?? []);
      setDepartamentos(resDepts.data?.departamentos ?? resDepts.data ?? []);
    }
    setDemandaSelecionada(demanda);
    setTransferDepartamento(''); setTransferUnidade(''); setTransferMotivo(''); setTransferErro('');
  };

  const confirmarTransferencia = async () => {
    if (!transferUnidade) { setTransferErro('Selecione a nova unidade.'); return; }
    if (transferMotivo.trim().length < 10) { setTransferErro('Motivo deve ter ao menos 10 caracteres.'); return; }
    setTransferSalvando(true); setTransferErro('');
    try {
      await demandaService.transferirLocacao(demandaSelecionada.id_demanda, Number(transferUnidade), transferMotivo.trim());
      setDemandaSelecionada(null);
      carregar();
    } catch (err) {
      setTransferErro(err.response?.data?.message ?? 'Erro ao transferir locação.');
    } finally { setTransferSalvando(false); }
  };

  // Filtro de busca é local (sobre a página atual)
  const listaFiltrada = busca.trim()
    ? demandas.filter(d =>
        d.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        d.numero_demanda?.toLowerCase().includes(busca.toLowerCase()) ||
        d.nome_unidade?.toLowerCase().includes(busca.toLowerCase())
      )
    : demandas;

  // Contagem por tipo para os tiles
  const contagemPorTipo = Object.keys(TIPO_CONFIG).reduce((acc, t) => {
    acc[t] = todas.filter(d => d.tipo_solucao === t).length;
    return acc;
  }, {});

  const temFiltros = filtroTipo || filtroStatus || busca;

  let conteudoInventario;
  if (carregando) {
    conteudoInventario = (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-neutral-400">
        <RefreshCw size={16} className="animate-spin" />
        Carregando inventário...
      </div>
    );
  } else if (listaFiltrada.length === 0) {
    conteudoInventario = (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package size={36} className="text-neutral-200 mb-3" />
        <p className="text-neutral-500 font-medium">Nenhuma solução encontrada</p>
        <p className="text-neutral-400 text-sm mt-1">
          {temFiltros ? 'Tente ajustar os filtros.' : 'Ainda não há soluções em produção.'}
        </p>
      </div>
    );
  } else {
    conteudoInventario = (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Solução</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Tipo</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">Locação</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden lg:table-cell">Desenvolvido por</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden lg:table-cell text-center">
                  <span className="flex items-center justify-center gap-1"><Users size={11} /> Usuários</span>
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden xl:table-cell text-center">Frequência</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden sm:table-cell">
                  <span className="flex items-center gap-1"><CalendarCheck size={11} /> Em prod. desde</span>
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide hidden md:table-cell">Deploy</th>
                <th className="px-3 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map(d => (
                <LinhaInventario
                  key={d.id_demanda}
                  demanda={d}
                  navigate={navigate}
                  podeTransferir={podeTransferir}
                  onTransferir={abrirModalTransferencia}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé: total + paginação */}
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          contagem={listaFiltrada.length}
          onChange={setPagina}
        />
      </>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package size={20} className="text-tce-600" />
              <h1 className="text-xl font-bold text-neutral-800">Inventário de Soluções</h1>
            </div>
            <p className="text-sm text-neutral-500">
              Catálogo oficial de soluções setoriais em operação no TCE-CE
              {!carregando && ` · ${total} solução${total !== 1 ? 'ões' : ''} registrada${total !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => { carregar(); }}
            disabled={carregando}
            title="Atualizar"
            className="p-2 border border-neutral-200 rounded-lg text-neutral-500 hover:bg-neutral-100 transition disabled:opacity-40"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tiles por tipo */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {Object.keys(TIPO_CONFIG).map(tipo => (
            <TileTipo
              key={tipo}
              tipo={tipo}
              count={contagemPorTipo[tipo] ?? 0}
              selecionado={filtroTipo === tipo}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? '' : tipo)}
            />
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Busca */}
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por título, número ou unidade..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tce-300 focus:border-tce-400 bg-white"
            />
          </div>

          {/* Filtro tipo */}
          <div className="relative">
            <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-tce-300 focus:border-tce-400 appearance-none cursor-pointer"
            >
              {TIPOS_FILTRO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Filtro status */}
          <div className="relative">
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-tce-300 focus:border-tce-400 appearance-none cursor-pointer"
            >
              {STATUS_PROD.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Limpar filtros */}
          {temFiltros && (
            <button
              onClick={() => { setBusca(''); setFiltroTipo(''); setFiltroStatus(''); }}
              className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition px-2 py-2"
            >
              <X size={13} />
              Limpar
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {conteudoInventario}
        </div>

        {/* Legenda dos tiles */}
        <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1"><Zap size={10} /> Clique em um tile de tipo para filtrar</span>
          <span className="flex items-center gap-1"><Server size={10} /> <strong>Auto</strong> = solicitante faz o deploy · <strong>Ops STI</strong> = equipe de Operações</span>
        </div>

      </div>

      {demandaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
            <h2 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
              <ArrowLeftRight size={18} className="text-tce-700" />
              Transferir Locação no Inventário
            </h2>

            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-700">{demandaSelecionada.titulo}</span>
              <br />
              Locação atual:{' '}
              <span className="font-medium text-neutral-700">{demandaSelecionada.nome_departamento} / {demandaSelecionada.nome_unidade}</span>
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
                    String(u.id_unidade) !== String(demandaSelecionada.id_unidade) &&
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
                onClick={() => setDemandaSelecionada(null)}
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
