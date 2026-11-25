/**
 * FULL TIME — Portal seguro do motorista
 * O vínculo do motorista é obtido da sessão autenticada, nunca do navegador.
 */
function exigirMotorista_(session) {
  if (!session || String(session.perfil || '').toUpperCase() !== 'MOTORISTA')
    throw new Error('Acesso restrito ao portal do motorista.');
  if (!session.motoristaId) throw new Error('Esta conta ainda não está vinculada a um cadastro de motorista.');
  return String(session.motoristaId);
}

function FT_MOTORISTA_headerMap_(sh) {
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], map={};
  headers.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&!Object.prototype.hasOwnProperty.call(map,k))map[k]=i;});
  return map;
}

function obterPortalMotoristaFullTime(token) {
  const session = obterSessao_(token);
  const motoristaId = exigirMotorista_(session);

  // O portal é somente leitura: não cria cabeçalhos nem altera a planilha durante a consulta.
  const parts = getSheet_('PARTICIPACAO_OPERACOES');
  const pmap = FT_MOTORISTA_headerMap_(parts);
  const required = ['ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'STATUS_PARTICIPACAO', 'CONJUNTO_ID'];
  const missing = required.filter(key => pmap[key] === undefined);
  if (missing.length) {
    throw new Error('A guia PARTICIPACAO_OPERACOES está sem cabeçalho(s) obrigatório(s): ' + missing.join(', ') + '. Nenhum dado foi alterado.');
  }

  // Converte Date em texto ISO antes do retorno. google.script.run não transporta objetos Date.
  const serializar = value => {
    if (value instanceof Date) return isFinite(value.getTime()) ? value.toISOString() : '';
    if (Array.isArray(value)) return value.map(serializar);
    if (value && typeof value === 'object') {
      const out = {};
      Object.keys(value).forEach(key => { out[key] = serializar(value[key]); });
      return out;
    }
    return value == null ? '' : value;
  };
  const cell = (row, map, key, fallback) =>
    map[key] === undefined || row[map[key]] == null || row[map[key]] === '' ? (fallback === undefined ? '' : fallback) : row[map[key]];
  const asText = value => value == null ? '' : String(value).trim();
  const asIso = value => {
    if (value instanceof Date) return isFinite(value.getTime()) ? value.toISOString() : '';
    if (value === '' || value == null) return '';
    const parsed = new Date(value);
    return isFinite(parsed.getTime()) ? parsed.toISOString() : String(value);
  };

  const rows = parts.getDataRange().getValues();
  const own = rows.slice(1).filter(row => asText(cell(row, pmap, 'MOTORISTA_ID')) === motoristaId);

  const driverRecord = listarRegistros_('MOTORISTAS').find(driver => asText(driver.id) === motoristaId);
  if (!driverRecord) {
    throw new Error('O usuário está vinculado ao motorista ' + motoristaId + ', mas esse ID não foi encontrado na guia MOTORISTAS. Corrija MOTORISTA_ID na guia USUARIOS.');
  }
  const driverFields = driverRecord.camposPorNome || {};
  const driverName = asText(driverFields.NOME_COMPLETO || driverRecord.nome || session.nome || 'Motorista');

  const opsSheet = getSheet_('OPERACOES');
  const omap = FT_MOTORISTA_headerMap_(opsSheet);
  const opRows = opsSheet.getDataRange().getValues();
  const ops = {};
  opRows.slice(1).forEach(row => {
    const id = asText(cell(row, omap, 'ID'));
    if (!id) return;
    const rawDate = cell(row, omap, 'DATA_OPERACAO');
    const dateKey = rawDate instanceof Date
      ? Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : asText(rawDate).slice(0, 10);
    ops[id] = {
      id: id,
      status: asText(cell(row, omap, 'STATUS')),
      data: rawDate,
      dataKey: dateKey,
      cliente: asText(cell(row, omap, 'CLIENTE')),
      nome: asText(cell(row, omap, 'NOME_OPERACAO')),
      origem: asText(cell(row, omap, 'ORIGEM')),
      destino: asText(cell(row, omap, 'DESTINO')),
      produto: asText(cell(row, omap, 'PRODUTO_SERVICO')),
      distanciaKm: cell(row, omap, 'DISTANCIA_KM'),
      dataEntrega: cell(row, omap, 'DATA_ENTREGA'),
      janelaInicio: cell(row, omap, 'JANELA_INICIO'),
      janelaFim: cell(row, omap, 'JANELA_FIM'),
      tempoEstimadoHoras: cell(row, omap, 'TEMPO_ESTIMADO_HORAS'),
      volume: Number(cell(row, omap, 'VOLUME_TOTAL_TONELADAS', 0) || 0)
    };
  });

  const now = Date.now();
  const offers = own.map(row => {
    const offerId = asText(cell(row, pmap, 'ID'));
    const operationId = asText(cell(row, pmap, 'OPERACAO_ID'));
    const op = ops[operationId] || {};
    const snapDate = asText(cell(row, pmap, 'DATA_OPERACAO_OFERTA')).slice(0, 10);
    const snapStart = asText(cell(row, pmap, 'HORARIO_OPERACAO_OFERTA'));
    const snapEnd = asText(cell(row, pmap, 'JANELA_FIM_OFERTA'));
    const currentDate = asText(op.dataKey || op.data).slice(0, 10);
    const scheduleChanged = !!snapDate && (
      snapDate !== currentDate ||
      snapStart !== asText(op.janelaInicio) ||
      snapEnd !== asText(op.janelaFim)
    );
    const rawExpiry = cell(row, pmap, 'EXPIRA_EM');
    const expiry = rawExpiry instanceof Date ? rawExpiry : new Date(rawExpiry);
    let status = asText(cell(row, pmap, 'STATUS_PARTICIPACAO')).toUpperCase();
    if (status === 'OFERTADA' && scheduleChanged) status = 'CANCELADA_REPROGRAMACAO';
    else if (status === 'OFERTADA' && (!isFinite(expiry.getTime()) || expiry.getTime() <= now)) status = 'NAO_RESPONDEU';

    return {
      id: offerId,
      ofertaId: offerId,
      operacaoId: operationId,
      status: status,
      criadaEm: asIso(cell(row, pmap, 'CRIADO_EM')),
      ofertadaEm: asIso(cell(row, pmap, 'OFERTADA_EM') || cell(row, pmap, 'CRIADO_EM')),
      respondidaEm: asIso(cell(row, pmap, 'RESPONDIDA_EM')),
      expiraEm: asIso(rawExpiry),
      expirada: status === 'NAO_RESPONDEU' || status === 'EXPIRADA',
      agendaAlterada: status === 'CANCELADA_REPROGRAMACAO',
      observacoes: asText(cell(row, pmap, 'OBSERVACOES_OFERTA') || cell(row, pmap, 'MOTIVO')),
      operacao: op,
      conjuntoId: asText(cell(row, pmap, 'CONJUNTO_ID')),
      eventos: []
    };
  }).filter(offer => offer.id);

  // Recupera eventos vinculados ao motorista. A guia é opcional para manter compatibilidade
  // com bases antigas; quando existe, a leitura também é somente leitura.
  let driverEvents = [];
  try {
    const eventsSheet = getSheet_('EVENTOS_ESCALA');
    if (eventsSheet.getLastRow() > 1 && eventsSheet.getLastColumn() > 0) {
      const emap = FT_MOTORISTA_headerMap_(eventsSheet);
      const eventRows = eventsSheet.getDataRange().getValues().slice(1);
      driverEvents = eventRows
        .filter(row => asText(cell(row, emap, 'MOTORISTA_ID')) === motoristaId)
        .map(row => {
          const operationId = asText(cell(row, emap, 'OPERACAO_ID'));
          return {
            id: asText(cell(row, emap, 'ID')),
            ofertaId: asText(cell(row, emap, 'OFERTA_ID')),
            tipo: asText(cell(row, emap, 'TIPO_EVENTO')),
            dataHora: asIso(cell(row, emap, 'DATA_HORA')),
            motivo: asText(cell(row, emap, 'MOTIVO')),
            operacaoId: operationId,
            conjuntoId: asText(cell(row, emap, 'CONJUNTO_ID')),
            operacao: ops[operationId] || {}
          };
        })
        .sort((a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));
    }
  } catch (error) {
    // Não interrompe a exibição das ofertas se a guia histórica ainda não existir.
    driverEvents = [];
  }

  const eventsByOffer = {};
  driverEvents.forEach(event => {
    if (!event.ofertaId) return;
    if (!eventsByOffer[event.ofertaId]) eventsByOffer[event.ofertaId] = [];
    eventsByOffer[event.ofertaId].push(event);
  });
  offers.forEach(offer => {
    offer.eventos = eventsByOffer[offer.id] || [];
  });
  offers.sort((a, b) => new Date(b.ofertadaEm || b.criadaEm || 0) - new Date(a.ofertadaEm || a.criadaEm || 0));

  const statuses = offers.map(offer => offer.status);
  const counts = {
    total: offers.length,
    pendentes: offers.filter(offer => offer.status === 'OFERTADA' && !offer.expirada).length,
    aceitas: offers.filter(offer => offer.status === 'ACEITA' || offer.status === 'ATIVO').length,
    recusadas: offers.filter(offer => offer.status === 'RECUSADA').length,
    expiradas: offers.filter(offer => offer.status === 'NAO_RESPONDEU' || offer.status === 'EXPIRADA').length,
    canceladas: offers.filter(offer => offer.status === 'CANCELADA' || offer.status === 'CANCELADA_REPROGRAMACAO').length
  };
  const offerIds = new Set(offers.map(offer => offer.id));
  const orphanEvents = driverEvents.filter(event => !event.ofertaId || !offerIds.has(event.ofertaId));

  const payload = {
    user: { nome: driverName, email: session.email || '', perfil: session.perfil },
    motoristaId: motoristaId,
    diagnosticoVinculo: {
      motoristaId: motoristaId,
      nomeCadastro: driverName,
      ofertasVinculadas: own.length,
      ofertasPendentes: counts.pendentes,
      eventosHistoricos: driverEvents.length
    },
    ofertas: offers,
    eventos: orphanEvents,
    counts: counts
  };

  // Última barreira: garante que nenhum Date ou objeto não serializável chegue ao google.script.run.
  return serializar(payload);
}

/**
 * Alias de compatibilidade: versões publicadas do portal podem chamar V2.
 * Mantém o mesmo contrato e as mesmas validações do endpoint canônico.
 */
function obterPortalMotoristaFullTimeV2(token) {
  return obterPortalMotoristaFullTime(token);
}

function responderOfertaMotoristaFullTime(token, ofertaId, resposta, observacao) {
  const session=obterSessao_(token), motoristaId=exigirMotorista_(session);
  ofertaId=texto_(ofertaId,120); resposta=String(resposta||'').trim().toUpperCase();
  if(!ofertaId||!['ACEITA','RECUSADA'].includes(resposta))throw new Error('Resposta inválida.');
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('PARTICIPACAO_OPERACOES');
    const map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
    let idx=-1,record=null;
    for(let i=1;i<rows.length;i++)if(String(rows[i][map.ID]||'')===ofertaId){idx=i;record=rows[i];break;}
    if(idx<1||String(record[map.MOTORISTA_ID]||'')!==motoristaId)throw new Error('Oferta não encontrada para este motorista.');
    if(String(record[map.STATUS_PARTICIPACAO]||'').toUpperCase()!=='OFERTADA')throw new Error('Esta oferta já foi respondida ou não está mais pendente.');
    const expires=record[map.EXPIRA_EM] instanceof Date?record[map.EXPIRA_EM]:new Date(record[map.EXPIRA_EM]);
    if(!isFinite(expires.getTime())||expires.getTime()<=Date.now()){
      const now=new Date();
      sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('NAO_RESPONDEU');
      if(map.RESPONDIDA_EM!==undefined)sh.getRange(idx+1,map.RESPONDIDA_EM+1).setValue(now);
      FT_colocarMotoristaNoFinalDaFila_(motoristaId,'não respondeu em 6 horas');
      FT_CONV_appendEvent_({tipo:'OFERTA_EXPIRADA',operacaoId:record[map.OPERACAO_ID],motoristaId,conjuntoId:record[map.CONJUNTO_ID],anterior:'OFERTADA',nova:'NAO_RESPONDEU',motivo:'Prazo de resposta encerrado.',autor:session.email,ofertaId});
      auditar_(session,'OFERTA_EXPIRADA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId);
      return {ok:false,status:'EXPIRADA',message:'O prazo desta oferta expirou. Solicite uma nova convocação.'};
    }
    const now=new Date(),note=texto_(observacao,500);
    sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue(resposta==='ACEITA'?'ACEITA':'RECUSADA');
    if(resposta==='ACEITA'&&map.INICIO_EM!==undefined)sh.getRange(idx+1,map.INICIO_EM+1).setValue(now);
    if(map.RESPONDIDA_EM!==undefined)sh.getRange(idx+1,map.RESPONDIDA_EM+1).setValue(now);
    if(note&&map.MOTIVO!==undefined)sh.getRange(idx+1,map.MOTIVO+1).setValue(note);
    if(resposta==='RECUSADA')FT_colocarMotoristaNoFinalDaFila_(motoristaId,'recusou a convocação');
    FT_CONV_appendEvent_({tipo:resposta==='ACEITA'?'ESCALA_CONFIRMADA':'OFERTA_RECUSADA',
      operacaoId:record[map.OPERACAO_ID],motoristaId,conjuntoId:record[map.CONJUNTO_ID],
      anterior:'OFERTADA',nova:resposta,motivo:note||'Resposta registrada pelo portal do motorista.',
      autor:session.email,ofertaId});
    auditar_(session,'RESPOSTA_OFERTA_MOTORISTA','OPERACAO',String(record[map.OPERACAO_ID]),ofertaId+' -> '+resposta);
    return {ok:true,status:resposta==='ACEITA'?'ATIVO':'RECUSADA',message:resposta==='ACEITA'?'Aceite registrado. Aguarde a confirmação da escala pela administração.':'Recusa registrada. O próximo motorista será chamado automaticamente.'};
  } finally {lock.releaseLock();}
}

/** Confirmação administrativa posterior ao aceite do motorista. */
function confirmarAceiteOfertaAdminFullTime(token, ofertaId) {
  const session=obterSessao_(token);exigirAdmin_(session);
  ofertaId=texto_(ofertaId,120);
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
    const idx=rows.findIndex((r,i)=>i>0&&String(r[map.ID]||'')===ofertaId);
    if(idx<1)throw new Error('Oferta não encontrada.');
    const r=rows[idx],status=String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase();
    if(status!=='ACEITA')throw new Error('Somente ofertas aceitas pelo motorista podem ser confirmadas.');
    const expires=r[map.EXPIRA_EM] instanceof Date?r[map.EXPIRA_EM]:new Date(r[map.EXPIRA_EM]);
    if(!isFinite(expires.getTime())||expires.getTime()<Date.now())throw new Error('O prazo da oferta expirou. Não é possível ativar esta escala.');
    const opSh=getSheet_('OPERACOES'),opGrid=opSh.getDataRange().getValues(),oh=opGrid[0].map(v=>String(v||'').trim().toUpperCase()),oi={};
    oh.forEach((h,i)=>{if(h&&oi[h]===undefined)oi[h]=i;});
    const op=opGrid.slice(1).find(x=>String(x[oi.ID]||'')===String(r[map.OPERACAO_ID]));
    if(!op||!['ABERTA','EM_ANDAMENTO'].includes(String(op[oi.STATUS]||'').toUpperCase()))throw new Error('A operação não está aberta para ativação.');
    const all=rows.slice(1);
    const conflict=all.some((x,i)=>i!==idx-1&&['OFERTADA','ACEITA','ATIVO','SAIU','EM_VIAGEM'].includes(String(x[map.STATUS_PARTICIPACAO]||'').toUpperCase())&&
      (String(x[map.CONJUNTO_ID]||'')===String(r[map.CONJUNTO_ID]||'')||String(x[map.MOTORISTA_ID]||'')===String(r[map.MOTORISTA_ID]||'')));
    if(conflict)throw new Error('O motorista ou conjunto já possui outra oferta ou escala em andamento.');
    const now=new Date();
    sh.getRange(idx+1,map.STATUS_PARTICIPACAO+1).setValue('ATIVO');
    if(map.INICIO_EM!==undefined)sh.getRange(idx+1,map.INICIO_EM+1).setValue(now);
    if(map.REGISTRADO_POR!==undefined)sh.getRange(idx+1,map.REGISTRADO_POR+1).setValue(session.email||session.login);
    FT_CONV_appendEvent_({tipo:'ESCALA_CONFIRMADA',operacaoId:r[map.OPERACAO_ID],motoristaId:r[map.MOTORISTA_ID],
      conjuntoId:r[map.CONJUNTO_ID],anterior:'ACEITA',nova:'ATIVO',motivo:'Aceite do motorista confirmado pela administração.',
      autor:session.email||session.login,ofertaId});
    auditar_(session,'CONFIRMAR_ESCALA','OPERACAO',String(r[map.OPERACAO_ID]),ofertaId+' ativada após aceite.');
    return {ok:true,message:'Escala confirmada. O conjunto está ativo na operação.'};
  } finally {lock.releaseLock();}
}


function listarOfertasAceitasAdminFullTime(token) {
  const session=obterSessao_(token);exigirAdmin_(session);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),map=FT_MOTORISTA_headerMap_(sh),rows=sh.getDataRange().getValues();
  const ops=getSheet_('OPERACOES'),omap=FT_MOTORISTA_headerMap_(ops),orows=ops.getDataRange().getValues(),byId={};
  orows.slice(1).forEach(r=>byId[String(r[omap.ID]||'')]={nome:String(r[omap.NOME_OPERACAO]||''),origem:String(r[omap.ORIGEM]||''),destino:String(r[omap.DESTINO]||'')});
  const drivers=FT_CENTRO_rows_('MOTORISTAS'),driverNames={};
  drivers.forEach(d=>driverNames[String(d.ID)]=String(d.NOME_COMPLETO||''));
  return rows.slice(1).filter(r=>['ACEITA','ATIVO'].includes(String(r[map.STATUS_PARTICIPACAO]||'').toUpperCase())).map(r=>{
    const op=byId[String(r[map.OPERACAO_ID]||'')]||{};
    return {id:String(r[map.ID]||''),motorista:driverNames[String(r[map.MOTORISTA_ID]||'')]||String(r[map.MOTORISTA_ID]||''),operacao:op.nome||String(r[map.OPERACAO_ID]||''),origem:op.origem||'',destino:op.destino||'',conjuntoId:String(r[map.CONJUNTO_ID]||''),aceitaEm:r[map.RESPONDIDA_EM]||''};
  });
}

/**
 * Diagnóstico sem escrita: compara as ofertas efetivas dos motoristas fictícios
 * 023, 024, 025 e 039 com o estado persistido da fila automática.
 * Execute pelo editor do Apps Script. Não cria, cancela ou altera ofertas.
 */
function FT_DIAGNOSTICAR_DIVERGENCIA_CONVOCACOES_20261113(){
  const ids=['023','024','025','039'].map(n=>'FT-TESTE-20261111-MOT-'+n);
  const sh=getSheet_('PARTICIPACAO_OPERACOES'),m=FT_MOTORISTA_headerMap_(sh);
  const required=['ID','OPERACAO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','CONJUNTO_ID'];
  required.forEach(k=>{if(m[k]===undefined)throw new Error('Cabeçalho ausente: '+k);});
  const rows=sh.getDataRange().getValues().slice(1);
  const details=ids.map(id=>{
    const own=rows.filter(r=>String(r[m.MOTORISTA_ID]||'').trim()===id);
    const statuses={};
    own.forEach(r=>{const st=String(r[m.STATUS_PARTICIPACAO]||'').trim().toUpperCase();statuses[st]=(statuses[st]||0)+1;});
    return {motoristaId:id,participacoes:own.length,statuses,ultimas:own.slice(-5).reverse().map(r=>({
      ofertaId:String(r[m.ID]||''),operacaoId:String(r[m.OPERACAO_ID]||''),
      conjuntoId:String(r[m.CONJUNTO_ID]||''),status:String(r[m.STATUS_PARTICIPACAO]||''),
      origem:m.ORIGEM_OFERTA===undefined?'':String(r[m.ORIGEM_OFERTA]||''),
      expiraEm:m.EXPIRA_EM===undefined?'':String(r[m.EXPIRA_EM]||'')
    }))};
  });
  const queues=typeof FT_AUTO_READ_==='function'?FT_AUTO_READ_():{};
  const queueSummary=Object.keys(queues).map(opId=>({
    operacaoId:opId,status:queues[opId].status,cursor:queues[opId].cursor,
    vagas:queues[opId].vagas,pendentes:queues[opId].pendentes||[],
    aceitas:queues[opId].aceitas
  }));
  const result={modo:'SOMENTE_LEITURA',totalParticipacoes:rows.length,motoristas:details,filasAutomaticas:queueSummary};
  Logger.log('FULL TIME — DIVERGENCIA CONVOCACOES: '+JSON.stringify(result));
  return result;
}
