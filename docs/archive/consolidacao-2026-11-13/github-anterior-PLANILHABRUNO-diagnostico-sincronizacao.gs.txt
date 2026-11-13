
/**
 * FULL TIME — DIAGNÓSTICO DE SINCRONIZAÇÃO V1
 *
 * SOMENTE LEITURA: não escreve em nenhuma planilha.
 *
 * Fonte: planilha do Bruno, vinculada a este Apps Script.
 * Destino: planilha principal Full Time.
 *
 * Importante: CAVALOS-BRUNO não é lida.
 */
function diagnosticarSincronizacaoBrunoFullTime_V1() {
  const DESTINO_ID =
    '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';

  const origem = SpreadsheetApp.getActiveSpreadsheet();
  if (!origem) {
    throw new Error(
      'Não foi possível identificar a planilha vinculada ao projeto.'
    );
  }

  const destino = SpreadsheetApp.openById(DESTINO_ID);

  const guias = [
    'MOTORISTAS',
    'CAVALOS',
    'CARRETAS',
    'CONJUNTOS'
  ];

  const resultado = {
    sucesso: true,
    modo: 'DIAGNOSTICO_SEM_ESCRITA',
    origem: origem.getName(),
    origemId: origem.getId(),
    destino: destino.getName(),
    destinoId: destino.getId(),
    guias: [],
    erros: []
  };

  function cabecalhos(sh) {
    if (!sh || sh.getLastColumn() === 0) return [];

    return sh
      .getRange(1, 1, 1, sh.getLastColumn())
      .getDisplayValues()[0]
      .map(v => String(v || '').trim());
  }

  guias.forEach(nome => {
    const shOrigem = origem.getSheetByName(nome);
    const shDestino = destino.getSheetByName(nome);

    if (!shOrigem) {
      resultado.erros.push(
        'Guia de origem ausente: ' + nome
      );
      return;
    }

    if (!shDestino) {
      resultado.erros.push(
        'Guia de destino ausente: ' + nome
      );
      return;
    }

    const hOrigem = cabecalhos(shOrigem);
    const hDestino = cabecalhos(shDestino);

    const normalizar = v =>
      String(v || '').trim().toUpperCase();

    const destinoSet = new Set(
      hDestino.map(normalizar).filter(Boolean)
    );

    const origemSet = new Set(
      hOrigem.map(normalizar).filter(Boolean)
    );

    const camposCorrespondentes = hOrigem.filter(
      h => h && destinoSet.has(normalizar(h))
    );

    const camposSemDestino = hOrigem.filter(
      h => h && !destinoSet.has(normalizar(h))
    );

    const camposSemOrigem = hDestino.filter(
      h => h && !origemSet.has(normalizar(h))
    );

    const linhasOrigem = Math.max(
      0,
      shOrigem.getLastRow() - 1
    );

    const linhasDestino = Math.max(
      0,
      shDestino.getLastRow() - 1
    );

    resultado.guias.push({
      guia: nome,
      linhasOrigem: linhasOrigem,
      linhasDestino: linhasDestino,
      cabecalhosOrigem: hOrigem.length,
      cabecalhosDestino: hDestino.length,
      camposCorrespondentes: camposCorrespondentes,
      camposSemDestino: camposSemDestino,
      camposSemOrigem: camposSemOrigem,
      possuiIdExternoOrigem:
        origemSet.has('ID_EXTERNO'),
      possuiIdExternoDestino:
        destinoSet.has('ID_EXTERNO'),
      possuiIdOperacionalDestino:
        destinoSet.has('ID')
    });
  });

  resultado.sucesso = resultado.erros.length === 0;

  Logger.log(
    'FULL TIME — DIAGNÓSTICO BRUNO: ' +
    JSON.stringify(resultado)
  );

  return resultado;
}


function simularImportacaoCadastrosFullTime_V1() {
  const DESTINO_ID =
    '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';

  const origem = SpreadsheetApp.getActiveSpreadsheet();
  const destino = SpreadsheetApp.openById(DESTINO_ID);

  const guias = [
    'MOTORISTAS',
    'CAVALOS',
    'CARRETAS',
    'CONJUNTOS'
  ];

  function lerGuia(ss, nome) {
    const sh = ss.getSheetByName(nome);
    if (!sh) throw new Error('Guia ausente: ' + nome);

    const valores = sh.getDataRange().getValues();
    if (!valores.length) return { cabecalhos: [], linhas: [] };

    const cabecalhos = valores[0].map(v =>
      String(v || '').trim()
    );

    return {
      cabecalhos: cabecalhos,
      linhas: valores.slice(1).filter(linha =>
        linha.some(v => v !== '' && v !== null)
      )
    };
  }

  function indice(cabecalhos, nome) {
    return cabecalhos.findIndex(h =>
      String(h).trim().toUpperCase() === nome
    );
  }

  function valor(linha, cabecalhos, nome) {
    const i = indice(cabecalhos, nome);
    return i < 0 ? '' : String(linha[i] || '').trim();
  }

  function chave(linha, cabecalhos, tipo) {
    const externo = valor(linha, cabecalhos, 'ID_EXTERNO');
    if (externo) return 'ID_EXTERNO:' + externo;

    if (tipo === 'MOTORISTAS') {
      const cpf = valor(linha, cabecalhos, 'CPF')
        .replace(/\D/g, '');
      return cpf ? 'CPF:' + cpf : '';
    }

    if (tipo === 'CAVALOS' || tipo === 'CARRETAS') {
      const placa = valor(linha, cabecalhos, 'PLACA')
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase();
      return placa ? 'PLACA:' + placa : '';
    }

    return '';
  }

  const relatorio = [];

  guias.forEach(nome => {
    const a = lerGuia(origem, nome);
    const b = lerGuia(destino, nome);

    const chavesDestino = new Map();

    b.linhas.forEach((linha, i) => {
      const k = chave(linha, b.cabecalhos, nome);
      if (!k) return;

      if (!chavesDestino.has(k)) chavesDestino.set(k, []);
      chavesDestino.get(k).push(i + 2);
    });

    const registros = a.linhas.map((linha, i) => {
      const k = chave(linha, a.cabecalhos, nome);
      const correspondencias = k
        ? (chavesDestino.get(k) || [])
        : [];

      let acao;
      if (!k) {
        acao = 'BLOQUEAR_SEM_IDENTIFICADOR';
      } else if (correspondencias.length > 1) {
        acao = 'BLOQUEAR_DUPLICIDADE_NO_DESTINO';
      } else if (correspondencias.length === 1) {
        acao = 'CORRESPONDENCIA_ENCONTRADA';
      } else {
        acao = 'CANDIDATO_A_NOVO_REGISTRO';
      }

      return {
        linhaOrigem: i + 2,
        chave: k || '(sem identificador)',
        acao: acao,
        linhasDestino: correspondencias
      };
    });

    relatorio.push({
      guia: nome,
      registrosOrigem: a.linhas.length,
      registrosDestino: b.linhas.length,
      candidatosNovos: registros.filter(
        r => r.acao === 'CANDIDATO_A_NOVO_REGISTRO'
      ).length,
      correspondencias: registros.filter(
        r => r.acao === 'CORRESPONDENCIA_ENCONTRADA'
      ).length,
      bloqueados: registros.filter(
        r => r.acao.indexOf('BLOQUEAR_') === 0
      ).length,
      registros: registros
    });
  });

  const resultado = {
    modo: 'SIMULACAO_SEM_ESCRITA',
    origemId: origem.getId(),
    destinoId: destino.getId(),
    guias: relatorio
  };

  Logger.log(
    'FULL TIME — SIMULAÇÃO DE IMPORTAÇÃO: ' +
    JSON.stringify(resultado)
  );

  return resultado;
}


function inspecionarChavesCavalosBruno_V1() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('CAVALOS');

  if (!sh) {
    throw new Error('A guia CAVALOS não foi encontrada.');
  }

  const dados = sh.getDataRange().getDisplayValues();
  if (!dados.length) {
    throw new Error('A guia CAVALOS está vazia.');
  }

  const cabecalhos = dados[0].map(v =>
    String(v || '').trim()
  );

  const indices = {};
  ['ID_EXTERNO', 'PLACA', 'RENAVAM', 'CHASSI'].forEach(nome => {
    indices[nome] = cabecalhos.findIndex(
      h => h.toUpperCase() === nome
    );
  });

  const linhas = dados.slice(1)
    .map((linha, i) => ({
      linhaPlanilha: i + 2,
      idExterno: indices.ID_EXTERNO >= 0
        ? linha[indices.ID_EXTERNO] : '(coluna ausente)',
      placa: indices.PLACA >= 0
        ? linha[indices.PLACA] : '(coluna ausente)',
      renavam: indices.RENAVAM >= 0
        ? linha[indices.RENAVAM] : '(coluna ausente)',
      chassi: indices.CHASSI >= 0
        ? linha[indices.CHASSI] : '(coluna ausente)'
    }))
    .filter(r =>
      r.idExterno || r.placa || r.renavam || r.chassi
    );

  const resultado = {
    guia: 'CAVALOS',
    quantidadeCabecalhos: cabecalhos.length,
    cabecalhos: cabecalhos,
    indicesEncontrados: indices,
    quantidadeRegistrosComChaves: linhas.length,
    registros: linhas
  };

  Logger.log(
    'FULL TIME — INSPEÇÃO DE CHAVES: ' +
    JSON.stringify(resultado)
  );

  return resultado;
}



/**
 * FULL TIME — SINCRONIZAÇÃO SEGURA V1
 *
 * Projeto: Apps Script da planilha do Bruno.
 * Origem: planilha vinculada ao projeto.
 * Destino: planilha principal Full Time.
 *
 * IMPORTANTE:
 * - Só importa registros com ID_EXTERNO iniciado por:
 *   FT-TESTE-20261029-
 * - Não importa as linhas antigas sem esse prefixo.
 * - Nunca lê nem escreve na guia CAVALOS-BRUNO.
 * - Não apaga dados.
 * - Não sobrescreve campos do destino com valores vazios.
 * - Cria auditoria das linhas importadas/atualizadas.
 * - Registros importados ficam PENDENTE_REVISAO.
 */

const FT_SYNC_V1 = {
  DESTINO_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',
  LOTE_TESTE: 'FT-TESTE-20261029-',
  GUIA_AUDITORIA: 'AUDITORIA_SINCRONIZACAO_FT'
};

function prepararAuditoriaSincronizacaoFT_V1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FT_SYNC_V1.GUIA_AUDITORIA);

  if (!sh) {
    sh = ss.insertSheet(FT_SYNC_V1.GUIA_AUDITORIA);
    sh.getRange(1, 1, 1, 9).setValues([[
      'DATA_HORA',
      'LOTE',
      'GUIA_ORIGEM',
      'ID_EXTERNO',
      'ACAO',
      'ID_DESTINO',
      'DETALHES',
      'EXECUTADO_POR',
      'VERSAO'
    ]]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 9)
      .setFontWeight('bold')
      .setWrap(true);
  }

  return sh;
}

/**
 * Diagnóstico de segurança: verifica IDs do lote sem gravar
 * na planilha principal.
 */
function validarLoteTesteFullTime_V1() {
  const origem = SpreadsheetApp.getActiveSpreadsheet();
  const guias = [
    'MOTORISTAS',
    'CAVALOS',
    'CARRETAS',
    'CONJUNTOS'
  ];

  const resultado = {
    lote: FT_SYNC_V1.LOTE_TESTE,
    origemId: origem.getId(),
    destinoId: FT_SYNC_V1.DESTINO_ID,
    guias: []
  };

  guias.forEach(nome => {
    const sh = origem.getSheetByName(nome);

    if (!sh) {
      resultado.guias.push({
        guia: nome,
        erro: 'GUIA_AUSENTE'
      });
      return;
    }

    const valores = sh.getDataRange().getDisplayValues();
    if (!valores.length) {
      resultado.guias.push({
        guia: nome,
        registrosLote: 0,
        idsDuplicados: []
      });
      return;
    }

    const cab = valores[0].map(v =>
      String(v || '').trim().toUpperCase()
    );
    const ix = cab.indexOf('ID_EXTERNO');

    if (ix < 0) {
      resultado.guias.push({
        guia: nome,
        erro: 'ID_EXTERNO_AUSENTE'
      });
      return;
    }

    const ids = valores.slice(1)
      .map(r => String(r[ix] || '').trim())
      .filter(id => id.startsWith(FT_SYNC_V1.LOTE_TESTE));

    const contagem = {};
    ids.forEach(id => {
      contagem[id] = (contagem[id] || 0) + 1;
    });

    resultado.guias.push({
      guia: nome,
      registrosLote: ids.length,
      ids: ids,
      idsDuplicados: Object.keys(contagem).filter(
        id => contagem[id] > 1
      )
    });
  });

  Logger.log(
    'FULL TIME — VALIDAÇÃO DO LOTE: ' +
    JSON.stringify(resultado)
  );

  return resultado;
}

/**
 * Sincroniza somente os registros explicitamente marcados
 * com o prefixo do lote de teste.
 *
 * Pode ser executada novamente: identifica o registro por
 * ID_EXTERNO e atualiza somente os campos não vazios da origem.
 */
function sincronizarLoteTesteFullTime_V1() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Outra sincronização está em andamento. Tente novamente.'
    );
  }

  try {
    const origem = SpreadsheetApp.getActiveSpreadsheet();
    const destino = SpreadsheetApp.openById(
      FT_SYNC_V1.DESTINO_ID
    );
    const auditoria = prepararAuditoriaSincronizacaoFT_V1_();

    const guias = [
      'MOTORISTAS',
      'CAVALOS',
      'CARRETAS',
      'CONJUNTOS'
    ];

    const resumo = {
      sucesso: true,
      lote: FT_SYNC_V1.LOTE_TESTE,
      inseridos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: [],
      porGuia: []
    };

    const agora = new Date();
    const email = Session.getEffectiveUser().getEmail() || '';

    function normalizar(v) {
      return String(v || '').trim().toUpperCase();
    }

    function cabecalhos(sh) {
      if (sh.getLastColumn() < 1) return [];
      return sh.getRange(
        1, 1, 1, sh.getLastColumn()
      ).getDisplayValues()[0].map(v => String(v || '').trim());
    }

    function mapaIndices(cab) {
      const mapa = {};
      cab.forEach((h, i) => {
        const k = normalizar(h);
        if (k && mapa[k] === undefined) mapa[k] = i;
      });
      return mapa;
    }

    function valor(linha, indices, nome) {
      const i = indices[normalizar(nome)];
      return i === undefined ? '' : linha[i];
    }

    function auditar(guia, idExt, acao, idDest, detalhes) {
      auditoria.appendRow([
        agora,
        FT_SYNC_V1.LOTE_TESTE,
        guia,
        idExt,
        acao,
        idDest,
        detalhes,
        email,
        'V1'
      ]);
    }

    guias.forEach(nome => {
      const so = origem.getSheetByName(nome);
      const sd = destino.getSheetByName(nome);

      if (!so || !sd) {
        resumo.erros.push(
          nome + ': guia ausente na origem ou no destino.'
        );
        return;
      }

      const hc = cabecalhos(so);
      const hd = cabecalhos(sd);
      const io = mapaIndices(hc);
      const id = mapaIndices(hd);

      if (io.ID_EXTERNO === undefined) {
        resumo.erros.push(nome + ': ID_EXTERNO ausente na origem.');
        return;
      }

      if (id.ID_EXTERNO === undefined || id.ID === undefined) {
        resumo.erros.push(
          nome + ': destino precisa ter ID e ID_EXTERNO.'
        );
        return;
      }

      const origemValores = so.getLastRow() > 1
        ? so.getRange(
            2, 1, so.getLastRow() - 1, so.getLastColumn()
          ).getValues()
        : [];

      const destinoValores = sd.getLastRow() > 1
        ? sd.getRange(
            2, 1, sd.getLastRow() - 1, sd.getLastColumn()
          ).getValues()
        : [];

      // Só indexa registros do destino por ID externo.
      const destinoPorId = {};

      destinoValores.forEach((r, i) => {
        const ext = String(r[id.ID_EXTERNO] || '').trim();
        if (!ext) return;

        if (!destinoPorId[ext]) destinoPorId[ext] = [];
        destinoPorId[ext].push({
          linha: i + 2,
          valores: r
        });
      });

      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;

      origemValores.forEach((r, i) => {
        const ext = String(r[io.ID_EXTERNO] || '').trim();

        // BLOQUEIO PRINCIPAL: nenhum registro fora do lote é importado.
        if (!ext.startsWith(FT_SYNC_V1.LOTE_TESTE)) {
          ignorados++;
          return;
        }

        const matches = destinoPorId[ext] || [];

        if (matches.length > 1) {
          resumo.erros.push(
            nome + ': ID externo duplicado no destino: ' + ext
          );
          auditar(
            nome, ext, 'BLOQUEADO_DUPLICIDADE',
            '', 'Mais de uma linha com o mesmo ID_EXTERNO.'
          );
          return;
        }

        const origemLinha = i + 2;
        let destinoLinha;
        let valoresDestino;
        let acao;

        if (matches.length === 1) {
          destinoLinha = matches[0].linha;
          valoresDestino = matches[0].valores.slice();
          acao = 'ATUALIZADO';
        } else {
          destinoLinha = Math.max(2, sd.getLastRow() + 1);
          valoresDestino = new Array(hd.length).fill('');
          acao = 'INSERIDO';

          // ID operacional é igual ao ID externo para o lote de teste.
          valoresDestino[id.ID] = ext;
          valoresDestino[id.ID_EXTERNO] = ext;

          if (id.CRIADO_EM !== undefined) {
            valoresDestino[id.CRIADO_EM] = agora;
          }
          if (id.STATUS !== undefined) {
            valoresDestino[id.STATUS] = 'PENDENTE_REVISAO';
          }
        }

        let camposAlterados = 0;

        // Só transfere campos com cabeçalhos coincidentes.
        // Valores vazios na origem nunca apagam dados do destino.
        hc.forEach((campo, colOrigem) => {
          const chave = normalizar(campo);
          const colDestino = id[chave];

          if (colDestino === undefined) return;
          if (chave === 'ID' || chave === 'CRIADO_EM') return;

          const novoValor = r[colOrigem];
          if (novoValor === '' || novoValor === null) return;

          // O identificador do lote deve continuar consistente.
          if (
            chave === 'ID_EXTERNO' &&
            String(novoValor).trim() !== ext
          ) return;

          if (valoresDestino[colDestino] !== novoValor) {
            valoresDestino[colDestino] = novoValor;
            camposAlterados++;
          }
        });

        // Evita que uma atualização promova cadastro de teste a ativo.
        if (id.STATUS !== undefined) {
          valoresDestino[id.STATUS] = 'PENDENTE_REVISAO';
        }

        sd.getRange(
          destinoLinha, 1, 1, hd.length
        ).setValues([valoresDestino]);

        if (acao === 'INSERIDO') {
          inseridos++;
          resumo.inseridos++;
        } else {
          atualizados++;
          resumo.atualizados++;
        }

        auditar(
          nome,
          ext,
          acao,
          ext,
          'Linha origem ' + origemLinha +
          '; linha destino ' + destinoLinha +
          '; campos não vazios processados: ' + camposAlterados
        );
      });

      resumo.ignorados += ignorados;
      resumo.porGuia.push({
        guia: nome,
        inseridos: inseridos,
        atualizados: atualizados,
        ignorados: ignorados
      });
    });

    resumo.sucesso = resumo.erros.length === 0;

    Logger.log(
      'FULL TIME — SINCRONIZAÇÃO DO LOTE: ' +
      JSON.stringify(resumo)
    );

    return resumo;
  } finally {
    lock.releaseLock();
  }
}