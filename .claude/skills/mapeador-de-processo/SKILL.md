---
name: mapeador-de-processo
description: Use when building or refining a graphical process map for the Agilize 2.0 workflow — FluxoPage, ProcessMapPage, state diagrams, node/edge visualization, or any component that renders the 25-state demand pipeline. Trigger words: mapa de fluxo, diagrama de estados, visualização de pipeline, FluxoPage, ProcessGraph, grafo de demanda.
---

# Mapeador de Processo — Agilize 2.0

## Papel
Arquiteto de visualizações de workflow. Especialista em ReactFlow e modelagem de estados para o sistema Agilize. Transforma os 25 estados do FLUXO.md em um grafo interativo e fiel ao fluxo institucional N-PSI-016.

**Fonte da verdade:** `docs/FLUXO.md` — nunca alterar o fluxo, apenas visualizá-lo.

---

## Perguntas antes de codificar

1. A página existe ou está sendo criada do zero?
2. O grafo precisa refletir a demanda **atual** (estado em tempo real) ou o fluxo **completo** (mapa de referência)?
3. Precisa de interatividade (clique abre detalhe, hover mostra ator)?
4. A demanda em foco tem `dados_sensiveis=true`? (ativa ramo DPO)

---

## Estrutura de componentes

```
src/pages/FluxoPage.jsx           ← página de rota /fluxo
src/components/ProcessGraph.jsx   ← ReactFlow container principal
src/components/nodes/
  PhaseGroupNode.jsx              ← agrupador de fase (Fase 1, 2, 3, 4)
  StateNode.jsx                   ← nó de estado individual
  TerminalNode.jsx                ← estados terminais (REJEITADA, REPROVADA, DESATIVADA, CANCELADA)
src/components/edges/
  ConditionalEdge.jsx             ← aresta com guard [condição] — tracejada
  LoopEdge.jsx                    ← retorno de ajuste — curva invertida
src/hooks/useFluxoData.js         ← monta nodes/edges a partir dos 25 estados
```

---

## Contrato de dados

```js
// Estado do fluxo
const STATUS_FASES = {
  fase1: [
    'DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO',
    'VALIDADA_GESTOR', 'FILA_STI', 'AGUARDANDO_DPO', 'AGUARDANDO_AVALIADOR',
    'SOLICITADO_AJUSTES_STI', 'APROVADA_STI', 'REPROVADA_STI', 'REJEITADA'
  ],
  fase2: ['EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO'],
  fase3: [
    'PENDENTE_HOMOLOGACAO_GESTOR', 'DEVOLVIDA_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO',
    'VALIDADA_HOMOLOGACAO_GESTOR', 'FILA_HOMOLOGACAO_STI', 'AGUARDANDO_DPO_HOMOLOGACAO',
    'AGUARDANDO_AVALIADOR_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO', 'HOMOLOGADA'
  ],
  fase4: ['EM_PRODUCAO', 'EM_MONITORAMENTO', 'DESATIVADA'],
  transversal: ['CANCELADA'],
}

// Nó
interface ProcessNode {
  id: string          // = status string
  label: string       // nome legível
  fase: 1 | 2 | 3 | 4 | 'transversal'
  tipo: 'normal' | 'terminal' | 'loop' | 'dpo' | 'avaliador'
  ator: string        // quem age neste estado
  status?: StepStatus // se vinculado a demanda real
}

// Aresta
interface ProcessEdge {
  from: string
  to: string
  acao: string        // ex: "enviarParaGestor"
  condicional?: string // ex: "dados_sensiveis=true"
  tipo: 'normal' | 'condicional' | 'loop' | 'dpo'
}

type StepStatus = 'idle' | 'active' | 'completed' | 'terminal' | 'blocked'
```

---

## Paleta de cores

### Por fase (fundo de agrupador)
| Fase | Cor de fundo | Borda |
|------|-------------|-------|
| Fase 1 — Solicitação | `blue-50` | `blue-200` |
| Fase 2 — Desenvolvimento | `yellow-50` | `yellow-200` |
| Fase 3 — Homologação | `purple-50` | `purple-200` |
| Fase 4 — Produção | `green-50` | `green-200` |

### Por tipo de nó
| Tipo | Cor | Observação |
|------|-----|------------|
| `normal` | `slate-100` / borda `slate-400` | estado padrão |
| `terminal` | `red-100` / borda `red-500` | REJEITADA, REPROVADA, DESATIVADA, CANCELADA |
| `loop` | `amber-100` / borda `amber-400` | estados de ajuste (SOLICITANTE_AJUSTANDO, AJUSTANDO_HOMOLOGACAO) |
| `dpo` | `indigo-100` / borda `indigo-400` | AGUARDANDO_DPO, AGUARDANDO_DPO_HOMOLOGACAO |
| `avaliador` | `violet-100` / borda `violet-400` | AGUARDANDO_AVALIADOR, AGUARDANDO_AVALIADOR_HOMOLOGACAO |
| `aprovacao` | `green-100` / borda `green-500` | APROVADA_STI, HOMOLOGADA, EM_MONITORAMENTO |

### Por status de demanda ativa (sobrescreve cor do nó)
| StepStatus | Estilo |
|---|---|
| `active` | azul TCE `#194383` + anel pulsante |
| `completed` | `green-500` opaco |
| `idle` | cor padrão do tipo |
| `terminal` | `red-500` |
| `blocked` | `amber-500` |

---

## Tipos de aresta

| Tipo | Estilo | Quando usar |
|---|---|---|
| `normal` | linha sólida, seta preenchida | transição direta |
| `condicional` | tracejada, label com `[condição]` | `dados_sensiveis=true/false`, checklists |
| `loop` | curva invertida (type: `smoothstep`), cor amber | retorno para ajuste |
| `dpo` | tracejada indigo | ramo de dados sensíveis |

---

## Layout recomendado (ELKjs)

```js
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',       // fluxo da esquerda para direita
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
}
```

Para o mapa completo (referência): `direction: 'DOWN'` agrupa melhor as 4 fases verticalmente.

---

## Regras de negócio que o grafo deve comunicar visualmente

1. **Regra central N-PSI-016:** Solicitante → Gestor → STI. Nunca aresta direta de estado do Solicitante para estado da STI sem passar por Gestor.
2. **Ramo DPO:** bifurcação em `VALIDADA_GESTOR` e `VALIDADA_HOMOLOGACAO_GESTOR` com condição `dados_sensiveis`. Deve ser visualmente distinto.
3. **Loops de ajuste:** arestas de retorno claramente diferenciadas (não confundir com progressão).
4. **Cancelamento transversal:** disponível em qualquer estado até `SUBMETIDO_HOMOLOGACAO`. Represente como aresta tracejada vermelha saindo dos estados elegíveis, ou como nota/legend separada.
5. **Agente IA:** indicar que `FILA_STI` e `FILA_HOMOLOGACAO_STI` disparam diagnóstico automático (ícone de IA ou badge).
6. **Estados terminais:** sem aresta de saída (exceto CANCELADA que pode sair de qualquer estado elegível).

---

## Checklist antes de entregar

- [ ] Todos os 25 estados representados
- [ ] 4 grupos de fase visíveis com cores distintas
- [ ] Estados terminais sem saída (exceto CANCELADA)
- [ ] Ramo DPO distinguível (Fase 1 e Fase 3)
- [ ] Ramo Avaliador Técnico presente (Fase 1 e Fase 3)
- [ ] Loops de ajuste com arestas curvas, cores amber
- [ ] Ator de cada estado identificável (tooltip ou label)
- [ ] Estado ativo da demanda (se houver) destacado com pulse
- [ ] Zoom/pan funcionando
- [ ] Badge ou ícone de IA nos estados FILA_STI e FILA_HOMOLOGACAO_STI
- [ ] Legenda de cores presente
- [ ] Layout legível de 3 a 30+ nós sem sobreposição

---

## Biblioteca

**Padrão:** `@xyflow/react` (ReactFlow v12)
- ELKjs para layout automático: `elkjs` + `web-worker`
- Mermaid: apenas se o requisito for diagrama estático exportável (não interativo)
- D3: apenas se precisar de animações SVG customizadas além do ReactFlow

---

## O que não implementar antes de decidir

- Exportação PDF/PNG do mapa — dependência de `html2canvas` ou `@xyflow/react` screenshot API; avaliar necessidade
- Links de navegação do mapa para DemandaDetailPage — depende da DemandaDetailPage estar completa
- Filtros por fase integrados com RelatoriosPage — aguardar RelatoriosPage estar pronta
