# Endpoints da API - Agilize 2.0

## 1. BASE URL
```
Produção: https://api.agilize.instituicao.com.br/api/v1
Homologação: https://api-staging.agilize.instituicao.com.br/api/v1
Desenvolvimento: http://localhost:3000/api/v1

Versão: v1
Content-Type: application/json
Autenticação: Bearer Token (JWT)
```

---

## 2. AUTENTICAÇÃO

### 2.1 Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@unidade.com.br",
  "senha": "senha_segura_123"
}

Response 200 OK:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id_usuario": 1,
    "nome": "Jorge Alcoforado",
    "email": "jorge@unidade.com.br",
    "perfil_principal": "SOLICITANTE",
    "perfis_secundarios": [],
    "unidade": "TI - Sistemas",
    "departamento": "Infraestrutura"
  },
  "expire_em": "2026-04-25T09:30:00Z"
}

Response 401 Unauthorized:
{
  "success": false,
  "code": "CREDENCIAIS_INVALIDAS",
  "message": "Email ou senha incorretos"
}
```

### 2.2 Refresh Token
```http
POST /auth/refresh-token
Authorization: Bearer {token}

Response 200 OK:
{
  "token": "novo_token_jwt...",
  "expire_em": "2026-04-25T10:30:00Z"
}
```

### 2.3 Logout
```http
POST /auth/logout
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

## 3. DEMANDAS

### 3.1 Criar Demanda
```http
POST /demandas
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Implementar autenticação SSO",
  "descricao": "Sistema precisa de integração com SSO institucional para melhorar segurança e experiência do usuário. Objetivo é unificar credenciais...",
  "justificativa": "Conformidade com norma N-PSI-016 e redução de senhas múltiplas",
  "tipo_demanda": "NOVO_SISTEMA",
  "prioridade": "ALTA",
  "id_unidade": 5,
  "id_departamento": 12,
  "investimento_estimado": 50000.00,
  "tempo_estimado_horas": 80,
  "recurso_especial": 0,
  "anexos": [
    {
      "nome": "requisitos_sso.pdf",
      "url": "https://storage.agilize.com/uploads/123.pdf",
      "tamanho_bytes": 2048576
    }
  ]
}

Response 201 Created:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "titulo": "Implementar autenticação SSO",
    "status_atual": "DRAFT",
    "id_solicitante": 1,
    "id_unidade": 5,
    "data_criacao": "2026-04-24T14:30:00Z"
  }
}

Response 400 Bad Request:
{
  "success": false,
  "code": "VALIDACAO_INCOMPLETA",
  "message": "Campos obrigatórios não preenchidos",
  "errors": {
    "titulo": "Mínimo 10 caracteres",
    "descricao": "Mínimo 50 caracteres",
    "id_unidade": "Unidade não possui gestor ativo"
  }
}
```

### 3.2 Obter Demanda
```http
GET /demandas/{id_demanda}
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "titulo": "Implementar autenticação SSO",
    "descricao": "...",
    "status_atual": "DRAFT",
    "id_solicitante": 1,
    "nome_solicitante": "Jorge Alcoforado",
    "email_solicitante": "jorge@unidade.com.br",
    "id_unidade": 5,
    "nome_unidade": "TI - Sistemas",
    "id_gestor_unidade": 10,
    "nome_gestor_unidade": "Maria Silva",
    "prioridade": "ALTA",
    "tipo_demanda": "NOVO_SISTEMA",
    "data_criacao": "2026-04-24T14:30:00Z",
    "data_ultima_atualizacao": "2026-04-24T14:30:00Z"
  }
}

Response 404 Not Found:
{
  "success": false,
  "code": "DEMANDA_NAO_ENCONTRADA",
  "message": "Demanda #456 não existe"
}
```

### 3.3 Listar Demandas
```http
GET /demandas?status=DRAFT&prioridade=ALTA&pagina=1&limite=20
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "total": 45,
  "pagina": 1,
  "limite": 20,
  "demandas": [
    {
      "id_demanda": 456,
      "numero_demanda": "DM-2026-001",
      "titulo": "Implementar autenticação SSO",
      "status_atual": "DRAFT",
      "prioridade": "ALTA",
      "solicitante": "Jorge Alcoforado",
      "unidade": "TI - Sistemas",
      "data_criacao": "2026-04-24T14:30:00Z"
    }
  ]
}
```

### 3.4 Atualizar Demanda
```http
PUT /demandas/{id_demanda}
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Implementar autenticação SSO - Versão 2",
  "descricao": "Sistema precisa de integração com SSO institucional...",
  "prioridade": "CRÍTICA",
  "investimento_estimado": 75000.00
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "titulo": "Implementar autenticação SSO - Versão 2",
    "status_atual": "DRAFT",
    "data_ultima_atualizacao": "2026-04-24T15:00:00Z"
  }
}

Response 409 Conflict:
{
  "success": false,
  "code": "STATUS_INVALIDO",
  "message": "Demanda em status FILA_STI não pode ser editada"
}
```

### 3.5 Deletar Demanda (Soft Delete)
```http
DELETE /demandas/{id_demanda}
Authorization: Bearer {token}
Content-Type: application/json

{
  "motivo_exclusao": "Demanda duplicada"
}

Response 200 OK:
{
  "success": true,
  "message": "Demanda arquivada com sucesso"
}
```

---

## 4. WORKFLOW - FLUXO DE GESTOR

### 4.1 Enviar para Gestor
```http
POST /demandas/{id_demanda}/enviar-gestor
Authorization: Bearer {token}
Content-Type: application/json

{
  "comentario": "Demanda pronta para validação"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "status_atual": "PENDENTE_GESTOR",
    "id_gestor_unidade": 10,
    "data_envio_gestor": "2026-04-24T15:30:00Z"
  },
  "notificacao": {
    "enviada_para": "maria@unidade.com.br",
    "canal": "EMAIL",
    "timestamp": "2026-04-24T15:30:05Z"
  }
}

Response 403 Forbidden:
{
  "success": false,
  "code": "PERMISSAO_NEGADA",
  "message": "Apenas SOLICITANTE pode enviar para gestor"
}
```

### 4.2 Validar Demanda (Gestor)
```http
POST /demandas/{id_demanda}/validar-gestor
Authorization: Bearer {token}
Content-Type: application/json

{
  "parecer": "Demanda conforme e alinhada com objetivos da unidade. Recomendo aprovação e encaminhamento para STI.",
  "comentario": "Adicione mais detalhes técnicos antes de ir para STI"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "status_atual": "VALIDADA_GESTOR",
    "id_gestor_unidade": 10,
    "data_validacao_gestor": "2026-04-26T11:45:00Z"
  },
  "historico": {
    "id_historico": 5001,
    "tipo_acao": "VALIDAR",
    "status_anterior": "PENDENTE_GESTOR",
    "status_novo": "VALIDADA_GESTOR"
  },
  "notificacoes": [
    {
      "para": "jorge@unidade.com.br",
      "tipo": "VALIDACAO_ACEITA",
      "enviada": true
    },
    {
      "para": "sti@instituicao.com.br",
      "tipo": "NOVA_FILA",
      "enviada": true
    }
  ]
}

Response 400 Bad Request:
{
  "success": false,
  "code": "PARECER_OBRIGATORIO",
  "message": "Parecer é obrigatório com mínimo 20 caracteres"
}
```

### 4.3 Rejeitar Demanda
```http
POST /demandas/{id_demanda}/rejeitar
Authorization: Bearer {token}
Content-Type: application/json

{
  "motivo_rejeicao": "FORA_ESCOPO",
  "parecer": "Demanda fora do escopo da unidade de TI. Recomendo direcionamento para a unidade responsável.",
  "comentario": "Contacte o gestor do departamento de Infraestrutura"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "REJEITADA",
    "data_rejeicao": "2026-04-26T12:00:00Z"
  },
  "historico": {
    "id_historico": 5002,
    "tipo_acao": "REJEITAR",
    "motivo": "FORA_ESCOPO"
  },
  "notificacao_solicitante": {
    "para": "jorge@unidade.com.br",
    "assunto": "[AGILIZE] Demanda #DM-2026-001 foi rejeitada",
    "enviada": true
  }
}
```

### 4.4 Devolver para Ajustes
```http
POST /demandas/{id_demanda}/devolver-ajustes
Authorization: Bearer {token}
Content-Type: application/json

{
  "parecer": "Demanda precisa de melhorias na descrição técnica antes de encaminhar para STI.",
  "comentario": "Inclua arquitetura proposta, diagrama de fluxo e cronograma estimado"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "DEVOLVIDA_AJUSTES",
    "contador_reenvios": 1,
    "data_devolucao": "2026-04-26T12:15:00Z"
  },
  "historico": {
    "id_historico": 5003,
    "tipo_acao": "DEVOLVER",
    "status_novo": "DEVOLVIDA_AJUSTES"
  },
  "notificacao_solicitante": {
    "para": "jorge@unidade.com.br",
    "titulo": "Demanda devolvida para ajustes",
    "enviada": true
  }
}
```

---

## 5. WORKFLOW - FLUXO DE STI

### 5.1 Listar Fila STI
```http
GET /demandas/fila-sti?status=VALIDADA_GESTOR&prioridade=ALTA&pagina=1&limite=20
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "total": 12,
  "demandas": [
    {
      "id_demanda": 456,
      "numero_demanda": "DM-2026-001",
      "titulo": "Implementar autenticação SSO",
      "status_atual": "VALIDADA_GESTOR",
      "prioridade": "ALTA",
      "solicitante": "Jorge Alcoforado",
      "unidade": "TI - Sistemas",
      "gestor_validador": "Maria Silva",
      "data_validacao_gestor": "2026-04-26T11:45:00Z",
      "parecer_gestor": "Conforme, encaminhando para STI"
    }
  ]
}
```

### 5.2 Obter Detalhes para Análise STI
```http
GET /demandas/{id_demanda}/analise-sti
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "titulo": "Implementar autenticação SSO",
    "descricao": "...",
    "status_atual": "FILA_STI",
    "solicitante": {...},
    "unidade": {...},
    "gestor_validador": {
      "nome": "Maria Silva",
      "parecer": "Conforme, encaminhando para STI",
      "data_validacao": "2026-04-26T11:45:00Z"
    },
    "historico_completo": [
      {
        "data_hora": "2026-04-24T14:30:00Z",
        "usuario": "Jorge Alcoforado",
        "acao": "CRIAR",
        "status": "DRAFT"
      },
      {
        "data_hora": "2026-04-24T15:30:00Z",
        "usuario": "Jorge Alcoforado",
        "acao": "ENVIAR",
        "status_novo": "PENDENTE_GESTOR"
      },
      {
        "data_hora": "2026-04-26T11:45:00Z",
        "usuario": "Maria Silva",
        "acao": "VALIDAR",
        "status_novo": "VALIDADA_GESTOR",
        "parecer": "Conforme, encaminhando para STI"
      }
    ]
  }
}
```

### 5.3 Aprovar Demanda (STI)
```http
POST /demandas/{id_demanda}/aprovar-sti
Authorization: Bearer {token}
Content-Type: application/json

{
  "parecer": "Demanda aprovada para desenvolvimento. Viabilidade técnica confirmada.",
  "analise_tecnica": "Integração com SSO é viável usando protocolo SAML 2.0. Sem dependências críticas.",
  "estimativa_esforco_horas": 80,
  "estimativa_dias_calendario": 15,
  "recursos_necessarios": "Servidor, Banco de Dados, Certificado SSL",
  "riscos_identificados": "Baixo",
  "descricao_riscos": "Risco de queda de autenticação durante implementação",
  "id_responsavel_desenvolvimento": 20
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "numero_demanda": "DM-2026-001",
    "status_atual": "APROVADA_STI",
    "data_aprovacao_sti": "2026-04-26T14:00:00Z",
    "id_responsavel_desenvolvimento": 20,
    "responsavel_desenvolvimento": "Pedro Costa"
  },
  "historico": {
    "id_historico": 5010,
    "tipo_acao": "APROVAR",
    "status_novo": "APROVADA_STI"
  },
  "notificacoes": [
    {
      "para": "jorge@unidade.com.br",
      "tipo": "APROVACAO_STI",
      "enviada": true
    },
    {
      "para": "pedro@instituicao.com.br",
      "tipo": "ATRIBUICAO_DEV",
      "enviada": true
    }
  ]
}
```

### 5.4 Rejeitar Demanda (STI)
```http
POST /demandas/{id_demanda}/rejeitar-sti
Authorization: Bearer {token}
Content-Type: application/json

{
  "motivo_rejeicao": "INVIAVEL_TECNICAMENTE",
  "parecer": "Demanda não é viável com tecnologia atual. Recomendamos esperar atualização do SO para incluir SAML nativo.",
  "comentario": "Avaliar reabertura em 6 meses"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "REPROVADA_STI",
    "data_rejeicao_sti": "2026-04-26T15:00:00Z"
  }
}
```

### 5.5 Solicitar Ajustes (STI)
```http
POST /demandas/{id_demanda}/solicitar-ajustes-sti
Authorization: Bearer {token}
Content-Type: application/json

{
  "parecer": "Demanda precisa de ajustes antes de aprovação",
  "ajustes_solicitados": "1. Incluir estimativa de custo com SSO\n2. Detalhar arquitetura de segurança\n3. Incluir plano de rollback",
  "comentario": "Resubmeta em até 10 dias"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "SOLICITADO_AJUSTES_STI",
    "contador_ajustes_sti": 1,
    "data_solicitacao_ajustes": "2026-04-26T15:30:00Z"
  }
}
```

---

## 6. WORKFLOW - FASES DE DESENVOLVIMENTO

### 6.1 Iniciar Desenvolvimento
```http
POST /demandas/{id_demanda}/iniciar-desenvolvimento
Authorization: Bearer {token}
Content-Type: application/json

{
  "data_inicio_prevista": "2026-05-01",
  "data_conclusao_prevista": "2026-05-15",
  "comentario": "Dev iniciando análise arquitetural"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "EM_DESENVOLVIMENTO",
    "id_responsavel_desenvolvimento": 20,
    "data_inicio_desenvolvimento": "2026-04-26T16:00:00Z",
    "data_conclusao_prevista": "2026-05-15"
  }
}
```

### 6.2 Enviar para Homologação
```http
POST /demandas/{id_demanda}/enviar-homologacao
Authorization: Bearer {token}
Content-Type: application/json

{
  "link_ambiente_teste": "https://staging.agilize.instituicao.com.br",
  "usuario_teste": "admin_teste",
  "senha_teste": "xxx", # Enviado em canal seguro
  "manual_teste": "https://storage.agilize.com/manuais/sso_teste.pdf",
  "casos_teste": "Autenticação com usuário válido, Autenticação com senha inválida, Timeout de sessão"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "EM_HOMOLOGACAO",
    "data_homologacao": "2026-05-16",
    "responsavel_homologacao": "Ana Silva",
    "id_responsavel_homologacao": 30
  }
}
```

### 6.3 Enviar para Produção
```http
POST /demandas/{id_demanda}/enviar-producao
Authorization: Bearer {token}
Content-Type: application/json

{
  "versao_sistema": "2.1.0",
  "checklist_producao": "✓ Testes passaram, ✓ Documentação atualizada, ✓ Plano rollback pronto",
  "data_deploy_prevista": "2026-05-20"
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "EM_PRODUCAO",
    "data_producao": "2026-05-20",
    "responsavel_producao": "Carlos Ops",
    "versao_sistema": "2.1.0"
  }
}
```

### 6.4 Finalizar
```http
POST /demandas/{id_demanda}/finalizar
Authorization: Bearer {token}
Content-Type: application/json

{
  "resumo_execucao": "Implementação SSO concluída com sucesso. Sistema em produção desde 20/05.",
  "metricas": {
    "tempo_total_dias": 26,
    "horas_utilizadas": 78,
    "custo_realizado": 65000.00
  }
}

Response 200 OK:
{
  "success": true,
  "demanda": {
    "id_demanda": 456,
    "status_atual": "FINALIZADA",
    "data_conclusao": "2026-05-26",
    "tempo_total_dias": 26
  }
}
```

---

## 7. HISTÓRICO

### 7.1 Obter Histórico de Decisões
```http
GET /demandas/{id_demanda}/historico?limite=50&pagina=1
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "total": 8,
  "historico": [
    {
      "id_historico": 5000,
      "data_hora": "2026-04-24T14:30:00Z",
      "usuario": {
        "id": 1,
        "nome": "Jorge Alcoforado",
        "email": "jorge@unidade.com.br",
        "perfil": "SOLICITANTE"
      },
      "tipo_acao": "CRIAR",
      "status_anterior": null,
      "status_novo": "DRAFT",
      "parecer": null,
      "ip_usuario": "192.168.1.100",
      "duracao_etapa_dias": null
    },
    {
      "id_historico": 5001,
      "data_hora": "2026-04-26T11:45:00Z",
      "usuario": {
        "id": 10,
        "nome": "Maria Silva",
        "email": "maria@unidade.com.br",
        "perfil": "GESTOR_UNIDADE"
      },
      "tipo_acao": "VALIDAR",
      "status_anterior": "PENDENTE_GESTOR",
      "status_novo": "VALIDADA_GESTOR",
      "parecer": "Demanda conforme e alinhada com objetivos da unidade",
      "ip_usuario": "192.168.1.201",
      "duracao_etapa_dias": 2
    }
  ]
}
```

### 7.2 Exportar Histórico
```http
GET /demandas/{id_demanda}/historico/exportar?formato=pdf
Authorization: Bearer {token}

Response 200 OK:
Content-Type: application/pdf
Content-Disposition: attachment; filename=DM-2026-001_historico.pdf

[Arquivo PDF com timeline formatada]
```

---

## 8. VALIDAÇÕES

### 8.1 Validar Campos
```http
POST /demandas/validar-campos
Authorization: Bearer {token}
Content-Type: application/json

{
  "titulo": "Implementar SSO",
  "descricao": "Descrição com pelo menos 50 caracteres para passar na validação",
  "tipo_demanda": "NOVO_SISTEMA",
  "prioridade": "ALTA",
  "id_unidade": 5
}

Response 200 OK:
{
  "success": true,
  "validacoes": {
    "titulo": {
      "valido": true,
      "mensagem": "OK"
    },
    "descricao": {
      "valido": true,
      "caracteres": 67,
      "minimo": 50
    },
    "tipo_demanda": {
      "valido": true,
      "valor": "NOVO_SISTEMA"
    },
    "prioridade": {
      "valido": true,
      "valor": "ALTA"
    },
    "id_unidade": {
      "valido": true,
      "unidade": "TI - Sistemas",
      "gestor_ativo": true
    }
  },
  "pode_enviar": true
}

Response 400 Bad Request:
{
  "success": false,
  "validacoes": {
    "titulo": {
      "valido": false,
      "mensagem": "Mínimo 10 caracteres",
      "caracteres": 8
    }
  },
  "pode_enviar": false
}
```

---

## 9. NOTIFICAÇÕES

### 9.1 Obter Notificações
```http
GET /notificacoes?nao_lidas=true&pagina=1&limite=10
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "total_nao_lidas": 3,
  "notificacoes": [
    {
      "id_notificacao": 1001,
      "titulo": "Demanda #DM-2026-001 validada",
      "mensagem": "Sua demanda foi validada pelo gestor e encaminhada para STI",
      "tipo": "VALIDACAO_ACEITA",
      "data_criacao": "2026-04-26T11:45:00Z",
      "lido": false,
      "link": "/demandas/456"
    }
  ]
}
```

### 9.2 Marcar Notificação como Lida
```http
PUT /notificacoes/{id_notificacao}/marcar-lida
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "notificacao": {
    "id_notificacao": 1001,
    "lido": true,
    "data_leitura": "2026-04-26T12:00:00Z"
  }
}
```

---

## 10. RELATÓRIOS

### 10.1 Relatório de Demandas por Status
```http
GET /relatorios/demandas-por-status?data_inicio=2026-04-01&data_fim=2026-04-30
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "periodo": "2026-04-01 até 2026-04-30",
  "dados": {
    "DRAFT": 5,
    "PENDENTE_GESTOR": 3,
    "VALIDADA_GESTOR": 0,
    "FILA_STI": 2,
    "APROVADA_STI": 1,
    "EM_DESENVOLVIMENTO": 2,
    "EM_HOMOLOGACAO": 1,
    "FINALIZADA": 3,
    "REJEITADA": 1,
    "CANCELADA": 0
  },
  "total": 18
}
```

### 10.2 Tempo Médio de Validação
```http
GET /relatorios/tempo-validacao?id_unidade=5
Authorization: Bearer {token}

Response 200 OK:
{
  "success": true,
  "unidade": "TI - Sistemas",
  "metricas": {
    "tempo_medio_gestor_dias": 2.5,
    "tempo_medio_sti_dias": 3.2,
    "tempo_total_dias": 5.7,
    "total_demandas": 15,
    "taxa_rejeicao_gestor": "13.3%",
    "taxa_rejeicao_sti": "6.7%",
    "sla_cumprimento": "93.3%"
  }
}
```

---

## 11. TRATAMENTO DE ERROS

### Códigos de Erro Padrão

| Código HTTP | Código Negócio | Descrição |
|------------|----------------|-----------|
| 400 | VALIDACAO_ERRO | Dados inválidos |
| 401 | NAO_AUTENTICADO | Token inválido/expirado |
| 403 | PERMISSAO_NEGADA | Usuário sem permissão |
| 404 | NAO_ENCONTRADO | Recurso não existe |
| 409 | CONFLITO | Estado inválido para operação |
| 429 | RATE_LIMIT | Limite de requisições atingido |
| 500 | ERRO_INTERNO | Erro no servidor |

### Exemplo de Resposta de Erro

```json
{
  "success": false,
  "code": "PERMISSAO_NEGADA",
  "message": "Você não tem permissão para validar demandas de outra unidade",
  "details": {
    "usuario_unidade": 5,
    "demanda_unidade": 8
  },
  "timestamp": "2026-04-26T12:00:00Z",
  "request_id": "req_abc123def456"
}
```

---

## 12. RATE LIMITING

```
Limite padrão: 1000 requisições por hora por usuário
Limite crítico: 100 requisições por minuto

Headers de resposta:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 992
X-RateLimit-Reset: 1682520000

Se limite atingido:
HTTP 429 Too Many Requests
Retry-After: 3600 (segundos até reset)
```

---

## 13. PAGINAÇÃO

```
Parâmetros: pagina, limite (default 20, máximo 100)
Query: GET /demandas?pagina=2&limite=50

Response incluiu:
{
  "paginacao": {
    "pagina": 2,
    "limite": 50,
    "total": 450,
    "total_paginas": 9,
    "primeira_pagina": 1,
    "ultima_pagina": 9,
    "proxima_pagina": 3,
    "pagina_anterior": 1
  }
}
```

---

## 14. ORDENAÇÃO

```
Parâmetro: ordenar=campo:direcao
Exemplo: GET /demandas?ordenar=data_criacao:desc

Campos suportados:
- data_criacao
- data_ultima_atualizacao
- prioridade
- status
- titulo

Direção: asc (padrão), desc
```

---

## Referências
- Autenticação: JWT (HS256)
- Timeout: 30 minutos
- Encoding: UTF-8
- Timezone: America/Sao_Paulo
