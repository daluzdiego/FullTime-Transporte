/**
 * FULL TIME — Portal seguro do motorista
 * O vínculo do motorista é obtido da sessão autenticada, nunca do navegador.
 */
function exigirMotorista_(session) {
  if (!session || String(session.perfil || '').toUpperCase() !== 'MOTORISTA')
    throw new Error('Acesso restrito ao portal do motorista.');
  if (!session.motoristaId) throw new Error('Esta conta ainda não está vinculada a um cadastro de motorista.');
  return String(session.motoristaId);
}

function FT_MOTORISTA_headerMap_(sh) {
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], map={};
  headers.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&!Object.prototype.hasOwnProperty.call(map,k))map[k]=i;});
  return map;
}

function FT_MOTORISTA_dateKey_(value) {
  if(value===null||value===undefined||value==='')return '';
  if(value instanceof Date&&isFinite(value.getTime()))return Utilities.formatDate(value,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const s=String(value).trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
  m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
  const d=new Date(s);
  return isFinite(d.getTime())?Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd'):'';
}
function FT_MOTORISTA_timeKey_(value) {
  if(value===null||value===undefined||value==='')return '';
  if(value instanceof Date&&isFinite(value.getTime()))return Utilities.formatDate(value,Session.getScriptTimeZone(),'HH:mm');
  const s=String(value).trim(),m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return m?String(m[1]).padStart(2,'0')+':'+m[2]:s;
}

function obterPortalMotoristaFullTime(token) {
  const session=obterSessao_(token),motoristaId=exigirMotorista_(session);
  const parts=getSheet_('PARTICIPACAO_OPERACOES'),pmap=FT_MOTORISTA_headerMap_(parts);
  const required=['ID','OPERACAO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO'];
  required.forEach(k=>{if(pmap[k]===undefined)throw new Error('Cabeçalho obrigatório ausente em PARTICIPACAO_OPERACOES: '+k);});
  // Leitura estrita: abrir o portal não cria colunas nem altera registros.
  const rows=parts.getLastRow()>1?parts.getRange(2,1,parts.getLastRow()-1,parts.getLastColumn()).getValues():[];
  const own=rows.filter(r=>String(r[pmap.MOTORISTA_ID]||'').trim()===motoristaId);
  const driverRecord=listarRegistros_('MOTORISTAS').find(d=>String(d.id||'').trim()===motoristaId);
  if(!driverRecord)throw new Error('O usuário está vinculado ao motorista '+motoristaId+', mas esse ID não foi encontrado na guia MOTORISTAS. Corrija MOTORISTA_ID na guia USUARIOS.');
  const driverFields=driverRecord.camposPorNome||{};
  const driverName=String(driverFields.NOME_COMPLETO||driverRecord.nome||session.nome||'Motorista');

  const opsSheet=getSheet_('OPERACOES'),omap=FT_MOTORISTA_headerMap_(opsSheet);
  const opRows=opsSheet.getLastRow()>1?opsSheet.getRange(2,1,opsSheet.getLastRow()-1,opsSheet.getLastColumn()).getValues():[];
  const ops={};
  opRows.forEach(r=>{
    const id=String(r[omap.ID]||'');if(!id)return;
    ops[id]={
      id:id,status:String(r[omap.STATUS]||''),data:r[omap.DATA_OPERACAO]||'',
      dataKey:omap.DATA_OPERACAO===undefined?'':FT_MOTORISTA_dateKey_(r[omap.DATA_OPERACAO]),
      cliente:String(r[omap.CLIENTE]||''),nome:String(r[omap.NOME_OPERACAO]||''),
      origem:String(r[omap.ORIGEM]||''),destino:String(r[omap.DESTINO]||''),
      produto:String(r[omap.PRODUTO_SERVICO]||''),distanciaKm:r[omap.DISTANCIA_KM]||'',
      dataEntrega:r[omap.DATA_ENTREGA]||'',janelaInicio:r[omap.JANELA_INICIO]||'',janelaFim:r[omap.JANELA_FIM]||'',
      tempoEstimadoHoras:r[omap.TEMPO_ESTIMADO_HORAS]||'',volume:Number(r[omap.VOLUME_TOTAL_TONELADAS]||0)
    };
  });

  // Eventos são consultados pelo vínculo autenticado e associados à oferta pelo OFERTA_ID.
  const eventSheet=getSheet_('EVENTOS_ESCALA'),emap=FT_MOTORISTA_headerMap_(eventSheet);
  const requiredEventHeaders=['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','MOTIVO','REGISTRADO_POR','OFERTA_ID'];
  requiredEventHeaders.forEach(k=>{
    if(emap[k]===undefined)throw new Error('Cabeçalho obrigatório ausente em EVENTOS_ESCALA: '+k+'. Execute a auditoria estrutural antes de habilitar o histórico.');
  });
  const eventRows=eventSheet.getLastRow()>1?eventSheet.getRange(2,1,eventSheet.getLastRow()-1,eventSheet.getLastColumn()).getValues():[];
  const driverEvents=eventRows.filter(r=>String(r[emap.MOTORISTA_ID]||'').trim()===motoristaId).map(r=>({
    id:String(r[emap.ID]||''),ofertaId:String(r[emap.OFERTA_ID]||''),
    operacaoId:String(r[emap.OPERACAO_ID]||''),tipo:String(r[emap.TIPO_EVENTO]||'EVENTO'),
    dataHora:r[emap.DATA_HORA]||'',motivo:String(r[emap.MOTIVO]||''),
    registradoPor:String(r[emap.REGISTRADO_POR]||'')
  })).sort((a,b)=>new Date(b.dataHora||0)-new Date(a.dataHora||0));

  const now=Date.now();
  const offers=own.map(r=>{
    const offerId=String(r[pmap.ID]||''),opId=String(r[pmap.OPERACAO_ID]||''),op=ops[opId]||{};
    const snapDate=pmap.DATA_OPERACAO_OFERTA===undefined?'':FT_MOTORISTA_dateKey_(r[pmap.DATA_OPERACAO_OFERTA]);
    const snapStart=pmap.HORARIO_OPERACAO_OFERTA===undefined?'':FT_MOTORISTA_timeKey_(r[pmap.HORARIO_OPERACAO_OFERTA]);
    const snapEnd=pmap.JANELA_FIM_OFERTA===undefined?'':FT_MOTORISTA_timeKey_(r[pmap.JANELA_FIM_OFERTA]);
    const currentDate=FT_MOTORISTA_dateKey_(op.data);
    const scheduleChanged=!!snapDate&&(snapDate!==currentDate||
      (!!snapStart&&snapStart!==FT_MOTORISTA_timeKey_(op.janelaInicio))||
      (!!snapEnd&&snapEnd!==FT_MOTORISTA_timeKey_(op.janelaFim)));
    const rawExpiry=pmap.EXPIRA_EM===undefined?'':r[pmap.EXPIRA_EM];
    const expires=rawExpiry instanceof Date?rawExpiry:new Date(rawExpiry);
    let status=String(r[pmap.STATUS_PARTICIPACAO]||'').trim().toUpperCase();
    if(status==='OFERTADA'&&scheduleChanged)status='CANCELADA_REPROGRAMACAO';
    else if(status==='OFERTADA'&&(!isFinite(expires.getTime())||expires.getTime()<=now))status='NAO_RESPONDEU';
    const offerEvents=driverEvents.filter(e=>e.ofertaId===offerId);
    const responseEvent=offerEvents.find(e=>['OFERTA_RECUSADA','ESCALA_CONFIRMADA','OFERTA_EXPIRADA','OFERTA_CANCELADA_REPROGRAMACAO'].includes(e.tipo));
    return {
      id:offerId,operacaoId:opId,status:status,
      criadaEm:pmap.CRIADO_EM===undefined?'':r[pmap.CRIADO_EM],
      ofertadaEm:(pmap.OFERTADA_EM!==undefined&&r[pmap.OFERTADA_EM])?r[pmap.OFERTADA_EM]:(pmap.CRIADO_EM===undefined?'':r[pmap.CRIADO_EM]),
      respondidaEm:pmap.RESPONDIDA_EM===undefined?'':r[pmap.RESPONDIDA_EM],
      expiraEm:rawExpiry,expirada:status==='NAO_RESPONDEU'||status==='EXPIRADA',prazoEncerrado:status==='EXPIRADA'||status==='NAO_RESPONDEU',
      agendaAlterada:status==='CANCELADA_REPROGRAMACAO',
      observacoes:String((pmap.OBSERVACOES_OFERTA!==undefined?r[pmap.OBSERVACOES_OFERTA]:'')||(pmap.MOTIVO!==undefined?r[pmap.MOTIVO]:'')||''),
      motivoResposta:pmap.MOTIVO===undefined?'':String(r[pmap.MOTIVO]||''),
      conjuntoId:pmap.CONJUNTO_ID===undefined?'':String(r[pmap.CONJUNTO_ID]||''),
      operacao:op,eventos:offerEvents,
      decisaoEm:(pmap.RESPONDIDA_EM!==undefined&&r[pmap.RESPONDIDA_EM])?r[pmap.RESPONDIDA_EM]:(responseEvent?responseEvent.dataHora:'')
    };
  }).filter(o=>o.id).sort((a,b)=>new Date(b.ofertadaEm||b.criadaEm||0)-new Date(a.ofertadaEm||a.criadaEm||0));

  // Eventos sem linha de participação também permanecem visíveis no histórico do próprio motorista.
  const offerIds=new Set(offers.map(o=>o.id));
  const eventosAvulsos=driverEvents.filter(e=>!e.ofertaId||!offerIds.has(e.ofertaId)).map(e=>({
    id:e.id,ofertaId:e.ofertaId,operacaoId:e.operacaoId,tipo:e.tipo,dataHora:e.dataHora,
    motivo:e.motivo,operacao:ops[e.operacaoId]||{}
  }));
  const counts={
    pendentes:offers.filter(o=>o.status==='OFERTADA'&&!o.expirada).length,
    aceitas:offers.filter(o=>o.status==='ACEITA'||o.status==='ATIVO').length,
    recusadas:offers.filter(o=>o.status==='RECUSADA').length,
    expiradas:offers.filter(o=>o.status==='NAO_RESPONDEU'||o.status==='EXPIRADA').length,
    canceladas:offers.filter(o=>o.status==='CANCELADA_REPROGRAMACAO'||o.status==='CANCELADA').length,
    total:offers.length
  };
  return {
    user:{nome:driverName,email:session.email,perfil:session.perfil},
    motoristaId,
    hoje:Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'),
    diagnosticoVinculo:{motoristaId,nomeCadastro:driverName,ofertasVinculadas:own.length,ofertasPendentes:counts.pendentes,eventosVinculados:driverEvents.length},
    ofertas:offers,eventos:eventosAvulsos,counts
  };
}

function responderOfertaMotoristaFullTime(token, ofertaId, resposta, observacao) {
  const session=obterSessao_(token), motoristaId=exigirMotorista_(session);
  ofertaId=texto_(ofertaId,120); resposta=String(resposta||'').trim().toUpperCase();
  if(!ofertaId||!['ACEITA','RECUSADA'].includes(resposta))throw new Error('Resposta inválida.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('PARTICIPACAO_OPERACOES');
    const map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
    let idx=-1,record=null;
    for(let i=1;i<rows.length;i++)if(String(rows[i][map.ID]||'')===ofertaId){idx=i;record=rows[i];break;}
    if(idx<1||String(record[map.MOTORISTA_ID]||'')!==motoristaId)throw new Error('Oferta não encontrada para este motorista.');
    if(String(record[map.STATUS_PARTICIPACAO]||'').toUpperCase()!=='OFERTADA')throw new Error('Esta oferta já foi respondida ou não está mais pendente.');
    const expires=record[map.EXPIRA_EM] instanceof Date?record[map.EXPIRA_EM]:new Date(record[map.EXPIRA_EM]);
    if(!isFinite(expires.getTime())||expires.getTime()<=Date.now()){
      if(typeof FT_AUTO_marcarSemResposta_==='function'){
        FT_AUTO_marcarSemResposta_(sh,idx+1,record,map,session.email);
      }else{
        sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');
        FT_colocarMotoristaNoFinalDaFila_(motoristaId,'prazo de 2 horas encerrado sem resposta no portal');
        FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:record[map.OPERACAO_ID],motoristaId,conjuntoId:record[map.CONJUNTO_ID],anterior:'OFERTADA',nova:'NAO_RESPONDEU',motivo:'Prazo de 2 horas encerrado sem resposta registrada no portal; motorista reposicionado ao final da fila.',autor:session.email,ofertaId});
      }
      auditar_(session,'OFERTA_EXPIRADA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId);
      return {ok:false,status:'NAO_RESPONDEU',message:'O prazo de duas horas terminou sem resposta. Você foi reposicionado ao final da fila de convocação.'};
    }
    const now=new Date(),note=texto_(observacao,500);
    sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue(resposta==='ACEITA'?'ACEITA':'RECUSADA');
    if(resposta==='ACEITA'&&map.INICIO_EM!==undefined)sh.getRange(idx+1,map.INICIO_EM+1).setValue(now);
    if(map.RESPONDIDA_EM!==undefined)sh.getRange(idx+1,map.RESPONDIDA_EM+1).setValue(now);
    if(note&&map.MOTIVO!==undefined)sh.getRange(idx+1,map.MOTIVO+1).setValue(note);
    if(resposta==='RECUSADA')FT_colocarMotoristaNoFinalDaFila_(motoristaId,'recusou a convocação');
    FT_CONV_appendEvent_({tipo:resposta==='ACEITA'?'ESCALA_CONFIRMADA':'OFERTA_RECUSADA',
      operacaoId:record[map.OPERACAO_ID],motoristaId,conjuntoId:record[map.CONJUNTO_ID],
      anterior:'OFERTADA',nova:resposta,motivo:note||'Resposta registrada pelo portal do motorista.',
      autor:session.email,ofertaId});
    auditar_(session,'RESPOSTA_OFERTA_MOTORISTA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId+' -> '+resposta);
    return {ok:true,status:resposta==='ACEITA'?'ATIVO':'RECUSADA',message:resposta==='ACEITA'?'Aceite registrado. Aguarde a confirmação da escala pela administração.':'Recusa registrada. O próximo motorista será chamado automaticamente.'};
  } finally {lock.releaseLock();}
}

/** Confirmação administrativa posterior ao aceite do motorista. */
function confirmarAceiteOfertaAdminFullTime(token, ofertaId) {
  const session=obterSessao_(token);exigirAdmin_(session);
  ofertaId=texto_(ofertaId,120);
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
    const idx=rows.findIndex((r,i)=>i>0&&String(r[map.ID]||'')===ofertaId);
    if(idx<1)throw new Error('Oferta não encontrada.');
    const r=rows[idx],status=String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase();
    if(status!=='ACEITA')throw new Error('Somente ofertas aceitas pelo motorista podem ser confirmadas.');
    // O prazo de 2 horas limita a resposta do motorista. Após status ACEITA,
    // a decisão foi registrada dentro do prazo e aguarda apenas validação administrativa.
    const opSh=getSheet_('OPERACOES'),opGrid=opSh.getDataRange().getValues(),oh=opGrid[0].map(v=>String(v||'').trim().toUpperCase()),oi={};
    oh.forEach((h,i)=>{if(h&&oi[h]===undefined)oi[h]=i;});
    const op=opGrid.slice(1).find(x=>String(x[oi.ID]||'')===String(r[map.OPERACAO_ID]));
    if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[oi.STATUS]||'').toUpperCase()))throw new Error('A operação não está aberta para ativação.');
    const all=rows.slice(1);
    const conflict=all.some((x,i)=>i!==idx-1&&['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(x[map.STATUS_PARTICIPACAO]||'').toUpperCase())&&
      (String(x[map.CONJUNTO_ID]||'')===String(r[map.CONJUNTO_ID]||'')||String(x[map.MOTORISTA_ID]||'')===String(r[map.MOTORISTA_ID]||'')));
    if(conflict)throw new Error('O motorista ou conjunto já possui outra oferta ou escala em andamento.');
    const now=new Date();
    sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('ATIVO');
    if(map.INICIO_EM!==undefined)sh.getRange(idx+1,map.INICIO_EM+1).setValue(now);
    if(map.REGISTRADO_POR!==undefined)sh.getRange(idx+1,map.REGISTRADO_POR+1).setValue(session.email||session.login);
    FT_CONV_appendEvent_({tipo:'ESCALA_CONFIRMADA',operacaoId:r[map.OPERACAO_ID],motoristaId:r[map.MOTORISTA_ID],
      conjuntoId:r[map.CONJUNTO_ID],anterior:'ACEITA',nova:'ATIVO',motivo:'Aceite do motorista confirmado pela administração.',
      autor:session.email||session.login,ofertaId});
    auditar_(session,'CONFIRMAR_ESCALA','OPERACAO',String(r[map.OPERACAO_ID]),ofertaId+' ativada após aceite.');
    return {ok:true,message:'Escala confirmada. O conjunto está ativo na operação.'};
  } finally {lock.releaseLock();}
}


function listarOfertasAceitasAdminFullTime(token) {
  const session=obterSessao_(token);exigirAdmin_(session);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
  const ops=getSheet_('OPERACOES'),omap=FT_MOTORISTA_headerMap_(ops),orows=ops.getDataRange().getValues(),byId={};
  orows.slice(1).forEach(r=>byId[String(r[omap.ID]||'')]={nome:String(r[omap.NOME_OPERACAO]||''),origem:String(r[omap.ORIGEM]||''),destino:String(r[omap.DESTINO]||'')});
  const drivers=FT_CENTRO_rows_('MOTORISTAS'),driverNames={};
  drivers.forEach(d=>driverNames[String(d.ID)]=String(d.NOME_COMPLETO||''));
  return rows.slice(1).filter(r=>['ACEITA','ATIVO'].includes(String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase())).map(r=>{
    const op=byId[String(r[map.OPERACAO_ID]||'')]||{};
    return {id:String(r[map.ID]||''),motorista:driverNames[String(r[map.MOTORISTA_ID]||'')]||String(r[map.MOTORISTA_ID]||''),operacao:op.nome||String(r[map.OPERACAO_ID]||''),origem:op.origem||'',destino:op.destino||'',conjuntoId:String(r[map.CONJUNTO_ID]||''),aceitaEm:r[map.RESPONDIDA_EM]||''};
  });
}

/**
 * Diagnóstico sem escrita: compara as ofertas efetivas dos motoristas fictícios
 * 023, 024, 025 e 039 com o estado persistido da fila automática.
 * Execute pelo editor do Apps Script. Não cria, cancela ou altera ofertas.
 */
function FT_DIAGNOSTICAR_DIVERGENCIA_CONVOCACOES_20261113(){
  const ids=['023','024','025','039'].map(n=>'FT-TESTE-20261111-MOT-'+n);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_MOTORISTA_headerMap_(sh);
  const required=['ID','OPERACAO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','CONJUNTO_ID'];
  required.forEach(k=>{if(m[k]===undefined)throw new Error('Cabeçalho ausente: '+k);});
  const rows=sh.getDataRange().getValues().slice(1);
  const details=ids.map(id=>{
    const own=rows.filter(r=>String(r[m.MOTORISTA_ID]||'').trim()===id);
    const statuses={};
    own.forEach(r=>{const st=String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase();statuses[st]=(statuses[st]||0)+1;});
    return {motoristaId:id,participacoes:own.length,statuses,ultimas:own.slice(-5).reverse().map(r=>({
      ofertaId:String(r[m.ID]||''),operacaoId:String(r[m.OPERACAO_ID]||''),
      conjuntoId:String(r[m.CONJUNTO_ID]||''),status:String(r[m.STATUS_PARTICIPACAO]||''),
      origem:m.ORIGEM_OFERTA===undefined?'':String(r[m.ORIGEM_OFERTA]||''),
      expiraEm:m.EXPIRA_EM===undefined?'':String(r[m.EXPIRA_EM]||'')
    }))};
  });
  const queues=typeof FT_AUTO_READ_==='function'?FT_AUTO_READ_():{};
  const queueSummary=Object.keys(queues).map(opId=>({
    operacaoId:opId,status:queues[opId].status,cursor:queues[opId].cursor,
    vagas:queues[opId].vagas,pendentes:queues[opId].pendentes||[],
    aceitas:queues[opId].aceitas
  }));
  const result={modo:'SOMENTE_LEITURA',totalParticipacoes:rows.length,motoristas:details,filasAutomaticas:queueSummary};
  Logger.log('FULL TIME — DIVERGENCIA CONVOCACOES: '+JSON.stringify(result));
  return result;
}