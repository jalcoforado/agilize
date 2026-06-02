import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FilePlus, Bell, BarChart2, Package,
  Users, LogOut, GitBranch, ClipboardCheck, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

// ─── Menus por perfil ────────────────────────────────────────────────────────

const MENU = {
  SOLICITANTE: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/demanda/nova', icon: FilePlus,         label: 'Nova Solução' },
    { to: '/validacao',    icon: ClipboardCheck,   label: 'Minhas Ações' },
    { to: '/notificacoes', icon: Bell,             label: 'Notificações', badge: true },
  ],
  GESTOR_UNIDADE: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Ação' },
    { to: '/inventario',   icon: Package,         label: 'Inventário' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
    { to: '/relatorios',   icon: BarChart2,       label: 'Relatórios' },
  ],
  GESTOR_DEPARTAMENTO: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Ação' },
    { to: '/inventario',   icon: Package,         label: 'Inventário' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
    { to: '/relatorios',   icon: BarChart2,       label: 'Relatórios' },
  ],
  ANALISTA_STI: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Análise' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
    { to: '/relatorios',   icon: BarChart2,       label: 'Relatórios' },
    { to: '/inventario',   icon: Package,         label: 'Inventário TCE' },
    { to: '/fluxo',        icon: GitBranch,       label: 'Mapa do Processo' },
  ],
  DIRETOR_STI: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Revisão' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
  ],
  RESPONSAVEL_PRODUCAO: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Deploy' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
  ],
  GESTOR_SISTEMA: [
    { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/validacao',    icon: ClipboardCheck,  label: 'Fila de Ação' },
    { to: '/notificacoes', icon: Bell,            label: 'Notificações', badge: true },
    { to: '/relatorios',   icon: BarChart2,       label: 'Relatórios' },
    { to: '/inventario',   icon: Package,         label: 'Inventário TCE' },
    { to: '/fluxo',        icon: GitBranch,       label: 'Mapa do Processo' },
    { to: '/admin',        icon: Users,           label: 'Administração' },
  ],
};

const LABEL_PERFIL = {
  SOLICITANTE:         'Solicitante',
  GESTOR_UNIDADE:      'Gestor de Unidade',
  GESTOR_DEPARTAMENTO: 'Gestor de Depto.',
  ANALISTA_STI:        'Analista STI',
  DIRETOR_STI:         'Diretor STI',
  RESPONSAVEL_PRODUCAO:'Operações STI',
  GESTOR_SISTEMA:      'Administrador',
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
  const navigate  = useNavigate();
  const usuario   = JSON.parse(localStorage.getItem('usuario') || '{}');
  const perfil    = usuario.perfil_principal || 'SOLICITANTE';
  const menu      = MENU[perfil] || MENU.SOLICITANTE;

  const [colapsado, setColapsado] = useState(() => {
    try { return localStorage.getItem('sidebar_colapsado') === 'true'; }
    catch { return false; }
  });

  const toggle = () => setColapsado(prev => {
    const next = !prev;
    try { localStorage.setItem('sidebar_colapsado', String(next)); } catch {}
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

  // ── Modo colapsado ─────────────────────────────────────────────────────────
  if (colapsado) {
    return (
      <aside className="w-[68px] min-h-screen bg-tce-700 flex flex-col shrink-0 select-none">

        {/* Logo mark */}
        <div className="h-[72px] flex items-center justify-center border-b border-tce-600/60">
          <Tip label="Agilize 2.0 — TCE-CE">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center cursor-default
                            ring-1 ring-white/20 hover:bg-white/15 transition-colors">
              <span className="text-white font-bold text-[13px] tracking-tight">AG</span>
            </div>
          </Tip>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center py-3.5 border-b border-tce-600/60">
          <Tip label={`${usuario.nome || '—'}  ·  ${LABEL_PERFIL[perfil] || perfil}`}>
            <div className="w-9 h-9 rounded-full bg-white/20 ring-2 ring-white/30
                            flex items-center justify-center text-white text-xs font-bold cursor-default
                            hover:bg-white/25 transition-colors">
              {iniciais}
            </div>
          </Tip>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center gap-1 px-2.5 py-3">
          {menu.map(({ to, icon: Icon, label, badge }) => (
            <Tip key={to} label={label}>
              <NavLink to={to} className={({ isActive }) =>
                `relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/25'
                    : 'text-tce-200 hover:bg-white/10 hover:text-white'
                }`
              }>
                <Icon size={20} strokeWidth={isActiveIcon => isActiveIcon ? 2.2 : 1.8} />
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

          <Tip label="Expandir menu">
            <button onClick={toggle}
              className="w-11 h-8 flex items-center justify-center rounded-xl
                         text-tce-400 hover:bg-white/10 hover:text-tce-100 transition-all duration-150">
              <PanelLeftOpen size={16} />
            </button>
          </Tip>
        </div>

      </aside>
    );
  }

  // ── Modo expandido ─────────────────────────────────────────────────────────
  return (
    <aside className="w-60 min-h-screen bg-tce-700 flex flex-col shrink-0 select-none">

      {/* Logo */}
      <div className="h-[72px] px-5 flex items-center border-b border-tce-600/60">
        <div className="flex-1 min-w-0">
          <img src="/logos/LOGO-BRANCA.svg" alt="TCE-CE" className="h-8 w-auto"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <span className="hidden text-white font-bold">TCE-CE</span>
          <p className="text-tce-300 text-[10px] mt-1.5 font-semibold tracking-widest uppercase">
            Agilize 2.0
          </p>
        </div>
      </div>

      {/* Usuário */}
      <div className="px-4 py-3.5 flex items-center gap-3 border-b border-tce-600/60">
        <div className="w-9 h-9 rounded-full bg-white/20 ring-2 ring-white/30
                        flex items-center justify-center text-white text-xs font-bold shrink-0">
          {iniciais}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate leading-tight">{usuario.nome}</p>
          <p className="text-tce-300 text-[11px] truncate mt-0.5">{LABEL_PERFIL[perfil] || perfil}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {menu.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
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
      <div className="px-3 py-3 border-t border-tce-600/60 space-y-0.5">
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium
                     text-tce-300 hover:bg-white/10 hover:text-white transition-all duration-150">
          <LogOut size={17} className="shrink-0" />
          Sair
        </button>

        <button onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm font-medium
                     text-tce-400 hover:bg-white/10 hover:text-tce-200 transition-all duration-150">
          <PanelLeftClose size={16} className="shrink-0" />
          Recolher menu
        </button>

        <p className="text-tce-500 text-[10px] text-center pt-2 pb-1 tracking-wide">
          N-PSI-016 · v2.0
        </p>
      </div>

    </aside>
  );
}
