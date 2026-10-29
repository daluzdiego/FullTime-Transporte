
/**
 * FULL TIME — GERADOR DE CARGA FICTÍCIA V1
 *
 * Executar manualmente:
 * gerarCargaFicticiaFullTime_V1
 *
 * - Acrescenta 20 registros por categoria.
 * - Não apaga nem modifica linhas existentes.
 * - Não acessa CAVALOS-BRUNO.
 * - Não sincroniza nem escreve na planilha principal.
 * - Pode ser executado novamente sem duplicar IDs do lote.
 * - Todos os registros são fictícios e identificados como TESTE.
 * - CORREÇÃO V1.1: CONTROLE_DOCUMENTAL usa ID_DOCUMENTO como chave.
 */
function gerarCargaFicticiaFullTime_V1() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const LOTE = 'FT-TESTE-20261029-';
  const TOTAL = 20;
  const agora = new Date();

  const resultado = {
    sucesso: true,
    lote: LOTE,
    origemId: ss.getId(),
    inseridos: {},
    jaExistentes: {},
    erros: []
  };

  function normalizar(v) {
    return String(v || '').trim().toUpperCase();
  }

  function garantirGuia(nome, cabecalhos) {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome);

    const largura = sh.getLastColumn();
    const atuais = largura
      ? sh.getRange(1, 1, 1, largura).getDisplayValues()[0]
        .map(v => String(v || '').trim())
      : [];

    if (atuais.every(v => !v)) {
      if (sh.getLastRow() > 0) {
        throw new Error(
          'A guia ' + nome +
          ' contém dados sem cabeçalhos. Nenhuma linha será escrita.'
        );
      }
      sh.getRange(1, 1, 1, cabecalhos.length)
        .setValues([cabecalhos]);
    } else {
      const existentes = new Set(atuais.map(normalizar));
      const novos = cabecalhos.filter(h => !existentes.has(normalizar(h)));

      if (novos.length) {
        sh.getRange(1, largura + 1, 1, novos.length)
          .setValues([novos]);
      }
    }

    sh.setFrozenRows(1);
    return sh;
  }

  function inserirPorId(nome, cabecalhos, registros) {
    const sh = garantirGuia(nome, cabecalhos);
    const headers = sh.getRange(
      1, 1, 1, sh.getLastColumn()
    ).getDisplayValues()[0].map(v => String(v || '').trim());

    const indices = {};
    headers.forEach((h, i) => {
      indices[normalizar(h)] = i;
    });

    // Cada guia pode ter uma chave própria. CONTROLE_DOCUMENTAL usa ID_DOCUMENTO.
    const candidatosChave = nome === 'CONTROLE_DOCUMENTAL'
      ? ['ID_DOCUMENTO', 'ID_EXTERNO', 'ID']
      : ['ID_EXTERNO', 'ID', 'ID_DOCUMENTO'];

    let campoChave = '';
    let ix = undefined;
    for (const campo of candidatosChave) {
      const indice = indices[campo];
      if (indice !== undefined) {
        campoChave = campo;
        ix = indice;
        break;
      }
    }

    if (ix === undefined) {
      throw new Error(
        nome + ': falta coluna identificadora. Esperado: ' +
        candidatosChave.join(', ')
      );
    }

    const ultima = sh.getLastRow();
    const existentes = new Set();

    if (ultima >= 2) {
      sh.getRange(2, ix + 1, ultima - 1, 1)
        .getDisplayValues().forEach(r => {
          const id = String(r[0] || '').trim();
          if (id) existentes.add(id);
        });
    }

    const novos = [];

    registros.forEach(obj => {
      // Aceita a chave específica da guia e mantém compatibilidade com as demais.
      const id = String(
        obj[campoChave] || obj.ID_EXTERNO || obj.ID || obj.ID_DOCUMENTO || ''
      ).trim();

      if (!id.startsWith(LOTE)) {
        throw new Error(
          nome + ': identificador ausente ou fora do lote autorizado: ' + id
        );
      }

      if (existentes.has(id)) {
        resultado.jaExistentes[nome] =
          (resultado.jaExistentes[nome] || 0) + 1;
        return;
      }

      const linha = new Array(headers.length).fill('');

      Object.keys(obj).forEach(campo => {
        const i = indices[normalizar(campo)];
        if (i !== undefined) linha[i] = obj[campo];
      });

      // Mantém o identificador na coluna própria e, quando existentes, nas chaves operacionais.
      if (indices[campoChave] !== undefined && !linha[indices[campoChave]]) {
        linha[indices[campoChave]] = id;
      }
      if (indices.ID !== undefined && !linha[indices.ID]) {
        linha[indices.ID] = id;
      }
      if (indices.ID_EXTERNO !== undefined && !linha[indices.ID_EXTERNO]) {
        linha[indices.ID_EXTERNO] = id;
      }

      novos.push(linha);
      existentes.add(id);
    });

    if (novos.length) {
      sh.getRange(
        sh.getLastRow() + 1, 1, novos.length, headers.length
      ).setValues(novos);
    }

    resultado.inseridos[nome] = novos.length;
  }

  const motoristas = [];
  const cavalos = [];
  const carretas = [];
  const conjuntos = [];
  const operacoes = [];
  const documentos = [];

  for (let i = 1; i <= TOTAL; i++) {
    const n = String(i).padStart(3, '0');
    const idMot = LOTE + 'MOT-' + n;
    const idCav = LOTE + 'CAV-' + n;
    const idCar = LOTE + 'CAR-' + n;
    const idCon = LOTE + 'CON-' + n;

    const capacidade = 25 + ((i - 1) % 4) * 5;
    const placaCav = 'T' + String(1000 + i).slice(-3) + 'FT';
    const placaCar = 'R' + String(2000 + i).slice(-3) + 'FT';

    motoristas.push({
      ID_EXTERNO: idMot,
      NOME_COMPLETO: 'MOTORISTA TESTE ' + n,
      CPF: '',
      RG: '',
      DATA_NASCIMENTO: '',
      TELEFONE: '',
      WHATSAPP: '',
      EMAIL: 'teste.' + n.toLowerCase() + '@example.invalid',
      ENDERECO: 'ENDEREÇO FICTÍCIO — TESTE',
      CIDADE: 'RIO GRANDE',
      UF: 'RS',
      CEP: '',
      CNH_NUMERO: 'CNH-TESTE-' + n,
      CNH_CATEGORIA: 'E',
      CNH_PRIMEIRA_HABILITACAO: '',
      CNH_VALIDADE: new Date(agora.getFullYear() + 2, 11, 31),
      CNH_EAR: 'NÃO VALIDADO — TESTE',
      EXAME_TOXICOLOGICO_VALIDADE:
        new Date(agora.getFullYear() + 1, 11, 31),
      STATUS_DOCUMENTACAO: 'TESTE_NAO_VALIDADO',
      LINK_CNH: '',
      LINK_EXAME_TOXICOLOGICO: '',
      STATUS: 'PENDENTE_REVISAO',
      OBSERVACOES: 'DADO FICTÍCIO. LOTE ' + LOTE
    });

    cavalos.push({
      ID_EXTERNO: idCav,
      PLACA: placaCav,
      RENAVAM: 'RENAVAM-TESTE-' + n,
      CHASSI: 'CHASSI-TESTE-' + n,
      NUMERO_MOTOR: 'MOTOR-TESTE-' + n,
      MARCA: 'MARCA FICTÍCIA',
      MODELO: 'MODELO TESTE ' + n,
      VERSAO: 'TESTE',
      ANO_FABRICACAO: 2024,
      ANO_MODELO: 2025,
      TIPO_VEICULO: 'CAVALO MECÂNICO',
      ESPECIE: 'TRAÇÃO',
      CARROCERIA: 'N/A',
      COR: 'TESTE',
      COMBUSTIVEL: 'DADO FICTÍCIO',
      NUMERO_EIXOS: 3,
      TARA_TONELADAS: 8,
      LOTACAO_TONELADAS: capacidade,
      PBTC_MAX_TONELADAS: capacidade + 8,
      CAPACIDADE_UTIL_TONELADAS: capacidade,
      PROPRIETARIO_DOCUMENTO: '',
      PROPRIETARIO_NOME: 'PROPRIETÁRIO FICTÍCIO',
      CRLV_ANO_EXERCICIO: 2025,
      LICENCIAMENTO_STATUS: 'TESTE_NAO_VALIDADO',
      CRLV_LINK: '',
      AET_NUMERO: '',
      AET_VALIDADE: '',
      ANTT_RNTRC: '',
      ANTT_VALIDADE: '',
      STATUS_DOCUMENTACAO: 'TESTE_NAO_VALIDADO',
      DATA_ULTIMA_CONFERENCIA: '',
      STATUS: 'PENDENTE_REVISAO',
      OBSERVACOES: 'DADO FICTÍCIO. LOTE ' + LOTE
    });

    carretas.push({
      ID_EXTERNO: idCar,
      PLACA: placaCar,
      RENAVAM: 'RENAVAM-CAR-TESTE-' + n,
      CHASSI: 'CHASSI-CAR-TESTE-' + n,
      MARCA: 'MARCA FICTÍCIA',
      MODELO: 'CAÇAMBA TESTE ' + n,
      ANO_FABRICACAO: 2024,
      ANO_MODELO: 2025,
      TIPO_CARRETA: 'CAÇAMBA',
      ESPECIE: 'CARGA',
      CARROCERIA: 'CAÇAMBA',
      COR: 'TESTE',
      NUMERO_EIXOS: 3,
      TARA_TONELADAS: 7,
      LOTACAO_TONELADAS: capacidade,
      CAPACIDADE_CARGA_TONELADAS: capacidade,
      PBTC_MAX_TONELADAS: capacidade + 7,
      PROPRIETARIO_DOCUMENTO: '',
      PROPRIETARIO_NOME: 'PROPRIETÁRIO FICTÍCIO',
      CRLV_ANO_EXERCICIO: 2025,
      LICENCIAMENTO_STATUS: 'TESTE_NAO_VALIDADO',
      CRLV_LINK: '',
      AET_NUMERO: '',
      AET_VALIDADE: '',
      STATUS_DOCUMENTACAO: 'TESTE_NAO_VALIDADO',
      DATA_ULTIMA_CONFERENCIA: '',
      STATUS: 'PENDENTE_REVISAO',
      OBSERVACOES: 'DADO FICTÍCIO. LOTE ' + LOTE
    });

    conjuntos.push({
      ID_EXTERNO: idCon,
      MOTORISTA_ID_EXTERNO: idMot,
      MOTORISTA_CPF: '',
      MOTORISTA_NOME: 'MOTORISTA TESTE ' + n,
      CAVALO_ID_EXTERNO: idCav,
      CAVALO_PLACA: placaCav,
      CARRETA_MEIO_ID_EXTERNO: idCar,
      CARRETA_MEIO_PLACA: placaCar,
      CARRETA_FINAL_ID_EXTERNO: '',
      CARRETA_FINAL_PLACA: '',
      QUANTIDADE_CARRETAS: 1,
      VINCULO_FIXO: 'SIM',
      DATA_INICIO_VINCULO: agora,
      DATA_FIM_VINCULO: '',
      STATUS_VINCULO: 'TESTE_NAO_VALIDADO',
      AUTORIZADO_POR: 'TESTE AUTOMATIZADO',
      DATA_AUTORIZACAO: agora,
      STATUS: 'PENDENTE_REVISAO',
      ESTADO_CONSERVACAO: 'NAO_VALIDADO',
      RESTRICOES: 'REGISTRO FICTÍCIO — NÃO DESIGNAR EM OPERAÇÃO REAL',
      CAPACIDADE_UTIL_TONELADAS: capacidade,
      ATUALIZADO_POR: 'TESTE AUTOMATIZADO',
      OBSERVACOES: 'DADO FICTÍCIO. LOTE ' + LOTE
    });

    const volume = 1000 + i * 100;
    operacoes.push({
      ID_EXTERNO: LOTE + 'OPE-' + n,
      ID: LOTE + 'OPE-' + n,
      CRIADO_EM: agora,
      STATUS: 'TESTE_NAO_VALIDADO',
      DATA_OPERACAO: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i),
      CLIENTE: 'CLIENTE FICTÍCIO ' + n,
      NOME_OPERACAO: 'OPERAÇÃO DE TESTE ' + n,
      ORIGEM: 'PÁTIO FICTÍCIO ' + n,
      DESTINO: 'TERMINAL FICTÍCIO ' + n,
      CATEGORIA: ['ALTO_DESEMPENHO', 'MANOBRA_DIFICIL', 'PRAZO_NAVIO'][(i - 1) % 3],
      VOLUME_TOTAL_TONELADAS: volume,
      TOTAL_CARGAS_PREVISTAS: Math.max(1, Math.ceil(volume / capacidade)),
      SALDO_TONELADAS: volume,
      OBSERVACOES: 'DADO FICTÍCIO. LOTE ' + LOTE,
      CRIADO_POR: 'TESTE AUTOMATIZADO'
    });

    documentos.push({
      ID_DOCUMENTO: LOTE + 'DOC-' + n,
      TIPO_REGISTRO: 'MOTORISTA',
      ID_EXTERNO_REGISTRO: idMot,
      PLACA_OU_CPF: '',
      TIPO_DOCUMENTO: 'CNH_TESTE',
      NUMERO_DOCUMENTO: 'DOC-FICTICIO-' + n,
      DATA_EMISSAO: new Date(agora.getFullYear() - 2, 0, 1),
      DATA_VALIDADE: new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + (i % 3 === 0 ? 15 : i % 3 === 1 ? 30 : 60)),
      STATUS_DOCUMENTO: 'TESTE_NAO_VALIDADO',
      LINK_ARQUIVO: '',
      DATA_CONFERENCIA: '',
      CONFERIDO_POR: 'TESTE AUTOMATIZADO',
      PENDENCIA: 'DOCUMENTO FICTÍCIO — NÃO É DOCUMENTO REAL',
      OBSERVACOES: 'Lote ' + LOTE
    });
  }

  const schemas = {
    MOTORISTAS: [
      'ID_EXTERNO','NOME_COMPLETO','CPF','RG','DATA_NASCIMENTO',
      'TELEFONE','WHATSAPP','EMAIL','ENDERECO','CIDADE','UF','CEP',
      'CNH_NUMERO','CNH_CATEGORIA','CNH_PRIMEIRA_HABILITACAO',
      'CNH_VALIDADE','CNH_EAR','EXAME_TOXICOLOGICO_VALIDADE',
      'STATUS_DOCUMENTACAO','LINK_CNH','LINK_EXAME_TOXICOLOGICO',
      'OBSERVACOES','STATUS'
    ],
    CAVALOS: [
      'ID_EXTERNO','PLACA','RENAVAM','CHASSI','NUMERO_MOTOR','MARCA',
      'MODELO','VERSAO','ANO_FABRICACAO','ANO_MODELO','TIPO_VEICULO',
      'ESPECIE','CARROCERIA','COR','COMBUSTIVEL','NUMERO_EIXOS',
      'TARA_TONELADAS','LOTACAO_TONELADAS','PBTC_MAX_TONELADAS',
      'CAPACIDADE_UTIL_TONELADAS','PROPRIETARIO_DOCUMENTO',
      'PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS',
      'CRLV_LINK','AET_NUMERO','AET_VALIDADE','ANTT_RNTRC',
      'ANTT_VALIDADE','STATUS_DOCUMENTACAO','DATA_ULTIMA_CONFERENCIA',
      'OBSERVACOES','STATUS'
    ],
    CARRETAS: [
      'ID_EXTERNO','PLACA','RENAVAM','CHASSI','MARCA','MODELO',
      'ANO_FABRICACAO','ANO_MODELO','TIPO_CARRETA','ESPECIE',
      'CARROCERIA','COR','NUMERO_EIXOS','TARA_TONELADAS',
      'LOTACAO_TONELADAS','CAPACIDADE_CARGA_TONELADAS',
      'PBTC_MAX_TONELADAS','PROPRIETARIO_DOCUMENTO',
      'PROPRIETARIO_NOME','CRLV_ANO_EXERCICIO','LICENCIAMENTO_STATUS',
      'CRLV_LINK','AET_NUMERO','AET_VALIDADE','STATUS_DOCUMENTACAO',
      'DATA_ULTIMA_CONFERENCIA','OBSERVACOES','STATUS'
    ],
    CONJUNTOS: [
      'ID_EXTERNO','MOTORISTA_ID_EXTERNO','MOTORISTA_CPF',
      'MOTORISTA_NOME','CAVALO_ID_EXTERNO','CAVALO_PLACA',
      'CARRETA_MEIO_ID_EXTERNO','CARRETA_MEIO_PLACA',
      'CARRETA_FINAL_ID_EXTERNO','CARRETA_FINAL_PLACA',
      'QUANTIDADE_CARRETAS','VINCULO_FIXO','DATA_INICIO_VINCULO',
      'DATA_FIM_VINCULO','STATUS_VINCULO','AUTORIZADO_POR',
      'DATA_AUTORIZACAO','OBSERVACOES','STATUS',
      'ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS',
      'ATUALIZADO_POR'
    ],
    OPERACOES: [
      'ID_EXTERNO','ID','CRIADO_EM','STATUS','DATA_OPERACAO','CLIENTE',
      'NOME_OPERACAO','ORIGEM','DESTINO','CATEGORIA',
      'VOLUME_TOTAL_TONELADAS','TOTAL_CARGAS_PREVISTAS',
      'SALDO_TONELADAS','OBSERVACOES','CRIADO_POR'
    ],
    CONTROLE_DOCUMENTAL: [
      'ID_DOCUMENTO','TIPO_REGISTRO','ID_EXTERNO_REGISTRO',
      'PLACA_OU_CPF','TIPO_DOCUMENTO','NUMERO_DOCUMENTO',
      'DATA_EMISSAO','DATA_VALIDADE','STATUS_DOCUMENTO',
      'LINK_ARQUIVO','DATA_CONFERENCIA','CONFERIDO_POR',
      'PENDENCIA','OBSERVACOES'
    ]
  };

  // Confere todos os cabeçalhos antes de iniciar a escrita.
  Object.keys(schemas).forEach(nome => {
    garantirGuia(nome, schemas[nome]);
  });

  inserirPorId('MOTORISTAS', schemas.MOTORISTAS, motoristas);
  inserirPorId('CAVALOS', schemas.CAVALOS, cavalos);
  inserirPorId('CARRETAS', schemas.CARRETAS, carretas);
  inserirPorId('CONJUNTOS', schemas.CONJUNTOS, conjuntos);
  inserirPorId('OPERACOES', schemas.OPERACOES, operacoes);
  inserirPorId('CONTROLE_DOCUMENTAL', schemas.CONTROLE_DOCUMENTAL, documentos);

  Logger.log(
    'FULL TIME — CARGA FICTÍCIA CONCLUÍDA: ' +
    JSON.stringify(resultado)
  );

  return resultado;
}