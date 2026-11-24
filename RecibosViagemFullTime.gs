/**
 * FULL TIME — captura e guarda de comprovantes de viagem.
 * Fotos ficam privadas no Drive e são vinculadas à operação, participação e destino.
 * O OCR/conferência automática não está incluído nesta etapa.
 */
var FT_TICKET_HEADERS_20261124 = [
  'ID','RECEBIDO_EM','WHATSAPP_MESSAGE_ID','REMETENTE','MOTORISTA_ID',
  'OPERACAO_ID','TIPO_RECIBO','MEDIA_ID','DRIVE_FILE_ID','DRIVE_URL',
  'NOME_ARQUIVO','MIME_TYPE','STATUS','DESTINO_ID','PARTICIPACAO_ID',
  'OBSERVACOES','RETENCAO_ATE','METADADOS'
];

function ftTicketSheet_() {
  var id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  var ss=SpreadsheetApp.openById(id),sh=ss.getSheetByName('TICKETS');
  if(!sh)sh=ss.insertSheet('TICKETS');
  var width=sh.getLastColumn(),headers=width?sh.getRange(1,1,1,width).getDisplayValues()[0]:[];
  if(!headers.some(function(v){return String(v||'').trim();})){
    sh.getRange(1,1,1,FT_TICKET_HEADERS_20261124.length).setValues([FT_TICKET_HEADERS_20261124]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,FT_TICKET_HEADERS_20261124.length).setFontWeight('bold').setBackground('#173f70').setFontColor('#ffffff').setWrap(true);
  }else{
    var normalized=headers.map(function(v){return String(v||'').trim().toUpperCase();});
    var missing=FT_TICKET_HEADERS_20261124.filter(function(h){return normalized.indexOf(h)<0;});
    if(missing.length){
      var firstNew=sh.getLastColumn()+1;
      sh.getRange(1,firstNew,1,missing.length).setValues([missing]);
      sh.getRange(1,firstNew,1,missing.length).setFontWeight('bold').setBackground('#173f70').setFontColor('#ffffff').setWrap(true);
    }
  }
  return sh;
}
function ftTicketMap_(sh){
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],m={};
  h.forEach(function(v,i){var k=String(v||'').trim().toUpperCase();if(k&&m[k]===undefined)m[k]=i;});
  return m;
}
/** Converte a linha posicional legada do webhook para o cabeçalho canônico. */
function ftTicketAppendLegacyRow_(sh, values) {
  var map=ftTicketMap_(sh),row=new Array(sh.getLastColumn()).fill('');
  FT_TICKET_HEADERS_20261124.forEach(function(name,index){if(map[name]!==undefined)row[map[name]]=values[index]===undefined?'':values[index];});
  sh.appendRow(row);
}
function ftTicketFolder_(){
  var props=PropertiesService.getScriptProperties(),id=props.getProperty('FT_TICKET_DRIVE_FOLDER_ID');
  if(id){try{return DriveApp.getFolderById(id);}catch(e){throw new Error('A pasta configurada em FT_TICKET_DRIVE_FOLDER_ID não está acessível.');}}
  var folder=DriveApp.createFolder('FULL TIME — Recibos de Viagem');
  props.setProperty('FT_TICKET_DRIVE_FOLDER_ID',folder.getId());
  return folder;
}
/** Execute uma vez pelo editor para autorizar Drive e preparar a guia TICKETS. */
function prepararEstruturaRecibosViagemFullTime(){
  var sh=ftTicketSheet_(),folder=ftTicketFolder_();
  var result={ok:true,guia:sh.getName(),colunas:sh.getLastColumn(),pastaDrive:folder.getName(),pastaIdConfigurada:true,ocr:'NAO_INCLUIDO_NESTA_ETAPA'};
  Logger.log('FT_RECIBOS_PREPARACAO '+JSON.stringify(result));
  return result;
}
function registrarReciboViagemFullTime(token,data){
  var session=obterSessao_(token);exigirAdmin_(session);data=data||{};
  var opId=String(data.operacaoId||'').trim(),partId=String(data.participacaoId||'').trim(),destId=String(data.destinoId||'').trim();
  var type=String(data.tipoRecibo||'').trim().toUpperCase(),mime=String(data.mimeType||'').trim().toLowerCase();
  var name=String(data.nomeArquivo||'recibo').replace(/[\\\\/:*?"<>|]/g,'_').slice(0,150);
  var base64=String(data.base64||'').replace(/^data:[^,]+,/,'').replace(/\\s/g,'');
  var note=String(data.observacoes||'').trim().slice(0,1000);
  if(!opId||!partId||!destId)throw new Error('Selecione operação, participação do motorista e destino.');
  if(['CARREGAMENTO','DESCARGA','COMPROVANTE_ENTREGA','OUTRO'].indexOf(type)<0)throw new Error('Tipo de comprovante inválido.');
  if(['image/jpeg','image/png','image/webp','image/heic','image/heif'].indexOf(mime)<0)throw new Error('Envie uma foto JPG, PNG ou WEBP.');
  if(!base64||base64.length>11500000)throw new Error('A imagem está vazia ou excede o limite de 8 MB.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var opSh=getSheet_('OPERACOES'),opGrid=opSh.getDataRange().getValues(),oh=(opGrid[0]||[]).map(function(v){return String(v||'').trim().toUpperCase();}),oi={};
    oh.forEach(function(v,i){if(v&&oi[v]===undefined)oi[v]=i;});
    var op=opGrid.slice(1).find(function(r){return String(r[oi.ID]||'')===opId;});
    if(!op)throw new Error('Operação não encontrada.');
    if(['ABERTA','EM_ANDAMENTO'].indexOf(String(op[oi.STATUS]||'').toUpperCase())<0)throw new Error('A operação não aceita novos comprovantes neste status.');
    var parts=getSheet_('PARTICIPACAO_OPERACOES'),pm=ftTicketMap_(parts),pRows=parts.getDataRange().getValues();
    var part=pRows.slice(1).find(function(r){return String(r[pm.ID]||'')===partId&&String(r[pm.OPERACAO_ID]||'')===opId;});
    if(!part)throw new Error('A participação selecionada não pertence a esta operação.');
    var pStatus=String(part[pm.STATUS_PARTICIPACAO]||'').toUpperCase();
    if(['ACEITA','ATIVO','EM_VIAGEM','RETORNOU'].indexOf(pStatus)<0)throw new Error('O motorista precisa ter aceitado a convocação para anexar comprovantes.');
    var destSh=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID')).getSheetByName('DESTINOS_OPERACAO');
    if(!destSh)throw new Error('A guia DESTINOS_OPERACAO não está preparada.');
    var dm=ftTicketMap_(destSh),dr=destSh.getDataRange().getValues();
    var dest=dr.slice(1).find(function(r){return String(r[dm.ID]||'')===destId&&String(r[dm.OPERACAO_ID]||'')===opId;});
    if(!dest)throw new Error('O destino selecionado não pertence a esta operação.');
    var bytes=Utilities.base64Decode(base64),blob=Utilities.newBlob(bytes,mime,name);
    var folder=ftTicketFolder_(),file=folder.createFile(blob);
    var sh=ftTicketSheet_(),map=ftTicketMap_(sh),now=new Date(),id=Utilities.getUuid();
    var row=new Array(sh.getLastColumn()).fill('');
    var values={ID:id,RECEBIDO_EM:now,WHATSAPP_MESSAGE_ID:'',REMETENTE:'PAINEL_ADMIN',MOTORISTA_ID:part[pm.MOTORISTA_ID],OPERACAO_ID:opId,TIPO_RECIBO:type,MEDIA_ID:'',DRIVE_FILE_ID:file.getId(),DRIVE_URL:file.getUrl(),NOME_ARQUIVO:file.getName(),MIME_TYPE:mime,STATUS:'AGUARDANDO_CONFERENCIA',DESTINO_ID:destId,PARTICIPACAO_ID:partId,OBSERVACOES:note,RETENCAO_ATE:'',METADADOS:JSON.stringify({origem:'CAPTURA_PAINEL',registradoPor:session.login||'ADMIN',destino:String(dest[dm.CLIENTE_DESTINO]||'')})};
    Object.keys(values).forEach(function(k){if(map[k]!==undefined)row[map[k]]=values[k];});
    sh.appendRow(row);
    if(typeof auditar_==='function')auditar_(session,'RECIBO_VIAGEM_ANEXADO','OPERACAO',opId,'Comprovante '+id+'; tipo='+type+'; destino='+destId+'; participação='+partId);
    return {ok:true,id:id,url:file.getUrl(),nome:file.getName(),status:'AGUARDANDO_CONFERENCIA',message:'Foto armazenada no Drive e vinculada à operação, motorista e destino.'};
  }finally{lock.releaseLock();}
}
function listarRecibosViagemFullTime(token,operacaoId){
  var session=obterSessao_(token);exigirAdmin_(session);
  operacaoId=String(operacaoId||'').trim();if(!operacaoId)throw new Error('Informe a operação.');
  var sh=ftTicketSheet_(),map=ftTicketMap_(sh),last=sh.getLastRow();if(last<2)return [];
  return sh.getRange(2,1,last-1,sh.getLastColumn()).getValues().filter(function(r){return String(r[map.OPERACAO_ID]||'')===operacaoId;}).map(function(r){
    return {id:String(r[map.ID]||''),data:r[map.RECEBIDO_EM] instanceof Date?r[map.RECEBIDO_EM].toISOString():String(r[map.RECEBIDO_EM]||''),motoristaId:String(r[map.MOTORISTA_ID]||''),tipo:String(r[map.TIPO_RECIBO]||''),url:String(r[map.DRIVE_URL]||''),nome:String(r[map.NOME_ARQUIVO]||''),status:String(r[map.STATUS]||''),destinoId:String(r[map.DESTINO_ID]||''),observacoes:String(r[map.OBSERVACOES]||'')};
  }).reverse();
}


/**
 * TESTE 1 — valida estrutura de TICKETS e acesso à pasta do Drive.
 * SOMENTE LEITURA: não cria guias/pastas, não altera cabeçalhos e não grava linhas.
 */
function testarEstruturaRecibosViagemFullTime() {
  var props = PropertiesService.getScriptProperties();
  var databaseId = String(props.getProperty('FT_REGISTRY_DATABASE_ID') || '').trim();
  var folderId = String(props.getProperty('FT_TICKET_DRIVE_FOLDER_ID') || '').trim();
  var result = {
    ok: false,
    somenteLeitura: true,
    planilhaConfigurada: !!databaseId,
    guiaEncontrada: false,
    guia: 'TICKETS',
    colunas: 0,
    cabecalhosCanonicosEsperados: FT_TICKET_HEADERS_20261124.length,
    cabecalhosAusentes: [],
    duplicados: [],
    cabecalhosVazios: [],
    pastaIdConfigurada: !!folderId,
    pastaDriveAcessivel: false,
    erros: []
  };

  try {
    if (!databaseId) throw new Error('Propriedade FT_REGISTRY_DATABASE_ID não configurada.');
    var ss = SpreadsheetApp.openById(databaseId);
    var sh = ss.getSheetByName('TICKETS');
    if (!sh) throw new Error('A guia TICKETS não existe. Este teste não a criará.');
    result.guiaEncontrada = true;
    result.colunas = sh.getLastColumn();

    if (result.colunas < 1) {
      result.erros.push('A guia TICKETS não possui cabeçalho.');
    } else {
      var headers = sh.getRange(1, 1, 1, result.colunas).getDisplayValues()[0];
      var counts = {};
      headers.forEach(function(value, index) {
        var key = String(value || '').trim().toUpperCase();
        if (!key) {
          result.cabecalhosVazios.push(index + 1);
          return;
        }
        counts[key] = (counts[key] || 0) + 1;
      });
      Object.keys(counts).forEach(function(key) {
        if (counts[key] > 1) result.duplicados.push({ cabecalho: key, quantidade: counts[key] });
      });
      result.cabecalhosAusentes = FT_TICKET_HEADERS_20261124.filter(function(key) {
        return !counts[key];
      });
      if (result.cabecalhosAusentes.length) result.erros.push('Existem cabeçalhos canônicos ausentes.');
      if (result.duplicados.length) result.erros.push('Existem cabeçalhos duplicados.');
      if (result.cabecalhosVazios.length) result.erros.push('Existem posições de cabeçalho vazias.');
    }

    if (!folderId) {
      result.erros.push('Propriedade FT_TICKET_DRIVE_FOLDER_ID não configurada.');
    } else {
      try {
        var folder = DriveApp.getFolderById(folderId);
        result.pastaDriveAcessivel = folder.getId() === folderId;
        result.pastaDrive = folder.getName();
      } catch (driveError) {
        result.erros.push('Pasta do Drive inacessível: ' + driveError.message);
      }
    }
  } catch (error) {
    result.erros.push(error.message || String(error));
  }

  result.ok = result.erros.length === 0 &&
    result.guiaEncontrada &&
    result.cabecalhosAusentes.length === 0 &&
    result.duplicados.length === 0 &&
    result.cabecalhosVazios.length === 0 &&
    result.pastaDriveAcessivel;
  Logger.log('FT_TESTE_ESTRUTURA_RECIBOS ' + JSON.stringify(result));
  return result;
}
