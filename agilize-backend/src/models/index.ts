import db from '../db/connection';
import { randomUUID } from 'crypto';
import type {
  Demanda as DemandaRow,
  Usuario,
  Id,
  Updatable,
  DemandaInput,
  TipoDeploy,
  AnexoInfo,
} from '../types/models';
import type { HttpError } from '../types/http';

export interface ScopeCondition {
  field: 'id_solicitante' | 'id_unidade' | 'id_departamento' | 'id_unidade_avaliador' | 'id_unidade_producao';
  value: Id;
}

export interface ListarFiltros {
  statusIn?: string[];
  statusNotIn?: string[];
  status?: string;
  prioridade?: string;
  id_unidade?: Id | null;
  id_departamento?: Id | null;
  id_solicitante?: Id;
  tipo_solucao?: string;
  filtro_unidade?: Id;
  filtro_departamento?: Id;
  filtro_solicitante?: string;
  orScopes?: ScopeCondition[];
}

interface HistoricoInput {
  id_demanda: Id;
  numero_demanda: string;
  id_usuario: Id;
  status_anterior: string | null;
  status_novo: string;
  tipo_acao: string;
  parecer?: string;
  comentario?: string;
  motivo_rejeicao?: string;
  ip_usuario?: string;
  anexos?: AnexoInfo[];
}

class Demanda {
  static async criar(dados: DemandaInput, idSolicitante: Id, ipOrigem?: string): Promise<DemandaRow | undefined> {
    const numeroDemanda = `AG-${new Date().getFullYear()}-${randomUUID().substring(0, 6).toUpperCase()}`;

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
      solucao_em_uso: dados.solucao_em_uso ?? null,
      dados_sensiveis: dados.dados_sensiveis ?? null,
      dados_sensiveis_desc: dados.dados_sensiveis_desc ?? null,
      impacta_outras_areas: dados.impacta_outras_areas ?? null,
      areas_impactadas: dados.areas_impactadas ?? null,
      usa_ia_desenvolvimento: dados.usa_ia_desenvolvimento ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      anexos: (dados.anexos?.length ? JSON.stringify(dados.anexos) : null) as any,
      status_atual: 'DRAFT',
      id_usuario_criacao: idSolicitante,
      ip_criacao: ipOrigem,
      ativo: true,
    }).returning('id_demanda');

    return this.obterPorId(id_demanda);
  }

  static async obterPorId(id: Id): Promise<DemandaRow | undefined> {
    return db('tb_demandas').where('id_demanda', id).where('ativo', true).first();
  }

  static async temGestorAtivo(idUnidade: Id): Promise<boolean> {
    const resultado = await db('tb_atribuicoes_gestor')
      .join('tb_usuarios', 'tb_atribuicoes_gestor.id_gestor', 'tb_usuarios.id_usuario')
      .where('tb_atribuicoes_gestor.id_unidade', idUnidade)
      .where('tb_atribuicoes_gestor.ativo', true)
      .where('tb_usuarios.ativo', true)
      .first();
    return !!resultado;
  }

  static async listar(filtros: ListarFiltros = {}, pagina = 1, limite = 20) {
    let query = db('tb_demandas').where('ativo', true);
    if (filtros.statusIn?.length) query = query.whereIn('status_atual', filtros.statusIn);
    else if (filtros.status) query = query.where('status_atual', filtros.status);
    if (filtros.statusNotIn?.length) query = query.whereNotIn('status_atual', filtros.statusNotIn);
    if (filtros.prioridade) query = query.where('prioridade', filtros.prioridade);
    if (filtros.id_unidade) query = query.where('id_unidade', filtros.id_unidade);
    if (filtros.id_departamento) query = query.where('id_departamento', filtros.id_departamento);
    if (filtros.id_solicitante) query = query.where('id_solicitante', filtros.id_solicitante);
    if (filtros.tipo_solucao) query = query.where('tipo_solucao', filtros.tipo_solucao);
    if (filtros.filtro_unidade) query = query.where('id_unidade', filtros.filtro_unidade);
    if (filtros.filtro_departamento) query = query.where('id_departamento', filtros.filtro_departamento);
    if (filtros.filtro_solicitante) query = query.whereRaw('LOWER(nome_solicitante) LIKE ?', [`%${filtros.filtro_solicitante.toLowerCase()}%`]);
    if (filtros.orScopes?.length) {
      query = query.where(function () {
        for (const s of filtros.orScopes!) this.orWhere(s.field, s.value);
      });
    }
    const [{ count }] = (await query.clone().count('* as count')) as Array<{ count: string }>;
    const demandas = await query.orderBy('data_criacao', 'desc').limit(limite).offset((pagina - 1) * limite);

    return { demandas, total: parseInt(count), pagina, limite, totalPaginas: Math.ceil(parseInt(count) / limite) };
  }

  static async atualizar(id: Id, dados: Updatable<DemandaRow>): Promise<DemandaRow | undefined> {
    await db('tb_demandas').where('id_demanda', id).update({ ...dados, data_ultima_atualizacao: db.fn.now() });
    return this.obterPorId(id);
  }

  // ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────

  static async enviarParaGestor(id: Id, idSolicitante: Id): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    const permitidos = ['DRAFT', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Demanda não pode ser enviada ao gestor no status atual', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode enviar a demanda ao gestor', 403);

    const temGestor = await Demanda.temGestorAtivo(demanda.id_unidade);
    if (!temGestor) throw _erro('Unidade não possui gestor ativo designado', 400);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, {
      status_atual: 'PENDENTE_GESTOR',
      data_envio_gestor: db.fn.now(),
    });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'PENDENTE_GESTOR', tipo_acao: 'ENVIAR' });
    return this.obterPorId(id);
  }

  static async validarGestor(id: Id, idGestor: Id, parecer?: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'VALIDADA_GESTOR', data_validacao_gestor: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'VALIDADA_GESTOR', tipo_acao: 'VALIDAR', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async devolver(id: Id, idGestor: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'DEVOLVIDA_AJUSTES' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'DEVOLVIDA_AJUSTES', tipo_acao: 'DEVOLVER', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async rejeitarGestor(id: Id, idGestor: Id, motivo: string, parecer: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'PENDENTE_GESTOR');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'REJEITADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'PENDENTE_GESTOR', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR_GESTOR', motivo_rejeicao: motivo, parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async iniciarAjuste(id: Id, idSolicitante: Id): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    const permitidos = ['DEVOLVIDA_AJUSTES', 'SOLICITADO_AJUSTES_STI'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro(`Ação inválida: demanda está em "${demanda.status_atual}", esperado um dos: ${permitidos.join(', ')}`, 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar ajustes', 403);

    await this.atualizar(id, { status_atual: 'SOLICITANTE_AJUSTANDO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: 'DEVOLVIDA_AJUSTES', status_novo: 'SOLICITANTE_AJUSTANDO', tipo_acao: 'INICIAR_AJUSTE' });
    return this.obterPorId(id);
  }

  static async enviarParaSTI(id: Id, idGestor: Id): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'VALIDADA_GESTOR');
    await _assertGestor(demanda, idGestor);

    if (demanda.dados_sensiveis === true) {
      const temDpo = await _buscarDPO();
      if (!temDpo) throw _erro('Nenhum DPO ativo cadastrado no sistema', 400);
      await this.atualizar(id, { status_atual: 'AGUARDANDO_DPO' });
      await HistoricoDecisao.criar({
        id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor,
        status_anterior: 'VALIDADA_GESTOR', status_novo: 'AGUARDANDO_DPO',
        tipo_acao: 'ENCAMINHAR_DPO_AUTO',
      });
      return this.obterPorId(id);
    }

    await this.atualizar(id, { status_atual: 'FILA_STI', data_fila_sti: db.fn.now() });
    await HistoricoDecisao.criar({
      id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor,
      status_anterior: 'VALIDADA_GESTOR', status_novo: 'FILA_STI', tipo_acao: 'ENVIAR_STI',
    });
    return this.obterPorId(id);
  }

  static async aprovarSTI(id: Id, idAnalista: Id, parecer?: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_STI');
    const analista = await db('tb_usuarios').where('id_usuario', idAnalista).first();

    await this.atualizar(id, { status_atual: 'APROVADA_STI', id_analista_sti: idAnalista, nome_analista_sti: analista!.nome, data_aprovacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'APROVADA_STI', tipo_acao: 'APROVAR', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async reprovarSTI(id: Id, idAnalista: Id, motivo: string, parecer: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_STI');

    await this.atualizar(id, { status_atual: 'REPROVADA_STI' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'REPROVADA_STI', tipo_acao: 'REPROVAR', motivo_rejeicao: motivo, parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async solicitarAjustesSTI(id: Id, idAnalista: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_STI');

    await this.atualizar(id, { status_atual: 'SOLICITADO_AJUSTES_STI' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_STI', status_novo: 'SOLICITADO_AJUSTES_STI', tipo_acao: 'SOLICITAR_AJUSTE', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async reenviarParaSTI(id: Id, idGestor: Id, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SOLICITADO_AJUSTES_STI');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'FILA_STI', data_fila_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SOLICITADO_AJUSTES_STI', status_novo: 'FILA_STI', tipo_acao: 'REENVIAR', ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────

  static async iniciarDesenvolvimento(id: Id, idSolicitante: Id, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    const permitidos = ['APROVADA_STI'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Demanda precisa estar aprovada pela STI para iniciar desenvolvimento', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar o desenvolvimento', 403);

    const statusAnterior = demanda.status_atual;
    if (!demanda.data_inicio_desenvolvimento) {
      await this.atualizar(id, { status_atual: 'EM_DESENVOLVIMENTO', data_inicio_desenvolvimento: db.fn.now() });
    } else {
      await this.atualizar(id, { status_atual: 'EM_DESENVOLVIMENTO' });
    }
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'EM_DESENVOLVIMENTO', tipo_acao: 'INICIAR', ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async submeterProduto(id: Id, idSolicitante: Id, parecer?: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    const permitidos = ['EM_DESENVOLVIMENTO', 'AJUSTANDO_HOMOLOGACAO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Solução precisa estar em desenvolvimento ou em ajuste de homologação para ser submetida', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode submeter o produto', 403);

    const temGestor = await Demanda.temGestorAtivo(demanda.id_unidade);
    if (!temGestor) throw _erro('Unidade não possui gestor ativo para homologação', 400);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, {
      status_atual: 'SUBMETIDO_HOMOLOGACAO',
      data_submissao_homologacao: db.fn.now(),
    });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'SUBMETIDO_HOMOLOGACAO', tipo_acao: 'SUBMETER_PRODUTO', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  // ─── FASE 3: HOMOLOGAÇÃO (espelha Fase 1) ────────────────────────────────

  static async validarHomologacaoGestor(id: Id, idGestor: Id, parecer?: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SUBMETIDO_HOMOLOGACAO');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'VALIDADA_HOMOLOGACAO_GESTOR', data_validacao_homologacao_gestor: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'VALIDADA_HOMOLOGACAO_GESTOR', tipo_acao: 'VALIDAR_HOMOLOGACAO', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async devolverHomologacao(id: Id, idGestor: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SUBMETIDO_HOMOLOGACAO');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'DEVOLVIDA_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'DEVOLVIDA_HOMOLOGACAO', tipo_acao: 'DEVOLVER_HOMOLOGACAO', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async rejeitarGestorHomologacao(id: Id, idGestor: Id, motivo: string, parecer: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SUBMETIDO_HOMOLOGACAO');
    await _assertGestor(demanda, idGestor);

    await this.atualizar(id, { status_atual: 'REJEITADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SUBMETIDO_HOMOLOGACAO', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR_GESTOR_HOMOLOGACAO', motivo_rejeicao: motivo, parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async iniciarAjusteHomologacao(id: Id, idSolicitante: Id): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    const permitidos = ['DEVOLVIDA_HOMOLOGACAO', 'SOLICITADO_AJUSTES_HOMOLOGACAO'];
    if (!permitidos.includes(demanda.status_atual)) throw _erro('Demanda não está devolvida para ajuste de homologação', 409);
    if (Number(demanda.id_solicitante) !== Number(idSolicitante)) throw _erro('Apenas o solicitante pode iniciar ajuste de homologação', 403);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, { status_atual: 'AJUSTANDO_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idSolicitante, status_anterior: statusAnterior, status_novo: 'AJUSTANDO_HOMOLOGACAO', tipo_acao: 'INICIAR_AJUSTE_HOMOLOGACAO' });
    return this.obterPorId(id);
  }

  static async enviarHomologacaoSTI(id: Id, idGestor: Id): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'VALIDADA_HOMOLOGACAO_GESTOR');
    await _assertGestor(demanda, idGestor);

    if (demanda.dados_sensiveis === true && !demanda.id_dpo_homologacao) {
      const temDpo = await _buscarDPO();
      if (!temDpo) throw _erro('Nenhum DPO ativo cadastrado no sistema', 400);
      await this.atualizar(id, { status_atual: 'AGUARDANDO_DPO_HOMOLOGACAO' });
      await HistoricoDecisao.criar({
        id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor,
        status_anterior: 'VALIDADA_HOMOLOGACAO_GESTOR', status_novo: 'AGUARDANDO_DPO_HOMOLOGACAO',
        tipo_acao: 'ENCAMINHAR_DPO_HOMOLOGACAO_AUTO',
      });
      return this.obterPorId(id);
    }

    await this.atualizar(id, { status_atual: 'FILA_HOMOLOGACAO_STI', data_fila_homologacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({
      id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor,
      status_anterior: 'VALIDADA_HOMOLOGACAO_GESTOR', status_novo: 'FILA_HOMOLOGACAO_STI',
      tipo_acao: 'ENVIAR_HOMOLOGACAO_STI',
    });
    return this.obterPorId(id);
  }

  static async solicitarAjustesHomologacao(id: Id, idAnalista: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');

    await this.atualizar(id, { status_atual: 'SOLICITADO_AJUSTES_HOMOLOGACAO' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'SOLICITADO_AJUSTES_HOMOLOGACAO', tipo_acao: 'SOLICITAR_AJUSTES_HOMOLOGACAO', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async homologar(id: Id, idAnalista: Id, parecer?: string, comentario?: string, tipoDeploy?: TipoDeploy, idUnidadeProducao?: number, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');
    const analista = await db('tb_usuarios').where('id_usuario', idAnalista).first();

    const updates: Updatable<DemandaRow> = {
      status_atual: 'HOMOLOGADA',
      id_analista_sti_homologacao: idAnalista,
      nome_analista_sti_homologacao: analista!.nome,
      data_homologacao: db.fn.now(),
      tipo_deploy: tipoDeploy,
    };

    if (tipoDeploy === 'OPS_DEPLOY' && idUnidadeProducao) {
      const unidade = await db('tb_unidades').where('id_unidade', idUnidadeProducao).first();
      if (!unidade) throw _erro('Unidade de produção não encontrada', 404);
      const temResponsavel = await db('tb_usuarios')
        .where('id_unidade', idUnidadeProducao)
        .where('ativo', true)
        .where(function () {
          this.where('perfil_principal', 'RESPONSAVEL_PRODUCAO')
              .orWhereRaw("perfis_secundarios::jsonb \\? 'RESPONSAVEL_PRODUCAO'");
        })
        .first();
      if (!temResponsavel) throw _erro('Nenhum Responsável de Produção ativo nesta unidade', 400);
      (updates as Record<string, unknown>).id_unidade_producao = idUnidadeProducao;
      (updates as Record<string, unknown>).nome_unidade_producao = unidade.nome_unidade;
    }

    await this.atualizar(id, updates);
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'HOMOLOGADA', tipo_acao: 'HOMOLOGAR', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async rejeitar(id: Id, idAnalista: Id, motivo: string, parecer: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'FILA_HOMOLOGACAO_STI');

    await this.atualizar(id, { status_atual: 'REJEITADA' });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'FILA_HOMOLOGACAO_STI', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR', motivo_rejeicao: motivo, parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async reenviarHomologacaoSTI(id: Id, idGestor: Id, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SOLICITADO_AJUSTES_HOMOLOGACAO');
    await _assertGestor(demanda, idGestor);

    if (demanda.dados_sensiveis === true) {
      const temDpo = await _buscarDPO();
      if (!temDpo) throw _erro('Nenhum DPO ativo cadastrado no sistema', 400);
      await this.atualizar(id, { status_atual: 'AGUARDANDO_DPO_HOMOLOGACAO' });
      await HistoricoDecisao.criar({
        id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor,
        status_anterior: 'SOLICITADO_AJUSTES_HOMOLOGACAO', status_novo: 'AGUARDANDO_DPO_HOMOLOGACAO',
        tipo_acao: 'ENCAMINHAR_DPO_HOMOLOGACAO_AUTO', ip_usuario: ip,
      });
      return this.obterPorId(id);
    }

    await this.atualizar(id, { status_atual: 'FILA_HOMOLOGACAO_STI', data_fila_homologacao_sti: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idGestor, status_anterior: 'SOLICITADO_AJUSTES_HOMOLOGACAO', status_novo: 'FILA_HOMOLOGACAO_STI', tipo_acao: 'REENVIAR_HOMOLOGACAO_STI', ip_usuario: ip });
    return this.obterPorId(id);
  }

  // ─── AVALIADOR TÉCNICO ──────────────────────────────────────────────────

  static async encaminharAvaliador(id: Id, idAnalista: Id, idUnidadeAvaliador: Id, comentario?: string, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const isFase1 = demanda.status_atual === 'FILA_STI';
    const isFase3 = demanda.status_atual === 'FILA_HOMOLOGACAO_STI';
    if (!isFase1 && !isFase3) throw _erro('Demanda precisa estar em fila STI para encaminhar ao Avaliador Técnico', 409);

    if (!idUnidadeAvaliador) throw _erro('Informe a unidade STI responsável pela avaliação', 400);

    const unidade = await db('tb_unidades').where('id_unidade', idUnidadeAvaliador).first();
    if (!unidade) throw _erro('Unidade não encontrada', 404);

    const temAvaliador = await db('tb_usuarios')
      .where('id_unidade', idUnidadeAvaliador)
      .where('ativo', true)
      .where(function () {
        this.where('perfil_principal', 'AVALIADOR_TECNICO')
            .orWhereRaw("perfis_secundarios::jsonb \\? 'AVALIADOR_TECNICO'");
      })
      .first();
    if (!temAvaliador) throw _erro('Nenhum Avaliador Técnico ativo nesta unidade', 400);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'AGUARDANDO_AVALIADOR' : 'AGUARDANDO_AVALIADOR_HOMOLOGACAO';

    await this.atualizar(id, {
      status_atual: novoStatus,
      id_unidade_avaliador: idUnidadeAvaliador,
      nome_unidade_avaliador: unidade.nome_unidade,
    } as Updatable<DemandaRow>);
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'ENCAMINHAR_AVALIADOR', comentario, ip_usuario: ip });
    return this.obterPorId(id);
  }

  static async avaliadorSolicitarAjustes(id: Id, idAvaliador: Id, idUnidadeAvaliador: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    if (Number(demanda.id_unidade_avaliador) !== Number(idUnidadeAvaliador))
      throw _erro('Você não é o avaliador designado para esta demanda', 403);

    const isFase1 = demanda.status_atual === 'AGUARDANDO_AVALIADOR';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_AVALIADOR_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do Avaliador Técnico', 409);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'SOLICITANTE_AJUSTANDO' : 'AJUSTANDO_HOMOLOGACAO';

    await this.atualizar(id, { status_atual: novoStatus });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAvaliador, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'AVALIADOR_SOLICITAR_AJUSTES', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async avaliadorDevolverAnalista(id: Id, idAvaliador: Id, idUnidadeAvaliador: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    if (Number(demanda.id_unidade_avaliador) !== Number(idUnidadeAvaliador))
      throw _erro('Você não é o avaliador designado para esta demanda', 403);

    const isFase1 = demanda.status_atual === 'AGUARDANDO_AVALIADOR';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_AVALIADOR_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do Avaliador Técnico', 409);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'FILA_STI' : 'FILA_HOMOLOGACAO_STI';

    await this.atualizar(id, { status_atual: novoStatus });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAvaliador, status_anterior: statusAnterior, status_novo: novoStatus, tipo_acao: 'AVALIADOR_DEVOLVER_ANALISTA', parecer, comentario, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async rejeitarAvaliadorHomologacao(id: Id, idAvaliador: Id, idUnidadeAvaliador: Id, motivo: string, parecer: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    if (Number(demanda.id_unidade_avaliador) !== Number(idUnidadeAvaliador))
      throw _erro('Você não é o avaliador designado para esta demanda', 403);
    _assertStatus(demanda, 'AGUARDANDO_AVALIADOR_HOMOLOGACAO');

    await this.atualizar(id, { status_atual: 'REJEITADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAvaliador, status_anterior: 'AGUARDANDO_AVALIADOR_HOMOLOGACAO', status_novo: 'REJEITADA', tipo_acao: 'REJEITAR_AVALIADOR_HOMOLOGACAO', motivo_rejeicao: motivo, parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  // ─── DPO ─────────────────────────────────────────────────────────────────────

  static async encaminharDPO(id: Id, idAnalista: Id, comentario?: string, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const isFase1 = demanda.status_atual === 'FILA_STI';
    const isFase3 = demanda.status_atual === 'FILA_HOMOLOGACAO_STI';
    if (!isFase1 && !isFase3) throw _erro('Demanda precisa estar em fila STI para encaminhar ao DPO', 409);

    const temDpo = await _buscarDPO();
    if (!temDpo) throw _erro('Nenhum DPO ativo cadastrado no sistema', 400);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'AGUARDANDO_DPO' : 'AGUARDANDO_DPO_HOMOLOGACAO';

    await this.atualizar(id, { status_atual: novoStatus });
    await HistoricoDecisao.criar({
      id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista,
      status_anterior: statusAnterior, status_novo: novoStatus,
      tipo_acao: 'ENCAMINHAR_DPO', comentario, ip_usuario: ip,
    });
    return this.obterPorId(id);
  }

  static async dpoAprovar(id: Id, idDpo: Id, parecer?: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const isFase1 = demanda.status_atual === 'AGUARDANDO_DPO';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_DPO_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do DPO', 409);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'FILA_STI' : 'FILA_HOMOLOGACAO_STI';

    const dpoBusca = await db('tb_usuarios').where('id_usuario', idDpo).first();
    const updates: Updatable<DemandaRow> = { status_atual: novoStatus };
    if (isFase1) {
      updates.data_fila_sti = db.fn.now();
      updates.id_dpo = idDpo;
      updates.nome_dpo = dpoBusca?.nome ?? null;
    } else {
      updates.data_fila_homologacao_sti = db.fn.now();
      updates.id_dpo_homologacao = idDpo;
      updates.nome_dpo_homologacao = dpoBusca?.nome ?? null;
    }

    await this.atualizar(id, updates);
    await HistoricoDecisao.criar({
      id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idDpo,
      status_anterior: statusAnterior, status_novo: novoStatus,
      tipo_acao: 'DPO_APROVAR', parecer, comentario, ip_usuario: ip, anexos,
    });
    return this.obterPorId(id);
  }

  static async dpoSolicitarAjustes(id: Id, idDpo: Id, parecer: string, comentario?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const isFase1 = demanda.status_atual === 'AGUARDANDO_DPO';
    const isFase3 = demanda.status_atual === 'AGUARDANDO_DPO_HOMOLOGACAO';
    if (!isFase1 && !isFase3) throw _erro('Demanda não está aguardando decisão do DPO', 409);

    const statusAnterior = demanda.status_atual;
    const novoStatus = isFase1 ? 'SOLICITANTE_AJUSTANDO' : 'AJUSTANDO_HOMOLOGACAO';

    const dpoBusca2 = await db('tb_usuarios').where('id_usuario', idDpo).first();
    const updatesAjuste: Updatable<DemandaRow> = { status_atual: novoStatus };
    if (isFase1) {
      updatesAjuste.id_dpo = idDpo;
      updatesAjuste.nome_dpo = dpoBusca2?.nome ?? null;
    } else {
      updatesAjuste.id_dpo_homologacao = idDpo;
      updatesAjuste.nome_dpo_homologacao = dpoBusca2?.nome ?? null;
    }

    await this.atualizar(id, updatesAjuste);
    await HistoricoDecisao.criar({
      id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idDpo,
      status_anterior: statusAnterior, status_novo: novoStatus,
      tipo_acao: 'DPO_SOLICITAR_AJUSTES', parecer, comentario, ip_usuario: ip, anexos,
    });
    return this.obterPorId(id);
  }

  // ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────

  static async iniciarDeploy(id: Id, idUsuario: Id, idUnidadeUsuario: Id | null, isAdmin: boolean, parecer?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'HOMOLOGADA');
    if (!demanda.tipo_deploy) throw _erro('Tipo de deploy não definido nesta demanda. Contate a STI.', 400);
    _assertDeployPermission(demanda, idUsuario, idUnidadeUsuario, isAdmin);
    const usuario = await db('tb_usuarios').where('id_usuario', idUsuario).first();

    await this.atualizar(id, { status_atual: 'EM_PRODUCAO', id_responsavel_deploy: idUsuario, nome_responsavel_deploy: usuario!.nome, data_inicio_producao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: 'HOMOLOGADA', status_novo: 'EM_PRODUCAO', tipo_acao: 'INICIAR_DEPLOY', parecer, ip_usuario: ip, anexos });
    return this.obterPorId(id);
  }

  static async confirmarDeploy(id: Id, idUsuario: Id, idUnidadeUsuario: Id | null, isAdmin: boolean, parecer?: string, ip?: string, anexos?: AnexoInfo[]): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'EM_PRODUCAO');
    _assertDeployPermission(demanda, idUsuario, idUnidadeUsuario, isAdmin);

    await this.atualizar(id, { status_atual: 'EM_MONITORAMENTO', data_monitoramento: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: 'EM_PRODUCAO', status_novo: 'EM_MONITORAMENTO', tipo_acao: 'CONFIRMAR_DEPLOY', parecer, ip_usuario: ip, anexos });

    // Registrar no inventário TCE (idempotente)
    await _criarInventario(demanda);

    return this.obterPorId(id);
  }

  static async desativar(id: Id, idAnalista: Id, motivo: string, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'EM_MONITORAMENTO');

    await this.atualizar(id, { status_atual: 'DESATIVADA', motivo_cancelamento: motivo, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idAnalista, status_anterior: 'EM_MONITORAMENTO', status_novo: 'DESATIVADA', tipo_acao: 'DESATIVAR', motivo_rejeicao: motivo, ip_usuario: ip });

    await db('tb_inventario_aplicacoes').where('id_demanda', id).update({ status_inventario: 'DESATIVADO', ativo: false });

    return this.obterPorId(id);
  }

  static async transferirLocacao(
    id: Id,
    idNovaUnidade: Id,
    motivo: string,
    idUsuario: Id,
    ip?: string,
  ): Promise<void> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    if (demanda.status_atual !== 'EM_MONITORAMENTO')
      throw _erro(`Transferência só é permitida em EM_MONITORAMENTO. Status atual: "${demanda.status_atual}"`, 409);

    const inventario = await db('tb_inventario_aplicacoes').where('id_demanda', id).first();
    if (!inventario)
      throw _erro('Registro de inventário não encontrado para esta demanda', 404);

    if (Number(demanda.id_unidade) === Number(idNovaUnidade))
      throw _erro('A nova unidade é a mesma que a atual. Nenhuma alteração realizada.', 422);

    const novaUnidade = await db('tb_unidades').where('id_unidade', idNovaUnidade).where('ativo', true).first();
    if (!novaUnidade) throw _erro('Unidade de destino não encontrada ou inativa', 404);

    const novoDepartamento = novaUnidade.id_departamento
      ? await db('tb_departamentos').where('id_departamento', novaUnidade.id_departamento).first()
      : null;

    const usuario = await db('tb_usuarios').where('id_usuario', idUsuario).first();

    const comentarioHistorico = `Unidade anterior: ${demanda.nome_unidade ?? demanda.id_unidade} → Nova unidade: ${novaUnidade.nome_unidade}`
      + (novoDepartamento ? ` (${novoDepartamento.nome_departamento})` : '');

    await db.transaction(async (trx) => {
      // Atualiza tb_demandas — fonte lida pelo InventarioPage e DashboardPage
      await trx('tb_demandas').where('id_demanda', id).update({
        id_unidade: idNovaUnidade,
        nome_unidade: novaUnidade.nome_unidade,
        id_departamento: novaUnidade.id_departamento ?? demanda.id_departamento,
        nome_departamento: novoDepartamento?.nome_departamento ?? demanda.nome_departamento,
        data_ultima_atualizacao: trx.fn.now(),
      });

      // Atualiza tb_inventario_aplicacoes — registro canônico do inventário
      await trx('tb_inventario_aplicacoes').where('id_demanda', id).update({
        id_unidade: idNovaUnidade,
        nome_unidade: novaUnidade.nome_unidade,
      });

      await trx('tb_historico_decisoes').insert({
        id_demanda: id,
        numero_demanda: demanda.numero_demanda,
        id_usuario: idUsuario,
        nome_usuario: usuario?.nome ?? 'Sistema',
        email_usuario: usuario?.email ?? null,
        perfil_usuario: usuario?.perfil_principal ?? 'GESTOR_SISTEMA',
        status_anterior: 'EM_MONITORAMENTO',
        status_novo: 'EM_MONITORAMENTO',
        tipo_acao: 'TRANSFERENCIA_LOCACAO',
        parecer: motivo,
        comentario: comentarioHistorico,
        ip_usuario: ip ?? null,
        sla_em_dia: true,
        id_unidade_demanda: demanda.id_unidade,
        nome_unidade_demanda: demanda.nome_unidade,
        data_hora: trx.fn.now(),
        timezone: 'America/Fortaleza',
      });
    });
  }

  // ─── SUSPENSÃO ────────────────────────────────────────────────────────────

  static async suspender(
    id: Id,
    idUsuario: Id,
    todosPerfis: string[],
    idUnidadeUsuario: Id | null,
    motivo: string,
    ip?: string,
  ): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const suspensiveisAnalista = ['FILA_STI', 'FILA_HOMOLOGACAO_STI'];
    const suspensiveisAvaliador = ['AGUARDANDO_AVALIADOR', 'AGUARDANDO_AVALIADOR_HOMOLOGACAO'];
    const todosSuspensivos = [...suspensiveisAnalista, ...suspensiveisAvaliador];

    if (!todosSuspensivos.includes(demanda.status_atual))
      throw _erro(`Status "${demanda.status_atual}" não permite suspensão`, 409);

    const isAdmin = todosPerfis.includes('GESTOR_SISTEMA');
    const isAnalista = todosPerfis.includes('ANALISTA_STI');
    const isAvaliador = todosPerfis.includes('AVALIADOR_TECNICO');

    if (!isAdmin) {
      const isAnalistaStatus = suspensiveisAnalista.includes(demanda.status_atual);
      const isAvaliadorStatus = suspensiveisAvaliador.includes(demanda.status_atual);

      if (isAnalistaStatus && !isAnalista)
        throw _erro('Apenas Analista STI pode suspender demandas neste status', 403);

      if (isAvaliadorStatus) {
        if (!isAvaliador)
          throw _erro('Apenas Avaliador Técnico designado pode suspender demandas neste status', 403);
        if (Number(demanda.id_unidade_avaliador) !== Number(idUnidadeUsuario))
          throw _erro('Você não é o Avaliador Técnico designado para esta demanda', 403);
      }
    }

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, {
      status_atual: 'SUSPENSO',
      status_antes_suspensao: statusAnterior,
    } as Updatable<DemandaRow>);
    await HistoricoDecisao.criar({
      id_demanda: id,
      numero_demanda: demanda.numero_demanda,
      id_usuario: idUsuario,
      status_anterior: statusAnterior,
      status_novo: 'SUSPENSO',
      tipo_acao: 'SUSPENDER',
      motivo_rejeicao: motivo,
      ip_usuario: ip,
    });
    return this.obterPorId(id);
  }

  static async retornarDeSuspensao(
    id: Id,
    idUsuario: Id,
    todosPerfis: string[],
    idUnidadeUsuario: Id | null,
    ip?: string,
  ): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;
    _assertStatus(demanda, 'SUSPENSO');

    const isAdmin = todosPerfis.includes('GESTOR_SISTEMA');
    const isAnalista = todosPerfis.includes('ANALISTA_STI');
    const isAvaliador = todosPerfis.includes('AVALIADOR_TECNICO');

    if (!isAdmin && !isAnalista) {
      if (!isAvaliador || Number(demanda.id_unidade_avaliador) !== Number(idUnidadeUsuario))
        throw _erro('Sem permissão para retomar esta demanda da suspensão', 403);
    }

    const statusRetorno = (demanda as unknown as Record<string, unknown>).status_antes_suspensao as string | null;
    if (!statusRetorno) throw _erro('Status de retorno não registrado — contate o administrador', 409);

    await this.atualizar(id, {
      status_atual: statusRetorno,
      status_antes_suspensao: null,
    } as Updatable<DemandaRow>);
    await HistoricoDecisao.criar({
      id_demanda: id,
      numero_demanda: demanda.numero_demanda,
      id_usuario: idUsuario,
      status_anterior: 'SUSPENSO',
      status_novo: statusRetorno,
      tipo_acao: 'RETORNAR_SUSPENSAO',
      ip_usuario: ip,
    });
    return this.obterPorId(id);
  }

  // ─── CANCELAMENTO ─────────────────────────────────────────────────────────

  static async cancelar(id: Id, idUsuario: Id, motivo: string, ip?: string): Promise<DemandaRow | undefined> {
    const demanda = (await this.obterPorId(id)) as DemandaRow;

    const cancelaveis = [
      'DRAFT', 'PENDENTE_GESTOR', 'DEVOLVIDA_AJUSTES', 'SOLICITANTE_AJUSTANDO',
      'VALIDADA_GESTOR', 'FILA_STI', 'REPROVADA_STI', 'SOLICITADO_AJUSTES_STI',
      'APROVADA_STI', 'EM_DESENVOLVIMENTO', 'SUBMETIDO_HOMOLOGACAO',
      'SUSPENSO',
    ];

    if (!cancelaveis.includes(demanda.status_atual)) throw _erro('Demanda não pode ser cancelada no status atual', 409);

    const statusAnterior = demanda.status_atual;
    await this.atualizar(id, { status_atual: 'CANCELADA', motivo_cancelamento: motivo, id_usuario_cancelamento: idUsuario, data_conclusao: db.fn.now() });
    await HistoricoDecisao.criar({ id_demanda: id, numero_demanda: demanda.numero_demanda, id_usuario: idUsuario, status_anterior: statusAnterior, status_novo: 'CANCELADA', tipo_acao: 'CANCELAR', motivo_rejeicao: motivo, ip_usuario: ip });
    return this.obterPorId(id);
  }
}

// Garante que usuários multiperfil tenham o papel correto registrado no histórico
const PERFIL_POR_TIPO_ACAO: Record<string, string> = {
  // Solicitante
  ENVIAR: 'SOLICITANTE', INICIAR_AJUSTE: 'SOLICITANTE', INICIAR: 'SOLICITANTE',
  SUBMETER_PRODUTO: 'SOLICITANTE', INICIAR_AJUSTE_HOMOLOGACAO: 'SOLICITANTE',
  // Gestor da Unidade
  VALIDAR: 'GESTOR_UNIDADE', DEVOLVER: 'GESTOR_UNIDADE', REJEITAR_GESTOR: 'GESTOR_UNIDADE',
  ENCAMINHAR_DPO_AUTO: 'GESTOR_UNIDADE', ENVIAR_STI: 'GESTOR_UNIDADE', REENVIAR: 'GESTOR_UNIDADE',
  VALIDAR_HOMOLOGACAO: 'GESTOR_UNIDADE', DEVOLVER_HOMOLOGACAO: 'GESTOR_UNIDADE',
  ENCAMINHAR_DPO_HOMOLOGACAO_AUTO: 'GESTOR_UNIDADE', ENVIAR_HOMOLOGACAO_STI: 'GESTOR_UNIDADE',
  REENVIAR_HOMOLOGACAO_STI: 'GESTOR_UNIDADE', REJEITAR_GESTOR_HOMOLOGACAO: 'GESTOR_UNIDADE',
  // Analista STI
  APROVAR: 'ANALISTA_STI', REPROVAR: 'ANALISTA_STI', SOLICITAR_AJUSTE: 'ANALISTA_STI',
  SOLICITAR_AJUSTES_HOMOLOGACAO: 'ANALISTA_STI', HOMOLOGAR: 'ANALISTA_STI',
  REJEITAR: 'ANALISTA_STI', ENCAMINHAR_AVALIADOR: 'ANALISTA_STI', ENCAMINHAR_DPO: 'ANALISTA_STI',
  // Avaliador Técnico
  AVALIADOR_SOLICITAR_AJUSTES: 'AVALIADOR_TECNICO', AVALIADOR_DEVOLVER_ANALISTA: 'AVALIADOR_TECNICO',
  REJEITAR_AVALIADOR_HOMOLOGACAO: 'AVALIADOR_TECNICO',
  // DPO
  DPO_APROVAR: 'DPO', DPO_SOLICITAR_AJUSTES: 'DPO',
  // Responsável Produção
  INICIAR_DEPLOY: 'RESPONSAVEL_PRODUCAO', CONFIRMAR_DEPLOY: 'RESPONSAVEL_PRODUCAO',
};

class HistoricoDecisao {
  static async criar(dados: HistoricoInput): Promise<void> {
    const usuario = (await db('tb_usuarios').where('id_usuario', dados.id_usuario).first())!;
    const hoje = new Date();
    const dias = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
    const perfilAtuante = PERFIL_POR_TIPO_ACAO[dados.tipo_acao] ?? usuario.perfil_principal;

    await db('tb_historico_decisoes').insert({
      id_demanda: dados.id_demanda,
      numero_demanda: dados.numero_demanda,
      id_usuario: dados.id_usuario,
      nome_usuario: usuario.nome,
      email_usuario: usuario.email,
      perfil_usuario: perfilAtuante,
      status_anterior: dados.status_anterior,
      status_novo: dados.status_novo,
      tipo_acao: dados.tipo_acao,
      parecer: dados.parecer,
      comentario: dados.comentario,
      motivo_rejeicao: dados.motivo_rejeicao,
      anexos: dados.anexos?.length ? (JSON.stringify(dados.anexos) as unknown as null) : null,
      ip_usuario: dados.ip_usuario,
      dia_semana: dias[hoje.getDay()],
      hora_do_dia: hoje.getHours(),
    });
  }

  static async obterPorDemanda(idDemanda: Id, limite = 50, pagina = 1) {
    const base = db('tb_historico_decisoes').where('id_demanda', idDemanda);
    const [{ count }] = (await base.clone().count('* as count')) as Array<{ count: string }>;
    const rows = await base.clone().orderBy('data_hora', 'desc').limit(limite).offset((pagina - 1) * limite);

    // Substitui conteúdo base64 por URL de download para não inflar o payload
    const historico = rows.map((item) => {
      const rawAnexos = item.anexos as unknown;
      if (!rawAnexos) return item;
      const lista: AnexoInfo[] = Array.isArray(rawAnexos)
        ? (rawAnexos as AnexoInfo[])
        : (JSON.parse(rawAnexos as string) as AnexoInfo[]);
      return {
        ...item,
        anexos: lista.map((a, idx) => ({
          nome: a.nome,
          tamanho: a.tamanho,
          tipo: a.tipo,
          url: `/api/v1/demandas/${idDemanda}/historico/${item.id_historico}/anexo/${idx}`,
        })),
      };
    });

    return { historico, total: parseInt(count), pagina, limite };
  }
}

// ─── Helpers privados ─────────────────────────────────────────────────────────

function _erro(msg: string, statusCode: number): HttpError {
  const err: HttpError = new Error(msg);
  err.statusCode = statusCode;
  return err;
}

function _assertStatus(demanda: DemandaRow, esperado: string): void {
  if (demanda.status_atual !== esperado) {
    throw _erro(`Ação inválida: demanda está em "${demanda.status_atual}", esperado "${esperado}"`, 409);
  }
}

async function _assertGestor(demanda: DemandaRow, idGestor: Id): Promise<void> {
  const atribuicao = await db('tb_atribuicoes_gestor')
    .where('id_gestor', idGestor)
    .where('id_unidade', demanda.id_unidade)
    .where('ativo', true)
    .first();
  if (!atribuicao) {
    throw _erro('Você não possui atribuição ativa para a unidade desta demanda', 403);
  }
}

async function _buscarDPO(): Promise<Usuario | undefined> {
  const dpo = await db('tb_usuarios')
    .where('perfil_principal', 'DPO')
    .where('ativo', true)
    .first();
  return dpo as unknown as Usuario | undefined;
}

function _assertDeployPermission(demanda: DemandaRow, idUsuario: Id, idUnidadeUsuario: Id | null, isAdmin: boolean): void {
  if (isAdmin) return;
  if (demanda.tipo_deploy === 'OPS_DEPLOY') {
    if (!demanda.id_unidade_producao || Number(demanda.id_unidade_producao) !== Number(idUnidadeUsuario)) {
      throw _erro('Apenas responsáveis de produção da unidade designada podem executar o deploy desta solução', 403);
    }
  } else if (demanda.tipo_deploy === 'SELF_DEPLOY') {
    if (Number(demanda.id_solicitante) !== Number(idUsuario)) {
      throw _erro('Apenas o solicitante pode fazer o self-deploy desta solução', 403);
    }
  }
}

async function _criarInventario(demanda: DemandaRow): Promise<void> {
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
    data_entrada_producao: db.fn.now(),
  });
}

export { Demanda, HistoricoDecisao };
