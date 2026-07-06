import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, RefreshCw, Edit2,
  ToggleLeft, ToggleRight,
  AlertTriangle, X, UserCheck,
  ChevronDown, Users, Building2, Layers
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { adminService } from '../services/api';
import Layout from '../components/Layout';
import Modal from '../components/Modal';

// ─── Alerta: gestores sem atribuição ─────────────────────────────────────────

function AlertaGestoresSemAtribuicao({ onEditarUsuario }) {
  const [gestores, setGestores] = useState([]);
  const [dispensado, setDispensado] = useState(false);

  useEffect(() => {
    adminService.gestoresSemAtribuicao()
      .then(r => setGestores(r.data.gestores_sem_atribuicao || []))
      .catch(() => {});
  }, []);

  if (dispensado || gestores.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">
              {gestores.length === 1
                ? '1 Gestor de Unidade sem atribuição ativa'
                : `${gestores.length} Gestores de Unidade sem atribuição ativa`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Esses usuários têm perfil de Gestor, mas não foram formalmente atribuídos a nenhuma unidade.
              Demandas enviadas para suas unidades não serão encaminhadas corretamente.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {gestores.map(g => (
                <button
                  key={g.id_usuario}
                  onClick={() => onEditarUsuario(g)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-lg px-2.5 py-1 transition"
                  title={`${g.nome_unidade || 'sem unidade'} — clique para editar`}
                >
                  <UserCheck size={11} />
                  {g.nome}
                  {g.nome_unidade && <span className="text-amber-600">· {g.sigla || g.nome_unidade}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setDispensado(true)} className="text-amber-500 hover:text-amber-700 transition shrink-0 mt-0.5">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PERFIS = [
  { value: 'SOLICITANTE',         label: 'Solicitante' },
  { value: 'GESTOR_UNIDADE',      label: 'Gestor de Unidade' },
  { value: 'GESTOR_DEPARTAMENTO', label: 'Gestor de Departamento' },
  { value: 'ANALISTA_STI',        label: 'Analista STI' },
  { value: 'AVALIADOR_TECNICO',   label: 'Avaliador Técnico' },
  { value: 'DPO',                 label: 'DPO' },
  { value: 'RESPONSAVEL_PRODUCAO',label: 'Responsável Produção' },
  { value: 'GESTOR_SISTEMA',      label: 'Administrador' },
];

const COR_PERFIL = {
  SOLICITANTE:          'bg-blue-50 text-blue-700 border border-blue-200',
  GESTOR_UNIDADE:       'bg-amber-50 text-amber-700 border border-amber-200',
  GESTOR_DEPARTAMENTO:  'bg-orange-50 text-orange-700 border border-orange-200',
  ANALISTA_STI:         'bg-red-50 text-red-700 border border-red-200',
  AVALIADOR_TECNICO:    'bg-violet-50 text-violet-700 border border-violet-200',
  DPO:                  'bg-pink-50 text-pink-800 border border-pink-300',
  RESPONSAVEL_PRODUCAO: 'bg-green-50 text-green-700 border border-green-200',
  GESTOR_SISTEMA:       'bg-gray-900 text-white border border-gray-800',
};

const LABEL_PERFIL = Object.fromEntries(PERFIS.map(p => [p.value, p.label]));

function BadgePerfil({ perfil }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${COR_PERFIL[perfil] || 'bg-gray-100 text-gray-600'}`}>
      {LABEL_PERFIL[perfil] || perfil}
    </span>
  );
}

// Perfis secundários disponíveis por perfil principal (apenas usuários do depto STI)
const PERFIS_SEC_POR_PRINCIPAL = {
  ANALISTA_STI:      ['GESTOR_UNIDADE', 'AVALIADOR_TECNICO'],
  GESTOR_UNIDADE:    ['AVALIADOR_TECNICO', 'RESPONSAVEL_PRODUCAO'],
  AVALIADOR_TECNICO: ['RESPONSAVEL_PRODUCAO'],
};

// ─── Modal de usuário (criar / editar) ───────────────────────────────────────

function ModalUsuario({ usuario, onSalvar, onFechar }) {
  const perfisSecIniciais = Array.isArray(usuario?.perfis_secundarios)
    ? usuario.perfis_secundarios
    : (typeof usuario?.perfis_secundarios === 'string' ? JSON.parse(usuario.perfis_secundarios || '[]') : []);

  const [form, setForm] = useState({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    senha: '',
    perfil_principal: usuario?.perfil_principal || 'SOLICITANTE',
    perfis_secundarios: perfisSecIniciais,
    id_departamento: usuario?.id_departamento ? String(usuario.id_departamento) : '',
    id_unidade: usuario?.id_unidade ? String(usuario.id_unidade) : '',
  });
  const [departamentos, setDepartamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [idDeptSti, setIdDeptSti] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    adminService.listarDepartamentos().then(r => {
      const depts = r.data.departamentos;
      setDepartamentos(depts);
      // Identifica o departamento STI para controle de multiperfis
      const sti = depts.find(d => d.nome_departamento?.toLowerCase().includes('tecnologia'));
      if (sti) setIdDeptSti(String(sti.id_departamento));
    });
  }, []);

  useEffect(() => {
    if (form.id_departamento) {
      adminService.listarUnidades(form.id_departamento)
        .then(r => setUnidades(r.data.unidades));
    } else {
      setUnidades([]);
    }
  }, [form.id_departamento]);

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  const ehDeptSti = form.id_departamento && form.id_departamento === idDeptSti;
  const perfisSecDisponiveis = ehDeptSti ? (PERFIS_SEC_POR_PRINCIPAL[form.perfil_principal] || []) : [];

  const togglePerfilSec = (perfil) => {
    setForm(f => ({
      ...f,
      perfis_secundarios: f.perfis_secundarios.includes(perfil)
        ? f.perfis_secundarios.filter(p => p !== perfil)
        : [...f.perfis_secundarios, perfil],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const dados = {
        nome: form.nome,
        email: form.email,
        perfil_principal: form.perfil_principal,
        perfis_secundarios: perfisSecDisponiveis.length ? form.perfis_secundarios.filter(p => perfisSecDisponiveis.includes(p)) : [],
        id_departamento: form.id_departamento || undefined,
        id_unidade: form.id_unidade || undefined,
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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {usuario ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
            </label>
            <input type="password" className={campo} value={form.senha}
              onChange={e => set('senha', e.target.value)} required={!usuario} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Perfil principal *</label>
            <select className={campo} value={form.perfil_principal}
              onChange={e => { set('perfil_principal', e.target.value); set('perfis_secundarios', []); }} required>
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Departamento</label>
            <select className={campo} value={form.id_departamento}
              onChange={e => { set('id_departamento', e.target.value); set('id_unidade', ''); set('perfis_secundarios', []); }}>
              <option value="">Sem departamento</option>
              {departamentos.map(d => <option key={d.id_departamento} value={String(d.id_departamento)}>{d.nome_departamento}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
            <select className={campo} value={form.id_unidade} onChange={e => set('id_unidade', e.target.value)} disabled={!form.id_departamento}>
              <option value="">Sem unidade</option>
              {unidades.map(u => <option key={u.id_unidade} value={String(u.id_unidade)}>{u.sigla} — {u.nome_unidade}</option>)}
            </select>
          </div>
        </div>

        <div className={`border rounded-lg p-3 ${perfisSecDisponiveis.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs font-semibold mb-1 ${perfisSecDisponiveis.length > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
            Perfis adicionais
          </p>
          {perfisSecDisponiveis.length > 0 ? (
            <>
              <p className="text-[11px] text-blue-600 mb-2">
                Combinações permitidas para este perfil na STI.
              </p>
              <div className="flex flex-wrap gap-3">
                {perfisSecDisponiveis.map(p => (
                  <label key={p} className="flex items-center gap-2 text-sm text-blue-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.perfis_secundarios.includes(p)}
                      onChange={() => togglePerfilSec(p)}
                      className="rounded accent-blue-600"
                    />
                    {LABEL_PERFIL[p] || p}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-gray-400">
              {!ehDeptSti
                ? 'Disponível apenas para usuários da Secretaria de Tecnologia da Informação.'
                : 'Nenhum perfil adicional disponível para o perfil principal selecionado.'}
            </p>
          )}
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

// ─── Modal de departamento (criar) ───────────────────────────────────────────

function ModalDepartamento({ onSalvar, onFechar }) {
  const [form, setForm] = useState({ nome_departamento: '', descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await onSalvar(form);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao criar departamento');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-transparent';

  return (
    <Modal titulo="Novo Departamento" onFechar={onFechar} largura="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do departamento *</label>
          <input className={campo} value={form.nome_departamento}
            onChange={e => setForm(f => ({ ...f, nome_departamento: e.target.value }))} required
            placeholder="Ex: Secretaria de Controle Externo" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea className={campo} rows={3} value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Finalidade ou atribuições do departamento" />
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 disabled:opacity-50 transition">
            {salvando ? 'Criando...' : 'Criar departamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Modal de unidade (criar) ─────────────────────────────────────────────────

function ModalUnidade({ onSalvar, onFechar }) {
  const [form, setForm] = useState({ sigla: '', nome_unidade: '', id_departamento: '', descricao: '' });
  const [departamentos, setDepartamentos] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    adminService.listarDepartamentos()
      .then(r => setDepartamentos(r.data.departamentos))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await onSalvar({ ...form, id_departamento: form.id_departamento || undefined });
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao criar unidade');
    } finally {
      setSalvando(false);
    }
  };

  const campo = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-transparent';

  return (
    <Modal titulo="Nova Unidade" onFechar={onFechar} largura="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sigla *</label>
            <input className={campo} value={form.sigla}
              onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))}
              required placeholder="Ex: STI-GOV" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Departamento *</label>
            <select className={campo} value={form.id_departamento}
              onChange={e => setForm(f => ({ ...f, id_departamento: e.target.value }))} required>
              <option value="">Selecione...</option>
              {departamentos.map(d => (
                <option key={d.id_departamento} value={String(d.id_departamento)}>{d.nome_departamento}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome da unidade *</label>
          <input className={campo} value={form.nome_unidade}
            onChange={e => setForm(f => ({ ...f, nome_unidade: e.target.value }))}
            required placeholder="Ex: Diretoria de Governança, Projetos e Aquisições de TI" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
          <textarea className={campo} rows={2} value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
        </div>
        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button type="button" onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 disabled:opacity-50 transition">
            {salvando ? 'Criando...' : 'Criar unidade'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Aba Usuários ─────────────────────────────────────────────────────────────

const LIMITE = 15;

function AbaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [departamentos, setDepartamentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const dropdownRef = useRef(null);

  // Ref sempre atualizado com os valores atuais dos filtros — lido dentro de carregar sem gerar dep
  const filtrosRef = useRef({});
  filtrosRef.current = { busca, filtroPerfil, filtroAtivo, filtroDepartamento, filtroUnidade };

  useEffect(() => {
    adminService.listarDepartamentos().then(({ data }) => setDepartamentos(data.departamentos || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filtroDepartamento) { setUnidades([]); setFiltroUnidade(''); return; }
    adminService.listarUnidades(filtroDepartamento).then(({ data }) => setUnidades(data.unidades || [])).catch(() => {});
  }, [filtroDepartamento]);

  useEffect(() => {
    const fechar = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const carregar = useCallback(async () => {
    const f = filtrosRef.current;
    setCarregando(true);
    try {
      const params = { pagina, limite: LIMITE };
      if (f.busca) params.busca = f.busca;
      if (f.filtroPerfil) params.perfil = f.filtroPerfil;
      if (f.filtroAtivo !== '') params.ativo = f.filtroAtivo;
      if (f.filtroDepartamento) params.id_departamento = f.filtroDepartamento;
      if (f.filtroUnidade) params.id_unidade = f.filtroUnidade;
      const r = await adminService.listarUsuarios(params);
      setUsuarios(r.data.usuarios);
      setTotal(r.data.total);
      setTotalPaginas(r.data.totalPaginas || 1);
    } finally {
      setCarregando(false);
    }
  }, [pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  const handleBuscar = () => {
    if (pagina !== 1) setPagina(1); // o useEffect dispara carregar após reset
    else carregar();
  };

  const handleSalvarUsuario = async (dados) => {
    if (modal?.usuario) {
      await adminService.atualizarUsuario(modal.usuario.id_usuario, dados);
    } else {
      await adminService.criarUsuario(dados);
    }
    setModal(null);
    carregar();
  };

  const handleSalvarDepartamento = async (dados) => {
    await adminService.criarDepartamento(dados);
    setModal(null);
  };

  const handleSalvarUnidade = async (dados) => {
    await adminService.criarUnidade(dados);
    setModal(null);
  };

  const handleToggle = async (usuario) => {
    await adminService.toggleAtivo(usuario.id_usuario);
    setConfirmando(null);
    carregar();
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho: título à esquerda, ações à direita */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Administração</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestão de usuários do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} className="p-2 text-gray-500 hover:text-tce-700 transition" title="Atualizar">
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownAberto(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 transition"
            >
              <Plus size={15} /> Novo
              <ChevronDown size={13} className={`transition-transform duration-150 ${dropdownAberto ? 'rotate-180' : ''}`} />
            </button>
            {dropdownAberto && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <button
                  onClick={() => { setModal({ tipo: 'usuario', usuario: null }); setDropdownAberto(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Users size={14} className="text-gray-400" /> Usuário
                </button>
                <button
                  onClick={() => { setModal({ tipo: 'departamento' }); setDropdownAberto(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Building2 size={14} className="text-gray-400" /> Departamento
                </button>
                <button
                  onClick={() => { setModal({ tipo: 'unidade' }); setDropdownAberto(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Layers size={14} className="text-gray-400" /> Unidade
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de gestores sem atribuição */}
      <AlertaGestoresSemAtribuicao
        onEditarUsuario={(g) => setModal({ tipo: 'usuario', usuario: g })}
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleBuscar()}
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
          value={filtroDepartamento}
          onChange={e => setFiltroDepartamento(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tce-500"
        >
          <option value="">Todos os departamentos</option>
          {departamentos.map(d => (
            <option key={d.id_departamento} value={d.id_departamento}>{d.nome_departamento}</option>
          ))}
        </select>
        {filtroDepartamento && unidades.length > 0 && (
          <select
            value={filtroUnidade}
            onChange={e => setFiltroUnidade(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tce-500"
          >
            <option value="">Todas as unidades</option>
            {unidades.map(u => (
              <option key={u.id_unidade} value={u.id_unidade}>{u.sigla} — {u.nome_unidade}</option>
            ))}
          </select>
        )}
        <select
          value={filtroAtivo}
          onChange={e => setFiltroAtivo(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-tce-500"
        >
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
        <button
          onClick={handleBuscar}
          disabled={carregando}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 disabled:opacity-60 transition"
        >
          <Search size={14} />
          Buscar
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
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Locação</th>
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
                <td className="px-4 py-3">
                  <div className="inline-flex flex-wrap gap-1 items-center">
                    <BadgePerfil perfil={u.perfil_principal} />
                    {Array.isArray(u.perfis_secundarios) && u.perfis_secundarios.map(p => (
                      <BadgePerfil key={p} perfil={p} />
                    ))}
                  </div>
                </td>
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
                    <div className="relative group">
                      <button
                        onClick={() => setModal({ tipo: 'usuario', usuario: u })}
                        className="p-1.5 text-gray-400 hover:text-tce-700 rounded transition"
                      >
                        <Edit2 size={22} />
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        Editar
                      </span>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => setConfirmando(u)}
                        className={`p-1.5 rounded transition ${u.ativo ? 'text-gray-400 hover:text-amber-600' : 'text-gray-400 hover:text-green-600'}`}
                      >
                        {u.ativo ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                      </button>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        contagem={usuarios.length}
        onChange={setPagina}
      />

      {/* Modais criar/editar */}
      {modal?.tipo === 'usuario' && (
        <ModalUsuario
          usuario={modal.usuario}
          onSalvar={handleSalvarUsuario}
          onFechar={() => setModal(null)}
        />
      )}
      {modal?.tipo === 'departamento' && (
        <ModalDepartamento onSalvar={handleSalvarDepartamento} onFechar={() => setModal(null)} />
      )}
      {modal?.tipo === 'unidade' && (
        <ModalUnidade onSalvar={handleSalvarUnidade} onFechar={() => setModal(null)} />
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

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <AbaUsuarios />
      </div>
    </Layout>
  );
}
