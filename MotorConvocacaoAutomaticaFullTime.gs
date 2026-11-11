/** FULL TIME — FILA AUTOMÁTICA DE CONVOCAÇÃO. Prazo de resposta: 2 horas. */
const FT_AUTO_PROP_='FT_AUTO_QUEUES_V1';
const FT_AUTO_TTL_=7200000;
function FT_AUTO_MAP_(s){const h=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0],m={};h.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&m[k]===undefined)m[k]=i;});return m;}
function FT_AUTO_READ_(){return JSON.parse(PropertiesService.getScriptProperties().getProperty(FT_AUTO_PROP_)||'{}');}
function FT_AUTO_WRITE_(q){PropertiesService.getScriptProperties().setProperty(FT_AUTO_PROP_,JSON.stringify(q));}
function FT_AUTO_TRIGGER_(){if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='FT_processarFilasConvocacaoAutomatica'))ScriptApp.newTrigger('FT_processarFilasConvocacaoAutomatica').timeBased().everyMinutes(1).create();}
function FT_iniciarConvocacaoAutomaticaFullTime(token,data){
 const u=obterSessao_(token);exigirAdmin_(u);data=data||{};const opId=texto_(data.operacaoId,100),vagas=Math.floor(Number(data.vagas||0));
 if(!opId||vagas<1||vagas>40)throw new Error('Informe operação e vagas entre 1 e 40.');
 const lock=LockService.getScriptLock();lock.waitLock(20000);let q;
 try{
  const all=FT_AUTO_READ_();if(all[opId]?.status==='EM_ANDAMENTO')throw new Error('Já existe fila automática ativa para esta operação.');
  const candidatos=ordenarCandidatosOperacaoFullTime(token,opId);if(!candidatos.length)throw new Error('Nenhum conjunto elegível.');
  const os=getSheet_('OPERACOES'),om=FT_AUTO_MAP_(os),or=os.getDataRange().getValues(),op=or.slice(1).find(r=>String(r[om.ID])===opId);
  if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[om.STATUS]).toUpperCase()))throw new Error('Operação não está aberta.');
  q={id:'AUTO-'+Utilities.getUuid(),operacaoId:opId,vagas,lista:candidatos.map(c=>({conjuntoId:String(c.id),motoristaId:String(c.driverId),nome:String(c.driverName||''),posicao:c.posicao})),cursor:0,aceitas:0,pendentes:[],status:'EM_ANDAMENTO'};
  all[opId]=q;FT_AUTO_WRITE_(all);FT_AUTO_TRIGGER_();
 }finally{lock.releaseLock();}
 const r=FT_processarFilasConvocacaoAutomatica();return {ok:true,id:q.id,vagas,totalElegiveis:q.lista.length,ofertasIniciais:r.ofertasCriadas||0,message:'Fila iniciada. Prazo de 2 horas por oferta; aceite ativa a escala e recusa/expiração chama o próximo elegível.'};
}
function FT_processarFilasConvocacaoAutomatica(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(10000))return {ok:false,bloqueado:true};
 try{
  const queues=FT_AUTO_READ_(),sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_AUTO_MAP_(sh);let created=0;
  Object.keys(queues).forEach(opId=>{
   const q=queues[opId];if(!q||q.status!=='EM_ANDAMENTO')return;let rows=sh.getDataRange().getValues(),pending=[];
   q.pendentes.forEach(id=>{
    const n=rows.findIndex((r,i)=>i>0&&String(r[m.ID])===id);if(n<1)return;const r=rows[n],st=String(r[m.STATUS_PARTICIPACAO]||'').toUpperCase();
    if(st==='ATIVO'){q.aceitas++;return;}if(st==='RECUSADA'||st==='EXPIRADA')return;if(st!=='OFERTADA')return;
    const ex=r[m.EXPIRA_EM] instanceof Date?r[m.EXPIRA_EM].getTime():new Date(r[m.EXPIRA_EM]).getTime();
    if(isFinite(ex)&&ex<=Date.now()){sh.getRange(n+1,m.STATUS_PARTICIPACAO+1).setValue('EXPIRADA');if(m.RESPONDIDA_EM!==undefined)sh.getRange(n+1,m.RESPONDIDA_EM+1).setValue(new Date());FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:opId,motoristaId:r[m.MOTORISTA_ID],conjuntoId:r[m.CONJUNTO_ID],anterior:'OFERTADA',nova:'EXPIRADA',motivo:'Prazo de 2 horas encerrado.',autor:'MOTOR_AUTOMATICO',ofertaId:id});return;}pending.push(id);
   });q.pendentes=pending;
   while(q.aceitas+q.pendentes.length<q.vagas&&q.cursor<q.lista.length){
    const c=q.lista[q.cursor++];rows=sh.getDataRange().getValues();
    if(rows.slice(1).some(r=>['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(r[m.STATUS_PARTICIPACAO]||'').toUpperCase())&&(String(r[m.CONJUNTO_ID])===c.conjuntoId||String(r[m.MOTORISTA_ID])===c.motoristaId)))continue;
    const now=new Date(),id='OFT-'+Utilities.getUuid(),row=new Array(sh.getLastColumn()).fill(''),fields={ID:id,CRIADO_EM:now,OPERACAO_ID:opId,CONJUNTO_ID:c.conjuntoId,MOTORISTA_ID:c.motoristaId,STATUS_PARTICIPACAO:'OFERTADA',INICIO_EM:'',SAIDA_EM:'',RETORNO_EM:'',TONELADAS_MOVIMENTADAS:0,VIAGENS_CONCLUIDAS:0,MOTIVO:'Convocação automática — posição '+c.posicao+'. Responda em até 2 horas.',REGISTRADO_POR:'MOTOR_AUTOMATICO',OFERTADA_EM:now,RESPONDIDA_EM:'',EXPIRA_EM:new Date(now.getTime()+FT_AUTO_TTL_),ORIGEM_OFERTA:'FILA_AUTOMATICA',OBSERVACOES_OFERTA:'Reposição automática em caso de recusa ou expiração.'};
    Object.keys(fields).forEach(k=>{if(m[k]!==undefined)row[m[k]]=fields[k];});sh.appendRow(row);q.pendentes.push(id);created++;
    FT_CONV_appendEvent_({tipo:'OFERTA_ENVIADA',operacaoId:opId,motoristaId:c.motoristaId,conjuntoId:c.conjuntoId,anterior:'',nova:'OFERTADA',motivo:'Fila automática, posição '+c.posicao+', prazo de 2 horas.',autor:'MOTOR_AUTOMATICO',ofertaId:id});
   }
   if(q.aceitas>=q.vagas||(!q.pendentes.length&&q.cursor>=q.lista.length)){q.status='CONCLUIDA';q.concluidaEm=new Date().toISOString();}
  });
  FT_AUTO_WRITE_(queues);if(!Object.keys(queues).some(k=>queues[k].status==='EM_ANDAMENTO'))ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='FT_processarFilasConvocacaoAutomatica').forEach(t=>ScriptApp.deleteTrigger(t));
  return {ok:true,ofertasCriadas:created};
 }finally{lock.releaseLock();}
}
function FT_statusConvocacaoAutomaticaFullTime(token,opId){const u=obterSessao_(token);exigirAdmin_(u);const q=FT_AUTO_READ_()[String(opId)];if(!q)return {ativa:false,status:'NAO_INICIADA'};return {ativa:q.status==='EM_ANDAMENTO',status:q.status,vagas:q.vagas,aceitas:q.aceitas,pendentes:q.pendentes.length,filaRestante:q.lista.length-q.cursor};}
