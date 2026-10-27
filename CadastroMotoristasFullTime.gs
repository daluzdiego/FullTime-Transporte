/**
 * FULL TIME — cadastro real de motoristas e estrutura de conjuntos veiculares.
 * Copie este arquivo para o projeto Apps Script. Execute configurarCadastroInicialFullTime()
 * uma única vez e autorize as permissões solicitadas.
 *
 * A planilha operacional deve estar configurada por conectarPlanilhaOperacionalFullTime().
 */

function configurarCadastroInicialFullTime() {
  const registryId = PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if (!registryId) throw new Error('Execute primeiro conectarPlanilhaOperacionalFullTime().');
  const ss = SpreadsheetApp.openById(registryId);

  const schemas = {
    CAVALOS: ['ID','CRIADO_EM','STATUS','PLACA','MARCA','MODELO','ANO','TARA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CARRETAS: ['ID','CRIADO_EM','STATUS','PLACA','TIPO_CARRETA','TARA_TONELADAS','CAPACIDADE_CARGA_TONELADAS','PBTC_MAX_TONELADAS','OBSERVACOES'],
    CONJUNTOS: ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','INICIO_VIGENCIA','FIM_VIGENCIA','OBSERVACOES'],
    SOLICITACOES_TESTE: ['ID','CRIADO_EM','STATUS','CLIENTE','ORIGEM','DESTINO','DATA_OPERACAO','HORARIO_PREVISTO','PESO_TONELADAS','DESCRICAO','VALOR_FRETE','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','CRIADO_POR','OBSERVACOES']
  };
  Object.keys(schemas).forEach(function(name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = schemas[name];
    const currentWidth = Math.max(sh.getLastColumn(), headers.length);
    const first = sh.getRange(1, 1, 1, currentWidth).getDisplayValues()[0].map(v => String(v || '').trim());
    if (first.every(v => !v)) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const existing = first.filter(Boolean);
      const compatible = existing.every((h, i) => headers[i] === h);
      if (!compatible || existing.length > headers.length) {
        throw new Error('Cabeçalhos incompatíveis na guia ' + name + '. Nenhum dado foi sobrescrito.');
      }
      if (existing.length < headers.length) {
        sh.getRange(1, existing.length + 1, 1, headers.length - existing.length).setValues([headers.slice(existing.length)]);
      }
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#eaf2ff').setFontColor('#16345c').setWrap(true);
    sh.autoResizeColumns(1, headers.length);
  });

  const props = PropertiesService.getScriptProperties();
  let formId = props.getProperty('FT_DRIVER_FORM_ID');
  let form;
  if (formId) {
    try { form = FormApp.openById(formId); } catch (e) { form = null; }
  }
  if (!form) {
    form = FormApp.create('Full Time — Cadastro de Motoristas', true);
    form.setDescription('Preencha seus dados para cadastro na Full Time Transporte e Consultoria. O envio não libera o motorista automaticamente: os dados serão conferidos pela administração. Envie informações verdadeiras e atualizadas.');
    form.setConfirmationMessage('Cadastro recebido. A Full Time irá conferir as informações antes de ativar seu acesso.');
    form.setAllowResponseEdits(true);
    form.setCollectEmail(false);
    form.addTextItem().setTitle('Nome completo').setRequired(true);
    form.addTextItem().setTitle('CPF (somente números ou com pontuação)').setRequired(true);
    form.addTextItem().setTitle('Telefone com DDD').setRequired(true);
    form.addTextItem().setTitle('E-mail').setRequired(false);
    form.addTextItem().setTitle('Número da CNH').setRequired(true);
    form.addListItem().setTitle('Categoria da CNH').setChoiceValues(['C','D','E','AD','AE','AC']).setRequired(true);
    form.addDateItem().setTitle('Validade da CNH').setRequired(true);
    form.addTextItem().setTitle('Cidade/UF').setRequired(true);
    form.addTextItem().setTitle('Observações (opcional)').setRequired(false);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, registryId);
    props.setProperty('FT_DRIVER_FORM_ID', form.getId());
    ScriptApp.newTrigger('processarEnvioCadastroMotoristaFullTime_').forForm(form).onFormSubmit().create();
  }

  const links = {
    planilha: ss.getUrl(),
    formularioMotoristas: form.getPublishedUrl(),
    editarFormulario: form.getEditUrl()
  };
  console.log(JSON.stringify(links));
  return links;
}

/**
 * Trigger instalável do Google Forms. A resposta bruta fica preservada na aba de respostas;
 * os dados validados são copiados para MOTORISTAS como PENDENTE_REVISAO.
 */
function processarEnvioCadastroMotoristaFullTime_(e) {
  if (!e || !e.response) throw new Error('Esta função deve ser executada pelo envio do formulário.');
  const formId = PropertiesService.getScriptProperties().getProperty('FT_DRIVER_FORM_ID');
  if (!formId || e.source.getId() !== formId) throw new Error('Formulário não reconhecido.');

  const answers = {};
  e.response.getItemResponses().forEach(function(itemResponse) {
    answers[String(itemResponse.getItem().getTitle()).trim()] = itemResponse.getResponse();
  });
  const nome = texto_(answers['Nome completo'], 120);
  const cpf = digitos_(answers['CPF (somente números ou com pontuação)']);
  const telefone = digitos_(answers['Telefone com DDD']);
  const email = texto_(answers['E-mail'], 150);
  const cnh = texto_(answers['Número da CNH'], 40);
  const categoria = texto_(answers['Categoria da CNH'], 5).toUpperCase();
  const validadeValue = answers['Validade da CNH'];
  const validade = validadeValue instanceof Date
    ? Utilities.formatDate(validadeValue, Session.getScriptTimeZone(), 'yyyy-MM-dd')
    : texto_(validadeValue, 20);
  const cidade = texto_(answers['Cidade/UF'], 120);
  const observacoes = texto_(answers['Observações (opcional)'], 1000);

  if (!nome || cpf.length !== 11 || !cpfValido_(cpf) || telefone.length < 10 || !cnh ||
      !['C','D','E','AD','AE','AC'].includes(categoria) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(validade) || !cidade) {
    throw new Error('Resposta recebida, mas não importada: há campos obrigatórios inválidos. Corrija na aba de respostas e revise manualmente.');
  }

  const sh = getSheet_('MOTORISTAS');
  const rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 12).getDisplayValues() : [];
  const duplicate = rows.some(function(r) { return digitos_(r[4]) === cpf; });
  if (duplicate) {
    console.warn('Cadastro de motorista duplicado por CPF; resposta preservada na aba original e não foi duplicada em MOTORISTAS.');
    return;
  }

  sh.appendRow([Utilities.getUuid(), new Date(), 'PENDENTE_REVISAO', nome, cpf, telefone, email, cnh, categoria, validade, cidade, observacoes]);
}

/**
 * Valida e registra a associação vigente motorista + cavalo + até duas carretas.
 * IDs devem vir dos cadastros oficiais; não usa placas como chave primária.
 * Uso futuro pelo painel administrativo; não exposto a motoristas.
 */
function salvarConjuntoVeicularFullTime(token, data) {
  const session = obterSessao_(token);
  exigirAdmin_(session);
  data = data || {};
  const motoristaId = texto_(data.motoristaId, 100);
  const cavaloId = texto_(data.cavaloId, 100);
  const carretaMeioId = texto_(data.carretaMeioId, 100);
  const carretaFinalId = texto_(data.carretaFinalId, 100);
  const observacoes = texto_(data.observacoes, 1000);
  if (!motoristaId || !cavaloId) throw new Error('Selecione o motorista responsável e o cavalo mecânico.');
  if (carretaMeioId && carretaMeioId === carretaFinalId) throw new Error('A mesma carreta não pode ser selecionada duas vezes.');

  const drivers = listarRegistros_('MOTORISTAS');
  const horses = listarRegistros_('CAVALOS');
  const trailers = listarRegistros_('CARRETAS');
  const driver = drivers.find(x => x.id === motoristaId && x.status === 'ATIVO');
  const horse = horses.find(x => x.id === cavaloId && x.status === 'ATIVO');
  if (!driver) throw new Error('Motorista não encontrado ou não está ATIVO.');
  if (!horse) throw new Error('Cavalo mecânico não encontrado ou não está ATIVO.');
  [carretaMeioId, carretaFinalId].filter(Boolean).forEach(function(id) {
    if (!trailers.some(x => x.id === id && x.status === 'ATIVO')) throw new Error('Uma das carretas selecionadas não está ativa.');
  });

  const sh = getSheet_('CONJUNTOS');
  const rows = sh.getLastRow() > 1 ? sh.getDataRange().getValues().slice(1) : [];
  // Encerra a vigência de qualquer conjunto atual que use o mesmo motorista ou cavalo.
  rows.forEach(function(r, i) {
    if (String(r[2]) === 'ATIVO' && (String(r[3]) === motoristaId || String(r[4]) === cavaloId)) {
      sh.getRange(i + 2, 3).setValue('INATIVO');
      sh.getRange(i + 2, 9).setValue(new Date());
    }
  });
  const id = Utilities.getUuid();
  sh.appendRow([id, new Date(), 'ATIVO', motoristaId, cavaloId, carretaMeioId, carretaFinalId, new Date(), '', observacoes]);
  auditar_(session, 'VINCULAR_CONJUNTO', 'CONJUNTO', id, 'Motorista=' + motoristaId + '; cavalo=' + cavaloId + '; carreta1=' + carretaMeioId + '; carreta2=' + carretaFinalId);
  return { ok: true, id: id, message: 'Conjunto veicular associado ao motorista.' };
}
