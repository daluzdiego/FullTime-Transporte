/**
 * FULL TIME — Auditoria de integridade do MVP.
 * Somente leitura: não cria guias, não altera status e não modifica registros.
 * Executar pelo administrador no Apps Script depois de atualizar os arquivos.
 */
function auditarIntegridadeMvpFullTime(token) {
  const session=obterSessao_(token);exigirAdmin_(session);
  const requiredSheets=['MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','CONJUNTO_OVERRIDES','OPERACOES','DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','OFERTAS_CARGAS','EVENTOS_ESCALA','PARTICIPACAO_OPERACOES','MOVIMENTACOES_OPERACAO','CARGAS','ESCALAS','ENTRADA_OPERACOES_IA'];
  const report={executadoEm:new Date().toISOString(),modo:'SOMENTE_LEITURA',resumo:{criticos:0,alertas:0,informativos:0},verificacoes:[],contagens:{},problemas:[]};
  function add(severity,code,message,details){
    report.verificacoes.push({severidade:severity,codigo:code,mensagem:message,detalhes:details||[]});
    if(severity==='CRITICO')report.resumo.criticos++;else if(severity==='ALERTA')report.resumo.alertas++;else report.resumo.informativos++;
    if(severity!=='OK')report.problemas.push({severidade:severity,codigo:code,mensagem:message,detalhes:details||[]});
  }
  const sheets={};
  requiredSheets.forEach(name=>{
    try{const sh=getSheet_(name);sheets[name]=sh.getDataRange().getValues();report.contagens[name]=Math.max(0,sheets[name].length-1);}
    catch(e){add('CRITICO','GUIA_AUSENTE','Não foi possível ler a guia '+name+'.',[e.message]);}
  });
  let drivers=[],horses=[],trailers=[],sets=[];
  try{
    drivers=ftCadastroRowsAsLegacy_('MOTORISTAS');
    horses=ftCadastroRowsAsLegacy_('CAVALOS');
    trailers=ftCadastroRowsAsLegacy_('CARRETAS');
    sets=ftCadastroRowsAsLegacy_('CONJUNTOS');
  }catch(e){add('CRITICO','LEITURA_CADASTROS','Não foi possível ler os cadastros sincronizados do Bruno.',[e.message]);}
  const byId=rows=>new Map(rows.filter(r=>String(r[0]||'')).map(r=>[String(r[0]),r]));
  const driverById=byId(drivers),horseById=byId(horses),trailerById=byId(trailers),setById=byId(sets);
  const activeSets=sets.filter(r=>String(r[2]||'').toUpperCase()==='ATIVO');
  const used={MOTORISTA:{},CAVALO:{},CARRETA:{}},duplicateLinks=[],fakeActive=[],conditionIssues=[];
  activeSets.forEach(r=>{
    const id=String(r[0]||''),driver=String(r[3]||''),horse=String(r[4]||''),middle=String(r[5]||''),rear=String(r[6]||'');
    const marker=(id+' '+r.slice(3).join(' ')).toUpperCase();
    if(/TESTE|FICTICIO|FICTÍCIO|EXAMPLE\.INVALID|NAO USAR EM OPERACAO|NÃO USAR EM OPERAÇÃO/.test(marker))fakeActive.push(id);
    [['MOTORISTA',driver],['CAVALO',horse],['CARRETA',middle],['CARRETA',rear]].forEach(([kind,key])=>{if(!key)return;(used[kind][key]||(used[kind][key]=[])).push(id);});
    if(!driverById.has(driver))duplicateLinks.push(id+': motorista não encontrado ('+driver+')');else if(String(driverById.get(driver)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': motorista não ativo ('+driver+')');
    if(!horseById.has(horse))duplicateLinks.push(id+': cavalo não encontrado ('+horse+')');else if(String(horseById.get(horse)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': cavalo não ativo ('+horse+')');
    [middle,rear].filter(Boolean).forEach(key=>{if(!trailerById.has(key))duplicateLinks.push(id+': carreta não encontrada ('+key+')');else if(String(trailerById.get(key)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': carreta não ativa ('+key+')');});
    if(!(Number(String(r[10]||'').replace(',','.'))>0))duplicateLinks.push(id+': capacidade útil inválida');
    const condition=String(r[8]||'').trim().toUpperCase();
    if(!condition)conditionIssues.push(id+': condição não inspecionada; não entra na escala automática.');
    else if(condition==='APTO_COM_RESTRICAO')conditionIssues.push(id+': conjunto com restrição; exige avaliação/atribuição administrativa específica.');
    else if(condition==='APTO'&&String(r[9]||'').trim())conditionIssues.push(id+': marcado APTO, mas ainda possui restrições cadastradas.');
    else if(!['APTO','INDISPONIVEL'].includes(condition))conditionIssues.push(id+': condição operacional desconhecida ('+condition+').');
  });
  const reused=[];Object.keys(used).forEach(kind=>Object.keys(used[kind]).forEach(key=>{if(used[kind][key].length>1)reused.push(kind+' '+key+' usado nos conjuntos '+used[kind][key].join(', '));}));
  add(fakeActive.length?'CRITICO':'OK','CONJUNTOS_FICTICIOS_ATIVOS',fakeActive.length?'Há conjuntos ativos com identificadores ou dados fictícios.':'Nenhum conjunto ativo foi identificado como fictício.',fakeActive);
  add(duplicateLinks.length?'CRITICO':'OK','VINCULOS_CONJUNTOS',duplicateLinks.length?'Há vínculos de conjuntos inválidos ou incompletos.':'Os vínculos ativos apontam para cadastros ativos e capacidade preenchida.',duplicateLinks);
  add(reused.length?'CRITICO':'OK','EQUIPAMENTOS_REUTILIZADOS',reused.length?'Motoristas ou equipamentos aparecem em mais de um conjunto ativo.':'Não há motorista/equipamento repetido entre conjuntos ativos.',reused);
  add(conditionIssues.length?'ALERTA':'OK','CONDICAO_CONJUNTOS',conditionIssues.length?'Há conjuntos sem inspeção APTO ou com restrições que exigem avaliação.':'Condições dos conjuntos ativos estão registradas.',conditionIssues);
  const syntheticCapacitySets=sets.filter(r=>/CAPACIDADE SINTÉTICA CALCULADA PARA TESTE/i.test(String(r[7]||''))).map(r=>String(r[0]||''));
  add(syntheticCapacitySets.length?'ALERTA':'OK','CAPACIDADE_SINTETICA_CONJUNTOS',syntheticCapacitySets.length?'Há conjuntos cuja capacidade foi calculada com valores fictícios. Esses números não representam capacidade legal ou operacional.':'Nenhuma capacidade sintética derivada foi encontrada.',syntheticCapacitySets);
  const participation=sheets.PARTICIPACAO_OPERACOES||[],activeParts=participation.slice(1).filter(r=>String(r[5]||'').toUpperCase()==='ATIVO');
  const activeSetParts={},activeDriverParts={};
  activeParts.forEach(r=>{const setId=String(r[3]||''),driverId=String(r[4]||'');if(setId)(activeSetParts[setId]||(activeSetParts[setId]=[])).push(String(r[2]||''));if(driverId)(activeDriverParts[driverId]||(activeDriverParts[driverId]=[])).push(String(r[2]||''));});
  const overlapping=[];Object.keys(activeSetParts).forEach(id=>{if(activeSetParts[id].length>1)overlapping.push('Conjunto '+id+' ativo em operações: '+activeSetParts[id].join(', '));});
  Object.keys(activeDriverParts).forEach(id=>{if(activeDriverParts[id].length>1)overlapping.push('Motorista '+id+' ativo em operações: '+activeDriverParts[id].join(', '));});
  add(overlapping.length?'CRITICO':'OK','PARTICIPACOES_SIMULTANEAS',overlapping.length?'Há conjuntos ou motoristas em múltiplas operações ativas.':'Não há participações simultâneas duplicadas.',overlapping);
  const availability=sheets.DISPONIBILIDADE_DIARIA||[],availabilityIssues=[],knownDriverIds=new Set(drivers.map(r=>String(r[0]||'')));
  const dateKey=v=>{if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';};
  const seenAvailability=new Set();
  availability.slice(1).forEach((r,i)=>{
    const d=dateKey(r[2]),driver=String(r[3]||''),status=String(r[4]||'').toUpperCase(),key=d+'|'+driver;
    if(!d||!driver)availabilityIssues.push('Linha '+(i+2)+': data ou motorista ausente/inválido.');
    if(driver&&!knownDriverIds.has(driver))availabilityIssues.push('Linha '+(i+2)+': motorista não encontrado ('+driver+').');
    if(seenAvailability.has(key))availabilityIssues.push('Linha '+(i+2)+': disponibilidade duplicada para '+key+'.');
    seenAvailability.add(key);
    if(!['DISPONIVEL','INDISPONIVEL'].includes(status))availabilityIssues.push('Linha '+(i+2)+': status de disponibilidade inválido ('+status+').');
  });
  if(availability.length<=1)add('ALERTA','DISPONIBILIDADE_AUSENTE','Ainda não há registros de disponibilidade de motoristas.',[]);
  else add(availabilityIssues.length?'ALERTA':'OK','DISPONIBILIDADE',availabilityIssues.length?'Há inconsistências nos registros de disponibilidade.':'Os registros de disponibilidade têm data, motorista e status válidos.',availabilityIssues);
  const ops=sheets.OPERACOES||[],loads=sheets.CARGAS||[],moves=sheets.MOVIMENTACOES_OPERACAO||[],offers=sheets.OFERTAS_CARGAS||[],scales=sheets.ESCALAS||[],events=sheets.EVENTOS_ESCALA||[];
  const opIds=new Set(ops.slice(1).map(r=>String(r[0]||'')).filter(Boolean)),loadById=new Map(),loadsByOp={},orphanLoads=[],badTripCounts=[];
  loads.slice(1).forEach((r,i)=>{
    const id=String(r[0]||''),opId=String(r[20]||'');
    if(id)loadById.set(id,r);
    if(!opId||!opIds.has(opId))orphanLoads.push('Linha '+(i+2)+': carga '+id+' sem operação-pai válida ('+opId+').');
    if(opId)(loadsByOp[opId]||(loadsByOp[opId]=[])).push(r);
  });
  ops.slice(1).forEach((r,i)=>{
    const id=String(r[0]||''),planned=Number(r[10]||0),children=(loadsByOp[id]||[]).length;
    if(!Number.isInteger(planned)||planned<1||planned>30)badTripCounts.push('Operação '+id+': quantidade prevista fora de 1–30 ('+planned+').');
    if(children!==planned)badTripCounts.push('Operação '+id+': '+planned+' viagens previstas, '+children+' registros-filhos encontrados.');
  });
  add(orphanLoads.length?'CRITICO':'OK','CARGAS_SEM_OPERACAO',orphanLoads.length?'Há viagens sem operação-pai válida.':'Todas as viagens estão vinculadas a uma operação.',orphanLoads);
  add(badTripCounts.length?'ALERTA':'OK','QUANTIDADE_VIAGENS',badTripCounts.length?'Há operações com quantidade de viagens divergente dos registros-filhos.':'Quantidade prevista e viagens-filhas conferem.',badTripCounts);
  const movementIssues=[],actualByLoad={};
  moves.slice(1).forEach((r,i)=>{
    const opId=String(r[2]||''),loadId=String(r[9]||''),tonnes=Number(r[5]||0);
    if(!opIds.has(opId))movementIssues.push('Movimentação linha '+(i+2)+': operação não encontrada ('+opId+').');
    if(loadId){
      const load=loadById.get(loadId);
      if(!load)movementIssues.push('Movimentação linha '+(i+2)+': viagem não encontrada ('+loadId+').');
      else if(String(load[20]||'')!==opId)movementIssues.push('Movimentação linha '+(i+2)+': viagem e operação não correspondem ('+loadId+').');
      actualByLoad[loadId]=(actualByLoad[loadId]||0)+tonnes;
    }
  });
  const actualWeightIssues=[];
  loads.slice(1).forEach((r,i)=>{const id=String(r[0]||''),stored=Number(r[21]||0),sum=Number(actualByLoad[id]||0);if(Math.abs(stored-sum)>0.01)actualWeightIssues.push('Viagem '+id+': peso real armazenado '+stored+' t, soma das movimentações '+sum+' t (linha '+(i+2)+').');});
  add(movementIssues.length?'ALERTA':'OK','MOVIMENTACOES_VINCULOS',movementIssues.length?'Há movimentações sem vínculo válido com operação/viagem.':'As movimentações apontam para operações e viagens válidas.',movementIssues);
  add(actualWeightIssues.length?'ALERTA':'OK','PESO_REAL_VIAGENS',actualWeightIssues.length?'O peso real da viagem diverge da soma das movimentações.':'Peso real das viagens confere com as movimentações.',actualWeightIssues);
  const offerIssues=[],pendingByOp={};const validOfferStatuses=['PENDENTE','ACEITA','RECUSOU','INDISPONIVEL','EXPIRADA'];
  offers.slice(1).forEach((r,i)=>{
    const opId=String(r[11]||''),status=String(r[6]||'').toUpperCase(),expiry=r[7] instanceof Date?r[7]:new Date(r[7]);
    if(!opIds.has(opId))offerIssues.push('Oferta linha '+(i+2)+': operação não encontrada ('+opId+').');
    if(!validOfferStatuses.includes(status))offerIssues.push('Oferta linha '+(i+2)+': status inválido ('+status+').');
    if(status==='PENDENTE'){(pendingByOp[opId]||(pendingByOp[opId]=[])).push(String(r[0]||''));if(isFinite(expiry.getTime())&&expiry<=new Date())offerIssues.push('Oferta '+r[0]+': está pendente apesar de vencida.');}
  });
  Object.keys(pendingByOp).forEach(id=>{if(pendingByOp[id].length>1)offerIssues.push('Operação '+id+': múltiplas ofertas pendentes ('+pendingByOp[id].join(', ')+').');});
  add(offerIssues.length?'ALERTA':'OK','OFERTAS_OPERACAO',offerIssues.length?'Há inconsistências no ciclo de ofertas.':'Ofertas possuem operação, status e prazo consistentes.',offerIssues);
  const scaleIssues=[];
  scales.slice(1).forEach((r,i)=>{const opId=String(r[12]||'');if(opId&&!opIds.has(opId))scaleIssues.push('Escala linha '+(i+2)+': operação não encontrada ('+opId+').');});
  add(scaleIssues.length?'ALERTA':'OK','ESCALAS_OPERACAO',scaleIssues.length?'Há escalas com operação-pai ausente.':'As escalas com operação informada apontam para operações existentes.',scaleIssues);
  const eventIssues=[];
  events.slice(1).forEach((r,i)=>{const opId=String(r[10]||'');if(opId&&!opIds.has(opId))eventIssues.push('Evento linha '+(i+2)+': operação não encontrada ('+opId+').');});
  add(eventIssues.length?'ALERTA':'OK','EVENTOS_OPERACAO',eventIssues.length?'Há eventos com operação inexistente.':'Os eventos com operação informada apontam para operações existentes.',eventIssues);
  const overrides=sheets.CONJUNTO_OVERRIDES||[],overrideIssues=[],seenOverrides=new Set();
  overrides.slice(1).forEach((r,i)=>{const id=String(r[0]||'');if(!id)return;if(seenOverrides.has(id))overrideIssues.push('Override duplicado para conjunto '+id+' (linha '+(i+2)+').');seenOverrides.add(id);if(!setById.has(id))overrideIssues.push('Override aponta para conjunto inexistente '+id+'.');if(r[3]!==''&&r[3]!=null&&!(Number(String(r[3]).replace(',','.'))>0))overrideIssues.push('Override de capacidade inválida para conjunto '+id+'.');});
  add(overrideIssues.length?'ALERTA':'OK','OVERRIDES_CONJUNTOS',overrideIssues.length?'Há overrides duplicados ou inválidos.':'Overrides de conjuntos sem duplicidade ou referência inválida.',overrideIssues);
  let docs=[],docsRead=true;
  try{docs=ftReadBrunoRows_('DOCUMENTOS');}catch(e){docsRead=false;add('ALERTA','LEITURA_DOCUMENTOS','Não foi possível ler a base sincronizada de documentos.',[e.message]);}
  const unvalidatedDocs=docs.filter(r=>!['VALIDO','APROVADO','ATIVO','REGULAR'].includes(String(r.STATUS||'').trim().toUpperCase()));
  if(docsRead&&!docs.length)add('ALERTA','DOCUMENTOS_AUSENTES','Nenhum documento foi encontrado na base sincronizada.',[]);
  else if(docsRead)add(unvalidatedDocs.length?'ALERTA':'OK','DOCUMENTOS_NAO_VALIDADOS',unvalidatedDocs.length?'Existem documentos sincronizados sem status reconhecido como válido.':'Todos os documentos lidos possuem status reconhecido como válido.',unvalidatedDocs.map(r=>String(r.ID_DOCUMENTO||'')+' — '+String(r.STATUS||'sem status')));
  const fakeIds=[...drivers,...horses,...trailers].filter(r=>/TESTE|FICTICIO|FICTÍCIO|EXAMPLE\.INVALID/.test((String(r[0]||'')+' '+r.slice(3).join(' ')).toUpperCase())).map(r=>String(r[0]));
  add(fakeIds.length?'ALERTA':'OK','CADASTROS_DE_TESTE',fakeIds.length?'Há cadastros fictícios/teste na base; eles devem permanecer isolados e nunca ser ativados.':'Nenhum cadastro fictício foi identificado.',fakeIds);
  return report;
}
