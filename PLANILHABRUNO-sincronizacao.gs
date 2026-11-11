/**
 * FULL TIME — PLANILHA BRUNO: SINCRONIZAÇÃO V2.2
 * Arquivo oficial: PLANILHABRUNO-sincronizacao.gs
 *
 * Executar primeiro PLANILHABRUNO_validarSincronizacaoV2().
 * Após revisar o relatório, executar PLANILHABRUNO_sincronizarLoteTesteV2().
 *
 * Só transfere o lote fictício FT-TESTE-20261029-.
 * Acrescenta cabeçalhos ao fim; não renomeia nem exclui campos/linhas.
 * Não acessa CAVALOS-BRUNO.
 */
const PLANILHABRUNO_SYNC_V2 = Object.freeze({
  DESTINO_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  LOTE: 'FT-TESTE-20261029-',
  AUDITORIA: 'PLANILHABRUNO_AUDITORIA_SINCRONIZACAO',
  VERSION: 'V2.2',
  GUIAS: [
    { origem: 'MOTORISTAS', destino: 'FT_CADASTRO_BRUNO_MOTORISTAS', chave: 'ID_EXTERNO', extras: ['STATUS'] },
    { origem: 'CAVALOS', destino: 'FT_CADASTRO_BRUNO_CAVALOS', chave: 'ID_EXTERNO', extras: ['STATUS'] },
    { origem: 'CARRETAS', destino: 'FT_CADASTRO_BRUNO_CARRETAS', chave: 'ID_EXTERNO', extras: ['STATUS'] },
    { origem: 'CONJUNTOS', destino: 'FT_CADASTRO_BRUNO_CONJUNTOS', chave: 'ID_EXTERNO', extras: ['STATUS','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'] },
    { origem: 'CONTROLE_DOCUMENTAL', destino: 'FT_CADASTRO_BRUNO_DOCUMENTOS', chave: 'ID_DOCUMENTO', extras: [] }
  ]
});

function PLANILHABRUNO_normV2_(v) {
  return String(v == null ? '' : v).trim().toUpperCase();
}
function PLANILHABRUNO_headersV2_(sh) {
  return !sh || sh.getLastColumn() < 1 ? [] :
    sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim());
}
function PLANILHABRUNO_indexV2_(headers) {
  const out = {};
  headers.forEach((h,i)=>{ const k=PLANILHABRUNO_normV2_(h); if(k && out[k]===undefined) out[k]=i; });
  return out;
}
function PLANILHABRUNO_rowsV2_(sh) {
  return !sh || sh.getLastRow()<2 || sh.getLastColumn()<1 ? [] :
    sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
}

/**
 * IDs canônicos do lote 40x4. Registros antigos com o mesmo prefixo,
 * mas fora desta lista, permanecem intactos e não entram nesta sincronização.
 */
function PLANILHABRUNO_idsEsperadosLoteV2_(cfg) {
  const p=PLANILHABRUNO_SYNC_V2.LOTE;
  const ids=[];
  const add=(tipo,n)=>ids.push(p+tipo+'-'+String(n).padStart(3,'0'));
  if(cfg.origem==='MOTORISTAS')for(let n=1;n<=40;n++)add('MOT',n);
  else if(cfg.origem==='CAVALOS')for(let n=1;n<=40;n++)add('CAV',n);
  else if(cfg.origem==='CARRETAS')for(let n=1;n<=40;n++)add('CAR',n);
  else if(cfg.origem==='CONJUNTOS')for(let n=1;n<=40;n++)add('CJT',n);
  else if(cfg.origem==='CONTROLE_DOCUMENTAL')for(let n=1;n<=40;n++){add('DOC-MOT',n);add('DOC-CAV',n);add('DOC-CAR',n);}
  return ids;
}
function PLANILHABRUNO_prepareHeadersV2_(sh, required) {
  let headers=PLANILHABRUNO_headersV2_(sh);
  if (!headers.some(Boolean)) {
    if (sh.getLastRow()>0) throw new Error(sh.getName()+': existem dados sem cabeçalho; gravação bloqueada.');
    const unique=[...new Set(required.filter(Boolean))];
    sh.getRange(1,1,1,unique.length).setValues([unique]);
    sh.setFrozenRows(1);
    return unique;
  }
  const have=new Set(headers.map(PLANILHABRUNO_normV2_).filter(Boolean));
  const missing=[...new Set(required.filter(h=>h && !have.has(PLANILHABRUNO_normV2_(h))))];
  if (missing.length) sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  return PLANILHABRUNO_headersV2_(sh);
}
function PLANILHABRUNO_auditV2_(ss) {
  let sh=ss.getSheetByName(PLANILHABRUNO_SYNC_V2.AUDITORIA);
  const required=['DATA_HORA','LOTE','GUIA_ORIGEM','GUIA_DESTINO','ID_REGISTRO','ACAO','LINHA_DESTINO','DETALHES','EXECUTADO_POR','VERSAO'];
  if(!sh) sh=ss.insertSheet(PLANILHABRUNO_SYNC_V2.AUDITORIA);
  PLANILHABRUNO_prepareHeadersV2_(sh,required);
  return sh;
}
function PLANILHABRUNO_validarSincronizacaoV2() {
  if (PropertiesService.getScriptProperties().getProperty('FT_CENTRALIZED_SCHEMA_VERSION') === '2026.11.11') throw new Error('Sincronização Bruno desativada: o Full Time utiliza exclusivamente a planilha principal.');

  const origem=SpreadsheetApp.getActiveSpreadsheet();
  const destino=SpreadsheetApp.openById(PLANILHABRUNO_SYNC_V2.DESTINO_ID);
  const out={sucesso:true,modo:'VALIDACAO_SEM_ESCRITA',origem:origem.getName(),origemId:origem.getId(),destino:destino.getName(),destinoId:destino.getId(),lote:PLANILHABRUNO_SYNC_V2.LOTE,guias:[],erros:[],avisos:[]};
  PLANILHABRUNO_SYNC_V2.GUIAS.forEach(cfg=>{
    const so=origem.getSheetByName(cfg.origem), sd=destino.getSheetByName(cfg.destino);
    if(!so||!sd){const e='Guia ausente: '+(!so?('origem '+cfg.origem):('destino '+cfg.destino));out.erros.push(e);out.guias.push({origem:cfg.origem,destino:cfg.destino,erro:e});return;}
    const ho=PLANILHABRUNO_headersV2_(so), hd=PLANILHABRUNO_headersV2_(sd), io=PLANILHABRUNO_indexV2_(ho), id=PLANILHABRUNO_indexV2_(hd);
    const ix=io[PLANILHABRUNO_normV2_(cfg.chave)];
    if(ix===undefined){const e=cfg.origem+': falta chave '+cfg.chave;out.erros.push(e);out.guias.push({origem:cfg.origem,destino:cfg.destino,erro:e});return;}
    const expected=PLANILHABRUNO_idsEsperadosLoteV2_(cfg), expectedSet=new Set(expected);
    const sourceAll=PLANILHABRUNO_rowsV2_(so).map((r,i)=>({r:r,n:i+2,id:String(r[ix]||'').trim()})).filter(x=>x.id.startsWith(PLANILHABRUNO_SYNC_V2.LOTE));
    const source=sourceAll.filter(x=>expectedSet.has(x.id));
    const unexpectedSource=sourceAll.filter(x=>!expectedSet.has(x.id)).map(x=>x.id);
    const sourceCounts={};source.forEach(x=>sourceCounts[x.id]=(sourceCounts[x.id]||0)+1);
    const dupSource=Object.keys(sourceCounts).filter(k=>sourceCounts[k]>1);
    const missingExpected=expected.filter(k=>!sourceCounts[k]);
    const destKey=id[PLANILHABRUNO_normV2_(cfg.chave)];
    const destRows=PLANILHABRUNO_rowsV2_(sd);
    const destAll=destKey===undefined?[]:destRows.map(r=>String(r[destKey]||'').trim()).filter(x=>x.startsWith(PLANILHABRUNO_SYNC_V2.LOTE));
    const destIds=destAll.filter(x=>expectedSet.has(x));
    const unexpectedDest=destAll.filter(x=>!expectedSet.has(x));
    const dc={};destIds.forEach(x=>dc[x]=(dc[x]||0)+1);
    const dupDest=Object.keys(dc).filter(k=>dc[k]>1);
    const missing=ho.filter(h=>h&&id[PLANILHABRUNO_normV2_(h)]===undefined);
    out.guias.push({
      origem:cfg.origem,destino:cfg.destino,chave:cfg.chave,
      registrosEsperados:expected.length,registrosLoteOrigem:source.length,
      registrosLoteDestino:destIds.length,
      registrosLegadosMesmoPrefixoOrigemIgnorados:unexpectedSource.length,
      registrosLegadosMesmoPrefixoDestinoIgnorados:unexpectedDest.length,
      idsLegadosOrigem:unexpectedSource,idsLegadosDestino:unexpectedDest,
      idsEsperadosAusentesNaOrigem:missingExpected,
      cabecalhosAusentesNoDestino:missing,
      idsDuplicadosOrigem:dupSource,idsDuplicadosDestino:dupDest
    });
    if(missing.length)out.avisos.push(cfg.destino+': serão acrescentadas colunas ausentes ao final durante a sincronização: '+missing.join(', '));
    if(unexpectedSource.length)out.avisos.push(cfg.origem+': '+unexpectedSource.length+' registro(s) com prefixo antigo serão preservados e ignorados.');
    if(unexpectedDest.length)out.avisos.push(cfg.destino+': '+unexpectedDest.length+' registro(s) com prefixo antigo serão preservados e ignorados.');
    if(missingExpected.length)out.erros.push(cfg.origem+': faltam IDs canônicos do lote: '+missingExpected.join(', '));
    if(dupSource.length)out.erros.push(cfg.origem+': IDs canônicos duplicados na origem.');
    if(dupDest.length)out.erros.push(cfg.destino+': IDs canônicos duplicados no destino.');
  });
  out.sucesso=out.erros.length===0;
  Logger.log('FULL TIME — PLANILHABRUNO VALIDAÇÃO V2.3: '+JSON.stringify(out));
  return out;
}

/**
 * Diagnóstico somente leitura dos cabeçalhos da entrada de operações.
 * Não grava, não move e não exclui colunas ou registros.
 */
function PLANILHABRUNO_diagnosticarCabecalhoEntradaOperacoesIA() {
  if (PropertiesService.getScriptProperties().getProperty('FT_CENTRALIZED_SCHEMA_VERSION') === '2026.11.11') throw new Error('Sincronização Bruno desativada: o Full Time utiliza exclusivamente a planilha principal.');

  const origem = SpreadsheetApp.getActiveSpreadsheet();
  const destino = SpreadsheetApp.openById(PLANILHABRUNO_SYNC_V2.DESTINO_ID);
  const nome = 'ENTRADA_OPERACOES_IA';
  const so = origem.getSheetByName(nome), sd = destino.getSheetByName(nome);
  if (!so || !sd) throw new Error('A guia ' + nome + ' precisa existir nas duas planilhas.');
  const ho = PLANILHABRUNO_headersV2_(so);
  const hd = PLANILHABRUNO_headersV2_(sd);
  const norm = a => a.map(PLANILHABRUNO_normV2_);
  const no = norm(ho), nd = norm(hd);
  const max = Math.max(ho.length, hd.length);
  const diferencasPorPosicao = [];
  for (let i = 0; i < max; i++) {
    if ((no[i] || '') !== (nd[i] || '')) {
      diferencasPorPosicao.push({
        coluna: i + 1,
        origem: ho[i] || '(vazio/ausente)',
        central: hd[i] || '(vazio/ausente)'
      });
    }
  }
  const ausentesNaCentral = ho.filter(h => h && !nd.includes(PLANILHABRUNO_normV2_(h)));
  const ausentesNaOrigem = hd.filter(h => h && !no.includes(PLANILHABRUNO_normV2_(h)));
  const esperado = ['ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL','DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA','ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO'];
  const divergenciasPadrao = esperado.map((h,i) => ({
    coluna: i + 1, esperado: h,
    origem: ho[i] || '(vazio/ausente)',
    central: hd[i] || '(vazio/ausente)'
  })).filter(x => PLANILHABRUNO_normV2_(x.origem) !== PLANILHABRUNO_normV2_(x.esperado) ||
                  PLANILHABRUNO_normV2_(x.central) !== PLANILHABRUNO_normV2_(x.esperado));
  const out = {
    ok: true,
    somenteLeitura: true,
    origem: { nome: origem.getName(), id: origem.getId(), totalColunas: ho.length, cabecalhos: ho },
    central: { nome: destino.getName(), id: destino.getId(), totalColunas: hd.length, cabecalhos: hd },
    cabecalhosIdenticosNaMesmaOrdem: diferencasPorPosicao.length === 0,
    diferencasPorPosicao: diferencasPorPosicao,
    ausentesNaCentral: ausentesNaCentral,
    ausentesNaOrigem: ausentesNaOrigem,
    divergenciasNasPrimeiras12ColunasDoPadrao: divergenciasPadrao
  };
  Logger.log('FULL TIME — DIAGNÓSTICO CABEÇALHOS ENTRADA_OPERACOES_IA: ' + JSON.stringify(out));
  return out;
}
function PLANILHABRUNO_atualizarCabecalhoEntradaOperacoesIA() {
  if (PropertiesService.getScriptProperties().getProperty('FT_CENTRALIZED_SCHEMA_VERSION') === '2026.11.11') throw new Error('Sincronização Bruno desativada: o Full Time utiliza exclusivamente a planilha principal.');

  const origem=SpreadsheetApp.getActiveSpreadsheet();
  const destino=SpreadsheetApp.openById(PLANILHABRUNO_SYNC_V2.DESTINO_ID);
  const nome='ENTRADA_OPERACOES_IA';
  const so=origem.getSheetByName(nome), sd=destino.getSheetByName(nome);
  if(!so||!sd)throw new Error('A guia '+nome+' precisa existir nas duas planilhas antes da atualização.');
  const obrigatorios=[
    'ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL',
    'DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA',
    'ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO',
    'CANAL_ORIGEM','IDENTIFICADOR_ORIGEM','CHAVE_IDEMPOTENCIA',
    'ATUALIZADO_EM','HISTORICO_JSON','ID_OPERACAO_GERADA'
  ];
  if(!PLANILHABRUNO_headersV2_(so).some(Boolean)||!PLANILHABRUNO_headersV2_(sd).some(Boolean))
    throw new Error('Cabeçalhos ausentes em '+nome+'. Nenhuma alteração foi feita.');
  // Acrescenta somente campos ausentes ao final de cada guia. Preserva a ordem e os dados existentes.
  const antesOrigem=PLANILHABRUNO_headersV2_(so);
  const antesCentral=PLANILHABRUNO_headersV2_(sd);
  const hs=PLANILHABRUNO_prepareHeadersV2_(so,obrigatorios);
  const hd=PLANILHABRUNO_prepareHeadersV2_(sd,obrigatorios);
  const normSet=a=>new Set(a.map(PLANILHABRUNO_normV2_).filter(Boolean));
  const setS=normSet(hs), setD=normSet(hd);
  const faltamNaOrigem=obrigatorios.filter(h=>!setS.has(PLANILHABRUNO_normV2_(h)));
  const faltamNaCentral=obrigatorios.filter(h=>!setD.has(PLANILHABRUNO_normV2_(h)));
  if(faltamNaOrigem.length||faltamNaCentral.length) {
    throw new Error('Ainda faltam campos obrigatórios em '+nome+'. Origem: '+faltamNaOrigem.join(', ')+'; central: '+faltamNaCentral.join(', ')+'. Nenhuma coluna foi movida ou excluída.');
  }
  const resultado={
    ok:true,guia:nome,cabecalhosEquivalentes:true,
    mesmaOrdem:JSON.stringify(hs.map(PLANILHABRUNO_normV2_))===JSON.stringify(hd.map(PLANILHABRUNO_normV2_)),
    colunasOrigem:hs.length,colunasCentral:hd.length,
    camposAcrescentadosNaOrigem:obrigatorios.filter(h=>!normSet(antesOrigem).has(PLANILHABRUNO_normV2_(h))),
    camposAcrescentadosNaCentral:obrigatorios.filter(h=>!normSet(antesCentral).has(PLANILHABRUNO_normV2_(h))),
    observacao:'A equivalência é por nome de campo; a ordem original das colunas foi preservada.'
  };
  Logger.log('FULL TIME — CABEÇALHOS ENTRADA_OPERACOES_IA: '+JSON.stringify(resultado));
  return resultado;
}

function PLANILHABRUNO_sincronizarLoteTesteV2() {
  if (PropertiesService.getScriptProperties().getProperty('FT_CENTRALIZED_SCHEMA_VERSION') === '2026.11.11') throw new Error('Sincronização Bruno desativada: o Full Time utiliza exclusivamente a planilha principal.');

  const lock=LockService.getScriptLock();
  if(!lock.tryLock(30000))throw new Error('Já existe uma sincronização em andamento.');
  try {
    const origem=SpreadsheetApp.getActiveSpreadsheet(), destino=SpreadsheetApp.openById(PLANILHABRUNO_SYNC_V2.DESTINO_ID);
    const lote=PLANILHABRUNO_SYNC_V2.LOTE, now=new Date(), email=Session.getEffectiveUser().getEmail()||'NAO_IDENTIFICADO';
    const resumo={sucesso:true,modo:'SINCRONIZACAO_ADITIVA_LOTE_TESTE',lote:lote,origemId:origem.getId(),destinoId:destino.getId(),inseridos:0,atualizados:0,ignoradosForaDoLote:0,erros:[],porGuia:[]};
    const prepared=[];
    // Pré-checagem integral: não inicia gravação se houver guia/chave ausente ou IDs duplicados.
    PLANILHABRUNO_SYNC_V2.GUIAS.forEach(cfg=>{
      const so=origem.getSheetByName(cfg.origem), sd=destino.getSheetByName(cfg.destino);
      if(!so||!sd){resumo.erros.push('Guia ausente: '+cfg.origem+' -> '+cfg.destino);return;}
      const ho=PLANILHABRUNO_headersV2_(so), io=PLANILHABRUNO_indexV2_(ho), ix=io[PLANILHABRUNO_normV2_(cfg.chave)];
      if(ix===undefined){resumo.erros.push(cfg.origem+': falta coluna '+cfg.chave);return;}
      const expectedSet=new Set(PLANILHABRUNO_idsEsperadosLoteV2_(cfg));
      const source=PLANILHABRUNO_rowsV2_(so).map((r,i)=>({r:r,n:i+2,id:String(r[ix]||'').trim()})).filter(x=>expectedSet.has(x.id));
      const sc={};source.forEach(x=>sc[x.id]=(sc[x.id]||0)+1);
      const dHeaders=PLANILHABRUNO_headersV2_(sd), di=PLANILHABRUNO_indexV2_(dHeaders), dx=di[PLANILHABRUNO_normV2_(cfg.chave)];
      const destRows=PLANILHABRUNO_rowsV2_(sd), dc={};
      if(dx!==undefined)destRows.forEach(r=>{const k=String(r[dx]||'').trim();if(k.startsWith(lote))dc[k]=(dc[k]||0)+1;});
      const dupS=Object.keys(sc).filter(k=>sc[k]>1), dupD=Object.keys(dc).filter(k=>dc[k]>1);
      if(dupS.length)resumo.erros.push(cfg.origem+': IDs duplicados na origem: '+dupS.join(', '));
      if(dupD.length)resumo.erros.push(cfg.destino+': IDs duplicados no destino: '+dupD.join(', '));
      prepared.push({cfg,so,sd,ho,source});
    });
    if(resumo.erros.length){resumo.sucesso=false;Logger.log('FULL TIME — SINCRONIZAÇÃO BLOQUEADA NA PRÉ-CHECAGEM: '+JSON.stringify(resumo));return resumo;}
    const audit=PLANILHABRUNO_auditV2_(origem);
    prepared.forEach(p=>{
      const cfg=p.cfg, so=p.so, sd=p.sd;
      let hd;
      try { hd=PLANILHABRUNO_prepareHeadersV2_(sd,p.ho.concat(cfg.extras||[])); }
      catch(e){resumo.erros.push(cfg.destino+': falha ao acrescentar cabeçalhos: '+e.message);resumo.porGuia.push({origem:cfg.origem,destino:cfg.destino,erro:e.message});return;}
      const si=PLANILHABRUNO_indexV2_(p.ho), di=PLANILHABRUNO_indexV2_(hd), key=PLANILHABRUNO_normV2_(cfg.chave), destKey=di[key];
      const dRows=PLANILHABRUNO_rowsV2_(sd), byId={};
      dRows.forEach((r,i)=>{const k=String(r[destKey]||'').trim();if(k){if(!byId[k])byId[k]=[];byId[k].push({n:i+2,r:r});}});
      let inserted=0,updated=0,unchanged=0,errors=0;
      p.source.forEach(item=>{
        const id=item.id, matches=byId[id]||[];
        if(matches.length>1){resumo.erros.push(cfg.destino+': ID duplicado '+id);errors++;return;}
        const isNew=matches.length===0, rowNumber=isNew?Math.max(2,sd.getLastRow()+1):matches[0].n;
        const values=isNew?new Array(hd.length).fill(''):matches[0].r.slice(0,hd.length);
        if(isNew){
          if(di.ID!==undefined)values[di.ID]=id;
          if(di.ID_EXTERNO!==undefined)values[di.ID_EXTERNO]=id;
          if(di.CRIADO_EM!==undefined)values[di.CRIADO_EM]=now;
        }
        let changed=0;
        p.ho.forEach((h,j)=>{
          const k=PLANILHABRUNO_normV2_(h), destCol=di[k];
          if(!k||destCol===undefined||k==='ID'||k==='CRIADO_EM')return;
          const v=item.r[j];
          if(v===''||v===null||typeof v==='undefined')return;
          if(k===key&&String(v).trim()!==id)return;
          if(values[destCol]!==v){values[destCol]=v;changed++;}
        });
        // IDs de teste não são ativados. Status documental permanece TESTE_NAO_VALIDADO.
        if(di.STATUS!==undefined)values[di.STATUS]='PENDENTE_REVISAO';
        values[destKey]=id;
        if(di.ID!==undefined&&!values[di.ID])values[di.ID]=id;
        try {
          sd.getRange(rowNumber,1,1,hd.length).setValues([values]);
          if(isNew){inserted++;resumo.inseridos++;}else if(changed){updated++;resumo.atualizados++;}else unchanged++;
          if(isNew)byId[id]=[{n:rowNumber,r:values}];else byId[id]=[{n:rowNumber,r:values}];
          audit.appendRow([now,lote,cfg.origem,cfg.destino,id,isNew?'INSERIDO':(changed?'ATUALIZADO':'JA_EXISTIA_SEM_ALTERACAO'),rowNumber,'Campos não vazios processados='+changed,email,PLANILHABRUNO_SYNC_V2.VERSION]);
        } catch(e) {
          errors++;resumo.erros.push(cfg.destino+' linha '+rowNumber+' ('+id+'): '+e.message);
          audit.appendRow([now,lote,cfg.origem,cfg.destino,id,'ERRO_ESCRITA',rowNumber,e.message,email,PLANILHABRUNO_SYNC_V2.VERSION]);
        }
      });
      resumo.porGuia.push({origem:cfg.origem,destino:cfg.destino,registrosLote: p.source.length,inseridos:inserted,atualizados:updated,semAlteracao:unchanged,erros:errors});
    });
    resumo.sucesso=resumo.erros.length===0;
    Logger.log('FULL TIME — PLANILHABRUNO SINCRONIZAÇÃO V2.2: '+JSON.stringify(resumo));
    return resumo;
  } finally { lock.releaseLock(); }
}
