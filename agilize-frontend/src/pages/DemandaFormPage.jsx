import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, BarChart2, Terminal, Cpu, Globe, Package, AlertCircle, Loader2, Paperclip, FileText, File, X, AlertTriangle } from 'lucide-react';
import { demandaService, adminService } from '../services/api';

function parseJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return {}; }
}
import Layout from '../components/Layout';

// ─── Configuração dos tipos ────────────────────────────────────────────────
const TIPOS_SOLUCAO = [
  {
    value: 'PAINEL_BI', label: 'Painel BI', Icon: BarChart2,
    desc: 'Power BI, Metabase, Superset — visualização e análise de dados',
    color: 'border-tce-300 bg-tce-50 text-tce-700', sel: 'border-tce-600 bg-tce-100 ring-2 ring-tce-300',
  },
  {
    value: 'SCRIPT', label: 'Script / Automação', Icon: Terminal,
    desc: 'Python, Bash, SQL — processamento, ETL ou automação de tarefas',
    color: 'border-amber-300 bg-amber-50 text-amber-700', sel: 'border-amber-500 bg-amber-100 ring-2 ring-amber-300',
  },
  {
    value: 'AGENTE_IA', label: 'Agente IA / Generativa', Icon: Cpu,
    desc: 'LLM, RAG, automação inteligente — consome tokens de modelo de linguagem',
    color: 'border-indigo-300 bg-indigo-50 text-indigo-700', sel: 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-300',
  },
  {
    value: 'SISTEMA_SIMPLES', label: 'Sistema / Aplicação', Icon: Globe,
    desc: 'Web, API, desktop — com banco de dados, autenticação e usuários',
    color: 'border-emerald-300 bg-emerald-50 text-emerald-700', sel: 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300',
  },
  {
    value: 'OUTRO', label: 'Outro', Icon: Package,
    desc: 'Solução que não se enquadra nas categorias acima',
    color: 'border-neutral-300 bg-neutral-50 text-neutral-600', sel: 'border-neutral-500 bg-neutral-100 ring-2 ring-neutral-300',
  },
];

const PRIORIDADES = [
  { value: 'BAIXA', label: 'Baixa', cls: 'bg-green-100  text-green-700' },
  { value: 'MEDIA', label: 'Média', cls: 'bg-yellow-100 text-yellow-700' },
  { value: 'ALTA', label: 'Alta', cls: 'bg-orange-100 text-orange-700' },
  { value: 'CRITICA', label: 'Crítica', cls: 'bg-red-100    text-red-700' },
];

const FREQUENCIAS = [
  { value: 'CONTINUO', label: 'Contínuo (24/7 — executa sempre)' },
  { value: 'DIARIO', label: 'Diário' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'PONTUAL', label: 'Pontual (uso único ou muito esporádico)' },
];

const ESTADO_VAZIO = {
  tipo_solucao: '', titulo: '', prioridade: 'MEDIA',
  id_unidade: '', id_departamento: '',
  descricao: '', justificativa: '',
  objetivo_principal: '', publico_alvo: '',
  frequencia_uso: '', quantidade_usuarios_estimada: '',
  tempo_estimado_horas: '', investimento_estimado: '',
  dep_internet: false, dep_dados_tce: false,
  dep_banco: false, dep_nome_banco: '',
  dep_git: false, dep_url_git: '',
  dep_apis: '', dep_sistemas: '', dep_outras: '',
  tec_ferramenta_bi: '', tec_fontes_dados: '',
  tec_freq_atualizacao: '', tec_conexao_direta: false, tec_banco_bi: '',
  tec_linguagem: '', tec_execucao: '', tec_agendamento: '', tec_escopo: '',
  tec_provedor_llm: '', tec_modelo_llm: '',
  tec_tokens_mes: '', tec_custo_llm_mes: '',
  tec_usa_rag: false, tec_fontes_rag: '',
  tec_acoes_autonomas: false, tec_desc_acoes: '',
  tec_memoria: false, tec_usa_git: false,
  tec_tipo_interface: '', tec_tecnologia: '',
  tec_banco_sistema: '', tec_usuarios_simult: '',
  tec_servidor_dedicado: false,
  tec_autenticacao: false, tec_tipo_auth: '',
  tec_expoe_api: false,
  tec_descricao_tech: '',
  solucao_em_uso: false,
  dados_sensiveis: null,
  dados_sensiveis_desc: '',
  impacta_outras_areas: false,
  areas_impactadas: '',
  usa_ia_desenvolvimento: false,
};

// Converte dados da API de volta para o estado do formulário
function apiParaForm(demanda) {
  const deps = demanda.dependencias_externas || {};
  const tec = demanda.dados_tecnicos || {};
  const tipo = demanda.tipo_solucao;

  let tecFlat = {};
  if (tipo === 'PAINEL_BI') {
    tecFlat = {
      tec_ferramenta_bi: tec.ferramenta_bi || '',
      tec_fontes_dados: tec.fontes_dados || '',
      tec_freq_atualizacao: tec.frequencia_atualizacao || '',
      tec_conexao_direta: !!tec.conexao_direta,
      tec_banco_bi: tec.banco_bi || '',
    };
  } else if (tipo === 'SCRIPT') {
    tecFlat = {
      tec_linguagem: tec.linguagem || '',
      tec_execucao: tec.execucao || '',
      tec_agendamento: tec.agendamento || '',
      tec_escopo: tec.escopo || '',
    };
  } else if (tipo === 'AGENTE_IA') {
    tecFlat = {
      tec_provedor_llm: tec.provedor_llm || '',
      tec_modelo_llm: tec.modelo_llm || '',
      tec_tokens_mes: tec.estimativa_tokens_mes != null ? String(tec.estimativa_tokens_mes) : '',
      tec_custo_llm_mes: tec.custo_llm_mes_estimado != null ? String(tec.custo_llm_mes_estimado) : '',
      tec_usa_rag: !!tec.usa_rag,
      tec_fontes_rag: tec.fontes_rag || '',
      tec_acoes_autonomas: !!tec.acoes_autonomas,
      tec_desc_acoes: tec.descricao_acoes || '',
      tec_memoria: !!tec.tem_memoria_persistente,
      tec_usa_git: !!tec.usa_git,
    };
  } else if (tipo === 'SISTEMA_SIMPLES') {
    tecFlat = {
      tec_tipo_interface: tec.tipo_interface || '',
      tec_tecnologia: tec.tecnologia || '',
      tec_banco_sistema: tec.banco_dados || '',
      tec_usuarios_simult: tec.usuarios_simultaneos != null ? String(tec.usuarios_simultaneos) : '',
      tec_servidor_dedicado: !!tec.requer_servidor_dedicado,
      tec_autenticacao: !!tec.tem_autenticacao,
      tec_tipo_auth: tec.tipo_autenticacao || '',
      tec_expoe_api: !!tec.expoe_api,
    };
  } else if (tipo === 'OUTRO') {
    tecFlat = { tec_descricao_tech: tec.descricao_tecnologia || '' };
  }

  return {
    ...ESTADO_VAZIO,
    tipo_solucao: demanda.tipo_solucao || '',
    titulo: demanda.titulo || '',
    prioridade: demanda.prioridade || 'MEDIA',
    id_unidade: demanda.id_unidade != null ? String(demanda.id_unidade) : '',
    id_departamento: demanda.id_departamento != null ? String(demanda.id_departamento) : '',
    descricao: demanda.descricao || '',
    justificativa: demanda.justificativa || '',
    objetivo_principal: demanda.objetivo_principal || '',
    publico_alvo: demanda.publico_alvo || '',
    frequencia_uso: demanda.frequencia_uso || '',
    quantidade_usuarios_estimada: demanda.quantidade_usuarios_estimada != null ? String(demanda.quantidade_usuarios_estimada) : '',
    tempo_estimado_horas: demanda.tempo_estimado_horas != null ? String(demanda.tempo_estimado_horas) : '',
    investimento_estimado: demanda.investimento_estimado != null ? String(demanda.investimento_estimado) : '',
    dep_internet: !!deps.usa_internet,
    dep_dados_tce: !!deps.usa_dados_tcece,
    dep_banco: !!deps.acesso_banco_dados,
    dep_nome_banco: deps.nome_banco || '',
    dep_git: !!deps.repositorio_git,
    dep_url_git: deps.url_repositorio || '',
    dep_apis: deps.apis_externas || '',
    dep_sistemas: deps.sistemas_integrados || '',
    dep_outras: deps.outras || '',
    solucao_em_uso: !!demanda.solucao_em_uso,
    dados_sensiveis: demanda.dados_sensiveis === true || demanda.dados_sensiveis === false ? demanda.dados_sensiveis : null,
    dados_sensiveis_desc: demanda.dados_sensiveis_desc || '',
    impacta_outras_areas: !!demanda.impacta_outras_areas,
    areas_impactadas: demanda.areas_impactadas || '',
    usa_ia_desenvolvimento: !!demanda.usa_ia_desenvolvimento,
    ...tecFlat,
  };
}

// ─── Componentes de formulário ─────────────────────────────────────────────
function Secao({ titulo, sub, children }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
        <h2 className="text-sm font-semibold text-neutral-700 tracking-tight">{titulo}</h2>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function Campo({ label, obrigatorio, children, erro, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}{obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !erro && <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>}
      {erro && <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1"><AlertCircle size={11} />{erro}</p>}
    </div>
  );
}

function Chk({ checked, onChange, label, children }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-tce-600 focus:ring-tce-500 cursor-pointer" />
      <div className="flex-1">
        <span className="text-sm text-neutral-700">{label}</span>
        {children}
      </div>
    </label>
  );
}

function PerguntaCritica({ label, desc, value, onChange, erro, children }) {
  return (
    <div className={`rounded-xl border-2 p-4 transition ${erro ? 'border-red-400 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex items-start gap-2.5">
        <AlertTriangle size={19} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-neutral-800">
            {label}<span className="text-red-500 ml-0.5">*</span>
          </p>
          {desc && <p className="mt-1 text-xs text-neutral-500">{desc}</p>}
          <div className="mt-3 flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={value === true} onChange={() => onChange(true)}
                className="h-4 w-4 text-tce-600 focus:ring-tce-500 cursor-pointer" />
              <span className="text-sm font-medium text-neutral-700">Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={value === false} onChange={() => onChange(false)}
                className="h-4 w-4 text-tce-600 focus:ring-tce-500 cursor-pointer" />
              <span className="text-sm font-medium text-neutral-700">Não</span>
            </label>
          </div>
          {children}
          {erro && <p className="mt-2 text-[11px] text-red-600 flex items-center gap-1"><AlertCircle size={11} />{erro}</p>}
        </div>
      </div>
    </div>
  );
}

function ic(erro) {
  return `w-full px-3.5 py-2.5 border rounded-lg text-sm text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition ${erro ? 'border-red-400 bg-red-50' : 'border-neutral-300'
    }`;
}

// ─── Configuração técnica por tipo ─────────────────────────────────────────
function TecnicoBI({ f, set, erros }) {
  return (
    <Secao titulo="Configuração técnica — Painel BI" sub="Detalhes sobre a ferramenta e os dados utilizados">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Ferramenta de BI" obrigatorio erro={erros.tec_ferramenta_bi}>
          <select className={ic(erros.tec_ferramenta_bi)} value={f.tec_ferramenta_bi} onChange={e => set('tec_ferramenta_bi', e.target.value)}>
            <option value="">Selecione...</option>
            {['Power BI', 'Metabase', 'Apache Superset', 'Looker Studio', 'Tableau', 'Outro'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Campo>
        <Campo label="Frequência de atualização dos dados">
          <select className={ic()} value={f.tec_freq_atualizacao} onChange={e => set('tec_freq_atualizacao', e.target.value)}>
            <option value="">Selecione...</option>
            {[['TEMPO_REAL', 'Tempo real'], ['HORARIA', 'Horária'], ['DIARIA', 'Diária'], ['SEMANAL', 'Semanal'], ['MANUAL', 'Manual/sob demanda']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Campo>
      </div>
      <Campo label="Fontes de dados" obrigatorio erro={erros.tec_fontes_dados}
        hint="Descreva os bancos, planilhas, APIs ou sistemas de onde os dados serão extraídos">
        <textarea className={ic(erros.tec_fontes_dados) + ' resize-none'} rows={3}
          value={f.tec_fontes_dados} onChange={e => set('tec_fontes_dados', e.target.value)}
          placeholder="Ex: Banco SIAFEM (SQL Server), planilhas Excel da gerência, API do Portal de Transparência" />
      </Campo>
      <Chk checked={f.tec_conexao_direta} onChange={v => set('tec_conexao_direta', v)}
        label="Conexão direta com banco de dados (não usa camada de dados intermediária)">
        {f.tec_conexao_direta && (
          <input className={`mt-1.5 ${ic()}`} value={f.tec_banco_bi} onChange={e => set('tec_banco_bi', e.target.value)}
            placeholder="Ex: SQL Server do SIAFEM, PostgreSQL da STI" />
        )}
      </Chk>
    </Secao>
  );
}

function TecnicoScript({ f, set, erros }) {
  return (
    <Secao titulo="Configuração técnica — Script / Automação" sub="Linguagem, modo de execução e escopo">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Linguagem principal" obrigatorio erro={erros.tec_linguagem}>
          <select className={ic(erros.tec_linguagem)} value={f.tec_linguagem} onChange={e => set('tec_linguagem', e.target.value)}>
            <option value="">Selecione...</option>
            {['Python', 'Bash / Shell', 'PowerShell', 'SQL', 'JavaScript / Node.js', 'R', 'Outro'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Campo>
        <Campo label="Modo de execução" obrigatorio erro={erros.tec_execucao}>
          <select className={ic(erros.tec_execucao)} value={f.tec_execucao} onChange={e => set('tec_execucao', e.target.value)}>
            <option value="">Selecione...</option>
            <option value="MANUAL">Manual (usuário executa quando precisa)</option>
            <option value="AGENDADO">Agendado (cron / scheduler)</option>
            <option value="EVENTO">Disparado por evento</option>
          </select>
        </Campo>
      </div>
      {f.tec_execucao === 'AGENDADO' && (
        <Campo label="Descrição do agendamento" hint="Ex: toda segunda-feira às 7h, ou todo dia 1º do mês">
          <input className={ic()} value={f.tec_agendamento} onChange={e => set('tec_agendamento', e.target.value)}
            placeholder="Descreva a frequência ou a expressão cron" />
        </Campo>
      )}
      <Campo label="Escopo de execução" obrigatorio erro={erros.tec_escopo}>
        <select className={ic(erros.tec_escopo)} value={f.tec_escopo} onChange={e => set('tec_escopo', e.target.value)}>
          <option value="">Selecione...</option>
          <option value="LOCAL">Máquina local / workstation do usuário</option>
          <option value="SERVIDOR_INTERNO">Servidor interno da STI</option>
          <option value="CLOUD">Nuvem / serviço externo</option>
        </select>
      </Campo>
    </Secao>
  );
}

function TecnicoAgenteIA({ f, set, erros }) {
  return (
    <Secao titulo="Configuração técnica — Agente IA / Generativa"
      sub="Modelo de linguagem, custos estimados e capacidades autônomas">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Provedor LLM" obrigatorio erro={erros.tec_provedor_llm}>
          <select className={ic(erros.tec_provedor_llm)} value={f.tec_provedor_llm} onChange={e => set('tec_provedor_llm', e.target.value)}>
            <option value="">Selecione...</option>
            {['Anthropic (Claude)', 'OpenAI (GPT-4 / o1)', 'Google (Gemini)', 'Meta (Llama — local/Ollama)', 'Azure OpenAI', 'AWS Bedrock', 'Outro'].map(v => <option key={v}>{v}</option>)}
          </select>
        </Campo>
        <Campo label="Modelo específico" hint="Ex: claude-3-5-sonnet, gpt-4o, gemini-1.5-pro">
          <input className={ic()} value={f.tec_modelo_llm} onChange={e => set('tec_modelo_llm', e.target.value)}
            placeholder="Nome do modelo ou versão" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Estimativa de tokens por mês" hint="Total de input + output tokens">
          <input type="number" min={0} className={ic()} value={f.tec_tokens_mes}
            onChange={e => set('tec_tokens_mes', e.target.value)} placeholder="Ex: 5000000" />
        </Campo>
        <Campo label="Custo estimado LLM por mês (R$)" hint="Considere câmbio e taxas">
          <input type="number" min={0} step={0.01} className={ic()} value={f.tec_custo_llm_mes}
            onChange={e => set('tec_custo_llm_mes', e.target.value)} placeholder="Ex: 150,00" />
        </Campo>
      </div>
      <div className="space-y-3 pt-1">
        <Chk checked={f.tec_usa_rag} onChange={v => set('tec_usa_rag', v)}
          label="Usa RAG (Retrieval Augmented Generation) — consulta base de conhecimento própria">
          {f.tec_usa_rag && (
            <textarea className={`mt-1.5 ${ic()} resize-none`} rows={2} value={f.tec_fontes_rag}
              onChange={e => set('tec_fontes_rag', e.target.value)}
              placeholder="Descreva os documentos ou bases de dados indexadas (ex: PDFs de auditoria, acórdãos)" />
          )}
        </Chk>
        <Chk checked={f.tec_acoes_autonomas} onChange={v => set('tec_acoes_autonomas', v)}
          label="Executa ações autônomas (envia e-mail, grava em banco, chama APIs, acessa sistemas)">
          {f.tec_acoes_autonomas && (
            <textarea className={`mt-1.5 ${ic()} resize-none`} rows={2} value={f.tec_desc_acoes}
              onChange={e => set('tec_desc_acoes', e.target.value)}
              placeholder="Descreva quais ações o agente pode executar sem intervenção humana" />
          )}
        </Chk>
        <Chk checked={f.tec_memoria} onChange={v => set('tec_memoria', v)}
          label="Tem memória persistente entre sessões (armazena histórico de conversas ou estado)" />
        <Chk checked={f.tec_usa_git} onChange={v => set('tec_usa_git', v)}
          label="Código-fonte versionado em repositório Git" />
      </div>
    </Secao>
  );
}

function TecnicoSistema({ f, set, erros }) {
  return (
    <Secao titulo="Configuração técnica — Sistema / Aplicação" sub="Tecnologias, autenticação e integrações">
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Tipo de interface" obrigatorio erro={erros.tec_tipo_interface}>
          <select className={ic(erros.tec_tipo_interface)} value={f.tec_tipo_interface} onChange={e => set('tec_tipo_interface', e.target.value)}>
            <option value="">Selecione...</option>
            <option value="WEB">Aplicação Web (browser)</option>
            <option value="API">API REST / GraphQL</option>
            <option value="DESKTOP">Aplicação Desktop</option>
            <option value="CLI">Interface de Linha de Comando</option>
          </select>
        </Campo>
        <Campo label="Tecnologias principais" hint="Ex: React + Node.js, Python/FastAPI, PHP/Laravel">
          <input className={ic()} value={f.tec_tecnologia} onChange={e => set('tec_tecnologia', e.target.value)}
            placeholder="Frontend + backend + banco de dados" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Campo label="Banco de dados utilizado">
          <input className={ic()} value={f.tec_banco_sistema} onChange={e => set('tec_banco_sistema', e.target.value)}
            placeholder="Ex: PostgreSQL, MySQL, SQLite, MongoDB" />
        </Campo>
        <Campo label="Usuários simultâneos estimados">
          <input type="number" min={1} className={ic()} value={f.tec_usuarios_simult}
            onChange={e => set('tec_usuarios_simult', e.target.value)} placeholder="Ex: 20" />
        </Campo>
      </div>
      <div className="space-y-3 pt-1">
        <Chk checked={f.tec_servidor_dedicado} onChange={v => set('tec_servidor_dedicado', v)}
          label="Requer servidor dedicado (não funciona como serverless ou em workstation)" />
        <Chk checked={f.tec_autenticacao} onChange={v => set('tec_autenticacao', v)}
          label="Tem autenticação de usuários">
          {f.tec_autenticacao && (
            <select className={`mt-1.5 ${ic()}`} value={f.tec_tipo_auth} onChange={e => set('tec_tipo_auth', e.target.value)}>
              <option value="">Tipo de autenticação...</option>
              <option value="SSO_TCE">SSO TCE-CE (login único institucional)</option>
              <option value="LDAP">LDAP / Active Directory</option>
              <option value="LOCAL">Login local (usuário e senha próprios)</option>
              <option value="OAUTH">OAuth / OpenID Connect</option>
            </select>
          )}
        </Chk>
        <Chk checked={f.tec_expoe_api} onChange={v => set('tec_expoe_api', v)}
          label="Expõe API para consumo por outros sistemas do TCE-CE" />
      </div>
    </Secao>
  );
}

function TecnicoOutro({ f, set, erros }) {
  return (
    <Secao titulo="Configuração técnica" sub="Descreva a abordagem tecnológica da solução">
      <Campo label="Descrição da tecnologia / abordagem" obrigatorio erro={erros.tec_descricao_tech}
        hint="Explique quais tecnologias, linguagens ou ferramentas serão utilizadas">
        <textarea className={ic(erros.tec_descricao_tech) + ' resize-none'} rows={4}
          value={f.tec_descricao_tech} onChange={e => set('tec_descricao_tech', e.target.value)}
          placeholder="Descreva as tecnologias, plataformas, bibliotecas ou abordagens técnicas" />
      </Campo>
    </Secao>
  );
}

function ProgressoForm({ f }) {
  let tecConcluida;
  if (f.tipo_solucao === 'PAINEL_BI') tecConcluida = !!(f.tec_ferramenta_bi && f.tec_fontes_dados);
  else if (f.tipo_solucao === 'SCRIPT') tecConcluida = !!(f.tec_linguagem && f.tec_execucao && f.tec_escopo);
  else if (f.tipo_solucao === 'AGENTE_IA') tecConcluida = !!f.tec_provedor_llm;
  else if (f.tipo_solucao === 'SISTEMA_SIMPLES') tecConcluida = !!f.tec_tipo_interface;
  else if (f.tipo_solucao === 'OUTRO') tecConcluida = f.tec_descricao_tech?.length >= 20;
  else tecConcluida = false;

  const passos = [
    { label: 'Tipo', ok: !!f.tipo_solucao },
    { label: 'Identificação', ok: !!(f.titulo?.length >= 10 && f.id_unidade && f.id_departamento && f.prioridade) },
    { label: 'Contexto', ok: !!(f.descricao?.length >= 50 && f.objetivo_principal?.length >= 30 && f.publico_alvo?.length >= 10 && f.frequencia_uso && parseInt(f.quantidade_usuarios_estimada) >= 1) },
    { label: 'Técnico', ok: tecConcluida },
  ];
  const concluidos = passos.filter(p => p.ok).length;

  return (
    <div className="mb-6 bg-white rounded-xl border border-neutral-200 px-5 py-3.5">
      <div className="flex items-center gap-3">
        {passos.map((passo, i) => (
          <React.Fragment key={passo.label}>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${passo.ok ? 'bg-tce-700 text-white' : 'bg-neutral-200 text-neutral-500'
                }`}>
                {passo.ok ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${passo.ok ? 'text-tce-700' : 'text-neutral-400'}`}>
                {passo.label}
              </span>
            </div>
            {i < passos.length - 1 && (
              <div className={`flex-1 h-0.5 rounded-full transition-colors ${passo.ok ? 'bg-tce-300' : 'bg-neutral-200'}`} />
            )}
          </React.Fragment>
        ))}
        <span className="ml-2 shrink-0 text-xs text-neutral-400">{concluidos}/4</span>
      </div>
    </div>
  );
}

// ─── Upload de anexos da solicitação ──────────────────────────────────────────
const MAX_ANEXOS_FORM = 3;
const MAX_MB_FORM = 5;
const EXT_CORES = {
  pdf: 'text-red-500 bg-red-50 border-red-200', doc: 'text-blue-600 bg-blue-50 border-blue-200',
  docx: 'text-blue-600 bg-blue-50 border-blue-200', xls: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  xlsx: 'text-emerald-600 bg-emerald-50 border-emerald-200', ppt: 'text-orange-500 bg-orange-50 border-orange-200',
  pptx: 'text-orange-500 bg-orange-50 border-orange-200', txt: 'text-neutral-500 bg-neutral-100 border-neutral-200',
  csv: 'text-teal-600 bg-teal-50 border-teal-200', png: 'text-violet-500 bg-violet-50 border-violet-200',
  jpg: 'text-violet-500 bg-violet-50 border-violet-200', jpeg: 'text-violet-500 bg-violet-50 border-violet-200',
};
function extLabel(nome) { return nome.split('.').pop()?.toUpperCase() || 'ARQ'; }
function extCor(nome) { return EXT_CORES[nome.split('.').pop()?.toLowerCase()] || 'text-neutral-400 bg-neutral-50 border-neutral-200'; }
function fmtMB(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}
function IconeExt({ nome }) {
  const ext = nome.split('.').pop()?.toLowerCase();
  const Ic = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'csv'].includes(ext) ? FileText : File;
  return <Ic size={14} className={extCor(nome).split(' ')[0]} />;
}
function AnexosSolicitacao({ existentes, novos, onNovos, erroAnexo, setErroAnexo }) {
  const fileRef = useRef(null);
  const total = existentes.length + novos.length;
  const vagos = MAX_ANEXOS_FORM - total;
  const sufixoVagos = vagos !== 1 ? 's' : '';
  const textoBotaoAnexo = total === 0 ? 'Clique para anexar documentos' : `Adicionar mais (${vagos} vaga${sufixoVagos} restante${sufixoVagos})`;
  const pode = vagos > 0;

  const onSelect = (e) => {
    const selecionados = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selecionados.length) return;
    const candidatos = selecionados.slice(0, vagos);
    let erro = '';
    const validos = [];
    for (const f of candidatos) {
      if (f.size > MAX_MB_FORM * 1_048_576) { erro = `"${f.name}" excede ${MAX_MB_FORM} MB e foi ignorado.`; }
      else if (novos.some(a => a.name === f.name && a.size === f.size)) { erro = `"${f.name}" já está anexado.`; }
      else { validos.push(f); }
    }
    setErroAnexo(erro);
    if (validos.length) onNovos([...novos, ...validos]);
  };

  const removerNovo = (idx) => { onNovos(novos.filter((_, i) => i !== idx)); setErroAnexo(''); };

  return (
    <Secao titulo="Documentos da solicitação" sub={`Opcional · máx. ${MAX_ANEXOS_FORM} arquivos · ${MAX_MB_FORM} MB cada — PDF, Word, Excel, imagens...`}>
      <input ref={fileRef} type="file" multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
        className="hidden" onChange={onSelect} />

      {/* Arquivos já salvos no banco (modo edição) */}
      {existentes.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {existentes.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
              <IconeExt nome={a.nome} />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide ${extCor(a.nome)}`}>{extLabel(a.nome)}</span>
              <p className="flex-1 text-xs font-medium text-neutral-600 truncate min-w-0">{a.nome}</p>
              <p className="text-[11px] text-neutral-400 shrink-0 tabular-nums">{fmtMB(a.tamanho)}</p>
              <span className="text-[10px] text-neutral-400 italic shrink-0">salvo</span>
            </div>
          ))}
        </div>
      )}

      {/* Arquivos novos selecionados */}
      {novos.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {novos.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-white border border-neutral-200 rounded-lg px-3 py-2 group">
              <IconeExt nome={f.name} />
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide ${extCor(f.name)}`}>{extLabel(f.name)}</span>
              <p className="flex-1 text-xs font-medium text-neutral-700 truncate min-w-0">{f.name}</p>
              <p className="text-[11px] text-neutral-400 shrink-0 tabular-nums">{fmtMB(f.size)}</p>
              <button type="button" onClick={() => removerNovo(i)}
                className="text-neutral-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botão de adição */}
      {pode && (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-neutral-300 hover:border-tce-400 hover:bg-tce-50 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-tce-600 transition">
          <Paperclip size={13} />
          {textoBotaoAnexo}
        </button>
      )}
      {total === MAX_ANEXOS_FORM && (
        <p className="text-[11px] text-neutral-400 mt-1">Limite de {MAX_ANEXOS_FORM} documentos atingido.</p>
      )}
      {erroAnexo && (
        <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5">
          <AlertTriangle size={11} className="shrink-0" />{erroAnexo}
        </p>
      )}
    </Secao>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
function lerArquivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ nome: file.name, tamanho: file.size, tipo: file.type, conteudo: reader.result });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DemandaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const modoEdicao = !!id;

  const [carregando, setCarregando] = useState(modoEdicao);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState('');
  const [erros, setErros] = useState({});
  const [arquivosNovos, setArquivosNovos] = useState([]);
  const [arquivosExistentes, setArquivosExistentes] = useState([]);
  const [erroAnexo, setErroAnexo] = useState('');

  const jwt = parseJwt(localStorage.getItem('token') || '');
  const idUnidadeUsuario = jwt.id_unidade != null ? String(jwt.id_unidade) : '';
  const idDepartamentoUsuario = jwt.id_departamento != null ? String(jwt.id_departamento) : '';

  const [f, setF] = useState({
    ...ESTADO_VAZIO,
    id_unidade: idUnidadeUsuario,
    id_departamento: idDepartamentoUsuario,
  });
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [siglaUnidade, setSiglaUnidade] = useState('');
  const [nomeDepartamento, setNomeDepartamento] = useState('');

  useEffect(() => {
    if (!idUnidadeUsuario) return;
    adminService.listarUnidades()
      .then(r => {
        const u = r.data.unidades.find(u => String(u.id_unidade) === idUnidadeUsuario);
        if (u) { setNomeUnidade(u.nome_unidade); setSiglaUnidade(u.sigla); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idUnidadeUsuario intencionalmente fora (deve rodar só na montagem); revisar depois
  }, []);

  useEffect(() => {
    if (!idUnidadeUsuario || !idDepartamentoUsuario) return;
    adminService.listarDepartamentos()
      .then(r => {
        const d = r.data.departamentos.find(d => String(d.id_departamento) === idDepartamentoUsuario);
        if (d) setNomeDepartamento(d.nome_departamento);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idDepartamentoUsuario/idUnidadeUsuario intencionalmente fora (deve rodar só na montagem); revisar depois
  }, []);

  useEffect(() => {
    if (!modoEdicao) return;
    demandaService.obter(id)
      .then(({ data }) => {
        const demanda = data.demanda;
        if (!['DRAFT', 'SOLICITANTE_AJUSTANDO'].includes(demanda.status_atual)) {
          setErroGeral('Esta solicitação não pode ser editada no status atual.');
          return;
        }
        setF(apiParaForm(demanda));
        if (Array.isArray(demanda.anexos) && demanda.anexos.length) {
          setArquivosExistentes(demanda.anexos);
        }
      })
      .catch(() => setErroGeral('Erro ao carregar os dados da solicitação.'))
      .finally(() => setCarregando(false));
  }, [id, modoEdicao]);

  const set = (campo, valor) => {
    setF(prev => ({ ...prev, [campo]: valor }));
    if (erros[campo]) setErros(e => ({ ...e, [campo]: '' }));
  };

  const buildPayload = () => {
    const deps = {
      usa_internet: f.dep_internet,
      usa_dados_tcece: f.dep_dados_tce,
      acesso_banco_dados: f.dep_banco,
      ...(f.dep_banco && f.dep_nome_banco && { nome_banco: f.dep_nome_banco }),
      repositorio_git: f.dep_git,
      ...(f.dep_git && f.dep_url_git && { url_repositorio: f.dep_url_git }),
      ...(f.dep_apis && { apis_externas: f.dep_apis }),
      ...(f.dep_sistemas && { sistemas_integrados: f.dep_sistemas }),
      ...(f.dep_outras && { outras: f.dep_outras }),
    };

    let tec = {};
    switch (f.tipo_solucao) {
      case 'PAINEL_BI':
        tec = {
          ferramenta_bi: f.tec_ferramenta_bi, fontes_dados: f.tec_fontes_dados,
          frequencia_atualizacao: f.tec_freq_atualizacao, conexao_direta: f.tec_conexao_direta,
          ...(f.tec_conexao_direta && { banco_bi: f.tec_banco_bi })
        };
        break;
      case 'SCRIPT':
        tec = {
          linguagem: f.tec_linguagem, execucao: f.tec_execucao,
          escopo: f.tec_escopo,
          ...(f.tec_execucao === 'AGENDADO' && { agendamento: f.tec_agendamento })
        };
        break;
      case 'AGENTE_IA':
        tec = {
          provedor_llm: f.tec_provedor_llm, modelo_llm: f.tec_modelo_llm,
          estimativa_tokens_mes: f.tec_tokens_mes ? parseInt(f.tec_tokens_mes) : null,
          custo_llm_mes_estimado: f.tec_custo_llm_mes ? parseFloat(f.tec_custo_llm_mes) : null,
          usa_rag: f.tec_usa_rag, ...(f.tec_usa_rag && { fontes_rag: f.tec_fontes_rag }),
          acoes_autonomas: f.tec_acoes_autonomas,
          ...(f.tec_acoes_autonomas && { descricao_acoes: f.tec_desc_acoes }),
          tem_memoria_persistente: f.tec_memoria, usa_git: f.tec_usa_git
        };
        break;
      case 'SISTEMA_SIMPLES':
        tec = {
          tipo_interface: f.tec_tipo_interface, tecnologia: f.tec_tecnologia,
          banco_dados: f.tec_banco_sistema,
          usuarios_simultaneos: f.tec_usuarios_simult ? parseInt(f.tec_usuarios_simult) : null,
          requer_servidor_dedicado: f.tec_servidor_dedicado,
          tem_autenticacao: f.tec_autenticacao,
          ...(f.tec_autenticacao && { tipo_autenticacao: f.tec_tipo_auth }),
          expoe_api: f.tec_expoe_api
        };
        break;
      case 'OUTRO':
        tec = { descricao_tecnologia: f.tec_descricao_tech };
        break;
    }

    return {
      titulo: f.titulo, descricao: f.descricao,
      justificativa: f.justificativa || undefined,
      tipo_solucao: f.tipo_solucao, prioridade: f.prioridade,
      id_unidade: parseInt(f.id_unidade), id_departamento: parseInt(f.id_departamento),
      objetivo_principal: f.objetivo_principal, publico_alvo: f.publico_alvo,
      frequencia_uso: f.frequencia_uso,
      quantidade_usuarios_estimada: parseInt(f.quantidade_usuarios_estimada),
      tempo_estimado_horas: f.tempo_estimado_horas ? parseInt(f.tempo_estimado_horas) : undefined,
      investimento_estimado: f.investimento_estimado ? parseFloat(f.investimento_estimado) : undefined,
      dependencias_externas: deps,
      dados_tecnicos: tec,
      solucao_em_uso: f.solucao_em_uso,
      dados_sensiveis: f.dados_sensiveis,
      dados_sensiveis_desc: f.dados_sensiveis && f.dados_sensiveis_desc ? f.dados_sensiveis_desc : undefined,
      impacta_outras_areas: f.impacta_outras_areas,
      areas_impactadas: f.impacta_outras_areas && f.areas_impactadas ? f.areas_impactadas : undefined,
      usa_ia_desenvolvimento: f.tipo_solucao === 'AGENTE_IA' ? true : f.usa_ia_desenvolvimento,
    };
  };

  const validar = () => {
    const e = {};
    if (!f.tipo_solucao) e.tipo_solucao = 'Selecione o tipo de solução';
    if (!f.titulo || f.titulo.length < 10) e.titulo = 'Mínimo 10 caracteres';
    if (!f.prioridade) e.prioridade = 'Selecione a prioridade';
    if (!f.id_unidade) e.id_unidade = 'Seu usuário não está vinculado a uma unidade. Contate o administrador.';
    if (!f.id_departamento) e.id_departamento = 'Seu usuário não está vinculado a um departamento. Contate o administrador.';
    if (!f.descricao || f.descricao.length < 50) e.descricao = 'Mínimo 50 caracteres';
    if (!f.objetivo_principal || f.objetivo_principal.length < 30) e.objetivo_principal = 'Mínimo 30 caracteres';
    if (!f.publico_alvo || f.publico_alvo.length < 10) e.publico_alvo = 'Mínimo 10 caracteres';
    if (!f.frequencia_uso) e.frequencia_uso = 'Selecione a frequência';
    if (!f.quantidade_usuarios_estimada || parseInt(f.quantidade_usuarios_estimada) < 1) e.quantidade_usuarios_estimada = 'Informe pelo menos 1';
    if (f.dados_sensiveis !== true && f.dados_sensiveis !== false) e.dados_sensiveis = 'Selecione Sim ou Não';
    if (f.tipo_solucao === 'PAINEL_BI') {
      if (!f.tec_ferramenta_bi) e.tec_ferramenta_bi = 'Selecione a ferramenta';
      if (!f.tec_fontes_dados) e.tec_fontes_dados = 'Descreva as fontes de dados';
    }
    if (f.tipo_solucao === 'SCRIPT') {
      if (!f.tec_linguagem) e.tec_linguagem = 'Selecione a linguagem';
      if (!f.tec_execucao) e.tec_execucao = 'Selecione o modo';
      if (!f.tec_escopo) e.tec_escopo = 'Selecione o escopo';
    }
    if (f.tipo_solucao === 'AGENTE_IA') {
      if (!f.tec_provedor_llm) e.tec_provedor_llm = 'Selecione o provedor';
    }
    if (f.tipo_solucao === 'SISTEMA_SIMPLES') {
      if (!f.tec_tipo_interface) e.tec_tipo_interface = 'Selecione o tipo';
    }
    if (f.tipo_solucao === 'OUTRO') {
      if (!f.tec_descricao_tech || f.tec_descricao_tech.length < 20) e.tec_descricao_tech = 'Mínimo 20 caracteres';
    }
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSalvando(true); setErroGeral('');
    try {
      const novosBase64 = arquivosNovos.length
        ? await Promise.all(arquivosNovos.map(lerArquivoComoBase64))
        : [];
      const todosAnexos = [...arquivosExistentes, ...novosBase64];
      const payload = { ...buildPayload(), ...(todosAnexos.length ? { anexos: todosAnexos } : {}) };
      if (modoEdicao) {
        await demandaService.atualizar(id, payload);
        navigate(`/demanda/${id}`);
      } else {
        const { data } = await demandaService.criar(payload);
        navigate(`/demanda/${data.demanda.id_demanda}`);
      }
    } catch (err) {
      setErroGeral(err.response?.data?.message || 'Erro ao salvar a solicitação. Tente novamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 gap-3 text-neutral-400">
          <Loader2 size={24} className="animate-spin text-tce-500" />
          <span className="text-sm">Carregando solicitação...</span>
        </div>
      </Layout>
    );
  }

  const tipoInfo = TIPOS_SOLUCAO.find(t => t.value === f.tipo_solucao);
  const voltarUrl = modoEdicao ? `/demanda/${id}` : '/dashboard';

  let placeholderTitulo;
  if (tipoInfo?.value === 'AGENTE_IA') placeholderTitulo = 'Ex: Agente de análise de contratos com Claude';
  else if (tipoInfo?.value === 'PAINEL_BI') placeholderTitulo = 'Ex: Painel de acompanhamento de licitações — GEFIN';
  else placeholderTitulo = 'Descreva brevemente a solução';

  let textoUnidade;
  if (siglaUnidade && nomeUnidade) textoUnidade = `${siglaUnidade} — ${nomeUnidade}`;
  else if (nomeUnidade) textoUnidade = nomeUnidade;
  else textoUnidade = idUnidadeUsuario ? 'Carregando...' : 'Não vinculado';

  const textoDepartamento = nomeDepartamento || (idDepartamentoUsuario ? 'Carregando...' : 'Não vinculado');

  let textoBotaoSalvar;
  if (salvando) textoBotaoSalvar = 'Salvando...';
  else if (modoEdicao) textoBotaoSalvar = 'Salvar alterações';
  else textoBotaoSalvar = 'Criar solicitação';

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(voltarUrl)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
              {modoEdicao ? 'Editar Solicitação' : 'Nova Solicitação'}
            </h1>
            <p className="text-neutral-500 text-sm mt-0.5">
              {modoEdicao
                ? 'Atualize os dados da solicitação antes de reenviar'
                : 'Preencha os dados para subsidiar a análise da STI'}
            </p>
          </div>
        </div>

        {erroGeral && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {erroGeral}
          </div>
        )}

        <ProgressoForm f={f} />

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── 1. Tipo de solução ── */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-sm font-semibold text-neutral-700 tracking-tight">
                Tipo de solução <span className="text-red-500">*</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">Escolha o que melhor descreve o que será construído — isso determina os campos técnicos exibidos</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TIPOS_SOLUCAO.map(({ value, label, desc, Icon, color, sel }) => (
                <button key={value} type="button" onClick={() => set('tipo_solucao', value)}
                  className={`text-left rounded-xl border-2 p-3.5 transition-all ${f.tipo_solucao === value ? sel : 'border-neutral-200 bg-white hover:border-neutral-300'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${f.tipo_solucao === value ? color : 'bg-neutral-100 text-neutral-500'}`}>
                    <Icon size={16} />
                  </div>
                  <p className={`text-sm font-semibold leading-tight ${f.tipo_solucao === value ? color.split(' ').find(c => c.startsWith('text-')) : 'text-neutral-700'}`}>{label}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">{desc}</p>
                </button>
              ))}
            </div>
            {erros.tipo_solucao && (
              <p className="px-6 pb-4 text-[11px] text-red-600 flex items-center gap-1">
                <AlertCircle size={11} />{erros.tipo_solucao}
              </p>
            )}
          </div>

          {f.tipo_solucao && (<>

            {/* ── 2. Identificação ── */}
            <Secao titulo="Identificação" sub="Nome, prioridade e localização no organograma">
              <Campo label="Título da solicitação" obrigatorio erro={erros.titulo}
                hint="Seja específico — o título aparece em todas as listagens e notificações">
                <input className={ic(erros.titulo)} value={f.titulo}
                  onChange={e => set('titulo', e.target.value)} maxLength={255}
                  placeholder={placeholderTitulo} />
                <p className="text-right text-[11px] text-neutral-400 mt-0.5">{f.titulo.length}/255</p>
              </Campo>

              <div className="grid grid-cols-3 gap-4">
                <Campo label="Prioridade" obrigatorio erro={erros.prioridade}>
                  <select className={ic(erros.prioridade)} value={f.prioridade} onChange={e => set('prioridade', e.target.value)}>
                    {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Campo>
                <Campo label="Unidade" obrigatorio erro={erros.id_unidade}>
                  <div className={`${ic(erros.id_unidade || !idUnidadeUsuario)} cursor-default ${(erros.id_unidade || !idUnidadeUsuario) ? 'text-red-600' : 'bg-neutral-50 text-neutral-500'}`}>
                    {textoUnidade}
                  </div>
                </Campo>
                <Campo label="Departamento" obrigatorio erro={erros.id_departamento}>
                  <div className={`${ic(erros.id_departamento || !idDepartamentoUsuario)} cursor-default ${(erros.id_departamento || !idDepartamentoUsuario) ? 'text-red-600' : 'bg-neutral-50 text-neutral-500'}`}>
                    {textoDepartamento}
                  </div>
                </Campo>
              </div>
            </Secao>

            {/* ── 3. Contexto e impacto ── */}
            <Secao titulo="Contexto e impacto" sub="O que resolve, quem usa e com que frequência — base para a análise de viabilidade da STI">
              <Campo label="Descrição detalhada" obrigatorio erro={erros.descricao}
                hint="Descreva o problema atual, o processo que será afetado e o que a solução vai fazer">
                <textarea className={ic(erros.descricao) + ' resize-none'} rows={4}
                  value={f.descricao} onChange={e => set('descricao', e.target.value)} maxLength={5000}
                  placeholder="Explique o contexto, o problema que a solução resolve e como ela funcionará (mín. 50 caracteres)" />
                <p className="text-right text-[11px] text-neutral-400 mt-0.5">{f.descricao.length}/5000</p>
              </Campo>

              <Campo label="Objetivo principal" obrigatorio erro={erros.objetivo_principal}
                hint="Qual resultado concreto se espera? Seja direto e mensurável quando possível">
                <textarea className={ic(erros.objetivo_principal) + ' resize-none'} rows={2}
                  value={f.objetivo_principal} onChange={e => set('objetivo_principal', e.target.value)} maxLength={2000}
                  placeholder="Ex: Reduzir o tempo de consolidação mensal de dados de 3 dias para 2 horas" />
              </Campo>

              <Campo label="Justificativa">
                <textarea className={ic() + ' resize-none'} rows={2}
                  value={f.justificativa} onChange={e => set('justificativa', e.target.value)} maxLength={5000}
                  placeholder="Por que agora? Há legislação, auditoria ou demanda institucional que motiva?" />
              </Campo>

              <div className="grid grid-cols-3 gap-4">
                <Campo label="Público-alvo" obrigatorio erro={erros.publico_alvo}>
                  <input className={ic(erros.publico_alvo)} value={f.publico_alvo}
                    onChange={e => set('publico_alvo', e.target.value)}
                    placeholder="Ex: Auditores da GEFIN" />
                </Campo>
                <Campo label="Frequência de uso" obrigatorio erro={erros.frequencia_uso}>
                  <select className={ic(erros.frequencia_uso)} value={f.frequencia_uso} onChange={e => set('frequencia_uso', e.target.value)}>
                    <option value="">Selecione...</option>
                    {FREQUENCIAS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Campo>
                <Campo label="Usuários estimados" obrigatorio erro={erros.quantidade_usuarios_estimada}>
                  <input type="number" min={1} className={ic(erros.quantidade_usuarios_estimada)}
                    value={f.quantidade_usuarios_estimada} onChange={e => set('quantidade_usuarios_estimada', e.target.value)}
                    placeholder="Ex: 15" />
                </Campo>
              </div>
            </Secao>

            {/* ── 4. Configuração técnica (dinâmica) ── */}
            {f.tipo_solucao === 'PAINEL_BI' && <TecnicoBI f={f} set={set} erros={erros} />}
            {f.tipo_solucao === 'SCRIPT' && <TecnicoScript f={f} set={set} erros={erros} />}
            {f.tipo_solucao === 'AGENTE_IA' && <TecnicoAgenteIA f={f} set={set} erros={erros} />}
            {f.tipo_solucao === 'SISTEMA_SIMPLES' && <TecnicoSistema f={f} set={set} erros={erros} />}
            {f.tipo_solucao === 'OUTRO' && <TecnicoOutro f={f} set={set} erros={erros} />}

            {/* ── 5. Avaliação de risco e impacto ── */}
            <Secao
              titulo="Avaliação de risco e impacto"
              sub="Contexto de segurança, privacidade e abrangência — usado pela STI na análise de viabilidade"
            >
              <div className="space-y-3">
                <Chk
                  checked={f.solucao_em_uso}
                  onChange={v => set('solucao_em_uso', v)}
                  label="Essa solução já está atualmente em uso."
                />

                <Chk
                  checked={f.impacta_outras_areas}
                  onChange={v => set('impacta_outras_areas', v)}
                  label="Impacta outras áreas além da unidade solicitante"
                >
                  {f.impacta_outras_areas && (
                    <input
                      className={`mt-1.5 ${ic()}`}
                      value={f.areas_impactadas}
                      onChange={e => set('areas_impactadas', e.target.value)}
                      placeholder="Ex: Financeiro, Jurídico, Procuradoria"
                    />
                  )}
                </Chk>

                <PerguntaCritica
                  label="Esta solução envolve dados sensíveis ou protegidos?"
                  desc="Considere CPF, RG, dados de saúde, informações financeiras, sigilo funcional ou qualquer dado que identifique uma pessoa (LGPD, Art. 5º)."
                  value={f.dados_sensiveis}
                  onChange={v => set('dados_sensiveis', v)}
                  erro={erros.dados_sensiveis}
                >
                  {f.dados_sensiveis === true && (
                    <textarea
                      className={`mt-3 ${ic()} resize-none`}
                      rows={2}
                      value={f.dados_sensiveis_desc}
                      onChange={e => set('dados_sensiveis_desc', e.target.value)}
                      placeholder="Descreva o tipo de dado (ex: CPF, dados de saúde, sigilo funcional — LGPD Art. 5º)"
                    />
                  )}
                </PerguntaCritica>

                {f.tipo_solucao !== 'AGENTE_IA' && (
                  <Chk
                    checked={f.usa_ia_desenvolvimento}
                    onChange={v => set('usa_ia_desenvolvimento', v)}
                    label="Usa IA / LLM no desenvolvimento da solução (ex: GitHub Copilot, Claude, ChatGPT)"
                  />
                )}
              </div>
            </Secao>

            {/* ── 6. Dependências externas ── */}
            <Secao titulo="Dependências externas"
              sub="Marque tudo que a solução vai precisar — a STI usa isso para avaliar impacto de infraestrutura e segurança">
              <div className="space-y-3">
                <Chk checked={f.dep_internet} onChange={v => set('dep_internet', v)}
                  label="Acessa a internet (requisições a endpoints externos)" />
                <Chk checked={f.dep_dados_tce} onChange={v => set('dep_dados_tce', v)}
                  label="Acessa dados internos do TCE-CE (bancos, SharePoint, sistemas legados)" />
                <Chk checked={f.dep_banco} onChange={v => set('dep_banco', v)}
                  label="Usa banco de dados (além do que já foi informado na configuração técnica)">
                  {f.dep_banco && (
                    <input className={`mt-1.5 ${ic()}`} value={f.dep_nome_banco}
                      onChange={e => set('dep_nome_banco', e.target.value)}
                      placeholder="Nome do banco / instância (Ex: PostgreSQL — geoprocessamento)" />
                  )}
                </Chk>
                <Chk checked={f.dep_git} onChange={v => set('dep_git', v)}
                  label="Usa repositório Git">
                  {f.dep_git && (
                    <input className={`mt-1.5 ${ic()}`} value={f.dep_url_git}
                      onChange={e => set('dep_url_git', e.target.value)}
                      placeholder="URL do repositório (se já existir)" />
                  )}
                </Chk>
              </div>

              <div className="pt-1 space-y-3">
                <Campo label="APIs externas consumidas"
                  hint="Liste as APIs de terceiros ou portais públicos que a solução vai chamar">
                  <textarea className={ic() + ' resize-none'} rows={2} value={f.dep_apis}
                    onChange={e => set('dep_apis', e.target.value)}
                    placeholder="Ex: API do Portal Nacional de Contratações Públicas (PNCP), API do IBGE" />
                </Campo>
                <Campo label="Sistemas internos integrados"
                  hint="Outros sistemas do TCE-CE ou do governo que serão consultados ou modificados">
                  <textarea className={ic() + ' resize-none'} rows={2} value={f.dep_sistemas}
                    onChange={e => set('dep_sistemas', e.target.value)}
                    placeholder="Ex: SIAFEM, e-Aud, Portal de Transparência TCE-CE" />
                </Campo>
                <Campo label="Outras dependências ou observações de infraestrutura">
                  <input className={ic()} value={f.dep_outras} onChange={e => set('dep_outras', e.target.value)}
                    placeholder="Ex: Requer acesso VPN, precisa de IP fixo, necessita de certificado SSL" />
                </Campo>
              </div>
            </Secao>

            {/* ── 6. Estimativas ── */}
            <Secao titulo="Estimativas" sub="Valores aproximados para planejamento — podem ser revisados durante a análise">
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Tempo de desenvolvimento estimado (horas)">
                  <input type="number" min={1} className={ic()} value={f.tempo_estimado_horas}
                    onChange={e => set('tempo_estimado_horas', e.target.value)} placeholder="Ex: 40" />
                </Campo>
                <Campo label="Investimento em hardware / licenças (R$)"
                  hint="Não inclua custo de pessoas — apenas infraestrutura e licenças">
                  <input type="number" min={0} step={0.01} className={ic()} value={f.investimento_estimado}
                    onChange={e => set('investimento_estimado', e.target.value)} placeholder="0,00" />
                </Campo>
              </div>
            </Secao>

            {/* ── 7. Documentos da solicitação ── */}
            <AnexosSolicitacao
              existentes={arquivosExistentes}
              novos={arquivosNovos}
              onNovos={setArquivosNovos}
              erroAnexo={erroAnexo}
              setErroAnexo={setErroAnexo}
            />

            {/* ── Ações ── */}
            <div className="flex gap-3 justify-end pt-2 pb-4">
              <button type="button" onClick={() => navigate(voltarUrl)}
                className="px-5 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={salvando}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-tce-700 text-white rounded-lg hover:bg-tce-800 active:bg-tce-900 focus:outline-none focus:ring-2 focus:ring-tce-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition">
                <Save size={15} />
                {textoBotaoSalvar}
              </button>
            </div>

          </>)}
        </form>
      </div>
    </Layout>
  );
}
