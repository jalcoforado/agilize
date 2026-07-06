// Augmenta o Request do Express com o usuário autenticado e os payloads validados
// que os middlewares anexam (req.user, req.demandaValidada, req.parecer, etc.).
import type {
  AuthUser,
  Demanda as DemandaRow,
  DemandaInput,
  ParecerInput,
  RejeicaoInput,
  HomologacaoInput,
  CancelamentoInput,
} from './models';

declare global {
  namespace Express {
    interface Request {
      // Definido pelo middleware `autenticar`; todas as rotas que o utilizam
      // estão protegidas por ele.
      user: AuthUser;
      demandaCarregada?: DemandaRow;
      demandaValidada?: DemandaInput;
      parecer?: ParecerInput;
      rejeicao?: RejeicaoInput;
      homologacao?: HomologacaoInput;
      cancelamento?: CancelamentoInput;
    }
  }
}

export {};
