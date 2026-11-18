/**
 * FULL TIME — Auditoria de integridade da homologação (arquitetura centralizada).
 *
 * SOMENTE LEITURA:
 * - não cria, renomeia ou exclui guias;
 * - não altera cadastros, status, filas, ofertas ou propriedades;
 * - não instala nem remove gatilhos;
 * - não registra CPF, telefone, e-mail, login, senha ou tokens no relatório.
 *
 * Executar manualmente no Apps Script:
 * FT_AUDITAR_INTEGRIDADE_HOMOLOGACAO_20261118()
 */
function FT_AUDITAR_INTEGRIDADE_HOMOLOGACAO_20261118() {
  const props = PropertiesService.getScriptProperties();
  const operationalId = String(props.getProperty('FT_REGISTRY_DATABASE_ID') || '').trim();
  const authId = String(props.getProperty('FT_DATABASE_ID') || '').trim();
  if (!operationalId) throw new Error('FT_REGISTRY_DATABASE_ID não configurado. Nenhuma alteração foi realizada.');
  if (!authId) throw new Error('FT_DATABASE_ID não configurado. Nenhuma alteração foi realizada.');
  if (operationalId === authId) throw new Error('ERRO CRÍTICO: base operacional e base de autenticação apontam para a mesma planilha.');

  const operational = SpreadsheetApp.openById(operationalId);
  const auth = SpreadsheetApp.openById(authId);
  // Esta rotina é exclusiva da homologação: falha fechada se as propriedades apontarem
  // para uma planilha que não esteja explicitamente identificada como HOMOLOGACAO.
  const operationalName = String(operational.getName() || '').toUpperCase();
  const authName = String(auth.getName() || '').toUpperCase();
  if (operationalName.indexOf('HOMOLOGACAO') === -1 || authName.indexOf('HOMOLOGACAO') === -1) {
    throw new Error('SEGURANÇA: auditoria de homologação bloqueada. As duas bases precisam estar identificadas como HOMOLOGACAO. Nenhuma alteração foi realizada.');
  }
  const required = [
    'MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','DOCUMENTOS','OPERACOES',
    'PARTICIPACAO_OPERACOES','MOVIMENTACOES_OPERACAO','LOCAIS','REGRAS_OPERACIONAIS',
    'DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','EVENTOS_ESCALA','ENTRADA_OPERACOES_IA'
  ];
  const report = {
    executadoEm: new Date().toISOString(),
    modo: 'SOMENTE_LEITURA',
    bases: {
      operacional: operational.getName(),
      autenticacao: auth.getName(),
      basesSeparadas: operationalId !== authId
    },
    resumo: { criticos: 0, alertas: 0, informativos: 0, aprovados: 0 },
    contagens: {},
    verificacoes: [],
    problemas: [],
    gatilhos: [],
    filasPersistidas: {}
  };
  const add = (severity, code, message, details) => {
    const item = { severidade: severity, codigo: code, mensagem: message, detalhes: details || [] };
    report.verificacoes.push(item);
    if (severity === 'CRITICO') report.resumo.criticos++;
    else if (severity === 'ALERTA') report.resumo.alertas++;
    else if (severity === 'INFO') report.resumo.informativos++;
    else report.resumo.aprovados++;
    if (severity !== 'OK' && severity !== 'INFO') report.problemas.push(item);
  };
  const read = (ss, name, mandatory) => {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      if (mandatory) add('CRITICO', 'GUIA_AUSENTE_' + name, 'Guia obrigatória ausente na base ' + ss.getName() + '.', []);
      return null;
    }
    const grid = sh.getLastRow() && sh.getLastColumn()
      ? sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues()
      : [[]];
    const headers = (grid[0] || []).map(v => String(v == null ? '' : v).trim().toUpperCase());
    const ix = {};
    headers.forEach((h, i) => { if (h && ix[h] === undefined) ix[h] = i; });
    const rows = grid.slice(1).filter(r => r.some(v => v !== '' && v !== null));
    report.contagens[name] = rows.length;
    return { sheet: sh, headers: headers, ix: ix, rows: rows };
  };
  const val = (r, t, key) => t && t.ix[key] !== undefined ? r[t.ix[key]] : '';
  const str = v => String(v == null ? '' : v).trim();
  const norm = v => str(v).toUpperCase();
  const digits = v => str(v).replace(/\D/g, '');
  const mapById = t => {
    const out = new Map();
    if (t) t.rows.forEach(r => { const id = str(val(r, t, 'ID')); if (id && !out.has(id)) out.set(id, r); });
    return out;
  };
  const duplicates = (t, key, normalizer) => {
    const seen = new Map();
    if (!t || t.ix[key] === undefined) return [];
    t.rows.forEach((r, i) => {
      const raw = str(val(r, t, key));
      const k = normalizer ? normalizer(raw) : raw;
      if (!k) return;
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(i + 2);
    });
    return Array.from(seen.entries()).filter(x => x[1].length > 1)
      .map(x => ({ chave: key, ocorrencias: x[1].length, linhas: x[1] }));
  };
  const missingHeaders = (t, keys) => !t ? keys.slice() : keys.filter(k => t.ix[k] === undefined);

  const data = {};
  required.forEach(name => { data[name] = read(operational, name, true); });
  const authUsers = read(auth, 'USUARIOS', true);

  add('OK', 'BASES_SEPARADAS', 'Base operacional e base de autenticação são distintas.', []);
  const expectedCounts = { MOTORISTAS: 40, CAVALOS: 40, CARRETAS: 40, CONJUNTOS: 40 };
  Object.keys(expectedCounts).forEach(name => {
    const actual = report.contagens[name] || 0;
    add(actual === expectedCounts[name] ? 'OK' : 'ALERTA', 'QUANTIDADE_' + name,
      name + ': ' + actual + ' registro(s); esperado(s) para homologação: ' + expectedCounts[name] + '.', []);
  });

  const drivers = data.MOTORISTAS, horses = data.CAVALOS, trailers = data.CARRETAS, sets = data.CONJUNTOS;
  const headerRequirements = {
    MOTORISTAS: ['ID','STATUS','NOME_COMPLETO','CPF','CNH_NUMERO','CNH_VALIDADE'],
    CAVALOS: ['ID','STATUS','PLACA'],
    CARRETAS: ['ID','STATUS','PLACA'],
    CONJUNTOS: ['ID','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','CAPACIDADE_UTIL_TONELADAS'],
    DOCUMENTOS: ['ID_DOCUMENTO','STATUS','TIPO_DOCUMENTO','ENTIDADE','ID_EXTERNO','DATA_VALIDADE'],
    OPERACOES: ['ID','STATUS','DATA_OPERACAO','TOTAL_VIAGENS_PREVISTAS'],
    PARTICIPACAO_OPERACOES: ['ID','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','EXPIRA_EM','ORIGEM_OFERTA'],
    MOVIMENTACOES_OPERACAO: ['ID','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','QUANTIDADE_VIAGENS'],
    DISPONIBILIDADE_DIARIA: ['ID','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE'],
    FILA_MOTORISTAS: ['ID','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA'],
    EVENTOS_ESCALA: ['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','OFERTA_ID'],
    ENTRADA_OPERACOES_IA: ['ID','STATUS_INTERPRETACAO']
  };
  Object.keys(headerRequirements).forEach(name => {
    const absent = missingHeaders(data[name], headerRequirements[name]);
    add(absent.length ? 'CRITICO' : 'OK', 'CABECALHOS_' + name,
      absent.length ? 'Cabeçalhos necessários ausentes em ' + name + '.' : 'Cabeçalhos essenciais presentes em ' + name + '.',
      absent);
  });

  const cpfDuplicates = duplicates(drivers, 'CPF', digits);
  const horsePlateDuplicates = duplicates(horses, 'PLACA', norm);
  const trailerPlateDuplicates = duplicates(trailers, 'PLACA', norm);
  const allPlates = [];
  [horses, trailers].forEach(t => {
    if (t && t.ix.PLACA !== undefined) t.rows.forEach((r, i) => {
      const plate = norm(val(r, t, 'PLACA'));
      if (plate) allPlates.push({ placa: plate, linha: i + 2 });
    });
  });
  const plateMap = new Map();
  allPlates.forEach(x => { if (!plateMap.has(x.placa)) plateMap.set(x.placa, []); plateMap.get(x.placa).push(x.linha); });
  const crossPlateDuplicates = Array.from(plateMap.entries()).filter(x => x[1].length > 1)
    .map(x => ({ placa: x[0], linhas: x[1] }));
  add(cpfDuplicates.length ? 'CRITICO' : 'OK', 'CPF_DUPLICADO',
    cpfDuplicates.length ? 'Há CPFs repetidos em MOTORISTAS.' : 'Não há CPF duplicado nos cadastros de motoristas.',
    cpfDuplicates.map(x => ({ ocorrencias: x.ocorrencias, linhas: x.linhas })));
  add(crossPlateDuplicates.length ? 'CRITICO' : 'OK', 'PLACA_DUPLICADA',
    crossPlateDuplicates.length ? 'Há placas repetidas entre cavalos e/ou carretas.' : 'Não há placas duplicadas entre cavalos e carretas.',
    crossPlateDuplicates);

  const driverById = mapById(drivers), horseById = mapById(horses), trailerById = mapById(trailers), setById = mapById(sets);
  const active = v => ['ATIVO','APTO','REGULAR'].includes(norm(v));
  const linkIssues = [], equipmentUse = new Map(), fakeActive = [];
  if (sets) sets.rows.forEach((r, i) => {
    if (!active(val(r, sets, 'STATUS'))) return;
    const setId = str(val(r, sets, 'ID'));
    const driverId = str(val(r, sets, 'MOTORISTA_ID'));
    const horseId = str(val(r, sets, 'CAVALO_ID'));
    const middleId = str(val(r, sets, 'CARRETA_MEIO_ID'));
    const rearId = str(val(r, sets, 'CARRETA_FINAL_ID'));
    const marker = [setId, driverId, horseId, middleId, rearId].join(' ').toUpperCase();
    if (/TESTE|FICTICIO|FICTÍCIO|EXAMPLE\.INVALID|NAO USAR|NÃO USAR/.test(marker)) fakeActive.push('linha ' + (i + 2));
    [['MOTORISTA', driverId, driverById], ['CAVALO', horseId, horseById], ['CARRETA', middleId, trailerById], ['CARRETA', rearId, trailerById]].forEach(pair => {
      const kind = pair[0], id = pair[1], lookup = pair[2];
      if (!id) { if (kind !== 'CARRETA' || (middleId && rearId)) linkIssues.push('Conjunto na linha ' + (i + 2) + ': vínculo ' + kind + ' vazio.'); return; }
      if (!lookup.has(id)) linkIssues.push('Conjunto na linha ' + (i + 2) + ': referência ' + kind + ' inexistente.');
      else if (!active(val(lookup.get(id), kind === 'MOTORISTA' ? drivers : kind === 'CAVALO' ? horses : trailers, 'STATUS'))) linkIssues.push('Conjunto na linha ' + (i + 2) + ': referência ' + kind + ' não ativa.');
      if (!equipmentUse.has(kind + ':' + id)) equipmentUse.set(kind + ':' + id, []);
      equipmentUse.get(kind + ':' + id).push(setId || ('linha ' + (i + 2)));
    });
    const capacity = Number(String(val(r, sets, 'CAPACIDADE_UTIL_TONELADAS')).replace(',', '.'));
    if (!(capacity > 0)) linkIssues.push('Conjunto na linha ' + (i + 2) + ': capacidade útil ausente ou inválida.');
  });
  const reused = Array.from(equipmentUse.entries()).filter(x => x[1].length > 1)
    .map(x => ({ recurso: x[0].split(':')[0], conjuntos: x[1] }));
  // Cadastros fictícios ativos são esperados e necessários na homologação.
  // Em ambiente explicitamente identificado como homologação, isso é informativo;
  // fora desse ambiente a execução já é bloqueada pela validação de nome acima.
  add(fakeActive.length ? 'INFO' : 'OK', 'CONJUNTOS_FICTICIOS_ATIVOS',
    fakeActive.length
      ? fakeActive.length + ' conjunto(s) ativo(s) identificado(s) como fictício(s), conforme esperado na base de homologação. Não desativar: são dados de teste.'
      : 'Nenhum conjunto ativo foi identificado como fictício.',
    fakeActive);
  add(linkIssues.length ? 'CRITICO' : 'OK', 'VINCULOS_CONJUNTOS',
    linkIssues.length ? 'Há vínculos de conjuntos incompletos ou inválidos.' : 'Vínculos dos conjuntos ativos apontam para cadastros válidos.',
    linkIssues);
  add(reused.length ? 'CRITICO' : 'OK', 'RECURSOS_EM_MULTIPLOS_CONJUNTOS',
    reused.length ? 'Motorista ou equipamento está associado a mais de um conjunto ativo.' : 'Não há recursos repetidos entre conjuntos ativos.',
    reused);

  const doc = data.DOCUMENTOS, docIssues = [], now = new Date();
  if (doc) doc.rows.forEach((r, i) => {
    const status = norm(val(r, doc, 'STATUS'));
    const expiry = val(r, doc, 'DATA_VALIDADE');
    const date = expiry instanceof Date ? expiry : (str(expiry) ? new Date(expiry) : null);
    if (!status) docIssues.push('Documento na linha ' + (i + 2) + ': status ausente.');
    if (date && isFinite(date.getTime()) && date < now && !['VENCIDO','EXPIRADO','INATIVO'].includes(status))
      docIssues.push('Documento na linha ' + (i + 2) + ': validade vencida sem status correspondente.');
    if (date && !isFinite(date.getTime())) docIssues.push('Documento na linha ' + (i + 2) + ': data de validade inválida.');
  });
  add(docIssues.length ? 'ALERTA' : 'OK', 'DOCUMENTOS_E_VALIDADES',
    docIssues.length ? 'Há documentos com status ou validade que exigem conferência.' : 'Não foram encontradas inconsistências básicas de status/validade documental.',
    docIssues);

  const ops = data.OPERACOES, parts = data.PARTICIPACAO_OPERACOES, moves = data.MOVIMENTACOES_OPERACAO;
  const opById = mapById(ops), partById = mapById(parts), operationIssues = [], partIssues = [], moveIssues = [];
  if (ops) ops.rows.forEach((r, i) => {
    const id = str(val(r, ops, 'ID'));
    const planned = Number(String(val(r, ops, 'TOTAL_VIAGENS_PREVISTAS')).replace(',', '.'));
    if (!id) operationIssues.push('Operação na linha ' + (i + 2) + ': ID ausente.');
    if (!Number.isInteger(planned) || planned < 1) operationIssues.push('Operação na linha ' + (i + 2) + ': total de viagens previsto inválido.');
  });
  const activeDriverOps = new Map(), activeSetOps = new Map();
  if (parts) parts.rows.forEach((r, i) => {
    const opId = str(val(r, parts, 'OPERACAO_ID')), setId = str(val(r, parts, 'CONJUNTO_ID'));
    const driverId = str(val(r, parts, 'MOTORISTA_ID')), status = norm(val(r, parts, 'STATUS_PARTICIPACAO'));
    const origin = norm(val(r, parts, 'ORIGEM_OFERTA'));
    if (!opById.has(opId)) partIssues.push('Participação na linha ' + (i + 2) + ': operação inexistente.');
    if (!setById.has(setId)) partIssues.push('Participação na linha ' + (i + 2) + ': conjunto inexistente.');
    if (!driverById.has(driverId)) partIssues.push('Participação na linha ' + (i + 2) + ': motorista inexistente.');
    if (setById.has(setId) && str(val(setById.get(setId), sets, 'MOTORISTA_ID')) !== driverId)
      partIssues.push('Participação na linha ' + (i + 2) + ': motorista diverge do motorista vinculado ao conjunto.');
    if (['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(status)) {
      if (driverId) { if (!activeDriverOps.has(driverId)) activeDriverOps.set(driverId, []); activeDriverOps.get(driverId).push(opId); }
      if (setId) { if (!activeSetOps.has(setId)) activeSetOps.set(setId, []); activeSetOps.get(setId).push(opId); }
    }
    if (origin === 'FILA_AUTOMATICA' && status === 'OFERTADA') {
      const raw = val(r, parts, 'EXPIRA_EM'), expiry = raw instanceof Date ? raw : new Date(raw);
      if (!isFinite(expiry.getTime())) partIssues.push('Oferta automática na linha ' + (i + 2) + ': expiração ausente/inválida.');
      else if (expiry <= now) partIssues.push('Oferta automática na linha ' + (i + 2) + ': continua OFERTADA após expirar.');
    }
  });
  const duplicateActive = [];
  [ ['MOTORISTA', activeDriverOps], ['CONJUNTO', activeSetOps] ].forEach(pair => {
    pair[1].forEach((operations, id) => {
      const unique = Array.from(new Set(operations));
      if (unique.length > 1) duplicateActive.push(pair[0] + ' associado a múltiplas operações: ' + id);
    });
  });
  add(operationIssues.length ? 'ALERTA' : 'OK', 'OPERACOES', operationIssues.length ? 'Há operações sem ID ou quantidade de viagens válida.' : 'Operações possuem identificadores e quantidade de viagens válida.', operationIssues);
  add(partIssues.length ? 'ALERTA' : 'OK', 'PARTICIPACOES_E_OFERTAS', partIssues.length ? 'Há participações/ofertas com referências ou prazos inconsistentes.' : 'Participações e ofertas possuem referências e prazos consistentes.', partIssues);
  add(duplicateActive.length ? 'CRITICO' : 'OK', 'PARTICIPACOES_SIMULTANEAS', duplicateActive.length ? 'Motoristas ou conjuntos aparecem em mais de uma operação ativa.' : 'Não há motoristas/conjuntos em operações simultâneas.', duplicateActive);

  if (moves) moves.rows.forEach((r, i) => {
    const opId = str(val(r, moves, 'OPERACAO_ID'));
    const partId = str(val(r, moves, 'PARTICIPACAO_ID'));
    const setId = str(val(r, moves, 'CONJUNTO_ID'));
    if (!opById.has(opId)) moveIssues.push('Movimentação na linha ' + (i + 2) + ': operação inexistente.');
    if (!partById.has(partId)) moveIssues.push('Movimentação na linha ' + (i + 2) + ': participação inexistente.');
    if (partById.has(partId) && str(val(partById.get(partId), parts, 'OPERACAO_ID')) !== opId)
      moveIssues.push('Movimentação na linha ' + (i + 2) + ': operação diverge da participação.');
    if (setId && !setById.has(setId)) moveIssues.push('Movimentação na linha ' + (i + 2) + ': conjunto inexistente.');
    const tonnes = Number(String(val(r, moves, 'TONELADAS')).replace(',', '.'));
    if (str(val(r, moves, 'TONELADAS')) && (!isFinite(tonnes) || tonnes < 0))
      moveIssues.push('Movimentação na linha ' + (i + 2) + ': toneladas inválidas.');
  });
  add(moveIssues.length ? 'ALERTA' : 'OK', 'MOVIMENTACOES', moveIssues.length ? 'Há movimentações com referências ou quantidades inválidas.' : 'Movimentações apontam para operações e participações existentes.', moveIssues);

  const availability = data.DISPONIBILIDADE_DIARIA, availabilityIssues = [], seenAvailability = new Set();
  if (availability) availability.rows.forEach((r, i) => {
    const driverId = str(val(r, availability, 'MOTORISTA_ID'));
    const date = val(r, availability, 'DATA_OPERACAO');
    const status = norm(val(r, availability, 'STATUS_DISPONIBILIDADE'));
    const key = str(date instanceof Date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') : date) + '|' + driverId;
    if (!driverById.has(driverId)) availabilityIssues.push('Disponibilidade na linha ' + (i + 2) + ': motorista inexistente.');
    if (!str(date)) availabilityIssues.push('Disponibilidade na linha ' + (i + 2) + ': data ausente.');
    if (seenAvailability.has(key)) availabilityIssues.push('Disponibilidade duplicada na linha ' + (i + 2) + '.');
    seenAvailability.add(key);
    if (!['DISPONIVEL','INDISPONIVEL'].includes(status)) availabilityIssues.push('Disponibilidade na linha ' + (i + 2) + ': status inválido.');
  });
  add(availabilityIssues.length ? 'ALERTA' : 'OK', 'DISPONIBILIDADE', availabilityIssues.length ? 'Há registros de disponibilidade inconsistentes.' : 'Registros de disponibilidade possuem motorista, data e status válidos.', availabilityIssues);

  const queue = data.FILA_MOTORISTAS, queueIssues = [], queueDrivers = new Set();
  if (queue) queue.rows.forEach((r, i) => {
    const driverId = str(val(r, queue, 'MOTORISTA_ID')), setId = str(val(r, queue, 'CONJUNTO_ID'));
    if (!driverById.has(driverId)) queueIssues.push('Fila na linha ' + (i + 2) + ': motorista inexistente.');
    if (setId && !setById.has(setId)) queueIssues.push('Fila na linha ' + (i + 2) + ': conjunto inexistente.');
    if (driverId && queueDrivers.has(driverId)) queueIssues.push('Fila contém motorista duplicado na linha ' + (i + 2) + '.');
    if (driverId) queueDrivers.add(driverId);
  });
  add(queueIssues.length ? 'ALERTA' : 'OK', 'FILA_MOTORISTAS', queueIssues.length ? 'Há inconsistências na fila de motoristas.' : 'Fila sem referências inválidas ou motoristas duplicados.', queueIssues);

  const eventIssues = [], events = data.EVENTOS_ESCALA;
  if (events) events.rows.forEach((r, i) => {
    const opId = str(val(r, events, 'OPERACAO_ID'));
    const driverId = str(val(r, events, 'MOTORISTA_ID'));
    const setId = str(val(r, events, 'CONJUNTO_ID'));
    if (opId && !opById.has(opId)) eventIssues.push('Evento na linha ' + (i + 2) + ': operação inexistente.');
    if (driverId && !driverById.has(driverId)) eventIssues.push('Evento na linha ' + (i + 2) + ': motorista inexistente.');
    if (setId && !setById.has(setId)) eventIssues.push('Evento na linha ' + (i + 2) + ': conjunto inexistente.');
  });
  add(eventIssues.length ? 'ALERTA' : 'OK', 'EVENTOS_ESCALA', eventIssues.length ? 'Há eventos com referências inexistentes.' : 'Eventos possuem referências válidas.', eventIssues);

  const ia = data.ENTRADA_OPERACOES_IA, iaIssues = [];
  if (ia) ia.rows.forEach((r, i) => {
    const status = norm(val(r, ia, 'STATUS_INTERPRETACAO'));
    const opId = str(val(r, ia, 'OPERACAO_ID'));
    if (['PROCESSADO','CONCLUIDO','CONCLUÍDO'].includes(status) && opId && !opById.has(opId))
      iaIssues.push('Entrada IA na linha ' + (i + 2) + ': operação vinculada inexistente.');
  });
  add(iaIssues.length ? 'ALERTA' : 'OK', 'ENTRADA_OPERACOES_IA', iaIssues.length ? 'Há entradas processadas sem operação correspondente.' : 'Entradas processadas não apontam para operações inexistentes.', iaIssues);

  const userIssues = [];
  if (authUsers) {
    const userRequired = ['ID','LOGIN','PERFIL','ATIVO','MOTORISTA_ID'];
    const absent = missingHeaders(authUsers, userRequired);
    if (absent.length) userIssues.push('Cabeçalhos ausentes em USUARIOS: ' + absent.join(', '));
    else {
      const logins = new Set(), accountDrivers = new Set();
      authUsers.rows.forEach((r, i) => {
        const profile = norm(val(r, authUsers, 'PERFIL'));
        const login = norm(val(r, authUsers, 'LOGIN'));
        const driverId = str(val(r, authUsers, 'MOTORISTA_ID'));
        if (login && logins.has(login)) userIssues.push('Login duplicado em USUARIOS na linha ' + (i + 2) + '.');
        if (login) logins.add(login);
        if (profile === 'MOTORISTA' && driverId) {
          if (!driverById.has(driverId)) userIssues.push('Conta de motorista na linha ' + (i + 2) + ': cadastro vinculado inexistente.');
          if (accountDrivers.has(driverId)) userIssues.push('Mais de uma conta vinculada ao mesmo motorista (linha ' + (i + 2) + ').');
          accountDrivers.add(driverId);
        }
      });
    }
  }
  add(userIssues.length ? 'ALERTA' : 'OK', 'BASE_AUTENTICACAO', userIssues.length ? 'Há inconsistências na base de autenticação ou nos vínculos das contas.' : 'Base de autenticação separada; estrutura e vínculos básicos de usuários conferidos.', userIssues);

  const triggerHandlers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  report.gatilhos = triggerHandlers.map(handler => ({ handler: handler }));
  const queueTriggerCount = triggerHandlers.filter(h => h === 'FT_processarFilasConvocacaoAutomatica').length;
  add(queueTriggerCount > 1 ? 'ALERTA' : 'INFO', 'GATILHO_FILA_AUTOMATICA',
    queueTriggerCount > 1 ? 'Há gatilhos duplicados para o motor de convocação.' :
    queueTriggerCount === 1 ? 'Existe um gatilho do motor de convocação.' :
    'Não há gatilho permanente do motor de convocação. O motor cria esse gatilho ao iniciar uma convocação; isso não é falha se não houver fila ativa.',
    []);
  const expiryTriggerCount = triggerHandlers.filter(h => h === 'processarOfertasExpiradasSistema_').length;
  add(expiryTriggerCount > 1 ? 'ALERTA' : 'INFO', 'GATILHO_EXPIRACAO',
    expiryTriggerCount > 1 ? 'Há gatilhos duplicados de expiração.' :
    expiryTriggerCount === 1 ? 'Existe gatilho para processar ofertas expiradas.' :
    'Não foi encontrado gatilho separado processarOfertasExpiradasSistema_.',
    []);

  const queueRaw = props.getProperty('FT_AUTO_QUEUES_V1') || '';
  if (queueRaw) {
    try {
      const persisted = JSON.parse(queueRaw);
      const keys = Object.keys(persisted || {});
      const statuses = {};
      keys.forEach(k => {
        const status = norm(persisted[k] && persisted[k].status || 'SEM_STATUS') || 'SEM_STATUS';
        statuses[status] = (statuses[status] || 0) + 1;
      });
      report.filasPersistidas = { quantidade: keys.length, porStatus: statuses };
      add('OK', 'ESTADO_FILAS_PERSISTIDAS', 'Estado persistido das filas foi lido e o JSON é válido.', []);
    } catch (e) {
      report.filasPersistidas = { quantidade: null, erro: 'JSON_INVALIDO' };
      add('CRITICO', 'ESTADO_FILAS_INVALIDO', 'A propriedade FT_AUTO_QUEUES_V1 não contém JSON válido.', []);
    }
  } else {
    report.filasPersistidas = { quantidade: 0, porStatus: {} };
    add('INFO', 'ESTADO_FILAS_VAZIO', 'Não há estado persistido de filas automáticas.', []);
  }

  report.resumo.totalVerificacoes = report.verificacoes.length;
  report.resumo.aprovadas = report.resumo.aprovados;
  report.aprovadoParaProximaEtapa = report.resumo.criticos === 0 && report.resumo.alertas === 0;
  Logger.log('FULLTIME_AUDITORIA_INTEGRIDADE_HOMOLOGACAO: ' + JSON.stringify(report));
  return report;
}


/**
 * AUDITORIA FUNCIONAL DE VÍNCULOS DE LOGIN — SOMENTE LEITURA.
 * Não grava, cria, exclui nem altera dados. O relatório não expõe logins,
 * e-mails, nomes, IDs, CPFs, hashes ou tokens.
 * Executar: FT_AUDITAR_VINCULOS_LOGIN_HOMOLOGACAO_20261118()
 */
function FT_AUDITAR_VINCULOS_LOGIN_HOMOLOGACAO_20261118() {
  const props = PropertiesService.getScriptProperties();
  const registryId = String(props.getProperty('FT_REGISTRY_DATABASE_ID') || '').trim();
  const authId = String(props.getProperty('FT_DATABASE_ID') || '').trim();
  if (!registryId || !authId || registryId === authId)
    throw new Error('SEGURANÇA: propriedades das bases ausentes ou iguais. Nenhuma alteração realizada.');
  const registry = SpreadsheetApp.openById(registryId);
  const auth = SpreadsheetApp.openById(authId);
  if (!/HOMOLOGACAO/i.test(registry.getName()) || !/HOMOLOGACAO/i.test(auth.getName()))
    throw new Error('SEGURANÇA: auditoria permitida somente nas duas bases identificadas como HOMOLOGACAO.');
  const read = (ss, name) => {
    const sh = ss.getSheetByName(name);
    if (!sh || sh.getLastRow() < 1 || sh.getLastColumn() < 1)
      throw new Error('Guia obrigatória ausente ou vazia: ' + name);
    const grid = sh.getDataRange().getValues();
    const ix = {};
    (grid[0] || []).forEach((v, i) => {
      const k = String(v == null ? '' : v).trim().toUpperCase();
      if (k && ix[k] === undefined) ix[k] = i;
    });
    return { rows: grid.slice(1).filter(r => r.some(v => v !== '' && v !== null)), ix: ix };
  };
  const drivers = read(registry, 'MOTORISTAS');
  const users = read(auth, 'USUARIOS');
  const requiredDriver = ['ID','NOME_COMPLETO','EMAIL','STATUS'];
  const requiredUser = ['ID','LOGIN','EMAIL','NOME','PERFIL','ATIVO','SALT','HASH_SENHA','MOTORISTA_ID'];
  const missingDriver = requiredDriver.filter(k => drivers.ix[k] === undefined);
  const missingUser = requiredUser.filter(k => users.ix[k] === undefined);
  if (missingDriver.length || missingUser.length)
    throw new Error('Cabeçalhos ausentes. MOTORISTAS=' + missingDriver.join(',') + '; USUARIOS=' + missingUser.join(','));
  const s = v => String(v == null ? '' : v).trim();
  const lower = v => s(v).toLowerCase();
  const drows = drivers.rows.filter(r => s(r[drivers.ix.ID]));
  const urows = users.rows.filter(r => s(r[users.ix.ID]));
  const motorAccounts = urows.filter(r => s(r[users.ix.PERFIL]).toUpperCase() === 'MOTORISTA');
  const driverById = new Map();
  const duplicateDriverIds = new Set();
  drows.forEach(r => {
    const id = s(r[drivers.ix.ID]);
    if (driverById.has(id)) duplicateDriverIds.add(id);
    else driverById.set(id, r);
  });
  const userIds = new Set(), logins = new Set(), emails = new Set();
  let duplicateUserIds = 0, duplicateLogins = 0, duplicateEmails = 0;
  urows.forEach(r => {
    const id = s(r[users.ix.ID]), login = lower(r[users.ix.LOGIN]), email = lower(r[users.ix.EMAIL]);
    if (id && userIds.has(id)) duplicateUserIds++; else if (id) userIds.add(id);
    if (login && logins.has(login)) duplicateLogins++; else if (login) logins.add(login);
    if (email && emails.has(email)) duplicateEmails++; else if (email) emails.add(email);
  });
  const accountsPerDriver = new Map();
  let inactiveAccounts = 0, missingDriverLinks = 0, emailMismatches = 0;
  let nonTestEmails = 0, missingCredentials = 0, invalidDriverStatus = 0;
  motorAccounts.forEach(a => {
    const driverId = s(a[users.ix.MOTORISTA_ID]);
    if (!driverId || !driverById.has(driverId)) { missingDriverLinks++; return; }
    if (!accountsPerDriver.has(driverId)) accountsPerDriver.set(driverId, []);
    accountsPerDriver.get(driverId).push(a);
    if (a[users.ix.ATIVO] !== true) inactiveAccounts++;
    const driver = driverById.get(driverId);
    const userEmail = lower(a[users.ix.EMAIL]);
    const driverEmail = lower(driver[drivers.ix.EMAIL]);
    const login = lower(a[users.ix.LOGIN]);
    if (!userEmail || userEmail !== driverEmail || login !== userEmail) emailMismatches++;
    if (!/@(?:example|fulltime)\.test$/i.test(userEmail)) nonTestEmails++;
    if (!s(a[users.ix.SALT]) || !s(a[users.ix.HASH_SENHA])) missingCredentials++;
    if (!['ATIVO','APTO','REGULAR'].includes(s(driver[drivers.ix.STATUS]).toUpperCase())) invalidDriverStatus++;
  });
  let driversWithoutAccount = 0, driversWithMultipleAccounts = 0;
  drows.forEach(r => {
    const list = accountsPerDriver.get(s(r[drivers.ix.ID])) || [];
    if (!list.length) driversWithoutAccount++;
    if (list.length > 1) driversWithMultipleAccounts++;
  });
  const accountIds = new Set(motorAccounts.map(r => s(r[users.ix.MOTORISTA_ID])).filter(Boolean));
  const accountForUnknownDriver = Array.from(accountIds).filter(id => !driverById.has(id)).length;
  const checks = {
    quantidadeMotoristas: drows.length === 40,
    quantidadeContasMotoristas: motorAccounts.length === 40,
    idsMotoristasUnicos: duplicateDriverIds.size === 0,
    contasSemVinculoInexistente: missingDriverLinks === 0 && accountForUnknownDriver === 0,
    umUsuarioPorMotorista: driversWithoutAccount === 0 && driversWithMultipleAccounts === 0,
    contasAtivas: inactiveAccounts === 0,
    emailsCorrespondentes: emailMismatches === 0,
    emailsReservadosDeTeste: nonTestEmails === 0,
    credenciaisPresentes: missingCredentials === 0,
    motoristasAptos: invalidDriverStatus === 0,
    idsUsuariosUnicos: duplicateUserIds === 0,
    loginsUnicos: duplicateLogins === 0,
    emailsUnicos: duplicateEmails === 0
  };
  const failures = Object.keys(checks).filter(k => !checks[k]);
  const result = {
    executadoEm: new Date().toISOString(),
    modo: 'SOMENTE_LEITURA',
    basesSeparadas: registryId !== authId,
    contagens: { motoristas: drows.length, usuariosTotais: urows.length, contasMotoristas: motorAccounts.length },
    verificacoes: checks,
    contagensDeDivergencias: {
      idsMotoristasDuplicados: duplicateDriverIds.size,
      idsUsuariosDuplicados: duplicateUserIds,
      loginsDuplicados: duplicateLogins,
      emailsDuplicados: duplicateEmails,
      contasInativas: inactiveAccounts,
      vinculosAusentesOuInvalidos: missingDriverLinks + accountForUnknownDriver,
      motoristasSemConta: driversWithoutAccount,
      motoristasComMultiplasContas: driversWithMultipleAccounts,
      emailsDivergentes: emailMismatches,
      emailsForaDominioTeste: nonTestEmails,
      credenciaisAusentes: missingCredentials,
      motoristasNaoAptos: invalidDriverStatus
    },
    aprovado: failures.length === 0,
    verificacoesReprovadas: failures
  };
  Logger.log('FULLTIME_AUDITORIA_VINCULOS_LOGIN: ' + JSON.stringify(result));
  return result;
}
