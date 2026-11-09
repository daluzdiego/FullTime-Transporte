# Matriz de autorização e superfície pública — FullTime

> Revisão estática de `Code.gs` na branch `feat/multiempresa-foundation`. Não é certificação de segurança. A presença de validação de token não prova autorização correta em nível de empresa; o código atual ainda opera sobre base global.

## 1. Critérios usados

- **Token validado:** a função chama `obterSessao_(token)`.
- **Admin validado:** além da sessão, chama `exigirAdmin_(session)`.
- **Leitura/escrita:** inferida por acesso a planilhas e operações de gravação no corpo da função.
- **UI:** chamada direta identificada em `Index.html`.
- **Tenant:** nenhuma função operacional analisada valida associação a `tenantId`; não há escopo multiempresa efetivo na sessão nem no repositório.

Classificações:
- **A — manter como endpoint autenticado:** tem token e valida perfil ADMIN ou sessão motorista. Ainda requer tenant e permissão granular.
- **B — proteger antes de expor:** função global de escrita/setup sem sessão ou endpoint público com comportamento sensível.
- **C — utilitário/teste:** função pura ou teste sem acesso persistente. Preferir mover para módulo privado/test runner.
- **D — legado/stub:** função que só lança erro; remover após confirmar ausência de consumidores.
- **E — rota de entrada:** `doGet`/login; não se protege com token prévio, mas precisa de controles próprios.

## 2. Matriz das funções globais

| Função | Linha | Token | Admin | Leitura/escrita observada | UI | Classe / ação |
|---|---:|---|---|---|---|---|
| `doGet(e)` | 20 | — | — | Renderiza HTML; verifica desafio de webhook | Entrada | E — revisar verificação do webhook e política de publicação |
| `configurarSistemaFullTime()` | 37 | Não | Não | Cria planilha e usuários iniciais | Não | B — execução manual isolada, nunca endpoint do Web App |
| `abrirBaseFullTime()` | 76 | Não | Não | Retorna URL da base | Não | B — manual/admin; não expor publicamente |
| `loginFullTime(login,senha)` | 80 | Login | — | Lê USUARIOS e cria sessão | Sim | E — adicionar limitação de tentativas e rever credenciais/sessões |
| `criarAcessoMotoristaFullTime` | 105 | Sim | Sim | Lê MOTORISTAS; grava USUARIOS | Sim | A — acrescentar tenant e permissão específica |
| `obterPainelMotoristaFullTime` | 132 | Sim | Perfil MOTORISTA | Lê motorista, frota, operações, participações, viagens e ofertas | Sim | A — manter escopo próprio + tenant em todas as leituras |
| `testarRegressaoEscopoPortalMotoristaFullTime` | 199 | Não | Não | Teste em memória | Não | C — transferir para suíte automatizada |
| `encerrarSessaoFullTime` | 263 | Sim | Não | Remove sessão do cache | Sim | A — manter |
| `trocarSenhaInicial` | 270 | Sim | Não | Atualiza hash/salt em USUARIOS | Sim | A — confirmar usuário da sessão e tenant |
| `obterPainelFullTime` | 286 | Sim | Sim | Lê painel de múltiplas guias | Sim | A — tenant obrigatório em cada repositório |
| `salvarClienteFullTime` | 344 | Sim | Sim | Grava CLIENTES | Sim | A — tenant, validação e permissão |
| `salvarMotoristaFullTime` | 359 | Sim | Sim | Grava MOTORISTAS | Sim | A — tenant, validação e permissão |
| `salvarCaminhaoFullTime` | 383 | Não | Não | Stub que lança erro | Não | D — remover após busca de consumidores |
| `importarCaminhoesCsvFullTime` | 385 | Não | Não | Stub que lança erro | Não | D — remover após busca de consumidores |
| `prepararGuiasEscalaFullTime` | 387 | Não | Não | Cria/valida guias operacionais | Não | B — manual-only com confirmação e backup |
| `migrarCabecalhoViagensOperacoesFullTime` | 429 | Sim | Sim | Altera cabeçalho OPERACOES com confirmação | Não | A/B — endpoint de migração deve ser desabilitado no produto e executado em rotina controlada |
| `migrarCabecalhoTicketsViagemFullTime` | 451 | Sim | Sim | Altera cabeçalho TICKETS e adiciona coluna | Não | A/B — mesma restrição de migração |
| `prepararBaseOperacionalFullTime` | 466 | Não | Não | Cria/expande diversas guias | Não | B — manual-only; hoje é uma escrita sem autorização na função |
| `salvarCargaFullTime` | 516 | Não | Não | Stub que lança erro | Não | D — remover após busca de consumidores |
| `salvarCavaloFullTime` | 518 | Sim | Sim | Grava CAVALOS | Não | A — tenant + permissão; sem uso direto pela UI atual |
| `salvarCarretaFullTime` | 545 | Sim | Sim | Grava CARRETAS | Não | A — tenant + permissão; sem uso direto pela UI atual |
| `salvarConjuntoVeicularFullTime` | 567 | Sim | Sim | Lê CAVALOS; grava CONJUNTOS | Sim | A — tenant em leitura e escrita |
| `atualizarCadastroFullTime` | 670 | Sim | Sim | Atualiza cadastro conforme entidade | Não | A — validar allowlist de entidades/colunas e tenant |
| `atualizarComposicaoConjuntoFullTime` | 710 | Sim | Sim | Atualiza CONJUNTOS | Não | A — tenant + permissão |
| `calcularViagensMinimasFullTime` | 737 | Não | Não | Cálculo puro | Não | C — mover para módulo privado/testes |
| `validarMetaViagensFullTime` | 743 | Não | Não | Validação pura | Não | C — mover para módulo privado/testes |
| `testarFuncoesPurasFullTime` | 755 | Não | Não | Teste em memória | Não | C — transferir para suíte automatizada |
| `atualizarStatusFullTime` | 816 | Sim | Sim | Atualiza status de MOTORISTAS ou outra entidade permitida | Sim | A — tenant + allowlist + permissão |
| `testarRegressaoStatusPorCabecalhoFullTime` | 963 | Não | Não | Teste em memória | Não | C — transferir para suíte automatizada |
| `calcularAssiduidadeMotoristaFullTime` | 1026 | Não | Não | Cálculo sobre dados recebidos | Não | C — mover para módulo privado/testes; não recebe dados diretamente da planilha |
| `testarRegressaoAssiduidadeFullTime` | 1077 | Não | Não | Teste em memória | Não | C — transferir para suíte automatizada |
| `ordenarElegiveisEscalaFullTime` | 1118 | Não | Não | Ordenação em memória | Não | C — mover para módulo privado/testes |
| `recusaAplicaSomenteOperacaoAtualFullTime` | 1171 | Não | Não | Regra pura | Não | C — mover para módulo privado/testes |
| `contarOperacoesDistintasUltimos30DiasFullTime` | 1177 | Não | Não | Cálculo em memória | Não | C — mover para módulo privado/testes |
| `motoristasSemConfirmacaoDiariaFullTime` | 1193 | Não | Não | Cálculo em memória | Não | C — mover para módulo privado/testes |
| `listarOperacoesFullTime` | 1211 | Sim | Sim | Lê OPERACOES | Não | A — tenant + permissão; não usado diretamente pela UI |
| `salvarOperacaoFullTime` | 1218 | Sim | Sim | Lê CLIENTES; grava OPERACOES | Sim | A — tenant + validação de dados relacionados |
| `registrarMovimentacaoOperacaoFullTime` | 1246 | Não | Não | Corpo atual é stub/lança erro? | Não | B/D — confirmar corpo integral e retirar de exposição se legado |
| `validarPlanejamentoOperacaoFullTime` | 1258 | Sim | Sim | Lê operação, participações, conjuntos e motoristas | Sim | A — tenant em todas as leituras |
| `iniciarViagemFullTime` | 1287 | Sim | Sim | Lê e grava operações, participações, viagens e conjuntos | Sim | A — tenant + transação/idempotência |
| `replanejarOperacaoFullTime` | 1343 | Sim | Sim | Lê e atualiza operação/participação/conjunto | Sim | A — tenant + auditoria |
| `registrarEventoViagemFullTime` | 1372 | Sim | Sim | Atualiza VIAGENS | Sim | A — tenant + validar transição de estado |
| `interromperViagemFullTime` | 1396 | Sim | Sim | Atualiza VIAGENS | Sim | A — tenant + validar transição |
| `retomarViagemFullTime` | 1419 | Sim | Sim | Atualiza VIAGENS | Sim | A — tenant + validar transição |
| `cancelarViagemFullTime` | 1441 | Sim | Sim | Atualiza VIAGENS | Sim | A — tenant + validar transição |
| `concluirViagemFullTime` | 1460 | Sim | Sim | Atualiza viagem, conjunto, operação e participação | Sim | A — tenant + atomicidade/idempotência |
| `alterarEstadoConjuntoFullTime` | 1498 | Sim | Sim | Atualiza CONJUNTOS | Não | A — tenant + permissão |
| `remanejarConjuntoOperacaoFullTime` | 1509 | Sim | Sim | Lê operação/participação; grava movimentação | Não | A — tenant + regra de remanejamento |
| `retornarConjuntoOperacaoFullTime` | 1524 | Sim | Sim | Atualiza PARTICIPACAO_OPERACOES | Não | A — tenant + regra de retorno |
| `designarConjuntoOperacaoFullTime` | 1536 | Sim | Sim | Lê operação/conjunto/motorista; grava participação | Sim | A — tenant + validação de capacidade/duplicidade |
| `ordenarCandidatosOperacaoFullTime` | 1574 | Sim | Sim | Consulta elegibilidade | Sim | A — tenant + regras configuráveis por empresa |

## 3. Helpers privados (sufixo `_`)

Os 32 helpers com sufixo `_` não são endpoints chamados diretamente pelo navegador no mapeamento. Principais grupos:

- **Sessão e autorização:** `obterSessao_`, `exigirAdmin_`.
- **Persistência global:** `getDbId_`, `getSheet_`, `listarRegistros_`, `ftGetStatusControlSheet_`, `ftSaveStatusOverride_`, `ftReadStatusOverrides_`.
- **Auditoria/identidade:** `auditar_`, `hashSenha_`, `criarAdminInicial_`.
- **Dados operacionais:** `ftHeaderMapViagens_`, `ftAppendEventoViagem_`, `ftReadBrunoRows_`, `ftBrunoRowsAsLegacy_`.
- **Validação/normalização:** `texto_`, `digitos_`, `cpfValido_`, `normalizarPlaca_`, `ftNormHeader_`, `ftExigirUnicidadeCadastro_`.
- **Cálculos e apoio:** `ftStatusColumnIndex_`, `ftContarPorStatus_`, `contarAtivos_`, `contarStatus_`, `duplicado_`, `getLoginBackground_`, `ftGetOrCreateLocalOperacao_`, `ftGetOrCreateClienteSolicitacao_`, `obterHistoricoAssiduidadeFullTime_`, `listarCargasFullTime_`, `ftFiltrarDadosPortalMotorista_`.

O sufixo `_` é convenção de função privada no Apps Script para impedir chamada direta por `google.script.run`; ainda assim, os helpers devem ser revisados quanto a seus chamadores e efeitos colaterais.

## 4. Matriz de permissões proposta (não implementada)

| Papel | Acesso proposto |
|---|---|
| Plataforma / suporte Feeds | Acesso técnico excepcional, auditado e com escopo explícito; sem acesso operacional permanente por padrão |
| Proprietário da empresa (tenant admin) | Configura empresa, usuários e permissões; acessa todos os dados do próprio tenant |
| Gestor operacional | Cadastros operacionais, operações, escalas, viagens e relatórios conforme permissões atribuídas |
| Operador | Executa ações operacionais autorizadas; não gerencia usuários/configuração |
| Motorista | Somente seu perfil, conjunto vinculado, participações, viagens e ofertas destinadas a ele |
| Auditor/consulta | Leitura autorizada dentro do tenant; sem escrita |

A matriz é uma proposta de desenho, não uma regra confirmada pelo cliente. Permissões finais devem ser validadas no levantamento de requisitos.

## 5. Controles obrigatórios antes de produção

1. Incluir `tenantId` na identidade/sessão, resolvido no backend após autenticação e membership.
2. Exigir tenant em todo repositório; proibir consultas globais em entidades de negócio.
3. Validar que IDs recebidos pertencem ao tenant ativo antes de ler ou alterar.
4. Implementar autorização por ação, não apenas `perfil === ADMIN`.
5. Desativar ou tornar manual-only setup, migrações e rotinas de manutenção.
6. Aplicar rate limit/retardo progressivo ao login e revisar armazenamento de senha e expiração/rotação de sessão.
7. Definir auditoria imutável de ações sensíveis.
8. Criar testes negativos: token ausente/expirado, papel insuficiente, ID de outro tenant, ID de outro motorista, tenant adulterado no navegador, duplicidade e concorrência.
9. Fazer revisão independente das políticas RLS e testar com papel de banco sem privilégios de bypass.

## 6. Próxima implementação de teste (gratuita)

- Extrair regras puras para módulos testáveis em Node.js.
- Usar `node:test` ou Vitest sem serviços pagos.
- Criar fixtures fictícias para Empresa A e Empresa B.
- Testar autorização e isolamento no repositório antes de qualquer migração real.
- Manter testes Apps Script em sandbox separado; não executar rotinas de preparação em planilhas reais.

## 7. Limitações desta revisão

- Análise estática; nenhum teste de execução foi realizado.
- O corpo de cada função foi classificado por padrões de chamada e operações de planilha; chamadas indiretas por helpers podem ampliar o conjunto real de efeitos.
- Não foram inspecionadas configurações de implantação, permissões OAuth, gatilhos instalados, bibliotecas ou outros arquivos Apps Script.
- A classificação de `registrarMovimentacaoOperacaoFullTime` deve ser confirmada lendo seu corpo completo antes de removê-la.
- Nenhuma alteração foi feita em dados ou planilhas do Bruno.
