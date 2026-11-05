/**
 * FULL TIME - Núcleo central de solicitações multicanal
 * Recebe solicitações sem criar OPERACOES/CARGAS definitivas.
 * Usa somente ENTRADA_OPERACOES_IA na base operacional.
 * Não acessa nem enumera guias da planilha do Bruno.
 */
const FT_SOL = {
  SHEET: 'ENTRADA_OPERACOES_IA',
  HEADERS: ['ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL','DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA','ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO','CANAL_ORIGEM','IDENTIFICADOR_ORIGEM','CHAVE_IDEMPOTENCIA','ATUALIZADO_EM','HISTORICO_JSON'],
  CHANNELS: ['WHATSAPP_OFICIAL','WHATSAPP_PESSOAL_ENCAMINHADO','PAINEL','EMAIL','TELEFONE','OUTRO'],
  STATUSES: ['RECEBIDA','EM_COLETA','AGUARDANDO_APROVACAO','APROVADA','RECUSADA','AJUSTE_SOLICITADO']
};

function ftSolSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!id) throw new Error('FT_REGISTRY_DATABASE_ID não está configurado.');
  var sh = SpreadsheetApp.openById(id).getSheetByName(FT_SOL.SHEET);
  if (!sh) throw new Error('A guia ENTRADA_OPERACOES_IA não existe na base operacional.');
  ftSolEnsureHeaders_(sh);
  return sh;
}

function ftSolEnsureHeaders_(sh) {
  var h = FT_SOL.HEADERS, width = Math.max(sh.getLastColumn(), 1);
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
  if(FT_SOL.CHANNELS.indexOf(channel)<0) channel='OUTRO';
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
    function v(k){return r[c[k]-1]==null?'':r[c[k]-1];}
    return {id:v('ID'),criadoEm:v('CRIADO_EM'),criadoPor:v('CRIADO_POR'),status:v('STATUS_ENTRADA'),textoOriginal:v('TEXTO_ORIGINAL'),dadosExtraidos:v('DADOS_EXTRAIDOS_JSON'),camposPendentes:v('CAMPOS_PENDENTES_JSON'),perguntas:v('PERGUNTAS_IA'),canal:v('CANAL_ORIGEM'),identificadorOrigem:v('IDENTIFICADOR_ORIGEM'),atualizadoEm:v('ATUALIZADO_EM')};
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
  if(FT_SOL.STATUSES.indexOf(status)<0 || status==='RECEBIDA') throw new Error('Status de destino inválido.');
  var sh=ftSolSheet_(), c=ftSolCols_(sh), lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last=sh.getLastRow(); if(last<2) throw new Error('Solicitação não encontrada.');
    var ids=sh.getRange(2,c.ID,last-1,1).getDisplayValues(), n=-1;
    for(var i=0;i<ids.length;i++) if(ids[i][0]===id){n=i+2;break;}
    if(n<0) throw new Error('Solicitação não encontrada.');
    var previous=sh.getRange(n,c.STATUS_ENTRADA).getDisplayValue(), now=new Date();
    sh.getRange(n,c.STATUS_ENTRADA).setValue(status); sh.getRange(n,c.ATUALIZADO_EM).setValue(now);
    if(status==='APROVADA' || status==='RECUSADA') {
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
  return {ok:true,guia:FT_SOL.SHEET,colunas:sh.getLastColumn(),registros:Math.max(0,sh.getLastRow()-1),canaisPreparados:FT_SOL.CHANNELS.slice(),webhookAtivo:false,criaOperacaoDefinitiva:false};
}
