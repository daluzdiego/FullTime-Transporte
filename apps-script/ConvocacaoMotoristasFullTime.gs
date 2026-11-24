/**
 * FULL TIME — Convocação e ofertas de escala
 * A oferta não ativa a participação. A confirmação ocorre somente após aceite.
 * Migração aditiva: preserva todos os cabeçalhos e registros existentes.
 */
const FT_CONVOCACAO_CFG_20261110 = Object.freeze({
  PARTICIPACOES: 'PARTICIPACAO_OPERACOES',
  EVENTOS: 'EVENTOS_ESCALA',
  PARTICIPACAO_HEADERS: ['OFERTADA_EM','RESPONDIDA_EM','EXPIRA_EM','ORIGEM_OFERTA','OBSERVACOES_OFERTA'],
  EVENT_HEADERS: ['OFERTA_ID']
});

function FT_CONV_headerMap_(sh) {
  const width = sh.getLastColumn();
  if (!width) throw new Error('A guia ' + sh.getName() + ' não possui cabeçalho.');
  const headers = sh.getRange(1,1,1,width).getDisplayValues()[0];
  const map = {};
  headers.forEach((v,i) => {
    const key = String(v || '').trim().toUpperCase();
    if (key && map[key] === undefined) map[key] = i;
  });
  return map;
}

function FT_CONV_ensureHeaders_(sh, required) {
  const width = sh.getLastColumn();
  const current = width ? sh.getRange(1,1,1,width).getDisplayValues()[0] : [];
  const have = new Set(current.map(v => String(v || '').trim().toUpperCase()).filter(Boolean));
  const missing = required.filter(v => !have.has(v.toUpperCase()));
  if (missing.length) sh.getRange(1,width+1,1,missing.length).setValues([missing]);
  sh.setFrozenRows(1);
  return FT_CONV_headerMap_(sh);
}

/** Execute uma vez no Apps Script central antes de usar o fluxo de ofertas. */
function FT_prepararEstruturaOfertasMotoristas20261110() {
  const parts = getSheet_(FT_CONVOCACAO_CFG_20261110.PARTICIPACOES);
  const events = getSheet_(FT_CONVOCACAO_CFG_20261110.EVENTOS);
  const p = FT_CONV_ensureHeaders_(parts, FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS);
  const e = FT_CONV_ensureHeaders_(events, FT_CONVOCACAO_CFG_20261110.EVENT_HEADERS);
  return {
    ok: true,
    participacoes: Object.keys(p),
    eventos: Object.keys(e),
    preservados: true,
    mensagem: 'Estrutura de ofertas preparada sem apagar ou reordenar colunas.'
  };
}

function FT_CONV_set_(row, map, key, value) {
  const i = map[String(key).toUpperCase()];
  if (i === undefined) throw new Error('Cabeçalho obrigatório ausente: ' + key);
  row[i] = value;
}

function FT_CONV_appendEvent_(data) {
  const sh = getSheet_(FT_CONVOCACAO_CFG_20261110.EVENTOS);
  const map = FT_CONV_ensureHeaders_(sh, FT_CONVOCACAO_CFG_20261110.EVENT_HEADERS);
  const row = new Array(sh.getLastColumn()).fill('');
  const values = {
    ID: Utilities.getUuid(),
    DATA_HORA: new Date(),
    TIPO_EVENTO: data.tipo,
    OPERACAO_ID: data.operacaoId,
    MOTORISTA_ID: data.motoristaId,
    CONJUNTO_ID: data.conjuntoId,
    POSICAO_ANTERIOR: data.anterior || '',
    POSICAO_NOVA: data.nova || '',
    MOTIVO: data.motivo || '',
    REGISTRADO_POR: data.autor || '',
    OFERTA_ID: data.ofertaId || ''
  };
  Object.keys(values).forEach(k => { if (map[k] !== undefined) row[map[k]] = values[k]; });
  sh.appendRow(row);
}

/**
 * Cria uma oferta pendente. Não altera o status da operação e não libera
 * registro de movimentação enquanto o motorista não aceitar.
 */
function ofertarConjuntoOperacaoFullTime(token, data) {
  const session = obterSessao_(token); exigirAdmin_(session);
  data = data || {};
  const operacaoId = texto_(data.operacaoId,100);
  const conjuntoId = texto_(data.conjuntoId,100);
  const motivo = texto_(data.motivo,500);
  if (!operacaoId || !conjuntoId) throw new Error('Operação e conjunto são obrigatórios.');

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const opSheet = getSheet_('OPERACOES');
    const opGrid = opSheet.getDataRange().getValues();
    const opHeaders = opGrid[0].map(v => String(v || '').trim().toUpperCase());
    const oi = {}; opHeaders.forEach((v,i) => { if (v && oi[v] === undefined) oi[v] = i; });
    const op = opGrid.slice(1).find(r => String(r[oi.ID] || '') === operacaoId);
    if (!op) throw new Error('Operação não encontrada.');
    const opStatus = String(op[oi.STATUS] || '').toUpperCase();
    if (!['ABERTA','EM_ANDAMENTO'].includes(opStatus)) throw new Error('A operação não está aberta para novas ofertas.');

    const candidates = ordenarCandidatosOperacaoFullTime(token, operacaoId);
    const candidate = candidates.find(x => String(x.id) === conjuntoId);
    if (!candidate) throw new Error('Este conjunto não está elegível neste momento. Atualize os candidatos e confira cadastro, capacidade e conservação.');

    const parts = getSheet_(FT_CONVOCACAO_CFG_20261110.PARTICIPACOES);
    const map = FT_CONV_ensureHeaders_(parts, FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS);
    const values = parts.getDataRange().getValues();
    const blocking = new Set(['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM']);
    const duplicate = values.slice(1).some(r =>
      String(r[map.OPERACAO_ID] === undefined ? '' : r[map.OPERACAO_ID]) === operacaoId &&
      String(r[map.CONJUNTO_ID] === undefined ? '' : r[map.CONJUNTO_ID]) === conjuntoId &&
      blocking.has(String(r[map.STATUS_PARTICIPACAO] === undefined ? '' : r[map.STATUS_PARTICIPACAO]).toUpperCase())
    );
    if (duplicate) throw new Error('Já existe uma oferta ou participação ativa deste conjunto nesta operação.');

    const now = new Date();
    const expires = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    const offerId = 'OFT-' + Utilities.getUuid();
    const row = new Array(parts.getLastColumn()).fill('');
    const fields = {
      ID: offerId, CRIADO_EM: now, OPERACAO_ID: operacaoId,
      CONJUNTO_ID: conjuntoId, MOTORISTA_ID: candidate.driverId,
      STATUS_PARTICIPACAO: 'OFERTADA', INICIO_EM: '', SAIDA_EM: '',
      RETORNO_EM: '', TONELADAS_MOVIMENTADAS: 0, VIAGENS_CONCLUIDAS: 0,
      MOTIVO: motivo || 'Convocação aguardando resposta do motorista.',
      REGISTRADO_POR: session.login || session.nome || 'ADMIN',
      OFERTADA_EM: now, RESPONDIDA_EM: '', EXPIRA_EM: expires,
      ORIGEM_OFERTA: 'PAINEL_ADMIN', OBSERVACOES_OFERTA: motivo
    };
    Object.keys(fields).forEach(k => FT_CONV_set_(row,map,k,fields[k]));
    parts.appendRow(row);
    FT_CONV_appendEvent_({
      tipo: 'OFERTA_ENVIADA', operacaoId, motoristaId: candidate.driverId,
      conjuntoId, anterior: '', nova: 'OFERTADA',
      motivo: motivo || 'Oferta enviada ao motorista; aguardando aceite.',
      autor: session.login || session.nome || 'ADMIN', ofertaId
    });
    auditar_(session,'OFERTA_ESCALA','OPERACAO',operacaoId,'Oferta '+offerId+' enviada para o conjunto '+conjuntoId+'.');
    return {ok:true,ofertaId, status:'OFERTADA', expiraEm:expires.toISOString(),
      message:'Oferta registrada. A participação ainda NÃO está confirmada; aguardará o aceite do motorista.'};
  } finally {
    lock.releaseLock();
  }
}

/** Resposta administrativa temporária para homologação; o portal usará a mesma transição. */
function responderOfertaMotoristaAdminFullTime(token, ofertaId, resposta, observacao) {
  const session = obterSessao_(token); exigirAdmin_(session);
  ofertaId = texto_(ofertaId,120);
  resposta = String(resposta || '').trim().toUpperCase();
  if (!['ACEITA','RECUSADA'].includes(resposta)) throw new Error('Resposta inválida.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_(FT_CONVOCACAO_CFG_20261110.PARTICIPACOES);
    const map = FT_CONV_ensureHeaders_(sh, FT_CONVOCACAO_CFG_20261110.PARTICIPACAO_HEADERS);
    const rows = sh.getDataRange().getValues();
    let rowNumber = -1, record = null;
    for (let i=1;i<rows.length;i++) {
      if (String(rows[i][map.ID] || '') === ofertaId) { rowNumber=i+1; record=rows[i]; break; }
    }
    if (!record) throw new Error('Oferta não encontrada.');
    if (String(record[map.STATUS_PARTICIPACAO] || '').toUpperCase() !== 'OFERTADA')
      throw new Error('Esta oferta já foi respondida ou não está mais pendente.');
    const expires = record[map.EXPIRA_EM] instanceof Date ? record[map.EXPIRA_EM] : new Date(record[map.EXPIRA_EM]);
    if (expires && isFinite(expires.getTime()) && expires.getTime() < Date.now()) {
      sh.getRange(rowNumber,map.STATUS_PARTICIPACAO+1).setValue('EXPIRADA');
      throw new Error('O prazo desta oferta expirou. Gere uma nova convocação se necessário.');
    }
    const now = new Date();
    sh.getRange(rowNumber,map.STATUS_PARTICIPACAO+1).setValue(resposta);
    sh.getRange(rowNumber,map.RESPONDIDA_EM+1).setValue(now);
    if (resposta === 'ACEITA') sh.getRange(rowNumber,map.INICIO_EM+1).setValue(now);
    if (observacao) sh.getRange(rowNumber,map.MOTIVO+1).setValue(texto_(observacao,500));
    const info = {
      tipo: resposta === 'ACEITA' ? 'OFERTA_ACEITA' : 'OFERTA_RECUSADA',
      operacaoId: record[map.OPERACAO_ID], motoristaId: record[map.MOTORISTA_ID],
      conjuntoId: record[map.CONJUNTO_ID], anterior: 'OFERTADA', nova: resposta,
      motivo: texto_(observacao,500) || 'Resposta registrada durante homologação pelo administrador.',
      autor: session.login || session.nome || 'ADMIN', ofertaId
    };
    FT_CONV_appendEvent_(info);
    auditar_(session,'RESPOSTA_OFERTA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId+' -> '+resposta);
    return {ok:true,ofertaId,status:resposta,message:resposta==='ACEITA'?'Aceite registrado. A participação foi confirmada.':'Recusa registrada. O conjunto voltou a ficar disponível para nova avaliação.'};
  } finally {
    lock.releaseLock();
  }
}
