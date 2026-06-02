import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { data } = await authService.login(email, senha);
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      navigate('/dashboard');
    } catch (err) {
      setErro(err.response?.data?.message || 'E-mail ou senha incorretos. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — identidade institucional */}
      <div className="hidden lg:flex lg:w-[55%] bg-tce-700 flex-col items-center justify-center px-16 relative overflow-hidden">
        {/* Ornamento geométrico de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-tce-600 rounded-full opacity-20 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-tce-800 rounded-full opacity-30 -translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 text-center">
          <img
            src="/logos/logo_vertical_png.png"
            alt="TCE-CE — Tribunal de Contas do Estado do Ceará"
            className="w-48 mx-auto mb-10 drop-shadow-lg"
          />
          <div className="w-16 h-0.5 bg-white/40 mx-auto mb-8" />
          <h2 className="text-white text-2xl font-semibold tracking-tight mb-3">
            Agilize 2.0
          </h2>
          <p className="text-tce-200 text-base leading-relaxed max-w-xs mx-auto">
            Gestão de soluções setoriais de TI em conformidade com a norma N-PSI-016
          </p>
        </div>

        <p className="absolute bottom-8 text-tce-300 text-xs">
          STI — Secretaria de Tecnologia da Informação
        </p>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 bg-white">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <img
            src="/logos/logo_vertical_png.png"
            alt="TCE-CE"
            className="w-32 mx-auto mb-4"
          />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-800 mb-1">Entrar no sistema</h1>
            <p className="text-neutral-500 text-sm">Use suas credenciais institucionais</p>
          </div>

          {erro && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@tce.ce.gov.br"
                autoComplete="email"
                disabled={carregando}
                required
                className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 disabled:bg-neutral-50 disabled:text-neutral-400 transition"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="senha" className="block text-sm font-medium text-neutral-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={carregando}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 border border-neutral-300 rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 disabled:bg-neutral-50 disabled:text-neutral-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando || !email || !senha}
              className="w-full flex items-center justify-center gap-2 bg-tce-700 text-white font-semibold py-2.5 rounded-lg hover:bg-tce-800 active:bg-tce-900 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="mt-auto pt-12 text-xs text-neutral-400 text-center">
          Agilize 2.0 — Conformidade N-PSI-016 &nbsp;·&nbsp; TCE-CE {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
