/**
 * FULL TIME — GERADOR DE LOTE FICTÍCIO PARA A PLANILHA DO BRUNO
 *
 * Executar SOMENTE no projeto Apps Script vinculado à planilha de origem do Bruno.
 * Cria 40 motoristas, 40 cavalos, 40 carretas e 40 conjuntos.
 *
 * Segurança:
 * - valida o ID da planilha de origem antes de gravar;
 * - não apaga nem altera registros existentes;
 * - só acrescenta IDs com o prefixo FT-TESTE-20261029-;
 * - não acessa a guia protegida CAVALOS-BRUNO;
 * - não escreve na planilha principal.
 *
 * Depois de gerar:
 * 1) executar PLANILHABRUNO_validarSincronizacaoV2();
 * 2) conferir o relatório;
 * 3) executar PLANILHABRUNO_sincronizarLoteTesteV2().
 */
const PLANILHABRUNO_DADOS_TESTE = Object.freeze({
  SOURCE_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  LOTE: 'FT-TESTE-20261029-',
  QUANTIDADE: 40,
  STATUS: 'PENDENTE_REVISAO'
});

function PLANILHABRUNO_gerarLoteTeste40() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getId() !== PLANILHABRUNO_DADOS_TESTE.SOURCE_ID) {
    throw new Error('Planilha incorreta. Execute esta função somente na planilha de origem do Bruno. Nenhum dado foi gravado.');
  }

  const schemas = {
    MOTORISTAS: ['ID_EXTERNO','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES'],
    CAVALOS: ['ID_EXTERNO','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','CAPACIDADE_CARGA_TONELADAS'],
    CARRETAS: ['ID_EXTERNO','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID_EXTERNO','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    CONTROLE_DOCUMENTAL: ['ID_EXTERNO','ID_DOCUMENTO','CRIADO_EM','STATUS','TIPO_DOCUMENTO','ENTIDADE','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','OBSERVACOES']
  };

  const sheets = {};
  Object.keys(schemas).forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) throw new Error('Guia de origem ausente: ' + name + '. Nenhuma linha foi gravada.');
    PLANILHABRUNO_TESTE_ensureHeaders_(sh, schemas[name]);
    sheets[name] = sh;
  });

  const firstNames = ['Afonso','André','Antônio','Bruno','Caio','Carlos','César','Daniel','Davi','Diego','Eduardo','Elias','Emerson','Fábio','Felipe','Fernando','Gabriel','Gilberto','Gustavo','Heitor','Henrique','Igor','João','Jorge','José','Leandro','Lucas','Marcelo','Marcos','Mateus','Maurício','Nicolas','Paulo','Rafael','Renato','Ricardo','Roberto','Samuel','Thiago','Vinícius'];
  const lastNames = ['Almeida','Alves','Andrade','Azevedo','Barbosa','Barros','Batista','Cardoso','Carvalho','Castro','Costa','Dias','Duarte','Fernandes','Ferreira','Freitas','Garcia','Gomes','Lima','Lopes','Machado','Mendes','Monteiro','Moraes','Moreira','Nascimento','Oliveira','Pereira','Ramos','Reis','Ribeiro','Rocha','Santos','Silva','Souza','Teixeira','Vieira','Xavier','Macedo','Pinto'];
  const brands = ['Volvo','Scania','Mercedes-Benz','DAF','Iveco'];
  const models = ['FH 540','R 450','Actros 2651','XF 530','S-Way 480'];
  const trailerTypes = ['GRANELEIRA','BASCULANTE','SIDER','BAU','PRANCHA'];
  const now = new Date();

  const drivers = [], horses = [], trailers = [], sets = [], documents = [];
  for (let i=1;i<=PLANILHABRUNO_DADOS_TESTE.QUANTIDADE;i++) {
    const n=String(i).padStart(3,'0');
    const driverId=PLANILHABRUNO_DADOS_TESTE.LOTE+'MOT-'+n;
    const horseId=PLANILHABRUNO_DADOS_TESTE.LOTE+'CAV-'+n;
    const trailerId=PLANILHABRUNO_DADOS_TESTE.LOTE+'CAR-'+n;
    const setId=PLANILHABRUNO_DADOS_TESTE.LOTE+'CJT-'+n;
    const name=firstNames[i-1]+' '+lastNames[i-1];

    drivers.push({
      ID_EXTERNO:driverId,CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,
      NOME_COMPLETO:name,CPF:'CPF-TESTE-'+n,TELEFONE:'5399999'+String(i).padStart(4,'0'),
      EMAIL:'motorista'+n.toLowerCase()+'@example.test',CNH_NUMERO:'CNH-TESTE-'+n,
      CNH_CATEGORIA:'E',CNH_VALIDADE:new Date(2029,11,31),CIDADE_UF:'Rio Grande/RS',
      OBSERVACOES:'REGISTRO FICTÍCIO PARA HOMOLOGAÇÃO DO FULL TIME'
    });

    const brand=brands[(i-1)%brands.length],model=models[(i-1)%models.length];
    const horsePlate='FTT'+String((i-1)%10)+'A'+String(i).padStart(2,'0');
    horses.push({
      ID_EXTERNO:horseId,CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,
      PLACA:horsePlate,MARCA:brand,MODELO:model,ANO:2018+((i-1)%8),
      TARA_TONELADAS:8.5+((i-1)%5)*0.2,PBTC_MAX_TONELADAS:74,
      OBSERVACOES:'CAVALO FICTÍCIO PARA HOMOLOGAÇÃO',CAPACIDADE_CARGA_TONELADAS:40
    });

    const trailerPlate='FTR'+String((i-1)%10)+'B'+String(i).padStart(2,'0');
    const trailerCapacity=32+((i-1)%4);
    trailers.push({
      ID_EXTERNO:trailerId,CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,
      PLACA:trailerPlate,TIPO_CARRETA:trailerTypes[(i-1)%trailerTypes.length],
      TARA_TONELADAS:7.2+((i-1)%4)*0.2,CAPACIDADE_CARGA_TONELADAS:trailerCapacity,
      PBTC_MAX_TONELADAS:45,OBSERVACOES:'CARRETA FICTÍCIA PARA HOMOLOGAÇÃO'
    });

    sets.push({
      ID_EXTERNO:setId,CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,
      MOTORISTA_ID:driverId,CAVALO_ID:horseId,CARRETA_MEIO_ID:'',
      CARRETA_FINAL_ID:trailerId,OBSERVACOES:'CONJUNTO FICTÍCIO '+n,
      ESTADO_CONSERVACAO:'BOM',RESTRICOES:'NENHUMA',
      CAPACIDADE_UTIL_TONELADAS:trailerCapacity,ATUALIZADO_POR:'GERADOR_TESTE'
    });
    const docDate=new Date(2024,0,15),validity=new Date(2029,11,31);
    documents.push({
      ID_EXTERNO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-MOT-'+n,
      ID_DOCUMENTO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-MOT-'+n,
      CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,TIPO_DOCUMENTO:'CNH',
      ENTIDADE:'MOTORISTA',NUMERO_DOCUMENTO:'CNH-TESTE-'+n,
      DATA_EMISSAO:docDate,DATA_VALIDADE:validity,OBSERVACOES:'DOCUMENTO FICTÍCIO DE TESTE'
    });
    documents.push({
      ID_EXTERNO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-CAV-'+n,
      ID_DOCUMENTO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-CAV-'+n,
      CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,TIPO_DOCUMENTO:'CRLV',
      ENTIDADE:'CAVALO',NUMERO_DOCUMENTO:'CRLV-CAV-TESTE-'+n,
      DATA_EMISSAO:docDate,DATA_VALIDADE:new Date(2028,11,31),OBSERVACOES:'DOCUMENTO FICTÍCIO DE TESTE'
    });
    documents.push({
      ID_EXTERNO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-CAR-'+n,
      ID_DOCUMENTO:PLANILHABRUNO_DADOS_TESTE.LOTE+'DOC-CAR-'+n,
      CRIADO_EM:now,STATUS:PLANILHABRUNO_DADOS_TESTE.STATUS,TIPO_DOCUMENTO:'CRLV',
      ENTIDADE:'CARRETA',NUMERO_DOCUMENTO:'CRLV-CAR-TESTE-'+n,
      DATA_EMISSAO:docDate,DATA_VALIDADE:new Date(2028,11,31),OBSERVACOES:'DOCUMENTO FICTÍCIO DE TESTE'
    });
  }

  const summary = {};
  summary.MOTORISTAS=PLANILHABRUNO_TESTE_appendMissing_(sheets.MOTORISTAS,schemas.MOTORISTAS,drivers);
  summary.CAVALOS=PLANILHABRUNO_TESTE_appendMissing_(sheets.CAVALOS,schemas.CAVALOS,horses);
  summary.CARRETAS=PLANILHABRUNO_TESTE_appendMissing_(sheets.CARRETAS,schemas.CARRETAS,trailers);
  summary.CONJUNTOS=PLANILHABRUNO_TESTE_appendMissing_(sheets.CONJUNTOS,schemas.CONJUNTOS,sets);
  summary.CONTROLE_DOCUMENTAL=PLANILHABRUNO_TESTE_appendMissing_(sheets.CONTROLE_DOCUMENTAL,schemas.CONTROLE_DOCUMENTAL,documents);

  const result={ok:true,origem:ss.getName(),lote:PLANILHABRUNO_DADOS_TESTE.LOTE,resumo:summary,total:280,
    message:'Lote fictício preparado na origem. Nenhum dado existente foi apagado ou sobrescrito. Execute a validação e depois a sincronização V2.2.'};
  Logger.log('FULL TIME — LOTE FICTÍCIO 40x4: '+JSON.stringify(result));
  return result;
}

function PLANILHABRUNO_TESTE_ensureHeaders_(sh, required) {
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim()):[];
  if(!current.some(Boolean)) {
    if(sh.getLastRow()>0)throw new Error(sh.getName()+': há dados sem cabeçalho. Gravação bloqueada.');
    sh.getRange(1,1,1,required.length).setValues([required]);
    sh.setFrozenRows(1);
    return;
  }
  const have=new Set(current.map(v=>v.toUpperCase().replace(/[^A-Z0-9]/g,'')));
  const missing=required.filter(h=>!have.has(h.toUpperCase().replace(/[^A-Z0-9]/g,'')));
  if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
}

function PLANILHABRUNO_TESTE_appendMissing_(sh, headers, objects) {
  const currentHeaders=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim());
  const index={};
  currentHeaders.forEach((h,i)=>{const k=h.toUpperCase().replace(/[^A-Z0-9]/g,'');if(k && index[k]===undefined)index[k]=i;});
  const idCol=index.IDEXTERNO;
  if(idCol===undefined)throw new Error(sh.getName()+': coluna ID_EXTERNO ausente.');
  const existing=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getDisplayValues():[];
  const counts={};
  existing.forEach(r=>{const id=String(r[idCol]||'').trim();if(id)counts[id]=(counts[id]||0)+1;});
  const duplicate=Object.keys(counts).filter(id=>counts[id]>1);
  if(duplicate.length)throw new Error(sh.getName()+': IDs externos duplicados; corrija antes de gerar lote: '+duplicate.slice(0,10).join(', '));
  const rows=[];
  objects.forEach(obj=>{
    if(counts[obj.ID_EXTERNO])return;
    const row=new Array(currentHeaders.length).fill('');
    Object.keys(obj).forEach(k=>{
      const col=index[k.toUpperCase().replace(/[^A-Z0-9]/g,'')];
      if(col!==undefined)row[col]=obj[k];
    });
    rows.push(row);
  });
  if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,currentHeaders.length).setValues(rows);
  return {guia:sh.getName(),solicitados:objects.length,inseridos:rows.length,jaExistiam:objects.length-rows.length};
}
