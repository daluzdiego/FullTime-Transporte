/**
 * FULL TIME — BOOTSTRAP DE HOMOLOGAÇÃO ISOLADA (MVP)
 *
 * ATENÇÃO:
 * 1) Este arquivo deve ser executado em um PROJETO APPS SCRIPT NOVO E SEPARADO.
 * 2) NÃO execute no projeto publicado/produção: as propriedades FT_DATABASE_ID e
 *    FT_REGISTRY_DATABASE_ID são usadas pelo aplicativo e serão configuradas aqui.
 * 3) O script cria DUAS planilhas novas e grava somente IDs dessas planilhas nas
 *    propriedades do projeto atual. Não abre, limpa, altera ou exclui bases existentes.
 * 4) A carga inicial é fictícia e determinística: 20 motoristas, 10 cavalos,
 *    20 carretas, 10 conjuntos vinculados, 4 clientes, 4 políticas, 4 operações
 *    e 8 cargas. Reexecutar é bloqueado para evitar duplicação.
 *
 * Procedimento:
 * - Crie um projeto Apps Script novo chamado "Full Time — HOMOLOGAÇÃO MVP".
 * - Copie os arquivos do branch homologacao/mvp-isolado para esse projeto.
 * - Execute criarAmbienteHomologacaoFullTime().
 * - Guarde as URLs e restrinja o compartilhamento das duas planilhas.
 */

function criarAmbienteHomologacaoFullTime() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('FT_DATABASE_ID') || props.getProperty('FT_REGISTRY_DATABASE_ID')) {
    throw new Error('Este projeto já possui IDs de base Full Time. Por segurança, não vou criar nem substituir bases. Use um projeto Apps Script novo.');
  }

  const operationalSchemas = ftHomologacaoSchemasOperacionais_();
  const authSchemas = {
    USUARIOS: ['ID','LOGIN','NOME','PERFIL','SALT','HASH_SENHA','ATIVO','TROCAR_SENHA','CRIADO_EM'],
    AUDITORIA: ['DATA_HORA','LOGIN','ACAO','ENTIDADE','REGISTRO_ID','DETALHES']
  };

  const registry = SpreadsheetApp.create('FULL TIME — HOMOLOGAÇÃO MVP — Base Operacional');
  const auth = SpreadsheetApp.create('FULL TIME — HOMOLOGAÇÃO MVP — Acesso e Auditoria');

  try {
    ftHomologacaoCriarGuias_(registry, operationalSchemas);
    ftHomologacaoCriarGuias_(auth, authSchemas);
    ftHomologacaoPopular_(registry);
    criarAdminInicial_(auth.getSheetByName('USUARIOS'), 'Diego', 'Diego');

    props.setProperty('FT_REGISTRY_DATABASE_ID', registry.getId());
    props.setProperty('FT_DATABASE_ID', auth.getId());
    props.setProperty('FT_ENVIRONMENT', 'HOMOLOGACAO');

    const result = {
      sucesso: true,
      ambiente: 'HOMOLOGACAO',
      baseOperacional: registry.getUrl(),
      baseAcessoAuditoria: auth.getUrl(),
      registros: {
        motoristas: 20, cavalos: 10, carretas: 20, conjuntos: 10,
        clientes: 4, politicasCliente: 4, operacoes: 4, cargas: 8,
        filaMotoristas: 20
      },
      observacao: 'Somente dados fictícios. Nenhuma base preexistente foi aberta ou modificada.'
    };
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    // Se a inicialização falhar, não tenta apagar arquivos automaticamente:
    // preserva evidências para recuperação manual, sem tocar em outras bases.
    throw new Error('Falha ao montar a homologação. As planilhas recém-criadas foram preservadas para inspeção. Detalhe: ' + err.message);
  }
}

function ftHomologacaoSchemasOperacionais_() {
  return {
    MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAMINHOES: ['ID','CRIADO_EM','STATUS','PLACA','RENAVAM','MARCA','MODELO','ANO','TIPO_VEICULO','CAPACIDADE_TONELADAS','SITUACAO_DOCUMENTAL','OBSERVACOES'],
    CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    DOCUMENTOS_MOTORISTAS: ['ID','MOTORISTA_ID','TIPO_DOCUMENTO','NUMERO','VALIDADE','STATUS','OBSERVACOES'],
    DOCUMENTOS_FROTA: ['ID','TIPO_VEICULO','VEICULO_ID','TIPO_DOCUMENTO','NUMERO','VALIDADE','STATUS','OBSERVACOES'],
    CLIENTES: ['ID','CRIADO_EM','STATUS','NOME','CNPJ_FICTICIO','CONTATO','OBSERVACOES'],
    POLITICAS_CLIENTE: ['ID','CLIENTE_ID','STATUS','PRIORIDADE','CATEGORIAS_CNH_ACEITAS','TIPOS_CARRETA_ACEITOS','PESO_MAX_TONELADAS','EXIGE_DOCUMENTACAO_OK','OBSERVACOES'],
    OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_CARGAS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR'],
    CARGAS: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','HORARIO_PREVISTO','CLIENTE','ORIGEM','DESTINO','PESO_TONELADAS','DESCRICAO','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','CRIADO_POR','TIPO_OPERACAO','TICKET_CARREGAMENTO_URL','TICKET_DESCARGA_URL','VALOR_FRETE'],
    ESCALAS: ['ID','CRIADO_EM','STATUS','CARGA_ID','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','MOTIVO_SELECAO','INICIO_PREVISTO','FIM_PREVISTO','OBSERVACOES','MOTORISTA_NOME_SNAPSHOT','CAVALO_PLACA_SNAPSHOT','CARRETA_MEIO_PLACA_SNAPSHOT','CARRETA_FINAL_PLACA_SNAPSHOT'],
    HISTORICO_OPERACOES: ['ID','DATA_HORA','CARGA_ID','MOTORISTA_ID','ORIGEM','DESTINO','EVENTO','OBSERVACOES','REGISTRADO_POR'],
    TICKETS: ['ID','RECEBIDO_EM','WHATSAPP_MESSAGE_ID','TELEFONE_REMETENTE','MOTORISTA_ID','CARGA_ID','TIPO_TICKET','MEDIA_ID','DRIVE_FILE_ID','DRIVE_FILE_URL','NOME_ARQUIVO','MIME_TYPE','STATUS_LEITURA','DATA_HORA_EXTRAIDA','CONFIANCA_LEITURA','ERRO_VALIDACAO','RETENCAO_ATE','METADADOS_JSON'],
    DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
    FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_CARGA_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
    OFERTAS_CARGAS: ['ID','CRIADO_EM','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_FILA','STATUS_OFERTA','EXPIRA_EM','RESPONDIDO_EM','MOTIVO_RECUSA','CRIADO_POR'],
    EVENTOS_ESCALA: ['ID','DATA_HORA','TIPO_EVENTO','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_ANTERIOR','POSICAO_NOVA','MOTIVO','REGISTRADO_POR'],
    PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR'],
    MOVIMENTACOES_OPERACAO: ['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR'],
    LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES'],
    REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES']
  };
}

function ftHomologacaoCriarGuias_(ss, schemas) {
  const first = ss.getSheets()[0];
  const names = Object.keys(schemas);
  names.forEach(function(name, index) {
    const sh = index === 0 ? first : ss.insertSheet(name);
    sh.setName(name);
    const headers = schemas[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#eaf2ff')
      .setFontColor('#16345c').setWrap(true);
    sh.setTabColor('#1769e8');
    sh.autoResizeColumns(1, headers.length);
  });
}

function ftHomologacaoPopular_(ss) {
  const now = new Date();
  const add = function(name, rows) {
    if (!rows.length) return;
    const sh = ss.getSheetByName(name);
    sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  };
  const id = function(prefix, n) { return prefix + String(n).padStart(3, '0'); };
  const dataOperacao = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  const motoristas = [];
  const cavalos = [];
  const caminhoes = [];
  const carretas = [];
  const docsMotoristas = [];
  const docsFrota = [];
  const conjuntos = [];
  const fila = [];

  for (let i = 1; i <= 20; i++) {
    const n = String(i).padStart(2, '0');
    const driverId = id('MOT', i);
    motoristas.push([
      driverId, now, 'ATIVO', 'Motorista Fictício ' + n,
      '000.000.000-' + String(i).padStart(2, '0'), '+55 00 90000-' + String(1000 + i),
      'motorista' + n + '@exemplo.invalid', 'CNH-TESTE-' + n,
      i % 4 === 0 ? 'E' : 'D', new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()),
      'Rio Grande/RS', 'DADO FICTÍCIO — ambiente de homologação'
    ]);
    docsMotoristas.push([
      id('DOCM', i), driverId, 'CNH', 'CNH-TESTE-' + n,
      new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()), 'VALIDO', 'Documento fictício'
    ]);
    fila.push([
      id('FILA', i), new Date(now.getTime() + i * 60000), driverId,
      i <= 10 ? id('CJ', i) : '', 'ATIVO', '', '', 0, 'Posição inicial fictícia ' + i
    ]);
  }

  for (let i = 1; i <= 10; i++) {
    const n = String(i).padStart(2, '0');
    const horseId = id('CAV', i);
    const trailerA = id('CAR', i * 2 - 1);
    const trailerB = id('CAR', i * 2);
    const plateH = 'FTH' + String(1000 + i).slice(-4);
    const plateA = 'FTA' + String(2000 + i * 2 - 1).slice(-4);
    const plateB = 'FTB' + String(2000 + i * 2).slice(-4);
    const driverId = id('MOT', i);

    cavalos.push([
      horseId, now, 'ATIVO', plateH, 'Marca Fictícia', 'Cavalo ' + n, 2022 + (i % 4),
      9.2, 45 + (i % 3), 'PBTC informado como dado fictício para teste; validar regra legal em produção'
    ]);
    caminhoes.push([
      horseId, now, 'ATIVO', plateH, 'RENAVAM-TESTE-' + n, 'Marca Fictícia', 'Cavalo ' + n,
      2022 + (i % 4), 'CAVALO MECANICO', 28 + (i % 3) * 2, 'VALIDO',
      'Espelho de compatibilidade do cadastro CAVALOS; dado fictício'
    ]);
    carretas.push(
      [trailerA, now, 'ATIVO', plateA, 'GRANELEIRA', 7.0, 28 + (i % 3), 35 + (i % 3), 'Fictícia — homologação'],
      [trailerB, now, 'ATIVO', plateB, 'BAU', 7.5, 26 + (i % 3), 34 + (i % 3), 'Fictícia — homologação']
    );
    docsFrota.push(
      [id('DOCF', i * 3 - 2), 'CAVALO', horseId, 'CRLV', 'CRLV-TESTE-CAV-' + n, new Date(now.getFullYear() + 1, 11, 31), 'VALIDO', 'Documento fictício'],
      [id('DOCF', i * 3 - 1), 'CARRETA', trailerA, 'CRLV', 'CRLV-TESTE-CAR-' + n + 'A', new Date(now.getFullYear() + 1, 11, 31), 'VALIDO', 'Documento fictício'],
      [id('DOCF', i * 3), 'CARRETA', trailerB, 'CRLV', 'CRLV-TESTE-CAR-' + n + 'B', new Date(now.getFullYear() + 1, 11, 31), 'VALIDO', 'Documento fictício']
    );
    // CAPACIDADE_UTIL é um limite operacional fictício declarado para o cenário,
    // não uma soma de capacidades nominais de peças do conjunto.
    const capacidadeDeclarada = 28 + (i % 3) * 2;
    conjuntos.push([
      id('CJ', i), now, 'ATIVO', driverId, horseId, trailerA, trailerB,
      'Conjunto fictício completo ' + n, 'APTO', '', capacidadeDeclarada, 'SEED_HOMOLOGACAO'
    ]);
  }

  const clientes = [
    ['CLI001', now, 'ATIVO', 'Cliente Alfa Fictício', '00.000.000/0001-01', 'Contato Alfa — fictício', 'Aceita CNH D/E; até 28 t'],
    ['CLI002', now, 'ATIVO', 'Cliente Beta Fictício', '00.000.000/0001-02', 'Contato Beta — fictício', 'Exige CNH E; carreta graneleira; até 30 t'],
    ['CLI003', now, 'ATIVO', 'Cliente Gama Fictício', '00.000.000/0001-03', 'Contato Gama — fictício', 'Exige conjunto apto e documentação válida'],
    ['CLI004', now, 'ATIVO', 'Cliente Delta Fictício', '00.000.000/0001-04', 'Contato Delta — fictício', 'Operação padrão de homologação']
  ];
  const politicas = [
    ['POL001','CLI001','ATIVO',1,'D;E','GRANELEIRA;BAU',28,true,'Regra fictícia de teste'],
    ['POL002','CLI002','ATIVO',2,'E','GRANELEIRA',30,true,'Regra fictícia de teste'],
    ['POL003','CLI003','ATIVO',3,'D;E','GRANELEIRA;BAU',32,true,'Regra fictícia de teste'],
    ['POL004','CLI004','ATIVO',4,'D;E','GRANELEIRA;BAU',35,false,'Regra fictícia de teste']
  ];
  const operacoes = [];
  const cargas = [];
  const opClientes = ['CLI001','CLI002','CLI003','CLI004'];
  const cidades = [
    ['Rio Grande/RS','Canoas/RS'],['Pelotas/RS','Passo Fundo/RS'],
    ['Porto Alegre/RS','Santa Maria/RS'],['Caxias do Sul/RS','Rio Grande/RS']
  ];
  for (let i = 1; i <= 4; i++) {
    const opId = id('OP', i);
    const cliente = opClientes[i - 1];
    const origem = cidades[i - 1][0];
    const destino = cidades[i - 1][1];
    operacoes.push([
      opId, now, 'ABERTA', dataOperacao, cliente, 'Operação de teste ' + i,
      origem, destino, 'TRANSPORTE_DIRETO', 40, 2, 40,
      'Operação 100% fictícia para homologação', 'SEED_HOMOLOGACAO'
    ]);
    for (let j = 1; j <= 2; j++) {
      const cargaN = (i - 1) * 2 + j;
      cargas.push([
        id('CAR', 100 + cargaN), now, 'A_ESCALAR', dataOperacao,
        j === 1 ? '08:00' : '14:00', cliente, origem, destino, 20,
        'Carga fictícia ' + cargaN, '', '', '', '',
        'Não enviar para motorista real', 'SEED_HOMOLOGACAO',
        'TRANSPORTE_DIRETO', '', '', 0
      ]);
    }
  }

  add('MOTORISTAS', motoristas);
  add('CAVALOS', cavalos);
  add('CAMINHOES', caminhoes);
  add('CARRETAS', carretas);
  add('CONJUNTOS', conjuntos);
  add('DOCUMENTOS_MOTORISTAS', docsMotoristas);
  add('DOCUMENTOS_FROTA', docsFrota);
  add('CLIENTES', clientes);
  add('POLITICAS_CLIENTE', politicas);
  add('FILA_MOTORISTAS', fila);
  add('OPERACOES', operacoes);
  add('CARGAS', cargas);
}
