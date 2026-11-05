/**
 * Instalação explícita do gatilho de expiração de ofertas.
 * Não é executado automaticamente pela implantação.
 *
 * Para instalar, execute no editor:
 * instalarGatilhoExpiracaoOfertasFullTime('ATIVAR_GATILHO_FULLTIME')
 *
 * Para remover:
 * removerGatilhoExpiracaoOfertasFullTime('REMOVER_GATILHO_FULLTIME')
 */
function instalarGatilhoExpiracaoOfertasFullTime(confirmacao) {
  if(confirmacao!=='ATIVAR_GATILHO_FULLTIME')throw new Error('Confirmação inválida. Nenhum gatilho foi alterado.');
  const registryId=PropertiesService.getScriptProperties().getProperty('FT_REGISTRY_DATABASE_ID');
  if(!registryId)throw new Error('FT_REGISTRY_DATABASE_ID não configurado. Valide o ambiente antes de instalar o gatilho.');
  if(typeof processarOfertasExpiradasSistema_!=='function')throw new Error('Handler processarOfertasExpiradasSistema_ não encontrado.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const existing=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processarOfertasExpiradasSistema_');
    const created=ScriptApp.newTrigger('processarOfertasExpiradasSistema_').timeBased().everyMinutes(5).create();
    existing.forEach(t=>ScriptApp.deleteTrigger(t));
    const result={ok:true,handler:'processarOfertasExpiradasSistema_',intervaloMinutos:5,duplicadosRemovidos:existing.length};
    Logger.log('FULL TIME — GATILHO DE EXPIRAÇÃO INSTALADO: '+JSON.stringify(result));
    return result;
  }finally{lock.releaseLock();}
}

function removerGatilhoExpiracaoOfertasFullTime(confirmacao) {
  if(confirmacao!=='REMOVER_GATILHO_FULLTIME')throw new Error('Confirmação inválida. Nenhum gatilho foi removido.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const existing=ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processarOfertasExpiradasSistema_');
    existing.forEach(t=>ScriptApp.deleteTrigger(t));
    const result={ok:true,removidos:existing.length};
    Logger.log('FULL TIME — GATILHO DE EXPIRAÇÃO REMOVIDO: '+JSON.stringify(result));
    return result;
  }finally{lock.releaseLock();}
}
