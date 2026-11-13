
function inserirDadosFicticiosVeiculosFullTime() {
  const ss = SpreadsheetApp.openById(
    '11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE'
  );

  const dados = {
    CAVALOS: {
      headers: [
        'ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO',
        'ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'
      ],
      rows: [
        ['TESTE_FICTICIO_CAV_001',new Date(),'INATIVO','TFC1001','VOLVO','FH TESTE',2022,8,50,'TESTE_FICTICIO — não usar em operação'],
        ['TESTE_FICTICIO_CAV_002',new Date(),'INATIVO','TFC1002','SCANIA','R TESTE',2021,8,50,'TESTE_FICTICIO — não usar em operação'],
        ['TESTE_FICTICIO_CAV_003',new Date(),'INATIVO','TFC1003','MERCEDES-BENZ','ACTROS TESTE',2020,9,50,'TESTE_FICTICIO — não usar em operação']
      ]
    },
    CARRETAS: {
      headers: [
        'ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA',
        'TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS',
        'PBTC_MAX_TONELADAS','OBSERVACOES'
      ],
      rows: [
        ['TESTE_FICTICIO_CAR_001',new Date(),'INATIVO','TFR2001','GRANELEIRA',7,32,45,'TESTE_FICTICIO — não usar em operação'],
        ['TESTE_FICTICIO_CAR_002',new Date(),'INATIVO','TFR2002','BASCULANTE',8,30,45,'TESTE_FICTICIO — não usar em operação'],
        ['TESTE_FICTICIO_CAR_003',new Date(),'INATIVO','TFR2003','SIDER',7,28,45,'TESTE_FICTICIO — não usar em operação'],
        ['TESTE_FICTICIO_CAR_004',new Date(),'INATIVO','TFR2004','GRANELEIRA',7,32,45,'TESTE_FICTICIO — não usar em operação']
      ]
    },
    CONJUNTOS: {
      headers: [
        'ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID',
        'CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES'
      ],
      rows: [
        ['TESTE_FICTICIO_CONJ_001',new Date(),'INATIVO','TESTE_FICTICIO_MOT_001','TESTE_FICTICIO_CAV_001','', 'TESTE_FICTICIO_CAR_001','TESTE_FICTICIO — conjunto para validação'],
        ['TESTE_FICTICIO_CONJ_002',new Date(),'INATIVO','TESTE_FICTICIO_MOT_002','TESTE_FICTICIO_CAV_002','', 'TESTE_FICTICIO_CAR_002','TESTE_FICTICIO — conjunto para validação'],
        ['TESTE_FICTICIO_CONJ_003',new Date(),'INATIVO','TESTE_FICTICIO_MOT_003','TESTE_FICTICIO_CAV_003','', 'TESTE_FICTICIO_CAR_003','TESTE_FICTICIO — conjunto para validação']
      ]
    }
  };

  const resumo = {};

  // Primeiro valida todas as guias; não grava parcialmente se houver conflito.
  Object.keys(dados).forEach(function(nome) {
    const sh = ss.getSheetByName(nome);
    if (!sh) throw new Error('Guia ausente: ' + nome);

    const cfg = dados[nome];
    const existentes = sh.getDataRange().getValues();
    const cabecalhos = (existentes[0] || []).map(function(v) {
      return String(v || '').trim();
    });

    if (JSON.stringify(cabecalhos.slice(0, cfg.headers.length)) !==
        JSON.stringify(cfg.headers)) {
      throw new Error('Cabeçalhos incompatíveis em ' + nome +
        '. Nenhuma linha foi inserida.');
    }

    const registros = existentes.slice(1).filter(function(linha) {
      return linha.some(function(v) { return v !== '' && v !== null; });
    });

    if (registros.length > 0) {
      const todosTeste = registros.every(function(linha) {
        return String(linha[0] || '').indexOf('TESTE_FICTICIO_') === 0;
      });
      if (!todosTeste) {
        throw new Error('A guia ' + nome +
          ' já possui registros. Nenhum dado foi inserido; revise antes.');
      }
      throw new Error('A guia ' + nome +
        ' já contém registros de teste. Para evitar duplicações, a execução foi interrompida.');
    }
  });

  Object.keys(dados).forEach(function(nome) {
    const sh = ss.getSheetByName(nome);
    const cfg = dados[nome];
    sh.getRange(2, 1, cfg.rows.length, cfg.headers.length)
      .setValues(cfg.rows);
    resumo[nome] = cfg.rows.length;
  });

  const resultado = {
    sucesso: true,
    modo: 'SOMENTE DADOS FICTÍCIOS',
    inseridos: resumo,
    motoristasReaisAlterados: 0,
    caminhoesAlterados: 0,
    observacao: 'Todos os registros de teste estão INATIVOS e não devem ser usados em operação.'
  };

  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}
