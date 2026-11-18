/**
 * FULL TIME — DESATIVADO
 *
 * A arquitetura atual não utiliza mais uma planilha externa de cadastro do Bruno.
 * O cadastro e a gestão de motoristas e frota são feitos diretamente na base
 * operacional central identificada por FT_REGISTRY_DATABASE_ID.
 *
 * Este arquivo permanece temporariamente como bloqueio de segurança para evitar
 * que funções antigas com IDs fixos de produção sejam executadas por engano.
 *
 * NÃO reativar a integração antiga. Para cadastro, utilizar os módulos atuais
 * de CadastroMotoristasFullTime.gs e Code.gs.
 */

function configurarIntegracaoCadastroBrunoFullTime() {
  throw new Error('Integração antiga desativada. O cadastro agora é centralizado no Full Time.');
}

function sincronizarCadastroBrunoFullTime() {
  throw new Error('Sincronização antiga desativada. Não existe mais planilha externa do Bruno na arquitetura vigente.');
}

function criarFormularioMotoristasFullTime() {
  throw new Error('Formulário legado da integração Bruno desativado. Utilize o fluxo de cadastro central do Full Time.');
}
