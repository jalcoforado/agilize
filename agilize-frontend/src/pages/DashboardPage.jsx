import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, RefreshCw, Clock, CheckCircle, AlertCircle,
  Layers, ArrowRight, Search
} from 'lucide-react';
import { demandaService } from '../services/api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';

const ACOES_POR_PERFIL = {
  SOLICITANTE:         ['DRAFT','DEVOLVIDA_AJUSTES','SOLICITANTE_AJUSTANDO','SOLICITADO_AJUSTES_STI','APROVADA_STI','EM_DESENVOLVIMENTO','DEVOLVIDA_HOMOLOGACAO','AJUSTANDO_HOMOLOGACAO','SOLICITADO_AJUSTES_HOMOLOGACAO'],
  GESTOR_UNIDADE:      ['PENDENTE_GESTOR','VALIDADA_GESTOR','SUBMETIDO_HOMOLOGACAO','VALIDADA_HOMOLOGACAO_GESTOR','SOLICITADO_AJUSTES_STI','SOLICITADO_AJUSTES_HOMOLOGACAO'],
  GESTOR_DEPARTAMENTO: ['PENDENTE_GESTOR','VALIDADA_GESTOR','SUBMETIDO_HOMOLOGACAO','VALIDADA_HOMOLOGACAO_GESTOR'],
  ANALISTA_STI:        ['FILA_STI','AGUARDANDO_DIRETOR','FILA_HOMOLOGACAO_STI','AGUARDANDO_DIRETOR_HOMOLOGACAO'],
  DIRETOR_STI:         ['AGUARDANDO_DIRETOR','AGUARDANDO_DIRETOR_HOMOLOGACAO'],
  RESPONSAVEL_PRODUCAO:['HOMOLOGADA','EM_PRODUCAO'],
  GESTOR_SISTEMA:      ['PENDENTE_GESTOR','FILA_STI','SUBMETIDO_HOMOLOGACAO','FILA_HOMOLOGACAO_STI','AGUARDANDO_DIRETOR','AGUARDANDO_DIRETOR_HOMOLOGACAO'],
};

const PRIORIDADE_CLASSES = {
  CRITICA: 'text-red-600 font-semibold',
  ALTA:    'text-orange-600',
  MEDIA:   'text-yellow-700',
  BAIXA:   'text-green-700',
};

const PRIORIDADE_LABELS = {
  CRITICA: 'Crítica',
  ALTA:    'Alta',
  MEDIA:   'Média',
  BAIXA:   'Baixa',
};

function CardMetrica({ label, valor, cor, icone: Icone, sublabel }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cor.bg}`}>
        <Icone size={20} className={cor.icon} />
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${cor.text}`}>{valor}</p>
        <p className="text-neutral-500 text-xs mt-1">{label}</p>
        {sublabel && <p className="text-neutral-400 text-[10px] mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function metricas(demandas, perfil) {
  const total = demandas.length;
  if (perfil === 'SOLICITANTE') {
    return [
      { label: 'Total',            valor: total, cor: { bg: 'bg-tce-50',    icon: 'text-tce-600',    text: 'text-tce-700'    }, icone: Layers },
      { label: 'Aguardando ação',  valor: demandas.filter(d => ['DRAFT','DEVOLVIDA_AJUSTES','SOLICITANTE_AJUSTANDO','APROVADA_STI','AJUSTANDO_HOMOLOGACAO','DEVOLVIDA_HOMOLOGACAO','SOLICITADO_AJUSTES_STI'].includes(d.status_atual)).length, cor: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-700' }, icone: AlertCircle },
      { label: 'Em desenvolvimento',valor: demandas.filter(d => ['EM_DESENVOLVIMENTO','SUBMETIDO_HOMOLOGACAO'].includes(d.status_atual)).length, cor: { bg: 'bg-orange-50', icon: 'text-orange-500', text: 'text-orange-600' }, icone: Clock },
      { label: 'Em produção',      valor: demandas.filter(d => ['EM_PRODUCAO','EM_MONITORAMENTO'].includes(d.status_atual)).length, cor: { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700'  }, icone: CheckCircle },
    ];
  }
  if (perfil === 'GESTOR_UNIDADE' || perfil === 'GESTOR_DEPARTAMENTO') {
    return [
      { label: 'Total na unidade',      valor: total, cor: { bg: 'bg-tce-50',    icon: 'text-tce-600',    text: 'text-tce-700'    }, icone: Layers },
      { label: 'Pendentes minha ação',  valor: demandas.filter(d => ['PENDENTE_GESTOR','VALIDADA_GESTOR','SUBMETIDO_HOMOLOGACAO','VALIDADA_HOMOLOGACAO_GESTOR','SOLICITADO_AJUSTES_STI','SOLICITADO_AJUSTES_HOMOLOGACAO'].includes(d.status_atual)).length, cor: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-700' }, icone: AlertCircle },
      { label: 'Na fila da STI',        valor: demandas.filter(d => ['FILA_STI','FILA_HOMOLOGACAO_STI'].includes(d.status_atual)).length, cor: { bg: 'bg-indigo-50', icon: 'text-indigo-500', text: 'text-indigo-600' }, icone: Clock },
      { label: 'Em produção',           valor: demandas.filter(d => ['EM_PRODUCAO','EM_MONITORAMENTO'].includes(d.status_atual)).length, cor: { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700'  }, icone: CheckCircle },
    ];
  }
  if (perfil === 'DIRETOR_STI') {
    return [
      { label: 'Total',                  valor: total, cor: { bg: 'bg-tce-50',     icon: 'text-tce-600',     text: 'text-tce-700'     }, icone: Layers },
      { label: 'Ag. minha aprovação',    valor: demandas.filter(d => ['AGUARDANDO_DIRETOR','AGUARDANDO_DIRETOR_HOMOLOGACAO'].includes(d.status_atual)).length, cor: { bg: 'bg-violet-50', icon: 'text-violet-500', text: 'text-violet-700' }, icone: AlertCircle },
      { label: 'Fila STI (visão geral)', valor: demandas.filter(d => ['FILA_STI','FILA_HOMOLOGACAO_STI'].includes(d.status_atual)).length, cor: { bg: 'bg-indigo-50', icon: 'text-indigo-500', text: 'text-indigo-600' }, icone: Clock },
      { label: 'Em produção',            valor: demandas.filter(d => ['EM_PRODUCAO','EM_MONITORAMENTO'].includes(d.status_atual)).length, cor: { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700'  }, icone: CheckCircle },
    ];
  }
  if (perfil === 'RESPONSAVEL_PRODUCAO') {
    return [
      { label: 'Total',              valor: total, cor: { bg: 'bg-tce-50',    icon: 'text-tce-600',    text: 'text-tce-700'    }, icone: Layers },
      { label: 'Aguardando deploy',  valor: demandas.filter(d => d.status_atual === 'HOMOLOGADA').length, cor: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-700' }, icone: AlertCircle },
      { label: 'Em produção',        valor: demandas.filter(d => d.status_atual === 'EM_PRODUCAO').length, cor: { bg: 'bg-tce-50',  icon: 'text-tce-600',  text: 'text-tce-700'  }, icone: CheckCircle },
      { label: 'Em monitoramento',   valor: demandas.filter(d => d.status_atual === 'EM_MONITORAMENTO').length, cor: { bg: 'bg-green-50', icon: 'text-green-600', text: 'text-green-700' }, icone: CheckCircle },
    ];
  }
  // ANALISTA_STI / GESTOR_SISTEMA
  return [
    { label: 'Total',             valor: total, cor: { bg: 'bg-tce-50',    icon: 'text-tce-600',    text: 'text-tce-700'    }, icone: Layers },
    { label: 'Fila análise STI',  valor: demandas.filter(d => d.status_atual === 'FILA_STI').length, cor: { bg: 'bg-indigo-50', icon: 'text-indigo-500', text: 'text-indigo-600' }, icone: Search },
    { label: 'Fila homologação',  valor: demandas.filter(d => d.status_atual === 'FILA_HOMOLOGACAO_STI').length, cor: { bg: 'bg-purple-50', icon: 'text-purple-500', text: 'text-purple-600' }, icone: Clock },
    { label: 'Em produção',       valor: demandas.filter(d => ['EM_PRODUCAO','EM_MONITORAMENTO'].includes(d.status_atual)).length, cor: { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700'  }, icone: CheckCircle },
  ];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil_principal || 'SOLICITANTE';

  const [demandas, setDemandas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [quickFilter, setQuickFilter] = useState('acao');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);

  const acoesDoPerfl = ACOES_POR_PERFIL[perfil] || [];

  const carregar = async () => {
    setCarregando(true);
    try {
      let data;
      if (quickFilter === 'acao' && acoesDoPerfl.length > 0) {
        ({ data } = await demandaService.listarPorStatus(acoesDoPerfl, { pagina, limite: 15 }));
      } else {
        ({ data } = await demandaService.listar({ pagina, limite: 15 }));
      }
      setDemandas(data.demandas || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.totalPaginas || 1);
    } catch {
      // silencioso — manter estado anterior
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { setPagina(1); }, [quickFilter]);
  useEffect(() => { carregar(); }, [quickFilter, pagina]);

  const demandasFiltradas = busca
    ? demandas.filter(d =>
        d.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        d.numero_demanda.toLowerCase().includes(busca.toLowerCase())
      )
    : demandas;

  const podeCriar = ['SOLICITANTE', 'GESTOR_SISTEMA'].includes(perfil);
  const cards = metricas(demandas, perfil);

  const primeiroNome = usuario.nome?.split(' ')[0] || 'Usuário';

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

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <CardMetrica key={card.label} {...card} />
          ))}
        </div>

        {/* Tabela de demandas */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Barra de filtros */}
          <div className="px-4 py-3 border-b border-neutral-100 flex flex-col sm:flex-row gap-3 items-center">
            {/* Tabs de filtro rápido */}
            {acoesDoPerfl.length > 0 && (
              <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 shrink-0">
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
              </div>
            )}
            <div className="relative flex-1">
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por título ou número..."
                className="w-full pl-3 pr-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-700 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition"
              />
            </div>
          </div>

          {/* Conteúdo */}
          {carregando ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : demandasFiltradas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Search size={28} className="opacity-50" />
              <p className="text-sm">
                {quickFilter === 'acao' ? 'Nenhuma demanda aguardando sua ação' : 'Nenhuma demanda encontrada'}
              </p>
              {podeCriar && quickFilter !== 'acao' && (
                <button
                  onClick={() => navigate('/demanda/nova')}
                  className="mt-2 text-tce-600 text-sm font-medium hover:underline flex items-center gap-1"
                >
                  Criar primeira solução <ArrowRight size={13} />
                </button>
              )}
            </div>
          ) : (
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
                        <span className={`text-xs ${PRIORIDADE_CLASSES[demanda.prioridade] || 'text-neutral-500'}`}>
                          {PRIORIDADE_LABELS[demanda.prioridade] || demanda.prioridade}
                        </span>
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
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-between text-sm text-neutral-500">
              <span className="text-xs">
                Página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong>
                {total > 0 && <span className="ml-1">· {total} registro{total !== 1 ? 's' : ''}</span>}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-40 hover:bg-neutral-50 transition"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-40 hover:bg-neutral-50 transition"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
