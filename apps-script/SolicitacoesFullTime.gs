/**
 * FULL TIME — Solicitações multicanal, compatível com o contrato canônico
 * ENTRADA_OPERACOES_IA (18 colunas). Não cria cabeçalhos paralelos.
 */
const FT_SOLICITACOES_CFG_V20261111 = Object.freeze({
  SHEET:'ENTRADA_OPERACOES_IA',
  HEADERS:['ID','RECEBIDO_EM','ORIGEM_MENSAGEM','MENSAGEM_BRUTA','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','DATA_OPERACAO','VOLUME_TONELADAS','VIAGENS_PREVISTAS','PRODUTO','TIPO_OPERACAO','STATUS_INTERPRETACAO','OPERACAO_ID','OBSERVACOES','INTERPRETACAO_JSON','PROCESSADO_EM'],
  CHANNELS:['WHATSAPP_OFICIAL','WHATSAPP_PESSOAL_ENCAMINHADO','PAINEL','EMAIL','TELEFONE','OUTRO'],
  STATUSES:['RECEBIDA','EM_COLETA','AGUARDANDO_IA','AGUARDANDO_APROVACAO','APROVADA','RECUSADA','AJUSTE_SOLICITADO']
});
function ftSolSheet_(){
  var id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id)throw new Error('FT_REGISTRY_DATABASE_ID não está configurado.');
  var sh=SpreadsheetApp.openById(id).getSheetByName(FT_SOLICITACOES_CFG_V20261111.SHEET);
  if(!sh)throw new Error('A guia ENTRADA_OPERACOES_IA não existe na planilha principal.');
  ftSolEnsureHeaders_(sh); return sh;
}
function ftSolEnsureHeaders_(sh){
  var expected=FT_SOLICITACOES_CFG_V20261111.HEADERS;
  var actual=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(function(x){return String(x||'').trim().toUpperCase();});
  if(actual.length!==expected.length||!expected.every(function(x,i){return actual[i]===x;}))
    throw new Error('Contrato de ENTRADA_OPERACOES_IA divergente. Esperado: '+expected.join(' | ')+'. Encontrado: '+actual.join(' | ')+'. Nenhum dado foi alterado.');
  sh.setFrozenRows(1);
}
function ftSolText_(v,max){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function ftSolJson_(v,fallback){if(v==null||v==='')return fallback;if(typeof v!=='string')return v;try{return JSON.parse(v);}catch(e){throw new Error('JSON inválido nos dados da solicitação.');}}
function ftSolCols_(sh){var h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],m={};h.forEach(function(v,i){m[String(v).trim()]=i+1;});return m;}
function ftSolEvent_(acao,autor,detalhe){return {em:new Date().toISOString(),acao:acao,autor:autor||'SISTEMA',detalhe:detalhe||''};}
function ftSolMeta_(row,c){var raw=row[c.INTERPRETACAO_JSON-1];var meta={};try{meta=JSON.parse(raw||'{}')||{};}catch(e){};if(!meta.solicitacao)meta.solicitacao={};return meta;}
function ftSolPutMeta_(sh,row,c,meta){sh.getRange(row,c.INTERPRETACAO_JSON).setValue(JSON.stringify(meta));}
function ftSolFindRow_(sh,c,id){var last=sh.getLastRow();if(last<2)return -1;var ids=sh.getRange(2,c.ID,last-1,1).getDisplayValues();for(var i=0;i<ids.length;i++)if(ids[i][0]===id)return i+2;return -1;}
function ftSolDate_(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');return v==null?'':String(v);}
function ftSolNumber_(value){var s=String(value==null?'':value).trim().replace(/[^0-9,.-]/g,'');if(!s)return 0;if(s.indexOf(',')!==-1&&s.indexOf('.')!==-1)s=s.replace(/\./g,'').replace(',','.');else if(s.indexOf(',')!==-1)s=s.replace(',','.');else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');var n=Number(s);return Number.isFinite(n)?n:0;}
function ftSolComputeMissingFields_(d){
 d=d||{};var m=[];
 if(!ftSolText_(d.cliente,120))m.push('Cliente');
 if(!ftSolText_(d.origemDetalhada||d.origem,160))m.push('Origem identificável (local e cidade/UF)');
 if(!ftSolText_(d.destinoDetalhado||d.destino,160))m.push('Destino identificável (local e cidade/UF)');
 if(!(ftSolNumber_(d.volume)>0))m.push('Peso/volume total numérico maior que zero');
 if(!(ftSolNumber_(d.volumePorViagem)>0)&&!(ftSolNumber_(d.viagensPrevistas)>0))m.push('Volume por viagem ou quantidade prevista de viagens');
 if(['t','ton','tonelada','toneladas'].indexOf(ftSolText_(d.unidadeVolume,30).toLowerCase())<0)m.push('Unidade do peso confirmada em toneladas (t)');
 var date=ftSolText_(d.dataColeta,10),parsed=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T12:00:00'):null;
 if(!parsed||isNaN(parsed.getTime())||Utilities.formatDate(parsed,Session.getScriptTimeZone(),'yyyy-MM-dd')!==date)m.push('Data absoluta válida da coleta (AAAA-MM-DD)');
 return m;
}
function ftSolCreate_(payload,author){
 payload=payload||{};var original=ftSolText_(payload.texto,12000);if(!original)throw new Error('O texto original da solicitação é obrigatório.');
 var channel=ftSolText_(payload.canal||'PAINEL',50).toUpperCase();if(FT_SOLICITACOES_CFG_V20261111.CHANNELS.indexOf(channel)<0)channel='OUTRO';
 var source=ftSolText_(payload.identificadorOrigem,180),key=ftSolText_(payload.chaveIdempotencia,180);
 if(!key){var digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,[channel,source,original].join('|'),Utilities.Charset.UTF_8);key=Utilities.base64EncodeWebSafe(digest).replace(/=+$/g,'');}
 var extracted=ftSolJson_(payload.dadosExtraidos,{}),pending=ftSolJson_(payload.camposPendentes,[]);if(!Array.isArray(pending))throw new Error('camposPendentes deve ser uma lista.');
 var questions=ftSolText_(payload.perguntas,5000),sh=ftSolSheet_(),c=ftSolCols_(sh),lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  var last=sh.getLastRow(),now=new Date();
  if(last>1){var rows=sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();for(var i=0;i<rows.length;i++){var m=ftSolMeta_(rows[i],c);if(m.solicitacao&&m.solicitacao.chaveIdempotencia===key)return {ok:true,duplicada:true,id:String(rows[i][c.ID-1]),status:String(rows[i][c.STATUS_INTERPRETACAO-1]),message:'Solicitação já recebida; registro existente reutilizado.'};}}
  var d=extracted.dados||extracted, id='SOL-'+Utilities.getUuid(), row=new Array(sh.getLastColumn()).fill('');
  function put(k,v){row[c[k]-1]=v;}
  put('ID',id);put('RECEBIDO_EM',now);put('ORIGEM_MENSAGEM',channel);put('MENSAGEM_BRUTA',original);
  put('CLIENTE',d.cliente||'');put('NOME_OPERACAO',d.nomeOperacao||'');put('ORIGEM',d.origemDetalhada||d.origem||'');put('DESTINO',d.destinoDetalhado||d.destino||'');
  put('DATA_OPERACAO',d.dataColeta||'');put('VOLUME_TONELADAS',d.volume||'');put('VIAGENS_PREVISTAS',d.viagensPrevistas||'');put('PRODUTO',d.produto||'');put('TIPO_OPERACAO',d.tipoOperacao||'');
  var status=pending.length?'EM_COLETA':'RECEBIDA';put('STATUS_INTERPRETACAO',status);put('OBSERVACOES',d.observacoes||'');
  put('INTERPRETACAO_JSON',JSON.stringify({dados:d,analise:extracted,solicitacao:{criadoPor:author||channel,statusEntrada:status,camposPendentes:pending,perguntas:questions,identificadorOrigem:source,chaveIdempotencia:key,idCargaGerada:'',idOperacaoGerada:'',atualizadoEm:now.toISOString(),historico:[ftSolEvent_('SOLICITACAO_CRIADA',author||channel,'Entrada registrada; nenhuma operação definitiva criada.')]}}));
  sh.appendRow(row);return {ok:true,duplicada:false,id:id,status:status,message:'Solicitação registrada para triagem.'};
 }finally{lock.releaseLock();}
}
function registrarSolicitacaoPainelFullTime(token,payload){var s=obterSessao_(token);exigirAdmin_(s);return ftSolCreate_(payload,s.login||'ADMIN');}
function registrarSolicitacaoCanalInternoFullTime(payload,origemAutenticada){if(origemAutenticada!==true)throw new Error('Origem do canal não autenticada.');return ftSolCreate_(payload,'CANAL_AUTENTICADO');}
function listarSolicitacoesFullTime(token,limite){
 var s=obterSessao_(token);exigirAdmin_(s);var sh=ftSolSheet_(),c=ftSolCols_(sh),last=sh.getLastRow();if(last<2)return [];
 var count=Math.min(Math.max(Number(limite)||50,1),200),start=Math.max(2,last-count+1);
 return sh.getRange(start,1,last-start+1,sh.getLastColumn()).getValues().reverse().map(function(r){
  var meta=ftSolMeta_(r,c),m=meta.solicitacao||{},d=meta.dados||meta.analise&&meta.analise.dados||{};
  return {id:r[c.ID-1],criadoEm:ftSolDate_(r[c.RECEBIDO_EM-1]),criadoPor:m.criadoPor||'',status:r[c.STATUS_INTERPRETACAO-1]||m.statusEntrada||'RECEBIDA',textoOriginal:r[c.MENSAGEM_BRUTA-1]||'',dadosExtraidos:JSON.stringify(meta.analise||meta),camposPendentes:JSON.stringify(m.camposPendentes||[]),perguntas:m.perguntas||'',canal:r[c.ORIGEM_MENSAGEM-1]||'',identificadorOrigem:m.identificadorOrigem||'',idCargaGerada:m.idCargaGerada||'',idOperacaoGerada:r[c.OPERACAO_ID-1]||m.idOperacaoGerada||'',atualizadoEm:m.atualizadoEm||''};
 });
}
function adicionarMensagemSolicitacaoFullTime(token,id,mensagem,canal){
 var s=obterSessao_(token);exigirAdmin_(s);id=ftSolText_(id,180);mensagem=ftSolText_(mensagem,12000);if(!id||!mensagem)throw new Error('Solicitação e mensagem são obrigatórias.');
 var sh=ftSolSheet_(),c=ftSolCols_(sh),row=ftSolFindRow_(sh,c,id);if(row<0)throw new Error('Solicitação não encontrada.');
 var old=String(sh.getRange(row,c.MENSAGEM_BRUTA).getValue()||'');sh.getRange(row,c.MENSAGEM_BRUTA).setValue((old+'\n\n[CONTINUAÇÃO '+ftSolText_(canal||'PAINEL',50)+']\n'+mensagem).slice(0,30000));
 var meta=ftSolMeta_(sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0],c),m=meta.solicitacao;m.atualizadoEm=new Date().toISOString();m.historico=m.historico||[];m.historico.push(ftSolEvent_('MENSAGEM_ADICIONADA',s.login,'Mensagem complementar incorporada.'));ftSolPutMeta_(sh,row,c,meta);
 return {ok:true,id:id,message:'Mensagem incorporada à solicitação existente.'};
}
function atualizarStatusSolicitacaoFullTime(token,id,status,observacao){
 var s=obterSessao_(token);exigirAdmin_(s);if(FT_SOLICITACOES_CFG_V20261111.STATUSES.indexOf(status)<0||status==='RECEBIDA')throw new Error('Status de destino inválido.');
 var sh=ftSolSheet_(),c=ftSolCols_(sh),row=ftSolFindRow_(sh,c,id);if(row<0)throw new Error('Solicitação não encontrada.');
 var previous=String(sh.getRange(row,c.STATUS_INTERPRETACAO).getValue()||''),now=new Date(),meta=ftSolMeta_(sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0],c),m=meta.solicitacao;
 if(status==='APROVADA')ftSolValidateForApproval_(sh,c,row);
 if(status==='APROVADA'&&previous==='APROVADA')throw new Error('Esta solicitação já está aprovada.');
 sh.getRange(row,c.STATUS_INTERPRETACAO).setValue(status);m.statusEntrada=status;m.atualizadoEm=now.toISOString();if(status==='APROVADA'){m.confirmadoEm=now.toISOString();m.confirmadoPor=s.login||'ADMIN';}
 m.historico=m.historico||[];m.historico.push(ftSolEvent_('STATUS_ALTERADO',s.login,previous+' -> '+status+(observacao?'; '+ftSolText_(observacao,1000):'')));ftSolPutMeta_(sh,row,c,meta);
 return {ok:true,id:id,status:status,message:'Status atualizado; nenhuma operação definitiva foi criada.'};
}
function diagnosticarNucleoSolicitacoesFullTime(){var sh=ftSolSheet_();return {ok:true,guia:FT_SOLICITACOES_CFG_V20261111.SHEET,colunas:sh.getLastColumn(),registros:Math.max(0,sh.getLastRow()-1),contrato:'CANONICO_18_COLUNAS',canaisPreparados:FT_SOLICITACOES_CFG_V20261111.CHANNELS.slice(),webhookAtivo:false,criaOperacaoDefinitiva:false};}
function atualizarDadosSolicitacaoFullTime(token,id,dados,pendentes,perguntas){
 var s=obterSessao_(token);exigirAdmin_(s);dados=dados||{};var allowed=['cliente','contato','produto','tipoCarga','nomeOperacao','categoria','volume','unidadeVolume','volumePorViagem','viagensPrevistas','origem','origemDetalhada','destino','destinoDetalhado','dataColetaTexto','dataColeta','horarioColeta','dataEntregaTexto','dataEntrega','horarioEntrega','tipoOperacao','veiculoSolicitado','frequencia','restricoes','observacoes'],clean={};
 allowed.forEach(function(k){clean[k]=ftSolText_(dados[k],500);});
 var sh=ftSolSheet_(),c=ftSolCols_(sh),row=ftSolFindRow_(sh,c,id);if(row<0)throw new Error('Solicitação não encontrada.');
 var meta=ftSolMeta_(sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0],c),missing=ftSolComputeMissingFields_(clean),status=missing.length?'EM_COLETA':'AGUARDANDO_APROVACAO';
 meta.dados=clean;meta.analise={resumo:'Revisão humana',dados:clean,ambiguidades:meta.analise&&meta.analise.ambiguidades||[],prontoParaRevisao:missing.length===0,origemRevisao:'HUMANA',revisadoEm:new Date().toISOString()};
 var m=meta.solicitacao;m.camposPendentes=missing;m.perguntas=ftSolText_(perguntas,5000);m.statusEntrada=status;m.atualizadoEm=new Date().toISOString();m.historico=m.historico||[];m.historico.push(ftSolEvent_('REVISAO_MANUAL_SALVA',s.login,'Campos revisados; '+missing.length+' pendência(s).'));
 sh.getRange(row,c.CLIENTE).setValue(clean.cliente);sh.getRange(row,c.NOME_OPERACAO).setValue(clean.nomeOperacao);sh.getRange(row,c.ORIGEM).setValue(clean.origemDetalhada||clean.origem);sh.getRange(row,c.DESTINO).setValue(clean.destinoDetalhado||clean.destino);
 sh.getRange(row,c.DATA_OPERACAO).setValue(clean.dataColeta);sh.getRange(row,c.VOLUME_TONELADAS).setValue(clean.volume);sh.getRange(row,c.VIAGENS_PREVISTAS).setValue(clean.viagensPrevistas);sh.getRange(row,c.PRODUTO).setValue(clean.produto);sh.getRange(row,c.TIPO_OPERACAO).setValue(clean.tipoOperacao);sh.getRange(row,c.STATUS_INTERPRETACAO).setValue(status);sh.getRange(row,c.OBSERVACOES).setValue(clean.observacoes||clean.restricoes||'');ftSolPutMeta_(sh,row,c,meta);
 return {ok:true,id:id,status:status,camposPendentes:missing,message:missing.length?'Revisão salva. Ainda há '+missing.length+' pendência(s); aprovação bloqueada.':'Revisão salva e validada; solicitação pronta para aprovação.'};
}
function ftSolValidateForApproval_(sh,c,row){
 var meta=ftSolMeta_(sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0],c),d=meta.dados||meta.analise&&meta.analise.dados||{},missing=ftSolComputeMissingFields_(d),pending=meta.solicitacao&&meta.solicitacao.camposPendentes||[];
 if(pending.length)missing=missing.concat(pending.map(function(v){return 'Resolver: '+v;}));
 if(missing.length)throw new Error('Não é possível aprovar. Complete/valide: '+missing.join('; ')+'.');return d;
}
function converterSolicitacaoEmOperacaoFullTime(token,id){
 var s=obterSessao_(token);exigirAdmin_(s);var sh=ftSolSheet_(),c=ftSolCols_(sh),row=ftSolFindRow_(sh,c,id);if(row<0)throw new Error('Solicitação não encontrada.');
 var status=String(sh.getRange(row,c.STATUS_INTERPRETACAO).getValue()||'');if(status!=='APROVADA')throw new Error('A solicitação precisa estar APROVADA antes de gerar uma operação.');
 var meta=ftSolMeta_(sh.getRange(row,1,1,sh.getLastColumn()).getValues()[0],c),m=meta.solicitacao||{},existing=String(sh.getRange(row,c.OPERACAO_ID).getValue()||'');if(existing)return {ok:true,duplicada:true,idOperacao:existing,message:'Esta solicitação já gerou a operação '+existing+'. Nenhuma duplicata foi criada.'};
 var d=ftSolValidateForApproval_(sh,c,row),date=ftSolText_(d.dataColeta,10),weight=ftSolNumber_(d.volume),perTrip=ftSolNumber_(d.volumePorViagem),planned=ftSolNumber_(d.viagensPrevistas);
 if(!(planned>0)&&perTrip>0)planned=Math.ceil(weight/perTrip);planned=Math.floor(planned);if(!(planned>0&&planned<=100000))throw new Error('Não foi possível calcular as viagens previstas. Informe a quantidade de viagens ou o volume por viagem.');
 var types=['DESCARGA_NAVIO','TRANSFERENCIA_FABRICAS','REMOCAO_INTERNA','OUTRA'],type=String(d.tipoOperacao||'').toUpperCase();if(types.indexOf(type)<0)type='OUTRA';
 var categories=['PADRAO','ALTO_DESEMPENHO','MANOBRA_DIFICIL','PRAZO_NAVIO'],category=String(d.categoria||'PADRAO').toUpperCase();if(categories.indexOf(category)<0)category='PADRAO';
 var client=ftSolText_(d.cliente,120),origin=ftSolText_(d.origemDetalhada||d.origem,160),destination=ftSolText_(d.destinoDetalhado||d.destino,160),operationName=ftSolText_(d.nomeOperacao,160)||[ftSolText_(d.produto,60),client,origin+' → '+destination].filter(Boolean).join(' — ').slice(0,160);
 var obs=['[SOLICITACAO_ORIGEM:'+id+']',d.observacoes,d.restricoes,'Contato: '+(d.contato||'não informado'),d.dataEntregaTexto?'Entrega: '+d.dataEntregaTexto:''].filter(Boolean).join(' | ').slice(0,1000),operations=getSheet_('OPERACOES');
 var operationId=Utilities.getUuid(),now=new Date();ftOperationAppendFullTime_(operations,{ID:operationId,CRIADO_EM:now,STATUS:'ABERTA',DATA_OPERACAO:date,CLIENTE:client,NOME_OPERACAO:operationName,ORIGEM:origin,DESTINO:destination,CATEGORIA:category,VOLUME_TOTAL_TONELADAS:weight,TOTAL_VIAGENS_PREVISTAS:planned,SALDO_TONELADAS:weight,OBSERVACOES:obs,CRIADO_POR:s.login||s.nome||'ADMIN',VIAGENS_REALIZADAS:0,TIPO_OPERACAO:type,PRODUTO_SERVICO:d.produto||''});
 sh.getRange(row,c.OPERACAO_ID).setValue(operationId);sh.getRange(row,c.PROCESSADO_EM).setValue(now);m.idOperacaoGerada=operationId;m.atualizadoEm=now.toISOString();m.historico=m.historico||[];m.historico.push(ftSolEvent_('OPERACAO_GERADA',s.login,'Operação '+operationId+' criada; '+planned+' viagem(ns) previstas.'));ftSolPutMeta_(sh,row,c,meta);
 return {ok:true,duplicada:false,idOperacao:operationId,message:'Operação criada com vínculo à solicitação '+id+'; '+planned+' viagem(ns) previstas.'};
}