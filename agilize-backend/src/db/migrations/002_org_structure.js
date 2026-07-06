// Estrutura organizacional do TCE-CE: secretarias como departamentos,
// diretorias/gerências/comissões como unidades.
exports.up = async function (knex) {
  const dept = async (nome, descricao) => {
    let d = await knex('tb_departamentos').where('nome_departamento', nome).first();
    if (!d) [d] = await knex('tb_departamentos').insert({ nome_departamento: nome, descricao }).returning('*');
    return d;
  };
  const unit = async (sigla, nome, id_departamento, descricao) => {
    const exists = await knex('tb_unidades').where('sigla', sigla).first();
    if (!exists) await knex('tb_unidades').insert({ sigla, nome_unidade: nome, id_departamento, descricao });
    else await knex('tb_unidades').where('sigla', sigla).update({ nome_unidade: nome, id_departamento });
  };

  const mpe = await dept('Procuradoria-Geral do Ministério Público Especial', 'Ministério Público Especial junto ao Tribunal de Contas');
  for (const [s, n] of [
    ['MPE-1P', '1ª Procuradoria do Ministério Público Especial'],
    ['MPE-2P', '2ª Procuradoria do Ministério Público Especial'],
    ['MPE-3P', '3ª Procuradoria do Ministério Público Especial'],
    ['MPE-4P', '4ª Procuradoria do Ministério Público Especial'],
    ['MPE-5P', '5ª Procuradoria do Ministério Público Especial'],
    ['MPE-6P', '6ª Procuradoria do Ministério Público Especial'],
  ]) await unit(s, n, mpe.id_departamento);

  const sse = await dept('Secretaria de Sessões', 'Gestão e apoio às sessões do Tribunal de Contas');
  for (const [s, n] of [
    ['SSE-DSS', 'Diretoria de Sessões'],
    ['SSE-GAS', 'Gerência de Apoio às Sessões'],
    ['SSE-GCM', 'Gerência de Certidões, Débitos e Multas'],
  ]) await unit(s, n, sse.id_departamento);

  const ssp = await dept('Secretaria de Serviços Processuais', 'Gestão de serviços processuais, protocolo, arquivo e documentos');
  for (const [s, n] of [
    ['SSP-DSP', 'Diretoria de Serviços Processuais'],
    ['SSP-GPA', 'Gerência de Protocolo e Autuação'],
    ['SSP-GCP', 'Gerência de Controle de Prazos'],
    ['SSP-GCO', 'Gerência de Comunicações Oficiais'],
    ['SSP-ARQ', 'Unidade de Arquivo'],
    ['SSP-GED', 'Unidade de Gestão Eletrônica de Documentos'],
  ]) await unit(s, n, ssp.id_departamento);

  const sce = await dept('Secretaria de Controle Externo', 'Controle externo e fiscalização de entes públicos');
  for (const [s, n] of [
    ['SCE-APC',  'Assessoria de Apoio ao Controle Externo'],
    ['SCE-AII',  'Assessoria de Informações Estratégicas e Inovação Tecnológica'],
    ['SCE-APM',  'Assessoria de Padrões, Métodos e Qualidade'],
    ['SCE-GOV',  'Secretaria Executiva de Governança e Avaliação de Resultados'],
    ['SCE-CNT',  'Secretaria Executiva de Contas'],
    ['SCE-CG',   'Diretoria de Contas de Governo'],
    ['SCE-CG1',  'Diretoria de Contas de Gestão I'],
    ['SCE-CG2',  'Diretoria de Contas de Gestão II'],
    ['SCE-CG3',  'Diretoria de Contas de Gestão III'],
    ['SCE-CG4',  'Diretoria de Contas de Gestão IV'],
    ['SCE-REG',  'Secretaria Executiva de Atos de Registro e Recursos'],
    ['SCE-AR1',  'Diretoria de Atos de Registro I'],
    ['SCE-AR2',  'Diretoria de Atos de Registro II'],
    ['SCE-AR3',  'Diretoria de Atos de Registro III'],
    ['SCE-IRC1', 'Diretoria de Instrução de Recursos e Consultas I'],
    ['SCE-IRC2', 'Diretoria de Instrução de Recursos e Consultas II'],
    ['SCE-FIS',  'Secretaria Executiva de Fiscalização'],
    ['SCE-AIC',  'Assessoria de Instrução de Cautelares'],
    ['SCE-ACO',  'Assessoria de Acompanhamento de Contratações'],
    ['SCE-AGP1', 'Diretoria de Aprimoramento da Gestão Pública I'],
    ['SCE-AGP2', 'Diretoria de Aprimoramento da Gestão Pública II'],
    ['SCE-AGP3', 'Diretoria de Aprimoramento da Gestão Pública III'],
    ['SCE-AIS',  'Diretoria de Aprimoramento da Infraestrutura e Sustentabilidade Ambiental'],
  ]) await unit(s, n, sce.id_departamento);

  const sad = await dept('Secretaria de Administração', 'Gestão administrativa, de pessoas e recursos do TCE-CE');
  for (const [s, n] of [
    ['SAD-AS',  'Assessoria de Saúde'],
    ['SAD-APC', 'Assessoria de Planejamento de Contratações'],
    ['SAD-ACC', 'Assessoria de Contratos e Convênios'],
    ['SAD-ENG', 'Diretoria de Engenharia e Logística'],
    ['SAD-GP',  'Diretoria de Gestão de Pessoas'],
    ['SAD-CON', 'Diretoria de Contabilidade e Finanças'],
    ['SAD-EOC', 'Gerência de Execução Orçamentária e Contábil'],
    ['SAD-EFI', 'Gerência de Execução Financeira'],
    ['SAD-MAC', 'Gerência de Manutenção e Conservação'],
    ['SAD-OE',  'Gerência de Obras e Serviços de Engenharia'],
    ['SAD-TRN', 'Gerência de Transportes e Segurança'],
    ['SAD-MP',  'Gerência de Material e Patrimônio'],
    ['SAD-AF',  'Gerência de Atos Funcionais'],
    ['SAD-RB',  'Gerência de Remuneração e Benefícios'],
    ['SAD-DPC', 'Gerência de Desenvolvimento de Pessoas e Carreiras'],
    ['SAD-CPC', 'Comissão Permanente de Contratação'],
  ]) await unit(s, n, sad.id_departamento);

  const sti = await dept('Secretaria de Tecnologia da Informação', 'Governança e operações de TI do TCE-CE');
  for (const [s, n] of [
    ['STI-GOV', 'Diretoria de Governança, Projetos e Aquisições de TI'],
    ['STI-DEV', 'Diretoria de Desenvolvimento e Sustentação de Sistemas'],
    ['STI-OPS', 'Diretoria de Operações'],
    ['STI-ANA', 'Diretoria de Soluções Analíticas'],
  ]) await unit(s, n, sti.id_departamento);

  const cor = await dept('Corregedoria', 'Corregedoria do Tribunal de Contas do Estado do Ceará');
  await unit('COR-DIR', 'Diretoria da Corregedoria', cor.id_departamento);

  const pre = await dept('Presidência', 'Direção superior e representação institucional do Tribunal de Contas');
  await unit('PRE-GAB', 'Gabinete da Presidência', pre.id_departamento);
};

exports.down = async function (knex) {
  const siglas = [
    'MPE-1P','MPE-2P','MPE-3P','MPE-4P','MPE-5P','MPE-6P',
    'SSE-DSS','SSE-GAS','SSE-GCM',
    'SSP-DSP','SSP-GPA','SSP-GCP','SSP-GCO','SSP-ARQ','SSP-GED',
    'SCE-APC','SCE-AII','SCE-APM','SCE-GOV','SCE-CNT','SCE-CG','SCE-CG1','SCE-CG2',
    'SCE-CG3','SCE-CG4','SCE-REG','SCE-AR1','SCE-AR2','SCE-AR3','SCE-IRC1','SCE-IRC2',
    'SCE-FIS','SCE-AIC','SCE-ACO','SCE-AGP1','SCE-AGP2','SCE-AGP3','SCE-AIS',
    'SAD-AS','SAD-APC','SAD-ACC','SAD-ENG','SAD-GP','SAD-CON','SAD-EOC','SAD-EFI',
    'SAD-MAC','SAD-OE','SAD-TRN','SAD-MP','SAD-AF','SAD-RB','SAD-DPC','SAD-CPC',
    'STI-GOV','STI-DEV','STI-OPS','STI-ANA',
    'COR-DIR','PRE-GAB',
  ];
  await knex('tb_unidades').whereIn('sigla', siglas).del();
  await knex('tb_departamentos').whereIn('nome_departamento', [
    'Procuradoria-Geral do Ministério Público Especial',
    'Secretaria de Sessões',
    'Secretaria de Serviços Processuais',
    'Secretaria de Controle Externo',
    'Secretaria de Administração',
    'Secretaria de Tecnologia da Informação',
    'Corregedoria',
    'Presidência',
  ]).del();
};
