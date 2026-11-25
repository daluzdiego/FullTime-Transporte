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
/** Cálculo puro de progresso: o peso real pode ficar abaixo ou acima do previsto. */
function FT_CENTRO_progress_(planned,actual) {
  planned=FT_CENTRO_num_(planned); actual=FT_CENTRO_num_(actual);
  return {previsto:planned,carregado:actual,falta:Math.max(0,planned-actual),excedente:Math.max(0,actual-planned),percentual:planned>0?Math.min(100,actual/planned*100):0};
}
function testarCalculosCentroOperacoesFullTime() {
  const cases=[
    {nome:'operação parcialmente carregada',previsto:660,real:420,falta:240,excedente:0},
    {nome:'peso real abaixo do previsto',previsto:660,real:657.5,falta:2.5,excedente:0},
    {nome:'peso real acima do previsto',previsto:660,real:665,falta:0,excedente:5}
  ];
  const testes=cases.map(c=>{
    const r=FT_CENTRO_progress_(c.previsto,c.real);
    return {teste:c.nome,ok:Math.abs(r.falta-c.falta)<0.000001&&Math.abs(r.excedente-c.excedente)<0.000001,resultado:r};
  });
  const result={ok:testes.every(t=>t.ok),testes:testes,modo:'SOMENTE_CALCULO_SEM_ESCRITA'};
  Logger.log('FT_CENTRO_TESTE_CALCULOS '+JSON.stringify(result));
  return result;
}
function obterCentroOperacoesFullTime(token) {
  const session=obterSessao_(token); exigirAdmin_(session);
  const ops=FT_CENTRO_rows_('OPERACOES');
  const parts=FT_CENTRO_rows_('PARTICIPACAO_OPERACOES');
  const moves=FT_CENTRO_rows_('MOVIMENTACOES_OPERACAO');
  const drivers=FT_CENTRO_rows_('MOTORISTAS');
  const horses=FT_CENTRO_rows_('CAVALOS');
  const trailers=FT_CENTRO_rows_('CARRETAS');
  const sets=FT_CENTRO_rows_('CONJUNTOS');
  const destinations=FT_CENTRO_rows_('DESTINOS_OPERACAO');
  const byId=a=>Object.fromEntries(a.map(x=>[String(x.ID||''),x]));
  const dBy=byId(drivers),hBy=byId(horses),tBy=byId(trailers),sBy=byId(sets);
  const partById=byId(parts);
  const currentOps=ops.filter(o=>String(o.STATUS||'').toUpperCase()!=='CANCELADA').map(o=>{
    const id=String(o.ID||'');
    const related=parts.filter(p=>String(p.OPERACAO_ID||'')===id && ['ATIVO','SAIU','EM_VIAGEM','ACEITA'].includes(String(p.STATUS_PARTICIPACAO||'').toUpperCase()));
    const operationMoves=moves.filter(m=>String(m.OPERACAO_ID||'')===id);
    const moved=operationMoves.reduce((n,m)=>n+FT_CENTRO_num_(m.TONELADAS),0);
    const planned=FT_CENTRO_num_(o.VOLUME_TOTAL_TONELADAS);
    const progress=FT_CENTRO_progress_(planned,moved);
    const remaining=progress.falta;
    const overrun=progress.excedente;
    const trips=operationMoves.reduce((n,m)=>n+FT_CENTRO_num_(m.QUANTIDADE_VIAGENS || (String(m.VIAGEM_CONCLUIDA||'').toUpperCase()==='SIM'?1:0)),0);
    const driverMap={};
    operationMoves.forEach(m=>{
      const p=partById[String(m.PARTICIPACAO_ID||'')]||{};
      const sid=String(m.CONJUNTO_ID||p.CONJUNTO_ID||'');
      const set=sBy[sid]||{};
      const did=String(set.MOTORISTA_ID||p.MOTORISTA_ID||'');
      const driver=dBy[did]||{};
      const key=did||String(driver.NOME_COMPLETO||'MOTORISTA_NAO_IDENTIFICADO');
      if(!driverMap[key])driverMap[key]={motoristaId:did,nome:String(driver.NOME_COMPLETO||did||'Motorista não identificado'),toneladas:0,viagens:0};
      driverMap[key].toneladas+=FT_CENTRO_num_(m.TONELADAS);
      driverMap[key].viagens+=FT_CENTRO_num_(m.QUANTIDADE_VIAGENS || (String(m.VIAGEM_CONCLUIDA||'').toUpperCase()==='SIM'?1:0));
    });
    const opDestinations=destinations.filter(d=>String(d.OPERACAO_ID||'')===id).map(d=>{
      const destId=String(d.ID||'');
      const delivered=operationMoves.filter(m=>String(m.ID_DESTINO||'')===destId).reduce((n,m)=>n+FT_CENTRO_num_(m.TONELADAS),0);
      const destPlanned=FT_CENTRO_num_(d.VOLUME_PREVISTO_TONELADAS);
      return {id:destId,ordem:FT_CENTRO_num_(d.ORDEM_ENTREGA),cliente:String(d.CLIENTE_DESTINO||''),local:String(d.LOCAL_ENTREGA||''),cidadeUf:String(d.CIDADE_UF||''),previsto:destPlanned,carregado:delivered,falta:Math.max(0,destPlanned-delivered),excedente:Math.max(0,delivered-destPlanned),percentual:destPlanned>0?Math.min(100,delivered/destPlanned*100):0,status:String(d.STATUS||'')};
    });
    return {id,nome:String(o.NOME_OPERACAO||''),cliente:String(o.CLIENTE||''),status:String(o.STATUS||''),data:String(o.DATA_OPERACAO||''),origem:String(o.ORIGEM||''),destino:String(o.DESTINO||''),distanciaKm:FT_CENTRO_num_(o.DISTANCIA_KM),produto:String(o.PRODUTO_SERVICO||o.PRODUTO||''),volumeTotal:planned,toneladasMovimentadas:moved,saldo:remaining,excedente:overrun,percentualCarregado:progress.percentual,viagensPrevistas:FT_CENTRO_num_(o.TOTAL_VIAGENS_PREVISTAS),viagensRealizadas:trips,conjuntos:related.map(p=>{
      const sid=String(p.CONJUNTO_ID||''),s=sBy[sid]||{},did=String(s.MOTORISTA_ID||p.MOTORISTA_ID||''),h=hBy[String(s.CAVALO_ID||'')]||{},t1=tBy[String(s.CARRETA_MEIO_ID||'')]||{},t2=tBy[String(s.CARRETA_FINAL_ID||'')]||{};
      const trailerTare=FT_CENTRO_num_(t1.TARA_TONELADAS)+FT_CENTRO_num_(t2.TARA_TONELADAS);
      const trailerCap=FT_CENTRO_num_(t1.CAPACIDADE_CARGA_TONELADAS)+FT_CENTRO_num_(t2.CAPACIDADE_CARGA_TONELADAS);
      return {participacaoId:String(p.ID||''),conjuntoId:sid,motorista:dBy[did]?.NOME_COMPLETO||did,cavaloPlaca:String(h.PLACA||''),carretaMeio:String(t1.PLACA||''),carretaFinal:String(t2.PLACA||''),carretasTara:trailerTare,carretasCapacidade:trailerCap,taraTotal:FT_CENTRO_num_(h.TARA_TONELADAS)+trailerTare,capacidadeUtil:FT_CENTRO_num_(s.CAPACIDADE_UTIL_TONELADAS),toneladasCarregadas:FT_CENTRO_num_(p.TONELADAS_MOVIMENTADAS),status:String(p.STATUS_PARTICIPACAO||''),saida:String(p.SAIDA_EM||''),retorno:String(p.RETORNO_EM||'')};
    }),motoristas:Object.values(driverMap).sort((a,b)=>b.toneladas-a.toneladas),destinos:opDestinations};
  }).sort((a,b)=>{
    const ta=new Date(a.data||0).getTime(),tb=new Date(b.data||0).getTime();
    return (isFinite(tb)?tb:0)-(isFinite(ta)?ta:0);
  });
  const totalTon=currentOps.reduce((n,o)=>n+o.toneladasMovimentadas,0);
  return {user:session,atualizadoEm:new Date().toISOString(),indicadores:{operacoesAtuais:currentOps.filter(o=>['ABERTA','EM_ANDAMENTO','EM_EXECUCAO','EM TRANSPORTE'].includes(o.status.toUpperCase())).length,conjuntosEmOperacao:currentOps.reduce((n,o)=>n+o.conjuntos.length,0),viagensPendentes:currentOps.reduce((n,o)=>n+Math.max(0,o.viagensPrevistas-o.viagensRealizadas),0),toneladasMovimentadas:totalTon,volumePrevisto:currentOps.reduce((n,o)=>n+o.volumeTotal,0),volumeRestante:currentOps.reduce((n,o)=>n+o.saldo,0)},operacoes:currentOps};
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


/** Início administrativo auditável da operação. */
function iniciarOperacaoFullTime(token, operacaoId) {
  const session = obterSessao_(token); exigirAdmin_(session);
  operacaoId = String(operacaoId || '').trim();
  if (!operacaoId) throw new Error('Selecione uma operação.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = getSheet_('OPERACOES');
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    const map = {}; headers.forEach((h,i)=>{const k=FT_CENTRO_norm_(h);if(k&&map[k]===undefined)map[k]=i;});
    ['ID','STATUS'].forEach(k=>{if(map[k]===undefined)throw new Error('Coluna obrigatória ausente em OPERACOES: '+k);});
    const rows = sh.getDataRange().getValues();
    let row = -1;
    for(let i=1;i<rows.length;i++) if(String(rows[i][map.ID]||'')===operacaoId){row=i+1;break;}
    if(row<2) throw new Error('Operação não encontrada.');
    const status=String(sh.getRange(row,map.STATUS+1).getValue()||'').trim().toUpperCase();
    if(status!=='ABERTA') throw new Error('Somente operações ABERTAS podem ser iniciadas. Status atual: '+status);
    sh.getRange(row,map.STATUS+1).setValue('EM_ANDAMENTO');
    if(map.INICIADA_EM!==undefined) sh.getRange(row,map.INICIADA_EM+1).setValue(new Date());
    if(typeof auditar_==='function') auditar_(session,'INICIAR_OPERACAO','OPERACAO',operacaoId,'ABERTA -> EM_ANDAMENTO');
    return {ok:true,message:'Operação iniciada e registrada no histórico.'};
  } finally { lock.releaseLock(); }
}

/** Encerramento administrativo: exige viagens previstas cumpridas e nenhuma participação pendente/ativa. */
function confirmarConclusaoOperacaoFullTime(token, operacaoId, justificativa) {
  const session = obterSessao_(token); exigirAdmin_(session);
  operacaoId = String(operacaoId || '').trim();
  justificativa = String(justificativa || '').trim().slice(0,500);
  if (!operacaoId) throw new Error('Selecione uma operação.');
  if (!justificativa) throw new Error('Informe a confirmação/justificativa do encerramento.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = getSheet_('OPERACOES');
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    const map = {}; headers.forEach((h,i)=>{const k=FT_CENTRO_norm_(h);if(k&&map[k]===undefined)map[k]=i;});
    ['ID','STATUS','TOTAL_VIAGENS_PREVISTAS'].forEach(k=>{if(map[k]===undefined)throw new Error('Coluna obrigatória ausente em OPERACOES: '+k);});
    const rows = sh.getDataRange().getValues();
    let row = -1, record = null;
    for(let i=1;i<rows.length;i++) if(String(rows[i][map.ID]||'')===operacaoId){row=i+1;record=rows[i];break;}
    if(row<2) throw new Error('Operação não encontrada.');
    const status=String(record[map.STATUS]||'').trim().toUpperCase();
    if(!['EM_ANDAMENTO','ABERTA'].includes(status)) throw new Error('A operação não pode ser encerrada no status '+status+'.');
    const parts = FT_CENTRO_rows_('PARTICIPACAO_OPERACOES');
    const active = parts.filter(p=>String(p.OPERACAO_ID||'')===operacaoId && ['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(p.STATUS_PARTICIPACAO||'').toUpperCase()));
    if(active.length) throw new Error('Ainda existem '+active.length+' participação(ões) pendente(s) ou ativa(s). Resolva as convocações antes de encerrar.');
    const center = obterCentroOperacoesFullTime(token);
    const op = (center.operacoes||[]).find(o=>String(o.id)===operacaoId);
    if(!op) throw new Error('Não foi possível conferir os indicadores da operação.');
    if(op.viagensRealizadas < op.viagensPrevistas) throw new Error('Viagens realizadas ('+op.viagensRealizadas+') abaixo das previstas ('+op.viagensPrevistas+'). Confira as movimentações antes do encerramento.');
    sh.getRange(row,map.STATUS+1).setValue('CONCLUIDA');
    if(map.CONCLUIDA_EM!==undefined) sh.getRange(row,map.CONCLUIDA_EM+1).setValue(new Date());
    if(typeof auditar_==='function') auditar_(session,'ENCERRAR_OPERACAO','OPERACAO',operacaoId,justificativa+' | carregado='+op.toneladasMovimentadas+' t | saldo residual='+op.saldo+' t');
    return {ok:true,message:'Operação encerrada. O volume carregado e eventual saldo residual permanecem registrados.'};
  } finally { lock.releaseLock(); }
}
