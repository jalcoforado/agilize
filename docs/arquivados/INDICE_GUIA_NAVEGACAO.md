# ÍNDICE E GUIA DE NAVEGAÇÃO - Planejamento Agilize 2.0

## 📑 Documentos Criados

### 1. **RESUMO_EXECUTIVO.md** ⭐ (Comece aqui)
**Objetivo:** Visão geral do projeto para executivos e stakeholders  
**Público:** C-Level, Product Owner, Gestores  
**Tempo de leitura:** 15 minutos

**Contém:**
- Problema e solução
- Objetivos principais
- Arquitetura técnica resumida
- Conformidade N-PSI-016
- Roadmap de 16 semanas
- Estimativas de horas e recursos
- Riscos e mitigações
- Checklist de aprovação

**Quando usar:**
- Apresentações para aprovação
- Reuniões com executivos
- Business case do projeto
- Planejamento orçamentário

---

### 2. **PLANEJAMENTO_AGILIZE_2.0.md** 📋 (Documento Principal)
**Objetivo:** Planejamento técnico e funcional completo  
**Público:** Tech Lead, Arquitetos, Product Owners  
**Tempo de leitura:** 60 minutos

**Contém:**
- Novo fluxo de demanda (14 status)
- Perfis e permissões (resumo)
- Modelo de dados (5 tabelas principais)
- Regras de negócio (11 categorias)
- 50+ Endpoints API
- Estrutura de telas (4 personas)
- Sistema de notificações
- Histórico de tramitação
- Validações obrigatórias
- Cronograma de 16 semanas

**Quando usar:**
- Kickoff do projeto
- Reuniões de arquitetura
- Discussões técnicas gerais
- Briefing de novo membro da equipe

---

### 3. **PERMISSOES_DETALHADO.md** 🔐 (Segurança)
**Objetivo:** Matriz completa de permissões e controle de acesso  
**Público:** Arquiteto de Segurança, Dev Backend, QA  
**Tempo de leitura:** 45 minutos

**Contém:**
- 8 Perfis de sistema com responsabilidades
- Matriz 8x17 de permissões granulares
- Validação por contexto (unidade, departamento)
- Regras de segregação de funções
- Implementação técnica (pseudocódigo)
- Decorators para endpoints
- Auditoria de permissões
- 4 Casos de teste

**Quando usar:**
- Implementação de autorização
- Code review de segurança
- Testes de permissões
- Auditoria de acesso

---

### 4. **REGRAS_NEGOCIO.md** 📐 (Requisitos Funcionais)
**Objetivo:** Todas as regras de negócio e validações  
**Público:** Product Owner, Analista, Dev Backend  
**Tempo de leitura:** 50 minutos

**Contém:**
- RN-FLU: Regras de fluxo obrigatório
- RN-VAL: Validações de campos
- RN-HIST: Histórico e rastreabilidade
- RN-NOT: Notificações automáticas
- RN-REJ: Motivos de rejeição
- RN-REENVI: Limites de reenvio
- RN-CONF: Conformidade N-PSI-016
- RN-TEMP: SLAs e prazos
- RN-SOFT: Soft delete
- Checklist de conformidade

**Quando usar:**
- Desenvolvimento de features
- Escrita de testes
- Validação de requisitos
- Testes de aceitação

---

### 5. **HISTORICO_TRAMITACAO.md** 📊 (Auditoria)
**Objetivo:** Estrutura e visualização do histórico de decisões  
**Público:** Arquiteto, Dev Backend, QA, Compliance  
**Tempo de leitura:** 40 minutos

**Contém:**
- Tabela tb_historico_decisoes (30 campos)
- Triggers SQL de preenchimento automático
- Mockup visual da timeline
- Filtros e buscas (10 tipos)
- Exportação em 4 formatos (PDF, Excel, CSV, JSON)
- Métricas e dashboards
- Auditoria avançada
- Consultas SQL prontas
- Notificações baseadas em histórico
- Performance e otimização

**Quando usar:**
- Implementação de histórico
- Design da timeline
- Testes de auditoria
- Relatórios e compliance

---

### 6. **ENDPOINTS_API.md** 🔌 (Integração)
**Objetivo:** Documentação completa de todos os endpoints REST  
**Público:** Frontend Developer, Integrador, Tester  
**Tempo de leitura:** 50 minutos

**Contém:**
- Base URL e autenticação
- Login/Logout/Refresh
- CRUD de demandas (5 endpoints)
- Workflow gestor (4 endpoints)
- Workflow STI (5 endpoints)
- Fases de desenvolvimento (4 endpoints)
- Histórico e exportação (2 endpoints)
- Validações (1 endpoint)
- Notificações (3 endpoints)
- Relatórios (2 endpoints)
- Tratamento de erros
- Rate limiting e paginação

**Quando usar:**
- Desenvolvimento frontend
- Testes de API
- Integração com sistemas externos
- Documentação para clientes

---

## 🗺️ MAPA DE NAVEGAÇÃO POR PAPEL

### 👨‍💼 EXECUTIVO / C-LEVEL
1. RESUMO_EXECUTIVO.md (15 min)
2. → Decisão: Aprovar projeto?

### 👨‍💻 TECH LEAD / ARQUITETO
1. RESUMO_EXECUTIVO.md (visão geral)
2. PLANEJAMENTO_AGILIZE_2.0.md (técnico completo)
3. PERMISSOES_DETALHADO.md (segurança)
4. ENDPOINTS_API.md (integração)

### 👨‍💻 DESENVOLVEDOR BACKEND
1. PLANEJAMENTO_AGILIZE_2.0.md (seção: Modelo de Dados)
2. PERMISSOES_DETALHADO.md (implementação técnica)
3. REGRAS_NEGOCIO.md (todas as regras)
4. ENDPOINTS_API.md (endpoints a implementar)
5. HISTORICO_TRAMITACAO.md (estrutura BD)

### 👨‍💻 DESENVOLVEDOR FRONTEND
1. PLANEJAMENTO_AGILIZE_2.0.md (seção: Estrutura de Telas)
2. ENDPOINTS_API.md (todos os endpoints)
3. PERMISSOES_DETALHADO.md (matrix de permissões)

### 🧪 QA / TESTER
1. PLANEJAMENTO_AGILIZE_2.0.md (fluxos gerais)
2. REGRAS_NEGOCIO.md (checklist de testes)
3. ENDPOINTS_API.md (casos de teste de API)
4. PERMISSOES_DETALHADO.md (casos de teste de segurança)
5. HISTORICO_TRAMITACAO.md (auditoria)

### 📋 PRODUCT OWNER
1. RESUMO_EXECUTIVO.md (overview)
2. PLANEJAMENTO_AGILIZE_2.0.md (requisitos)
3. REGRAS_NEGOCIO.md (regras funcionais)

### 🔐 COMPLIANCE / SEGURANÇA
1. PERMISSOES_DETALHADO.md (matriz de acesso)
2. REGRAS_NEGOCIO.md (seção N-PSI-016)
3. HISTORICO_TRAMITACAO.md (auditoria)

---

## 🔍 BUSCA RÁPIDA POR TÓPICO

### Fluxo de Demanda
→ PLANEJAMENTO_AGILIZE_2.0.md, seção 1
→ Mockup visual em ASCII art

### Status do Workflow
→ PLANEJAMENTO_AGILIZE_2.0.md, seção 2
→ Tabela com 14 status

### Perfis e Permissões
→ PERMISSOES_DETALHADO.md, seções 1-3
→ Matriz 8x17 expandida

### Modelo de Dados
→ PLANEJAMENTO_AGILIZE_2.0.md, seção 4
→ DDL SQL completo

### Tabela de Histórico
→ HISTORICO_TRAMITACAO.md, seção 1
→ SQL + 30 campos + triggers

### Validações de Campo
→ REGRAS_NEGOCIO.md, seção 2
→ VD-001 até VD-005

### SLA e Prazos
→ REGRAS_NEGOCIO.md, seção 8
→ RN-TEMP-001 até RN-TEMP-003

### Endpoints
→ ENDPOINTS_API.md
→ 50+ endpoints documentados

### Telas do Sistema
→ PLANEJAMENTO_AGILIZE_2.0.md, seção 7
→ Mockups ASCII por persona

### Notificações
→ PLANEJAMENTO_AGILIZE_2.0.md, seção 8
→ Templates de email

### Timeline Visual
→ HISTORICO_TRAMITACAO.md, seção 2
→ Mockup completo com eventos

### Exportação de Relatórios
→ ENDPOINTS_API.md, seção 10
→ 4 formatos (PDF, Excel, CSV, JSON)

---

## 📊 ESTRUTURA DE CONTEÚDO

```
┌─────────────────────────────────────────────────────────┐
│         PLANEJAMENTO AGILIZE 2.0 - ESTRUTURA            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ VISÃO ESTRATÉGICA                                  │
│  │  └─ RESUMO_EXECUTIVO.md ⭐                          │
│  │     (Approve/Reject)                                │
│  │                                                     │
│  ├─ ARQUITETURA                                        │
│  │  ├─ PLANEJAMENTO_AGILIZE_2.0.md 📋 (Master)        │
│  │  │  ├─ Fluxo                                        │
│  │  │  ├─ Modelo de Dados                             │
│  │  │  ├─ Perfis (resumo)                             │
│  │  │  ├─ Endpoints (resumo)                          │
│  │  │  └─ Telas                                       │
│  │  │                                                 │
│  │  └─ Documentos Especializados:                      │
│  │                                                    │
│  ├─ SEGURANÇA & ACESSO                                │
│  │  └─ PERMISSOES_DETALHADO.md 🔐                     │
│  │     (Matriz completa + implementação)              │
│  │                                                    │
│  ├─ REQUISITOS FUNCIONAIS                             │
│  │  └─ REGRAS_NEGOCIO.md 📐                           │
│  │     (Todas as regras + validações)                │
│  │                                                    │
│  ├─ AUDITORIA & HISTÓRICO                             │
│  │  └─ HISTORICO_TRAMITACAO.md 📊                     │
│  │     (Estrutura + Visualização + Queries)           │
│  │                                                    │
│  └─ INTEGRAÇÃO                                        │
│     └─ ENDPOINTS_API.md 🔌                            │
│        (50+ endpoints + exemplos)                     │
│                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## ⏱️ ESTIMATIVA DE LEITURA

| Documento | Tempo | Público | Prioridade |
|-----------|-------|---------|-----------|
| RESUMO_EXECUTIVO | 15 min | Executivos | ⭐⭐⭐ |
| PLANEJAMENTO_AGILIZE_2.0 | 60 min | Arquitetos | ⭐⭐⭐ |
| PERMISSOES_DETALHADO | 45 min | Devs/QA | ⭐⭐ |
| REGRAS_NEGOCIO | 50 min | Devs/QA | ⭐⭐⭐ |
| HISTORICO_TRAMITACAO | 40 min | Devs/Compliance | ⭐⭐ |
| ENDPOINTS_API | 50 min | Devs/Testers | ⭐⭐⭐ |
| **TOTAL** | **4h 20m** | Todos | - |

---

## ✅ CHECKLIST DE COMPREENSÃO

Após ler os documentos, você deve conseguir responder:

**Conceitos Básicos:**
- [ ] Qual é o novo fluxo de demanda?
- [ ] Por que gestor é obrigatório?
- [ ] Quais são os 14 status do workflow?

**Segurança:**
- [ ] Quais são os 8 perfis do sistema?
- [ ] Solicitante pode enviar para STI? Por quê?
- [ ] Como funciona a segregação de funções?

**Dados:**
- [ ] Quais são as 5 tabelas principais?
- [ ] O que tb_historico_decisoes armazena?
- [ ] Como o histórico é preenchido?

**Requisitos:**
- [ ] Quais são os campos obrigatórios ao criar demanda?
- [ ] Qual é o SLA de gestor? E STI?
- [ ] Qual é o limite de reenvios?

**Integração:**
- [ ] Qual é a base URL da API?
- [ ] Como autenticar (JWT)?
- [ ] Quantos endpoints existem?

**Conformidade:**
- [ ] Qual normativa o sistema segue?
- [ ] Como é garantida a rastreabilidade?
- [ ] Qual é o cronograma?

---

## 🔗 RELAÇÕES ENTRE DOCUMENTOS

```
RESUMO_EXECUTIVO.md
    ↓ (detalhes técnicos)
    PLANEJAMENTO_AGILIZE_2.0.md
        ├─ (segurança) → PERMISSOES_DETALHADO.md
        ├─ (requisitos) → REGRAS_NEGOCIO.md
        ├─ (auditoria) → HISTORICO_TRAMITACAO.md
        └─ (integração) → ENDPOINTS_API.md

Ciclo de Implementação:
PLANEJAMENTO_AGILIZE_2.0 (o quê fazer)
    ↓
PERMISSOES_DETALHADO (quem pode fazer)
    ↓
REGRAS_NEGOCIO (como fazer)
    ↓
ENDPOINTS_API (interfaces)
    ↓
HISTORICO_TRAMITACAO (como rastrear)
```

---

## 📞 SUPORTE E DÚVIDAS

Se você tiver dúvidas sobre um tópico:

**"Como funciona a validação de gestor?"**
→ Leia: PLANEJAMENTO_AGILIZE_2.0.md, seção 1
→ Depois: PERMISSOES_DETALHADO.md, RN-FLU-001

**"Quais são as permissões de cada perfil?"**
→ Leia: PERMISSOES_DETALHADO.md, seção 2 (Matriz)

**"Como implementar o histórico?"**
→ Leia: HISTORICO_TRAMITACAO.md, seções 1-3

**"Qual é a sequência de endpoints?"**
→ Leia: ENDPOINTS_API.md, seções 3-6

**"Qual é a conformidade N-PSI-016?"**
→ Leia: REGRAS_NEGOCIO.md, seção 7 (RN-CONF)

**"Quando é vencido o SLA?"**
→ Leia: REGRAS_NEGOCIO.md, seção 8 (RN-TEMP)

---

## 🎯 PRÓXIMOS PASSOS

1. **Leia:** RESUMO_EXECUTIVO.md (visão geral)
2. **Obtenha aprovação:** Stakeholders assinarem
3. **Estude:** PLANEJAMENTO_AGILIZE_2.0.md (completo)
4. **Especialize:** Leia documento do seu papel
5. **Implemente:** Use documentos como referência
6. **Valide:** Checklist de conformidade

---

**Documentação:** Agilize 2.0 - Novo Fluxo de Validação  
**Data:** 24 de Abril de 2026  
**Versão:** 1.0  
**Total de Documentos:** 6  
**Total de Páginas:** ~150  
**Status:** ✅ Completo e Pronto para Uso
