# Histórico de Tramitação e Decisões - Agilize 2.0

## 1. TABELA DE HISTÓRICO DE DECISÕES

### 1.1 Estrutura Completa

```sql
CREATE TABLE tb_historico_decisoes (
    id_historico BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Referência à Demanda
    id_demanda BIGINT NOT NULL,
    numero_demanda VARCHAR(20) NOT NULL,
    
    -- Usuário Responsável
    id_usuario BIGINT NOT NULL,
    nome_usuario VARCHAR(255) NOT NULL,
    email_usuario VARCHAR(255),
    cpf_usuario VARCHAR(11),
    
    -- Perfil e Permissões
    perfil_usuario VARCHAR(100) NOT NULL,
    -- Valores: SOLICITANTE, GESTOR_UNIDADE, GESTOR_DEPARTAMENTO,
    --         ANALISTA_STI, AVALIADOR_TECNICO, RESPONSAVEL_PRODUCAO, GESTOR_SISTEMA
    
    -- Transição de Status
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    
    -- Tipo de Ação
    tipo_acao VARCHAR(50) NOT NULL,
    -- CRIAR, EDITAR, ENVIAR, VALIDAR, REJEITAR, DEVOLVER, 
    -- APROVAR, SOLICITAR_AJUSTES, INICIAR_DEV, ATUALIZAR_DEV,
    -- ENVIAR_QA, APROVAR_QA, REJEITAR_QA, ENVIAR_PRODUCAO,
    -- DEPLOY_PRODUCAO, FINALIZAR, CANCELAR
    
    -- Parecer e Comentários
    parecer TEXT,
    -- Parecer formal da decisão (máx 5000 caracteres)
    
    comentario TEXT,
    -- Comentário adicional, informal (máx 5000 caracteres)
    
    -- Metadata da Ação
    motivo_rejeicao VARCHAR(100),
    -- Se tipo_acao = REJEITAR, valor de enum: motivos padrão
    
    prioridade_alterada VARCHAR(50),
    -- Se tipo_acao = EDITAR e prioridade mudou
    
    duracao_etapa_dias INT,
    -- Dias desde status anterior até novo (úteis ou corridos)
    
    -- Timestamp
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    dia_semana VARCHAR(20), -- SEGUNDA, TERCA, etc
    hora_do_dia INT, -- 0-23
    
    -- Rastreamento de Origem
    ip_usuario VARCHAR(45),
    -- Suporta IPv4 e IPv6
    
    user_agent VARCHAR(500),
    -- Browser e SO: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
    
    endpoint_chamado VARCHAR(255),
    -- Qual API endpoint foi usado: /api/v1/demandas/123/validar-gestor
    
    metodo_http VARCHAR(10),
    -- GET, POST, PUT, DELETE
    
    -- Validações
    validacoes_aplicadas TEXT,
    -- JSON com validações que passaram (p/ auditoria)
    -- {"campo_titulo": "OK", "comentario": "OK", "perfil": "OK"}
    
    -- Contexto da Unidade
    id_unidade_demanda BIGINT,
    nome_unidade_demanda VARCHAR(255),
    id_departamento_demanda BIGINT,
    nome_departamento_demanda VARCHAR(255),
    
    -- SLA Info
    dias_uteis_decorridos INT,
    -- Dias úteis desde início da etapa
    
    sla_em_dia BOOLEAN DEFAULT TRUE,
    -- FALSE se passou do SLA
    
    -- Indexação
    INDEX idx_demanda (id_demanda),
    INDEX idx_usuario (id_usuario),
    INDEX idx_data_hora (data_hora),
    INDEX idx_status_novo (status_novo),
    INDEX idx_tipo_acao (tipo_acao),
    INDEX idx_perfil (perfil_usuario),
    INDEX idx_unidade (id_unidade_demanda),
    
    -- Chaves Estrangeiras
    FOREIGN KEY (id_demanda) REFERENCES tb_demandas(id_demanda),
    
    -- Constraints
    CONSTRAINT chk_status_valido CHECK (
        status_novo IN (
            'DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES',
            'SOLICITANTE_AJUSTANDO', 'VALIDADA_GESTOR', 'FILA_STI',
            'AGUARDANDO_AVALIADOR', 'APROVADA_STI', 'REPROVADA_STI',
            'SOLICITADO_AJUSTES_STI', 'EM_DESENVOLVIMENTO',
            'SUBMETIDO_HOMOLOGACAO', 'PENDENTE_HOMOLOGACAO_GESTOR',
            'DEVOLVIDA_HOMOLOGACAO', 'AJUSTANDO_HOMOLOGACAO',
            'VALIDADA_HOMOLOGACAO_GESTOR', 'FILA_HOMOLOGACAO_STI',
            'AGUARDANDO_AVALIADOR_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO',
            'HOMOLOGADA', 'EM_PRODUCAO', 'EM_MONITORAMENTO',
            'DESATIVADA', 'REJEITADA', 'CANCELADA'
        )
    ),
    
    CONSTRAINT chk_perfil_valido CHECK (
        perfil_usuario IN (
            'SOLICITANTE', 'GESTOR_UNIDADE', 'GESTOR_DEPARTAMENTO',
            'ANALISTA_STI', 'AVALIADOR_TECNICO',
            'RESPONSAVEL_PRODUCAO', 'GESTOR_SISTEMA'
        )
    )
);
```

### 1.2 Triggers para Preenchimento Automático

```sql
-- Trigger 1: Preencher info de usuário automaticamente
CREATE TRIGGER tr_historico_set_usuario_info
BEFORE INSERT ON tb_historico_decisoes
FOR EACH ROW
BEGIN
    SELECT 
        u.nome, u.email, u.cpf, u.perfil_principal
    INTO 
        NEW.nome_usuario, NEW.email_usuario, NEW.cpf_usuario, NEW.perfil_usuario
    FROM tb_usuarios u
    WHERE u.id_usuario = NEW.id_usuario;
    
    -- Timezone
    SET NEW.timezone = 'America/Sao_Paulo';
    
    -- Dia da semana
    SET NEW.dia_semana = DAYNAME(NEW.data_hora);
    
    -- Hora do dia
    SET NEW.hora_do_dia = HOUR(NEW.data_hora);
END;

-- Trigger 2: Preencher info de unidade automaticamente
CREATE TRIGGER tr_historico_set_unidade_info
BEFORE INSERT ON tb_historico_decisoes
FOR EACH ROW
BEGIN
    SELECT 
        d.id_unidade, u.nome_unidade, d.id_departamento, dp.nome_departamento
    INTO 
        NEW.id_unidade_demanda, NEW.nome_unidade_demanda, 
        NEW.id_departamento_demanda, NEW.nome_departamento_demanda
    FROM tb_demandas d
    LEFT JOIN tb_unidades u ON d.id_unidade = u.id_unidade
    LEFT JOIN tb_departamentos dp ON d.id_departamento = dp.id_departamento
    WHERE d.id_demanda = NEW.id_demanda;
END;

-- Trigger 3: Calcular duração da etapa
CREATE TRIGGER tr_historico_calc_duracao
BEFORE INSERT ON tb_historico_decisoes
FOR EACH ROW
BEGIN
    DECLARE last_date DATETIME;
    SELECT data_hora INTO last_date
    FROM tb_historico_decisoes
    WHERE id_demanda = NEW.id_demanda
    ORDER BY data_hora DESC
    LIMIT 1;
    
    IF last_date IS NOT NULL THEN
        SET NEW.duracao_etapa_dias = DATEDIFF(NEW.data_hora, last_date);
    END IF;
END;
```

---

## 2. VISUALIZAÇÃO: TIMELINE DA DEMANDA

### 2.1 Mockup da Tela

```
┌─────────────────────────────────────────────────────────────────┐
│ DEMANDA #123 - Sistema de Gestão Integrada                      │
│ [← Voltar]  [Imprimir]  [Exportar PDF]  [Enviar por Email]      │
└─────────────────────────────────────────────────────────────────┘

┌─ HISTÓRICO DE TRAMITAÇÃO ─────────────────────────────────────┐
│ Filtrar: [Status ▼] [Usuário ▼] [Período ▼]                   │
│ 📊 Tempo Total: 9 dias | Etapa Atual: 0 dias                  │
│                                                                 │
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ TIMELINE ▬▬▬▬▬▬▬▬▬▬▬▬▬▬                          │
│                                                                 │
│ ┌─ 15/04/2026 09:30 (Quarta-feira) ───────────────────────┐   │
│ │ ⭕ DRAFT criado                                          │   │
│ │ Usuário: Jorge Alcoforado (SOLICITANTE)                 │   │
│ │ Ação: CRIAR                                             │   │
│ │ IP: 192.168.1.100                                       │   │
│ │ Duração da etapa: -                                     │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 15/04/2026 14:20 (Quarta-feira) ───────────────────────┐   │
│ │ 📤 Enviado para Validação                               │   │
│ │ Usuário: Jorge Alcoforado (SOLICITANTE)                 │   │
│ │ Status: DRAFT → PENDENTE_GESTOR                         │   │
│ │ Ação: ENVIAR                                            │   │
│ │ Comentário: "Demanda urgente para projeto X"           │   │
│ │ IP: 192.168.1.100                                       │   │
│ │ Duração da etapa: 4h 50m                                │   │
│ │ [Ver detalhes da validação]                             │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 16/04/2026 08:00 (Quinta-feira) ────────────────────────┐  │
│ │ ⏳ Aguardando Validação do Gestor                        │  │
│ │ Responsável: Maria Silva (GESTOR_UNIDADE)               │  │
│ │ Unidade: TI - Sistemas                                  │  │
│ │ Período: 1 dia 0h                                       │  │
│ │ SLA: 5 dias úteis (4 dias restantes)                    │  │
│ │ [📧 Enviar Alerta para Gestor]                          │  │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 18/04/2026 11:45 (Sábado) ──────────────────────────────┐  │
│ │ ✅ VALIDADA pelo Gestor                                 │  │
│ │ Usuário: Maria Silva (GESTOR_UNIDADE)                   │  │
│ │ Status: PENDENTE_GESTOR → VALIDADA_GESTOR              │  │
│ │ Ação: VALIDAR                                           │  │
│ │ Parecer: "Demanda conforme e alinhada com objetivos     │  │
│ │           da unidade. Encaminhando para STI."            │  │
│ │ Endpoint: POST /api/v1/demandas/123/validar-gestor      │  │
│ │ IP: 192.168.1.201                                       │  │
│ │ Duração da etapa: 2 dias (1 dia útil)                   │  │
│ │ [Ver parecer completo]                                  │  │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 19/04/2026 09:00 (Domingo) ─────────────────────────────┐  │
│ │ 📋 Encaminhada para STI                                 │  │
│ │ Ação: ENVIAR (automática)                               │  │
│ │ Status: VALIDADA_GESTOR → FILA_STI                     │  │
│ │ Sistema: Agilize 2.0                                    │  │
│ │ Duração da etapa: 21h 15m                               │  │
│ │ SLA STI: 10 dias úteis                                  │  │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 22/04/2026 10:30 (Terça-feira) ─────────────────────────┐  │
│ │ ⚙️ APROVADA pela STI                                    │  │
│ │ Usuário: João Santos (ANALISTA_STI)                     │  │
│ │ Status: FILA_STI → APROVADA_STI                        │  │
│ │ Ação: APROVAR                                           │  │
│ │ Parecer Técnico:                                        │  │
│ │ "✓ Viável tecnicamente                                  │  │
│ │  ✓ Recursos disponíveis                                 │  │
│ │  ✓ Não conflita com roadmap                             │  │
│ │  ✓ Benefício: Alto impacto para usuários"               │  │
│ │                                                          │  │
│ │ Estimativas:                                            │  │
│ │ • Esforço: 80 horas                                     │  │
│ │ • Arquitetura: [Download PDF]                           │  │
│ │ • Riscos: Baixo                                         │  │
│ │ • Dependências: Banco de Dados v2.1                     │  │
│ │                                                          │  │
│ │ Atribuído para: Pedro Costa (Dev Lead)                  │  │
│ │ IP: 192.168.1.250                                       │  │
│ │ Duração da etapa: 3 dias                                │  │
│ │ [Ver documento técnico] [Ver análise de viabilidade]    │  │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌─ 23/04/2026 15:00 (Quarta-feira) ────────────────────────┐  │
│ │ 🔧 EM DESENVOLVIMENTO                                   │  │
│ │ Usuário: Jorge Alcoforado (SOLICITANTE)                 │  │
│ │ Status: APROVADA_STI → EM_DESENVOLVIMENTO              │  │
│ │ Ação: INICIAR_DEV                                       │  │
│ │ Duração da etapa: 1 dia (atual)                         │  │
│ │ [Ver documento de design] [Timeline de desenvolvimento] │  │
│ └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [Ver pendências]  [Carregar mais histórico]                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Elementos da Timeline

**Cada item contém:**
- ⭕ Ícone da ação (indica tipo)
- Data/Hora formatada
- Dia da semana
- Status anterior → novo (transição)
- Usuário responsável
- Perfil do usuário
- Tipo de ação
- Parecer/Comentário (se houver)
- IP origem
- Duração desde etapa anterior
- Links para detalhes/documentos

---

## 3. FILTROS E BUSCAS

### 3.1 Filtros Disponíveis

```
Filtro por Status:
☐ Todos os Status
☐ DRAFT
☐ PENDENTE_GESTOR
☐ DEVOLVIDA_AJUSTES
☐ VALIDADA_GESTOR
☐ FILA_STI
☐ APROVADA_STI
☐ REPROVADA_STI
☐ SOLICITADO_AJUSTES_STI
☐ EM_DESENVOLVIMENTO
☐ EM_HOMOLOGACAO
☐ EM_PRODUCAO
☐ FINALIZADA
☐ CANCELADA

Filtro por Tipo de Ação:
☐ Todos
☐ CRIAR
☐ VALIDAR
☐ REJEITAR
☐ DEVOLVER
☐ APROVAR
☐ INICIAR_DEV
☐ FINALIZAR

Filtro por Usuário:
[Search: Digitar nome, email ou CPF]

Filtro por Período:
De [DD/MM/YYYY] até [DD/MM/YYYY]

Filtro por SLA:
☐ Dentro do SLA
☐ Próximo ao vencer
☐ SLA Vencido

Filtro por Unidade:
[Dropdown Unidades]

Filtro por Perfil:
☐ SOLICITANTE
☐ GESTOR_UNIDADE
☐ GESTOR_DEPARTAMENTO
☐ ANALISTA_STI
☐ AVALIADOR_TECNICO
☐ RESPONSAVEL_PRODUCAO
☐ GESTOR_SISTEMA
```

### 3.2 Consultas SQL de Filtro

```sql
-- Exemplo: Buscar histórico com filtros
SELECT * FROM tb_historico_decisoes
WHERE id_demanda = @demanda_id
  AND status_novo IN (@status_filtro)
  AND tipo_acao IN (@tipo_acao_filtro)
  AND (id_usuario = @usuario_id OR @usuario_id IS NULL)
  AND perfil_usuario IN (@perfis_filtro)
  AND data_hora BETWEEN @data_inicio AND @data_fim
  AND id_unidade_demanda = @unidade_id
ORDER BY data_hora ASC;

-- Busca Full-Text em parecer
SELECT * FROM tb_historico_decisoes
WHERE MATCH(parecer, comentario) AGAINST (@busca IN BOOLEAN MODE)
  AND id_demanda = @demanda_id;

-- Timeline comprimida (últimas 10 ações)
SELECT 
    data_hora, 
    nome_usuario, 
    perfil_usuario, 
    status_novo, 
    tipo_acao
FROM tb_historico_decisoes
WHERE id_demanda = @demanda_id
ORDER BY data_hora DESC
LIMIT 10;
```

---

## 4. EXPORTAÇÃO DE HISTÓRICO

### 4.1 Formatos Disponíveis

**PDF** - Relatório formatado
- Logo da empresa
- Dados da demanda no topo
- Timeline visual
- Resumo de decisões
- Assinatura digital (opcional)

**EXCEL** - Planilha com dados estruturados
- Colunas: Data, Usuário, Perfil, Ação, Status Anterior, Status Novo, Parecer
- Filtros automáticos
- Formatação condicional (cores por status)

**CSV** - Dados brutos para importação
- Delimitador: ponto-e-vírgula (pt-BR)
- Encoding: UTF-8

**JSON** - Dados estruturados para API
- Array de objetos
- Timestamps em ISO 8601
- Útil para integração

### 4.2 Endpoint de Exportação

```
GET /api/v1/demandas/{id}/historico/exportar?formato=pdf
GET /api/v1/demandas/{id}/historico/exportar?formato=excel
GET /api/v1/demandas/{id}/historico/exportar?formato=csv
GET /api/v1/demandas/{id}/historico/exportar?formato=json
```

---

## 5. MÉTRICAS E DASHBOARDS

### 5.1 Dashboard de Histórico

```
Visualizar por DEMANDA:
- Tempo total: 9 dias
- Etapas completadas: 8/9
- Etapa atual: EM_DESENVOLVIMENTO (0 dias)
- Próxima etapa: EM_HOMOLOGACAO (estimado 05/05)
- Taxa de aprovação: 100%
- Rejeições: 0

Visualizar por UNIDADE:
- Total demandas: 45
- Tempo médio validação gestor: 2 dias
- Taxa rejeição gestor: 15%
- Taxa rejeição STI: 10%
- Demandas em SLA: 90%
- Demandas com SLA vencido: 5

Visualizar por USUÁRIO:
- Demandas validadas: 12
- Taxa aprovação: 91%
- Tempo médio análise: 1 dia
- Maior demora: 5 dias
- Comentário médio: 150 caracteres
```

### 5.2 Relatórios Automáticos

```
RELATÓRIO DIÁRIO (gerado 08:00):
- Demandas com SLA próximo ao vencer
- Novas demandas aguardando gestor
- Demandas bloqueadas/paradas

RELATÓRIO SEMANAL (segunda-feira 09:00):
- KPIs da semana
- Taxa de rejeição
- Tempo médio por etapa
- Gargalos identificados

RELATÓRIO MENSAL (1º dia do mês 07:00):
- Conformidade N-PSI-016
- Volume por tipo de demanda
- Comparativo com mês anterior
- Sugestões de melhoria
```

---

## 6. AUDITORIA AVANÇADA

### 6.1 Rastreamento Completo

```
Quando usuário edita histórico (NÃO PERMITIDO):
- Log: Tentativa bloqueada
- Email: Admin notificado
- Ação: Conta pode ser suspensa

Quando usuario tenta pular etapa:
- Log: Tentativa registrada
- Email: Admin + Gestor Sistema
- Ação: Ticket de segurança criado

Monitoramento de Anomalias:
- 10+ ações por dia (bot detection)
- Validações em fora de horário
- Múltiplas rejec ões consecutivas
- Pareceres muito curtos/idênticos
```

### 6.2 Consulta de Auditoria

```sql
-- Quem modificou uma demanda e quando?
SELECT h.*, u.nome_usuario, u.email_usuario
FROM tb_historico_decisoes h
JOIN tb_usuarios u ON h.id_usuario = u.id_usuario
WHERE h.id_demanda = 123
ORDER BY h.data_hora DESC;

-- Qual o histórico completo de uma demanda?
SELECT 
    DATE_FORMAT(h.data_hora, '%d/%m/%Y %H:%i:%s') as data_hora,
    h.nome_usuario,
    h.perfil_usuario,
    h.tipo_acao,
    CONCAT(h.status_anterior, ' → ', h.status_novo) as transicao,
    h.parecer,
    h.ip_usuario
FROM tb_historico_decisoes h
WHERE h.id_demanda = 123
ORDER BY h.data_hora ASC;

-- Quantas vezes a demanda foi rejeitada/devolvida?
SELECT 
    COUNT(*) as total_devolucoes,
    SUM(CASE WHEN h.tipo_acao = 'REJEITAR' THEN 1 ELSE 0 END) as rejeicoes,
    SUM(CASE WHEN h.tipo_acao = 'DEVOLVER' THEN 1 ELSE 0 END) as devolucoes,
    AVG(h.duracao_etapa_dias) as duracao_media
FROM tb_historico_decisoes h
WHERE h.id_demanda = 123
  AND h.tipo_acao IN ('REJEITAR', 'DEVOLVER');
```

---

## 7. NOTIFICAÇÕES BASEADAS EM HISTÓRICO

```
Quando histórico é criado:
✓ Notificação em tempo real no dashboard
✓ Email para stakeholders
✓ Slack/Teams (se integrado)

Eventos com notificação:
- Nova ação no histórico (para interessados)
- Demanda muda de etapa (email)
- Rejeição (email urgente)
- SLA próximo ao vencer (email + sistema)
- Demanda fica parada > 2 dias (alerta)

Template de notificação:
From: noreply@agilize.com
To: [interessados]
Subject: [AGILIZE] Demanda #123 - Novo evento

Nova ação na demanda:
Tipo: VALIDAR
Usuário: Maria Silva (GESTOR_UNIDADE)
Status: PENDENTE_GESTOR → VALIDADA_GESTOR
Parecer: "Conforme. Encaminhando para STI."
Data: 18/04/2026 11:45
[VER DETALHES]
```

---

## 8. CONFORMIDADE E SEGURANÇA

### 8.1 Compliance N-PSI-016

✅ Rastreabilidade completa:
- Quem → id_usuario + nome_usuario + cpf_usuario
- O quê → tipo_acao + status_anterior/novo
- Quando → data_hora com timezone
- Onde → ip_usuario + user_agent + endpoint_chamado
- Por quê → parecer + comentario

✅ Integridade:
- Histórico é imutável (READONLY após criação)
- Soft delete apenas
- Timestamps não podem ser alterados

✅ Segregação de Funções:
- Solicitante não pode validar
- Gestor não pode ser solicitante da mesma demanda
- Analista não pode validar sua própria demanda

✅ Auditoria:
- Todos os eventos registrados
- Tentativas de violação incluídas
- Relatórios de conformidade automáticos

---

## 9. PERFORMANCE E OTIMIZAÇÃO

### 9.1 Índices Críticos

```sql
CREATE INDEX idx_demanda_data ON tb_historico_decisoes(id_demanda, data_hora);
CREATE INDEX idx_usuario_data ON tb_historico_decisoes(id_usuario, data_hora);
CREATE INDEX idx_status_novo_data ON tb_historico_decisoes(status_novo, data_hora);
CREATE INDEX idx_unidade_data ON tb_historico_decisoes(id_unidade_demanda, data_hora);
CREATE FULLTEXT INDEX idx_parecer_comentario ON tb_historico_decisoes(parecer, comentario);
```

### 9.2 Limpeza de Dados

```
Retenção de Histórico:
- 7 anos: Dados completos
- 7+ anos: Arquivamento (backup)
- 10+ anos: Purga segura (conformidade)

Partition automática:
- Por ano (2024, 2025, 2026, etc)
- Por mês dentro do ano
- Melhora query performance
```

---

## Referências
- Normativa: N-PSI-016
- Timestamp: UTC com conversão para America/Sao_Paulo
- Idioma: Português (Brasil)
- Encoding: UTF-8
