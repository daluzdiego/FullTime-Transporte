# Mapa da API e dependências — FullTime

> Auditoria estática da branch `feat/multiempresa-foundation`. Este documento descreve o código encontrado; não representa homologação funcional nem certificação de segurança.

## Escopo e método

- Arquivos analisados: `Code.gs` (blob `825383f5510aadb42be7329a2d59f9d60e6e93c5`) e `Index.html` (blob `5fe958cb62bdcaedaf4f32c354718e5569091ebb`).
- Foram identificadas 86 declarações de função em `Code.gs`: 54 nomes globais sem sufixo `_` e 32 helpers com sufixo `_`.
- O HTML referencia diretamente 21 funções do backend (22 ocorrências, porque `obterPainelFullTime` é chamado em vários fluxos).
- A contagem é estática, por nome de função. Não substitui execução, análise de fluxo completa ou inspeção de permissões do projeto Apps Script.

## 1. Endpoints chamados pela interface

| Função | Argumentos declarados | Linha em Code.gs | Uso observado |
|---|---|---:|---|
| `loginFullTime` | login, senha | 80 | Autenticação inicial |
| `criarAcessoMotoristaFullTime` | token, motoristaId, login | 105 | Criar credencial de motorista |
| `obterPainelMotoristaFullTime` | token | 132 | Carregar/atualizar portal do motorista |
| `encerrarSessaoFullTime` | token | 263 | Logout |
| `trocarSenhaInicial` | token, novaSenha | 270 | Troca de senha |
| `obterPainelFullTime` | token | 286 | Carregar painel administrativo |
| `salvarClienteFullTime` | token, data | 344 | Cadastro de cliente |
| `salvarMotoristaFullTime` | token, data | 359 | Cadastro de motorista |
| `salvarConjuntoVeicularFullTime` | token, data | 567 | Cadastro de conjunto |
| `atualizarStatusFullTime` | token, entidade, id, status | 816 | Alterar status |
| `salvarOperacaoFullTime` | token, data | 1218 | Criar operação |
| `validarPlanejamentoOperacaoFullTime` | token, operacaoId | 1258 | Validar distribuição do plano |
| `iniciarViagemFullTime` | token, dados | 1287 | Iniciar viagem |
| `replanejarOperacaoFullTime` | token, dados | 1343 | Acrescentar viagens ao plano |
| `registrarEventoViagemFullTime` | token, dados | 1372 | Registrar evento operacional |
| `interromperViagemFullTime` | token, dados | 1396 | Interromper viagem |
| `retomarViagemFullTime` | token, dados | 1419 | Retomar viagem |
| `cancelarViagemFullTime` | token, dados | 1441 | Cancelar viagem |
| `concluirViagemFullTime` | token, dados | 1460 | Concluir viagem |
| `designarConjuntoOperacaoFullTime` | token, data | 1536 | Designar conjunto à operação |
| `ordenarCandidatosOperacaoFullTime` | token, operacaoId | 1574 | Listar candidatos |

### Lacunas de cobertura da interface

Funções globais existentes que não foram encontradas como chamadas diretas no HTML:
- Cadastros/alterações: `salvarCavaloFullTime`, `salvarCarretaFullTime`, `atualizarCadastroFullTime`, `atualizarComposicaoConjuntoFullTime`.
- Operações/escala: `listarOperacoesFullTime`, `alterarEstadoConjuntoFullTime`, `remanejarConjuntoOperacaoFullTime`, `retornarConjuntoOperacaoFullTime`.
- Migrações: `migrarCabecalhoViagensOperacoesFullTime`, `migrarCabecalhoTicketsViagemFullTime`.
- Setup/legado: `configurarSistemaFullTime`, `abrirBaseFullTime`, `prepararBaseOperacionalFullTime`, `prepararGuiasEscalaFullTime`, `salvarCaminhaoFullTime`, `importarCaminhoesCsvFullTime`, `salvarCargaFullTime`, `registrarMovimentacaoOperacaoFullTime).
- Testes/funções puras: `testarRegressaoEscopoPortalMotoristaFullTime`, `testarFuncoesPurasFullTime`, `testarRegressaoStatusPorCabecalhoFullTime`, `calcularViagensMinimasFullTime`, `validarMetaViagensFullTime`, `calcularAssiduidadeMotoristaFullTime`, `testarRegressaoAssiduidadeFullTime`, `ordenarElegiveisEscalaFullTime`, `recusaAplicaSomenteOperacaoAtualFullTime`, `contarOperacoesDistintasUltimos30DiasFullTime`, `motoristasSemConfirmacaoDiariaFullTime`.

A ausência de chamada no HTML não prova que a função seja inútil: pode ser acionada manualmente pelo editor, por gatilho ou por outra integração. Cada uma precisa ser classificada antes de remoção.

## 2. Pontos críticos de segurança e integridade

### P0 — funções globais de preparação sem autenticação

- `prepararBaseOperacionalFullTime()` (linha 466) não recebe token e não valida sessão. Lê `FT_REGISTRY_DATABASE_ID`, abre a planilha e cria/expande as guias operacionais. O código tenta preservar cabeçalhos/dados existentes e falha quando encontra divergência, mas continua sendo uma operação de escrita sem autorização de usuário no próprio método.
- `prepararGuiasEscalaFullTime()` (linha 387) também não recebe token nem valida sessão. Cria guias de disponibilidade, fila, ofertas, eventos e histórico na planilha indicada por propriedade global.
- `registrarMovimentacaoOperacaoFullTime()` (linha 1246) é global e não recebe token; precisa de revisão específica antes de ser considerada endpoint ativo.
- `configurarSistemaFullTime()` (linha 37) e `abrirBaseFullTime()` (linha 76) são funções de setup/admin sem validação de sessão dentro da função. O setup cria planilha e usuários iniciais. Não devem ser expostas como ações públicas do navegador.
- `loginFullTime(login, senha)` não recebe token por ser o próprio login; requer proteção contra tentativas, revisão do hash/salt e política de sessão.

**Ação:** classificar essas rotinas como administrativas/manual-only ou protegê-las com autorização explícita e escopo tenant. Não executar setup/migração em dados reais durante os testes gratuitos.

### P0 — ausência de tenant no fluxo operacional atual

- A sessão construída em `loginFullTime` contém usuário, perfil, motoristaId e permissões, mas não contém `tenantId` ou associação validada a uma empresa.
- `getSheet_(name)` (linha 870) resolve uma base global por propriedade de script; não seleciona a base por tenant.
- `listarRegistros_(name)` (linha 883) lê registros da guia sem filtro por empresa.
- `exigirAdmin_(session)` (linha 862) verifica perfil ADMIN, não a associação do usuário ao tenant nem a permissão específica para a ação.
- `obterPainelFullTime(token)` agrega dados operacionais de várias guias globais. Portanto, o painel administrativo atual não é multiempresa isolado.
- O portal do motorista deriva o motoristaId da sessão e filtra participações/viagens próprias (linhas 132–183), o que é um controle positivo local, mas não substitui isolamento entre tenants.
- O conector `ftReadBrunoRows_(entity)` (linha 1596) utiliza nomes de propriedades/abas globais de integração; não há configuração de integração associada a tenant no trecho auditado.

**Conclusão:** o código atual é uma aplicação com base operacional global e controle parcial por perfil/motorista. Não deve ser anunciado nem usado como multi-tenant seguro antes da implementação e dos testes de isolamento.

### P1 — superfície global exposta

Apps Script permite que funções globais do projeto sejam invocadas por clientes autorizados ao Web App, conforme o contexto de implantação. Por isso, não se deve confiar apenas em “não aparece no menu” ou “não é chamada no HTML”. Revisar toda função global sem sufixo interno, em especial funções de escrita, migração e preparação.

Existem stubs legados que apenas lançam erro:
- `criarGuiasMotoristasECaminhoesNaPlanilhaInformada`
- `conectarPlanilhaOperacionalFullTime`
- `inserirDadosFakeFullTime`
- `salvarCaminhaoFullTime`
- `importarCaminhoesCsvFullTime`
- `salvarCargaFullTime`
- `listarCargasFullTime_`

Esses stubs confirmam remoção funcional de CAMINHOES/CARGAS em alguns caminhos, mas devem ser limpos ou mantidos documentados até garantir que nenhum fluxo/integração antiga dependa deles.

## 3. Dependências de plataforma identificadas

| Serviço Apps Script | Uso observado |
|---|---|
| `SpreadsheetApp` | Persistência principal, leitura/escrita de guias, criação/abertura de planilhas |
| `PropertiesService` | IDs de base e segredos/configurações globais |
| `CacheService` | Sessões com prefixo `FT_SESSION_` e TTL de 21.600 segundos |
| `LockService` | Locks de script para operações concorrentes |
| `Utilities` | UUID, hash/strings e datas auxiliares |
| `HtmlService` | Renderização do `Index` |
| `ContentService` | Resposta do desafio de verificação do webhook |
| `Session` | Contexto de usuário em integração/leitura |

Não foram encontrados usos diretos no arquivo analisado de DriveApp, GmailApp/MailApp, UrlFetchApp, CalendarApp ou ScriptApp. Isso não prova ausência de integração em outros arquivos do projeto Apps Script.

## 4. Modelo de dados operacional observado

A preparação da base cria/espera as guias:
`MOTORISTAS`, `CAVALOS`, `CARRETAS`, `CONJUNTOS`, `OPERACOES`, `CONTROLE_DOCUMENTAL`, `PARTICIPACAO_OPERACOES`, `VIAGENS`, `EVENTOS_VIAGEM`, `DOCUMENTOS_VIAGEM`, `TICKETS`, `CLIENTES`, `LOCAIS`, `REGRAS_OPERACIONAIS`, `DISPONIBILIDADE_DIARIA`, `FILA_MOTORISTAS`, `OFERTAS_OPERACOES`, `EVENTOS_OPERACAO`.

O modelo atual já relaciona operação, participação, viagem, motorista e conjunto. Não foi identificada guia separada de `CAMINHOES) ou `CARGAS` como entidade operacional ativa; há apenas stubs de compatibilidade/erro para esses nomes.

**Pendência de arquitetura:** todas as entidades operacionais precisam de tenant_id (ou isolamento equivalente no repositório) antes de suportar múltiplas empresas. O esquema atual de Sheets não implementa essa fronteira.

## 5. Ordem de trabalho recomendada

1. Congelar alterações de runtime até classificar os endpoints globais e os fluxos de escrita.
2. Criar matriz de autorização: endpoint, perfil, permissão, tenant, entidades lidas/escritas, validação de entrada e efeitos colaterais.
3. Proteger/remover endpoints globais de setup e escrita sem token; separar funções administrativas manuais do Web App.
4. Tornar autenticação e sessão tenant-aware; resolver tenant exclusivamente no backend após validar membership.
5. Substituir acesso global `getSheet_/listarRegistros_` por repositórios com tenant explícito e filtros obrigatórios.
6. Construir testes gratuitos com dois tenants fictícios, incluindo leitura, escrita, alteração de IDs, operações compartilhadas, viagens, documentos e ofertas.
7. Só então migrar dados/integrações reais, após aprovação explícita e plano de rollback.

## 6. Status desta auditoria

- [x] Inventário estático de funções do backend.
- [x] Mapeamento de chamadas diretas encontradas no HTML.
- [x] Levantamento inicial de serviços Apps Script.
- [x] Registro de riscos de autorização e isolamento.
- [ ] Matriz completa de autorização por endpoint.
- [ ] Testes automatizados executados em ambiente Apps Script.
- [ ] Testes multi-tenant com PostgreSQL/RLS.
- [ ] Homologação funcional.

**Nenhum teste de execução foi realizado nesta etapa.** A auditoria foi estática, baseada nos dois arquivos e nas linhas indicadas.
