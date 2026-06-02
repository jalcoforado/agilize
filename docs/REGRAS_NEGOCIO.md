# Regras de Negócio - Agilize 2.0

## 1. REGRAS DE FLUXO OBRIGATÓRIO

### RN-FLU-001: Validação em Dois Níveis é Obrigatória
```
Descrição: Toda demanda DEVE passar por validação de gestor ANTES de ir para STI
Padrão: SOLICITANTE → GESTOR_UNIDADE → STI
Exceção: Admin pode pular etapa apenas em caso de urgência (com log)
Conformidade: N-PSI-016

Implementação:
- Campo hidden em form: id_gestor_unidade (obrigatório)
- Validação: status_novo != FILA_STI se status_anterior não é VALIDADA_GESTOR
- Trigger BD: BEFORE INSERT detecta violação

Query Proteção:
```sql
-- Impede transição direta para STI sem validação de gestor
ALTER TABLE tb_demandas ADD CONSTRAINT chk_fluxo_gestor
CHECK (
    CASE 
        WHEN status_atual = 'FILA_STI' THEN id_gestor_unidade IS NOT NULL 
            AND data_validacao_gestor IS NOT NULL
        ELSE TRUE
    END
);
```

Teste:
- TC-FLU-001: Tentar enviar demanda direto para STI retorna erro 400
- TC-FLU-002: Admin consegue pular (com notificação de auditoria)
```

### RN-FLU-002: Solicitante Comum Não Pode Formalizar
```
Descrição: SOLICITANTE NÃO pode encaminhar demanda para STI
Apenas: GESTOR_UNIDADE ou ADMIN
Razão: Conformidade N-PSI-016 - segregação de funções

Implementação:
- Endpoint DELETE /api/v1/demandas/{id}/enviar-sti bloqueado para SOLICITANTE
- Botão "Enviar para STI" oculto no frontend
- Validação em middleware:

def can_send_to_sti(user):
    allowed_roles = ['GESTOR_UNIDADE', 'ADMIN']
    if user.perfil not in allowed_roles:
        raise PermissionDenied(f"Perfil {user.perfil} não pode formalizar para STI")
    return True
```

---

## 2. REGRAS DE VALIDAÇÃO DE GESTOR

### RN-VAL-001: Campos Obrigatórios para Envio ao Gestor
```
Antes de status = PENDENTE_GESTOR, validar:
✓ Título (10-255 caracteres, não vazio)
✓ Descrição (50-5000 caracteres)
✓ Tipo de Demanda (enum VÁLIDO)
✓ Prioridade (BAIXA, MÉDIA, ALTA, CRÍTICA)
✓ Unidade (deve estar ativa)
✓ Departamento (deve pertencer à unidade)
✓ Email solicitante (formato válido)
✓ Unidade tem gestor ativo designado

Validação em camadas:
1. Frontend: onBlur validation (UX)
2. API: Request validation antes de salvar
3. BD: CHECK constraints

Erro retornado:
```json
{
    "success": false,
    "code": "VALIDACAO_INCOMPLETA",
    "message": "Campos obrigatórios não preenchidos",
    "errors": {
        "descricao": "Mínimo 50 caracteres",
        "id_gestor_unidade": "Unidade sem gestor ativo"
    }
}
```
```

### RN-VAL-002: Obrigatoriedade de Comentário em Rejeição/Devolução
```
Se status_novo = REJEITADA ou DEVOLVIDA_AJUSTES:
✓ Comentário OBRIGATÓRIO
✓ Mínimo 20 caracteres
✓ Máximo 5000 caracteres
✓ Não pode estar vazio ou com só espaços

Validação:
```python
if new_status in ['REJEITADA', 'DEVOLVIDA_AJUSTES']:
    if not comentario or len(comentario.strip()) < 20:
        raise ValidationError({
            'comentario': 'Comentário obrigatório, mínimo 20 caracteres'
        })
```

Teste:
- TC-VAL-002a: Rejeitar sem comentário retorna 400
- TC-VAL-002b: Comentário com 19 caracteres retorna 400
- TC-VAL-002c: Comentário com 20+ caracteres passa
```

### RN-VAL-003: Validação de Perfil por Ação
```
Cada ação requer perfil específico:

Ação: VALIDAR
- Perfil: GESTOR_UNIDADE
- Contexto: id_unidade do gestor == id_unidade da demanda
- Validação: Middleware

Ação: REJEITAR
- Perfil: GESTOR_UNIDADE ou ANALISTA_STI (contexto diferente)
- Contexto: Gestor valida sua unidade, STI valida qualquer
- Validação: Middleware + contexto

Ação: DEVOLVER
- Perfil: GESTOR_UNIDADE
- Contexto: Mesma unidade
- Validação: Middleware

Ação: APROVAR (STI)
- Perfil: ANALISTA_STI
- Contexto: Demanda deve estar em FILA_STI
- Validação: Middleware + status

Implementação:
@app.route('/api/v1/demandas/<id>/validar-gestor', methods=['POST'])
@require_role('GESTOR_UNIDADE')
@validate_context('unidade')
def validar_demanda(id):
    # Lógica aqui
```

---

## 3. REGRAS DE HISTÓRICO DE DECISÕES

### RN-HIST-001: Histórico Automático Obrigatório
```
Toda mudança de status DEVE criar registro em tb_historico_decisoes:

Campos obrigatórios:
✓ id_demanda
✓ id_usuario (quem fez a ação)
✓ nome_usuario
✓ perfil_usuario
✓ status_anterior
✓ status_novo
✓ parecer (se rejeição/devolução)
✓ data_hora (CURRENT_TIMESTAMP)
✓ ip_usuario
✓ user_agent

Trigger BD:
```sql
CREATE TRIGGER tr_historico_status_change
AFTER UPDATE ON tb_demandas
FOR EACH ROW
BEGIN
    IF NEW.status_atual <> OLD.status_atual THEN
        INSERT INTO tb_historico_decisoes (
            id_demanda, id_usuario, status_anterior, status_novo,
            parecer, data_hora, ip_usuario
        ) VALUES (
            NEW.id_demanda,
            @current_user_id,
            OLD.status_atual,
            NEW.status_atual,
            @parecer_texto,
            NOW(),
            @ip_usuario
        );
    END IF;
END;
```

Não permitir:
- ❌ Editar histórico
- ❌ Deletar histórico (soft delete apenas)
- ❌ Alterar timestamps
```

### RN-HIST-002: Rastreabilidade Completa
```
Histórico deve permitir responder:
- Quem? (id_usuario, nome_usuario, perfil_usuario)
- O quê? (status_anterior → status_novo)
- Quando? (data_hora com timezone)
- Onde? (ip_usuario, user_agent)
- Por quê? (parecer)

Consulta típica:
SELECT * FROM tb_historico_decisoes 
WHERE id_demanda = 123 
ORDER BY data_hora ASC;

Output esperado:
```
| Data/Hora | Usuário | Perfil | Ação | Status Anterior | Status Novo | Parecer |
|-----------|---------|--------|------|-----------------|-------------|---------|
| 15/04 09:30 | Jorge | SOLICITANTE | Criar | - | DRAFT | - |
| 15/04 14:20 | Jorge | SOLICITANTE | Enviar | DRAFT | PENDENTE_GESTOR | Demanda de urgência |
| 16/04 08:00 | Maria | GESTOR | Receber | PENDENTE_GESTOR | PENDENTE_GESTOR | - |
| 18/04 11:45 | Maria | GESTOR | Validar | PENDENTE_GESTOR | VALIDADA_GESTOR | Conforme, enviando |
| 19/04 09:00 | Sistema | SISTEMA | Encaminha | VALIDADA_GESTOR | FILA_STI | - |
| 22/04 10:30 | João | ANALISTA_STI | Aprovar | FILA_STI | APROVADA_STI | Viável, 80h |
```
```

### RN-HIST-003: Durações Entre Ações
```
Calcular e armazenar tempo entre ações:

Campo: duracao_dias (INT)
Cálculo: 
- Se status anterior também existe em histórico
- duracao_dias = DATEDIFF(data_hora, data_hora_acao_anterior)
- Ignorar fins de semana e feriados (se aplicável)

Uso:
- Métricas de SLA
- Alertas de demanda travada
- Relatórios de velocidade
```

---

## 4. REGRAS DE NOTIFICAÇÕES

### RN-NOT-001: Notificação de Envio para Gestor
```
Trigger: Demanda muda de DRAFT → PENDENTE_GESTOR
Para: Gestor da unidade
Canal: EMAIL + SISTEMA
Conteúdo:
- Número da demanda
- Título
- Solicitante
- Link direto para avaliar
- SLA: 5 dias úteis

Template:
[AGILIZE] Demanda #123 aguardando sua validação
Prezado [GESTOR],
Uma nova demanda foi submetida para validação:
Número: 123
Título: [Título]
Solicitante: [Nome]
Prioridade: [Prioridade]
Prazo: 5 dias úteis
[LINK_PARA_VALIDAR]
```

### RN-NOT-002: Notificação de Validação
```
Trigger: Demanda muda para VALIDADA_GESTOR
Para: Solicitante + Analista STI (gestor cc)
Canal: EMAIL + SISTEMA
Conteúdo:
- Demanda foi validada pelo gestor
- Parecer do gestor
- Será encaminhada para STI
- Data/hora da validação

Caso: REJEIÇÃO
Para: Solicitante + CC Gestor
Assunto: [AGILIZE] Demanda #123 foi rejeitada
Motivo de rejeição
Parecer detalhado
Opção: Resubmeter
```

### RN-NOT-003: Alerta de SLA
```
Trigger: T-1 (um dia antes do vencimento)
Para: Gestor + Admin
Mensagem: "Demanda #123 vence amanhã"

Trigger: T (no vencimento)
Para: Gestor
Mensagem: "SLA vencido para demanda #123"

Trigger: T+1
Para: Admin
Mensagem: "Demanda #123 com SLA vencido"
Ação: Escalar automaticamente

Implementação:
- Cron job a cada 1 hora
- Query: status = PENDENTE_GESTOR 
  AND DATE_ADD(data_envio_gestor, INTERVAL 5 DAY) <= NOW()
```

---

## 5. REGRAS DE REJEIÇÃO

### RN-REJ-001: Motivos Padrão de Rejeição
```
Motivos pré-definidos para GESTOR (pode descrever):
1. Fora do escopo da unidade
2. Duplica demanda já existente
3. Não conformidade com padrões
4. Prioridade inadequada
5. Falta de informações
6. Motivo customizado: _______________

Motivos padrão para STI:
1. Inviável tecnicamente
2. Recursos indisponíveis
3. Tema já em desenvolvimento
4. Não adequa a N-PSI-016
5. Investimento não justificado
6. Motivo customizado: _______________

Regra: Se "customizado" selecionado, descrição OBRIGATÓRIA
```

### RN-REJ-002: Rejeição Não Encerra Demanda
```
Demanda rejeitada NÃO é deletada, apenas marcada com status REJEITADA
- Motivo: Auditoria e conformidade
- Pode ser resubmetida com ajustes
- Histórico completo preservado
- Solicitante pode consultar motivo sempre
```

---

## 6. REGRAS DE REENVIO

### RN-REENVI-001: Limite de Reenvios
```
Demanda devolvida para ajustes pode ser reenviada até 3 vezes
Fluxo:
1º Envio: Status DEVOLVIDA_AJUSTES → Ajustes → Reenvio → PENDENTE_GESTOR
2º Envio: Status DEVOLVIDA_AJUSTES → Ajustes → Reenvio → PENDENTE_GESTOR
3º Envio: Status DEVOLVIDA_AJUSTES → Ajustes → Reenvio → PENDENTE_GESTOR
4º Tentativa: 
  - Opção A: Rejeitação automática com parecer "Excedeu limite de reenvios"
  - Opção B: Encaminha para análise de viabilidade especial (admin)

Implementação:
```sql
ALTER TABLE tb_demandas ADD COLUMN contador_reenvios INT DEFAULT 0;

-- Incrementar ao devolver
UPDATE tb_demandas 
SET contador_reenvios = contador_reenvios + 1 
WHERE id_demanda = @id AND status_atual = 'DEVOLVIDA_AJUSTES';

-- Validar ao reenviar
IF (SELECT contador_reenvios FROM tb_demandas WHERE id = @id) >= 3 THEN
    RAISE ERROR "Limite de reenvios atingido";
END IF;
```

Teste:
- TC-REENVI-001: 3 reenvios sucessivos
- TC-REENVI-002: 4º reenvio bloqueado
```

---

## 7. REGRAS DE CONFORMIDADE (N-PSI-016)

### RN-CONF-001: Segregação de Funções
```
Princípio: Mesma pessoa não pode criar + validar + aprovar

Implementação:
- Solicitante NÃO pode ser Gestor da mesma demanda
- Gestor NÃO pode validar própria demanda
- Analista STI NÃO pode ser Dev (separação clara)

Validação:
```sql
-- Impede gestor validar própria demanda
SELECT COUNT(*) FROM tb_demandas 
WHERE id_demanda = @id 
AND id_solicitante = @current_user_id 
AND id_gestor_unidade = @current_user_id;
-- Se COUNT > 0: ERROR

-- Impede gestor ser analista
SELECT COUNT(*) FROM tb_usuarios 
WHERE id_usuario = @current_user_id 
AND (perfil_principal = 'GESTOR_UNIDADE' 
     AND perfil_secundario = 'ANALISTA_STI');
-- Se COUNT > 0: ERROR
```
```

### RN-CONF-002: Rastreabilidade Auditável
```
Todos os eventos devem ser rastreados:
- Quem criou?
- Quem modificou?
- Quando?
- De onde? (IP)
- O quê mudou?

Tabelas de auditoria:
- tb_historico_decisoes (decisões de status)
- tb_auditoria_acesso (tentativas de acesso)
- tb_auditoria_alteracoes (campo modificado)

Query auditoria completa:
```sql
SELECT h.* FROM tb_historico_decisoes h
WHERE h.id_demanda = 123
UNION ALL
SELECT a.* FROM tb_auditoria_alteracoes a
WHERE a.id_demanda = 123
ORDER BY data_hora ASC;
```
```

### RN-CONF-003: Documento de Validação N-PSI-016
```
Criar relatório mensal confirmando:
✓ Todas demandas seguem fluxo obrigatório (Gestor antes STI)
✓ Histórico de decisões completo
✓ Sem casos de segregação de funções violada
✓ Taxa de rejeição dentro do esperado
✓ Conformidade 100%

Relatório salvo em tb_relatorios_conformidade
```

---

## 8. REGRAS TEMPORAIS

### RN-TEMP-001: SLA de Gestor (5 dias úteis)
```
Cálculo: De data_envio_gestor + 5 dias úteis (seg-sex)
Alerta Automática:
- D4 (4º dia): Email para gestor "Demanda vence amanhã"
- D5 (5º dia): Email com aviso de vencimento
- D6: Escalação para admin, marcada como "SLA VENCIDO"

Implementação (Cron diário às 08:00):
```python
demandas_proximas = Demanda.filter(
    status_atual='PENDENTE_GESTOR',
    data_envio_gestor__gte=5_dias_uteis_atrás,
    data_envio_gestor__lte=hoje
)
for demanda in demandas_proximas:
    diasAtrás = calcular_dias_uteis(demanda.data_envio_gestor, hoje)
    if diasAtrás == 4:
        enviar_alerta_gestor(demanda, "SLA a vencer")
    elif diasAtrás >= 5:
        escalar_para_admin(demanda, "SLA vencido")
        demanda.status_atual = 'ESCALADA_ADMIN'
```
```

### RN-TEMP-002: SLA de STI (10 dias úteis)
```
Cálculo: De data_fila_sti + 10 dias úteis
Alertas:
- D9: Email para Analista STI
- D10: Email com aviso crítico
- D11: Escalação automática para Gerente STI

Implementação: Similar ao SLA de Gestor
```

### RN-TEMP-003: Horário de Atualização
```
Timestamps automáticos:
- data_criacao: Quando status = DRAFT (solicitante cria)
- data_envio_gestor: Quando status = PENDENTE_GESTOR
- data_validacao_gestor: Quando status = VALIDADA_GESTOR
- data_fila_sti: Quando status = FILA_STI
- data_conclusao: Quando status = FINALIZADA ou CANCELADA

NÃO podem ser alterados manualmente (READONLY no BD)
```

---

## 9. REGRAS DE SOFT DELETE

### RN-SOFT-001: Nenhuma Demanda é Deletada Fisicamente
```
Demandas canceladas:
- ativo = 0
- data_exclusao = NOW()
- id_usuario_exclusao = current_user_id
- motivo_exclusao = texto obrigatório

Queries SEMPRE filtram: WHERE ativo = 1

Histórico preservado mesmo após exclusão
- Consultas administrativas podem ver deletadas: WHERE ativo = 0

Teste:
- TC-SOFT-001: Demanda deletada não aparece em listagens normais
- TC-SOFT-002: Admin pode ver demandas deletadas com filtro
```

---

## 10. CHECKLIST DE CONFORMIDADE

```
Antes de Deploy, validar:
☐ RN-FLU-001: Validação em dois níveis funciona
☐ RN-FLU-002: Solicitante não consegue enviar para STI
☐ RN-VAL-001: Campos obrigatórios validados
☐ RN-VAL-002: Comentário obrigatório em rejeição
☐ RN-VAL-003: Perfil validado para cada ação
☐ RN-HIST-001: Histórico criado automaticamente
☐ RN-HIST-002: Rastreabilidade completa
☐ RN-NOT-001-003: Notificações enviadas
☐ RN-REJ-001: Motivos padrão funcionam
☐ RN-REENVI-001: Limite de reenvios funciona
☐ RN-CONF-001-003: Conformidade N-PSI-016 atendida
☐ RN-TEMP-001-003: SLAs calculados corretamente
☐ RN-SOFT-001: Soft delete funciona corretamente
```

---

## Referências
- Normativa: N-PSI-016
- Padrão: REST API + JSON
- Banco de Dados: MySQL 8.0+
- Auditoria: Todos os eventos registrados
