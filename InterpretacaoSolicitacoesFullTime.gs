/**
 * MOTOR DE INTERPRETAÇÃO DE SOLICITAÇÕES — FULLTIME
 * Usa Gemini API via UrlFetchApp. Não cria OPERACOES nem CARGAS.
 * Configuração: Script Properties > FT_GEMINI_API_KEY.
 */
var FT_SOL_AI = {
  MODEL: 'gemini-3.8-flash',
  KEY_PROPERTY: 'FT_GEMINI_API_KEY',
  MAX_TEXT: 30000
};

function analisarSolicitacaoIAFullTime(token, id) {
  var session = obterSessao_(token); exigirAdmin_(session);
  id = ftSolText_(id, 180);
  if (!id) throw new Error('Informe o identificador da solicitação.');

  var apiKey = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!apiKey) throw new Error('A chave da IA ainda não foi configurada. Cadastre FT_GEMINI_API_KEY nas Propriedades do script.');

  var sh = ftSolSheet_(), c = ftSolCols_(sh), last = sh.getLastRow();
  if (last < 2) throw new Error('Não existem solicitações para analisar.');
  var ids = sh.getRange(2, c.ID, last - 1, 1).getDisplayValues(), row = -1;
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) { row = i + 2; break; }
  if (row < 0) throw new Error('Solicitação não encontrada.');

  var original = String(sh.getRange(row, c.TEXTO_ORIGINAL).getValue() || '').slice(0, FT_SOL_AI.MAX_TEXT);
  if (!original.trim()) throw new Error('A solicitação não possui mensagem original.');

  var prompt = [
    'Você é o analista operacional de uma transportadora brasileira. Analise a solicitação abaixo para preparar um transporte rodoviário.',
    'Responda SOMENTE JSON válido, sem markdown, com as propriedades exatas descritas.',
    'Regras obrigatórias:',
    '- Não invente nem complete dados ausentes. Use string vazia quando não houver informação.',
    '- Preserve números, unidades, nomes e locais como foram informados.',
    '- Não transforme "amanhã" em uma data sem uma referência de data confiável. Registre a expressão literal em dataColetaTexto e sinalize a data absoluta como pendente.',
    '- Diferencie volume/peso total de quantidade de viagens. Nunca presuma que 4500 toneladas sejam por caminhão.',
    '- Origem e destino precisam ser locais identificáveis. "Porto" ou "unidade" sem endereço/localidade específica podem exigir confirmação.',
    '- Identifique ambiguidades, contradições e dados que precisam ser confirmados.',
    '- Faça perguntas objetivas, uma por lacuna relevante. Não pergunte novamente o que já está claro.',
    '- Não declare transporte aprovado ou confirmado.',
    'Formato JSON:',
    '{',
    ' "resumo": string,',
    ' "dados": {',
    '  "cliente": string, "contato": string, "produto": string, "tipoCarga": string,',
    '  "volume": string, "unidadeVolume": string, "volumePorViagem": string,',
    '  "origem": string, "origemDetalhada": string, "destino": string, "destinoDetalhado": string,',
    '  "dataColetaTexto": string, "dataColeta": string, "horarioColeta": string,',
    '  "dataEntregaTexto": string, "dataEntrega": string, "horarioEntrega": string,',
    '  "tipoOperacao": string, "veiculoSolicitado": string, "frequencia": string,',
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

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(FT_SOL_AI.MODEL) + ':generateContent';
  var requestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    })
  };

  // 503 (sobrecarga) e 429 (limite temporário): repetir com espera exponencial.
  var response, http, body;
  var maxTentativas = 4;
  for (var tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    response = UrlFetchApp.fetch(endpoint, requestOptions);
    http = response.getResponseCode();
    body = response.getContentText();
    if ((http !== 503 && http !== 429 && http !== 500 && http !== 502) || tentativa === maxTentativas) break;
    var esperaMs = Math.pow(2, tentativa) * 1000;
    console.warn('Gemini HTTP ' + http + '. Nova tentativa ' + (tentativa + 1) +
      '/' + maxTentativas + ' em ' + esperaMs + ' ms.');
    Utilities.sleep(esperaMs);
  }
  if (http < 200 || http >= 300) {
    console.error('Gemini HTTP ' + http + ': ' + body.slice(0, 1500));
    var detalhe = '';
    try { var erroApi = JSON.parse(body); detalhe = erroApi.error && erroApi.error.message ? String(erroApi.error.message) : ''; } catch (e) {}
    throw new Error('Gemini HTTP ' + http + (detalhe ? ': ' + detalhe : '. Verifique a chave, a cota e o modelo configurado.'));
  }

  var envelope;
  try { envelope = JSON.parse(body); } catch (e) { throw new Error('Resposta inválida recebida do serviço de IA.'); }
  var raw = envelope && envelope.candidates && envelope.candidates[0] &&
    envelope.candidates[0].content && envelope.candidates[0].content.parts &&
    envelope.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
  if (!raw) throw new Error('A IA não retornou conteúdo analisável.');
  var result;
  try { result = JSON.parse(raw.replace(/^\s*```(?:json)?/i,'').replace(/```\s*$/,'')); }
  catch (e) { console.error('JSON IA inválido: ' + raw.slice(0,2000)); throw new Error('A IA respondeu em formato inesperado. Tente novamente.'); }

  if (!result.dados || typeof result.dados !== 'object' ||
      !Array.isArray(result.camposPendentes) || !Array.isArray(result.perguntas) ||
      !Array.isArray(result.ambiguidades)) {
    throw new Error('A análise da IA não contém todos os campos estruturados esperados.');
  }

  var pending = result.camposPendentes.map(function(x){ return ftSolText_(x,100); }).filter(Boolean);
  var questions = result.perguntas.map(function(x){ return ftSolText_(x,500); }).filter(Boolean);
  var analysis = {
    resumo: ftSolText_(result.resumo,1500),
    dados: result.dados,
    ambiguidades: result.ambiguidades.map(function(x){return ftSolText_(x,500);}).filter(Boolean),
    prontoParaRevisao: result.prontoParaRevisao === true,
    analisadoEm: new Date().toISOString(),
    modelo: FT_SOL_AI.MODEL
  };

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    // Reconfere o ID sob bloqueio antes de persistir a análise.
    var freshLast = sh.getLastRow(), freshIds = freshLast > 1 ? sh.getRange(2,c.ID,freshLast-1,1).getDisplayValues() : [];
    var target = -1;
    for (var j=0;j<freshIds.length;j++) if (freshIds[j][0] === id) { target=j+2; break; }
    if (target < 0) throw new Error('A solicitação deixou de existir durante a análise.');

    sh.getRange(target,c.DADOS_EXTRAIDOS_JSON).setValue(JSON.stringify(analysis));
    sh.getRange(target,c.CAMPOS_PENDENTES_JSON).setValue(JSON.stringify(pending));
    sh.getRange(target,c.PERGUNTAS_IA).setValue(questions.join('\n'));
    sh.getRange(target,c.STATUS_ENTRADA).setValue(pending.length ? 'EM_COLETA' : 'AGUARDANDO_APROVACAO');
    sh.getRange(target,c.ATUALIZADO_EM).setValue(new Date());
    var history = [];
    try { history = JSON.parse(sh.getRange(target,c.HISTORICO_JSON).getValue() || '[]'); } catch(e) {}
    history.push(ftSolEvent_('ANALISE_IA_CONCLUIDA',session.login,
      'Modelo '+FT_SOL_AI.MODEL+'; '+pending.length+' campo(s) pendente(s); '+questions.length+' pergunta(s).'));
    sh.getRange(target,c.HISTORICO_JSON).setValue(JSON.stringify(history));
  } finally { lock.releaseLock(); }

  return {
    ok:true, id:id, status:pending.length?'EM_COLETA':'AGUARDANDO_APROVACAO',
    analise:analysis, camposPendentes:pending, perguntas:questions
  };
}

/** Diagnóstico seguro: informa se a chave está presente, sem revelar seu conteúdo. */
function diagnosticarConfiguracaoIAFullTime(token) {
  var session = obterSessao_(token); exigirAdmin_(session);
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  return {ok:true, provedor:'Google Gemini', modelo:FT_SOL_AI.MODEL, chaveConfigurada:!!key};
}


/**
 * TESTE CONTROLADO DE CONEXÃO GEMINI.
 * Executar manualmente pelo editor do Apps Script, como proprietário.
 * Não lê solicitações, não grava planilhas e nunca registra a chave nos logs.
 */
function testarConexaoGeminiFullTime() {
  var key = PropertiesService.getScriptProperties().getProperty(FT_SOL_AI.KEY_PROPERTY);
  if (!key || !String(key).trim()) {
    var semChave = { ok:false, etapa:'CONFIGURACAO', mensagem:'Propriedade FT_GEMINI_API_KEY ausente ou vazia.' };
    console.log(JSON.stringify(semChave));
    return semChave;
  }

  var base = 'https://generativelanguage.googleapis.com/v1beta/models/';
  var headers = { 'x-goog-api-key': String(key).trim() };
  var resultado = {
    ok:false,
    chaveConfigurada:true,
    modelo:FT_SOL_AI.MODEL,
    etapas:{},
    observacao:'Teste isolado; nenhuma solicitação operacional foi lida ou alterada.'
  };

  // Etapa 1: confirma autenticação e acesso aos metadados do modelo.
  var meta;
  try {
    meta = UrlFetchApp.fetch(base + encodeURIComponent(FT_SOL_AI.MODEL), {
      method:'get', headers:headers, muteHttpExceptions:true
    });
    var metaCode = meta.getResponseCode();
    resultado.etapas.autenticacaoModelo = {
      http:metaCode,
      ok:metaCode >= 200 && metaCode < 300
    };
    if (metaCode < 200 || metaCode >= 300) {
      resultado.etapas.autenticacaoModelo.detalhe = ftGeminiErroSeguro_(meta.getContentText());
      resultado.mensagem = 'Falha ao autenticar ou consultar o modelo. Veja etapas.autenticacaoModelo.detalhe.';
      console.log(JSON.stringify(resultado));
      return resultado;
    }
  } catch (e) {
    resultado.etapas.autenticacaoModelo = {ok:false, mensagem:String(e.message || e)};
    resultado.mensagem = 'Falha de rede na consulta do modelo.';
    console.log(JSON.stringify(resultado));
    return resultado;
  }

  // Etapa 2: geração mínima, sem dados de clientes ou operações.
  try {
    var geracao = UrlFetchApp.fetch(base + encodeURIComponent(FT_SOL_AI.MODEL) + ':generateContent', {
      method:'post',
      contentType:'application/json',
      headers:headers,
      muteHttpExceptions:true,
      payload:JSON.stringify({
        contents:[{role:'user',parts:[{text:'Responda somente: TESTE_OK'}]}],
        generationConfig:{temperature:0,maxOutputTokens:20}
      })
    });
    var code = geracao.getResponseCode();
    var body = geracao.getContentText();
    resultado.etapas.geracao = {http:code,ok:code >= 200 && code < 300};
    if (code >= 200 && code < 300) {
      var parsed = JSON.parse(body);
      var txt = parsed && parsed.candidates && parsed.candidates[0] &&
        parsed.candidates[0].content && parsed.candidates[0].content.parts ?
        parsed.candidates[0].content.parts.map(function(p){return p.text || '';}).join('') : '';
      resultado.etapas.geracao.respostaRecebida = !!txt;
      resultado.etapas.geracao.resposta = String(txt).slice(0,100);
      resultado.ok = !!txt;
      resultado.mensagem = resultado.ok ?
        'Conexão, autenticação e geração de texto funcionando.' :
        'O modelo respondeu HTTP 2xx, mas não retornou texto. Verifique o corpo da resposta no log de execução.';
    } else {
      resultado.etapas.geracao.detalhe = ftGeminiErroSeguro_(body);
      resultado.mensagem = 'A chave conseguiu consultar o modelo, mas a geração falhou. Isso separa autenticação de cota/disponibilidade.';
    }
  } catch (e) {
    resultado.etapas.geracao = {ok:false,mensagem:String(e.message || e)};
    resultado.mensagem = 'Falha de rede ou leitura na etapa de geração.';
  }

  console.log(JSON.stringify(resultado));
  return resultado;
}

/** Extrai mensagem de erro da API sem registrar cabeçalhos ou credenciais. */
function ftGeminiErroSeguro_(body) {
  try {
    var obj = JSON.parse(String(body || ''));
    return obj && obj.error && obj.error.message ?
      String(obj.error.message).slice(0,1000) : String(body || '').slice(0,1000);
  } catch (e) {
    return String(body || '').slice(0,1000);
  }
}
