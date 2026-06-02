# Planejamento Agilize 2.0 - Novo Fluxo de Validação de Gestor

## 📋 Resumo Executivo

O Agilize 2.0 implementará um novo fluxo obrigatório que inclui validação de gestor antes da formalização junto à STI, garantindo qualidade e aderência à N-PSI-016.

**Princípio Central:** Solicitante comum → Gestor → STI

---

## 1️⃣ NOVO FLUXO DE DEMANDA

```
┌─────────────────┐
│  SOLICITANTE    │  Cria demanda inicial
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  PENDENTE_GESTOR           │  Awaiting manager validation
└────────┬────────────────────┘
         │
         ├─► REJEITADA (comentário obrigatório)
         │
         ├─► DEVOLVIDA_AJUSTES (comentário obrigatório)
         │   └─► Volta para SOLICITANTE_AJUSTANDO
         │
         └─► VALIDADA_GESTOR (encaminhar para STI)
              │
              ▼
         ┌─────────────────────┐
         │  FILA_STI          │  Formalizada junto à STI
         └────────┬────────────┘
                  │
                  ├─► APROVADA_STI
                  ├─► REPROVADA_STI
                  └─► SOLICITADO_AJUSTES_STI
                      │
                      ▼
              ┌─────────────────────┐
              │  EM_DESENVOLVIMENTO  │
              └────────┬─────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  EM_HOMOLOGACAO    │
              └────────┬─────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  EM_PRODUCAO       │
              └────────┬─────────────┘
                       │
                       ▼
              ┌─────────────────────┐
              │  FINALIZADA         │
              └─────────────────────┘
```

---

## 2️⃣ STATUS DO WORKFLOW

| Status | Código | Descrição | Ator Responsável | Ações Possíveis |
|--------|--------|-----------|------------------|-----------------|
| RASCUNHO | DRAFT | Demanda criada, não enviada | Solicitante | Editar, Enviar |
| PENDENTE_GESTOR | PENDING_MANAGER | Aguardando validação do gestor | Gestor | Validar, Rejeitar, Devolver |
| DEVOLVIDA_AJUSTES | RETURNED_ADJUSTMENTS | Gestor devolveu para ajustes | Solicitante | Editar, Reenviar |
| SOLICITANTE_AJUSTANDO | REQUESTER_ADJUSTING | Solicitante fazendo ajustes | Solicitante | Reenviador Gestor |
| VALIDADA_GESTOR | VALIDATED_MANAGER | Gestor aprovou, aguarda STI | STI | Encaminhar STI |
| FILA_STI | STI_QUEUE | Formalizada junto à STI | STI | Avaliar |
| APROVADA_STI | APPROVED_STI | Aprovada pela STI | STI | Iniciar Desenvolvimento |
| REPROVADA_STI | REJECTED_STI | Rejeitada pela STI | STI | Finalizar |
| SOLICITADO_AJUSTES_STI | ADJUSTMENTS_REQUESTED_STI | STI solicita ajustes | Solicitante/Gestor | Ajustar, Reenviar |
| EM_DESENVOLVIMENTO | IN_DEVELOPMENT | Em desenvolvimento | Dev Team | Avançar |
| EM_HOMOLOGACAO | IN_HOMOLOG | Em homologação | QA Team | Aprovar/Falhar |
| EM_PRODUCAO | IN_PRODUCTION | Em produção | Ops Team | Finalizar |
| FINALIZADA | COMPLETED | Demanda finalizada | Admin | Arquivar |
| CANCELADA | CANCELLED | Demanda cancelada | Admin | - |

---

## 3️⃣ PERFIS E PERMISSÕES

### 3.1 Perfis do Sistema

```
┌─────────────────────────────────────────┐
│         PERFIS DISPONÍVEIS              │
├─────────────────────────────────────────┤
│ 1. SOLICITANTE                          │
│ 2. GESTOR_UNIDADE                       │
│ 3. GESTOR_DEPARTAMENTO                  │
│ 4. ANALISTA_STI                         │
│ 5. RESPONSAVEL_DESENVOLVIMENTO          │
│ 6. RESPONSAVEL_HOMOLOGACAO              │
│ 7. RESPONSAVEL_PRODUCAO                 │
│ 8. GESTOR_SISTEMA                       │
└─────────────────────────────────────────┘
```

### 3.2 Matriz de Permissões

| Ação | Solicitante | Gestor | Analista STI | Dev | QA | Ops | Admin |
|------|-------------|--------|--------------|-----|-----|-----|-------|
| Criar Demanda | ✅ | - | - | - | - | - | ✅ |
| Editar Própria Demanda (DRAFT) | ✅ | - | - | - | - | - | ✅ |
| Editar Demanda (AJUSTES) | ✅ | - | - | - | - | - | ✅ |
| Enviar para Gestor | ✅ | - | - | - | - | - | ✅ |
| Visualizar Demandas Próprias | ✅ | - | - | - | - | - | ✅ |
| Validar Demanda | - | ✅ | - | - | - | - | ✅ |
| Rejeitar Demanda | - | ✅ | - | - | - | - | ✅ |
| Devolver para Ajustes | - | ✅ | - | - | - | - | ✅ |
| Encaminhar para STI | - | ✅ | - | - | - | - | ✅ |
| Visualizar Fila STI | - | - | ✅ | - | - | - | ✅ |
| Avaliar Demanda STI | - | - | ✅ | - | - | - | ✅ |
| Aprovar STI | - | - | ✅ | - | - | - | ✅ |
| Rejeitar STI | - | - | ✅ | - | - | - | ✅ |
| Solicitar Ajustes STI | - | - | ✅ | - | - | - | ✅ |
| Iniciar Desenvolvimento | - | - | ✅ | ✅ | - | - | ✅ |
| Atualizar Status Dev | - | - | - | ✅ | - | - | ✅ |
| Atualizar Status QA | - | - | - | - | ✅ | - | ✅ |
| Atualizar Status Produção | - | - | - | - | - | ✅ | ✅ |
| Visualizar Histórico | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gerar Relatórios | - | - | ✅ | - | - | - | ✅ |
| Administrar Sistema | - | - | - | - | - | - | ✅ |

---

## 4️⃣ MODELO DE DADOS

### 4.1 Tabela: tb_demandas

```sql
CREATE TABLE tb_demandas (
    id_demanda BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Identificação
    numero_demanda VARCHAR(20) UNIQUE NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao LONGTEXT NOT NULL,
    justificativa LONGTEXT,
    
    -- Solicitante
    id_solicitante BIGINT NOT NULL,
    nome_solicitante VARCHAR(255),
    email_solicitante VARCHAR(255),
    telefone_solicitante VARCHAR(20),
    
    -- Unidade/Departamento
    id_unidade BIGINT NOT NULL,
    nome_unidade VARCHAR(255),
    id_departamento BIGINT NOT NULL,
    nome_departamento VARCHAR(255),
    
    -- Gestor
    id_gestor_unidade BIGINT,
    nome_gestor_unidade VARCHAR(255),
    email_gestor_unidade VARCHAR(255),
    
    -- Classificação
    id_tipo_demanda BIGINT NOT NULL,
    tipo_demanda VARCHAR(100), -- BUG, MELHORIA, NOVO_SISTEMA, SUPORTE
    id_prioridade BIGINT NOT NULL,
    prioridade VARCHAR(50), -- BAIXA, MÉDIA, ALTA, CRÍTICA
    id_categoria BIGINT,
    categoria VARCHAR(100),
    
    -- Metadados
    investimento_estimado DECIMAL(15,2),
    tempo_estimado_horas INT,
    recurso_especial TINYINT DEFAULT 0,
    descricao_recurso TEXT,
    
    -- Status
    status_atual VARCHAR(50) NOT NULL,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_envio_gestor DATETIME,
    data_validacao_gestor DATETIME,
    data_fila_sti DATETIME,
    data_conclusao DATETIME,
    
    -- Rastreamento
    id_usuario_criacao BIGINT,
    id_usuario_ultima_atualizacao BIGINT,
    data_ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Auditoria
    ip_criacao VARCHAR(50),
    user_agent VARCHAR(500),
    
    -- Soft Delete
    ativo TINYINT DEFAULT 1,
    data_exclusao DATETIME,
    id_usuario_exclusao BIGINT,
    motivo_exclusao VARCHAR(500),
    
    INDEX idx_numero (numero_demanda),
    INDEX idx_solicitante (id_solicitante),
    INDEX idx_gestor (id_gestor_unidade),
    INDEX idx_status (status_atual),
    INDEX idx_unidade (id_unidade),
    INDEX idx_criacao (data_criacao),
    FOREIGN KEY (id_unidade) REFERENCES tb_unidades(id_unidade),
    FOREIGN KEY (id_departamento) REFERENCES tb_departamentos(id_departamento)
);
```

### 4.2 Tabela: tb_historico_decisoes

```sql
CREATE TABLE tb_historico_decisoes (
    id_historico BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Referência
    id_demanda BIGINT NOT NULL,
    numero_demanda VARCHAR(20),
    
    -- Usuário responsável
    id_usuario BIGINT NOT NULL,
    nome_usuario VARCHAR(255),
    email_usuario VARCHAR(255),
    perfil_usuario VARCHAR(100),
    
    -- Transição de Status
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    
    -- Parecer/Comentário
    parecer TEXT,
    comentario TEXT,
    tipo_acao VARCHAR(50), -- VALIDAR, REJEITAR, DEVOLVER, APROVAR
    
    -- Timestamp
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_hora_formatada VARCHAR(50),
    
    -- Metadados
    ip_usuario VARCHAR(50),
    user_agent VARCHAR(500),
    duracao_dias INT, -- Tempo desde ação anterior
    
    -- Anexos/Evidências
    id_anexo_complementar BIGINT,
    url_anexo VARCHAR(500),
    
    INDEX idx_demanda (id_demanda),
    INDEX idx_usuario (id_usuario),
    INDEX idx_data (data_hora),
    INDEX idx_status_anterior (status_anterior),
    INDEX idx_status_novo (status_novo),
    FOREIGN KEY (id_demanda) REFERENCES tb_demandas(id_demanda)
);
```

### 4.3 Tabela: tb_validacoes_obrigatorias

```sql
CREATE TABLE tb_validacoes_obrigatorias (
    id_validacao BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Identificação
    id_demanda BIGINT NOT NULL,
    tipo_validacao VARCHAR(100), -- CAMPO_OBRIGATORIO, REGRA_NEGOCIO, CONFORMIDADE
    
    -- Regra
    nome_regra VARCHAR(255),
    descricao_regra TEXT,
    campo_validado VARCHAR(100),
    valor_esperado VARCHAR(500),
    valor_encontrado VARCHAR(500),
    
    -- Status
    resultado ENUM('PASSOU', 'FALHOU', 'AVISO'),
    mensagem_erro TEXT,
    
    -- Rastreamento
    data_validacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_validacao BIGINT,
    
    FOREIGN KEY (id_demanda) REFERENCES tb_demandas(id_demanda),
    INDEX idx_demanda (id_demanda),
    INDEX idx_resultado (resultado)
);
```

### 4.4 Tabela: tb_notificacoes

```sql
CREATE TABLE tb_notificacoes (
    id_notificacao BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Destinatário
    id_usuario_destinatario BIGINT NOT NULL,
    email_destinatario VARCHAR(255),
    
    -- Referência
    id_demanda BIGINT,
    numero_demanda VARCHAR(20),
    
    -- Conteúdo
    tipo_notificacao VARCHAR(100), -- DEMANDA_ENVIADA, VALIDACAO_SOLICITADA, REJEICAO, etc
    titulo_notificacao VARCHAR(255),
    mensagem_notificacao TEXT,
    link_acao VARCHAR(500),
    
    -- Status
    lido TINYINT DEFAULT 0,
    data_leitura DATETIME,
    ativo TINYINT DEFAULT 1,
    
    -- Rastreamento
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    canal_envio VARCHAR(50), -- EMAIL, SISTEMA, SMS
    data_envio DATETIME,
    
    INDEX idx_usuario (id_usuario_destinatario),
    INDEX idx_demanda (id_demanda),
    INDEX idx_lido (lido),
    FOREIGN KEY (id_demanda) REFERENCES tb_demandas(id_demanda)
);
```

### 4.5 Tabela: tb_atribuicoes_gestor

```sql
CREATE TABLE tb_atribuicoes_gestor (
    id_atribuicao BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Gestor
    id_gestor BIGINT NOT NULL,
    nome_gestor VARCHAR(255),
    email_gestor VARCHAR(255),
    perfil_gestor VARCHAR(50), -- GESTOR_UNIDADE, GESTOR_DEPARTAMENTO
    
    -- Unidade/Departamento
    id_unidade BIGINT,
    id_departamento BIGINT,
    
    -- Período de Vigência
    data_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fim DATETIME,
    ativo TINYINT DEFAULT 1,
    
    -- Auditoria
    id_usuario_criacao BIGINT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (id_unidade) REFERENCES tb_unidades(id_unidade),
    FOREIGN KEY (id_departamento) REFERENCES tb_departamentos(id_departamento),
    UNIQUE KEY uk_gestor_unidade (id_gestor, id_unidade)
);
```

---

## 5️⃣ REGRAS DE NEGÓCIO

### 5.1 Fluxo de Validação (Essencial)

```
RN-001: Solicitante Comum Não Pode Formalizar
- Regra: Um usuário com perfil SOLICITANTE NÃO pode encaminhar demanda diretamente para STI
- Implementação: Campo oculto/desabilitado em telas para SOLICITANTE
- Exceção: GESTOR_UNIDADE e ADMIN podem encaminhar para STI
- Auditoria: Log de tentativas de violação

RN-002: Obrigatoriedade de Gestor
- Regra: Toda demanda DEVE ter um gestor da unidade atribuído
- Validação: Antes de enviar para PENDENTE_GESTOR
- Erro: "Unidade não possui gestor atribuído"
- Fallback: Admin pode designar gestor temporário

RN-003: Histórico de Decisões Obrigatório
- Regra: Toda mudança de status DEVE registrar histórico com:
  * Usuário responsável
  * Perfil do usuário
  * Status anterior e novo
  * Parecer/Comentário (obrigatório em REJEICAO e DEVOLUCAO)
  * Data/hora com timezone
- Implementação: Trigger no BD ou middleware na aplicação

RN-004: Aderência N-PSI-016
- Regra: Sistema DEVE cumprir normativa N-PSI-016
- Pontos-chave:
  * Validação em dois níveis (Gestor + STI)
  * Rastreabilidade completa de decisões
  * Auditoria de ações
  * Conformidade com padrões institucionais
```

### 5.2 Validações de Campos (Obrigatórias)

```
VD-001: Campos Obrigatórios ao Criar Demanda
- Título (mín 10, máx 255 caracteres)
- Descrição (mín 50, máx 5000 caracteres)
- Tipo de Demanda (lista predefinida)
- Prioridade (BAIXA, MÉDIA, ALTA, CRÍTICA)
- Unidade (deve existir e estar ativa)
- Departamento (deve pertencer à unidade)
- Email do solicitante (validação de formato)
- Erro: "Campos obrigatórios não preenchidos"

VD-002: Validação ao Enviar para Gestor
- Todos os campos de VD-001 devem estar preenchidos
- Descrição mínima de 50 caracteres (coerência)
- Unidade deve ter gestor ativo
- Status = DRAFT
- Erro: "Demanda incompleta. Verifique os campos obrigatórios"

VD-003: Validação ao Gestor Validar
- Comentário é OBRIGATÓRIO se status = REJEITAR ou DEVOLVER
- Mínimo 20 caracteres no comentário
- Gestor deve ter permissão para a unidade da demanda
- Status deve ser PENDENTE_GESTOR
- Erro: "Comentário obrigatório com mínimo 20 caracteres"

VD-004: Validação ao STI Processar
- Só processa demandas com status VALIDADA_GESTOR
- Histórico de decisão deve existir com validação do gestor
- Análise técnica deve ser documentada
- Aprovação gera ciclo de desenvolvimento (ou rejeição/ajuste)

VD-005: Validação de Perfil por Ação
- Cada ação requer perfil específico
- Validação em tempo de request (middleware)
- Log de tentativas de violação
```

### 5.3 Regras Temporais

```
RG-001: SLA de Gestor
- Prazo: Gestor tem 5 dias úteis para validar/rejeitar demanda
- Alerta: Email automático no dia 4
- Escalação: Admin notificado no dia 5

RG-002: SLA de STI
- Prazo: STI tem 10 dias úteis para processar
- Alerta: Email automático no dia 9
- Escalação: Gerente de Projetos notificado no dia 10

RG-003: Contadores de Reenvio
- Demanda pode ser reenviada máximo 3 vezes de AJUSTES
- Após 3º reenvio, vai para análise de viabilidade
- Log de reenvios é mantido no histórico
```

### 5.4 Regras de Rejeição

```
RJ-001: Motivos Padrão de Rejeição
- Tema já em desenvolvimento
- Fora do escopo institucional
- Recursos indisponíveis
- Demanda inadequada
- Motivo customizado (obrigatório se selecionado)

RJ-002: Notificação de Rejeição
- Email automático para solicitante
- CC para gestor
- Motivo detalhado obrigatório
- Informação sobre possível resubmissão
```

---

## 6️⃣ ENDPOINTS API

### 6.1 Demandas

```
GET    /api/v1/demandas
GET    /api/v1/demandas/{id}
GET    /api/v1/demandas/numero/{numero}
POST   /api/v1/demandas
PUT    /api/v1/demandas/{id}
DELETE /api/v1/demandas/{id}

GET    /api/v1/demandas/minhas-demandas (solicitante)
GET    /api/v1/demandas/pendentes-validacao (gestor)
GET    /api/v1/demandas/fila-sti (analista STI)
GET    /api/v1/demandas/em-desenvolvimento (dev team)
```

### 6.2 Workflow

```
POST   /api/v1/demandas/{id}/enviar-gestor
POST   /api/v1/demandas/{id}/validar-gestor
POST   /api/v1/demandas/{id}/rejeitar
POST   /api/v1/demandas/{id}/devolver-ajustes
POST   /api/v1/demandas/{id}/enviar-sti (gestor)
POST   /api/v1/demandas/{id}/aprovar-sti
POST   /api/v1/demandas/{id}/rejeitar-sti
POST   /api/v1/demandas/{id}/solicitar-ajustes-sti

POST   /api/v1/demandas/{id}/iniciar-desenvolvimento
POST   /api/v1/demandas/{id}/enviar-homologacao
POST   /api/v1/demandas/{id}/enviar-producao
POST   /api/v1/demandas/{id}/finalizar
```

### 6.3 Histórico

```
GET    /api/v1/demandas/{id}/historico
GET    /api/v1/demandas/{id}/historico/{id_historico}
GET    /api/v1/historico-decisoes
GET    /api/v1/historico-decisoes?filtro=status_anterior,status_novo,usuario
POST   /api/v1/historico-decisoes (criação automática, sem acesso direto)
```

### 6.4 Validações

```
GET    /api/v1/demandas/{id}/validacoes
GET    /api/v1/demandas/{id}/validacoes/pendentes
POST   /api/v1/demandas/{id}/validar-campos
GET    /api/v1/validacoes-obrigatorias (template)
```

### 6.5 Notificações

```
GET    /api/v1/notificacoes
GET    /api/v1/notificacoes/nao-lidas
PUT    /api/v1/notificacoes/{id}/marcar-lida
PUT    /api/v1/notificacoes/marcar-lidas-tudo
DELETE /api/v1/notificacoes/{id}
```

### 6.6 Gestores

```
GET    /api/v1/gestores
GET    /api/v1/gestores/unidade/{id_unidade}
GET    /api/v1/gestores/departamento/{id_departamento}
POST   /api/v1/gestores
PUT    /api/v1/gestores/{id}
DELETE /api/v1/gestores/{id}
```

### 6.7 Relatórios

```
GET    /api/v1/relatorios/demandas-por-status
GET    /api/v1/relatorios/tempo-medio-validacao
GET    /api/v1/relatorios/demandas-por-unidade
GET    /api/v1/relatorios/taxa-rejeicao
GET    /api/v1/relatorios/audit-trail
```

---

## 7️⃣ ESTRUTURA DE TELAS

### 7.1 Solicitante

```
TELA 1: Dashboard Solicitante
- Minhas Demandas (tabela)
  * Número | Título | Status | Prioridade | Data Criação | Ações
- Filtros: Status, Prioridade, Data
- Ações: Nova, Ver Detalhes, Editar (se DRAFT/AJUSTES)
- Notificações: Badge com pendências

TELA 2: Criar/Editar Demanda
- Campos obrigatórios (validação em tempo real)
- Seções: Informações Básicas | Classificação | Recursos | Anexos
- Salvamento automático (draft)
- Preview antes de enviar
- Botão "Enviar para Validação" (gestor)

TELA 3: Detalhes da Demanda
- Informações (read-only após envio)
- Status Atual (visual destacado)
- Histórico de Tramitação (timeline)
  * Data | Usuário | Perfil | Status Anterior → Novo | Comentário
- Comentários (thread)
- Botões: Editar (se AJUSTES), Reenviar, Cancelar
```

### 7.2 Gestor da Unidade

```
TELA 1: Dashboard Gestor
- Demandas Pendentes de Validação (priorizado)
- Métricas: Total Pendentes | Média Tempo | Taxa Rejeição
- Filtros: Prioridade, Data, Unidade

TELA 2: Validar Demanda
- Dados da demanda (read-only)
- Análise técnica preliminar (espaço para comentários)
- Campos de decisão:
  * Radio: Validar | Rejeitar | Devolver
  * Textarea: Justificativa/Parecer (obrigatório)
  * Checkboxes: Questões de conformidade
- Botão: Submeter Decisão
- Histórico de versões anteriores

TELA 3: Histórico de Decisões do Gestor
- Tabela: Data | Demanda | Ação | Resultado | Comentário
- Filtros: Data, Ação, Resultado
- Relatório: Taxa de aprovação, tempo médio
```

### 7.3 Analista STI

```
TELA 1: Fila STI
- Demandas Validadas por Gestor (list)
- Status: VALIDADA_GESTOR
- Colunas: Data | Número | Título | Unidade | Prioridade | Gestor Validador
- Filtros: Unidade, Prioridade, Data
- Busca por número/título
- Ações: Ver, Avaliar, Atribuir para dev

TELA 2: Avaliar Demanda (STI)
- Análise Técnica
  * Viabilidade Técnica
  * Estimativa Esforço
  * Recursos Necessários
  * Riscos Identificados
- Campos de decisão:
  * Aprovar | Rejeitar | Solicitar Ajustes
  * Textarea: Parecer Técnico
- Atribuição: Selecionar desenvolvedor responsável
- Histórico: Validação de Gestor + História anterior

TELA 3: Fila de Desenvolvimento
- Demandas Aprovadas (APROVADA_STI)
- Status: Aguardando Desenvolvimento
- Ações: Iniciar, Agendar
```

### 7.4 Admin/Gestor Sistema

```
TELA 1: Administração de Gestores
- Tabela: Gestor | Unidade | Departamento | Data Início | Status
- Ações: Editar, Desativar, Reativar
- Formulário: Criar novo gestor

TELA 2: Auditoria Completa
- Todos os eventos do sistema
- Tabela: Data | Usuário | Perfil | Ação | Alteração
- Filtros: Data, Usuário, Tipo Ação
- Download: Relatório completo

TELA 3: Configurações Sistema
- Prazos (SLA)
- Campos obrigatórios
- Tipos de demanda
- Prioridades
- Status workflow
```

---

## 8️⃣ SISTEMA DE NOTIFICAÇÕES

### 8.1 Eventos e Destinatários

| Evento | Destinatário | Tipo | Momento |
|--------|--------------|------|---------|
| Demanda criada | Gestor da Unidade | EMAIL | Imediato |
| Demanda enviada para validação | Gestor da Unidade | EMAIL + SISTEMA | Imediato |
| Validação pendente (alerta) | Gestor da Unidade | EMAIL | D4 (4º dia útil) |
| Demanda validada | Solicitante, STI | EMAIL + SISTEMA | Imediato |
| Demanda rejeitada | Solicitante | EMAIL + SISTEMA | Imediato |
| Demanda devolvida para ajustes | Solicitante | EMAIL + SISTEMA | Imediato |
| Demanda em fila STI | Analista STI | SISTEMA | Imediato |
| STI aprovou | Solicitante, Gestor, Dev | EMAIL + SISTEMA | Imediato |
| STI rejeitou | Solicitante, Gestor | EMAIL | Imediato |
| Ajustes solicitados STI | Solicitante, Gestor | EMAIL + SISTEMA | Imediato |
| Desenvolvimento iniciado | Solicitante, Gestor | EMAIL | Imediato |
| Em homologação | Solicitante, Gestor, QA | EMAIL | Imediato |
| Finalizada | Solicitante, Gestor, Admin | EMAIL | Imediato |

### 8.2 Templates de Email

```
Template 1: Demanda Enviada para Validação
From: noreply@agilize.com
To: gestor@unidade.com
Subject: [AGILIZE] Demanda #123 aguardando sua validação

Prezado [NOME_GESTOR],

Uma nova demanda foi submetida para sua validação:

Número: [NUMERO_DEMANDA]
Título: [TITULO]
Solicitante: [NOME_SOLICITANTE]
Prioridade: [PRIORIDADE]
Data de Submissão: [DATA_SUBMISSAO]

Acesse o sistema: [LINK_DEMANDA]

Prazo: 5 dias úteis para validação

Atenciosamente,
Sistema Agilize 2.0

---

Template 2: Demanda Rejeitada
From: noreply@agilize.com
To: solicitante@unidade.com
Cc: gestor@unidade.com
Subject: [AGILIZE] Demanda #123 foi rejeitada

Prezado [NOME_SOLICITANTE],

Sua demanda foi rejeitada:

Número: [NUMERO_DEMANDA]
Título: [TITULO]
Motivo: [MOTIVO_REJEICAO]
Parecer: [PARECER_GESTOR]

Você pode resubmeter após análise: [LINK_DEMANDA]

Atenciosamente,
Sistema Agilize 2.0
```

---

## 9️⃣ HISTÓRICO DE TRAMITAÇÃO

### 9.1 Estrutura Visual

```
Timeline da Demanda #123
═══════════════════════════════════════════════════════════════

📝 15/04/2026 09:30 - RASCUNHO criado
   Solicitante: Jorge Alcoforado (SOLICITANTE)

📤 15/04/2026 14:20 - Enviado para validação
   Solicitante: Jorge Alcoforado (SOLICITANTE)
   Comentário: Demanda de urgência para o projeto X

⏳ 16/04/2026 08:00 - PENDENTE_GESTOR
   Gestor: Maria Silva (GESTOR_UNIDADE)
   [Aguardando decisão]

✅ 18/04/2026 11:45 - VALIDADA_GESTOR
   Gestor: Maria Silva (GESTOR_UNIDADE)
   Decisão: Validar
   Parecer: "Demanda conforme, encaminhando para STI"

📋 19/04/2026 09:00 - FILA_STI
   Sistema: Automático
   
⚙️ 22/04/2026 10:30 - APROVADA_STI
   Analista: João Santos (ANALISTA_STI)
   Parecer: "Aprovada para desenvolvimento"
   Esforço: 80 horas | Recursos: Servidor, Banco de Dados

🔧 23/04/2026 15:00 - EM_DESENVOLVIMENTO
   Dev Lead: Pedro Costa (RESPONSAVEL_DESENVOLVIMENTO)
   
✔️ 24/04/2026 - [Pendente próxima etapa]
```

### 9.2 Filtros Disponíveis

```
- Por Status
- Por Usuário/Perfil
- Por Tipo de Ação
- Por Data (range)
- Por Duração entre ações
- Exportar para PDF
```

---

## 🔟 VALIDAÇÕES OBRIGATÓRIAS

### 10.1 Verificações de Negócio

```
✓ VB-001: Demanda já existe com mesmo objetivo?
✓ VB-002: Solicitante tem permissão para criar demanda?
✓ VB-003: Unidade está ativa?
✓ VB-004: Gestor da unidade está designado e ativo?
✓ VB-005: Prioridade é adequada para tipo de demanda?
✓ VB-006: Demanda não duplica funcionalidade existente?
✓ VB-007: Conformidade com N-PSI-016?
```

### 10.2 Verificações Técnicas

```
✓ VT-001: Campos obrigatórios preenchidos
✓ VT-002: Formato de email válido
✓ VT-003: Tamanho de descrição entre 50-5000 caracteres
✓ VT-004: Títulos únicos ou permitem duplicação?
✓ VT-005: Anexos dentro do limite de tamanho (10MB)
✓ VT-006: Formato de arquivo permitido (PDF, DOCX, etc)
✓ VT-007: Campos numéricos dentro do intervalo esperado
```

### 10.3 Verificações de Integridade

```
✓ VI-001: Histórico de decisão criado automaticamente
✓ VI-002: Timestamps não podem ser alterados
✓ VI-003: Soft delete mantém rastreabilidade
✓ VI-004: Auditoria registra IP e User-Agent
✓ VI-005: Permissões validadas antes de qualquer ação
```

---

## 1️⃣1️⃣ SEGURANÇA E CONFORMIDADE

### 11.1 N-PSI-016

```
Pontos-chave implementados:
- Validação em dois níveis (Gestor + STI)
- Rastreabilidade completa de decisões
- Auditoria de ações com IP e User-Agent
- Aderência a padrões institucionais
- Segregação de funções (solicitante ≠ validador)
- Conformidade com padrões de governança
```

### 11.2 Proteção de Dados

```
- Encriptação de senhas (bcrypt)
- HTTPS obrigatório
- Tokens JWT com expiração
- Rate limiting em endpoints
- Validação de CSRF
- Logs centralizados e auditados
- GDPR compliance (se aplicável)
```

---

## 1️⃣2️⃣ CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Fundação (Semanas 1-3)
- [ ] Estrutura de BD (DDL)
- [ ] Modelos de dados (ORM)
- [ ] Autenticação e autorização
- [ ] Endpoints básicos

### Fase 2: Fluxo de Gestor (Semanas 4-6)
- [ ] Endpoints de workflow (gestor)
- [ ] Telas de validação (gestor)
- [ ] Notificações (gestor)
- [ ] Histórico de decisões

### Fase 3: Fluxo STI (Semanas 7-9)
- [ ] Endpoints STI
- [ ] Telas de análise STI
- [ ] Fila de trabalho
- [ ] Relatórios

### Fase 4: Frontend Completo (Semanas 10-12)
- [ ] Dashboard do solicitante
- [ ] Detalhes de demanda
- [ ] Timeline visual
- [ ] Responsividade mobile

### Fase 5: Testes e Deploy (Semanas 13-16)
- [ ] Testes unitários
- [ ] Testes integração
- [ ] Testes de aceitação
- [ ] Deploy produção

---

## Referências

- **Normativa:** N-PSI-016
- **Padrão de API:** RESTful com JSON
- **Timezone:** America/Sao_Paulo
- **Idioma:** Português (Brasil)
