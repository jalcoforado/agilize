import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw, ArrowDown, Package, ChevronDown } from 'lucide-react';
import Layout from '../components/Layout';

// ─── Actor styles ──────────────────────────────────────────────────────────
const ACTOR = {
  S: { label: 'Solicitante',   pill: 'bg-tce-100 text-tce-700',       border: 'border-tce-300',     bg: 'bg-tce-50',      text: 'text-tce-700'     },
  G: { label: 'Gestor',        pill: 'bg-amber-100 text-amber-700',    border: 'border-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-800'   },
  I: { label: 'Analista STI',  pill: 'bg-indigo-100 text-indigo-700',  border: 'border-indigo-300',  bg: 'bg-indigo-50',   text: 'text-indigo-700'  },
  D: { label: 'Avaliador Técnico',   pill: 'bg-violet-100 text-violet-700',  border: 'border-violet-300',  bg: 'bg-violet-50',   text: 'text-violet-700'  },
  O: { label: 'Ops STI',       pill: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
};

// ─── Node ──────────────────────────────────────────────────────────────────
function Node({ label, actor, desc, type = 'default', active }) {
  const a = actor ? ACTOR[actor] : null;
  const bg = { default: a?.bg ?? 'bg-white', success: 'bg-emerald-50', error: 'bg-red-50', neutral: 'bg-gray-100' }[type];
  const bd = active
    ? 'border-2 border-tce-700 shadow-lg shadow-tce-200/60'
    : { default: `border ${a?.border ?? 'border-neutral-200'}`, success: 'border border-emerald-400', error: 'border border-red-300', neutral: 'border border-gray-300' }[type];
  const lc = { default: a?.text ?? 'text-neutral-700', success: 'text-emerald-700', error: 'text-red-700', neutral: 'text-gray-500' }[type];

  return (
    <div className={`relative rounded-lg p-2.5 shrink-0 w-[136px] ${bg} ${bd}`}>
      {active && (
        <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tce-400 opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-tce-600" />
        </span>
      )}
      {a && (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-1.5 inline-block ${a.pill}`}>
          {a.label}
        </span>
      )}
      <div className="flex items-start gap-1">
        <p className={`text-[11px] font-semibold leading-tight flex-1 ${lc}`}>{label}</p>
        {type === 'error'   && <XCircle    size={11} className="shrink-0 mt-px text-red-400" />}
        {type === 'success' && <CheckCircle size={11} className="shrink-0 mt-px text-emerald-500" />}
      </div>
      {desc && <p className="text-[9px] text-neutral-400 mt-0.5 leading-tight">{desc}</p>}
    </div>
  );
}

// ─── Return node (dashed, muted — indicates loop back) ─────────────────────
function ReturnNode({ label, actor, desc }) {
  const a = actor ? ACTOR[actor] : null;
  return (
    <div className={`relative rounded-lg p-2.5 shrink-0 w-[136px] bg-white border border-dashed ${a?.border ?? 'border-neutral-300'} opacity-60`}>
      <RotateCcw size={11} className="absolute top-2 right-2 text-neutral-400" />
      {a && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full mb-1.5 inline-block ${a.pill}`}>{a.label}</span>}
      <p className={`text-[11px] font-semibold leading-tight pr-4 ${a?.text ?? 'text-neutral-500'}`}>{label}</p>
      <p className="text-[9px] text-neutral-400 mt-0.5 leading-tight">{desc ?? 'Retorna ao estado'}</p>
    </div>
  );
}

// ─── Horizontal arrow ──────────────────────────────────────────────────────
function Arr({ label, dashed }) {
  return (
    <div className={`flex flex-col items-center shrink-0 w-11 ${dashed ? 'opacity-60' : ''}`}>
      {label && (
        <span className="text-[9px] text-neutral-400 mb-0.5 text-center leading-tight max-w-[44px]">{label}</span>
      )}
      <div className="flex items-center w-full">
        <div className={`flex-1 h-px ${dashed ? 'border-t border-dashed border-neutral-400' : 'bg-neutral-300'}`} />
        <div className="w-0 h-0 border-y-[3px] border-y-transparent border-l-[5px] border-l-neutral-400" />
      </div>
    </div>
  );
}

// ─── Flow row ──────────────────────────────────────────────────────────────
function Row({ children, muted }) {
  return (
    <div className={`flex items-center ${muted ? 'opacity-80' : ''}`}>
      {children}
    </div>
  );
}

// ─── Sub-section ───────────────────────────────────────────────────────────
function Sub({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="overflow-x-auto pb-1">{children}</div>
    </div>
  );
}

// ─── Phase connector ───────────────────────────────────────────────────────
function Connector({ label }) {
  return (
    <div className="flex flex-col items-center py-1 gap-0.5">
      <div className="w-px h-4 bg-neutral-200" />
      <ArrowDown size={12} className="text-neutral-300" />
      {label && <span className="text-[9px] text-neutral-400 italic">{label}</span>}
      <div className="w-px h-4 bg-neutral-200" />
    </div>
  );
}

// ─── Phase card ────────────────────────────────────────────────────────────
const PHASE_THEMES = {
  blue:    { hdr: 'bg-tce-700',     bdl: 'border-tce-200',     badge: 'bg-tce-100 text-tce-700',       divider: 'divide-tce-50'    },
  orange:  { hdr: 'bg-orange-600',  bdl: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700', divider: 'divide-orange-50'  },
  indigo:  { hdr: 'bg-indigo-700',  bdl: 'border-indigo-200',  badge: 'bg-indigo-100 text-indigo-700', divider: 'divide-indigo-50'  },
  emerald: { hdr: 'bg-emerald-700', bdl: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700',divider: 'divide-emerald-50'},
};

function Phase({ num, title, sub, theme, children, open, onToggle }) {
  const t = PHASE_THEMES[theme];
  return (
    <div className={`rounded-xl border ${t.bdl} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className={`w-full ${t.hdr} px-5 py-3.5 flex items-center gap-3 text-left`}
      >
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${t.badge}`}>
          FASE {num}
        </span>
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm tracking-tight">{title}</h3>
          {sub && <p className="text-white/60 text-[11px] mt-0.5">{sub}</p>}
        </div>
        <ChevronDown
          size={18}
          className={`text-white/70 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className={`bg-white p-5 space-y-5 divide-y ${t.divider}`}>
          {React.Children.map(children, (child, i) => (
            <div className={i > 0 ? 'pt-4' : ''}>{child}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function FluxoPage() {
  const [params] = useSearchParams();
  const current = params.get('status') ?? '';
  const is = (s) => s === current;

  const [openPhases, setOpenPhases] = useState(new Set([1]));
  const togglePhase = (num) =>
    setOpenPhases(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });

  return (
    <Layout>
      <div className="max-w-[1280px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Mapa do Processo</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Fluxo completo — 25 estados distribuídos em 4 fases · Conformidade N-PSI-016
          </p>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {Object.entries(ACTOR).map(([k, v]) => (
              <span key={k} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${v.pill}`}>
                {v.label}
              </span>
            ))}
            <span className="w-px h-4 bg-neutral-200 mx-1" />
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
              <XCircle size={10} /> Terminal (reprovação)
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle size={10} /> Terminal (aprovação)
            </span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-200 text-gray-600 flex items-center gap-1">
              <RotateCcw size={10} /> Retorno ao estado anterior
            </span>
            {current && (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-tce-700 text-white flex items-center gap-1.5 ml-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Posição atual da demanda
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">

          {/* ── FASE 1 ── */}
          <Phase num={1} title="Solicitação" sub="Solicitante cria a demanda · Gestor valida · STI aprova a viabilidade" theme="blue" open={openPhases.has(1)} onToggle={() => togglePhase(1)}>

            <Sub title="Caminho principal — aprovação">
              <Row>
                <Node label="Rascunho"            actor="S" desc="Demanda sendo elaborada"   active={is('DRAFT')} />
                <Arr label="enviar p/ gestor" />
                <Node label="Aguardando Gestor"   actor="G" desc="Gestor analisa a demanda"  active={is('PENDENTE_GESTOR')} />
                <Arr label="validar" />
                <Node label="Validada p/ Gestor"  actor="G" desc="Aprovada para ir à STI"    active={is('VALIDADA_GESTOR')} />
                <Arr label="enviar p/ STI" />
                <Node label="Fila da STI"         actor="I" desc="Analista analisa viabilidade" active={is('FILA_STI')} />
                <Arr label="aprovar" />
                <Node label="Aprovada pela STI"   actor="I" desc="Pronta para desenvolvimento" type="success" active={is('APROVADA_STI')} />
              </Row>
            </Sub>

            <Sub title="Devolução pelo Gestor">
              <Row muted>
                <Node label="Ag. Gestor"              actor="G" desc="Ponto de origem" />
                <Arr label="devolver" dashed />
                <Node label="Devolvida p/ Ajustes"    actor="S" desc="Orientações do gestor"     active={is('DEVOLVIDA_AJUSTES')} />
                <Arr label="iniciar ajuste" />
                <Node label="Ajustando"               actor="S" desc="Revisando a demanda"        active={is('SOLICITANTE_AJUSTANDO')} />
                <Arr label="reenviar" />
                <ReturnNode label="Ag. Gestor"        actor="G" desc="Volta para nova análise" />
              </Row>
            </Sub>

            <Sub title="Devolução pela STI">
              <Row muted>
                <Node label="Fila da STI"       actor="I" desc="Ponto de origem" />
                <Arr label="solicitar ajustes" dashed />
                <Node label="Ajustes STI"       actor="G" desc="Aguardando ação do Gestor" active={is('SOLICITADO_AJUSTES_STI')} />
                <Arr label="Gestor reenvia" />
                <ReturnNode label="Fila da STI" actor="I" desc="Gestor executa o reenvio à STI" />
              </Row>
            </Sub>

            <Sub title="Encaminhamento ao Avaliador Técnico (opcional — a critério da STI)">
              <div className="space-y-3">
                <Row>
                  <Node label="Fila da STI"        actor="I" desc="STI opta por consultar Avaliador Técnico" active={is('FILA_STI')} />
                  <Arr label="encaminhar avaliador" />
                  <Node label="Ag. Avaliador Técnico"    actor="D" desc="Avaliador Técnico analisa e emite parecer" active={is('AGUARDANDO_AVALIADOR')} />
                  <Arr label="devolver analista" dashed />
                  <ReturnNode label="Fila da STI"  actor="I" desc="Volta com orientações ao analista" />
                </Row>
                <Row muted>
                  <Node label="Ag. Avaliador Técnico"    actor="D" desc="Ponto de origem" active={is('AGUARDANDO_AVALIADOR')} />
                  <Arr label="solicitar ajustes" dashed />
                  <Node label="Ajustando"          actor="S" desc="Revisando conforme Avaliador Técnico"        active={is('SOLICITANTE_AJUSTANDO')} />
                  <Arr label="reenviar p/ gestor" />
                  <ReturnNode label="Ag. Gestor"   actor="G" desc="Retorna ao fluxo principal" />
                </Row>
              </div>
            </Sub>

            <Sub title="Encerramentos na fase 1">
              <div className="flex flex-wrap gap-6">
                <Row muted>
                  <Node label="Ag. Gestor"          actor="G" desc="Ponto de origem" />
                  <Arr label="rejeitar" dashed />
                  <Node label="Rejeitada"            type="error" desc="Encerrado pelo Gestor"   active={is('REJEITADA')} />
                </Row>
                <Row muted>
                  <Node label="Fila da STI"         actor="I" desc="Ponto de origem" />
                  <Arr label="reprovar" dashed />
                  <Node label="Reprovada pela STI"  type="error" desc="Encerrado pela STI"       active={is('REPROVADA_STI')} />
                </Row>
              </div>
            </Sub>

          </Phase>

          <Connector label="solução aprovada — solicitante inicia o desenvolvimento" />

          {/* ── FASE 2 ── */}
          <Phase num={2} title="Desenvolvimento" sub="Solicitante constrói a solução aprovada e submete para homologação" theme="orange" open={openPhases.has(2)} onToggle={() => togglePhase(2)}>

            <Sub title="Fluxo de desenvolvimento">
              <Row>
                <Node label="Aprovada pela STI"          actor="I" type="success" desc="Ponto de partida" />
                <Arr label="iniciar desenvolvimento" />
                <Node label="Em Desenvolvimento"         actor="S" desc="Solicitante constrói a solução" active={is('EM_DESENVOLVIMENTO')} />
                <Arr label="submeter produto" />
                <Node label="Submetido p/ Homologação"   actor="G" desc="Produto entregue para avaliação" active={is('SUBMETIDO_HOMOLOGACAO')} />
              </Row>
            </Sub>

          </Phase>

          <Connector label="produto entregue — gestor e STI realizam a homologação" />

          {/* ── FASE 3 ── */}
          <Phase num={3} title="Homologação" sub="Gestor valida o produto entregue · STI homologa para produção" theme="indigo" open={openPhases.has(3)} onToggle={() => togglePhase(3)}>

            <Sub title="Caminho principal — homologação">
              <Row>
                <Node label="Submetido p/ Hom."   actor="G" desc="Gestor avalia o produto entregue" active={is('SUBMETIDO_HOMOLOGACAO')} />
                <Arr label="validar" />
                <Node label="Validado p/ Hom."    actor="G" desc="Gestor encaminha à STI"            active={is('VALIDADA_HOMOLOGACAO_GESTOR')} />
                <Arr label="enviar p/ STI" />
                <Node label="Fila Hom. STI"       actor="I" desc="STI realiza testes"                active={is('FILA_HOMOLOGACAO_STI')} />
                <Arr label="homologar" />
                <Node label="Homologada"          actor="I" type="success" desc="Pronta para produção" active={is('HOMOLOGADA')} />
              </Row>
            </Sub>

            <Sub title="Devolução pelo Gestor (homologação)">
              <Row muted>
                <Node label="Submetido p/ Hom."       actor="G" desc="Ponto de origem" />
                <Arr label="devolver" dashed />
                <Node label="Devolvida (Hom.)"        actor="S" desc="Produto retorna p/ correção" active={is('DEVOLVIDA_HOMOLOGACAO')} />
                <Arr label="iniciar ajuste" />
                <Node label="Ajustando (Hom.)"        actor="S" desc="Corrigindo o produto"        active={is('AJUSTANDO_HOMOLOGACAO')} />
                <Arr label="submeter produto" />
                <ReturnNode label="Submetido p/ Hom." actor="G" desc="Volta para análise do Gestor" />
              </Row>
            </Sub>

            <Sub title="Devolução pela STI (homologação)">
              <div className="space-y-3">
                <Row muted>
                  <Node label="Fila Hom. STI"       actor="I" desc="Ponto de origem" />
                  <Arr label="solicitar ajustes" dashed />
                  <Node label="Ajustes Hom."        actor="G" desc="Aguardando ação do Gestor"        active={is('SOLICITADO_AJUSTES_HOMOLOGACAO')} />
                  <Arr label="Gestor reenvia" />
                  <ReturnNode label="Fila Hom. STI" actor="I" desc="Gestor executa o reenvio à STI" />
                </Row>
                <Row muted>
                  <Node label="Ajustes Hom."        actor="S" desc="Ou: solicitante inicia ajuste"    active={is('SOLICITADO_AJUSTES_HOMOLOGACAO')} />
                  <Arr label="iniciar ajuste" />
                  <Node label="Ajustando (Hom.)"    actor="S" desc="Corrigindo o produto"             active={is('AJUSTANDO_HOMOLOGACAO')} />
                  <Arr label="submeter produto" />
                  <ReturnNode label="Submetido p/ Hom." actor="G" desc="Volta ao Gestor p/ nova validação" />
                </Row>
              </div>
            </Sub>

            <Sub title="Encaminhamento ao Avaliador Técnico — homologação (opcional — a critério da STI)">
              <div className="space-y-3">
                <Row>
                  <Node label="Fila Hom. STI"           actor="I" desc="STI opta por consultar Avaliador Técnico" active={is('FILA_HOMOLOGACAO_STI')} />
                  <Arr label="encaminhar avaliador" />
                  <Node label="Ag. Avaliador (Hom.)"    actor="D" desc="Avaliador Técnico analisa e emite parecer" active={is('AGUARDANDO_AVALIADOR_HOMOLOGACAO')} />
                  <Arr label="devolver analista" dashed />
                  <ReturnNode label="Fila Hom. STI"     actor="I" desc="Volta com orientações ao analista" />
                </Row>
                <Row muted>
                  <Node label="Ag. Avaliador (Hom.)"    actor="D" desc="Ponto de origem" active={is('AGUARDANDO_AVALIADOR_HOMOLOGACAO')} />
                  <Arr label="solicitar ajustes" dashed />
                  <Node label="Ajustando (Hom.)"        actor="S" desc="Revisando conforme Avaliador Técnico"  active={is('AJUSTANDO_HOMOLOGACAO')} />
                  <Arr label="reenviar p/ gestor" />
                  <ReturnNode label="Ag. Gestor (Hom.)" actor="G" desc="Retorna ao fluxo principal" />
                </Row>
              </div>
            </Sub>

          </Phase>

          <Connector label="homologada — ops STI executa o deploy" />

          {/* ── FASE 4 ── */}
          <Phase num={4} title="Produção" sub="Deploy e monitoramento — quem executa depende do tipo definido na homologação" theme="emerald" open={openPhases.has(4)} onToggle={() => togglePhase(4)}>

            <Sub title="Tipo de deploy — definido pela STI ao homologar">
              <div className="flex flex-wrap gap-4">
                {/* OPS_DEPLOY */}
                <div className="flex-1 min-w-[260px] rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-2">OPS_DEPLOY — Equipe de Operações</p>
                  <Row>
                    <Node label="Homologada"       actor="I" type="success" desc="Ponto de partida"        active={is('HOMOLOGADA')} />
                    <Arr label="iniciar deploy" />
                    <Node label="Em Produção"      actor="O" desc="Ops STI executa"                        active={is('EM_PRODUCAO')} />
                  </Row>
                  <p className="text-[9px] text-indigo-400 mt-2">
                    Apenas <strong>RESPONSAVEL_PRODUCAO</strong>, Analista STI ou Admin podem iniciar e confirmar.
                  </p>
                </div>

                {/* SELF_DEPLOY */}
                <div className="flex-1 min-w-[260px] rounded-lg border border-tce-200 bg-tce-50 px-4 py-3">
                  <p className="text-[10px] font-bold text-tce-600 uppercase tracking-wider mb-2">SELF_DEPLOY — Solicitante responsável</p>
                  <Row>
                    <Node label="Homologada"       actor="I" type="success" desc="Ponto de partida"        active={is('HOMOLOGADA')} />
                    <Arr label="iniciar deploy" />
                    <Node label="Em Produção"      actor="S" desc="Solicitante executa"                    active={is('EM_PRODUCAO')} />
                  </Row>
                  <p className="text-[9px] text-tce-400 mt-2">
                    O próprio <strong>Solicitante</strong> (dono da demanda) pode iniciar e confirmar. Ops STI também pode intervir.
                  </p>
                </div>
              </div>
            </Sub>

            <Sub title="Conclusão — comum a ambos os tipos">
              <Row>
                <Node label="Em Produção"      actor="O" desc="Deploy em andamento"         active={is('EM_PRODUCAO')} />
                <Arr label="confirmar deploy" />
                <Node label="Em Monitoramento" actor="O" desc="Solução ativa e monitorada"  active={is('EM_MONITORAMENTO')} />
                <Arr label="desativar" dashed />
                <Node label="Desativada"       type="neutral" desc="Solução encerrada"      active={is('DESATIVADA')} />
              </Row>
            </Sub>

            <Sub title="Ao confirmar deploy — efeito automático">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-px h-3 bg-emerald-200" />
                  <div className="w-0 h-0 border-x-[3px] border-x-transparent border-t-[5px] border-t-emerald-300" />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                  <Package size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700">Registrada no Inventário de Aplicações TCE</p>
                    <p className="text-[9px] text-emerald-500 mt-0.5">
                      Um registro é criado automaticamente em <code className="bg-emerald-100 px-1 rounded">tb_inventario_aplicacoes</code> assim que o deploy é confirmado
                    </p>
                  </div>
                </div>
              </div>
            </Sub>

          </Phase>

          {/* ── Cancelamento ── */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 flex items-start gap-3.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400 mt-1 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-600">Cancelamento</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Disponível em qualquer estado até <code className="bg-gray-200 px-1 rounded text-gray-500 text-[10px]">SUBMETIDO_HOMOLOGACAO</code>.
                {' '}O Solicitante ou o Gestor podem cancelar o processo; o estado{' '}
                <code className="bg-gray-200 px-1 rounded text-gray-500 text-[10px]">CANCELADA</code> é terminal e irreversível.
              </p>
            </div>
            <div className={`ml-auto shrink-0 rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-2 text-center w-[136px] ${is('CANCELADA') ? 'ring-2 ring-tce-700' : ''}`}>
              <p className="text-[11px] font-semibold text-gray-500">Cancelada</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Processo encerrado</p>
            </div>
          </div>

        </div>

        <p className="text-center text-[11px] text-neutral-300 mt-8">
          N-PSI-016 · Agilize 2.0 · STI — Secretaria de Tecnologia da Informação
        </p>
      </div>
    </Layout>
  );
}
