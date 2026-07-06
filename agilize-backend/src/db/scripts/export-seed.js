/**
 * db:export — snapshot completo do banco → 001_initial_data.js + 004_estado_atual.js
 *
 * 001_initial_data.js : estrutura (departamentos + unidades) + usuários atuais do banco
 * 004_estado_atual.js : dados transacionais (demandas, histórico, notificações, etc.)
 *
 * Uso: npm run db:export
 */

require('dotenv').config();
const knex = require('knex')(require('../../../knexfile').development);
const fs   = require('fs');
const path = require('path');

const SEEDS_DIR = path.join(__dirname, '../seeds');

// ── Colunas que são IDs de usuário ─────────────────────────────────────────
const USER_ID_COLS_DEMANDA = new Set([
  'id_solicitante',
  'id_analista_sti', 'id_analista_sti_homologacao',
  'id_responsavel_deploy',
  'id_usuario_cancelamento', 'id_usuario_criacao', 'id_usuario_ultima_atualizacao',
]);
const USER_ID_COLS_ATRIB  = new Set(['id_gestor', 'id_usuario_criacao']);
const USER_ID_COLS_INVENT = new Set(['id_responsavel']);

// ── Colunas ignoradas ──────────────────────────────────────────────────────
const SKIP = {
  tb_departamentos:          new Set(['id_departamento']),
  tb_unidades:               new Set(['id_unidade', 'id_departamento', 'ativo', 'data_criacao']),
  tb_usuarios:               new Set(['id_usuario']),
  tb_atribuicoes_gestor:     new Set(['id_atribuicao']),
  tb_demandas:               new Set(['id_demanda', 'ip_criacao']),
  tb_diagnosticos_ia:        new Set(['id_diagnostico', 'id_demanda']),
  tb_inventario_aplicacoes:  new Set(['id_inventario', 'id_demanda']),
  tb_historico_decisoes:     new Set(['id_historico', 'id_demanda', 'numero_demanda', 'id_usuario', 'ip_usuario', 'user_agent']),
  tb_notificacoes:           new Set(['id_notificacao', 'id_demanda', 'id_usuario_destinatario']),
  email_logs:                new Set(['id']),
};

// ── Helpers ────────────────────────────────────────────────────────────────

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function val(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean')        return String(v);
  if (typeof v === 'number')         return String(v);
  if (v instanceof Date)             return JSON.stringify(v.toISOString());
  // Arrays JSONB: o driver pg serializa arrays JS como arrays PG nativos ({...}),
  // incompatível com colunas json/jsonb. Gera JSON.stringify() no código para forçar string.
  if (Array.isArray(v))              return `JSON.stringify(${JSON.stringify(v)})`;
  if (typeof v === 'object')         return JSON.stringify(v);
  return JSON.stringify(String(v));
}

function demandaVar(numero) {
  return 'd' + numero.replace(/[^a-zA-Z0-9]/g, '_');
}

const TRUNCATE_SQL = `
    TRUNCATE
      tb_inventario_aplicacoes,
      tb_diagnosticos_ia,
      tb_atribuicoes_gestor,
      tb_historico_decisoes,
      tb_notificacoes,
      email_logs,
      tb_demandas,
      tb_usuarios,
      tb_unidades,
      tb_departamentos
    RESTART IDENTITY CASCADE
  `;

// ── Gerador: 001_initial_data.js ───────────────────────────────────────────

function gerar001(data) {
  const { departamentos, unidades, usuarios, idToSigla, idToDeptNome } = data;
  const exportDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let c = '';

  c += `// Gerado automaticamente por db:export em ${exportDate}\n`;
  c += `// NÃO edite manualmente — rode: npm run db:export\n\n`;
  c += `exports.seed = async function (knex) {\n`;
  c += `  if (process.env.NODE_ENV === 'production') {\n`;
  c += `    console.warn('[Seed 001] Ignorado em produção.');\n`;
  c += `    return;\n`;
  c += `  }\n\n`;

  c += `  // TRUNCATE CASCADE lida com todas as FKs automaticamente e reseta sequences\n`;
  c += `  await knex.raw(\`${TRUNCATE_SQL}\`);\n\n`;

  // Departamentos
  c += `  // ── Departamentos ──────────────────────────────────────────────────────────\n`;
  c += `  const _dept = {};\n`;
  for (const d of departamentos) {
    const obj = {};
    for (const [col, v] of Object.entries(d)) {
      if (SKIP.tb_departamentos.has(col)) continue;
      obj[col] = v;
    }
    c += `  [_dept[${JSON.stringify(d.nome_departamento)}]] = await knex('tb_departamentos')\n`;
    c += `    .insert(${JSON.stringify(obj)}).returning('*');\n`;
  }

  // Unidades
  c += `\n  // ── Unidades ───────────────────────────────────────────────────────────────\n`;
  c += `  const _unid = {};\n`;

  // Agrupar por departamento para manter ordem lógica
  const unidsPorDept = groupBy(unidades, 'id_departamento');
  for (const dept of departamentos) {
    const grupo = unidsPorDept[dept.id_departamento] || [];
    if (grupo.length === 0) continue;
    c += `  // ${dept.nome_departamento}\n`;
    for (const u of grupo) {
      const obj = { nome_unidade: u.nome_unidade, sigla: u.sigla };
      if (u.descricao) obj.descricao = u.descricao;
      c += `  [_unid[${JSON.stringify(u.sigla)}]] = await knex('tb_unidades')\n`;
      c += `    .insert({ ...${JSON.stringify(obj)}, id_departamento: _dept[${JSON.stringify(dept.nome_departamento)}].id_departamento })\n`;
      c += `    .returning('*');\n`;
    }
  }

  // Usuários
  c += `\n  // ── Usuários ───────────────────────────────────────────────────────────────\n`;
  for (const u of usuarios) {
    const sigla    = idToSigla[u.id_unidade]        ?? null;
    const deptNome = idToDeptNome[u.id_departamento] ?? null;
    c += `  await knex('tb_usuarios').insert({\n`;
    for (const [col, v] of Object.entries(u)) {
      if (SKIP.tb_usuarios.has(col))  continue;
      if (col === 'id_unidade')       { c += `    id_unidade: _unid[${JSON.stringify(sigla)}]?.id_unidade ?? null,\n`; continue; }
      if (col === 'id_departamento')  { c += `    id_departamento: _dept[${JSON.stringify(deptNome)}]?.id_departamento ?? null,\n`; continue; }
      c += `    ${col}: ${val(v)},\n`;
    }
    c += `  });\n`;
  }

  c += `};\n`;
  return c;
}

// ── Gerador: 004_estado_atual.js ───────────────────────────────────────────

function gerar004(data) {
  const {
    atribuicoes, demandas,
    diagnosticosPorDemanda, inventarioPorDemanda,
    historicoPorDemanda, notifsPorDemanda, emailLogs,
    idToEmail, idToSigla, idToDeptNome,
  } = data;

  const exportDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  let c = '';

  c += `// Gerado automaticamente por db:export em ${exportDate}\n`;
  c += `// NÃO edite manualmente — rode: npm run db:export\n\n`;
  c += `exports.seed = async function (knex) {\n`;
  c += `  if (process.env.NODE_ENV === 'production') return;\n\n`;

  const temDados = atribuicoes.length || demandas.length || emailLogs.length;
  if (!temDados) {
    // Não gera conteúdo vazio — retorna null para o main ignorar a escrita
    return null;
  }

  // Lookups dinâmicos
  c += `  // ── Resolução de IDs dinâmicos ──────────────────────────────────────────\n`;
  c += `  const _u  = Object.fromEntries((await knex('tb_usuarios').select('id_usuario','email')).map(r => [r.email, r.id_usuario]));\n`;
  c += `  const _un = Object.fromEntries((await knex('tb_unidades').select('id_unidade','sigla')).map(r => [r.sigla, r.id_unidade]));\n`;
  c += `  const _dp = Object.fromEntries((await knex('tb_departamentos').select('id_departamento','nome_departamento')).map(r => [r.nome_departamento, r.id_departamento]));\n`;
  c += `  const uid  = (email) => email ? (_u[email]  ?? null) : null;\n`;
  c += `  const unid = (sigla) => sigla ? (_un[sigla] ?? null) : null;\n`;
  c += `  const dpid = (nome)  => nome  ? (_dp[nome]  ?? null) : null;\n\n`;

  // Atribuições de gestor
  if (atribuicoes.length > 0) {
    c += `  // ── Atribuições de gestor ──────────────────────────────────────────────────\n`;
    c += `  await knex('tb_atribuicoes_gestor').insert([\n`;
    for (const a of atribuicoes) {
      c += `    {\n`;
      for (const [col, v] of Object.entries(a)) {
        if (SKIP.tb_atribuicoes_gestor.has(col)) continue;
        if (USER_ID_COLS_ATRIB.has(col))  { c += `      ${col}: uid(${JSON.stringify(idToEmail[v] ?? null)}),\n`; continue; }
        if (col === 'id_unidade')         { c += `      id_unidade: unid(${JSON.stringify(idToSigla[v] ?? null)}),\n`; continue; }
        if (col === 'id_departamento')    { c += `      id_departamento: dpid(${JSON.stringify(idToDeptNome[v] ?? null)}),\n`; continue; }
        c += `      ${col}: ${val(v)},\n`;
      }
      c += `    },\n`;
    }
    c += `  ]).onConflict(['id_gestor', 'id_unidade']).merge();\n\n`;
  }

  // Demandas + filhos
  for (const d of demandas) {
    const vn   = demandaVar(d.numero_demanda);
    const sigla = idToSigla[d.id_unidade]        ?? null;
    const dept  = idToDeptNome[d.id_departamento] ?? null;

    c += `  // ── ${d.numero_demanda}: ${d.titulo.slice(0, 55)} ──\n`;
    c += `  const [${vn}] = await knex('tb_demandas').insert({\n`;
    for (const [col, v] of Object.entries(d)) {
      if (SKIP.tb_demandas.has(col))         continue;
      if (col === 'id_unidade')              { c += `    id_unidade: unid(${JSON.stringify(sigla)}),\n`; continue; }
      if (col === 'id_departamento')         { c += `    id_departamento: dpid(${JSON.stringify(dept)}),\n`; continue; }
      if (USER_ID_COLS_DEMANDA.has(col))     { c += `    ${col}: uid(${JSON.stringify(idToEmail[v] ?? null)}),\n`; continue; }
      c += `    ${col}: ${val(v)},\n`;
    }
    c += `  }).returning('*');\n\n`;

    // Diagnósticos IA
    const diags = diagnosticosPorDemanda[d.id_demanda] || [];
    if (diags.length > 0) {
      c += `  await knex('tb_diagnosticos_ia').insert([\n`;
      for (const g of diags) {
        c += `    { id_demanda: ${vn}.id_demanda,\n`;
        for (const [col, v] of Object.entries(g)) {
          if (SKIP.tb_diagnosticos_ia.has(col)) continue;
          c += `      ${col}: ${val(v)},\n`;
        }
        c += `    },\n`;
      }
      c += `  ]);\n\n`;
    }

    // Inventário
    const inv = inventarioPorDemanda[d.id_demanda];
    if (inv) {
      c += `  await knex('tb_inventario_aplicacoes').insert({\n`;
      c += `    id_demanda: ${vn}.id_demanda,\n`;
      c += `    numero_demanda: ${vn}.numero_demanda,\n`;
      for (const [col, v] of Object.entries(inv)) {
        if (SKIP.tb_inventario_aplicacoes.has(col)) continue;
        if (col === 'numero_demanda') continue;
        if (USER_ID_COLS_INVENT.has(col)) { c += `    ${col}: uid(${JSON.stringify(idToEmail[v] ?? null)}),\n`; continue; }
        if (col === 'id_unidade')         { c += `    id_unidade: unid(${JSON.stringify(idToSigla[v] ?? null)}),\n`; continue; }
        c += `    ${col}: ${val(v)},\n`;
      }
      c += `  });\n\n`;
    }

    // Histórico
    const hist = historicoPorDemanda[d.id_demanda] || [];
    if (hist.length > 0) {
      c += `  await knex('tb_historico_decisoes').insert([\n`;
      for (const h of hist) {
        c += `    { id_demanda: ${vn}.id_demanda, numero_demanda: ${vn}.numero_demanda,\n`;
        c += `      id_usuario: uid(${JSON.stringify(idToEmail[h.id_usuario] ?? null)}),\n`;
        for (const [col, v] of Object.entries(h)) {
          if (SKIP.tb_historico_decisoes.has(col)) continue;
          c += `      ${col}: ${val(v)},\n`;
        }
        c += `    },\n`;
      }
      c += `  ]);\n\n`;
    }

    // Notificações
    const notifs = notifsPorDemanda[d.id_demanda] || [];
    if (notifs.length > 0) {
      c += `  await knex('tb_notificacoes').insert([\n`;
      for (const n of notifs) {
        c += `    { id_demanda: ${vn}.id_demanda, numero_demanda: ${vn}.numero_demanda,\n`;
        c += `      id_usuario_destinatario: uid(${JSON.stringify(idToEmail[n.id_usuario_destinatario] ?? null)}),\n`;
        for (const [col, v] of Object.entries(n)) {
          if (SKIP.tb_notificacoes.has(col)) continue;
          if (col === 'numero_demanda') continue;
          c += `      ${col}: ${val(v)},\n`;
        }
        c += `    },\n`;
      }
      c += `  ]);\n\n`;
    }
  }

  // Email logs
  if (emailLogs.length > 0) {
    c += `  // ── Email logs ─────────────────────────────────────────────────────────────\n`;
    c += `  await knex('email_logs').insert([\n`;
    for (const e of emailLogs) {
      c += `    {\n`;
      for (const [col, v] of Object.entries(e)) {
        if (SKIP.email_logs.has(col)) continue;
        c += `      ${col}: ${val(v)},\n`;
      }
      c += `    },\n`;
    }
    c += `  ]);\n\n`;
  }

  c += `};\n`;
  return c;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Guard: verifica se há dados mínimos antes de sobrescrever os seeds
  const [totalUsuarios, totalDemandas] = await Promise.all([
    knex('tb_usuarios').count('* as n').first().then(r => Number(r.n)),
    knex('tb_demandas').count('* as n').first().then(r => Number(r.n)),
  ]);
  if (totalUsuarios < 3) {
    console.error('[db:export] Abortado: banco tem menos de 3 usuários. Rode npm run db:reset primeiro.');
    process.exit(1);
  }

  const [
    departamentos, unidades, usuarios, atribuicoes,
    demandas, diagnosticos, inventarios,
    historico, notificacoes, emailLogs,
  ] = await Promise.all([
    knex('tb_departamentos').orderBy('id_departamento'),
    knex('tb_unidades').orderBy('id_unidade'),
    knex('tb_usuarios').orderBy('id_usuario'),
    knex('tb_atribuicoes_gestor').orderBy('id_atribuicao'),
    knex('tb_demandas').where('ativo', true).orderBy('id_demanda'),
    knex('tb_diagnosticos_ia').orderBy('id_diagnostico'),
    knex('tb_inventario_aplicacoes').orderBy('id_inventario'),
    knex('tb_historico_decisoes').orderBy('id_historico'),
    knex('tb_notificacoes').orderBy('id_notificacao'),
    knex('email_logs').orderBy('id'),
  ]);

  const idToEmail    = Object.fromEntries(usuarios.map(u => [u.id_usuario, u.email]));
  const idToSigla    = Object.fromEntries(unidades.map(u => [u.id_unidade, u.sigla]));
  const idToDeptNome = Object.fromEntries(departamentos.map(d => [d.id_departamento, d.nome_departamento]));

  const sharedData = { idToEmail, idToSigla, idToDeptNome };

  // Gerar 001_initial_data.js
  const codigo001 = gerar001({ departamentos, unidades, usuarios, ...sharedData });
  fs.writeFileSync(path.join(SEEDS_DIR, '001_initial_data.js'), codigo001, 'utf8');

  // Gerar 004_estado_atual.js
  const codigo004 = gerar004({
    atribuicoes, demandas,
    diagnosticosPorDemanda: groupBy(diagnosticos, 'id_demanda'),
    inventarioPorDemanda:   Object.fromEntries(inventarios.map(i => [i.id_demanda, i])),
    historicoPorDemanda:    groupBy(historico, 'id_demanda'),
    notifsPorDemanda:       groupBy(notificacoes, 'id_demanda'),
    emailLogs,
    ...sharedData,
  });

  if (codigo004 === null) {
    console.warn('[db:export] 004_estado_atual.js NÃO sobrescrito — banco sem dados transacionais.');
  } else {
    fs.writeFileSync(path.join(SEEDS_DIR, '004_estado_atual.js'), codigo004, 'utf8');
  }

  console.log(`[db:export] 001_initial_data.js atualizado:`);
  console.log(`  ${departamentos.length} departamento(s)`);
  console.log(`  ${unidades.length} unidade(s)`);
  console.log(`  ${usuarios.length} usuário(s)`);
  console.log(`[db:export] 004_estado_atual.js atualizado:`);
  console.log(`  ${atribuicoes.length} atribuição(ões) de gestor`);
  console.log(`  ${demandas.length} demanda(s)`);
  console.log(`  ${diagnosticos.length} diagnóstico(s) IA`);
  console.log(`  ${inventarios.length} item(ns) de inventário`);
  console.log(`  ${historico.length} entrada(s) de histórico`);
  console.log(`  ${notificacoes.length} notificação(ões)`);
  console.log(`  ${emailLogs.length} email log(s)`);
  console.log(`[db:export] Para restaurar: npm run seed`);
}

main()
  .catch(err => { console.error('[db:export] Erro:', err.message); process.exit(1); })
  .finally(() => knex.destroy());
