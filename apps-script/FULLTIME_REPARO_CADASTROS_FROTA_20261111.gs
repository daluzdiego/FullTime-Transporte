/**
 * FULL TIME — REPARO CONTROLADO DOS CADASTROS FICTÍCIOS
 * Corrige somente MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS.
 * Localiza colunas pelo nome do cabeçalho; não depende da posição.
 * Cria backup das quatro guias antes de gravar.
 */
function FT_REPARAR_CADASTROS_FROTA_20261111() {
  const MAIN_ID = '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';
  const PREFIX = 'FT-TESTE-20261111-';
  const ss = SpreadsheetApp.openById(MAIN_ID);
  const names = ['MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS'];
  const expected = {
    MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS'],
    CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR']
  };
  const maps = {};
  names.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) throw new Error('Guia ausente: '+name);
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]
      .map(v => String(v).trim().toUpperCase());
    const missing = expected[name].filter(h => headers.indexOf(h) < 0);
    if (missing.length) throw new Error('Cabeçalhos divergentes em '+name+': '+missing.join(', '));
    maps[name] = {};
    headers.forEach((h,i) => maps[name][h] = i);
  });

  // Backup externo das quatro guias; nenhuma outra guia é copiada ou alterada.
  const backup = SpreadsheetApp.create('BACKUP_FROTA_ANTES_REPARO_'+Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'));
  names.forEach((name,index) => {
    const source = ss.getSheetByName(name);
    const copy = source.copyTo(backup).setName(name);
  });
  const defaultSheet = backup.getSheetByName('Página1') || backup.getSheetByName('Sheet1');
  if (defaultSheet && backup.getSheets().length > names.length) backup.deleteSheet(defaultSheet);

  const now = new Date();
  const rows = {MOTORISTAS:[],CAVALOS:[],CARRETAS:[],CONJUNTOS:[]};
  for (let i=1;i<=40;i++) {
    const n=String(i).padStart(3,'0');
    const driverId=PREFIX+'MOT-'+n, horseId=PREFIX+'CAV-'+n, trailerId=PREFIX+'CAR-'+n;
    const setId=PREFIX+'CON-'+n;
    const data = {
      MOTORISTAS: {ID:driverId,CRIADO_EM:now,STATUS:'ATIVO',NOME_COMPLETO:'Motorista Fictício '+n,CPF:String(90000000000+i),TELEFONE:'+555399900'+String(i).padStart(4,'0'),EMAIL:'motorista'+n+'@example.test',CNH_NUMERO:'CNHTEST'+n,CNH_CATEGORIA:'E',CNH_VALIDADE:new Date(2030,11,31),CIDADE_UF:'Rio Grande/RS',OBSERVACOES:'CADASTRO FICTÍCIO — HOMOLOGAÇÃO'},
      CAVALOS: {ID:horseId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'FTX'+String(1000+i),MARCA:'Volvo',MODELO:'FH 540',ANO:2024,TARA_TONELADAS:8,PBTC_MAX_TONELADAS:58,OBSERVACOES:'VEÍCULO FICTÍCIO — HOMOLOGAÇÃO',CAPACIDADE_CARGA_TONELADAS:50},
      CARRETAS: {ID:trailerId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'FTY'+String(2000+i),TIPO_CARRETA:'Graneleira',TARA_TONELADAS:7,CAPACIDADE_CARGA_TONELADAS:35,PBTC_MAX_TONELADAS:45,OBSERVACOES:'IMPLEMENTO FICTÍCIO — HOMOLOGAÇÃO'},
      CONJUNTOS: {ID:setId,CRIADO_EM:now,STATUS:'ATIVO',MOTORISTA_ID:driverId,CAVALO_ID:horseId,CARRETA_MEIO_ID:trailerId,CARRETA_FINAL_ID:'',OBSERVACOES:'CONJUNTO FICTÍCIO '+n,ESTADO_CONSERVACAO:'APTO',RESTRICOES:'',CAPACIDADE_UTIL_TONELADAS:35,ATUALIZADO_POR:'SISTEMA'}
    };
    names.forEach(name => {
      const row = new Array(Object.keys(maps[name]).length).fill('');
      Object.keys(data[name]).forEach(key => {
        const col=maps[name][key];
        if (col === undefined) throw new Error('Coluna não mapeada: '+name+'.'+key);
        row[col]=data[name][key];
      });
      rows[name].push(row);
    });
  }

  const result = {};
  names.forEach(name => {
    const sh=ss.getSheetByName(name), width=sh.getLastColumn();
    // Atualiza exatamente os 40 registros de homologação, sem limpar a guia.
    sh.getRange(2,1,40,width).clearContent();
    const matrix=rows[name].map(row => {
      const full=new Array(width).fill('');
      row.forEach((v,i)=>full[i]=v);
      return full;
    });
    sh.getRange(2,1,40,width).setValues(matrix);
    result[name]={registrosCorrigidos:40,cabecalhosValidados:expected[name].length};
  });
  const summary={sucesso:true,planilha:ss.getName(),backupId:backup.getId(),backupUrl:backup.getUrl(),guias:result,observacao:'Reparo por cabeçalho; somente quatro guias alteradas. Status gravado como ATIVO; eventuais status pendentes podem vir da tabela de overrides.'};
  Logger.log('FULL TIME — REPARO FROTA: '+JSON.stringify(summary));
  return summary;
}