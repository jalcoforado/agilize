import { Request, Response, NextFunction } from 'express';
import { Demanda, HistoricoDecisao, type ListarFiltros, type ScopeCondition } from '../models';
import { notificarMudancaStatus, notificarUnidadeProducao } from '../services/notificacao';
import { dispararEmailMudancaStatus } from '../services/email-dispatcher';
import db from '../db/connection';
import type { Perfil, Prioridade, AnexoInfo } from '../types/models';
import type { HttpError } from '../types/http';

const STI: Perfil[] = ['ANALISTA_STI', 'GESTOR_SISTEMA'];
const GESTOR: Perfil[] = ['GESTOR_UNIDADE', 'GESTOR_SISTEMA'];
const SOLICITANTE: Perfil[] = ['SOLICITANTE', 'GESTOR_SISTEMA'];
const PRODUCAO: Perfil[] = ['SOLICITANTE', 'RESPONSAVEL_PRODUCAO', 'ANALISTA_STI', 'GESTOR_SISTEMA'];
const AVALIADOR: Perfil[] = ['AVALIADOR_TECNICO', 'GESTOR_SISTEMA'];
const DPO_ARRAY: Perfil[] = ['DPO', 'GESTOR_SISTEMA'];
const SUSPENSAO: Perfil[] = ['ANALISTA_STI', 'AVALIADOR_TECNICO', 'GESTOR_SISTEMA'];

function checkPerfil(req: Request, permitidos: Perfil[]): void {
  const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
  if (!todosPerfis.some(p => permitidos.includes(p))) {
    const err: HttpError = new Error('Sem permissão para esta ação');
    err.statusCode = 403;
    throw err;
  }
}

function checkPerfilPrincipal(req: Request, permitidos: Perfil[]): void {
  if (!permitidos.includes(req.user.perfil_principal)) {
    const err: HttpError = new Error('Sem permissão para esta ação');
    err.statusCode = 403;
    throw err;
  }
}


class DemandaController {
  static async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.criar(req.demandaValidada!, req.user.id_usuario, req.ip);
      res.status(201).json({ success: true, demanda, message: 'Demanda criada com sucesso' });
      notificarMudancaStatus(demanda, 'DRAFT', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'DRAFT').catch(() => {});
    } catch (error) { next(error); }
  }

  static async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.obterPorId(req.params.id);
      if (!demanda) {
        const err: HttpError = new Error('Demanda não encontrada'); err.statusCode = 404; err.code = 'NAO_ENCONTRADO';
        return next(err);
      }
      if (!['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual)) {
        const err: HttpError = new Error('Só é possível editar demandas em rascunho ou em fase de ajuste');
        err.statusCode = 409; err.code = 'STATUS_INVALIDO';
        return next(err);
      }
      if (Number(demanda.id_solicitante) !== Number(req.user.id_usuario) && req.user.perfil_principal !== 'GESTOR_SISTEMA') {
        const err: HttpError = new Error('Sem permissão para editar esta demanda'); err.statusCode = 403;
        return next(err);
      }
      const dadosValidados = req.demandaValidada!;
      const dadosParaSalvar: Record<string, unknown> = {
        ...dadosValidados,
        dependencias_externas: dadosValidados.dependencias_externas ? JSON.stringify(dadosValidados.dependencias_externas) : null,
        dados_tecnicos: dadosValidados.dados_tecnicos ? JSON.stringify(dadosValidados.dados_tecnicos) : null,
        anexos: dadosValidados.anexos?.length ? JSON.stringify(dadosValidados.anexos) : null,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const atualizada = await Demanda.atualizar(req.params.id, dadosParaSalvar as any);
      res.status(200).json({ success: true, demanda: atualizada, message: 'Demanda atualizada com sucesso' });
    } catch (error) { next(error); }
  }

  static async atualizarAnexos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.obterPorId(req.params.id);
      if (!demanda) {
        const err: HttpError = new Error('Demanda não encontrada'); err.statusCode = 404; err.code = 'NAO_ENCONTRADO';
        return next(err);
      }
      if (!['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual)) {
        const err: HttpError = new Error('Anexos só podem ser alterados em rascunho ou fase de ajuste');
        err.statusCode = 409; err.code = 'STATUS_INVALIDO';
        return next(err);
      }
      if (Number(demanda.id_solicitante) !== Number(req.user.id_usuario) && req.user.perfil_principal !== 'GESTOR_SISTEMA') {
        const err: HttpError = new Error('Sem permissão para editar esta demanda'); err.statusCode = 403;
        return next(err);
      }
      const { anexos } = req.body as { anexos?: unknown[] };
      await db('tb_demandas').where('id_demanda', req.params.id).update({
        anexos: (Array.isArray(anexos) && anexos.length ? anexos : null) as unknown as AnexoInfo[],
        data_ultima_atualizacao: db.fn.now(),
      });
      const atualizada = await Demanda.obterPorId(req.params.id);
      res.status(200).json({ success: true, demanda: atualizada });
    } catch (error) { next(error); }
  }

  static async obterDiagnostico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const diagnostico = await db('tb_diagnosticos_ia')
        .where('id_demanda', req.params.id)
        .orderBy('id_diagnostico', 'desc')
        .first();
      res.status(200).json({ success: true, diagnostico: diagnostico || null });
    } catch (error) { next(error); }
  }

  static async obter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const demanda = req.demandaCarregada!;
      const gestor_unidade_disponivel = await Demanda.temGestorAtivo(demanda.id_unidade);
      res.status(200).json({ success: true, demanda: { ...demanda, gestor_unidade_disponivel } });
    } catch (error) { next(error); }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = req.query as Record<string, string | undefined>;
      const { status, statusIn, statusNotIn, prioridade, tipo_solucao } = q;
      const pagina = q.pagina ?? '1';
      const limite = q.limite ?? '20';
      const filtros: ListarFiltros = {};
      if (statusIn) filtros.statusIn = statusIn.split(',').map((s) => s.trim()).filter(Boolean);
      else if (status) filtros.status = status;
      if (statusNotIn) filtros.statusNotIn = statusNotIn.split(',').map((s) => s.trim()).filter(Boolean);
      if (prioridade) filtros.prioridade = prioridade;
      if (tipo_solucao) filtros.tipo_solucao = tipo_solucao;

      // Escopo obrigatório por perfil — considera principal + secundários
      const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
      // Perfis "amplos" veem tudo; o frontend restringe via statusIn
      const AMPLOS: Perfil[] = ['ANALISTA_STI', 'DPO', 'GESTOR_SISTEMA'];
      const temAmplo = todosPerfis.some(p => AMPLOS.includes(p));
      if (!temAmplo) {
        const scopes: ScopeCondition[] = [];
        if (todosPerfis.includes('SOLICITANTE'))
          scopes.push({ field: 'id_solicitante', value: req.user.id_usuario });
        if (todosPerfis.includes('GESTOR_UNIDADE') && req.user.id_unidade)
          scopes.push({ field: 'id_unidade', value: req.user.id_unidade });
        if (todosPerfis.includes('GESTOR_DEPARTAMENTO') && req.user.id_departamento)
          scopes.push({ field: 'id_departamento', value: req.user.id_departamento });
        if (todosPerfis.includes('AVALIADOR_TECNICO') && req.user.id_unidade)
          scopes.push({ field: 'id_unidade_avaliador', value: req.user.id_unidade });
        if (todosPerfis.includes('RESPONSAVEL_PRODUCAO') && req.user.id_unidade)
          scopes.push({ field: 'id_unidade_producao', value: req.user.id_unidade });
        if (scopes.length) filtros.orScopes = scopes;
      }

      // Filtros adicionais providos pelo usuário (aplicados dentro do escopo)
      const PERFIS_AMPLOS_FILTRO: Perfil[] = ['ANALISTA_STI', 'GESTOR_SISTEMA', 'RESPONSAVEL_PRODUCAO', 'AVALIADOR_TECNICO'];
      const podeFilrarDept = todosPerfis.some(p => PERFIS_AMPLOS_FILTRO.includes(p));
      const podeFiltrarUnidade = podeFilrarDept || todosPerfis.includes('GESTOR_DEPARTAMENTO');
      const podeFiltrarSolicitante = podeFiltrarUnidade || todosPerfis.includes('GESTOR_UNIDADE');

      if (q.filtro_departamento && podeFilrarDept) filtros.filtro_departamento = parseInt(q.filtro_departamento);
      if (q.filtro_unidade && podeFiltrarUnidade) filtros.filtro_unidade = parseInt(q.filtro_unidade);
      if (q.filtro_solicitante && podeFiltrarSolicitante) filtros.filtro_solicitante = q.filtro_solicitante;

      const resultado = await Demanda.listar(filtros, parseInt(pagina), parseInt(limite));
      res.status(200).json({ success: true, ...resultado });
    } catch (error) { next(error); }
  }

  // ─── FASE 1: SOLICITAÇÃO ──────────────────────────────────────────────────

  static async enviarParaGestor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.enviarParaGestor(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Enviado para validação do gestor' });
      notificarMudancaStatus(demanda, 'PENDENTE_GESTOR', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'PENDENTE_GESTOR').catch(() => {});
    } catch (error) { next(error); }
  }

  static async validarGestor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.validarGestor(req.params.id, req.user.id_usuario, parecer, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Demanda validada pelo gestor' });
      notificarMudancaStatus(demanda, 'VALIDADA_GESTOR', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'VALIDADA_GESTOR').catch(() => {});
    } catch (error) { next(error); }
  }

  static async devolver(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.devolver(req.params.id, req.user.id_usuario, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Demanda devolvida para ajustes' });
      notificarMudancaStatus(demanda, 'DEVOLVIDA_AJUSTES', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'DEVOLVIDA_AJUSTES').catch(() => {});
    } catch (error) { next(error); }
  }

  static async rejeitarGestor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { motivo_rejeicao, parecer, anexos } = req.rejeicao!;
      const demanda = await Demanda.rejeitarGestor(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Demanda rejeitada pelo Gestor' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'REJEITADA').catch(() => {});
    } catch (error) { next(error); }
  }

  static async iniciarAjuste(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarAjuste(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Ajustes iniciados' });
    } catch (error) { next(error); }
  }

  static async enviarParaSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.enviarParaSTI(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Encaminhado para fila da STI' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async aprovarSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.aprovarSTI(req.params.id, req.user.id_usuario, parecer, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Aprovado pela STI — desenvolvimento autorizado' });
      notificarMudancaStatus(demanda, 'APROVADA_STI', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'APROVADA_STI').catch(() => {});
    } catch (error) { next(error); }
  }

  static async reprovarSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { motivo_rejeicao, parecer, anexos } = req.rejeicao!;
      const demanda = await Demanda.reprovarSTI(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Reprovado pela STI' });
      notificarMudancaStatus(demanda, 'REPROVADA_STI', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'REPROVADA_STI').catch(() => {});
    } catch (error) { next(error); }
  }

  static async solicitarAjustesSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.solicitarAjustesSTI(req.params.id, req.user.id_usuario, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Ajustes solicitados pela STI' });
      notificarMudancaStatus(demanda, 'SOLICITADO_AJUSTES_STI', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'SOLICITADO_AJUSTES_STI').catch(() => {});
    } catch (error) { next(error); }
  }

  static async reenviarParaSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.reenviarParaSTI(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Reenviado para fila da STI' });
    } catch (error) { next(error); }
  }

  // ─── FASE 2: DESENVOLVIMENTO ──────────────────────────────────────────────

  static async iniciarDesenvolvimento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarDesenvolvimento(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Desenvolvimento iniciado' });
      notificarMudancaStatus(demanda, 'EM_DESENVOLVIMENTO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'EM_DESENVOLVIMENTO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async submeterProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.submeterProduto(req.params.id, req.user.id_usuario, parecer, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Produto submetido para homologação' });
      notificarMudancaStatus(demanda, 'SUBMETIDO_HOMOLOGACAO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'SUBMETIDO_HOMOLOGACAO').catch(() => {});
    } catch (error) { next(error); }
  }

  // ─── FASE 3: HOMOLOGAÇÃO ──────────────────────────────────────────────────

  static async validarHomologacaoGestor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.validarHomologacaoGestor(req.params.id, req.user.id_usuario, parecer, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Homologação validada pelo gestor' });
      notificarMudancaStatus(demanda, 'VALIDADA_HOMOLOGACAO_GESTOR', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'VALIDADA_HOMOLOGACAO_GESTOR').catch(() => {});
    } catch (error) { next(error); }
  }

  static async devolverHomologacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.devolverHomologacao(req.params.id, req.user.id_usuario, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Produto devolvido para ajustes' });
      notificarMudancaStatus(demanda, 'DEVOLVIDA_HOMOLOGACAO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'DEVOLVIDA_HOMOLOGACAO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async iniciarAjusteHomologacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SOLICITANTE);
      const demanda = await Demanda.iniciarAjusteHomologacao(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Ajuste de homologação iniciado' });
    } catch (error) { next(error); }
  }

  static async enviarHomologacaoSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.enviarHomologacaoSTI(req.params.id, req.user.id_usuario);
      res.status(200).json({ success: true, demanda, message: 'Enviado para fila de homologação da STI' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async solicitarAjustesHomologacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.solicitarAjustesHomologacao(req.params.id, req.user.id_usuario, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Ajustes no produto solicitados pela STI' });
      notificarMudancaStatus(demanda, 'SOLICITADO_AJUSTES_HOMOLOGACAO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'SOLICITADO_AJUSTES_HOMOLOGACAO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async homologar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { parecer, comentario, tipo_deploy, id_unidade_producao, anexos } = req.homologacao!;
      const demanda = await Demanda.homologar(req.params.id, req.user.id_usuario, parecer, comentario, tipo_deploy, id_unidade_producao, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Solução homologada pela STI' });
      notificarMudancaStatus(demanda, 'HOMOLOGADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'HOMOLOGADA').catch(() => {});
      if (tipo_deploy === 'OPS_DEPLOY' && id_unidade_producao && demanda) {
        notificarUnidadeProducao(demanda).catch(() => {});
      }
    } catch (error) { next(error); }
  }

  static async rejeitar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { motivo_rejeicao, parecer, anexos } = req.rejeicao!;
      const demanda = await Demanda.rejeitar(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Produto rejeitado na homologação' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'REJEITADA').catch(() => {});
    } catch (error) { next(error); }
  }

  static async reenviarHomologacaoSTI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const demanda = await Demanda.reenviarHomologacaoSTI(req.params.id, req.user.id_usuario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Produto reenviado para fila de homologação da STI' });
    } catch (error) { next(error); }
  }

  // ─── FASE 4: PRODUÇÃO ────────────────────────────────────────────────────

  static async iniciarDeploy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, PRODUCAO);
      const { parecer, anexos } = req.parecer!;
      const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
      const isAdmin = todosPerfis.includes('GESTOR_SISTEMA');
      const demanda = await Demanda.iniciarDeploy(req.params.id, req.user.id_usuario, req.user.id_unidade ?? null, isAdmin, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Deploy iniciado' });
      notificarMudancaStatus(demanda, 'EM_PRODUCAO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'EM_PRODUCAO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async confirmarDeploy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, PRODUCAO);
      const { parecer, anexos } = req.parecer!;
      const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
      const isAdmin = todosPerfis.includes('GESTOR_SISTEMA');
      const demanda = await Demanda.confirmarDeploy(req.params.id, req.user.id_usuario, req.user.id_unidade ?? null, isAdmin, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Deploy confirmado — solução em monitoramento' });
      notificarMudancaStatus(demanda, 'EM_MONITORAMENTO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'EM_MONITORAMENTO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async rejeitarGestorHomologacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, GESTOR);
      const { motivo_rejeicao, parecer, anexos } = req.rejeicao!;
      const demanda = await Demanda.rejeitarGestorHomologacao(req.params.id, req.user.id_usuario, motivo_rejeicao, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Produto rejeitado pelo Gestor na homologação' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'REJEITADA').catch(() => {});
    } catch (error) { next(error); }
  }

  static async rejeitarAvaliadorHomologacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, AVALIADOR);
      const { motivo_rejeicao, parecer, anexos } = req.rejeicao!;
      const demanda = await Demanda.rejeitarAvaliadorHomologacao(req.params.id, req.user.id_usuario, req.user.id_unidade ?? 0, motivo_rejeicao, parecer, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Produto rejeitado pelo Avaliador Técnico na homologação' });
      notificarMudancaStatus(demanda, 'REJEITADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'REJEITADA').catch(() => {});
    } catch (error) { next(error); }
  }

  static async desativar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, [...STI, 'AVALIADOR_TECNICO']);
      const { motivo } = req.cancelamento!;
      const demanda = await Demanda.desativar(req.params.id, req.user.id_usuario, motivo, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Solução desativada' });
    } catch (error) { next(error); }
  }

  // ─── AVALIADOR TÉCNICO ───────────────────────────────────────────────────

  static async encaminharAvaliador(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, STI);
      const { comentario, id_unidade } = req.body;
      const demanda = await Demanda.encaminharAvaliador(req.params.id, req.user.id_usuario, id_unidade, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda encaminhada ao Avaliador Técnico' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async avaliadorSolicitarAjustes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, AVALIADOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.avaliadorSolicitarAjustes(req.params.id, req.user.id_usuario, req.user.id_unidade!, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Ajustes solicitados ao solicitante pelo Avaliador Técnico' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async avaliadorDevolverAnalista(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, AVALIADOR);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.avaliadorDevolverAnalista(req.params.id, req.user.id_usuario, req.user.id_unidade!, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Demanda devolvida ao analista' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  // ─── DPO ─────────────────────────────────────────────────────────────────────

  static async encaminharDPO(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, [...STI]);
      const { comentario } = req.body as { comentario?: string };
      const demanda = await Demanda.encaminharDPO(req.params.id, req.user.id_usuario, comentario, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Encaminhado ao DPO para análise de dados sensíveis' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async dpoAprovar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfilPrincipal(req, DPO_ARRAY);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.dpoAprovar(req.params.id, req.user.id_usuario, parecer, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'Aprovado pelo DPO — encaminhado à STI' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async dpoSolicitarAjustes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfilPrincipal(req, DPO_ARRAY);
      const { parecer, comentario, anexos } = req.parecer!;
      const demanda = await Demanda.dpoSolicitarAjustes(req.params.id, req.user.id_usuario, parecer!, comentario, req.ip, anexos);
      res.status(200).json({ success: true, demanda, message: 'DPO solicitou ajustes ao solicitante' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  // ─── SUSPENSÃO ────────────────────────────────────────────────────────────

  static async suspender(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SUSPENSAO);
      const { motivo } = req.cancelamento!;
      const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
      const demanda = await Demanda.suspender(
        req.params.id,
        req.user.id_usuario,
        todosPerfis,
        req.user.id_unidade ?? null,
        motivo,
        req.ip,
      );
      res.status(200).json({ success: true, demanda, message: 'Demanda suspensa com sucesso' });
      notificarMudancaStatus(demanda, 'SUSPENSO', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'SUSPENSO').catch(() => {});
    } catch (error) { next(error); }
  }

  static async retornarDeSuspensao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, SUSPENSAO);
      const todosPerfis: Perfil[] = [req.user.perfil_principal, ...(req.user.perfis_secundarios ?? [])];
      const demanda = await Demanda.retornarDeSuspensao(
        req.params.id,
        req.user.id_usuario,
        todosPerfis,
        req.user.id_unidade ?? null,
        req.ip,
      );
      res.status(200).json({ success: true, demanda, message: 'Demanda retomada com sucesso' });
      notificarMudancaStatus(demanda, demanda!.status_atual, req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, demanda!.status_atual).catch(() => {});
    } catch (error) { next(error); }
  }

  static async cancelar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, ['SOLICITANTE', 'GESTOR_UNIDADE', 'ANALISTA_STI', 'AVALIADOR_TECNICO', 'GESTOR_SISTEMA']);
      const { motivo } = req.cancelamento!;
      const demanda = await Demanda.cancelar(req.params.id, req.user.id_usuario, motivo, req.ip);
      res.status(200).json({ success: true, demanda, message: 'Demanda cancelada' });
      notificarMudancaStatus(demanda, 'CANCELADA', req.user).catch(() => {});
      dispararEmailMudancaStatus(demanda, 'CANCELADA').catch(() => {});
    } catch (error) { next(error); }
  }

  static async atualizarPrioridade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, ['ANALISTA_STI', 'AVALIADOR_TECNICO', 'GESTOR_SISTEMA']);
      const VALORES_VALIDOS: Prioridade[] = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
      const { prioridade } = req.body as { prioridade?: string };
      if (!prioridade || !VALORES_VALIDOS.includes(prioridade as Prioridade)) {
        const err: HttpError = new Error('Valor de prioridade inválido'); err.statusCode = 422; err.code = 'VALIDACAO';
        return next(err);
      }
      const demanda = await Demanda.obterPorId(req.params.id);
      if (!demanda) {
        const err: HttpError = new Error('Demanda não encontrada'); err.statusCode = 404; err.code = 'NAO_ENCONTRADO';
        return next(err);
      }
      await db('tb_demandas')
        .where('id_demanda', req.params.id)
        .update({ prioridade: prioridade as Prioridade, data_ultima_atualizacao: db.fn.now() });
      res.status(200).json({ success: true, prioridade, message: 'Prioridade atualizada' });
    } catch (error) { next(error); }
  }

  static async transferirLocacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      checkPerfil(req, ['GESTOR_SISTEMA', 'ANALISTA_STI']);

      const { id_unidade, motivo } = req.body as { id_unidade?: number; motivo?: string };
      if (!id_unidade) {
        const err: HttpError = new Error('id_unidade é obrigatório');
        err.statusCode = 422; err.code = 'VALIDACAO'; return next(err);
      }
      if (!motivo || motivo.trim().length < 10) {
        const err: HttpError = new Error('motivo é obrigatório (mínimo 10 caracteres)');
        err.statusCode = 422; err.code = 'VALIDACAO'; return next(err);
      }

      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip;
      await Demanda.transferirLocacao(req.params.id, id_unidade, motivo.trim(), req.user.id_usuario, ip);

      res.status(200).json({ success: true, message: 'Locação transferida com sucesso' });
    } catch (error) { next(error); }
  }
}

class HistoricoController {
  static async obterPorDemanda(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idDemanda } = req.params;
      const q = req.query as Record<string, string | undefined>;
      const pagina = q.pagina ?? '1';
      const limite = q.limite ?? '50';
      const resultado = await HistoricoDecisao.obterPorDemanda(idDemanda, parseInt(limite), parseInt(pagina));
      res.status(200).json({ success: true, ...resultado });
    } catch (error) { next(error); }
  }
}

export { DemandaController, HistoricoController };
