// Testes de roteamento de emails por status do fluxo
// Verifica QUEM recebe (e quem NÃO recebe) em cada transição — sem envio real.
// Cobre: dispararEmailMudancaStatus() em services/email-dispatcher.ts

jest.mock('../db/connection', () => jest.fn());
jest.mock('../services/email.service', () => ({
  enviar: jest.fn().mockResolvedValue({ ok: true, mensagem: 'mock' }),
}));

import { dispararEmailMudancaStatus } from '../services/email-dispatcher';
import { enviar } from '../services/email.service';
import db from '../db/connection';
import type { Demanda as DemandaRow } from '../types/models';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOLICITANTE = { id_usuario: 1, email: 'solicitante@test.com', nome: 'Solicitante Teste', ativo: true };
const GESTOR_1    = { id_usuario: 2, email: 'gestor1@test.com',     nome: 'Gestor 1',          ativo: true };
const GESTOR_2    = { id_usuario: 3, email: 'gestor2@test.com',     nome: 'Gestor 2',          ativo: true };
const ANALISTA_1  = { id_usuario: 4, email: 'analista1@test.com',   nome: 'Analista 1',        ativo: true };
const ANALISTA_2  = { id_usuario: 5, email: 'analista2@test.com',   nome: 'Analista 2',        ativo: true };
const DPO_1       = { id_usuario: 6, email: 'dpo@test.com',         nome: 'DPO',               ativo: true };
const DPO_2       = { id_usuario: 9, email: 'dpo2@test.com',        nome: 'DPO 2',             ativo: true };
const OPS_1       = { id_usuario: 7, email: 'ops@test.com',         nome: 'Ops',               ativo: true };
const OPS_2       = { id_usuario: 8, email: 'ops2@test.com',        nome: 'Ops 2',             ativo: true };

const DEMANDA_BASE = {
  id_demanda: 100,
  id_solicitante: SOLICITANTE.id_usuario,
  id_unidade: 10,
  titulo: 'Solução de Teste',
  numero_demanda: 'AGZ-2025-999',
  tipo_deploy: 'SELF_DEPLOY',
  id_dpo: null,
  id_dpo_homologacao: null,
  id_responsavel_deploy: null,
} as unknown as DemandaRow;

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockDb     = db as unknown as jest.Mock;
const mockEnviar = enviar as jest.Mock;

// Cria um query-builder Knex simulado: encadeável + thenable
function makeChain(result: unknown) {
  const promise = Promise.resolve(result);
  return {
    where:   jest.fn().mockReturnThis(),
    join:    jest.fn().mockReturnThis(),
    select:  jest.fn().mockReturnValue(promise),
    first:   jest.fn().mockReturnValue(promise),
    then:    promise.then.bind(promise),
    catch:   promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
}

// Para status não-FILA: Promise.all faz sempre 2 chamadas (solicitante + gestores).
function setupDbBase(gestores: unknown[] = [GESTOR_1]) {
  mockDb
    .mockReturnValueOnce(makeChain(SOLICITANTE))  // db('tb_usuarios') — solicitante por id
    .mockReturnValueOnce(makeChain(gestores));     // db('tb_atribuicoes_gestor') — gestores
}

// Para FILA_STI / FILA_HOMOLOGACAO_STI: 3.ª chamada busca analistas STI.
function setupDbFila(analistas: unknown[] = [ANALISTA_1], gestores: unknown[] = [GESTOR_1]) {
  mockDb
    .mockReturnValueOnce(makeChain(SOLICITANTE))  // solicitante
    .mockReturnValueOnce(makeChain(gestores))     // gestores
    .mockReturnValueOnce(makeChain(analistas));   // db('tb_usuarios') filtrado por ANALISTA_STI
}

// Lista os destinatários de todas as chamadas ao enviar()
function destinatarios(): string[] {
  return mockEnviar.mock.calls.map((args) => (args[0] as { para: string }).para);
}

// ── Setup global ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// ── Testes ────────────────────────────────────────────────────────────────────

describe('email-dispatcher — roteamento de emails por status do fluxo', () => {

  // ── Somente gestores da unidade ─────────────────────────────────────────────

  describe('PENDENTE_GESTOR — somente gestores da unidade', () => {
    it('notifica cada gestor ativo atribuído à unidade', async () => {
      setupDbBase([GESTOR_1, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'PENDENTE_GESTOR');

      const para = destinatarios();
      expect(para).toContain(GESTOR_1.email);
      expect(para).toContain(GESTOR_2.email);
      expect(para).toHaveLength(2);
    });

    it('NÃO notifica o solicitante', async () => {
      setupDbBase([GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'PENDENTE_GESTOR');

      expect(destinatarios()).not.toContain(SOLICITANTE.email);
    });

    it('não envia nada se nenhum gestor está atribuído à unidade', async () => {
      setupDbBase([]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'PENDENTE_GESTOR');

      expect(mockEnviar).not.toHaveBeenCalled();
    });
  });

  describe('SUBMETIDO_HOMOLOGACAO — somente gestores (espelha PENDENTE_GESTOR)', () => {
    it('notifica todos os gestores da unidade', async () => {
      setupDbBase([GESTOR_1, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'SUBMETIDO_HOMOLOGACAO');

      expect(destinatarios()).toEqual([GESTOR_1.email, GESTOR_2.email]);
    });

    it('NÃO notifica o solicitante', async () => {
      setupDbBase([GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'SUBMETIDO_HOMOLOGACAO');

      expect(destinatarios()).not.toContain(SOLICITANTE.email);
    });
  });

  // ── Somente analistas STI ────────────────────────────────────────────────────

  describe('FILA_STI — somente analistas STI', () => {
    it('notifica cada ANALISTA_STI ativo', async () => {
      setupDbFila([ANALISTA_1, ANALISTA_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_STI');

      const para = destinatarios();
      expect(para).toContain(ANALISTA_1.email);
      expect(para).toContain(ANALISTA_2.email);
      expect(para).toHaveLength(2);
    });

    it('NÃO notifica o solicitante', async () => {
      setupDbFila([ANALISTA_1], [GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_STI');

      expect(destinatarios()).not.toContain(SOLICITANTE.email);
    });

    it('NÃO notifica gestores', async () => {
      setupDbFila([ANALISTA_1], [GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_STI');

      expect(destinatarios()).not.toContain(GESTOR_1.email);
    });
  });

  describe('FILA_HOMOLOGACAO_STI — somente analistas STI (espelha FILA_STI)', () => {
    it('notifica todos os analistas STI', async () => {
      setupDbFila([ANALISTA_1, ANALISTA_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_HOMOLOGACAO_STI');

      expect(destinatarios()).toEqual([ANALISTA_1.email, ANALISTA_2.email]);
    });

    it('NÃO notifica solicitante nem gestores', async () => {
      setupDbFila([ANALISTA_1], [GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_HOMOLOGACAO_STI');

      const para = destinatarios();
      expect(para).not.toContain(SOLICITANTE.email);
      expect(para).not.toContain(GESTOR_1.email);
    });
  });

  // ── Somente solicitante ──────────────────────────────────────────────────────

  describe('statuses que notificam somente o solicitante', () => {
    const casos: string[] = [
      'DRAFT',
      'VALIDADA_GESTOR',
      'DEVOLVIDA_AJUSTES',
      'APROVADA_STI',
      'EM_DESENVOLVIMENTO',
      'DEVOLVIDA_HOMOLOGACAO',
      'VALIDADA_HOMOLOGACAO_GESTOR',
      'SOLICITADO_AJUSTES_HOMOLOGACAO',
      'HOMOLOGADA',
      'EM_MONITORAMENTO',
      'SOLICITANTE_AJUSTANDO',
      'AJUSTANDO_HOMOLOGACAO',
      'CANCELADA',
    ];

    it.each(casos)('%s — exatamente 1 email, para o solicitante', async (status) => {
      setupDbBase([GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, status);

      expect(mockEnviar).toHaveBeenCalledTimes(1);
      expect(destinatarios()).toEqual([SOLICITANTE.email]);
    });
  });

  // ── Solicitante + gestores ────────────────────────────────────────────────────

  describe('REPROVADA_STI — solicitante + gestores', () => {
    it('notifica o solicitante', async () => {
      setupDbBase([GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'REPROVADA_STI');

      expect(destinatarios()).toContain(SOLICITANTE.email);
    });

    it('notifica todos os gestores da unidade', async () => {
      setupDbBase([GESTOR_1, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'REPROVADA_STI');

      const para = destinatarios();
      expect(para).toContain(GESTOR_1.email);
      expect(para).toContain(GESTOR_2.email);
    });

    it('total: 1 solicitante + n gestores, sem outros destinatários', async () => {
      setupDbBase([GESTOR_1, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'REPROVADA_STI');

      expect(mockEnviar).toHaveBeenCalledTimes(3);
    });
  });

  describe('SOLICITADO_AJUSTES_STI — solicitante + gestores', () => {
    it('notifica solicitante e gestores, ninguém mais', async () => {
      setupDbBase([GESTOR_1]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'SOLICITADO_AJUSTES_STI');

      const para = destinatarios();
      expect(para).toContain(SOLICITANTE.email);
      expect(para).toContain(GESTOR_1.email);
      expect(mockEnviar).toHaveBeenCalledTimes(2);
    });
  });

  describe('REJEITADA — solicitante + gestores', () => {
    it('notifica solicitante e todos os gestores', async () => {
      setupDbBase([GESTOR_1, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'REJEITADA');

      const para = destinatarios();
      expect(para).toContain(SOLICITANTE.email);
      expect(para).toContain(GESTOR_1.email);
      expect(para).toContain(GESTOR_2.email);
      expect(para).toHaveLength(3);
    });
  });

  // ── DPOs + solicitante ───────────────────────────────────────────────────────

  describe('AGUARDANDO_DPO — DPO(s) + solicitante', () => {
    it('sem id_dpo: notifica todos os usuários com perfil DPO', async () => {
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1, DPO_2]));  // query por perfil_principal DPO

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'AGUARDANDO_DPO');

      const para = destinatarios();
      expect(para).toContain(DPO_1.email);
      expect(para).toContain(DPO_2.email);
    });

    it('sem id_dpo: também notifica o solicitante', async () => {
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'AGUARDANDO_DPO');

      expect(destinatarios()).toContain(SOLICITANTE.email);
    });

    it('sem id_dpo: NÃO notifica gestores', async () => {
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'AGUARDANDO_DPO');

      expect(destinatarios()).not.toContain(GESTOR_1.email);
    });

    it('com id_dpo: notifica apenas o DPO designado, não os demais', async () => {
      const demanda = { ...DEMANDA_BASE, id_dpo: DPO_1.id_usuario } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));  // query por id_dpo específico

      await dispararEmailMudancaStatus(demanda, 'AGUARDANDO_DPO');

      const para = destinatarios();
      expect(para).toContain(DPO_1.email);
      expect(para).not.toContain(DPO_2.email);
    });

    it('com id_dpo: total = 1 DPO designado + 1 solicitante', async () => {
      const demanda = { ...DEMANDA_BASE, id_dpo: DPO_1.id_usuario } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));

      await dispararEmailMudancaStatus(demanda, 'AGUARDANDO_DPO');

      expect(mockEnviar).toHaveBeenCalledTimes(2);
    });
  });

  describe('AGUARDANDO_DPO_HOMOLOGACAO — DPO(s) + solicitante (espelha fase 1)', () => {
    it('sem id_dpo_homologacao: notifica todos os DPOs + solicitante', async () => {
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'AGUARDANDO_DPO_HOMOLOGACAO');

      const para = destinatarios();
      expect(para).toContain(DPO_1.email);
      expect(para).toContain(SOLICITANTE.email);
      expect(para).toHaveLength(2);
    });

    it('com id_dpo_homologacao: só o DPO designado recebe, não os demais', async () => {
      const demanda = { ...DEMANDA_BASE, id_dpo_homologacao: DPO_1.id_usuario } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([DPO_1]));

      await dispararEmailMudancaStatus(demanda, 'AGUARDANDO_DPO_HOMOLOGACAO');

      expect(destinatarios()).not.toContain(DPO_2.email);
    });
  });

  // ── EM_PRODUCAO — destinatário varia com tipo de deploy ─────────────────────

  describe('EM_PRODUCAO — destinatário depende do tipo de deploy', () => {
    it('OPS_DEPLOY com responsável designado: notifica apenas o responsável', async () => {
      const demanda = { ...DEMANDA_BASE, tipo_deploy: 'OPS_DEPLOY', id_responsavel_deploy: OPS_1.id_usuario } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain(OPS_1));  // responsavel_deploy por id

      await dispararEmailMudancaStatus(demanda, 'EM_PRODUCAO');

      expect(destinatarios()).toEqual([OPS_1.email]);
    });

    it('OPS_DEPLOY com responsável designado: NÃO notifica solicitante nem gestores', async () => {
      const demanda = { ...DEMANDA_BASE, tipo_deploy: 'OPS_DEPLOY', id_responsavel_deploy: OPS_1.id_usuario } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain(OPS_1));

      await dispararEmailMudancaStatus(demanda, 'EM_PRODUCAO');

      const para = destinatarios();
      expect(para).not.toContain(SOLICITANTE.email);
      expect(para).not.toContain(GESTOR_1.email);
    });

    it('SELF_DEPLOY: notifica toda a equipe de produção (RESPONSAVEL_PRODUCAO)', async () => {
      const demanda = { ...DEMANDA_BASE, tipo_deploy: 'SELF_DEPLOY' } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([OPS_1, OPS_2]));  // todos RESPONSAVEL_PRODUCAO

      await dispararEmailMudancaStatus(demanda, 'EM_PRODUCAO');

      const para = destinatarios();
      expect(para).toContain(OPS_1.email);
      expect(para).toContain(OPS_2.email);
      expect(para).toHaveLength(2);
    });

    it('OPS_DEPLOY sem id_responsavel_deploy: cai no fallback para equipe de produção', async () => {
      const demanda = { ...DEMANDA_BASE, tipo_deploy: 'OPS_DEPLOY', id_responsavel_deploy: null } as unknown as DemandaRow;
      setupDbBase([GESTOR_1]);
      mockDb.mockReturnValueOnce(makeChain([OPS_1]));

      await dispararEmailMudancaStatus(demanda, 'EM_PRODUCAO');

      expect(destinatarios()).toEqual([OPS_1.email]);
    });
  });

  // ── Status sem notificação configurada ───────────────────────────────────────

  describe('status sem case no dispatcher — nenhum email enviado', () => {
    const statusesSemMapeamento: string[] = [
      'AGUARDANDO_AVALIADOR',
      'AGUARDANDO_AVALIADOR_HOMOLOGACAO',
      'DESATIVADA',
      'SUSPENSO',
    ];

    it.each(statusesSemMapeamento)('%s — nenhum email enviado', async (status) => {
      setupDbBase([GESTOR_1]);  // Promise.all executa, mas switch não casa

      await dispararEmailMudancaStatus(DEMANDA_BASE, status);

      expect(mockEnviar).not.toHaveBeenCalled();
    });
  });

  // ── Casos de borda ────────────────────────────────────────────────────────────

  describe('casos de borda', () => {
    it('demanda undefined: retorna imediatamente sem consultar banco ou enviar email', async () => {
      await dispararEmailMudancaStatus(undefined, 'APROVADA_STI');

      expect(mockDb).not.toHaveBeenCalled();
      expect(mockEnviar).not.toHaveBeenCalled();
    });

    it('solicitante sem campo email: nenhum email enviado para ele', async () => {
      const semEmail = { ...SOLICITANTE, email: undefined };
      mockDb
        .mockReturnValueOnce(makeChain(semEmail))
        .mockReturnValueOnce(makeChain([]));

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'APROVADA_STI');

      expect(mockEnviar).not.toHaveBeenCalled();
    });

    it('gestor sem campo email: outros gestores recebem normalmente', async () => {
      const gestorSemEmail = { ...GESTOR_1, email: undefined };
      setupDbBase([gestorSemEmail, GESTOR_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'PENDENTE_GESTOR');

      expect(destinatarios()).toEqual([GESTOR_2.email]);
    });

    it('múltiplos analistas: cada um recebe exatamente um email, sem duplicatas', async () => {
      setupDbFila([ANALISTA_1, ANALISTA_2]);

      await dispararEmailMudancaStatus(DEMANDA_BASE, 'FILA_STI');

      const para = destinatarios();
      expect(para).toHaveLength(2);
      expect(new Set(para).size).toBe(para.length);
    });
  });
});
