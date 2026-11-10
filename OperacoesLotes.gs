/**
 * FULL TIME — operações configuráveis com múltiplos clientes e lotes.
 *
 * Compatibilidade: mantém OPERACOES como entidade-pai e adiciona guias relacionais.
 * Nenhuma guia é criada automaticamente ao abrir o sistema.
 * A preparação possui prévia e exige confirmação explícita do administrador.
 */

const FT_LOTES_SCHEMAS_ = {
  OPERACAO_CONFIGURACOES: [
    'ID','OPERACAO_ID','PARTICULARIDADES_JSON','VERSAO_CONFIGURACAO',
    'CRIADO_EM','CRIADO_POR','ATUALIZADO_EM','ATUALIZADO_POR'
  ],
  OPERACAO_CLIENTES: [
    'ID','OPERACAO_ID','CLIENTE_ID','PAPEL','STATUS','CRIADO_EM','CRIADO_POR'
  ],
  LOTES_OPERACAO: [
    'ID','OPERACAO_ID','CLIENTE_ID','CODIGO_LOTE','NOME_LOTE','PRODUTO_SERVICO',
    'ORIGEM','DESTINO','VOLUME_PREVISTO_TONELADAS','VOLUME_REALIZADO_TONELADAS',
    'VAGAS_OFERTADAS','MOTORISTAS_PLANEJADOS','JANELA_INICIO','JANELA_FIM',
    'PARTICULARIDADES_JSON','STATUS','CRIADO_EM','CRIADO_POR',
    'ATUALIZADO_EM','ATUALIZADO_POR'
  ]
};

/**
 * Prévia sem escrita por padrão. Para criar guias ausentes, chamar novamente
 * com confirmar=true. Guias existentes são validadas; nunca são apagadas,
 * renomeadas ou reformatadas por esta rotina.
 */
function prepararEstruturaLotesFullTime(token, confirmar) {
  const session = obterSessao_(token); exigirAdmin_(session);
  const ssId = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!ssId) throw new Error('Base operacional não conectada. Nenhuma alteração realizada.');
  const ss = SpreadsheetApp.openById(ssId);
  const resultado = Object.keys(FT_LOTES_SCHEMAS_).map(function(name) {
    const headers = FT_LOTES_SCHEMAS_[name];
    const sh = ss.getSheetByName(name);
    if (!sh) return {guia:name, acao:'CRIAR', colunas:headers.length};
    const width = sh.getLastColumn();
    const current = width ? sh.getRange(1,1,1,width).getDisplayValues()[0].map(v=>String(v||'').trim()) : [];
    if (!current.length || current.every(v=>!v)) return {guia:name,acao:'INCOMPATIVEL',motivo:'Guia existente sem cabeçalho; requer inspeção manual.'};
    const missing = headers.filter(h=>current.indexOf(h)<0);
    return missing.length
      ? {guia:name,acao:'INCOMPATIVEL',motivo:'Cabeçalhos divergentes; colunas ausentes: '+missing.join(', ')}
      : {guia:name,acao:'EXISTENTE_COMPATIVEL',colunas:current.length};
  });
  const bloqueios = resultado.filter(x=>x.acao==='INCOMPATIVEL');
  if (bloqueios.length) return {ok:false,previa:true,alterado:false,guias:resultado,bloqueios:bloqueios};
  if (confirmar !== true) return {ok:true,previa:true,alterado:false,guias:resultado,message:'Prévia concluída. Nenhuma guia foi criada.'};
  const criadas=[];
  resultado.filter(x=>x.acao==='CRIAR').forEach(function(item) {
    const sh=ss.insertSheet(item.guia), headers=FT_LOTES_SCHEMAS_[item.guia];
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c').setWrap(true);
    criadas.push(item.guia);
  });
  auditar_(session,'PREPARAR_ESTRUTURA_LOTES','SISTEMA','', 'Guias criadas: '+(criadas.join(', ')||'nenhuma'));
  return {ok:true,previa:false,alterado:criadas.length>0,criadas:criadas,guias:resultado,message:'Estrutura preparada sem excluir ou reescrever dados existentes.'};
}

function ftLotesParseJson_(value, label) {
  if (value == null || value === '') return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed=JSON.parse(String(value));
    if (!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch(e) { throw new Error(label+' deve ser um objeto JSON válido.'); }
}

function ftLotesValidateParticularidades_(value) {
  const obj=ftLotesParseJson_(value,'Particularidades da operação');
  const json=JSON.stringify(obj);
  if (json.length>30000) throw new Error('As particularidades da operação excedem o limite de 30 KB.');
  return json;
}

/**
 * Cria operação com clientes participantes e lotes numa única transação lógica.
 * Requer guias preparadas previamente. Se qualquer validação falhar, não grava.
 * Usa LockService e rollback compensatório somente para linhas criadas nesta chamada.
 */
function salvarOperacaoComLotesFullTime(token, data) {
  const session=obterSessao_(token); exigirAdmin_(session); data=data||{};
  const nome=texto_(data.nome,160);
  const dataOp=texto_(data.data,10);
  const particularidades=ftLotesValidateParticularidades_(data.particularidades);
  const clientes=Array.isArray(data.clientes)?data.clientes.map(x=>texto_(x,100)).filter(Boolean):[];
  const lotes=Array.isArray(data.lotes)?data.lotes:[];
  if(!nome) throw new Error('Informe o nome da operação.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dataOp)||!isFinite(new Date(dataOp+'T12:00:00').getTime())) throw new Error('Informe uma data válida.');
  if(!clientes.length) throw new Error('Associe pelo menos um cliente à operação.');
  if(new Set(clientes).size!==clientes.length) throw new Error('Há clientes duplicados na operação.');
  if(!lotes.length) throw new Error('Cadastre pelo menos um lote.');
  if(lotes.length>100) throw new Error('Limite de 100 lotes por operação nesta versão.');
  const clientSh=getSheet_('CLIENTES'), clientRows=clientSh.getDataRange().getValues();
  const activeClients=clientes.map(id=>{
    const row=clientRows.find((r,i)=>i>0&&String(r[0])===id&&String(r[2]).toUpperCase()==='ATIVO');
    if(!row) throw new Error('Cliente inexistente ou inativo: '+id);
    return {id:id,nome:String(row[4]||row[3]||'')};
  });
  const normalizedLots=lotes.map((lot,index)=>{
    const clienteId=texto_(lot.clienteId,100);
    if(clientes.indexOf(clienteId)<0) throw new Error('O lote '+(index+1)+' está associado a um cliente que não participa da operação.');
    const volume=Number(String(lot.volumePrevisto||'').replace(',','.'));
    const vagas=Math.floor(Number(lot.vagasOfertadas));
    const motoristas=Math.floor(Number(lot.motoristasPlanejados));
    const origem=texto_(lot.origem,160), destino=texto_(lot.destino,160);
    const codigo=texto_(lot.codigo||('LOTE-'+String(index+1).padStart(2,'0')),60);
    const inicio=texto_(lot.janelaInicio,5), fim=texto_(lot.janelaFim,5);
    if(!origem||!destino) throw new Error('Informe origem e destino do lote '+codigo+'.');
    if(!(volume>0&&isFinite(volume))) throw new Error('Volume inválido no lote '+codigo+'.');
    if(!(vagas>=0&&vagas<=10000)) throw new Error('Quantidade de vagas inválida no lote '+codigo+'.');
    if(!(motoristas>=0&&motoristas<=10000)) throw new Error('Quantidade planejada de motoristas inválida no lote '+codigo+'.');
    if(inicio&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)) throw new Error('Horário inicial inválido no lote '+codigo+'.');
    if(fim&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(fim)) throw new Error('Horário final inválido no lote '+codigo+'.');
    if(inicio&&fim&&fim<inicio) throw new Error('Janela final anterior à inicial no lote '+codigo+'.');
    return {clienteId:clienteId,codigo:codigo,nome:texto_(lot.nome,120)||codigo,
      produto: texto_(lot.produtoServico,120),origem:origem,destino:destino,volume:volume,
      vagas:vagas,motoristas:motoristas,inicio:inicio,fim:fim,
      particularidades:ftLotesValidateParticularidades_(lot.particularidades)};
  });
  const totalVolume=normalizedLots.reduce((sum,l)=>sum+l.volume,0);
  const totalViagens=Math.max(1,Math.ceil(normalizedLots.reduce((sum,l)=>sum+l.volume,0)));
  const opSh=getSheet_('OPERACOES'), opHeaders=ftHeaderMapViagens_(opSh);
  const required=['ID','CRIADOEM','STATUS','DATAOPERACAO','CLIENTE','NOMEOPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUMETOTALTONELADAS','TOTALVIAGENSPREVISTAS','SALDOTONELADAS','OBSERVACOES','CRIADOPOR','CLIENTEID'];
  const missing=required.filter(k=>opHeaders[k]==null);
  if(missing.length) throw new Error('A guia OPERACOES não possui os campos esperados: '+missing.join(', '));
  const cfgSh=getSheet_('OPERACAO_CONFIGURACOES'), relSh=getSheet_('OPERACAO_CLIENTES'), lotSh=getSheet_('LOTES_OPERACAO');
  const opId=Utilities.getUuid(), now=new Date(), createdRows=[];
  const lock=LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const primary=activeClients[0], firstLot=normalizedLots[0];
    const opRow=new Array(opSh.getLastColumn()).fill('');
    const put=(map,row,key,value)=>{if(map[key]!=null)row[map[key]]=value;};
    put(opHeaders,opRow,'ID',opId);put(opHeaders,opRow,'CRIADOEM',now);put(opHeaders,opRow,'STATUS','ABERTA');
    put(opHeaders,opRow,'DATAOPERACAO',dataOp);put(opHeaders,opRow,'CLIENTE',primary.nome);
    put(opHeaders,opRow,'NOMEOPERACAO',nome);put(opHeaders,opRow,'ORIGEM',firstLot.origem);
    put(opHeaders,opRow,'DESTINO',firstLot.destino);put(opHeaders,opRow,'CATEGORIA','NORMAL');
    put(opHeaders,opRow,'VOLUMETOTALTONELADAS',totalVolume);put(opHeaders,opRow,'TOTALVIAGENSPREVISTAS',totalViagens);
    put(opHeaders,opRow,'SALDOTONELADAS',totalVolume);put(opHeaders,opRow,'OBSERVACOES','Operação configurável com '+normalizedLots.length+' lote(s).');
    put(opHeaders,opRow,'CRIADOPOR',session.login);put(opHeaders,opRow,'CLIENTEID',primary.id);
    opSh.appendRow(opRow);createdRows.push({sheet:opSh,row:opSh.getLastRow()});
    const cfgMap=ftHeaderMapViagens_(cfgSh), cfgRow=new Array(cfgSh.getLastColumn()).fill('');
    cfgRow[cfgMap.ID]=Utilities.getUuid();cfgRow[cfgMap.OPERACAOID]=opId;
    cfgRow[cfgMap.PARTICULARIDADESJSON]=particularidades;cfgRow[cfgMap.VERSAOCONFIGURACAO]=1;
    cfgRow[cfgMap.CRIADOEM]=now;cfgRow[cfgMap.CRIADOPOR]=session.login;
    cfgSh.appendRow(cfgRow);createdRows.push({sheet:cfgSh,row:cfgSh.getLastRow()});
    activeClients.forEach(c=>{
      const row=new Array(relSh.getLastColumn()).fill('');
      row[0]=Utilities.getUuid();row[1]=opId;row[2]=c.id;row[3]=c.id===primary.id?'SOLICITANTE':'PARTICIPANTE';
      row[4]='ATIVO';row[5]=now;row[6]=session.login;
      relSh.appendRow(row);createdRows.push({sheet:relSh,row:relSh.getLastRow()});
    });
    normalizedLots.forEach(l=>{
      const row=new Array(lotSh.getLastColumn()).fill('');
      const values={ID:Utilities.getUuid(),OPERACAOID:opId,CLIENTEID:l.clienteId,CODIGOLOTE:l.codigo,
        NOMELOTE:l.nome,PRODUTOSERVICO:l.produto,ORIGEM:l.origem,DESTINO:l.destino,
        VOLUMEPREVISTOTONELADAS:l.volume,VOLUMEREALIZADOTONELADAS:0,VAGASOFERTADAS:l.vagas,
        MOTORISTASPLANEJADOS:l.motoristas,JANELAINICIO:l.inicio,JANELAFIM:l.fim,
        PARTICULARIDADESJSON:l.particularidades,STATUS:'ABERTO',CRIADOEM:now,CRIADOPOR:session.login};
      Object.keys(values).forEach(k=>{if(ftHeaderMapViagens_(lotSh)[k]!=null)row[ftHeaderMapViagens_(lotSh)[k]]=values[k];});
      lotSh.appendRow(row);createdRows.push({sheet:lotSh,row:lotSh.getLastRow()});
    });
    auditar_(session,'CRIAR','OPERACAO',opId,nome+'; '+activeClients.length+' cliente(s); '+normalizedLots.length+' lote(s)');
  } catch(e) {
    createdRows.reverse().forEach(x=>{try{x.sheet.deleteRow(x.row);}catch(ignore){}});
    throw new Error('Não foi possível concluir o cadastro da operação. As linhas criadas nesta tentativa foram revertidas. Detalhe: '+e.message);
  } finally { lock.releaseLock(); }
  return {ok:true,id:opId,clientes:activeClients.length,lotes:normalizedLots.length,volumeTotal:totalVolume,
    message:'Operação criada com '+activeClients.length+' cliente(s) e '+normalizedLots.length+' lote(s).'};
}

/** Lista os lotes e clientes vinculados a uma operação. */
function obterDetalhesOperacaoComLotesFullTime(token, operacaoId) {
  const session=obterSessao_(token); exigirAdmin_(session);
  const id=texto_(operacaoId,100); if(!id) throw new Error('Informe a operação.');
  const opSh=getSheet_('OPERACOES'), opRows=opSh.getDataRange().getValues(), om=ftHeaderMapViagens_(opSh);
  const op=opRows.find((r,i)=>i>0&&String(r[om.ID])===id);
  if(!op) throw new Error('Operação não encontrada.');
  const read=(name)=>{const sh=getSheet_(name),rows=sh.getDataRange().getValues(),m=ftHeaderMapViagens_(sh);
    return rows.slice(1).filter(r=>String(r[m.OPERACAOID]||'')===id).map(r=>({id:String(r[m.ID]||''),campos:r.map(v=>v instanceof Date?v.toISOString():String(v??''))}));};
  const cfg=read('OPERACAO_CONFIGURACOES')[0];
  return {
    operacao:{id:id,nome:String(op[om.NOMEOPERACAO]||''),status:String(op[om.STATUS]||'')},
    particularidades:cfg?ftLotesParseJson_(cfg.campos[2],'Particularidades salvas'):{},
    clientes:read('OPERACAO_CLIENTES'),
    lotes:read('LOTES_OPERACAO')
  };
}
