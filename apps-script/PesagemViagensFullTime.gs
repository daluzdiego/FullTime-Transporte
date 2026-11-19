/**
 * FULL TIME — PESAGENS E CONFERÊNCIA DE VIAGENS
 * Módulo aditivo para homologação. Não altera TICKETS nem sobrescreve comprovantes.
 * A guia PESAGENS_VIAGEM mantém um registro por etapa e histórico de correções.
 *
 * Etapas: CARREGAMENTO e DESCARGA.
 * Unidade de armazenamento: kg. Exibição pode converter para toneladas.
 * Aprovação sempre administrativa; tolerância de 10% gera sinalização, não aprovação automática.
 */
const FT_PESAGEM_HEADERS_ = Object.freeze([
  'ID','CRIADO_EM','VIAGEM_ID','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID',
  'ETAPA','DATA_HORA_PESAGEM','TARA_KG','BRUTO_KG','LIQUIDO_KG','TICKET_ID','DRIVE_FILE_ID',
  'HASH_ARQUIVO','STATUS_REGISTRO','STATUS_CONFERENCIA','DIVERGENCIA_KG','DIVERGENCIA_PERCENTUAL',
  'EXCESSO_CAPACIDADE','JUSTIFICATIVA_EXCESSO','APROVADO_POR','APROVADO_EM',
  'SUBSTITUI_PESAGEM_ID','MOTIVO_CORRECAO','JUSTIFICATIVA_CONFERENCIA','REGISTRADO_POR'
]);

function FT_PESAGEM_map_(sh) {
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const map={};
  headers.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&!Object.prototype.hasOwnProperty.call(map,k))map[k]=i;});
  return map;
}

function FT_PESAGEM_getSheet_() {
  const ss=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID'));
  if(!ss)throw new Error('Base operacional não configurada.');
  let sh=ss.getSheetByName('PESAGENS_VIAGEM');
  if(!sh)sh=ss.insertSheet('PESAGENS_VIAGEM');
  if(sh.getLastRow()===0||sh.getLastColumn()===0){
    sh.getRange(1,1,1,FT_PESAGEM_HEADERS_.length).setValues([FT_PESAGEM_HEADERS_]);
    sh.setFrozenRows(1);
  } else {
    const map=FT_PESAGEM_map_(sh);
    const missing=FT_PESAGEM_HEADERS_.filter(h=>map[h]===undefined);
    if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  }
  return sh;
}

function FT_PESAGEM_num_(v) {
  if(typeof v==='number')return isFinite(v)?v:NaN;
  let s=String(v==null?'':v).trim().replace(/\s/g,'');
  if(!s)return NaN;
  // Aceita formatos brasileiros (31.120,5) e decimais com ponto (31120.5).
  if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(','))s=s.replace(',','.');
  const n=Number(s);return isFinite(n)?n:NaN;
}

function FT_PESAGEM_requireAdmin_(token) {
  const session=obterSessao_(token);exigirAdmin_(session);return session;
}

/** Preparação aditiva da guia de pesagens. Não limpa nem altera registros existentes. */
function FT_PESAGEM_prepararCapacidades_() {
  const sh=getSheet_('CONJUNTOS');
  const map=FT_PESAGEM_map_(sh);
  const required=['CAPACIDADE_LEGAL_TONELADAS','CAPACIDADE_OPERACIONAL_TONELADAS','CAPACIDADE_VALIDADA_EM','CAPACIDADE_VALIDADA_POR'];
  const missing=required.filter(k=>map[k]===undefined);
  if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  return FT_PESAGEM_map_(sh);
}
function prepararGuiaPesagensFullTime(token) {
  FT_PESAGEM_requireAdmin_(token);
  const sh=FT_PESAGEM_getSheet_();
  FT_PESAGEM_prepararCapacidades_();
  return {ok:true,guia:sh.getName(),cabecalhos:FT_PESAGEM_HEADERS_.length,registros:Math.max(0,sh.getLastRow()-1),guiaCapacidades:'CONJUNTOS',modo:'ADITIVO_SEM_LIMPEZA'};
}

/** Retorna o vínculo da viagem e impede pesagem em viagem inexistente. */
function FT_PESAGEM_viagem_(viagemId) {
  const sh=getSheet_('VIAGENS'),grid=sh.getDataRange().getValues(),map=FT_PESAGEM_map_(sh);
  ['ID','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','STATUS'].forEach(k=>{
    if(map[k]===undefined)throw new Error('Cabeçalho obrigatório ausente em VIAGENS: '+k);
  });
  const row=grid.slice(1).find(r=>String(r[map.ID]||'')===String(viagemId));
  if(!row)throw new Error('Viagem não encontrada. Crie ou selecione uma viagem antes de registrar a pesagem.');
  return {row,map,operacaoId:String(row[map.OPERACAO_ID]||''),participacaoId:String(row[map.PARTICIPACAO_ID]||''),
    motoristaId:String(row[map.MOTORISTA_ID]||''),conjuntoId:String(row[map.CONJUNTO_ID]||'')};
}

function FT_PESAGEM_comparar_(sh, viagemId) {
  const map=FT_PESAGEM_map_(sh),rows=sh.getDataRange().getValues().slice(1);
  const active=rows.filter(r=>String(r[map.VIAGEM_ID]||'')===String(viagemId)&&String(r[map.STATUS_REGISTRO]||'ATIVO').toUpperCase()==='ATIVO');
  const load=active.filter(r=>String(r[map.ETAPA]||'').toUpperCase()==='CARREGAMENTO').slice(-1)[0];
  const unload=active.filter(r=>String(r[map.ETAPA]||'').toUpperCase()==='DESCARGA').slice(-1)[0];
  if(!load||!unload)return {completa:false,aguardando:!load?'CARREGAMENTO':'DESCARGA'};
  const kgLoad=Number(load[map.LIQUIDO_KG]),kgUnload=Number(unload[map.LIQUIDO_KG]);
  const diff=Math.abs(kgLoad-kgUnload),pct=kgLoad>0?diff/kgLoad*100:100;
  const within=pct<=10;
  [load,unload].forEach(r=>{
    const rowId=String(r[map.ID]||'');
    const ix=rows.findIndex(x=>String(x[map.ID]||'')===rowId);
    if(ix>=0){
      sh.getRange(ix+2,map.DIVERGENCIA_KG+1).setValue(diff);
      sh.getRange(ix+2,map.DIVERGENCIA_PERCENTUAL+1).setValue(pct);
      sh.getRange(ix+2,map.STATUS_CONFERENCIA+1).setValue(within?'AGUARDANDO_APROVACAO':'DIVERGENCIA_ACIMA_10');
    }
  });
  return {completa:true,pesoLiquidoCarregamentoKg:kgLoad,pesoLiquidoDescargaKg:kgUnload,
    diferencaKg:diff,diferencaPercentual:pct,toleranciaPercentual:10,dentroTolerancia:within,
    status:within?'AGUARDANDO_APROVACAO':'DIVERGENCIA_ACIMA_10'};
}

/**
 * Registra a leitura conferida de um ticket. O arquivo original permanece em TICKETS/Drive.
 * Correções geram novo registro e preservam o anterior como SUBSTITUIDO.
 */
function registrarPesagemViagemFullTime(token,data) {
  const session=FT_PESAGEM_requireAdmin_(token);data=data||{};
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try {
  const viagemId=String(data.viagemId||'').trim(),etapa=String(data.etapa||'').trim().toUpperCase();
  const tara=FT_PESAGEM_num_(data.taraKg),bruto=FT_PESAGEM_num_(data.brutoKg);
  const ticketId=String(data.ticketId||'').trim(),motivoCorrecao=String(data.motivoCorrecao||'').trim();
  if(!viagemId||!['CARREGAMENTO','DESCARGA'].includes(etapa))throw new Error('Informe a viagem e a etapa CARREGAMENTO ou DESCARGA.');
  if(!(tara>=0&&bruto>tara))throw new Error('Pesos inválidos: o bruto deve ser maior que a tara e ambos devem estar em kg.');
  const link=FT_PESAGEM_viagem_(viagemId),sh=FT_PESAGEM_getSheet_(),map=FT_PESAGEM_map_(sh);
  if(!ticketId)throw new Error('Vincule o ticket original recebido antes de registrar a pesagem.');
  const tickets=getSheet_('TICKETS'),tm=FT_PESAGEM_map_(tickets),ticketRows=tickets.getDataRange().getValues();
  if(tm.ID===undefined||tm.DRIVE_FILE_ID===undefined)throw new Error('A guia TICKETS não possui os campos ID e DRIVE_FILE_ID.');
  const ticketIndex=ticketRows.findIndex((r,i)=>i>0&&String(r[tm.ID]||'')===ticketId);
  if(ticketIndex<1)throw new Error('Ticket de origem não encontrado na guia TICKETS.');
  const ticket=ticketRows[ticketIndex],fileId=String(ticket[tm.DRIVE_FILE_ID]||'');
  if(!fileId)throw new Error('O ticket ainda não possui arquivo original armazenado. Não é possível validar uma pesagem sem comprovante.');
  const linkedTrip=tm.VIAGEM_ID===undefined?'':String(ticket[tm.VIAGEM_ID]||'');
  if(linkedTrip&&linkedTrip!==viagemId)throw new Error('Este ticket já está vinculado a outra viagem.');
  const inferred=String(ticket[tm.TIPO_TICKET]||'').trim().toUpperCase();
  const ticketStage=({CARREGAMENTO:'CARREGAMENTO',ORIGEM:'CARREGAMENTO',DESCARGA:'DESCARGA',DESTINO:'DESCARGA'})[inferred]||'';
  if(!ticketStage)throw new Error('O ticket precisa estar classificado como CARREGAMENTO/ORIGEM ou DESCARGA/DESTINO antes do registro.');
  if(ticketStage!==etapa)throw new Error('O tipo do ticket ('+inferred+') não corresponde à etapa informada ('+etapa+').');
  try { DriveApp.getFileById(fileId).getId(); } catch(e) { throw new Error('O arquivo original do ticket não está acessível no Drive: '+e.message); }
  const liquid=bruto-tara,now=new Date(),grid=sh.getDataRange().getValues();
  const setSheet=getSheet_('CONJUNTOS'),setMap=FT_PESAGEM_map_(setSheet),setRows=setSheet.getDataRange().getValues();
  const setRow=setRows.slice(1).find(r=>String(r[setMap.ID]||'')===link.conjuntoId);
  const legalCap=setRow&&setMap.CAPACIDADE_LEGAL_TONELADAS!==undefined?FT_PESAGEM_num_(setRow[setMap.CAPACIDADE_LEGAL_TONELADAS]):NaN;
  const operationalCap=setRow&&setMap.CAPACIDADE_OPERACIONAL_TONELADAS!==undefined?FT_PESAGEM_num_(setRow[setMap.CAPACIDADE_OPERACIONAL_TONELADAS]):NaN;
  const liquidTon=liquid/1000;
  const capacityConfigured=legalCap>0&&operationalCap>0;
  const capacityExceeded=capacityConfigured&&(liquidTon>legalCap||liquidTon>operationalCap);
  const capacityReason=String(data.justificativaExcesso||'').trim();
  if(capacityExceeded&&!capacityReason)throw new Error('ALERTA DE CAPACIDADE: carga de '+liquidTon.toFixed(3)+' t excede limite legal ('+legalCap+') ou operacional ('+operationalCap+') do conjunto. Informe justificativa para continuar.');

  const previous=grid.slice(1).filter(r=>String(r[map.VIAGEM_ID]||'')===viagemId&&String(r[map.ETAPA]||'').toUpperCase()===etapa&&String(r[map.STATUS_REGISTRO]||'ATIVO').toUpperCase()==='ATIVO');
  if(previous.length&&!motivoCorrecao)throw new Error('Já existe pesagem ativa nesta etapa. Informe o motivo para registrar uma correção; o histórico será preservado.');
  const supersedes=previous.length?String(previous[previous.length-1][map.ID]||''):'';
  if(previous.length){
    const oldIndex=grid.findIndex((r,i)=>i>0&&String(r[map.ID]||'')===supersedes);
    sh.getRange(oldIndex+1,map.STATUS_REGISTRO+1).setValue('SUBSTITUIDO');
    sh.getRange(oldIndex+1,map.MOTIVO_CORRECAO+1).setValue(motivoCorrecao);
  }
  const id=Utilities.getUuid(),row=new Array(sh.getLastColumn()).fill('');
  const fields={ID:id,CRIADO_EM:now,VIAGEM_ID:viagemId,OPERACAO_ID:link.operacaoId,PARTICIPACAO_ID:link.participacaoId,
    MOTORISTA_ID:link.motoristaId,CONJUNTO_ID:link.conjuntoId,ETAPA:etapa,DATA_HORA_PESAGEM:data.dataHoraPesagem?new Date(data.dataHoraPesagem):now,
    TARA_KG:tara,BRUTO_KG:bruto,LIQUIDO_KG:liquid,TICKET_ID:ticketId,DRIVE_FILE_ID:fileId,
    HASH_ARQUIVO:String(data.hashArquivo||''),STATUS_REGISTRO:'ATIVO',STATUS_CONFERENCIA:'AGUARDANDO_SEGUNDA_PESAGEM',
    EXCESSO_CAPACIDADE:!capacityConfigured?'CAPACIDADE_NAO_CONFIGURADA':capacityExceeded?'SIM':'NAO',
    JUSTIFICATIVA_EXCESSO:capacityReason,APROVADO_POR:'',APROVADO_EM:'',
    SUBSTITUI_PESAGEM_ID:supersedes,MOTIVO_CORRECAO:motivoCorrecao,REGISTRADO_POR:session.email||session.login};
  Object.keys(fields).forEach(k=>{if(map[k]!==undefined)row[map[k]]=fields[k];});
  sh.appendRow(row);
  if(tm.VIAGEM_ID!==undefined)tickets.getRange(ticketIndex+1,tm.VIAGEM_ID+1).setValue(viagemId);
  if(tm.STATUS_LEITURA!==undefined)tickets.getRange(ticketIndex+1,tm.STATUS_LEITURA+1).setValue('PESAGEM_REGISTRADA');
  const comparison=FT_PESAGEM_comparar_(sh,viagemId);
  return {ok:true,pesagemId:id,pesoLiquidoKg:liquid,pesoLiquidoToneladas:liquid/1000,
    capacidade:{configurada:capacityConfigured,excedida:capacityExceeded,limiteLegalToneladas:isFinite(legalCap)?legalCap:null,
      limiteOperacionalToneladas:isFinite(operationalCap)?operationalCap:null,justificativa:capacityReason},
    comparacao:comparison,
    message:comparison.completa?(comparison.dentroTolerancia?'Duas pesagens registradas. Aguardando aprovação administrativa.':'Divergência superior a 10%. Bruno deve analisar e decidir.'):'Pesagem registrada. Aguardando o ticket da outra etapa.'};
  } finally { lock.releaseLock(); }
}

/** Aprovação administrativa após as duas pesagens; divergência >10% exige justificativa. */
function aprovarConferenciaPesagemViagemFullTime(token,viagemId,justificativa) {
  const session=FT_PESAGEM_requireAdmin_(token);viagemId=String(viagemId||'').trim();justificativa=String(justificativa||'').trim();
  if(!viagemId)throw new Error('Informe a viagem.');
  const sh=FT_PESAGEM_getSheet_(),comparison=FT_PESAGEM_comparar_(sh,viagemId);
  if(!comparison.completa)throw new Error('A viagem precisa ter os tickets de carregamento e descarga antes da aprovação.');
  if(!comparison.dentroTolerancia&&!justificativa)throw new Error('A divergência ultrapassa 10%. Registre a justificativa administrativa para decidir.');
  const map=FT_PESAGEM_map_(sh),grid=sh.getDataRange().getValues();
  const activeRows=grid.slice(1).filter(r=>String(r[map.VIAGEM_ID]||'')===viagemId&&String(r[map.STATUS_REGISTRO]||'ATIVO').toUpperCase()==='ATIVO');
  const byStage={CARREGAMENTO:activeRows.filter(r=>String(r[map.ETAPA]||'').toUpperCase()==='CARREGAMENTO'),
    DESCARGA:activeRows.filter(r=>String(r[map.ETAPA]||'').toUpperCase()==='DESCARGA')};
  if(byStage.CARREGAMENTO.length!==1||byStage.DESCARGA.length!==1)throw new Error('A aprovação exige exatamente uma pesagem ativa de carregamento e uma de descarga.');
  if(activeRows.some(r=>String(r[map.EXCESSO_CAPACIDADE]||'')==='CAPACIDADE_NAO_CONFIGURADA'))throw new Error('Capacidade legal e operacional do conjunto ainda não foi configurada. A aprovação está bloqueada.');
  if(activeRows.some(r=>String(r[map.EXCESSO_CAPACIDADE]||'')==='SIM'&&!String(r[map.JUSTIFICATIVA_EXCESSO]||'').trim())&&!justificativa)throw new Error('Existe excesso de capacidade sem justificativa administrativa.');

  grid.slice(1).forEach((r,i)=>{
    if(String(r[map.VIAGEM_ID]||'')!==viagemId||String(r[map.STATUS_REGISTRO]||'ATIVO').toUpperCase()!=='ATIVO')return;
    sh.getRange(i+2,map.STATUS_CONFERENCIA+1).setValue(comparison.dentroTolerancia?'APROVADA':'APROVADA_COM_DIVERGENCIA');
    sh.getRange(i+2,map.APROVADO_POR+1).setValue(session.email||session.login);
    sh.getRange(i+2,map.APROVADO_EM+1).setValue(new Date());
    if(justificativa&&map.JUSTIFICATIVA_CONFERENCIA!==undefined)sh.getRange(i+2,map.JUSTIFICATIVA_CONFERENCIA+1).setValue(justificativa);
  });
  return {ok:true,viagemId,comparacao:comparison,status:comparison.dentroTolerancia?'APROVADA':'APROVADA_COM_DIVERGENCIA',
    message:'Conferência aprovada e auditada. A viagem ainda depende da conclusão pelo fluxo operacional.'};
}

/** Conclui uma viagem somente após dois tickets vinculados e conferência aprovada. */
function concluirViagemComPesagensFullTime(token,viagemId,observacoes) {
  const session=FT_PESAGEM_requireAdmin_(token);
  viagemId=String(viagemId||'').trim();
  observacoes=String(observacoes||'').trim();
  if(!viagemId)throw new Error('Informe a viagem.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const tripSh=getSheet_('VIAGENS'),tripMap=FT_PESAGEM_map_(tripSh),tripGrid=tripSh.getDataRange().getValues();
    ['ID','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','STATUS','PESO_REAL_TONELADAS','FIM_REAL','ATUALIZADA_EM','ATUALIZADA_POR'].forEach(k=>{
      if(tripMap[k]===undefined)throw new Error('Cabeçalho obrigatório ausente em VIAGENS: '+k);
    });
    const tripIndex=tripGrid.findIndex((r,i)=>i>0&&String(r[tripMap.ID]||'')===viagemId);
    if(tripIndex<1)throw new Error('Viagem não encontrada.');
    const trip=tripGrid[tripIndex],tripStatus=String(trip[tripMap.STATUS]||'').toUpperCase();
    if(['CONCLUIDA','CONCLUÍDA','FINALIZADA','CANCELADA','CANCELADA_ADMIN'].includes(tripStatus))throw new Error('A viagem já está concluída ou cancelada.');
    const pesSh=FT_PESAGEM_getSheet_(),pesMap=FT_PESAGEM_map_(pesSh),pesGrid=pesSh.getDataRange().getValues();
    const active=pesGrid.slice(1).filter(r=>String(r[pesMap.VIAGEM_ID]||'')===viagemId&&String(r[pesMap.STATUS_REGISTRO]||'ATIVO').toUpperCase()==='ATIVO');
    const load=active.filter(r=>String(r[pesMap.ETAPA]||'').toUpperCase()==='CARREGAMENTO');
    const unload=active.filter(r=>String(r[pesMap.ETAPA]||'').toUpperCase()==='DESCARGA');
    if(load.length!==1||unload.length!==1)throw new Error('A conclusão exige exatamente um ticket de carregamento e um de descarga ativos.');
    if(!['APROVADA','APROVADA_COM_DIVERGENCIA'].includes(String(load[0][pesMap.STATUS_CONFERENCIA]||'').toUpperCase())||
       !['APROVADA','APROVADA_COM_DIVERGENCIA'].includes(String(unload[0][pesMap.STATUS_CONFERENCIA]||'').toUpperCase())) {
      throw new Error('A conferência administrativa dos dois tickets ainda não foi aprovada.');
    }
    const ticketIds=[String(load[0][pesMap.TICKET_ID]||''),String(unload[0][pesMap.TICKET_ID]||'')];
    if(!ticketIds[0]||!ticketIds[1]||ticketIds[0]===ticketIds[1])throw new Error('Os dois tickets precisam ser distintos e estar vinculados às pesagens.');
    const tickets=getSheet_('TICKETS'),ticketMap=FT_PESAGEM_map_(tickets),ticketGrid=tickets.getDataRange().getValues();
    ticketIds.forEach(id=>{
      const tr=ticketGrid.find((r,i)=>i>0&&String(r[ticketMap.ID]||'')===id);
      if(!tr||String(tr[ticketMap.VIAGEM_ID]||'')!==viagemId||!String(tr[ticketMap.DRIVE_FILE_ID]||''))throw new Error('Um dos tickets não está vinculado à viagem ou perdeu o comprovante original.');
    });
    const realTon=Number(unload[0][pesMap.LIQUIDO_KG])/1000;
    if(!(realTon>0&&isFinite(realTon)))throw new Error('Peso líquido de descarga inválido.');
    const opSh=getSheet_('OPERACOES'),opMap=FT_PESAGEM_map_(opSh),opGrid=opSh.getDataRange().getValues();
    const opIndex=opGrid.findIndex((r,i)=>i>0&&String(r[opMap.ID]||'')===String(trip[tripMap.OPERACAO_ID]||''));
    if(opIndex<1)throw new Error('Operação vinculada à viagem não encontrada.');
    const op=opGrid[opIndex],saldo=Number(op[opMap.SALDO_TONELADAS]||0);
    if(!['ABERTA','EM_ANDAMENTO'].includes(String(op[opMap.STATUS]||'').toUpperCase()))throw new Error('A operação não está aberta para receber a conclusão.');
    if(realTon>saldo+0.000001)throw new Error('O peso líquido da descarga excede o saldo da operação.');
    const partSh=getSheet_('PARTICIPACAO_OPERACOES'),partMap=FT_PESAGEM_map_(partSh),partGrid=partSh.getDataRange().getValues();
    const partIndex=partGrid.findIndex((r,i)=>i>0&&String(r[partMap.ID]||'')===String(trip[tripMap.PARTICIPACAO_ID]||''));
    if(partIndex<1)throw new Error('Participação vinculada à viagem não encontrada.');
    const moveSh=getSheet_('MOVIMENTACOES_OPERACAO'),moveMap=FT_PESAGEM_map_(moveSh),moveRow=new Array(moveSh.getLastColumn()).fill('');
    const moveFields={ID:Utilities.getUuid(),DATA_HORA:new Date(),OPERACAO_ID:String(trip[tripMap.OPERACAO_ID]||''),
      PARTICIPACAO_ID:String(trip[tripMap.PARTICIPACAO_ID]||''),CONJUNTO_ID:String(trip[tripMap.CONJUNTO_ID]||''),
      TONELADAS:realTon,VIAGEM_CONCLUIDA:'SIM',OBSERVACOES:observacoes||'Conclusão com pesagens aprovadas: '+ticketIds.join(' / '),
      REGISTRADO_POR:session.email||session.login,QUANTIDADE_VIAGENS:1};
    Object.keys(moveFields).forEach(k=>{if(moveMap[k]!==undefined)moveRow[moveMap[k]]=moveFields[k];});
    moveSh.appendRow(moveRow);
    tripSh.getRange(tripIndex+1,tripMap.STATUS+1).setValue('CONCLUIDA');
    tripSh.getRange(tripIndex+1,tripMap.PESO_REAL_TONELADAS+1).setValue(realTon);
    tripSh.getRange(tripIndex+1,tripMap.FIM_REAL+1).setValue(new Date());
    tripSh.getRange(tripIndex+1,tripMap.ATUALIZADA_EM+1).setValue(new Date());
    tripSh.getRange(tripIndex+1,tripMap.ATUALIZADA_POR+1).setValue(session.email||session.login);
    const saldoNovo=Math.max(0,saldo-realTon);
    opSh.getRange(opIndex+1,opMap.SALDO_TONELADAS+1).setValue(saldoNovo);
    if(opMap.STATUS!==undefined)opSh.getRange(opIndex+1,opMap.STATUS+1).setValue('EM_ANDAMENTO');
    if(opMap.VIAGENS_REALIZADAS!==undefined)opSh.getRange(opIndex+1,opMap.VIAGENS_REALIZADAS+1).setValue(Math.max(0,Number(op[opMap.VIAGENS_REALIZADAS]||0))+1);
    if(partMap.TONELADAS_MOVIMENTADAS!==undefined)partSh.getRange(partIndex+1,partMap.TONELADAS_MOVIMENTADAS+1).setValue(Math.max(0,Number(partGrid[partIndex][partMap.TONELADAS_MOVIMENTADAS]||0))+realTon);
    if(partMap.VIAGENS_CONCLUIDAS!==undefined)partSh.getRange(partIndex+1,partMap.VIAGENS_CONCLUIDAS+1).setValue(Math.max(0,Number(partGrid[partIndex][partMap.VIAGENS_CONCLUIDAS]||0))+1);
    return {ok:true,viagemId,toneladasDescarga:realTon,saldoOperacao:saldoNovo,viagensConcluidas:1,status:'CONCLUIDA',
      message:'Viagem concluída após aprovação dos dois tickets e conferência administrativa.'};
  } finally {lock.releaseLock();}
}

/** Teste puro de regra; não lê nem grava planilhas. */
function testarCalculoDivergenciaPesagemFullTime() {
  const tests=[
    {a:31120,b:31230,expected:0.353470437},
    {a:10000,b:11000,expected:10},
    {a:10000,b:11001,expected:10.01}
  ];
  const results=tests.map(t=>{const actual=Math.abs(t.a-t.b)/t.a*100;return {entrada:t,resultado:actual,aprovado:Math.abs(actual-t.expected)<0.00001};});
  const ok=results.every(x=>x.aprovado);
  if(!ok)throw new Error('Falha no teste de cálculo de divergência.');
  return {ok,testes:results.length,resultados:results,modo:'SEM_ACESSO_A_PLANILHAS'};
}
