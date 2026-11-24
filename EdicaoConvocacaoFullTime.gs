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
    if (String(old[map.STATUS_PARTICIPACAO] || '').trim().toUpperCase() !== 'OFERTADA') {
      throw new Error('Esta convocação já foi respondida ou confirmada. Somente ofertas pendentes podem ser substituídas por esta função.');
    }

    const expRaw = old[map.EXPIRA_EM];
    const exp = expRaw instanceof Date ? expRaw : new Date(expRaw);
    if (!exp || !isFinite(exp.getTime()) || exp.getTime() <= Date.now()) {
      sh.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('NAO_RESPONDEU');
      if (map.RESPONDIDA_EM !== undefined) sh.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(new Date());
      FT_colocarMotoristaNoFinalDaFila_(old[map.MOTORISTA_ID], 'oferta expirou durante tentativa de substituição');
      throw new Error('O prazo da convocação expirou. Atualize a escala antes de fazer outra alteração.');
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
    const oldName = String(old[map.MOTIVO] || '');
    sh.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('CANCELADA_SUBSTITUICAO');
    if (map.RESPONDIDA_EM !== undefined) sh.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(now);
    if (map.MOTIVO !== undefined) sh.getRange(rowNumber, map.MOTIVO + 1).setValue('Convocação substituída por administrador. Motivo: ' + motivo);
    if (map.OBSERVACOES_OFERTA !== undefined) sh.getRange(rowNumber, map.OBSERVACOES_OFERTA + 1).setValue('Substituída em ' + now.toISOString() + ' por ' + session.login + '. ' + motivo);

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
      EXPIRA_EM: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      ORIGEM_OFERTA: 'PAINEL_ADMIN_SUBSTITUICAO',
      OBSERVACOES_OFERTA: 'Substitui a oferta ' + ofertaId + '. ' + motivo
    };
    Object.keys(fields).forEach(k => FT_CONV_set_(newRow, map, k, fields[k]));
    sh.appendRow(newRow);

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
      message: 'Convocação substituída. A nova pessoa receberá uma oferta e precisará aceitá-la; a escala ainda não está confirmada.'
    };
  } finally {
    lock.releaseLock();
  }
}
