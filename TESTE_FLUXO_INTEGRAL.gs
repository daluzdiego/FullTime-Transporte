/**
 * FULL TIME — TESTE DE FLUXO INTEGRAL (READ-ONLY)
 *
 * Executar manualmente no Apps Script: executarTesteFluxoIntegralFullTime()
 * O teste NÃO cria, altera ou apaga dados. Lê a base operacional e os espelhos
 * sincronizados do Bruno, valida contratos de dados e funções determinísticas.
 *
 * Importante: "APROVADO" significa que a verificação executada passou.
 * O fluxo de escala automática só será considerado completo quando existir
 * um motor que grave ESCALAS de forma automática; esta suíte detecta essa lacuna.
 */

function executarTesteFluxoIntegralFullTime() {
  const inicio = new Date();
  const testes = [];
  const adicionar = (etapa, nome, ok, detalhe, severidade) => {
    testes.push({
      etapa: etapa,
      teste: nome,
      status: ok ? 'APROVADO' : (severidade || 'FALHA'),
      detalhe: String(detalhe || '')
    });
  };
  const executar = (etapa, nome, fn, severidade) => {
    try {
      const detalhe = fn();
      adicionar(etapa, nome, true, detalhe || 'Verificação concluída.', severidade);
    } catch (e) {
      adicionar(etapa, nome, false, e && e.message ? e.message : e, severidade);
    }
  };
  const exigir = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };
  const esperado = {
    CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'],
    OPERACOES: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE','NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA','VOLUME_TOTAL_TONELADAS','TOTAL_CARGAS_PREVISTAS','SALDO_TONELADAS','OBSERVACOES','CRIADO_POR','TIPO_OPERACAO'],
    PARTICIPACAO_OPERACOES: ['ID','CRIADO_EM','OPERACAO_ID','CONJUNTO_ID','MOTORISTA_ID','STATUS_PARTICIPACAO','INICIO_EM','SAIDA_EM','RETORNO_EM','TONELADAS_MOVIMENTADAS','VIAGENS_CONCLUIDAS','MOTIVO','REGISTRADO_POR'],
    MOVIMENTACOES_OPERACAO: ['ID','DATA_HORA','OPERACAO_ID','PARTICIPACAO_ID','CONJUNTO_ID','TONELADAS','VIAGEM_CONCLUIDA','OBSERVACOES','REGISTRADO_POR'],
    LOCAIS: ['ID','CRIADO_EM','STATUS','NOME_LOCAL','CLIENTE','TIPO_LOCAL','ENDERECO','CIDADE_UF','REGRAS_OBSERVACOES'],
    REGRAS_OPERACIONAIS: ['ID','CRIADO_EM','STATUS','LOCAL_ID','PESO_MIN_TONELADAS','PESO_MAX_TONELADAS','TIPO_CAVALO','TIPO_CARRETA','EXIGENCIAS','OBSERVACOES'],
    CARGAS: ['ID','CRIADO_EM','STATUS','DATA_OPERACAO','HORARIO_PREVISTO','CLIENTE','ORIGEM','DESTINO','PESO_TONELADAS','DESCRICAO','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','CRIADO_POR','TIPO_OPERACAO','TICKET_CARREGAMENTO_URL','TICKET_DESCARGA_URL','VALOR_FRETE','OPERACAO_ID'],
    ESCALAS: ['ID','CRIADO_EM','STATUS','CARGA_ID','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','MOTIVO_SELECAO','INICIO_PREVISTO','FIM_PREVISTO','OBSERVACOES','OPERACAO_ID'],
    HISTORICO_OPERACOES: ['ID','DATA_HORA','CARGA_ID','MOTORISTA_ID','ORIGEM','DESTINO','EVENTO','OBSERVACOES','REGISTRADO_POR'],
    TICKETS: ['ID','RECEBIDO_EM','WHATSAPP_MESSAGE_ID','TELEFONE_REMETENTE','MOTORISTA_ID','CARGA_ID','TIPO_TICKET','MEDIA_ID','DRIVE_FILE_ID','DRIVE_FILE_URL','NOME_ARQUIVO','MIME_TYPE','STATUS_LEITURA','DATA_HORA_EXTRAIDA','CONFIANCA_LEITURA','ERRO_VALIDACAO','RETENCAO_ATE','METADADOS_JSON'],
    DISPONIBILIDADE_DIARIA: ['ID','CRIADO_EM','DATA_OPERACAO','MOTORISTA_ID','STATUS_DISPONIBILIDADE','CONFIRMADO_EM','INDISPONIVEL_EM','MOTIVO','ATUALIZADO_POR'],
    FILA_MOTORISTAS: ['ID','DATA_ENTRADA','MOTORISTA_ID','CONJUNTO_ID','STATUS_FILA','ULTIMA_OFERTA_EM','ULTIMA_CARGA_CONCLUIDA_EM','VIAGENS_PERIODO','OBSERVACOES'],
    OFERTAS_CARGAS: ['ID','CRIADO_EM','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_FILA','STATUS_OFERTA','EXPIRA_EM','RESPONDIDO_EM','MOTIVO_RECUSA','CRIADO_POR','OPERACAO_ID'],
    EVENTOS_ESCALA: ['ID','DATA_HORA','TIPO_EVENTO','CARGA_ID','MOTORISTA_ID','CONJUNTO_ID','POSICAO_ANTERIOR','POSICAO_NOVA','MOTIVO','REGISTRADO_POR','OPERACAO_ID'],
    ENTRADA_OPERACOES_IA: ['ID','CRIADO_EM','CRIADO_POR','STATUS_ENTRADA','TEXTO_ORIGINAL','DADOS_EXTRAIDOS_JSON','CAMPOS_PENDENTES_JSON','PERGUNTAS_IA','ID_CARGA_GERADA','CONFIRMADO_EM','CONFIRMADO_POR','ERRO_PROCESSAMENTO','ID_OPERACAO_GERADA','IDS_CARGAS_GERADAS_JSON'],
    CONJUNTO_OVERRIDES: ['CONJUNTO_ID','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR','ATUALIZADO_EM']
  };

  let registry = null;
  executar('01 — CONEXÃO', 'Propriedade FT_REGISTRY_DATABASE_ID configurada', () => {
    const id = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
    exigir(!!id, 'FT_REGISTRY_DATABASE_ID não configurado.');
    registry = SpreadsheetApp.openById(id);
    return 'Planilha operacional acessível: ' + registry.getName();
  });

  executar('02 — ESTRUTURA', 'Todas as guias operacionais existem e têm cabeçalhos compatíveis', () => {
    exigir(!!registry, 'Sem conexão com a planilha operacional.');
    const erros = [];
    Object.keys(esperado).forEach(nome => {
      const sh = registry.getSheetByName(nome);
      if (!sh) { erros.push(nome + ': guia ausente'); return; }
      const atual = sh.getLastColumn()
        ? sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v => String(v || '').trim())
        : [];
      const faltantes = esperado[nome].filter((h,i) => atual[i] !== h);
      if (faltantes.length) erros.push(nome + ': cabeçalhos divergentes/faltantes (' + faltantes.join(', ') + ')');
    });
    exigir(!erros.length, erros.join(' | '));
    return Object.keys(esperado).length + ' guias verificadas; nenhuma escrita realizada.';
  });

  const espelhos = [
    ['MOTORISTAS','FT_CADASTRO_BRUNO_MOTORISTAS'],
    ['CAVALOS','FT_CADASTRO_BRUNO_CAVALOS'],
    ['CARRETAS','FT_CADASTRO_BRUNO_CARRETAS'],
    ['CONJUNTOS','FT_CADASTRO_BRUNO_CONJUNTOS']
  ];
  const dados = {};
  espelhos.forEach(([entidade, guia]) => {
    executar('03 — SINCRONIZAÇÃO BRUNO', 'Leitura do espelho ' + guia, () => {
      const rows = ftReadBrunoRows_(entidade);
      dados[entidade] = rows;
      return rows.length + ' registro(s) lido(s) por cabeçalho.';
    });
  });

  executar('04 — VÍNCULOS', 'Conjuntos têm motorista e cavalo vinculados', () => {
    exigir(dados.CONJUNTOS, 'Espelho de conjuntos não foi lido.');
    const semMotorista = dados.CONJUNTOS.filter(r => !String(r.MOTORISTA_ID || '').trim());
    const semCavalo = dados.CONJUNTOS.filter(r => !String(r.CAVALO_ID || '').trim());
    exigir(!semMotorista.length && !semCavalo.length,
      'Vínculos incompletos: ' + semMotorista.length + ' sem motorista; ' + semCavalo.length + ' sem cavalo.');
    return dados.CONJUNTOS.length + ' conjunto(s) com os dois vínculos essenciais preenchidos.';
  });

  executar('04 — VÍNCULOS', 'IDs de vínculos apontam para cadastros existentes', () => {
    exigir(dados.CONJUNTOS && dados.MOTORISTAS && dados.CAVALOS && dados.CARRETAS,
      'Não foi possível carregar todos os espelhos.');
    const idsMotoristas = new Set(dados.MOTORISTAS.map(r => String(r.ID)));
    const idsCavalos = new Set(dados.CAVALOS.map(r => String(r.ID)));
    const idsCarretas = new Set(dados.CARRETAS.map(r => String(r.ID)));
    const erros = [];
    dados.CONJUNTOS.forEach(c => {
      if (!idsMotoristas.has(String(c.MOTORISTA_ID))) erros.push(c.ID + ': motorista inexistente ' + c.MOTORISTA_ID);
      if (!idsCavalos.has(String(c.CAVALO_ID))) erros.push(c.ID + ': cavalo inexistente ' + c.CAVALO_ID);
      if (c.CARRETA_MEIO_ID && !idsCarretas.has(String(c.CARRETA_MEIO_ID))) erros.push(c.ID + ': carreta do meio inexistente');
      if (c.CARRETA_FINAL_ID && !idsCarretas.has(String(c.CARRETA_FINAL_ID))) erros.push(c.ID + ': carreta final inexistente');
    });
    exigir(!erros.length, erros.slice(0,20).join(' | '));
    return 'Todos os IDs de motorista, cavalo e carretas referenciados foram encontrados.';
  });

  executar('05 — LEITURA OPERACIONAL', 'Listagens principais podem ser carregadas', () => {
    const nomes = ['MOTORISTAS','CAMINHOES','CAVALOS','CARRETAS','CONJUNTOS','OPERACOES','PARTICIPACAO_OPERACOES','DISPONIBILIDADE_DIARIA','FILA_MOTORISTAS','OFERTAS_CARGAS','ESCALAS','EVENTOS_ESCALA','MOVIMENTACOES_OPERACAO'];
    const contagens = {};
    nomes.forEach(n => { contagens[n] = listarRegistros_(n).length; });
    contagens.CARGAS = listarCargasFullTime_().length;
    return JSON.stringify(contagens);
  });

  executar('06 — CONSISTÊNCIA', 'Não há IDs duplicados nas guias transacionais', () => {
    const erros = [];
    ['OPERACOES','CARGAS','ESCALAS','PARTICIPACAO_OPERACOES','MOVIMENTACOES_OPERACAO','EVENTOS_ESCALA'].forEach(nome => {
      const sh = getSheet_(nome), last = sh.getLastRow();
      if (last < 2) return;
      const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat().map(String).filter(Boolean);
      const repetidos = ids.filter((id,i) => ids.indexOf(id) !== i);
      if (repetidos.length) erros.push(nome + ': ' + [...new Set(repetidos)].join(', '));
    });
    exigir(!erros.length, erros.join(' | '));
    return 'IDs únicos nas guias transacionais verificadas.';
  });

  executar('06 — CONSISTÊNCIA', 'Participações ativas não duplicam o mesmo conjunto', () => {
    const rows = getSheet_('PARTICIPACAO_OPERACOES').getDataRange().getValues().slice(1);
    const ativos = rows.filter(r => String(r[5]).toUpperCase() === 'ATIVO');
    const vistos = new Set(), duplicados = [];
    ativos.forEach(r => {
      const id = String(r[3] || '');
      if (id && vistos.has(id)) duplicados.push(id);
      if (id) vistos.add(id);
    });
    exigir(!duplicados.length, 'Conjuntos com mais de uma participação ATIVA: ' + [...new Set(duplicados)].join(', '));
    return ativos.length + ' participação(ões) ativa(s), sem conjunto duplicado.';
  });

  executar('07 — REGRAS DETERMINÍSTICAS', 'Ordenação exclui inelegíveis e respeita prioridade sem operação hoje', () => {
    const amostra = [
      {motoristaId:'A',nome:'A',elegivel:true,operacoesHoje:1,diasDisponivel30Dias:20,diasTrabalhados30Dias:5,operacoes30Dias:8},
      {motoristaId:'B',nome:'B',elegivel:true,operacoesHoje:0,diasDisponivel30Dias:10,diasTrabalhados30Dias:3,operacoes30Dias:4},
      {motoristaId:'C',nome:'C',elegivel:false,operacoesHoje:0,diasDisponivel30Dias:30,diasTrabalhados30Dias:0,operacoes30Dias:0},
      {motoristaId:'D',nome:'D',elegivel:true,operacoesHoje:0,diasDisponivel30Dias:10,diasTrabalhados30Dias:3,operacoes30Dias:4,recusouOperacaoAtual:true}
    ];
    const ordenados = ordenarElegiveisEscalaFullTime(amostra);
    exigir(ordenados.length === 2, 'Esperados 2 elegíveis; retornados ' + ordenados.length);
    exigir(ordenados[0].motoristaId === 'B', 'Motorista sem operação hoje não recebeu prioridade.');
    return 'Elegibilidade e prioridade básica aprovadas (2 elegíveis, 2 excluídos).';
  });

  executar('08 — PRÉ-REQUISITO DO MOTOR', 'Motor de geração automática de escalas está implementado', () => {
    const existe = typeof gerarEscalasAutomaticasFullTime === 'function';
    exigir(existe, 'BLOQUEIO: gerarEscalasAutomaticasFullTime() ainda não existe. A ordenação de candidatos não grava ESCALAS automaticamente.');
    return 'Função de geração automática encontrada.';
  }, 'BLOQUEIO');

  executar('08 — PRÉ-REQUISITO DO MOTOR', 'Snapshot da atribuição por operação existe na escala', () => {
    const sh = getSheet_('ESCALAS');
    const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
    const exigidos = ['MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OPERACAO_ID'];
    const faltam = exigidos.filter(h => headers.indexOf(h) < 0);
    exigir(!faltam.length, 'A guia ESCALAS não possui os campos de snapshot: ' + faltam.join(', '));
    return 'Motorista, cavalo, carretas e operação podem ser registrados no snapshot da escala.';
  });

  executar('08 — FLUXO DE OFERTAS', 'Oferta, aceite e expiração estão implementados com prazo de 2 horas', () => {
    exigir(typeof gerarEscalasAutomaticasFullTime === 'function', 'Função de geração de oferta não encontrada.');
    exigir(typeof registrarRespostaOfertaEscalaFullTime === 'function', 'Função de registro de resposta não encontrada.');
    exigir(typeof processarOfertasExpiradasSistema_ === 'function', 'Processador de expiração automática não encontrado.');
    exigir(Number(FT_ESCALA_REGRAS.EXPIRACAO_OFERTA_MINUTOS) === 120, 'Prazo de oferta diferente de 120 minutos.');
    return 'Oferta sequencial, resposta administrativa e expiração automática estão disponíveis no backend.';
  });

  const aprovados = testes.filter(t => t.status === 'APROVADO').length;
  const falhas = testes.filter(t => t.status === 'FALHA').length;
  const bloqueios = testes.filter(t => t.status === 'BLOQUEIO').length;
  const resultado = {
    suite: 'TESTE_FLUXO_INTEGRAL_READ_ONLY',
    executadoEm: inicio.toISOString(),
    duracaoMs: new Date().getTime() - inicio.getTime(),
    total: testes.length,
    aprovados: aprovados,
    falhas: falhas,
    bloqueios: bloqueios,
    prontoParaHomologacao: falhas === 0 && bloqueios === 0,
    prontoParaProducao: false,
    observacao: 'Suite somente de leitura. Não declara produção pronta; gravações/transações, WhatsApp e implantação ainda exigem homologação controlada.',
    resultados: testes
  };
  console.log('FULL TIME — TESTE DE FLUXO INTEGRAL: ' + JSON.stringify(resultado));
  return resultado;
}
