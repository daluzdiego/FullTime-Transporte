/**
 * FULL TIME — DIAGNÓSTICO CENTRALIZADO DE HOMOLOGAÇÃO
 * SOMENTE LEITURA.
 *
 * Não cria guias, não altera propriedades, não instala gatilhos
 * e não grava dados.
 *
 * Arquivo: DiagnosticoAmbienteHomologacao.gs
 * Função: verificarAmbienteHomologacaoFullTime
 *
 * Arquitetura vigente:
 * - FT_REGISTRY_DATABASE_ID: base operacional central.
 * - FT_DATABASE_ID: base de autenticação.
 * - Não depende de planilha externa de cadastro do Bruno.
 */
function verificarAmbienteHomologacaoFullTime() {
  const props = PropertiesService.getScriptProperties();
  const operationalId = String(props.getProperty('FT_REGISTRY_DATABASE_ID') || '').trim();
  const authId = String(props.getProperty('FT_DATABASE_ID') || '').trim();

  const report = {
    executadoEm: new Date().toISOString(),
    modo: 'SOMENTE_LEITURA',
    status: 'OK',
    propriedades: {
      baseOperacionalConfigurada: !!operationalId,
      baseAutenticacaoConfigurada: !!authId,
      basesSeparadas: !!(operationalId && authId && operationalId !== authId)
    },
    operacional: { aberta: false, nome: '', guias: [] },
    autenticacao: { aberta: false, nome: '', guias: [] },
    gatilhos: [],
    avisos: [],
    erros: []
  };

  if (!operationalId) report.erros.push('Propriedade FT_REGISTRY_DATABASE_ID não configurada.');
  if (!authId) report.erros.push('Propriedade FT_DATABASE_ID não configurada.');
  if (operationalId && authId && operationalId === authId) {
    report.erros.push('A base operacional e a base de autenticação apontam para a mesma planilha.');
  }

  const operationalRequired = [
    'MOTORISTAS',
    'CAVALOS',
    'CARRETAS',
    'CONJUNTOS',
    'DOCUMENTOS',
    'LOCAIS',
    'REGRAS_OPERACIONAIS',
    'DISPONIBILIDADE_DIARIA',
    'FILA_MOTORISTAS',
    'EVENTOS_ESCALA',
    'OPERACOES',
    'PARTICIPACAO_OPERACOES',
    'MOVIMENTACOES_OPERACAO',
    'ENTRADA_OPERACOES_IA'
  ];

  const authRequired = ['USUARIOS', 'AUDITORIA', 'RECUPERACAO_SENHA'];

  function inspectSpreadsheet(id, target, requiredTabs, label) {
    if (!id) return;

    try {
      const ss = SpreadsheetApp.openById(id);
      target.aberta = true;
      target.nome = ss.getName();

      const existing = new Set(ss.getSheets().map(sh => sh.getName()));
      target.guias = requiredTabs.map(name => ({
        guia: name,
        existe: existing.has(name)
      }));

      target.guias.forEach(item => {
        if (!item.existe) {
          report.erros.push(label + ': guia obrigatória ausente — ' + item.guia);
        }
      });
    } catch (error) {
      report.erros.push('Não foi possível abrir a base ' + label + ': ' + error.message);
    }
  }

  inspectSpreadsheet(operationalId, report.operacional, operationalRequired, 'operacional');
  inspectSpreadsheet(authId, report.autenticacao, authRequired, 'autenticação');

  try {
    report.gatilhos = ScriptApp.getProjectTriggers().map(trigger => ({
      funcao: trigger.getHandlerFunction(),
      evento: String(trigger.getEventType())
    }));
  } catch (error) {
    report.avisos.push('Não foi possível consultar os gatilhos: ' + error.message);
  }

  if (report.erros.length) {
    report.status = 'ERRO';
  } else if (report.avisos.length) {
    report.status = 'ATENCAO';
  }

  Logger.log('FULL TIME — DIAGNÓSTICO CENTRALIZADO: ' + JSON.stringify(report));
  return report;
}
