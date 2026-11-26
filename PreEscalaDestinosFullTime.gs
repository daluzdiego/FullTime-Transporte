/** FULL TIME — PRÉ-ESCALA POR DESTINO, REVISÃO E APROVAÇÃO ANTES DA CONVOCAÇÃO.
 * Rascunhos ficam em ScriptProperties; nenhuma participação/oferta é criada na prévia.
 */
var FT_ESCALA_DRAFT_PREFIX_='FT_ESCALA_PREVIA_V1_';
function FT_ESCALA_KEY_(id){return FT_ESCALA_DRAFT_PREFIX_+String(id||'').replace(/[^A-Za-z0-9_-]/g,'_');}
function FT_ESCALA_READ_(id){var raw=PropertiesService.getScriptProperties().getProperty(FT_ESCALA_KEY_(id));return raw?JSON.parse(raw):null;}
function FT_ESCALA_WRITE_(d){PropertiesService.getScriptProperties().setProperty(FT_ESCALA_KEY_(d.operacaoId),JSON.stringify(d));}
function FT_ESCALA_PREVIEW_(token,operacaoId){
 var u=obterSessao_(token);exigirAdmin_(u);operacaoId=String(operacaoId||'').trim();if(!operacaoId)throw new Error('Informe a operação.');
 var info=ftAlocData_(operacaoId),analysis=ordenarCandidatosOperacaoFullTime(token,operacaoId),eligible=analysis.filter(function(c){return c.eligible===true;});
 if(!info.destinos.length)throw new Error('Cadastre os destinos da operação antes de gerar a escala.');
 if(eligible.length<info.quantidadeNecessaria)throw new Error('Há '+eligible.length+' conjunto(s) elegível(is), mas a operação exige '+info.quantidadeNecessaria+'. Regularize os cadastros ou ajuste a quantidade necessária.');
 var sorted=info.destinos.slice().sort(function(a,b){return b.volume-a.volume||a.ordem-b.ordem;}),selected=eligible.slice(0,info.quantidadeNecessaria),items=[],cursor=0;
 sorted.forEach(function(d){for(var i=0;i<Number(info.vagasPorDestino[d.id]||0);i++){var c=selected[cursor++];items.push({destinoId:d.id,conjuntoId:c.id,motoristaId:c.driverId,nome:c.driverName,capacidade:c.capacity,posicao:c.posicao});}});
 var draft={id:'PRE-'+Utilities.getUuid(),operacaoId:operacaoId,criadoEm:new Date().toISOString(),criadoPor:u.login||u.nome||'ADMIN',status:'RASCUNHO',quantidadeNecessaria:info.quantidadeNecessaria,vagasPorDestino:info.vagasPorDestino,destinos:info.destinos,alocacoes:items,elegiveis:eligible.map(function(c){return {conjuntoId:c.id,motoristaId:c.driverId,nome:c.driverName,capacidade:c.capacity,posicao:c.posicao};})};
 FT_ESCALA_WRITE_(draft);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_GERADA','OPERACAO',operacaoId,items.length+' vagas distribuídas em '+info.destinos.length+' destino(s); nenhuma convocação enviada.');
 return {ok:true,rascunhoId:draft.id,operacaoId:operacaoId,status:draft.status,quantidadeNecessaria:draft.quantidadeNecessaria,vagasPorDestino:draft.vagasPorDestino,destinos:draft.destinos,alocacoes:draft.alocacoes,elegiveis:draft.elegiveis};
}
function gerarPreviaEscalaDestinosFullTime(token,operacaoId){return FT_ESCALA_PREVIEW_(token,operacaoId);}
function obterPreviaEscalaDestinosFullTime(token,operacaoId){var u=obterSessao_(token);exigirAdmin_(u);var d=FT_ESCALA_READ_(operacaoId);if(!d)throw new Error('Ainda não existe prévia para esta operação. Gere a escala sugerida.');return d;}
function salvarEdicaoPreviaEscalaFullTime(token,data){
 var u=obterSessao_(token);exigirAdmin_(u);data=data||{};var opId=String(data.operacaoId||''),items=Array.isArray(data.alocacoes)?data.alocacoes:[],d=FT_ESCALA_READ_(opId);
 if(!d||d.status!=='RASCUNHO')throw new Error('A prévia não existe ou já foi aprovada. Gere uma nova prévia para editar.');
 if(items.length!==d.quantidadeNecessaria)throw new Error('A escala precisa conter exatamente '+d.quantidadeNecessaria+' motoristas.');
 var dest=Object.fromEntries(d.destinos.map(function(x){return [x.id,x];})),cand=Object.fromEntries(d.elegiveis.map(function(x){return [x.conjuntoId,x];})),used={},counts={};
 items.forEach(function(x){var did=String(x.destinoId||''),sid=String(x.conjuntoId||''),c=cand[sid];if(!dest[did])throw new Error('Destino inválido na prévia.');if(!c)throw new Error('O conjunto selecionado não pertence à lista elegível atual. Gere uma nova prévia.');if(used[c.motoristaId])throw new Error('O motorista '+c.nome+' foi selecionado mais de uma vez.');used[c.motoristaId]=true;counts[did]=(counts[did]||0)+1;});
 d.destinos.forEach(function(x){if(counts[x.id]!==Number(d.vagasPorDestino[x.id]||0))throw new Error('O destino '+x.cliente+' precisa manter '+Number(d.vagasPorDestino[x.id]||0)+' motorista(s) conforme o rateio proporcional.');});
 d.alocacoes=items.map(function(x){var c=cand[String(x.conjuntoId)],z=dest[String(x.destinoId)];return {destinoId:z.id,conjuntoId:c.conjuntoId,motoristaId:c.motoristaId,nome:c.nome,capacidade:c.capacidade,posicao:c.posicao};});
 d.atualizadoEm=new Date().toISOString();d.atualizadoPor=u.login||u.nome||'ADMIN';FT_ESCALA_WRITE_(d);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_EDITADA','OPERACAO',opId,'Bruno ajustou a identificação dos motoristas por destino; convocações ainda não enviadas.');
 return {ok:true,message:'Prévia atualizada. Nenhuma convocação foi enviada.',alocacoes:d.alocacoes};
}
function aprovarPreviaEscalaDestinosFullTime(token,operacaoId){
 var u=obterSessao_(token);exigirAdmin_(u);var opId=String(operacaoId||''),d=FT_ESCALA_READ_(opId);
 if(!d||d.status!=='RASCUNHO')throw new Error('Não existe uma prévia pendente de aprovação.');
 var result=FT_iniciarConvocacaoAutomaticaFullTime(token,{operacaoId:opId,vagas:d.quantidadeNecessaria,preEscalaAprovada:true,rascunhoId:d.id,selecao:d.alocacoes.map(function(x){return x.conjuntoId;})});
 d.status='APROVADA_CONVOCACOES_DISPARADAS';d.aprovadoEm=new Date().toISOString();d.aprovadoPor=u.login||u.nome||'ADMIN';d.resultadoConvocacao=result;FT_ESCALA_WRITE_(d);
 if(typeof auditar_==='function')auditar_(u,'PREVIA_ESCALA_APROVADA_E_CONVOCADA','OPERACAO',opId,'Escala aprovada; convocações iniciais disparadas pelo motor automático.');
 return result;
}
