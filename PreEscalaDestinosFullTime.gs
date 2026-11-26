/** FULL TIME — PRÉ-ESCALA EDITÁVEL POR DESTINO, ANTES DO ENVIO DAS CONVOCAÇÕES. */
var FT_ESCALA_DRAFT_PREFIX_='FT_ESCALA_PREVIA_V1_';
function FT_ESCALA_KEY_(id){return FT_ESCALA_DRAFT_PREFIX_+String(id||'').replace(/[^A-Za-z0-9_-]/g,'_');}
function FT_ESCALA_READ_(id){var raw=PropertiesService.getScriptProperties().getProperty(FT_ESCALA_KEY_(id));return raw?JSON.parse(raw):null;}
function FT_ESCALA_WRITE_(d){PropertiesService.getScriptProperties().setProperty(FT_ESCALA_KEY_(d.operacaoId),JSON.stringify(d));}
function FT_ESCALA_PREVIEW_(token,operacaoId){
 var u=obterSessao_(token);exigirAdmin_(u);operacaoId=String(operacaoId||'').trim();if(!operacaoId)throw new Error('Informe a operação.');
 var info=ftAlocData_(operacaoId),analysis=ordenarCandidatosOperacaoFullTime(token,operacaoId),eligible=analysis.filter(function(c){return c.eligible===true;});
 if(!info.destinos.length)throw new Error('Cadastre os destinos da operação antes de gerar a escala.');
 if(!eligible.length)throw new Error('Não há motoristas elegíveis para esta operação. Regularize os cadastros antes de gerar a pré-escala.');
 var initialTotal=Math.min(40,info.quantidadeNecessaria,eligible.length),quotas=ftAlocComputeQuotas_(info.destinos,initialTotal);
 var sorted=info.destinos.slice().sort(function(a,b){return b.volume-a.volume||a.ordem-b.ordem;}),selected=eligible.slice(0,initialTotal),items=[],cursor=0;
 sorted.forEach(function(d){for(var i=0;i<Number(quotas[d.id]||0);i++){var c=selected[cursor++];if(c)items.push({destinoId:d.id,conjuntoId:c.id,motoristaId:c.driverId,nome:c.driverName,capacidade:c.capacity,posicao:c.posicao});}});
 var draft={id:'PRE-'+Utilities.getUuid(),operacaoId:operacaoId,criadoEm:new Date().toISOString(),criadoPor:u.login||u.nome||'ADMIN',status:'RASCUNHO',quantidadeNecessaria:items.length,vagasPorDestino:quotas,destinos:info.destinos,alocacoes:items,elegiveis:eligible.map(function(c){return {conjuntoId:c.id,motoristaId:c.driverId,nome:c.driverName,capacidade:c.capacity,posicao:c.posicao};})};
 FT_ESCALA_WRITE_(draft);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_GERADA','OPERACAO',operacaoId,items.length+' vagas sugeridas em '+info.destinos.length+' destino(s); nenhuma convocação enviada.');
 return {ok:true,rascunhoId:draft.id,operacaoId:operacaoId,status:draft.status,quantidadeNecessaria:draft.quantidadeNecessaria,vagasPorDestino:draft.vagasPorDestino,destinos:draft.destinos,alocacoes:draft.alocacoes,elegiveis:draft.elegiveis};
}
function gerarPreviaEscalaDestinosFullTime(token,operacaoId){return FT_ESCALA_PREVIEW_(token,operacaoId);}
function obterPreviaEscalaDestinosFullTime(token,operacaoId){var u=obterSessao_(token);exigirAdmin_(u);var d=FT_ESCALA_READ_(operacaoId);if(!d)throw new Error('Ainda não existe prévia para esta operação. Gere a escala sugerida.');return d;}
function salvarEdicaoPreviaEscalaFullTime(token,data){
 var u=obterSessao_(token);exigirAdmin_(u);data=data||{};var opId=String(data.operacaoId||''),items=Array.isArray(data.alocacoes)?data.alocacoes:[],d=FT_ESCALA_READ_(opId);
 if(!d||d.status!=='RASCUNHO')throw new Error('A prévia não existe ou já foi aprovada. Gere uma nova prévia para editar.');
 var requested=data.vagasPorDestino&&typeof data.vagasPorDestino==='object'?data.vagasPorDestino:{},quotas={},total=0;
 d.destinos.forEach(function(x){var n=Number(requested[x.id]);if(!Number.isInteger(n)||n<0||n>40)throw new Error('Informe uma quantidade inteira entre 0 e 40 para o destino '+x.cliente+'.');quotas[x.id]=n;total+=n;});
 if(total<1||total>40)throw new Error('A quantidade total deve ficar entre 1 e 40 motoristas.');
 if(items.length!==total)throw new Error('A escala contém '+items.length+' seleções, mas as quantidades dos destinos somam '+total+'.');
 var dest=Object.fromEntries(d.destinos.map(function(x){return [x.id,x];})),cand=Object.fromEntries(d.elegiveis.map(function(x){return [x.conjuntoId,x];})),used={},counts={};
 items.forEach(function(x){var did=String(x.destinoId||''),sid=String(x.conjuntoId||''),c=cand[sid];if(!dest[did])throw new Error('Destino inválido na prévia.');if(!c)throw new Error('O conjunto selecionado não pertence à lista elegível atual. Gere uma nova prévia.');if(used[c.motoristaId])throw new Error('O motorista '+c.nome+' foi selecionado mais de uma vez.');used[c.motoristaId]=true;counts[did]=(counts[did]||0)+1;});
 d.destinos.forEach(function(x){if((counts[x.id]||0)!==quotas[x.id])throw new Error('O destino '+x.cliente+' precisa ter exatamente '+quotas[x.id]+' motorista(s), conforme a quantidade definida por Bruno.');});
 d.alocacoes=items.map(function(x){var c=cand[String(x.conjuntoId)],z=dest[String(x.destinoId)];return {destinoId:z.id,conjuntoId:c.conjuntoId,motoristaId:c.motoristaId,nome:c.nome,capacidade:c.capacidade,posicao:c.posicao};});
 d.vagasPorDestino=quotas;d.quantidadeNecessaria=total;d.atualizadoEm=new Date().toISOString();d.atualizadoPor=u.login||u.nome||'ADMIN';FT_ESCALA_WRITE_(d);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_EDITADA','OPERACAO',opId,total+' vagas; Bruno definiu a quantidade de motoristas por destino; convocações ainda não enviadas.');
 return {ok:true,message:'Prévia atualizada. Quantidades por destino e seleção de motoristas salvas; nenhuma convocação foi enviada.',alocacoes:d.alocacoes,vagasPorDestino:d.vagasPorDestino,quantidadeNecessaria:total};
}
function aprovarPreviaEscalaDestinosFullTime(token,operacaoId){
 var u=obterSessao_(token);exigirAdmin_(u);var opId=String(operacaoId||''),d=FT_ESCALA_READ_(opId);
 if(!d||d.status!=='RASCUNHO')throw new Error('Não existe uma prévia pendente de aprovação.');
 if(!Array.isArray(d.alocacoes)||d.alocacoes.length!==Number(d.quantidadeNecessaria)||d.quantidadeNecessaria<1)throw new Error('A pré-escala está incompleta. Salve novamente as quantidades e os motoristas.');
 var selected=d.alocacoes.map(function(x){return String(x.conjuntoId);});if(new Set(selected).size!==selected.length)throw new Error('Há motoristas duplicados na pré-escala.');
 var result=FT_iniciarConvocacaoAutomaticaFullTime(token,{operacaoId:opId,vagas:d.quantidadeNecessaria,preEscalaAprovada:true,rascunhoId:d.id,selecao:selected});
 d.status='APROVADA_CONVOCACOES_DISPARADAS';d.aprovadoEm=new Date().toISOString();d.aprovadoPor=u.login||u.nome||'ADMIN';d.resultadoConvocacao=result;FT_ESCALA_WRITE_(d);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_APROVADA_E_CONVOCADA','OPERACAO',opId,'Escala aprovada com '+d.quantidadeNecessaria+' motoristas; convocações iniciais disparadas.');
 return result;
}
/** Vincula aceite ao destino reservado; reposições ocupam automaticamente a primeira vaga disponível. */
function FT_ESCALA_REGISTRAR_ACEITE_(operacaoId,participacao){
 var draft=FT_ESCALA_READ_(operacaoId);if(!draft||draft.status!=='APROVADA_CONVOCACOES_DISPARADAS')return false;
 var sh=ftAlocEnsure_(),map=ftAlocMap_(sh),rows=ftAlocRows_(sh);
 if(rows.some(function(x){return String(x.PARTICIPACAO_ID)===String(participacao.ID)&&String(x.STATUS).toUpperCase()==='ATIVA';}))return true;
 var chosen=(draft.alocacoes||[]).find(function(x){return String(x.motoristaId)===String(participacao.MOTORISTA_ID)&&String(x.conjuntoId)===String(participacao.CONJUNTO_ID);});
 if(!chosen){
  var active=rows.filter(function(x){return String(x.OPERACAO_ID)===String(operacaoId)&&String(x.STATUS).toUpperCase()==='ATIVA';}),counts={};
  active.forEach(function(x){var id=String(x.DESTINO_ID||'');counts[id]=(counts[id]||0)+1;});
  var psh=getSheet_('PARTICIPACAO_OPERACOES'),pm=ftAlocMap_(psh),pv=psh.getDataRange().getValues();
  pv.slice(1).forEach(function(r){if(String(r[pm.OPERACAO_ID]||'')!==String(operacaoId)||String(r[pm.STATUS_PARTICIPACAO]||'').toUpperCase()!=='OFERTADA')return;var reserve=(draft.alocacoes||[]).find(function(x){return String(x.motoristaId)===String(r[pm.MOTORISTA_ID])&&String(x.conjuntoId)===String(r[pm.CONJUNTO_ID]);});if(reserve)counts[String(reserve.destinoId)]=(counts[String(reserve.destinoId)]||0)+1;});
  var open=(draft.destinos||[]).filter(function(dest){return (counts[String(dest.id)]||0)<Number(draft.vagasPorDestino[String(dest.id)]||0);}).sort(function(a,b){return Number(b.volume||0)-Number(a.volume||0)||Number(a.ordem||0)-Number(b.ordem||0);});
  if(open.length)chosen={destinoId:open[0].id,conjuntoId:String(participacao.CONJUNTO_ID),motoristaId:String(participacao.MOTORISTA_ID),capacidade:0};
 }
 if(!chosen)return false;
 var dest=(draft.destinos||[]).find(function(x){return String(x.id)===String(chosen.destinoId);});
 var group=(draft.alocacoes||[]).filter(function(x){return String(x.destinoId)===String(chosen.destinoId);});
 var total=group.reduce(function(n,x){return n+Number(x.capacidade||0);},0),reference=Number(dest&&dest.volume||0)*(total>0?Number(chosen.capacidade||0)/total:1/Math.max(1,Number(draft.vagasPorDestino[String(chosen.destinoId)]||1)));
 var obj={ID:Utilities.getUuid(),OPERACAO_ID:operacaoId,DESTINO_ID:chosen.destinoId,PARTICIPACAO_ID:participacao.ID,CONJUNTO_ID:participacao.CONJUNTO_ID,MOTORISTA_ID:participacao.MOTORISTA_ID,TONELADAS_REFERENCIA:reference,POSICAO_DESTINO:group.length+1,STATUS:'ATIVA',CRIADO_EM:new Date(),ATUALIZADO_EM:new Date(),REGISTRADO_POR:'MOTOR_AUTOMATICO',MOTIVO:'Destino herdado da pré-escala aprovada ou vaga liberada pela fila de reposição.'};
 var row=new Array(sh.getLastColumn()).fill('');Object.keys(obj).forEach(function(k){if(map[ftAlocNorm_(k)]!==undefined)row[map[ftAlocNorm_(k)]]=obj[k];});sh.appendRow(row);return true;
}
/** Testes puros: quantidade livre por destino, soma e duplicidade. Não acessa planilhas. */
function testarRegrasPreEscalaEditavelFullTime(){
 var dest=[{id:'D1',volume:60},{id:'D2',volume:30},{id:'D3',volume:10}],q=ftAlocComputeQuotas_(dest,7),sum=Object.keys(q).reduce(function(n,k){return n+q[k];},0),checks={somaPreservada:sum===7,permiteDestinoSemMotorista:q.D3===1||q.D3===0,quantidadePorDestinoInteira:Object.keys(q).every(function(k){return Number.isInteger(q[k])&&q[k]>=0;}),reducaoValida:Object.keys(ftAlocComputeQuotas_(dest,2)).reduce(function(n,k){return n+ftAlocComputeQuotas_(dest,2)[k];},0)===2};
 var result={ok:Object.keys(checks).every(function(k){return checks[k];}),checks:checks};if(!result.ok)throw new Error('Falha nas regras da pré-escala: '+JSON.stringify(result));Logger.log('FT_TESTE_PRE_ESCALA_EDITAVEL '+JSON.stringify(result));return result;
}
