# Matriz Detalhada de Permissões - Agilize 2.0

## 1. PERFIS E SUAS RESPONSABILIDADES

### 1.1 SOLICITANTE
**Descrição:** Usuário comum que cria demandas

**Responsabilidades:**
- Criar demanda em RASCUNHO
- Editar demanda própria em RASCUNHO e AJUSTES
- Visualizar próprias demandas
- Enviar demanda para gestor da unidade
- Receber notificações de rejeição/devolução
- Fazer ajustes conforme solicitado
- Visualizar histórico de tramitação

**NÃO pode:**
- ❌ Encaminhar diretamente para STI
- ❌ Aprovar/Rejeitar
- ❌ Acessar demandas de outros usuários
- ❌ Editar após envio (sem devolvção)
- ❌ Visualizar pareceres técnicos de STI (até aprovação)
- ❌ Cancelar demanda em status avançado

---

### 1.2 GESTOR_UNIDADE
**Descrição:** Gerente da unidade que valida demandas antes de ir para STI

**Responsabilidades:**
- Visualizar todas demandas da unidade
- Validar demandas em status PENDENTE_GESTOR
- Rejeitar demandas com justificativa
- Devolver demandas para ajustes com comentários
- Encaminhar demandas validadas para STI (status → VALIDADA_GESTOR)
- Acompanhar histórico de decisões próprias
- Receber alertas de SLA (5 dias úteis)
- Visualizar dashboard com métricas da unidade

**NÃO pode:**
- ❌ Validar demandas de outras unidades
- ❌ Editar dados da demanda original
- ❌ Encaminhar demandas para desenvolvimento
- ❌ Acessar análises técnicas da STI
- ❌ Cancelar demanda que já passou de sua validação

---

### 1.3 GESTOR_DEPARTAMENTO
**Descrição:** Gestor de departamento dentro da unidade (hierarquicamente acima de GESTOR_UNIDADE)

**Responsabilidades:**
- Todas as de GESTOR_UNIDADE
- + Supervisionar validações do gestor de unidade
- + Relatórios de desempenho por unidade
- + Escalar demandas críticas para STI
- + Definir prioridades estratégicas

**NÃO pode:**
- ❌ Validar demandas individuais (delega para gestor de unidade)
- ❌ Interferir em decisões já tomadas

---

### 1.4 ANALISTA_STI
**Descrição:** Membro da STI que analisa e aprova demandas

**Responsabilidades:**
- Visualizar fila de demandas validadas por gestor (VALIDADA_GESTOR e FILA_STI)
- Analisar viabilidade técnica com apoio do diagnóstico IA
- Estimar esforço e recursos
- Identificar riscos
- Aprovar demanda (APROVADA_STI)
- Reprovar demanda com parecer técnico
- Solicitar ajustes (SOLICITADO_AJUSTES_STI)
- Encaminhar ao Avaliador Técnico quando necessário (AGUARDANDO_AVALIADOR)
- Homologar produto na Fase 3 (HOMOLOGADA)
- Solicitar ajustes de homologação (SOLICITADO_AJUSTES_HOMOLOGACAO)
- Encaminhar ao Avaliador Técnico na homologação (AGUARDANDO_AVALIADOR_HOMOLOGACAO)
- Visualizar histórico completo

**NÃO pode:**
- ❌ Validar demandas que não foram aprovadas por gestor
- ❌ Rejeitar demanda validada por gestor sem análise técnica
- ❌ Acessar dados sensíveis da unidade solicitante

---

### 1.5 AVALIADOR_TECNICO
**Descrição:** Nível de revisão superior dentro da STI; atua quando o Analista STI encaminha uma demanda para revisão

**Responsabilidades:**
- Visualizar demandas encaminhadas pelo Analista (AGUARDANDO_AVALIADOR / AGUARDANDO_AVALIADOR_HOMOLOGACAO)
- Devolver ao Analista para reanálise (→ FILA_STI / FILA_HOMOLOGACAO_STI)
- Solicitar ajustes ao Solicitante diretamente (→ SOLICITANTE_AJUSTANDO / AJUSTANDO_HOMOLOGACAO)
- Registrar parecer formal no histórico
- Visualizar histórico completo das demandas sob revisão

**NÃO pode:**
- ❌ Aprovar ou homologar diretamente (decisão final é do Analista STI)
- ❌ Encaminhar à fila de produção
- ❌ Editar dados originais da demanda

---

### 1.5b DPO
**Descrição:** Data Protection Officer — verifica conformidade LGPD para soluções com dados sensíveis

**Responsabilidades:**
- Analisar demandas com dados sensíveis antes da STI (Fase 1)
- Analisar produto entregue com dados sensíveis antes da homologação STI (Fase 3)
- Aprovar encaminhamento à STI
- Solicitar ajustes diretamente ao Solicitante
- Registrar parecer formal no histórico

**NÃO pode:**
- ❌ Aprovar/reprovar demandas sem passar pelo Gestor primeiro
- ❌ Acessar fila STI ou executar ações de Analista
- ❌ Atuar nas Fases 2 e 4

---

### 1.6 RESPONSAVEL_PRODUCAO
**Descrição:** Operações que gerenciam deploy e produção

**Responsabilidades:**
- Visualizar demandas homologadas (HOMOLOGADA)
- Iniciar e confirmar deploy (EM_PRODUCAO → EM_MONITORAMENTO)
- Monitorar funcionamento
- Registrar ocorrências

**NÃO pode:**
- ❌ Aprovar/Reprovar demandas
- ❌ Alterar dados da demanda
- ❌ Atuar nas Fases 1, 2 e 3

---

### 1.7 GESTOR_SISTEMA
**Descrição:** Administrador com acesso total

**Responsabilidades:**
- Acesso total a todas as demandas
- Administrar usuários e perfis
- Designar gestores a unidades
- Configurar parâmetros do sistema
- Gerar relatórios completos
- Auditoria de ações
- Resolver escalações
- Backup e manutenção de dados
- Designar analistas STI
- Desativar usuários

**NÃO pode:**
- ❌ Contornar validações obrigatórias (auditoria registra)
- ❌ Apagar histórico de decisões (soft delete apenas)

---

## 2. MATRIZ DE PERMISSÕES EXPANDIDA

| Ação | Solicitante | Gestor Unit | Gestor Dept | Analista STI | Avaliador Técnico | Ops | Admin |
|------|:-----------:|:-----------:|:-----------:|:------------:|:-----------:|:---:|:------:|
| **DEMANDA - Criação** |
| Criar nova | ✅ | ✅ | ✅ | - | - | - | ✅ |
| Editar (DRAFT) | ✅ | - | - | - | - | - | ✅ |
| Editar (AJUSTES) | ✅ | - | - | - | - | - | ✅ |
| Visualizar própria | ✅ | - | - | - | - | - | ✅ |
| Visualizar todas | - | ✅ (unidade) | ✅ (depto) | ✅ (todas) | ✅ (atribuídas) | - | ✅ |
| Deletar própria | ✅ (DRAFT) | - | - | - | - | - | ✅ |
| **DEMANDA - Workflow (Fase 1 e 3)** |
| Enviar para Gestor | ✅ | - | - | - | - | - | ✅ |
| Iniciar desenvolvimento | ✅ | - | - | - | - | - | ✅ |
| Submeter produto | ✅ | - | - | - | - | - | ✅ |
| Validar (Gestor) | - | ✅ | - | - | - | - | ✅ |
| Rejeitar (Gestor) | - | ✅ | - | - | - | - | ✅ |
| Devolver (Gestor) | - | ✅ | - | - | - | - | ✅ |
| Encaminhar STI | - | ✅ | ✅ | - | - | - | ✅ |
| Visualizar Fila STI | - | - | - | ✅ | - | - | ✅ |
| Aprovar (STI) | - | - | - | ✅ | - | - | ✅ |
| Reprovar (STI) | - | - | - | ✅ | - | - | ✅ |
| Solicitar Ajustes (STI) | - | - | - | ✅ | - | - | ✅ |
| Homologar | - | - | - | ✅ | - | - | ✅ |
| Encaminhar Avaliador Técnico | - | - | - | ✅ | - | - | ✅ |
| Devolver ao Analista | - | - | - | - | ✅ | - | ✅ |
| Solicitar Ajustes (Avaliador) | - | - | - | - | ✅ | - | ✅ |
| **DEMANDA - Workflow (Fase 4)** |
| Deploy Produção | - | - | - | - | - | ✅ | ✅ |
| Confirmar Deploy | - | - | - | - | - | ✅ | ✅ |
| Desativar | - | - | - | ✅ | - | - | ✅ |
| **HISTÓRICO** |
| Visualizar próprio | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Visualizar tudo | - | ✅ (unidade) | ✅ (depto) | ✅ (todas) | ✅ (atribuídas) | - | ✅ |
| Exportar histórico | - | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| **ADMIN** |
| Gerenciar usuários | - | - | - | - | - | - | ✅ |
| Designar gestores | - | - | - | - | - | - | ✅ |
| Configurar sistema | - | - | - | - | - | - | ✅ |
| Gerar relatórios | - | ✅ (unidade) | ✅ (depto) | ✅ (todas) | - | - | ✅ |
| Auditoria | - | - | - | - | - | - | ✅ |

---

## 3. REGRAS DE CONTEXTO

### 3.1 Validação por Unidade
```
Gestor de Unidade A só pode validar demandas de Unidade A
- Implementação: Middleware que verifica id_unidade
- Query: WHERE id_unidade = current_user.unit_id
- Error: "Você não tem permissão para validar demandas de outra unidade"
```

### 3.2 Validação por Departamento
```
Gestor de Departamento X pode supervisionar unidades do Dept X
- Hierarquia: Depto > Unidade > Demanda
- Validação: id_departamento matches
```

### 3.3 Validação de Timestamp
```
Ações só podem ser realizadas em horário comercial (07:00-21:00)
- Exceção: Admin pode validar 24h
- Email de auditoria se fora de horário
```

### 3.4 Delegação Temporal
```
Se gestor está de férias, admin pode designar gestor substituto
- Tabela: tb_atribuicoes_gestor com data_fim
- Status automático: Gestor principal volta ao vencer período
```

---

## 4. REGRAS DE MULTIPERFIL

Usuários do **departamento STI** podem acumular um segundo (ou terceiro) perfil. As combinações válidas são:

| Perfil Principal | Perfis Secundários Permitidos |
|---|---|
| `ANALISTA_STI` | `GESTOR_UNIDADE`, `AVALIADOR_TECNICO` (ambos ou apenas um) |
| `GESTOR_UNIDADE` | `AVALIADOR_TECNICO`, `RESPONSAVEL_PRODUCAO` (ambos ou apenas um) |
| `AVALIADOR_TECNICO` | `RESPONSAVEL_PRODUCAO` |
| demais perfis | — (nenhum perfil secundário) |

**Regras gerais:**
- Multiperfil é restrito a usuários vinculados ao departamento STI
- O sistema ativa o contexto do perfil adequado a cada ação realizada (ex.: ao validar como gestor, age como `GESTOR_UNIDADE`)
- Perfis secundários são armazenados em `tb_usuarios.perfis_secundarios` (JSONB)

---

## 5. IMPLEMENTAÇÃO TÉCNICA

### 4.1 Middleware de Permissões (Pseudocódigo)

```python
def check_permission(user, action, resource_id=None):
    """Valida se usuário tem permissão para ação"""
    
    # 1. Verificar se usuário está ativo
    if not user.ativo:
        raise PermissionDenied("Usuário inativo")
    
    # 2. Verificar token JWT
    if not is_token_valid(user.token):
        raise AuthenticationFailed("Token expirado")
    
    # 3. Obter perfil do usuário
    perfil = user.perfil_principal
    
    # 4. Consultar matriz de permissões
    permissions = get_permission_matrix(perfil, action)
    
    if not permissions:
        log_security_event(user, action, "NEGADO", resource_id)
        raise PermissionDenied(f"Usuário {perfil} não pode {action}")
    
    # 5. Validar contexto (unidade, departamento, etc)
    if not validate_context(user, resource_id):
        log_security_event(user, action, "CONTEXTO_NEGADO", resource_id)
        raise PermissionDenied(f"Acesso negado ao recurso {resource_id}")
    
    # 6. Verificar horário comercial (se aplicável)
    if action in AÇÕES_RESTRITAS and not is_business_hours():
        if perfil != "GESTOR_SISTEMA":
            log_security_event(user, action, "FORA_HORARIO", resource_id)
            raise PermissionDenied("Ação fora do horário comercial")
    
    # 7. Log de sucesso
    log_security_event(user, action, "PERMITIDO", resource_id)
    return True
```

### 4.2 Decorator para Endpoints

```python
@app.route('/api/v1/demandas/<id>/validar-gestor', methods=['POST'])
@require_permission('VALIDAR_DEMANDA', role=['GESTOR_UNIDADE', 'ADMIN'])
@require_context('unidade')  # Valida mesma unidade
def validar_demanda_gestor(id):
    """Endpoint protegido por permissões"""
    demanda = Demanda.get(id)
    
    if not demanda:
        return error_response("Demanda não encontrada", 404)
    
    # Validações já foram feitas pelo decorator
    # Lógica de negócio aqui...
    
    return success_response({"status": "VALIDADA_GESTOR"})
```

### 4.3 Auditoria de Permissões

```sql
-- Log de todas as tentativas (sucesso e falha)
INSERT INTO tb_auditoria_acesso (
    id_usuario, 
    acao, 
    recurso, 
    resultado,  -- PERMITIDO | NEGADO | CONTEXTO_NEGADO
    motivo, 
    ip, 
    user_agent, 
    data_hora
)
VALUES (
    @user_id,
    'VALIDAR_DEMANDA',
    @demanda_id,
    'PERMITIDO',
    'Gestor válido da unidade',
    @ip,
    @user_agent,
    NOW()
);
```

---

## 5. TESTES DE PERMISSÕES

### 5.1 Casos de Teste

```
TC-001: Solicitante não pode encaminhar para STI
- Setup: Login como SOLICITANTE
- Ação: POST /api/v1/demandas/123/enviar-sti
- Esperado: 403 Forbidden + mensagem de permissão

TC-002: Gestor de unidade A não pode validar demanda de unidade B
- Setup: Login como GESTOR_UNIDADE (Unidade B)
- Ação: POST /api/v1/demandas/999/validar-gestor (de Unit A)
- Esperado: 403 Forbidden + "acesso negado"

TC-003: Admin pode fazer qualquer coisa
- Setup: Login como ADMIN
- Ação: POST /api/v1/demandas/123/validar-gestor
- Esperado: 200 OK

TC-004: Avaliador Técnico não pode agir em demanda que não está em AGUARDANDO_AVALIADOR
- Setup: Login como AVALIADOR_TECNICO
- Ação: POST /api/v1/demandas/123/avaliador-devolver-analista (demanda em FILA_STI)
- Esperado: 409 Conflict + "Demanda não está aguardando decisão do Avaliador Técnico"

TC-005: Avaliador Técnico não pode solicitar ajustes em demanda fora de escopo
- Setup: Login como AVALIADOR_TECNICO
- Ação: POST /api/v1/demandas/123/avaliador-solicitar-ajustes (demanda em FILA_STI)
- Esperado: 409 Conflict
```

---

## 6. ESCALAÇÃO DE PERMISSÕES

### 6.1 Cenários de Escalação

```
CENÁRIO 1: Demanda crítica bloqueada
- Gestor de unidade está de férias
- Solicitante abre ticket para admin
- Admin designa gestor substituto
- Demanda é desbloqueada

CENÁRIO 2: Desacordo entre gestor e STI
- Gestor validou demanda
- STI quer rejeitar
- Escala para Gestor de Departamento
- Gestor Departamento decide

CENÁRIO 3: Urgência em produção
- Ops identifica bug crítico
- Ops pode rejeitar demanda sem QA formal
- Log obrigatório com explicação
- Admin revisa no dia seguinte
```

---

## Referências

- Conformidade: N-PSI-016
- OWASP: Segregação de Funções
- ISO 27001: Acesso baseado em funções (RBAC)
