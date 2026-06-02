# 📚 Planejamento Agilize 2.0 - Nova Validação de Gestor

## 🎯 Objetivo
Implementar um novo fluxo obrigatório de demandas onde:
- **Solicitante** cria demanda
- **Gestor da Unidade** valida (✅ rejeita, devolve ou aprova)
- **STI** processa (aprova, reprova ou solicita ajustes)
- **Dev → QA → Ops → Finalizado**

---

## 📑 DOCUMENTAÇÃO COMPLETA

### 1️⃣ **[RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md)** ⭐ COMECE AQUI
**Para:** Executivos, PO, Gestores  
**Tempo:** 15 minutos  
**Contém:**
- Visão geral do projeto
- Objetivos e métricas
- Roadmap de 16 semanas
- Estimativas e recursos
- Checklist de aprovação

→ **Use este documento para:** Apresentações e aprovação do projeto

---

### 2️⃣ **[PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md)** 📋 DOCUMENTO PRINCIPAL
**Para:** Tech Lead, Arquitetos, Product Owners  
**Tempo:** 60 minutos  
**Contém:**
- Novo fluxo com 14 status
- Perfis e permissões (resumo)
- Modelo de dados (5 tabelas)
- Regras de negócio (11 categorias)
- 50+ Endpoints API
- Telas por persona
- Sistema de notificações
- Validações obrigatórias

→ **Use este documento para:** Kickoff do projeto, arquitetura geral, treinamento

---

### 3️⃣ **[PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md)** 🔐 SEGURANÇA
**Para:** Arquiteto de Segurança, Developers, QA  
**Tempo:** 45 minutos  
**Contém:**
- 8 perfis com responsabilidades detalhadas
- Matriz 8x17 de permissões granulares
- Validação por contexto (unidade/depto)
- Implementação em pseudocódigo
- Decorators para endpoints
- 4 casos de teste

→ **Use este documento para:** Implementar autorização, code review, testes de segurança

---

### 4️⃣ **[REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md)** 📐 REQUISITOS FUNCIONAIS
**Para:** Product Owner, Analistas, Developers  
**Tempo:** 50 minutos  
**Contém:**
- RN-001 até RN-SOFT-001
- Validações de campos
- Histórico automático obrigatório
- Motivos de rejeição
- Limite de reenvios (max 3)
- SLA de gestor (5 dias) e STI (10 dias)
- Conformidade N-PSI-016
- Checklist de conformidade

→ **Use este documento para:** Desenvolvimento, testes, especificação

---

### 5️⃣ **[HISTORICO_TRAMITACAO.md](HISTORICO_TRAMITACAO.md)** 📊 AUDITORIA
**Para:** Arquitetos, Developers Backend, QA, Compliance  
**Tempo:** 40 minutos  
**Contém:**
- Tabela tb_historico_decisoes (30 campos)
- Triggers SQL automáticos
- Mockup visual da timeline
- 10 tipos de filtros
- Exportação em 4 formatos
- Métricas e dashboards
- Auditoria avançada
- Queries SQL prontas

→ **Use este documento para:** Implementar histórico, design da timeline, testes de auditoria

---

### 6️⃣ **[ENDPOINTS_API.md](ENDPOINTS_API.md)** 🔌 INTEGRAÇÃO
**Para:** Frontend Developers, Testers, Integradores  
**Tempo:** 50 minutos  
**Contém:**
- 50+ endpoints detalhados com exemplos
- Autenticação (JWT)
- CRUD de demandas
- Workflow de gestor (validar, rejeitar, devolver)
- Workflow de STI (aprovar, rejeitar, ajustes)
- Histórico e exportação
- Tratamento de erros
- Rate limiting

→ **Use este documento para:** Desenvolvimento frontend, testes de API, integração

---

### 7️⃣ **[INDICE_GUIA_NAVEGACAO.md](INDICE_GUIA_NAVEGACAO.md)** 🗺️ NAVEGAÇÃO
**Para:** Todos  
**Tempo:** 10 minutos  
**Contém:**
- Mapa de navegação por papel
- Busca rápida por tópico
- Checklist de compreensão
- Estimativas de leitura
- Suporte e dúvidas

→ **Use este documento para:** Encontrar rapidamente o que precisa

---

## 👥 NAVEGAÇÃO POR PAPEL

### 👨‍💼 **Executivo / C-Level**
1. [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) (15 min)
2. Decisão: Aprovar ou rejeitar?

### 👨‍💼 **Product Owner**
1. [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) (visão geral)
2. [PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md) (requisitos)
3. [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md) (regras funcionais)

### 👨‍💻 **Tech Lead / Arquiteto**
1. [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) (visão geral)
2. [PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md) (técnico)
3. [PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md) (segurança)
4. [ENDPOINTS_API.md](ENDPOINTS_API.md) (integração)

### 👨‍💻 **Developer Backend**
1. [PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md#4-modelo-de-dados) (BD)
2. [PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md#4-implementação-técnica) (auth)
3. [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md) (todas as regras)
4. [ENDPOINTS_API.md](ENDPOINTS_API.md) (endpoints)
5. [HISTORICO_TRAMITACAO.md](HISTORICO_TRAMITACAO.md#1-tabela-de-histórico-de-decisões) (histórico)

### 👨‍💻 **Developer Frontend**
1. [PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md#7-estrutura-de-telas) (telas)
2. [ENDPOINTS_API.md](ENDPOINTS_API.md) (todos os endpoints)
3. [PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md#2-matriz-de-permissões-expandida) (permissões)

### 🧪 **QA / Tester**
1. [PLANEJAMENTO_AGILIZE_2.0.md](PLANEJAMENTO_AGILIZE_2.0.md) (fluxo geral)
2. [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md#10-checklist-de-conformidade) (casos de teste)
3. [ENDPOINTS_API.md](ENDPOINTS_API.md#11-tratamento-de-erros) (API)
4. [PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md#5-testes-de-permissões) (segurança)

### 🔐 **Compliance / Segurança**
1. [PERMISSOES_DETALHADO.md](PERMISSOES_DETALHADO.md) (matriz)
2. [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md#7-regras-de-conformidade-n-psi-016) (N-PSI-016)
3. [HISTORICO_TRAMITACAO.md](HISTORICO_TRAMITACAO.md#8-conformidade-e-segurança) (auditoria)

---

## 🔑 CONCEITOS PRINCIPAIS

### Novo Fluxo Obrigatório
```
SOLICITANTE → GESTOR_UNIDADE → STI → DEV → QA → OPS → ✅
              ↓ (pode rejeitar)
              ❌ (status: REJEITADA)
              
              ↓ (pode devolver)
              🔄 (status: DEVOLVIDA_AJUSTES)
```

### 14 Status do Workflow
| Status | Descrição |
|--------|-----------|
| DRAFT | Criada, não enviada |
| PENDENTE_GESTOR | Aguardando gestor |
| DEVOLVIDA_AJUSTES | Gestor devolveu |
| SOLICITANTE_AJUSTANDO | Solicitante ajustando |
| VALIDADA_GESTOR | ✅ Gestor aprovou |
| FILA_STI | Enviada para STI |
| APROVADA_STI | ✅ STI aprovou |
| REPROVADA_STI | ❌ STI rejeitou |
| SOLICITADO_AJUSTES_STI | STI solicitou ajustes |
| EM_DESENVOLVIMENTO | Dev trabalhando |
| EM_HOMOLOGACAO | QA testando |
| EM_PRODUCAO | Em produção |
| FINALIZADA | ✅ Concluída |
| CANCELADA | ❌ Cancelada |

### 8 Perfis do Sistema
1. SOLICITANTE - Cria demanda
2. GESTOR_UNIDADE - Valida
3. GESTOR_DEPARTAMENTO - Supervisiona
4. ANALISTA_STI - Aprova para desenvolvimento
5. RESPONSAVEL_DESENVOLVIMENTO - Desenvolve
6. RESPONSAVEL_HOMOLOGACAO - Testa
7. RESPONSAVEL_PRODUCAO - Deploy
8. GESTOR_SISTEMA - Admin tudo

### Regra Central (N-PSI-016)
✅ **SOLICITANTE COMUM NÃO PODE encaminhar diretamente para STI**

Apenas GESTOR_UNIDADE ou ADMIN podem formalizar a solicitação.

---

## 📊 TABELAS PRINCIPAIS

### 1. tb_demandas
- id_demanda, numero_demanda, titulo, descricao
- id_solicitante, id_gestor_unidade, id_unidade
- status_atual, prioridade, tipo_demanda
- data_criacao, data_validacao_gestor, data_fila_sti

### 2. tb_historico_decisoes ⭐
- id_historico, id_demanda, id_usuario, perfil_usuario
- status_anterior, status_novo, tipo_acao
- parecer, comentario, data_hora, timezone
- ip_usuario, user_agent, endpoint_chamado
- duracao_etapa_dias, sla_em_dia

### 3. tb_atribuicoes_gestor
- id_atribuicao, id_gestor, perfil_gestor
- id_unidade, id_departamento
- data_inicio, data_fim, ativo

### 4. tb_notificacoes
- id_notificacao, id_usuario_destinatario, id_demanda
- tipo_notificacao, mensagem, canal (EMAIL/SISTEMA)
- lido, data_criacao, data_leitura

### 5. tb_validacoes_obrigatorias
- id_validacao, id_demanda, tipo_validacao
- nome_regra, valor_esperado, valor_encontrado
- resultado (PASSOU/FALHOU/AVISO), mensagem_erro

---

## 🚀 ROADMAP RESUMIDO

| Fase | Semanas | Objetivo | Entrega |
|------|---------|----------|---------|
| 1 | 1-3 | BD + Auth | Ambiente funcionando |
| 2 | 4-6 | Fluxo Gestor | Gestor consegue validar |
| 3 | 7-9 | Fluxo STI | STI consegue processar |
| 4 | 10-12 | Dev → Prod | Ciclo completo |
| 5 | 13-14 | Frontend | Interface responsiva |
| 6 | 15-16 | Testes | Pronto para produção |

---

## ⏱️ TEMPO TOTAL DE LEITURA

| Documento | Tempo |
|-----------|-------|
| RESUMO_EXECUTIVO | 15 min |
| PLANEJAMENTO_AGILIZE_2.0 | 60 min |
| PERMISSOES_DETALHADO | 45 min |
| REGRAS_NEGOCIO | 50 min |
| HISTORICO_TRAMITACAO | 40 min |
| ENDPOINTS_API | 50 min |
| INDICE_GUIA_NAVEGACAO | 10 min |
| **TOTAL** | **270 min (4h 30m)** |

**Recomendação:** Leia RESUMO_EXECUTIVO (15 min) + seu documento específico de papel (45-60 min) = **60-75 minutos**

---

## ✅ CHECKLIST RÁPIDO

Antes de começar o projeto, valide:

- [ ] Leu RESUMO_EXECUTIVO.md
- [ ] Obteve aprovação de executivos
- [ ] Leu seu documento específico de papel
- [ ] Entendeu o novo fluxo (14 status)
- [ ] Entendeu os 8 perfis
- [ ] Entendeu a regra central (gestor é obrigatório)
- [ ] Entendeu as 5 tabelas principais
- [ ] Entendeu os 50+ endpoints
- [ ] Formou o time de desenvolvimento
- [ ] Agendou kickoff

---

## 🔗 REFERÊNCIAS

- **Normativa:** N-PSI-016 (Conformidade)
- **Padrão API:** REST + JSON
- **Autenticação:** OAuth 2.0 + JWT
- **Banco:** MySQL 8.0+
- **Timezone:** America/Sao_Paulo
- **Idioma:** Português (Brasil)

---

## 📞 SUPORTE

Se tiver dúvidas sobre um tópico específico, consulte o documento:

| Dúvida | Documento |
|--------|-----------|
| "Como funciona o fluxo?" | PLANEJAMENTO_AGILIZE_2.0.md |
| "Quem pode fazer o quê?" | PERMISSOES_DETALHADO.md |
| "Qual é a regra de negócio?" | REGRAS_NEGOCIO.md |
| "Como implementar histórico?" | HISTORICO_TRAMITACAO.md |
| "Quais são os endpoints?" | ENDPOINTS_API.md |
| "Qual documento devo ler?" | INDICE_GUIA_NAVEGACAO.md |

---

## 📝 INFORMAÇÕES DO DOCUMENTO

**Projeto:** Agilize 2.0 - Novo Fluxo de Validação  
**Data:** 24 de Abril de 2026  
**Versão:** 1.0  
**Status:** ✅ Completo e Pronto para Uso  
**Documentos:** 7  
**Páginas Totais:** ~150+  
**Conformidade:** N-PSI-016  

---

**🎯 Comece agora:** Leia [RESUMO_EXECUTIVO.md](RESUMO_EXECUTIVO.md) (15 minutos)

