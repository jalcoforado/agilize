# Agilize 2.0 — Contexto para Claude Code

## O que é este projeto
Sistema institucional de governança de soluções setoriais de TI (conformidade N-PSI-016).
Contexto: unidades criam suas próprias soluções (BI, scripts, agentes, sistemas leves) e submetem para aprovação e homologação da STI.
Fluxo: Solicitante → Gestor Unidade → STI Governança → (Solicitante desenvolve) → Gestor Unidade → STI Governança → Ops STI → Produção.

## Regra central (nunca violar)
**Solicitante NÃO encaminha diretamente para STI.** Obrigatório passar pelo Gestor Unidade.
**Válido nas duas fases:** solicitação e homologação.

## Como rodar

```bash
# Backend (porta 3000)
cd agilize-backend
npm run dev

# Frontend (porta 5173)
cd agilize-frontend
npm run dev

# Docker (PostgreSQL + Redis)
docker-compose up -d

# Migrations + seeds
cd agilize-backend && npm run db:setup
```

## Estrutura

```
agilize-backend/
  src/
    controllers/index.js   ← DemandaController + HistoricoController (único arquivo)
    models/index.js        ← Demanda + HistoricoDecisao
    routes/                ← demandas.js, auth.js, historico.js, notificacoes.js, relatorios.js
    services/              ← notificacao.js, relatorio.js
    middleware/            ← auth.js (JWT), validacao.js (Joi)
    db/
      migrations/          ← 001_create_tables.js, 002_add_workflow_columns.js
      seeds/               ← 001_initial_data.js

agilize-frontend/
  src/
    pages/                 ← LoginPage, DashboardPage, DemandaFormPage, DemandaDetailPage, NotificacoesPage
    components/            ← Layout, Sidebar, StatusBadge, Modal
    services/api.js        ← cliente Axios com interceptors JWT
  Identidade VIsual/       ← logos TCE-CE, logo STI, fonte CG Omega, manual PDF
```

## Stack
- **Backend:** Node.js 18 + Express + **PostgreSQL 16** + Knex + JWT + Redis + Nodemailer
- **Frontend:** React 18 + Vite + Tailwind CSS + React Router + Axios + lucide-react
- **Sem Redux ainda** (instalado, não configurado)
- **PostgreSQL é o padrão da organização** — usar `pg` como cliente Knex, JSONB para diagnósticos IA

## 25 Status do workflow (ver FLUXO.md para diagrama completo)

### Fase 1 — Solicitação
```
DRAFT → PENDENTE_GESTOR → DEVOLVIDA_AJUSTES → SOLICITANTE_AJUSTANDO → PENDENTE_GESTOR
                        → REJEITADA (terminal)
                        → VALIDADA_GESTOR → FILA_STI
                                          → AGUARDANDO_DPO (dados sensíveis)
                                          → APROVADA_STI
                                          → REPROVADA_STI (terminal)
                                          → SOLICITADO_AJUSTES_STI → SOLICITANTE_AJUSTANDO
```

### Fase 2 — Desenvolvimento
```
APROVADA_STI → EM_DESENVOLVIMENTO → SUBMETIDO_HOMOLOGACAO
```

### Fase 3 — Homologação (espelho da Fase 1)
```
SUBMETIDO_HOMOLOGACAO → PENDENTE_HOMOLOGACAO_GESTOR → DEVOLVIDA_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO
                                                     → VALIDADA_HOMOLOGACAO_GESTOR → FILA_HOMOLOGACAO_STI
                                                                                    → AGUARDANDO_DPO_HOMOLOGACAO (dados sensíveis)
                                                                                    → HOMOLOGADA
                                                                                    → SOLICITADO_AJUSTES_HOMOLOGACAO → AJUSTANDO_HOMOLOGACAO
```

### Fase 4 — Produção
```
HOMOLOGADA → EM_PRODUCAO → EM_MONITORAMENTO → DESATIVADA (terminal)
```

```
CANCELADA (disponível até SUBMETIDO_HOMOLOGACAO)
```

## 8 Perfis
| Perfil | O que faz |
|--------|-----------|
| SOLICITANTE | Cria demanda e desenvolve a solução |
| GESTOR_UNIDADE | Valida solicitação e homologação |
| GESTOR_DEPARTAMENTO | Supervisiona |
| ANALISTA_STI | Governança — analisa viabilidade e homologa (com apoio IA); pode encaminhar ao Avaliador Técnico |
| AVALIADOR_TECNICO | Revisão superior — recebe encaminhamentos do Analista, devolve ao analista ou solicita ajustes |
| DPO | Análise LGPD para dados sensíveis (Fases 1 e 3) |
| RESPONSAVEL_PRODUCAO | Ops STI — executa deploy |
| GESTOR_SISTEMA | Admin total |

> RESPONSAVEL_DESENVOLVIMENTO e RESPONSAVEL_HOMOLOGACAO foram removidos.
> O Solicitante desenvolve. A STI Governança homologa.

## Usuários de teste (seed)
| Email | Senha | Perfil | Unidade |
|-------|-------|--------|---------|
| jorge@agilize.com.br | senha123 | Solicitante | RH / Recrutamento e Seleção |
| pedro@agilize.com.br | senha123 | Solicitante | PROC / Processos Jurídicos |
| ana@agilize.com.br | senha123 | Solicitante | FIN / Contabilidade |
| rafael@agilize.com.br | senha123 | Solicitante | STI / Governança TI |
| maria@agilize.com.br | senha123 | Gestor Unidade | RH (gestora da unidade RH) |
| fernanda@agilize.com.br | senha123 | Gestor Unidade | PROC (gestora da unidade PROC) |
| luciana@agilize.com.br | senha123 | Gestor Unidade | FIN (gestora da unidade FIN) |
| joao@agilize.com.br | senha123 | Analista STI | STI |
| carlos@agilize.com.br | senha123 | Ops STI | STI |
| admin@agilize.com.br | senha123 | Admin | — |

## Identidade Visual TCE-CE
- Azul institucional: **#194383** (extraído do SVG oficial)
- Cinza texto: **#3C3C3B** (extraído do SVG oficial)
- Fonte: **CG Omega** (TTFs em `public/fonts/` — carregada em `globals.css`)
- Logos em `public/logos/` (SVGs prontos para uso)
- Ativos brutos de design em `design/` (não são código, não mexer)

## Fase atual: Fase 3 em andamento (~70%)

### Páginas frontend — status atual
- ✅ LoginPage, DashboardPage, DemandaFormPage, DemandaDetailPage
- ✅ NotificacoesPage, FluxoPage, ValidacaoPage, InventarioPage, AdminPage
- ❌ **RelatoriosPage** — próxima prioridade

## Convenções do frontend
- Tailwind para todos os estilos (sem CSS modules, sem styled-components)
- lucide-react para ícones
- `demandaService`, `authService`, `notificacaoService`, `adminService` de `src/services/api.js`
- Layout wrapper em toda página autenticada
- Perfil do usuário em `localStorage.getItem('usuario')` (JSON)
- Token em `localStorage.getItem('token')`
- Cores TCE-CE via tokens Tailwind (`tce-700` = #194383)
- Fonte CG Omega como font-family principal (ativa via globals.css)

## Convenções do backend
- Todos os controllers em `src/controllers/index.js` (um arquivo)
- Erros lançados com `err.statusCode` e `err.code`
- Notificações: fire-and-forget com `.catch(() => {})`
- Knex para todas as queries (sem ORM), client `pg`
- Joi para validação de input nos middlewares
- JSONB para colunas de diagnóstico IA

## Skills disponíveis (arquivos em `.claude/skills/`)
- `/engenheiro` — revisão técnica, arquitetura, segurança
- `/fluxo` — análise do workflow e regras de negócio
- `/analista` — diagnóstico de progresso e próximos passos
- `/ux` — design system, componentes React+Tailwind, identidade visual TCE-CE
- `/software-architect` — decisões de arquitetura, organização, refatoração
- `/engenheiro-seguranca-agilize` — auditoria de segurança do Agilize: histórico de vulns, mapa de arquivos, padrões de correção, checklist pré-deploy, exceções aceitas
- `/security-nodejs-react` — skill genérica e portável: vetores, padrões de correção, checklist e comandos de auditoria para qualquer projeto Node.js + Express + React

## Documentação de referência (pasta `docs/`)
- `docs/FLUXO.md` — diagrama completo dos 23 estados **(fonte da verdade)**
- `docs/REGRAS_NEGOCIO.md` — todas as regras funcionais
- `docs/PERMISSOES_DETALHADO.md` — matriz de permissões por perfil
- `docs/ENDPOINTS_API.md` — endpoints documentados
- `docs/GUIA_EXECUCAO.md` — como rodar o projeto
- `docs/GUIA_CLAUDE_CODE.md` — guia prático para usuários novos do Claude Code
- `docs/arquivados/` — documentos desatualizados (não usar como referência)
