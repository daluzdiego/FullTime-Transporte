/**
 * FULL TIME — edição segura de convocação pendente pelo administrador.
 * Permite substituir somente uma oferta ainda OFERTADA. Aceites e participações
 * confirmadas nunca são sobrescritos; permanecem no histórico operacional.
 */
function FT_convocacaoEditavelAntesDoAceite_(status) {
  return ['OFERTADA','RECUSADA','NAO_RESPONDEU','EXPIRADA'].indexOf(String(status||'').trim().toUpperCase()) >= 0;
}
function testarRegraEdicaoConvocacaoFullTime() {
  var cases={OFERTADA:true,RECUSADA:true,NAO_RESPONDEU:true,EXPIRADA:true,ACEITA:false,ATIVO:false,EM_VIAGEM:false,RETORNOU:false};
  var failures=[];
  Object.keys(cases).forEach(function(status){if(FT_convocacaoEditavelAntesDoAceite_(status)!==cases[status])failures.push(status);});
  var result={ok:failures.length===0,casos:Object.keys(cases).length,confirmadosBloqueados:['ACEITA','ATIVO','EM_VIAGEM','RETORNOU'].every(function(s){return !FT_convocacaoEditavelAntesDoAceite_(s);}),falhas:failures};
  if(!result.ok)throw new Error('Falha na regra de bloqueio: '+JSON.stringify(result));
  Logger.log('FT_TESTE_REGRA_EDICAO_CONVOCACAO '+JSON.stringify(result));
  return result;
}

function FT_substituirConvocadoPendenteFullTime(token, ofertaId, novoConjuntoId, motivo) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  ofertaId = texto_(ofertaId, 120);
  novoConjuntoId = texto_(novoConjuntoId, 120);
  motivo = texto_(motivo || 'Substituição administrativa de convocado pendente.', 500);
  if (!ofertaId || !novoConjuntoId) throw new Error('Selecione a oferta pendente e o novo conjunto.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_('PARTICIPACAO_OPERACOES');
    const map = FT_CONV_ensureHeaders_(sh, FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS);
    const rows = sh.getDataRange().getValues();
    let rowNumber = -1, old = null;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][map.ID] || '') === ofertaId) {
        rowNumber = i + 1;
        old = rows[i];
        break;
      }
    }
    if (!old) throw new Error('Convocação não encontrada.');
    const currentStatus = String(old[map.STATUS_PARTICIPACAO] || '').trim().toUpperCase();
    if (!FT_convocacaoEditavelAntesDoAceite_(currentStatus)) {
      throw new Error('Esta participação já foi confirmada ou está em execução. O vínculo confirmado não pode ser alterado.');
    }

    if (currentStatus === 'OFERTADA') {
      const expRaw = old[map.EXPIRA_EM];
      const exp = expRaw instanceof Date ? expRaw : new Date(expRaw);
      if (!exp || !isFinite(exp.getTime()) || exp.getTime() <= Date.now()) {
        sh.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('NAO_RESPONDEU');
        if (map.RESPONDIDA_EM !== undefined) sh.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(new Date());
        FT_colocarMotoristaNoFinalDaFila_(old[map.MOTORISTA_ID], 'oferta expirou durante tentativa de substituição');
        throw new Error('O prazo da convocação expirou. Atualize a escala antes de fazer outra alteração.');
      }
    }

    const operacaoId = String(old[map.OPERACAO_ID] || '');
    const opSheet = getSheet_('OPERACOES');
    const opGrid = opSheet.getDataRange().getValues();
    const opHeaders = (opGrid[0] || []).map(v => String(v || '').trim().toUpperCase());
    const oi = {};
    opHeaders.forEach((v, i) => { if (v && oi[v] === undefined) oi[v] = i; });
    const op = opGrid.slice(1).find(r => String(r[oi.ID] || '') === operacaoId);
    if (!op || !['ABERTA', 'EM_ANDAMENTO'].includes(String(op[oi.STATUS] || '').toUpperCase())) {
      throw new Error('A operação não está aberta para alteração de convocados.');
    }

    const oldSetId = String(old[map.CONJUNTO_ID] || '');
    if (novoConjuntoId === oldSetId) throw new Error('Escolha um conjunto diferente do convocado atual.');

    // Recalcula elegibilidade no servidor; não confia na lista exibida no navegador.
    const candidates = ordenarCandidatosOperacaoFullTime(token, operacaoId);
    const candidate = candidates.find(x => String(x.id) === novoConjuntoId);
    if (!candidate || candidate.eligible !== true) {
      throw new Error('O novo conjunto não está elegível. Atualize a lista e confira motorista, documentos, capacidade e disponibilidade.');
    }

    const newDriverId = String(candidate.driverId || '');
    if (newDriverId && newDriverId === String(old[map.MOTORISTA_ID] || '')) throw new Error('O conjunto escolhido pertence ao mesmo motorista da convocação atual. Escolha outro motorista.');
    const conflict = rows.slice(1).some(r => {
      const st = String(r[map.STATUS_PARTICIPACAO] || '').trim().toUpperCase();
      if (!['OFERTADA', 'ACEITA', 'ATIVO', 'SAIU', 'EM_VIAGEM'].includes(st)) return false;
      if (st === 'OFERTADA') {
        const raw = r[map.EXPIRA_EM], expiry = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
        if (!isFinite(expiry) || expiry <= Date.now()) return false;
      }
      return String(r[map.CONJUNTO_ID] || '') === novoConjuntoId ||
        String(r[map.MOTORISTA_ID] || '') === newDriverId;
    });
    if (conflict) throw new Error('O novo motorista ou conjunto já possui outra oferta ou participação em andamento.');

    const now = new Date();
    const oldDriverId = String(old[map.MOTORISTA_ID] || '');
    // Oferta pendente é cancelada; recusa/expiração permanece intacta no histórico.
    if (currentStatus === 'OFERTADA') {
      sh.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('CANCELADA_SUBSTITUICAO');
      if (map.RESPONDIDA_EM !== undefined) sh.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(now);
      if (map.MOTIVO !== undefined) sh.getRange(rowNumber, map.MOTIVO + 1).setValue('Convocação substituída por administrador. Motivo: ' + motivo);
      if (map.OBSERVACOES_OFERTA !== undefined) sh.getRange(rowNumber, map.OBSERVACOES_OFERTA + 1).setValue('Substituída em ' + now.toISOString() + ' por ' + session.login + '. ' + motivo);
    }

    const oldOrigin = String(old[map.ORIGEM_OFERTA] || '').trim().toUpperCase();
    const isAutoQueue = oldOrigin === 'FILA_AUTOMATICA';
    const newOfferId = 'OFT-' + Utilities.getUuid();
    const newRow = new Array(sh.getLastColumn()).fill('');
    const fields = {
      ID: newOfferId, CRIADO_EM: now, OPERACAO_ID: operacaoId,
      CONJUNTO_ID: novoConjuntoId, MOTORISTA_ID: newDriverId,
      STATUS_PARTICIPACAO: 'OFERTADA', INICIO_EM: '', SAIDA_EM: '',
      RETORNO_EM: '', TONELADAS_MOVIMENTADAS: 0, VIAGENS_CONCLUIDAS: 0,
      MOTIVO: 'Convocação substituta. ' + motivo,
      REGISTRADO_POR: session.login || session.nome || 'ADMIN',
      OFERTADA_EM: now, RESPONDIDA_EM: '',
      EXPIRA_EM: new Date(now.getTime() + (typeof FT_AUTO_TTL_==='number' ? FT_AUTO_TTL_ : 6 * 60 * 60 * 1000)),
      ORIGEM_OFERTA: isAutoQueue ? 'FILA_AUTOMATICA' : 'PAINEL_ADMIN_SUBSTITUICAO',
      OBSERVACOES_OFERTA: 'Substitui a oferta ' + ofertaId + '. ' + motivo
    };
    Object.keys(fields).forEach(k => FT_CONV_set_(newRow, map, k, fields[k]));
    sh.appendRow(newRow);
    if(typeof FT_AUTO_AGENDAR_LEMBRETES_EMAIL_==='function')FT_AUTO_AGENDAR_LEMBRETES_EMAIL_();

    // Mantém a fila automática coerente: a nova oferta ocupa o lugar da anterior
    // e o motorista/conjunto escolhido não volta a aparecer no restante da fila.
    if (isAutoQueue && typeof FT_AUTO_READ_ === 'function' && typeof FT_AUTO_WRITE_ === 'function') {
      const queues = FT_AUTO_READ_(), q = queues[operacaoId];
      if (q && q.status === 'EM_ANDAMENTO') {
        q.pendentes = (q.pendentes || []).map(id => String(id) === ofertaId ? newOfferId : id);
        if (!q.pendentes.includes(newOfferId)) q.pendentes.push(newOfferId);
        const cursor = Number(q.cursor || 0);
        const before = (q.lista || []).slice(0, cursor);
        const after = (q.lista || []).slice(cursor).filter(x =>
          String(x.conjuntoId) !== novoConjuntoId && String(x.motoristaId) !== newDriverId
        );
        q.lista = before.concat(after);
        q.cursor = before.length;
        FT_AUTO_WRITE_(queues);
      }
    }

    FT_CONV_appendEvent_({
      tipo: currentStatus === 'OFERTADA' ? 'OFERTA_CANCELADA_SUBSTITUICAO' : 'NOVA_OFERTA_APOS_RECUSA_OU_EXPIRACAO', operacaoId,
      motoristaId: oldDriverId, conjuntoId: oldSetId,
      anterior: currentStatus, nova: currentStatus === 'OFERTADA' ? 'CANCELADA_SUBSTITUICAO' : currentStatus,
      motivo: motivo, autor: session.login || 'ADMIN', ofertaId
    });
    FT_CONV_appendEvent_({
      tipo: 'OFERTA_ENVIADA_SUBSTITUICAO', operacaoId,
      motoristaId: newDriverId, conjuntoId: novoConjuntoId,
      anterior: '', nova: 'OFERTADA',
      motivo: 'Nova convocação após substituição de ' + oldDriverId + '. ' + motivo,
      autor: session.login || 'ADMIN', ofertaId: newOfferId
    });
    auditar_(session, 'SUBSTITUIR_CONVOCADO_PENDENTE', 'OPERACAO', operacaoId,
      'Oferta ' + ofertaId + ' substituída por ' + newOfferId + '. Conjunto anterior ' + oldSetId + '; novo conjunto ' + novoConjuntoId + '. Motivo: ' + motivo);
    return {
      ok: true, operacaoId, ofertaAnterior: ofertaId, ofertaNova: newOfferId,
      motoristaAnteriorId: oldDriverId, motoristaNovoId: newDriverId,
      conjuntoAnteriorId: oldSetId, conjuntoNovoId: novoConjuntoId,
      status: 'OFERTADA',
      message: 'Substituição registrada. A nova convocação está pendente de aceite; a escala ainda não está confirmada.'
    };
  } finally {
    lock.releaseLock();
  }
}


/** Retira uma convocação ainda pendente sem apagar seu histórico. */
function FT_cancelarConvocacaoPendenteFullTime(token, ofertaId, motivo) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  ofertaId = texto_(ofertaId, 120);
  motivo = texto_(motivo || 'Retirada administrativa antes do aceite.', 500);
  if (!ofertaId) throw new Error('Informe a convocação.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_('PARTICIPACAO_OPERACOES');
    const map = FT_CONV_ensureHeaders_(sh, FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS);
    const rows = sh.getDataRange().getValues();
    let rowNumber = -1, record = null;
    for (let i=1;i<rows.length;i++) if (String(rows[i][map.ID]||'')===ofertaId) { rowNumber=i+1; record=rows[i]; break; }
    if (!record) throw new Error('Convocação não encontrada.');
    if (String(record[map.STATUS_PARTICIPACAO]||'').trim().toUpperCase()!=='OFERTADA') {
      throw new Error('Somente uma convocação aguardando resposta pode ser retirada. Participações confirmadas são bloqueadas.');
    }
    const expiryRaw=record[map.EXPIRA_EM],expiry=expiryRaw instanceof Date?expiryRaw.getTime():new Date(expiryRaw).getTime();
    if (!isFinite(expiry)||expiry<=Date.now()) throw new Error('A convocação expirou. Atualize a escala antes de retirar.');
    const opId=String(record[map.OPERACAO_ID]||''),now=new Date();
    sh.getRange(rowNumber,map.STATUS_PARTICIPACAO+1).setValue('CANCELADA_ADMIN');
    if(map.RESPONDIDA_EM!==undefined)sh.getRange(rowNumber,map.RESPONDIDA_EM+1).setValue(now);
    if(map.MOTIVO!==undefined)sh.getRange(rowNumber,map.MOTIVO+1).setValue('Retirada administrativa. '+motivo);
    if(map.OBSERVACOES_OFERTA!==undefined)sh.getRange(rowNumber,map.OBSERVACOES_OFERTA+1).setValue('Retirada em '+now.toISOString()+' por '+(session.login||'ADMIN')+'. '+motivo);
    const origin=String(record[map.ORIGEM_OFERTA]||'').trim().toUpperCase();
    if(origin==='FILA_AUTOMATICA'&&typeof FT_AUTO_READ_==='function'&&typeof FT_AUTO_WRITE_==='function'){
      const queues=FT_AUTO_READ_(),q=queues[opId];
      if(q&&q.status==='EM_ANDAMENTO'){q.pendentes=(q.pendentes||[]).filter(id=>String(id)!==ofertaId);FT_AUTO_WRITE_(queues);}
    }
    FT_CONV_appendEvent_({tipo:'OFERTA_RETIRADA_ADMIN',operacaoId:opId,motoristaId:record[map.MOTORISTA_ID],conjuntoId:record[map.CONJUNTO_ID],anterior:'OFERTADA',nova:'CANCELADA_ADMIN',motivo:motivo,autor:session.login||'ADMIN',ofertaId:ofertaId});
    auditar_(session,'RETIRAR_CONVOCACAO_PENDENTE','OPERACAO',opId,'Oferta '+ofertaId+' retirada. '+motivo);
    return {ok:true,status:'CANCELADA_ADMIN',message:'Convocação retirada. O histórico foi preservado e nenhum aceite foi alterado.'};
  } finally { lock.releaseLock(); }
}


/** Cria convocação manual para conjunto elegível quando não há fila automática ativa. */
function FT_adicionarConvocadoManualFullTime(token, operacaoId, conjuntoId, motivo) {
  const session=obterSessao_(token);exigirAdmin_(session);
  operacaoId=texto_(operacaoId,100);conjuntoId=texto_(conjuntoId,100);motivo=texto_(motivo||'Convocação manual pelo administrador.',500);
  if(!operacaoId||!conjuntoId)throw new Error('Selecione a operação e o conjunto.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    const queues=typeof FT_AUTO_READ_==='function'?FT_AUTO_READ_():{},queue=queues[operacaoId];
    if(queue&&queue.status==='EM_ANDAMENTO')throw new Error('Há uma fila automática em andamento. Conclua ou aguarde essa fila antes de adicionar uma convocação manual.');
    const opSh=getSheet_('OPERACOES'),opRows=opSh.getDataRange().getValues(),oh=(opRows[0]||[]).map(v=>String(v||'').trim().toUpperCase()),oi={};
    oh.forEach((v,i)=>{if(v&&oi[v]===undefined)oi[v]=i;});
    const op=opRows.slice(1).find(r=>String(r[oi.ID]||'')===operacaoId);
    if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[oi.STATUS]||'').toUpperCase()))throw new Error('A operação não está aberta para novas convocações.');
    const candidates=ordenarCandidatosOperacaoFullTime(token,operacaoId),candidate=candidates.find(x=>String(x.id)===conjuntoId);
    if(!candidate||candidate.eligible!==true)throw new Error('O conjunto não está elegível. Atualize a análise de candidatos e confira documentos, capacidade e disponibilidade.');
    const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_CONV_ensureHeaders_(sh,FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS),rows=sh.getDataRange().getValues();
    // O limite autorizado vem da própria operação. Elegibilidade nunca equivale a autorização.
    const vagasAutorizadas=Number(oi.MOTORISTAS_NECESSARIOS!==undefined?op[oi.MOTORISTAS_NECESSARIOS]:0)||Number(queue&&queue.vagas||0);
    if(!Number.isInteger(vagasAutorizadas)||vagasAutorizadas<1||vagasAutorizadas>40)
      throw new Error('Defina primeiro, no cadastro da operação, a quantidade autorizada de motoristas (1 a 40). Nenhum convocado foi criado.');
    const ocupados=rows.slice(1).filter(r=>
      String(r[map.OPERACAO_ID]||'')===operacaoId&&
      ['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(r[map.STATUS_PARTICIPACAO]||'').trim().toUpperCase())
    ).length;
    if(ocupados>=vagasAutorizadas)
      throw new Error('Limite atingido: '+ocupados+' de '+vagasAutorizadas+' vagas autorizadas já estão ocupadas. A quantidade de aptos não aumenta esse limite.');
    const driverId=String(candidate.driverId||'');
    const conflict=rows.slice(1).some(r=>{
      const status=String(r[map.STATUS_PARTICIPACAO]||'').trim().toUpperCase();
      if(!['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(status))return false;
      if(status==='OFERTADA'){const raw=r[map.EXPIRA_EM],expiry=raw instanceof Date?raw.getTime():new Date(raw).getTime();if(!isFinite(expiry)||expiry<=Date.now())return false;}
      return String(r[map.CONJUNTO_ID]||'')===conjuntoId||String(r[map.MOTORISTA_ID]||'')===driverId;
    });
    if(conflict)throw new Error('Este motorista ou conjunto já possui uma convocação ou participação em andamento.');
    const now=new Date(),id='OFT-'+Utilities.getUuid(),row=new Array(sh.getLastColumn()).fill('');
    const fields={ID:id,CRIADO_EM:now,OPERACAO_ID:operacaoId,CONJUNTO_ID:conjuntoId,MOTORISTA_ID:driverId,STATUS_PARTICIPACAO:'OFERTADA',INICIO_EM:'',SAIDA_EM:'',RETORNO_EM:'',TONELADAS_MOVIMENTADAS:0,VIAGENS_CONCLUIDAS:0,MOTIVO:motivo,REGISTRADO_POR:session.login||'ADMIN',OFERTADA_EM:now,RESPONDIDA_EM:'',EXPIRA_EM:new Date(now.getTime()+(typeof FT_AUTO_TTL_==='number'?FT_AUTO_TTL_:6*60*60*1000)),ORIGEM_OFERTA:'PAINEL_ADMIN_MANUAL',OBSERVACOES_OFERTA:motivo,DATA_OPERACAO_OFERTA:op[oi.DATA_OPERACAO],HORARIO_OPERACAO_OFERTA:op[oi.JANELA_INICIO],JANELA_FIM_OFERTA:op[oi.JANELA_FIM]};
    Object.keys(fields).forEach(k=>FT_CONV_set_(row,map,k,fields[k]));
    sh.appendRow(row);
    if(typeof FT_AUTO_AGENDAR_LEMBRETES_EMAIL_==='function')FT_AUTO_AGENDAR_LEMBRETES_EMAIL_();
    FT_CONV_appendEvent_({tipo:'OFERTA_MANUAL_CRIADA',operacaoId:operacaoId,motoristaId:driverId,conjuntoId:conjuntoId,anterior:'',nova:'OFERTADA',motivo:motivo,autor:session.login||'ADMIN',ofertaId:id});
    auditar_(session,'ADICIONAR_CONVOCADO_MANUAL','OPERACAO',operacaoId,'Oferta '+id+'; conjunto='+conjuntoId+'; motorista='+driverId+'; '+motivo);
    return {ok:true,id:id,status:'OFERTADA',message:'Convocação manual registrada. O motorista ainda precisa aceitar; a equipe não está confirmada.'};
  }finally{lock.releaseLock();}
}
