
function FT_AUDITAR_CONVOCACAO_SEM_ALTERAR() {
  const props = PropertiesService.getScriptProperties();

  const chaves = [
    'FT_AUTO_QUEUES_V1',
    'FT_AUTO_PROP_',
    'FT_AUTO_PROP_QUEUE_STORE_'
  ];

  const resultado = {};

  chaves.forEach(chave => {
    const valor = props.getProperty(chave);

    resultado[chave] = {
      existe: valor !== null,
      tamanho: valor ? valor.length : 0
    };
  });

  const gatilhos = ScriptApp.getProjectTriggers()
    .filter(t =>
      t.getHandlerFunction() ===
      'FT_processarFilasConvocacaoAutomatica'
    )
    .map(t => ({
      funcao: t.getHandlerFunction(),
      evento: String(t.getEventType())
    }));

  console.log(JSON.stringify({
    propriedades: resultado,
    gatilhos: gatilhos,
    quantidadeGatilhos: gatilhos.length
  }, null, 2));
}



function FT_AUDITAR_ESTADO_FILAS_V2() {
  const chave = 'FT_AUTO_QUEUES_V1';
  const bruto = PropertiesService
    .getScriptProperties()
    .getProperty(chave);

  if (!bruto) {
    const resultado = {
      sucesso: true,
      propriedadeExiste: false,
      filas: []
    };
    Logger.log(JSON.stringify(resultado, null, 2));
    return resultado;
  }

  let dados;
  try {
    dados = JSON.parse(bruto);
  } catch (e) {
    throw new Error(
      'A propriedade existe, mas não contém JSON válido: ' + e.message
    );
  }

  const filas = Object.entries(dados || {}).map(([operacaoId, q]) => ({
    operacaoId: operacaoId,
    idFila: q && q.id || '',
    status: q && q.status || 'SEM_STATUS',
    vagas: Number(q && q.vagas || 0),
    totalMotoristas: Array.isArray(q && q.lista) ? q.lista.length : 0,
    cursor: Number(q && q.cursor || 0),
    aceitas: Number(q && q.aceitas || 0),
    pendentes: Array.isArray(q && q.pendentes)
      ? q.pendentes.length : 0,
    filaRestante: Math.max(
      0,
      (Array.isArray(q && q.lista) ? q.lista.length : 0) -
      Number(q && q.cursor || 0)
    ),
    concluidaEm: q && q.concluidaEm || '',
    motivoConclusao: q && q.motivoConclusao || ''
  }));

  const resultado = {
    sucesso: true,
    modo: 'SOMENTE_LEITURA',
    tamanhoPropriedade: bruto.length,
    totalFilas: filas.length,
    emAndamento: filas.filter(f => f.status === 'EM_ANDAMENTO').length,
    concluidas: filas.filter(f => f.status === 'CONCLUIDA').length,
    outrosStatus: filas.filter(
      f => !['EM_ANDAMENTO', 'CONCLUIDA'].includes(f.status)
    ).length,
    filas: filas
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


function FT_AUDITAR_HISTORICO_FILAS_V3() {
  const ids = [
    'FT-TESTE-20261111-OPE-001',
    'FT-TESTE-20261111-OPE-002',
    'FT-TESTE-20261111-OPE-003'
  ];

  function mapear(sh) {
    const h = sh.getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0];
    const m = {};
    h.forEach((v, i) => {
      const k = String(v || '').trim().toUpperCase();
      if (k) m[k] = i;
    });
    return m;
  }

  function exigir(m, campos, guia) {
    const faltam = campos.filter(k => m[k] === undefined);
    if (faltam.length) {
      throw new Error(
        'Cabeçalhos ausentes em ' + guia + ': ' + faltam.join(', ')
      );
    }
  }

  const participacoes = getSheet_('PARTICIPACAO_OPERACOES');
  const pm = mapear(participacoes);
  exigir(pm, [
    'ID', 'OPERACAO_ID', 'MOTORISTA_ID',
    'CONJUNTO_ID', 'STATUS_PARTICIPACAO'
  ], 'PARTICIPACAO_OPERACOES');

  const dadosP = participacoes.getDataRange().getValues();
  const resumoP = {};

  ids.forEach(id => {
    resumoP[id] = {
      totalRegistros: 0,
      porStatus: {},
      porOrigem: {},
      motoristasDistintos: 0,
      ofertasAutomaticas: 0
    };
  });

  ids.forEach(id => {
    const motoristas = new Set();

    dadosP.slice(1).forEach(r => {
      if (String(r[pm.OPERACAO_ID] || '').trim() !== id) return;

      const s = resumoP[id];
      const status = String(r[pm.STATUS_PARTICIPACAO] || '')
        .trim().toUpperCase() || 'SEM_STATUS';
      const origem = pm.ORIGEM_OFERTA === undefined
        ? 'COLUNA_AUSENTE'
        : String(r[pm.ORIGEM_OFERTA] || '').trim() || 'SEM_ORIGEM';

      s.totalRegistros++;
      s.porStatus[status] = (s.porStatus[status] || 0) + 1;
      s.porOrigem[origem] = (s.porOrigem[origem] || 0) + 1;

      if (pm.MOTORISTA_ID !== undefined && r[pm.MOTORISTA_ID]) {
        motoristas.add(String(r[pm.MOTORISTA_ID]));
      }

      if (origem === 'FILA_AUTOMATICA') {
        s.ofertasAutomaticas++;
      }
    });

    resumoP[id].motoristasDistintos = motoristas.size;
  });

  const eventos = getSheet_('EVENTOS_ESCALA');
  const em = mapear(eventos);
  exigir(em, ['OPERACAO_ID', 'TIPO_EVENTO'], 'EVENTOS_ESCALA');

  const dadosE = eventos.getDataRange().getValues();
  const resumoE = {};

  ids.forEach(id => resumoE[id] = {
    totalEventos: 0,
    porTipo: {}
  });

  dadosE.slice(1).forEach(r => {
    const id = String(r[em.OPERACAO_ID] || '').trim();
    if (!resumoE[id]) return;

    const tipo = String(r[em.TIPO_EVENTO] || '')
      .trim().toUpperCase() || 'SEM_TIPO';

    resumoE[id].totalEventos++;
    resumoE[id].porTipo[tipo] =
      (resumoE[id].porTipo[tipo] || 0) + 1;
  });

  const resultado = {
    sucesso: true,
    modo: 'SOMENTE_LEITURA',
    executadoEm: new Date().toISOString(),
    participacoes: resumoP,
    eventos: resumoE
  };

  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}


function FT_AUDITAR_REPROGRAMACAO_V4() {
  const ids = [
    'FT-TESTE-20261111-OPE-001',
    'FT-TESTE-20261111-OPE-002',
    'FT-TESTE-20261111-OPE-003'
  ];

  const ops = getSheet_('OPERACOES');
  const parts = getSheet_('PARTICIPACAO_OPERACOES');

  const om = FT_AUTO_MAP_(ops);
  const pm = FT_AUTO_MAP_(parts);

  const requiredO = ['ID', 'DATA_OPERACAO', 'JANELA_INICIO', 'JANELA_FIM'];
  const requiredP = [
    'ID', 'OPERACAO_ID', 'MOTORISTA_ID', 'CONJUNTO_ID',
    'STATUS_PARTICIPACAO', 'CRIADO_EM', 'OFERTADA_EM',
    'EXPIRA_EM', 'DATA_OPERACAO_OFERTA',
    'HORARIO_OPERACAO_OFERTA', 'JANELA_FIM_OFERTA'
  ];

  requiredO.forEach(k => {
    if (om[k] === undefined) throw new Error('OPERACOES sem coluna ' + k);
  });
  requiredP.forEach(k => {
    if (pm[k] === undefined) throw new Error('PARTICIPACAO_OPERACOES sem coluna ' + k);
  });

  const opRows = ops.getDataRange().getValues();
  const pRows = parts.getDataRange().getValues();
  const resultado = [];

  ids.forEach(id => {
    const op = opRows.slice(1).find(r => String(r[om.ID]) === id);
    if (!op) {
      resultado.push({ operacaoId: id, erro: 'Operação não encontrada' });
      return;
    }

    const ofertas = pRows.slice(1)
      .filter(r => String(r[pm.OPERACAO_ID]) === id)
      .map(r => ({
        ofertaId: String(r[pm.ID] || ''),
        motoristaId: String(r[pm.MOTORISTA_ID] || ''),
        conjuntoId: String(r[pm.CONJUNTO_ID] || ''),
        status: String(r[pm.STATUS_PARTICIPACAO] || ''),
        criadoEm: r[pm.CRIADO_EM],
        ofertadaEm: r[pm.OFERTADA_EM],
        expiraEm: r[pm.EXPIRA_EM],
        dataOferta: r[pm.DATA_OPERACAO_OFERTA],
        horarioOferta: r[pm.HORARIO_OPERACAO_OFERTA],
        fimOferta: r[pm.JANELA_FIM_OFERTA]
      }));

    const versoesAgenda = {};
    ofertas.forEach(o => {
      const chave = [
        String(o.dataOferta || ''),
        String(o.horarioOferta || ''),
        String(o.fimOferta || '')
      ].join(' | ');
      versoesAgenda[chave] = (versoesAgenda[chave] || 0) + 1;
    });

    resultado.push({
      operacaoId: id,
      agendaAtual: {
        data: op[om.DATA_OPERACAO],
        inicio: op[om.JANELA_INICIO],
        fim: op[om.JANELA_FIM]
      },
      totalOfertas: ofertas.length,
      agendasRegistradasNasOfertas: versoesAgenda,
      amostraOfertas: ofertas.slice(0, 8)
    });
  });

  const relatorio = {
    sucesso: true,
    modo: 'SOMENTE_LEITURA',
    executadoEm: new Date().toISOString(),
    operacoes: resultado
  };

  Logger.log(JSON.stringify(relatorio, null, 2));
  return relatorio;
}
