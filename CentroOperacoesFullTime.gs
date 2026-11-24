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
    const remaining=Math.max(0,planned-moved);
    const overrun=Math.max(0,moved-planned);
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
      return {id:destId,cliente:String(d.CLIENTE_DESTINO||''),local:String(d.LOCAL_ENTREGA||''),previsto:destPlanned,carregado:delivered,falta:Math.max(0,destPlanned-delivered),excedente:Math.max(0,delivered-destPlanned),status:String(d.STATUS||'')};
    });
    return {id,nome:String(o.NOME_OPERACAO||''),cliente:String(o.CLIENTE||''),status:String(o.STATUS||''),data:String(o.DATA_OPERACAO||''),origem:String(o.ORIGEM||''),destino:String(o.DESTINO||''),distanciaKm:FT_CENTRO_num_(o.DISTANCIA_KM),produto:String(o.PRODUTO_SERVICO||o.PRODUTO||''),volumeTotal:planned,toneladasMovimentadas:moved,saldo:remaining,excedente:overrun,percentualCarregado:planned>0?Math.min(100,moved/planned*100):0,viagensPrevistas:FT_CENTRO_num_(o.TOTAL_VIAGENS_PREVISTAS),viagensRealizadas:trips,conjuntos:related.map(p=>{
      const sid=String(p.CONJUNTO_ID||''),s=sBy[sid]||{},did=String(s.MOTORISTA_ID||p.MOTORISTA_ID||''),h=hBy[String(s.CAVALO_ID||'')]||{},t1=tBy[String(s.CARRETA_MEIO_ID||'')]||{},t2=tBy[String(s.CARRETA_FINAL_ID||'')]||{};
      const trailerTare=FT_CENTRO_num_(t1.TARA_TONELADAS)+FT_CENTRO_num_(t2.TARA_TONELADAS);
      const trailerCap=FT_CENTRO_num_(t1.CAPACIDADE_CARGA_TONELADAS)+FT_CENTRO_num_(t2.CAPACIDADE_CARGA_TONELADAS);
      return {participacaoId:String(p.ID||''),conjuntoId:sid,motorista:dBy[did]?.NOME_COMPLETO||did,cavaloPlaca:String(h.PLACA||''),carretaMeio:String(t1.PLACA||''),carretaFinal:String(t2.PLACA||''),carretasTara:trailerTare,carretasCapacidade:trailerCap,taraTotal:FT_CENTRO_num_(h.TARA_TONELADAS)+trailerTare,capacidadeUtil:FT_CENTRO_num_(s.CAPACIDADE_UTIL_TONELADAS),toneladasCarregadas:FT_CENTRO_num_(p.TONELADAS_MOVIMENTADAS),status:String(p.STATUS_PARTICIPACAO||''),saida:String(p.SAIDA_EM||''),retorno:String(p.RETORNO_EM||'')};
    }),motoristas:Object.values(driverMap).sort((a,b)=>b.toneladas-a.toneladas),destinos:opDestinations};
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
