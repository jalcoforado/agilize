import { useState, useEffect, useCallback } from 'react';
import {
  Users, Building2, Plus, Search, RefreshCw, Edit2,
  ToggleLeft, ToggleRight, Trash2, UserCheck, X, ChevronDown
} from 'lucide-react';
import { adminService } from '../services/api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERFIS = [
  { value: 'SOLICITANTE',         label: 'Solicitante' },
  { value: 'GESTOR_UNIDADE',      label: 'Gestor de Unidade' },
  { value: 'GESTOR_DEPARTAMENTO', label: 'Gestor de Departamento' },
  { value: 'ANALISTA_STI',        label: 'Analista STI' },
  { value: 'RESPONSAVEL_PRODUCAO',label: 'Responsável Produção' },
  { value: 'GESTOR_SISTEMA',      label: 'Administrador' },
];

const COR_PERFIL = {
  SOLICITANTE:          'bg-blue-50 text-blue-700 border border-blue-200',
  GESTOR_UNIDADE:       'bg-amber-50 text-amber-700 border border-amber-200',
  GESTOR_DEPARTAMENTO:  'bg-orange-50 text-orange-700 border border-orange-200',
  ANALISTA_STI:         'bg-indigo-50 text-indigo-700 border border-indigo-200',
  RESPONSAVEL_PRODUCAO: 'bg-green-50 text-green-700 border border-green-200',
  GESTOR_SISTEMA:       'bg-rose-50 text-rose-700 border border-rose-200',
};

const LABEL_PERFIL = Object.fromEntries(PERFIS.map(p => [p.value, p.label]));

function BadgePerfil({ perfil }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${COR_PERFIL[perfil] || 'bg-gray-100 text-gray-600'}`}>
      {LABEL_PERFIL[perfil] || perfil}
    </span>
  );
}

// ─── Modal de usuário (criar / editar) ───────────────────────────────────────

function ModalUsuario({ usuario, onSalvar, onFechar }) {
  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    cpf: usuario?.cpf || '',
    senha: '',
    perfil_principal: usuario?.perfil_principal || 'SOLICITANTE',
    id_unidade: usuario?.id_unidade || '',
    id_departamento: usuario?.id_departamento || '',
  });
  const [unidades, setUnidades] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    adminService.listarUnidades().then(r => setUnidades(r.data.unidades));
  }, []);

  useEffect(() => {
    if (form.id_unidade) {
      adminService.listarDepartamentos(form.id_unidade)
        .then(r => setDepartamentos(r.data.departamentos));
    } else {
      setDepartamentos([]);
    }
  }, [form.id_unidade]);

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const dados = {
        nome: form.nome,
        email: form.email,
        cpf: form.cpf || undefined,
        perfil_principal: form.perfil_principal,
        id_unidade: form.id_unidade || undefined,
        id_departamento: form.id_departamento || undefined,
      };
      if (form.senha) dados.senha = form.senha;
      await onSalvar(dados);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-transparent';

  return (
    <Modal titulo={usuario ? 'Editar Usuário' : 'Novo Usuário'} onFechar={onFechar} largura="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
            <input className={campo} value={form.nome} onChange={e => set('nome', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
            <input type="email" className={campo} value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
            <input className={campo} value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="00000000000" maxLength={11} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {usuario ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
            </label>
            <input type="password" className={campo} value={form.senha}
              onChange={e => set('senha', e.target.value)} required={!usuario} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Perfil *</label>
            <select className={campo} value={form.perfil_principal} onChange={e => set('perfil_principal', e.target.value)} required>
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
            <select className={campo} value={form.id_unidade} onChange={e => { set('id_unidade', e.target.value); set('id_departamento', ''); }}>
              <option value="">Sem unidade</option>
              {unidades.map(u => <option key={u.id_unidade} value={u.id_unidade}>{u.sigla} — {u.nome_unidade}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
            <select className={campo} value={form.id_departamento} onChange={e => set('id_departamento', e.target.value)} disabled={!form.id_unidade}>
              <option value="">Sem departamento</option>
              {departamentos.map(d => <option key={d.id_departamento} value={d.id_departamento}>{d.nome_departamento}</option>)}
            </select>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 disabled:opacity-50 transition">
            {salvando ? 'Salvando...' : (usuario ? 'Salvar alterações' : 'Criar usuário')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de atribuição de gestor ───────────────────────────────────────────

function ModalAtribuicao({ onSalvar, onFechar }) {
  const [unidades, setUnidades] = useState([]);
  const [gestores, setGestores] = useState([]);
  const [form, setForm] = useState({ id_unidade: '', id_gestor: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    adminService.listarUnidades().then(r => setUnidades(r.data.unidades));
    adminService.listarUsuarios({ perfil: 'GESTOR_UNIDADE', ativo: 'true', limite: 100 })
      .then(r => setGestores(r.data.usuarios));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await onSalvar(form.id_gestor, form.id_unidade);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao atribuir gestor');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500';

  return (
    <Modal titulo="Atribuir Gestor à Unidade" onFechar={onFechar}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidade *</label>
          <select className={campo} value={form.id_unidade} onChange={e => setForm(f => ({ ...f, id_unidade: e.target.value }))} required>
            <option value="">Selecione a unidade</option>
            {unidades.map(u => <option key={u.id_unidade} value={u.id_unidade}>{u.sigla} — {u.nome_unidade}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gestor *</label>
          <select className={campo} value={form.id_gestor} onChange={e => setForm(f => ({ ...f, id_gestor: e.target.value }))} required>
            <option value="">Selecione o gestor</option>
            {gestores.map(g => <option key={g.id_usuario} value={g.id_usuario}>{g.nome} — {g.nome_unidade || 'Sem unidade'}</option>)}
          </select>
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Se já houver um gestor atribuído a esta unidade, ele será substituído automaticamente.
        </p>

        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 disabled:opacity-50 transition">
            {salvando ? 'Atribuindo...' : 'Atribuir Gestor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Aba Usuários ─────────────────────────────────────────────────────────────

function AbaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('');
  const [modal, setModal] = useState(null); // null | { tipo: 'criar'|'editar', usuario? }
  const [confirmando, setConfirmando] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (filtroPerfil) params.perfil = filtroPerfil;
      if (filtroAtivo !== '') params.ativo = filtroAtivo;
      const r = await adminService.listarUsuarios(params);
      setUsuarios(r.data.usuarios);
      setTotal(r.data.total);
    } finally {
      setCarregando(false);
    }
  }, [busca, filtroPerfil, filtroAtivo]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleSalvar = async (dados) => {
    if (modal?.usuario) {
      await adminService.atualizarUsuario(modal.usuario.id_usuario, dados);
    } else {
      await adminService.criarUsuario(dados);
    }
    setModal(null);
    carregar();
  };

  const handleToggle = async (usuario) => {
    await adminService.toggleAtivo(usuario.id_usuario);
    setConfirmando(null);
    carregar();
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-tce-500"
          />
        </div>
        <select
          value={filtroPerfil}
          onChange={e => setFiltroPerfil(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tce-500"
        >
          <option value="">Todos os perfis</option>
          {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select
          value={filtroAtivo}
          onChange={e => setFiltroAtivo(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tce-500"
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button onClick={carregar} className="p-2 text-gray-500 hover:text-tce-700 transition" title="Atualizar">
          <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setModal({ tipo: 'criar' })}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition"
        >
          <Plus size={15} /> Novo Usuário
        </button>
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-500">{total} usuário{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>

      {/* Tabela */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Unidade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Nenhum usuário encontrado.</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id_usuario} className={`hover:bg-gray-50 transition ${!u.ativo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{u.nome}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3"><BadgePerfil perfil={u.perfil_principal} /></td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                  {u.sigla ? <span>{u.sigla}{u.nome_departamento ? ` / ${u.nome_departamento}` : ''}</span> : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setModal({ tipo: 'editar', usuario: u })}
                      className="p-1.5 text-gray-400 hover:text-tce-700 rounded transition"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmando(u)}
                      className={`p-1.5 rounded transition ${u.ativo ? 'text-gray-400 hover:text-amber-600' : 'text-gray-400 hover:text-green-600'}`}
                      title={u.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {u.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <ModalUsuario
          usuario={modal.usuario}
          onSalvar={handleSalvar}
          onFechar={() => setModal(null)}
        />
      )}

      {/* Confirmação toggle */}
      {confirmando && (
        <Modal titulo={confirmando.ativo ? 'Desativar usuário' : 'Ativar usuário'} onFechar={() => setConfirmando(null)}>
          <p className="text-sm text-gray-700 mb-5">
            {confirmando.ativo
              ? `Desativar ${confirmando.nome}? O usuário não conseguirá fazer login.`
              : `Reativar ${confirmando.nome}?`}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmando(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancelar</button>
            <button
              onClick={() => handleToggle(confirmando)}
              className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition ${confirmando.ativo ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {confirmando.ativo ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Aba Gestores ─────────────────────────────────────────────────────────────

function AbaGestores() {
  const [atribuicoes, setAtribuicoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmandoRemover, setConfirmandoRemover] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await adminService.listarAtribuicoes();
      setAtribuicoes(r.data.atribuicoes);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handleAtribuir = async (id_gestor, id_unidade) => {
    await adminService.criarAtribuicao(id_gestor, id_unidade);
    setModalAberto(false);
    carregar();
  };

  const handleRemover = async (atribuicao) => {
    await adminService.removerAtribuicao(atribuicao.id_atribuicao);
    setConfirmandoRemover(null);
    carregar();
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{atribuicoes.length} atribuição{atribuicoes.length !== 1 ? 'ões' : ''} ativa{atribuicoes.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button onClick={carregar} className="p-2 text-gray-500 hover:text-tce-700 transition" title="Atualizar">
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition"
          >
            <Plus size={15} /> Atribuir Gestor
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gestor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Desde</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : atribuicoes.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Nenhuma atribuição ativa.</td></tr>
            ) : atribuicoes.map(a => (
              <tr key={a.id_atribuicao} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{a.nome_unidade}</p>
                  <p className="text-xs text-tce-600 font-medium">{a.sigla}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{a.nome_gestor}</p>
                  <p className="text-xs text-gray-500">{a.email_gestor}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-500">{fmt(a.data_inicio)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setConfirmandoRemover(a)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded transition"
                    title="Remover atribuição"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <ModalAtribuicao onSalvar={handleAtribuir} onFechar={() => setModalAberto(false)} />
      )}

      {confirmandoRemover && (
        <Modal titulo="Remover atribuição" onFechar={() => setConfirmandoRemover(null)}>
          <p className="text-sm text-gray-700 mb-5">
            Remover <strong>{confirmandoRemover.nome_gestor}</strong> como gestor de <strong>{confirmandoRemover.nome_unidade}</strong>?
            A unidade ficará sem gestor atribuído.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmandoRemover(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancelar</button>
            <button
              onClick={() => handleRemover(confirmandoRemover)}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              Remover
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [aba, setAba] = useState('usuarios');

  const ABAS = [
    { id: 'usuarios', label: 'Usuários', icon: Users },
    { id: 'gestores', label: 'Gestores por Unidade', icon: UserCheck },
  ];

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administração</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de usuários e atribuições de gestores por unidade</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-1">
            {ABAS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                  aba === id
                    ? 'border-tce-700 text-tce-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo */}
        {aba === 'usuarios' && <AbaUsuarios />}
        {aba === 'gestores' && <AbaGestores />}
      </div>
    </Layout>
  );
}
