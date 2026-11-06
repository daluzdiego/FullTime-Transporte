/**
 * FULLTIME — Integração com o Ambiente Particular de Cadastros do Cliente.
 *
 * Primeira etapa: vínculo seguro, validação por allowlist e captura durável
 * de alterações da planilha externa. Não importa nem sobrescreve cadastros
 * nesta etapa. A sincronização bidirecional de entidades será habilitada
 * somente após a matriz de propriedade de campos e os testes de conflito.
 *
 * A planilha continua pertencendo ao cliente. O cliente compartilha com a
 * identidade Google que executa este projeto Apps Script, com permissão
 * adequada. Não compartilhar com "qualquer pessoa com o link".
 */

const FT_DRIVE_CLIENTE = Object.freeze({
  PROPERTY_ID: 'FT_DRIVE_CLIENTE_SPREADSHEET_ID',
  QUEUE_SHEET: 'FT_SYNC_DRIVE',
  VERSION: '1.0.0',
  ALLOWED_SHEETS: Object.freeze({
    MOTORISTAS: ['ID_EXTERNO', 'NOME_COMPLETO', 'CPF'],
    CAVALOS: ['ID_EXTERNO', 'PLACA'],
    CARRETAS: ['ID_EXTERNO', 'PLACA'],
    CONJUNTOS: ['ID_EXTERNO'],
    CONTROLE_DOCUMENTAL: ['ID_DOCUMENTO', 'TIPO_REGISTRO', 'TIPO_DOCUMENTO'],
    OPERACOES: ['ID_EXTERNO']
  }),
  QUEUE_HEADERS: [
    'EVENTO_ID', 'CRIADO_EM', 'SPREADSHEET_ID', 'GUIA', 'LINHA',
    'RANGE_A1', 'USUARIO', 'STATUS', 'TENTATIVAS', 'ERRO'
  ]
});

/**
 * Vincula uma planilha que pertence ao cliente.
 * Execute pelo usuário administrador do FullTime após o cliente compartilhar
 * a planilha com a conta Google que executa este Apps Script.
 */
function conectarAmbienteParticularClienteFullTime(token, spreadsheetId) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  const id = String(spreadsheetId || '').trim();
  if (!id) throw new Error('Informe o ID da planilha do cliente.');

  const internalId = getDbId_();
  if (id === internalId) throw new Error('A planilha do cliente não pode ser a própria base operacional do FullTime.');

  // openById também confirma se a identidade executora recebeu acesso.
  const clientSs = SpreadsheetApp.openById(id);
  const validation = ftDriveValidarContratoCliente_(clientSs);
  if (!validation.ok) {
    throw new Error('A planilha não passou na validação: ' + validation.errors.join(' | '));
  }

  const props = PropertiesService.getScriptProperties();
  const previousId = props.getProperty(FT_DRIVE_CLIENTE.PROPERTY_ID);
  if (previousId && previousId !== id) {
    throw new Error('Já existe uma planilha vinculada. Desvincule-a por procedimento administrativo antes de substituir; nenhuma conexão foi alterada.');
  }

  ftDriveGarantirFilaInterna_();
  props.setProperty(FT_DRIVE_CLIENTE.PROPERTY_ID, id);
  ftDriveGarantirGatilho_();
  auditar_(session, 'CONECTAR_DRIVE_CLIENTE', 'INTEGRACAO', id, 'Planilha particular validada; versão ' + FT_DRIVE_CLIENTE.VERSION);

  return {
    ok: true,
    spreadsheetId: id,
    spreadsheetName: clientSs.getName(),
    url: clientSs.getUrl(),
    validation: validation,
    message: 'Planilha vinculada. Nesta etapa, alterações são registradas em fila; a escrita bidirecional ainda depende da homologação do mapeamento e das regras de conflito.'
  };
}

/** Valida somente guias explicitamente permitidas. Nunca enumera guias da planilha. */
function ftDriveValidarContratoCliente_(ss) {
  const errors = [];
  const checked = [];
  Object.keys(FT_DRIVE_CLIENTE.ALLOWED_SHEETS).forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      errors.push('Guia obrigatória ausente: ' + name);
      return;
    }
    const lastCol = sh.getLastColumn();
    if (lastCol < 1) {
      errors.push('Guia sem cabeçalho: ' + name);
      return;
    }
    const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0]
      .map(function(v) { return ftDriveNormHeader_(v); });
    const duplicates = headers.filter(function(v, i) { return v && headers.indexOf(v) !== i; });
    if (duplicates.length) errors.push('Cabeçalho duplicado em ' + name + ': ' + duplicates.join(', '));
    FT_DRIVE_CLIENTE.ALLOWED_SHEETS[name].forEach(function(required) {
      if (headers.indexOf(ftDriveNormHeader_(required)) < 0) {
        errors.push(name + ': campo obrigatório ausente: ' + required);
      }
    });
    checked.push({ sheet: name, columns: lastCol, headersValid: true });
  });
  return { ok: errors.length === 0, checked: checked, errors: errors };
}

function ftDriveNormHeader_(value) {
  return String(value == null ? '' : value).trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
}

/** Gatilho instalável: captura edição feita diretamente no Drive do cliente. */
function ftDriveClienteAoEditar(e) {
  if (!e || !e.source || !e.range) return;
  const expectedId = PropertiesService.getScriptProperties().getProperty(FT_DRIVE_CLIENTE.PROPERTY_ID);
  if (!expectedId || e.source.getId() !== expectedId) return;

  const sheet = e.range.getSheet();
  const name = sheet.getName();
  if (!Object.prototype.hasOwnProperty.call(FT_DRIVE_CLIENTE.ALLOWED_SHEETS, name)) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const queue = ftDriveGetFilaInterna_();
    queue.appendRow([
      Utilities.getUuid(), new Date(), expectedId, name,
      e.range.getRow(), e.range.getA1Notation(),
      Session.getActiveUser().getEmail() || 'USUARIO_NAO_IDENTIFICADO',
      'RECEBIDO', 0, ''
    ]);
  } finally {
    lock.releaseLock();
  }
}

/** Diagnóstico somente leitura da conexão; não percorre guias fora da allowlist. */
function diagnosticarAmbienteParticularClienteFullTime(token) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  const id = PropertiesService.getScriptProperties().getProperty(FT_DRIVE_CLIENTE.PROPERTY_ID);
  if (!id) return { conectado: false, message: 'Nenhuma planilha particular vinculada.' };
  const ss = SpreadsheetApp.openById(id);
  const validation = ftDriveValidarContratoCliente_(ss);
  const queue = ftDriveGetFilaInterna_();
  return {
    conectado: true,
    spreadsheetName: ss.getName(),
    url: ss.getUrl(),
    validation: validation,
    eventosNaFila: Math.max(0, queue.getLastRow() - 1),
    gatilhoInstalado: ftDriveTemGatilho_()
  };
}

function ftDriveGarantirFilaInterna_() {
  const sh = ftDriveGetFilaInterna_();
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, FT_DRIVE_CLIENTE.QUEUE_HEADERS.length)
      .setValues([FT_DRIVE_CLIENTE.QUEUE_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ftDriveGetFilaInterna_() {
  const ss = SpreadsheetApp.openById(getDbId_());
  let sh = ss.getSheetByName(FT_DRIVE_CLIENTE.QUEUE_SHEET);
  if (!sh) sh = ss.insertSheet(FT_DRIVE_CLIENTE.QUEUE_SHEET);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, FT_DRIVE_CLIENTE.QUEUE_HEADERS.length)
      .setValues([FT_DRIVE_CLIENTE.QUEUE_HEADERS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function ftDriveGarantirGatilho_() {
  if (ftDriveTemGatilho_()) return;
  const id = PropertiesService.getScriptProperties().getProperty(FT_DRIVE_CLIENTE.PROPERTY_ID);
  const ss = SpreadsheetApp.openById(id);
  ScriptApp.newTrigger('ftDriveClienteAoEditar').forSpreadsheet(ss).onEdit().create();
}

function ftDriveTemGatilho_() {
  const id = PropertiesService.getScriptProperties().getProperty(FT_DRIVE_CLIENTE.PROPERTY_ID);
  return ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'ftDriveClienteAoEditar' &&
      trigger.getTriggerSourceId() === id;
  });
}
