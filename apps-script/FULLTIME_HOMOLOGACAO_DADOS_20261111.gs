/**
 * FULL TIME — preenchimento idempotente de dados fictícios de homologação.
 * Não limpa guias, não altera cabeçalhos e não toca na base de autenticação/Bruno.
 * Insere somente IDs de teste que ainda não existam.
 */
function FT_PREENCHER_DADOS_TESTE_AUSENTES_20261111() {
  const MAIN='11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';
  const PREFIX='FT-TESTE-20261111-';
  const props=PropertiesService.getScriptProperties();
  const registry=props.getProperty('FT_REGISTRY_DATABASE_ID')||'';
  if(registry!==MAIN)throw new Error('FT_REGISTRY_DATABASE_ID não aponta para a planilha principal. Nenhum dado foi gravado.');
  const ss=SpreadsheetApp.openById(MAIN);
  const expected={
    MOTORISTAS:['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAVALOS:['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS'],
    CARRETAS:['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS:['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    DOCUMENTOS:['ID_DOCUMENTO','CRIADO_EM','STATUS','TIPO_DOCUMENTO','ENTIDADE','ID_EXTERNO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','OBSERVACOES'],
    OPERACOES:['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','VIAGENS_REALIZADAS','TIPO_OPERACAO','PRODUTO_SERVICO','DISTANCIA_KM','DATA_ENTREGA','JANELA_INICIO','JANELA_FIM','TEMPO_ESTIMADO_HORAS']
  };
  const sheets={};
  Object.keys(expected).forEach(function(name){
    const sh=ss.getSheetByName(name);
    if(!sh)throw new Error('Guia ausente: '+name+'. Nenhum dado foi gravado.');
    const actual=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim().toUpperCase());
    if(actual.length!==expected[name].length||!expected[name].every((v,i)=>actual[i]===v))
      throw new Error('Cabeçalho divergente em '+name+'. Nenhum dado foi gravado.');
    sheets[name]=sh;
  });
  const existing={};
  Object.keys(sheets).forEach(function(name){
    const sh=sheets[name],last=sh.getLastRow(),col=name==='DOCUMENTOS'?'ID_DOCUMENTO':'ID',ix=expected[name].indexOf(col);
    existing[name]=new Set(last>1?sh.getRange(2,ix+1,last-1,1).getDisplayValues().flat().map(String):[]);
  });
  const now=new Date(),drivers=[],horses=[],trailers=[],sets=[],docs=[],ops=[];
  for(let i=1;i<=40;i++){
    const n=String(i).padStart(3,'0'),d=PREFIX+'MOT-'+n,h=PREFIX+'CAV-'+n,t=PREFIX+'CAR-'+n;
    drivers.push([d,now,'ATIVO','Motorista Fictício '+n,String(90000000000+i),'+555399900'+String(i).padStart(4,'0'),'motorista'+n+'@example.test','CNHTEST'+n,'E','2030-12-31','Rio Grande/RS','CADASTRO FICTÍCIO — HOMOLOGAÇÃO']);
    horses.push([h,now,'ATIVO','FTX'+String(1000+i),'Volvo','FH 540',2024,8,58,'VEÍCULO FICTÍCIO — HOMOLOGAÇÃO',50]);
    trailers.push([t,now,'ATIVO','FTY'+String(2000+i),'Graneleira',7,35,45,'IMPLEMENTO FICTÍCIO — HOMOLOGAÇÃO']);
    sets.push([PREFIX+'CON-'+n,now,'ATIVO',d,h,t,'','CONJUNTO FICTÍCIO '+n,'APTO','',35,'SISTEMA']);
    ['CNH','CRLV_CAVALO','CRLV_CARRETA'].forEach(function(tipo,j){
      docs.push([PREFIX+'DOC-'+n+'-'+(j+1),now,'VALIDO',tipo,j===0?'MOTORISTAS':j===1?'CAVALOS':'CARRETAS',j===0?d:j===1?h:t,'DOC-TESTE-'+n+'-'+(j+1),'2026-01-01','2030-12-31','DOCUMENTO FICTÍCIO']);
    });
  }
  for(let i=1;i<=10;i++){
    const id=PREFIX+'OPE-'+String(i).padStart(3,'0'),volume=350+i*25,trips=Math.ceil(volume/35);
    ops.push([id,now,'ABERTA',new Date(Date.now()+i*86400000),'CLIENTE FICTÍCIO '+i,'OPERAÇÃO DE TESTE '+i,'Rio Grande/RS','Pelotas/RS','GRANEL',volume,trips,volume,'OPERAÇÃO FICTÍCIA — HOMOLOGAÇÃO','SISTEMA',0,'DIRETO','GRANEL','','','','','']);
  }
  const sources={MOTORISTAS:drivers,CAVALOS:horses,CARRETAS:trailers,CONJUNTOS:sets,DOCUMENTOS:docs,OPERACOES:ops};
  const inserted={};
  Object.keys(sources).forEach(function(name){
    const sh=sheets[name],rows=sources[name],idIndex=0,missing=rows.filter(r=>!existing[name].has(String(r[idIndex])));
    if(missing.length)sh.getRange(sh.getLastRow()+1,1,missing.length,missing[0].length).setValues(missing);
    inserted[name]=missing.length;
  });
  const counts={};
  Object.keys(sheets).forEach(name=>counts[name]=Math.max(0,sheets[name].getLastRow()-1));
  const result={ok:true,planilha:ss.getName(),planilhaId:MAIN,inseridos:inserted,totalAtual:counts,semLimpeza:true,semAlteracaoDeCabecalhos:true,baseAutenticacaoPreservada:true};
  Logger.log('FULL TIME — SEED IDEMPOTENTE DE HOMOLOGAÇÃO: '+JSON.stringify(result));
  return result;
}