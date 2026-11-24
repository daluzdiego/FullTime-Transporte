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
  MODEL: 'gemini-3.5-flash-lite',
  FALLBACK_MODELS: [],
  KEY_PROPERTY: 'FT_GEMINI_API_KEY',
  MAX_TEXT: 30000,
  MAX_RETRIES: 1,
  REQUEST_TIMEOUT_SECONDS: 20,
  TOTAL_BUDGET_MS: 90000
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
/** Confere se o volume atribuído a um destino está sustentado por trecho literal da mensagem. */
function ftSolVerifyDestinationVolumeEvidence_(original, destination) {
  destination = destination || {};
  var quote = ftSolText_(destination.evidenciaVolume, 700);
  var amount = ftSolNumber_(destination.volume);
  var numericTokens = quote.split(/[^0-9.,]+/).filter(Boolean);
  var amountFound = amount > 0 && numericTokens.some(function(token) {
    return Math.abs(ftSolNumber_(token) - amount) < 0.000001;
  });
  var lowerQuote = quote.toLowerCase();
  var identityFound = [destination.cliente, destination.local, destination.cidadeUf].some(function(value) {
    value = String(value || '').trim().toLowerCase();
    return value.length >= 3 && lowerQuote.indexOf(value) >= 0;
  });
  return {
    valid: !!quote && original.indexOf(quote) >= 0 && amountFound && identityFound,
    quote: quote,
    reason: !quote ? 'Trecho comprobatório ausente.' :
      original.indexOf(quote) < 0 ? 'Trecho não aparece literalmente na mensagem original.' :
      !identityFound ? 'Trecho não vincula o volume ao destino.' :
      !amountFound ? 'Trecho não contém o volume informado.' : ''
  };
}

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
    '- Em operações ligadas a navio, não confunda o volume total da carga do navio com o volume contratado pela Full Time. O volume da operação deve ser somente a quantidade que a Full Time efetivamente transportará, conforme informado; se não estiver claro, deixe pendente e pergunte. Nunca deduza que toda a carga do navio pertence à operação.',
    '- Pesos de balança podem variar. Preserve o peso real informado, não exija igualdade exata com estimativas e não recomende bloquear viagem por divergência de pesagem. Sinalize diferenças para conferência humana.',
    '- Uma mesma operação pode ter vários destinos de entrega. Extraia cada empresa/local e seu volume em dados.destinos; não crie uma operação separada por empresa.',
    '- O volume de cada destino só pode ser preenchido se houver um trecho literal da mensagem que mencione aquele destino e aquele número. Copie esse trecho em evidenciaVolume. Se não houver prova literal, volume deve ser string vazia; nunca calcule nem deduza o saldo para preencher destino.',
    '- O volume dos destinos somados não pode exceder o volume total. Se a soma for menor, calcule apenas o saldoNaoDistribuido e gere pergunta; não atribua esse saldo a nenhum destino.',
    '- Se houver somente um destino, retorne uma única entrada em dados.destinos. Se não houver destino, retorne [].',
    '- Origem precisa ser identificável. "Porto" sem terminal/cidade pode exigir confirmação; cada destino precisa de empresa, local e volume quando informado.',
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
    '  "destinos": [{"cliente": string, "local": string, "cidadeUf": string, "volume": string, "evidenciaVolume": string, "dataPrevista": string, "observacoes": string}],',
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
  data.destinos = Array.isArray(result.dados.destinos) ? result.dados.destinos.slice(0,50).map(function (x) { x=x||{}; return {cliente:ftSolText_(x.cliente||x.empresa,160),local:ftSolText_(x.local||x.destino||x.endereco,220),cidadeUf:ftSolText_(x.cidadeUf||x.cidade,120),volume:ftSolText_(x.volume||x.volumePrevisto,40),evidenciaVolume:ftSolText_(x.evidenciaVolume,700),dataPrevista:ftSolText_(x.dataPrevista,10),observacoes:ftSolText_(x.observacoes,500)}; }) : [];

  // Volume só é aceito quando existe evidência literal que o vincule ao destino.
  data.destinos.forEach(function(destination, index) {
    if (!destination.volume) return;
    var evidence = ftSolVerifyDestinationVolumeEvidence_(original, destination);
    if (!evidence.valid) {
      destination.volume = '';
      var pendingEvidence = 'Volume do destino ' + (index + 1) + ' não comprovado na mensagem original';
      if (!result.camposPendentes.some(function(x) { return String(x).indexOf('Volume do destino ' + (index + 1)) === 0; })) result.camposPendentes.push(pendingEvidence);
    }
  });
  var pending = result.camposPendentes
    .map(function (value) { return ftSolText_(value, 250); })
    .filter(Boolean);

  // Regras determinísticas do sistema prevalecem sobre a classificação da IA.
  ftSolComputeMissingFields_(data).forEach(function (missing) {
    if (pending.indexOf(missing) < 0) pending.push(missing);
  });

  var totalDeclared = ftSolNumber_(data.volume);
  var distributed = data.destinos.reduce(function(sum, destination) { return sum + ftSolNumber_(destination.volume); }, 0);
  data.saldoNaoDistribuido = totalDeclared > 0 ? Math.max(0, totalDeclared - distributed) : 0;
  if (data.destinos.length && data.saldoNaoDistribuido > 0.000001) {
    var residualQuestion = 'Há ' + data.saldoNaoDistribuido + ' toneladas sem destino confirmado. Qual destino receberá esse saldo, ou ele deve permanecer sem distribuição?';
    if (!result.camposPendentes.some(function(x) { return /saldo|distribui/i.test(String(x)); })) result.camposPendentes.push('Confirmar a destinação do saldo não distribuído (' + data.saldoNaoDistribuido + ' t)');
    if (!result.perguntas.some(function(x) { return /saldo|distribui/i.test(String(x)); })) result.perguntas.push(residualQuestion);
  }
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
  var models = [FT_SOL_AI.MODEL].concat(FT_SOL_AI.FALLBACK_MODELS || []);
  var result = {
    ok: false,
    chaveConfigurada: true,
    modeloPrincipal: FT_SOL_AI.MODEL,
    modelosAlternativos: FT_SOL_AI.FALLBACK_MODELS || [],
    etapas: {},
    observacao: 'Teste isolado; nenhuma solicitação operacional foi lida ou alterada.'
  };

  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    var entry = result.etapas[model] = { autenticacao: null, geracao: null };
    try {
      var modelResponse = UrlFetchApp.fetch(base + encodeURIComponent(model), {
        method: 'get',
        headers: headers,
        muteHttpExceptions: true,
          timeoutSeconds: 12
      });
      var modelCode = modelResponse.getResponseCode();
      entry.autenticacao = { http: modelCode, ok: modelCode >= 200 && modelCode < 300 };
      if (modelCode < 200 || modelCode >= 300) {
        entry.autenticacao.detalhe = ftGeminiErroSeguro_(modelResponse.getContentText());
        continue;
      }

      var generation = UrlFetchApp.fetch(
        base + encodeURIComponent(model) + ':generateContent',
        {
          method: 'post',
          contentType: 'application/json',
          headers: headers,
          muteHttpExceptions: true,
          timeoutSeconds: 12,
          payload: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Responda somente: TESTE_OK' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 20 }
          })
        }
      );

      var code = generation.getResponseCode();
      var body = generation.getContentText();
      entry.geracao = { http: code, ok: code >= 200 && code < 300 };
      if (code >= 200 && code < 300) {
        var parsed = JSON.parse(body);
        var text = parsed && parsed.candidates && parsed.candidates[0] &&
          parsed.candidates[0].content && parsed.candidates[0].content.parts ?
          parsed.candidates[0].content.parts.map(function (part) {
            return part.text || '';
          }).join('') : '';
        entry.geracao.respostaRecebida = !!text;
        entry.geracao.resposta = String(text).slice(0, 100);
        if (text) {
          result.ok = true;
          result.modeloDisponivel = model;
          result.mensagem = model === FT_SOL_AI.MODEL ?
            'Modelo principal autenticado e gerando texto.' :
            'Modelo alternativo autenticado e gerando texto. O principal está indisponível neste momento.';
          break;
        }
      } else {
        entry.geracao.detalhe = ftGeminiErroSeguro_(body);
      }
    } catch (error) {
      entry.erro = String(error && error.message || error).slice(0, 1000);
    }
  }

  if (!result.ok) {
    result.mensagem = 'Nenhum dos modelos testados conseguiu gerar texto. A chave foi reconhecida; consulte os HTTPs registrados por modelo.';
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
  var startedAt = Date.now();
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!key || !String(key).trim()) throw new Error('FT_GEMINI_API_KEY não está configurada.');
  var base = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var headers = { 'x-goog-api-key': String(key).trim() };
  var models = [FT_SOL_AI.MODEL].concat(FT_SOL_AI.FALLBACK_MODELS || []);
  var failures = [];
  for (var modelIndex = 0; modelIndex < models.length; modelIndex++) {
    var elapsed = Date.now() - startedAt;
    if (elapsed >= FT_SOL_AI.TOTAL_BUDGET_MS) { failures.push('ORÇAMENTO_TOTAL_EXCEDIDO após ' + elapsed + 'ms'); break; }
    var model = models[modelIndex];
    var endpoint = base + encodeURIComponent(model) + ':generateContent';
    var remaining = FT_SOL_AI.TOTAL_BUDGET_MS - elapsed;
    var timeoutSeconds = Math.max(1, Math.min(FT_SOL_AI.REQUEST_TIMEOUT_SECONDS, Math.floor(remaining / 1000)));
    var options = {
      method: 'post', contentType: 'application/json', headers: headers,
      muteHttpExceptions: true, timeoutSeconds: timeoutSeconds,
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    };
    var attemptStarted = Date.now();
    console.log('[FT_IA] INICIO modelo=' + model + ' timeout=' + timeoutSeconds + 's');
    try {
      var response = UrlFetchApp.fetch(endpoint, options);
      var code = response.getResponseCode(), body = response.getContentText();
      console.log('[FT_IA] RESPOSTA modelo=' + model + ' http=' + code + ' duracaoMs=' + (Date.now() - attemptStarted));
      if (code >= 200 && code < 300) {
        var envelope;
        try { envelope = JSON.parse(body); } catch (error) { throw new Error('Gemini (' + model + ') retornou corpo JSON inválido.'); }
        var textOut = envelope && envelope.candidates && envelope.candidates[0] &&
          envelope.candidates[0].content && envelope.candidates[0].content.parts ?
          envelope.candidates[0].content.parts.map(function (part) { return part.text || ''; }).join('') : '';
        if (textOut) {
          console.log('[FT_IA] SUCESSO modelo=' + model + ' totalMs=' + (Date.now() - startedAt));
          return { text: textOut, provider: 'Google Gemini', model: model,
            fallback: model !== FT_SOL_AI.MODEL, durationMs: Date.now() - startedAt };
        }
        var reason = envelope && envelope.candidates && envelope.candidates[0] && envelope.candidates[0].finishReason;
        failures.push(model + ' HTTP ' + code + ': resposta sem texto' + (reason ? ' (' + reason + ')' : ''));
      } else {
        var detail = ftGeminiErroSeguro_(body);
        failures.push(model + ' HTTP ' + code + ': ' + detail);
        console.warn('[FT_IA] FALHA modelo=' + model + ' http=' + code + ' detalhe=' + detail.slice(0, 500));
        if ([400, 401, 402, 403].indexOf(code) >= 0) break;
      }
    } catch (error) {
      var message = String(error && error.message || error).slice(0, 1000);
      failures.push(model + ' ERRO: ' + message);
      console.warn('[FT_IA] EXCECAO modelo=' + model + ' detalhe=' + message);
    }
  }
  var total = Date.now() - startedAt;
  console.error('[FT_IA] FALHA_FINAL totalMs=' + total + ' detalhes=' + failures.join(' | '));
  throw new Error('Não foi possível concluir a análise dentro do limite de segurança (' +
    Math.round(total / 1000) + 's). ' + failures.join(' | '));
}
