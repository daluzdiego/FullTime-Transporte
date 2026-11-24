/**
 * Cria 10 operações fictícias para homologação do Full Time.
 * Executar no Apps Script vinculado à planilha CENTRAL.
 * Idempotente: não duplica IDs existentes. Não designa conjuntos nem convoca motoristas.
 */
function FT_criar10OperacoesTesteHomologacao20261110() {
  const registryId = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!registryId) throw new Error('Execute conectarPlanilhaOperacionalFullTime() primeiro.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSheet_('OPERACOES');
    const map = ftOperationHeaderMap_(sh);
    const required = ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','VIAGENS_REALIZADAS','TIPO_OPERACAO'];
    const missing = required.filter(k => map[k] === undefined);
    if (missing.length) throw new Error('Cabeçalhos ausentes: ' + missing.join(', '));
    const data = [
      ['2026-11-11','Cliente Teste Alfa','Transferência de grãos — Rio Grande a Pelotas','Rio Grande/RS','Pelotas/RS','PADRAO','TRANSFERENCIA_FABRICAS',480,16,'Operação fictícia para homologação.'],
      ['2026-11-12','Cliente Teste Beta','Remoção de fertilizantes — Rio Grande a Bagé','Rio Grande/RS','Bagé/RS','PADRAO','REMOCAO_INTERNA',600,20,'Operação fictícia para testar distribuição de viagens.'],
      ['2026-11-13','Cliente Teste Gama','Transferência industrial — Canoas a Rio Grande','Canoas/RS','Rio Grande/RS','ALTO_DESEMPENHO','TRANSFERENCIA_FABRICAS',720,24,'Operação fictícia para testar seleção por capacidade.'],
      ['2026-11-14','Cliente Teste Delta','Remoção de material — Pelotas a Santa Maria','Pelotas/RS','Santa Maria/RS','PADRAO','REMOCAO_INTERNA',360,12,'Operação fictícia em sábado; testar final de semana.'],
      ['2026-11-15','Cliente Teste Épsilon','Transferência de carga — Rio Grande a Porto Alegre','Rio Grande/RS','Porto Alegre/RS','PRAZO_NAVIO','TRANSFERENCIA_FABRICAS',900,30,'Operação fictícia em domingo; testar prazo e disponibilidade.'],
      ['2026-11-16','Cliente Teste Zeta','Remoção interna — Porto Alegre a Caxias do Sul','Porto Alegre/RS','Caxias do Sul/RS','MANOBRA_DIFICIL','REMOCAO_INTERNA',300,10,'Operação fictícia para testar categoria de manobra difícil.'],
      ['2026-11-17','Cliente Teste Eta','Transferência de insumos — Rio Grande a Passo Fundo','Rio Grande/RS','Passo Fundo/RS','PADRAO','TRANSFERENCIA_FABRICAS',840,28,'Operação fictícia de maior duração.'],
      ['2026-11-18','Cliente Teste Teta','Descarga programada — Porto de Rio Grande','Porto de Rio Grande/RS','Terminal de destino — Rio Grande/RS','PRAZO_NAVIO','DESCARGA_NAVIO',1200,40,'Operação fictícia de descarga de navio.'],
      ['2026-11-19','Cliente Teste Iota','Transferência de carga — Pelotas a Novo Hamburgo','Pelotas/RS','Novo Hamburgo/RS','ALTO_DESEMPENHO','TRANSFERENCIA_FABRICAS',540,18,'Operação fictícia para testar seleção por capacidade.'],
      ['2026-11-20','Cliente Teste Kappa','Remoção interna — Rio Grande a São Borja','Rio Grande/RS','São Borja/RS','PADRAO','REMOCAO_INTERNA',660,22,'Operação fictícia de rota longa.']
    ];
    const ids = new Set();
    if (sh.getLastRow() > 1) sh.getRange(2,map.ID+1,sh.getLastRow()-1,1).getDisplayValues().forEach(r=>{if(r[0])ids.add(String(r[0]).trim());});
    const now = new Date(), created = [], existed = [];
    data.forEach((o,i)=>{
      const id='FT-OP-TESTE-20261110-'+String(i+1).padStart(2,'0');
      if(ids.has(id)){existed.push(id);return;}
      ftOperationAppendFullTime_(sh,{
        ID:id,CRIADO_EM:now,STATUS:'ABERTA',DATA_OPERACAO:o[0],CLIENTE:o[1],
        NOME_OPERACAO:o[2],ORIGEM:o[3],DESTINO:o[4],CATEGORIA:o[5],
        TIPO_OPERACAO:o[6],VOLUME_TOTAL_TONELADAS:o[7],TOTAL_VIAGENS_PREVISTAS:o[8],
        SALDO_TONELADAS:o[7],OBSERVACOES:o[9],CRIADO_POR:'HOMOLOGACAO_AUTOMATICA',
        VIAGENS_REALIZADAS:0
      });
      created.push({id,data:o[0],nome:o[2],volumeToneladas:o[7],viagensPrevistas:o[8]});
    });
    SpreadsheetApp.flush();
    const result={ok:true,criadas:created.length,jaExistiam:existed.length,operacoes:created,idsJaExistentes:existed,
      observacao:'Somente operações fictícias ABERTAS. Nenhum conjunto designado, motorista convocado ou viagem registrada.'};
    console.log('FULL TIME — OPERAÇÕES DE HOMOLOGAÇÃO: '+JSON.stringify(result));
    return result;
  } finally { lock.releaseLock(); }
}