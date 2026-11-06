/**
 * Diagnóstico SOMENTE LEITURA do ambiente Full Time.
 * Não cria guias, não altera propriedades, não instala gatilhos e não grava dados.
 *
 * Execute no editor Apps Script: verificarAmbienteHomologacaoFullTime()
 * O relatório não expõe IDs, tokens, CPFs, placas ou dados pessoais.
 */
function verificarAmbienteHomologacaoFullTime() {
  const report={executadoEm:new Date().toISOString(),modo:'SOMENTE_LEITURA',status:'OK',avisos:[],erros:[],origem:{},destino:{},propriedades:{},gatilhos:{}};
  const props=PropertiesService.getScriptProperties();
  const sourceId=FT_BRUNO_CONFIG&&FT_BRUNO_CONFIG.SOURCE_ID;
  const configuredDestinationId=FT_BRUNO_CONFIG&&FT_BRUNO_CONFIG.OPERATIONAL_ID;
  const registryId=props.getProperty('FT_REGISTRY_DATABASE_ID')||'';
  report.propriedades.registryConfigurado=!!registryId;
  report.propriedades.registryCorrespondeAoDestino=!!(registryId&&configuredDestinationId&&registryId===configuredDestinationId);
  report.propriedades.databaseLoginConfigurado=!!props.getProperty('FT_DATABASE_ID');
  report.propriedades.geminiConfigurado=!!(props.getProperty('FT_GEMINI_API_KEY')||props.getProperty('GEMINI_API_KEY'));
  if(!sourceId||!configuredDestinationId){report.erros.push('FT_BRUNO_CONFIG precisa conter SOURCE_ID e OPERATIONAL_ID.');report.status='ERRO';return report;}
  if(sourceId===configuredDestinationId){report.erros.push('A planilha de origem e a operacional apontam para o mesmo arquivo.');report.status='ERRO';return report;}
  if(!registryId)report.avisos.push('FT_REGISTRY_DATABASE_ID está ausente. A rotina prepararBaseOperacionalFullTime exige executar conectarPlanilhaOperacionalFullTime após confirmar a planilha operacional.');
  else if(registryId!==configuredDestinationId)report.erros.push('FT_REGISTRY_DATABASE_ID não corresponde ao OPERATIONAL_ID configurado. Não execute rotinas de preparação até corrigir a configuração.');
  let source,destination;
  try{source=SpreadsheetApp.openById(sourceId);report.origem.nome=source.getName();report.origem.aberta=true;}
  catch(e){report.erros.push('Não foi possível abrir a planilha de origem do Bruno: '+e.message);}
  try{destination=SpreadsheetApp.openById(configuredDestinationId);report.destino.nome=destination.getName();report.destino.aberta=true;}
  catch(e){report.erros.push('Não foi possível abrir a planilha operacional Full Time: '+e.message);}
  function inspect(ss,name,expected,allowPrefix){
    if(!ss)return {guia:name,status:'PLANILHA_INDISPONIVEL'};
    const sh=ss.getSheetByName(name);if(!sh)return {guia:name,status:'AUSENTE',linhas:0};
    const width=sh.getLastColumn(),actual=width?sh.getRange(1,1,1,width).getDisplayValues()[0].map(v=>String(v||'').trim()):[];
    if(!actual.some(Boolean))return {guia:name,status:'SEM_CABECALHO',linhas:Math.max(0,sh.getLastRow()-1)};
    const prefix=actual.length<=expected.length&&actual.every((v,i)=>v===expected[i]);
    const exact=actual.length===expected.length&&expected.every((v,i)=>actual[i]===v);
    const status=exact?'OK':(allowPrefix&&prefix?'MIGRACAO_ADITIVA_NECESSARIA':'CABECALHO_DIVERGENTE');
    return {guia:name,status:status,linhas:Math.max(0,sh.getLastRow()-1),colunas:actual.length,esperadas:expected.length};
  }
  if(source){
    report.origem.guias=Object.keys(FT_BRUNO_HEADERS).map(name=>inspect(source,name,FT_BRUNO_HEADERS[name],false));
    report.origem.guias.forEach(x=>{if(x.status!=='OK')report.erros.push('Origem Bruno — '+x.guia+': '+x.status+'.');});
  }
  if(destination){
    const mirrorMap={
      MOTORISTAS:'MOTORISTAS',CAVALOS:'CAVALOS',CARRETAS:'CARRETAS',CONJUNTOS:'CONJUNTOS',DOCUMENTOS:'CONTROLE_DOCUMENTAL'
    };
    report.destino.espelhos=Object.keys(FT_BRUNO_CADASTROS).map(entity=>{
      const sourceName=mirrorMap[entity],sheetName=FT_BRUNO_CADASTROS[entity].sheet;
      return inspect(destination,sheetName,FT_BRUNO_HEADERS[sourceName],false);
    });
    report.destino.guias=[
      {name:'CAVALOS',headers:['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES']},
      {name:'CARRETAS',headers:['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES']},
      {name:'CONJUNTOS',headers:['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','VINCULO_FIXO']},
      {name:'OPERACOES',headers:['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_CARGAS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','TIPO_OPERACAO']},
      {name:'CARGAS',headers:['ID','CRIADO_EM','STATUS','DATA_OPERACAO','HORARIO_PREVISTO','CLIENTE','ORIGEM','DESTINO','PESO_TONELADAS','DESCRICAO','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','CRIADO_POR','TIPO_OPERACAO','TICKET_CARREGAMENTO_URL','TICKET_DESCARGA_URL','VALOR_FRETE','OPERACAO_ID','PESO_REAL_TONELADAS']},
      {name:'MOVIMENTACOES_OPERACAO',headers:['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR','CARGA_ID']},
      {name:'PARTICIPACAO_OPERACOES',headers:['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR']},
      {name:'DISPONIBILIDADE_DIARIA',headers:['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR']},
      {name:'FILA_MOTORISTAS',headers:['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_CARGA_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES']},
      {name:'OFERTAS_CARGAS',headers:['ID','CRIADO_EM','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_FILA','STATUS_OFERTA','EXPIRA_EM','RESPONDIDO_EM','MOTIVO_RECUSA','CRIADO_POR','OPERACAO_ID']},
      {name:'ESCALAS',headers:['ID','CRIADO_EM','STATUS','CARGA_ID','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','MOTIVO_SELECAO','INICIO_PREVISTO','FIM_PREVISTO','OBSERVACOES','OPERACAO_ID']},
      {name:'EVENTOS_ESCALA',headers:['ID','DATA_HORA','TIPO_EVENTO','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_ANTERIOR','POSICAO_NOVA','MOTIVO','REGISTRADO_POR','OPERACAO_ID']},
      {name:'CONJUNTO_OVERRIDES',headers:['CONJUNTO_ID','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','ATUALIZADO_EM']},
      {name:'ENTRADA_OPERACOES_IA',headers:FT_IA_ENTRADA_HEADERS}
    ].map(x=>inspect(destination,x.name,x.headers,true));
    report.destino.guias.forEach(x=>{if(x.status==='CABECALHO_DIVERGENTE'||x.status==='SEM_CABECALHO')report.erros.push('Destino — '+x.guia+': '+x.status+'.');else if(x.status!=='OK')report.avisos.push('Destino — '+x.guia+': '+x.status+'.');});
    report.destino.espelhos.forEach(x=>{if(x.status!=='OK')report.erros.push('Espelho — '+x.guia+': '+x.status+'.');});
  }
  try{
    const handlers=ScriptApp.getProjectTriggers().map(t=>t.getHandlerFunction());
    report.gatilhos.expiracaoOfertasInstalado=handlers.includes('processarOfertasExpiradasSistema_');
    report.gatilhos.handlers=handlers;
    if(!report.gatilhos.expiracaoOfertasInstalado)report.avisos.push('Gatilho de expiração de ofertas ainda não está instalado.');
  }catch(e){report.avisos.push('Não foi possível consultar os gatilhos: '+e.message);}
  if(!report.propriedades.databaseLoginConfigurado)report.avisos.push('FT_DATABASE_ID não está configurado; o login/base de usuários pode não estar disponível.');
  if(!report.propriedades.geminiConfigurado)report.avisos.push('Chave Gemini não configurada; a entrada assistida pode usar regras locais e revisão manual.');
  if(report.erros.length)report.status='ERRO';else if(report.avisos.length)report.status='ATENCAO';
  Logger.log('FULL TIME — DIAGNÓSTICO DO AMBIENTE: '+JSON.stringify(report));
  return report;
}
