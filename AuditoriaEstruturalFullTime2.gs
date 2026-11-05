/**
 * FULLTIME 2.0 — AUDITORIA ESTRUTURAL SOMENTE LEITURA
 *
 * EXECUÇÃO:
 * 1. Copiar este arquivo para o projeto Apps Script principal do FullTime.
 * 2. Executar auditarEstruturaFullTime2().
 * 3. Enviar o objeto JSON registrado no log.
 *
 * GARANTIAS:
 * - Não cria, renomeia, formata, limpa ou grava em nenhuma guia.
 * - Não lê linhas de dados; lê somente cabeçalhos, dimensões e metadados das guias autorizadas.
 * - Na planilha do Bruno, acessa somente a allowlist abaixo.
 * - NÃO chama getSheetByName, getRange ou qualquer método sobre CAVALOS-BRUNO.
 * - Não enumera todas as guias da planilha do Bruno.
 */
function auditarEstruturaFullTime2() {
  const CFG = {
    principalId: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
    brunoId: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
    principalGuias: [
      'USUARIOS','MOTORISTAS','CAMINHOES','CAVALOS','CARRETAS','CONJUNTOS',
      'LOCAIS','REGRAS_OPERACIONAIS','OPERACOES','PARTICIPACAO_OPERACOES',
      'MOVIMENTACOES_OPERACAO','CARGAS','ESCALAS','HISTORICO_OPERACOES',
      'TICKETS','DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','OFERTAS_CARGAS',
      'EVENTOS_ESCALA','ENTRADA_OPERACOES_IA','AUDITORIA','CONFIGURACOES',
      'FT_CADASTRO_BRUNO_MOTORISTAS','FT_CADASTRO_BRUNO_CAVALOS',
      'FT_CADASTRO_BRUNO_CARRETAS','FT_CADASTRO_BRUNO_CONJUNTOS',
      'FT_CADASTRO_BRUNO_DOCUMENTOS','PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'
    ],
    brunoGuias: [
      'MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','OPERACOES',
      'CONTROLE_DOCUMENTAL','INSTRUCOES','ENTRADA_OPERACOES_IA',
      'PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'
    ]
  };
  function inspect_(ss, names) {
    return names.map(function(name) {
      const sh = ss.getSheetByName(name);
      if (!sh) return {guia:name, existe:false};
      const lastCol = sh.getLastColumn();
      const headers = lastCol > 0
        ? sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(function(v){return String(v||'').trim();})
        : [];
      return {
        guia:name,
        existe:true,
        sheetId:sh.getSheetId(),
        linhasComCabecalho:sh.getLastRow(),
        colunasUsadas:lastCol,
        cabecalhos:headers
      };
    });
  }
  const principal = SpreadsheetApp.openById(CFG.principalId);
  const bruno = SpreadsheetApp.openById(CFG.brunoId);
  const result = {
    auditoria:'FULLTIME_2_0_ESTRUTURAL',
    executadoEm:new Date().toISOString(),
    modo:'SOMENTE_LEITURA_CABECALHOS_E_DIMENSOES',
    planilhas:{
      principal:{nome:principal.getName(),id:principal.getId(),guias:inspect_(principal,CFG.principalGuias)},
      bruno:{nome:bruno.getName(),id:bruno.getId(),guias:inspect_(bruno,CFG.brunoGuias)}
    },
    protecao:{
      guia:'CAVALOS-BRUNO',
      acao:'NAO_ACESSADA',
      observacao:'A guia protegida não foi procurada, aberta, enumerada ou lida.'
    }
  };
  Logger.log('FULLTIME 2.0 — AUDITORIA ESTRUTURAL: ' + JSON.stringify(result));
  return result;
}


/**
 * FULLTIME 2.0 — CONTINUAÇÃO COMPACTA DA AUDITORIA
 * Execute separadamente para evitar truncamento do log.
 * Somente leitura. Não enumera guias e não acessa CAVALOS-BRUNO.
 */
function auditarEstruturaFullTime2BrunoCompacta() {
  const id = '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI';
  const names = ['MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','OPERACOES',
    'CONTROLE_DOCUMENTAL','INSTRUCOES','ENTRADA_OPERACOES_IA',
    'PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'];
  const ss = SpreadsheetApp.openById(id);
  const result = {auditoria:'FULLTIME_2_0_BRUNO_COMPACTA',planilha:ss.getName(),guias:[]};
  names.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) { result.guias.push({guia:name,existe:false}); return; }
    const n = sh.getLastColumn();
    result.guias.push({
      guia:name,existe:true,linhasComCabecalho:sh.getLastRow(),
      colunasUsadas:n,
      cabecalhos:n ? sh.getRange(1,1,1,n).getDisplayValues()[0].map(v=>String(v||'').trim()) : []
    });
  });
  Logger.log('FULLTIME 2.0 — BRUNO COMPACTA: '+JSON.stringify(result));
  return result;
}

function auditarEstruturaFullTime2PrincipalCompacta() {
  const id = '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';
  const names = ['MOTORISTAS','CAMINHOES','CAVALOS','CARRETAS','CONJUNTOS',
    'LOCAIS','REGRAS_OPERACIONAIS','OPERACOES','PARTICIPACAO_OPERACOES',
    'MOVIMENTACOES_OPERACAO','CARGAS','ESCALAS','HISTORICO_OPERACOES',
    'TICKETS','DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','OFERTAS_CARGAS',
    'EVENTOS_ESCALA','ENTRADA_OPERACOES_IA'];
  const ss = SpreadsheetApp.openById(id);
  const result = {auditoria:'FULLTIME_2_0_PRINCIPAL_COMPACTA',planilha:ss.getName(),guias:[]};
  names.forEach(function(name) {
    const sh = ss.getSheetByName(name);
    if (!sh) { result.guias.push({guia:name,existe:false}); return; }
    const n = sh.getLastColumn();
    result.guias.push({
      guia:name,existe:true,linhasComCabecalho:sh.getLastRow(),
      colunasUsadas:n,
      cabecalhos:n ? sh.getRange(1,1,1,n).getDisplayValues()[0].map(v=>String(v||'').trim()) : []
    });
  });
  Logger.log('FULLTIME 2.0 — PRINCIPAL COMPACTA: '+JSON.stringify(result));
  return result;
}
