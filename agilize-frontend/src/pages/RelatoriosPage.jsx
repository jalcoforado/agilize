import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, Clock, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, Calendar,
  Package, Building2, Shield, Activity
} from 'lucide-react';
import { relatorioService } from '../services/api';
import Layout from '../components/Layout';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL_STATUS = {
  DRAFT: 'Rascunho', PENDENTE_GESTOR: 'Pend. Gestor',
  DEVOLVIDA_AJUSTES: 'Devolvida', SOLICITANTE_AJUSTANDO: 'Ajustando',
  VALIDADA_GESTOR: 'Valid. Gestor', FILA_STI: 'Fila STI',
  SOLICITADO_AJUSTES_STI: 'Ajustes STI', APROVADA_STI: 'Aprovada STI',
  REPROVADA_STI: 'Reprovada STI', REJEITADA: 'Rejeitada',
  EM_DESENVOLVIMENTO: 'Em Dev.', SUBMETIDO_HOMOLOGACAO: 'Subm. Homolog.',
  PENDENTE_HOMOLOGACAO_GESTOR: 'Pend. Homolog.', DEVOLVIDA_HOMOLOGACAO: 'Devol. Homolog.',
  AJUSTANDO_HOMOLOGACAO: 'Ajust. Homolog.', VALIDADA_HOMOLOGACAO_GESTOR: 'Valid. Homolog.',
  FILA_HOMOLOGACAO_STI: 'Fila Homolog.', SOLICITADO_AJUSTES_HOMOLOGACAO: 'Ajustes Homolog.',
  HOMOLOGADA: 'Homologada', EM_PRODUCAO: 'Em Produção',
  EM_MONITORAMENTO: 'Monitoramento', DESATIVADA: 'Desativada', CANCELADA: 'Cancelada',
};

const LABEL_TIPO = {
  PAINEL_BI: 'Painel BI', SCRIPT: 'Script',
  AGENTE_IA: 'Agente IA', SISTEMA_SIMPLES: 'Sistema', OUTRO: 'Outro',
};

const LABEL_PRIORIDADE = {
  CRITICA: 'Crítica', ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa',
};

const COR_PRIORIDADE = {
  CRITICA: 'bg-red-500', ALTA: 'bg-orange-400', MEDIA: 'bg-yellow-400', BAIXA: 'bg-blue-400',
};

const COR_TIPO = {
  PAINEL_BI: 'bg-blue-500', SCRIPT: 'bg-green-500',
  AGENTE_IA: 'bg-purple-500', SISTEMA_SIMPLES: 'bg-orange-500', OUTRO: 'bg-gray-400',
};

function fmtMes(mes) {
  if (!mes) return '';
  const [ano, m] = mes.split('-');
  return `${m}/${ano}`;
}

function corSLA(percentual, tipo) {
  if (percentual >= 80) return tipo === 'barra' ? 'bg-green-500' : 'text-green-600';
  if (percentual >= 60) return tipo === 'barra' ? 'bg-amber-400' : 'text-amber-600';
  return tipo === 'barra' ? 'bg-red-500' : 'text-red-600';
}

function pct(valor, max) {
  if (!max || !valor) return 0;
  return Math.round((valor / max) * 100);
}

// ─── Componentes de visualização ─────────────────────────────────────────────

function Card({ titulo, valor, subtitulo, icon: Icon, cor = 'tce' }) {
  const cores = {
    tce:    { bg: 'bg-tce-50',    borda: 'border-tce-200',    texto: 'text-tce-700',    icon: 'bg-tce-100'    },
    green:  { bg: 'bg-green-50',  borda: 'border-green-200',  texto: 'text-green-700',  icon: 'bg-green-100'  },
    amber:  { bg: 'bg-amber-50',  borda: 'border-amber-200',  texto: 'text-amber-700',  icon: 'bg-amber-100'  },
    red:    { bg: 'bg-red-50',    borda: 'border-red-200',    texto: 'text-red-700',    icon: 'bg-red-100'    },
    gray:   { bg: 'bg-gray-50',   borda: 'border-gray-200',   texto: 'text-gray-700',   icon: 'bg-gray-100'   },
  };
  const c = cores[cor] || cores.tce;
  return (
    <div className={`border ${c.borda} ${c.bg} rounded-xl p-5 flex items-center gap-4`}>
      <div className={`${c.icon} p-3 rounded-lg`}>
        <Icon size={20} className={c.texto} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{valor ?? '—'}</p>
        <p className="text-sm font-medium text-gray-700">{titulo}</p>
        {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  );
}

function BarraHorizontal({ label, valor, max, cor = 'bg-tce-600', sufixo = '' }) {
  const largura = pct(valor, max);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${cor} h-2 rounded-full transition-all duration-500`} style={{ width: `${largura}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-10 text-right shrink-0">
        {valor}{sufixo}
      </span>
    </div>
  );
}

function Secao({ titulo, icon: Icon, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-tce-600" />
        <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState({ data_inicio: '', data_fim: '' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = {};
      if (filtros.data_inicio) params.data_inicio = filtros.data_inicio;
      if (filtros.data_fim)    params.data_fim    = filtros.data_fim;

      const [dash, periodo, ranking, etapa] = await Promise.all([
        relatorioService.dashboard(params),
        relatorioService.porPeriodo(params),
        relatorioService.rankingUnidades(params),
        relatorioService.tempoPorEtapa(params),
      ]);

      setDados({
        dashboard: dash.data.relatorio,
        periodo:   periodo.data.dados,
        ranking:   ranking.data.dados,
        etapa:     etapa.data.dados,
      });
    } catch (e) {
      console.error('[RelatoriosPage] Erro ao carregar relatórios:', e);
      setErro('Erro ao carregar relatórios. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => { carregar(); }, [carregar]);

  const d = dados?.dashboard;
  const maxStatus     = d?.porStatus?.reduce((m, x) => Math.max(m, x.total), 0) || 1;
  const maxPrioridade = d?.porPrioridade?.reduce((m, x) => Math.max(m, x.total), 0) || 1;
  const maxTipo       = d?.porTipo?.reduce((m, x) => Math.max(m, x.total), 0) || 1;
  const maxRanking    = dados?.ranking?.reduce((m, x) => Math.max(m, x.total), 0) || 1;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Cabeçalho + filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-0.5">Visão consolidada das demandas e soluções</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={13} />
              <span>De</span>
            </div>
            <input type="date" value={filtros.data_inicio}
              onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-tce-500"
            />
            <span className="text-xs text-gray-400">até</span>
            <input type="date" value={filtros.data_fim}
              onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-tce-500"
            />
            <button onClick={carregar}
              className="p-2 text-gray-500 hover:text-tce-700 border border-gray-300 rounded-lg transition" title="Atualizar">
              <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {erro}
          </div>
        )}

        {carregando && !dados ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Carregando dados...
          </div>
        ) : dados && (
          <>
            {/* Cards de totais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card titulo="Total de Demandas" valor={d?.totais?.total} icon={BarChart2} cor="tce" />
              <Card titulo="Em Andamento"       valor={d?.totais?.emAberto}   icon={Activity}     cor="amber" subtitulo="aguardando ação" />
              <Card titulo="Concluídas"          valor={d?.totais?.concluidas} icon={CheckCircle2} cor="green" subtitulo="em produção ou monitoramento" />
              <Card titulo="Encerradas"          valor={d?.totais?.canceladas} icon={XCircle}      cor="red"   subtitulo="rejeitadas ou canceladas" />
            </div>

            {/* SLA em destaque */}
            {d?.sla && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-tce-600" />
                    <h3 className="text-sm font-semibold text-gray-700">SLA — Conformidade de Prazo</h3>
                  </div>
                  <span className={`text-2xl font-bold ${corSLA(d.sla.percentual_sla, 'texto')}`}>
                    {d.sla.percentual_sla}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ${corSLA(d.sla.percentual_sla, 'barra')}`}
                    style={{ width: `${d.sla.percentual_sla}%` }}
                  />
                </div>
                <div className="flex gap-6 mt-2 text-xs text-gray-500">
                  <span>✅ Em dia: <strong className="text-gray-700">{d.sla.em_dia}</strong></span>
                  <span>⚠️ Atrasado: <strong className="text-gray-700">{d.sla.atrasado}</strong></span>
                  <span>Total de transições: <strong className="text-gray-700">{d.sla.total}</strong></span>
                </div>
              </div>
            )}

            {/* Grid de distribuições */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Por Status */}
              <Secao titulo="Por Status" icon={Activity} className="md:col-span-1">
                {d?.porStatus?.length ? (
                  <div className="space-y-2.5">
                    {d.porStatus.slice(0, 10).map(item => (
                      <BarraHorizontal key={item.status}
                        label={LABEL_STATUS[item.status] || item.status}
                        valor={item.total}
                        max={maxStatus}
                        cor="bg-tce-500"
                      />
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-4">Sem dados</p>}
              </Secao>

              {/* Por Prioridade */}
              <Secao titulo="Por Prioridade" icon={AlertTriangle}>
                {d?.porPrioridade?.length ? (
                  <div className="space-y-2.5">
                    {d.porPrioridade.map(item => (
                      <BarraHorizontal key={item.prioridade}
                        label={LABEL_PRIORIDADE[item.prioridade] || item.prioridade}
                        valor={item.total}
                        max={maxPrioridade}
                        cor={COR_PRIORIDADE[item.prioridade] || 'bg-gray-400'}
                      />
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-4">Sem dados</p>}
              </Secao>

              {/* Por Tipo */}
              <Secao titulo="Por Tipo de Solução" icon={Package}>
                {d?.porTipo?.length ? (
                  <div className="space-y-2.5">
                    {d.porTipo.map(item => (
                      <BarraHorizontal key={item.tipo}
                        label={LABEL_TIPO[item.tipo] || item.tipo}
                        valor={item.total}
                        max={maxTipo}
                        cor={COR_TIPO[item.tipo] || 'bg-gray-400'}
                      />
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-4">Sem dados</p>}
              </Secao>
            </div>

            {/* Evolução por período */}
            <Secao titulo="Evolução Mensal" icon={TrendingUp}>
              {dados.periodo?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Concluídas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Canceladas</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Em aberto</th>
                        <th className="px-3 py-2 text-xs font-semibold text-gray-500">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        const maxPeriodo = Math.max(...dados.periodo.map(r => r.total), 1);
                        return dados.periodo.map(row => (
                          <tr key={row.mes} className="hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-700">{fmtMes(row.mes)}</td>
                            <td className="py-2 px-3 text-right text-gray-700">{row.total}</td>
                            <td className="py-2 px-3 text-right text-green-600">{row.concluidas}</td>
                            <td className="py-2 px-3 text-right text-red-500">{row.canceladas}</td>
                            <td className="py-2 px-3 text-right text-amber-600">{row.em_aberto}</td>
                            <td className="py-2 px-3 w-32">
                              <div className="flex gap-0.5 h-4 items-end">
                                <div className="bg-green-400 rounded-sm flex-none" style={{ width: 8, height: `${pct(row.concluidas, maxPeriodo) || 4}%` }} />
                                <div className="bg-amber-400 rounded-sm flex-none" style={{ width: 8, height: `${pct(row.em_aberto, maxPeriodo) || 4}%` }} />
                                <div className="bg-red-400 rounded-sm flex-none" style={{ width: 8, height: `${pct(row.canceladas, maxPeriodo) || 4}%` }} />
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-6">Sem dados de período</p>}
            </Secao>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Ranking de unidades */}
              <Secao titulo="Top Unidades" icon={Building2}>
                {dados.ranking?.length ? (
                  <div className="space-y-3">
                    {dados.ranking.map((u, i) => (
                      <div key={u.id_unidade} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 truncate">{u.nome_unidade}</span>
                            <span className="text-xs text-gray-500 shrink-0 ml-2">{u.total} dem.</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-tce-500 h-1.5 rounded-full" style={{ width: `${pct(u.total, maxRanking)}%` }} />
                          </div>
                        </div>
                        <span className="text-xs text-green-600 font-semibold w-10 text-right shrink-0">
                          {u.taxa_conclusao}%
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 mt-2">% = taxa de conclusão</p>
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>}
              </Secao>

              {/* Tempo médio por etapa */}
              <Secao titulo="Tempo Médio por Etapa (dias)" icon={Clock}>
                {dados.etapa?.length ? (
                  <div className="space-y-2.5">
                    {dados.etapa.slice(0, 10).map(e => {
                      const maxEtapa = Math.max(...dados.etapa.map(x => x.media_dias || 0), 1);
                      let corBarra;
                      if (e.media_dias > 10) corBarra = 'bg-red-400';
                      else if (e.media_dias > 5) corBarra = 'bg-amber-400';
                      else corBarra = 'bg-green-400';
                      return (
                        <BarraHorizontal key={e.etapa}
                          label={LABEL_STATUS[e.etapa] || e.etapa}
                          valor={e.media_dias ?? 0}
                          max={maxEtapa}
                          cor={corBarra}
                          sufixo="d"
                        />
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-gray-400 text-center py-6">Sem dados de tempo</p>}
              </Secao>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
