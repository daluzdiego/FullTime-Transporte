/**
 * FULL TIME — RECONSTRUÇÃO CONTROLADA DA BASE DE HOMOLOGAÇÃO
 *
 * Executar SOMENTE no projeto Apps Script vinculado à planilha central.
 * Faz cópia de segurança da planilha do Bruno e da planilha central antes de limpar.
 * Reconstrói os cabeçalhos oficiais nas guias utilizadas pelo fluxo atual.
 *
 * NÃO altera a base interna de autenticação (USUARIOS/AUDITORIA).
 * NÃO altera a guia protegida CAVALOS-BRUNO.
 * NÃO exclui guias desconhecidas; guias legadas são mantidas fora do fluxo.
 */
const FT_REBUILD_CFG_20261110 = Object.freeze({
  CENTRAL_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  BRUNO_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  INPUT_HEADERS: ['ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL','DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA','ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO','CANAL_ORIGEM','IDENTIFICADOR_ORIGEM','CHAVE_IDEMPOTENCIA','ATUALIZADO_EM','HISTORICO_JSON','ID_OPERACAO_GERADA'],
  SOURCE: {
    MOTORISTAS: ['ID_EXTERNO','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAVALOS: ['ID_EXTERNO','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS'],
    CARRETAS: ['ID_EXTERNO','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID_EXTERNO','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    CONTROLE_DOCUMENTAL: ['ID_EXTERNO','ID_DOCUMENTO','CRIADO_EM','STATUS','TIPO_DOCUMENTO','ENTIDADE','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','OBSERVACOES']
  },
  CENTRAL: {
    OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','VIAGENS_REALIZADAS','TIPO_OPERACAO'],
    PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR'],
    MOVIMENTACOES_OPERACAO: ['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR','QUANTIDADE_VIAGENS'],
    LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES'],
    REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES'],
    DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
    FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_OPERACAO_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
    EVENTOS_ESCALA: ['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_ANTERIOR','POSICAO_NOVA','MOTIVO','REGISTRADO_POR']
  }
});

function FT_reconstruirBaseHomologacao20261110() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active || active.getId() !== FT_REBUILD_CFG_20261110.CENTRAL_ID) {
    throw new Error('BLOQUEADO: abra o Apps Script vinculado à planilha CENTRAL antes de executar. Nenhuma planilha foi alterada.');
  }

  const central = SpreadsheetApp.openById(FT_REBUILD_CFG_20261110.CENTRAL_ID);
  const bruno = SpreadsheetApp.openById(FT_REBUILD_CFG_20261110.BRUNO_ID);
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  // Backups obrigatórios: se algum falhar, a limpeza não começa.
  const backupCentral = DriveApp.getFileById(central.getId()).makeCopy('BACKUP_PRE_RECONSTRUCAO_CENTRAL_' + stamp);
  const backupBruno = DriveApp.getFileById(bruno.getId()).makeCopy('BACKUP_PRE_RECONSTRUCAO_BRUNO_' + stamp);

  const sourceSchemas = Object.assign({}, FT_REBUILD_CFG_20261110.SOURCE, {
    ENTRADA_OPERACOES_IA: FT_REBUILD_CFG_20261110.INPUT_HEADERS
  });
  const centralSchemas = Object.assign({}, FT_REBUILD_CFG_20261110.CENTRAL, {
    ENTRADA_OPERACOES_IA: FT_REBUILD_CFG_20261110.INPUT_HEADERS,
    FT_CADASTRO_BRUNO_MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES','ID_EXTERNO'],
    FT_CADASTRO_BRUNO_CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS','ID_EXTERNO'],
    FT_CADASTRO_BRUNO_CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','ID_EXTERNO'],
    FT_CADASTRO_BRUNO_CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','ID_EXTERNO'],
    FT_CADASTRO_BRUNO_DOCUMENTOS: ['ID_DOCUMENTO','CRIADO_EM','STATUS','TIPO_DOCUMENTO','ENTIDADE','ID_EXTERNO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','OBSERVACOES']
  });

  const result = {
    ok: true,
    backups: { central: backupCentral.getId(), bruno: backupBruno.getId() },
    central: [],
    bruno: [],
    observacao: 'A base interna de autenticação e a guia protegida CAVALOS-BRUNO não foram alteradas.'
  };

  Object.keys(sourceSchemas).forEach(name => {
    FT_rebuildSheet_(bruno, name, sourceSchemas[name]);
    result.bruno.push({ guia: name, colunas: sourceSchemas[name].length });
  });
  Object.keys(centralSchemas).forEach(name => {
    FT_rebuildSheet_(central, name, centralSchemas[name]);
    result.central.push({ guia: name, colunas: centralSchemas[name].length });
  });

  PropertiesService.getScriptProperties().setProperty('FT_REGISTRY_DATABASE_ID', central.getId());
  Logger.log('FULL TIME — RECONSTRUÇÃO CONCLUÍDA: ' + JSON.stringify(result));
  return result;
}

function FT_rebuildSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  if (sh.getMaxColumns() < headers.length) {
    sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  }
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#eaf2ff')
    .setFontColor('#16345c')
    .setWrap(true);
  sh.autoResizeColumns(1, headers.length);
}
