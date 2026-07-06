const STATUS_CONFIG = {
  // Fase 1 — Solicitação
  DRAFT:                         { label: 'Rascunho',                  cls: 'bg-neutral-100 text-neutral-600' },
  PENDENTE_GESTOR:               { label: 'Aguardando Gestor',         cls: 'bg-amber-100 text-amber-700' },
  DEVOLVIDA_AJUSTES:             { label: 'Devolvida p/ Ajustes',      cls: 'bg-orange-100 text-orange-700' },
  SOLICITANTE_AJUSTANDO:         { label: 'Ajustando',                 cls: 'bg-orange-100 text-orange-700' },
  VALIDADA_GESTOR:               { label: 'Validada pelo Gestor',      cls: 'bg-tce-100 text-tce-700' },
  FILA_STI:                      { label: 'Fila da STI',               cls: 'bg-indigo-100 text-indigo-700' },
  APROVADA_STI:                  { label: 'Aprovada pela STI',         cls: 'bg-tce-100 text-tce-600' },
  REPROVADA_STI:                 { label: 'Reprovada pela STI',        cls: 'bg-red-100 text-red-700' },
  REJEITADA:                     { label: 'Rejeitada',                 cls: 'bg-red-100 text-red-700' },
  SOLICITADO_AJUSTES_STI:        { label: 'Ajustes STI',               cls: 'bg-purple-100 text-purple-700' },
  // Fase 2 — Desenvolvimento
  EM_DESENVOLVIMENTO:            { label: 'Em Desenvolvimento',        cls: 'bg-orange-100 text-orange-700' },
  SUBMETIDO_HOMOLOGACAO:         { label: 'Submetido p/ Homologação',  cls: 'bg-indigo-100 text-indigo-700' },
  // Fase 3 — Homologação
  PENDENTE_HOMOLOGACAO_GESTOR:   { label: 'Ag. Gestor (Hom.)',         cls: 'bg-amber-100 text-amber-700' },
  DEVOLVIDA_HOMOLOGACAO:         { label: 'Devolvida (Hom.)',          cls: 'bg-orange-100 text-orange-700' },
  AJUSTANDO_HOMOLOGACAO:         { label: 'Ajustando (Hom.)',          cls: 'bg-orange-100 text-orange-700' },
  VALIDADA_HOMOLOGACAO_GESTOR:   { label: 'Validada p/ Hom.',          cls: 'bg-tce-100 text-tce-700' },
  FILA_HOMOLOGACAO_STI:          { label: 'Fila Hom. STI',             cls: 'bg-indigo-100 text-indigo-700' },
  SOLICITADO_AJUSTES_HOMOLOGACAO:{ label: 'Ajustes Hom.',              cls: 'bg-purple-100 text-purple-700' },
  // AVALIADOR_TECNICO
  AGUARDANDO_AVALIADOR:            { label: 'Ag. Avaliador Técnico',     cls: 'bg-violet-100 text-violet-700' },
  AGUARDANDO_AVALIADOR_HOMOLOGACAO:{ label: 'Ag. Avaliador Técnico (Hom.)', cls: 'bg-violet-100 text-violet-700' },
  // DPO
  AGUARDANDO_DPO:                { label: 'Aguardando DPO',            cls: 'bg-amber-100 text-amber-800' },
  AGUARDANDO_DPO_HOMOLOGACAO:    { label: 'Homologação DPO',           cls: 'bg-amber-100 text-amber-800' },
  HOMOLOGADA:                    { label: 'Homologada',                cls: 'bg-emerald-100 text-emerald-700' },
  // Fase 4 — Produção
  EM_PRODUCAO:                   { label: 'Em Produção',               cls: 'bg-tce-700 text-white' },
  EM_MONITORAMENTO:              { label: 'Em Monitoramento',          cls: 'bg-emerald-600 text-white' },
  DESATIVADA:                    { label: 'Desativada',                cls: 'bg-neutral-300 text-neutral-600 line-through' },
  // Transversal
  CANCELADA:                     { label: 'Cancelada',                 cls: 'bg-neutral-200 text-neutral-600 line-through' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: 'bg-neutral-100 text-neutral-700' };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
