/**
 * FULL TIME — DIAGNÓSTICO INTEGRAL DE BASES E GATILHOS
 * Versão: 2026-11-11
 *
 * SOMENTE LEITURA:
 * - Não cria, limpa, formata, renomeia ou grava em nenhuma planilha.
 * - Não lê dados pessoais; compara apenas chaves ID_EXTERNO/ID_DOCUMENTO.
 * - Consulta somente as guias explicitamente listadas.
 * - NÃO acessa, abre, enumera ou consulta CAVALOS-BRUNO.
 *
 * Execute FT_AUDIT_20261111_executar() no Apps Script do Full Time.
 * Envie o JSON completo do log para análise.
 */
const FT_AUDIT_20261111_CFG = Object.freeze({
  SOURCE_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  OPERATIONAL_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  ENTITIES: [
    { name: 'MOTORISTAS', source: 'MOTORISTAS', mirror: 'FT_CADASTRO_BRUNO_MOTORISTAS', operational: 'MOTORISTAS', key: 'ID_EXTERNO' },
    { name: 'CAVALOS', source: 'CAVALOS', mirror: 'FT_CADASTRO_BRUNO_CAVALOS', operational: 'CAVALOS', key: 'ID_EXTERNO' },
    { name: 'CARRETAS', source: 'CARRETAS', mirror: 'FT_CADASTRO_BRUNO_CARRETAS', operational: 'CARRETAS', key: 'ID_EXTERNO' },
    { name: 'CONJUNTOS', source: 'CONJUNTOS', mirror: 'FT_CADASTRO_BRUNO_CONJUNTOS', operational: 'CONJUNTOS', key: 'ID_EXTERNO' },
    { name: 'DOCUMENTOS', source: 'CONTROLE_DOCUMENTAL', mirror: 'FT_CADASTRO_BRUNO_DOCUMENTOS', operational: '', key: 'ID_DOCUMENTO' }
  ],
  SOURCE_EXTRA: ['ENTRADA_OPERACOES_IA', 'OPERACOES', 'PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'],
  OPERATIONAL_EXTRA: [
    'ENTRADA_OPERACOES_IA', 'OPERACOES', 'PARTICIPACAO_OPERACOES',
    'MOVIMENTACOES_OPERACAO', 'LOCAIS', 'REGRAS_OPERACIONAIS',
    'DISPONIBILIDADE_DIARIA', 'FILA_MOTORISTAS', 'EVENTOS_ESCALA',
    'PLANILHABRUNO_AUDITORIA_SINCRONIZACAO', 'FT_STATUS_CADASTROS'
  ],
  AUTH_EXTRA: ['USUARIOS', 'AUDITORIA', 'FT_STATUS_CADASTROS', 'TOKENS_RECUPERACAO']
});

function FT_AUDIT_20261111_norm_(value) {
  return String(value == null ? '' : value).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function FT_AUDIT_20261111_inspectSheet_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh) return { exists: false, name: name };
  const width = sh.getLastColumn();
  const headers = width
    ? sh.getRange(1, 1, 1, width).getDisplayValues()[0].map(function(v) { return String(v || '').trim(); })
    : [];
  return {
    exists: true,
    name: name,
    sheetId: sh.getSheetId(),
    lastRow: sh.getLastRow(),
    lastColumn: width,
    dataRows: Math.max(0, sh.getLastRow() - 1),
    headers: headers
  };
}

function FT_AUDIT_20261111_keySet_(ss, sheetName, keyName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return { exists: false, count: 0, blank: 0, duplicates: [], ids: [] };
  const width = sh.getLastColumn();
  if (!width || sh.getLastRow() < 2) return { exists: true, count: 0, blank: 0, duplicates: [], ids: [] };
  const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0];
  const wanted = FT_AUDIT_20261111_norm_(keyName);
  let col = -1;
  headers.forEach(function(h, i) {
    if (FT_AUDIT_20261111_norm_(h) === wanted && col < 0) col = i + 1;
  });
  if (col < 0) return { exists: true, keyMissing: true, count: 0, blank: 0, duplicates: [], ids: [] };
  const values = sh.getRange(2, col, sh.getLastRow() - 1, 1).getDisplayValues();
  const counts = {};
  let blank = 0;
  values.forEach(function(row) {
    const id = String(row[0] || '').trim();
    if (!id) return blank++;
    counts[id] = (counts[id] || 0) + 1;
  });
  const ids = Object.keys(counts);
  return {
    exists: true,
    keyMissing: false,
    count: values.length - blank,
    blank: blank,
    duplicates: ids.filter(function(id) { return counts[id] > 1; }).slice(0, 20),
    ids: ids
  };
}

function FT_AUDIT_20261111_compare_(source, mirror, operational) {
  const sourceIds = source.ids || [];
  const mirrorIds = mirror.ids || [];
  const operationalIds = operational && operational.ids ? operational.ids : [];
  const mirrorSet = {};
  const sourceSet = {};
  const operationalSet = {};
  mirrorIds.forEach(function(id) { mirrorSet[id] = true; });
  sourceIds.forEach(function(id) { sourceSet[id] = true; });
  operationalIds.forEach(function(id) { operationalSet[id] = true; });
  return {
    sourceCount: source.count || 0,
    mirrorCount: mirror.count || 0,
    operationalCount: operational ? operational.count || 0 : null,
    sourceMissingInMirror: sourceIds.filter(function(id) { return !mirrorSet[id]; }).slice(0, 20),
    mirrorNotInSource: mirrorIds.filter(function(id) { return !sourceSet[id]; }).slice(0, 20),
    sourceMissingInOperational: operational ? sourceIds.filter(function(id) { return !operationalSet[id]; }).slice(0, 20) : [],
    operationalNotInSource: operational ? operationalIds.filter(function(id) { return !sourceSet[id]; }).slice(0, 20) : [],
    duplicateSourceIds: source.duplicates || [],
    duplicateMirrorIds: mirror.duplicates || [],
    duplicateOperationalIds: operational ? operational.duplicates || [] : []
  };
}

function FT_AUDIT_20261111_executar() {
  const props = PropertiesService.getScriptProperties();
  const propertyNames = [
    'FT_DATABASE_ID', 'FT_REGISTRY_DATABASE_ID',
    'FT_BRUNO_SOURCE_ID', 'FT_BRUNO_OPERATIONAL_ID'
  ];
  const propertyValues = {};
  propertyNames.forEach(function(name) { propertyValues[name] = props.getProperty(name) || ''; });

  const source = SpreadsheetApp.openById(FT_AUDIT_20261111_CFG.SOURCE_ID);
  const operational = SpreadsheetApp.openById(FT_AUDIT_20261111_CFG.OPERATIONAL_ID);
  const authId = propertyValues.FT_DATABASE_ID;
  const auth = authId ? SpreadsheetApp.openById(authId) : null;

  const report = {
    audit: 'FULL_TIME_READ_ONLY_AUDIT_2026_11_11',
    mode: 'SOMENTE_LEITURA',
    generatedAt: new Date().toISOString(),
    protectedSheet: 'CAVALOS-BRUNO — NÃO ACESSADA',
    expectedIds: {
      source: FT_AUDIT_20261111_CFG.SOURCE_ID,
      operational: FT_AUDIT_20261111_CFG.OPERATIONAL_ID
    },
    scriptProperties: propertyValues,
    propertyChecks: {
      registryPointsToOperational: propertyValues.FT_REGISTRY_DATABASE_ID === FT_AUDIT_20261111_CFG.OPERATIONAL_ID,
      brunoSourceMatches: propertyValues.FT_BRUNO_SOURCE_ID === FT_AUDIT_20261111_CFG.SOURCE_ID,
      brunoOperationalMatches: propertyValues.FT_BRUNO_OPERATIONAL_ID === FT_AUDIT_20261111_CFG.OPERATIONAL_ID,
      authDatabaseConfigured: !!authId,
      authDatabaseIsSeparate: !!authId && authId !== FT_AUDIT_20261111_CFG.OPERATIONAL_ID
    },
    sourceSheets: [],
    operationalSheets: [],
    authSheets: [],
    entityComparisons: [],
    triggers: [],
    warnings: []
  };

  FT_AUDIT_20261111_CFG.ENTITIES.forEach(function(entity) {
    const sourceKey = FT_AUDIT_20261111_keySet_(source, entity.source, entity.key);
    const mirrorKey = FT_AUDIT_20261111_keySet_(operational, entity.mirror, entity.key);
    const operationalKey = entity.operational
      ? FT_AUDIT_20261111_keySet_(operational, entity.operational, entity.key)
      : null;
    report.entityComparisons.push({
      entity: entity.name,
      sourceSheet: entity.source,
      mirrorSheet: entity.mirror,
      operationalSheet: entity.operational || null,
      source: { exists: sourceKey.exists, keyMissing: !!sourceKey.keyMissing, count: sourceKey.count, blank: sourceKey.blank, duplicates: sourceKey.duplicates },
      mirror: { exists: mirrorKey.exists, keyMissing: !!mirrorKey.keyMissing, count: mirrorKey.count, blank: mirrorKey.blank, duplicates: mirrorKey.duplicates },
      operational: operationalKey ? { exists: operationalKey.exists, keyMissing: !!operationalKey.keyMissing, count: operationalKey.count, blank: operationalKey.blank, duplicates: operationalKey.duplicates } : null,
      comparison: FT_AUDIT_20261111_compare_(sourceKey, mirrorKey, operationalKey)
    });
  });

  FT_AUDIT_20261111_CFG.SOURCE_EXTRA.forEach(function(name) {
    report.sourceSheets.push(FT_AUDIT_20261111_inspectSheet_(source, name));
  });
  FT_AUDIT_20261111_CFG.ENTITIES.forEach(function(entity) {
    report.sourceSheets.push(FT_AUDIT_20261111_inspectSheet_(source, entity.source));
    report.operationalSheets.push(FT_AUDIT_20261111_inspectSheet_(operational, entity.mirror));
    if (entity.operational) report.operationalSheets.push(FT_AUDIT_20261111_inspectSheet_(operational, entity.operational));
  });
  FT_AUDIT_20261111_CFG.OPERATIONAL_EXTRA.forEach(function(name) {
    report.operationalSheets.push(FT_AUDIT_20261111_inspectSheet_(operational, name));
  });
  if (auth) {
    FT_AUDIT_20261111_CFG.AUTH_EXTRA.forEach(function(name) {
      report.authSheets.push(FT_AUDIT_20261111_inspectSheet_(auth, name));
    });
  }

  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    let sourceId = '';
    try { sourceId = trigger.getTriggerSourceId() || ''; } catch (e) {}
    let eventType = '';
    try { eventType = String(trigger.getEventType()); } catch (e) {}
    let triggerSource = '';
    try { triggerSource = String(trigger.getTriggerSource()); } catch (e) {}
    report.triggers.push({
      handler: trigger.getHandlerFunction(),
      eventType: eventType,
      source: triggerSource,
      sourceId: sourceId,
      uniqueId: trigger.getUniqueId()
    });
  });

  if (propertyValues.FT_REGISTRY_DATABASE_ID !== FT_AUDIT_20261111_CFG.OPERATIONAL_ID) {
    report.warnings.push('FT_REGISTRY_DATABASE_ID ausente ou apontando para outra planilha.');
  }
  if (propertyValues.FT_BRUNO_SOURCE_ID !== FT_AUDIT_20261111_CFG.SOURCE_ID ||
      propertyValues.FT_BRUNO_OPERATIONAL_ID !== FT_AUDIT_20261111_CFG.OPERATIONAL_ID) {
    report.warnings.push('Propriedades da integração Bruno ausentes ou divergentes dos IDs esperados.');
  }
  report.warnings.push('A auditoria não confirma qual versão de código está implantada no Web App; compare os arquivos publicados com a branch fulltime-2.0.');
  report.summary = {
    sourceSpreadsheet: source.getName(),
    operationalSpreadsheet: operational.getName(),
    authSpreadsheet: auth ? auth.getName() : null,
    entityCount: report.entityComparisons.length,
    triggerCount: report.triggers.length,
    readOnly: true
  };

  // Log compacto para evitar truncamento do Registro de execução.
  const compact = {
    audit: report.audit,
    generatedAt: report.generatedAt,
    mode: report.mode,
    propertyChecks: report.propertyChecks,
    source: report.sourceSheets.map(function(s) {
      return {name:s.name, exists:s.exists, dataRows:s.dataRows, columns:s.lastColumn};
    }),
    operational: report.operationalSheets.map(function(s) {
      return {name:s.name, exists:s.exists, dataRows:s.dataRows, columns:s.lastColumn};
    }),
    auth: report.authSheets.map(function(s) {
      return {name:s.name, exists:s.exists, dataRows:s.dataRows, columns:s.lastColumn};
    }),
    comparisons: report.entityComparisons.map(function(e) {
      const x=e.comparison||{};
      return {
        entity:e.entity,
        source:e.source,
        mirror:e.mirror,
        operational:e.operational,
        sourceMissingInMirror:(x.sourceMissingInMirror||[]).length,
        mirrorNotInSource:(x.mirrorNotInSource||[]).length,
        sourceMissingInOperational:(x.sourceMissingInOperational||[]).length,
        operationalNotInSource:(x.operationalNotInSource||[]).length,
        duplicateSource:(x.duplicateSourceIds||[]).length,
        duplicateMirror:(x.duplicateMirrorIds||[]).length,
        duplicateOperational:(x.duplicateOperationalIds||[]).length
      };
    }),
    triggers: report.triggers.map(function(t) {
      return {handler:t.handler,eventType:t.eventType,source:t.source,sourceId:t.sourceId};
    }),
    warnings: report.warnings,
    summary: report.summary,
    note: 'Relatório completo continua disponível no valor de retorno; este log contém somente os indicadores essenciais.'
  };
  Logger.log('FULL TIME — AUDITORIA INTEGRAL RESUMIDA: ' + JSON.stringify(compact));
  return report;
}
