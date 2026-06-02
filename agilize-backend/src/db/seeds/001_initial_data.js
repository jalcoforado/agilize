const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  // Limpar na ordem inversa das FKs
  await knex('tb_inventario_aplicacoes').del();
  await knex('tb_diagnosticos_ia').del();
  await knex('tb_checklist_respostas').del();
  await knex('tb_checklist_itens').del();
  await knex('tb_checklists').del();
  await knex('tb_atribuicoes_gestor').del();
  await knex('tb_historico_decisoes').del();
  await knex('tb_notificacoes').del();
  await knex('tb_demandas').del();
  await knex('tb_usuarios').del();
  await knex('tb_departamentos').del();
  await knex('tb_unidades').del();

  // ─── Unidades ────────────────────────────────────────────────────────────────

  const [unidSti] = await knex('tb_unidades')
    .insert({ nome_unidade: 'Diretoria de Governança de TI', sigla: 'STI-GOV', descricao: 'STI — Governança e análise de soluções setoriais' })
    .returning('*');

  const [unidRh] = await knex('tb_unidades')
    .insert({ nome_unidade: 'Recursos Humanos', sigla: 'RH', descricao: 'Departamento de Recursos Humanos' })
    .returning('*');

  const [unidFin] = await knex('tb_unidades')
    .insert({ nome_unidade: 'Financeiro', sigla: 'FIN', descricao: 'Departamento Financeiro' })
    .returning('*');

  const [unidProc] = await knex('tb_unidades')
    .insert({ nome_unidade: 'Procuradoria', sigla: 'PROC', descricao: 'Departamento Jurídico e Procuradoria' })
    .returning('*');

  // ─── Departamentos ───────────────────────────────────────────────────────────

  const [deptGov] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Governança TI', id_unidade: unidSti.id_unidade })
    .returning('*');

  const [deptOps] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Operações e Infraestrutura', id_unidade: unidSti.id_unidade })
    .returning('*');

  const [deptRecr] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Recrutamento e Seleção', id_unidade: unidRh.id_unidade })
    .returning('*');

  const [deptBen] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Benefícios e Folha', id_unidade: unidRh.id_unidade })
    .returning('*');

  const [deptCont] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Contabilidade', id_unidade: unidFin.id_unidade })
    .returning('*');

  const [deptProc] = await knex('tb_departamentos')
    .insert({ nome_departamento: 'Processos Jurídicos', id_unidade: unidProc.id_unidade })
    .returning('*');

  // ─── Usuários ─────────────────────────────────────────────────────────────────

  const senhaHash = await bcrypt.hash('senha123', 10);

  const [uJorge] = await knex('tb_usuarios').insert({
    nome: 'Jorge Alcoforado', email: 'jorge@agilize.com.br', cpf: '12345678901',
    senha_hash: senhaHash, perfil_principal: 'SOLICITANTE',
    id_unidade: unidRh.id_unidade, id_departamento: deptRecr.id_departamento,
  }).returning('*');

  const [uAna] = await knex('tb_usuarios').insert({
    nome: 'Ana Paula Costa', email: 'ana@agilize.com.br', cpf: '12345678906',
    senha_hash: senhaHash, perfil_principal: 'SOLICITANTE',
    id_unidade: unidFin.id_unidade, id_departamento: deptCont.id_departamento,
  }).returning('*');

  const [uMaria] = await knex('tb_usuarios').insert({
    nome: 'Maria Silva', email: 'maria@agilize.com.br', cpf: '12345678902',
    senha_hash: senhaHash, perfil_principal: 'GESTOR_UNIDADE',
    id_unidade: unidRh.id_unidade, id_departamento: deptRecr.id_departamento,
  }).returning('*');

  const [uJoao] = await knex('tb_usuarios').insert({
    nome: 'João Santos', email: 'joao@agilize.com.br', cpf: '12345678903',
    senha_hash: senhaHash, perfil_principal: 'ANALISTA_STI',
    id_unidade: unidSti.id_unidade, id_departamento: deptGov.id_departamento,
  }).returning('*');

  const [uCarlos] = await knex('tb_usuarios').insert({
    nome: 'Carlos Mendes', email: 'carlos@agilize.com.br', cpf: '12345678904',
    senha_hash: senhaHash, perfil_principal: 'RESPONSAVEL_PRODUCAO',
    id_unidade: unidSti.id_unidade, id_departamento: deptOps.id_departamento,
  }).returning('*');

  const [uAdmin] = await knex('tb_usuarios').insert({
    nome: 'Admin Agilize', email: 'admin@agilize.com.br', cpf: '00000000000',
    senha_hash: senhaHash, perfil_principal: 'GESTOR_SISTEMA',
  }).returning('*');

  // ─── Atribuições de gestor ───────────────────────────────────────────────────

  await knex('tb_atribuicoes_gestor').insert({
    id_gestor: uMaria.id_usuario, nome_gestor: uMaria.nome, email_gestor: uMaria.email,
    perfil_gestor: 'GESTOR_UNIDADE', id_unidade: unidRh.id_unidade,
    id_usuario_criacao: uAdmin.id_usuario,
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  let seq = 1;
  const numDemanda = () => `AG-2026-SEED${String(seq++).padStart(2, '0')}`;
  const now = () => new Date().toISOString();
  const diasAtras = (n) => new Date(Date.now() - n * 864e5).toISOString();

  async function inserirHistorico(entries) {
    if (entries.length) await knex('tb_historico_decisoes').insert(entries);
  }

  // ─── DEMANDAS ────────────────────────────────────────────────────────────────
  // Cobertura: todas as fases para todos os perfis poderem testar suas ações.

  // 1. DRAFT — jorge pode editar e enviar para gestor
  await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Painel BI de Controle de Frequência',
    descricao: 'Criação de painel Power BI integrado ao sistema de ponto eletrônico para acompanhar frequência, horas extras e ausências da equipe de RH em tempo real.',
    justificativa: 'Atualmente os relatórios são gerados manualmente em planilhas Excel, consumindo 8h/semana da equipe.',
    tipo_solucao: 'PAINEL_BI', prioridade: 'ALTA', status_atual: 'DRAFT',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    objetivo_principal: 'Automatizar relatórios de frequência', publico_alvo: 'Gestores de RH',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 5,
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  });

  // 2. DEVOLVIDA_AJUSTES — jorge precisa corrigir e reenviar
  const [d2] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Script de Backup Automático de Planilhas',
    descricao: 'Script Python para realizar backup diário das planilhas compartilhadas no servidor de arquivos, compactando e enviando para repositório seguro.',
    justificativa: 'Já houve perda de dados duas vezes neste ano por falha no servidor de arquivos.',
    tipo_solucao: 'SCRIPT', prioridade: 'ALTA', status_atual: 'DEVOLVIDA_AJUSTES',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    objetivo_principal: 'Garantir backup automático', publico_alvo: 'Equipe RH',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 1,
    data_envio_gestor: diasAtras(5),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d2.id_demanda, numero_demanda: d2.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(5), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d2.id_demanda, numero_demanda: d2.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'DEVOLVIDA_AJUSTES', tipo_acao: 'DEVOLVER', parecer: 'Descrição técnica insuficiente. Detalhe o ambiente de execução do script e os requisitos de segurança para o repositório de backup.', data_hora: diasAtras(3), duracao_etapa_dias: 2, sla_em_dia: true },
  ]);

  // 3. APROVADA_STI — jorge pode iniciar desenvolvimento
  const [d3] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Sistema de Controle de Férias e Licenças',
    descricao: 'Sistema web simples para solicitação, aprovação e acompanhamento de férias e licenças dos servidores do departamento de RH, integrado ao calendário corporativo.',
    justificativa: 'O processo atual é manual via formulário em papel, gerando atrasos e inconsistências no planejamento de equipe.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'CRITICA', status_atual: 'APROVADA_STI',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Digitalizar processo de férias', publico_alvo: 'Todos os servidores do RH',
    frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 50,
    data_envio_gestor: diasAtras(15), data_validacao_gestor: diasAtras(13),
    data_fila_sti: diasAtras(13), data_aprovacao_sti: diasAtras(10),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d3.id_demanda, numero_demanda: d3.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(15), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d3.id_demanda, numero_demanda: d3.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Demanda crítica. Endosso e encaminho à STI com prioridade.', data_hora: diasAtras(13), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d3.id_demanda, numero_demanda: d3.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(13), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d3.id_demanda, numero_demanda: d3.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Solução viável. Stack sugerida: React + Node.js + PostgreSQL. Prazo estimado: 30 dias. Aprovado para desenvolvimento.', data_hora: diasAtras(10), duracao_etapa_dias: 3, sla_em_dia: true },
  ]);

  // 4. EM_DESENVOLVIMENTO — jorge pode submeter para homologação
  const [d4] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Agente IA de Triagem de Currículos',
    descricao: 'Agente de IA para análise automática de currículos recebidos em processos seletivos, classificando candidatos por aderência ao perfil buscado e gerando relatório de triagem.',
    justificativa: 'O volume de candidatos em processos seletivos supera 500 inscrições, inviabilizando análise manual no prazo necessário.',
    tipo_solucao: 'AGENTE_IA', prioridade: 'ALTA', status_atual: 'EM_DESENVOLVIMENTO',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar triagem de candidatos', publico_alvo: 'Equipe de Recrutamento',
    frequencia_uso: 'PONTUAL', quantidade_usuarios_estimada: 3,
    data_envio_gestor: diasAtras(25), data_validacao_gestor: diasAtras(23),
    data_fila_sti: diasAtras(23), data_aprovacao_sti: diasAtras(20),
    data_inicio_desenvolvimento: diasAtras(18),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d4.id_demanda, numero_demanda: d4.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(25), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d4.id_demanda, numero_demanda: d4.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Aprovado. Iniciativa alinhada com a estratégia de modernização do RH.', data_hora: diasAtras(23), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d4.id_demanda, numero_demanda: d4.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(23), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d4.id_demanda, numero_demanda: d4.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Aprovado. Utilizar API Anthropic Claude para análise. Documentar critérios de triagem antes de iniciar.', data_hora: diasAtras(20), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d4.id_demanda, numero_demanda: d4.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'APROVADA_STI', status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR_DESENVOLVIMENTO', data_hora: diasAtras(18), duracao_etapa_dias: 2, sla_em_dia: true },
  ]);

  // 5. PENDENTE_GESTOR — maria precisa validar (demanda da Ana, unidade FIN)
  await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Dashboard de Execução Orçamentária',
    descricao: 'Painel de visualização em tempo real da execução do orçamento por centro de custo, com alertas automáticos quando o gasto atingir 80% do previsto.',
    justificativa: 'Gestores financeiros precisam de visibilidade em tempo real para evitar estouros orçamentários.',
    tipo_solucao: 'PAINEL_BI', prioridade: 'ALTA', status_atual: 'PENDENTE_GESTOR',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    objetivo_principal: 'Visibilidade orçamentária em tempo real', publico_alvo: 'Gestores Financeiros',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 10,
    data_envio_gestor: diasAtras(2),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  });

  // 6. FILA_STI — joao precisa analisar
  const [d6] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Monitor de Disponibilidade de Sistemas',
    descricao: 'Script de monitoramento que verifica a disponibilidade dos sistemas internos a cada 5 minutos e envia alertas por e-mail quando algum serviço ficar indisponível.',
    justificativa: 'Incidentes recentes passaram despercebidos por horas, causando impacto nos usuários.',
    tipo_solucao: 'SCRIPT', prioridade: 'CRITICA', status_atual: 'FILA_STI',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    objetivo_principal: 'Monitorar sistemas críticos', publico_alvo: 'Equipe de TI',
    frequencia_uso: 'CONTINUO', quantidade_usuarios_estimada: 5,
    data_envio_gestor: diasAtras(8), data_validacao_gestor: diasAtras(6), data_fila_sti: diasAtras(6),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d6.id_demanda, numero_demanda: d6.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(8), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d6.id_demanda, numero_demanda: d6.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Demanda crítica para a operação. Prioridade máxima.', data_hora: diasAtras(6), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d6.id_demanda, numero_demanda: d6.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(6), duracao_etapa_dias: 0, sla_em_dia: true },
  ]);

  // 7. PENDENTE_HOMOLOGACAO_GESTOR — maria precisa validar homologação
  const [d7] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Relatório Mensal de Indicadores de RH',
    descricao: 'Script Python para gerar automaticamente o relatório mensal de KPIs de RH (turnover, absenteísmo, tempo médio de contratação) em formato PDF e Excel.',
    justificativa: 'O relatório mensal consome 2 dias de trabalho de um analista. A automação liberaria esse tempo para análises mais estratégicas.',
    tipo_solucao: 'SCRIPT', prioridade: 'MEDIA', status_atual: 'PENDENTE_HOMOLOGACAO_GESTOR',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptBen.id_departamento, nome_departamento: deptBen.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar relatório mensal', publico_alvo: 'Gestão de RH',
    frequencia_uso: 'MENSAL', quantidade_usuarios_estimada: 2,
    data_envio_gestor: diasAtras(40), data_validacao_gestor: diasAtras(38),
    data_fila_sti: diasAtras(38), data_aprovacao_sti: diasAtras(35),
    data_inicio_desenvolvimento: diasAtras(33), data_submissao_homologacao: diasAtras(3),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(40), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Aprovado.', data_hora: diasAtras(38), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(38), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Aprovado. Utilize pandas e reportlab para geração do PDF.', data_hora: diasAtras(35), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'APROVADA_STI', status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR_DESENVOLVIMENTO', data_hora: diasAtras(33), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d7.id_demanda, numero_demanda: d7.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Script desenvolvido e testado localmente. Repositório: gitlab.tce.ce.gov.br/rh/relatorios-mensais', data_hora: diasAtras(3), duracao_etapa_dias: 30, sla_em_dia: true },
  ]);

  // 8. FILA_HOMOLOGACAO_STI — joao precisa homologar
  const [d8] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Chatbot de Atendimento ao Servidor',
    descricao: 'Agente de IA para responder perguntas frequentes dos servidores sobre benefícios, férias, licenças e folha de pagamento via interface web.',
    justificativa: 'A central de atendimento recebe mais de 200 ligações/dia com dúvidas repetitivas que podem ser automatizadas.',
    tipo_solucao: 'AGENTE_IA', prioridade: 'ALTA', status_atual: 'FILA_HOMOLOGACAO_STI',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptBen.id_departamento, nome_departamento: deptBen.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Reduzir volume de atendimento manual', publico_alvo: 'Todos os servidores',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 500,
    data_envio_gestor: diasAtras(50), data_validacao_gestor: diasAtras(48),
    data_fila_sti: diasAtras(48), data_aprovacao_sti: diasAtras(45),
    data_inicio_desenvolvimento: diasAtras(43), data_submissao_homologacao: diasAtras(10),
    data_validacao_homologacao_gestor: diasAtras(7), data_fila_homologacao_sti: diasAtras(7),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d8.id_demanda, numero_demanda: d8.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Chatbot implementado com Claude API. Testado com 50 perguntas frequentes.', data_hora: diasAtras(10), duracao_etapa_dias: 33, sla_em_dia: true },
    { id_demanda: d8.id_demanda, numero_demanda: d8.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'PENDENTE_HOMOLOGACAO_GESTOR', tipo_acao: 'RECEBER_HOMOLOGACAO', data_hora: diasAtras(10), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d8.id_demanda, numero_demanda: d8.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_HOMOLOGACAO_GESTOR', status_novo: 'VALIDADA_HOMOLOGACAO_GESTOR', tipo_acao: 'VALIDAR_HOMOLOGACAO_GESTOR', parecer: 'Testei as principais funcionalidades. Aprovado para avaliação técnica da STI.', data_hora: diasAtras(7), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d8.id_demanda, numero_demanda: d8.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_HOMOLOGACAO_GESTOR', status_novo: 'FILA_HOMOLOGACAO_STI', tipo_acao: 'ENVIAR_HOMOLOGACAO_STI', data_hora: diasAtras(7), duracao_etapa_dias: 0, sla_em_dia: true },
  ]);

  // 9. HOMOLOGADA — carlos precisa fazer deploy (OPS_DEPLOY)
  const [d9] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'API de Integração com Sistema Financeiro',
    descricao: 'API REST para integrar o sistema de controle financeiro com o ERP corporativo, automatizando a sincronização de lançamentos contábeis.',
    justificativa: 'Conciliação manual entre os sistemas consome 3 dias/mês de um analista e está sujeita a erros.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'CRITICA', status_atual: 'HOMOLOGADA',
    tipo_deploy: 'OPS_DEPLOY',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_sti_homologacao: uJoao.id_usuario, nome_analista_sti_homologacao: uJoao.nome,
    objetivo_principal: 'Automatizar conciliação contábil', publico_alvo: 'Analistas Financeiros',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 3,
    data_envio_gestor: diasAtras(60), data_validacao_gestor: diasAtras(58),
    data_fila_sti: diasAtras(58), data_aprovacao_sti: diasAtras(55),
    data_inicio_desenvolvimento: diasAtras(53), data_submissao_homologacao: diasAtras(15),
    data_validacao_homologacao_gestor: diasAtras(12), data_fila_homologacao_sti: diasAtras(12),
    data_homologacao: diasAtras(5),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d9.id_demanda, numero_demanda: d9.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'HOMOLOGADA', tipo_acao: 'HOMOLOGAR', parecer: 'API homologada. Todos os endpoints testados. Cobertura de testes: 92%. Aprovada para produção com deploy pela equipe de Ops.', data_hora: diasAtras(5), duracao_etapa_dias: 7, sla_em_dia: true },
  ]);

  // 10. EM_PRODUCAO — carlos precisa confirmar deploy
  const [d10] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Portal de Transparência de Licitações',
    descricao: 'Sistema web para publicação e consulta de processos licitatórios, contratos e atas de registro de preços, atendendo às exigências da Lei de Acesso à Informação.',
    justificativa: 'Obrigatoriedade legal de transparência ativa. Multa aplicável pelo TCU em caso de descumprimento.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'CRITICA', status_atual: 'EM_PRODUCAO',
    tipo_deploy: 'OPS_DEPLOY',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_sti_homologacao: uJoao.id_usuario, nome_analista_sti_homologacao: uJoao.nome,
    id_analista_deploy: uCarlos.id_usuario, nome_analista_deploy: uCarlos.nome,
    objetivo_principal: 'Atender exigência da LAI', publico_alvo: 'Cidadãos e órgãos de controle',
    frequencia_uso: 'CONTINUO', quantidade_usuarios_estimada: 1000,
    data_envio_gestor: diasAtras(90), data_validacao_gestor: diasAtras(88),
    data_fila_sti: diasAtras(88), data_aprovacao_sti: diasAtras(85),
    data_inicio_desenvolvimento: diasAtras(83), data_submissao_homologacao: diasAtras(20),
    data_validacao_homologacao_gestor: diasAtras(17), data_fila_homologacao_sti: diasAtras(17),
    data_homologacao: diasAtras(10), data_inicio_producao: diasAtras(2),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d10.id_demanda, numero_demanda: d10.numero_demanda, id_usuario: uCarlos.id_usuario, nome_usuario: uCarlos.nome, email_usuario: uCarlos.email, perfil_usuario: 'RESPONSAVEL_PRODUCAO', status_anterior: 'HOMOLOGADA', status_novo: 'EM_PRODUCAO', tipo_acao: 'INICIAR_DEPLOY', parecer: 'Deploy iniciado no servidor de produção. Aguardando testes de fumaça.', data_hora: diasAtras(2), duracao_etapa_dias: 8, sla_em_dia: true },
  ]);

  // 11. EM_MONITORAMENTO — concluído com sucesso
  const [d11] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Script de Geração de Certidões Automáticas',
    descricao: 'Script para geração automatizada de certidões de regularidade para fornecedores cadastrados, integrando com os sistemas de cadastro e emitindo documentos em PDF.',
    justificativa: 'Processo manual gera fila de atendimento de até 3 dias. Com automação, certidões serão emitidas em menos de 1 minuto.',
    tipo_solucao: 'SCRIPT', prioridade: 'ALTA', status_atual: 'EM_MONITORAMENTO',
    tipo_deploy: 'SELF_DEPLOY',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar emissão de certidões', publico_alvo: 'Fornecedores cadastrados',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 200,
    data_envio_gestor: diasAtras(120), data_homologacao: diasAtras(30),
    data_inicio_producao: diasAtras(25), data_monitoramento: diasAtras(10),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d11.id_demanda, numero_demanda: d11.numero_demanda, id_usuario: uCarlos.id_usuario, nome_usuario: uCarlos.nome, email_usuario: uCarlos.email, perfil_usuario: 'RESPONSAVEL_PRODUCAO', status_anterior: 'EM_PRODUCAO', status_novo: 'EM_MONITORAMENTO', tipo_acao: 'CONFIRMAR_DEPLOY', parecer: 'Deploy concluído. Sistema estável. Iniciando período de monitoramento de 30 dias.', data_hora: diasAtras(10), duracao_etapa_dias: 15, sla_em_dia: true },
  ]);

  // 12. REJEITADA — estado terminal
  const [d12] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Sistema de Mineração de Dados Processuais',
    descricao: 'Sistema de mineração e análise de dados de processos administrativos para identificar padrões de fraude.',
    justificativa: 'Identificar irregularidades automaticamente nos processos.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'MEDIA', status_atual: 'REJEITADA',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    data_envio_gestor: diasAtras(30),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d12.id_demanda, numero_demanda: d12.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR', parecer: 'Demanda rejeitada. Escopo excede as atribuições de soluções setoriais. Necessário encaminhar como projeto institucional pela Diretoria de TI.', data_hora: diasAtras(28), duracao_etapa_dias: 2, sla_em_dia: true },
  ]);

  // 13. CANCELADA — estado terminal
  const [d13] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Integração com Sistema de Protocolo Externo',
    descricao: 'Integração do sistema interno com plataforma externa de protocolo digital para troca de documentos.',
    justificativa: 'Reduzir trâmite físico de documentos com outros órgãos.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'BAIXA', status_atual: 'CANCELADA',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    motivo_cancelamento: 'Plataforma externa foi descontinuada pelo fornecedor. Demanda sem viabilidade técnica.',
    id_usuario_cancelamento: uJorge.id_usuario,
    data_envio_gestor: diasAtras(45),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d13.id_demanda, numero_demanda: d13.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'CANCELADA', tipo_acao: 'CANCELAR', parecer: 'Plataforma externa foi descontinuada. Cancelando demanda.', data_hora: diasAtras(40), duracao_etapa_dias: 5, sla_em_dia: true },
  ]);

  // ─── Novos usuários ──────────────────────────────────────────────────────────

  const [uPedro] = await knex('tb_usuarios').insert({
    nome: 'Pedro Henrique Lima', email: 'pedro@agilize.com.br', cpf: '98765432109',
    senha_hash: senhaHash, perfil_principal: 'SOLICITANTE',
    id_unidade: unidProc.id_unidade, id_departamento: deptProc.id_departamento,
  }).returning('*');

  const [uLuciana] = await knex('tb_usuarios').insert({
    nome: 'Luciana Ferreira', email: 'luciana@agilize.com.br', cpf: '98765432110',
    senha_hash: senhaHash, perfil_principal: 'GESTOR_UNIDADE',
    id_unidade: unidFin.id_unidade, id_departamento: deptCont.id_departamento,
  }).returning('*');

  const [uRafael] = await knex('tb_usuarios').insert({
    nome: 'Rafael Oliveira', email: 'rafael@agilize.com.br', cpf: '98765432111',
    senha_hash: senhaHash, perfil_principal: 'SOLICITANTE',
    id_unidade: unidSti.id_unidade, id_departamento: deptGov.id_departamento,
  }).returning('*');

  await knex('tb_atribuicoes_gestor').insert({
    id_gestor: uLuciana.id_usuario, nome_gestor: uLuciana.nome, email_gestor: uLuciana.email,
    perfil_gestor: 'GESTOR_UNIDADE', id_unidade: unidFin.id_unidade,
    id_usuario_criacao: uAdmin.id_usuario,
  });

  await knex('tb_atribuicoes_gestor').insert({
    id_gestor: uMaria.id_usuario, nome_gestor: uMaria.nome, email_gestor: uMaria.email,
    perfil_gestor: 'GESTOR_UNIDADE', id_unidade: unidProc.id_unidade,
    id_usuario_criacao: uAdmin.id_usuario,
  });

  // ─── Demandas d14–d30 ────────────────────────────────────────────────────────

  // 14. DRAFT — Rafael (STI)
  await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Dashboard de Utilização de Licenças de Software',
    descricao: 'Painel para monitorar em tempo real o uso de licenças de software corporativo por departamento, identificando licenças ociosas e necessidades de renovação.',
    justificativa: 'Economizar com renovações desnecessárias e planejar aquisições com mais precisão.',
    tipo_solucao: 'PAINEL_BI', prioridade: 'MEDIA', status_atual: 'DRAFT',
    id_solicitante: uRafael.id_usuario, nome_solicitante: uRafael.nome, email_solicitante: uRafael.email,
    id_unidade: unidSti.id_unidade, nome_unidade: unidSti.nome_unidade,
    id_departamento: deptGov.id_departamento, nome_departamento: deptGov.nome_departamento,
    objetivo_principal: 'Otimizar gestão de licenças de software da instituição',
    publico_alvo: 'Equipe de TI e Gestores', frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 8,
    id_usuario_criacao: uRafael.id_usuario, ativo: true,
  });

  // 15. DRAFT — Pedro (PROC)
  await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Indexador Automático de Processos Jurídicos',
    descricao: 'Script para indexar e categorizar automaticamente processos jurídicos digitalizados, extraindo metadados como tipo, partes e datas para facilitar pesquisas.',
    justificativa: 'O volume de processos digitalizados cresce 30% ao mês e a busca manual está se tornando inviável.',
    tipo_solucao: 'SCRIPT', prioridade: 'ALTA', status_atual: 'DRAFT',
    id_solicitante: uPedro.id_usuario, nome_solicitante: uPedro.nome, email_solicitante: uPedro.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    objetivo_principal: 'Automatizar categorização de processos jurídicos digitalizados',
    publico_alvo: 'Equipe da Procuradoria', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 12,
    id_usuario_criacao: uPedro.id_usuario, ativo: true,
  });

  // 16. PENDENTE_GESTOR — Pedro (PROC), Maria é gestora de PROC
  await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Sistema de Controle de Prazos Processuais',
    descricao: 'Aplicação para monitorar e alertar sobre prazos vencendo em processos administrativos e judiciais, com notificações automáticas por e-mail para os responsáveis.',
    justificativa: 'Perda de prazo processual acarreta prejuízo institucional e responsabilização dos servidores.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'CRITICA', status_atual: 'PENDENTE_GESTOR',
    id_solicitante: uPedro.id_usuario, nome_solicitante: uPedro.nome, email_solicitante: uPedro.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    objetivo_principal: 'Eliminar risco de perda de prazos processuais', publico_alvo: 'Procuradores e Analistas',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 20,
    data_envio_gestor: diasAtras(1),
    id_usuario_criacao: uPedro.id_usuario, ativo: true,
  });

  // 17. SOLICITANTE_AJUSTANDO — Rafael (FIN com Luciana como gestora)
  const [d17] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Painel de Acompanhamento de Contratos',
    descricao: 'Painel Power BI para monitorar contratos vigentes, valores, vencimentos e renovações, com alertas automáticos para contratos próximos ao vencimento.',
    justificativa: 'Atualmente os contratos são monitorados em planilhas, gerando risco de vencimento sem renovação.',
    tipo_solucao: 'PAINEL_BI', prioridade: 'ALTA', status_atual: 'SOLICITANTE_AJUSTANDO',
    id_solicitante: uRafael.id_usuario, nome_solicitante: uRafael.nome, email_solicitante: uRafael.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uLuciana.id_usuario, nome_gestor_unidade: uLuciana.nome,
    objetivo_principal: 'Centralizar monitoramento de contratos vigentes', publico_alvo: 'Gestores de Contratos',
    frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 6,
    data_envio_gestor: diasAtras(7),
    id_usuario_criacao: uRafael.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d17.id_demanda, numero_demanda: d17.numero_demanda, id_usuario: uRafael.id_usuario, nome_usuario: uRafael.nome, email_usuario: uRafael.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(7), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d17.id_demanda, numero_demanda: d17.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'DEVOLVIDA_AJUSTES', tipo_acao: 'DEVOLVER', parecer: 'Demanda precisa especificar as fontes de dados dos contratos e o formato de exportação necessário para integração.', data_hora: diasAtras(5), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d17.id_demanda, numero_demanda: d17.numero_demanda, id_usuario: uRafael.id_usuario, nome_usuario: uRafael.nome, email_usuario: uRafael.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DEVOLVIDA_AJUSTES', status_novo: 'SOLICITANTE_AJUSTANDO', tipo_acao: 'INICIAR_AJUSTE', data_hora: diasAtras(4), duracao_etapa_dias: 1, sla_em_dia: true },
  ]);

  // 18. SOLICITADO_AJUSTES_STI — Jorge (RH)
  const [d18] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Bot de Agendamento de Entrevistas',
    descricao: 'Agente conversacional integrado ao Microsoft Teams para automatizar o agendamento de entrevistas de seleção, consultando a disponibilidade de gestores e candidatos.',
    justificativa: 'A coordenação manual de agendas para processos seletivos consome 4h por processo e frequentemente gera conflitos.',
    tipo_solucao: 'AGENTE_IA', prioridade: 'MEDIA', status_atual: 'SOLICITADO_AJUSTES_STI',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptRecr.id_departamento, nome_departamento: deptRecr.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar agendamento de entrevistas de seleção', publico_alvo: 'Equipe de Recrutamento',
    frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 10,
    data_envio_gestor: diasAtras(12), data_validacao_gestor: diasAtras(10),
    data_fila_sti: diasAtras(10),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d18.id_demanda, numero_demanda: d18.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(12), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d18.id_demanda, numero_demanda: d18.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Solução inovadora para o processo seletivo. Aprovo e encaminho à STI para análise técnica.', data_hora: diasAtras(10), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d18.id_demanda, numero_demanda: d18.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(10), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d18.id_demanda, numero_demanda: d18.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'SOLICITADO_AJUSTES_STI', tipo_acao: 'SOLICITAR_AJUSTES_STI', parecer: 'Necessário detalhar: modelo de LLM a utilizar, escopo das integrações com Teams Graph API, e política de retenção de dados dos candidatos (LGPD).', data_hora: diasAtras(7), duracao_etapa_dias: 3, sla_em_dia: true },
  ]);

  // 19. APROVADA_STI — Ana (FIN, Luciana como gestora)
  const [d19] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Relatório Automático de Inadimplência',
    descricao: 'Script para geração e envio automático de relatório semanal de inadimplência por categoria e faixa de valor, cruzando dados de cobranças e pagamentos.',
    justificativa: 'Relatório atual é gerado manualmente toda segunda-feira, ocupando 6h de um analista por semana.',
    tipo_solucao: 'SCRIPT', prioridade: 'ALTA', status_atual: 'APROVADA_STI',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uLuciana.id_usuario, nome_gestor_unidade: uLuciana.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar geração semanal do relatório de inadimplência',
    publico_alvo: 'Equipe Financeira e Diretoria', frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 5,
    data_envio_gestor: diasAtras(20), data_validacao_gestor: diasAtras(18),
    data_fila_sti: diasAtras(18), data_aprovacao_sti: diasAtras(14),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d19.id_demanda, numero_demanda: d19.numero_demanda, id_usuario: uAna.id_usuario, nome_usuario: uAna.nome, email_usuario: uAna.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(20), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d19.id_demanda, numero_demanda: d19.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Demanda relevante para a área financeira. Aprovo e encaminho para análise da STI.', data_hora: diasAtras(18), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d19.id_demanda, numero_demanda: d19.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(18), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d19.id_demanda, numero_demanda: d19.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Solução viável. Recomendo uso de Python com pandas. Cuidado com tratamento de dados sensíveis conforme LGPD.', data_hora: diasAtras(14), duracao_etapa_dias: 4, sla_em_dia: true },
  ]);

  // 20. APROVADA_STI — Pedro (PROC, Maria como gestora)
  const [d20] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Assistente de Pesquisa Jurisprudencial',
    descricao: 'Agente de IA para pesquisa e sumarização de jurisprudência em bases de dados jurídicas, facilitando a preparação de peças processuais com precedentes relevantes.',
    justificativa: 'Pesquisa manual de jurisprudência consome entre 2 a 8 horas por peça processual, dependendo da complexidade.',
    tipo_solucao: 'AGENTE_IA', prioridade: 'ALTA', status_atual: 'APROVADA_STI',
    id_solicitante: uPedro.id_usuario, nome_solicitante: uPedro.nome, email_solicitante: uPedro.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Reduzir tempo de pesquisa jurisprudencial em peças processuais',
    publico_alvo: 'Procuradores e Analistas Jurídicos', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 15,
    data_envio_gestor: diasAtras(22), data_validacao_gestor: diasAtras(20),
    data_fila_sti: diasAtras(20), data_aprovacao_sti: diasAtras(16),
    id_usuario_criacao: uPedro.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d20.id_demanda, numero_demanda: d20.numero_demanda, id_usuario: uPedro.id_usuario, nome_usuario: uPedro.nome, email_usuario: uPedro.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(22), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d20.id_demanda, numero_demanda: d20.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Iniciativa estratégica para a Procuradoria. Ganho de produtividade expressivo esperado. Aprovado.', data_hora: diasAtras(20), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d20.id_demanda, numero_demanda: d20.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(20), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d20.id_demanda, numero_demanda: d20.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Aprovado. Usar Claude API para RAG sobre base de jurisprudência indexada. Respeitar limitações de reprodução de decisões judiciais.', data_hora: diasAtras(16), duracao_etapa_dias: 4, sla_em_dia: true },
  ]);

  // 21. EM_DESENVOLVIMENTO — Rafael (STI)
  const [d21] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Gerador de Atas de Reunião com IA',
    descricao: 'Ferramenta de IA para transcrever e sumarizar automaticamente as atas de reuniões gravadas, gerando documento estruturado com pontos deliberados e responsáveis.',
    justificativa: 'Elaboração manual de atas de reunião consome em média 3 horas por reunião e frequentemente fica pendente por dias.',
    tipo_solucao: 'AGENTE_IA', prioridade: 'MEDIA', status_atual: 'EM_DESENVOLVIMENTO',
    id_solicitante: uRafael.id_usuario, nome_solicitante: uRafael.nome, email_solicitante: uRafael.email,
    id_unidade: unidSti.id_unidade, nome_unidade: unidSti.nome_unidade,
    id_departamento: deptGov.id_departamento, nome_departamento: deptGov.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar geração de atas de reunião com suporte de IA',
    publico_alvo: 'Toda a equipe de TI', frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 30,
    data_envio_gestor: diasAtras(35), data_validacao_gestor: diasAtras(33),
    data_fila_sti: diasAtras(33), data_aprovacao_sti: diasAtras(30),
    data_inicio_desenvolvimento: diasAtras(27),
    id_usuario_criacao: uRafael.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d21.id_demanda, numero_demanda: d21.numero_demanda, id_usuario: uRafael.id_usuario, nome_usuario: uRafael.nome, email_usuario: uRafael.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(35), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d21.id_demanda, numero_demanda: d21.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Ótima iniciativa para produtividade. Endosso e encaminho à STI.', data_hora: diasAtras(33), duracao_etapa_dias: 2, sla_em_dia: true },
    { id_demanda: d21.id_demanda, numero_demanda: d21.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(33), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d21.id_demanda, numero_demanda: d21.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Aprovado. Usar Whisper para transcrição e Claude para sumarização. Atentar para LGPD no armazenamento de gravações.', data_hora: diasAtras(30), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d21.id_demanda, numero_demanda: d21.numero_demanda, id_usuario: uRafael.id_usuario, nome_usuario: uRafael.nome, email_usuario: uRafael.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'APROVADA_STI', status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR_DESENVOLVIMENTO', data_hora: diasAtras(27), duracao_etapa_dias: 3, sla_em_dia: true },
  ]);

  // 22. SUBMETIDO_HOMOLOGACAO — Jorge (RH) com 1 retorno em hom.
  const [d22] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Formulário Digital de Avaliação de Desempenho',
    descricao: 'Sistema web para realização do processo de avaliação de desempenho anual, com formulários configuráveis por cargo, workflow de avaliação 360° e geração automática de relatórios.',
    justificativa: 'Avaliação atual é feita em papel, gerando retrabalho de digitação e dificultando análise dos resultados.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'ALTA', status_atual: 'SUBMETIDO_HOMOLOGACAO',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptBen.id_departamento, nome_departamento: deptBen.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Digitalizar e automatizar processo de avaliação de desempenho anual',
    publico_alvo: 'Todos os servidores', frequencia_uso: 'ANUAL', quantidade_usuarios_estimada: 200,
    data_envio_gestor: diasAtras(55), data_validacao_gestor: diasAtras(52),
    data_fila_sti: diasAtras(52), data_aprovacao_sti: diasAtras(48),
    data_inicio_desenvolvimento: diasAtras(45), data_submissao_homologacao: diasAtras(4),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d22.id_demanda, numero_demanda: d22.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR_STI', parecer: 'Aprovado com ressalvas: sistema deve ter controles de acesso por papel (RBAC) e logs de auditoria.', data_hora: diasAtras(48), duracao_etapa_dias: 4, sla_em_dia: true },
    { id_demanda: d22.id_demanda, numero_demanda: d22.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'APROVADA_STI', status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR_DESENVOLVIMENTO', data_hora: diasAtras(45), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d22.id_demanda, numero_demanda: d22.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Sistema desenvolvido com RBAC completo, logs de auditoria e testes automatizados com 85% de cobertura. Repositório: gitlab/rh/avaliacao-desempenho', data_hora: diasAtras(4), duracao_etapa_dias: 41, sla_em_dia: true },
  ]);

  // 23. DEVOLVIDA_HOMOLOGACAO — Ana (FIN, Luciana como gestora)
  const [d23] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Conciliador Automático de Notas Fiscais',
    descricao: 'Script para conciliação automática de notas fiscais eletrônicas recebidas com os pedidos de compra registrados no sistema, identificando divergências de valores e itens.',
    justificativa: 'Conciliação manual processa em média 300 NFs por dia e está sujeita a erros humanos que geram pagamentos indevidos.',
    tipo_solucao: 'SCRIPT', prioridade: 'CRITICA', status_atual: 'DEVOLVIDA_HOMOLOGACAO',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uLuciana.id_usuario, nome_gestor_unidade: uLuciana.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar conciliação de NFs com pedidos de compra',
    publico_alvo: 'Equipe de Contas a Pagar', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 4,
    data_envio_gestor: diasAtras(65), data_validacao_gestor: diasAtras(63),
    data_fila_sti: diasAtras(63), data_aprovacao_sti: diasAtras(58),
    data_inicio_desenvolvimento: diasAtras(55), data_submissao_homologacao: diasAtras(8),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d23.id_demanda, numero_demanda: d23.numero_demanda, id_usuario: uAna.id_usuario, nome_usuario: uAna.nome, email_usuario: uAna.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Script desenvolvido em Python com testes unitários. Concilia NFs com pedidos por CNPJ, número e valor.', data_hora: diasAtras(8), duracao_etapa_dias: 47, sla_em_dia: true },
    { id_demanda: d23.id_demanda, numero_demanda: d23.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'PENDENTE_HOMOLOGACAO_GESTOR', tipo_acao: 'RECEBER_HOMOLOGACAO', data_hora: diasAtras(8), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d23.id_demanda, numero_demanda: d23.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_HOMOLOGACAO_GESTOR', status_novo: 'DEVOLVIDA_HOMOLOGACAO', tipo_acao: 'DEVOLVER_HOMOLOGACAO', parecer: 'Ao testar com NFs reais, identifiquei que o script não trata corretamente NFs de devolução (CFOP 5xxx). Precisa corrigir antes de avançar.', data_hora: diasAtras(5), duracao_etapa_dias: 3, sla_em_dia: true },
  ]);

  // 24. AJUSTANDO_HOMOLOGACAO — Jorge (RH)
  const [d24] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Calculadora de Progressão de Carreira',
    descricao: 'Ferramenta para simular e calcular automaticamente datas e valores de progressão de carreira dos servidores, considerando as regras do plano de cargos vigente.',
    justificativa: 'Cálculos manuais geram contestações frequentes e consomem tempo da equipe de RH em verificações.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'MEDIA', status_atual: 'AJUSTANDO_HOMOLOGACAO',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptBen.id_departamento, nome_departamento: deptBen.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar cálculo e simulação de progressões de carreira',
    publico_alvo: 'Equipe de RH e Servidores', frequencia_uso: 'MENSAL', quantidade_usuarios_estimada: 50,
    data_envio_gestor: diasAtras(70), data_validacao_gestor: diasAtras(68),
    data_fila_sti: diasAtras(68), data_aprovacao_sti: diasAtras(65),
    data_inicio_desenvolvimento: diasAtras(62), data_submissao_homologacao: diasAtras(14),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d24.id_demanda, numero_demanda: d24.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Sistema implementado com as 4 tabelas de progressão do plano de cargos. Testado com 200 simulações históricas.', data_hora: diasAtras(14), duracao_etapa_dias: 48, sla_em_dia: true },
    { id_demanda: d24.id_demanda, numero_demanda: d24.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'PENDENTE_HOMOLOGACAO_GESTOR', tipo_acao: 'RECEBER_HOMOLOGACAO', data_hora: diasAtras(14), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d24.id_demanda, numero_demanda: d24.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_HOMOLOGACAO_GESTOR', status_novo: 'DEVOLVIDA_HOMOLOGACAO', tipo_acao: 'DEVOLVER_HOMOLOGACAO', parecer: 'Encontrei divergência nos cálculos para servidores com mudança de regime em 2022. Favor corrigir e resubmeter.', data_hora: diasAtras(10), duracao_etapa_dias: 4, sla_em_dia: true },
    { id_demanda: d24.id_demanda, numero_demanda: d24.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DEVOLVIDA_HOMOLOGACAO', status_novo: 'AJUSTANDO_HOMOLOGACAO', tipo_acao: 'INICIAR_AJUSTE_HOMOLOGACAO', data_hora: diasAtras(8), duracao_etapa_dias: 2, sla_em_dia: true },
  ]);

  // 25. SOLICITADO_AJUSTES_HOMOLOGACAO — Pedro (PROC, Maria como gestora)
  const [d25] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Gerador de Documentos Jurídicos Padronizados',
    descricao: 'Sistema para geração automática de documentos jurídicos padronizados (notificações, ofícios, recursos) a partir de templates configuráveis com preenchimento automático de dados do processo.',
    justificativa: 'Elaboração manual de cada tipo de documento consome entre 30 minutos e 2 horas dependendo da complexidade.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'ALTA', status_atual: 'SOLICITADO_AJUSTES_HOMOLOGACAO',
    id_solicitante: uPedro.id_usuario, nome_solicitante: uPedro.nome, email_solicitante: uPedro.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Padronizar e automatizar geração de documentos jurídicos',
    publico_alvo: 'Procuradores e Analistas', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 18,
    data_envio_gestor: diasAtras(80), data_validacao_gestor: diasAtras(77),
    data_fila_sti: diasAtras(77), data_aprovacao_sti: diasAtras(72),
    data_inicio_desenvolvimento: diasAtras(68), data_submissao_homologacao: diasAtras(18),
    data_validacao_homologacao_gestor: diasAtras(14), data_fila_homologacao_sti: diasAtras(14),
    id_usuario_criacao: uPedro.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d25.id_demanda, numero_demanda: d25.numero_demanda, id_usuario: uPedro.id_usuario, nome_usuario: uPedro.nome, email_usuario: uPedro.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_DESENVOLVIMENTO', status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer: 'Sistema implementado com 12 templates de documentos. Interface web com preenchimento automático via integração com sistema de processos.', data_hora: diasAtras(18), duracao_etapa_dias: 50, sla_em_dia: true },
    { id_demanda: d25.id_demanda, numero_demanda: d25.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_HOMOLOGACAO_GESTOR', status_novo: 'VALIDADA_HOMOLOGACAO_GESTOR', tipo_acao: 'VALIDAR_HOMOLOGACAO_GESTOR', parecer: 'Templates testados e aprovados pela equipe jurídica. Encaminho para avaliação técnica da STI.', data_hora: diasAtras(14), duracao_etapa_dias: 4, sla_em_dia: true },
    { id_demanda: d25.id_demanda, numero_demanda: d25.numero_demanda, id_usuario: uMaria.id_usuario, nome_usuario: uMaria.nome, email_usuario: uMaria.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_HOMOLOGACAO_GESTOR', status_novo: 'FILA_HOMOLOGACAO_STI', tipo_acao: 'ENVIAR_HOMOLOGACAO_STI', data_hora: diasAtras(14), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d25.id_demanda, numero_demanda: d25.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'SOLICITADO_AJUSTES_HOMOLOGACAO', tipo_acao: 'SOLICITAR_AJUSTES_HOMOLOGACAO', parecer: 'Sistema precisa de ajustes de segurança: adicionar autenticação por certificado digital para assinatura dos documentos e implementar log de auditoria com rastreabilidade de quem gerou cada documento.', data_hora: diasAtras(10), duracao_etapa_dias: 4, sla_em_dia: true },
  ]);

  // 26. HOMOLOGADA SELF_DEPLOY — Rafael (STI)
  const [d26] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Monitor de Performance de Consultas SQL',
    descricao: 'Script de monitoramento contínuo de performance das consultas SQL nos bancos de dados corporativos, identificando queries lentas e gerando relatório diário de otimização.',
    justificativa: 'Queries mal otimizadas vêm causando lentidão em sistemas críticos em horário de pico, impactando produtividade.',
    tipo_solucao: 'SCRIPT', prioridade: 'ALTA', status_atual: 'HOMOLOGADA', tipo_deploy: 'SELF_DEPLOY',
    id_solicitante: uRafael.id_usuario, nome_solicitante: uRafael.nome, email_solicitante: uRafael.email,
    id_unidade: unidSti.id_unidade, nome_unidade: unidSti.nome_unidade,
    id_departamento: deptGov.id_departamento, nome_departamento: deptGov.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_sti_homologacao: uJoao.id_usuario, nome_analista_sti_homologacao: uJoao.nome,
    objetivo_principal: 'Identificar e corrigir gargalos de performance nos bancos de dados',
    publico_alvo: 'Equipe de DBA e Infraestrutura', frequencia_uso: 'CONTINUO', quantidade_usuarios_estimada: 4,
    data_envio_gestor: diasAtras(95), data_homologacao: diasAtras(6),
    id_usuario_criacao: uRafael.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d26.id_demanda, numero_demanda: d26.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'HOMOLOGADA', tipo_acao: 'HOMOLOGAR', parecer: 'Script testado em ambiente de homologação por 7 dias. Identificou corretamente 100% das queries lentas no cenário de teste. Aprovado para produção via self-deploy.', data_hora: diasAtras(6), duracao_etapa_dias: 7, sla_em_dia: true },
  ]);

  // 27. HOMOLOGADA OPS_DEPLOY — Ana (FIN)
  const [d27] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Sistema de Gestão de Almoxarifado',
    descricao: 'Aplicação web para controle de estoque do almoxarifado, com registro de entradas e saídas, alertas de estoque mínimo, requisições eletrônicas e relatórios de consumo por setor.',
    justificativa: 'Controle atual em planilha gera inconsistências frequentes e impossibilita rastreabilidade de materiais.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'ALTA', status_atual: 'HOMOLOGADA', tipo_deploy: 'OPS_DEPLOY',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uLuciana.id_usuario, nome_gestor_unidade: uLuciana.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_sti_homologacao: uJoao.id_usuario, nome_analista_sti_homologacao: uJoao.nome,
    objetivo_principal: 'Digitalizar e controlar movimentação do almoxarifado',
    publico_alvo: 'Equipe de Almoxarifado e Requisitantes', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 50,
    data_envio_gestor: diasAtras(100), data_homologacao: diasAtras(3),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d27.id_demanda, numero_demanda: d27.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'HOMOLOGADA', tipo_acao: 'HOMOLOGAR', parecer: 'Sistema homologado com sucesso. Testes de carga OK para 50 usuários simultâneos. Deploy deve ser realizado pela equipe de Ops fora do horário comercial.', data_hora: diasAtras(3), duracao_etapa_dias: 5, sla_em_dia: true },
  ]);

  // 28. EM_PRODUCAO — Pedro (PROC)
  const [d28] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Extrator de Dados para Prestação de Contas',
    descricao: 'Script para extração e formatação automática de dados necessários para prestação de contas ao TCU, gerando arquivo no formato exigido pelo sistema e-TCU.',
    justificativa: 'Prestação de contas trimestral consome 2 semanas de trabalho para extração e formatação manual de dados.',
    tipo_solucao: 'SCRIPT', prioridade: 'CRITICA', status_atual: 'EM_PRODUCAO', tipo_deploy: 'OPS_DEPLOY',
    id_solicitante: uPedro.id_usuario, nome_solicitante: uPedro.nome, email_solicitante: uPedro.email,
    id_unidade: unidProc.id_unidade, nome_unidade: unidProc.nome_unidade,
    id_departamento: deptProc.id_departamento, nome_departamento: deptProc.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_sti_homologacao: uJoao.id_usuario, nome_analista_sti_homologacao: uJoao.nome,
    id_analista_deploy: uCarlos.id_usuario, nome_analista_deploy: uCarlos.nome,
    objetivo_principal: 'Automatizar extração de dados para o e-TCU',
    publico_alvo: 'Equipe de Controle Interno', frequencia_uso: 'MENSAL', quantidade_usuarios_estimada: 3,
    data_envio_gestor: diasAtras(110), data_homologacao: diasAtras(12), data_inicio_producao: diasAtras(1),
    id_usuario_criacao: uPedro.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d28.id_demanda, numero_demanda: d28.numero_demanda, id_usuario: uCarlos.id_usuario, nome_usuario: uCarlos.nome, email_usuario: uCarlos.email, perfil_usuario: 'RESPONSAVEL_PRODUCAO', status_anterior: 'HOMOLOGADA', status_novo: 'EM_PRODUCAO', tipo_acao: 'INICIAR_DEPLOY', parecer: 'Deploy realizado no servidor de produção. Script configurado como job agendado mensal. Monitorando primeiros ciclos.', data_hora: diasAtras(1), duracao_etapa_dias: 11, sla_em_dia: true },
  ]);

  // 29. EM_MONITORAMENTO — Jorge (RH)
  const [d29] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Painel de Gestão de Treinamentos',
    descricao: 'Painel para acompanhamento de treinamentos realizados, horas de capacitação por servidor, custos de cursos externos e aderência ao plano anual de capacitação.',
    justificativa: 'Sem visibilidade centralizada, a área de T&D não consegue demonstrar ROI dos treinamentos nem identificar gaps de capacitação.',
    tipo_solucao: 'PAINEL_BI', prioridade: 'MEDIA', status_atual: 'EM_MONITORAMENTO', tipo_deploy: 'SELF_DEPLOY',
    id_solicitante: uJorge.id_usuario, nome_solicitante: uJorge.nome, email_solicitante: uJorge.email,
    id_unidade: unidRh.id_unidade, nome_unidade: unidRh.nome_unidade,
    id_departamento: deptBen.id_departamento, nome_departamento: deptBen.nome_departamento,
    id_gestor_unidade: uMaria.id_usuario, nome_gestor_unidade: uMaria.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    id_analista_deploy: uJorge.id_usuario, nome_analista_deploy: uJorge.nome,
    objetivo_principal: 'Centralizar acompanhamento de treinamentos e capacitações',
    publico_alvo: 'Gestores de RH e T&D', frequencia_uso: 'SEMANAL', quantidade_usuarios_estimada: 15,
    data_envio_gestor: diasAtras(130), data_homologacao: diasAtras(45),
    data_inicio_producao: diasAtras(30), data_monitoramento: diasAtras(15),
    id_usuario_criacao: uJorge.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d29.id_demanda, numero_demanda: d29.numero_demanda, id_usuario: uJorge.id_usuario, nome_usuario: uJorge.nome, email_usuario: uJorge.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'EM_PRODUCAO', status_novo: 'EM_MONITORAMENTO', tipo_acao: 'CONFIRMAR_DEPLOY', parecer: 'Painel publicado em produção. Testado por 5 gestores na primeira semana sem incidentes. Iniciando período de monitoramento.', data_hora: diasAtras(15), duracao_etapa_dias: 15, sla_em_dia: true },
  ]);

  // 30. REPROVADA_STI — Ana (FIN)
  const [d30] = await knex('tb_demandas').insert({
    numero_demanda: numDemanda(), titulo: 'Integração com API de Dados Externos Privados',
    descricao: 'Solução para integrar sistemas internos com APIs de bureaus de crédito privados para consulta automática de dados financeiros durante processos de análise.',
    justificativa: 'Consultas manuais são lentas e limitadas, impactando o tempo de análise de processos financeiros.',
    tipo_solucao: 'SISTEMA_SIMPLES', prioridade: 'ALTA', status_atual: 'REPROVADA_STI',
    id_solicitante: uAna.id_usuario, nome_solicitante: uAna.nome, email_solicitante: uAna.email,
    id_unidade: unidFin.id_unidade, nome_unidade: unidFin.nome_unidade,
    id_departamento: deptCont.id_departamento, nome_departamento: deptCont.nome_departamento,
    id_gestor_unidade: uLuciana.id_usuario, nome_gestor_unidade: uLuciana.nome,
    id_analista_sti: uJoao.id_usuario, nome_analista_sti: uJoao.nome,
    objetivo_principal: 'Automatizar consultas a bureaus de crédito durante análise financeira',
    publico_alvo: 'Analistas Financeiros', frequencia_uso: 'DIARIO', quantidade_usuarios_estimada: 6,
    data_envio_gestor: diasAtras(25), data_validacao_gestor: diasAtras(22),
    data_fila_sti: diasAtras(22),
    id_usuario_criacao: uAna.id_usuario, ativo: true,
  }).returning('*');
  await inserirHistorico([
    { id_demanda: d30.id_demanda, numero_demanda: d30.numero_demanda, id_usuario: uAna.id_usuario, nome_usuario: uAna.nome, email_usuario: uAna.email, perfil_usuario: 'SOLICITANTE', status_anterior: 'DRAFT', status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR_GESTOR', data_hora: diasAtras(25), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d30.id_demanda, numero_demanda: d30.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR_GESTOR', parecer: 'Necessidade real da área. Encaminho para avaliação técnica e legal da STI.', data_hora: diasAtras(22), duracao_etapa_dias: 3, sla_em_dia: true },
    { id_demanda: d30.id_demanda, numero_demanda: d30.numero_demanda, id_usuario: uLuciana.id_usuario, nome_usuario: uLuciana.nome, email_usuario: uLuciana.email, perfil_usuario: 'GESTOR_UNIDADE', status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI', data_hora: diasAtras(22), duracao_etapa_dias: 0, sla_em_dia: true },
    { id_demanda: d30.id_demanda, numero_demanda: d30.numero_demanda, id_usuario: uJoao.id_usuario, nome_usuario: uJoao.nome, email_usuario: uJoao.email, perfil_usuario: 'ANALISTA_STI', status_anterior: 'FILA_STI', status_novo: 'REPROVADA_STI', tipo_acao: 'REPROVAR_STI', motivo_rejeicao: 'Compartilhamento de dados internos com bureaus de crédito privados requer autorização legal específica e análise de conformidade LGPD ainda não realizada pela instituição.', parecer: 'Reprovado por questão legal. A solução proposta envolve transferência de dados pessoais de terceiros a entidades privadas sem base legal clara. Sugerimos aguardar orientação da assessoria jurídica antes de retomar.', data_hora: diasAtras(18), duracao_etapa_dias: 4, sla_em_dia: false },
  ]);

  console.log('✅ Seed concluído:');
  console.log('');
  console.log('   Usuários (9):');
  console.log('   jorge@agilize.com.br   / senha123 → SOLICITANTE (RH)');
  console.log('   ana@agilize.com.br     / senha123 → SOLICITANTE (FIN)');
  console.log('   pedro@agilize.com.br   / senha123 → SOLICITANTE (PROC)');
  console.log('   maria@agilize.com.br   / senha123 → GESTOR_UNIDADE (RH)');
  console.log('   luciana@agilize.com.br / senha123 → GESTOR_UNIDADE (FIN)');
  console.log('   joao@agilize.com.br    / senha123 → ANALISTA_STI (STI-GOV)');
  console.log('   rafael@agilize.com.br  / senha123 → SOLICITANTE (STI)');
  console.log('   carlos@agilize.com.br  / senha123 → RESPONSAVEL_PRODUCAO (STI-OPS)');
  console.log('   admin@agilize.com.br   / senha123 → GESTOR_SISTEMA');
  console.log('');
  console.log('   Demandas (30 cobrindo todos os 23 estados do workflow):');
  console.log('   Fase 1: DRAFT, PENDENTE_GESTOR, DEVOLVIDA_AJUSTES, SOLICITANTE_AJUSTANDO');
  console.log('           VALIDADA_GESTOR, FILA_STI, APROVADA_STI, REPROVADA_STI, REJEITADA');
  console.log('           SOLICITADO_AJUSTES_STI');
  console.log('   Fase 2: EM_DESENVOLVIMENTO, SUBMETIDO_HOMOLOGACAO');
  console.log('   Fase 3: PENDENTE_HOMOLOGACAO_GESTOR, VALIDADA_HOMOLOGACAO_GESTOR');
  console.log('           DEVOLVIDA_HOMOLOGACAO, AJUSTANDO_HOMOLOGACAO');
  console.log('           SOLICITADO_AJUSTES_HOMOLOGACAO, FILA_HOMOLOGACAO_STI, HOMOLOGADA');
  console.log('   Fase 4: EM_PRODUCAO, EM_MONITORAMENTO');
  console.log('   Terminal: CANCELADA');
};
