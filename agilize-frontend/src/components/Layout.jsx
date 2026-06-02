import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { notificacaoService } from '../services/api';

export default function Layout({ children }) {
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    notificacaoService.contarNaoLidas()
      .then(({ data }) => setNaoLidas(data.total))
      .catch(() => {});

    const intervalo = setInterval(() => {
      notificacaoService.contarNaoLidas()
        .then(({ data }) => setNaoLidas(data.total))
        .catch(() => {});
    }, 60_000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar notificacoesNaoLidas={naoLidas} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
