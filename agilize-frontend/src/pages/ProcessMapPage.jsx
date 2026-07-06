import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Layout from '../components/Layout';
import { Bot, Map } from 'lucide-react';

// ─── Paleta por tipo de estado ─────────────────────────────────────────────────
const TIPO = {
  normal:    { border: '#94a3b8', bg: '#f8fafc', text: '#1e293b' },
  terminal:  { border: '#ef4444', bg: '#fff1f2', text: '#7f1d1d' },
  loop:      { border: '#f59e0b', bg: '#fffbeb', text: '#78350f' },
  dpo:       { border: '#6366f1', bg: '#eef2ff', text: '#312e81' },
  avaliador: { border: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95' },
  aprovacao: { border: '#16a34a', bg: '#f0fdf4', text: '#14532d' },
  ia:        { border: '#2563eb', bg: '#eff6ff', text: '#1e3a8a' },
};

const ATOR_PILL = {
  'Solicitante':  'bg-blue-50 text-blue-700',
  'Gestor':       'bg-amber-50 text-amber-700',
  'Analista STI': 'bg-indigo-50 text-indigo-700',
  'Avaliador Técnico':  'bg-violet-50 text-violet-700',
  'DPO':          'bg-pink-50 text-pink-700',
  'Ops STI':      'bg-emerald-50 text-emerald-700',
};

// ─── Nó: estado do fluxo ───────────────────────────────────────────────────────
function StateNode({ data }) {
  const s = TIPO[data.tipo] ?? TIPO.normal;
  const h = { background: s.border, width: 5, height: 5, border: 'none' };
  // Handles distribuídos para evitar sobreposição de arestas:
  //  bottom-s  = saída centro-inferior   bottom-s2 = saída esquerda-inferior   bottom-s3 = saída direita-inferior
  //  top-t     = entrada centro-superior  top-t2    = entrada esquerda-superior
  //  top-s     = saída centro-superior    top-s2    = saída direita-superior
  return (
    <>
      <Handle type="target" position={Position.Left}   style={h} />
      <Handle type="source" position={Position.Right}  style={h} />
      <Handle type="target" position={Position.Top}    id="top-t"    style={{ ...h, left: '50%' }} />
      <Handle type="target" position={Position.Top}    id="top-t2"   style={{ ...h, left: '25%' }} />
      <Handle type="source" position={Position.Top}    id="top-s"    style={{ ...h, left: '50%' }} />
      <Handle type="source" position={Position.Top}    id="top-s2"   style={{ ...h, left: '75%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s"  style={{ ...h, left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s2" style={{ ...h, left: '25%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s3" style={{ ...h, left: '75%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-t"  style={{ ...h, left: '50%' }} />
      <div
        className="rounded-lg px-2.5 py-2 cursor-default select-none shadow-sm"
        style={{ background: s.bg, border: `1.5px solid ${s.border}`, minWidth: 136 }}
        title={data.status}
      >
        {data.ator && (
          <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full inline-block mb-1 ${ATOR_PILL[data.ator] ?? 'bg-gray-50 text-gray-600'}`}>
            {data.ator}
          </span>
        )}
        <div className="flex items-center gap-1">
          <p className="text-[10px] font-semibold leading-tight flex-1" style={{ color: s.text }}>
            {data.label}
          </p>
          {data.ia && <Bot size={9} className="text-blue-500 shrink-0" />}
        </div>
        <p className="text-[7px] font-mono mt-1 leading-none" style={{ color: s.border, opacity: 0.7 }}>
          {data.status}
        </p>
      </div>
    </>
  );
}

// ─── Nó: fundo de fase ─────────────────────────────────────────────────────────
function BackgroundNode({ data }) {
  return (
    <div
      style={{
        width: '100%', height: '100%',
        background: data.bg,
        border: `1px solid ${data.border}`,
        borderRadius: 12,
        pointerEvents: 'none',
        padding: '10px 16px',
      }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: data.color }}>
        {data.label}
      </span>
    </div>
  );
}

const nodeTypes = { state: StateNode, background: BackgroundNode };

// ─── Helper para arestas ────────────────────────────────────────────────────────
const GRAY = '#94a3b8';
const DPO  = '#6366f1';
const DIR  = '#8b5cf6';
const ERR  = '#ef4444';
const GRN  = '#16a34a';
const AMB  = '#f59e0b';

// Cor de fundo do label por ator que realiza a ação
const BG = {
  S: '#dbeafe',  // Solicitante  — blue-100
  G: '#fef3c7',  // Gestor       — amber-100
  I: '#e0e7ff',  // Analista STI — indigo-100
  D: '#ede9fe',  // Avaliador Técnico  — violet-100
  P: '#fce7f3',  // DPO          — pink-100
  O: '#d1fae5',  // Ops STI      — emerald-100
  E: '#fee2e2',  // Encerramento — red-100
  N: '#f1f5f9',  // Neutro/sistema — slate-100
};

// curved=true  → bezier (arco natural, evita concorrência visual com segmentos retos)
// condition=true → estilo de guarda de sistema (itálico, borda tracejada, sem ação de usuário)
const mkEdge = (id, source, target, {
  label, color = GRAY, dashed = false, width = 1.5,
  from, to, bg = BG.N, curved = false, condition = false,
} = {}) => ({
  id,
  source,
  target,
  type: curved ? 'bezier' : 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color },
  style: { stroke: color, strokeWidth: width, strokeDasharray: dashed ? '6 4' : undefined },
  label,
  // Texto na mesma cor da borda da aresta
  labelStyle: {
    fontSize: condition ? 9 : 11,
    fill: color,
    fontFamily: 'inherit',
    fontWeight: condition ? 500 : 600,
    fontStyle: condition ? 'italic' : 'normal',
  },
  // Condições de sistema recebem borda tracejada para distinguir de ações de usuário
  labelBgStyle: {
    fill: condition ? BG.N : bg,
    fillOpacity: 1,
    stroke: color,
    strokeWidth: 0.8,
    strokeDasharray: condition ? '3 2' : undefined,
  },
  labelBgPadding: [5, 8],
  labelBgBorderRadius: 4,
  sourceHandle: from,
  targetHandle: to,
});

// ─── Grid visual ─────────────────────────────────────────────────────────────
//
//  Colunas (x): C1=80  C2=410  C3=740  C4=1070  C5=1400  (330px entre colunas)
//  Fase 1 — L1=y:210  L2=y:520  L3=y:800
//  Fase 2 — y:987
//  Fase 3 — L1=y:1170  L2=y:1450  L3=y:1660
//  Fase 4 — y:1800

const BG_NODES = [
  {
    id: 'bg-1', type: 'background',
    position: { x: 30, y: 50 },
    style: { width: 1900, height: 880, zIndex: -1 },
    selectable: false, draggable: false,
    data: { label: 'Fase 1 — Solicitação', bg: 'rgba(239,246,255,0.45)', border: '#bfdbfe', color: '#1d4ed8' },
  },
  {
    id: 'bg-2', type: 'background',
    position: { x: 30, y: 950 },
    style: { width: 1900, height: 160, zIndex: -1 },
    selectable: false, draggable: false,
    data: { label: 'Fase 2 — Desenvolvimento', bg: 'rgba(255,251,235,0.45)', border: '#fde68a', color: '#b45309' },
  },
  {
    id: 'bg-3', type: 'background',
    position: { x: 30, y: 1130 },
    style: { width: 1900, height: 650, zIndex: -1 },
    selectable: false, draggable: false,
    data: { label: 'Fase 3 — Homologação', bg: 'rgba(245,243,255,0.45)', border: '#ddd6fe', color: '#5b21b6' },
  },
  {
    id: 'bg-4', type: 'background',
    position: { x: 30, y: 1800 },
    style: { width: 1900, height: 170, zIndex: -1 },
    selectable: false, draggable: false,
    data: { label: 'Fase 4 — Produção', bg: 'rgba(240,253,244,0.45)', border: '#bbf7d0', color: '#15803d' },
  },
];

const STATE_NODES = [
  // ── Fase 1 — L1: fluxo principal ───────────────────────────────────────────
  { id: 'DRAFT',           type: 'state', position: { x: 80,   y: 210 }, data: { label: 'Rascunho',           ator: 'Solicitante',  status: 'DRAFT',           tipo: 'normal'    } },
  { id: 'PENDENTE_GESTOR', type: 'state', position: { x: 410,  y: 210 }, data: { label: 'Aguardando Gestor',  ator: 'Gestor',       status: 'PENDENTE_GESTOR', tipo: 'normal'    } },
  { id: 'VALIDADA_GESTOR', type: 'state', position: { x: 740,  y: 210 }, data: { label: 'Validada p/ Gestor', ator: 'Gestor',       status: 'VALIDADA_GESTOR', tipo: 'normal'    } },
  { id: 'FILA_STI',        type: 'state', position: { x: 1070, y: 210 }, data: { label: 'Fila STI',           ator: 'Analista STI', status: 'FILA_STI',        tipo: 'ia', ia: true } },
  { id: 'APROVADA_STI',    type: 'state', position: { x: 1400, y: 210 }, data: { label: 'Aprovada pela STI',  ator: 'Analista STI', status: 'APROVADA_STI',    tipo: 'aprovacao' } },

  // ── Fase 1 — L2: ramificações ──────────────────────────────────────────────
  // REJEITADA fica em C1 (esquerda) para não cruzar com DEVOLVIDA
  // AGUARDANDO_DPO deslocado +120px à direita de VALIDADA_GESTOR para que o
  //   retorno (DPO→FILA_STI via top-s/top-t) suba pelo corredor livre entre C3 e C4
  // AGUARDANDO_AVALIADOR deslocado +120px à direita de APROVADA_STI para que o
  //   retorno (DIR→FILA_STI via top-s/top-t2) suba pelo corredor livre à direita de APROVADA
  { id: 'REJEITADA',              type: 'state', position: { x: 80,   y: 520 }, data: { label: 'Rejeitada',           ator: 'Gestor',      status: 'REJEITADA',              tipo: 'terminal' } },
  { id: 'DEVOLVIDA_AJUSTES',      type: 'state', position: { x: 410,  y: 520 }, data: { label: 'Devolvida p/ Ajuste', ator: 'Solicitante', status: 'DEVOLVIDA_AJUSTES',      tipo: 'loop'     } },
  { id: 'AGUARDANDO_DPO',         type: 'state', position: { x: 860,  y: 520 }, data: { label: 'Aguardando DPO',      ator: 'DPO',         status: 'AGUARDANDO_DPO',         tipo: 'dpo'      } },
  { id: 'SOLICITADO_AJUSTES_STI', type: 'state', position: { x: 1070, y: 520 }, data: { label: 'Ajustes Solicitados', ator: 'Solicitante', status: 'SOLICITADO_AJUSTES_STI', tipo: 'loop'     } },
  { id: 'AGUARDANDO_AVALIADOR',     type: 'state', position: { x: 1520, y: 520 }, data: { label: 'Ag. Avaliador Técnico',  ator: 'Avaliador Técnico', status: 'AGUARDANDO_AVALIADOR',      tipo: 'avaliador'  } },

  // ── Fase 1 — L3: convergência + terminal reprovação ────────────────────────
  { id: 'SOLICITANTE_AJUSTANDO', type: 'state', position: { x: 740,  y: 800 }, data: { label: 'Solicitante Ajustando', ator: 'Solicitante',  status: 'SOLICITANTE_AJUSTANDO', tipo: 'loop'     } },
  // REPROVADA na mesma faixa L2 (y=520) à direita do AGUARDANDO_AVALIADOR (x=1520) — elimina cruzamento com APROVADA_STI
  { id: 'REPROVADA_STI',         type: 'state', position: { x: 1700, y: 520 }, data: { label: 'Reprovada pela STI',   ator: 'Analista STI', status: 'REPROVADA_STI',         tipo: 'terminal' } },

  // ── Fase 2 ─────────────────────────────────────────────────────────────────
  { id: 'CANCELADA',             type: 'state', position: { x: 80,   y: 987 }, data: { label: 'Cancelada',           status: 'CANCELADA',             tipo: 'terminal' } },
  { id: 'EM_DESENVOLVIMENTO',    type: 'state', position: { x: 740,  y: 987 }, data: { label: 'Em Desenvolvimento',  ator: 'Solicitante', status: 'EM_DESENVOLVIMENTO',    tipo: 'normal'   } },
  { id: 'SUBMETIDO_HOMOLOGACAO', type: 'state', position: { x: 1070, y: 987 }, data: { label: 'Submetido p/ Hom.',  ator: 'Gestor',      status: 'SUBMETIDO_HOMOLOGACAO', tipo: 'normal'   } },

  // ── Fase 3 — L1: fluxo principal ───────────────────────────────────────────
  { id: 'PENDENTE_HOMOLOGACAO_GESTOR', type: 'state', position: { x: 410,  y: 1180 }, data: { label: 'Ag. Gestor (Hom.)', ator: 'Gestor',       status: 'PENDENTE_HOMOLOGACAO_GESTOR', tipo: 'normal'    } },
  { id: 'VALIDADA_HOMOLOGACAO_GESTOR', type: 'state', position: { x: 740,  y: 1180 }, data: { label: 'Validada (Hom.)',   ator: 'Gestor',       status: 'VALIDADA_HOMOLOGACAO_GESTOR', tipo: 'normal'    } },
  { id: 'FILA_HOMOLOGACAO_STI',        type: 'state', position: { x: 1070, y: 1180 }, data: { label: 'Fila Hom. STI',    ator: 'Analista STI', status: 'FILA_HOMOLOGACAO_STI',        tipo: 'ia', ia: true } },
  { id: 'HOMOLOGADA',                  type: 'state', position: { x: 1400, y: 1180 }, data: { label: 'Homologada',       ator: 'Analista STI', status: 'HOMOLOGADA',                  tipo: 'aprovacao' } },

  // ── Fase 3 — L2: ramificações (mesmo deslocamento da Fase 1) ─────────────
  { id: 'DEVOLVIDA_HOMOLOGACAO',          type: 'state', position: { x: 410,  y: 1470 }, data: { label: 'Devolvida (Hom.)',    ator: 'Solicitante',  status: 'DEVOLVIDA_HOMOLOGACAO',          tipo: 'loop'    } },
  { id: 'AGUARDANDO_DPO_HOMOLOGACAO',     type: 'state', position: { x: 860,  y: 1470 }, data: { label: 'Ag. DPO (Hom.)',     ator: 'DPO',          status: 'AGUARDANDO_DPO_HOMOLOGACAO',     tipo: 'dpo'     } },
  { id: 'SOLICITADO_AJUSTES_HOMOLOGACAO', type: 'state', position: { x: 1070, y: 1470 }, data: { label: 'Ajustes (Hom.)',     ator: 'Solicitante',  status: 'SOLICITADO_AJUSTES_HOMOLOGACAO', tipo: 'loop'    } },
  { id: 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', type: 'state', position: { x: 1520, y: 1470 }, data: { label: 'Ag. Avaliador (Hom.)', ator: 'Avaliador Técnico',  status: 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', tipo: 'avaliador' } },

  // ── Fase 3 — L3: convergência ──────────────────────────────────────────────
  { id: 'AJUSTANDO_HOMOLOGACAO', type: 'state', position: { x: 740, y: 1680 }, data: { label: 'Ajustando (Hom.)', ator: 'Solicitante', status: 'AJUSTANDO_HOMOLOGACAO', tipo: 'loop' } },

  // ── Fase 4 ─────────────────────────────────────────────────────────────────
  { id: 'EM_PRODUCAO',      type: 'state', position: { x: 740,  y: 1840 }, data: { label: 'Em Produção',      ator: 'Ops STI',      status: 'EM_PRODUCAO',      tipo: 'normal'    } },
  { id: 'EM_MONITORAMENTO', type: 'state', position: { x: 1070, y: 1840 }, data: { label: 'Em Monitoramento', ator: 'Ops STI',      status: 'EM_MONITORAMENTO', tipo: 'aprovacao' } },
  { id: 'DESATIVADA',       type: 'state', position: { x: 1400, y: 1840 }, data: { label: 'Desativada',       ator: 'Analista STI', status: 'DESATIVADA',       tipo: 'terminal'  } },
];

const INITIAL_NODES = [...BG_NODES, ...STATE_NODES];

// ─── Arestas ────────────────────────────────────────────────────────────────────
//
// Estratégia de handles:
//  - Fluxo horizontal (L1→L1): esquerda → direita (padrão)
//  - Descida (L1→L2): saída bottom-s, entrada top-t
//  - Convergência para SOLICITANTE_AJUSTANDO/AJUSTANDO_HOMOLOGACAO: saída bottom-s, entrada top-t
//  - Retorno de loop (L3→L1): saída top-s para subir de volta

// ─── Estratégia de roteamento (sem sobreposição de linhas) ────────────────────
//
//  REGRA 1 — Fluxo horizontal L1→L1: handles padrão (direita → esquerda auto)
//  REGRA 2 — Descida L1→L2 mesma coluna: bottom-s → top-t  (reta vertical)
//  REGRA 3 — Descida L1→L2 coluna diferente:
//              Pendente→Rejeitada (esq):   bottom-s2 → top-t  (saída esq-inferior)
//              FILA→SOL_AJ_STI (mesma):    bottom-s  → top-t  (reta)
//              FILA→AGU_AVALIADOR (direita):  bottom-s3 → top-t  (saída dir-inferior)
//              FILA→REPROVADA (dir+baixo):  right     → top-t  (saída direita)
//  REGRA 4 — Retorno DPO→FILA_STI: top-s → top-t
//              DPO deslocado para x=860; o corredor entre C3(740) e C4(1070)
//              está livre acima de y=210 — caminho sobe sem cruzar nó algum.
//  REGRA 5 — Retorno AVALIADOR→FILA_STI: top-s → top-t2
//              AVALIADOR deslocado para x=1520; corredor à direita de APROVADA(1400)
//              está livre acima de y=210 — caminho sobe sem cruzar nó algum.
//  REGRA 6 — Loop-back L3→L1: left → top-t2
//              Sai pela esquerda, sobe pelo corredor a x≈550 (livre) e
//              entra pelo topo-esquerdo do PENDENTE_GESTOR.
//  REGRA 7 — Convergência L2→L3 (fan-in em SOL_AJ):
//              Nós à esquerda/centro: bottom-s → top-t  (descida normal)
//              Nós à direita: bottom-s2 → top-t  (saída esquerda-inferior para não
//              sobrepor com a descida central)

// ── Estratégia visual de arestas ──────────────────────────────────────────────
//
//  smoothstep  → transições locais (mesma fase, colunas adjacentes, descidas diretas)
//  bezier      → saltos inter-fase, retornos e caminhos longos que precisam de arco
//                natural para não concorrer com segmentos retos ao redor
//
//  condition   → guarda de sistema (routing automático por dados sensíveis —
//                NÃO é uma ação de usuário): itálico, borda tracejada, texto menor
//
//  Handles: bottom-s (centro), bottom-s2 (esquerda), bottom-s3 (direita) separam
//           as saídas de nós com múltiplos destinos abaixo — cada aresta toma um
//           ponto de saída físico diferente e não concorre no início do percurso.

const INITIAL_EDGES = [
  // ── Fase 1: fluxo principal horizontal ─────────────────────────────────────
  mkEdge('e-01', 'DRAFT',           'PENDENTE_GESTOR', { label: 'enviar p/ Gestor', bg: BG.S }),
  mkEdge('e-02', 'PENDENTE_GESTOR', 'VALIDADA_GESTOR', { label: 'validar',          bg: BG.G }),
  mkEdge('e-08', 'FILA_STI',        'APROVADA_STI',    { label: 'aprovar',          bg: BG.I, color: GRN, width: 2 }),

  // VALIDADA_GESTOR bifurca segundo condição de sistema (não é ação do usuário)
  mkEdge('e-03', 'VALIDADA_GESTOR', 'FILA_STI',       { label: '[ sem dados sensíveis ]', bg: BG.G, color: GRAY, condition: true }),
  mkEdge('e-04', 'VALIDADA_GESTOR', 'AGUARDANDO_DPO', { label: '[ dados sensíveis ]',     bg: BG.G, color: DPO,  condition: true, dashed: true, from: 'bottom-s3', to: 'top-t' }),

  // ── Fase 1: descidas L1→L2 ─────────────────────────────────────────────────
  // PENDENTE_GESTOR: saídas em pontos físicos distintos (bottom-s e bottom-s2)
  mkEdge('e-14', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', { label: 'devolver', bg: BG.G, color: AMB, dashed: true, from: 'bottom-s',  to: 'top-t' }),
  mkEdge('e-15', 'PENDENTE_GESTOR', 'REJEITADA',          { label: 'rejeitar', bg: BG.E, color: ERR, dashed: true, from: 'bottom-s2', to: 'top-t' }),

  // FILA_STI: três saídas → três handles distintos (centro, dir-baixo, arco bezier)
  mkEdge('e-10', 'FILA_STI', 'SOLICITADO_AJUSTES_STI', { label: 'solicitar ajustes', bg: BG.I,              dashed: true, from: 'bottom-s',  to: 'top-t' }),
  mkEdge('e-11', 'FILA_STI', 'AGUARDANDO_AVALIADOR',     { label: 'enc. ao Avaliador', bg: BG.I, color: DIR,  dashed: true, from: 'bottom-s3', to: 'top-t' }),
  // REPROVADA está em L2-direita (x=1700,y=520): arco bezier sai do lado direito
  // de FILA_STI e desce — não conflita com APROVADA_STI que está em L1 (y=210)
  mkEdge('e-09', 'FILA_STI', 'REPROVADA_STI', { label: 'reprovar', bg: BG.E, color: ERR, dashed: true, curved: true, from: 'bottom-s2', to: 'top-t' }),

  // ── Fase 1: retornos (bezier — arcos naturais que não concorrem com smoothstep)
  // DPO aprova: arco sobe de AGUARDANDO_DPO e desce em FILA_STI pelo topo
  mkEdge('e-06', 'AGUARDANDO_DPO',     'FILA_STI', { label: 'DPO aprova',      bg: BG.P, color: DPO, curved: true, from: 'top-s', to: 'top-t'  }),
  // Avaliador devolve: arco sobe de AGUARDANDO_AVALIADOR e desce em FILA_STI pelo topo-esq
  mkEdge('e-12', 'AGUARDANDO_AVALIADOR', 'FILA_STI', { label: 'dev. ao Analista', bg: BG.D, color: DIR, curved: true, from: 'top-s', to: 'top-t2' }),

  // ── Fase 1: convergência L2→L3 para SOLICITANTE_AJUSTANDO ─────────────────
  // Saídas em pontos distintos de cada nó-origem para evitar bundling
  mkEdge('e-16', 'DEVOLVIDA_AJUSTES',      'SOLICITANTE_AJUSTANDO', { label: 'iniciar ajuste', bg: BG.S, color: AMB,              from: 'bottom-s',  to: 'top-t2' }),
  mkEdge('e-07', 'AGUARDANDO_DPO',         'SOLICITANTE_AJUSTANDO', { label: 'aj. (DPO)',      bg: BG.P, color: DPO, dashed: true, from: 'bottom-s',  to: 'top-t'  }),
  mkEdge('e-18', 'SOLICITADO_AJUSTES_STI', 'SOLICITANTE_AJUSTANDO', { label: 'iniciar ajuste', bg: BG.S, color: AMB,              from: 'bottom-s2', to: 'top-t'  }),
  mkEdge('e-13', 'AGUARDANDO_AVALIADOR',     'SOLICITANTE_AJUSTANDO', { label: 'aj. (Avaliador)', bg: BG.D, color: DIR, dashed: true, from: 'bottom-s2', to: 'top-t2' }),

  // ── Fase 1: loop-back L3→L1 (bezier: arco percorre corredor lateral livre)
  mkEdge('e-17', 'SOLICITANTE_AJUSTANDO', 'PENDENTE_GESTOR', { label: 'reenviar p/ Gestor', bg: BG.S, color: AMB, dashed: true, curved: true, from: 'left', to: 'top-t2' }),

  // ── Transição Fase 1 → 2 (bezier: salto inter-fase, sem concorrência)
  mkEdge('e-19', 'APROVADA_STI', 'EM_DESENVOLVIMENTO', {
    label: 'iniciar desenvolvimento', bg: BG.S, color: GRN, width: 2.5, curved: true, from: 'bottom-s', to: 'top-t',
  }),

  // ── Fase 2 ─────────────────────────────────────────────────────────────────
  mkEdge('e-20', 'EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO', { label: 'submeter produto', bg: BG.S }),
  // Transição F2→F3: bezier para salto inter-fase
  mkEdge('e-21', 'SUBMETIDO_HOMOLOGACAO', 'PENDENTE_HOMOLOGACAO_GESTOR', {
    label: 'enviar p/ homologação', bg: BG.G, color: GRN, width: 2.5, curved: true, from: 'bottom-s', to: 'top-t',
  }),

  // ── Fase 3: fluxo principal horizontal ─────────────────────────────────────
  mkEdge('e-22', 'PENDENTE_HOMOLOGACAO_GESTOR', 'VALIDADA_HOMOLOGACAO_GESTOR', { label: 'validar',   bg: BG.G }),
  mkEdge('e-28', 'FILA_HOMOLOGACAO_STI',        'HOMOLOGADA',                  { label: 'homologar', bg: BG.I, color: GRN, width: 2 }),

  // Mesma lógica de bifurcação por condição de sistema (Fase 3)
  mkEdge('e-23', 'VALIDADA_HOMOLOGACAO_GESTOR', 'FILA_HOMOLOGACAO_STI',       { label: '[ sem dados sensíveis ]', bg: BG.G, color: GRAY, condition: true }),
  mkEdge('e-24', 'VALIDADA_HOMOLOGACAO_GESTOR', 'AGUARDANDO_DPO_HOMOLOGACAO', { label: '[ dados sensíveis ]',     bg: BG.G, color: DPO,  condition: true, dashed: true, from: 'bottom-s3', to: 'top-t' }),

  // ── Fase 3: descidas L1→L2 ─────────────────────────────────────────────────
  mkEdge('e-33', 'PENDENTE_HOMOLOGACAO_GESTOR', 'DEVOLVIDA_HOMOLOGACAO',          { label: 'devolver',          bg: BG.G, color: AMB, dashed: true, from: 'bottom-s',  to: 'top-t' }),
  mkEdge('e-29', 'FILA_HOMOLOGACAO_STI', 'SOLICITADO_AJUSTES_HOMOLOGACAO',        { label: 'solicitar ajustes', bg: BG.I,              dashed: true, from: 'bottom-s',  to: 'top-t' }),
  mkEdge('e-30', 'FILA_HOMOLOGACAO_STI', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO',        { label: 'enc. ao Avaliador', bg: BG.I, color: DIR,  dashed: true, from: 'bottom-s3', to: 'top-t' }),

  // ── Fase 3: retornos (bezier)
  mkEdge('e-26', 'AGUARDANDO_DPO_HOMOLOGACAO',     'FILA_HOMOLOGACAO_STI', { label: 'DPO aprova',      bg: BG.P, color: DPO, curved: true, from: 'top-s', to: 'top-t'  }),
  mkEdge('e-31', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', 'FILA_HOMOLOGACAO_STI', { label: 'dev. ao Analista', bg: BG.D, color: DIR, curved: true, from: 'top-s', to: 'top-t2' }),

  // ── Fase 3: convergência L2→L3 para AJUSTANDO_HOMOLOGACAO ─────────────────
  mkEdge('e-34', 'DEVOLVIDA_HOMOLOGACAO',          'AJUSTANDO_HOMOLOGACAO', { label: 'iniciar ajuste', bg: BG.S, color: AMB,              from: 'bottom-s',  to: 'top-t2' }),
  mkEdge('e-27', 'AGUARDANDO_DPO_HOMOLOGACAO',     'AJUSTANDO_HOMOLOGACAO', { label: 'aj. (DPO)',      bg: BG.P, color: DPO, dashed: true, from: 'bottom-s',  to: 'top-t'  }),
  mkEdge('e-36', 'SOLICITADO_AJUSTES_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO', { label: 'iniciar ajuste', bg: BG.S, color: AMB,              from: 'bottom-s2', to: 'top-t'  }),
  mkEdge('e-32', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO', { label: 'aj. (Avaliador)', bg: BG.D, color: DIR, dashed: true, from: 'bottom-s2', to: 'top-t2' }),

  // ── Fase 3: loop-back L3→L1 (bezier)
  mkEdge('e-35', 'AJUSTANDO_HOMOLOGACAO', 'PENDENTE_HOMOLOGACAO_GESTOR', { label: 'reenviar p/ Gestor', bg: BG.S, color: AMB, dashed: true, curved: true, from: 'left', to: 'top-t2' }),

  // ── Transição Fase 3 → 4 (bezier)
  mkEdge('e-37', 'HOMOLOGADA', 'EM_PRODUCAO', {
    label: 'deploy p/ produção', bg: BG.O, color: GRN, width: 2.5, curved: true, from: 'bottom-s', to: 'top-t',
  }),

  // ── Fase 4 ─────────────────────────────────────────────────────────────────
  mkEdge('e-38', 'EM_PRODUCAO',      'EM_MONITORAMENTO', { label: 'confirmar deploy', bg: BG.O }),
  mkEdge('e-39', 'EM_MONITORAMENTO', 'DESATIVADA',        { label: 'desativar',       bg: BG.E, color: ERR, dashed: true }),
];

// ─── Legenda ────────────────────────────────────────────────────────────────────
function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Atores */}
      {[
        ['Solicitante',  'bg-blue-50 text-blue-700'],
        ['Gestor',       'bg-amber-50 text-amber-700'],
        ['Analista STI', 'bg-indigo-50 text-indigo-700'],
        ['Avaliador Técnico',  'bg-violet-50 text-violet-700'],
        ['DPO',          'bg-pink-50 text-pink-700'],
        ['Ops STI',      'bg-emerald-50 text-emerald-700'],
      ].map(([label, cls]) => (
        <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
      ))}

      <span className="w-px h-4 bg-neutral-200 mx-1" />

      {/* Tipos de aresta */}
      {[
        { style: { borderTop: '2px solid #16a34a' }, label: 'Aprovação / avanço' },
        { style: { borderTop: '2px solid #ef4444' }, label: 'Reprovação / terminal' },
        { style: { borderTop: '2px dashed #f59e0b' }, label: 'Devolução / ajuste' },
        { style: { borderTop: '2px dashed #6366f1' }, label: 'Ramo DPO' },
        { style: { borderTop: '2px dashed #8b5cf6' }, label: 'Ramo Avaliador' },
      ].map(({ style, label }) => (
        <span key={label} className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="inline-block w-7" style={style} />
          {label}
        </span>
      ))}

      <span className="w-px h-4 bg-neutral-200 mx-1" />

      {/* Condição de sistema */}
      <span className="flex items-center gap-2 text-xs text-neutral-400 italic">
        <span className="inline-block px-1.5 py-0.5 rounded border border-dashed border-neutral-400 text-[10px]">
          [ condição ]
        </span>
        Roteamento automático (não é ação de usuário)
      </span>

      <span className="w-px h-4 bg-neutral-200 mx-1" />

      <span className="flex items-center gap-1.5 text-xs text-blue-600">
        <Bot size={11} /> Diagnóstico IA automático
      </span>
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────────
export default function ProcessMapPage() {
  const [nodes, , onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, , onEdgesChange] = useEdgesState(INITIAL_EDGES);

  return (
    <Layout>
      <div className="flex flex-col" style={{ height: '100vh' }}>

        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-neutral-100 bg-white shrink-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-800 tracking-tight flex items-center gap-2.5">
                  <Map size={22} className="text-tce-700" />
                  Mapa de Processo
                </h1>
                <p className="text-neutral-500 text-sm mt-1">
                  25 estados · 4 fases · Conformidade N-PSI-016 · Arraste e use scroll para navegar
                </p>
              </div>
              <div className="text-xs text-neutral-400 text-right shrink-0">
                <span className="block">Use <kbd className="bg-neutral-100 border border-neutral-300 rounded px-1.5 py-0.5 text-[11px] font-mono">Ctrl + scroll</kbd> para zoom</span>
                <span className="block mt-1">Clique e arraste para mover o canvas</span>
              </div>
            </div>
            <Legenda />
          </div>
        </div>

        {/* Diagrama */}
        <div className="flex-1" style={{ minHeight: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.07 }}
            minZoom={0.15}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            attributionPosition="bottom-right"
          >
            <Background color="#e2e8f0" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'background') return 'transparent';
                return (TIPO[n.data?.tipo] ?? TIPO.normal).border;
              }}
              maskColor="rgba(248,250,252,0.75)"
              style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
          </ReactFlow>
        </div>

      </div>
    </Layout>
  );
}
