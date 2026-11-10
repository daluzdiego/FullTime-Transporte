import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class FakeRange {
  constructor(sheet,row,col,numRows=1,numCols=1){Object.assign(this,{sheet,row,col,numRows,numCols});}
  getValues(){return Array.from({length:this.numRows},(_,r)=>Array.from({length:this.numCols},(_,c)=>this.sheet.rows[this.row-1+r]?.[this.col-1+c]??''));}
  getDisplayValues(){return this.getValues().map(row=>row.map(v=>v instanceof Date?v.toISOString():String(v??'')));}
  setValues(values){values.forEach((row,r)=>row.forEach((v,c)=>this.sheet.setCell(this.row-1+r,this.col-1+c,v)));return this;}
  setValue(value){this.sheet.setCell(this.row-1,this.col-1,value);return this;}
  setFontWeight(){return this;} setBackground(){return this;} setFontColor(){return this;} setWrap(){return this;}
}
class FakeSheet {
  constructor(name,headers=[],rows=[]){this.name=name;this.rows=[headers,...rows];}
  getLastColumn(){return Math.max(0,...this.rows.map(r=>r.length));}
  getLastRow(){return this.rows.length;}
  getRange(r,c,nr=1,nc=1){return new FakeRange(this,r,c,nr,nc);}
  getDataRange(){return this.getRange(1,1,this.getLastRow(),this.getLastColumn());}
  setCell(r,c,value){while(this.rows.length<=r)this.rows.push([]);while(this.rows[r].length<=c)this.rows[r].push('');this.rows[r][c]=value;}
  appendRow(row){this.rows.push([...row]);}
  insertColumnAfter(col){this.rows.forEach(r=>r.splice(col,0,''));}
  setFrozenRows(){}
}
class FakeBook {
  constructor(){this.sheets=new Map();}
  add(name,headers,rows=[]){const s=new FakeSheet(name,headers,rows);this.sheets.set(name,s);return s;}
  getSheetByName(name){return this.sheets.get(name)||null;}
  insertSheet(name){const s=new FakeSheet(name);this.sheets.set(name,s);return s;}
}

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const code=read('../../Code.gs');
const lots=read('../../OperacoesLotes.gs');
const drive=read('../../IntegracaoDriveCliente.gs');
const makeRuntime=()=>{
  const book=new FakeBook();
  book.add('CLIENTES',['ID','CRIADO_EM','STATUS','RAZAO_SOCIAL','NOME_FANTASIA','CNPJ','TELEFONE','EMAIL','CONTATO_PRINCIPAL','OBSERVACOES','ID_EXTERNO'],[
    ['CLI_A',new Date(),'ATIVO','Cliente A Ltda','Cliente A'],
    ['CLI_B',new Date(),'ATIVO','Cliente B Ltda','Cliente B']
  ]);
  book.add('OPERACOES',['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_VIAGENS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','ID_EXTERNO','TOTAL_VIAGENS_CONCLUIDAS','TOTAL_TONELADAS_REALIZADAS','DATA_FIM_LIMITE','JANELA_INICIO','JANELA_FIM','PRIORIDADE','PRODUTO_SERVICO','TIPO_OPERACAO','CONTATO_CLIENTE','CLIENTE_ID','LOCAL_ORIGEM_ID','LOCAL_DESTINO_ID']);
  book.add('PARTICIPACAO_OPERACOES',['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR','VIAGENS_PREVISTAS','TONELADAS_PREVISTAS','VIAGENS_INICIADAS','INICIO_PREVISTO','FIM_PREVISTO','ATUALIZADO_EM','ATUALIZADO_POR']);
  book.add('VIAGENS',['ID','CRIADO_EM','OPERACAO_ID','PARTICIPACAO_ID','SEQUENCIA_OPERACAO','SEQUENCIA_MOTORISTA','MOTORISTA_ID','CONJUNTO_ID','STATUS','ORIGEM_DESCRICAO','DESTINO_DESCRICAO','PESO_PREVISTO_TONELADAS','PESO_REAL_TONELADAS']);
  book.add('MOTORISTAS',['ID','CRIADO_EM','STATUS','NOME_COMPLETO'],[['MOT_A',new Date(),'ATIVO','Motorista A']]);
  book.add('CONJUNTOS',['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS'],[['SET_A',new Date(),'ATIVO','MOT_A','CAV_A','','','','APTO','',30]]);
  book.add('EVENTOS_OPERACAO',['ID','DATA_HORA','TIPO_EVENTO','OPERACAO_ID','PARTICIPACAO_ID','MOTORISTA_ID','CONJUNTO_ID','MOTIVO','REGISTRADO_POR']);
  const props={getProperty:key=>key==='FT_REGISTRY_DATABASE_ID'?'registry-id':key==='FT_DATABASE_ID'?'auth-id':null};
  let uuid=0;
  const context=vm.createContext({
    console,Date,JSON,Math,Number,String,Array,Object,Set,Map,RegExp,Error,TypeError,isFinite,
    PropertiesService:{getScriptProperties:()=>props},
    SpreadsheetApp:{openById:()=>book},
    Utilities:{getUuid:()=> 'uuid-'+(++uuid)},
    LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})}
  });
  vm.runInContext(code+'\n;\n'+lots,context,{filename:'FullTime-test-bundle.js'});
  context.obterSessao_=()=>({id:'ADMIN_TEST',login:'admin-test',perfil:'ADMIN'});
  context.exigirAdmin_=session=>{if(session.perfil!=='ADMIN')throw new Error('admin required');};
  context.auditar_=()=>{};
  context.texto_=(value,max)=>String(value??'').trim().slice(0,max);
  return {context,book};
};

test('fluxo de homologação cria operação multi-cliente, lotes e distribui motorista sem perder vínculos',()=>{
  const {context,book}=makeRuntime();
  const preview=context.prepararEstruturaLotesFullTime('token',false);
  assert.equal(preview.ok,true);
  assert.equal(preview.alterado,false);
  assert.equal(book.getSheetByName('LOTES_OPERACAO'),null);
  const applied=context.prepararEstruturaLotesFullTime('token',true);
  assert.equal(applied.ok,true);
  assert.ok(applied.criadas.includes('LOTES_OPERACAO'));
  assert.ok(applied.colunasAdicionadas.includes('PARTICIPACAO_OPERACOES.LOTE_ID'));
  assert.ok(applied.colunasAdicionadas.includes('VIAGENS.LOTE_ID'));

  const saved=context.salvarOperacaoComLotesFullTime('token',{
    data:'2026-11-12',nome:'Operação teste integrada',clientes:['CLI_A','CLI_B'],
    particularidades:{liberacao:'manual'},
    lotes:[
      {codigo:'L-A',clienteId:'CLI_A',origem:'Terminal A',destino:'Armazém A',volumePrevisto:60,vagasOfertadas:2,motoristasPlanejados:2},
      {codigo:'L-B',clienteId:'CLI_B',origem:'Terminal B',destino:'Armazém B',volumePrevisto:40,vagasOfertadas:1,motoristasPlanejados:1}
    ]
  });
  assert.equal(saved.clientes,2);
  assert.equal(saved.lotes,2);
  assert.equal(saved.volumeTotal,100);

  const lotsSheet=book.getSheetByName('LOTES_OPERACAO');
  const lotIdA=lotsSheet.rows[1][0],lotIdB=lotsSheet.rows[2][0];
  const first=context.designarConjuntoLoteOperacaoFullTime('token',{operacaoId:saved.id,loteId:lotIdA,conjuntoId:'SET_A',toneladasPrevistas:60,viagensPrevistas:2});
  const second=context.designarConjuntoLoteOperacaoFullTime('token',{operacaoId:saved.id,loteId:lotIdB,conjuntoId:'SET_A',toneladasPrevistas:40,viagensPrevistas:2});
  assert.ok(first.ok&&second.ok,'O mesmo motorista/conjunto deve poder atuar em dois lotes da mesma operação.');
  assert.throws(()=>context.designarConjuntoLoteOperacaoFullTime('token',{operacaoId:saved.id,loteId:lotIdA,conjuntoId:'SET_A',toneladasPrevistas:1,viagensPrevistas:1}),/já foi designado/);

  const allocations=context.obterAlocacoesLotesOperacaoFullTime('token',saved.id);
  assert.equal(allocations.length,2);
  assert.equal(allocations[0].volumeDistribuido,60);
  assert.equal(allocations[1].volumeDistribuido,40);
  const op=book.getSheetByName('OPERACOES').rows[1];
  assert.equal(op[10],4);
});
