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
  var result={ok:true,guia:sh.getName(),colunas:sh.getLastColumn(),pastaDrive:folder.getName(),pastaIdConfigurada:true,ocr:PropertiesService.getScriptProperties().getProperty('FT_GEMINI_API_KEY')?'GEMINI_CONFIGURADO':'AGUARDANDO_CHAVE_GEMINI'};
  Logger.log('FT_RECIBOS_PREPARACAO '+JSON.stringify(result));
  return result;
}
function ftRegistrarReciboViagemCore_(token,data){
  var session=obterSessao_(token),isAdmin=String(session.perfil||'').toUpperCase()==='ADMIN',motoristaId='';
  if(!isAdmin)motoristaId=exigirMotorista_(session);
  data=data||{};
  var opId=String(data.operacaoId||'').trim(),partId=String(data.participacaoId||'').trim();
  var type=String(data.tipoRecibo||'').trim().toUpperCase(),mime=String(data.mimeType||'').trim().toLowerCase();
  var name=String(data.nomeArquivo||'recibo.jpg').replace(/[\\/:*?"<>|]/g,'_').slice(0,150);
  var base64=String(data.base64||'').replace(/^data:[^,]+,/,'').replace(/\s/g,'');
  var note=String(data.observacoes||'').trim().slice(0,1000);
  if(!opId||!partId)throw new Error('Operação e participação são obrigatórias.');
  if(['CARREGAMENTO','DESCARGA'].indexOf(type)<0)throw new Error('Tipo de comprovante inválido. Use apenas carregamento ou descarga.');
  if(['image/jpeg','image/png','image/webp'].indexOf(mime)<0)throw new Error('Envie uma foto JPG, PNG ou WEBP.');
  if(!base64||base64.length>11500000)throw new Error('A imagem está vazia ou excede o limite permitido.');
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var opSh=getSheet_('OPERACOES'),opGrid=opSh.getDataRange().getValues(),oh=(opGrid[0]||[]).map(function(v){return String(v||'').trim().toUpperCase();}),oi={};
    oh.forEach(function(v,i){if(v&&oi[v]===undefined)oi[v]=i;});
    var op=opGrid.slice(1).find(function(r){return String(r[oi.ID]||'')===opId;});
    if(!op)throw new Error('Operação não encontrada.');
    if(['ABERTA','EM_ANDAMENTO'].indexOf(String(op[oi.STATUS]||'').toUpperCase())<0)throw new Error('A operação não aceita novos comprovantes neste status.');
    var parts=getSheet_('PARTICIPACAO_OPERACOES'),pm=ftTicketMap_(parts),pRows=parts.getDataRange().getValues();
    var part=pRows.slice(1).find(function(r){return String(r[pm.ID]||'')===partId&&String(r[pm.OPERACAO_ID]||'')===opId;});
    if(!part)throw new Error('A participação não pertence a esta operação.');
    var pStatus=String(part[pm.STATUS_PARTICIPACAO]||'').toUpperCase();
    if(['ACEITA','ATIVO','SAIU','EM_VIAGEM','RETORNOU'].indexOf(pStatus)<0)throw new Error('O motorista precisa ter aceitado a convocação para anexar comprovantes.');
    if(!isAdmin&&String(part[pm.MOTORISTA_ID]||'')!==motoristaId)throw new Error('Você só pode enviar comprovantes da sua própria participação.');
    var dbId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID'),destId='';
    if(!dbId)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
    if(!isAdmin){
      var allocation=SpreadsheetApp.openById(dbId).getSheetByName('ALOCACAO_DESTINOS');
      if(!allocation||allocation.getLastRow()<2)throw new Error('Seu destino ainda não foi distribuído nesta operação. Solicite ao administrador que conclua a distribuição.');
      var am=ftTicketMap_(allocation),aRows=allocation.getDataRange().getValues().slice(1);
      var active=aRows.filter(function(r){return String(r[am.PARTICIPACAO_ID]||'')===partId&&String(r[am.OPERACAO_ID]||'')===opId&&String(r[am.MOTORISTA_ID]||'')===motoristaId&&String(r[am.STATUS]||'').toUpperCase()==='ATIVA';});
      if(active.length!==1)throw new Error(active.length?'Há mais de um destino ativo vinculado à sua participação. Solicite revisão ao administrador.':'Seu destino ainda não foi distribuído nesta operação.');
      destId=String(active[0][am.DESTINO_ID]||'').trim();
    }else{destId=String(data.destinoId||'').trim();if(!destId)throw new Error('O administrador deve informar o destino.');}
    var destSh=SpreadsheetApp.openById(dbId).getSheetByName('DESTINOS_OPERACAO');
    if(!destSh)throw new Error('A guia DESTINOS_OPERACAO não está preparada.');
    var dm=ftTicketMap_(destSh),dr=destSh.getDataRange().getValues();
    var dest=dr.slice(1).find(function(r){return String(r[dm.ID]||'')===destId&&String(r[dm.OPERACAO_ID]||'')===opId;});
    if(!dest)throw new Error('O destino associado à participação não pertence a esta operação.');
    var bytes=Utilities.base64Decode(base64),blob=Utilities.newBlob(bytes,mime,name),folder=ftTicketFolder_(),file=folder.createFile(blob);
    var sh=ftTicketSheet_(),map=ftTicketMap_(sh),now=new Date(),id=Utilities.getUuid(),row=new Array(sh.getLastColumn()).fill('');
    var values={ID:id,RECEBIDO_EM:now,WHATSAPP_MESSAGE_ID:'',REMETENTE:isAdmin?'PAINEL_ADMIN':'PORTAL_MOTORISTA',MOTORISTA_ID:part[pm.MOTORISTA_ID],OPERACAO_ID:opId,TIPO_RECIBO:type,MEDIA_ID:'',DRIVE_FILE_ID:file.getId(),DRIVE_URL:file.getUrl(),NOME_ARQUIVO:file.getName(),MIME_TYPE:mime,STATUS:'AGUARDANDO_ANALISE_IA',DESTINO_ID:destId,PARTICIPACAO_ID:partId,OBSERVACOES:note,RETENCAO_ATE:'',METADADOS:JSON.stringify({origem:isAdmin?'CAPTURA_PAINEL':'PORTAL_MOTORISTA',registradoPor:session.login||motoristaId,destino:String(dest[dm.CLIENTE_DESTINO]||''),iaStatus:'AGUARDANDO'})};
    Object.keys(values).forEach(function(k){if(map[k]!==undefined)row[map[k]]=values[k];});sh.appendRow(row);var rowNumber=sh.getLastRow();
    var ai={status:'PENDENTE',mensagem:'A foto foi salva. Configure FT_GEMINI_API_KEY nas propriedades do projeto para ativar a leitura automática.'};
    try{
      ai=FT_analisarReciboComIA_(bytes,mime);
      var meta={origem:isAdmin?'CAPTURA_PAINEL':'PORTAL_MOTORISTA',registradoPor:session.login||motoristaId,destino:String(dest[dm.CLIENTE_DESTINO]||''),iaStatus:ai.status,iaDados:ai.dados||null,iaErro:ai.erro||''};
      if(map.METADADOS!==undefined)sh.getRange(rowNumber,map.METADADOS+1).setValue(JSON.stringify(meta));
      if(map.STATUS!==undefined)sh.getRange(rowNumber,map.STATUS+1).setValue(ai.status==='ANALISADO'?'AGUARDANDO_CONFERENCIA':'AGUARDANDO_ANALISE_IA');
    }catch(aiError){
      ai={status:'ERRO',mensagem:'A foto foi armazenada, mas a análise por IA falhou: '+String(aiError&&aiError.message||aiError)};
      if(map.METADADOS!==undefined)sh.getRange(rowNumber,map.METADADOS+1).setValue(JSON.stringify({origem:isAdmin?'CAPTURA_PAINEL':'PORTAL_MOTORISTA',registradoPor:session.login||motoristaId,destino:String(dest[dm.CLIENTE_DESTINO]||''),iaStatus:'ERRO',iaErro:ai.mensagem}));
    }
    if(typeof auditar_==='function')auditar_(session,'RECIBO_VIAGEM_ANEXADO','OPERACAO',opId,'Comprovante '+id+'; tipo='+type+'; destino automático='+destId+'; participação='+partId+'; IA='+ai.status);
    return {ok:true,id:id,url:file.getUrl(),nome:file.getName(),status:'AGUARDANDO_CONFERENCIA',analiseIA:ai,message:ai.status==='ANALISADO'?'Comprovante recebido e analisado pela IA. Confira os dados extraídos.':'Foto armazenada e vinculada ao seu destino. '+(ai.mensagem||'')};
  }finally{lock.releaseLock();}
}


/**
 * Endpoints públicos de compatibilidade e do portal.
 * O nome V2 é exclusivo para evitar colisão com versões antigas do projeto Apps Script.
 */
function registrarReciboViagemFullTime(token,data){
  return ftRegistrarReciboViagemCore_(token,data);
}
function registrarReciboPortalMotoristaV2(token,data){
  return ftRegistrarReciboViagemCore_(token,data);
}

/** Complemento restrito ao motorista dono do comprovante ou a administrador. */
function complementarReciboViagemFullTime(token,reciboId,observacoes){
  var session=obterSessao_(token),isAdmin=String(session.perfil||'').toUpperCase()==='ADMIN',motoristaId='';
  if(!isAdmin)motoristaId=exigirMotorista_(session);
  reciboId=String(reciboId||'').trim();observacoes=String(observacoes||'').trim().slice(0,1000);
  if(!reciboId||!observacoes)throw new Error('Comprovante e complemento são obrigatórios.');
  var sh=ftTicketSheet_(),map=ftTicketMap_(sh),last=sh.getLastRow();if(last<2)throw new Error('Comprovante não encontrado.');
  var rows=sh.getRange(2,1,last-1,sh.getLastColumn()).getValues(),idx=rows.findIndex(function(r){return String(r[map.ID]||'')===reciboId;});
  if(idx<0)throw new Error('Comprovante não encontrado.');
  var row=rows[idx];if(!isAdmin&&String(row[map.MOTORISTA_ID]||'')!==motoristaId)throw new Error('Você só pode complementar seus próprios comprovantes.');
  var rn=idx+2;if(map.OBSERVACOES!==undefined)sh.getRange(rn,map.OBSERVACOES+1).setValue(observacoes);
  if(map.METADADOS!==undefined){var meta={};try{meta=JSON.parse(String(row[map.METADADOS]||'{}'));}catch(e){}meta.complementoMotorista=observacoes;meta.complementadoEm=new Date().toISOString();sh.getRange(rn,map.METADADOS+1).setValue(JSON.stringify(meta));}
  if(typeof auditar_==='function')auditar_(session,'RECIBO_VIAGEM_COMPLEMENTADO','OPERACAO',String(row[map.OPERACAO_ID]||''),'Comprovante '+reciboId+' complementado.');
  return {ok:true,message:'Complemento salvo.'};
}

function FT_analisarReciboComIA_(bytes,mime){
  var props=PropertiesService.getScriptProperties(),apiKey=props.getProperty('FT_GEMINI_API_KEY');
  if(!apiKey)return {status:'PENDENTE',mensagem:'A foto foi salva. Configure FT_GEMINI_API_KEY nas propriedades do projeto para ativar a leitura automática.'};
  var model=String(props.getProperty('FT_GEMINI_MODEL_RECIBOS')||'gemini-3.8-flash').trim();
   // Migra automaticamente a configuração antiga: o Gemini 2.5 Flash não aceita novas contas/projetos.
   if(model==='gemini-2.5-flash')model='gemini-3.8-flash';
  var endpoint='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(apiKey);
  var prompt='Você é especialista em leitura de tickets rodoviários de pesagem, carregamento e descarga no Brasil. Leia a imagem inteira, inclusive textos pequenos, placas, datas, número do ticket, tara, peso bruto e líquido. Extraia somente informações visíveis, nunca invente nem complete por suposição. Classifique tipo_documento exclusivamente como CARREGAMENTO ou DESCARGA. Responda somente JSON válido com as chaves: tipo_documento, emissor, cnpj_emissor, numero_documento, data_hora, placa_veiculo, motorista, produto, peso_bruto_kg, tara_kg, peso_liquido_kg, unidade_peso, origem, destino_impresso, observacoes_visiveis, texto_extraido, confianca_geral (0 a 1), campos_duvidosos (array), precisa_complemento (boolean), motivo_complemento. Use null para campo ausente ou ilegível; preserve números como impressos. Marque precisa_complemento=true somente se houver dado essencial ilegível ou dúvida relevante. Não confunda volume total da operação com peso desta viagem e não altere o destino cadastrado com base no texto impresso.';
  var payload={contents:[{parts:[{text:prompt},{inlineData:{mimeType:mime,data:Utilities.base64Encode(bytes)}}]}],generationConfig:{temperature:0,responseMimeType:'application/json'}};
  var response=UrlFetchApp.fetch(endpoint,{method:'post',contentType:'application/json',payload:JSON.stringify(payload),muteHttpExceptions:true});
  var status=response.getResponseCode(),body=response.getContentText();
  if(status<200||status>=300)throw new Error('Gemini API HTTP '+status+': '+body.slice(0,700));
  var parsed=JSON.parse(body),textOut=parsed.candidates&&parsed.candidates[0]&&parsed.candidates[0].content&&parsed.candidates[0].content.parts&&parsed.candidates[0].content.parts.map(function(p){return p.text||'';}).join('');
  if(!textOut)throw new Error('A IA não retornou conteúdo legível.');
  return {status:'ANALISADO',modelo:model,dados:JSON.parse(textOut),mensagem:'Leitura automática concluída. Confira os campos antes de usar os dados.'};
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

function listarDestinosPortalMotoristaFullTime(token,operacaoId,participacaoId){var session=obterSessao_(token),motoristaId=exigirMotorista_(session);operacaoId=String(operacaoId||'').trim();participacaoId=String(participacaoId||'').trim();if(!operacaoId||!participacaoId)throw new Error('Operação e participação são obrigatórias.');var parts=getSheet_('PARTICIPACAO_OPERACOES'),pm=ftTicketMap_(parts),pRows=parts.getDataRange().getValues();var part=pRows.slice(1).find(function(r){return String(r[pm.ID]||'')===participacaoId&&String(r[pm.OPERACAO_ID]||'')===operacaoId&&String(r[pm.MOTORISTA_ID]||'')===motoristaId;});if(!part)throw new Error('Participação não pertence ao motorista autenticado.');if(['ACEITA','ATIVO','SAIU','EM_VIAGEM','RETORNOU'].indexOf(String(part[pm.STATUS_PARTICIPACAO]||'').toUpperCase())<0)throw new Error('A convocação precisa estar aceita para consultar os destinos.');var db=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');if(!db)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');var sh=SpreadsheetApp.openById(db).getSheetByName('DESTINOS_OPERACAO');if(!sh||sh.getLastRow()<2)return [];var map=ftTicketMap_(sh);return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues().filter(function(r){return String(r[map.OPERACAO_ID]||'')===operacaoId;}).map(function(r){return {id:String(r[map.ID]||''),ordem:Number(r[map.ORDEM_ENTREGA]||0),cliente:String(r[map.CLIENTE_DESTINO]||''),local:String(r[map.LOCAL_ENTREGA]||''),cidadeUf:String(r[map.CIDADE_UF]||'')};}).sort(function(a,b){return a.ordem-b.ordem;});}
