/**
 * FULL TIME — WhatsApp ticket intake.
 *
 * Configure Script Properties in Apps Script:
 * FT_WA_VERIFY_TOKEN         random secret used by Meta webhook verification
 * FT_WA_ACCESS_TOKEN         Meta WhatsApp Cloud API access token
 * FT_WA_PHONE_NUMBER_ID      phone number ID from Meta
 * FT_WA_GRAPH_VERSION        supported Graph API version enabled for this app (e.g. vXX.0)
 * FT_TICKET_DRIVE_FOLDER_ID  Drive folder ID for original ticket images
 * FT_TICKET_RETENTION_DAYS   approved retention period; do not set until agreed with Full Time
 *
 * Requires Code.gs functions: getSheet_, listarRegistros_ and doGet webhook verification.
 * Images are retained in Drive and logged in the TICKETS tab. OCR is a separate next phase.
 */

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.object !== 'whatsapp_business_account') {
      return ContentService.createTextOutput('IGNORED');
    }

    (body.entry || []).forEach(function(entry) {
      (entry.changes || []).forEach(function(change) {
        const value = change.value || {};
        (value.messages || []).forEach(function(message) {
          try {
            processarMensagemWhatsAppTicket_(message, value.metadata || {});
          } catch (err) {
            console.error('Falha no ticket WhatsApp: ' + err.message);
            registrarErroTicketWhatsApp_(message, err);
          }
        });
      });
    });
    return ContentService.createTextOutput('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook WhatsApp inválido: ' + err.message);
    return ContentService.createTextOutput('EVENT_RECEIVED');
  }
}

function processarMensagemWhatsAppTicket_(message, metadata) {
  if (!message || !message.id || !message.from) return;

  const props = PropertiesService.getScriptProperties();
  const accessToken = props.getProperty('FT_WA_ACCESS_TOKEN');
  const configuredPhoneId = props.getProperty('FT_WA_PHONE_NUMBER_ID');
  const folderId = props.getProperty('FT_TICKET_DRIVE_FOLDER_ID');
  const retentionDays = Number(props.getProperty('FT_TICKET_RETENTION_DAYS') || 0);

  if (!accessToken || !configuredPhoneId || !folderId) {
    throw new Error('Integração incompleta: configure FT_WA_ACCESS_TOKEN, FT_WA_PHONE_NUMBER_ID e FT_TICKET_DRIVE_FOLDER_ID.');
  }
  if (metadata.phone_number_id && String(metadata.phone_number_id) !== String(configuredPhoneId)) {
    throw new Error('O evento veio de um número diferente do número configurado.');
  }

  const sheet = getSheet_('TICKETS');
  if (ticketWhatsAppJaRecebido_(sheet, String(message.id))) return;

  const sender = String(message.from).replace(/\D/g, '');
  const driverId = localizarMotoristaPorTelefoneTicket_(sender);
  const receivedAt = new Date();
  const retentionUntil = retentionDays > 0
    ? new Date(receivedAt.getTime() + retentionDays * 86400000)
    : '';
  const caption = message.image && message.image.caption ? String(message.image.caption) : '';

  if (message.type !== 'image' || !message.image || !message.image.id) {
    sheet.appendRow([
      Utilities.getUuid(), receivedAt, String(message.id), sender, driverId, '',
      'NAO_IDENTIFICADO', '', '', '', '', String(message.type || ''),
      'NAO_E_IMAGEM', '', '', 'Mensagem recebida sem imagem de ticket',
      retentionUntil, JSON.stringify({ text: message.text && message.text.body || '' })
    ]);
    return;
  }

  const mediaId = String(message.image.id);
  const graphVersion = obterVersaoGraphWhatsAppTicket_();
  const mediaResponse = UrlFetchApp.fetch(
    'https://graph.facebook.com/' + graphVersion + '/' + encodeURIComponent(mediaId),
    { method: 'get', headers: { Authorization: 'Bearer ' + accessToken }, muteHttpExceptions: true }
  );
  if (mediaResponse.getResponseCode() < 200 || mediaResponse.getResponseCode() >= 300) {
    throw new Error('A Meta não forneceu os metadados da imagem (HTTP ' + mediaResponse.getResponseCode() + ').');
  }

  const media = JSON.parse(mediaResponse.getContentText());
  if (!media.url || !media.mime_type) throw new Error('A resposta da Meta não contém URL e tipo de mídia.');
  if (['image/jpeg', 'image/png', 'image/webp'].indexOf(media.mime_type) === -1) {
    throw new Error('Tipo de imagem não permitido: ' + media.mime_type);
  }

  const download = UrlFetchApp.fetch(media.url, {
    method: 'get', headers: { Authorization: 'Bearer ' + accessToken }, muteHttpExceptions: true
  });
  if (download.getResponseCode() < 200 || download.getResponseCode() >= 300) {
    throw new Error('Falha ao baixar a imagem do WhatsApp (HTTP ' + download.getResponseCode() + ').');
  }

  const ext = media.mime_type === 'image/png' ? 'png' : (media.mime_type === 'image/webp' ? 'webp' : 'jpg');
  const filename = 'FT_TICKET_' +
    Utilities.formatDate(receivedAt, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss') +
    '_' + sender + '.' + ext;
  const blob = download.getBlob().setName(filename);
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  const ticketType = inferirTipoTicketPelaLegenda_(caption);

  sheet.appendRow([
    Utilities.getUuid(), receivedAt, String(message.id), sender, driverId, '',
    ticketType, mediaId, file.getId(), file.getUrl(), filename, media.mime_type,
    'AGUARDANDO_LEITURA', '', '', driverId ? '' : 'REMETENTE_NAO_VINCULADO_A_MOTORISTA',
    retentionUntil, JSON.stringify({ caption: caption, phoneNumberId: metadata.phone_number_id || '' })
  ]);
}

function ticketWhatsAppJaRecebido_(sheet, messageId) {
  if (sheet.getLastRow() < 2) return false;
  const match = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(messageId)).matchEntireCell(true).findNext();
  return !!match;
}

function localizarMotoristaPorTelefoneTicket_(phone) {
  const normalized = String(phone || '').replace(/\D/g, '');
  const drivers = listarRegistros_('MOTORISTAS');
  for (let i = 0; i < drivers.length; i++) {
    const fields = drivers[i].campos || [];
    // Campos após ID, CRIADO_EM e STATUS: nome=0, CPF=1, telefone=2.
    if (String(fields[2] || '').replace(/\D/g, '') === normalized) {
      return String(drivers[i].id || '');
    }
  }
  return '';
}

function inferirTipoTicketPelaLegenda_(caption) {
  const normalized = String(caption || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.indexOf('descarga') !== -1 || normalized.indexOf('descarregamento') !== -1) return 'DESCARGA';
  if (normalized.indexOf('porto') !== -1 || normalized.indexOf('carregamento') !== -1 || normalized.indexOf('saida') !== -1) return 'CARREGAMENTO';
  return 'NAO_IDENTIFICADO';
}

function obterVersaoGraphWhatsAppTicket_() {
  const version = PropertiesService.getScriptProperties().getProperty('FT_WA_GRAPH_VERSION') || '';
  if (!/^v\d+\.\d+$/.test(version)) {
    throw new Error('Configure FT_WA_GRAPH_VERSION com a versão Graph API habilitada no app da Meta.');
  }
  return version;
}

function registrarErroTicketWhatsApp_(message, error) {
  try {
    const sheet = getSheet_('TICKETS');
    sheet.appendRow([
      Utilities.getUuid(), new Date(), String(message && message.id || ''),
      String(message && message.from || ''), '', '', 'ERRO_RECEBIMENTO',
      '', '', '', '', '', 'ERRO_RECEBIMENTO', '', '',
      String(error && error.message || error), '', JSON.stringify({})
    ]);
  } catch (loggingError) {
    console.error('Falha ao registrar erro de ticket: ' + loggingError.message);
  }
}

/**
 * Apaga do Drive somente imagens cujo RETENCAO_ATE venceu.
 * A linha de auditoria permanece na planilha. Não execute/agende até definir o prazo.
 */
function limparImagensTicketsExpiradasFullTime() {
  const props = PropertiesService.getScriptProperties();
  const days = Number(props.getProperty('FT_TICKET_RETENTION_DAYS') || 0);
  if (!(days > 0)) throw new Error('Prazo de retenção não configurado. Nenhuma imagem foi apagada.');
  const sheet = getSheet_('TICKETS');
  if (sheet.getLastRow() < 2) return { apagadas: 0 };
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 18).getValues();
  let deleted = 0;
  const now = new Date();
  rows.forEach(function(row) {
    const fileId = String(row[8] || '');
    const expiry = row[16];
    const status = String(row[12] || '');
    if (!fileId || !(expiry instanceof Date) || expiry > now || status === 'IMAGEM_EXPIRADA') return;
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      const rowNumber = rows.indexOf(row) + 2;
      sheet.getRange(rowNumber, 13).setValue('IMAGEM_EXPIRADA');
      sheet.getRange(rowNumber, 17).setValue(expiry);
      deleted++;
    } catch (err) {
      console.error('Não foi possível expirar o arquivo ' + fileId + ': ' + err.message);
    }
  });
  return { apagadas: deleted };
}

/** Diagnóstico sem revelar tokens ou segredos. */
function diagnosticarIntegracaoWhatsAppFullTime() {
  const props = PropertiesService.getScriptProperties();
  const required = [
    'FT_WA_VERIFY_TOKEN', 'FT_WA_ACCESS_TOKEN', 'FT_WA_PHONE_NUMBER_ID',
    'FT_WA_GRAPH_VERSION', 'FT_TICKET_DRIVE_FOLDER_ID'
  ];
  const result = {};
  required.forEach(function(key) { result[key] = props.getProperty(key) ? 'CONFIGURADO' : 'AUSENTE'; });
  result.FT_TICKET_RETENTION_DAYS = props.getProperty('FT_TICKET_RETENTION_DAYS') || 'NAO_DEFINIDO; exclusao automatica desativada';
  result.webhook = 'URL /exec do Web App após implantação';
  result.ocr = 'AINDA_NAO_CONFIGURADO';
  console.log(JSON.stringify(result));
  return result;
}
