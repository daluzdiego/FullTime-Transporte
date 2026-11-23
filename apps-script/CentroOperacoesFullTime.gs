/**
 * Início administrativo explícito da operação.
 * Exige ao menos uma escala já confirmada (participação ATIVO).
 */
function iniciarOperacaoFullTime(token, operacaoId) {
  const session=obterSessao_(token);exigirAdmin_(session);
  operacaoId=texto_(operacaoId,100);
  if(!operacaoId)throw new Error('Informe a operação que será iniciada.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('OPERACOES'),grid=sh.getDataRange().getValues();
    const headers=(grid[0]||[]).map(v=>String(v||'').trim().toUpperCase()),ix={};
    headers.forEach((h,i)=>{if(h&&ix[h]===undefined)ix[h]=i;});
    ['ID','STATUS'].forEach(k=>{if(ix[k]===undefined)throw new Error('Cabeçalho ausente em OPERACOES: '+k);});
    const rowIndex=grid.findIndex((r,i)=>i>0&&String(r[ix.ID]||'')===operacaoId);
    if(rowIndex<1)throw new Error('Operação não encontrada.');
    const status=String(grid[rowIndex][ix.STATUS]||'').trim().toUpperCase();
    if(status!=='ABERTA')throw new Error('Somente operações ABERTAS podem ser iniciadas. Status atual: '+(status||'não informado')+'.');
    const parts=FT_CENTRO_rows_('PARTICIPACAO_OPERACOES');
    const active=parts.filter(p=>String(p.OPERACAO_ID||'')===operacaoId&&String(p.STATUS_PARTICIPACAO||'').toUpperCase()==='ATIVO');
    if(!active.length)throw new Error('Confirme a escala de pelo menos um motorista antes de iniciar a operação.');
    sh.getRange(rowIndex+1,ix.STATUS+1).setValue('EM_ANDAMENTO');
    auditar_(session,'INICIAR_OPERACAO','OPERACAO',operacaoId,'Operação iniciada após confirmação de escala; participações ativas: '+active.length+'.');
    return {ok:true,status:'EM_ANDAMENTO',message:'Operação iniciada. '+active.length+' conjunto(s) confirmado(s) em operação.'};
  } finally {lock.releaseLock();}
}

/**
 * FULL TIME — CENTRO DE OPERAÇÕES V1
 * Leitura consolidada por cabeçalho. Não altera nem sobrescreve registros.
 * Distâncias e pesos só são exibidos quando informados no cadastro/operação.
 */
function FT_CENTRO_norm_(v) {
  return String(v == null ? '' : v).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9_]/g,'');
}
function FT_CENTRO_rows_(sheetName) {
  const sh = getSheet_(sheetName);
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 1) return [];
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const ix = {};
  headers.forEach((h,i) => { const k=FT_CENTRO_norm_(h); if(k && ix[k]===undefined) ix[k]=i; });
  return sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues().map(row => {
    const o={};
    Object.keys(ix).forEach(k => { let v=row[ix[k]]; if(v instanceof Date) v=Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss'); o[k]=v==null?'':v; });
    return o;
  }).filter(o => Object.keys(o).some(k => o[k] !== ''));
}
function FT_CENTRO_num_(v) {
  if (typeof v === 'number') return isFinite(v)?v:0;
  const s=String(v||'').trim().replace(/\./g,'').replace(',','.');
  const n=Number(s); return isFinite(n)?n:0;
}
function FT_CENTRO_dateKey_(value) {
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
function FT_CENTRO_addDays_(dateKey,days) {
  if(!dateKey)return '';
  const p=dateKey.split('-').map(Number),d=new Date(p[0],p[1]-1,p[2],12,0,0);
  d.setDate(d.getDate()+days);
  return Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
}
function obterCentroOperacoesFullTime(token) {
  const session=obterSessao_(token);exigirAdmin_(session);
  const ops=FT_CENTRO_rows_('OPERACOES'),parts=FT_CENTRO_rows_('PARTICIPACAO_OPERACOES');
  const moves=FT_CENTRO_rows_('MOVIMENTACOES_OPERACAO');
  const drivers=FT_CENTRO_rows_('MOTORISTAS'),horses=FT_CENTRO_rows_('CAVALOS');
  const trailers=FT_CENTRO_rows_('CARRETAS'),sets=FT_CENTRO_rows_('CONJUNTOS');
  const byId=a=>Object.fromEntries(a.map(x=>[String(x.ID||''),x]));
  const dBy=byId(drivers),hBy=byId(horses),tBy=byId(trailers),sBy=byId(sets);
  const partsByOp={},movesByOp={};
  parts.forEach(p=>{const id=String(p.OPERACAO_ID||'');if(!partsByOp[id])partsByOp[id]=[];partsByOp[id].push(p);});
  moves.forEach(m=>{const id=String(m.OPERACAO_ID||'');if(!movesByOp[id])movesByOp[id]=[];movesByOp[id].push(m);});
  const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const activeStatuses=new Set(['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE','SUSPENSA','CONCLUSAO_PENDENTE']);
  const all=ops.map(o=>{
    const id=String(o.ID||''),status=String(o.STATUS||'').toUpperCase();
    const relatedParts=partsByOp[id]||[];
    const related=relatedParts.filter(p=>['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(p.STATUS_PARTICIPACAO||'').toUpperCase()));
    const operationMoves=movesByOp[id]||[];
    const ton=operationMoves.reduce((n,m)=>n+FT_CENTRO_num_(m.TONELADAS),0);
    const trips=operationMoves.reduce((n,m)=>n+FT_CENTRO_num_(m.QUANTIDADE_VIAGENS||(String(m.VIAGEM_CONCLUIDA||'').toUpperCase()==='SIM'?1:0)),0);
    const previstas=FT_CENTRO_num_(o.TOTAL_VIAGENS_PREVISTAS);
    const realizadas=trips||FT_CENTRO_num_(o.VIAGENS_REALIZADAS);
    const saldo=FT_CENTRO_num_(o.SALDO_TONELADAS);
    const inicio=FT_CENTRO_dateKey_(o.DATA_OPERACAO);
    const termino=FT_CENTRO_dateKey_(o.DATA_ENTREGA);
    const atrasada=!!(termino&&termino<today&&['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(status));
    const semPrevisao=!!(inicio&&['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(status)&&!termino);
    const semPendencias=related.length===0;
    const viagensConferidas=previstas>0&&realizadas>=previstas;
    const saldoConferido=saldo<=0.000001;
    const sugestaoConclusao=['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE','CONCLUSAO_PENDENTE'].includes(status)&&saldoConferido&&viagensConferidas&&semPendencias;
    let grupo='HISTORICO';
    if(['CONCLUIDA','ENCERRADA'].includes(status))grupo='CONCLUIDAS';
    else if(['CANCELADA','CANCELADO'].includes(status))grupo='CANCELADAS';
    else if(inicio&&inicio>today&&activeStatuses.has(status))grupo='FUTURAS';
    else if(activeStatuses.has(status))grupo='ATUAIS';
    const conjuntos=related.map(p=>{
      const sid=String(p.CONJUNTO_ID||''),s=sBy[sid]||{},did=String(s.MOTORISTA_ID||p.MOTORISTA_ID||'');
      const h=hBy[String(s.CAVALO_ID||'')]||{},t1=tBy[String(s.CARRETA_MEIO_ID||'')]||{},t2=tBy[String(s.CARRETA_FINAL_ID||'')]||{};
      const trailerTare=FT_CENTRO_num_(t1.TARA_TONELADAS)+FT_CENTRO_num_(t2.TARA_TONELADAS);
      const trailerCap=FT_CENTRO_num_(t1.CAPACIDADE_CARGA_TONELADAS)+FT_CENTRO_num_(t2.CAPACIDADE_CARGA_TONELADAS);
      const rawUpdate=p.ATUALIZADA_EM||p.ATUALIZADO_EM||p.DATA_ATUALIZACAO||p.RESPONDIDA_EM||p.SAIDA_EM||p.RETORNO_EM||'';
      const lastUpdate=rawUpdate instanceof Date&&isFinite(rawUpdate.getTime())?Utilities.formatDate(rawUpdate,Session.getScriptTimeZone(),'dd/MM/yyyy HH:mm'):String(rawUpdate||'');
      return {participacaoId:String(p.ID||''),conjuntoId:sid,motorista:dBy[did]?.NOME_COMPLETO||did,cavaloPlaca:String(h.PLACA||''),cavaloTara:FT_CENTRO_num_(h.TARA_TONELADAS),cavaloPbtc:FT_CENTRO_num_(h.PBTC_MAX_TONELADAS),carretaMeio:String(t1.PLACA||''),carretaFinal:String(t2.PLACA||''),carretasTara:trailerTare,carretasCapacidade:trailerCap,taraTotal:FT_CENTRO_num_(h.TARA_TONELADAS)+trailerTare,capacidadeUtil:FT_CENTRO_num_(s.CAPACIDADE_UTIL_TONELADAS),toneladasCarregadas:FT_CENTRO_num_(p.TONELADAS_MOVIMENTADAS),status:String(p.STATUS_PARTICIPACAO||''),saida:String(p.SAIDA_EM||''),retorno:String(p.RETORNO_EM||''),ultimaAtualizacao:lastUpdate};
    });
    return {id,nome:String(o.NOME_OPERACAO||''),cliente:String(o.CLIENTE||''),status,data:String(o.DATA_OPERACAO||''),previsaoTermino:String(o.DATA_ENTREGA||''),atrasada,semPrevisao,sugestaoConclusao,grupo,origem:String(o.ORIGEM||''),destino:String(o.DESTINO||''),distanciaKm:FT_CENTRO_num_(o.DISTANCIA_KM),produto:String(o.PRODUTO_SERVICO||o.PRODUTO||''),volumeTotal:FT_CENTRO_num_(o.VOLUME_TOTAL_TONELADAS),saldo,viagensPrevistas:previstas,viagensRealizadas:realizadas,toneladasMovimentadas:ton,conjuntos,criteriosConclusao:{saldoConferido,viagensConferidas,semPendencias}};
  });
  const current=all.filter(o=>o.grupo==='ATUAIS');
  const future=all.filter(o=>o.grupo==='FUTURAS');
  const late=all.filter(o=>o.atrasada);
  const totalTon=current.reduce((n,o)=>n+o.toneladasMovimentadas,0);
  return {
    user:session,atualizadoEm:new Date().toISOString(),hoje:today,
    indicadores:{operacoesAtuais:current.length,operacoesEmAndamento:current.filter(o=>['EM_ANDAMENTO','EM ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(String(o.status||'').toUpperCase())).length,operacoesFuturas:future.length,operacoesAtrasadas:late.length,sugestoesConclusao:all.filter(o=>o.sugestaoConclusao).length,conjuntosEmOperacao:current.reduce((n,o)=>n+o.conjuntos.length,0),motoristasEmOperacao:current.reduce((n,o)=>n+o.conjuntos.filter(s=>['ATIVO','SAIU','EM_VIAGEM'].includes(String(s.status||'').toUpperCase())).length,0),viagensPendentes:current.reduce((n,o)=>n+Math.max(0,o.viagensPrevistas-o.viagensRealizadas),0),toneladasMovimentadas:totalTon},
    operacoes:current,futuras:future,atrasadas:late,concluidas:all.filter(o=>o.grupo==='CONCLUIDAS'),canceladas:all.filter(o=>o.grupo==='CANCELADAS'),historico:all.filter(o=>['CONCLUIDAS','CANCELADAS'].includes(o.grupo))
  };
}


/**
 * Encerramento administrativo explícito. Não altera operação só por ter passado a data.
 * Exige saldo zerado, viagens previstas conferidas e ausência de participações ativas.
 */
function confirmarConclusaoOperacaoFullTime(token, operacaoId, observacao) {
  const session=obterSessao_(token);exigirAdmin_(session);
  operacaoId=texto_(operacaoId,100);observacao=texto_(observacao||'',500);
  if(!operacaoId)throw new Error('Informe a operação que será encerrada.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('OPERACOES'),grid=sh.getDataRange().getValues();
    const headers=(grid[0]||[]).map(v=>String(v||'').trim().toUpperCase()),ix={};
    headers.forEach((h,i)=>{if(h&&ix[h]===undefined)ix[h]=i;});
    ['ID','STATUS','SALDO_TONELADAS','TOTAL_VIAGENS_PREVISTAS','VIAGENS_REALIZADAS'].forEach(k=>{if(ix[k]===undefined)throw new Error('Cabeçalho ausente em OPERACOES: '+k);});
    const rowIndex=grid.findIndex((r,i)=>i>0&&String(r[ix.ID]||'')===operacaoId);
    if(rowIndex<1)throw new Error('Operação não encontrada.');
    const row=grid[rowIndex],status=String(row[ix.STATUS]||'').toUpperCase();
    if(['CONCLUIDA','CANCELADA','CANCELADO'].includes(status))throw new Error('Esta operação já está encerrada ou cancelada.');
    const saldo=FT_CENTRO_num_(row[ix.SALDO_TONELADAS]);
    const previstas=FT_CENTRO_num_(row[ix.TOTAL_VIAGENS_PREVISTAS]);
    const moves=FT_CENTRO_rows_('MOVIMENTACOES_OPERACAO').filter(m=>String(m.OPERACAO_ID||'')===operacaoId);
    const trips=moves.reduce((n,m)=>n+FT_CENTRO_num_(m.QUANTIDADE_VIAGENS||(String(m.VIAGEM_CONCLUIDA||'').toUpperCase()==='SIM'?1:0)),0);
    const realizadas=trips||FT_CENTRO_num_(row[ix.VIAGENS_REALIZADAS]);
    if(saldo>0.000001)throw new Error('Ainda existe saldo de '+saldo+' t. A operação não pode ser concluída.');
    if(previstas<=0)throw new Error('Informe o total de viagens previstas antes de concluir a operação.');
    if(realizadas<previstas)throw new Error('Existem viagens pendentes: '+realizadas+' de '+previstas+'.');
    const parts=getSheet_('PARTICIPACAO_OPERACOES'),pm=FT_CENTRO_headerMapLocal_(parts);
    const active=new Set(['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM']);
    const activeRows=parts.getLastRow()>1?parts.getRange(2,1,parts.getLastRow()-1,parts.getLastColumn()).getValues():[];
    const pending=activeRows.filter(r=>String(r[pm.OPERACAO_ID]||'')===operacaoId&&active.has(String(r[pm.STATUS_PARTICIPACAO]||'').toUpperCase()));
    if(pending.length)throw new Error('Ainda existem '+pending.length+' participações ou convocações ativas. Resolva-as antes do encerramento.');
    sh.getRange(rowIndex+1,ix.STATUS+1).setValue('CONCLUIDA');
    auditar_(session,'CONFIRMAR_CONCLUSAO_OPERACAO','OPERACAO',operacaoId,observacao||'Conclusão confirmada pelo administrador. Saldo e viagens conferidos.');
    return {ok:true,status:'CONCLUIDA',message:'Operação encerrada administrativamente. O histórico foi preservado.'};
  } finally {lock.releaseLock();}
}
function FT_CENTRO_headerMapLocal_(sh) {
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0],map={};
  headers.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&map[k]===undefined)map[k]=i;});
  ['OPERACAO_ID','STATUS_PARTICIPACAO'].forEach(k=>{if(map[k]===undefined)throw new Error('Cabeçalho ausente em PARTICIPACAO_OPERACOES: '+k);});
  return map;
}



/**
 * Migração aditiva dos campos logísticos da operação.
 * Acrescenta somente cabeçalhos ausentes ao final da guia OPERACOES.
 * Não limpa, move ou reescreve dados existentes.
 */
function FT_prepararCamposLogisticosOperacao20261110() {
  const sh=getSheet_('OPERACOES');
  const required=['PRODUTO_SERVICO','DISTANCIA_KM','DATA_ENTREGA','JANELA_INICIO','JANELA_FIM','TEMPO_ESTIMADO_HORAS'];
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim()):[];
  const norm=v=>String(v||'').trim().toUpperCase();
  const have=new Set(current.map(norm).filter(Boolean));
  const missing=required.filter(h=>!have.has(norm(h)));
  if(missing.length) sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  const finalHeaders=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  sh.setFrozenRows(1);
  return {ok:true,adicionados:missing,preservados:true,totalColunas:finalHeaders.length,message:missing.length?'Campos logísticos adicionados ao final de OPERACOES.':'Todos os campos logísticos já existem.'};
}

/** Diagnóstico somente leitura para homologar datas, atrasos e sugestões de encerramento. */
function FT_AUDITAR_CICLO_VIDA_OPERACOES_20261116() {
  const ops=FT_CENTRO_rows_('OPERACOES'),parts=FT_CENTRO_rows_('PARTICIPACAO_OPERACOES');
  const moves=FT_CENTRO_rows_('MOVIMENTACOES_OPERACAO');
  const today=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  const result=ops.map(o=>{
    const id=String(o.ID||''),status=String(o.STATUS||'').toUpperCase();
    const opParts=parts.filter(p=>String(p.OPERACAO_ID||'')===id);
    const active=opParts.filter(p=>['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(p.STATUS_PARTICIPACAO||'').toUpperCase()));
    const opMoves=moves.filter(m=>String(m.OPERACAO_ID||'')===id);
    const trips=opMoves.reduce((n,m)=>n+FT_CENTRO_num_(m.QUANTIDADE_VIAGENS||(String(m.VIAGEM_CONCLUIDA||'').toUpperCase()==='SIM'?1:0)),0)||FT_CENTRO_num_(o.VIAGENS_REALIZADAS);
    const saldo=FT_CENTRO_num_(o.SALDO_TONELADAS),planned=FT_CENTRO_num_(o.TOTAL_VIAGENS_PREVISTAS);
    const due=FT_CENTRO_dateKey_(o.DATA_ENTREGA);
    return {id,nome:String(o.NOME_OPERACAO||''),status,dataInicio:FT_CENTRO_dateKey_(o.DATA_OPERACAO),previsaoTermino:due,atrasada:!!(due&&due<today&&['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(status)),semPrevisao:!due&&['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(status),saldo,viagensPrevistas:planned,viagensRealizadas:trips,participacoesAtivas:active.length,sugestaoConclusao:saldo<=0.000001&&planned>0&&trips>=planned&&active.length===0&&!['CONCLUIDA','CANCELADA','CANCELADO'].includes(status)};
  });
  const summary={executadoEm:new Date().toISOString(),modo:'SOMENTE_LEITURA',hoje:today,total:result.length,atrasadas:result.filter(x=>x.atrasada).length,semPrevisao:result.filter(x=>x.semPrevisao).length,sugestoesConclusao:result.filter(x=>x.sugestaoConclusao).length,porStatus:{},operacoes:result};
  result.forEach(x=>summary.porStatus[x.status]=(summary.porStatus[x.status]||0)+1);
  Logger.log('FULL TIME — AUDITORIA CICLO DE VIDA: '+JSON.stringify(summary));
  return summary;
}
