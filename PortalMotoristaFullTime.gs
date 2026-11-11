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

function obterPortalMotoristaFullTime(token) {
  const session=obterSessao_(token), motoristaId=exigirMotorista_(session);
  const parts=getSheet_('PARTICIPACAO_OPERACOES'), pmap=FT_MOTORISTA_headerMap_(parts);
  const rows=parts.getDataRange().getValues();
  const own=rows.slice(1).filter(r=>String(r[pmap.MOTORISTA_ID]||'')===motoristaId);
  const opsSheet=getSheet_('OPERACOES'), omap=FT_MOTORISTA_headerMap_(opsSheet), opRows=opsSheet.getDataRange().getValues();
  const ops={};
  opRows.slice(1).forEach(r=>{ops[String(r[omap.ID]||'')]={
    id:String(r[omap.ID]||''),status:String(r[omap.STATUS]||''),data:r[omap.DATA_OPERACAO]||'',
    cliente:String(r[omap.CLIENTE]||''),nome:String(r[omap.NOME_OPERACAO]||''),
    origem:String(r[omap.ORIGEM]||''),destino:String(r[omap.DESTINO]||''),
    produto:String(r[omap.PRODUTO_SERVICO]||''),distanciaKm:r[omap.DISTANCIA_KM]||'',
    dataEntrega:r[omap.DATA_ENTREGA]||'',janelaInicio:r[omap.JANELA_INICIO]||'',janelaFim:r[omap.JANELA_FIM]||'',
    tempoEstimadoHoras:r[omap.TEMPO_ESTIMADO_HORAS]||'',volume:Number(r[omap.VOLUME_TOTAL_TONELADAS]||0)
  };});
  const now=Date.now(), offers=own.map(r=>{
    const op=ops[String(r[pmap.OPERACAO_ID]||'')]||{};
    const expires=r[pmap.EXPIRA_EM] instanceof Date?r[pmap.EXPIRA_EM]:new Date(r[pmap.EXPIRA_EM]);
    const status=String(r[pmap.STATUS_PARTICIPACAO]||'').toUpperCase();
    return {
      id:String(r[pmap.ID]||''),status:status,ofertadaEm:r[pmap.OFERTADA_EM]||r[pmap.CRIADO_EM]||'',
      expiraEm:r[pmap.EXPIRA_EM]||'',expirada:status==='OFERTADA'&&isFinite(expires.getTime())&&expires.getTime()<now,
      observacoes:String((pmap.OBSERVACOES_OFERTA!==undefined?r[pmap.OBSERVACOES_OFERTA]:'')||r[pmap.MOTIVO]||''),
      operacao:op,conjuntoId:String(r[pmap.CONJUNTO_ID]||'')
    };
  }).filter(o=>o.id&&o.operacao.id).sort((a,b)=>new Date(b.ofertadaEm||0)-new Date(a.ofertadaEm||0));
  const counts={pendentes:offers.filter(o=>o.status==='OFERTADA'&&!o.expirada).length,aceitas:offers.filter(o=>o.status==='ACEITA'||o.status==='ATIVO').length,recusadas:offers.filter(o=>o.status==='RECUSADA').length};
  return {user:{nome:session.nome,email:session.email},motoristaId,ofertas:offers,counts};
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
    if(!isFinite(expires.getTime())||expires.getTime()<Date.now()){
      sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('EXPIRADA');
      sh.getRange(idx+1,map.RESPONDIDA_EM+1).setValue(new Date());
      throw new Error('O prazo desta oferta expirou. Solicite uma nova convocação.');
    }
    const now=new Date();
    sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue(resposta);
    sh.getRange(idx+1,map.RESPONDIDA_EM+1).setValue(now);
    const note=texto_(observacao,500);
    if(note&&map.MOTIVO!==undefined)sh.getRange(idx+1,map.MOTIVO+1).setValue(note);
    FT_CONV_appendEvent_({tipo:resposta==='ACEITA'?'OFERTA_ACEITA':'OFERTA_RECUSADA',
      operacaoId:record[map.OPERACAO_ID],motoristaId,conjuntoId:record[map.CONJUNTO_ID],
      anterior:'OFERTADA',nova:resposta,motivo:note||'Resposta registrada pelo portal do motorista.',
      autor:session.email,ofertaId});
    auditar_(session,'RESPOSTA_OFERTA_MOTORISTA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId+' -> '+resposta);
    return {ok:true,status:resposta,message:resposta==='ACEITA'?'Aceite registrado. Aguarde a confirmação operacional da escala.':'Recusa registrada.'};
  } finally {lock.releaseLock();}
}

/** Confirmação administrativa posterior ao aceite do motorista. */
function confirmarAceiteOfertaAdminFullTime(token, ofertaId) {
  const session=obterSessao_(token);exigirAdmin_(session);
  ofertaId=texto_(ofertaId,120);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
  const idx=rows.findIndex((r,i)=>i>0&&String(r[map.ID]||'')===ofertaId);
  if(idx<1)throw new Error('Oferta não encontrada.');
  const r=rows[idx],status=String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase();
  if(status!=='ACEITA')throw new Error('Somente ofertas aceitas pelo motorista podem ser confirmadas.');
  const ops=getSheet_('OPERACOES').getDataRange().getValues();
  const op=ops.find((x,i)=>i>0&&String(x[0])===String(r[map.OPERACAO_ID]));
  if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[2]||'')))throw new Error('A operação não está aberta para ativação.');
  sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('ATIVO');
  sh.getRange(idx+1,map.REGISTRADO_POR+1).setValue(session.email||session.login);
  FT_CONV_appendEvent_({tipo:'ESCALA_CONFIRMADA',operacaoId:r[map.OPERACAO_ID],motoristaId:r[map.MOTORISTA_ID],
    conjuntoId:r[map.CONJUNTO_ID],anterior:'ACEITA',nova:'ATIVO',motivo:'Aceite do motorista confirmado pela administração.',
    autor:session.email||session.login,ofertaId});
  auditar_(session,'CONFIRMAR_ESCALA','OPERACAO',String(r[map.OPERACAO_ID]),ofertaId+' ativada após aceite.');
  return {ok:true,message:'Escala confirmada. O conjunto está ativo na operação.'};
}


function listarOfertasAceitasAdminFullTime(token) {
  const session=obterSessao_(token);exigirAdmin_(session);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
  const ops=getSheet_('OPERACOES'),omap=FT_MOTORISTA_headerMap_(ops),orows=ops.getDataRange().getValues(),byId={};
  orows.slice(1).forEach(r=>byId[String(r[omap.ID]||'')]={nome:String(r[omap.NOME_OPERACAO]||''),origem:String(r[omap.ORIGEM]||''),destino:String(r[omap.DESTINO]||'')});
  const drivers=FT_CENTRO_rows_('MOTORISTAS'),driverNames={};
  drivers.forEach(d=>driverNames[String(d.ID)]=String(d.NOME_COMPLETO||''));
  return rows.slice(1).filter(r=>String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase()==='ACEITA').map(r=>{
    const op=byId[String(r[map.OPERACAO_ID]||'')]||{};
    return {id:String(r[map.ID]||''),motorista:driverNames[String(r[map.MOTORISTA_ID]||'')]||String(r[map.MOTORISTA_ID]||''),operacao:op.nome||String(r[map.OPERACAO_ID]||''),origem:op.origem||'',destino:op.destino||'',conjuntoId:String(r[map.CONJUNTO_ID]||''),aceitaEm:r[map.RESPONDIDA_EM]||''};
  });
}
