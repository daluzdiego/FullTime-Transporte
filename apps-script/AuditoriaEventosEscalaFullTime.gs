/**
 * FULL TIME — Auditoria estrutural da guia EVENTOS_ESCALA.
 * Somente leitura: não cria guia, não adiciona cabeçalhos e não altera registros.
 * Usa a base operacional configurada em FT_REGISTRY_DATABASE_ID.
 */
function FT_AUDITAR_CABECALHOS_EVENTOS_20261116() {
  const props = PropertiesService.getScriptProperties();
  const registryId = props.getProperty('FT_REGISTRY_DATABASE_ID');
  if (!registryId) {
    throw new Error('FT_REGISTRY_DATABASE_ID não está configurado nas propriedades do projeto.');
  }

  const ss = SpreadsheetApp.openById(registryId);
  const sh = ss.getSheetByName('EVENTOS_ESCALA');
  if (!sh) {
    const result = {
      sucesso: false,
      guiaEncontrada: false,
      baseOperacional: registryId,
      guiasDisponiveis: ss.getSheets().map(s => s.getName()),
      modo: 'SOMENTE_LEITURA'
    };
    Logger.log('FULL TIME — AUDITORIA EVENTOS_ESCALA: ' + JSON.stringify(result));
    return result;
  }

  const headers = sh.getLastColumn()
    ? sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0]
        .map(v => String(v || '').trim().toUpperCase())
    : [];
  const required = [
    'ID', 'DATA_HORA', 'TIPO_EVENTO', 'OPERACAO_ID', 'MOTORISTA_ID',
    'CONJUNTO_ID', 'MOTIVO', 'REGISTRADO_POR', 'OFERTA_ID'
  ];
  const duplicates = headers.filter((h, i) => h && headers.indexOf(h) !== i);
  const result = {
    sucesso: true,
    guiaEncontrada: true,
    baseOperacional: registryId,
    totalLinhas: sh.getLastRow(),
    totalColunas: sh.getLastColumn(),
    cabecalhosEncontrados: headers,
    ausentes: required.filter(h => !headers.includes(h)),
    duplicados: [...new Set(duplicates)],
    modo: 'SOMENTE_LEITURA'
  };

  Logger.log('FULL TIME — AUDITORIA EVENTOS_ESCALA: ' + JSON.stringify(result));
  return result;
}
