function registrarMovimentacaoOperacaoFullTime(token, data) {
  const session=obterSessao_(token); exigirAdmin_(session); data=data||{};
  const operacaoId=texto_(data.operacaoId,100), conjuntoId=texto_(data.conjuntoId,100);
  const toneladas=Number(String(data.toneladas||'').replace(',','.'));
  const viagens=Math.floor(Number(data.viagens||0));
  const observacoes=texto_(data.observacoes,1000);
  if(!operacaoId||!conjuntoId) throw new Error('Selecione a operação e o conjunto.');
  if(!(toneladas>0&&isFinite(toneladas))) throw new Error('Informe as toneladas efetivamente movimentadas.');
  if(!(viagens>0&&viagens<=10000)) throw new Error('Informe a quantidade de viagens concluídas nesta movimentação.');
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const ops=getSheet_('OPERACOES'), rows=ops.getDataRange().getValues(), idx=rows.findIndex((r,i)=>i>0&&String(r[0])===operacaoId);
    if(idx<1) throw new Error('Operação não encontrada.');
    const op=rows[idx], status=String(op[2]||'');
    if(!['ABERTA','EM_ANDAMENTO'].includes(status)) throw new Error('A operação não está aberta para movimentação.');
    const saldo=Number(op[11]||0);
    if(toneladas>saldo+0.000001) throw new Error('A movimentação excede o saldo restante de '+saldo+' t.');
    const sets=[['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR']].concat(listarRegistros_('CONJUNTOS').map(r=>[r.id,r.criado,r.status].concat(r.campos||[])));
    const setRow=sets.find((r,i)=>i>0&&String(r[0])===conjuntoId);
    if(!setRow||String(setRow[2])!=='ATIVO') throw new Error('O conjunto não está ativo.');
    const cond=String(setRow[8]||'APTO').toUpperCase();
    if(cond!=='APTO') throw new Error('O conjunto não está marcado como APTO. Conjuntos com restrição exigem validação explícita antes de movimentar cargas.');
    const parts=getSheet_('PARTICIPACAO_OPERACOES'), pRows=parts.getDataRange().getValues();
    const part=pRows.find((r,i)=>i>0&&String(r[2])===operacaoId&&String(r[3])===conjuntoId&&String(r[5])==='ATIVO');
    if(!part) throw new Error('O conjunto precisa estar previamente designado e ativo nesta operação antes de registrar movimentações.');
    const partId=String(part[0]);
    const moveId=Utilities.getUuid();
    const movimentos=getSheet_('MOVIMENTACOES_OPERACAO');
    if(movimentos.getLastColumn()<10 || ops.getLastColumn()<16) throw new Error('As colunas de controle de viagens ainda não foram preparadas. Execute prepararBaseOperacionalFullTime().');
    movimentos.appendRow([moveId,new Date(),operacaoId,partId,conjuntoId,toneladas,'SIM',observacoes,session.login,viagens]);
    const novoSaldo=Math.max(0,saldo-toneladas);
    // Atingir saldo zero não encerra a operação: o administrador confirma após conferir viagens e retornos.
    ops.getRange(idx+1,3).setValue('EM_ANDAMENTO');
    ops.getRange(idx+1,12).setValue(novoSaldo);
    const pIndex=pRows.findIndex((r,i)=>i>0&&String(r[0])===partId);
    const partRowIndex=pIndex>=1?pIndex+1:parts.getLastRow();
    parts.getRange(partRowIndex,10).setValue(Number(parts.getRange(partRowIndex,10).getValue()||0)+toneladas);
    parts.getRange(partRowIndex,11).setValue(Number(parts.getRange(partRowIndex,11).getValue()||0)+viagens);
    const operationMap=ftOperationHeaderMap_(ops);
    const tripsCol=operationMap.VIAGENS_REALIZADAS;
    if(tripsCol===undefined) throw new Error('A guia OPERACOES não possui coluna de viagens realizadas/concluídas.');
    const totalTrips=Math.max(0,Math.floor(Number(op[tripsCol]||0)))+viagens;
    ops.getRange(idx+1,tripsCol+1).setValue(totalTrips);
    auditar_(session,'REGISTRAR_MOVIMENTACAO','OPERACAO',operacaoId,toneladas+' t; '+viagens+' viagem(ns); conjunto '+conjuntoId+'; saldo '+novoSaldo+' t');
    return {ok:true,saldoRestante:novoSaldo,viagensRealizadas:totalTrips,status:'EM_ANDAMENTO',sugestaoConclusao:novoSaldo<=0.000001,message:'Movimentação registrada: '+viagens+' viagem(ns). Saldo restante: '+novoSaldo+' t.'+(novoSaldo<=0.000001?' A operação permanece EM ANDAMENTO até a conferência e confirmação administrativa.':'')};
  } finally { lock.releaseLock(); }
}
function remanejarConjuntoOperacaoFullTime(token, data) {