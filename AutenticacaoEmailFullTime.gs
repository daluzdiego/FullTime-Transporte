/**
 * FULL TIME — Autenticação por e-mail e recuperação de senha
 * Executar FT_AUTH_prepararAutenticacaoEmail() uma vez na base interna.
 */
const FT_AUTH_CFG_20261110 = Object.freeze({
  USER_EXTRA_HEADERS: ['EMAIL','MOTORISTA_ID'],
  RESET_SHEET: 'RECUPERACAO_SENHA',
  RESET_HEADERS: ['ID','USUARIO_ID','TOKEN_HASH','CRIADO_EM','EXPIRA_EM','USADO_EM','SOLICITADO_IP'],
  RESET_TTL_MINUTES: 30
});

function FT_AUTH_headerMap_(sh) {
  const headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0], map={};
  headers.forEach((v,i)=>{const k=String(v||'').trim().toUpperCase();if(k&&!Object.prototype.hasOwnProperty.call(map,k))map[k]=i;});
  return map;
}
function FT_AUTH_ensureUserHeaders_(sh) {
  const width=sh.getLastColumn(), current=width?sh.getRange(1,1,1,width).getDisplayValues()[0]:[];
  const have=new Set(current.map(v=>String(v||'').trim().toUpperCase()));
  const missing=FT_AUTH_CFG_20261110.USER_EXTRA_HEADERS.filter(v=>!have.has(v));
  if(missing.length)sh.getRange(1,width+1,1,missing.length).setValues([missing]);
  return FT_AUTH_headerMap_(sh);
}
function FT_AUTH_ensureResetSheet_() {
  const ss=SpreadsheetApp.openById(getDbId_());
  let sh=ss.getSheetByName(FT_AUTH_CFG_20261110.RESET_SHEET);
  if(!sh){sh=ss.insertSheet(FT_AUTH_CFG_20261110.RESET_SHEET);sh.getRange(1,1,1,FT_AUTH_CFG_20261110.RESET_HEADERS.length).setValues([FT_AUTH_CFG_20261110.RESET_HEADERS]);sh.setFrozenRows(1);}
  const have=new Set(sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim().toUpperCase()));
  const missing=FT_AUTH_CFG_20261110.RESET_HEADERS.filter(v=>!have.has(v));
  if(missing.length)sh.getRange(1,sh.getLastColumn()+1,1,missing.length).setValues([missing]);
  return sh;
}
function FT_AUTH_hashToken_(token) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(token),Utilities.Charset.UTF_8));
}
function FT_AUTH_email_(v) {
  const email=String(v||'').trim().toLowerCase();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))throw new Error('Endereço de e-mail inválido.');
  return email;
}
/** Migração aditiva da autenticação; não altera senhas nem remove colunas. */
function FT_AUTH_prepararAutenticacaoEmail() {
  const users=getSheet_('USUARIOS'), map=FT_AUTH_ensureUserHeaders_(users), reset=FT_AUTH_ensureResetSheet_();
  return {ok:true,usuariosColunas:Object.keys(map),guiaRecuperacao:reset.getName(),mensagem:'Estrutura pronta. Cadastre e-mails reais dos administradores antes de liberar o login por e-mail.'};
}
/** Vincula e-mail a um administrador existente usando o login legado como identificador. */
function FT_AUTH_vincularEmailAdmin(loginLegado,email) {
  const sh=getSheet_('USUARIOS'),map=FT_AUTH_ensureUserHeaders_(sh),values=sh.getDataRange().getValues();
  const legacy=String(loginLegado||'').trim().toLowerCase(), address=FT_AUTH_email_(email);
  const row=values.findIndex((r,i)=>i>0&&String(r[map.LOGIN]||'').trim().toLowerCase()===legacy&&String(r[map.PERFIL]||'').toUpperCase()==='ADMIN');
  if(row<1)throw new Error('Administrador legado não encontrado.');
  const conflict=values.some((r,i)=>i>0&&i!==row&&String(r[map.EMAIL]||'').trim().toLowerCase()===address);
  if(conflict)throw new Error('Este e-mail já está vinculado a outro usuário.');
  sh.getRange(row+1,map.EMAIL+1).setValue(address);
  return {ok:true,loginLegado:loginLegado,email:address,mensagem:'E-mail vinculado. O login será feito por este endereço.'};
}
/** Cria usuários de homologação para motoristas sincronizados com e-mails .test. */
function FT_AUTH_criarUsuariosMotoristasTeste() {
  const registryId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!registryId)throw new Error('Planilha operacional não conectada.');
  const drivers=ftReadBrunoRows_('MOTORISTAS');
  const sh=getSheet_('USUARIOS'),map=FT_AUTH_ensureUserHeaders_(sh),values=sh.getDataRange().getValues();
  const byEmail={};values.slice(1).forEach((r,i)=>{const e=String(r[map.EMAIL]||'').trim().toLowerCase();if(e)byEmail[e]=i+2;});
  const created=[],skipped=[];
  drivers.filter(d=>String(d.ID).indexOf('FT-TESTE-')===0).forEach(d=>{
    const email=FT_AUTH_email_(d.EMAIL);
    if(!/@example\.test$/i.test(email))throw new Error('E-mail do motorista de teste não usa domínio .test: '+email);
    if(byEmail[email]){skipped.push(email);return;}
    const salt=Utilities.getUuid(),temp=Utilities.getUuid().replace(/-/g,'')+'A9!';
    const row=new Array(sh.getLastColumn()).fill('');
    const vals={ID:Utilities.getUuid(),LOGIN:email,NOME:String(d.NOME_COMPLETO||'Motorista de teste'),PERFIL:'MOTORISTA',SALT:salt,HASH_SENHA:hashSenha_(salt,temp),ATIVO:true,TROCAR_SENHA:true,CRIADO_EM:new Date(),EMAIL:email,MOTORISTA_ID:String(d.ID)};
    Object.keys(vals).forEach(k=>{if(map[k]!==undefined)row[map[k]]=vals[k];});
    sh.appendRow(row);created.push({email:email,senhaTemporaria:temp,motoristaId:String(d.ID)});
  });
  return {ok:true,criados:created.length,jaExistiam:skipped.length,credenciaisTemporarias:created,aviso:'Contas .test não recebem e-mails. Use apenas em homologação; não são credenciais de produção.'};
}
/** Solicita link de recuperação. Resposta genérica impede enumeração de contas. */
function solicitarRecuperacaoSenhaFullTime(email) {
  email=FT_AUTH_email_(email);
  const users=getSheet_('USUARIOS'),map=FT_AUTH_ensureUserHeaders_(users),rows=users.getDataRange().getValues();
  const idx=rows.findIndex((r,i)=>i>0&&String(r[map.EMAIL]||'').trim().toLowerCase()===email&&r[map.ATIVO]===true);
  const generic={ok:true,message:'Se o e-mail estiver cadastrado e ativo, enviaremos um link de recuperação.'};
  if(idx<1)return generic;
  const user=rows[idx],now=new Date(),token=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
  const reset=FT_AUTH_ensureResetSheet_(),rmap=FT_AUTH_headerMap_(reset);
  const row=new Array(reset.getLastColumn()).fill('');
  const vals={ID:Utilities.getUuid(),USUARIO_ID:String(user[map.ID]),TOKEN_HASH:FT_AUTH_hashToken_(token),CRIADO_EM:now,EXPIRA_EM:new Date(now.getTime()+FT_AUTH_CFG_20261110.RESET_TTL_MINUTES*60000),USADO_EM:'',SOLICITADO_IP:''};
  Object.keys(vals).forEach(k=>{if(rmap[k]!==undefined)row[rmap[k]]=vals[k];});
  reset.appendRow(row);
  const base=ScriptApp.getService().getUrl();
  if(!base)throw new Error('Publique o aplicativo como Web App antes de enviar links de recuperação.');
  const url=base+'?reset='+encodeURIComponent(token);
  MailApp.sendEmail({to:email,subject:'Full Time — recuperação de senha',body:'Olá, '+String(user[map.NOME]||'')+'.\n\nUse o link abaixo para cadastrar uma nova senha. O link expira em 30 minutos e só pode ser usado uma vez.\n\n'+url+'\n\nSe você não solicitou esta alteração, ignore esta mensagem.',htmlBody:'<p>Olá, '+String(user[map.NOME]||'')+'.</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="'+url+'">Cadastrar nova senha</a></p><p>O link expira em 30 minutos e só pode ser usado uma vez.</p><p>Se não solicitou, ignore esta mensagem.</p>'});
  return generic;
}
/** Consome token único e grava hash+salt; revoga sessões anteriores do usuário por troca de senha. */
function redefinirSenhaPorTokenFullTime(token,novaSenha) {
  token=String(token||'');novaSenha=String(novaSenha||'');
  if(token.length<40)throw new Error('Link de recuperação inválido ou expirado.');
  if(novaSenha.length<10)throw new Error('Use uma senha com pelo menos 10 caracteres.');
  const sh=FT_AUTH_ensureResetSheet_(),map=FT_AUTH_headerMap_(sh),rows=sh.getDataRange().getValues(),hash=FT_AUTH_hashToken_(token);
  let idx=-1;
  for(let i=rows.length-1;i>0;i--)if(String(rows[i][map.TOKEN_HASH]||'')===hash){idx=i;break;}
  if(idx<1)throw new Error('Link de recuperação inválido ou expirado.');
  const used=rows[idx][map.USADO_EM],expires=rows[idx][map.EXPIRA_EM] instanceof Date?rows[idx][map.EXPIRA_EM]:new Date(rows[idx][map.EXPIRA_EM]);
  if(used)throw new Error('Este link já foi utilizado. Solicite outro.');
  if(!isFinite(expires.getTime())||expires.getTime()<Date.now())throw new Error('Link expirado. Solicite uma nova recuperação.');
  const users=getSheet_('USUARIOS'),umap=FT_AUTH_ensureUserHeaders_(users),urows=users.getDataRange().getValues();
  const userIndex=urows.findIndex((r,i)=>i>0&&String(r[umap.ID])===String(rows[idx][map.USUARIO_ID]));
  if(userIndex<1)throw new Error('Usuário não encontrado ou inativo.');
  const salt=Utilities.getUuid(),userRow=userIndex+1;
  users.getRange(userRow,umap.SALT+1,1,2).setValues([[salt,hashSenha_(salt,novaSenha)]]);
  users.getRange(userRow,umap.TROCAR_SENHA+1).setValue(false);
  sh.getRange(idx+1,map.USADO_EM+1).setValue(new Date());
  const session={login:String(urows[userIndex][umap.EMAIL]||''),nome:String(urows[userIndex][umap.NOME]||'')};
  auditar_(session,'RECUPERACAO_SENHA','USUARIO',String(urows[userIndex][umap.ID]),'Senha redefinida por link de uso único.');
  return {ok:true,message:'Senha redefinida com sucesso. Entre usando seu e-mail e a nova senha.'};
}
