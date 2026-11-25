/**
 * FULL TIME — AUDITORIA SOMENTE LEITURA DAS CONVOCACOES TORRES
 * Compara OPERACOES, PARTICIPACAO_OPERACOES, EVENTOS_ESCALA e USUARIOS.
 * Nao cria guias, nao altera dados, nao envia ofertas e nao toca nas filas.
 *
 * Execute: FT_AUDITAR_CONVOCACOES_TORRES_20261125
 */
function FT_AUDITAR_CONVOCACOES_TORRES_20261125() {
  const registryId = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!registryId) throw new Error('FT_REGISTRY_DATABASE_ID nao configurado.');
  const operational = SpreadsheetApp.openById(registryId);
  const auth = SpreadsheetApp.openById(getDbId_());

  function sheetData_(ss, name) {
    const sh = ss.getSheetByName(name);
    if (!sh) throw new Error('Guia ausente: ' + name + ' em ' + ss.getName());
    const values = sh.getDataRange().getValues();
    const headers = (values[0] || []).map(v => String(v || '').trim().toUpperCase());
    const map = {};
    headers.forEach((h, i) => { if (h && map[h] === undefined) map[h] = i; });
    return { sheet: sh, rows: values.slice(1), map: map, headers: headers };
  }
  function val_(row, map, key) {
    return map[key] === undefined ? '' : row[map[key]];
  }
  function dateIso_(v) {
    if (!v) return '';
    const d = v instanceof Date ? v : new Date(v);
    return isFinite(d.getTime()) ? d.toISOString() : String(v);
  }
  function norm_(v) { return String(v || '').trim(); }

  const ops = sheetData_(operational, 'OPERACOES');
  const opMatches = ops.rows.map(r => ({
    id: norm_(val_(r, ops.map, 'ID')),
    nome: norm_(val_(r, ops.map, 'NOME_OPERACAO')),
    cliente: norm_(val_(r, ops.map, 'CLIENTE')),
    status: norm_(val_(r, ops.map, 'STATUS')),
    row: r
  })).filter(o => /TORRES/i.test(o.nome) || /TORRES/i.test(o.cliente));

  if (opMatches.length !== 1) {
    const result = {
      auditoria: 'CONVOCACOES_TORRES_20261125',
      somenteLeitura: true,
      operacoesEncontradas: opMatches.map(o => ({ id: o.id, nome: o.nome, cliente: o.cliente, status: o.status })),
      erro: opMatches.length ? 'Mais de uma operacao TORRES; necessario identificar pelo ID.' : 'Operacao TORRES nao encontrada pelo nome/cliente.'
    };
    Logger.log('FT_AUDITORIA_TORRES ' + JSON.stringify(result));
    return result;
  }

  const op = opMatches[0];
  const parts = sheetData_(operational, 'PARTICIPACAO_OPERACOES');
  const users = sheetData_(auth, 'USUARIOS');
  const drivers = sheetData_(operational, 'MOTORISTAS');
  const sets = sheetData_(operational, 'CONJUNTOS');
  const events = sheetData_(operational, 'EVENTOS_ESCALA');

  const driverById = {};
  drivers.rows.forEach(r => {
    const id = norm_(val_(r, drivers.map, 'ID'));
    if (id) driverById[id] = {
      nome: norm_(val_(r, drivers.map, 'NOME_COMPLETO')),
      email: norm_(val_(r, drivers.map, 'EMAIL'))
    };
  });
  const setById = {};
  sets.rows.forEach(r => {
    const id = norm_(val_(r, sets.map, 'ID'));
    if (id) setById[id] = {
      motoristaId: norm_(val_(r, sets.map, 'MOTORISTA_ID')),
      cavaloId: norm_(val_(r, sets.map, 'CAVALO_ID')),
      carretaId: norm_(val_(r, sets.map, 'CARRETA_ID'))
    };
  });

  const accountsByDriver = {};
  const targetAccounts = [];
  users.rows.forEach(r => {
    const driverId = norm_(val_(r, users.map, 'MOTORISTA_ID'));
    if (!driverId) return;
    const item = {
      usuarioId: norm_(val_(r, users.map, 'ID')),
      login: norm_(val_(r, users.map, 'LOGIN')),
      perfil: norm_(val_(r, users.map, 'PERFIL')),
      ativo: norm_(val_(r, users.map, 'ATIVO')),
      motoristaId: driverId
    };
    (accountsByDriver[driverId] = accountsByDriver[driverId] || []).push(item);
    if (/036$/.test(driverId) || /motorista.*036/i.test(item.login)) targetAccounts.push(item);
  });

  const opRows = parts.rows.filter(r => norm_(val_(r, parts.map, 'OPERACAO_ID')) === op.id);
  const offers = opRows.map(r => {
    const driverId = norm_(val_(r, parts.map, 'MOTORISTA_ID'));
    const setId = norm_(val_(r, parts.map, 'CONJUNTO_ID'));
    const status = norm_(val_(r, parts.map, 'STATUS_PARTICIPACAO')).toUpperCase();
    const expiry = val_(r, parts.map, 'EXPIRA_EM');
    const expiryDate = expiry instanceof Date ? expiry : new Date(expiry);
    const offered = val_(r, parts.map, 'OFERTADA_EM') || val_(r, parts.map, 'CRIADO_EM');
    return {
      ofertaId: norm_(val_(r, parts.map, 'ID')),
      motoristaId: driverId,
      motorista: driverById[driverId] ? driverById[driverId].nome : '',
      conjuntoId: setId,
      statusPersistido: status,
      statusExibicaoSugerido: status === 'OFERTADA'
        ? (isFinite(expiryDate.getTime()) && expiryDate.getTime() > Date.now() ? 'AGUARDANDO_MOTORISTA' : 'PRAZO_EXPIRADO')
        : status,
      ofertadaEm: dateIso_(offered),
      expiraEm: dateIso_(expiry),
      respondidaEm: dateIso_(val_(r, parts.map, 'RESPONDIDA_EM')),
      origemOferta: norm_(val_(r, parts.map, 'ORIGEM_OFERTA')),
      registradoPor: norm_(val_(r, parts.map, 'REGISTRADO_POR')),
      contasVinculadas: accountsByDriver[driverId] || [],
      motoristaDoConjunto: setById[setId] ? setById[setId].motoristaId : '',
      conjuntoConfereComOferta: !!(setById[setId] && setById[setId].motoristaId === driverId)
    };
  });

  const eventRows = events.rows.filter(r => norm_(val_(r, events.map, 'OPERACAO_ID')) === op.id);
  const eventList = eventRows.map(r => ({
    dataHora: dateIso_(val_(r, events.map, 'DATA_HORA')),
    tipo: norm_(val_(r, events.map, 'TIPO_EVENTO')),
    motoristaId: norm_(val_(r, events.map, 'MOTORISTA_ID')),
    conjuntoId: norm_(val_(r, events.map, 'CONJUNTO_ID')),
    anterior: norm_(val_(r, events.map, 'POSICAO_ANTERIOR')),
    novo: norm_(val_(r, events.map, 'POSICAO_NOVA')),
    ofertaId: norm_(val_(r, events.map, 'OFERTA_ID')),
    motivo: norm_(val_(r, events.map, 'MOTIVO'))
  })).sort((a, b) => String(a.dataHora).localeCompare(String(b.dataHora)));

  const counts = {};
  offers.forEach(o => { counts[o.statusPersistido] = (counts[o.statusPersistido] || 0) + 1; });
  const result = {
    auditoria: 'CONVOCACOES_TORRES_20261125',
    executadoEm: new Date().toISOString(),
    somenteLeitura: true,
    naoAlterouDados: true,
    planilhaOperacional: operational.getName(),
    planilhaAutenticacao: auth.getName(),
    operacao: { id: op.id, nome: op.nome, cliente: op.cliente, status: op.status },
    totalParticipacoesOperacao: offers.length,
    status: counts,
    ofertas: offers,
    eventos: eventList,
    contasMotorista036: targetAccounts,
    cabecalhos: {
      participacoes: parts.headers,
      eventos: events.headers,
      usuarios: users.headers
    },
    diagnostico: {
      ofertasSemContaVinculada: offers.filter(o => !o.contasVinculadas.length).map(o => ({ ofertaId: o.ofertaId, motoristaId: o.motoristaId })),
      ofertasComDivergenciaConjuntoMotorista: offers.filter(o => !o.conjuntoConfereComOferta).map(o => ({ ofertaId: o.ofertaId, motoristaId: o.motoristaId, conjuntoId: o.conjuntoId, motoristaDoConjunto: o.motoristaDoConjunto })),
      ofertasSemDataEnvio: offers.filter(o => !o.ofertadaEm).map(o => o.ofertaId),
      ofertasSemExpiracao: offers.filter(o => !o.expiraEm).map(o => o.ofertaId)
    }
  };
  Logger.log('FT_AUDITORIA_TORRES ' + JSON.stringify(result));
  return result;
}
