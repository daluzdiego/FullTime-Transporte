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

  // A arquitetura centralizada já cria as guias e define seus cabeçalhos oficiais.
  // Esta rotina não recria nem altera schemas; apenas valida a presença das guias.
  ['MOTORISTAS','CAVALOS','CARRETAS','CONJUNTOS','DOCUMENTOS'].forEach(function(name) {
    if (!ss.getSheetByName(name)) throw new Error('Guia obrigatória ausente na planilha principal: ' + name);
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
  const headers = sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0];
  const ix = {};
  headers.forEach((h,i)=>{const k=String(h||'').trim().toUpperCase();if(k&&!Object.prototype.hasOwnProperty.call(ix,k))ix[k]=i;});
  ['ID','CRIADO_EM','STATUS','MOTORISTA_ID','CAVALO_ID','CARRETA_MEIO_ID','CARRETA_FINAL_ID','OBSERVACOES','ESTADO_CONSERVACAO','RESTRICOES','CAPACIDADE_UTIL_TONELADAS','ATUALIZADO_POR'].forEach(k=>{if(ix[k]===undefined)throw new Error('Cabeçalho obrigatório ausente em CONJUNTOS: '+k);});
  const rows = sh.getLastRow() > 1 ? sh.getDataRange().getValues().slice(1) : [];
  // Encerra a vigência de qualquer conjunto atual que use o mesmo motorista ou cavalo.
  rows.forEach(function(r, i) {
    if (String(r[ix.STATUS]) === 'ATIVO' && (String(r[ix.MOTORISTA_ID]) === motoristaId || String(r[ix.CAVALO_ID]) === cavaloId)) {
      sh.getRange(i + 2, ix.STATUS + 1).setValue('INATIVO');
    }
  });
  const id = Utilities.getUuid();
  const newRow = new Array(headers.length).fill('');
  const values = {ID:id,CRIADO_EM:new Date(),STATUS:'ATIVO',MOTORISTA_ID:motoristaId,CAVALO_ID:cavaloId,CARRETA_MEIO_ID:carretaMeioId,CARRETA_FINAL_ID:carretaFinalId,OBSERVACOES:observacoes,ESTADO_CONSERVACAO:'APTO',RESTRICOES:'',CAPACIDADE_UTIL_TONELADAS:horse.capacidadeUtil||0,ATUALIZADO_POR:session.login||session.email||'ADMIN'};
  Object.keys(values).forEach(k=>{newRow[ix[k]]=values[k];});
  sh.appendRow(newRow);
  auditar_(session, 'VINCULAR_CONJUNTO', 'CONJUNTO', id, 'Motorista=' + motoristaId + '; cavalo=' + cavaloId + '; carreta1=' + carretaMeioId + '; carreta2=' + carretaFinalId);
  return { ok: true, id: id, message: 'Conjunto veicular associado ao motorista.' };
}
