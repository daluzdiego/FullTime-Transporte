/**
 * Motor de compatibilidade operacional.
 * Filtra primeiro os requisitos mandatórios; só depois aplica ordenação de justiça/capacidade.
 * EXIGENCIAS aceita JSON com minCapacityT, maxCapacityT, allowedTrailerTypes,
 * capacityPreference e requireValidatedDocuments.
 */
function ftSelecionarCandidatosCompativeis_(operacaoId, limite, loteId) {
  const opSh=getSheet_('OPERACOES'), opRows=opSh.getDataRange().getValues(), om=ftHeaderMapViagens_(opSh);
  const op=opRows.slice(1).find(r=>String(r[om.ID])===String(operacaoId));
  if(!op) throw new Error('Operação não encontrada.');
  let lot=null,lotMap=null,originId=String(op[om.LOCALORIGEMID]||'');
  if(loteId){
    const lotSh=getSheet_('LOTES_OPERACAO'),lotRows=lotSh.getDataRange().getValues();lotMap=ftHeaderMapViagens_(lotSh);
    lot=lotRows.slice(1).find(r=>String(r[lotMap.ID])===String(loteId)&&String(r[lotMap.OPERACAOID])===String(operacaoId));
    if(!lot)throw new Error('Lote não encontrado nesta operação.');
    const localSh=getSheet_('LOCAIS'),localRows=localSh.getDataRange().getValues(),localMap=ftHeaderMapViagens_(localSh);
    const local=localRows.slice(1).find(r=>String(r[localMap.CLIENTEID]||'')===String(lot[lotMap.CLIENTEID]||'')&&String(r[localMap.NOMELOCAL]||'').trim().toUpperCase()===String(lot[lotMap.ORIGEM]||'').trim().toUpperCase()&&String(r[localMap.STATUS]||'').toUpperCase()==='ATIVO');
    if(!local)throw new Error('Cadastre e ative o local de origem deste lote antes de selecionar candidatos.');
    originId=String(local[localMap.ID]||'');
  }
  const ruleSh=getSheet_('REGRAS_OPERACIONAIS'), ruleRows=ruleSh.getDataRange().getValues(), rm=ftHeaderMapViagens_(ruleSh);
  const rule=ruleRows.slice(1).find(r=>String(r[rm.LOCALID]||'')===originId&&String(r[rm.STATUS]||'').toUpperCase()==='ATIVO');
  if(!rule) throw new Error('Não existe regra operacional ativa vinculada ao local de origem.');
  let criteria={};
  try { criteria=JSON.parse(String(rule[rm.EXIGENCIAS]||'{}')); } catch(e) { criteria={}; }
  if(lot){
    let lotCriteria={};try{lotCriteria=JSON.parse(String(lot[lotMap.PARTICULARIDADESJSON]||'{}'));}catch(e){}
    criteria=Object.assign({},criteria,lotCriteria);
  }
  const min=Number(criteria.minCapacityT||0), max=Number(criteria.maxCapacityT||Number.MAX_SAFE_INTEGER);
  const allowedRaw=criteria.allowedTrailerTypes||String(rule[rm.TIPOCARRETA]||'').split('|').filter(Boolean);
  const allowed=(Array.isArray(allowedRaw)?allowedRaw:[allowedRaw]).map(x=>String(x).trim().toUpperCase()).filter(Boolean);
  const preference=String(criteria.capacityPreference||'BALANCED').toUpperCase();
  const drivers=getSheet_('MOTORISTAS').getDataRange().getValues(), driverById={};
  drivers.slice(1).forEach(r=>driverById[String(r[0])]=r);
  const trailers=getSheet_('CARRETAS').getDataRange().getValues(), trailerById={};
  trailers.slice(1).forEach(r=>trailerById[String(r[0])]=r);
  const sets=getSheet_('CONJUNTOS').getDataRange().getValues();
  const partSh=getSheet_('PARTICIPACAO_OPERACOES'), partRows=partSh.getDataRange().getValues(), pm=ftHeaderMapViagens_(partSh);
  const busySets=new Set(partRows.slice(1).filter(r=>String(r[pm.STATUSPARTICIPACAO]||'').toUpperCase()==='ATIVO'&&(!loteId||String(r[pm.OPERACAOID])!==String(operacaoId)||String(r[pm.LOTEID]||'')===String(loteId))).map(r=>String(r[pm.CONJUNTOID])));
  const operationDay=op[om.DATAOPERACAO] instanceof Date?Utilities.formatDate(op[om.DATAOPERACAO],Session.getScriptTimeZone(),'yyyy-MM-dd'):String(op[om.DATAOPERACAO]||'').slice(0,10);
  const dayKey=v=>{if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const d=new Date(v);return isFinite(d.getTime())?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):String(v||'').slice(0,10);};
  const availSh=getSheet_('DISPONIBILIDADE_DIARIA'), availRows=availSh.getDataRange().getValues(), am=ftHeaderMapViagens_(availSh);
  const availabilityByDriver={};
  availRows.slice(1).forEach(r=>{if(dayKey(r[am.DATAOPERACAO])===operationDay)availabilityByDriver[String(r[am.MOTORISTAID]||'')]=String(r[am.STATUSDISPONIBILIDADE]||'').toUpperCase();});
  const docsSh=getSheet_('CONTROLE_DOCUMENTAL'), docs=docsSh.getDataRange().getValues(), dm=ftHeaderMapViagens_(docsSh);
  const docsByEntity={};
  docs.slice(1).forEach(r=>{const k=String(r[dm.IDEXTERNOREGISTRO]||'');(docsByEntity[k]||(docsByEntity[k]=[])).push(String(r[dm.STATUSDOCUMENTO]||'').toUpperCase());});
  const requireDocs=criteria.requireValidatedDocuments===true;
  const candidates=[];
  sets.slice(1).forEach(r=>{
    const setId=String(r[0]||''),driverId=String(r[3]||''),driver=driverById[driverId];
    const capacity=Number(r[10]||0), condition=String(r[8]||'').toUpperCase();
    const trailerIds=[String(r[5]||''),String(r[6]||'')].filter(Boolean), trailerRows=trailerIds.map(id=>trailerById[id]).filter(Boolean);
    const trailerTypes=trailerRows.map(t=>String(t[4]||'').toUpperCase());
    const horseSh=getSheet_('CAVALOS'), horseRows=horseSh.getDataRange().getValues(), horseMap=ftHeaderMapViagens_(horseSh);
    const horseRow=horseRows.slice(1).find(x=>String(x[horseMap.ID]||'')===String(r[4]||''));
    const horseCapacity=Number(horseRow&&horseRow[horseMap.CAPACIDADEUTILTONELADAS]||0);
    const trailerCapacity=trailerRows.reduce((sum,t)=>sum+Number(t[6]||0),0);
    const componentLimit=trailerIds.length?Math.min(horseCapacity,trailerCapacity):horseCapacity;
    const reasons=[];
    if(String(r[2]||'').toUpperCase()!=='ATIVO')reasons.push('Conjunto inativo');
    if(!driver||String(driver[2]||'').toUpperCase()!=='ATIVO')reasons.push('Motorista inativo');
    if(condition!=='APTO')reasons.push('Conjunto não está apto');
    if(!horseRow||String(horseRow[horseMap.STATUS]||'').toUpperCase()!=='ATIVO')reasons.push('Cavalo mecânico não está ativo');
    if(trailerRows.length!==trailerIds.length||trailerRows.some(t=>String(t[2]||'').toUpperCase()!=='ATIVO'))reasons.push('Uma ou mais carretas não estão ativas');
    if(busySets.has(setId))reasons.push('Conjunto já comprometido');
    if(!(capacity>0)||capacity<min||capacity>max)reasons.push('Capacidade útil fora do limite');
    if(!(componentLimit>0)||capacity>componentLimit+0.000001)reasons.push('Capacidade do conjunto excede o limite conservador dos componentes');
    if(!trailerTypes.length||!trailerTypes.some(t=>allowed.includes(t)))reasons.push('Tipo de carreta incompatível');
    if(availabilityByDriver[driverId]!=='DISPONIVEL')reasons.push('Motorista sem disponibilidade confirmada para hoje');
    if(requireDocs){
      const ids=[driverId,String(r[4]||''),...trailerIds];
      if(ids.some(id=>!docsByEntity[id]||docsByEntity[id].length===0||docsByEntity[id].some(st=>!['VALIDADO','APROVADO'].includes(st))))reasons.push('Documentação não validada');
    }
    if(reasons.length)return;
    candidates.push({id:setId,driverId:driverId,driverName:String(driver[3]||''),cavaloId:String(r[4]||''),carretaIds:trailerIds,carretaTipos:trailerTypes,capacity:capacity,condition:condition,restrictions:String(r[9]||''),eligible:true,disponibilidade:'DISPONIVEL'});
  });
  candidates.sort((a,b)=>{
    if(preference==='HIGH'&&b.capacity!==a.capacity)return b.capacity-a.capacity;
    if(preference==='LOW'&&a.capacity!==b.capacity)return a.capacity-b.capacity;
    return a.driverName.localeCompare(b.driverName,'pt-BR');
  });
  return candidates.slice(0,Math.max(1,Math.min(10,Number(limite)||10))).map((c,i)=>({posicao:i+1,...c}));
}

/** Cria até dez convites individuais, visíveis apenas no portal de cada motorista. */
function gerarOfertasCandidatosOperacaoFullTime(token, operacaoId) {
  const session=obterSessao_(token); exigirAdmin_(session);
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try {
    const id=String(operacaoId||'').trim();
    const candidates=ftSelecionarCandidatosCompativeis_(id,10);
    if(!candidates.length)throw new Error('Nenhum motorista/conjunto atende a todos os requisitos desta operação.');
    const sh=getSheet_('OFERTAS_OPERACOES'), rows=sh.getDataRange().getValues(), m=ftHeaderMapViagens_(sh);
    const existing=rows.slice(1).filter(r=>String(r[m.OPERACAOID])===id&&['PENDENTE','PENDENTE_HOMOLOGACAO'].includes(String(r[m.STATUSOFERTA]).toUpperCase()));
    if(existing.length)return {ok:true,jaExistiam:true,ofertas:existing.length,message:'Esta operação já possui ofertas pendentes; não foram criadas duplicatas.'};
    const now=new Date(), expiry=new Date(now.getTime()+2*60*60*1000);
    const events=getSheet_('EVENTOS_OPERACAO');
    candidates.forEach(c=>{
      const offerId=Utilities.getUuid();
      sh.appendRow([offerId,now,id,'',c.driverId,c.id,'PENDENTE',expiry,'','Convite de operação; candidato '+c.posicao+'; compatibilidade confirmada.',session.login]);
      events.appendRow([Utilities.getUuid(),now,'OFERTA_ENVIADA_PORTAL',id,'',c.driverId,c.id,'Convite individual gerado; posição '+c.posicao,session.login]);
    });
    auditar_(session,'NOTIFICAR_CANDIDATOS','OPERACAO',id,'Ofertas individuais criadas: '+candidates.length);
    return {ok:true,ofertas:candidates.length,candidatos:candidates.map(c=>({motorista:c.driverName,motoristaId:c.driverId,conjuntoId:c.id,capacidade:c.capacity,posicao:c.posicao})),expiraEm:expiry,message:candidates.length+' convites criados nos portais individuais. Nenhuma mensagem externa foi enviada.'};
  } finally {lock.releaseLock();}
}


/**
 * Resposta individual a convite. O motorista é obtido exclusivamente da sessão.
 * A aceitação registra compromisso; a criação/alocação das viagens é etapa posterior.
 */
function responderConviteOperacaoFullTime(token, ofertaId, decisao, motivo) {
  const session=obterSessao_(token);
  if(!session||session.perfil!=='MOTORISTA'||!session.motoristaId)throw new Error('Ação permitida somente ao motorista autenticado.');
  const action=String(decisao||'').trim().toUpperCase();
  if(!['ACEITAR','RECUSAR'].includes(action))throw new Error('Decisão inválida.');
  const why=String(motivo||'').trim().slice(0,500);
  if(action==='RECUSAR'&&!why)throw new Error('Informe um motivo para recusar o convite.');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try{
    const offerSh=getSheet_('OFERTAS_OPERACOES'), offerRows=offerSh.getDataRange().getValues(), om=ftHeaderMapViagens_(offerSh);
    const idx=offerRows.findIndex((r,i)=>i>0&&String(r[om.ID]||'')===String(ofertaId||'')&&String(r[om.MOTORISTAID]||'')===String(session.motoristaId));
    if(idx<1)throw new Error('Convite não encontrado para este motorista.');
    const row=offerRows[idx], current=String(row[om.STATUSOFERTA]||'').toUpperCase();
    if(!['PENDENTE','PENDENTE_HOMOLOGACAO'].includes(current))throw new Error('Este convite já foi respondido ou não está disponível.');
    const now=new Date(), expiry=row[om.EXPIREM] instanceof Date?row[om.EXPIREM]:new Date(row[om.EXPIREM]);
    if(row[om.EXPIREM]&&isFinite(expiry.getTime())&&expiry.getTime()<=now.getTime()){
      offerSh.getRange(idx+1,om.STATUSOFERTA+1).setValue('EXPIRADA');
      throw new Error('O prazo deste convite terminou.');
    }
    const opSh=getSheet_('OPERACOES'), opRows=opSh.getDataRange().getValues(), opm=ftHeaderMapViagens_(opSh);
    const op=opRows.slice(1).find(x=>String(x[opm.ID])===String(row[om.OPERACAOID]));
    if(!op)throw new Error('A operação vinculada ao convite não existe mais.');
    const test=current==='PENDENTE_HOMOLOGACAO';
    if(action==='ACEITAR'){
      const setSh=getSheet_('CONJUNTOS'), sets=setSh.getDataRange().getValues(), sm=ftHeaderMapViagens_(setSh);
      const set=sets.slice(1).find(x=>String(x[sm.ID])===String(row[om.CONJUNTOID])&&String(x[sm.MOTORISTAID])===String(session.motoristaId));
      if(!set||String(set[sm.STATUS]||'').toUpperCase()!=='ATIVO'||String(set[sm.ESTADOCONSERVACAO]||'').toUpperCase()!=='APTO')throw new Error('Seu conjunto vinculado não está ativo e apto. Procure a administração.');
      const ruleSh=getSheet_('REGRAS_OPERACIONAIS'), rules=ruleSh.getDataRange().getValues(), rm=ftHeaderMapViagens_(ruleSh);
      const rule=rules.slice(1).find(x=>String(x[rm.LOCALID]||'')===String(op[opm.LOCALORIGEMID]||'')&&String(x[rm.STATUS]||'').toUpperCase()==='ATIVO');
      if(!rule)throw new Error('A operação está sem regra operacional ativa; aceite bloqueado.');
      let criteria={};try{criteria=JSON.parse(String(rule[rm.EXIGENCIAS]||'{}'));}catch(e){}
      const cap=Number(set[sm.CAPACIDADEUTILTONELADAS]||0), min=Number(criteria.minCapacityT||rule[rm.PESOMINTONELADAS]||0), max=Number(criteria.maxCapacityT||rule[rm.PESOMAXTONELADAS]||Number.MAX_SAFE_INTEGER);
      if(!(cap>0)||cap<min||cap>max)throw new Error('Seu conjunto não atende à faixa de capacidade desta operação ('+min+'–'+max+' t).');
      const existing=offerRows.slice(1).filter(x=>String(x[om.MOTORISTAID])===String(session.motoristaId)&&String(x[om.ID])!==String(ofertaId)&&['ACEITA','ACEITA_HOMOLOGACAO'].includes(String(x[om.STATUSOFERTA]||'').toUpperCase()));
      const acceptedOpIds=existing.map(x=>String(x[om.OPERACAOID]||''));
      const dateKey=v=>v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd'):String(v||'').slice(0,10);
      const sameDay=opRows.slice(1).filter(x=>acceptedOpIds.includes(String(x[opm.ID]))&&dateKey(x[opm.DATAOPERACAO])===dateKey(op[opm.DATAOPERACAO]));
      if(sameDay.length)throw new Error('Você já aceitou outra operação para a mesma data. Conflito de agenda bloqueado.');
    }
    const status=action==='ACEITAR'?(test?'ACEITA_HOMOLOGACAO':'ACEITA'):(test?'RECUSADA_HOMOLOGACAO':'RECUSADA');
    offerSh.getRange(idx+1,om.STATUSOFERTA+1).setValue(status);
    offerSh.getRange(idx+1,om.RESPONDIDOEM+1).setValue(now);
    offerSh.getRange(idx+1,om.MOTIVO+1).setValue(action==='RECUSAR'?why:(test?'Aceite registrado em ambiente de homologação.':'Aceite registrado pelo motorista.'));
    const eventSh=getSheet_('EVENTOS_OPERACAO');
    eventSh.appendRow([Utilities.getUuid(),now,action==='ACEITAR'?'CONVITE_ACEITO':'CONVITE_RECUSADO',String(row[om.OPERACAOID]||''),'',String(session.motoristaId),String(row[om.CONJUNTOID]||''),action==='RECUSAR'?why:(test?'Aceite de homologação; viagens ainda não alocadas.':'Aceite; viagens ainda não alocadas.'),String(session.login||'MOTORISTA')]);
    return {ok:true,status:status,mensagem:action==='ACEITAR'?'Aceite registrado. A alocação das viagens ainda será feita pela administração.':'Recusa registrada com sucesso.'};
  }finally{lock.releaseLock();}
}


function ordenarCandidatosLoteOperacaoFullTime(token, operacaoId, loteId) {
  const session=obterSessao_(token); exigirAdmin_(session);
  if(!loteId)throw new Error('Informe o lote para selecionar candidatos.');
  return ftSelecionarCandidatosCompativeis_(String(operacaoId||''),10,String(loteId));
}
