/**
 * FULL TIME — MVP DESTINOS, CADASTRO MANUAL E CONTROLES
 * Migração aditiva: não limpa nem reordena dados existentes.
 * A operação permanece única; destinos são parcelas vinculadas por OPERACAO_ID.
 */
var FT_MVP_DESTINOS_HEADERS = ['ID','CRIADO_EM','OPERACAO_ID','ORDEM_ENTREGA','CLIENTE_DESTINO','LOCAL_ENTREGA','CIDADE_UF','VOLUME_PREVISTO_TONELADAS','VOLUME_ENTREGUE_TONELADAS','SALDO_TONELADAS','STATUS','DATA_PREVISTA','OBSERVACOES'];
var FT_MVP_MOV_HEADERS = ['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR','QUANTIDADE_VIAGENS','ID_DESTINO'];

function ftMvpNorm_(v){return String(v==null?'':v).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9_]/g,'');}
function ftMvpMap_(sh){var h=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]:[],m={};h.forEach(function(v,i){var k=ftMvpNorm_(v);if(k&&m[k]===undefined)m[k]=i;});return m;}
function ftMvpCol_(map,name){var n=ftMvpNorm_(name);if(map[n]===undefined)throw new Error('Coluna obrigatória ausente: '+name);return map[n];}
function ftMvpNum_(v){var s=String(v==null?'':v).trim().replace(/[^0-9,.-]/g,'');if(!s)return 0;if(s.indexOf(',')>=0&&s.indexOf('.')>=0)s=s.replace(/\./g,'').replace(',','.');else if(s.indexOf(',')>=0)s=s.replace(',','.');return Number(s);}
function ftMvpText_(v,max){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max||500);}
function ftMvpDate_(v){var s=ftMvpText_(v,10);if(!s)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(new Date(s+'T12:00:00').getTime()))throw new Error('Data inválida: '+s);return s;}
function ftMvpSheet_(name){return getSheet_(name);}
function ftMvpHasDestinations_(operationId){var id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');if(!id)return false;var ss=SpreadsheetApp.openById(id),sh=ss.getSheetByName('DESTINOS_OPERACAO');if(!sh||sh.getLastRow()<2)return false;var m=ftMvpMap_(sh),col=ftMvpCol_(m,'OPERACAO_ID')+1;return sh.getRange(2,col,sh.getLastRow()-1,1).getDisplayValues().some(function(r){return String(r[0])===String(operationId);});}
function ftMvpReadRows_(sh){var last=sh.getLastRow(),width=sh.getLastColumn();if(last<2)return [];var map=ftMvpMap_(sh),values=sh.getRange(2,1,last-1,width).getValues();return values.map(function(r,i){return {row:i+2,values:r,map:map};});}
function ftMvpWriteObject_(sh,obj){var map=ftMvpMap_(sh),row=new Array(sh.getLastColumn()).fill('');Object.keys(obj).forEach(function(k){var ix=map[ftMvpNorm_(k)];if(ix!==undefined)row[ix]=obj[k];});sh.appendRow(row);}
function ftMvpAudit_(session,action,opId,detail){if(typeof auditar_==='function')auditar_(session,action,'OPERACAO',opId,detail);}

function prepararEstruturaMvpDestinosFullTime(){
 var ssId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');if(!ssId)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
 var ss=SpreadsheetApp.openById(ssId),sh=ss.getSheetByName('DESTINOS_OPERACAO'),created=false;
 if(!sh){sh=ss.insertSheet('DESTINOS_OPERACAO');created=true;}
 var width=sh.getLastColumn(),actual=width?sh.getRange(1,1,1,width).getDisplayValues()[0].map(ftMvpNorm_):[];
 if(!actual.some(Boolean)){sh.getRange(1,1,1,FT_MVP_DESTINOS_HEADERS.length).setValues([FT_MVP_DESTINOS_HEADERS]);}
 else{
  var missing=FT_MVP_DESTINOS_HEADERS.filter(function(h){return actual.indexOf(ftMvpNorm_(h))<0;});
  if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
 }
 var moves=ss.getSheetByName('MOVIMENTACOES_OPERACAO');if(!moves)throw new Error('Guia MOVIMENTACOES_OPERACAO não encontrada.');
 var mm=ftMvpMap_(moves);if(mm.ID_DESTINO===undefined)moves.getRange(1,moves.getLastColumn()+1).setValue('ID_DESTINO');
 sh.setFrozenRows(1);sh.getRange(1,1,1,sh.getLastColumn()).setFontWeight('bold').setBackground('#173f70').setFontColor('#ffffff').setWrap(true);
 var result={ok:true,planilhaId:ssId,guia:'DESTINOS_OPERACAO',criada:created,colunas:sh.getLastColumn(),colunaIdDestinoAdicionada:true};Logger.log('FT_MVP_PREPARACAO_DESTINOS '+JSON.stringify(result));return result;
}

/** Cadastro estruturado/manual. Mesmo contrato de operação criada pela IA, sem chamar Gemini. */
function salvarOperacaoComDestinosFullTime(token,data){var session=obterSessao_(token);exigirAdmin_(session);return ftMvpCreateOperationForSession_(session,data);}
function ftMvpCreateOperationForSession_(session,data){data=data||{};
 var date=ftMvpDate_(data.data),client=ftMvpText_(data.cliente,120),name=ftMvpText_(data.nome,160),origin=ftMvpText_(data.origem,180);
 var volume=ftMvpNum_(data.volumeTotal),trips=Math.floor(ftMvpNum_(data.viagensPrevistas)),product=ftMvpText_(data.produto,160),type=ftMvpText_(data.tipoOperacao||'OUTRA',40).toUpperCase(),category=ftMvpText_(data.categoria||'PADRAO',40).toUpperCase();
 var distance=ftMvpNum_(data.distanciaKm),deliveryDate=ftMvpDate_(data.dataEntrega),windowStart=ftMvpText_(data.janelaInicio,5),windowEnd=ftMvpText_(data.janelaFim,5),duration=ftMvpNum_(data.tempoEstimadoHoras);
 if(data.distanciaKm!==''&&data.distanciaKm!=null&&!(distance>0))throw new Error('Distância deve ser maior que zero.');if(windowStart&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(windowStart))throw new Error('Janela inicial inválida.');if(windowEnd&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(windowEnd))throw new Error('Janela final inválida.');if(data.tempoEstimadoHoras!==''&&data.tempoEstimadoHoras!=null&&!(duration>0))throw new Error('Tempo estimado deve ser maior que zero.');
 var destinations=Array.isArray(data.destinos)?data.destinos:[];
 if(!date||!client||!name||!origin)throw new Error('Informe data, cliente responsável, nome da operação e origem.');
 if(!(volume>0&&isFinite(volume)))throw new Error('O volume total precisa ser maior que zero.');
 if(!(trips>0&&trips<=100000))throw new Error('Informe a quantidade prevista de viagens.');
 if(!['PADRAO','ALTO_DESEMPENHO','MANOBRA_DIFICIL','PRAZO_NAVIO'].includes(category))throw new Error('Categoria de escala inválida.');
 if(!['DESCARGA_NAVIO','TRANSFERENCIA_FABRICAS','REMOCAO_INTERNA','OUTRA'].includes(type))throw new Error('Tipo de operação inválido.');
 if(!destinations.length)throw new Error('Cadastre pelo menos um destino. Para destino único, informe apenas uma linha.');
 var clean=destinations.map(function(d,i){var customer=ftMvpText_(d.cliente,160),place=ftMvpText_(d.local,220),city=ftMvpText_(d.cidadeUf,120),qty=ftMvpNum_(d.volume),due=ftMvpDate_(d.dataPrevista),obs=ftMvpText_(d.observacoes,500);if(!customer||!place)throw new Error('Destino '+(i+1)+': informe empresa e local de entrega.');if(!(qty>0&&isFinite(qty)))throw new Error('Destino '+(i+1)+': volume precisa ser maior que zero.');return {ordem:i+1,cliente:customer,local:place,cidade:city,volume:qty,data:due,obs:obs};});
 var allocated=clean.reduce(function(sum,d){return sum+d.volume;},0);if(allocated>volume+0.000001)throw new Error('A soma dos destinos ('+allocated+' t) excede o volume total ('+volume+' t).');
 var ops=ftMvpSheet_('OPERACOES'),dest=ftMvpSheet_('DESTINOS_OPERACAO'),opMap=ftMvpMap_(ops),destMap=ftMvpMap_(dest);
 ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','VIAGENS_REALIZADAS','TIPO_OPERACAO'].forEach(function(k){ftMvpCol_(opMap,k);});
 FT_MVP_DESTINOS_HEADERS.forEach(function(k){ftMvpCol_(destMap,k);});
 var id=Utilities.getUuid(),now=new Date(),destSummary=clean.length===1?clean[0].cliente+' — '+clean[0].local:clean.length+' destinos';
 var firstDestination=clean.length===1?clean[0].local:destSummary;
 var opData={ID:id,CRIADO_EM:now,STATUS:'ABERTA',DATA_OPERACAO:date,CLIENTE:client,NOME_OPERACAO:name,ORIGEM:origin,DESTINO:firstDestination,CATEGORIA:category,VOLUME_TOTAL_TONELADAS:volume,TOTAL_VIAGENS_PREVISTAS:trips,SALDO_TONELADAS:volume,OBSERVACOES:ftMvpText_(data.observacoes,1000),CRIADO_POR:session.login||'ADMIN',VIAGENS_REALIZADAS:0,TIPO_OPERACAO:type,PRODUTO_SERVICO:product,DISTANCIA_KM:distance||'',DATA_ENTREGA:deliveryDate,JANELA_INICIO:windowStart,JANELA_FIM:windowEnd,TEMPO_ESTIMADO_HORAS:duration||''};
 var lock=LockService.getScriptLock();lock.waitLock(20000);var opRow=-1,added=[];
 try{
  ftMvpWriteObject_(ops,opData);opRow=ops.getLastRow();
  clean.forEach(function(d){var did=Utilities.getUuid();ftMvpWriteObject_(dest,{ID:did,CRIADO_EM:now,OPERACAO_ID:id,ORDEM_ENTREGA:d.ordem,CLIENTE_DESTINO:d.cliente,LOCAL_ENTREGA:d.local,CIDADE_UF:d.cidade,VOLUME_PREVISTO_TONELADAS:d.volume,VOLUME_ENTREGUE_TONELADAS:0,SALDO_TONELADAS:d.volume,STATUS:'PENDENTE',DATA_PREVISTA:d.data,OBSERVACOES:d.obs});added.push(did);});
 }catch(err){
  var dRows=ftMvpReadRows_(dest),dId=ftMvpMap_(dest).ID,dOp=ftMvpMap_(dest).OPERACAO_ID;
  for(var z=dRows.length-1;z>=0;z--)if(String(dRows[z].values[dOp])===id)dest.deleteRow(dRows[z].row);
  if(opRow>0)ops.deleteRow(opRow);
  throw new Error('Não foi possível concluir o cadastro; gravação revertida. '+err.message);
 }finally{lock.releaseLock();}
 _ftMvpAuditSafe_(session,'CRIAR_OPERACAO_MULTIDESTINO',id,volume+' t; destinos='+clean.length+'; distribuido='+allocated+' t; saldo não destinado='+(volume-allocated)+' t');
 return {ok:true,id:id,destinos:added.length,volumeTotal:volume,volumeDistribuido:allocated,saldoNaoDestinado:volume-allocated,message:'Operação criada com '+added.length+' destino(s). Saldo total inicial: '+volume+' t.'};
}
function _ftMvpAuditSafe_(s,a,id,d){try{ftMvpAudit_(s,a,id,d);}catch(e){console.error('Falha na auditoria MVP: '+e.message);}}

function listarDestinosOperacaoFullTime(token,operacaoId){
 var s=obterSessao_(token);exigirAdmin_(s);operacaoId=ftMvpText_(operacaoId,100);if(!operacaoId)throw new Error('Informe a operação.');
 var ssId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');if(!ssId)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');var sh=SpreadsheetApp.openById(ssId).getSheetByName('DESTINOS_OPERACAO');if(!sh)return [];var map=ftMvpMap_(sh),rows=ftMvpReadRows_(sh),get=function(r,k){var i=map[ftMvpNorm_(k)];return i===undefined?'':r.values[i];};
 return rows.filter(function(r){return String(get(r,'OPERACAO_ID'))===operacaoId;}).map(function(r){return {id:String(get(r,'ID')),ordem:Number(get(r,'ORDEM_ENTREGA')||0),cliente:String(get(r,'CLIENTE_DESTINO')||''),local:String(get(r,'LOCAL_ENTREGA')||''),cidadeUf:String(get(r,'CIDADE_UF')||''),previsto:ftMvpNum_(get(r,'VOLUME_PREVISTO_TONELADAS')),entregue:ftMvpNum_(get(r,'VOLUME_ENTREGUE_TONELADAS')),saldo:ftMvpNum_(get(r,'SALDO_TONELADAS')),status:String(get(r,'STATUS')||''),dataPrevista:String(get(r,'DATA_PREVISTA')||''),observacoes:String(get(r,'OBSERVACOES')||'')};}).sort(function(a,b){return a.ordem-b.ordem;});
}

/** Entrega associada obrigatoriamente a um destino; mantém saldo geral e saldo individual coerentes. */
function registrarEntregaDestinoFullTime(token,data){
 var session=obterSessao_(token);exigirAdmin_(session);data=data||{};
 var opId=ftMvpText_(data.operacaoId,100),destId=ftMvpText_(data.destinoId,100),setId=ftMvpText_(data.conjuntoId,100),tons=ftMvpNum_(data.toneladas),trips=Math.floor(ftMvpNum_(data.viagens)),obs=ftMvpText_(data.observacoes,1000);
 if(!opId||!destId||!setId)throw new Error('Selecione operação, destino e conjunto.');
 if(!(tons>0&&isFinite(tons)))throw new Error('Toneladas entregues devem ser maiores que zero.');
 if(!(trips>0&&trips<=10000))throw new Error('Informe a quantidade de viagens concluídas.');
 var lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  var ops=ftMvpSheet_('OPERACOES'),om=ftMvpMap_(ops),orows=ftMvpReadRows_(ops),oi=orows.find(function(r){return String(r.values[ftMvpCol_(om,'ID')])===opId;});if(!oi)throw new Error('Operação não encontrada.');
  var status=String(oi.values[ftMvpCol_(om,'STATUS')]||'');if(!['ABERTA','EM_ANDAMENTO'].includes(status))throw new Error('Operação não está aberta para entregas.');
  var totalBalance=ftMvpNum_(oi.values[ftMvpCol_(om,'SALDO_TONELADAS')]);if(tons>totalBalance+0.000001)throw new Error('Entrega excede o saldo geral de '+totalBalance+' t.');
  var dest=ftMvpSheet_('DESTINOS_OPERACAO'),dm=ftMvpMap_(dest),drows=ftMvpReadRows_(dest),di=drows.find(function(r){return String(r.values[ftMvpCol_(dm,'ID')])===destId&&String(r.values[ftMvpCol_(dm,'OPERACAO_ID')])===opId;});if(!di)throw new Error('Destino não pertence a esta operação.');
  var destBalance=ftMvpNum_(di.values[ftMvpCol_(dm,'SALDO_TONELADAS')]);if(tons>destBalance+0.000001)throw new Error('Entrega excede o saldo do destino ('+destBalance+' t).');
  var sets=listarRegistros_('CONJUNTOS'),set=sets.find(function(x){return String(x.id)===setId;});if(!set||String(set.status)!=='ATIVO')throw new Error('Conjunto não está ativo.');
  var fields=set.campos||[];if(String(fields[5]||'').toUpperCase()!=='APTO')throw new Error('Conjunto não está APTO.');
  var parts=ftMvpSheet_('PARTICIPACAO_OPERACOES'),pm=ftMvpMap_(parts),prows=ftMvpReadRows_(parts),part=prows.find(function(r){return String(r.values[ftMvpCol_(pm,'OPERACAO_ID')])===opId&&String(r.values[ftMvpCol_(pm,'CONJUNTO_ID')])===setId&&String(r.values[ftMvpCol_(pm,'STATUS_PARTICIPACAO')])==='ATIVO';});if(!part)throw new Error('Conjunto precisa estar designado e ativo nesta operação.');
  var tripsCol=om.VIAGENS_REALIZADAS!==undefined?om.VIAGENS_REALIZADAS:om.TOTAL_VIAGENS_CONCLUIDAS;if(tripsCol===undefined)throw new Error('Coluna de viagens realizadas ausente.');
  var moves=ftMvpSheet_('MOVIMENTACOES_OPERACAO'),mm=ftMvpMap_(moves),move={ID:Utilities.getUuid(),DATA_HORA:new Date(),OPERACAO_ID:opId,PARTICIPACAO_ID:part.values[ftMvpCol_(pm,'ID')],CONJUNTO_ID:setId,TONELADAS:tons,VIAGEM_CONCLUIDA:'SIM',OBSERVACOES:obs,REGISTRADO_POR:session.login||'ADMIN',QUANTIDADE_VIAGENS:trips,ID_DESTINO:destId};
  FT_MVP_MOV_HEADERS.forEach(function(k){ftMvpCol_(mm,k);});ftMvpWriteObject_(moves,move);
  var newDest=destBalance-tons,newTotal=totalBalance-tons;
  dest.getRange(di.row,ftMvpCol_(dm,'VOLUME_ENTREGUE_TONELADAS')+1).setValue(ftMvpNum_(di.values[ftMvpCol_(dm,'VOLUME_ENTREGUE_TONELADAS')])+tons);
  dest.getRange(di.row,ftMvpCol_(dm,'SALDO_TONELADAS')+1).setValue(Math.max(0,newDest));
  dest.getRange(di.row,ftMvpCol_(dm,'STATUS')+1).setValue(newDest<=0.000001?'CONCLUIDO':'PARCIAL');
  ops.getRange(oi.row,ftMvpCol_(om,'SALDO_TONELADAS')+1).setValue(Math.max(0,newTotal));
  ops.getRange(oi.row,ftMvpCol_(om,'STATUS')+1).setValue(newTotal<=0.000001?'CONCLUIDA':'EM_ANDAMENTO');
  var pT=ftMvpCol_(pm,'TONELADAS_MOVIMENTADAS'),pV=ftMvpCol_(pm,'VIAGENS_CONCLUIDAS');parts.getRange(part.row,pT+1).setValue(ftMvpNum_(part.values[pT])+tons);parts.getRange(part.row,pV+1).setValue(ftMvpNum_(part.values[pV])+trips);
  ops.getRange(oi.row,tripsCol+1).setValue(ftMvpNum_(oi.values[tripsCol])+trips);
  _ftMvpAuditSafe_(session,'ENTREGA_DESTINO',opId,tons+' t; '+trips+' viagem(ns); destino '+destId);
  return {ok:true,saldoOperacao:Math.max(0,newTotal),saldoDestino:Math.max(0,newDest),statusDestino:newDest<=0.000001?'CONCLUIDO':'PARCIAL',message:'Entrega registrada. Saldo do destino: '+Math.max(0,newDest)+' t; saldo da operação: '+Math.max(0,newTotal)+' t.'};
 }finally{lock.releaseLock();}
}

function cancelarOperacaoFullTime(token,operacaoId,motivo){
 var s=obterSessao_(token);exigirAdmin_(s);operacaoId=ftMvpText_(operacaoId,100);motivo=ftMvpText_(motivo,500);if(!operacaoId||!motivo)throw new Error('Informe operação e motivo obrigatório.');
 var sh=ftMvpSheet_('OPERACOES'),m=ftMvpMap_(sh),rows=ftMvpReadRows_(sh),r=rows.find(function(x){return String(x.values[ftMvpCol_(m,'ID')])===operacaoId;});if(!r)throw new Error('Operação não encontrada.');
 var st=String(r.values[ftMvpCol_(m,'STATUS')]||'');if(st==='CANCELADA')throw new Error('Operação já está cancelada.');if(st==='CONCLUIDA')throw new Error('Operação concluída não pode ser cancelada por este fluxo; solicite ajuste auditado.');
 sh.getRange(r.row,ftMvpCol_(m,'STATUS')+1).setValue('CANCELADA');if(typeof FT_AUTO_CANCELAR_OPERACAO_==='function')FT_AUTO_CANCELAR_OPERACAO_(operacaoId,motivo);var obsCol=m.OBSERVACOES;if(obsCol!==undefined)sh.getRange(r.row,obsCol+1).setValue((String(r.values[obsCol]||'')+' | CANCELADA: '+motivo+' | '+new Date().toISOString()).slice(0,2000));
 _ftMvpAuditSafe_(s,'CANCELAR_OPERACAO',operacaoId,motivo);return {ok:true,message:'Operação cancelada. Histórico preservado; novas entregas e convocações devem ser bloqueadas.'};
}
function reabrirOperacaoFullTime(token,operacaoId,motivo){
 var s=obterSessao_(token);exigirAdmin_(s);operacaoId=ftMvpText_(operacaoId,100);motivo=ftMvpText_(motivo,500);if(!operacaoId||!motivo)throw new Error('Informe operação e justificativa obrigatória.');
 var sh=ftMvpSheet_('OPERACOES'),m=ftMvpMap_(sh),rows=ftMvpReadRows_(sh),r=rows.find(function(x){return String(x.values[ftMvpCol_(m,'ID')])===operacaoId;});if(!r)throw new Error('Operação não encontrada.');
 var st=String(r.values[ftMvpCol_(m,'STATUS')]||'');if(st!=='CANCELADA')throw new Error('Somente operação cancelada pode ser reaberta.');
 var saldo=ftMvpNum_(r.values[ftMvpCol_(m,'SALDO_TONELADAS')]);sh.getRange(r.row,ftMvpCol_(m,'STATUS')+1).setValue(saldo<=0.000001?'CONCLUIDA':'EM_ANDAMENTO');
 _ftMvpAuditSafe_(s,'REABRIR_OPERACAO',operacaoId,motivo);return {ok:true,message:'Operação reaberta com justificativa. Revise escala e destinos antes de retomar.'};
}

function auditarMvpDestinosFullTime(){
 var id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');if(!id)throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
 var ss=SpreadsheetApp.openById(id),required=['OPERACOES','DESTINOS_OPERACAO','MOVIMENTACOES_OPERACAO','PARTICIPACAO_OPERACOES'],result={ok:true,guias:{},alertas:[]};
 required.forEach(function(n){var sh=ss.getSheetByName(n);if(!sh){result.ok=false;result.alertas.push('Guia ausente: '+n);result.guias[n]=null;return;}var map=ftMvpMap_(sh);result.guias[n]={linhas:Math.max(0,sh.getLastRow()-1),colunas:sh.getLastColumn(),cabecalhos:Object.keys(map)};});
 if(result.guias.DESTINOS_OPERACAO){FT_MVP_DESTINOS_HEADERS.forEach(function(h){if(result.guias.DESTINOS_OPERACAO.cabecalhos.indexOf(ftMvpNorm_(h))<0){result.ok=false;result.alertas.push('Coluna ausente em DESTINOS_OPERACAO: '+h);}});}
 if(result.guias.MOVIMENTACOES_OPERACAO&&result.guias.MOVIMENTACOES_OPERACAO.cabecalhos.indexOf('ID_DESTINO')<0){result.ok=false;result.alertas.push('MOVIMENTACOES_OPERACAO sem ID_DESTINO');}
 Logger.log('FT_MVP_AUDITORIA_DESTINOS '+JSON.stringify(result));return result;
}

/** Teste puro, sem planilha, sem API e sem gravar dados. */
function testarRegrasMvpDestinosFullTime(){
 var cases=[{name:'cinco destinos e saldo residual',total:800,parts:[120,100,300,50,90],expected:660},{name:'destino único',total:250,parts:[250],expected:250},{name:'não aceitar excesso',total:100,parts:[70,40],expected:null}];
 var out=cases.map(function(c){var sum=c.parts.reduce(function(a,b){return a+b;},0),ok=c.expected===null?sum>c.total:sum<=c.total&&sum===c.expected;return {teste:c.name,ok:ok,total:c.total,distribuido:sum,saldo:c.total-sum};});
 var result={ok:out.every(function(x){return x.ok;}),testes:out};Logger.log('FT_MVP_TESTE_REGRAS '+JSON.stringify(result));return result;
}

/** Validação de contingência manual: prova que o endpoint não consulta Gemini. */
function diagnosticarCadastroManualMvpFullTime(token){
 var s=obterSessao_(token);exigirAdmin_(s);return {ok:true,endpoint:'salvarOperacaoComDestinosFullTime',dependenciaIA:false,guiaDestinos:'DESTINOS_OPERACAO',aprovacaoAutomatica:false};
}
