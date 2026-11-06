/**
 * FULL TIME - Núcleo central de solicitações multicanal
 * Recebe solicitações e cria OPERAÇÕES somente após aprovação explícita.
 * Usa somente ENTRADA_OPERACOES_IA na base operacional.
 * Não acessa nem enumera guias da planilha do Bruno.
 */
const FT_SOL_REQUESTS_CFG = {
  SHEET: 'ENTRADA_OPERACOES_IA',
  HEADERS: ['ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL','DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA','ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO','CANAL_ORIGEM','IDENTIFICADOR_ORIGEM','CHAVE_IDEMPOTENCIA','ATUALIZADO_EM','HISTORICO_JSON','ID_OPERACAO_GERADA'],
  CHANNELS: ['WHATSAPP_OFICIAL','WHATSAPP_PESSOAL_ENCAMINHADO','PAINEL','EMAIL','TELEFONE','OUTRO'],
  STATUSES: ['RECEBIDA','EM_COLETA','AGUARDANDO_IA','AGUARDANDO_APROVACAO','APROVADA','RECUSADA','AJUSTE_SOLICITADO']
};

function ftSolSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!id) throw new Error('FT_REGISTRY_DATABASE_ID não está configurado.');
  var sh = SpreadsheetApp.openById(id).getSheetByName(FT_SOL_REQUESTS_CFG.SHEET);
  if (!sh) throw new Error('A guia ENTRADA_OPERACOES_IA não existe na base operacional.');
  ftSolEnsureHeaders_(sh);
  return sh;
}

function ftSolEnsureHeaders_(sh) {
  var h = FT_SOL_REQUESTS_CFG.HEADERS, width = Math.max(sh.getLastColumn(), 1);
  var current = sh.getRange(1,1,1,width).getDisplayValues()[0];
  if (!current.some(function(v){return String(v || '').trim();})) {
    sh.getRange(1,1,1,h.length).setValues([h]); sh.setFrozenRows(1); return;
  }
  for (var i=0;i<12;i++) {
    if (String(current[i] || '').trim() !== h[i])
      throw new Error('Cabeçalho incompatível em ENTRADA_OPERACOES_IA, coluna '+(i+1)+'. Esperado: '+h[i]+'. Nada foi alterado.');
  }
  var known = {};
  current.forEach(function(v){known[String(v || '').trim()] = true;});
  var missing = h.filter(function(v){return !known[v];});
  if (missing.length) sh.getRange(1,width+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);
}

function ftSolText_(v,max) {
  return String(v == null ? '' : v).replace(/\u0000/g,'').trim().slice(0,max);
}
function ftSolJson_(v,fallback) {
  if (v == null || v === '') return fallback;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch(e) { throw new Error('JSON inválido nos dados da solicitação.'); }
}
function ftSolCols_(sh) {
  var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], m={};
  h.forEach(function(v,i){if(String(v || '').trim())m[String(v).trim()]=i+1;});
  return m;
}
function ftSolEvent_(action,author,detail) {
  return {em:new Date().toISOString(),acao:action,autor:author || 'SISTEMA',detalhe:detail || ''};
}

/**
 * Função central compartilhada pelos adaptadores de todos os canais.
 * payload: texto, canal, identificadorOrigem, chaveIdempotencia,
 * dadosExtraidos, camposPendentes, perguntas.
 */
function ftSolCreate_(payload,author) {
  payload=payload || {};
  var original=ftSolText_(payload.texto,12000);
  if(!original) throw new Error('O texto original da solicitação é obrigatório.');
  var channel=ftSolText_(payload.canal || 'PAINEL',50).toUpperCase();
  if(FT_SOL_REQUESTS_CFG.CHANNELS.indexOf(channel)<0) channel='OUTRO';
  var source=ftSolText_(payload.identificadorOrigem,180);
  var key=ftSolText_(payload.chaveIdempotencia,180);
  if(!key) {
    var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,[channel,source,original].join('|'),Utilities.Charset.UTF_8);
    key=Utilities.base64EncodeWebSafe(digest).replace(/=+$/g,'');
  }
  var extracted=ftSolJson_(payload.dadosExtraidos,{});
  var pending=ftSolJson_(payload.camposPendentes,[]);
  if(!Array.isArray(pending)) throw new Error('camposPendentes deve ser uma lista.');
  var questions=ftSolText_(payload.perguntas,5000);
  var sh=ftSolSheet_(), c=ftSolCols_(sh), lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last=sh.getLastRow();
    if(last>1) {
      var keys=sh.getRange(2,c.CHAVE_IDEMPOTENCIA,last-1,1).getDisplayValues();
      for(var i=0;i<keys.length;i++) if(keys[i][0]===key) {
        var n=i+2;
        return {ok:true,duplicada:true,id:sh.getRange(n,c.ID).getDisplayValue(),status:sh.getRange(n,c.STATUS_ENTRADA).getDisplayValue(),message:'Solicitação já recebida; registro existente reutilizado.'};
      }
    }
    var now=new Date(), id='SOL-'+Utilities.getUuid(), row=new Array(sh.getLastColumn()).fill('');
    function put(name,value){row[c[name]-1]=value;}
    put('ID',id); put('CRIADO_EM',now); put('CRIADO_POR',author || channel);
    put('STATUS_ENTRADA',pending.length?'EM_COLETA':'RECEBIDA');
    put('TEXTO_ORIGINAL',original); put('DADOS_EXTRAIDOS_JSON',JSON.stringify(extracted));
    put('CAMPOS_PENDENTES_JSON',JSON.stringify(pending)); put('PERGUNTAS_IA',questions);
    put('CANAL_ORIGEM',channel); put('IDENTIFICADOR_ORIGEM',source);
    put('CHAVE_IDEMPOTENCIA',key); put('ATUALIZADO_EM',now);
    put('HISTORICO_JSON',JSON.stringify([ftSolEvent_('SOLICITACAO_CRIADA',author || channel,'Entrada registrada; nenhuma operação definitiva criada.')]));
    sh.appendRow(row);
    return {ok:true,duplicada:false,id:id,status:row[c.STATUS_ENTRADA-1],message:'Solicitação registrada para triagem.'};
  } finally { lock.releaseLock(); }
}

/** Entrada manual ou mensagem encaminhada pelo painel, autenticada por sessão admin. */
function registrarSolicitacaoPainelFullTime(token,payload) {
  var session=obterSessao_(token); exigirAdmin_(session);
  return ftSolCreate_(payload,session.login || 'ADMIN');
}

/** Adaptador interno. Só chamar após autenticação criptográfica do canal externo. */
function registrarSolicitacaoCanalInternoFullTime(payload,origemAutenticada) {
  if(origemAutenticada!==true) throw new Error('Origem do canal não autenticada.');
  return ftSolCreate_(payload,'CANAL_AUTENTICADO');
}

function listarSolicitacoesFullTime(token,limite) {
  var session=obterSessao_(token); exigirAdmin_(session);
  var sh=ftSolSheet_(), last=sh.getLastRow();
  if(last<2) return [];
  var c=ftSolCols_(sh), count=Math.min(Math.max(Number(limite)||50,1),200);
  var start=Math.max(2,last-count+1);
  return sh.getRange(start,1,last-start+1,sh.getLastColumn()).getValues().reverse().map(function(r){
    function v(k){
      var value=r[c[k]-1];
      if(value instanceof Date) return Utilities.formatDate(value,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');
      return value==null?'':value;
    }
    return {id:v('ID'),criadoEm:v('CRIADO_EM'),criadoPor:v('CRIADO_POR'),status:v('STATUS_ENTRADA'),textoOriginal:v('TEXTO_ORIGINAL'),dadosExtraidos:v('DADOS_EXTRAIDOS_JSON'),camposPendentes:v('CAMPOS_PENDENTES_JSON'),perguntas:v('PERGUNTAS_IA'),canal:v('CANAL_ORIGEM'),identificadorOrigem:v('IDENTIFICADOR_ORIGEM'),idOperacaoGerada:v('ID_OPERACAO_GERADA'),atualizadoEm:v('ATUALIZADO_EM')};
  });
}

/** Incorpora continuação à mesma solicitação para evitar registros separados por mensagem. */
function adicionarMensagemSolicitacaoFullTime(token,id,mensagem,canal) {
  var session=obterSessao_(token); exigirAdmin_(session);
  id=ftSolText_(id,180); mensagem=ftSolText_(mensagem,12000);
  if(!id || !mensagem) throw new Error('Solicitação e mensagem são obrigatórias.');
  var sh=ftSolSheet_(), c=ftSolCols_(sh), lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last=sh.getLastRow(); if(last<2) throw new Error('Solicitação não encontrada.');
    var ids=sh.getRange(2,c.ID,last-1,1).getDisplayValues(), n=-1;
    for(var i=0;i<ids.length;i++) if(ids[i][0]===id){n=i+2;break;}
    if(n<0) throw new Error('Solicitação não encontrada.');
    var old=String(sh.getRange(n,c.TEXTO_ORIGINAL).getValue() || '');
    sh.getRange(n,c.TEXTO_ORIGINAL).setValue((old+'\n\n[CONTINUAÇÃO '+ftSolText_(canal || 'PAINEL',50)+']\n'+mensagem).slice(0,30000));
    sh.getRange(n,c.ATUALIZADO_EM).setValue(new Date());
    var hist; try{hist=JSON.parse(sh.getRange(n,c.HISTORICO_JSON).getValue() || '[]');}catch(e){hist=[];}
    hist.push(ftSolEvent_('MENSAGEM_ADICIONADA',session.login,'Mensagem complementar incorporada.'));
    sh.getRange(n,c.HISTORICO_JSON).setValue(JSON.stringify(hist));
    return {ok:true,id:id,message:'Mensagem incorporada à solicitação existente.'};
  } finally {lock.releaseLock();}
}

/** Atualiza triagem/aprovação. Não cria OPERACOES nem CARGAS nesta fase. */
function atualizarStatusSolicitacaoFullTime(token,id,status,observacao) {
  var session=obterSessao_(token); exigirAdmin_(session);
  if(FT_SOL_REQUESTS_CFG.STATUSES.indexOf(status)<0 || status==='RECEBIDA') throw new Error('Status de destino inválido.');
  var sh=ftSolSheet_(), c=ftSolCols_(sh), lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last=sh.getLastRow(); if(last<2) throw new Error('Solicitação não encontrada.');
    var ids=sh.getRange(2,c.ID,last-1,1).getDisplayValues(), n=-1;
    for(var i=0;i<ids.length;i++) if(ids[i][0]===id){n=i+2;break;}
    if(n<0) throw new Error('Solicitação não encontrada.');
    var previous=sh.getRange(n,c.STATUS_ENTRADA).getDisplayValue(), now=new Date();
    if(status==='APROVADA') ftSolValidateForApproval_(sh,c,n);
    if(status==='APROVADA' && previous==='APROVADA') throw new Error('Esta solicitação já está aprovada.');
    sh.getRange(n,c.STATUS_ENTRADA).setValue(status); sh.getRange(n,c.ATUALIZADO_EM).setValue(now);
    if(status==='APROVADA') {
      sh.getRange(n,c.CONFIRMADO_EM).setValue(now);
      sh.getRange(n,c.CONFIRMADO_POR).setValue(session.login || 'ADMIN');
    }
    var hist; try{hist=JSON.parse(sh.getRange(n,c.HISTORICO_JSON).getValue() || '[]');}catch(e){hist=[];}
    hist.push(ftSolEvent_('STATUS_ALTERADO',session.login,previous+' -> '+status+(observacao?'; '+ftSolText_(observacao,1000):'')));
    sh.getRange(n,c.HISTORICO_JSON).setValue(JSON.stringify(hist));
    return {ok:true,id:id,status:status,message:'Status atualizado; nenhuma operação definitiva foi criada.'};
  } finally {lock.releaseLock();}
}

function diagnosticarNucleoSolicitacoesFullTime() {
  var sh=ftSolSheet_();
  return {ok:true,guia:FT_SOL_REQUESTS_CFG.SHEET,colunas:sh.getLastColumn(),registros:Math.max(0,sh.getLastRow()-1),canaisPreparados:FT_SOL_REQUESTS_CFG.CHANNELS.slice(),webhookAtivo:false,criaOperacaoDefinitiva:false};
}

/** Salva a revisão humana dos dados extraídos sem alterar a mensagem original. */
function atualizarDadosSolicitacaoFullTime(token,id,dados,pendentes,perguntas) {
  var session=obterSessao_(token); exigirAdmin_(session);
  id=ftSolText_(id,180); dados=dados||{};
  var allowed=['cliente','contato','produto','tipoCarga','volume','unidadeVolume','volumePorViagem','origem','origemDetalhada','destino','destinoDetalhado','dataColetaTexto','dataColeta','horarioColeta','dataEntregaTexto','dataEntrega','horarioEntrega','tipoOperacao','veiculoSolicitado','frequencia','restricoes','observacoes'];
  var clean={}; allowed.forEach(function(k){clean[k]=ftSolText_(dados[k],500);});
  if(!Array.isArray(pendentes)) throw new Error('A lista de pendências é inválida.');
  var pending=pendentes.map(function(v){return ftSolText_(v,120);}).filter(Boolean);
  var sh=ftSolSheet_(),c=ftSolCols_(sh),lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    var last=sh.getLastRow(),ids=last>1?sh.getRange(2,c.ID,last-1,1).getDisplayValues():[],row=-1;
    for(var i=0;i<ids.length;i++)if(ids[i][0]===id){row=i+2;break;}
    if(row<0)throw new Error('Solicitação não encontrada.');
    var previous=String(sh.getRange(row,c.DADOS_EXTRAIDOS_JSON).getValue()||'{}'), old={};
    try{old=JSON.parse(previous)||{};}catch(e){}
    var analysis={resumo:old.resumo||'Revisão manual',dados:clean,ambiguidades:old.ambiguidades||[],prontoParaRevisao:pending.length===0,origemRevisao:'HUMANA',revisadoEm:new Date().toISOString()};
    var status=pending.length?'EM_COLETA':'AGUARDANDO_APROVACAO';
    sh.getRange(row,c.DADOS_EXTRAIDOS_JSON).setValue(JSON.stringify(analysis));
    sh.getRange(row,c.CAMPOS_PENDENTES_JSON).setValue(JSON.stringify(pending));
    sh.getRange(row,c.PERGUNTAS_IA).setValue(ftSolText_(perguntas,5000));
    sh.getRange(row,c.STATUS_ENTRADA).setValue(status);sh.getRange(row,c.ATUALIZADO_EM).setValue(new Date());
    var hist=[];try{hist=JSON.parse(sh.getRange(row,c.HISTORICO_JSON).getValue()||'[]');}catch(e){}
    hist.push(ftSolEvent_('REVISAO_MANUAL_SALVA',session.login,'Campos revisados; '+pending.length+' pendência(s).'));
    sh.getRange(row,c.HISTORICO_JSON).setValue(JSON.stringify(hist));
    return {ok:true,id:id,status:status,message:pending.length?'Revisão salva. Ainda há campos pendentes.':'Revisão salva; solicitação pronta para aprovação.'};
  } finally {lock.releaseLock();}
}

function ftSolFindRow_(sh,c,id){
  var last=sh.getLastRow();if(last<2)return -1;
  var ids=sh.getRange(2,c.ID,last-1,1).getDisplayValues();
  for(var i=0;i<ids.length;i++)if(ids[i][0]===id)return i+2;
  return -1;
}
function ftSolValidateForApproval_(sh,c,row){
  var raw=String(sh.getRange(row,c.DADOS_EXTRAIDOS_JSON).getValue()||'{}'),a={};
  try{a=JSON.parse(raw)||{};}catch(e){}
  var d=a.dados||a,missing=[];
  if(!ftSolText_(d.cliente,120))missing.push('cliente');
  if(!ftSolText_(d.origemDetalhada||d.origem,160))missing.push('origem identificável');
  if(!ftSolText_(d.destinoDetalhado||d.destino,160))missing.push('destino identificável');
  var volume=Number(String(d.volume||'').replace(',','.'));
  if(!(volume>0&&isFinite(volume)))missing.push('peso/volume total numérico');
  var trips=Math.floor(Number(d.viagensPrevistas||d.quantidadeViagens||d.totalViagens||0));
  var perTrip=Number(String(d.volumePorViagem||'').replace(',','.'));
  if(!(trips>0)&&volume>0&&perTrip>0)trips=Math.ceil(volume/perTrip);
  if(!(trips>0))missing.push('quantidade prevista de viagens ou volume por viagem');
  if(['ALTO_DESEMPENHO','MANOBRA_DIFICIL','PRAZO_NAVIO'].indexOf(String(d.categoria||'').toUpperCase())<0)missing.push('categoria operacional validada');
  var unit=ftSolText_(d.unidadeVolume,30).toLowerCase().trim();
  if(['t','ton','tonelada','toneladas'].indexOf(unit)<0)missing.push('unidade do peso confirmada em toneladas (t)');
  var date=ftSolText_(d.dataColeta,10), parsedDate=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00'):null;
  if(!parsedDate || isNaN(parsedDate.getTime()) || Utilities.formatDate(parsedDate,Session.getScriptTimeZone(),'yyyy-MM-dd')!==date)missing.push('data absoluta válida da coleta');
  var pending=[];try{pending=JSON.parse(sh.getRange(row,c.CAMPOS_PENDENTES_JSON).getValue()||'[]');}catch(e){}
  if(pending.length)missing.push('resolver campos pendentes: '+pending.join(', '));
  if(missing.length)throw new Error('Não é possível aprovar. Complete/valide: '+missing.join('; ')+'.');
  return d;
}

/** Converte uma solicitação aprovada em OPERAÇÃO, com vínculo idempotente. */
function converterSolicitacaoEmOperacaoFullTime(token,id){
  var session=obterSessao_(token);exigirAdmin_(session);id=ftSolText_(id,180);
  var sh=ftSolSheet_(),c=ftSolCols_(sh),lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var row=ftSolFindRow_(sh,c,id);if(row<0)throw new Error('Solicitação não encontrada.');
    var status=String(sh.getRange(row,c.STATUS_ENTRADA).getValue()||'');
    if(status!=='APROVADA')throw new Error('A solicitação precisa estar APROVADA antes de gerar uma operação.');
    var existing=String(sh.getRange(row,c.ID_OPERACAO_GERADA).getValue()||'');
    if(existing)return {ok:true,duplicada:true,idOperacao:existing,message:'Esta solicitação já gerou a operação '+existing+'. Nenhuma duplicata foi criada.'};
    var d=ftSolValidateForApproval_(sh,c,row);
    var date=ftSolText_(d.dataColeta,10),weight=Number(String(d.volume).replace(',','.'));
    var trips=Math.floor(Number(d.viagensPrevistas||d.quantidadeViagens||d.totalViagens||0));
    var perTrip=Number(String(d.volumePorViagem||'').replace(',','.'));
    if(!(trips>0)&&perTrip>0)trips=Math.ceil(weight/perTrip);
    if(!(trips>0))throw new Error('Informe a quantidade prevista de viagens ou o volume por viagem.');
    var category=String(d.categoria||'').toUpperCase();
    if(['ALTO_DESEMPENHO','MANOBRA_DIFICIL','PRAZO_NAVIO'].indexOf(category)<0)throw new Error('A categoria operacional precisa ser validada antes de criar a operação.');
    var operationId='',ops=getSheet_('OPERACOES'),marker='[SOLICITACAO_ORIGEM:'+id+']';
    var obs=(marker+' '+[d.observacoes,d.restricoes,'Contato: '+(d.contato||'não informado')].filter(Boolean).join(' | ')).slice(0,1000);
    if(ops.getLastRow()>1){
      var notes=ops.getRange(2,13,ops.getLastRow()-1,1).getDisplayValues();
      for(var z=0;z<notes.length;z++)if(String(notes[z][0]||'').indexOf(marker)>=0){operationId=String(ops.getRange(z+2,1).getDisplayValue()||'');break;}
    }
    if(!operationId){
      operationId=Utilities.getUuid();
      var operationName=ftSolText_(d.nomeOperacao||d.nome,160)||('Operação da solicitação '+id);
      var endDate=ftSolText_(d.dataFimLimite,10),startWindow=ftSolText_(d.janelaInicio,5),endWindow=ftSolText_(d.janelaFim,5);
      var priority=String(d.prioridade||'NORMAL').toUpperCase();
      if(['BAIXA','NORMAL','ALTA','URGENTE'].indexOf(priority)<0)priority='NORMAL';
      var clientId=ftGetOrCreateClienteSolicitacao_(d.cliente,d.contato,session);
      var originName=ftSolText_(d.origemDetalhada||d.origem,160),destinationName=ftSolText_(d.destinoDetalhado||d.destino,160);
      var originId=ftGetOrCreateLocalOperacao_(clientId,originName,'ORIGEM',session),destinationId=ftGetOrCreateLocalOperacao_(clientId,destinationName,'DESTINO',session);
      ops.appendRow([operationId,new Date(),'ABERTA',date,ftSolText_(d.cliente,120),operationName,originName,destinationName,category,weight,trips,weight,obs,session.login||session.nome||'ADMIN','',0,0,endDate,startWindow,endWindow,priority,ftSolText_(d.produto||d.tipoCarga,120),ftSolText_(d.tipoOperacao,60),ftSolText_(d.contato,120),clientId,originId,destinationId]);
    }
    sh.getRange(row,c.ID_OPERACAO_GERADA).setValue(operationId);sh.getRange(row,c.ATUALIZADO_EM).setValue(new Date());
    var hist=[];try{hist=JSON.parse(sh.getRange(row,c.HISTORICO_JSON).getValue()||'[]');}catch(e){}
    hist.push(ftSolEvent_('OPERACAO_GERADA',session.login,'Operação '+operationId+' criada a partir da solicitação aprovada.'));
    sh.getRange(row,c.HISTORICO_JSON).setValue(JSON.stringify(hist));
    return {ok:true,duplicada:false,idOperacao:operationId,message:'Operação criada com '+trips+' viagens previstas e vínculo à solicitação '+id+'.'};
  }finally{lock.releaseLock();}
}
