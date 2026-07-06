// Augmenta o Knex para que `db('tb_xxx')` seja tipado com as interfaces de domínio.
// Leituras retornam a linha completa; inserts/updates aceitam objetos parciais e
// valores Knex.Raw (ex.: `db.fn.now()`), via o helper Writable<T>.
import { Knex } from 'knex';
import type {
  Usuario,
  Unidade,
  Departamento,
  Demanda,
  HistoricoDecisaoRow,
  Notificacao,
  AtribuicaoGestor,
  DiagnosticoIA,
  InventarioAplicacao,
  Updatable,
} from './models';

declare module 'knex/types/tables' {
  interface Tables {
    tb_usuarios: Knex.CompositeTableType<Usuario, Updatable<Usuario>, Updatable<Usuario>>;
    tb_unidades: Knex.CompositeTableType<Unidade, Updatable<Unidade>, Updatable<Unidade>>;
    tb_departamentos: Knex.CompositeTableType<Departamento, Updatable<Departamento>, Updatable<Departamento>>;
    tb_demandas: Knex.CompositeTableType<Demanda, Updatable<Demanda>, Updatable<Demanda>>;
    tb_historico_decisoes: Knex.CompositeTableType<
      HistoricoDecisaoRow,
      Updatable<HistoricoDecisaoRow>,
      Updatable<HistoricoDecisaoRow>
    >;
    tb_notificacoes: Knex.CompositeTableType<Notificacao, Updatable<Notificacao>, Updatable<Notificacao>>;
    tb_atribuicoes_gestor: Knex.CompositeTableType<
      AtribuicaoGestor,
      Updatable<AtribuicaoGestor>,
      Updatable<AtribuicaoGestor>
    >;
    tb_diagnosticos_ia: Knex.CompositeTableType<DiagnosticoIA, Updatable<DiagnosticoIA>, Updatable<DiagnosticoIA>>;
    tb_inventario_aplicacoes: Knex.CompositeTableType<
      InventarioAplicacao,
      Updatable<InventarioAplicacao>,
      Updatable<InventarioAplicacao>
    >;
  }
}
