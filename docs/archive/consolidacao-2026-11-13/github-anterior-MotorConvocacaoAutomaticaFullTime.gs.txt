
/** Reposiciona o motorista no fim da fila geral sem apagar nem alterar o histórico operacional. */
function FT_colocarMotoristaNoFinalDaFila_(motoristaId, motivo){
  motoristaId=String(motoristaId||'').trim();if(!motoristaId)return false;
  const sh=getSheet_('FILA_MOTORISTAS'),map=FT_AUTO_MAP_(sh);
  if(map.MOTORISTA_ID===undefined||map.DATA_ENTRADA===undefined)return false;
  const last=sh.getLastRow();if(last<2)return false;
  const data=sh.getRange(2,1,last-1,sh.getLastColumn()).getValues();
  const idx=data.findIndex(r=>String(r[map.MOTORISTA_ID]||'').trim()===motoristaId);
  if(idx<0)return false;
  const row=idx+2,now=new Date();
  sh.getRange(row,map.DATA_ENTRADA+1).setValue(now);
  if(map.ULTIMA_OFERTA_EM!==undefined)sh.getRange(row,map.ULTIMA_OFERTA_EM+1).setValue(now);
  if(map.OBSERVACOES!==undefined){
    const current=String(data[idx][map.OBSERVACOES]||'');
    const note='Reposicionado ao final da fila: '+String(motivo||'convocação encerrada')+'.';
    sh.getRange(row,map.OBSERVACOES+1).setValue((current?current+' | ':'')+note);
  }
  return true;
}


/** Agenda vigente da operação; ofertas antigas deixam de valer quando data/horário mudam. */
function FT_AUTO_agendaAtual_(opId){
 const sh=getSheet_('OPERACOES'),m=FT_AUTO_MAP_(sh),rows=sh.getDataRange().getValues();
 const r=rows.slice(1).find(x=>String(x[m.ID]||'')===String(opId));
 if(!r)throw new Error('Operação não encontrada para validar a agenda.');
 ['ID','DATA_OPERACAO','JANELA_INICIO','JANELA_FIM'].forEach(k=>{if(m[k]===undefined)throw new Error('Cabeçalho '+k+' ausente em OPERACOES. Execute a preparação da base antes da convocação.');});
 const date=FT_AUTO_dataKey_(r[m.DATA_OPERACAO]);
 if(!date)throw new Error('A operação não possui uma data válida para convocação.');
 return {data:date,horario:String(r[m.JANELA_INICIO]||'').trim(),fim:String(r[m.JANELA_FIM]||'').trim()};
}
function FT_AUTO_agendaOfertaIgual_(row,map,agenda){
 const d=map.DATA_OPERACAO_OFERTA===undefined?'':FT_AUTO_dataKey_(row[map.DATA_OPERACAO_OFERTA]);
 const h=map.HORARIO_OPERACAO_OFERTA===undefined?'':String(row[map.HORARIO_OPERACAO_OFERTA]||'').trim();
 const f=map.JANELA_FIM_OFERTA===undefined?'':String(row[map.JANELA_FIM_OFERTA]||'').trim();
 return !!d&&d===agenda.data&&h===agenda.horario&&f===agenda.fim;
}
function FT_AUTO_prepararCabecalhosAgenda_(sh){
 const required=['DATA_OPERACAO_OFERTA','HORARIO_OPERACAO_OFERTA','JANELA_FIM_OFERTA'];
 const have=new Set(sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim().toUpperCase()));
 const missing=required.filter(h=>!have.has(h));
 if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
 return FT_AUTO_MAP_(sh);
}

/** FULL TIME — FILA AUTOMÁTICA DE CONVOCAÇÃO. Prazo de resposta: 2 horas. */
const FT_AUTO_PROP_QUEUE_STORE_='FT_AUTO_QUEUES_V1';
const FT_AUTO_RESPONSE_TTL_MS_=7200000;
function FT_AUTO_MAP_(s){const h=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0],m={};h.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&m[k]===undefined)m[k]=i;});return m;}

function FT_AUTO_dataKey_(value){
  if(value instanceof Date && isFinite(value.getTime())) return Utilities.formatDate(value,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const raw=String(value==null?'':value).trim();
  if(!raw)return '';
  const iso=raw.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})/);
  if(iso)return iso[1];
  const parsed=new Date(raw);
  return isFinite(parsed.getTime())?Utilities.formatDate(parsed,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
}

/** Registra eventos no contrato EVENTOS_ESCALA sem confundir status com posição na fila. */
function FT_CONV_appendEvent_(event){
  event=event||{};
  const sh=getSheet_('EVENTOS_ESCALA'),map=FT_AUTO_MAP_(sh);
  const required=['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','MOTIVO','REGISTRADO_POR','OFERTA_ID'];
  const missing=required.filter(k=>map[k]===undefined);
  if(missing.length)throw new Error('Cabeçalhos ausentes em EVENTOS_ESCALA: '+missing.join(', '));
  const details=[String(event.motivo||''),event.anterior?'Status anterior: '+String(event.anterior):'',event.nova?'Status novo: '+String(event.nova):''].filter(Boolean).join(' | ');
  const row=new Array(sh.getLastColumn()).fill('');
  const fields={ID:Utilities.getUuid(),DATA_HORA:new Date(),TIPO_EVENTO:String(event.tipo||'EVENTO_CONVOCACAO'),OPERACAO_ID:String(event.operacaoId||''),MOTORISTA_ID:String(event.motoristaId||''),CONJUNTO_ID:String(event.conjuntoId||''),MOTIVO:details,REGISTRADO_POR:String(event.autor||'MOTOR_AUTOMATICO'),OFERTA_ID:String(event.ofertaId||'')};
  Object.keys(fields).forEach(k=>{row[map[k]]=fields[k];});
  sh.appendRow(row);
  return true;
}
function FT_AUTO_READ_(){return JSON.parse(PropertiesService.getScriptProperties().getProperty(FT_AUTO_PROP_QUEUE_STORE_)||'{}');}
function FT_AUTO_WRITE_(q){PropertiesService.getScriptProperties().setProperty(FT_AUTO_PROP_QUEUE_STORE_,JSON.stringify(q));}
function FT_AUTO_TRIGGER_(){if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='FT_processarFilasConvocacaoAutomatica'))ScriptApp.newTrigger('FT_processarFilasConvocacaoAutomatica').timeBased().everyMinutes(1).create();}
function FT_iniciarConvocacaoAutomaticaFullTime(token,data){
 const u=obterSessao_(token);exigirAdmin_(u);data=data||{};const opId=texto_(data.operacaoId,100),vagas=Math.floor(Number(data.vagas||0));
 if(!opId||vagas<1||vagas>40)throw new Error('Informe operação e vagas entre 1 e 40.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);let q;
 try{
  const all=FT_AUTO_READ_();if(all[opId]?.status==='EM_ANDAMENTO'){FT_AUTO_RECONCILIAR_FILA_(opId,all[opId]);if(all[opId]?.status==='EM_ANDAMENTO')throw new Error('Já existe fila automática ativa para esta operação, com oferta aguardando resposta.');FT_AUTO_WRITE_(all);}
  const analise=ordenarCandidatosOperacaoFullTime(token,opId);const candidatos=analise.filter(c=>c.eligible===true);if(!candidatos.length)throw new Error('Nenhum conjunto elegível. Confira a regularização dos motoristas e documentos antes de convocar.');
  const os=getSheet_('OPERACOES'),om=FT_AUTO_MAP_(os),or=os.getDataRange().getValues(),op=or.slice(1).find(r=>String(r[om.ID])===opId);
  if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[om.STATUS]).toUpperCase()))throw new Error('Operação não está aberta.');
  q={id:'AUTO-'+Utilities.getUuid(),operacaoId:opId,vagas,lista:candidatos.map(c=>({conjuntoId:String(c.id),motoristaId:String(c.driverId),nome:String(c.driverName||''),posicao:c.posicao})),cursor:0,aceitas:0,pendentes:[],status:'EM_ANDAMENTO'};
  all[opId]=q;FT_AUTO_WRITE_(all);FT_AUTO_TRIGGER_();
 }finally{lock.releaseLock();}
 const r=FT_processarFilasConvocacaoAutomatica();return {ok:true,id:q.id,vagas,totalElegiveis:q.lista.length,ofertasIniciais:r.ofertasCriadas||0,message:'Fila iniciada. Prazo de 2 horas por oferta; aceite ativa a escala e recusa/expiração chama o próximo elegível.'};
}

/** Reconcilia fila persistida com o estado efetivo das ofertas na planilha. */
function FT_AUTO_RECONCILIAR_FILA_(opId,q){
 const sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_AUTO_prepararCabecalhosAgenda_(sh),rows=sh.getDataRange().getValues(),agenda=FT_AUTO_agendaAtual_(opId);
 let accepted=0,pending=[];
 rows.slice(1).forEach((r,i)=>{
  if(String(r[m.OPERACAO_ID]||'')!==String(opId))return;
  if(String(r[m.ORIGEM_OFERTA]||'')!=='FILA_AUTOMATICA')return;
  let st=String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase();
  if(st==='OFERTADA'&&!FT_AUTO_agendaOfertaIgual_(r,m,agenda)){
   sh.getRange(i+2,m.STATUS_PARTICIPACAO+1).setValue('CANCELADA_REPROGRAMACAO');
   if(m.RESPONDIDA_EM!==undefined)sh.getRange(i+2,m.RESPONDIDA_EM+1).setValue(new Date());
   r[m.STATUS_PARTICIPACAO]='CANCELADA_REPROGRAMACAO';st='CANCELADA_REPROGRAMACAO';
   if(typeof FT_CONV_appendEvent_==='function')FT_CONV_appendEvent_({tipo:'OFERTA_CANCELADA_REPROGRAMACAO',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:st,motivo:'Data ou janela da operação foi alterada; oferta anterior cancelada para nova convocação.',autor:'MOTOR_RECONCILIACAO',ofertaId:r[m.ID]});
  }
  if(st==='EXPIRADA'){
    sh.getRange(i+2,m.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');
    if(m.RESPONDIDA_EM!==undefined&&!r[m.RESPONDIDA_EM])sh.getRange(i+2,m.RESPONDIDA_EM+1).setValue(new Date());
    FT_colocarMotoristaNoFinalDaFila_(r[m.MOTORISTA_ID],'não respondeu em 2 horas');
    r[m.STATUS_PARTICIPACAO]='NAO_RESPONDEU';st='NAO_RESPONDEU';
    if(typeof FT_CONV_appendEvent_==='function')FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'EXPIRADA',nova:st,motivo:'Oferta expirada regularizada; motorista reposicionado ao final da fila.',autor:'MOTOR_RECONCILIACAO',ofertaId:r[m.ID]});
  }
  if(st==='OFERTADA'){
   const ex=r[m.EXPIRA_EM] instanceof Date?r[m.EXPIRA_EM].getTime():new Date(r[m.EXPIRA_EM]).getTime();
   if(!isFinite(ex)||ex<=Date.now()){
    sh.getRange(i+2,m.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');
    if(m.RESPONDIDA_EM!==undefined&&!r[m.RESPONDIDA_EM])sh.getRange(i+2,m.RESPONDIDA_EM+1).setValue(new Date());
    st='NAO_RESPONDEU';r[m.STATUS_PARTICIPACAO]='NAO_RESPONDEU';FT_colocarMotoristaNoFinalDaFila_(r[m.MOTORISTA_ID],'não respondeu em 2 horas');
    if(typeof FT_CONV_appendEvent_==='function')FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:'NAO_RESPONDEU',motivo:'Não respondeu em 2 horas; motorista reposicionado ao final da fila.',autor:'MOTOR_RECONCILIACAO',ofertaId:r[m.ID]});
   }
  }
  if(st==='ACEITA'||st==='ATIVO'){accepted++;return;}
  if(st==='OFERTADA')pending.push(String(r[m.ID]||''));
 });
 q.aceitas=accepted;q.pendentes=pending;
 if(accepted>=Number(q.vagas||0)||(!pending.length&&Number(q.cursor||0)>=((q.lista||[]).length))){
  q.status='CONCLUIDA';q.concluidaEm=q.concluidaEm||new Date().toISOString();q.motivoConclusao=accepted>=Number(q.vagas||0)?'VAGAS_PREENCHIDAS':'FILA_ESGOTADA';
 }
 return q;
}

function FT_processarFilasConvocacaoAutomatica(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return {ok:false,bloqueado:true};
 try{
  const queues=FT_AUTO_READ_(),sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_AUTO_prepararCabecalhosAgenda_(sh),rows=sh.getDataRange().getValues();let created=0;
  Object.keys(queues).forEach(opId=>{
   const q=queues[opId];if(!q||q.status!=='EM_ANDAMENTO')return;q.lista=Array.isArray(q.lista)?q.lista:[];q.pendentes=Array.isArray(q.pendentes)?q.pendentes:[];q.cursor=Math.max(0,Number(q.cursor)||0);q.aceitas=Math.max(0,Number(q.aceitas)||0);const agenda=FT_AUTO_agendaAtual_(opId);let pending=[];
   q.pendentes.forEach(id=>{
    const n=rows.findIndex((r,i)=>i>0&&String(r[m.ID])===id);if(n<1)return;const r=rows[n];let st=String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase();
    if(st==='OFERTADA'&&!FT_AUTO_agendaOfertaIgual_(r,m,agenda)){
      sh.getRange(n+1,m.STATUS_PARTICIPACAO+1).setValue('CANCELADA_REPROGRAMACAO');r[m.STATUS_PARTICIPACAO]='CANCELADA_REPROGRAMACAO';
      if(m.RESPONDIDA_EM!==undefined)sh.getRange(n+1,m.RESPONDIDA_EM+1).setValue(new Date());
      FT_CONV_appendEvent_({tipo:'OFERTA_CANCELADA_REPROGRAMACAO',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:'CANCELADA_REPROGRAMACAO',motivo:'Data ou janela da operação alterada; oferta anterior cancelada.',autor:'MOTOR_AUTOMATICO',ofertaId:id});return;
    }
    if(st==='ATIVO'||st==='ACEITA'){q.aceitas++;return;}
    if(['RECUSADA','EXPIRADA','NAO_RESPONDEU','RETORNOU'].includes(st))return;
    if(st!=='OFERTADA')return;
    const ex=r[m.EXPIRA_EM] instanceof Date?r[m.EXPIRA_EM].getTime():new Date(r[m.EXPIRA_EM]).getTime();
    if(!isFinite(ex)||ex<=Date.now()){
      sh.getRange(n+1,m.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');r[m.STATUS_PARTICIPACAO]='NAO_RESPONDEU';
      if(m.RESPONDIDA_EM!==undefined&&!r[m.RESPONDIDA_EM])sh.getRange(n+1,m.RESPONDIDA_EM+1).setValue(new Date());
      FT_colocarMotoristaNoFinalDaFila_(r[m.MOTORISTA_ID],'não respondeu em 2 horas');
      if(typeof FT_CONV_appendEvent_==='function')FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:'NAO_RESPONDEU',motivo:'Não respondeu em 2 horas; motorista reposicionado ao final da fila.',autor:'MOTOR_AUTOMATICO',ofertaId:id});
      return;
    }
    pending.push(id);
   });
   q.pendentes=pending;
   while(q.aceitas+q.pendentes.length<q.vagas&&q.cursor<q.lista.length){
    const c=q.lista[q.cursor++];
    const alreadyInOperation=rows.slice(1).some(r=>String(r[m.OPERACAO_ID]||'')===String(opId)&&String(r[m.MOTORISTA_ID]||'')===String(c.motoristaId)&&['NAO_RESPONDEU','EXPIRADA','RECUSADA','CANCELADA_REPROGRAMACAO','ACEITA','ATIVO','SAIU','EM_VIAGEM','RETORNOU'].includes(String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase())&&FT_AUTO_agendaOfertaIgual_(r,m,agenda));
    if(alreadyInOperation)continue;
    const busy=rows.slice(1).some(r=>{
      const st=String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase();
      if(!['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(st))return false;
      if(st==='OFERTADA'){const raw=r[m.EXPIRA_EM],expiry=raw instanceof Date?raw.getTime():new Date(raw).getTime();if(!isFinite(expiry)||expiry<=Date.now())return false;}
      return String(r[m.CONJUNTO_ID]||'')===String(c.conjuntoId)||String(r[m.MOTORISTA_ID]||'')===String(c.motoristaId);
    });
    if(busy)continue;
    const now=new Date(),id='OFT-'+Utilities.getUuid(),row=new Array(sh.getLastColumn()).fill('');
    const fields={ID:id,CRIADO_EM:now,OPERACAO_ID:opId,CONJUNTO_ID:c.conjuntoId,MOTORISTA_ID:c.motoristaId,STATUS_PARTICIPACAO:'OFERTADA',INICIO_EM:'',SAIDA_EM:'',RETORNO_EM:'',TONELADAS_MOVIMENTADAS:0,VIAGENS_CONCLUIDAS:0,MOTIVO:'Convocação automática — posição '+c.posicao+'. Responda em até 2 horas.',REGISTRADO_POR:'MOTOR_AUTOMATICO',OFERTADA_EM:now,RESPONDIDA_EM:'',EXPIRA_EM:new Date(now.getTime()+FT_AUTO_RESPONSE_TTL_MS_),ORIGEM_OFERTA:'FILA_AUTOMATICA',OBSERVACOES_OFERTA:'Reposição automática em caso de recusa ou expiração.',DATA_OPERACAO_OFERTA:agenda.data,HORARIO_OPERACAO_OFERTA:agenda.horario,JANELA_FIM_OFERTA:agenda.fim};
    Object.keys(fields).forEach(k=>{if(m[k]!==undefined)row[m[k]]=fields[k];});
    sh.appendRow(row);rows.push(row);q.pendentes.push(id);created++;
    FT_CONV_appendEvent_({tipo:'OFERTA_ENVIADA',operacaoId:opId,motoristaId:c.motoristaId,conjuntoId:c.conjuntoId,anterior:'',nova:'OFERTADA',motivo:'Fila automática, posição '+c.posicao+', prazo de 2 horas.',autor:'MOTOR_AUTOMATICO',ofertaId:id});
   }
   if(q.aceitas>=q.vagas||(!q.pendentes.length&&q.cursor>=q.lista.length)){q.status='CONCLUIDA';q.concluidaEm=new Date().toISOString();q.motivoConclusao=q.aceitas>=q.vagas?'VAGAS_PREENCHIDAS':'FILA_ESGOTADA';}
  });
  FT_AUTO_WRITE_(queues);
  if(!Object.keys(queues).some(k=>queues[k].status==='EM_ANDAMENTO'))ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='FT_processarFilasConvocacaoAutomatica').forEach(t=>ScriptApp.deleteTrigger(t));
  return {ok:true,ofertasCriadas:created};
 }finally{lock.releaseLock();}
}

/** Executar uma vez pelo editor Apps Script para regularizar ofertas OFERTADA cujo prazo já venceu. Preserva as linhas e o histórico. */
function FT_reconciliarOfertasExpiradasFullTime(){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_AUTO_MAP_(sh),rows=sh.getDataRange().getValues(),now=Date.now(),stamp=new Date();
  ['ID','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','STATUS_PARTICIPACAO','EXPIRA_EM','ORIGEM_OFERTA'].forEach(k=>{if(m[k]===undefined)throw new Error('Coluna '+k+' ausente em PARTICIPACAO_OPERACOES.');});
  let expired=0;
  rows.slice(1).forEach((r,i)=>{
   if(String(r[m.ORIGEM_OFERTA]||'')!=='FILA_AUTOMATICA')return;
    if(String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase()!=='OFERTADA')return;
   const raw=r[m.EXPIRA_EM],ex=raw instanceof Date?raw.getTime():new Date(raw).getTime();
   if(isFinite(ex)&&ex>now)return;
   sh.getRange(i+2,m.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');
   if(m.RESPONDIDA_EM!==undefined)sh.getRange(i+2,m.RESPONDIDA_EM+1).setValue(stamp);
   FT_colocarMotoristaNoFinalDaFila_(r[m.MOTORISTA_ID],'não respondeu em 2 horas');
   if(typeof FT_CONV_appendEvent_==='function')FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:r[m.OPERACAO_ID],motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:'NAO_RESPONDEU',motivo:'Não respondeu em 2 horas; motorista reposicionado ao final da fila.',autor:'SISTEMA_RECONCILIACAO',ofertaId:r[m.ID]});
   expired++;
  });
  const queues=FT_AUTO_READ_();
  Object.keys(queues).forEach(opId=>{const q=queues[opId];if(q&&q.status==='EM_ANDAMENTO')FT_AUTO_RECONCILIAR_FILA_(opId,q);});
  FT_AUTO_WRITE_(queues);
  if(!Object.keys(queues).some(k=>queues[k]?.status==='EM_ANDAMENTO'))ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='FT_processarFilasConvocacaoAutomatica').forEach(t=>ScriptApp.deleteTrigger(t));
  return {sucesso:true,ofertasSemRespostaRegularizadas:expired,filasConcluidas:Object.values(queues).filter(q=>q?.status==='CONCLUIDA').length,aviso:'Nenhuma linha foi excluída; somente status de ofertas com prazo vencido foram atualizados.'};
 }finally{lock.releaseLock();}
}

function FT_statusConvocacaoAutomaticaFullTime(token,opId){const u=obterSessao_(token);exigirAdmin_(u);const q=FT_AUTO_READ_()[String(opId)];if(!q)return {ativa:false,status:'NAO_INICIADA'};return {ativa:q.status==='EM_ANDAMENTO',status:q.status,vagas:q.vagas,aceitas:q.aceitas,pendentes:q.pendentes.length,filaRestante:q.lista.length-q.cursor};}