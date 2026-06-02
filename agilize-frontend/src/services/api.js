import axios from 'axios';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Só tenta refresh uma vez por request, e nunca para o próprio endpoint de refresh
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.includes('/auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return apiClient(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await apiClient.post('/auth/refresh-token');
        const newToken = data.token;
        localStorage.setItem('token', newToken);
        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        original.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, senha) => apiClient.post('/auth/login', { email, senha }),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: () => apiClient.post('/auth/refresh-token'),
};

export const demandaService = {
  criar: (dados) => apiClient.post('/demandas', dados),
  atualizar: (id, dados) => apiClient.put(`/demandas/${id}`, dados),
  listar: (filtros = {}) => apiClient.get('/demandas', { params: filtros }),
  listarPorStatus: (statuses, outros = {}) =>
    apiClient.get('/demandas', { params: { ...outros, statusIn: statuses.join(',') } }),
  obter: (id) => apiClient.get(`/demandas/${id}`),

  // ─── Fase 1: Solicitação ────────────────────────────────────────────────────
  enviarParaGestor: (id) =>
    apiClient.post(`/demandas/${id}/enviar-gestor`),
  validarGestor: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/validar-gestor`, { parecer, comentario }),
  devolver: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/devolver`, { parecer, comentario }),
  iniciarAjuste: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-ajuste`),
  enviarParaSTI: (id) =>
    apiClient.post(`/demandas/${id}/enviar-sti`),
  aprovarSTI: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/aprovar-sti`, { parecer, comentario }),
  reprovarSTI: (id, motivo_rejeicao, parecer) =>
    apiClient.post(`/demandas/${id}/reprovar-sti`, { motivo_rejeicao, parecer }),
  solicitarAjustesSTI: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/solicitar-ajustes-sti`, { parecer, comentario }),
  reenviarParaSTI: (id) =>
    apiClient.post(`/demandas/${id}/reenviar-sti`),
  rejeitar: (id, motivo_rejeicao, parecer) =>
    apiClient.post(`/demandas/${id}/rejeitar`, { motivo_rejeicao, parecer }),
  rejeitarGestor: (id, motivo_rejeicao, parecer) =>
    apiClient.post(`/demandas/${id}/rejeitar-gestor`, { motivo_rejeicao, parecer }),

  // ─── Fase 2: Desenvolvimento ────────────────────────────────────────────────
  iniciarDesenvolvimento: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-desenvolvimento`),
  submeterProduto: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/submeter-produto`, { parecer, comentario }),

  // ─── Fase 3: Homologação ────────────────────────────────────────────────────
  validarHomologacaoGestor: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/validar-homologacao-gestor`, { parecer, comentario }),
  devolverHomologacao: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/devolver-homologacao`, { parecer, comentario }),
  iniciarAjusteHomologacao: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-ajuste-homologacao`),
  enviarHomologacaoSTI: (id) =>
    apiClient.post(`/demandas/${id}/enviar-homologacao-sti`),
  solicitarAjustesHomologacao: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/solicitar-ajustes-homologacao`, { parecer, comentario }),
  homologar: (id, parecer, comentario, tipo_deploy) =>
    apiClient.post(`/demandas/${id}/homologar`, { parecer, comentario, tipo_deploy }),
  rejeitarHomologacao: (id, motivo_rejeicao, parecer) =>
    apiClient.post(`/demandas/${id}/rejeitar`, { motivo_rejeicao, parecer }),
  reenviarHomologacaoSTI: (id) =>
    apiClient.post(`/demandas/${id}/reenviar-homologacao-sti`),

  // ─── Fase 4: Produção ────────────────────────────────────────────────────
  iniciarDeploy: (id, parecer) =>
    apiClient.post(`/demandas/${id}/iniciar-deploy`, { parecer }),
  confirmarDeploy: (id, parecer) =>
    apiClient.post(`/demandas/${id}/confirmar-deploy`, { parecer }),
  desativar: (id, motivo) =>
    apiClient.post(`/demandas/${id}/desativar`, { motivo }),

  // ─── Diretor STI ────────────────────────────────────────────────────────────
  encaminharDiretor: (id, id_diretor, comentario) =>
    apiClient.post(`/demandas/${id}/encaminhar-diretor`, { id_diretor, comentario }),
  diretorSolicitarAjustes: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/diretor-solicitar-ajustes`, { parecer, comentario }),
  diretorDevolverAnalista: (id, parecer, comentario) =>
    apiClient.post(`/demandas/${id}/diretor-devolver-analista`, { parecer, comentario }),

  // ─── Transversal ────────────────────────────────────────────────────────────
  cancelar: (id, motivo) =>
    apiClient.post(`/demandas/${id}/cancelar`, { motivo }),
  obterHistorico: (id, pagina = 1) =>
    apiClient.get(`/demandas/${id}/historico`, { params: { pagina } }),
  obterDiagnostico: (id) =>
    apiClient.get(`/demandas/${id}/diagnostico`),
};

export const notificacaoService = {
  listar: (params = {}) => apiClient.get('/notificacoes', { params }),
  contarNaoLidas: () => apiClient.get('/notificacoes/nao-lidas/count'),
  marcarLida: (id) => apiClient.patch(`/notificacoes/${id}/lida`),
  marcarTodasLidas: () => apiClient.patch('/notificacoes/todas-lidas'),
};

export const relatorioService = {
  dashboard:      (params = {}) => apiClient.get('/relatorios/dashboard',       { params }),
  porStatus:      (params = {}) => apiClient.get('/relatorios/por-status',      { params }),
  porPrioridade:  (params = {}) => apiClient.get('/relatorios/por-prioridade',  { params }),
  porTipo:        (params = {}) => apiClient.get('/relatorios/por-tipo',        { params }),
  sla:            (params = {}) => apiClient.get('/relatorios/sla',             { params }),
  tempoPorEtapa:  (params = {}) => apiClient.get('/relatorios/tempo-por-etapa', { params }),
  porPeriodo:     (params = {}) => apiClient.get('/relatorios/por-periodo',     { params }),
  rankingUnidades:(params = {}) => apiClient.get('/relatorios/ranking-unidades',{ params }),
};

export const historicoService = {
  obter: (idDemanda, pagina = 1) =>
    apiClient.get(`/demandas/${idDemanda}/historico`, { params: { pagina } }),
};

export const usuarioService = {
  listarDiretores: () => apiClient.get('/usuarios/diretores'),
};

export const adminService = {
  listarUsuarios: (params = {}) => apiClient.get('/admin/usuarios', { params }),
  criarUsuario: (dados) => apiClient.post('/admin/usuarios', dados),
  atualizarUsuario: (id, dados) => apiClient.put(`/admin/usuarios/${id}`, dados),
  toggleAtivo: (id) => apiClient.patch(`/admin/usuarios/${id}/ativo`),
  listarUnidades: () => apiClient.get('/admin/unidades'),
  listarDepartamentos: (id_unidade) => apiClient.get('/admin/departamentos', { params: { id_unidade } }),
  listarAtribuicoes: () => apiClient.get('/admin/atribuicoes'),
  criarAtribuicao: (id_gestor, id_unidade) => apiClient.post('/admin/atribuicoes', { id_gestor, id_unidade }),
  removerAtribuicao: (id) => apiClient.delete(`/admin/atribuicoes/${id}`),
};

export default apiClient;
