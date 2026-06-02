const db = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class Demanda {
  static async criar(dados, idSolicitante, ipOrigem) {
    const numeroDemanda = `AG-${new Date().getFullYear()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    const solicitante = await db('tb_usuarios').where('id_usuario', idSolicitante).first();
    const unidade = await db('tb_unidades').where('id_unidade', dados.id_unidade).first();
    const departamento = await db('tb_departamentos').where('id_departamento', dados.id_departamento).first();

    const [{ id_demanda }] = await db('tb_demandas').insert({
      numero_demanda: numeroDemanda,
      titulo: dados.titulo,
      descricao: dados.descricao,
      justificativa: dados.justificativa,
      tipo_solucao: dados.tipo_solucao,
      prioridade: dados.prioridade,
      id_solicitante: idSolicitante,
      nome_solicitante: solicitante?.nome,
      email_solicitante: solicitante?.email,
      id_unidade: dados.id_unidade,
      nome_unidade: unidade?.nome_unidade,
      id_departamento: dados.id_departamento,
      nome_departamento: departamento?.nome_departamento,
      investimento_estimado: dados.investimento_estimado,
      tempo_estimado_horas: dados.tempo_estimado_horas,
      objetivo_principal: dados.objetivo_principal,
      publico_alvo: dados.publico_alvo,
      frequencia_uso: dados.frequencia_uso,
      quantidade_usuarios_estimada: dados.quantidade_usuarios_estimada,
      dependencias_externas: dados.dependencias_externas ? JSON.stringify(dados.dependencias_externas) : null,
      dados_tecnicos: dados.dados_tecnicos ? JSON.stringify(dados.dados_tecnicos) : null,
      status_atual: 'DRAFT',
      id_usuario_criacao: idSolicitante,
      ip_criacao: ipOrigem,
      ativo: true
    }).returning('id_demanda');

    return this.obterPorId(id_demanda);
  }

  static async obterPorId(id) {
    return await db('tb_demandas').where('id_demanda', id).where('ativo', true).first();
  }

  static async listar(filtros = {}, pagina = 1, limite = 20) {
    let query = db('tb_demandas').where('ativo', true);
    if (filtros.statusIn?.length) query = query.whereIn('status_atual', filtros.statusIn);
    else if (filtros.status) query = query.where('status_atual', filtros.status);
    if (filtros.prioridade) query = query.where('prioridade', filtros.prioridade);
    if (filtros.id_unidade) query = query.where('id_unidade', filtros.id_unidade);
    if (filtros.id_solicitante) query = query.where('id_solicitante', filtros.id_solicitante);
    if (filtros.tipo_solucao) query = query.where('tipo_solucao', filtros.tipo_solucao);
    if (filtros.id_diretor_sti) {
      query = query.where(function () {
        this.where('id_diretor_sti', filtros.id_diretor_sti)
            .orWhere('id_diretor_sti_homologacao', filtros.id_diretor_sti);
      });
    }

    const [{ count }] = await query.clone().count('* as count');
    const demandas = await query.orderBy('data_criacao', 'desc').limit(limite).offset((pagina - 1) * limite);

    return { demandas, total: parseInt(count), pagina, limite, totalPaginas: Math.ceil(parseInt(count) / limite) };
  }

  static async atualizar(id, dados) {
    await db('tb_demandas').where('id_demanda', id).update({ ...dados, data_ultima_atualizacao: db.fn.now() });
    return this.obterPorId(id);
  }

  // ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────

  static async enviarParaGestor(id, idSolicitante) {
    const demanda = await this.obterPorId(id);
    const permitidos = ['DRAFT', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Demanda não pode ser enviada ao gestor no status atual', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode enviar a demanda ao gestor', 403);

    const gestor = await _buscarGestorUnidade(demanda.id_unidade);
    if (!gestor) throw _erro('Unidade não possui gestor ativo designado', 400);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, {
      status_atual: 'PENDENTE_GESTOR',
      id_gestor_unidade: gestor.id_usuario,
      nome_gestor_unidade: gestor.nome,
      data_envio_gestor: db.fn.now()
    });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR' });
    return this.obterPorId(id);
  }

  static async validarGestor(id, idGestor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'VALIDADA_GESTOR', data_validacao_gestor: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async devolver(id, idGestor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'DEVOLVIDA_AJUSTES' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'DEVOLVIDA_AJUSTES', tipo_acao: 'DEVOLVER', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async rejeitarGestor(id, idGestor, motivo, parecer, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'REJEITADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR_GESTOR', motivo_rejeicao: motivo, parecer, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async iniciarAjuste(id, idSolicitante) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'DEVOLVIDA_AJUSTES');
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar ajustes', 403);

    await this.atualizar(id, { status_atual: 'SOLICITANTE_AJUSTANDO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: 'DEVOLVIDA_AJUSTES', status_novo: 'SOLICITANTE_AJUSTANDO', tipo_acao: 'INICIAR_AJUSTE' });
    return this.obterPorId(id);
  }

  static async enviarParaSTI(id, idGestor) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'VALIDADA_GESTOR');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'FILA_STI', data_fila_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI' });
    return this.obterPorId(id);
  }

  static async aprovarSTI(id, idAnalista, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_STI');
    const analista = await db('tb_usuarios').where('id_usuario', idAnalista).first();

    await this.atualizar(id, { status_atual: 'APROVADA_STI', id_analista_sti: idAnalista, nome_analista_sti: analista.nome, data_aprovacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async reprovarSTI(id, idAnalista, motivo, parecer, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_STI');

    await this.atualizar(id, { status_atual: 'REPROVADA_STI' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'REPROVADA_STI', tipo_acao: 'REPROVAR', motivo_rejeicao: motivo, parecer, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async solicitarAjustesSTI(id, idAnalista, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_STI');

    await this.atualizar(id, { status_atual: 'SOLICITADO_AJUSTES_STI' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'SOLICITADO_AJUSTES_STI', tipo_acao: 'SOLICITAR_AJUSTE', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async reenviarParaSTI(id, idGestor, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'SOLICITADO_AJUSTES_STI');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'FILA_STI', data_fila_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SOLICITADO_AJUSTES_STI', status_novo: 'FILA_STI', tipo_acao: 'REENVIAR', ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────

  static async iniciarDesenvolvimento(id, idSolicitante, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'APROVADA_STI');
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar o desenvolvimento', 403);

    await this.atualizar(id, { status_atual: 'EM_DESENVOLVIMENTO', data_inicio_desenvolvimento: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: 'APROVADA_STI', status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR', ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async submeterProduto(id, idSolicitante, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    const permitidos = ['EM_DESENVOLVIMENTO', 'AJUSTANDO_HOMOLOGACAO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Solução precisa estar em desenvolvimento ou ajuste de homologação', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode submeter o produto', 403);

    const gestor = await _buscarGestorUnidade(demanda.id_unidade);
    if (!gestor) throw _erro('Unidade não possui gestor ativo para homologação', 400);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, {
      status_atual: 'SUBMETIDO_HOMOLOGACAO',
      id_gestor_unidade: gestor.id_usuario,
      nome_gestor_unidade: gestor.nome,
      data_submissao_homologacao: db.fn.now()
    });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── FASE 3: HOMOLOGAÇÃO (espelha Fase 1) ────────────────────────────────

  static async validarHomologacaoGestor(id, idGestor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'SUBMETIDO_HOMOLOGACAO');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'VALIDADA_HOMOLOGACAO_GESTOR', data_validacao_homologacao_gestor: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'VALIDADA_HOMOLOGACAO_GESTOR', tipo_acao: 'VALIDAR_HOMOLOGACAO', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async devolverHomologacao(id, idGestor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'SUBMETIDO_HOMOLOGACAO');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'DEVOLVIDA_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'DEVOLVIDA_HOMOLOGACAO', tipo_acao: 'DEVOLVER_HOMOLOGACAO', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async iniciarAjusteHomologacao(id, idSolicitante) {
    const demanda = await this.obterPorId(id);
    const permitidos = ['DEVOLVIDA_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Demanda não está devolvida para ajuste de homologação', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar ajuste de homologação', 403);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, { status_atual: 'AJUSTANDO_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'AJUSTANDO_HOMOLOGACAO', tipo_acao: 'INICIAR_AJUSTE_HOMOLOGACAO' });
    return this.obterPorId(id);
  }

  static async enviarHomologacaoSTI(id, idGestor) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'VALIDADA_HOMOLOGACAO_GESTOR');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'FILA_HOMOLOGACAO_STI', data_fila_homologacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'VALIDADA_HOMOLOGACAO_GESTOR', status_novo: 'FILA_HOMOLOGACAO_STI', tipo_acao: 'ENVIAR_HOMOLOGACAO_STI' });
    return this.obterPorId(id);
  }

  static async solicitarAjustesHomologacao(id, idAnalista, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');

    await this.atualizar(id, { status_atual: 'SOLICITADO_AJUSTES_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'SOLICITADO_AJUSTES_HOMOLOGACAO', tipo_acao: 'SOLICITAR_AJUSTES_HOMOLOGACAO', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async homologar(id, idAnalista, parecer, comentario, tipoDeploy, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');
    const analista = await db('tb_usuarios').where('id_usuario', idAnalista).first();

    await this.atualizar(id, { status_atual: 'HOMOLOGADA', id_analista_sti_homologacao: idAnalista, nome_analista_sti_homologacao: analista.nome, data_homologacao: db.fn.now(), tipo_deploy: tipoDeploy });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'HOMOLOGADA', tipo_acao: 'HOMOLOGAR', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async rejeitar(id, idAnalista, motivo, parecer, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');

    await this.atualizar(id, { status_atual: 'REJEITADA' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR', motivo_rejeicao: motivo, parecer, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async reenviarHomologacaoSTI(id, idGestor, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'SOLICITADO_AJUSTES_HOMOLOGACAO');
    _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'FILA_HOMOLOGACAO_STI', data_fila_homologacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SOLICITADO_AJUSTES_HOMOLOGACAO', status_novo: 'FILA_HOMOLOGACAO_STI', tipo_acao: 'REENVIAR_HOMOLOGACAO_STI', ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── DIRETOR STI ──────────────────────────────────────────────────────────

  static async encaminharDiretor(id, idAnalista, idDiretor, comentario, ip) {
    const demanda = await this.obterPorId(id);

    const isFase1 = demanda.status_atual === 'FILA_STI';
    const isFase3 = demanda.status_atual === 'FILA_HOMOLOGACAO_STI';
    if (!isFase1 && !isFase3) throw _erro('Demanda precisa estar em fila STI para encaminhar ao diretor', 409);

    const diretor = await db('tb_usuarios')
      .where('id_usuario', idDiretor)
      .where('perfil_principal', 'DIRETOR_STI')
      .where('ativo', true)
      .first();
    if (!diretor) throw _erro('Diretor não encontrado ou sem perfil DIRETOR_STI', 400);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'AGUARDANDO_DIRETOR' : 'AGUARDANDO_DIRETOR_HOMOLOGACAO';

    const updates = { status_atual: novoStatus };
    if (isFase1) {
      updates.id_diretor_sti = idDiretor;
      updates.nome_diretor_sti = diretor.nome;
    } else {
      updates.id_diretor_sti_homologacao = idDiretor;
      updates.nome_diretor_sti_homologacao = diretor.nome;
    }

    await this.atualizar(id, updates);
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'ENCAMINHAR_DIRETOR', comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async diretorSolicitarAjustes(id, idDiretor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);

    const isFase1 = demanda.status_atual === 'AGUARDANDO_DIRETOR';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_DIRETOR_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do diretor', 409);

    const campoDir = isFase1 ? 'id_diretor_sti' : 'id_diretor_sti_homologacao';
    if (Number(demanda[campoDir]) !== Number(idDiretor)) throw _erro('Você não é o diretor responsável por esta demanda', 403);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'SOLICITANTE_AJUSTANDO' : 'AJUSTANDO_HOMOLOGACAO';

    await this.atualizar(id, { status_atual: novoStatus });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idDiretor, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'DIRETOR_SOLICITAR_AJUSTES', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async diretorDevolverAnalista(id, idDiretor, parecer, comentario, ip) {
    const demanda = await this.obterPorId(id);

    const isFase1 = demanda.status_atual === 'AGUARDANDO_DIRETOR';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_DIRETOR_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do diretor', 409);

    const campoDir = isFase1 ? 'id_diretor_sti' : 'id_diretor_sti_homologacao';
    if (Number(demanda[campoDir]) !== Number(idDiretor)) throw _erro('Você não é o diretor responsável por esta demanda', 403);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'FILA_STI' : 'FILA_HOMOLOGACAO_STI';

    await this.atualizar(id, { status_atual: novoStatus });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idDiretor, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'DIRETOR_DEVOLVER_ANALISTA', parecer, comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────

  static async iniciarDeploy(id, idUsuario, perfilUsuario, parecer, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'HOMOLOGADA');
    if (!demanda.tipo_deploy) throw _erro('Tipo de deploy não definido nesta demanda. Contate a STI.', 400);
    _assertDeployPermission(demanda, idUsuario, perfilUsuario);
    const usuario = await db('tb_usuarios').where('id_usuario', idUsuario).first();

    await this.atualizar(id, { status_atual: 'EM_PRODUCAO', id_analista_deploy: idUsuario, nome_analista_deploy: usuario.nome, data_inicio_producao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: 'HOMOLOGADA', status_novo: 'EM_PRODUCAO', tipo_acao: 'INICIAR_DEPLOY', parecer, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async confirmarDeploy(id, idUsuario, perfilUsuario, parecer, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'EM_PRODUCAO');
    _assertDeployPermission(demanda, idUsuario, perfilUsuario);

    await this.atualizar(id, { status_atual: 'EM_MONITORAMENTO', data_monitoramento: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: 'EM_PRODUCAO', status_novo: 'EM_MONITORAMENTO', tipo_acao: 'CONFIRMAR_DEPLOY', parecer, ip_usuario: ip });

    // Registrar no inventário TCE (idempotente)
    await _criarInventario(demanda);

    return this.obterPorId(id);
  }

  static async desativar(id, idAnalista, motivo, ip) {
    const demanda = await this.obterPorId(id);
    _assertStatus(demanda, 'EM_MONITORAMENTO');

    await this.atualizar(id, { status_atual: 'DESATIVADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'EM_MONITORAMENTO', status_novo: 'DESATIVADA', tipo_acao: 'DESATIVAR', motivo_rejeicao: motivo, ip_usuario: ip });

    await db('tb_inventario_aplicacoes').where('id_demanda', id).update({ status_inventario: 'DESATIVADO', ativo: false });

    return this.obterPorId(id);
  }

  // ─── CANCELAMENTO ─────────────────────────────────────────────────────────

  static async cancelar(id, idUsuario, motivo, ip) {
    const demanda = await this.obterPorId(id);

    const cancelaveis = [
      'DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO',
      'VALIDADA_GESTOR', 'FILA_STI', 'REPROVADA_STI', 'SOLICITADO_AJUSTES_STI',
      'APROVADA_STI', 'EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO'
    ];

    if (!cancelaveis.includes(demanda.status_atual)) throw _erro('Demanda não pode ser cancelada no status atual', 409);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, { status_atual: 'CANCELADA', motivo_cancelamento: motivo, id_usuario_cancelamento: idUsuario, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: statusAnterior, status_novo: 'CANCELADA', tipo_acao: 'CANCELAR', motivo_rejeicao: motivo, ip_usuario: ip });
    return this.obterPorId(id);
  }
}

class HistoricoDecisao {
  static async criar(dados) {
    const usuario = await db('tb_usuarios').where('id_usuario', dados.id_usuario).first();
    const hoje = new Date();
    const dias = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

    await db('tb_historico_decisoes').insert({
      id_demanda: dados.id_demanda,
      numero_demanda: dados.numero_demanda,
      id_usuario: dados.id_usuario,
      nome_usuario: usuario.nome,
      email_usuario: usuario.email,
      perfil_usuario: usuario.perfil_principal,
      status_anterior: dados.status_anterior,
      status_novo: dados.status_novo,
      tipo_acao: dados.tipo_acao,
      parecer: dados.parecer,
      comentario: dados.comentario,
      motivo_rejeicao: dados.motivo_rejeicao,
      ip_usuario: dados.ip_usuario,
      dia_semana: dias[hoje.getDay()],
      hora_do_dia: hoje.getHours()
    });
  }

  static async obterPorDemanda(idDemanda, limite = 50, pagina = 1) {
    const base = db('tb_historico_decisoes').where('id_demanda', idDemanda);
    const [{ count }] = await base.clone().count('* as count');
    const historico = await base.clone().orderBy('data_hora', 'desc').limit(limite).offset((pagina - 1) * limite);
    return { historico, total: parseInt(count), pagina, limite };
  }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _erro(msg, statusCode) {
  const err = new Error(msg);
  err.statusCode = statusCode;
  return err;
}

function _assertStatus(demanda, esperado) {
  if (demanda.status_atual !== esperado) {
    throw _erro(`Ação inválida: demanda está em "${demanda.status_atual}", esperado "${esperado}"`, 409);
  }
}

function _assertGestor(demanda, idGestor) {
  if (Number(demanda.id_gestor_unidade) !== Number(idGestor)) {
    throw _erro('Apenas o gestor designado desta demanda pode executar esta ação', 403);
  }
}

async function _buscarGestorUnidade(idUnidade) {
  return db('tb_atribuicoes_gestor')
    .join('tb_usuarios', 'tb_atribuicoes_gestor.id_gestor', 'tb_usuarios.id_usuario')
    .where('tb_atribuicoes_gestor.id_unidade', idUnidade)
    .where('tb_atribuicoes_gestor.ativo', true)
    .where('tb_usuarios.ativo', true)
    .select('tb_usuarios.*')
    .first();
}

function _assertDeployPermission(demanda, idUsuario, perfilUsuario) {
  const OPS = ['RESPONSAVEL_PRODUCAO', 'ANALISTA_STI', 'GESTOR_SISTEMA'];
  if (demanda.tipo_deploy === 'OPS_DEPLOY') {
    if (!OPS.includes(perfilUsuario)) {
      throw _erro('Esta solução requer deploy pela equipe de Operações (Infra/STI)', 403);
    }
  } else if (demanda.tipo_deploy === 'SELF_DEPLOY') {
    const ehDono = Number(demanda.id_solicitante) === Number(idUsuario);
    if (!ehDono && !OPS.includes(perfilUsuario)) {
      throw _erro('Apenas o solicitante responsável ou a equipe de Operações pode fazer o deploy desta solução', 403);
    }
  }
}

async function _criarInventario(demanda) {
  const jaExiste = await db('tb_inventario_aplicacoes').where('id_demanda', demanda.id_demanda).first();
  if (jaExiste) return;
  await db('tb_inventario_aplicacoes').insert({
    id_demanda: demanda.id_demanda,
    numero_demanda: demanda.numero_demanda,
    nome_aplicacao: demanda.titulo,
    descricao: demanda.descricao,
    tipo_solucao: demanda.tipo_solucao,
    id_unidade: demanda.id_unidade,
    nome_unidade: demanda.nome_unidade,
    id_responsavel: demanda.id_solicitante,
    nome_responsavel: demanda.nome_solicitante,
    status_inventario: 'ATIVO',
    data_entrada_producao: db.fn.now()
  });
}

module.exports = { Demanda, HistoricoDecisao };
