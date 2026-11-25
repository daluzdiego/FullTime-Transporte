/**
 * FULL TIME — Portal seguro do motorista
 *
 * Responsabilidades:
 * - Expor somente os dados vinculados ao motorista autenticado.
 * - Registrar aceite/recusa sem ativar prematuramente a escala.
 * - Permitir confirmação administrativa de ofertas aceitas.
 * - Exibir histórico e contadores consistentes com a planilha.
 *
 * Este arquivo não cria guias nem cabeçalhos durante consultas.
 * Migrações estruturais permanecem nos módulos próprios do projeto.
 */

/* ========================================================================== *
 * UTILITÁRIOS PRIVADOS DO PORTAL
 * ========================================================================== */

function FT_MOTORISTA_normalizar_(value) {
  return String(value == null ? '' : value)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9_]/g, '');
}

function FT_MOTORISTA_texto_(value, maxLength) {
  const text = String(value == null ? '' : value).trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function FT_MOTORISTA_headerMap_(sheet) {
  if (!sheet) throw new Error('Guia não informada para leitura dos cabeçalhos.');
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error('A guia ' + sheet.getName() + ' não possui cabeçalhos.');
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    const key = FT_MOTORISTA_normalizar_(header);
    if (key && map[key] === undefined) map[key] = index;
  });
  return map;
}

function FT_MOTORISTA_exigirCabecalhos_(map, required, sheetName) {
  const missing = required.filter(key => map[FT_MOTORISTA_normalizar_(key)] === undefined);
  if (missing.length) {
    throw new Error(
      'A guia ' + sheetName + ' não possui os cabeçalhos obrigatórios: ' +
      missing.join(', ') + '. Nenhum registro foi alterado.'
    );
  }
}

function FT_MOTORISTA_valor_(row, map, key, fallback) {
  const index = map[FT_MOTORISTA_normalizar_(key)];
  if (index === undefined || row[index] === undefined || row[index] === null || row[index] === '') {
    return fallback === undefined ? '' : fallback;
  }
  return row[index];
}

function FT_MOTORISTA_dataIso_(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (value instanceof Date) {
    return isFinite(value.getTime()) ? value.toISOString() : '';
  }
  const parsed = new Date(value);
  return isFinite(parsed.getTime()) ? parsed.toISOString() : String(value);
}

function FT_MOTORISTA_horaChave_(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (value instanceof Date) return isFinite(value.getTime()) ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm') : '';
  if (typeof value === 'number' && isFinite(value)) {
    const minutes = Math.round((((value % 1) + 1) % 1) * 1440);
    return String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }
  const text = String(value).trim();
  const match = text.match(/(?:^|\s|T)(\d{1,2}):(\d{2})(?::\d{2})?/);
  return match ? String(Number(match[1])).padStart(2, '0') + ':' + match[2] : text;
}

function FT_MOTORISTA_dataChave_(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (value instanceof Date) {
    return isFinite(value.getTime())
      ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : '';
  }

  const text = String(value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    return match[1] + '-' + String(match[2]).padStart(2, '0') + '-' +
      String(match[3]).padStart(2, '0');
  }

  match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (match) {
    return match[3] + '-' + String(match[2]).padStart(2, '0') + '-' +
      String(match[1]).padStart(2, '0');
  }

  const parsed = new Date(text);
  return isFinite(parsed.getTime())
    ? Utilities.formatDate(parsed, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : '';
}

function FT_MOTORISTA_serializar_(value) {
  if (value instanceof Date) return FT_MOTORISTA_dataIso_(value);
  if (Array.isArray(value)) return value.map(FT_MOTORISTA_serializar_);
  if (value && typeof value === 'object') {
    const output = {};
    Object.keys(value).forEach(key => {
      output[key] = FT_MOTORISTA_serializar_(value[key]);
    });
    return output;
  }
  return value === undefined || value === null ? '' : value;
}

function FT_MOTORISTA_exigirDependencias_(names) {
  const available = {
    FT_CONV_appendEvent_: typeof FT_CONV_appendEvent_ === 'function',
    auditar_: typeof auditar_ === 'function',
    FT_colocarMotoristaNoFinalDaFila_: typeof FT_colocarMotoristaNoFinalDaFila_ === 'function'
  };
  const missing = names.filter(name => available[name] !== true);
  if (missing.length) {
    throw new Error('Dependência do sistema indisponível: ' + missing.join(', ') + '. Nenhum registro foi alterado.');
  }
}

function exigirMotorista_(session) {
  if (!session || String(session.perfil || '').trim().toUpperCase() !== 'MOTORISTA') {
    throw new Error('Acesso restrito ao portal do motorista.');
  }

  const motoristaId = FT_MOTORISTA_texto_(session.motoristaId, 120);
  if (!motoristaId) {
    throw new Error('Esta conta ainda não está vinculada a um cadastro de motorista.');
  }
  return motoristaId;
}

/* ========================================================================== *
 * CONSULTA DO PORTAL DO MOTORISTA — SOMENTE LEITURA
 * ========================================================================== */

function obterPortalMotoristaFullTime(token) {
  const session = obterSessao_(token);
  const motoristaId = exigirMotorista_(session);

  const participationsSheet = getSheet_('PARTICIPACAO_OPERACOES');
  const participationMap = FT_MOTORISTA_headerMap_(participationsSheet);
  FT_MOTORISTA_exigirCabecalhos_(
    participationMap,
    ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'STATUS_PARTICIPACAO', 'CONJUNTO_ID'],
    'PARTICIPACAO_OPERACOES'
  );

  const participationRows = participationsSheet.getDataRange().getValues();
  const ownRows = participationRows.slice(1).filter(row =>
    FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, participationMap, 'MOTORISTA_ID')) === motoristaId
  );

  const driver = listarRegistros_('MOTORISTAS').find(item =>
    FT_MOTORISTA_texto_(item.id) === motoristaId
  );
  if (!driver) {
    throw new Error(
      'O usuário está vinculado ao motorista ' + motoristaId +
      ', mas esse ID não foi encontrado na guia MOTORISTAS. Corrija MOTORISTA_ID na guia USUARIOS.'
    );
  }

  const driverFields = driver.camposPorNome || {};
  const driverName = FT_MOTORISTA_texto_(
    driverFields.NOME_COMPLETO || driver.nome || session.nome || 'Motorista'
  );

  const operationsSheet = getSheet_('OPERACOES');
  const operationMap = FT_MOTORISTA_headerMap_(operationsSheet);
  FT_MOTORISTA_exigirCabecalhos_(operationMap, ['ID', 'STATUS'], 'OPERACOES');

  const operationRows = operationsSheet.getDataRange().getValues();
  const operationsById = Object.create(null);
  let destinationsByOperation = Object.create(null);
  try {
    const destinationSheet = getSheet_('DESTINOS_OPERACAO');
    if (destinationSheet && destinationSheet.getLastRow() > 1) {
      const destinationMap = FT_MOTORISTA_headerMap_(destinationSheet);
      const destinationRows = destinationSheet.getDataRange().getValues().slice(1);
      destinationRows.forEach(row => {
        const operationId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, destinationMap, 'OPERACAO_ID'));
        if (!operationId) return;
        (destinationsByOperation[operationId] = destinationsByOperation[operationId] || []).push({
          id: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, destinationMap, 'ID')),
          ordem: Number(FT_MOTORISTA_valor_(row, destinationMap, 'ORDEM_ENTREGA', 0)) || 0,
          cliente: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, destinationMap, 'CLIENTE_DESTINO')),
          local: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, destinationMap, 'LOCAL_ENTREGA')),
          cidadeUf: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, destinationMap, 'CIDADE_UF')),
          volume: Number(FT_MOTORISTA_valor_(row, destinationMap, 'VOLUME_PREVISTO_TONELADAS', 0)) || 0
        });
      });
      Object.keys(destinationsByOperation).forEach(id => destinationsByOperation[id].sort((a,b) => a.ordem-b.ordem));
    }
  } catch (destinationError) {
    console.warn('FULL TIME — destinos detalhados indisponíveis: ' + String(destinationError && destinationError.message || destinationError));
  }

  operationRows.slice(1).forEach(row => {
    const id = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'ID'));
    if (!id) return;

    const rawDate = FT_MOTORISTA_valor_(row, operationMap, 'DATA_OPERACAO');
    operationsById[id] = {
      id: id,
      status: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'STATUS')),
      data: rawDate,
      dataKey: FT_MOTORISTA_dataChave_(rawDate),
      cliente: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'CLIENTE')),
      nome: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'NOME_OPERACAO')),
      origem: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'ORIGEM')),
      destino: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'DESTINO')),
      destinos: destinationsByOperation[id] || [],
      produto: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'PRODUTO_SERVICO')),
      distanciaKm: FT_MOTORISTA_valor_(row, operationMap, 'DISTANCIA_KM'),
      dataEntrega: FT_MOTORISTA_valor_(row, operationMap, 'DATA_ENTREGA'),
      janelaInicio: FT_MOTORISTA_horaChave_(FT_MOTORISTA_valor_(row, operationMap, 'JANELA_INICIO')),
      janelaFim: FT_MOTORISTA_horaChave_(FT_MOTORISTA_valor_(row, operationMap, 'JANELA_FIM')),
      tempoEstimadoHoras: FT_MOTORISTA_valor_(row, operationMap, 'TEMPO_ESTIMADO_HORAS'),
      volume: Number(FT_MOTORISTA_valor_(row, operationMap, 'VOLUME_TOTAL_TONELADAS', 0)) || 0
    };
  });

  const now = Date.now();
  const offers = ownRows.map(row => {
    const offerId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, participationMap, 'ID'));
    const operationId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, participationMap, 'OPERACAO_ID'));
    const operation = operationsById[operationId] || {};

    const snapshotDate = FT_MOTORISTA_dataChave_(
      FT_MOTORISTA_valor_(row, participationMap, 'DATA_OPERACAO_OFERTA')
    );
    const snapshotStart = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(row, participationMap, 'HORARIO_OPERACAO_OFERTA')
    );
    const snapshotEnd = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(row, participationMap, 'JANELA_FIM_OFERTA')
    );

    const hasScheduleSnapshot = !!snapshotDate;
    const scheduleChanged = hasScheduleSnapshot && (
      snapshotDate !== FT_MOTORISTA_texto_(operation.dataKey) ||
      FT_MOTORISTA_horaChave_(snapshotStart) !== FT_MOTORISTA_horaChave_(operation.janelaInicio) ||
      FT_MOTORISTA_horaChave_(snapshotEnd) !== FT_MOTORISTA_horaChave_(operation.janelaFim)
    );

    const rawExpiry = FT_MOTORISTA_valor_(row, participationMap, 'EXPIRA_EM');
    const expiryDate = rawExpiry instanceof Date ? rawExpiry : new Date(rawExpiry);
    const expiryTime = expiryDate.getTime();

    let status = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(row, participationMap, 'STATUS_PARTICIPACAO')
    ).toUpperCase();

    // A consulta não grava status: apenas apresenta a situação calculada.
    if (status === 'OFERTADA' && scheduleChanged) {
      status = 'CANCELADA_REPROGRAMACAO';
    } else if (status === 'OFERTADA' && (!isFinite(expiryTime) || expiryTime <= now)) {
      status = 'NAO_RESPONDEU';
    }

    const createdAt = FT_MOTORISTA_valor_(row, participationMap, 'CRIADO_EM');
    const offeredAt = FT_MOTORISTA_valor_(row, participationMap, 'OFERTADA_EM') || createdAt;
    const respondedAt = FT_MOTORISTA_valor_(row, participationMap, 'RESPONDIDA_EM');

    return {
      id: offerId,
      ofertaId: offerId,
      participacaoId: offerId,
      motoristaId: motoristaId,
      operacaoId: operationId,
      status: status,
      criadaEm: FT_MOTORISTA_dataIso_(createdAt),
      ofertadaEm: FT_MOTORISTA_dataIso_(offeredAt),
      respondidaEm: FT_MOTORISTA_dataIso_(respondedAt),
      expiraEm: FT_MOTORISTA_dataIso_(rawExpiry),
      expirada: status === 'NAO_RESPONDEU' || status === 'EXPIRADA',
      agendaAlterada: status === 'CANCELADA_REPROGRAMACAO',
      observacoes: FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(row, participationMap, 'OBSERVACOES_OFERTA') ||
        FT_MOTORISTA_valor_(row, participationMap, 'MOTIVO')
      ),
      operacao: operation,
      conjuntoId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, participationMap, 'CONJUNTO_ID')),
      eventos: []
    };
  }).filter(offer => offer.id);

  // Histórico por motorista. A guia pode não existir em bases legadas; nesse caso,
  // as ofertas continuam disponíveis e o diagnóstico informa ausência de eventos.
  let driverEvents = [];
  try {
    const eventsSheet = getSheet_('EVENTOS_ESCALA');
    if (eventsSheet.getLastRow() > 1 && eventsSheet.getLastColumn() > 0) {
      const eventMap = FT_MOTORISTA_headerMap_(eventsSheet);
      const eventRows = eventsSheet.getDataRange().getValues().slice(1);

      driverEvents = eventRows
        .filter(row =>
          FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'MOTORISTA_ID')) === motoristaId
        )
        .map(row => {
          const operationId = FT_MOTORISTA_texto_(
            FT_MOTORISTA_valor_(row, eventMap, 'OPERACAO_ID')
          );
          return {
            id: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'ID')),
            ofertaId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'OFERTA_ID')),
            tipo: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'TIPO_EVENTO')),
            dataHora: FT_MOTORISTA_dataIso_(FT_MOTORISTA_valor_(row, eventMap, 'DATA_HORA')),
            motivo: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'MOTIVO')),
            operacaoId: operationId,
            conjuntoId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, eventMap, 'CONJUNTO_ID')),
            operacao: operationsById[operationId] || {}
          };
        })
        .sort((a, b) => new Date(a.dataHora || 0).getTime() - new Date(b.dataHora || 0).getTime());
    }
  } catch (error) {
    console.warn('FULL TIME — histórico de eventos indisponível: ' + String(error && error.message || error));
    driverEvents = [];
  }

  const eventsByOffer = Object.create(null);
  driverEvents.forEach(event => {
    if (!event.ofertaId) return;
    if (!eventsByOffer[event.ofertaId]) eventsByOffer[event.ofertaId] = [];
    eventsByOffer[event.ofertaId].push(event);
  });

  offers.forEach(offer => {
    offer.eventos = eventsByOffer[offer.id] || [];
  });

  offers.sort((a, b) =>
    new Date(b.ofertadaEm || b.criadaEm || 0).getTime() -
    new Date(a.ofertadaEm || a.criadaEm || 0).getTime()
  );

  const counts = {
    total: offers.length,
    pendentes: offers.filter(offer => offer.status === 'OFERTADA' && !offer.expirada).length,
    aceitas: offers.filter(offer => offer.status === 'ACEITA' || offer.status === 'ATIVO').length,
    recusadas: offers.filter(offer => offer.status === 'RECUSADA').length,
    expiradas: offers.filter(offer =>
      offer.status === 'NAO_RESPONDEU' || offer.status === 'EXPIRADA'
    ).length,
    canceladas: offers.filter(offer =>
      offer.status === 'CANCELADA' ||
      offer.status === 'CANCELADA_REPROGRAMACAO' ||
      offer.status === 'CANCELADA_OPERACAO'
    ).length
  };

  const offerIds = Object.create(null);
  offers.forEach(offer => { offerIds[offer.id] = true; });
  const orphanEvents = driverEvents.filter(event =>
    !event.ofertaId || !offerIds[event.ofertaId]
  );

  const payload = {
    user: {
      nome: driverName,
      email: FT_MOTORISTA_texto_(session.email),
      perfil: 'MOTORISTA'
    },
    motoristaId: motoristaId,
    hoje: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    diagnosticoVinculo: {
      motoristaId: motoristaId,
      nomeCadastro: driverName,
      ofertasVinculadas: ownRows.length,
      ofertasPendentes: counts.pendentes,
      eventosHistoricos: driverEvents.length
    },
    ofertas: offers,
    eventos: orphanEvents,
    counts: counts
  };

  return FT_MOTORISTA_serializar_(payload);
}

/** Alias de compatibilidade com versões antigas do portal. */
function obterPortalMotoristaFullTimeV2(token) {
  return obterPortalMotoristaFullTime(token);
}

/* ========================================================================== *
 * RESPOSTA DO MOTORISTA — ACEITE OU RECUSA
 * ========================================================================== */

function responderOfertaMotoristaFullTime(token, ofertaId, resposta, observacao) {
  const session = obterSessao_(token);
  const motoristaId = exigirMotorista_(session);
  const offerId = FT_MOTORISTA_texto_(ofertaId, 120);
  const decision = FT_MOTORISTA_texto_(resposta).toUpperCase();
  const note = FT_MOTORISTA_texto_(observacao, 500);

  if (!offerId || !['ACEITA', 'RECUSADA'].includes(decision)) {
    throw new Error('Resposta inválida. Selecione aceitar ou recusar uma convocação.');
  }

  FT_MOTORISTA_exigirDependencias_([
    'FT_CONV_appendEvent_',
    'auditar_',
    'FT_colocarMotoristaNoFinalDaFila_'
  ]);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_('PARTICIPACAO_OPERACOES');
    const map = FT_MOTORISTA_headerMap_(sheet);
    FT_MOTORISTA_exigirCabecalhos_(
      map,
      ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'CONJUNTO_ID', 'STATUS_PARTICIPACAO', 'EXPIRA_EM'],
      'PARTICIPACAO_OPERACOES'
    );

    const rows = sheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < rows.length; index++) {
      if (FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(rows[index], map, 'ID')) === offerId) {
        matches.push({ index: index, row: rows[index] });
      }
    }

    if (matches.length !== 1) {
      throw new Error(matches.length
        ? 'Integridade comprometida: existe mais de uma oferta com este identificador.'
        : 'Oferta não encontrada.'
      );
    }

    const match = matches[0];
    const rowNumber = match.index + 1;
    const record = match.row;
    const ownerId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'MOTORISTA_ID'));

    if (ownerId !== motoristaId) {
      throw new Error('Oferta não encontrada para este motorista.');
    }

    const currentStatus = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(record, map, 'STATUS_PARTICIPACAO')
    ).toUpperCase();

    if (currentStatus !== 'OFERTADA') {
      throw new Error('Esta oferta já foi respondida ou não está mais pendente.');
    }

    const rawExpiry = FT_MOTORISTA_valor_(record, map, 'EXPIRA_EM');
    const expiry = rawExpiry instanceof Date ? rawExpiry : new Date(rawExpiry);
    const expiryTime = expiry.getTime();
    const operationId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'OPERACAO_ID'));
    const conjuntoId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'CONJUNTO_ID'));
    const now = new Date();

    if (!isFinite(expiryTime) || expiryTime <= now.getTime()) {
      sheet.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('NAO_RESPONDEU');
      if (map.RESPONDIDA_EM !== undefined) {
        sheet.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(now);
      }

      FT_colocarMotoristaNoFinalDaFila_(motoristaId, 'não respondeu dentro do prazo da convocação');
      FT_CONV_appendEvent_({
        tipo: 'OFERTA_EXPIRADA',
        operacaoId: operationId,
        motoristaId: motoristaId,
        conjuntoId: conjuntoId,
        anterior: 'OFERTADA',
        nova: 'NAO_RESPONDEU',
        motivo: 'Prazo de resposta encerrado; motorista reposicionado ao final da fila.',
        autor: session.email || session.login || 'PORTAL_MOTORISTA',
        ofertaId: offerId
      });
      auditar_(
        session,
        'OFERTA_EXPIRADA',
        'OPERACAO',
        operationId,
        offerId + ' expirou antes da resposta do motorista.'
      );

      return {
        ok: false,
        ofertaId: offerId,
        status: 'NAO_RESPONDEU',
        message: 'O prazo desta oferta expirou. O sistema registrou a ausência de resposta.'
      };
    }

    if (decision === 'ACEITA') {
      if (!operationId || !ownerId || !conjuntoId) {
        throw new Error('A oferta está incompleta: operação, motorista e conjunto precisam estar vinculados.');
      }

      const operationsSheet = getSheet_('OPERACOES');
      const operationMap = FT_MOTORISTA_headerMap_(operationsSheet);
      FT_MOTORISTA_exigirCabecalhos_(operationMap, ['ID', 'STATUS'], 'OPERACOES');
      const operationRows = operationsSheet.getDataRange().getValues();
      const operationMatches = operationRows.slice(1).filter(operationRow =>
        FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(operationRow, operationMap, 'ID')) === operationId
      );
      if (operationMatches.length !== 1) {
        throw new Error(operationMatches.length
          ? 'Integridade comprometida: a operação vinculada possui identificadores duplicados.'
          : 'A operação desta convocação não foi encontrada.'
        );
      }

      const operation = operationMatches[0];
      const operationStatus = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(operation, operationMap, 'STATUS')
      ).toUpperCase();
      if (!['ABERTA', 'EM_ANDAMENTO'].includes(operationStatus)) {
        throw new Error('Esta operação não está mais aberta para aceite de convocações.');
      }

      const snapshotDate = FT_MOTORISTA_dataChave_(
        FT_MOTORISTA_valor_(record, map, 'DATA_OPERACAO_OFERTA')
      );
      if (snapshotDate) {
        const currentDate = FT_MOTORISTA_dataChave_(
          FT_MOTORISTA_valor_(operation, operationMap, 'DATA_OPERACAO')
        );
        const snapshotStart = FT_MOTORISTA_texto_(
          FT_MOTORISTA_valor_(record, map, 'HORARIO_OPERACAO_OFERTA')
        );
        const snapshotEnd = FT_MOTORISTA_texto_(
          FT_MOTORISTA_valor_(record, map, 'JANELA_FIM_OFERTA')
        );
        const currentStart = FT_MOTORISTA_texto_(
          FT_MOTORISTA_valor_(operation, operationMap, 'JANELA_INICIO')
        );
        const currentEnd = FT_MOTORISTA_texto_(
          FT_MOTORISTA_valor_(operation, operationMap, 'JANELA_FIM')
        );
        if (snapshotDate !== currentDate || snapshotStart !== currentStart || snapshotEnd !== currentEnd) {
          throw new Error('A agenda desta operação foi alterada. Esta convocação não pode mais ser aceita; solicite uma nova oferta.');
        }
      }

      const blockingStatuses = new Set(['OFERTADA', 'ACEITA', 'ATIVO', 'SAIU', 'EM_VIAGEM']);
      const conflict = rows.slice(1).some((other, index) => {
        if (index === match.index - 1) return false;
        const otherStatus = FT_MOTORISTA_texto_(
          FT_MOTORISTA_valor_(other, map, 'STATUS_PARTICIPACAO')
        ).toUpperCase();
        if (!blockingStatuses.has(otherStatus)) return false;
        if (otherStatus === 'OFERTADA') {
          const otherRawExpiry = FT_MOTORISTA_valor_(other, map, 'EXPIRA_EM');
          const otherExpiry = otherRawExpiry instanceof Date
            ? otherRawExpiry.getTime()
            : new Date(otherRawExpiry).getTime();
          if (!isFinite(otherExpiry) || otherExpiry <= Date.now()) return false;
        }
        const otherDriverId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(other, map, 'MOTORISTA_ID'));
        const otherSetId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(other, map, 'CONJUNTO_ID'));
        return otherDriverId === ownerId || otherSetId === conjuntoId;
      });
      if (conflict) {
        throw new Error('Este motorista ou conjunto já possui outra oferta pendente ou escala em andamento.');
      }
    }

    const newStatus = decision === 'ACEITA' ? 'ACEITA' : 'RECUSADA';
    sheet.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue(newStatus);

    if (map.RESPONDIDA_EM !== undefined) {
      sheet.getRange(rowNumber, map.RESPONDIDA_EM + 1).setValue(now);
    }
    if (note && map.MOTIVO !== undefined) {
      sheet.getRange(rowNumber, map.MOTIVO + 1).setValue(note);
    }

    // ACEITA ainda não significa ATIVO. A ativação é uma ação administrativa posterior.
    if (decision === 'RECUSADA') {
      FT_colocarMotoristaNoFinalDaFila_(motoristaId, 'recusou a convocação');
    }

    FT_CONV_appendEvent_({
      tipo: decision === 'ACEITA' ? 'OFERTA_ACEITA' : 'OFERTA_RECUSADA',
      operacaoId: operationId,
      motoristaId: motoristaId,
      conjuntoId: conjuntoId,
      anterior: 'OFERTADA',
      nova: newStatus,
      motivo: note || (decision === 'ACEITA'
        ? 'Motorista aceitou a convocação; aguardando confirmação administrativa.'
        : 'Motorista recusou a convocação; reposicionado ao final da fila.'),
      autor: session.email || session.login || 'PORTAL_MOTORISTA',
      ofertaId: offerId
    });

    auditar_(
      session,
      'RESPOSTA_OFERTA_MOTORISTA',
      'OPERACAO',
      operationId,
      offerId + ' -> ' + newStatus
    );

    return {
      ok: true,
      ofertaId: offerId,
      status: newStatus,
      message: decision === 'ACEITA'
        ? 'Aceite registrado. Aguarde a confirmação da escala pela administração.'
        : 'Recusa registrada. O motorista voltou ao final da fila de convocação.'
    };
  } finally {
    lock.releaseLock();
  }
}

/* ========================================================================== *
 * CONFIRMAÇÃO ADMINISTRATIVA DO ACEITE
 * ========================================================================== */

function confirmarAceiteOfertaAdminFullTime(token, ofertaId) {
  const session = obterSessao_(token);
  exigirAdmin_(session);

  const offerId = FT_MOTORISTA_texto_(ofertaId, 120);
  if (!offerId) throw new Error('Identificador da oferta não informado.');

  FT_MOTORISTA_exigirDependencias_([
    'FT_CONV_appendEvent_',
    'auditar_'
  ]);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const sheet = getSheet_('PARTICIPACAO_OPERACOES');
    const map = FT_MOTORISTA_headerMap_(sheet);
    FT_MOTORISTA_exigirCabecalhos_(
      map,
      ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'CONJUNTO_ID', 'STATUS_PARTICIPACAO', 'EXPIRA_EM'],
      'PARTICIPACAO_OPERACOES'
    );

    const rows = sheet.getDataRange().getValues();
    const matches = [];
    for (let index = 1; index < rows.length; index++) {
      if (FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(rows[index], map, 'ID')) === offerId) {
        matches.push({ index: index, row: rows[index] });
      }
    }

    if (matches.length !== 1) {
      throw new Error(matches.length
        ? 'Integridade comprometida: existe mais de uma oferta com este identificador.'
        : 'Oferta não encontrada.'
      );
    }

    const match = matches[0];
    const rowIndex = match.index;
    const rowNumber = rowIndex + 1;
    const record = match.row;
    const status = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(record, map, 'STATUS_PARTICIPACAO')
    ).toUpperCase();

    if (status !== 'ACEITA') {
      throw new Error('Somente ofertas aceitas pelo motorista podem ser confirmadas.');
    }

    const rawExpiry = FT_MOTORISTA_valor_(record, map, 'EXPIRA_EM');
    const expiry = rawExpiry instanceof Date ? rawExpiry : new Date(rawExpiry);
    if (!isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) {
      throw new Error('O prazo da oferta expirou. Não é possível ativar esta escala.');
    }

    const operationId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'OPERACAO_ID'));
    const driverId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'MOTORISTA_ID'));
    const conjuntoId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(record, map, 'CONJUNTO_ID'));

    const operationsSheet = getSheet_('OPERACOES');
    const operationMap = FT_MOTORISTA_headerMap_(operationsSheet);
    FT_MOTORISTA_exigirCabecalhos_(operationMap, ['ID', 'STATUS'], 'OPERACOES');
    const operationRows = operationsSheet.getDataRange().getValues();
    const operationMatches = operationRows.slice(1).filter(row =>
      FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'ID')) === operationId
    );

    if (operationMatches.length !== 1) {
      throw new Error(operationMatches.length
        ? 'Integridade comprometida: a operação possui identificadores duplicados.'
        : 'Operação vinculada à oferta não encontrada.'
      );
    }

    const operation = operationMatches[0];
    const operationStatus = FT_MOTORISTA_texto_(
      FT_MOTORISTA_valor_(operation, operationMap, 'STATUS')
    ).toUpperCase();

    if (!['ABERTA', 'EM_ANDAMENTO'].includes(operationStatus)) {
      throw new Error('A operação não está aberta para ativação de escalas.');
    }

    // Se a oferta possui fotografia da agenda, ela deve continuar igual à operação.
    const snapshotDate = FT_MOTORISTA_dataChave_(
      FT_MOTORISTA_valor_(record, map, 'DATA_OPERACAO_OFERTA')
    );
    if (snapshotDate) {
      const currentDate = FT_MOTORISTA_dataChave_(
        FT_MOTORISTA_valor_(operation, operationMap, 'DATA_OPERACAO')
      );
      const snapshotStart = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(record, map, 'HORARIO_OPERACAO_OFERTA')
      );
      const snapshotEnd = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(record, map, 'JANELA_FIM_OFERTA')
      );
      const currentStart = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(operation, operationMap, 'JANELA_INICIO')
      );
      const currentEnd = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(operation, operationMap, 'JANELA_FIM')
      );

      if (snapshotDate !== currentDate || snapshotStart !== currentStart || snapshotEnd !== currentEnd) {
        throw new Error(
          'A agenda da operação foi alterada depois do envio desta oferta. ' +
          'Não confirme esta escala; faça uma nova convocação com a agenda atual.'
        );
      }
    }

    const blockingStatuses = new Set(['OFERTADA', 'ACEITA', 'ATIVO', 'SAIU', 'EM_VIAGEM']);
    const conflict = rows.slice(1).some((other, index) => {
      if (index === rowIndex - 1) return false;

      const otherStatus = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(other, map, 'STATUS_PARTICIPACAO')
      ).toUpperCase();
      if (!blockingStatuses.has(otherStatus)) return false;

      const otherDriver = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(other, map, 'MOTORISTA_ID')
      );
      const otherSet = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(other, map, 'CONJUNTO_ID')
      );

      // Ofertas pendentes vencidas não bloqueiam outro motorista/conjunto.
      if (otherStatus === 'OFERTADA') {
        const otherExpiryRaw = FT_MOTORISTA_valor_(other, map, 'EXPIRA_EM');
        const otherExpiry = otherExpiryRaw instanceof Date
          ? otherExpiryRaw.getTime()
          : new Date(otherExpiryRaw).getTime();
        if (!isFinite(otherExpiry) || otherExpiry <= Date.now()) return false;
      }

      return (driverId && otherDriver === driverId) || (conjuntoId && otherSet === conjuntoId);
    });

    if (conflict) {
      throw new Error('O motorista ou conjunto já possui outra oferta ou escala em andamento.');
    }

    const now = new Date();
    sheet.getRange(rowNumber, map.STATUS_PARTICIPACAO + 1).setValue('ATIVO');

    if (map.INICIO_EM !== undefined) {
      sheet.getRange(rowNumber, map.INICIO_EM + 1).setValue(now);
    }
    if (map.REGISTRADO_POR !== undefined) {
      sheet.getRange(rowNumber, map.REGISTRADO_POR + 1).setValue(
        session.email || session.login || 'ADMIN'
      );
    }

    FT_CONV_appendEvent_({
      tipo: 'ESCALA_CONFIRMADA',
      operacaoId: operationId,
      motoristaId: driverId,
      conjuntoId: conjuntoId,
      anterior: 'ACEITA',
      nova: 'ATIVO',
      motivo: 'Aceite do motorista confirmado pela administração.',
      autor: session.email || session.login || 'ADMIN',
      ofertaId: offerId
    });

    auditar_(
      session,
      'CONFIRMAR_ESCALA',
      'OPERACAO',
      operationId,
      offerId + ' ativada após aceite do motorista.'
    );

    return {
      ok: true,
      ofertaId: offerId,
      status: 'ATIVO',
      message: 'Escala confirmada. O conjunto está ativo na operação.'
    };
  } finally {
    lock.releaseLock();
  }
}

/* ========================================================================== *
 * LISTA ADMINISTRATIVA DE ACEITES PENDENTES DE CONFIRMAÇÃO
 * ========================================================================== */

function listarOfertasAceitasAdminFullTime(token) {
  const session = obterSessao_(token);
  exigirAdmin_(session);

  const sheet = getSheet_('PARTICIPACAO_OPERACOES');
  const map = FT_MOTORISTA_headerMap_(sheet);
  FT_MOTORISTA_exigirCabecalhos_(
    map,
    ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'CONJUNTO_ID', 'STATUS_PARTICIPACAO'],
    'PARTICIPACAO_OPERACOES'
  );

  const rows = sheet.getDataRange().getValues().slice(1);
  const operationsSheet = getSheet_('OPERACOES');
  const operationMap = FT_MOTORISTA_headerMap_(operationsSheet);
  FT_MOTORISTA_exigirCabecalhos_(operationMap, ['ID'], 'OPERACOES');

  const operations = Object.create(null);
  operationsSheet.getDataRange().getValues().slice(1).forEach(row => {
    const id = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'ID'));
    if (!id) return;
    operations[id] = {
      nome: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'NOME_OPERACAO')),
      origem: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'ORIGEM')),
      destino: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, operationMap, 'DESTINO'))
    };
  });

  const drivers = listarRegistros_('MOTORISTAS');
  const driverNames = Object.create(null);
  drivers.forEach(driver => {
    driverNames[FT_MOTORISTA_texto_(driver.id)] = FT_MOTORISTA_texto_(
      (driver.camposPorNome || {}).NOME_COMPLETO || driver.nome
    );
  });

  return rows
    .filter(row =>
      FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'STATUS_PARTICIPACAO')).toUpperCase() === 'ACEITA'
    )
    .map(row => {
      const id = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'ID'));
      const operationId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'OPERACAO_ID'));
      const driverId = FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'MOTORISTA_ID'));
      const operation = operations[operationId] || {};

      return {
        id: id,
        ofertaId: id,
        motoristaId: driverId,
        motorista: driverNames[driverId] || driverId,
        operacaoId: operationId,
        operacao: operation.nome || operationId,
        origem: operation.origem || '',
        destino: operation.destino || '',
        conjuntoId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'CONJUNTO_ID')),
        aceitaEm: FT_MOTORISTA_dataIso_(
          FT_MOTORISTA_valor_(row, map, 'RESPONDIDA_EM')
        )
      };
    });
}

/* ========================================================================== *
 * DIAGNÓSTICO DE DIVERGÊNCIA — SOMENTE LEITURA
 * ========================================================================== */

/**
 * Diagnóstico dos motoristas fictícios 023, 024, 025 e 039.
 * Não cria, cancela, altera ou exclui ofertas, filas ou registros.
 */
function FT_DIAGNOSTICAR_DIVERGENCIA_CONVOCACOES_20261113() {
  const testDriverIds = ['023', '024', '025', '039'].map(number =>
    'FT-TESTE-20261111-MOT-' + number
  );

  const sheet = getSheet_('PARTICIPACAO_OPERACOES');
  const map = FT_MOTORISTA_headerMap_(sheet);
  FT_MOTORISTA_exigirCabecalhos_(
    map,
    ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'STATUS_PARTICIPACAO', 'CONJUNTO_ID'],
    'PARTICIPACAO_OPERACOES'
  );

  const rows = sheet.getDataRange().getValues().slice(1);
  const details = testDriverIds.map(driverId => {
    const own = rows.filter(row =>
      FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'MOTORISTA_ID')) === driverId
    );
    const statuses = Object.create(null);

    own.forEach(row => {
      const status = FT_MOTORISTA_texto_(
        FT_MOTORISTA_valor_(row, map, 'STATUS_PARTICIPACAO')
      ).toUpperCase();
      statuses[status] = (statuses[status] || 0) + 1;
    });

    return {
      motoristaId: driverId,
      participacoes: own.length,
      statuses: statuses,
      ultimas: own.slice(-5).reverse().map(row => ({
        ofertaId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'ID')),
        operacaoId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'OPERACAO_ID')),
        conjuntoId: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'CONJUNTO_ID')),
        status: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'STATUS_PARTICIPACAO')),
        origem: FT_MOTORISTA_texto_(FT_MOTORISTA_valor_(row, map, 'ORIGEM_OFERTA')),
        expiraEm: FT_MOTORISTA_dataIso_(FT_MOTORISTA_valor_(row, map, 'EXPIRA_EM'))
      }))
    };
  });

  let queues = {};
  if (typeof FT_AUTO_READ_ === 'function') {
    queues = FT_AUTO_READ_() || {};
  }

  const queueSummary = Object.keys(queues).map(operationId => {
    const queue = queues[operationId] || {};
    return {
      operacaoId: operationId,
      status: queue.status || '',
      cursor: Number(queue.cursor || 0),
      vagas: Number(queue.vagas || 0),
      pendentes: Array.isArray(queue.pendentes) ? queue.pendentes : [],
      aceitas: Number(queue.aceitas || 0)
    };
  });

  const result = {
    modo: 'SOMENTE_LEITURA',
    totalParticipacoes: rows.length,
    motoristas: details,
    filasAutomaticas: queueSummary
  };

  Logger.log('FULL TIME — DIVERGENCIA CONVOCACOES: ' + JSON.stringify(result));
  return result;
}
