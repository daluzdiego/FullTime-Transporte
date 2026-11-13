
/**
 * FULL TIME — LIMPEZA CONTROLADA DAS PLANILHAS
 *
 * Bruno:
 *   Limpa todas as guias, exceto CAVALOS-BRUNO.
 *
 * Planilha principal:
 *   Limpa somente as guias de dados explicitamente autorizadas.
 *   Preserva configurações, links, respostas de formulários e controles.
 *
 * Não exclui guias, não altera cabeçalhos e não remove fórmulas.
 *
 * ETAPA 1: executar auditarLimpezaControladaFullTime()
 * ETAPA 2: conferir o relatório.
 * ETAPA 3: executar executarLimpezaControladaFullTime()
 */

const FT_LIMPEZA = Object.freeze({
  BRUNO_ID: '1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI',
  PRINCIPAL_ID: '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE',

  // Única guia da planilha do Bruno que não pode ser alterada.
  BRUNO_PROTEGIDA: ['CAVALOS-BRUNO'],

  // Guias de dados da planilha principal.
  // Tudo que não estiver nesta lista será preservado.
  PRINCIPAL_DADOS: [
    // Espelhos dos cadastros do Bruno
    'FT_CADASTRO_BRUNO_MOTORISTAS',
    'FT_CADASTRO_BRUNO_CAVALOS',
    'FT_CADASTRO_BRUNO_CARRETAS',
    'FT_CADASTRO_BRUNO_CONJUNTOS',
    'FT_CADASTRO_BRUNO_DOCUMENTOS',

    // Cadastros operacionais
    'MOTORISTAS',
    'CAMINHOES',
    'CAVALOS',
    'CARRETAS',
    'CONJUNTOS',
    'CONTROLE_DOCUMENTAL',

    // Operações e escalas
    'OPERACOES',
    'CARGAS',
    'ESCALAS',
    'HISTORICO_OPERACOES',
    'PARTICIPACAO_OPERACOES',
    'MOVIMENTACOES_OPERACAO',

    // Disponibilidade e distribuição de cargas
    'DISPONIBILIDADE_DIARIA',
    'FILA_MOTORISTAS',
    'OFERTAS_CARGAS',
    'EVENTOS_ESCALA',

    // Testes e entradas
    'ENTRADA_OPERACOES_IA',
    'SOLICITACOES_TESTE',
    'TICKETS'
  ]
});


/**
 * Conta dados preenchidos e fórmulas a partir da linha 2.
 * Não altera nada.
 */
function FT_LIMPEZA_inspecionarGuia_(ss, nome, protegida) {
  const sh = ss.getSheetByName(nome);

  if (!sh) {
    return {
      guia: nome,
      existe: false,
      protegida: protegida,
      celulasComDados: 0,
      formulas: 0,
      acao: 'GUIA NÃO ENCONTRADA'
    };
  }

  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      guia: nome,
      existe: true,
      protegida: protegida,
      linhasComDados: 0,
      celulasComDados: 0,
      formulas: 0,
      acao: protegida ? 'NÃO ALTERAR' : 'SEM DADOS'
    };
  }

  const range = sh.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();
  const formulas = range.getFormulas();

  let celulasComDados = 0;
  let totalFormulas = 0;

  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r].length; c++) {
      if (formulas[r][c]) {
        totalFormulas++;
      } else if (
        values[r][c] !== '' &&
        values[r][c] !== null
      ) {
        celulasComDados++;
      }
    }
  }

  return {
    guia: nome,
    existe: true,
    ultimaLinha: lastRow,
    ultimaColuna: lastCol,
    linhasComDados: lastRow - 1,
    celulasComDados: celulasComDados,
    formulas: totalFormulas,
    protegida: protegida,
    acao: protegida
      ? 'NÃO ALTERAR'
      : 'LIMPAR DADOS A PARTIR DA LINHA 2'
  };
}


/**
 * AUDITORIA — somente leitura.
 *
 * Executar primeiro e conferir o relatório no Logger.
 */
function auditarLimpezaControladaFullTime() {
  const bruno = SpreadsheetApp.openById(FT_LIMPEZA.BRUNO_ID);
  const principal = SpreadsheetApp.openById(FT_LIMPEZA.PRINCIPAL_ID);

  const relatorio = {
    versao: '1.0',
    modo: 'AUDITORIA_SEM_EXCLUSAO',
    planilhas: []
  };

  // Bruno: todas as guias, exceto CAVALOS-BRUNO.
  const guiasBruno = bruno.getSheets().map(sh => {
    const nome = sh.getName();
    const protegida = FT_LIMPEZA.BRUNO_PROTEGIDA.includes(nome);

    return FT_LIMPEZA_inspecionarGuia_(
      bruno,
      nome,
      protegida
    );
  });

  relatorio.planilhas.push({
    nome: bruno.getName(),
    id: bruno.getId(),
    guias: guiasBruno
  });

  // Principal: somente a lista autorizada.
  const guiasPrincipal = FT_LIMPEZA.PRINCIPAL_DADOS.map(nome =>
    FT_LIMPEZA_inspecionarGuia_(principal, nome, false)
  );

  // Mostrar também o que será preservado.
  const preservadas = principal.getSheets()
    .filter(sh => !FT_LIMPEZA.PRINCIPAL_DADOS.includes(sh.getName()))
    .map(sh => ({
      guia: sh.getName(),
      acao: 'PRESERVAR — FORA DA LISTA DE LIMPEZA'
    }));

  relatorio.planilhas.push({
    nome: principal.getName(),
    id: principal.getId(),
    guias: guiasPrincipal,
    guiasPreservadas: preservadas
  });

  Logger.log(
    'FULL TIME — AUDITORIA DA LIMPEZA:\n' +
    JSON.stringify(relatorio, null, 2)
  );

  return relatorio;
}


/**
 * Limpa somente constantes, preservando fórmulas.
 *
 * Agrupa células consecutivas por linha para reduzir operações.
 * Preserva cabeçalho, formatação, validações e estrutura.
 */
function FT_LIMPEZA_limparGuia_(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return {
      guia: sh.getName(),
      celulasApagadas: 0,
      intervalos: 0
    };
  }

  const range = sh.getRange(2, 1, lastRow - 1, lastCol);
  const values = range.getValues();
  const formulas = range.getFormulas();

  const intervalos = [];
  let celulasApagadas = 0;

  for (let r = 0; r < values.length; r++) {
    let inicio = null;

    for (let c = 0; c <= lastCol; c++) {
      const temConteudo =
        c < lastCol &&
        !formulas[r][c] &&
        values[r][c] !== '' &&
        values[r][c] !== null;

      if (temConteudo) {
        celulasApagadas++;

        if (inicio === null) {
          inicio = c + 1;
        }
      } else if (inicio !== null) {
        const fim = c;
        const linha = r + 2;

        const colunaA = FT_LIMPEZA_numeroColuna_(inicio);
        const colunaB = FT_LIMPEZA_numeroColuna_(fim);

        intervalos.push(
          colunaA === colunaB
            ? colunaA + linha
            : colunaA + linha + ':' + colunaB + linha
        );

        inicio = null;
      }
    }
  }

  // Limpa em lotes, sem tocar nas células que contêm fórmulas.
  const TAMANHO_LOTE = 400;

  for (let i = 0; i < intervalos.length; i += TAMANHO_LOTE) {
    sh.getRangeList(
      intervalos.slice(i, i + TAMANHO_LOTE)
    ).clearContent();
  }

  return {
    guia: sh.getName(),
    celulasApagadas: celulasApagadas,
    intervalos: intervalos.length
  };
}


/**
 * Converte número da coluna em letras.
 */
function FT_LIMPEZA_numeroColuna_(numero) {
  let resultado = '';

  while (numero > 0) {
    const resto = (numero - 1) % 26;
    resultado = String.fromCharCode(65 + resto) + resultado;
    numero = Math.floor((numero - 1) / 26);
  }

  return resultado;
}


/**
 * EXECUÇÃO DEFINITIVA.
 *
 * A confirmação textual evita execução acidental.
 */
function executarLimpezaControladaFullTime() {
  const CONFIRMACAO = 'CONFIRMAR_LIMPEZA_FULLTIME';

  if (CONFIRMACAO !== 'CONFIRMAR_LIMPEZA_FULLTIME') {
    throw new Error('Confirmação inválida. Nenhuma limpeza executada.');
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error(
      'Já existe outra execução em andamento. Tente novamente.'
    );
  }

  try {
    const bruno = SpreadsheetApp.openById(FT_LIMPEZA.BRUNO_ID);
    const principal = SpreadsheetApp.openById(FT_LIMPEZA.PRINCIPAL_ID);

    const resultado = {
      versao: '1.0',
      modo: 'LIMPEZA_CONTROLADA',
      inicio: new Date(),
      planilhas: [],
      totalCelulasApagadas: 0
    };

    // 1. Bruno: todas as guias, menos CAVALOS-BRUNO.
    const resultadoBruno = [];

    bruno.getSheets().forEach(sh => {
      if (FT_LIMPEZA.BRUNO_PROTEGIDA.includes(sh.getName())) {
        resultadoBruno.push({
          guia: sh.getName(),
          celulasApagadas: 0,
          acao: 'PRESERVADA — PROTEÇÃO ABSOLUTA'
        });
        return;
      }

      const r = FT_LIMPEZA_limparGuia_(sh);
      resultadoBruno.push(r);
      resultado.totalCelulasApagadas += r.celulasApagadas;
    });

    resultado.planilhas.push({
      nome: bruno.getName(),
      guias: resultadoBruno
    });

    // 2. Principal: somente guias da lista autorizada.
    const resultadoPrincipal = [];

    FT_LIMPEZA.PRINCIPAL_DADOS.forEach(nome => {
      const sh = principal.getSheetByName(nome);

      if (!sh) {
        resultadoPrincipal.push({
          guia: nome,
          acao: 'NÃO ENCONTRADA — IGNORADA',
          celulasApagadas: 0
        });
        return;
      }

      const r = FT_LIMPEZA_limparGuia_(sh);
      resultadoPrincipal.push(r);
      resultado.totalCelulasApagadas += r.celulasApagadas;
    });

    resultado.planilhas.push({
      nome: principal.getName(),
      guias: resultadoPrincipal
    });

    resultado.fim = new Date();
    resultado.sucesso = true;

    Logger.log(
      'FULL TIME — LIMPEZA CONCLUÍDA:\n' +
      JSON.stringify(resultado, null, 2)
    );

    return resultado;

  } finally {
    lock.releaseLock();
  }
}


/**
 * FULL TIME — LIMPEZA TOTAL DA PLANILHA PRINCIPAL
 *
 * Planilha: Full Time Transporte e Consultoria
 *
 * LIMPA:
 * - Todas as guias existentes
 * - Todos os dados a partir da linha 2
 *
 * PRESERVA:
 * - Guias
 * - Cabeçalhos da linha 1
 * - Formatação
 * - Fórmulas
 * - Validações
 */

const FT_PRINCIPAL_LIMPEZA_ID =
  '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE';


function auditarLimpezaPrincipal() {
  const ss = SpreadsheetApp.openById(
    FT_PRINCIPAL_LIMPEZA_ID
  );

  const resultado = [];

  ss.getSheets().forEach(sh => {
    const ultimaLinha = sh.getLastRow();
    const ultimaColuna = sh.getLastColumn();

    let dados = 0;
    let formulas = 0;

    if (ultimaLinha >= 2 && ultimaColuna >= 1) {
      const range = sh.getRange(
        2, 1, ultimaLinha - 1, ultimaColuna
      );

      const valores = range.getValues();
      const formulasMatriz = range.getFormulas();

      valores.forEach((linha, r) => {
        linha.forEach((valor, c) => {
          if (formulasMatriz[r][c]) formulas++;
          else if (valor !== '' && valor !== null) dados++;
        });
      });
    }

    resultado.push({
      guia: sh.getName(),
      celulasQueSeriamApagadas: dados,
      formulasPreservadas: formulas,
      acao: 'LIMPAR DADOS A PARTIR DA LINHA 2'
    });
  });

  resultado.forEach(item => Logger.log(JSON.stringify(item)));

  Logger.log(
    'AUDITORIA PRINCIPAL CONCLUÍDA. Nenhum dado foi apagado.'
  );

  return resultado;
}


function executarLimpezaPrincipal() {
  const CONFIRMAR = 'CONFIRMAR_LIMPEZA_PRINCIPAL';

  if (CONFIRMAR !== 'CONFIRMAR_LIMPEZA_PRINCIPAL') {
    throw new Error('Confirmação inválida.');
  }

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error('Outra execução está em andamento.');
  }

  try {
    const ss = SpreadsheetApp.openById(
      FT_PRINCIPAL_LIMPEZA_ID
    );

    const resultado = [];

    ss.getSheets().forEach(sh => {
      const nome = sh.getName();
      const ultimaLinha = sh.getLastRow();
      const ultimaColuna = sh.getLastColumn();

      if (ultimaLinha < 2 || ultimaColuna < 1) {
        resultado.push({
          guia: nome,
          status: 'SEM DADOS',
          apagadas: 0
        });
        return;
      }

      const range = sh.getRange(
        2, 1, ultimaLinha - 1, ultimaColuna
      );

      const valores = range.getValues();
      const formulas = range.getFormulas();

      let apagadas = 0;
      const intervalos = [];

      for (let r = 0; r < valores.length; r++) {
        let inicio = null;

        for (let c = 0; c <= ultimaColuna; c++) {
          const apagar =
            c < ultimaColuna &&
            !formulas[r][c] &&
            valores[r][c] !== '' &&
            valores[r][c] !== null;

          if (apagar) {
            apagadas++;
            if (inicio === null) inicio = c + 1;
          } else if (inicio !== null) {
            const linha = r + 2;
            const fim = c;

            intervalos.push(
              colunaPrincipal_(inicio) + linha + ':' +
              colunaPrincipal_(fim) + linha
            );

            inicio = null;
          }
        }
      }

      for (let i = 0; i < intervalos.length; i += 400) {
        sh.getRangeList(
          intervalos.slice(i, i + 400)
        ).clearContent();
      }

      resultado.push({
        guia: nome,
        status: 'LIMPA',
        apagadas: apagadas
      });
    });

    resultado.forEach(item => Logger.log(JSON.stringify(item)));

    Logger.log(
      'LIMPEZA PRINCIPAL CONCLUÍDA: ' +
      JSON.stringify(resultado)
    );

    return resultado;

  } finally {
    lock.releaseLock();
  }
}


function colunaPrincipal_(n) {
  let s = '';

  while (n > 0) {
    const resto = (n - 1) % 26;
    s = String.fromCharCode(65 + resto) + s;
    n = Math.floor((n - 1) / 26);
  }

  return s;
}

