/**
 * FULL TIME — CENTRALIZAÇÃO DEFINITIVA + RECONSTRUÇÃO FICTÍCIA
 * Executar uma vez: FT_CENTRAL_PREPARAR_E_RECONSTRUIR_TESTES_20261111()
 *
 * Fonte única: planilha principal Full Time.
 * A base de autenticação permanece separada e intacta.
 * A planilha do Bruno é desconectada; nenhum dado dela é lido ou importado.
 */
const FT_CENTRAL_CFG_20261111 = Object.freeze({
  MAIN_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  BRUNO_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  PREFIX: 'FT-TESTE-20261111-'
});

function FT_CENTRAL_PREPARAR_E_RECONSTRUIR_TESTES_20261111() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.openById(FT_CENTRAL_CFG_20261111.MAIN_ID);
  const authId = props.getProperty('FT_DATABASE_ID');
  if (!authId || authId === FT_CENTRAL_CFG_20261111.MAIN_ID) {
    throw new Error('Base de autenticação ausente ou não separada. Interrompi antes de limpar qualquer guia.');
  }

  // Snapshot integral da planilha principal antes de qualquer limpeza.
  const backup = DriveApp.getFileById(FT_CENTRAL_CFG_20261111.MAIN_ID)
    .makeCopy('BACKUP_FULLTIME_ANTES_RECONSTRUCAO_20261111_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HHmmss'));
  props.setProperty('FT_CENTRAL_BACKUP_ID_20261111', backup.getId());

  props.setProperty('FT_REGISTRY_DATABASE_ID', FT_CENTRAL_CFG_20261111.MAIN_ID);
  props.deleteProperty('FT_BRUNO_SOURCE_ID');
  props.deleteProperty('FT_BRUNO_OPERATIONAL_ID');
  props.deleteProperty('FT_BRUNO_SYNC_ENABLED');
  props.setProperty('FT_CENTRALIZED_SCHEMA_VERSION', '2026.11.11');

  // Esvazia as guias fictícias da planilha antiga, preservando a guia protegida CAVALOS-BRUNO.
  // A planilha antiga não será mais consultada pelo sistema.
  const bruno = SpreadsheetApp.openById(FT_CENTRAL_CFG_20261111.BRUNO_ID);
  const clearedBrunoSheets = [];
  bruno.getSheets().forEach(function(sh) {
    if (sh.getName() === 'CAVALOS-BRUNO') return;
    const filter = sh.getFilter();
    if (filter) filter.remove();
    sh.clearContents();
    clearedBrunoSheets.push(sh.getName());
  });

  // Remove somente gatilhos que executam integrações com a planilha/formulário do Bruno.
  const removedTriggers = [];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    const handler = t.getHandlerFunction();
    let sourceId = '';
    try { sourceId = t.getTriggerSourceId() || ''; } catch (e) {}
    if (/Bruno|CadastroMotoristaFullTime_|PLANILHABRUNO/i.test(handler) ||
        sourceId === FT_CENTRAL_CFG_20261111.BRUNO_ID) {
      removedTriggers.push(handler);
      ScriptApp.deleteTrigger(t);
    }
  });

  const schemas = {
    MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS'],
    CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    DOCUMENTOS: ['ID_DOCUMENTO','CRIADO_EM','STATUS','TIPO_DOCUMENTO','ENTIDADE','ID_EXTERNO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','OBSERVACOES'],
    OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','VIAGENS_REALIZADAS','TIPO_OPERACAO','PRODUTO_SERVICO','DISTANCIA_KM','DATA_ENTREGA','JANELA_INICIO','JANELA_FIM','TEMPO_ESTIMADO_HORAS'],
    PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR'],
    MOVIMENTACOES_OPERACAO: ['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR','QUANTIDADE_VIAGENS'],
    LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES'],
    REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES'],
    DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
    FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_OPERACAO_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
    EVENTOS_ESCALA: ['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_ANTERIOR','POSICAO_NOVA','MOTIVO','REGISTRADO_POR'],
    ENTRADA_OPERACOES_IA: ['ID','RECEBIDO_EM','ORIGEM_MENSAGEM','MENSAGEM_BRUTA','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','DATA_OPERACAO','VOLUME_TONELADAS','VIAGENS_PREVISTAS','PRODUTO','TIPO_OPERACAO','STATUS_INTERPRETACAO','OPERACAO_ID','OBSERVACOES','INTERPRETACAO_JSON','PROCESSADO_EM']
  };

  Object.keys(schemas).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const filter = sh.getFilter();
    if (filter) filter.remove();
    sh.clearContents();
    sh.getRange(1,1,1,schemas[name].length).setValues([schemas[name]]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,schemas[name].length)
      .setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c').setWrap(true);
  });

  // Apaga apenas as guias-espelho antigas; não são mais parte da arquitetura.
  ['FT_CADASTRO_BRUNO_MOTORISTAS','FT_CADASTRO_BRUNO_CAVALOS','FT_CADASTRO_BRUNO_CARRETAS','FT_CADASTRO_BRUNO_CONJUNTOS','FT_CADASTRO_BRUNO_DOCUMENTOS','PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'].forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (sh) ss.deleteSheet(sh);
  });

  const now = new Date(), drivers=[], horses=[], trailers=[], sets=[], docs=[];
  for (let i=1;i<=40;i++) {
    const n=String(i).padStart(3,'0'), id=FT_CENTRAL_CFG_20261111.PREFIX;
    const driverId=id+'MOT-'+n, horseId=id+'CAV-'+n, trailerId=id+'CAR-'+n;
    drivers.push([driverId,now,'ATIVO','Motorista Fictício '+n,String(90000000000+i),'+555399900'+String(i).padStart(4,'0'),'motorista'+n+'@example.test','CNHTEST'+n,'E','2030-12-31','Rio Grande/RS','CADASTRO FICTÍCIO — HOMOLOGAÇÃO']);
    horses.push([horseId,now,'ATIVO','FTX'+String(1000+i),'Volvo','FH 540',2024,8,58,'VEÍCULO FICTÍCIO — HOMOLOGAÇÃO',50]);
    trailers.push([trailerId,now,'ATIVO','FTY'+String(2000+i),'Graneleira',7,35,45,'IMPLEMENTO FICTÍCIO — HOMOLOGAÇÃO']);
    sets.push([id+'CON-'+n,now,'ATIVO',driverId,horseId,trailerId,'','CONJUNTO FICTÍCIO '+n,'APTO','',35,'SISTEMA']);
    ['CNH','CRLV_CAVALO','CRLV_CARRETA'].forEach(function(tipo,j) {
      docs.push([id+'DOC-'+n+'-'+(j+1),now,'VALIDO',tipo,j===0?'MOTORISTAS':j===1?'CAVALOS':'CARRETAS',j===0?driverId:j===1?horseId:trailerId,'DOC-TESTE-'+n+'-'+(j+1),'2026-01-01','2030-12-31','DOCUMENTO FICTÍCIO']);
    });
  }
  ss.getSheetByName('MOTORISTAS').getRange(2,1,drivers.length,drivers[0].length).setValues(drivers);
  ss.getSheetByName('CAVALOS').getRange(2,1,horses.length,horses[0].length).setValues(horses);
  ss.getSheetByName('CARRETAS').getRange(2,1,trailers.length,trailers[0].length).setValues(trailers);
  ss.getSheetByName('CONJUNTOS').getRange(2,1,sets.length,sets[0].length).setValues(sets);
  ss.getSheetByName('DOCUMENTOS').getRange(2,1,docs.length,docs[0].length).setValues(docs);

  const operations=[];
  for(let i=1;i<=10;i++){
    const id=FT_CENTRAL_CFG_20261111.PREFIX+'OPE-'+String(i).padStart(3,'0');
    const volume=350+i*25, trips=Math.ceil(volume/35);
    operations.push([id,now,'ABERTA',new Date(Date.now()+i*86400000),'CLIENTE FICTÍCIO '+i,'OPERAÇÃO DE TESTE '+i,'Rio Grande/RS','Pelotas/RS','GRANEL',volume,trips,volume,'OPERAÇÃO FICTÍCIA — HOMOLOGAÇÃO','SISTEMA',0,'DIRETO','GRANEL','','','','','']);
  }
  ss.getSheetByName('OPERACOES').getRange(2,1,operations.length,operations[0].length).setValues(operations);

  // Guias de status legadas na planilha operacional são descartadas; a atual continua na base de autenticação.
  const oldStatus=ss.getSheetByName('FT_STATUS_CADASTROS');
  if(oldStatus) ss.deleteSheet(oldStatus);

  const summary={
    sucesso:true,fonteUnica:ss.getName(),planilhaId:ss.getId(),backupId:backup.getId(),
    motoristas:drivers.length,cavalos:horses.length,carretas:trailers.length,conjuntos:sets.length,
    documentos:docs.length,operacoes:operations.length,guiasOperacionais:Object.keys(schemas).length,
    guiasEspelhoRemovidas:6,guiasAntigasBrunoEsvaziadas:clearedBrunoSheets,gatilhosRemovidos:removedTriggers,
    autenticaçãoPreservada:true,planilhaBrunoDesconectada:true,
    nota:'Planilha antiga esvaziada; guia protegida CAVALOS-BRUNO preservada e não acessada para leitura.'
  };
  Logger.log('FULL TIME — CENTRALIZAÇÃO E RECONSTRUÇÃO: '+JSON.stringify(summary));
  return summary;
}
