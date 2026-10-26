/**
 * FULL TIME — TRANSPORTE E CONSULTORIA
 * MVP administrativo — Google Apps Script + Google Sheets
 *
 * IMPORTANTE:
 * - Executar configurarSistemaFullTime() apenas uma vez.
 * - Senhas temporárias nunca devem ser usadas em produção.
 * - Planilha de dados deve ficar restrita a administradores autorizados.
 */

const FT = Object.freeze({
  APP_NAME: 'Full Time | Transporte e Consultoria',
  PROP_DB_ID: 'FT_DATABASE_ID',
  PROP_BOOTSTRAP_SECRET: 'FT_BOOTSTRAP_SECRET',
  SESSION_PREFIX: 'FT_SESSION_',
  SESSION_TTL_SECONDS: 21600,
  PASSWORD_MIN_LENGTH: 12,
  SHEETS: {
    USERS: 'USUARIOS',
    DRIVERS: 'MOTORISTAS',
    TRUCKS: 'CAMINHOES',
    AUDIT: 'AUDITORIA',
    CONFIG: 'CONFIGURACOES'
  }
});

/**
 * Execute one time from the Apps Script editor.
 * Creates the database and two administrator accounts with one-time
 * temporary passwords printed only to the execution log.
 */
function configurarSistemaFullTime() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(FT.PROP_DB_ID)) {
    throw new Error('Sistema já configurado. Não execute o bootstrap novamente.');
  }

  const ss = SpreadsheetApp.create('Full Time — Banco de Dados Operacional');
  const schema = {};
  schema[FT.SHEETS.USERS] = [
    'ID','LOGIN','NOME','SALT','HASH_SENHA','PAPEL','ATIVO',
    'TROCA_SENHA_OBRIGATORIA','CRIADO_EM','ULTIMO_LOGIN'
  ];
  schema[FT.SHEETS.DRIVERS] = [
    'ID','CRIADO_EM','ATUALIZADO_EM','STATUS','NOME_COMPLETO','CPF',
    'TELEFONE','EMAIL','CNH_NUMERO','CNH_CATEGORIA','CNH_VALIDADE',
    'CIDADE_UF','CONTATO_EMERGENCIA','OBSERVACOES','CRIADO_POR'
  ];
  schema[FT.SHEETS.TRUCKS] = [
    'ID','CRIADO_EM','ATUALIZADO_EM','STATUS','PLACA','RENAVAM',
    'MARCA','MODELO','ANO','TIPO_VEICULO','CAPACIDADE_TONELADAS',
    'SITUACAO_DOCUMENTAL','OBSERVACOES','CRIADO_POR'
  ];
  schema[FT.SHEETS.AUDIT] = [
    'DATA','USUARIO_ID','LOGIN','ACAO','ENTIDADE','ENTIDADE_ID','DETALHES'
  ];
  schema[FT.SHEETS.CONFIG] = ['CHAVE','VALOR'];

  const first = ss.getSheets()[0];
  first.setName(FT.SHEETS.USERS);
  Object.keys(schema).forEach(function(name) {
    const sh = name === FT.SHEETS.USERS ? first : ss.insertSheet(name);
    sh.clear();
    sh.getRange(1, 1, 1, schema[name].length)
      .setValues([schema[name]])
      .setFontWeight('bold')
      .setBackground('#eef4ff');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, schema[name].length);
  });

  ss.getSheetByName(FT.SHEETS.CONFIG).getRange(2,1,4,2).setValues([
    ['VERSAO','1.0.0'],
    ['EMPRESA','Full Time Transporte e Consultoria'],
    ['BOOTSTRAP_CONCLUIDO','SIM'],
    ['MODO','MVP_VALIDACAO']
  ]);

  const tempPassword = gerarSenhaTemporaria_();
  const salt = Utilities.getUuid() + Utilities.getUuid();
  const hash = hashSenha_(tempPassword, salt);
  const now = new Date();
  const users = [
    [Utilities.getUuid(),'Diego','Diego',salt,hash,'ADMIN',true,true,now,''],
    [Utilities.getUuid(),'Bruno','Bruno',salt,hash,'ADMIN',true,true,now,'']
  ];
  // Separate salt and a unique temporary password per account.
  const creds = {};
  users.forEach(function(row, index) {
    const pw = index === 0 ? tempPassword : gerarSenhaTemporaria_();
    const individualSalt = Utilities.getUuid() + Utilities.getUuid();
    row[3] = individualSalt;
    row[4] = hashSenha_(pw, individualSalt);
    creds[row[1]] = pw;
  });
  ss.getSheetByName(FT.SHEETS.USERS).getRange(2,1,users.length,users[0].length)
    .setValues(users);

  props.setProperty(FT.PROP_DB_ID, ss.getId());
  props.setProperty(FT.PROP_BOOTSTRAP_SECRET, Utilities.getUuid());

  console.log('FULL TIME — CONFIGURAÇÃO CONCLUÍDA');
  console.log('Planilha de dados: ' + ss.getUrl());
  console.log('Login Diego: Diego | Senha temporária: ' + creds.Diego);
  console.log('Login Bruno: Bruno | Senha temporária: ' + creds.Bruno);
  console.log('Copie as senhas temporárias agora. Elas não serão exibidas novamente.');
  console.log('Restrinja o compartilhamento da planilha antes de inserir dados reais.');
}

/** Entry point for the web app. */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(FT.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** Authenticate user and return a random session token. */
function login(login, password) {
  login = normalizarLogin_(login);
  if (!login || typeof password !== 'string' || !password) {
    throw new Error('Informe usuário e senha.');
  }

  const sh = sheet_(FT.SHEETS.USERS);
  const rows = sh.getDataRange().getValues();
  const foundIndex = rows.findIndex(function(row, i) {
    return i > 0 && normalizarLogin_(row[1]) === login;
  });
  if (foundIndex < 1) throw new Error('Usuário ou senha inválidos.');

  const row = rows[foundIndex];
  if (row[6] !== true) throw new Error('Usuário inativo.');
  if (hashSenha_(password, String(row[3])) !== String(row[4])) {
    throw new Error('Usuário ou senha inválidos.');
  }

  const token = Utilities.getUuid() + Utilities.getUuid();
  const session = {
    id: String(row[0]), login: String(row[1]), nome: String(row[2]),
    papel: String(row[5]), trocaObrigatoria: row[7] === true,
    criadaEm: Date.now()
  };
  CacheService.getScriptCache().put(
    FT.SESSION_PREFIX + token, JSON.stringify(session), FT.SESSION_TTL_SECONDS
  );

  sh.getRange(foundIndex + 1, 10).setValue(new Date());
  auditoria_(session, 'LOGIN', 'SESSAO', '', 'Login efetuado');
  return {token: token, user: {
    login: session.login, nome: session.nome, papel: session.papel,
    trocaObrigatoria: session.trocaObrigatoria
  }};
}

/** Explicit logout, invalidating the server-side token. */
function logout(token) {
  const session = sessao_(token);
  CacheService.getScriptCache().remove(FT.SESSION_PREFIX + token);
  auditoria_(session, 'LOGOUT', 'SESSAO', '', 'Logout');
  return {ok:true};
}

/** Must be called with current password, then replaces the stored credential. */
function alterarMinhaSenha(token, senhaAtual, senhaNova) {
  const session = sessao_(token);
  validarSenhaNova_(senhaNova);
  const sh = sheet_(FT.SHEETS.USERS);
  const values = sh.getDataRange().getValues();
  const idx = values.findIndex(function(r, i) { return i > 0 && String(r[0]) === session.id; });
  if (idx < 1) throw new Error('Usuário não encontrado.');
  const row = values[idx];
  if (hashSenha_(String(senhaAtual || ''), String(row[3])) !== String(row[4])) {
    throw new Error('Senha atual incorreta.');
  }
  const salt = Utilities.getUuid() + Utilities.getUuid();
  sh.getRange(idx+1,4,1,5).setValues([[
    salt, hashSenha_(senhaNova, salt), row[5], row[6], false
  ]]);
  // Ensure session reflects the completed mandatory password change.
  session.trocaObrigatoria = false;
  CacheService.getScriptCache().put(FT.SESSION_PREFIX + token, JSON.stringify(session), FT.SESSION_TTL_SECONDS);
  auditoria_(session, 'ALTERAR_SENHA', 'USUARIO', session.id, 'Senha alterada');
  return {ok:true};
}

/** Provides minimal identity and session state to frontend. */
function obterSessao(token) {
  const s = sessao_(token);
  return {user:{login:s.login,nome:s.nome,papel:s.papel,trocaObrigatoria:s.trocaObrigatoria}};
}

/** Dashboard KPIs. */
function obterDashboard(token) {
  const s = sessao_(token);
  exigirAdmin_(s);
  const drivers = objetos_(FT.SHEETS.DRIVERS);
  const trucks = objetos_(FT.SHEETS.TRUCKS);
  return {
    motoristasAtivos: drivers.filter(function(x){return x.STATUS === 'ATIVO';}).length,
    motoristasPendentes: drivers.filter(function(x){return x.STATUS === 'PENDENTE_REVISAO';}).length,
    caminhoesAtivos: trucks.filter(function(x){return x.STATUS === 'ATIVO';}).length,
    caminhoesPendentes: trucks.filter(function(x){return x.STATUS === 'PENDENTE_REVISAO';}).length,
    totalMotoristas: drivers.length,
    totalCaminhoes: trucks.length
  };
}

/** Return sanitized driver rows; CPF is masked in list results. */
function listarMotoristas(token, filtros) {
  const s = sessao_(token); exigirAdmin_(s);
  filtros = filtros || {};
  const term = normalizarTexto_(filtros.busca || '');
  const status = String(filtros.status || '');
  return objetos_(FT.SHEETS.DRIVERS).filter(function(x) {
    const hay = normalizarTexto_([x.NOME_COMPLETO,x.CPF,x.TELEFONE,x.EMAIL].join(' '));
    return (!term || hay.indexOf(term) >= 0) && (!status || x.STATUS === status);
  }).map(function(x) {
    x.CPF = mascararCpf_(x.CPF);
    return x;
  });
}

/** Create or update a driver. Only admins can call this endpoint. */
function salvarMotorista(token, data) {
  const s = sessao_(token); exigirAdmin_(s);
  data = data || {};
  const nome = textoSeguro_(data.nome, 120, 'Nome completo', true);
  const cpf = somenteDigitos_(data.cpf);
  const telefone = textoSeguro_(data.telefone, 30, 'Telefone', true);
  if (!validarCpf_(cpf)) throw new Error('CPF inválido. Confira os números.');
  if (!telefone) throw new Error('Informe telefone/WhatsApp.');
  const email = textoSeguro_(data.email, 160, 'E-mail', false);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
  const cnh = textoSeguro_(data.cnhNumero, 40, 'Número da CNH', true);
  const categoria = String(data.cnhCategoria || '').toUpperCase();
  if (['C','D','E','AB','AC','AD','AE'].indexOf(categoria) < 0) throw new Error('Categoria da CNH inválida.');
  const validade = data.cnhValidade ? new Date(data.cnhValidade) : null;
  if (!validade || isNaN(validade.getTime())) throw new Error('Informe a validade da CNH.');
  const id = String(data.id || '');
  const all = sheet_(FT.SHEETS.DRIVERS).getDataRange().getValues();
  const duplicate = all.slice(1).find(function(r) {
    return somenteDigitos_(r[5]) === cpf && String(r[0]) !== id;
  });
  if (duplicate) throw new Error('Já existe um motorista cadastrado com este CPF.');

  const now = new Date();
  let row;
  if (id) {
    const idx = all.findIndex(function(r,i){return i>0 && String(r[0])===id;});
    if (idx < 1) throw new Error('Motorista não encontrado.');
    row = all[idx];
    row[2] = now; row[4] = nome; row[5] = cpf; row[6] = telefone;
    row[7] = email; row[8] = cnh; row[9] = categoria; row[10] = validade;
    row[11] = textoSeguro_(data.cidadeUf, 100, 'Cidade/UF', false);
    row[12] = textoSeguro_(data.contatoEmergencia, 160, 'Contato de emergência', false);
    row[13] = textoSeguro_(data.observacoes, 1000, 'Observações', false);
    sheet_(FT.SHEETS.DRIVERS).getRange(idx+1,1,1,row.length).setValues([row]);
  } else {
    idOrThrow_(id);
    const sh = sheet_(FT.SHEETS.DRIVERS);
    sh.appendRow([
      Utilities.getUuid(),now,now,'PENDENTE_REVISAO',nome,cpf,telefone,email,cnh,
      categoria,validade,textoSeguro_(data.cidadeUf,100,'Cidade/UF',false),
      textoSeguro_(data.contatoEmergencia,160,'Contato de emergência',false),
      textoSeguro_(data.observacoes,1000,'Observações',false),s.login
    ]);
  }
  auditoria_(s, id ? 'EDITAR' : 'CRIAR', 'MOTORISTA', id || '(novo)', 'Cadastro de motorista atualizado');
  return {ok:true};
}

/** Activate or deactivate a driver after manual review. */
function alterarStatusMotorista(token, id, status) {
  const s = sessao_(token); exigirAdmin_(s);
  if (['ATIVO','INATIVO','PENDENTE_REVISAO'].indexOf(status) < 0) throw new Error('Status inválido.');
  const sh = sheet_(FT.SHEETS.DRIVERS); const rows = sh.getDataRange().getValues();
  const idx = rows.findIndex(function(r,i){return i>0 && String(r[0])===String(id);});
  if (idx < 1) throw new Error('Motorista não encontrado.');
  sh.getRange(idx+1,4).setValue(status);
  sh.getRange(idx+1,3).setValue(new Date());
  auditoria_(s,'STATUS','MOTORISTA',id,'Status: '+status);
  return {ok:true};
}

/** Return truck rows. */
function listarCaminhoes(token, filtros) {
  const s = sessao_(token); exigirAdmin_(s);
  filtros = filtros || {};
  const term = normalizarTexto_(filtros.busca || '');
  const status = String(filtros.status || '');
  return objetos_(FT.SHEETS.TRUCKS).filter(function(x) {
    const hay = normalizarTexto_([x.PLACA,x.MARCA,x.MODELO,x.RENAVAM].join(' '));
    return (!term || hay.indexOf(term)>=0) && (!status || x.STATUS===status);
  });
}

/** Create or update truck. */
function salvarCaminhao(token, data) {
  const s = sessao_(token); exigirAdmin_(s);
  data = data || {};
  const placa = normalizarPlaca_(data.placa);
  if (!validarPlaca_(placa)) throw new Error('Placa inválida. Informe uma placa Mercosul ou padrão antigo.');
  const marca = textoSeguro_(data.marca,80,'Marca',true);
  const modelo = textoSeguro_(data.modelo,100,'Modelo',true);
  const ano = Number(data.ano);
  if (!Number.isInteger(ano) || ano < 1950 || ano > new Date().getFullYear()+1) throw new Error('Ano inválido.');
  const tipo = textoSeguro_(data.tipo,80,'Tipo de veículo',true);
  const capacidade = Number(data.capacidade);
  if (!Number.isFinite(capacidade) || capacidade <= 0 || capacidade > 200) throw new Error('Capacidade deve ser maior que zero e plausível em toneladas.');
  const id = String(data.id || '');
  const sh = sheet_(FT.SHEETS.TRUCKS); const all = sh.getDataRange().getValues();
  if (all.slice(1).some(function(r){return normalizarPlaca_(r[4])===placa && String(r[0])!==id;})) {
    throw new Error('Já existe um caminhão cadastrado com esta placa.');
  }
  const renavam = somenteDigitos_(data.renavam);
  if (renavam && renavam.length !== 11) throw new Error('RENAVAM deve conter 11 dígitos.');
  const now = new Date();
  if (id) {
    const idx = all.findIndex(function(r,i){return i>0 && String(r[0])===id;});
    if (idx < 1) throw new Error('Caminhão não encontrado.');
    const r=all[idx]; r[2]=now; r[4]=placa; r[5]=renavam; r[6]=marca; r[7]=modelo;
    r[8]=ano; r[9]=tipo; r[10]=capacidade;
    r[11]=String(data.situacaoDocumental || 'AGUARDANDO_CONFERENCIA');
    r[12]=textoSeguro_(data.observacoes,1000,'Observações',false);
    sh.getRange(idx+1,1,1,r.length).setValues([r]);
  } else {
    sh.appendRow([
      Utilities.getUuid(),now,now,'PENDENTE_REVISAO',placa,renavam,marca,modelo,ano,tipo,
      capacidade,String(data.situacaoDocumental || 'AGUARDANDO_CONFERENCIA'),
      textoSeguro_(data.observacoes,1000,'Observações',false),s.login
    ]);
  }
  auditoria_(s,id?'EDITAR':'CRIAR','CAMINHAO',id||'(novo)','Cadastro de caminhão atualizado');
  return {ok:true};
}

/** Review truck status. */
function alterarStatusCaminhao(token, id, status) {
  const s = sessao_(token); exigirAdmin_(s);
  if (['ATIVO','INATIVO','PENDENTE_REVISAO'].indexOf(status)<0) throw new Error('Status inválido.');
  const sh=sheet_(FT.SHEETS.TRUCKS); const rows=sh.getDataRange().getValues();
  const idx=rows.findIndex(function(r,i){return i>0 && String(r[0])===String(id);});
  if(idx<1) throw new Error('Caminhão não encontrado.');
  sh.getRange(idx+1,4).setValue(status); sh.getRange(idx+1,3).setValue(new Date());
  auditoria_(s,'STATUS','CAMINHAO',id,'Status: '+status);
  return {ok:true};
}

/** Generic module placeholder only available to an authenticated user. */
function moduloEmDesenvolvimento(token, modulo) {
  sessao_(token);
  const permitidos=['CARGAS','ESCALAS','VIAGENS','RELATORIOS','CONFIGURACOES'];
  if (permitidos.indexOf(String(modulo).toUpperCase())<0) throw new Error('Módulo inválido.');
  return {titulo:String(modulo).toUpperCase(),status:'EM DESENVOLVIMENTO'};
}

/* ------------------------- Private helpers ------------------------- */

function sessao_(token) {
  if (typeof token!=='string' || !token) throw new Error('Sessão expirada. Entre novamente.');
  const raw=CacheService.getScriptCache().get(FT.SESSION_PREFIX+token);
  if (!raw) throw new Error('Sessão expirada. Entre novamente.');
  const s=JSON.parse(raw);
  if (s.trocaObrigatoria) throw new Error('Troque a senha temporária antes de continuar.');
  return s;
}
function exigirAdmin_(s) { if (!s || s.papel!=='ADMIN') throw new Error('Acesso restrito a administradores.'); }
function sheet_(name) {
  const id=PropertiesService.getScriptProperties().getProperty(FT.PROP_DB_ID);
  if (!id) throw new Error('Sistema ainda não configurado. Execute configurarSistemaFullTime().');
  const ss=SpreadsheetApp.openById(id); const sh=ss.getSheetByName(name);
  if (!sh) throw new Error('Tabela não encontrada: '+name);
  return sh;
}
function objetos_(name) {
  const sh=sheet_(name); const values=sh.getDataRange().getValues();
  if(values.length<2) return [];
  const headers=values[0];
  return values.slice(1).filter(function(r){return r.some(function(v){return v!=='' && v!==null;});})
    .map(function(r){const o={}; headers.forEach(function(h,i){o[h]=r[i] instanceof Date ? r[i].toISOString() : r[i];}); return o;});
}
function auditoria_(s,acao,entidade,id,detalhes) {
  try { sheet_(FT.SHEETS.AUDIT).appendRow([new Date(),s&&s.id||'',s&&s.login||'',acao,entidade,id,detalhes]); } catch(e) { console.error(e); }
}
function gerarSenhaTemporaria_() {
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out='';
  for(let i=0;i<20;i++) out+=chars.charAt(Math.floor(Math.random()*chars.length));
  return out;
}
function hashSenha_(password,salt) {
  const bytes=Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,String(salt)+'::'+String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(bytes);
}
function validarSenhaNova_(p) {
  if(typeof p!=='string'||p.length<FT.PASSWORD_MIN_LENGTH) throw new Error('Use no mínimo '+FT.PASSWORD_MIN_LENGTH+' caracteres na nova senha.');
  if(!/[a-z]/.test(p)||!/[A-Z]/.test(p)||!/[0-9]/.test(p)) throw new Error('A senha deve conter letras maiúsculas, minúsculas e números.');
}
function normalizarLogin_(v){return String(v||'').trim().toLowerCase();}
function normalizarTexto_(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
function somenteDigitos_(v){return String(v||'').replace(/\D/g,'');}
function normalizarPlaca_(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'');}
function validarPlaca_(p){return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p);}
function validarCpf_(cpf){
  if(!/^\d{11}$/.test(cpf)||/^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma+=Number(cpf[i])*(10-i);
  let d1=(soma*10)%11; if(d1===10)d1=0; if(d1!==Number(cpf[9]))return false;
  soma=0; for(let j=0;j<10;j++)soma+=Number(cpf[j])*(11-j);
  let d2=(soma*10)%11; if(d2===10)d2=0; return d2===Number(cpf[10]);
}
function mascararCpf_(v){const d=somenteDigitos_(v);return d.length===11?'***.***.'+d.slice(6,9)+'-'+d.slice(9):'';}
function textoSeguro_(v,max,label,required){
  const s=String(v==null?'':v).trim();
  if(required&&!s) throw new Error('Informe '+label+'.');
  if(s.length>max) throw new Error(label+' ultrapassa '+max+' caracteres.');
  return s;
}
// Retained as a small explicit marker for the new-record branch.
function idOrThrow_(id){ if(id) throw new Error('ID inesperado.'); }
