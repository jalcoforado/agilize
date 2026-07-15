import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RefreshCw, ArrowRight, Search, Filter, X,
  ArrowLeftRight, Check, Loader2,
} from 'lucide-react';
import { demandaService, adminService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';

const ACOES_POR_PERFIL = {
  SOLICITANTE:         ['DRAFT','DEVOLVIDA_AJUSTES','SOLICITANTE_AJUSTANDO','SOLICITADO_AJUSTES_STI','APROVADA_STI','EM_DESENVOLVIMENTO','DEVOLVIDA_HOMOLOGACAO','AJUSTANDO_HOMOLOGACAO','SOLICITADO_AJUSTES_HOMOLOGACAO'],
  GESTOR_UNIDADE:      ['PENDENTE_GESTOR','VALIDADA_GESTOR','SUBMETIDO_HOMOLOGACAO','VALIDADA_HOMOLOGACAO_GESTOR','SOLICITADO_AJUSTES_STI','SOLICITADO_AJUSTES_HOMOLOGACAO'],
  ANALISTA_STI:        ['FILA_STI','AGUARDANDO_AVALIADOR','FILA_HOMOLOGACAO_STI','AGUARDANDO_AVALIADOR_HOMOLOGACAO'],
  AVALIADOR_TECNICO:   ['AGUARDANDO_AVALIADOR','AGUARDANDO_AVALIADOR_HOMOLOGACAO'],
  DPO:                 ['AGUARDANDO_DPO','AGUARDANDO_DPO_HOMOLOGACAO'],
  RESPONSAVEL_PRODUCAO:['HOMOLOGADA','EM_PRODUCAO'],
  GESTOR_SISTEMA:      ['PENDENTE_GESTOR','FILA_STI','SUBMETIDO_HOMOLOGACAO','FILA_HOMOLOGACAO_STI','AGUARDANDO_AVALIADOR','AGUARDANDO_AVALIADOR_HOMOLOGACAO','AGUARDANDO_DPO','AGUARDANDO_DPO_HOMOLOGACAO'],
};

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  PENDENTE_GESTOR: 'Pendente Gestor',
  DEVOLVIDA_AJUSTES: 'Devolvida p/ Ajustes',
  SOLICITANTE_AJUSTANDO: 'Solicitante Ajustando',
  REJEITADA: 'Rejeitada',
  VALIDADA_GESTOR: 'Validada pelo Gestor',
  FILA_STI: 'Fila STI',
  APROVADA_STI: 'Aprovada STI',
  REPROVADA_STI: 'Reprovada STI',
  SOLICITADO_AJUSTES_STI: 'Ajustes (STI)',
  AGUARDANDO_AVALIADOR: 'Aguardando Avaliador Técnico',
  EM_DESENVOLVIMENTO: 'Em Desenvolvimento',
  SUBMETIDO_HOMOLOGACAO: 'Submetido Homologação',
  PENDENTE_HOMOLOGACAO_GESTOR: 'Pendente Homologação Gestor',
  DEVOLVIDA_HOMOLOGACAO: 'Devolvida (Homologação)',
  AJUSTANDO_HOMOLOGACAO: 'Ajustando (Homologação)',
  VALIDADA_HOMOLOGACAO_GESTOR: 'Validada Homologação Gestor',
  FILA_HOMOLOGACAO_STI: 'Fila Homologação STI',
  AGUARDANDO_AVALIADOR_HOMOLOGACAO: 'Aguardando Avaliador Técnico (Hom.)',
  HOMOLOGADA: 'Homologada',
  SOLICITADO_AJUSTES_HOMOLOGACAO: 'Ajustes (Homologação)',
  EM_PRODUCAO: 'Em Produção',
  EM_MONITORAMENTO: 'Em Monitoramento',
  DESATIVADA: 'Desativada',
  CANCELADA: 'Cancelada',
};


const PRIORIDADE_CONFIG = {
  BAIXA:   { label: 'Baixa',   cls: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200'  },
  MEDIA:   { label: 'Média',   cls: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  ALTA:    { label: 'Alta',    cls: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  CRITICA: { label: 'Crítica', cls: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'    },
};

const PERFIS_EDICAO_PRIORIDADE = ['ANALISTA_STI', 'AVALIADOR_TECNICO', 'GESTOR_SISTEMA'];

// ─── Prioridade inline-editável ───────────────────────────────────────────────

function InlineEditPrioridade({ idDemanda, valor, podeEditar, onAtualizar }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef(null);
  const cfg = PRIORIDADE_CONFIG[valor] || PRIORIDADE_CONFIG.MEDIA;

  useEffect(() => {
    if (!aberto) return;
    function fechar(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [aberto]);

  async function selecionar(nova) {
    if (nova === valor) { setAberto(false); return; }
    setSalvando(true);
    setAberto(false);
    try {
      await demandaService.atualizarPrioridade(idDemanda, nova);
      onAtualizar(idDemanda, nova);
    } catch {
      // silencia — badge reverte
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center gap-1.5"
      onClick={e => e.stopPropagation()}
    >
      {/* Texto colorido atual */}
      <span className={`text-xs font-medium ${cfg.cls}`}>
        {salvando ? <Loader2 size={11} className="animate-spin inline" /> : cfg.label}
      </span>

      {/* Botão de troca — aparece apenas no hover da linha */}
      {podeEditar && !salvando && (
        <button
          onClick={() => setAberto(v => !v)}
          title="Alterar prioridade"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-neutral-400 hover:text-tce-600 hover:bg-tce-50"
        >
          <ArrowLeftRight size={12} />
        </button>
      )}

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-20 top-full mt-1 left-0 bg-white border border-neutral-200 rounded-xl shadow-lg min-w-[130px] py-1 overflow-hidden">
          {Object.entries(PRIORIDADE_CONFIG).map(([key, c]) => (
            <button
              key={key}
              onClick={() => selecionar(key)}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-neutral-50 transition"
            >
              <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.cls} ${c.border}`}>
                {c.label}
              </span>
              {key === valor && <Check size={11} className="text-tce-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const SELECT_STYLE = 'h-8 pl-2 pr-7 border border-neutral-300 rounded-lg text-xs text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition appearance-none cursor-pointer';

export default function DashboardPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil_principal || 'SOLICITANTE';
  const perfisSecundarios = Array.isArray(usuario.perfis_secundarios) ? usuario.perfis_secundarios : [];
  const todosPerfis = [perfil, ...perfisSecundarios];

  const [demandas, setDemandas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  // Só defaulta em 'todas' quando NENHUM perfil do usuário tem a aba "Para minha ação"
  const PERFIS_SEM_ABA_ACAO = ['GESTOR_SISTEMA', 'GESTOR_DEPARTAMENTO', 'SOLICITANTE'];
  const [quickFilter, setQuickFilter] = useState(
    todosPerfis.every(p => PERFIS_SEM_ABA_ACAO.includes(p)) ? 'todas' : 'acao'
  );
  const DPO_ESTADOS_ESPERA = ['AGUARDANDO_DPO', 'AGUARDANDO_DPO_HOMOLOGACAO'];
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros avançados
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [departamentos, setDepartamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const PERFIS_AMPLOS = ['ANALISTA_STI', 'GESTOR_SISTEMA', 'RESPONSAVEL_PRODUCAO', 'AVALIADOR_TECNICO'];
  const mostraDept = todosPerfis.some(p => PERFIS_AMPLOS.includes(p));
  const mostraUnidade = mostraDept || todosPerfis.includes('GESTOR_DEPARTAMENTO');
  const mostraSolicitante = mostraUnidade || todosPerfis.includes('GESTOR_UNIDADE');

  const acoesDoPerfl = [...new Set(todosPerfis.flatMap(p => ACOES_POR_PERFIL[p] || []))];
  const podeEditarPrioridade = todosPerfis.some(p => PERFIS_EDICAO_PRIORIDADE.includes(p));

  // Carrega departamentos e unidades para filtros
  useEffect(() => {
    if (!mostraUnidade && !mostraDept) return;
    adminService.listarUnidades().then(({ data }) => setUnidades(data.unidades || [])).catch(() => {});
    if (mostraDept) {
      adminService.listarDepartamentos().then(({ data }) => setDepartamentos(data.departamentos || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deve rodar só na montagem; revisar se precisa reagir a mudança de perfil (TODO)
  }, []);

  // Unidades filtradas pelo departamento selecionado (nova hierarquia: unidade.id_departamento)
  const unidadesFiltradas = filtroDepartamento && mostraDept
    ? unidades.filter(u => String(u.id_departamento) === String(filtroDepartamento))
    : unidades;

  const temFiltrosAtivos = filtroStatus || filtroDepartamento || filtroUnidade || filtroSolicitante;

  const limparFiltros = () => {
    setFiltroStatus('');
    setFiltroDepartamento('');
    setFiltroUnidade('');
    setFiltroSolicitante('');
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = { pagina, limite: 15 };

      if (perfil !== 'SOLICITANTE' && quickFilter === 'acao' && acoesDoPerfl.length > 0 && !filtroStatus) {
        params.statusIn = acoesDoPerfl.join(',');
      }
      if (perfil === 'DPO' && quickFilter === 'analisadas' && !filtroStatus) {
        params.statusNotIn = DPO_ESTADOS_ESPERA.join(',');
      }
      if (filtroStatus) params.status = filtroStatus;
      if (filtroDepartamento) params.filtro_departamento = filtroDepartamento;
      if (filtroUnidade) params.filtro_unidade = filtroUnidade;
      if (filtroSolicitante) params.filtro_solicitante = filtroSolicitante;

      const { data } = await demandaService.listar(params);
      setDemandas(data.demandas || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.totalPaginas || 1);
    } catch {
      // silencioso — manter estado anterior
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- DPO_ESTADOS_ESPERA/acoesDoPerfl/perfil intencionalmente fora (revisar depois)
  }, [pagina, quickFilter, filtroStatus, filtroDepartamento, filtroUnidade, filtroSolicitante]);

  useEffect(() => { setPagina(1); }, [quickFilter, filtroStatus, filtroDepartamento, filtroUnidade, filtroSolicitante]);
  useEffect(() => { carregar(); }, [carregar]);

  function handleAtualizarPrioridade(id, nova) {
    setDemandas(prev => prev.map(d =>
      d.id_demanda === id ? { ...d, prioridade: nova } : d
    ));
  }

  const demandasFiltradas = busca
    ? demandas.filter(d =>
        d.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        d.numero_demanda.toLowerCase().includes(busca.toLowerCase())
      )
    : demandas;

  const podeCriar = todosPerfis.some(p => ['SOLICITANTE', 'GESTOR_SISTEMA'].includes(p));
  const podeVerTodas = todosPerfis.some(p => ['ANALISTA_STI', 'AVALIADOR_TECNICO', 'RESPONSAVEL_PRODUCAO', 'GESTOR_SISTEMA', 'GESTOR_UNIDADE', 'GESTOR_DEPARTAMENTO'].includes(p));

  const primeiroNome = usuario.nome?.split(' ')[0] || 'Usuário';

  let mensagemListaVazia;
  if (temFiltrosAtivos) mensagemListaVazia = 'Nenhuma demanda com os filtros aplicados';
  else if (quickFilter === 'acao') mensagemListaVazia = 'Nenhuma demanda aguardando sua ação';
  else if (quickFilter === 'analisadas') mensagemListaVazia = 'Nenhuma demanda analisada ainda';
  else if (perfil === 'SOLICITANTE') mensagemListaVazia = 'Você ainda não criou nenhuma solução';
  else mensagemListaVazia = 'Nenhuma demanda encontrada';

  let conteudoDemandas;
  if (carregando) {
    conteudoDemandas = (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <RefreshCw size={20} className="animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    );
  } else if (demandasFiltradas.length === 0) {
    conteudoDemandas = (
      <div className="py-16 flex flex-col items-center justify-center gap-2 text-neutral-400">
        <Search size={28} className="opacity-50" />
        <p className="text-sm">
          {mensagemListaVazia}
        </p>
        {podeCriar && perfil === 'SOLICITANTE' && (
          <button
            onClick={() => navigate('/demanda/nova')}
            className="mt-2 text-tce-600 text-sm font-medium hover:underline flex items-center gap-1"
          >
            Criar primeira solução <ArrowRight size={13} />
          </button>
        )}
        {temFiltrosAtivos && (
          <button
            onClick={limparFiltros}
            className="mt-1 text-xs text-neutral-500 hover:text-neutral-700 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    );
  } else {
    conteudoDemandas = (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Criada em</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {demandasFiltradas.map(demanda => (
              <tr
                key={demanda.id_demanda}
                onClick={() => navigate(`/demanda/${demanda.id_demanda}`)}
                className="hover:bg-neutral-50 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-xs text-neutral-400 whitespace-nowrap">
                  {demanda.numero_demanda}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-800 max-w-xs">
                  <span className="line-clamp-1 font-medium">{demanda.titulo}</span>
                  {demanda.nome_unidade && (
                    <span className="text-[11px] text-neutral-400 block mt-0.5">{demanda.nome_unidade}</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={demanda.status_atual} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <InlineEditPrioridade
                    idDemanda={demanda.id_demanda}
                    valor={demanda.prioridade || 'MEDIA'}
                    podeEditar={podeEditarPrioridade}
                    onAtualizar={handleAtualizarPrioridade}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                  {new Date(demanda.data_criacao).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <ArrowRight size={14} className="text-neutral-300 group-hover:text-tce-600 transition-colors ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-neutral-800">
              {saudacao()}, {primeiroNome}
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={carregar}
              disabled={carregando}
              className="p-2 text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            </button>
            {podeCriar && (
              <button
                onClick={() => navigate('/demanda/nova')}
                className="flex items-center gap-2 bg-tce-700 text-white px-4 py-2 rounded-lg hover:bg-tce-800 active:bg-tce-900 transition text-sm font-semibold"
              >
                <Plus size={15} />
                Nova Solução
              </button>
            )}
          </div>
        </div>

        {/* Tabela de demandas */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">

          {/* Barra superior: título + tabs + busca rápida */}
          <div className="px-4 py-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-3 items-center">

            {/* Título da seção ou tabs de filtro rápido */}
            {perfil === 'SOLICITANTE' ? (
              <span className="text-sm font-semibold text-tce-700 whitespace-nowrap shrink-0">
                Minhas Solicitações
              </span>
            ) : (acoesDoPerfl.length > 0 || podeVerTodas) && (
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 shrink-0">
                {!['GESTOR_SISTEMA', 'GESTOR_DEPARTAMENTO'].includes(perfil) && (
                  <button
                    onClick={() => setQuickFilter('acao')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      quickFilter === 'acao'
                        ? 'bg-white text-tce-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Para minha ação
                  </button>
                )}
                {perfil === 'DPO' && (
                  <button
                    onClick={() => setQuickFilter('analisadas')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      quickFilter === 'analisadas'
                        ? 'bg-white text-tce-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Analisadas
                  </button>
                )}
                {podeVerTodas && (
                  <button
                    onClick={() => setQuickFilter('todas')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      quickFilter === 'todas'
                        ? 'bg-white text-tce-700 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    Todas
                  </button>
                )}
              </div>
            )}

            {/* Busca por texto */}
            <div className="relative flex-1">
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por título ou número..."
                className="w-full pl-3 pr-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition"
              />
            </div>

            {/* Botão de filtros */}
            <button
              onClick={() => setMostrarFiltros(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition shrink-0 ${
                temFiltrosAtivos
                  ? 'border-tce-600 text-tce-700 bg-tce-50'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <Filter size={13} />
              Filtros
              {temFiltrosAtivos && (
                <span className="bg-tce-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                  {[filtroStatus, filtroDepartamento, filtroUnidade, filtroSolicitante].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Painel de filtros avançados */}
          {mostrarFiltros && (
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50 flex flex-wrap gap-3 items-end">

              {/* Status — todos os perfis */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Status</label>
                <div className="relative">
                  <select
                    value={filtroStatus}
                    onChange={e => setFiltroStatus(e.target.value)}
                    className={SELECT_STYLE}
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Departamento — apenas perfis amplos */}
              {mostraDept && departamentos.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Departamento</label>
                  <div className="relative">
                    <select
                      value={filtroDepartamento}
                      onChange={e => { setFiltroDepartamento(e.target.value); setFiltroUnidade(''); }}
                      className={SELECT_STYLE}
                    >
                      <option value="">Todos os departamentos</option>
                      {departamentos.map(d => (
                        <option key={d.id_departamento} value={d.id_departamento}>{d.nome_departamento}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Unidade — perfis amplos e GESTOR_DEPARTAMENTO */}
              {mostraUnidade && unidades.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Unidade</label>
                  <div className="relative">
                    <select
                      value={filtroUnidade}
                      onChange={e => setFiltroUnidade(e.target.value)}
                      className={SELECT_STYLE}
                    >
                      <option value="">Todas as unidades</option>
                      {unidadesFiltradas.map(u => (
                        <option key={u.id_unidade} value={u.id_unidade}>{u.nome_unidade}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Solicitante — todos exceto SOLICITANTE */}
              {mostraSolicitante && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Solicitante</label>
                  <input
                    type="text"
                    value={filtroSolicitante}
                    onChange={e => setFiltroSolicitante(e.target.value)}
                    placeholder="Nome do solicitante..."
                    className="h-8 px-2 border border-neutral-300 rounded-lg text-xs text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition w-44"
                  />
                </div>
              )}

              {/* Limpar filtros */}
              {temFiltrosAtivos && (
                <button
                  onClick={limparFiltros}
                  className="flex items-center gap-1 h-8 px-3 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition self-end"
                >
                  <X size={12} />
                  Limpar
                </button>
              )}
            </div>
          )}

          {/* Conteúdo */}
          {conteudoDemandas}

          <Pagination
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            contagem={demandasFiltradas.length}
            onChange={setPagina}
          />
        </div>
      </div>
    </Layout>
  );
}
