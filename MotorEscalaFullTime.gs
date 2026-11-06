/**
 * Motor de compatibilidade operacional.
 * Filtra primeiro os requisitos mandatórios; só depois aplica ordenação de justiça/capacidade.
 * EXIGENCIAS aceita JSON com minCapacityT, maxCapacityT, allowedTrailerTypes,
 * capacityPreference e requireValidatedDocuments.
 */
function ftSelecionarCandidatosCompativeis_(operacaoId, limite) {
  const opSh=getSheet_('OPERACOES'), opRows=opSh.getDataRange().getValues(), om=ftHeaderMapViagens_(opSh);
  const op=opRows.slice(1).find(r=>String(r[om.ID])===String(operacaoId));
  if(!op) throw new Error('Operação não encontrada.');
  const originId=String(op[om.LOCALORIGEMID]||'');
  const ruleSh=getSheet_('REGRAS_OPERACIONAIS'), ruleRows=ruleSh.getDataRange().getValues(), rm=ftHeaderMapViagens_(ruleSh);
  const rule=ruleRows.slice(1).find(r=>String(r[rm.LOCALID]||'')===originId&&String(r[rm.STATUS]||'').toUpperCase()==='ATIVO');
  if(!rule) throw new Error('A operação não possui regras operacionais ativas vinculadas ao local de origem.');
  let criteria={};
  try { criteria=JSON.parse(String(rule[rm.EXIGENCIAS]||'{}')); } catch(e) { criteria={}; }
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
  const busySets=new Set(partRows.slice(1).filter(r=>String(r[pm.STATUSPARTICIPACAO]||'').toUpperCase()==='ATIVO').map(r=>String(r[pm.CONJUNTOID])));
  const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const dayKey=v=>{if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const d=new Date(v);return isFinite(d.getTime())?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):String(v||'').slice(0,10);};
  const availSh=getSheet_('DISPONIBILIDADE_DIARIA'), availRows=availSh.getDataRange().getValues(), am=ftHeaderMapViagens_(availSh);
  const availabilityByDriver={};
  availRows.slice(1).forEach(r=>{if(dayKey(r[am.DATAOPERACAO])===today)availabilityByDriver[String(r[am.MOTORISTAID]||'')]=String(r[am.STATUSDISPONIBILIDADE]||'').toUpperCase();});
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
