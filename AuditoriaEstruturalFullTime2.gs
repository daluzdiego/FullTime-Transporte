/**
 * FULL TIME — AUDITORIA ESTRUTURAL CENTRALIZADA
 * Somente leitura. Inspeciona apenas as guias operacionais da planilha principal.
 * Não abre a planilha antiga do Bruno nem acessa CAVALOS-BRUNO.
 */
function auditarEstruturaFullTime2() {
  const id = '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';
  const names = [
    'MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','DOCUMENTOS',
    'OPERACOES','PARTICIPACAO_OPERACOES','MOVIMENTACOES_OPERACAO',
    'LOCAIS','REGRAS_OPERACIONAIS','DISPONIBILIDADE_DIARIA',
    'FILA_MOTORISTAS','EVENTOS_ESCALA','ENTRADA_OPERACOES_IA'
  ];
  const ss = SpreadsheetApp.openById(id);
  const result = {
    auditoria: 'FULLTIME_CENTRALIZADA',
    executadoEm: new Date().toISOString(),
    somenteLeitura: true,
    planilha: { nome: ss.getName(), id: ss.getId() },
    guias: []
  };
  names.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) {
      result.guias.push({ guia: name, existe: false });
      return;
    }
    const width = sh.getLastColumn();
    result.guias.push({
      guia: name,
      existe: true,
      linhas: sh.getLastRow(),
      colunas: width,
      cabecalhos: width
        ? sh.getRange(1, 1, 1, width).getDisplayValues()[0].map(function(v) { return String(v || '').trim(); })
        : []
    });
  });
  Logger.log('FULL TIME — AUDITORIA CENTRALIZADA: ' + JSON.stringify(result));
  return result;
}
