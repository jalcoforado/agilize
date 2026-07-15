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

// Converts File[] → AnexoInfo[] with base64 data URLs for backend storage
async function filesToBase64(files = []) {
  if (!files || !files.length) return undefined;
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              nome: file.name,
              tamanho: file.size,
              tipo: file.type || 'application/octet-stream',
              conteudo: reader.result,
            });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export const authService = {
  login: (email, senha) => apiClient.post('/auth/login', { email, senha }),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: () => apiClient.post('/auth/refresh-token'),
};

export const demandaService = {
  criar: (dados) => apiClient.post('/demandas', dados),
  atualizar: (id, dados) => apiClient.put(`/demandas/${id}`, dados),
  atualizarAnexos: (id, anexos) => apiClient.patch(`/demandas/${id}/anexos`, { anexos }),
  listar: (filtros = {}) => apiClient.get('/demandas', { params: filtros }),
  listarPorStatus: (statuses, outros = {}) =>
    apiClient.get('/demandas', { params: { ...outros, statusIn: statuses.join(',') } }),
  obter: (id) => apiClient.get(`/demandas/${id}`),

  // ─── Fase 1: Solicitação ────────────────────────────────────────────────────
  enviarParaGestor: (id) =>
    apiClient.post(`/demandas/${id}/enviar-gestor`),
  validarGestor: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/validar-gestor`, { parecer, comentario, anexos: await filesToBase64(files) }),
  devolver: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/devolver`, { parecer, comentario, anexos: await filesToBase64(files) }),
  iniciarAjuste: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-ajuste`),
  enviarParaSTI: (id) =>
    apiClient.post(`/demandas/${id}/enviar-sti`),
  aprovarSTI: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/aprovar-sti`, { parecer, comentario, anexos: await filesToBase64(files) }),
  reprovarSTI: async (id, motivo_rejeicao, parecer, files) =>
    apiClient.post(`/demandas/${id}/reprovar-sti`, { motivo_rejeicao, parecer, anexos: await filesToBase64(files) }),
  solicitarAjustesSTI: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/solicitar-ajustes-sti`, { parecer, comentario, anexos: await filesToBase64(files) }),
  reenviarParaSTI: (id) =>
    apiClient.post(`/demandas/${id}/reenviar-sti`),
  rejeitar: async (id, motivo_rejeicao, parecer, files) =>
    apiClient.post(`/demandas/${id}/rejeitar`, { motivo_rejeicao, parecer, anexos: await filesToBase64(files) }),
  rejeitarGestor: async (id, motivo_rejeicao, parecer, files) =>
    apiClient.post(`/demandas/${id}/rejeitar-gestor`, { motivo_rejeicao, parecer, anexos: await filesToBase64(files) }),

  // ─── Fase 2: Desenvolvimento ────────────────────────────────────────────────
  iniciarDesenvolvimento: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-desenvolvimento`),
  submeterProduto: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/submeter-produto`, { parecer, comentario, anexos: await filesToBase64(files) }),

  // ─── Fase 3: Homologação ────────────────────────────────────────────────────
  validarHomologacaoGestor: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/validar-homologacao-gestor`, { parecer, comentario, anexos: await filesToBase64(files) }),
  devolverHomologacao: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/devolver-homologacao`, { parecer, comentario, anexos: await filesToBase64(files) }),
  iniciarAjusteHomologacao: (id) =>
    apiClient.post(`/demandas/${id}/iniciar-ajuste-homologacao`),
  enviarHomologacaoSTI: (id) =>
    apiClient.post(`/demandas/${id}/enviar-homologacao-sti`),
  solicitarAjustesHomologacao: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/solicitar-ajustes-homologacao`, { parecer, comentario, anexos: await filesToBase64(files) }),
  homologar: async (id, parecer, comentario, tipo_deploy, id_unidade_producao, files) =>
    apiClient.post(`/demandas/${id}/homologar`, {
      parecer,
      comentario,
      tipo_deploy,
      ...(id_unidade_producao ? { id_unidade_producao: Number(id_unidade_producao) } : {}),
      anexos: await filesToBase64(files),
    }),
  rejeitarHomologacao: async (id, motivo_rejeicao, parecer, files) =>
    apiClient.post(`/demandas/${id}/rejeitar`, { motivo_rejeicao, parecer, anexos: await filesToBase64(files) }),
  reenviarHomologacaoSTI: (id) =>
    apiClient.post(`/demandas/${id}/reenviar-homologacao-sti`),

  // ─── Fase 4: Produção ────────────────────────────────────────────────────
  iniciarDeploy: async (id, parecer, files) =>
    apiClient.post(`/demandas/${id}/iniciar-deploy`, { parecer, anexos: await filesToBase64(files) }),
  confirmarDeploy: async (id, parecer, files) =>
    apiClient.post(`/demandas/${id}/confirmar-deploy`, { parecer, anexos: await filesToBase64(files) }),
  desativar: (id, motivo) =>
    apiClient.post(`/demandas/${id}/desativar`, { motivo }),

  // ─── Avaliador Técnico ────────────────────────────────────────────────────
  encaminharAvaliador: (id, id_unidade, comentario) =>
    apiClient.post(`/demandas/${id}/encaminhar-avaliador-tecnico`, { id_unidade, comentario }),
  avaliadorSolicitarAjustes: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/avaliador-solicitar-ajustes`, { parecer, comentario, anexos: await filesToBase64(files) }),
  avaliadorDevolverAnalista: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/avaliador-devolver-analista`, { parecer, comentario, anexos: await filesToBase64(files) }),

  // ─── DPO ────────────────────────────────────────────────────────────────────
  encaminharDPO: (id, comentario) =>
    apiClient.post(`/demandas/${id}/encaminhar-dpo`, { comentario }),
  dpoAprovar: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/dpo-aprovar`, { parecer, comentario, anexos: await filesToBase64(files) }),
  dpoSolicitarAjustes: async (id, parecer, comentario, files) =>
    apiClient.post(`/demandas/${id}/dpo-solicitar-ajustes`, { parecer, comentario, anexos: await filesToBase64(files) }),

  // ─── Transversal ────────────────────────────────────────────────────────────
  suspender: (id, motivo) =>
    apiClient.post(`/demandas/${id}/suspender`, { motivo }),

  retornarSuspensao: (id) =>
    apiClient.post(`/demandas/${id}/retornar-suspensao`),

  cancelar: (id, motivo) =>
    apiClient.post(`/demandas/${id}/cancelar`, { motivo }),
  obterHistorico: (id, pagina = 1) =>
    apiClient.get(`/demandas/${id}/historico`, { params: { pagina } }),
  obterDiagnostico: (id) =>
    apiClient.get(`/demandas/${id}/diagnostico`),
  atualizarPrioridade: (id, prioridade) =>
    apiClient.patch(`/demandas/${id}/prioridade`, { prioridade }),
  transferirLocacao: (id, id_unidade, motivo) =>
    apiClient.patch(`/demandas/${id}/transferir-locacao`, { id_unidade, motivo }),
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
  listarAvaliadores: () => apiClient.get('/usuarios/avaliadores'),
  listarDPOs: () => apiClient.get('/usuarios/dpos'),
  listarResponsaveisProducao: () => apiClient.get('/usuarios/responsaveis-producao'),
  listarUnidadesAvaliadores: () => apiClient.get('/usuarios/unidades-avaliadores'),
  listarUnidadesProducao: () => apiClient.get('/usuarios/unidades-producao'),
};

export const adminService = {
  listarUsuarios: (params = {}) => apiClient.get('/admin/usuarios', { params }),
  criarUsuario: (dados) => apiClient.post('/admin/usuarios', dados),
  atualizarUsuario: (id, dados) => apiClient.put(`/admin/usuarios/${id}`, dados),
  toggleAtivo: (id) => apiClient.patch(`/admin/usuarios/${id}/ativo`),
  listarUnidades: (id_departamento) => apiClient.get('/admin/unidades', { params: id_departamento ? { id_departamento } : undefined }),
  listarDepartamentos: () => apiClient.get('/admin/departamentos'),
  criarDepartamento: (dados) => apiClient.post('/admin/departamentos', dados),
  criarUnidade: (dados) => apiClient.post('/admin/unidades', dados),
  listarAtribuicoes: () => apiClient.get('/admin/atribuicoes'),
  criarAtribuicao: (id_gestor, id_unidade) => apiClient.post('/admin/atribuicoes', { id_gestor, id_unidade }),
  removerAtribuicao: (id) => apiClient.delete(`/admin/atribuicoes/${id}`),
  gestoresSemAtribuicao: () => apiClient.get('/admin/diagnostico/gestores-sem-atribuicao'),
};

export default apiClient;
