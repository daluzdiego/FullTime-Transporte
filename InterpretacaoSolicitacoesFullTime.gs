/**
 * FULL TIME — MOTOR DE INTERPRETAÇÃO DE SOLICITAÇÕES
 *
 * Compatível com o contrato canônico de ENTRADA_OPERACOES_IA (18 colunas)
 * definido em SolicitaçõesFullTime.gs.
 *
 * Persistência:
 * - Mensagem original: MENSAGEM_BRUTA (nunca sobrescrita pela IA).
 * - Resultado, dados, pendências, perguntas e histórico: INTERPRETACAO_JSON.
 * - Situação: STATUS_INTERPRETACAO.
 *
 * A IA interpreta e prepara a revisão. Não aprova nem cria operação.
 * Configuração: Script Properties > FT_GEMINI_API_KEY.
 */
var FT_SOL_AI = {
  MODEL: 'gemini-3.8-flash',
  KEY_PROPERTY: 'FT_GEMINI_API_KEY',
  MAX_TEXT: 30000,
  MAX_RETRIES: 3
};

/**
 * Confere o contrato antes de qualquer leitura/escrita da solicitação.
 * ftSolCols_ retorna índices de coluna iniciados em 1.
 */
function ftSolAIRequireColumns_(columns, names) {
  var missing = names.filter(function (name) {
    return !columns[name] || columns[name] < 1;
  });
  if (missing.length) {
    throw new Error(
      'Contrato ENTRADA_OPERACOES_IA incompatível com o motor de IA. ' +
      'Cabeçalho(s) ausente(s): ' + missing.join(', ') +
      '. Esperado o contrato canônico de 18 colunas.'
    );
  }
}

/** Converte o JSON de metadados para um objeto consistente. */
function ftSolAIMetadata_(rowValues, columns) {
  var meta = ftSolMeta_(rowValues, columns);
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) meta = {};
  if (!meta.solicitacao || typeof meta.solicitacao !== 'object') meta.solicitacao = {};
  return meta;
}

/**
 * Interpreta uma solicitação já registrada.
 * Não altera MENSAGEM_BRUTA e não cria operação/carga.
 */
function analisarSolicitacaoIAFullTime(token, id) {
  var session = obterSessao_(token);
  exigirAdmin_(session);

  id = ftSolText_(id, 180);
  if (!id) throw new Error('Informe o identificador da solicitação.');

  var apiKey = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!apiKey || !String(apiKey).trim()) {
    throw new Error(
      'A chave da IA não está configurada. Cadastre FT_GEMINI_API_KEY nas Propriedades do script.'
    );
  }

  var sh = ftSolSheet_();
  var columns = ftSolCols_(sh);
  ftSolAIRequireColumns_(columns, [
    'ID', 'MENSAGEM_BRUTA', 'STATUS_INTERPRETACAO', 'INTERPRETACAO_JSON'
  ]);

  var last = sh.getLastRow();
  if (last < 2) throw new Error('Não existem solicitações para analisar.');

  var ids = sh.getRange(2, columns.ID, last - 1, 1).getDisplayValues();
  var row = -1;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) {
      row = i + 2;
      break;
    }
  }
  if (row < 0) throw new Error('Solicitação não encontrada.');

  var original = String(sh.getRange(row, columns.MENSAGEM_BRUTA).getValue() || '')
    .slice(0, FT_SOL_AI.MAX_TEXT);
  if (!original.trim()) throw new Error('A solicitação não possui mensagem original.');

  var prompt = [
    'Você é o analista operacional de uma transportadora brasileira. Analise a solicitação abaixo para preparar um transporte rodoviário.',
    'Responda SOMENTE JSON válido, sem markdown, com as propriedades exatas descritas.',
    'Regras obrigatórias:',
    '- Não invente nem complete dados ausentes. Use string vazia quando não houver informação.',
    '- Preserve números, unidades, nomes e locais como foram informados.',
    '- Não transforme "amanhã" em uma data sem uma referência de data confiável. Registre a expressão literal em dataColetaTexto e deixe dataColeta vazia.',
    '- Diferencie volume/peso total de quantidade de viagens. Nunca presuma que o peso informado seja por caminhão.',
    '- Origem e destino precisam ser locais identificáveis. "Porto" ou "unidade" sem endereço/localidade específica podem exigir confirmação.',
    '- Identifique ambiguidades, contradições e dados que precisam ser confirmados.',
    '- Faça perguntas objetivas, uma por lacuna relevante. Não pergunte novamente o que já está claro.',
    '- Não declare transporte aprovado ou confirmado.',
    'Formato JSON:',
    '{',
    ' "resumo": string,',
    ' "dados": {',
    '  "cliente": string, "contato": string, "produto": string, "tipoCarga": string,',
    '  "volume": string, "unidadeVolume": string, "volumePorViagem": string, "viagensPrevistas": string,',
    '  "origem": string, "origemDetalhada": string, "destino": string, "destinoDetalhado": string,',
    '  "dataColetaTexto": string, "dataColeta": string, "horarioColeta": string,',
    '  "dataEntregaTexto": string, "dataEntrega": string, "horarioEntrega": string,',
    '  "tipoOperacao": string, "categoria": string, "nomeOperacao": string, "veiculoSolicitado": string, "frequencia": string,',
    '  "restricoes": string, "observacoes": string',
    ' },',
    ' "camposPendentes": [string],',
    ' "ambiguidades": [string],',
    ' "perguntas": [string],',
    ' "prontoParaRevisao": boolean',
    '}',
    'Use nomes de campos em camposPendentes, por exemplo: "origemDetalhada", "destinoDetalhado", "dataColeta".',
    'MENSAGEM ORIGINAL:',
    original
  ].join('\n');

  var generated;
  try {
    generated = ftSolGenerateAIText_(prompt);
  } catch (apiError) {
    var failureMessage = String(apiError && apiError.message || apiError).slice(0, 1500);
    ftSolMarkWaitingAI_(sh, id, session.login || 'ADMIN', failureMessage);
    return {
      ok: false,
      aguardandoIA: true,
      id: id,
      status: 'AGUARDANDO_IA',
      mensagem: 'A solicitação foi preservada. O serviço de IA está indisponível no momento. Você pode tentar novamente mais tarde.',
      detalhe: failureMessage
    };
  }

  var raw = String(generated && generated.text || '').trim();
  if (!raw) throw new Error('A IA não retornou conteúdo analisável.');

  var result;
  try {
    result = JSON.parse(
      raw.replace(/^\s*\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`\s*$/, '')
    );
  } catch (parseError) {
    console.error('JSON IA inválido: ' + raw.slice(0, 1500));
    throw new Error('A IA respondeu em formato inesperado. A mensagem original foi preservada; tente novamente.');
  }

  if (!result.dados || typeof result.dados !== 'object' || Array.isArray(result.dados) ||
      !Array.isArray(result.camposPendentes) ||
      !Array.isArray(result.perguntas) ||
      !Array.isArray(result.ambiguidades)) {
    throw new Error('A análise da IA não contém todos os campos estruturados esperados.');
  }

  var allowed = [
    'cliente', 'contato', 'produto', 'tipoCarga', 'volume', 'unidadeVolume',
    'volumePorViagem', 'viagensPrevistas', 'origem', 'origemDetalhada',
    'destino', 'destinoDetalhado', 'dataColetaTexto', 'dataColeta',
    'horarioColeta', 'dataEntregaTexto', 'dataEntrega', 'horarioEntrega',
    'tipoOperacao', 'categoria', 'nomeOperacao', 'veiculoSolicitado',
    'frequencia', 'restricoes', 'observacoes'
  ];
  var data = {};
  allowed.forEach(function (key) {
    data[key] = ftSolText_(result.dados[key], 500);
  });

  var pending = result.camposPendentes
    .map(function (value) { return ftSolText_(value, 250); })
    .filter(Boolean);

  // Regras determinísticas do sistema prevalecem sobre a classificação da IA.
  ftSolComputeMissingFields_(data).forEach(function (missing) {
    if (pending.indexOf(missing) < 0) pending.push(missing);
  });

  var questions = result.perguntas
    .map(function (value) { return ftSolText_(value, 500); })
    .filter(Boolean);
  var ambiguities = result.ambiguidades
    .map(function (value) { return ftSolText_(value, 500); })
    .filter(Boolean);

  var analysis = {
    resumo: ftSolText_(result.resumo, 1500),
    dados: data,
    ambiguidades: ambiguities,
    prontoParaRevisao: pending.length === 0 && result.prontoParaRevisao === true,
    analisadoEm: new Date().toISOString(),
    modelo: generated.model || FT_SOL_AI.MODEL,
    provedor: generated.provider || 'Google Gemini'
  };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Revalida o registro sob bloqueio para impedir gravação em linha incorreta.
    var freshLast = sh.getLastRow();
    var freshIds = freshLast > 1 ?
      sh.getRange(2, columns.ID, freshLast - 1, 1).getDisplayValues() : [];
    var target = -1;
    for (var j = 0; j < freshIds.length; j++) {
      if (String(freshIds[j][0]) === id) {
        target = j + 2;
        break;
      }
    }
    if (target < 0) throw new Error('A solicitação deixou de existir durante a análise.');

    var values = sh.getRange(target, 1, 1, sh.getLastColumn()).getValues()[0];
    var meta = ftSolAIMetadata_(values, columns);
    var solicitation = meta.solicitacao;

    meta.dados = data;
    meta.analise = analysis;
    solicitation.camposPendentes = pending;
    solicitation.perguntas = questions.join('\n');
    solicitation.statusEntrada = pending.length ? 'EM_COLETA' : 'AGUARDANDO_APROVACAO';
    solicitation.atualizadoEm = new Date().toISOString();
    solicitation.erroIA = '';
    solicitation.historico = Array.isArray(solicitation.historico) ? solicitation.historico : [];
    solicitation.historico.push(ftSolEvent_(
      'ANALISE_IA_CONCLUIDA',
      session.login || 'ADMIN',
      'Provedor ' + analysis.provedor + ' / modelo ' + analysis.modelo +
      '; ' + pending.length + ' pendência(s); ' + questions.length + ' pergunta(s).'
    ));

    sh.getRange(target, columns.STATUS_INTERPRETACAO)
      .setValue(pending.length ? 'EM_COLETA' : 'AGUARDANDO_APROVACAO');
    sh.getRange(target, columns.INTERPRETACAO_JSON).setValue(JSON.stringify(meta));
  } finally {
    lock.releaseLock();
  }

  return {
    ok: true,
    id: id,
    status: pending.length ? 'EM_COLETA' : 'AGUARDANDO_APROVACAO',
    analise: analysis,
    dadosExtraidos: analysis,
    camposPendentes: pending,
    perguntas: questions,
    ambiguidades: ambiguities
  };
}

/** Diagnóstico seguro: nunca devolve a chave nem parte dela. */
function diagnosticarConfiguracaoIAFullTime(token) {
  var session = obterSessao_(token);
  exigirAdmin_(session);
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  return {
    ok: true,
    provedor: 'Google Gemini',
    modelo: FT_SOL_AI.MODEL,
    chaveConfigurada: !!(key && String(key).trim()),
    propriedade: FT_SOL_AI.KEY_PROPERTY,
    contingencia: 'REPROCESSAMENTO_MANUAL_SEM_CUSTO'
  };
}

/**
 * Teste isolado de conexão. Não lê solicitações nem grava planilhas.
 * Nunca registra a chave nos logs.
 */
function testarConexaoGeminiFullTime() {
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!key || !String(key).trim()) {
    var missing = {
      ok: false,
      etapa: 'CONFIGURACAO',
      mensagem: 'Propriedade FT_GEMINI_API_KEY ausente ou vazia.'
    };
    console.log(JSON.stringify(missing));
    return missing;
  }

  var base = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var headers = { 'x-goog-api-key': String(key).trim() };
  var result = {
    ok: false,
    chaveConfigurada: true,
    modelo: FT_SOL_AI.MODEL,
    etapas: {},
    observacao: 'Teste isolado; nenhuma solicitação operacional foi lida ou alterada.'
  };

  try {
    var modelResponse = UrlFetchApp.fetch(base + encodeURIComponent(FT_SOL_AI.MODEL), {
      method: 'get',
      headers: headers,
      muteHttpExceptions: true
    });
    var modelCode = modelResponse.getResponseCode();
    result.etapas.autenticacaoModelo = {
      http: modelCode,
      ok: modelCode >= 200 && modelCode < 300
    };
    if (modelCode < 200 || modelCode >= 300) {
      result.etapas.autenticacaoModelo.detalhe =
        ftGeminiErroSeguro_(modelResponse.getContentText());
      result.mensagem = 'Falha ao autenticar ou consultar o modelo.';
      console.log(JSON.stringify(result));
      return result;
    }
  } catch (error) {
    result.etapas.autenticacaoModelo = {
      ok: false,
      mensagem: String(error && error.message || error)
    };
    result.mensagem = 'Falha de rede na consulta do modelo.';
    console.log(JSON.stringify(result));
    return result;
  }

  try {
    var generation = UrlFetchApp.fetch(
      base + encodeURIComponent(FT_SOL_AI.MODEL) + ':generateContent',
      {
        method: 'post',
        contentType: 'application/json',
        headers: headers,
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Responda somente: TESTE_OK' }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 20
          }
        })
      }
    );

    var code = generation.getResponseCode();
    var body = generation.getContentText();
    result.etapas.geracao = { http: code, ok: code >= 200 && code < 300 };

    if (code >= 200 && code < 300) {
      var parsed = JSON.parse(body);
      var text = parsed && parsed.candidates && parsed.candidates[0] &&
        parsed.candidates[0].content && parsed.candidates[0].content.parts ?
        parsed.candidates[0].content.parts.map(function (part) {
          return part.text || '';
        }).join('') : '';
      result.etapas.geracao.respostaRecebida = !!text;
      result.etapas.geracao.resposta = String(text).slice(0, 100);
      result.ok = !!text;
      result.mensagem = result.ok ?
        'Conexão, autenticação e geração de texto funcionando.' :
        'O modelo respondeu HTTP 2xx, mas não retornou texto.';
    } else {
      result.etapas.geracao.detalhe = ftGeminiErroSeguro_(body);
      result.mensagem =
        'A chave autenticou, mas a geração falhou. Verifique cota, faturamento e disponibilidade.';
    }
  } catch (error) {
    result.etapas.geracao = {
      ok: false,
      mensagem: String(error && error.message || error)
    };
    result.mensagem = 'Falha de rede ou leitura na etapa de geração.';
  }

  console.log(JSON.stringify(result));
  return result;
}

/** Extrai mensagem de erro da API sem registrar cabeçalhos ou credenciais. */
function ftGeminiErroSeguro_(body) {
  try {
    var parsed = JSON.parse(String(body || ''));
    return parsed && parsed.error && parsed.error.message ?
      String(parsed.error.message).slice(0, 1000) :
      String(body || '').slice(0, 1000);
  } catch (error) {
    return String(body || '').slice(0, 1000);
  }
}

/**
 * Registra falha transitória sem descartar a mensagem original.
 * Mantém a solicitação pronta para nova tentativa manual.
 */
function ftSolMarkWaitingAI_(sh, id, login, message) {
  var columns = ftSolCols_(sh);
  ftSolAIRequireColumns_(columns, ['ID', 'STATUS_INTERPRETACAO', 'INTERPRETACAO_JSON']);

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var last = sh.getLastRow();
    var ids = last > 1 ?
      sh.getRange(2, columns.ID, last - 1, 1).getDisplayValues() : [];
    var row = -1;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) {
        row = i + 2;
        break;
      }
    }
    if (row < 0) throw new Error('Solicitação não encontrada ao registrar indisponibilidade da IA.');

    var values = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    var meta = ftSolAIMetadata_(values, columns);
    var solicitation = meta.solicitacao;
    var safeMessage = String(message || 'Serviço de IA indisponível').slice(0, 1500);

    solicitation.statusEntrada = 'AGUARDANDO_IA';
    solicitation.erroIA = safeMessage;
    solicitation.atualizadoEm = new Date().toISOString();
    solicitation.historico = Array.isArray(solicitation.historico) ? solicitation.historico : [];
    solicitation.historico.push(ftSolEvent_(
      'IA_INDISPONIVEL_AGUARDANDO_REPROCESSAMENTO',
      login || 'SISTEMA',
      safeMessage.slice(0, 500)
    ));

    sh.getRange(row, columns.STATUS_INTERPRETACAO).setValue('AGUARDANDO_IA');
    sh.getRange(row, columns.INTERPRETACAO_JSON).setValue(JSON.stringify(meta));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gemini como provedor único nesta fase.
 * Retentativas limitadas apenas para erros transitórios.
 */
function ftSolGenerateAIText_(prompt) {
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!key || !String(key).trim()) {
    throw new Error('FT_GEMINI_API_KEY não está configurada.');
  }

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(FT_SOL_AI.MODEL) + ':generateContent';
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': String(key).trim() },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  };

  var response;
  var code;
  var body;
  for (var attempt = 1; attempt <= FT_SOL_AI.MAX_RETRIES; attempt++) {
    response = UrlFetchApp.fetch(endpoint, options);
    code = response.getResponseCode();
    body = response.getContentText();
    if ([429, 500, 502, 503, 504].indexOf(code) < 0 ||
        attempt === FT_SOL_AI.MAX_RETRIES) {
      break;
    }
    Utilities.sleep(Math.pow(2, attempt) * 1000);
  }

  if (code < 200 || code >= 300) {
    throw new Error('Gemini HTTP ' + code + ': ' + ftGeminiErroSeguro_(body));
  }

  var envelope;
  try {
    envelope = JSON.parse(body);
  } catch (error) {
    throw new Error('Gemini retornou uma resposta HTTP válida, mas o corpo não é JSON válido.');
  }

  var textOut = envelope && envelope.candidates && envelope.candidates[0] &&
    envelope.candidates[0].content && envelope.candidates[0].content.parts ?
    envelope.candidates[0].content.parts.map(function (part) {
      return part.text || '';
    }).join('') : '';

  if (!textOut) {
    var blockReason = envelope && envelope.candidates && envelope.candidates[0] &&
      envelope.candidates[0].finishReason;
    throw new Error(
      'Gemini não retornou texto.' + (blockReason ? ' Motivo: ' + blockReason : '')
    );
  }

  return {
    text: textOut,
    provider: 'Google Gemini',
    model: FT_SOL_AI.MODEL
  };
}
