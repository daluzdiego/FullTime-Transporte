/**
 * FULL TIME — Auditoria de integridade do MVP.
 * Somente leitura: não cria guias, não altera status e não modifica registros.
 * Executar pelo administrador no Apps Script depois de atualizar os arquivos.
 */
function auditarIntegridadeMvpFullTime(token) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  const requiredSheets = [
    'MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','OPERACOES',
    'DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','OFERTAS_CARGAS',
    'EVENTOS_ESCALA','PARTICIPACAO_OPERACOES','MOVIMENTACOES_OPERACAO',
    'CARGAS','ESCALAS','ENTRADA_OPERACOES_IA'
  ];
  const report = {
    executadoEm: new Date().toISOString(),
    modo: 'SOMENTE_LEITURA',
    resumo: {criticos:0,alertas:0,informativos:0},
    verificacoes: [],
    contagens: {},
    problemas: []
  };
  function add(severity, code, message, details) {
    report.verificacoes.push({severidade:severity,codigo:code,mensagem:message,detalhes:details||[]});
    if(severity==='CRITICO') report.resumo.criticos++;
    else if(severity==='ALERTA') report.resumo.alertas++;
    else report.resumo.informativos++;
    if(severity!=='OK') report.problemas.push({severidade:severity,codigo:code,mensagem:message,detalhes:details||[]});
  }
  const sheets = {};
  requiredSheets.forEach(name=>{
    try {
      const sh=getSheet_(name);
      sheets[name]=sh.getDataRange().getValues();
      report.contagens[name]=Math.max(0,sheets[name].length-1);
    } catch(e) {
      add('CRITICO','GUIA_AUSENTE','Não foi possível ler a guia '+name+'.',[e.message]);
    }
  });
  const drivers=ftRowsCadastroUnificados_('MOTORISTAS');
  const horses=ftRowsCadastroUnificados_('CAVALOS');
  const trailers=ftRowsCadastroUnificados_('CARRETAS');
  const sets=ftRowsCadastroUnificados_('CONJUNTOS');
  const byId=rows=>new Map(rows.map(r=>[String(r[0]||''),r]));
  const driverById=byId(drivers),horseById=byId(horses),trailerById=byId(trailers);
  const activeSets=sets.filter(r=>String(r[2]).toUpperCase()==='ATIVO');
  const used={MOTORISTA:{},CAVALO:{},CARRETA:{}};
  const duplicateLinks=[];
  const fakeActive=[];
  activeSets.forEach(r=>{
    const id=String(r[0]||''), driver=String(r[3]||''), horse=String(r[4]||''), middle=String(r[5]||''), rear=String(r[6]||'');
    const marker=(id+' '+r.slice(3).join(' ')).toUpperCase();
    if(/TESTE|FICTICIO|FICTÍCIO|EXAMPLE\\.INVALID|NAO USAR EM OPERACAO|NÃO USAR EM OPERAÇÃO/.test(marker)) fakeActive.push(id);
    [[ 'MOTORISTA',driver ],['CAVALO',horse],['CARRETA',middle],['CARRETA',rear]].forEach(([kind,key])=>{
      if(!key)return;
      if(!used[kind][key])used[kind][key]=[];
      used[kind][key].push(id);
    });
    if(!driverById.has(driver))duplicateLinks.push(id+': motorista não encontrado ('+driver+')');
    else if(String(driverById.get(driver)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': motorista não ativo ('+driver+')');
    if(!horseById.has(horse))duplicateLinks.push(id+': cavalo não encontrado ('+horse+')');
    else if(String(horseById.get(horse)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': cavalo não ativo ('+horse+')');
    [middle,rear].filter(Boolean).forEach(key=>{
      if(!trailerById.has(key))duplicateLinks.push(id+': carreta não encontrada ('+key+')');
      else if(String(trailerById.get(key)[2]).toUpperCase()!=='ATIVO')duplicateLinks.push(id+': carreta não ativa ('+key+')');
    });
    if(!(Number(String(r[10]||'').replace(',','.'))>0))duplicateLinks.push(id+': capacidade útil inválida');
  });
  const reused=[];
  Object.keys(used).forEach(kind=>Object.keys(used[kind]).forEach(key=>{
    if(used[kind][key].length>1)reused.push(kind+' '+key+' usado nos conjuntos '+used[kind][key].join(', '));
  }));
  add(fakeActive.length?'CRITICO':'OK','CONJUNTOS_FICTICIOS_ATIVOS',fakeActive.length?'Há conjuntos ativos com identificadores ou dados fictícios.':'Nenhum conjunto ativo foi identificado como fictício.',fakeActive);
  add(duplicateLinks.length?'CRITICO':'OK','VINCULOS_CONJUNTOS',duplicateLinks.length?'Há vínculos de conjuntos inválidos ou incompletos.':'Os vínculos ativos apontam para cadastros ativos e capacidade preenchida.',duplicateLinks);
  add(reused.length?'CRITICO':'OK','EQUIPAMENTOS_REUTILIZADOS',reused.length?'Motoristas ou equipamentos aparecem em mais de um conjunto ativo.':'Não há motorista/equipamento repetido entre conjuntos ativos.',reused);
  const participation=sheets.PARTICIPACAO_OPERACOES||[];
  const activeParts=participation.slice(1).filter(r=>String(r[5]).toUpperCase()==='ATIVO');
  const activeSetParts={},activeDriverParts={};
  activeParts.forEach(r=>{
    const setId=String(r[3]||''),driverId=String(r[4]||'');
    if(setId)(activeSetParts[setId]||(activeSetParts[setId]=[])).push(String(r[2]||''));
    if(driverId)(activeDriverParts[driverId]||(activeDriverParts[driverId]=[])).push(String(r[2]||''));
  });
  const overlapping=[];
  Object.keys(activeSetParts).forEach(id=>{if(activeSetParts[id].length>1)overlapping.push('Conjunto '+id+' ativo em operações: '+activeSetParts[id].join(', '));});
  Object.keys(activeDriverParts).forEach(id=>{if(activeDriverParts[id].length>1)overlapping.push('Motorista '+id+' ativo em operações: '+activeDriverParts[id].join(', '));});
  add(overlapping.length?'CRITICO':'OK','PARTICIPACOES_SIMULTANEAS',overlapping.length?'Há conjuntos ou motoristas em múltiplas operações ativas.':'Não há participações simultâneas duplicadas.',overlapping);
  const availability=sheets.DISPONIBILIDADE_DIARIA||[];
  const availabilityIssues=[];
  const knownDriverIds=new Set(drivers.map(r=>String(r[0]||'')));
  const dateKey=v=>{
    if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');
    const s=String(v||'').trim();
    return /^\\d{4}-\\d{2}-\\d{2}/.test(s)?s.slice(0,10):'';
  };
  const seenAvailability=new Set();
  availability.slice(1).forEach((r,i)=>{
    const d=dateKey(r[2]),driver=String(r[3]||''),status=String(r[4]||'').toUpperCase(),key=d+'|'+driver;
    if(!d||!driver)availabilityIssues.push('Linha '+(i+2)+': data ou motorista ausente/inválido.');
    if(driver&&!knownDriverIds.has(driver))availabilityIssues.push('Linha '+(i+2)+': motorista não encontrado ('+driver+').');
    if(seenAvailability.has(key))availabilityIssues.push('Linha '+(i+2)+': disponibilidade duplicada para '+key+'.');
    seenAvailability.add(key);
    if(!['DISPONIVEL','INDISPONIVEL'].includes(status))availabilityIssues.push('Linha '+(i+2)+': status de disponibilidade inválido ('+status+').');
  });
  add(availabilityIssues.length?'ALERTA':'OK','DISPONIBILIDADE',availabilityIssues.length?'Há inconsistências nos registros de disponibilidade.':'Os registros de disponibilidade têm data, motorista e status válidos.',availabilityIssues);
  let docs=[];
  try{docs=ftReadBrunoRows_('DOCUMENTOS');}catch(e){add('ALERTA','LEITURA_DOCUMENTOS','Não foi possível ler a base sincronizada de documentos.',[e.message]);}
  const unvalidatedDocs=docs.filter(r=>!['VALIDO','APROVADO','ATIVO','REGULAR'].includes(String(r.STATUS||'').trim().toUpperCase()));
  add(unvalidatedDocs.length?'ALERTA':'OK','DOCUMENTOS_NAO_VALIDADOS',unvalidatedDocs.length?'Existem documentos sincronizados sem status reconhecido como válido.':'Todos os documentos lidos possuem status reconhecido como válido.',unvalidatedDocs.map(r=>String(r.ID_DOCUMENTO||'')+' — '+String(r.STATUS||'sem status')));
  const fakeIds=[...drivers,...horses,...trailers].filter(r=>/TESTE|FICTICIO|FICTÍCIO|EXAMPLE\\.INVALID/.test((String(r[0]||'')+' '+r.slice(3).join(' ')).toUpperCase())).map(r=>String(r[0]));
  add(fakeIds.length?'ALERTA':'OK','CADASTROS_DE_TESTE',fakeIds.length?'Há cadastros fictícios/teste na base; eles devem permanecer isolados e nunca ser ativados.':'Nenhum cadastro fictício foi identificado.',fakeIds);
  return report;
}
