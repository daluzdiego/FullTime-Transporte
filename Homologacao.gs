/**
 * FULLTIME — HOMOLOGAÇÃO CONTROLADA
 * Gera massa fictícia relacional e credenciais de teste.
 * Nunca acessa a planilha do Bruno nem a guia CAVALOS-BRUNO.
 * A limpeza é restrita à allowlist FT_HOMOLOGACAO_GUIAS.
 */

const FT_HOMOLOGACAO_GUIAS = Object.freeze({
  MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES','ID_EXTERNO','RG','DATA_NASCIMENTO','WHATSAPP','ENDERECO','CIDADE','UF','CEP','CNH_PRIMEIRA_HABILITACAO','CNH_EAR','EXAME_TOXICOLOGICO_VALIDADE','STATUS_DOCUMENTACAO','LINK_CNH','LINK_EXAME_TOXICOLOGICO'],
  CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','ID_EXTERNO','RENAVAM','CHASSI','NUMERO_MOTOR','VERSAO','ANO_FABRICACAO','ANO_MODELO','TIPO_VEICULO','ESPECIE','CARROCERIA','COR','COMBUSTIVEL','NUMERO_EIXOS','LOTACAO_TONELADAS','CAPACIDADE_UTIL_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','ANTT_RNTRC','ANTT_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA'],
  CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','ID_EXTERNO','RENAVAM','CHASSI','ANO_FABRICACAO','ANO_MODELO','ESPECIE','CARROCERIA','COR','NUMERO_EIXOS','LOTACAO_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','MARCA','MODELO'],
  CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA','QUANTIDADE_CARRETAS','VINCULO_FIXO','DATA_INICIO_VINCULO','DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR','DATA_AUTORIZACAO'],
  OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','ID_EXTERNO','TOTAL_VIAGENS_CONCLUIDAS','TOTAL_TONELADAS_REALIZADAS','DATA_FIM_LIMITE','JANELA_INICIO','JANELA_FIM','PRIORIDADE','PRODUTO_SERVICO','TIPO_OPERACAO','CONTATO_CLIENTE','CLIENTE_ID','LOCAL_ORIGEM_ID','LOCAL_DESTINO_ID'],
  CONTROLE_DOCUMENTAL: ['ID_DOCUMENTO','TIPO_REGISTRO','ID_EXTERNO_REGISTRO','PLACA_OU_CPF','TIPO_DOCUMENTO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','STATUS_DOCUMENTO','LINK_ARQUIVO','DATA_CONFERENCIA','CONFERIDO_POR','PENDENCIA','OBSERVACOES'],
  PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR','VIAGENS_PREVISTAS','TONELADAS_PREVISTAS','VIAGENS_INICIADAS','INICIO_PREVISTO','FIM_PREVISTO','ATUALIZADO_EM','ATUALIZADO_POR'],
  VIAGENS: ['ID','CRIADO_EM','OPERACAO_ID','PARTICIPACAO_ID','SEQUENCIA_OPERACAO','SEQUENCIA_MOTORISTA','MOTORISTA_ID','CONJUNTO_ID','STATUS','ORIGEM_DESCRICAO','DESTINO_DESCRICAO','PESO_PREVISTO_TONELADAS','PESO_REAL_TONELADAS','PREVISTA_INICIO','PREVISTA_CHEGADA','INICIO_REAL','CHEGADA_ORIGEM_REAL','SAIDA_ORIGEM_REAL','CHEGADA_DESTINO_REAL','FIM_REAL','DISTANCIA_PREVISTA_KM','DISTANCIA_REAL_KM','MOTIVO_CANCELAMENTO','OBSERVACOES','ATUALIZADA_EM','ATUALIZADA_POR','STATUS_ANTES_INTERRUPCAO','INTERRUPPIDA_EM','MOTIVO_INTERRUPCAO','RETOMADA_EM','INICIO_CARREGAMENTO_REAL','FIM_CARREGAMENTO_REAL','INICIO_DESCARGA_REAL','FIM_DESCARGA_REAL'],
  EVENTOS_VIAGEM: ['ID','VIAGEM_ID','TIPO_EVENTO','DATA_HORA_EVENTO','DATA_HORA_RECEBIMENTO','LOCAL_ID','LATITUDE','LONGITUDE','RESPONSAVEL_ID','ORIGEM_REGISTRO','DESCRICAO','OBSERVACOES','IDEMPOTENCIA'],
  DOCUMENTOS_VIAGEM: ['ID','VIAGEM_ID','EVENTO_VIAGEM_ID','TIPO_DOCUMENTO','DRIVE_FILE_ID','URL','NOME_ARQUIVO','MIME_TYPE','HASH_ARQUIVO','RECEBIDO_EM','RECEBIDO_POR','STATUS_VALIDACAO','OBSERVACOES'],
  TICKETS: ['ID','RECEBIDO_EM','WHATSAPP_MESSAGE_ID','TELEFONE_REMETENTE','MOTORISTA_ID','CARGA_ID_LEGADO','TIPO_TICKET','MEDIA_ID','DRIVE_FILE_ID','DRIVE_FILE_URL','NOME_ARQUIVO','MIME_TYPE','STATUS_LEITURA','DATA_HORA_EXTRAIDA','CONFIANCA_LEITURA','ERRO_VALIDACAO','RETENCAO_ATE','METADADOS_JSON','VIAGEM_ID'],
  CLIENTES: ['ID','CRIADO_EM','STATUS','RAZAO_SOCIAL','NOME_FANTASIA','CNPJ','TELEFONE','EMAIL','CONTATO_PRINCIPAL','OBSERVACOES','ID_EXTERNO'],
  LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES','CLIENTE_ID'],
  REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES'],
  DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
  FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_VIAGEM_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
  OFERTAS_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','STATUS_OFERTA','EXPIRA_EM','RESPONDIDO_EM','MOTIVO','CRIADO_POR'],
  EVENTOS_OPERACAO: ['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','MOTIVO','REGISTRADO_POR'],
  HISTORICO_ASSIDUIDADE: ['ID','DATA_HORA','MOTORISTA_ID','OPERACAO_ID','PARTICIPACAO_ID','TIPO_EVENTO','PREVISTO_EM','REALIZADO_EM','JUSTIFICATIVA','ORIGEM','REGISTRADO_POR']
});

function diagnosticarHomologacaoFullTime() {
  const p = PropertiesService.getScriptProperties();
  const registryId = p.getProperty('FT_REGISTRY_DATABASE_ID');
  const authId = p.getProperty('FT_DATABASE_ID');
  if (!registryId) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  if (!authId) throw new Error('FT_DATABASE_ID não configurado (base interna de autenticação).');
  const ss = SpreadsheetApp.openById(registryId);
  const auth = SpreadsheetApp.openById(authId);
  const result = {
    ambiente: 'HOMOLOGACAO',
    baseOperacional: ss.getName(),
    baseOperacionalIdFinal: registryId.slice(-6),
    baseAutenticacao: auth.getName(),
    guiasProtegidasIgnoradas: ['CAVALOS-BRUNO'],
    guias: Object.keys(FT_HOMOLOGACAO_GUIAS).map(name => {
      const sh = ss.getSheetByName(name);
      return {guia:name, existe:!!sh, linhas:sh?Math.max(0,sh.getLastRow()-1):0, colunas:sh?sh.getLastColumn():0};
    }),
    usuarios: (function(){const sh=auth.getSheetByName('USUARIOS');return {existe:!!sh,linhas:sh?Math.max(0,sh.getLastRow()-1):0};})(),
    acao: 'Somente diagnóstico. Nenhuma célula foi alterada.'
  };
  Logger.log(JSON.stringify(result));
  return result;
}

/** Executar depois de conferir o diagnóstico. Cria backup SOMENTE das guias permitidas. */
function fazerBackupHomologacaoFullTime() {
  const p=PropertiesService.getScriptProperties(), id=p.getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  const source=SpreadsheetApp.openById(id);
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const backup=SpreadsheetApp.create('BACKUP FULLTIME HOMOLOGACAO '+stamp);
  const defaultSheet=backup.getSheets()[0];
  let first=true;
  Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
    const sh=source.getSheetByName(name);
    if(!sh) return;
    const copied=sh.copyTo(backup).setName(('BKP_'+name).slice(0,99));
    if(first){backup.deleteSheet(defaultSheet);first=false;}
  });
  if(first) throw new Error('Nenhuma guia permitida encontrada; backup vazio cancelado.');
  const result={ok:true,backupUrl:backup.getUrl(),backupId:backup.getId(),guias:backup.getSheets().map(s=>s.getName())};
  Logger.log('BACKUP HOMOLOGACAO: '+JSON.stringify(result));
  return result;
}

/**
 * Limpa somente linhas de dados das guias operacionais da allowlist.
 * Mantém cabeçalhos, formatação e guias não listadas. Não limpa USUARIOS nem AUDITORIA.
 * ATENÇÃO: execute somente após conferir o diagnóstico e o backup.
 */
function limparBaseParaHomologacaoFullTime() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
    if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
    const ss=SpreadsheetApp.openById(id), resumo=[];
    Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
      const sh=ss.getSheetByName(name);
      if(!sh) return;
      const lastRow=sh.getLastRow(), lastCol=sh.getLastColumn();
      if(lastRow>1&&lastCol>0) sh.getRange(2,1,lastRow-1,lastCol).clearContent();
      resumo.push({guia:name,linhasRemovidas:Math.max(0,lastRow-1)});
    });
    // Remove somente credenciais de homologação anteriores; mantém admins e usuários reais.
    const auth=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID'));
    const users=auth.getSheetByName('USUARIOS');
    if(users&&users.getLastRow()>1) {
      const values=users.getDataRange().getValues();
      const loginCol=1, profileCol=3, driverCol=9;
      for(let i=values.length-1;i>=1;i--) {
        const login=String(values[i][loginCol]||'').toLowerCase();
        const profile=String(values[i][profileCol]||'').toUpperCase();
        const driverId=String(values[i][driverCol]||'');
        if(profile==='MOTORISTA'&&(login.endsWith('@fulltime.test')||driverId.indexOf('FTTEST-')===0)) users.deleteRow(i+1);
      }
    }
    const out={ok:true,guias:resumo,credenciaisTesteAnterioresRemovidas:true,adminsPreservados:true,guiaProtegidaPreservada:true};
    Logger.log('LIMPEZA HOMOLOGACAO: '+JSON.stringify(out));
    return out;
  } finally {lock.releaseLock();}
}

function ftHomologacaoAppend_(ss,name,objects) {
  if(!objects.length) return 0;
  const sh=ss.getSheetByName(name);
  if(!sh) throw new Error('Guia ausente após preparação: '+name);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(h=>String(h||'').trim().toUpperCase());
  const rows=objects.map(obj=>headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:''));
  sh.getRange(sh.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
  return rows.length;
}

function prepararEstruturaHomologacaoFullTime() {
  const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  const ss=SpreadsheetApp.openById(id), result=[];
  Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
    let sh=ss.getSheetByName(name),created=false;
    if(!sh){sh=ss.insertSheet(name);created=true;}
    const required=FT_HOMOLOGACAO_GUIAS[name];
    const width=sh.getLastColumn();
    const current=width?sh.getRange(1,1,1,width).getDisplayValues()[0].map(x=>String(x||'').trim()):[];
    if(current.every(x=>!x)) sh.getRange(1,1,1,required.length).setValues([required]);
    else {
      const norm=current.map(x=>x.toUpperCase().replace(/[^A-Z0-9]/g,''));
      required.forEach(h=>{
        const key=h.toUpperCase().replace(/[^A-Z0-9]/g,'');
        if(norm.indexOf(key)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);norm.push(key);}
      });
    }
    sh.setFrozenRows(1);
    result.push({guia:name,criada:created,colunas:sh.getLastColumn()});
  });
  Logger.log('ESTRUTURA HOMOLOGACAO: '+JSON.stringify(result));
  return result;
}

function gerarMassaFicticiaHomologacaoFullTime() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const registryId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
    const authId=PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID');
    if(!registryId||!authId) throw new Error('Configure FT_REGISTRY_DATABASE_ID e FT_DATABASE_ID.');
    const ss=SpreadsheetApp.openById(registryId), auth=SpreadsheetApp.openById(authId);
    const now=new Date(), today=Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const future=new Date(now.getTime()+86400000*14);
    const iso=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const id=(prefix,n)=>prefix+'-'+String(n).padStart(4,'0');
    const tag='DADO FICTÍCIO — HOMOLOGAÇÃO FULLTIME; NÃO UTILIZAR EM PRODUÇÃO';
    const clients=Array.from({length:4},(_,i)=>({ID:id('FTTEST-CLI',i+1),CRIADO_EM:now,STATUS:'ATIVO',RAZAO_SOCIAL:'Empresa Fictícia de Transporte '+(i+1),NOME_FANTASIA:'Cliente Teste '+(i+1),CNPJ:'TESTE-CNPJ-'+String(i+1).padStart(4,'0'),TELEFONE:'00000000000',EMAIL:'cliente'+(i+1)+'@fulltime.test',CONTATO_PRINCIPAL:'Contato de Teste '+(i+1),OBSERVACOES:tag,ID_EXTERNO:id('FTTEST-CLI',i+1)}));
    const drivers=[],horses=[],trailers=[],sets=[];
    for(let i=1;i<=40;i++){
      const n=String(i).padStart(2,'0'), driverId=id('FTTEST-MOT',i), horseId=id('FTTEST-CAV',i), trailerId=id('FTTEST-CAR',i), setId=id('FTTEST-CON',i);
      const name='Motorista Fictício '+n, cpf='TESTE-CPF-'+n;
      drivers.push({ID:driverId,CRIADO_EM:now,STATUS:'ATIVO',NOME_COMPLETO:name,CPF:cpf,TELEFONE:'00000000000',EMAIL:'motorista'+n+'@fulltime.test',CNH_NUMERO:'TESTE-CNH-'+n,CNH_CATEGORIA:'E',CNH_VALIDADE:iso(future),CIDADE_UF:'Rio Grande/RS',OBSERVACOES:tag,ID_EXTERNO:driverId,RG:'TESTE-RG-'+n,DATA_NASCIMENTO:'1990-01-01',WHATSAPP:'',ENDERECO:'Endereço fictício '+n,CIDADE:'Rio Grande',UF:'RS',CEP:'00000-000',CNH_PRIMEIRA_HABILITACAO:'2010-01-01',CNH_EAR:'NÃO',EXAME_TOXICOLOGICO_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',LINK_CNH:'',LINK_EXAME_TOXICOLOGICO:''});
      horses.push({ID:horseId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'TST'+String(i).padStart(4,'0'),MARCA:'Marca Teste',MODELO:'Cavalo '+n,ANO:'2022',TARA_TONELADAS:9,PBTC_MAX_TONELADAS:57,OBSERVACOES:tag,ID_EXTERNO:horseId,RENAVAM:'TESTE-RENAVAM-'+n,CHASSI:'TESTE-CHASSI-CAV-'+n,NUMERO_MOTOR:'TESTE-MOTOR-'+n,VERSAO:'Teste',ANO_FABRICACAO:'2022',ANO_MODELO:'2022',TIPO_VEICULO:'TRACAO',ESPECIE:'CARGA',CARROCERIA:'TRACAO',COR:'BRANCO',COMBUSTIVEL:'DIESEL',NUMERO_EIXOS:3,LOTACAO_TONELADAS:25,CAPACIDADE_UTIL_TONELADAS:25,PROPRIETARIO_DOCUMENTO:'TESTE-PROP-'+n,PROPRIETARIO_NOME:'Proprietário Fictício '+n,CRLV_ANO_EXERCICIO:'2026',LICENCIAMENTO_STATUS:'SIMULADO',CRLV_LINK:'',AET_NUMERO:'TESTE-AET-'+n,AET_VALIDADE:iso(future),ANTT_RNTRC:'TESTE-ANTT-'+n,ANTT_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',DATA_ULTIMA_CONFERENCIA:now});
      trailers.push({ID:trailerId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'TRS'+String(i).padStart(4,'0'),TIPO_CARRETA:'GRANELEIRA',TARA_TONELADAS:7,CAPACIDADE_CARGA_TONELADAS:25,PBTC_MAX_TONELADAS:40,OBSERVACOES:tag,ID_EXTERNO:trailerId,RENAVAM:'TESTE-REN-CAR-'+n,CHASSI:'TESTE-CHASSI-CAR-'+n,ANO_FABRICACAO:'2022',ANO_MODELO:'2022',ESPECIE:'CARGA',CARROCERIA:'GRANELEIRA',COR:'PRATA',NUMERO_EIXOS:3,LOTACAO_TONELADAS:25,PROPRIETARIO_DOCUMENTO:'TESTE-PROP-'+n,PROPRIETARIO_NOME:'Proprietário Fictício '+n,CRLV_ANO_EXERCICIO:'2026',LICENCIAMENTO_STATUS:'SIMULADO',CRLV_LINK:'',AET_NUMERO:'TESTE-AET-CAR-'+n,AET_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',DATA_ULTIMA_CONFERENCIA:now,MARCA:'Marca Teste',MODELO:'Carreta '+n});
      sets.push({ID:setId,CRIADO_EM:now,STATUS:'ATIVO',MOTORISTA_ID:driverId,CAVALO_ID:horseId,CARRETA_MEIO_ID:'',CARRETA_FINAL_ID:trailerId,OBSERVACOES:tag,ESTADO_CONSERVACAO:'APTO',RESTRICOES:'',CAPACIDADE_UTIL_TONELADAS:50,ATUALIZADO_POR:'HOMOLOGACAO',ID_EXTERNO:setId,MOTORISTA_ID_EXTERNO:driverId,MOTORISTA_CPF:cpf,MOTORISTA_NOME:name,CAVALO_ID_EXTERNO:horseId,CAVALO_PLACA:'TST'+String(i).padStart(4,'0'),CARRETA_MEIO_ID_EXTERNO:'',CARRETA_MEIO_PLACA:'',CARRETA_FINAL_ID_EXTERNO:trailerId,CARRETA_FINAL_PLACA:'TRS'+String(i).padStart(4,'0'),QUANTIDADE_CARRETAS:1,VINCULO_FIXO:true,DATA_INICIO_VINCULO:today,STATUS_VINCULO:'ATIVO',AUTORIZADO_POR:'HOMOLOGACAO',DATA_AUTORIZACAO:now});
    }
    const places=[], operations=[], participations=[], trips=[], docs=[], rules=[], availability=[], queue=[], offers=[], opEvents=[], attendance=[], tripEvents=[], tripDocs=[], tickets=[];
    const categories=['ALTO_DESEMPENHO','MANOBRA_DIFICIL','PRAZO_NAVIO'];
    for(let c=1;c<=4;c++){
      const cli=clients[c-1], originId=id('FTTEST-LOC-O',c), destId=id('FTTEST-LOC-D',c);
      const origin='Terminal Fictício de Origem '+c, dest='Terminal Fictício de Destino '+c;
      places.push({ID:originId,CRIADO_EM:now,STATUS:'ATIVO',NOME_LOCAL:origin,CLIENTE:cli.NOME_FANTASIA,TIPO_LOCAL:'ORIGEM',ENDERECO:origin,CIDADE_UF:'Rio Grande/RS',REGRAS_OBSERVACOES:tag,CLIENTE_ID:cli.ID},{ID:destId,CRIADO_EM:now,STATUS:'ATIVO',NOME_LOCAL:dest,CLIENTE:cli.NOME_FANTASIA,TIPO_LOCAL:'DESTINO',ENDERECO:dest,CIDADE_UF:'Pelotas/RS',REGRAS_OBSERVACOES:tag,CLIENTE_ID:cli.ID});
      const opId=id('FTTEST-OP',c), first=(c-1)*10+1, last=c*10, volume=1000, tripTarget=20;
      operations.push({ID:opId,CRIADO_EM:now,STATUS:'ABERTA',DATA_OPERACAO:today,CLIENTE:cli.NOME_FANTASIA,NOME_OPERACAO:'Operação de Homologação '+c,ORIGEM:origin,DESTINO:dest,CATEGORIA:categories[(c-1)%3],VOLUME_TOTAL_TONELADAS:volume,TOTAL_VIAGENS_PREVISTAS:tripTarget,SALDO_TONELADAS:volume,OBSERVACOES:tag,CRIADO_POR:'HOMOLOGACAO',ID_EXTERNO:opId,TOTAL_VIAGENS_CONCLUIDAS:0,TOTAL_TONELADAS_REALIZADAS:0,DATA_FIM_LIMITE:iso(future),JANELA_INICIO:'06:00',JANELA_FIM:'22:00',PRIORIDADE:c===1?'URGENTE':c===2?'ALTA':'NORMAL',PRODUTO_SERVICO:'Carga geral fictícia',TIPO_OPERACAO:'TRANSPORTE DIRETO',CONTATO_CLIENTE:'Contato Teste',CLIENTE_ID:cli.ID,LOCAL_ORIGEM_ID:originId,LOCAL_DESTINO_ID:destId});
      rules.push({ID:id('FTTEST-REG',c),CRIADO_EM:now,STATUS:'ATIVA',LOCAL_ID:originId,PESO_MIN_TONELADAS:1,PESO_MAX_TONELADAS:50,TIPO_CAVALO:'TRACAO',TIPO_CARRETA:'GRANELEIRA',EXIGENCIAS:'Documentação simulada para homologação',OBSERVACOES:tag});
      for(let i=first;i<=last;i++){
        const driverId=id('FTTEST-MOT',i), setId=id('FTTEST-CON',i), partId=id('FTTEST-PAR',i);
        participations.push({ID:partId,CRIADO_EM:now,OPERACAO_ID:opId,CONJUNTO_ID:setId,MOTORISTA_ID:driverId,STATUS_PARTICIPACAO:'ATIVO',INICIO_EM:'',SAIDA_EM:'',RETORNO_EM:'',TONELADAS_MOVIMENTADAS:0,VIAGENS_CONCLUIDAS:0,MOTIVO:'',REGISTRADO_POR:'HOMOLOGACAO',VIAGENS_PREVISTAS:2,TONELADAS_PREVISTAS:100,VIAGENS_INICIADAS:0,INICIO_PREVISTO:today+' 06:00',FIM_PREVISTO:today+' 22:00',ATUALIZADO_EM:now,ATUALIZADO_POR:'HOMOLOGACAO'});
        for(let t=1;t<=2;t++){
          const tripId=id('FTTEST-VIA',((i-1)*2)+t);
          trips.push({ID:tripId,CRIADO_EM:now,OPERACAO_ID:opId,PARTICIPACAO_ID:partId,SEQUENCIA_OPERACAO:((i-first)*2)+t,SEQUENCIA_MOTORISTA:t,MOTORISTA_ID:driverId,CONJUNTO_ID:setId,STATUS:'PLANEJADA',ORIGEM_DESCRICAO:origin,DESTINO_DESCRICAO:dest,PESO_PREVISTO_TONELADAS:50,PESO_REAL_TONELADAS:0,PREVISTA_INICIO:today+' 06:00',PREVISTA_CHEGADA:today+' 12:00',INICIO_REAL:'',CHEGADA_ORIGEM_REAL:'',SAIDA_ORIGEM_REAL:'',CHEGADA_DESTINO_REAL:'',FIM_REAL:'',DISTANCIA_PREVISTA_KM:45,DISTANCIA_REAL_KM:'',MOTIVO_CANCELAMENTO:'',OBSERVACOES:tag,ATUALIZADA_EM:now,ATUALIZADA_POR:'HOMOLOGACAO'});
          tripEvents.push({ID:id('FTTEST-EVT-VIA',((i-1)*2)+t),VIAGEM_ID:tripId,TIPO_EVENTO:'VIAGEM_PLANEJADA',DATA_HORA_EVENTO:now,DATA_HORA_RECEBIMENTO:now,LOCAL_ID:'',LATITUDE:'',LONGITUDE:'',RESPONSAVEL_ID:'HOMOLOGACAO',ORIGEM_REGISTRO:'SEED_HOMOLOGACAO',DESCRICAO:'Viagem criada para teste; não representa execução real',OBSERVACOES:tag,IDEMPOTENCIA:id('FTTEST-IDEMP',((i-1)*2)+t)});
          tripDocs.push({ID:id('FTTEST-DOCV',((i-1)*2)+t),VIAGEM_ID:tripId,EVENTO_VIAGEM_ID:'',TIPO_DOCUMENTO:'COMPROVANTE_SIMULADO',DRIVE_FILE_ID:'',URL:'',NOME_ARQUIVO:'SEM_ARQUIVO — REGISTRO DE TESTE',MIME_TYPE:'',HASH_ARQUIVO:'',RECEBIDO_EM:now,RECEBIDO_POR:'HOMOLOGACAO',STATUS_VALIDACAO:'SIMULADO_SEM_ARQUIVO',OBSERVACOES:tag});
        }
        availability.push({ID:id('FTTEST-DISP',i),CRIADO_EM:now,DATA_OPERACAO:today,MOTORISTA_ID:driverId,STATUS_DISPONIBILIDADE:'DISPONIVEL',CONFIRMADO_EM:now,INDISPONIVEL_EM:'',MOTIVO:tag,ATUALIZADO_POR:'HOMOLOGACAO'});
        queue.push({ID:id('FTTEST-FILA',i),DATA_ENTRADA:new Date(now.getTime()+i*1000),MOTORISTA_ID:driverId,CONJUNTO_ID:setId,STATUS_FILA:'AGUARDANDO',ULTIMA_OFERTA_EM:'',ULTIMA_VIAGEM_CONCLUIDA_EM:'',VIAGENS_PERIODO:0,OBSERVACOES:tag});
        if(i%5===0) attendance.push({ID:id('FTTEST-ASSID',i),DATA_HORA:now,MOTORISTA_ID:driverId,OPERACAO_ID:opId,PARTICIPACAO_ID:partId,TIPO_EVENTO:'PRESENCA_PONTUAL',PREVISTO_EM:now,REALIZADO_EM:now,JUSTIFICATIVA:'',ORIGEM:'SEED_HOMOLOGACAO',REGISTRADO_POR:'HOMOLOGACAO'});
        if(i%10===0) offers.push({ID:id('FTTEST-OFE',i),CRIADO_EM:now,OPERACAO_ID:opId,PARTICIPACAO_ID:partId,MOTORISTA_ID:driverId,CONJUNTO_ID:setId,STATUS_OFERTA:'SIMULADA',EXPIRA_EM:new Date(now.getTime()+7200000),RESPONDIDO_EM:'',MOTIVO:'Oferta fictícia para testar visualização; fluxo de aceite/expiração ainda requer homologação própria.',CRIADO_POR:'HOMOLOGACAO'});
        opEvents.push({ID:id('FTTEST-EVT-OP',i),DATA_HORA:now,TIPO_EVENTO:'PARTICIPACAO_SEMEADA',OPERACAO_ID:opId,PARTICIPACAO_ID:partId,MOTORISTA_ID:driverId,CONJUNTO_ID:setId,MOTIVO:tag,REGISTRADO_POR:'HOMOLOGACAO'});
      }
    }
    // Documentos cadastrais fictícios: status SIMULADO, sem arquivos reais.
    drivers.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-MOT',i+1),TIPO_REGISTRO:'MOTORISTA',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.CPF,TIPO_DOCUMENTO:'CNH_TESTE',NUMERO_DOCUMENTO:d.CNH_NUMERO,DATA_EMISSAO:'2024-01-01',DATA_VALIDADE:d.CNH_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    horses.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-CAV',i+1),TIPO_REGISTRO:'CAVALO',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.PLACA,TIPO_DOCUMENTO:'CRLV_TESTE',NUMERO_DOCUMENTO:d.RENAVAM,DATA_EMISSAO:'2026-01-01',DATA_VALIDADE:d.AET_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    trailers.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-CAR',i+1),TIPO_REGISTRO:'CARRETA',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.PLACA,TIPO_DOCUMENTO:'CRLV_TESTE',NUMERO_DOCUMENTO:d.RENAVAM,DATA_EMISSAO:'2026-01-01',DATA_VALIDADE:d.AET_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    tickets.push({ID:id('FTTEST-TICKET',1),RECEBIDO_EM:now,WHATSAPP_MESSAGE_ID:'',TELEFONE_REMETENTE:'',MOTORISTA_ID:drivers[0].ID,CARGA_ID_LEGADO:'',TIPO_TICKET:'COMPROVANTE_CARGA',MEDIA_ID:'',DRIVE_FILE_ID:'',DRIVE_FILE_URL:'',NOME_ARQUIVO:'',MIME_TYPE:'',STATUS_LEITURA:'SIMULADO_SEM_MIDIA',DATA_HORA_EXTRAIDA:'',CONFIANCA_LEITURA:0,ERRO_VALIDACAO:'Sem integração WhatsApp nesta etapa; registro ilustrativo.',RETENCAO_ATE:'',METADADOS_JSON:JSON.stringify({homologacao:true,tag:tag}),VIAGEM_ID:trips[0].ID});
    const datasets={CLIENTES:clients,MOTORISTAS:drivers,CAVALOS:horses,CARRETAS:trailers,CONJUNTOS:sets,LOCAIS:places,OPERACOES:operations,REGRAS_OPERACIONAIS:rules,CONTROLE_DOCUMENTAL:docs,PARTICIPACAO_OPERACOES:participations,VIAGENS:trips,EVENTOS_VIAGEM:tripEvents,DOCUMENTOS_VIAGEM:tripDocs,TICKETS:tickets,DISPONIBILIDADE_DIARIA:availability,FILA_MOTORISTAS:queue,OFERTAS_OPERACOES:offers,EVENTOS_OPERACAO:opEvents,HISTORICO_ASSIDUIDADE:attendance};
    const inserted={};
    Object.keys(datasets).forEach(name=>inserted[name]=ftHomologacaoAppend_(ss,name,datasets[name]));
    const credentials=ftCriarUsuariosHomologacao_(auth,drivers);
    const result={ok:true,ambiente:'HOMOLOGACAO',motoristas:drivers.length,cavalos:horses.length,carretas:trailers.length,conjuntos:sets.length,clientes:clients.length,operacoes:operations.length,participacoes:participations.length,viagens:trips.length,registrosPorGuia:inserted,loginsCriados:credentials.length,credenciais:credentials,alerta:'As senhas abaixo são temporárias. Copie-as agora; não serão gravadas em texto aberto.'};
    Logger.log('MASSA FICTICIA HOMOLOGACAO: '+JSON.stringify(result));
    return result;
  } finally {lock.releaseLock();}
}

function ftCriarUsuariosHomologacao_(auth,drivers) {
  const sh=auth.getSheetByName('USUARIOS');
  if(!sh) throw new Error('Guia USUARIOS não encontrada na base interna FT_DATABASE_ID.');
  const required=['ID','LOGIN','NOME','PERFIL','SALT','HASH_SENHA','ATIVO','TROCAR_SENHA','CRIADO_EM','MOTORISTA_ID','PERMISSOES_JSON'];
  let headers=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),required.length)).getDisplayValues()[0].map(x=>String(x||'').trim());
  if(sh.getLastColumn()<required.length) sh.insertColumnsAfter(Math.max(1,sh.getLastColumn()),required.length-sh.getLastColumn());
  headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(x=>String(x||'').trim());
  required.forEach((h,i)=>{if(!headers[i]){sh.getRange(1,i+1).setValue(h);headers[i]=h;}});
  const map={};headers.forEach((h,i)=>map[h.toUpperCase()]=i);
  const creds=[];
  drivers.forEach(d=>{
    const login=d.EMAIL, password=Utilities.getUuid().replace(/-/g,'').slice(0,16)+'aA1!';
    const salt=Utilities.getUuid(), row=new Array(sh.getLastColumn()).fill('');
    const values={ID:Utilities.getUuid(),LOGIN:login,NOME:d.NOME_COMPLETO,PERFIL:'MOTORISTA',SALT:salt,HASH_SENHA:hashSenha_(salt,password),ATIVO:true,TROCAR_SENHA:true,CRIADO_EM:new Date(),MOTORISTA_ID:d.ID,PERMISSOES_JSON:JSON.stringify({portal:true,perfil:'MOTORISTA',acoes:['VER_PROPRIO_PERFIL','VER_PROPRIO_CONJUNTO','INFORMAR_DISPONIBILIDADE','VER_PROPRIAS_VIAGENS']})};
    Object.keys(values).forEach(k=>{if(map[k]!=null)row[map[k]]=values[k];});
    sh.appendRow(row);
    creds.push({motorista:d.NOME_COMPLETO,motoristaId:d.ID,login:login,senhaTemporaria:password});
  });
  return creds;
}

/** Validação estrutural e de integridade da massa fictícia. */
function validarMassaHomologacaoFullTime() {
  const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  const ss=SpreadsheetApp.openById(id), read=n=>ss.getSheetByName(n).getDataRange().getValues();
  const count=n=>Math.max(0,read(n).length-1);
  const drivers=read('MOTORISTAS'), horses=read('CAVALOS'), trailers=read('CARRETAS'), sets=read('CONJUNTOS');
  const driverIds=new Set(drivers.slice(1).map(r=>String(r[0]))), horseIds=new Set(horses.slice(1).map(r=>String(r[0]))), trailerIds=new Set(trailers.slice(1).map(r=>String(r[0])));
  const errors=[];
  if(count('MOTORISTAS')!==40)errors.push('Esperados 40 motoristas.');
  if(count('CAVALOS')!==40)errors.push('Esperados 40 cavalos.');
  if(count('CARRETAS')!==40)errors.push('Esperadas 40 carretas.');
  if(count('CONJUNTOS')!==40)errors.push('Esperados 40 conjuntos.');
  sets.slice(1).forEach((r,i)=>{if(!driverIds.has(String(r[3])))errors.push('Conjunto '+(i+1)+' sem motorista válido.');if(!horseIds.has(String(r[4])))errors.push('Conjunto '+(i+1)+' sem cavalo válido.');if(r[6]&&!trailerIds.has(String(r[6])))errors.push('Conjunto '+(i+1)+' sem carreta válida.');});
  const ops=read('OPERACOES'), parts=read('PARTICIPACAO_OPERACOES'), trips=read('VIAGENS');
  const opIds=new Set(ops.slice(1).map(r=>String(r[0]))), partIds=new Set(parts.slice(1).map(r=>String(r[0])));
  parts.slice(1).forEach(r=>{if(!opIds.has(String(r[2])))errors.push('Participação sem operação: '+r[0]);if(!driverIds.has(String(r[4])))errors.push('Participação sem motorista: '+r[0]);});
  trips.slice(1).forEach(r=>{if(!opIds.has(String(r[2]))||!partIds.has(String(r[3])))errors.push('Viagem sem operação/participação: '+r[0]);});
  const auth=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID')), users=auth.getSheetByName('USUARIOS').getDataRange().getValues();
  const testUsers=users.slice(1).filter(r=>String(r[1]||'').toLowerCase().endsWith('@fulltime.test')&&String(r[3]).toUpperCase()==='MOTORISTA');
  if(testUsers.length!==40)errors.push('Esperados 40 logins fictícios; encontrados '+testUsers.length+'.');
  const result={sucesso:errors.length===0,erros:errors,contagens:{motoristas:count('MOTORISTAS'),cavalos:count('CAVALOS'),carretas:count('CARRETAS'),conjuntos:count('CONJUNTOS'),clientes:count('CLIENTES'),operacoes:count('OPERACOES'),participacoes:count('PARTICIPACAO_OPERACOES'),viagens:count('VIAGENS'),usuariosTeste:testUsers.length}};
  Logger.log('VALIDACAO HOMOLOGACAO: '+JSON.stringify(result));
  if(errors.length)throw new Error('Homologação inconsistente: '+errors.join(' | '));
  return result;
}
