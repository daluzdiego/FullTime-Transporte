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
  CONJUNTOS: ['ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA','QUANTIDADE_CARRETAS','VINCULO_FIXO','DATA_INICIO_VINCULO','DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR','DATA_AUTORIZACAO','OBSERVACOES'],
  CONTROLE_DOCUMENTAL: ['ID_DOCUMENTO','TIPO_REGISTRO','ID_EXTERNO_REGISTRO','PLACA_OU_CPF','TIPO_DOCUMENTO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','STATUS_DOCUMENTO','LINK_ARQUIVO','DATA_CONFERENCIA','CONFERIDO_POR','PENDENCIA','OBSERVACOES']
});

function configurarIntegracaoCadastroBrunoFullTime() {
  const origem = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const destino = SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  const required = Object.keys(FT_BRUNO_HEADERS);
  required.forEach(function(name) {
    const sh = origem.getSheetByName(name);
    if (!sh) throw new Error('Guia obrigatória não encontrada na planilha do Bruno: ' + name);
    const got = sh.getRange(1, 1, 1, FT_BRUNO_HEADERS[name].length).getDisplayValues()[0];
    const expected = FT_BRUNO_HEADERS[name];
    if (expected.some(function(h, i) { return String(got[i] || '').trim() !== h; })) {
      throw new Error('Cabeçalhos divergentes em ' + name + '. Nenhuma sincronização foi executada.');
    }
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
    } else if (headers.some(function(h,i){return String(row[i] || '').trim() !== h;})) {
      throw new Error('A guia de espelho ' + name + ' já existe com cabeçalhos diferentes. Nenhuma informação foi sobrescrita.');
    }
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c').setWrap(true);
    protegerCabecalhoFT_(sh, 'Full Time — cabeçalho controlado pelo sistema');
    protegerGuiaInteiraFT_(sh, 'Full Time — espelho sincronizado; edição manual bloqueada');
  });
  protegerCabecalhoFT_(origem.getSheetByName('MOTORISTAS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CAVALOS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CARRETAS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CONJUNTOS'), 'Full Time — cabeçalho do cadastro');
  protegerCabecalhoFT_(origem.getSheetByName('CONTROLE_DOCUMENTAL'), 'Full Time — cabeçalho do cadastro');
  atualizarLinksGuiasFullTime_();
  PropertiesService.getScriptProperties().setProperty('FT_BRUNO_SOURCE_ID', FT_BRUNO_CONFIG.SOURCE_ID);
  PropertiesService.getScriptProperties().setProperty('FT_BRUNO_OPERATIONAL_ID', FT_BRUNO_CONFIG.OPERATIONAL_ID);
  console.log('Configuração concluída. Origem: ' + origem.getUrl() + ' | Destino: ' + destino.getUrl());
  return {origem: origem.getUrl(), destino: destino.getUrl(), guiasEspelho: Object.keys(mirrorHeaders)};
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
    importarCavalosECarretasOperacionaisFT_(dest);
    console.log('Sincronização concluída: ' + JSON.stringify(summary));
    return {ok:true, linhasLidas:summary, mensagem:'Fichas detalhadas atualizadas. Novos veículos operacionais ficam PENDENTE_REVISAO.'};
  } finally {
    lock.releaseLock();
  }
}

/** Acha a linha de origem pelo conteúdo da linha; evita depender de uma posição calculada fora do laço. */
function importarCavalosECarretasOperacionaisFT_(dest) {
  const pairs = [
    {source:'FT_CADASTRO_BRUNO_CAVALOS', target:'CAVALOS', type:'CAVALO'},
    {source:'FT_CADASTRO_BRUNO_CARRETAS', target:'CARRETAS', type:'CARRETA'}
  ];
  pairs.forEach(function(p) {
    const src = dest.getSheetByName(p.source), target = dest.getSheetByName(p.target);
    if (!src || !target) throw new Error('Guia operacional ausente: ' + p.target);
    const headers = src.getRange(1,1,1,src.getLastColumn()).getDisplayValues()[0];
    const idx = {}; headers.forEach(function(h,i){idx[h]=i;});
    const rows = src.getLastRow() > 1 ? src.getRange(2,1,src.getLastRow()-1,headers.length).getValues() : [];
    const targetRows = target.getLastRow() > 1 ? target.getDataRange().getValues() : [];
    const bySourceId = {}, byPlate = {};
    targetRows.slice(1).forEach(function(r,i) {
      if (r[0]) bySourceId[String(r[0])] = i+2;
      if (r[3]) {
        const normalized = String(r[3]).toUpperCase().replace(/[^A-Z0-9]/g,'');
        if (!byPlate[normalized]) byPlate[normalized] = [];
        byPlate[normalized].push({row:i+2, id:String(r[0]||''), status:String(r[2]||'')});
      }
    });
    rows.forEach(function(r) {
      const externalId = String(r[idx.ID_EXTERNO] || '').trim();
      const plate = String(r[idx.PLACA] || '').trim().toUpperCase();
      if (!externalId || !plate) return;
      const normPlate = plate.replace(/[^A-Z0-9]/g,'');
      let rowNo = bySourceId[externalId];
      if (!rowNo && byPlate[normPlate] && byPlate[normPlate].length) {
        throw new Error('A placa ' + plate + ' já existe na guia ' + p.target + ' com outro ID. A sincronização não sobrescreveu esse registro; faça a conciliação manual.');
      }
      const statusDoc = String(r[idx.STATUS_DOCUMENTACAO] || '').trim().toUpperCase();
      const obs = 'Importado da planilha de cadastro do Bruno; ID externo: ' + externalId + '; situação documental: ' + (statusDoc || 'NÃO INFORMADA') + '. Aprovação operacional pendente.';
      if (p.type === 'CAVALO') {
        const payload = [externalId,new Date(),'PENDENTE_REVISAO',plate,String(r[idx.MARCA]||''),String(r[idx.MODELO]||''),String(r[idx.ANO_FABRICACAO]||''),numOrBlankFT_(r[idx.TARA_TONELADAS]),numOrBlankFT_(r[idx.PBTC_MAX_TONELADAS]),obs];
        if (rowNo) target.getRange(rowNo,1,1,10).setValues([payload]);
        else target.appendRow(payload);
      } else {
        const payload = [externalId,new Date(),'PENDENTE_REVISAO',plate,String(r[idx.TIPO_CARRETA]||''),numOrBlankFT_(r[idx.TARA_TONELADAS]),numOrBlankFT_(r[idx.CAPACIDADE_CARGA_TONELADAS]),numOrBlankFT_(r[idx.PBTC_MAX_TONELADAS]),obs];
        if (rowNo) target.getRange(rowNo,1,1,9).setValues([payload]);
        else target.appendRow(payload);
      }
    });
  });
}

/**
 * Gera capacidades FICTÍCIAS para testes controlados.
 * Não sobrescreve nenhum valor existente. Executar apenas na base de testes.
 * As linhas recebem observação explícita para impedir uso operacional real.
 */
function gerarCapacidadesAmostraFrotaFullTime(confirmacao) {
  if (String(confirmacao || '') !== 'CONFIRMO_CAPACIDADES_FICTICIAS_TESTE') {
    throw new Error('Confirmação inválida. Informe CONFIRMO_CAPACIDADES_FICTICIAS_TESTE para gerar valores de teste.');
  }
  const ss = SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const specs = [
    {sheet:'CAVALOS', fields:['ID_EXTERNO','NUMERO_EIXOS','LOTACAO_TONELADAS','PBTC_MAX_TONELADAS','CAPACIDADE_UTIL_TONELADAS','OBSERVACOES'], kind:'CAVALO'},
    {sheet:'CARRETAS', fields:['ID_EXTERNO','NUMERO_EIXOS','LOTACAO_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'], kind:'CARRETA'}
  ];
  const summary = {};
  specs.forEach(spec => {
    const sh = ss.getSheetByName(spec.sheet);
    if (!sh || sh.getLastRow() < 2) { summary[spec.sheet] = {linhas:0, preenchidos:0}; return; }
    const values = sh.getDataRange().getValues();
    const headers = values[0].map(h => String(h).trim());
    const col = {};
    headers.forEach((h,i) => col[h] = i);
    spec.fields.forEach(f => { if (col[f] === undefined) throw new Error('Coluna obrigatória ausente em '+spec.sheet+': '+f); });
    let filled = 0;
    for (let i=1; i<values.length; i++) {
      const row = values[i];
      const id = String(row[col.ID_EXTERNO] || '').trim();
      if (!id) continue;
      const axles = Math.max(2, Number(row[col.NUMERO_EIXOS]) || (spec.kind === 'CAVALO' ? 6 : 3));
      const n = i - 1;
      const note = 'DADO FICTÍCIO DE CAPACIDADE GERADO PARA TESTES — NÃO USAR EM OPERAÇÃO REAL.';
      if (spec.kind === 'CAVALO') {
        const lotacao = 28 + (n % 5) * 2;
        const pbtc = lotacao + 10 + Math.min(axles, 8);
        const util = Math.min(lotacao, pbtc - 10);
        [['LOTACAO_TONELADAS',lotacao],['PBTC_MAX_TONELADAS',pbtc],['CAPACIDADE_UTIL_TONELADAS',util]].forEach(pair => {
          if (row[col[pair[0]]] === '' || row[col[pair[0]]] == null) { row[col[pair[0]]] = pair[1]; filled++; }
        });
      } else {
        const cargo = 25 + (n % 6) * 2;
        const lotacao = cargo;
        const pbtc = cargo + 8 + Math.min(axles, 6);
        [['LOTACAO_TONELADAS',lotacao],['CAPACIDADE_CARGA_TONELADAS',cargo],['PBTC_MAX_TONELADAS',pbtc]].forEach(pair => {
          if (row[col[pair[0]]] === '' || row[col[pair[0]]] == null) { row[col[pair[0]]] = pair[1]; filled++; }
        });
      }
      const obsCol = col.OBSERVACOES;
      const oldObs = String(row[obsCol] || '');
      if (!oldObs.includes('DADO FICTÍCIO DE CAPACIDADE')) row[obsCol] = (oldObs ? oldObs+' | ' : '') + note;
    }
    if (values.length > 1) sh.getRange(2,1,values.length-1,headers.length).setValues(values.slice(1));
    summary[spec.sheet] = {linhas:values.length-1, camposPreenchidos:filled};
  });
  const sync = sincronizarCadastroBrunoFullTime();
  return {ok:true, aviso:'Valores sintéticos exclusivamente para testes. Não usar em operação real.', capacidades:summary, sincronizacao:sync};
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
  source.getSheets().forEach(function(sh) {
    rows.push(['Cadastro Bruno', sh.getName(), source.getUrl() + '#gid=' + sh.getSheetId(), 'Entrada de dados; edite apenas as linhas de cadastro, sem alterar cabeçalhos.']);
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
 * Sincronização recorrente Bruno → Full Time.
 * Instala um único gatilho de 5 minutos para manter telefones e demais campos
 * do espelho atualizados sem intervenção manual. Não sincroniza Full Time → Bruno.
 */
function instalarSincronizacaoAutomaticaBrunoFullTime() {
  const handler='sincronizarCadastroBrunoFullTime';
  const triggers=ScriptApp.getProjectTriggers();
  triggers.filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(5).create();
  const result=sincronizarCadastroBrunoFullTime();
  return {ok:true,frequencia:'A cada 5 minutos',gatilho:handler,primeiraSincronizacao:result};
}

/** Diagnóstico seguro: compara telefone na origem e no espelho, sem gravar dados. */
function diagnosticarTelefoneMotoristasBrunoFullTime() {
  const source=SpreadsheetApp.openById(FT_BRUNO_CONFIG.SOURCE_ID);
  const dest=SpreadsheetApp.openById(FT_BRUNO_CONFIG.OPERATIONAL_ID);
  const src=source.getSheetByName('MOTORISTAS'),dst=dest.getSheetByName('FT_CADASTRO_BRUNO_MOTORISTAS');
  if(!src||!dst)throw new Error('Guia MOTORISTAS ou espelho não encontrado.');
  const sh=src.getDataRange().getValues(),dh=dst.getDataRange().getValues();
  const si={},di={};(sh[0]||[]).forEach((v,i)=>si[String(v).trim().toUpperCase()]=i);(dh[0]||[]).forEach((v,i)=>di[String(v).trim().toUpperCase()]=i);
  ['ID_EXTERNO','TELEFONE'].forEach(k=>{if(si[k]===undefined||di[k]===undefined)throw new Error('Cabeçalho '+k+' ausente na origem ou espelho.');});
  const destById={};dh.slice(1).forEach(r=>{const id=String(r[di.ID_EXTERNO]||'').trim();if(id)destById[id]=String(r[di.TELEFONE]||'').trim();});
  const divergencias=[];sh.slice(1).forEach((r,i)=>{const id=String(r[si.ID_EXTERNO]||'').trim();if(!id)return;const phone=String(r[si.TELEFONE]||'').trim(),mirror=destById[id]||'';if(phone!==mirror)divergencias.push({id,linhaOrigem:i+2,telefoneOrigem:phone,telefoneEspelho:mirror});});
  return {origem:sh.length-1,espelho:dh.length-1,divergencias:divergencias.length,amostra:divergencias.slice(0,20)};
}
