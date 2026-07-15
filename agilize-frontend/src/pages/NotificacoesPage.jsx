import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacaoService } from '../services/api';
import Layout from '../components/Layout';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function NotificacoesPage() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [apenasNaoLidas, setApenasNaoLidas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const carregar = async () => {
    setCarregando(true);
    try {
      const { data } = await notificacaoService.listar({
        pagina,
        limite: 20,
        nao_lidas: apenasNaoLidas || undefined
      });
      setNotificacoes(data.notificacoes || []);
      setTotal(data.total || 0);
      setTotalPaginas(data.totalPaginas || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    setPagina(1);
  }, [apenasNaoLidas]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- carregar não é memoizada; incluí-la reexecutaria a cada render (revisar depois)
  useEffect(() => { carregar(); }, [pagina, apenasNaoLidas]);

  const navegarParaDemanda = (notif) => {
    if (notif.id_demanda) {
      navigate(`/demanda/${notif.id_demanda}`);
    }
  };

  const marcarLida = async (notif) => {
    if (notif.lido) {
      navegarParaDemanda(notif);
      return;
    }
    try {
      await notificacaoService.marcarLida(notif.id_notificacao);
      setNotificacoes(prev =>
        prev.map(n => n.id_notificacao === notif.id_notificacao ? { ...n, lido: 1 } : n)
      );
      navegarParaDemanda(notif);
    } catch (err) {
      console.error(err);
    }
  };

  const marcarTodasLidas = async () => {
    try {
      await notificacaoService.marcarTodasLidas();
      setNotificacoes(prev => prev.map(n => ({ ...n, lido: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const dataRelativa = (dataStr) => {
    const diff = Date.now() - new Date(dataStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d}d`;
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const naoLidasCount = notificacoes.filter(n => !n.lido).length;

  let conteudoNotificacoes;
  if (carregando) {
    conteudoNotificacoes = <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>;
  } else if (notificacoes.length === 0) {
    conteudoNotificacoes = (
      <div className="text-center py-12">
        <Bell className="mx-auto text-gray-300 mb-3" size={40} />
        <p className="text-gray-500 text-sm">Nenhuma notificação</p>
      </div>
    );
  } else {
    conteudoNotificacoes = (
      <div className="space-y-1">
        {notificacoes.map(notif => (
          <div
            key={notif.id_notificacao}
            onClick={() => marcarLida(notif)}
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
              notif.lido
                ? 'bg-white border-gray-100 hover:bg-gray-50'
                : 'bg-blue-50 border-blue-100 hover:bg-blue-100'
            }`}
          >
            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.lido ? 'bg-gray-300' : 'bg-blue-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${notif.lido ? 'text-gray-700' : 'text-gray-900'}`}>
                {notif.titulo_notificacao}
              </p>
              {notif.mensagem_notificacao && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.mensagem_notificacao}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {notif.numero_demanda && (
                  <span className="text-xs font-mono text-gray-400">{notif.numero_demanda}</span>
                )}
                <span className="text-xs text-gray-400">{dataRelativa(notif.data_criacao)}</span>
              </div>
            </div>
            {notif.link_acao && <ExternalLink size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="text-blue-600" size={24} />
            <div>
              <h1 className="text-xl font-bold text-gray-800">Notificações</h1>
              <p className="text-sm text-gray-500">{total} no total</p>
            </div>
          </div>
          {naoLidasCount > 0 && (
            <button
              onClick={marcarTodasLidas}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition"
            >
              <CheckCheck size={16} />
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setApenasNaoLidas(false)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              !apenasNaoLidas ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setApenasNaoLidas(true)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              apenasNaoLidas ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Não lidas
          </button>
        </div>

        {conteudoNotificacoes}

        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          contagem={notificacoes.length}
          onChange={setPagina}
        />
      </div>
    </Layout>
  );
}
