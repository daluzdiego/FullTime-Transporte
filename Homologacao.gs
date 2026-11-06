
function ftTipoCarretaTeste_(i){return ['VUC','BAU_COMPACTO','BAU','GRANELEIRA','BASCULANTE','PRANCHA','BITREM','RODOTREM'][(i-1)%8];}
function ftCapacidadeCarretaTeste_(i){return [12,18,25,35,40,30,50,55][(i-1)%8];}
/**
 * FULLTIME — HOMOLOGAÇÃO CONTROLADA
 * Gera massa fictícia relacional e credenciais de teste.
 * Nunca acessa a planilha do Bruno nem a guia CAVALOS-BRUNO.
 * A limpeza é restrita à allowlist FT_HOMOLOGACAO_GUIAS.
 */

const FT_HOMOLOGACAO_GUIAS = Object.freeze({
  MOTORISTAS: ['ID','CRIADO_EM','STATUS','NOME_COMPLETO','CPF','TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE','CIDADE_UF','OBSERVACOES','ID_EXTERNO','RG','DATA_NASCIMENTO','WHATSAPP','ENDERECO','CIDADE','UF','CEP','CNH_PRIMEIRA_HABILITACAO','CNH_EAR','EXAME_TOXICOLOGICO_VALIDADE','STATUS_DOCUMENTACAO','LINK_CNH','LINK_EXAME_TOXICOLOGICO'],
  CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','ID_EXTERNO','RENAVAM','CHASSI','NUMERO_MOTOR','VERSAO','ANO_FABRICACAO','ANO_MODELO','TIPO_VEICULO','ESPECIE','CARROCERIA','COR','COMBUSTIVEL','NUMERO_EIXOS','LOTACAO_TONELADAS','CAPACIDADE_UTIL_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','ANTT_RNTRC','ANTT_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA'],
  CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES','ID_EXTERNO','RENAVAM','CHASSI','ANO_FABRICACAO','ANO_MODELO','ESPECIE','CARROCERIA','COR','NUMERO_EIXOS','LOTACAO_TONELADAS','PROPRIETARIO_DOCUMENTO','PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS','CRLV_LINK','AET_NUMERO','AET_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA','MARCA','MODELO'],
  CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF','MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA','CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA','CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA','QUANTIDADE_CARRETAS','VINCULO_FIXO','DATA_INICIO_VINCULO','DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR','DATA_AUTORIZACAO'],
  OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','ID_EXTERNO','TOTAL_VIAGENS_CONCLUIDAS','TOTAL_TONELADAS_REALIZADAS','DATA_FIM_LIMITE','JANELA_INICIO','JANELA_FIM','PRIORIDADE','PRODUTO_SERVICO','TIPO_OPERACAO','CONTATO_CLIENTE','CLIENTE_ID','LOCAL_ORIGEM_ID','LOCAL_DESTINO_ID'],
  CONTROLE_DOCUMENTAL: ['ID_DOCUMENTO','TIPO_REGISTRO','ID_EXTERNO_REGISTRO','PLACA_OU_CPF','TIPO_DOCUMENTO','NUMERO_DOCUMENTO','DATA_EMISSAO','DATA_VALIDADE','STATUS_DOCUMENTO','LINK_ARQUIVO','DATA_CONFERENCIA','CONFERIDO_POR','PENDENCIA','OBSERVACOES'],
  PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR','VIAGENS_PREVISTAS','TONELADAS_PREVISTAS','VIAGENS_INICIADAS','INICIO_PREVISTO','FIM_PREVISTO','ATUALIZADO_EM','ATUALIZADO_POR'],
  VIAGENS: ['ID','CRIADO_EM','OPERACAO_ID','PARTICIPACAO_ID','SEQUENCIA_OPERACAO','SEQUENCIA_MOTORISTA','MOTORISTA_ID','CONJUNTO_ID','STATUS','ORIGEM_DESCRICAO','DESTINO_DESCRICAO','PESO_PREVISTO_TONELADAS','PESO_REAL_TONELADAS','PREVISTA_INICIO','PREVISTA_CHEGADA','INICIO_REAL','CHEGADA_ORIGEM_REAL','SAIDA_ORIGEM_REAL','CHEGADA_DESTINO_REAL','FIM_REAL','DISTANCIA_PREVISTA_KM','DISTANCIA_REAL_KM','MOTIVO_CANCELAMENTO','OBSERVACOES','ATUALIZADA_EM','ATUALIZADA_POR','STATUS_ANTES_INTERRUPCAO','INTERRUPPIDA_EM','MOTIVO_INTERRUPCAO','RETOMADA_EM','INICIO_CARREGAMENTO_REAL','FIM_CARREGAMENTO_REAL','INICIO_DESCARGA_REAL','FIM_DESCARGA_REAL'],
  EVENTOS_VIAGEM: ['ID','VIAGEM_ID','TIPO_EVENTO','DATA_HORA_EVENTO','DATA_HORA_RECEBIMENTO','LOCAL_ID','LATITUDE','LONGITUDE','RESPONSAVEL_ID','ORIGEM_REGISTRO','DESCRICAO','OBSERVACOES','IDEMPOTENCIA'],
  DOCUMENTOS_VIAGEM: ['ID','VIAGEM_ID','EVENTO_VIAGEM_ID','TIPO_DOCUMENTO','DRIVE_FILE_ID','URL','NOME_ARQUIVO','MIME_TYPE','HASH_ARQUIVO','RECEBIDO_EM','RECEBIDO_POR','STATUS_VALIDACAO','OBSERVACOES'],
  TICKETS: ['ID','RECEBIDO_EM','WHATSAPP_MESSAGE_ID','TELEFONE_REMETENTE','MOTORISTA_ID','CARGA_ID_LEGADO','TIPO_TICKET','MEDIA_ID','DRIVE_FILE_ID','DRIVE_FILE_URL','NOME_ARQUIVO','MIME_TYPE','STATUS_LEITURA','DATA_HORA_EXTRAIDA','CONFIANCA_LEITURA','ERRO_VALIDACAO','RETENCAO_ATE','METADADOS_JSON','VIAGEM_ID'],
  CLIENTES: ['ID','CRIADO_EM','STATUS','RAZAO_SOCIAL','NOME_FANTASIA','CNPJ','TELEFONE','EMAIL','CONTATO_PRINCIPAL','OBSERVACOES','ID_EXTERNO'],
  LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES','CLIENTE_ID'],
  REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES'],
  DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
  FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_VIAGEM_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
  OFERTAS_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','STATUS_OFERTA','EXPIRA_EM','RESPONDIDO_EM','MOTIVO','CRIADO_POR'],
  EVENTOS_OPERACAO: ['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','MOTIVO','REGISTRADO_POR'],
  HISTORICO_ASSIDUIDADE: ['ID','DATA_HORA','MOTORISTA_ID','OPERACAO_ID','PARTICIPACAO_ID','TIPO_EVENTO','PREVISTO_EM','REALIZADO_EM','JUSTIFICATIVA','ORIGEM','REGISTRADO_POR']
});

function diagnosticarHomologacaoFullTime() {
  const p = PropertiesService.getScriptProperties();
  const registryId = p.getProperty('FT_REGISTRY_DATABASE_ID');
  const authId = p.getProperty('FT_DATABASE_ID');
  if (!registryId) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  if (!authId) throw new Error('FT_DATABASE_ID não configurado (base interna de autenticação).');
  const ss = SpreadsheetApp.openById(registryId);
  const auth = SpreadsheetApp.openById(authId);
  const result = {
    ambiente: 'HOMOLOGACAO',
    baseOperacional: ss.getName(),
    baseOperacionalIdFinal: registryId.slice(-6),
    baseAutenticacao: auth.getName(),
    guiasProtegidasIgnoradas: ['CAVALOS-BRUNO'],
    guias: Object.keys(FT_HOMOLOGACAO_GUIAS).map(name => {
      const sh = ss.getSheetByName(name);
      return {guia:name, existe:!!sh, linhas:sh?Math.max(0,sh.getLastRow()-1):0, colunas:sh?sh.getLastColumn():0};
    }),
    usuarios: (function(){const sh=auth.getSheetByName('USUARIOS');return {existe:!!sh,linhas:sh?Math.max(0,sh.getLastRow()-1):0};})(),
    acao: 'Somente diagnóstico. Nenhuma célula foi alterada.'
  };
  Logger.log(JSON.stringify(result));
  return result;
}

/** Executar depois de conferir o diagnóstico. Cria backup SOMENTE das guias permitidas. */
function fazerBackupHomologacaoFullTime() {
  const p=PropertiesService.getScriptProperties(), id=p.getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  const source=SpreadsheetApp.openById(id);
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const backup=SpreadsheetApp.create('BACKUP FULLTIME HOMOLOGACAO '+stamp);
  const defaultSheet=backup.getSheets()[0];
  let first=true;
  Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
    const sh=source.getSheetByName(name);
    if(!sh) return;
    const copied=sh.copyTo(backup).setName(('BKP_'+name).slice(0,99));
    if(first){backup.deleteSheet(defaultSheet);first=false;}
  });
  if(first) throw new Error('Nenhuma guia permitida encontrada; backup vazio cancelado.');
  const result={ok:true,backupUrl:backup.getUrl(),backupId:backup.getId(),guias:backup.getSheets().map(s=>s.getName())};
  Logger.log('BACKUP HOMOLOGACAO: '+JSON.stringify(result));
  return result;
}

/**
 * Limpa somente linhas de dados das guias operacionais da allowlist.
 * Mantém cabeçalhos, formatação e guias não listadas. Não limpa USUARIOS nem AUDITORIA.
 * ATENÇÃO: execute somente após conferir o diagnóstico e o backup.
 */
function limparBaseParaHomologacaoFullTime() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
    if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
    const ss=SpreadsheetApp.openById(id), resumo=[];
    Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
      const sh=ss.getSheetByName(name);
      if(!sh) return;
      const lastRow=sh.getLastRow(), lastCol=sh.getLastColumn();
      if(lastRow>1&&lastCol>0) sh.getRange(2,1,lastRow-1,lastCol).clearContent();
      resumo.push({guia:name,linhasRemovidas:Math.max(0,lastRow-1)});
    });
    // Remove somente credenciais de homologação anteriores; mantém admins e usuários reais.
    const auth=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID'));
    const users=auth.getSheetByName('USUARIOS');
    if(users&&users.getLastRow()>1) {
      const values=users.getDataRange().getValues();
      const loginCol=1, profileCol=3, driverCol=9;
      for(let i=values.length-1;i>=1;i--) {
        const login=String(values[i][loginCol]||'').toLowerCase();
        const profile=String(values[i][profileCol]||'').toUpperCase();
        const driverId=String(values[i][driverCol]||'');
        if(profile==='MOTORISTA'&&(login.endsWith('@fulltime.test')||driverId.indexOf('FTTEST-')===0)) users.deleteRow(i+1);
      }
    }
    const out={ok:true,guias:resumo,credenciaisTesteAnterioresRemovidas:true,adminsPreservados:true,guiaProtegidaPreservada:true};
    Logger.log('LIMPEZA HOMOLOGACAO: '+JSON.stringify(out));
    return out;
  } finally {lock.releaseLock();}
}

function ftHomologacaoAppend_(ss,name,objects) {
  if(!objects.length) return 0;
  const sh=ss.getSheetByName(name);
  if(!sh) throw new Error('Guia ausente após preparação: '+name);
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(h=>String(h||'').trim().toUpperCase());
  const rows=objects.map(obj=>headers.map(h=>Object.prototype.hasOwnProperty.call(obj,h)?obj[h]:''));
  sh.getRange(sh.getLastRow()+1,1,rows.length,headers.length).setValues(rows);
  return rows.length;
}

function prepararEstruturaHomologacaoFullTime() {
  const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!id) throw new Error('FT_REGISTRY_DATABASE_ID não configurado.');
  const ss=SpreadsheetApp.openById(id), result=[];
  Object.keys(FT_HOMOLOGACAO_GUIAS).forEach(name=>{
    let sh=ss.getSheetByName(name),created=false;
    if(!sh){sh=ss.insertSheet(name);created=true;}
    const required=FT_HOMOLOGACAO_GUIAS[name];
    const width=sh.getLastColumn();
    const current=width?sh.getRange(1,1,1,width).getDisplayValues()[0].map(x=>String(x||'').trim()):[];
    if(current.every(x=>!x)) sh.getRange(1,1,1,required.length).setValues([required]);
    else {
      const norm=current.map(x=>x.toUpperCase().replace(/[^A-Z0-9]/g,''));
      required.forEach(h=>{
        const key=h.toUpperCase().replace(/[^A-Z0-9]/g,'');
        if(norm.indexOf(key)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);norm.push(key);}
      });
    }
    sh.setFrozenRows(1);
    result.push({guia:name,criada:created,colunas:sh.getLastColumn()});
  });
  Logger.log('ESTRUTURA HOMOLOGACAO: '+JSON.stringify(result));
  return result;
}

function gerarMassaFicticiaHomologacaoFullTime() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const registryId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
    const authId=PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID');
    if(!registryId||!authId) throw new Error('Configure FT_REGISTRY_DATABASE_ID e FT_DATABASE_ID.');
    const ss=SpreadsheetApp.openById(registryId), auth=SpreadsheetApp.openById(authId);
    const dirty=Object.keys(FT_HOMOLOGACAO_GUIAS).filter(name=>{const sh=ss.getSheetByName(name);return sh&&sh.getLastRow()>1;});
    if(dirty.length) throw new Error('A base ainda contém registros nas guias: '+dirty.join(', ')+'. Execute limparBaseParaHomologacaoFullTime() antes de gerar a massa.');
    const now=new Date(), today=Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const future=new Date(now.getTime()+86400000*14);
    const iso=d=>Utilities.formatDate(d,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const id=(prefix,n)=>prefix+'-'+String(n).padStart(4,'0');
    const tag='DADO FICTÍCIO — HOMOLOGAÇÃO FULLTIME; NÃO UTILIZAR EM PRODUÇÃO';
    const clients=Array.from({length:4},(_,i)=>({ID:id('FTTEST-CLI',i+1),CRIADO_EM:now,STATUS:'ATIVO',RAZAO_SOCIAL:'Empresa Fictícia de Transporte '+(i+1),NOME_FANTASIA:'Cliente Teste '+(i+1),CNPJ:'TESTE-CNPJ-'+String(i+1).padStart(4,'0'),TELEFONE:'00000000000',EMAIL:'cliente'+(i+1)+'@fulltime.test',CONTATO_PRINCIPAL:'Contato de Teste '+(i+1),OBSERVACOES:tag,ID_EXTERNO:id('FTTEST-CLI',i+1)}));
    const drivers=[],horses=[],trailers=[],sets=[];
    for(let i=1;i<=40;i++){
      const n=String(i).padStart(2,'0'), driverId=id('FTTEST-MOT',i), horseId=id('FTTEST-CAV',i), trailerId=id('FTTEST-CAR',i), setId=id('FTTEST-CON',i);
      const name='Motorista Fictício '+n, cpf='TESTE-CPF-'+n;
      drivers.push({ID:driverId,CRIADO_EM:now,STATUS:'ATIVO',NOME_COMPLETO:name,CPF:cpf,TELEFONE:'00000000000',EMAIL:'motorista'+n+'@fulltime.test',CNH_NUMERO:'TESTE-CNH-'+n,CNH_CATEGORIA:'E',CNH_VALIDADE:iso(future),CIDADE_UF:'Rio Grande/RS',OBSERVACOES:tag,ID_EXTERNO:driverId,RG:'TESTE-RG-'+n,DATA_NASCIMENTO:'1990-01-01',WHATSAPP:'',ENDERECO:'Endereço fictício '+n,CIDADE:'Rio Grande',UF:'RS',CEP:'00000-000',CNH_PRIMEIRA_HABILITACAO:'2010-01-01',CNH_EAR:'NÃO',EXAME_TOXICOLOGICO_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',LINK_CNH:'',LINK_EXAME_TOXICOLOGICO:''});
      horses.push({ID:horseId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'TST'+String(i).padStart(4,'0'),MARCA:'Marca Teste',MODELO:'Cavalo '+n,ANO:'2022',TARA_TONELADAS:9,PBTC_MAX_TONELADAS:75,OBSERVACOES:tag,ID_EXTERNO:horseId,RENAVAM:'TESTE-RENAVAM-'+n,CHASSI:'TESTE-CHASSI-CAV-'+n,NUMERO_MOTOR:'TESTE-MOTOR-'+n,VERSAO:'Teste',ANO_FABRICACAO:'2022',ANO_MODELO:'2022',TIPO_VEICULO:'TRACAO',ESPECIE:'CARGA',CARROCERIA:'TRACAO',COR:'BRANCO',COMBUSTIVEL:'DIESEL',NUMERO_EIXOS:3,LOTACAO_TONELADAS:55,CAPACIDADE_UTIL_TONELADAS:55,PROPRIETARIO_DOCUMENTO:'TESTE-PROP-'+n,PROPRIETARIO_NOME:'Proprietário Fictício '+n,CRLV_ANO_EXERCICIO:'2026',LICENCIAMENTO_STATUS:'SIMULADO',CRLV_LINK:'',AET_NUMERO:'TESTE-AET-'+n,AET_VALIDADE:iso(future),ANTT_RNTRC:'TESTE-ANTT-'+n,ANTT_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',DATA_ULTIMA_CONFERENCIA:now});
      trailers.push({ID:trailerId,CRIADO_EM:now,STATUS:'ATIVO',PLACA:'TRS'+String(i).padStart(4,'0'),TIPO_CARRETA:ftTipoCarretaTeste_(i),TARA_TONELADAS:7,CAPACIDADE_CARGA_TONELADAS:ftCapacidadeCarretaTeste_(i),PBTC_MAX_TONELADAS:Math.max(25,ftCapacidadeCarretaTeste_(i)+15),OBSERVACOES:tag,ID_EXTERNO:trailerId,RENAVAM:'TESTE-REN-CAR-'+n,CHASSI:'TESTE-CHASSI-CAR-'+n,ANO_FABRICACAO:'2022',ANO_MODELO:'2022',ESPECIE:'CARGA',CARROCERIA:ftTipoCarretaTeste_(i),COR:'PRATA',NUMERO_EIXOS:3,LOTACAO_TONELADAS:ftCapacidadeCarretaTeste_(i),PROPRIETARIO_DOCUMENTO:'TESTE-PROP-'+n,PROPRIETARIO_NOME:'Proprietário Fictício '+n,CRLV_ANO_EXERCICIO:'2026',LICENCIAMENTO_STATUS:'SIMULADO',CRLV_LINK:'',AET_NUMERO:'TESTE-AET-CAR-'+n,AET_VALIDADE:iso(future),STATUS_DOCUMENTACAO:'SIMULADA',DATA_ULTIMA_CONFERENCIA:now,MARCA:'Marca Teste',MODELO:'Carreta '+n});
      sets.push({ID:setId,CRIADO_EM:now,STATUS:'ATIVO',MOTORISTA_ID:driverId,CAVALO_ID:horseId,CARRETA_MEIO_ID:'',CARRETA_FINAL_ID:trailerId,OBSERVACOES:tag,ESTADO_CONSERVACAO:'APTO',RESTRICOES:'',CAPACIDADE_UTIL_TONELADAS:ftCapacidadeCarretaTeste_(i),ATUALIZADO_POR:'HOMOLOGACAO',ID_EXTERNO:setId,MOTORISTA_ID_EXTERNO:driverId,MOTORISTA_CPF:cpf,MOTORISTA_NOME:name,CAVALO_ID_EXTERNO:horseId,CAVALO_PLACA:'TST'+String(i).padStart(4,'0'),CARRETA_MEIO_ID_EXTERNO:'',CARRETA_MEIO_PLACA:'',CARRETA_FINAL_ID_EXTERNO:trailerId,CARRETA_FINAL_PLACA:'TRS'+String(i).padStart(4,'0'),QUANTIDADE_CARRETAS:1,VINCULO_FIXO:true,DATA_INICIO_VINCULO:today,STATUS_VINCULO:'ATIVO',AUTORIZADO_POR:'HOMOLOGACAO',DATA_AUTORIZACAO:now});
    }
    const places=[], operations=[], participations=[], trips=[], docs=[], rules=[], availability=[], queue=[], offers=[], opEvents=[], attendance=[], tripEvents=[], tripDocs=[], tickets=[];
    const specs=[
      {name:'Armazém de acesso compacto',volume:600,min:10,max:20,types:['VUC','BAU_COMPACTO'],preference:'LOW',category:'MANOBRA_DIFICIL',priority:'ALTA',window:['07:00','16:00'],detail:'Pátio estreito e doca com área de manobra reduzida.'},
      {name:'Corredor de grãos — grande escala',volume:400000,min:40,max:55,types:['BITREM','RODOTREM'],preference:'HIGH',category:'ALTO_DESEMPENHO',priority:'URGENTE',window:['06:00','22:00'],detail:'Volume total de 400.000 toneladas, distribuído em milhares de viagens; exige maior capacidade útil compatível.'},
      {name:'Distribuição urbana com restrição',volume:1200,min:10,max:25,types:['VUC','BAU_COMPACTO','BAU'],preference:'LOW',category:'MANOBRA_DIFICIL',priority:'NORMAL',window:['08:00','17:00'],detail:'Acesso urbano limitado; priorizar veículos compactos.'},
      {name:'Terminal portuário',volume:15000,min:25,max:55,types:['GRANELEIRA','BASCULANTE','BITREM'],preference:'HIGH',category:'PRAZO_NAVIO',priority:'ALTA',window:['06:00','22:00'],detail:'Acesso condicionado às regras do terminal e documentação conferida.'},
      {name:'Expedição urgente',volume:800,min:18,max:55,types:['BAU','GRANELEIRA','BITREM','RODOTREM'],preference:'HIGH',category:'PRAZO_NAVIO',priority:'URGENTE',window:['06:00','12:00'],detail:'Janela curta; priorizar capacidade e disponibilidade imediata.'},
      {name:'Carga pesada industrial',volume:8000,min:35,max:55,types:['BITREM','RODOTREM','PRANCHA'],preference:'HIGH',category:'ALTO_DESEMPENHO',priority:'ALTA',window:['06:00','20:00'],detail:'Exige conjunto de alta capacidade e configuração compatível.'},
      {name:'Pátio com manobra crítica',volume:500,min:10,max:18,types:['VUC','BAU_COMPACTO'],preference:'LOW',category:'MANOBRA_DIFICIL',priority:'NORMAL',window:['09:00','15:00'],detail:'Espaço de manobra extremamente limitado; não admitir conjuntos grandes.'},
      {name:'Rota de longa distância',volume:12000,min:35,max:55,types:['GRANELEIRA','BITREM','RODOTREM'],preference:'HIGH',category:'ALTO_DESEMPENHO',priority:'NORMAL',window:['06:00','22:00'],detail:'Percurso longo; priorizar capacidade, aptidão e disponibilidade.'},
      {name:'Janela programada de recebimento',volume:2500,min:20,max:40,types:['BAU','GRANELEIRA','BASCULANTE'],preference:'BALANCED',category:'PRAZO_NAVIO',priority:'ALTA',window:['13:00','18:00'],detail:'Recebimento somente na janela contratada.'},
      {name:'Operação de volume elevado',volume:50000,min:40,max:55,types:['BITREM','RODOTREM'],preference:'HIGH',category:'ALTO_DESEMPENHO',priority:'ALTA',window:['06:00','22:00'],detail:'Grande volume; maximizar capacidade útil sem violar requisitos.'}
    ];
    const availabilityIds=new Set(), trailerById={};
    trailers.forEach(t=>trailerById[t.ID]=t);
    for(let i=1;i<=40;i++){
      const driverId=id('FTTEST-MOT',i), setId=id('FTTEST-CON',i);
      availability.push({ID:id('FTTEST-DISP',i),CRIADO_EM:now,DATA_OPERACAO:today,MOTORISTA_ID:driverId,STATUS_DISPONIBILIDADE:'DISPONIVEL',CONFIRMADO_EM:now,INDISPONIVEL_EM:'',MOTIVO:tag,ATUALIZADO_POR:'HOMOLOGACAO'});
      queue.push({ID:id('FTTEST-FILA',i),DATA_ENTRADA:new Date(now.getTime()+i*1000),MOTORISTA_ID:driverId,CONJUNTO_ID:setId,STATUS_FILA:'AGUARDANDO',ULTIMA_OFERTA_EM:'',ULTIMA_VIAGEM_CONCLUIDA_EM:'',VIAGENS_PERIODO:0,OBSERVACOES:tag});
      if(i%5===0) attendance.push({ID:id('FTTEST-ASSID-A',i),DATA_HORA:now,MOTORISTA_ID:driverId,TIPO_EVENTO:'COMPROMISSO_ACEITO',PREVISTO_EM:now,REALIZADO_EM:'',JUSTIFICATIVA:'',ORIGEM:'SEED_HOMOLOGACAO',REGISTRADO_POR:'HOMOLOGACAO'},{ID:id('FTTEST-ASSID-B',i),DATA_HORA:now,MOTORISTA_ID:driverId,TIPO_EVENTO:'COMPARECEU_PONTUAL',PREVISTO_EM:now,REALIZADO_EM:now,JUSTIFICATIVA:'',ORIGEM:'SEED_HOMOLOGACAO',REGISTRADO_POR:'HOMOLOGACAO'});
    }
    specs.forEach((spec,index)=>{
      const c=index+1, cli=clients[(index)%clients.length], originId=id('FTTEST-LOC-O',c), destId=id('FTTEST-LOC-D',c);
      const origin='Terminal Fictício de Origem '+c, dest='Terminal Fictício de Destino '+c;
      places.push({ID:originId,CRIADO_EM:now,STATUS:'ATIVO',NOME_LOCAL:origin,CLIENTE:cli.NOME_FANTASIA,TIPO_LOCAL:'ORIGEM',ENDERECO:origin,CIDADE_UF:'Rio Grande/RS',REGRAS_OBSERVACOES:spec.detail,CLIENTE_ID:cli.ID},{ID:destId,CRIADO_EM:now,STATUS:'ATIVO',NOME_LOCAL:dest,CLIENTE:cli.NOME_FANTASIA,TIPO_LOCAL:'DESTINO',ENDERECO:dest,CIDADE_UF:'Pelotas/RS',REGRAS_OBSERVACOES:tag,CLIENTE_ID:cli.ID});
      const opId=id('FTTEST-OP',c), tripTarget=Math.ceil(spec.volume/spec.max);
      operations.push({ID:opId,CRIADO_EM:now,STATUS:'ABERTA',DATA_OPERACAO:today,CLIENTE:cli.NOME_FANTASIA,NOME_OPERACAO:spec.name,ORIGEM:origin,DESTINO:dest,CATEGORIA:spec.category,VOLUME_TOTAL_TONELADAS:spec.volume,TOTAL_VIAGENS_PREVISTAS:tripTarget,SALDO_TONELADAS:spec.volume,OBSERVACOES:tag+' '+spec.detail,CRIADO_POR:'HOMOLOGACAO',ID_EXTERNO:opId,TOTAL_VIAGENS_CONCLUIDAS:0,TOTAL_TONELADAS_REALIZADAS:0,DATA_FIM_LIMITE:iso(future),JANELA_INICIO:spec.window[0],JANELA_FIM:spec.window[1],PRIORIDADE:spec.priority,PRODUTO_SERVICO:'Carga fictícia de homologação',TIPO_OPERACAO:'TRANSPORTE DIRETO',CONTATO_CLIENTE:'Contato Teste',CLIENTE_ID:cli.ID,LOCAL_ORIGEM_ID:originId,LOCAL_DESTINO_ID:destId});
      const criteria={minCapacityT:spec.min,maxCapacityT:spec.max,allowedTrailerTypes:spec.types,capacityPreference:spec.preference,requireValidatedDocuments:false,description:spec.detail};
      rules.push({ID:id('FTTEST-REG',c),CRIADO_EM:now,STATUS:'ATIVO',LOCAL_ID:originId,PESO_MIN_TONELADAS:spec.min,PESO_MAX_TONELADAS:spec.max,TIPO_CAVALO:'TRACAO',TIPO_CARRETA:spec.types.join('|'),EXIGENCIAS:JSON.stringify(criteria),OBSERVACOES:tag+' '+spec.detail});
      const eligible=sets.filter(set=>{
        const trailer=trailerById[set.CARRETA_FINAL_ID];
        return set.STATUS==='ATIVO'&&set.ESTADO_CONSERVACAO==='APTO'&&Number(set.CAPACIDADE_UTIL_TONELADAS)>=spec.min&&Number(set.CAPACIDADE_UTIL_TONELADAS)<=spec.max&&trailer&&spec.types.includes(trailer.TIPO_CARRETA);
      }).sort((a,b)=>spec.preference==='LOW'?Number(a.CAPACIDADE_UTIL_TONELADAS)-Number(b.CAPACIDADE_UTIL_TONELADAS):spec.preference==='HIGH'?Number(b.CAPACIDADE_UTIL_TONELADAS)-Number(a.CAPACIDADE_UTIL_TONELADAS):0);
      eligible.slice(0,10).forEach((set,pos)=>{
        const driverId=set.MOTORISTA_ID, offerId=id('FTTEST-OFE-'+c,pos+1);
        offers.push({ID:offerId,CRIADO_EM:now,OPERACAO_ID:opId,PARTICIPACAO_ID:'',MOTORISTA_ID:driverId,CONJUNTO_ID:set.ID,STATUS_OFERTA:'PENDENTE_HOMOLOGACAO',EXPIRA_EM:new Date(now.getTime()+7200000),RESPONDIDO_EM:'',MOTIVO:'NOTIFICAÇÃO SIMULADA NO PORTAL — posição '+(pos+1)+'; '+spec.detail,CRIADO_POR:'MOTOR_ESCALA_HOMOLOGACAO'});
        opEvents.push({ID:id('FTTEST-EVT-OFE-'+c,pos+1),DATA_HORA:now,TIPO_EVENTO:'OFERTA_GERADA_HOMOLOGACAO',OPERACAO_ID:opId,PARTICIPACAO_ID:'',MOTORISTA_ID:driverId,CONJUNTO_ID:set.ID,MOTIVO:'Candidato '+(pos+1)+' de '+Math.min(10,eligible.length),REGISTRADO_POR:'MOTOR_ESCALA_HOMOLOGACAO'});
      });
    });
    // Documentos cadastrais fictícios: status SIMULADO, sem arquivos reais.
    drivers.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-MOT',i+1),TIPO_REGISTRO:'MOTORISTA',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.CPF,TIPO_DOCUMENTO:'CNH_TESTE',NUMERO_DOCUMENTO:d.CNH_NUMERO,DATA_EMISSAO:'2024-01-01',DATA_VALIDADE:d.CNH_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    horses.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-CAV',i+1),TIPO_REGISTRO:'CAVALO',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.PLACA,TIPO_DOCUMENTO:'CRLV_TESTE',NUMERO_DOCUMENTO:d.RENAVAM,DATA_EMISSAO:'2026-01-01',DATA_VALIDADE:d.AET_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    trailers.forEach((d,i)=>docs.push({ID_DOCUMENTO:id('FTTEST-CD-CAR',i+1),TIPO_REGISTRO:'CARRETA',ID_EXTERNO_REGISTRO:d.ID,PLACA_OU_CPF:d.PLACA,TIPO_DOCUMENTO:'CRLV_TESTE',NUMERO_DOCUMENTO:d.RENAVAM,DATA_EMISSAO:'2026-01-01',DATA_VALIDADE:d.AET_VALIDADE,STATUS_DOCUMENTO:'SIMULADO',LINK_ARQUIVO:'',DATA_CONFERENCIA:now,CONFERIDO_POR:'HOMOLOGACAO',PENDENCIA:'DOCUMENTO FICTÍCIO — NÃO CONFERIDO',OBSERVACOES:tag}));
    // TICKETS permanece sem mídia: nenhum WhatsApp está conectado nesta etapa.
    const datasets={CLIENTES:clients,MOTORISTAS:drivers,CAVALOS:horses,CARRETAS:trailers,CONJUNTOS:sets,LOCAIS:places,OPERACOES:operations,REGRAS_OPERACIONAIS:rules,CONTROLE_DOCUMENTAL:docs,PARTICIPACAO_OPERACOES:participations,VIAGENS:trips,EVENTOS_VIAGEM:tripEvents,DOCUMENTOS_VIAGEM:tripDocs,TICKETS:tickets,DISPONIBILIDADE_DIARIA:availability,FILA_MOTORISTAS:queue,OFERTAS_OPERACOES:offers,EVENTOS_OPERACAO:opEvents,HISTORICO_ASSIDUIDADE:attendance};
    const inserted={};
    Object.keys(datasets).forEach(name=>inserted[name]=ftHomologacaoAppend_(ss,name,datasets[name]));
    const credentials=ftCriarUsuariosHomologacao_(auth,drivers);
    const result={ok:true,ambiente:'HOMOLOGACAO',motoristas:drivers.length,cavalos:horses.length,carretas:trailers.length,conjuntos:sets.length,clientes:clients.length,operacoes:operations.length,ofertas:offers.length,participacoes:participations.length,viagens:trips.length,registrosPorGuia:inserted,loginsCriados:credentials.length,credenciais:credentials,alerta:'As senhas abaixo são temporárias. Copie-as agora; não serão gravadas em texto aberto.'};
    Logger.log('MASSA FICTICIA HOMOLOGACAO: '+JSON.stringify(result));
    return result;
  } finally {lock.releaseLock();}
}

function ftCriarUsuariosHomologacao_(auth,drivers) {
  const sh=auth.getSheetByName('USUARIOS');
  if(!sh) throw new Error('Guia USUARIOS não encontrada na base interna FT_DATABASE_ID.');
  const required=['ID','LOGIN','NOME','PERFIL','SALT','HASH_SENHA','ATIVO','TROCAR_SENHA','CRIADO_EM','MOTORISTA_ID','PERMISSOES_JSON'];
  let headers=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),required.length)).getDisplayValues()[0].map(x=>String(x||'').trim());
  if(sh.getLastColumn()<required.length) sh.insertColumnsAfter(Math.max(1,sh.getLastColumn()),required.length-sh.getLastColumn());
  headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(x=>String(x||'').trim());
  required.forEach((h,i)=>{if(!headers[i]){sh.getRange(1,i+1).setValue(h);headers[i]=h;}});
  const map={};headers.forEach((h,i)=>map[h.toUpperCase()]=i);
  const creds=[];
  drivers.forEach(d=>{
    const login=d.EMAIL, password=Utilities.getUuid().replace(/-/g,'').slice(0,16)+'aA1!';
    const salt=Utilities.getUuid(), row=new Array(sh.getLastColumn()).fill('');
    const values={ID:Utilities.getUuid(),LOGIN:login,NOME:d.NOME_COMPLETO,PERFIL:'MOTORISTA',SALT:salt,HASH_SENHA:hashSenha_(salt,password),ATIVO:true,TROCAR_SENHA:true,CRIADO_EM:new Date(),MOTORISTA_ID:d.ID,PERMISSOES_JSON:JSON.stringify({portal:true,perfil:'MOTORISTA',acoes:['VER_PROPRIO_PERFIL','VER_PROPRIO_CONJUNTO','INFORMAR_DISPONIBILIDADE','VER_PROPRIAS_VIAGENS']})};
    Object.keys(values).forEach(k=>{if(map[k]!=null)row[map[k]]=values[k];});
    sh.appendRow(row);
    creds.push({motorista:d.NOME_COMPLETO,motoristaId:d.ID,login:login,senhaTemporaria:password});
  });
  return creds;
}

/** Validação estrutural e de integridade da massa fictícia. */
function validarMassaHomologacaoFullTime() {
  const id=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  const ss=SpreadsheetApp.openById(id), read=n=>ss.getSheetByName(n).getDataRange().getValues();
  const count=n=>Math.max(0,read(n).length-1);
  const drivers=read('MOTORISTAS'), horses=read('CAVALOS'), trailers=read('CARRETAS'), sets=read('CONJUNTOS');
  const ops=read('OPERACOES'), parts=read('PARTICIPACAO_OPERACOES'), trips=read('VIAGENS');
  const driverIds=new Set(drivers.slice(1).map(r=>String(r[0]))), horseIds=new Set(horses.slice(1).map(r=>String(r[0]))), trailerIds=new Set(trailers.slice(1).map(r=>String(r[0])));
  const errors=[];
  if(count('MOTORISTAS')!==40)errors.push('Esperados 40 motoristas.');
  if(count('CAVALOS')!==40)errors.push('Esperados 40 cavalos.');
  if(count('CARRETAS')!==40)errors.push('Esperadas 40 carretas.');
  if(count('CONJUNTOS')!==40)errors.push('Esperados 40 conjuntos.');
  if(count('OPERACOES')!==10)errors.push('Esperadas 10 operações fictícias.');
  if(count('PARTICIPACAO_OPERACOES')!==0)errors.push('A homologação inicial deve começar sem participações previamente atribuídas.');
  if(count('DISPONIBILIDADE_DIARIA')!==40)errors.push('Esperadas 40 disponibilidades de motoristas.');
  if(count('FILA_MOTORISTAS')!==40)errors.push('Esperados 40 registros na fila.');
  if(count('OFERTAS_OPERACOES')!==100)errors.push('Esperados 100 convites simulados (10 por operação).');
  const offers=read('OFERTAS_OPERACOES');
  const offerCounts={};offers.slice(1).forEach(r=>{
    const id=String(r[2]||''),driverId=String(r[4]||''),setId=String(r[5]||'');
    offerCounts[id]=(offerCounts[id]||0)+1;
    const set=sets.slice(1).find(x=>String(x[0])===setId);
    if(!driverIds.has(driverId))errors.push('Convite vinculado a motorista inexistente: '+driverId);
    if(!set||String(set[3])!==driverId)errors.push('Convite com motorista/conjunto incompatível: '+r[0]);
  });
  ops.slice(1).forEach(op=>{if(offerCounts[String(op[0])]!==10)errors.push('Operação '+op[0]+' não possui exatamente 10 convites.');});
  sets.slice(1).forEach((r,i)=>{if(!driverIds.has(String(r[3])))errors.push('Conjunto '+(i+1)+' sem motorista válido.');if(!horseIds.has(String(r[4])))errors.push('Conjunto '+(i+1)+' sem cavalo válido.');if(r[6]&&!trailerIds.has(String(r[6])))errors.push('Conjunto '+(i+1)+' sem carreta válida.');});
  const opIds=new Set(ops.slice(1).map(r=>String(r[0]))), partIds=new Set(parts.slice(1).map(r=>String(r[0])));
  parts.slice(1).forEach(r=>{if(!opIds.has(String(r[2])))errors.push('Participação sem operação: '+r[0]);if(!driverIds.has(String(r[4])))errors.push('Participação sem motorista: '+r[0]);});
  trips.slice(1).forEach(r=>{if(!opIds.has(String(r[2]))||!partIds.has(String(r[3])))errors.push('Viagem sem operação/participação: '+r[0]);});
  const auth=SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('FT_DATABASE_ID')), users=auth.getSheetByName('USUARIOS').getDataRange().getValues();
  const testUsers=users.slice(1).filter(r=>String(r[1]||'').toLowerCase().endsWith('@fulltime.test')&&String(r[3]).toUpperCase()==='MOTORISTA');
  if(testUsers.length!==40)errors.push('Esperados 40 logins fictícios; encontrados '+testUsers.length+'.');
  const result={sucesso:errors.length===0,erros:errors,contagens:{motoristas:count('MOTORISTAS'),cavalos:count('CAVALOS'),carretas:count('CARRETAS'),conjuntos:count('CONJUNTOS'),clientes:count('CLIENTES'),operacoes:count('OPERACOES'),participacoes:count('PARTICIPACAO_OPERACOES'),viagens:count('VIAGENS'),ofertas:count('OFERTAS_OPERACOES'),disponibilidades:count('DISPONIBILIDADE_DIARIA'),usuariosTeste:testUsers.length}};
  Logger.log('VALIDACAO HOMOLOGACAO: '+JSON.stringify(result));
  if(errors.length)throw new Error('Homologação inconsistente: '+errors.join(' | '));
  return result;
}
