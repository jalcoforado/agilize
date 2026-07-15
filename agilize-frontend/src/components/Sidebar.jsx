import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FilePlus2, Bell, BarChart2, Package,
  Users, LogOut, GitBranch, ClipboardCheck, PanelLeftClose, PanelLeftOpen,
  ArrowDownNarrowWide,
} from 'lucide-react';

// ─── Menus por perfil ────────────────────────────────────────────────────────

const MENU = {
  SOLICITANTE: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/demanda/nova', icon: FilePlus2, label: 'Nova Solução' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Minhas Ações' },
    { to: '/fluxo', icon: GitBranch, label: 'Mapa do Processo' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
  ],
  GESTOR_UNIDADE: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Ação' },
    { to: '/inventario', icon: Package, label: 'Inventário' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
    { to: '/relatorios', icon: BarChart2, label: 'Painel' },
    { to: '/fluxo', icon: GitBranch, label: 'Mapa do Processo' },
  ],
  GESTOR_DEPARTAMENTO: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Visão do Departamento' },
    { to: '/inventario', icon: Package, label: 'Inventário' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
    { to: '/relatorios', icon: BarChart2, label: 'Painel' },
    { to: '/fluxo', icon: GitBranch, label: 'Mapa do Processo' },
  ],
  ANALISTA_STI: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Análise' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
    { to: '/relatorios', icon: BarChart2, label: 'Painel' },
    { to: '/inventario', icon: Package, label: 'Inventário TCE' },
    { to: '/fluxo', icon: GitBranch, label: 'Mapa do Processo' },
    { to: '/admin', icon: Users, label: 'Administração' },
  ],
  AVALIADOR_TECNICO: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Revisão' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
    { to: '/relatorios', icon: BarChart2, label: 'Painel' },
    { to: '/inventario', icon: Package, label: 'Inventário TCE' },
  ],
  DPO: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Ação' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
  ],
  RESPONSAVEL_PRODUCAO: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Deploy' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
  ],
  GESTOR_SISTEMA: [
    { to: '/dashboard', icon: ClipboardCheck, label: 'Demandas' },
    { to: '/validacao', icon: ArrowDownNarrowWide, label: 'Fila de Ação' },
    { to: '/notificacoes', icon: Bell, label: 'Notificações', badge: true },
    { to: '/relatorios', icon: BarChart2, label: 'Painel' },
    { to: '/inventario', icon: Package, label: 'Inventário TCE' },
    { to: '/fluxo', icon: GitBranch, label: 'Mapa do Processo' },
    { to: '/admin', icon: Users, label: 'Administração' },
  ],
};

const LABEL_PERFIL = {
  SOLICITANTE: 'Solicitante',
  GESTOR_UNIDADE: 'Gestor de Unidade',
  GESTOR_DEPARTAMENTO: 'Gestor de Depto.',
  ANALISTA_STI: 'Analista STI',
  AVALIADOR_TECNICO: 'Avaliador Técnico',
  DPO: 'DPO',
  RESPONSAVEL_PRODUCAO: 'Operações STI',
  GESTOR_SISTEMA: 'Administrador',
};

// Do mais alto para o mais baixo — determina a cor prioritária do avatar
const HIERARQUIA = [
  'GESTOR_SISTEMA',
  'AVALIADOR_TECNICO',
  'ANALISTA_STI',
  'DPO',
  'RESPONSAVEL_PRODUCAO',
  'GESTOR_DEPARTAMENTO',
  'GESTOR_UNIDADE',
  'SOLICITANTE',
];

// Espelha COR_PERFIL do AdminPage, adaptado para fundo escuro
const COR_AVATAR = {
  GESTOR_SISTEMA:       'bg-gray-900 ring-gray-600',
  AVALIADOR_TECNICO:    'bg-violet-600 ring-violet-400',
  ANALISTA_STI:         'bg-red-600 ring-red-400',
  DPO:                  'bg-pink-600 ring-pink-400',
  RESPONSAVEL_PRODUCAO: 'bg-green-600 ring-green-400',
  GESTOR_DEPARTAMENTO:  'bg-orange-500 ring-orange-300',
  GESTOR_UNIDADE:       'bg-amber-500 ring-amber-300',
  SOLICITANTE:          'bg-blue-600 ring-blue-400',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tip({ label, children }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                      opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100 delay-100">
        <div className="bg-neutral-900/95 text-white text-xs font-medium px-2.5 py-1.5 rounded-md
                        whitespace-nowrap shadow-xl ring-1 ring-white/10">
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Sidebar({ notificacoesNaoLidas = 0 }) {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil = usuario.perfil_principal || 'SOLICITANTE';
  const perfisSecundarios = Array.isArray(usuario.perfis_secundarios) ? usuario.perfis_secundarios : [];
  const todosPerfis = [perfil, ...perfisSecundarios];
  // Mescla itens de todos os perfis, deduplicando por rota
  const menuVisto = new Set();
  const menu = todosPerfis.flatMap(p => MENU[p] || []).filter(item => {
    if (menuVisto.has(item.to)) return false;
    menuVisto.add(item.to);
    return true;
  });

  const perfilPrioritario = HIERARQUIA.find(p => todosPerfis.includes(p)) || perfil;
  const corAvatar = COR_AVATAR[perfilPrioritario] || 'bg-white/20 ring-white/30';

  const [colapsado, setColapsado] = useState(() => {
    try { return localStorage.getItem('sidebar_colapsado') === 'true'; }
    catch { return false; }
  });

  const toggle = () => setColapsado(prev => {
    const next = !prev;
    try { localStorage.setItem('sidebar_colapsado', String(next)); } catch { /* localStorage indisponível (modo privado) */ }
    return next;
  });

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  const iniciais = usuario.nome
    ? usuario.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : '?';

  const unidade = perfil === 'GESTOR_DEPARTAMENTO'
    ? (usuario.nome_departamento || null)
    : ([usuario.sigla_unidade, usuario.nome_unidade].filter(Boolean).join(' / ') || null);

  // ── Modo colapsado ─────────────────────────────────────────────────────────
  if (colapsado) {
    return (
      <aside className="w-[68px] h-screen sticky top-0 bg-tce-700 flex flex-col shrink-0 select-none">

        {/* Logo mark + expandir */}
        <div className="h-[72px] flex flex-col items-center justify-center gap-1.5 border-b border-tce-600/60">
          <Tip label="Expandir menu">
            <button onClick={toggle}
              className="w-5 h-3 flex items-center justify-center rounded-lg
                         text-tce-400 hover:bg-white/10 hover:text-tce-100 transition-all duration-150">
              <PanelLeftOpen size={20} />
            </button>
          </Tip>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center py-3.5 border-b border-tce-600/60">
          <Tip label={[usuario.nome || '—', LABEL_PERFIL[perfil] || perfil, unidade].filter(Boolean).join('  ·  ')}>
            <div className={`w-9 h-9 rounded-full ${corAvatar} ring-2
                            flex items-center justify-center text-white text-xs font-bold cursor-default
                            transition-opacity hover:opacity-90`}>
              {iniciais}
            </div>
          </Tip>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-1 px-2.5 py-3">
          {menu.map(({ to, icon: Icon, label, badge }) => (
            <Tip key={to} label={label}>
              <NavLink to={to} className={({ isActive }) =>
                `relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-150 ${isActive
                  ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/25'
                  : 'text-tce-200 hover:bg-white/10 hover:text-white'
                }`
              }>
                <Icon size={20} strokeWidth={1.8} />
                {badge && notificacoesNaoLidas > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full
                                   ring-2 ring-tce-700" />
                )}
              </NavLink>
            </Tip>
          ))}
        </nav>

        {/* Rodapé */}
        <div className="flex flex-col items-center gap-1 px-2.5 py-3 border-t border-tce-600/60">
          <Tip label="Sair">
            <button onClick={logout}
              className="w-11 h-11 flex items-center justify-center rounded-xl
                         text-tce-300 hover:bg-white/10 hover:text-white transition-all duration-150">
              <LogOut size={18} />
            </button>
          </Tip>

        </div>

      </aside>
    );
  }

  // ── Modo expandido ─────────────────────────────────────────────────────────
  return (
    <aside className="w-60 h-screen sticky top-0 bg-tce-700 flex flex-col shrink-0 select-none">

      {/* Logo + nome da aplicação + botão recolher */}
      <div className="px-7 h-[72px] flex items-center gap-2 border-b border-tce-600/60">
        <img
          src="/logos/LOGO.png"
          alt="TCE-CE"
          className="h-[31px] w-auto shrink-0"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <p className="text-tce-200 text-[11px] font-bold tracking-[0.2em] uppercase flex-1 truncate text-center">
          Agilize 2.0
        </p>
        <Tip label="Recolher menu">
          <button onClick={toggle}
            className="w-8 h-8  flex items-center justify-center rounded-lg shrink-0
                       text-tce-400 hover:bg-white/10 hover:text-tce-100 transition-all duration-150">
            <PanelLeftClose size={20} />
          </button>
        </Tip>
      </div>

      {/* Usuário */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-tce-600/60">
        <div className={`w-9 h-9 rounded-full ${corAvatar} ring-2
                        flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-white truncate leading-tight">{usuario.nome}</p>
          <p className="text-tce-300 text-xs truncate mt-0.5">{LABEL_PERFIL[perfil] || perfil}</p>
          {unidade && (
            <div className="relative group/loc mt-0.5">
              <p className="text-tce-400 text-[11px] truncate leading-tight cursor-default">{unidade}</p>
              <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                              opacity-0 group-hover/loc:opacity-100 transition-opacity duration-100 delay-75">
                <div className="bg-neutral-900/95 text-white text-xs px-3 py-2 rounded-md
                                shadow-xl ring-1 ring-white/10 whitespace-nowrap">
                  {usuario.nome_departamento && (
                    <p className="font-semibold">{usuario.nome_departamento}</p>
                  )}
                  {usuario.nome_unidade && perfil !== 'GESTOR_DEPARTAMENTO' && (
                    <p className="text-neutral-300 mt-0.5">{usuario.nome_unidade}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {menu.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${isActive
                ? 'bg-white/15 text-white'
                : 'text-tce-200 hover:bg-white/10 hover:text-white'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={17} className="shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="flex-1 truncate">{label}</span>
                {badge && notificacoesNaoLidas > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full
                                   px-1.5 py-0.5 min-w-[18px] text-center leading-none tabular-nums">
                    {notificacoesNaoLidas > 99 ? '99+' : notificacoesNaoLidas}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="px-3 py-3 ">
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium
                     text-tce-300 hover:bg-white/10 hover:text-white transition-all duration-150">
          <LogOut size={17} className="shrink-0" />
          Sair
        </button>

        <p className="text-tce-500 text-[10px] text-center pt-2 pb-1 tracking-wide">
          N-PSI-016 · v2.0
        </p>
      </div>

    </aside>
  );
}
