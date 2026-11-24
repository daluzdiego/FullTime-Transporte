/**
 * FULL TIME — edição segura de convocação pendente pelo administrador.
 * Permite substituir somente uma oferta ainda OFERTADA. Aceites e participações
 * confirmadas nunca são sobrescritos; permanecem no histórico operacional.
 */
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
    const replaceable = ['OFERTADA','RECUSADA','NAO_RESPONDEU','EXPIRADA'];
    if (replaceable.indexOf(currentStatus) < 0) {
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
      EXPIRA_EM: new Date(now.getTime() + (isAutoQueue ? FT_AUTO_TTL_ : 12 * 60 * 60 * 1000)),
      ORIGEM_OFERTA: isAutoQueue ? 'FILA_AUTOMATICA' : 'PAINEL_ADMIN_SUBSTITUICAO',
      OBSERVACOES_OFERTA: 'Substitui a oferta ' + ofertaId + '. ' + motivo
    };
    Object.keys(fields).forEach(k => FT_CONV_set_(newRow, map, k, fields[k]));
    sh.appendRow(newRow);

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
      tipo: 'OFERTA_CANCELADA_SUBSTITUICAO', operacaoId,
      motoristaId: oldDriverId, conjuntoId: oldSetId,
      anterior: 'OFERTADA', nova: 'CANCELADA_SUBSTITUICAO',
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
