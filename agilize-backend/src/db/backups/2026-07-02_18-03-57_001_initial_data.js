// Gerado automaticamente por db:export em 2026-07-02 17:59:32
// NÃO edite manualmente — rode: npm run db:export

exports.seed = async function (knex) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[Seed 001] Ignorado em produção.');
    return;
  }

  // TRUNCATE CASCADE lida com todas as FKs automaticamente e reseta sequences
  await knex.raw(`
    TRUNCATE
      tb_inventario_aplicacoes,
      tb_diagnosticos_ia,
      tb_atribuicoes_gestor,
      tb_historico_decisoes,
      tb_notificacoes,
      email_logs,
      tb_demandas,
      tb_usuarios,
      tb_unidades,
      tb_departamentos
    RESTART IDENTITY CASCADE
  `);

  // ── Departamentos ──────────────────────────────────────────────────────────
  const _dept = {};
  [_dept["Procuradoria-Geral do Ministério Público Especial"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Procuradoria-Geral do Ministério Público Especial","descricao":"Ministério Público Especial junto ao Tribunal de Contas","ativo":true,"data_criacao":"2026-06-30T17:33:45.999Z"}).returning('*');
  [_dept["Secretaria de Sessões"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Secretaria de Sessões","descricao":"Gestão e suporte às sessões plenárias e colegiadas do Tribunal de Contas","ativo":true,"data_criacao":"2026-06-30T17:33:46.004Z"}).returning('*');
  [_dept["Secretaria de Serviços Processuais"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Secretaria de Serviços Processuais","descricao":"Gestão dos serviços processuais do TCE-CE","ativo":true,"data_criacao":"2026-06-30T17:33:46.007Z"}).returning('*');
  [_dept["Secretaria de Controle Externo"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Secretaria de Controle Externo","descricao":"Controle externo e fiscalização de entes públicos","ativo":true,"data_criacao":"2026-06-30T17:33:46.010Z"}).returning('*');
  [_dept["Secretaria de Administração"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Secretaria de Administração","descricao":"Gestão administrativa, de pessoas e recursos do TCE-CE","ativo":true,"data_criacao":"2026-06-30T17:33:46.013Z"}).returning('*');
  [_dept["Secretaria de Tecnologia da Informação"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Secretaria de Tecnologia da Informação","descricao":"Governança e operações de TI do TCE-CE","ativo":true,"data_criacao":"2026-06-30T17:33:46.015Z"}).returning('*');
  [_dept["Corregedoria"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Corregedoria","descricao":"Corregedoria do Tribunal de Contas do Estado do Ceará","ativo":true,"data_criacao":"2026-06-30T17:33:46.017Z"}).returning('*');
  [_dept["Presidência"]] = await knex('tb_departamentos')
    .insert({"nome_departamento":"Presidência","descricao":"Direção superior e representação institucional do Tribunal de Contas","ativo":true,"data_criacao":"2026-06-30T17:33:46.021Z"}).returning('*');

  // ── Unidades ───────────────────────────────────────────────────────────────
  const _unid = {};
  // Procuradoria-Geral do Ministério Público Especial
  [_unid["MPE-1P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"1ª Procuradoria do Ministério Público Especial","sigla":"MPE-1P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  [_unid["MPE-2P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"2ª Procuradoria do Ministério Público Especial","sigla":"MPE-2P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  [_unid["MPE-3P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"3ª Procuradoria do Ministério Público Especial","sigla":"MPE-3P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  [_unid["MPE-4P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"4ª Procuradoria do Ministério Público Especial","sigla":"MPE-4P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  [_unid["MPE-5P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"5ª Procuradoria do Ministério Público Especial","sigla":"MPE-5P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  [_unid["MPE-6P"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"6ª Procuradoria do Ministério Público Especial","sigla":"MPE-6P"}, id_departamento: _dept["Procuradoria-Geral do Ministério Público Especial"].id_departamento })
    .returning('*');
  // Secretaria de Sessões
  [_unid["SSE-DSS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Sessões","sigla":"SSE-DSS"}, id_departamento: _dept["Secretaria de Sessões"].id_departamento })
    .returning('*');
  [_unid["SSE-GAS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Apoio às Sessões","sigla":"SSE-GAS"}, id_departamento: _dept["Secretaria de Sessões"].id_departamento })
    .returning('*');
  [_unid["SSE-GCM"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Certidões, Débitos e Multas","sigla":"SSE-GCM"}, id_departamento: _dept["Secretaria de Sessões"].id_departamento })
    .returning('*');
  // Secretaria de Serviços Processuais
  [_unid["SSP-DSP"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Serviços Processuais","sigla":"SSP-DSP"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  [_unid["SSP-GPA"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Protocolo e Autuação","sigla":"SSP-GPA"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  [_unid["SSP-GCP"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Controle de Prazos","sigla":"SSP-GCP"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  [_unid["SSP-GCO"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Comunicações Oficiais","sigla":"SSP-GCO"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  [_unid["SSP-ARQ"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Unidade de Arquivo","sigla":"SSP-ARQ"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  [_unid["SSP-GED"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Unidade de Gestão Eletrônica de Documentos","sigla":"SSP-GED"}, id_departamento: _dept["Secretaria de Serviços Processuais"].id_departamento })
    .returning('*');
  // Secretaria de Controle Externo
  [_unid["SCE-APC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Apoio ao Controle Externo","sigla":"SCE-APC"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AII"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Informações Estratégicas e Inovação Tecnológica","sigla":"SCE-AII"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-APM"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Padrões, Métodos e Qualidade","sigla":"SCE-APM"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-GOV"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Secretaria Executiva de Governança e Avaliação de Resultados","sigla":"SCE-GOV"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CNT"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Secretaria Executiva de Contas","sigla":"SCE-CNT"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CG"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contas de Governo","sigla":"SCE-CG"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CG1"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contas de Gestão I","sigla":"SCE-CG1"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CG2"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contas de Gestão II","sigla":"SCE-CG2"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CG3"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contas de Gestão III","sigla":"SCE-CG3"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-CG4"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contas de Gestão IV","sigla":"SCE-CG4"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-REG"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Secretaria Executiva de Atos de Registro e Recursos","sigla":"SCE-REG"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AR1"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Atos de Registro I","sigla":"SCE-AR1"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AR2"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Atos de Registro II","sigla":"SCE-AR2"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AR3"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Atos de Registro III","sigla":"SCE-AR3"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-IRC1"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Instrução de Recursos e Consultas I","sigla":"SCE-IRC1"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-IRC2"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Instrução de Recursos e Consultas II","sigla":"SCE-IRC2"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AIC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Instrução de Cautelares","sigla":"SCE-AIC"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-ACO"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Acompanhamento de Contratações","sigla":"SCE-ACO"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AGP1"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Aprimoramento da Gestão Pública I","sigla":"SCE-AGP1"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AGP2"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Aprimoramento da Gestão Pública II","sigla":"SCE-AGP2"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AGP3"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Aprimoramento da Gestão Pública III","sigla":"SCE-AGP3"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-AIS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Aprimoramento da Infraestrutura e Sustentabilidade Ambiental","sigla":"SCE-AIS"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  [_unid["SCE-FIS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Secretaria Executiva de Fiscalização","sigla":"SCE-FIS","descricao":"Fiscalização de entidades e obras públicas"}, id_departamento: _dept["Secretaria de Controle Externo"].id_departamento })
    .returning('*');
  // Secretaria de Administração
  [_unid["SAD-AS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Saúde","sigla":"SAD-AS"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-APC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Planejamento de Contratações","sigla":"SAD-APC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-ACC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Assessoria de Contratos e Convênios","sigla":"SAD-ACC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-ENG"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Engenharia e Logística","sigla":"SAD-ENG"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-EOC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Execução Orçamentária e Contábil","sigla":"SAD-EOC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-EFI"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Execução Financeira","sigla":"SAD-EFI"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-MAC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Manutenção e Conservação","sigla":"SAD-MAC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-OE"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Obras e Serviços de Engenharia","sigla":"SAD-OE"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-TRN"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Transportes e Segurança","sigla":"SAD-TRN"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-MP"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Material e Patrimônio","sigla":"SAD-MP"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-AF"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Atos Funcionais","sigla":"SAD-AF"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-RB"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Remuneração e Benefícios","sigla":"SAD-RB"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-DPC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Gerência de Desenvolvimento de Pessoas e Carreiras","sigla":"SAD-DPC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-CPC"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Comissão Permanente de Contratação","sigla":"SAD-CPC"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-GP"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Gestão de Pessoas","sigla":"SAD-GP","descricao":"Gestão de pessoas e desenvolvimento organizacional"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  [_unid["SAD-CON"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Contabilidade e Finanças","sigla":"SAD-CON","descricao":"Gestão financeira e orçamentária"}, id_departamento: _dept["Secretaria de Administração"].id_departamento })
    .returning('*');
  // Secretaria de Tecnologia da Informação
  [_unid["STI-GOV"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Governança, Projetos e Aquisições de TI","sigla":"STI-GOV","descricao":"Análise e governança de soluções setoriais"}, id_departamento: _dept["Secretaria de Tecnologia da Informação"].id_departamento })
    .returning('*');
  [_unid["STI-DEV"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Desenvolvimento e Sustentação de Sistemas","sigla":"STI-DEV"}, id_departamento: _dept["Secretaria de Tecnologia da Informação"].id_departamento })
    .returning('*');
  [_unid["STI-OPS"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Operações","sigla":"STI-OPS","descricao":"Operações, deploy e infraestrutura de TI"}, id_departamento: _dept["Secretaria de Tecnologia da Informação"].id_departamento })
    .returning('*');
  [_unid["STI-ANA"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Diretoria de Soluções Analíticas","sigla":"STI-ANA"}, id_departamento: _dept["Secretaria de Tecnologia da Informação"].id_departamento })
    .returning('*');
  // Corregedoria
  [_unid["CORREGEDORIA"]] = await knex('tb_unidades')
    .insert({ ...{"nome_unidade":"Corregedoria","sigla":"CORREGEDORIA"}, id_departamento: _dept["Corregedoria"].id_departamento })
    .returning('*');

  // ── Usuários ───────────────────────────────────────────────────────────────
  await knex('tb_usuarios').insert({
    nome: "Jorge Alcoforado",
    email: "jorge@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "SOLICITANTE",
    perfis_secundarios: null,
    id_unidade: _unid["SAD-GP"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Administração"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.147Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.147Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Ana Paula Costa",
    email: "ana@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "SOLICITANTE",
    perfis_secundarios: null,
    id_unidade: _unid["SAD-CON"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Administração"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.150Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.150Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Maria Silva",
    email: "maria@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_UNIDADE",
    perfis_secundarios: null,
    id_unidade: _unid["SAD-GP"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Administração"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.153Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.153Z",
  });
  await knex('tb_usuarios').insert({
    nome: "João Santos",
    email: "joao@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "ANALISTA_STI",
    perfis_secundarios: JSON.stringify(["GESTOR_UNIDADE"]),
    id_unidade: _unid["STI-GOV"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.155Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.155Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Carlos Mendes",
    email: "carlos@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "RESPONSAVEL_PRODUCAO",
    perfis_secundarios: null,
    id_unidade: _unid["STI-OPS"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.160Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.160Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Fernanda Rocha",
    email: "fernanda@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_UNIDADE",
    perfis_secundarios: null,
    id_unidade: _unid["SCE-FIS"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Controle Externo"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.163Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.163Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Admin Agilize",
    email: "admin@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_SISTEMA",
    perfis_secundarios: null,
    id_unidade: _unid[null]?.id_unidade ?? null,
    id_departamento: _dept[null]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.165Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.165Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Beatriz Oliveira",
    email: "beatriz@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "DPO",
    perfis_secundarios: null,
    id_unidade: _unid["STI-GOV"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.167Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.167Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Pedro Henrique Lima",
    email: "pedro@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "SOLICITANTE",
    perfis_secundarios: null,
    id_unidade: _unid["SCE-FIS"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Controle Externo"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.168Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.168Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Luciana Ferreira",
    email: "luciana@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_UNIDADE",
    perfis_secundarios: null,
    id_unidade: _unid["SAD-CON"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Administração"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.170Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.170Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Rafael Oliveira",
    email: "rafael@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "SOLICITANTE",
    perfis_secundarios: null,
    id_unidade: _unid["STI-GOV"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.172Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.172Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Marcelo Andrade",
    email: "marcelo@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_DEPARTAMENTO",
    perfis_secundarios: null,
    id_unidade: _unid["SAD-GP"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Administração"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.174Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.174Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Sílvia Monteiro",
    email: "silvia@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_DEPARTAMENTO",
    perfis_secundarios: null,
    id_unidade: _unid["SCE-FIS"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Controle Externo"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.176Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.176Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Roberto Farias",
    email: "roberto@agilize.com.br",
    senha_hash: "$2a$10$2qO5Hl2p/9whpnPFGxn0uugFnNIz//30h2W68fAdatpf/F3..ISVS",
    perfil_principal: "GESTOR_UNIDADE",
    perfis_secundarios: JSON.stringify(["AVALIADOR_TECNICO"]),
    id_unidade: _unid["STI-ANA"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.178Z",
    data_ultima_atualizacao: "2026-07-02T16:25:21.636Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Beatriz Almeida",
    email: "dpo@agilize.com.br",
    senha_hash: "$2a$10$FiOU2iigKw7QxVB8G7zhiujfJM613j59Hp4gi3Hd.0a/KIv9yomty",
    perfil_principal: "DPO",
    perfis_secundarios: null,
    id_unidade: _unid[null]?.id_unidade ?? null,
    id_departamento: _dept[null]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:33:46.270Z",
    data_ultima_atualizacao: "2026-06-30T17:33:46.270Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Wladimir",
    email: "wladimir@agilize.com.br",
    senha_hash: "$2a$10$/mHsAUrzocYnCfTG.tnBQ.9lqXNhZH2mhJQdb9PhcA0ueJeDW7WKm",
    perfil_principal: "GESTOR_UNIDADE",
    perfis_secundarios: JSON.stringify(["AVALIADOR_TECNICO","RESPONSAVEL_PRODUCAO"]),
    id_unidade: _unid["STI-OPS"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-06-30T17:41:53.815Z",
    data_ultima_atualizacao: "2026-07-02T16:25:28.715Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Joana Alves",
    email: "joana@agilize.com.br",
    senha_hash: "$2a$10$72DJrr4.2es1RGyB5tPBVuXqL3i.lWxSTb.4r/VG1M3r9xDzEH5GW",
    perfil_principal: "ANALISTA_STI",
    perfis_secundarios: null,
    id_unidade: _unid["STI-GOV"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-07-01T17:19:55.508Z",
    data_ultima_atualizacao: "2026-07-01T17:19:55.508Z",
  });
  await knex('tb_usuarios').insert({
    nome: "Antonio Morais",
    email: "antonio@agilize.com.br",
    senha_hash: "$2a$10$jRBI33smH0rrmu6DvktrJO4uYlv17hvns4HSS2FGC43Y08t/Lh.Ye",
    perfil_principal: "AVALIADOR_TECNICO",
    perfis_secundarios: null,
    id_unidade: _unid["STI-DEV"]?.id_unidade ?? null,
    id_departamento: _dept["Secretaria de Tecnologia da Informação"]?.id_departamento ?? null,
    ativo: true,
    data_criacao: "2026-07-01T19:01:07.428Z",
    data_ultima_atualizacao: "2026-07-01T19:01:07.428Z",
  });
};
