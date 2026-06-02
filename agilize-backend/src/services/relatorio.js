const db = require('../db/connection');

// Estados considerados "concluídos" (em produção ou pós-produção)
const STATUS_CONCLUIDOS = ['EM_PRODUCAO', 'EM_MONITORAMENTO', 'DESATIVADA'];
const STATUS_TERMINAIS  = ['REJEITADA', 'REPROVADA_STI', 'CANCELADA'];

function aplicarPeriodo(query, { dataInicio, dataFim }, campo = 'data_criacao') {
  if (dataInicio) query = query.where(campo, '>=', dataInicio);
  if (dataFim)    query = query.where(campo, '<=', dataFim);
  return query;
}

// ─── Dashboard geral ──────────────────────────────────────────────────────────

async function dashboard(filtros = {}) {
  const [porStatus, porPrioridade, porTipo, totais, sla] = await Promise.all([
    demandas_por_status(filtros),
    demandas_por_prioridade(filtros),
    demandas_por_tipo(filtros),
    _totais(filtros),
    sla_compliance(filtros),
  ]);
  return { totais, porStatus, porPrioridade, porTipo, sla };
}

async function _totais({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas').where('ativo', true);
  q = aplicarPeriodo(q, { dataInicio, dataFim });

  const [total, concluidas, canceladas, emAberto] = await Promise.all([
    q.clone().count('* as n').first(),
    q.clone().whereIn('status_atual', STATUS_CONCLUIDOS).count('* as n').first(),
    q.clone().whereIn('status_atual', STATUS_TERMINAIS).count('* as n').first(),
    q.clone().whereNotIn('status_atual', [...STATUS_CONCLUIDOS, ...STATUS_TERMINAIS]).count('* as n').first(),
  ]);

  return {
    total:     parseInt(total.n),
    concluidas: parseInt(concluidas.n),
    canceladas: parseInt(canceladas.n),
    emAberto:  parseInt(emAberto.n),
  };
}

// ─── Por status ───────────────────────────────────────────────────────────────

async function demandas_por_status({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas')
    .where('ativo', true)
    .select('status_atual')
    .count('* as total')
    .groupBy('status_atual')
    .orderBy('total', 'desc');
  q = aplicarPeriodo(q, { dataInicio, dataFim });
  const rows = await q;
  return rows.map(r => ({ status: r.status_atual, total: parseInt(r.total) }));
}

// ─── Por prioridade ───────────────────────────────────────────────────────────

async function demandas_por_prioridade({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas')
    .where('ativo', true)
    .select('prioridade')
    .count('* as total')
    .groupBy('prioridade')
    .orderByRaw(`CASE prioridade
      WHEN 'CRITICA' THEN 1
      WHEN 'ALTA'    THEN 2
      WHEN 'MEDIA'   THEN 3
      WHEN 'BAIXA'   THEN 4
      ELSE 5 END`);
  q = aplicarPeriodo(q, { dataInicio, dataFim });
  const rows = await q;
  return rows.map(r => ({ prioridade: r.prioridade, total: parseInt(r.total) }));
}

// ─── Por tipo de solução ──────────────────────────────────────────────────────

async function demandas_por_tipo({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas')
    .where('ativo', true)
    .select('tipo_solucao')
    .count('* as total')
    .groupBy('tipo_solucao')
    .orderBy('total', 'desc');
  q = aplicarPeriodo(q, { dataInicio, dataFim });
  const rows = await q;
  return rows.map(r => ({ tipo: r.tipo_solucao, total: parseInt(r.total) }));
}

// ─── SLA Compliance ───────────────────────────────────────────────────────────

async function sla_compliance({ dataInicio, dataFim } = {}) {
  let q = db('tb_historico_decisoes').select(
    db.raw('COUNT(*) as total'),
    db.raw('SUM(CASE WHEN sla_em_dia = true THEN 1 ELSE 0 END) as em_dia'),
    db.raw('SUM(CASE WHEN sla_em_dia = false THEN 1 ELSE 0 END) as atrasado')
  );
  q = aplicarPeriodo(q, { dataInicio, dataFim }, 'data_hora');
  const row = await q.first();
  const total    = parseInt(row.total)    || 0;
  const emDia    = parseInt(row.em_dia)   || 0;
  const atrasado = parseInt(row.atrasado) || 0;
  return {
    total,
    em_dia: emDia,
    atrasado,
    percentual_sla: total > 0 ? Math.round((emDia / total) * 100) : 100,
  };
}

// ─── Tempo médio por etapa ────────────────────────────────────────────────────

async function tempo_medio_por_etapa({ dataInicio, dataFim } = {}) {
  let q = db('tb_historico_decisoes')
    .select('status_novo')
    .avg('duracao_etapa_dias as media_dias')
    .min('duracao_etapa_dias as min_dias')
    .max('duracao_etapa_dias as max_dias')
    .count('* as total_transicoes')
    .whereNotNull('duracao_etapa_dias')
    .groupBy('status_novo')
    .orderBy('status_novo');
  q = aplicarPeriodo(q, { dataInicio, dataFim }, 'data_hora');
  const rows = await q;
  return rows.map(r => ({
    etapa: r.status_novo,
    media_dias: r.media_dias !== null ? parseFloat(parseFloat(r.media_dias).toFixed(1)) : null,
    min_dias: r.min_dias,
    max_dias: r.max_dias,
    total_transicoes: parseInt(r.total_transicoes),
  }));
}

// ─── Por período (agrupado por mês) ──────────────────────────────────────────

async function demandas_por_periodo({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas')
    .where('ativo', true)
    .select(
      db.raw("TO_CHAR(data_criacao, 'YYYY-MM') as mes"),
      db.raw('COUNT(*) as total'),
      db.raw(`SUM(CASE WHEN status_atual IN (${STATUS_CONCLUIDOS.map(() => '?').join(',')}) THEN 1 ELSE 0 END) as concluidas`, STATUS_CONCLUIDOS),
      db.raw(`SUM(CASE WHEN status_atual IN (${STATUS_TERMINAIS.map(() => '?').join(',')}) THEN 1 ELSE 0 END) as canceladas`, STATUS_TERMINAIS)
    )
    .groupByRaw("TO_CHAR(data_criacao, 'YYYY-MM')")
    .orderBy('mes');
  q = aplicarPeriodo(q, { dataInicio, dataFim });
  const rows = await q;
  return rows.map(r => ({
    mes: r.mes,
    total:      parseInt(r.total),
    concluidas: parseInt(r.concluidas),
    canceladas: parseInt(r.canceladas),
    em_aberto:  parseInt(r.total) - parseInt(r.concluidas) - parseInt(r.canceladas),
  }));
}

// ─── Ranking por unidade ──────────────────────────────────────────────────────

async function ranking_unidades({ dataInicio, dataFim } = {}) {
  let q = db('tb_demandas')
    .where('tb_demandas.ativo', true)
    .select(
      'tb_demandas.id_unidade',
      'tb_demandas.nome_unidade',
      db.raw('COUNT(*) as total'),
      db.raw(`SUM(CASE WHEN status_atual IN (${STATUS_CONCLUIDOS.map(() => '?').join(',')}) THEN 1 ELSE 0 END) as concluidas`, STATUS_CONCLUIDOS)
    )
    .groupBy('tb_demandas.id_unidade', 'tb_demandas.nome_unidade')
    .orderBy('total', 'desc')
    .limit(10);
  q = aplicarPeriodo(q, { dataInicio, dataFim }, 'tb_demandas.data_criacao');
  const rows = await q;
  return rows.map(r => ({
    id_unidade:   r.id_unidade,
    nome_unidade: r.nome_unidade || '(sem unidade)',
    total:        parseInt(r.total),
    concluidas:   parseInt(r.concluidas),
    taxa_conclusao: parseInt(r.total) > 0
      ? Math.round((parseInt(r.concluidas) / parseInt(r.total)) * 100)
      : 0,
  }));
}

module.exports = {
  dashboard,
  demandas_por_status,
  demandas_por_prioridade,
  demandas_por_tipo,
  sla_compliance,
  tempo_medio_por_etapa,
  demandas_por_periodo,
  ranking_unidades,
};
