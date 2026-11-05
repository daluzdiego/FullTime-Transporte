/**
 * FULL TIME — Integração segura do cadastro de frota do Bruno.
 *
 * COMO USAR:
 * 1) Copie este arquivo para o projeto Apps Script ligado ao sistema Full Time.
 * 2) Execute configurarIntegracaoCadastroBrunoFullTime() uma vez.
 * 3) Execute sincronizarCadastroBrunoFullTime() para importar os registros.
 * 4) Execute criarFormularioMotoristasFullTime() uma vez para criar o Google Forms.
 *
 * Não altera cabeçalhos das guias operacionais existentes e não apaga registros.
 * A sincronização grava a ficha detalhada em guias de espelho e cria/atualiza
 * registros operacionais como PENDENTE_REVISAO. Não ativa veículos automaticamente.
 */

const FT_BRUNO_CONFIG = Object.freeze({
  SOURCE_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  OPERATIONAL_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  FORM_TITLE: 'Full Time — Cadastro de Motoristas',
  FORM_DESCRIPTION: 'Preencha seus dados com atenção. As informações serão conferidas pela equipe da Full Time antes da aprovação do cadastro. Envie apenas documentos solicitados pela empresa por canal autorizado.'
});

const FT_BRUNO_HEADERS = Object.freeze({
  MOTORISTAS: ['ID_EXTERNO','NOME_COMPLETO','CPF','RG','DATA_NASCIMENTO','TELEFONE','WHATSAPP','EMAIL','ENDERECO','CIDADE','UF','CEP','CNH_NUMERO','CNH_CATEGORIA','CNH_PRIMEIRA_HABILITACAO','CNH_VALIDADE','CNH_EAR','EXAME_TOXICOLOGICO_VALIDADE','STATUS_DOCUMENTACAO','LINK_CNH','LINK_EXAME_TOXICOLOGICO','OBSERVACOES'],
  CAVALOS: ['ID_EXTERNO','PLACA','RENAVAM','CHASSI','NUMERO_MOTOR','MARCA','MODELO','VERSAO','ANO_FABRICACAO','ANO_MODELO','TIPO_VEICULO','ESPECIE','CARROCERIA','COR','COMBUSTIVEL','NUMERO_EIXOS','TARA_TONELADAS','LOTACAO_TONELADAS','PBTC_MAX_TONELADAS','CAPACIDADE_UTIL_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','ANTT_RNTRC','ANTT_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','OBSERVACOES'],
  CARRETAS: ['ID_EXTERNO','PLACA','RENAVAM','CHASSI','MARCA','MODELO','ANO_FABRICACAO','ANO_MODELO','TIPO_CARRETA','ESPECIE','CARROCERIA','COR','NUMERO_EIXOS','TARA_TONELADAS','LOTACAO_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','OBSERVACOES'],
  CONJUNTOS: ['ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA','QUANTIDADE_CARRETAS','VINCULO_FIXO','DATA_INICIO_VINCULO','DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR','DATA_AUTORIZACAO','OBSERVACOES','STATUS','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
  CONTROLE_DOCUMENTAL: ['ID_DOCUMENTO','TIPO_REGISTRO','ID_EXTERNO_REGISTRO','PLACA_OU_CPF','TIPO_DOCUMENTO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','STATUS_DOCUMENTO','LINK_ARQUIVO','DATA_CONFERENCIA','CONFERIDO_POR','PENDENCIA','OBSERVACOES']
});

function configurarIntegracaoCadastroBrunoFullTime() {
  const origem = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const destino = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  const required = Object.keys(FT_BRUNO_HEADERS);
  required.forEach(function(name) {
    const sh = origem.getSheetByName(name);
    if (!sh) throw new Error('Guia obrigatória não encontrada na planilha do Bruno: ' + name);
    const expected = FT_BRUNO_HEADERS[name];
    const got = sh.getRange(1, 1, 1, expected.length).getDisplayValues()[0];
    const mismatch = expected.some(function(h, i) { return String(got[i] || '').trim() !== '' && String(got[i] || '').trim() !== h; });
    if (mismatch) {
      throw new Error('Cabeçalhos divergentes em ' + name + '. Nenhuma sincronização foi executada.');
    }
    expected.forEach(function(h,i){ if (!String(got[i] || '').trim()) sh.getRange(1,i+1).setValue(h); });
  });
  const mirrorHeaders = {
    FT_CADASTRO_BRUNO_MOTORISTAS: FT_BRUNO_HEADERS.MOTORISTAS,
    FT_CADASTRO_BRUNO_CAVALOS: FT_BRUNO_HEADERS.CAVALOS,
    FT_CADASTRO_BRUNO_CARRETAS: FT_BRUNO_HEADERS.CARRETAS,
    FT_CADASTRO_BRUNO_CONJUNTOS: FT_BRUNO_HEADERS.CONJUNTOS,
    FT_CADASTRO_BRUNO_DOCUMENTOS: FT_BRUNO_HEADERS.CONTROLE_DOCUMENTAL
  };
  Object.keys(mirrorHeaders).forEach(function(name) {
    let sh = destino.getSheetByName(name);
    if (!sh) sh = destino.insertSheet(name);
    const headers = mirrorHeaders[name];
    const row = sh.getRange(1,1,1,headers.length).getDisplayValues()[0];
    if (row.every(function(v){return !String(v || '').trim();})) {
      sh.getRange(1,1,1,headers.length).setValues([headers]);
    } else if (headers.some(function(h,i){return String(row[i] || '').trim() !== '' && String(row[i] || '').trim() !== h;})) {
      throw new Error('A guia de espelho ' + name + ' já existe com cabeçalhos diferentes. Nenhuma informação foi sobrescrita.');
    }
    headers.forEach(function(h,i){ if (!String(row[i] || '').trim()) sh.getRange(1,i+1).setValue(h); });
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c').setWrap(true);
    protegerCabecalhoFT_(sh, 'Full Time — cabeçalho controlado pelo sistema');
    protegerGuiaInteiraFT_(sh, 'Full Time — espelho sincronizado; edição manual bloqueada');
  });
  protegerCabecalhoFT_(origem.getSheetByName('MOTORISTAS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CAVALOS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CARRETAS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CONJUNTOS'), 'Full Time — cabeçalho do cadastro');
  configurarEdicaoMotoristaConjuntoBrunoFullTime_(origem);
  const handlerEdicao = 'onEditConjuntosBrunoFullTime';
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===handlerEdicao;}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger(handlerEdicao).forSpreadsheet(origem).onEdit().create();
  protegerCabecalhoFT_(origem.getSheetByName('CONTROLE_DOCUMENTAL'), 'Full Time — cabeçalho do cadastro');
  atualizarLinksGuiasFullTime_();
  PropertiesService.getScriptProperties().setProperty('FT_BRUNO_SOURCE_ID', FT_BRUNO_CONFIG.SOURCE_ID);
  PropertiesService.getScriptProperties().setProperty('FT_BRUNO_OPERATIONAL_ID', FT_BRUNO_CONFIG.OPERATIONAL_ID);
  console.log('Configuração concluída. Origem: ' + origem.getUrl() + ' | Destino: ' + destino.getUrl());
  return {origem: origem.getUrl(), destino: destino.getUrl(), guiasEspelho: Object.keys(mirrorHeaders)};
}


/**
 * Pré-voo somente leitura da integração. Não grava, não protege, não cria guias
 * e consulta exclusivamente as guias explicitamente permitidas.
 */
function validarIntegracaoCadastroBrunoFullTime() {
  const source = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const dest = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  const pairs = [
    {source:'MOTORISTAS', mirror:'FT_CADASTRO_BRUNO_MOTORISTAS', operational:'MOTORISTAS', key:'ID_EXTERNO'},
    {source:'CAVALOS', mirror:'FT_CADASTRO_BRUNO_CAVALOS', operational:'CAVALOS', key:'ID_EXTERNO'},
    {source:'CARRETAS', mirror:'FT_CADASTRO_BRUNO_CARRETAS', operational:'CARRETAS', key:'ID_EXTERNO'},
    {source:'CONJUNTOS', mirror:'FT_CADASTRO_BRUNO_CONJUNTOS', operational:'CONJUNTOS', key:'ID_EXTERNO'},
    {source:'CONTROLE_DOCUMENTAL', mirror:'FT_CADASTRO_BRUNO_DOCUMENTOS', operational:'', key:'ID_DOCUMENTO'}
  ];
  const result = {auditoria:'FULLTIME_2_0_PRE_VOO_INTEGRACAO',somenteLeitura:true,protegida:'CAVALOS-BRUNO',guias:[],erros:[]};
  pairs.forEach(p => {
    const src = source.getSheetByName(p.source);
    const mirror = dest.getSheetByName(p.mirror);
    const operational = p.operational ? dest.getSheetByName(p.operational) : null;
    if (!src) { result.erros.push('Guia de origem ausente: '+p.source); return; }
    if (!mirror) { result.erros.push('Espelho ausente: '+p.mirror); return; }
    const expected = FT_BRUNO_HEADERS[p.source];
    const sh = src.getRange(1,1,1,expected.length).getDisplayValues()[0].map(v=>String(v||'').trim());
    const mh = mirror.getRange(1,1,1,expected.length).getDisplayValues()[0].map(v=>String(v||'').trim());
    const sourceMismatch = expected.filter((h,i)=>sh[i]!==h);
    const mirrorMismatch = expected.filter((h,i)=>mh[i]!==h);
    if (sourceMismatch.length) result.erros.push(p.source+': cabeçalhos divergentes ('+sourceMismatch.join(', ')+')');
    if (mirrorMismatch.length) result.erros.push(p.mirror+': cabeçalhos divergentes ('+mirrorMismatch.join(', ')+')');
    if (p.operational && !operational) result.erros.push('Guia operacional ausente: '+p.operational);
    const last = src.getLastRow();
    let populated = 0, blankKeys = 0, duplicateKeys = 0;
    const seen = {};
    if (last > 1) {
      const values = src.getRange(2,1,last-1,expected.length).getValues();
      values.forEach(row => {
        if (!row.some(v=>v!==''&&v!==null)) return;
        populated++;
        const key = String(row[expected.indexOf(p.key)]||'').trim();
        if (!key) blankKeys++;
        else if (seen[key]) duplicateKeys++;
        else seen[key]=true;
      });
    }
    if (blankKeys) result.erros.push(p.source+': '+blankKeys+' registro(s) sem '+p.key);
    if (duplicateKeys) result.erros.push(p.source+': '+duplicateKeys+' chave(s) duplicada(s) em '+p.key);
    result.guias.push({origem:p.source,espelho:p.mirror,destinoOperacional:p.operational||'somente espelho',registrosOrigem:populated,chavesVazias:blankKeys,chavesDuplicadas:duplicateKeys,cabecalhosOrigemOK:!sourceMismatch.length,cabecalhosEspelhoOK:!mirrorMismatch.length});
  });
  result.sucesso = result.erros.length===0;
  Logger.log('FULLTIME 2.0 — PRÉ-VOO INTEGRAÇÃO: '+JSON.stringify(result));
  return result;
}

function sincronizarCadastroBrunoFullTime() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const source = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
    const dest = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
    const summary = {};
    const pairs = [
      ['MOTORISTAS','FT_CADASTRO_BRUNO_MOTORISTAS'],
      ['CAVALOS','FT_CADASTRO_BRUNO_CAVALOS'],
      ['CARRETAS','FT_CADASTRO_BRUNO_CARRETAS'],
      ['CONJUNTOS','FT_CADASTRO_BRUNO_CONJUNTOS'],
      ['CONTROLE_DOCUMENTAL','FT_CADASTRO_BRUNO_DOCUMENTOS']
    ];
    pairs.forEach(function(pair) {
      const src = source.getSheetByName(pair[0]);
      const dst = dest.getSheetByName(pair[1]);
      if (!src || !dst) throw new Error('Execute configurarIntegracaoCadastroBrunoFullTime() antes da sincronização.');
      const expected = FT_BRUNO_HEADERS[pair[0]];
      const actualHeaders = src.getRange(1,1,1,expected.length).getDisplayValues()[0];
      if (expected.some(function(h,i){return String(actualHeaders[i] || '').trim() !== h;})) {
        throw new Error('Cabeçalhos alterados em ' + pair[0] + '. Sincronização interrompida.');
      }
      const last = src.getLastRow();
      const rows = [];
      if (last > 1) {
        const sourceValues = src.getRange(2,1,last-1,expected.length).getValues();
        sourceValues.forEach(function(r, i) {
          if (r.some(function(v){return v !== '' && v !== null;})) rows.push({rowNumber:i+2, values:r});
        });
      }
      if (rows.length) {
        const keyIndex = 0;
        const existing = {};
        if (dst.getLastRow() > 1) {
          dst.getRange(2,1,dst.getLastRow()-1,expected.length).getValues().forEach(function(r,i) {
            const key = String(r[keyIndex] || '').trim();
            if (key) existing[key] = i + 2;
          });
        }
        rows.forEach(function(item) {
          const r = item.values;
          let key = String(r[keyIndex] || '').trim();
          if (!key) {
            key = 'BRUNO-' + pair[0] + '-' + Utilities.getUuid();
            r[keyIndex] = key;
            src.getRange(item.rowNumber, 1).setNumberFormat('@').setValue(key);
          }
          const rowNo = existing[key];
          if (rowNo) dst.getRange(rowNo,1,1,expected.length).setValues([r]);
          else dst.appendRow(r);
        });
      }
      summary[pair[0]] = rows.length;
    });
    importarCadastrosOperacionaisBrunoFT_(dest);
    console.log('Sincronização concluída: ' + JSON.stringify(summary));
    return {ok:true, linhasLidas:summary, mensagem:'Fichas detalhadas atualizadas. Novos veículos operacionais ficam PENDENTE_REVISAO.'};
  } finally {
    lock.releaseLock();
  }
}

/** Acha a linha de origem pelo conteúdo da linha; evita depender de uma posição calculada fora do laço. */
/**
 * Importa cadastros para as guias operacionais usando cabeçalhos, nunca posição fixa.
 * Só consulta guias explicitamente permitidas. Não enumera guias da planilha do Bruno.
 * Status operacional existente é preservado; registros novos entram em PENDENTE_REVISAO.
 */
function importarCadastrosOperacionaisBrunoFT_(dest) {
  importarMotoristasOperacionaisBrunoFT_(dest);
  importarVeiculosOperacionaisBrunoFT_(dest, 'FT_CADASTRO_BRUNO_CAVALOS', 'CAVALOS', 'CAVALO');
  importarVeiculosOperacionaisBrunoFT_(dest, 'FT_CADASTRO_BRUNO_CARRETAS', 'CARRETAS', 'CARRETA');
  importarConjuntosOperacionaisBrunoFT_(dest);
}

function ftHeadersIndexBruno_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0]
    .map(v => String(v || '').trim());
  const index = {};
  headers.forEach((h, i) => { if (h) index[h] = i; });
  return {headers: headers, index: index};
}

function ftRowsBruno_(sheet, width) {
  return sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    : [];
}

function ftFindOperationalRowBruno_(sheet, targetIndex, externalId, cpf, plate) {
  const rows = ftRowsBruno_(sheet, sheet.getLastColumn());
  const idCol = targetIndex.ID;
  const externalCol = targetIndex.ID_EXTERNO;
  const cpfCol = targetIndex.CPF;
  const plateCol = targetIndex.PLACA;
  let match = 0;
  rows.forEach((r, i) => {
    const byExternal = externalId && (
      (externalCol !== undefined && String(r[externalCol] || '').trim() === externalId) ||
      (idCol !== undefined && String(r[idCol] || '').trim() === externalId)
    );
    const byCpf = cpf && cpfCol !== undefined && String(r[cpfCol] || '').replace(/\D/g, '') === cpf;
    const byPlate = plate && plateCol !== undefined &&
      String(r[plateCol] || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === plate;
    if (byExternal || byCpf || byPlate) {
      if (match && match !== i + 2) throw new Error('Correspondência ambígua em ' + sheet.getName() + ' para ID externo ' + externalId + '. Nenhuma linha adicional foi gravada.');
      match = i + 2;
    }
  });
  return match;
}

function importarMotoristasOperacionaisBrunoFT_(dest) {
  const src = dest.getSheetByName('FT_CADASTRO_BRUNO_MOTORISTAS');
  const target = dest.getSheetByName('MOTORISTAS');
  if (!src || !target) throw new Error('Guia de espelho ou operacional ausente: MOTORISTAS.');
  const si = ftHeadersIndexBruno_(src), ti = ftHeadersIndexBruno_(target);
  ['ID_EXTERNO','NOME_COMPLETO'].forEach(k => { if (si.index[k] === undefined) throw new Error('Campo ausente no espelho de motoristas: ' + k); });
  ['ID','STATUS','NOME_COMPLETO','ID_EXTERNO'].forEach(k => { if (ti.index[k] === undefined) throw new Error('Campo ausente em MOTORISTAS: ' + k); });
  const rows = ftRowsBruno_(src, si.headers.length);
  rows.forEach(r => {
    const externalId = String(r[si.index.ID_EXTERNO] || '').trim();
    const name = String(r[si.index.NOME_COMPLETO] || '').trim();
    if (!externalId || !name) return;
    const cpf = si.index.CPF === undefined ? '' : String(r[si.index.CPF] || '').replace(/\D/g, '');
    const rowNo = ftFindOperationalRowBruno_(target, ti.index, externalId, cpf, '');
    const isNew = !rowNo;
    const out = isNew ? new Array(ti.headers.length).fill('') :
      target.getRange(rowNo, 1, 1, ti.headers.length).getValues()[0];
    if (isNew) {
      out[ti.index.ID] = Utilities.getUuid();
      out[ti.index.STATUS] = 'PENDENTE_REVISAO';
      if (ti.index.CRIADO_EM !== undefined) out[ti.index.CRIADO_EM] = new Date();
    }
    const fields = ['NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE',
      'OBSERVACOES','ID_EXTERNO','RG','DATA_NASCIMENTO','WHATSAPP','ENDERECO','CIDADE','UF','CEP',
      'CNH_PRIMEIRA_HABILITACAO','CNH_EAR','EXAME_TOXICOLOGICO_VALIDADE','STATUS_DOCUMENTACAO',
      'LINK_CNH','LINK_EXAME_TOXICOLOGICO'];
    fields.forEach(k => {
      if (si.index[k] === undefined || ti.index[k] === undefined) return;
      const value = r[si.index[k]];
      if (value !== '' && value !== null && typeof value !== 'undefined') out[ti.index[k]] = value;
    });
    if (isNew) target.appendRow(out);
    else target.getRange(rowNo, 1, 1, out.length).setValues([out]);
  });
}

function importarVeiculosOperacionaisBrunoFT_(dest, sourceName, targetName, type) {
  const src = dest.getSheetByName(sourceName), target = dest.getSheetByName(targetName);
  if (!src || !target) throw new Error('Guia de espelho ou operacional ausente: ' + targetName + '.');
  const si = ftHeadersIndexBruno_(src), ti = ftHeadersIndexBruno_(target);
  ['ID_EXTERNO','PLACA'].forEach(k => { if (si.index[k] === undefined) throw new Error('Campo ausente no espelho ' + sourceName + ': ' + k); });
  ['ID','STATUS','PLACA','ID_EXTERNO'].forEach(k => { if (ti.index[k] === undefined) throw new Error('Campo ausente em ' + targetName + ': ' + k); });
  const rows = ftRowsBruno_(src, si.headers.length);
  rows.forEach(r => {
    const externalId = String(r[si.index.ID_EXTERNO] || '').trim();
    const plate = String(r[si.index.PLACA] || '').trim().toUpperCase();
    if (!externalId || !plate) return;
    const rowNo = ftFindOperationalRowBruno_(target, ti.index, externalId, '', plate);
    const isNew = !rowNo;
    const out = isNew ? new Array(ti.headers.length).fill('') :
      target.getRange(rowNo, 1, 1, ti.headers.length).getValues()[0];
    if (isNew) {
      out[ti.index.ID] = Utilities.getUuid();
      out[ti.index.STATUS] = 'PENDENTE_REVISAO';
      if (ti.index.CRIADO_EM !== undefined) out[ti.index.CRIADO_EM] = new Date();
    }
    const fields = type === 'CAVALO'
      ? ['PLACA','MARCA','MODELO','TARA_TONELADAS','PBTC_MAX_TONELADAS','ID_EXTERNO','RENAVAM','CHASSI',
         'NUMERO_MOTOR','VERSAO','ANO_FABRICACAO','ANO_MODELO','TIPO_VEICULO','ESPECIE','CARROCERIA','COR',
         'COMBUSTIVEL','NUMERO_EIXOS','LOTACAO_TONELADAS','CAPACIDADE_UTIL_TONELADAS','PROPRIETARIO_DOCUMENTO',
         'PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE',
         'ANTT_RNTRC','ANTT_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','OBSERVACOES']
      : ['PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS',
         'ID_EXTERNO','RENAVAM','CHASSI','MARCA','MODELO','ANO_FABRICACAO','ANO_MODELO','ESPECIE','CARROCERIA',
         'COR','NUMERO_EIXOS','LOTACAO_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME',
         'CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE',
         'STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','OBSERVACOES'];
    fields.forEach(k => {
      if (k === 'OBSERVACOES' && !isNew) return; // preserva anotações administrativas da base operacional
      if (si.index[k] === undefined || ti.index[k] === undefined) return;
      const value = r[si.index[k]];
      if (value !== '' && value !== null && typeof value !== 'undefined') out[ti.index[k]] = value;
    });
    if (ti.index.ANO !== undefined && !out[ti.index.ANO]) {
      const yearKey = si.index.ANO_MODELO !== undefined ? 'ANO_MODELO' : 'ANO_FABRICACAO';
      if (si.index[yearKey] !== undefined) out[ti.index.ANO] = r[si.index[yearKey]];
    }
    if (isNew && ti.index.OBSERVACOES !== undefined) {
      const sourceObs = si.index.OBSERVACOES === undefined ? '' : String(r[si.index.OBSERVACOES] || '');
      const doc = si.index.STATUS_DOCUMENTACAO === undefined ? '' : String(r[si.index.STATUS_DOCUMENTACAO] || '');
      out[ti.index.OBSERVACOES] = [sourceObs, 'Cadastro Bruno; ID externo: ' + externalId,
        'Situação documental: ' + (doc || 'NÃO INFORMADA')].filter(Boolean).join(' | ');
    }
    if (isNew) target.appendRow(out);
    else target.getRange(rowNo, 1, 1, out.length).setValues([out]);
  });
}

function importarConjuntosOperacionaisBrunoFT_(dest) {
  const src = dest.getSheetByName('FT_CADASTRO_BRUNO_CONJUNTOS');
  const target = dest.getSheetByName('CONJUNTOS');
  if (!src || !target) throw new Error('Guia de espelho ou operacional ausente: CONJUNTOS.');
  const si = ftHeadersIndexBruno_(src), ti = ftHeadersIndexBruno_(target);
  ['ID_EXTERNO','CAVALO_ID_EXTERNO'].forEach(k => { if (si.index[k] === undefined) throw new Error('Campo ausente no espelho de conjuntos: ' + k); });
  ['ID','STATUS','ID_EXTERNO','CAVALO_ID','CAVALO_ID_EXTERNO'].forEach(k => { if (ti.index[k] === undefined) throw new Error('Campo ausente em CONJUNTOS: ' + k); });
  const rows = ftRowsBruno_(src, si.headers.length);
  rows.forEach(r => {
    const externalId = String(r[si.index.ID_EXTERNO] || '').trim();
    if (!externalId) return;
    const rowNo = ftFindOperationalRowBruno_(target, ti.index, externalId, '', '');
    const isNew = !rowNo;
    const out = isNew ? new Array(ti.headers.length).fill('') :
      target.getRange(rowNo, 1, 1, ti.headers.length).getValues()[0];
    if (isNew) {
      out[ti.index.ID] = Utilities.getUuid();
      out[ti.index.STATUS] = 'PENDENTE_REVISAO';
      if (ti.index.CRIADO_EM !== undefined) out[ti.index.CRIADO_EM] = new Date();
    }
    const directFields = ['ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME',
      'CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA',
      'CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA','QUANTIDADE_CARRETAS','VINCULO_FIXO',
      'DATA_INICIO_VINCULO','DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR','DATA_AUTORIZACAO',
      'OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'];
    directFields.forEach(k => {
      if (si.index[k] === undefined || ti.index[k] === undefined) return;
      const value = r[si.index[k]];
      if (value !== '' && value !== null && typeof value !== 'undefined') out[ti.index[k]] = value;
    });
    const links = [
      ['MOTORISTA_ID_EXTERNO','MOTORISTA_ID','MOTORISTAS'],
      ['CAVALO_ID_EXTERNO','CAVALO_ID','CAVALOS'],
      ['CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_ID','CARRETAS'],
      ['CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_ID','CARRETAS']
    ];
    links.forEach(pair => {
      if (si.index[pair[0]] === undefined || ti.index[pair[1]] === undefined) return;
      const ext = String(r[si.index[pair[0]]] || '').trim();
      // Campo vazio na origem significa vínculo removido; limpa os dois lados no destino.
      if (!ext) {
        if (ti.index[pair[0]] !== undefined) out[ti.index[pair[0]]] = '';
        out[ti.index[pair[1]]] = '';
        return;
      }
      const lookup = dest.getSheetByName(pair[2]);
      if (!lookup) throw new Error('Guia operacional ausente para vínculo: ' + pair[2]);
      const li = ftHeadersIndexBruno_(lookup).index;
      const found = ftFindOperationalRowBruno_(lookup, li, ext, '', '');
      if (found) {
        out[ti.index[pair[1]]] = lookup.getRange(found, li.ID + 1).getValue();
        if (ti.index[pair[0]] !== undefined) out[ti.index[pair[0]]] = ext;
      } else {
        out[ti.index[pair[1]]] = '';
      }
    });
    if (isNew) target.appendRow(out);
    else target.getRange(rowNo, 1, 1, out.length).setValues([out]);
  });
}

/** Mantida por compatibilidade com chamadas antigas; agora importa todos os cadastros permitidos. */
function importarCavalosECarretasOperacionaisFT_(dest) {
  importarCadastrosOperacionaisBrunoFT_(dest);
}

function numOrBlankFT_(v) {
  if (v === '' || v === null || typeof v === 'undefined') return '';
  const n = Number(v);
  return isFinite(n) ? n : '';
}

function protegerCabecalhoFT_(sheet, description) {
  const range = sheet.getRange(1,1,1,sheet.getMaxColumns());
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
  if (protections.some(function(p){return p.getRange().getA1Notation() === range.getA1Notation();})) return;
  const p = range.protect().setDescription(description);
  p.setWarningOnly(false);
  const editors = p.getEditors();
  if (editors.length) p.removeEditors(editors);
  if (p.canDomainEdit()) p.setDomainEdit(false);
}


/** Configura CONJUNTOS como painel central. Somente a seleção do motorista fica editável. */
function configurarEdicaoMotoristaConjuntoBrunoFullTime_(ss) {
  const sh=ss.getSheetByName('CONJUNTOS'), mot=ss.getSheetByName('MOTORISTAS');
  if(!sh||!mot) throw new Error('Guia MOTORISTAS ou CONJUNTOS ausente.');
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(x=>String(x).trim()), ix={};
  h.forEach((x,i)=>ix[x]=i+1);
  ['ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CAPACIDADE_UTIL_TONELADAS'].forEach(k=>{if(!ix[k])throw new Error('Falta coluna '+k+' em CONJUNTOS.');});
  const edit=sh.getRange(2,ix.MOTORISTA_ID_EXTERNO,sh.getMaxRows()-1,1);
  if(mot.getLastRow()>=2) edit.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(mot.getRange(2,1,mot.getLastRow()-1,1),true).setAllowInvalid(false).setHelpText('Selecione o motorista deste conjunto.').build());
  const desc='Full Time — CONJUNTOS: edição exclusiva do motorista';
  let p=sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).find(x=>x.getDescription()===desc);
  if(!p)p=sh.protect().setDescription(desc);
  p.setWarningOnly(false); p.setUnprotectedRanges([edit]);
  const editors=p.getEditors(); if(editors.length)p.removeEditors(editors);
  if(p.canDomainEdit())p.setDomainEdit(false);
  sh.setFrozenRows(1);
  ['MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CAPACIDADE_UTIL_TONELADAS'].forEach(k=>sh.getRange(1,ix[k]).setNote('Campo automático/controlado pela administração. Não editar.'));
  sh.getRange(1,ix.MOTORISTA_ID_EXTERNO).setNote('ÚNICA COLUNA EDITÁVEL PELO BRUNO: selecione o motorista do conjunto.');
  return {guia:'CONJUNTOS',campoEditavel:'MOTORISTA_ID_EXTERNO',protecao:'demais células bloqueadas'};
}

/** Atualiza nome/CPF e impede que um motorista fique em dois conjuntos ativos. */
function onEditConjuntosBrunoFullTime(e) {
  if(!e||!e.range)return;
  const sh=e.range.getSheet(), row=e.range.getRow();
  if(sh.getName()!=='CONJUNTOS'||row<2)return;
  const h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(x=>String(x).trim()), ix={};
  h.forEach((x,i)=>ix[x]=i+1);
  if(e.range.getColumn()!==ix.MOTORISTA_ID_EXTERNO)return;
  const id=String(e.value||'').trim(), ss=sh.getParent(), mot=ss.getSheetByName('MOTORISTAS');
  if(!id){sh.getRange(row,ix.MOTORISTA_CPF).clearContent();sh.getRange(row,ix.MOTORISTA_NOME).clearContent();return;}
  const mh=mot.getRange(1,1,1,mot.getLastColumn()).getDisplayValues()[0].map(x=>String(x).trim()), mi={};
  mh.forEach((x,i)=>mi[x]=i);
  const mr=mot.getLastRow()>1?mot.getRange(2,1,mot.getLastRow()-1,mot.getLastColumn()).getValues():[];
  const driver=mr.find(x=>String(x[mi.ID_EXTERNO]||'').trim()===id);
  if(!driver){e.range.clearContent();throw new Error('Motorista não encontrado.');}
  const all=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues():[];
  const duplicate=all.some((x,i)=>i+2!==row&&String(x[ix.MOTORISTA_ID_EXTERNO-1]||'').trim()===id&&!['ENCERRADO','CANCELADO','INATIVO'].includes(String(x[ix.STATUS_VINCULO-1]||'').trim().toUpperCase()));
  if(duplicate){e.range.clearContent();sh.getRange(row,ix.MOTORISTA_CPF).clearContent();sh.getRange(row,ix.MOTORISTA_NOME).clearContent();throw new Error('Motorista já vinculado a outro conjunto ativo.');}
  sh.getRange(row,ix.MOTORISTA_CPF).setValue(driver[mi.CPF]||'');
  sh.getRange(row,ix.MOTORISTA_NOME).setValue(driver[mi.NOME_COMPLETO]||'');
  if(ix.ATUALIZADO_POR)sh.getRange(row,ix.ATUALIZADO_POR).setValue(Session.getActiveUser().getEmail()||'BRUNO');
}

/** Execute uma vez na planilha de cadastro do Bruno para aplicar a proteção. */
function configurarConjuntosBrunoFullTime(){
  const ss=SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const result=configurarEdicaoMotoristaConjuntoBrunoFullTime_(ss);
  const handler='onEditConjuntosBrunoFullTime';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).forSpreadsheet(ss).onEdit().create();
  result.gatilhoEdicao='instalado';
  return result;
}

function criarFormularioMotoristasFullTime() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('FT_MOTORISTAS_FORM_ID');
  if (existingId) {
    const existing = FormApp.openById(existingId);
    console.log('O formulário já existe: ' + existing.getPublishedUrl());
    return {editUrl: existing.getEditUrl(), responderUrl: existing.getPublishedUrl()};
  }
  const form = FormApp.create(FT_BRUNO_CONFIG.FORM_TITLE);
  form.setDescription(FT_BRUNO_CONFIG.FORM_DESCRIPTION)
      .setConfirmationMessage('Recebemos seus dados. A equipe da Full Time fará a conferência antes da aprovação do cadastro.')
      .setCollectEmail(false)
      .setProgressBar(true);
  form.addTextItem().setTitle('Nome completo').setRequired(true);
  form.addTextItem().setTitle('CPF').setHelpText('Informe apenas os números.').setRequired(true);
  form.addTextItem().setTitle('RG').setRequired(false);
  form.addDateItem().setTitle('Data de nascimento').setRequired(true);
  form.addTextItem().setTitle('Telefone com DDD').setRequired(true);
  form.addTextItem().setTitle('WhatsApp com DDD').setRequired(false);
  form.addTextItem().setTitle('E-mail').setRequired(true);
  form.addTextItem().setTitle('Endereço').setRequired(false);
  form.addTextItem().setTitle('Cidade').setRequired(true);
  form.addTextItem().setTitle('UF').setRequired(true);
  form.addTextItem().setTitle('CEP').setRequired(false);
  form.addTextItem().setTitle('Número da CNH').setRequired(true);
  form.addListItem().setTitle('Categoria da CNH').setChoiceValues(['A','B','C','D','E','AB','AC','AD','AE']).setRequired(true);
  form.addDateItem().setTitle('Primeira habilitação').setRequired(false);
  form.addDateItem().setTitle('Validade da CNH').setRequired(true);
  form.addMultipleChoiceItem().setTitle('Exerce atividade remunerada (EAR)?').setChoiceValues(['Sim','Não','Não sei informar']).setRequired(true);
  form.addDateItem().setTitle('Validade do exame toxicológico (se aplicável)').setRequired(false);
  form.addParagraphTextItem().setTitle('Observações').setRequired(false);
  form.addCheckboxItem().setTitle('Declaração').setChoiceValues(['Declaro que as informações fornecidas são verdadeiras e autorizo seu uso para análise cadastral e gestão operacional pela Full Time, conforme o aviso de privacidade informado pela empresa.']).setRequired(true);
  const destination = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, destination.getId());
  props.setProperty('FT_MOTORISTAS_FORM_ID', form.getId());
  props.setProperty('FT_MOTORISTAS_FORM_EDIT_URL', form.getEditUrl());
  props.setProperty('FT_MOTORISTAS_FORM_RESPONDER_URL', form.getPublishedUrl());
  console.log('Link para editar formulário: ' + form.getEditUrl());
  console.log('Link para enviar aos motoristas: ' + form.getPublishedUrl());
  console.log('As respostas serão armazenadas na planilha operacional, em uma guia própria do Forms; elas não ativam motoristas automaticamente.');
  return {editUrl:form.getEditUrl(), responderUrl:form.getPublishedUrl()};
}

function criarGatilhoSincronizacaoBrunoFullTime() {
  const fn = 'sincronizarCadastroBrunoFullTime';
  ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction()===fn;}).forEach(function(t){ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger(fn).timeBased().everyHours(1).create();
  console.log('Gatilho criado: sincronização horária. Execute somente depois de validar a importação manual.');
}

function protegerGuiaInteiraFT_(sheet, description) {
  const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  if (protections.some(function(p){return p.getDescription() === description;})) return;
  const p = sheet.protect().setDescription(description);
  p.setWarningOnly(false);
  const editors = p.getEditors();
  if (editors.length) p.removeEditors(editors);
  if (p.canDomainEdit()) p.setDomainEdit(false);
}

function atualizarLinksGuiasFullTime_() {
  const source = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const dest = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  let links = dest.getSheetByName('LINKS_GUIAS');
  if (!links) links = dest.insertSheet('LINKS_GUIAS', 0);
  const rows = [['PLANILHA','GUIA','LINK','FINALIDADE']];
  // Lista explícita e permitida. Nunca enumerar as guias da planilha do Bruno.
  const sourceAllowlist = ['MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','OPERACOES','CONTROLE_DOCUMENTAL','INSTRUCOES','ENTRADA_OPERACOES_IA','PLANILHABRUNO_AUDITORIA_SINCRONIZACAO'];
  sourceAllowlist.forEach(function(name) {
    const sh = source.getSheetByName(name);
    if (!sh) return;
    rows.push(['Cadastro Bruno', name, source.getUrl() + '#gid=' + sh.getSheetId(), 'Entrada de dados; edite apenas as linhas de cadastro, sem alterar cabeçalhos.']);
  });
  dest.getSheets().forEach(function(sh) {
    if (sh.getName() === 'LINKS_GUIAS') return;
    rows.push(['Full Time — Principal', sh.getName(), dest.getUrl() + '#gid=' + sh.getSheetId(), 'Base operacional ou guia de controle; não editar dados sincronizados manualmente.']);
  });
  links.clearContents();
  links.getRange(1,1,rows.length,4).setValues(rows);
  links.setFrozenRows(1);
  links.getRange(1,1,1,4).setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c');
  if (rows.length > 1) links.getRange(2,3,rows.length-1,1).setShowHyperlink(true);
  links.autoResizeColumns(1,4);
  protegerGuiaInteiraFT_(links, 'Full Time — links de navegação controlados pelo sistema');
  return dest.getUrl() + '#gid=' + links.getSheetId();
}


/**
 * Auditoria pós-sincronização — somente leitura.
 * Consulta apenas guias explicitamente permitidas. NUNCA enumera guias da origem.
 * Não grava, não corrige, não cria guias e não altera status.
 */
function auditarSincronizacaoCadastroBrunoFullTime() {
  const source = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const dest = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  const specs = [
    {source:'MOTORISTAS',mirror:'FT_CADASTRO_BRUNO_MOTORISTAS',target:'MOTORISTAS',key:'ID_EXTERNO'},
    {source:'CAVALOS',mirror:'FT_CADASTRO_BRUNO_CAVALOS',target:'CAVALOS',key:'ID_EXTERNO'},
    {source:'CARRETAS',mirror:'FT_CADASTRO_BRUNO_CARRETAS',target:'CARRETAS',key:'ID_EXTERNO'},
    {source:'CONJUNTOS',mirror:'FT_CADASTRO_BRUNO_CONJUNTOS',target:'CONJUNTOS',key:'ID_EXTERNO'},
    {source:'CONTROLE_DOCUMENTAL',mirror:'FT_CADASTRO_BRUNO_DOCUMENTOS',target:'',key:'ID_DOCUMENTO'}
  ];
  const report = {
    auditoria:'FULLTIME_2_0_POS_SINCRONIZACAO',
    somenteLeitura:true,
    guiasOrigemPermitidas:specs.map(x=>x.source),
    guiaProibida:'CAVALOS-BRUNO — NÃO CONSULTADA',
    resultados:[],
    problemas:[]
  };
  const readRows = (sh, headers) => {
    const last = sh.getLastRow();
    return last > 1 ? sh.getRange(2,1,last-1,headers.length).getValues()
      .filter(row=>row.some(v=>v!==''&&v!==null)) : [];
  };
  const indexHeaders = sh => {
    const h=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim());
    const ix={}; h.forEach((v,i)=>{if(v)ix[v]=i;});
    return {headers:h,index:ix};
  };
  const keySet = (rows, idx) => {
    const set={}, duplicates=[];
    rows.forEach(r=>{
      const k=String(r[idx]||'').trim();
      if(!k)return;
      if(set[k])duplicates.push(k);
      set[k]=true;
    });
    return {set,duplicates};
  };
  const targetMaps = {};
  specs.forEach(p=>{
    const src=source.getSheetByName(p.source);
    const mirror=dest.getSheetByName(p.mirror);
    const target=p.target?dest.getSheetByName(p.target):null;
    if(!src||!mirror||(p.target&&!target)){
      report.problemas.push('Guia ausente na verificação de '+p.source);
      return;
    }
    const expected=FT_BRUNO_HEADERS[p.source];
    const srcHeaders=src.getRange(1,1,1,expected.length).getDisplayValues()[0].map(v=>String(v||'').trim());
    const mirHeaders=mirror.getRange(1,1,1,expected.length).getDisplayValues()[0].map(v=>String(v||'').trim());
    const srcRows=readRows(src,expected), mirRows=readRows(mirror,expected);
    const srcKeys=keySet(srcRows,expected.indexOf(p.key));
    const mirKeys=keySet(mirRows,expected.indexOf(p.key));
    const missingMirror=Object.keys(srcKeys.set).filter(k=>!mirKeys.set[k]);
    const missingSource=Object.keys(mirKeys.set).filter(k=>!srcKeys.set[k]);
    let missingOperational=[], extraOperational=[], operationalDuplicates=[];
    const item={
      guia:p.source,espelho:p.mirror,operacional:p.target||'somente espelho',
      origem:srcRows.length,espelhoRegistros:mirRows.length,
      chavesOrigemDuplicadas:srcKeys.duplicates,
      chavesEspelhoDuplicadas:mirKeys.duplicates,
      ausentesNoEspelho:missingMirror,
      extrasNoEspelho:missingSource,
      cabecalhosOrigemOK:expected.every((h,i)=>srcHeaders[i]===h),
      cabecalhosEspelhoOK:expected.every((h,i)=>mirHeaders[i]===h)
    };
    if(p.target){
      const ti=indexHeaders(target), tr=readRows(target,ti.headers);
      const targetKeys=keySet(tr,ti.index.ID_EXTERNO);
      missingOperational=Object.keys(srcKeys.set).filter(k=>!targetKeys.set[k]);
      extraOperational=Object.keys(targetKeys.set).filter(k=>!srcKeys.set[k]);
      operationalDuplicates=targetKeys.duplicates;
      const pending=ti.index.STATUS===undefined?0:tr.filter(r=>String(r[ti.index.STATUS]||'').toUpperCase()==='PENDENTE_REVISAO').length;
      item.operacionalRegistros=tr.length;
      item.operacionalComIDExterno=Object.keys(targetKeys.set).length;
      item.ausentesNoOperacional=missingOperational;
      item.extrasNoOperacional=extraOperational;
      item.statusPendenteRevisao=pending;
      item.chavesOperacionaisDuplicadas=targetKeys.duplicates;
      targetMaps[p.target]={sheet:target,index:ti.index,rows:tr};
    }
    report.resultados.push(item);
    if(!item.cabecalhosOrigemOK||!item.cabecalhosEspelhoOK)report.problemas.push(p.source+': cabeçalho divergente.');
    if(srcKeys.duplicates.length||mirKeys.duplicates.length)report.problemas.push(p.source+': chave duplicada na origem ou espelho.');
    if(missingMirror.length||missingSource.length)report.problemas.push(p.source+': divergência entre origem e espelho.');
    if(p.target&&(missingOperational.length||extraOperational.length||operationalDuplicates.length))report.problemas.push(p.target+': divergência de ID_EXTERNO na base operacional.');
  });

  // Confere se os IDs internos gravados em CONJUNTOS apontam para registros existentes.
  const setInfo=targetMaps.CONJUNTOS;
  if(setInfo){
    const relations=[
      ['MOTORISTA_ID','MOTORISTAS'],['CAVALO_ID','CAVALOS'],
      ['CARRETA_MEIO_ID','CARRETAS'],['CARRETA_FINAL_ID','CARRETAS']
    ];
    const lookup={};
    Object.keys(targetMaps).forEach(name=>{
      const t=targetMaps[name], idCol=t.index.ID;
      lookup[name]={};
      if(idCol!==undefined)t.rows.forEach(r=>{
        const id=String(r[idCol]||'').trim(); if(id)lookup[name][id]=true;
      });
    });
    report.vinculos={};
    relations.forEach(([field,entity])=>{
      const col=setInfo.index[field];
      if(col===undefined){report.problemas.push('CONJUNTOS: coluna ausente '+field);return;}
      const missing=[];
      setInfo.rows.forEach((r,i)=>{
        const id=String(r[col]||'').trim();
        if(id&&!lookup[entity][id])missing.push({linha:i+2,id:id});
      });
      report.vinculos[field]={preenchidos:setInfo.rows.filter(r=>String(r[col]||'').trim()).length,semCorrespondencia:missing};
      if(missing.length)report.problemas.push('Vínculos inválidos em CONJUNTOS.'+field+': '+missing.length);
    });
  }
  report.sucesso=report.problemas.length===0;
  Logger.log('FULLTIME 2.0 — AUDITORIA PÓS-SINCRONIZAÇÃO: '+JSON.stringify(report));
  return report;
}
