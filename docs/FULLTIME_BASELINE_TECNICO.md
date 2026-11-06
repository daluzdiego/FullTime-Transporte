# Full Time — baseline técnico da branch multicanal

**Branch:** `feat/arquitetura-multicanal-sem-planilha-bruno`  
**Auditoria:** leitura estática dos arquivos versionados nesta branch.  
**Escopo:** código do repositório; não inclui execução no Apps Script, propriedades, gatilhos, planilhas implantadas ou provedores externos.

## 1. Resultado executivo

A branch já possui uma base funcional relevante para autenticação, cadastros, cargas, operações e triagem de solicitações. Porém, ainda não está pronta para operar de forma autônoma e multicanal. A arquitetura aprovada ainda não está implementada no código.

**Não publicar esta branch como versão de produção antes de concluir a migração dos cadastros, remover dependências de sincronização externa e homologar o fluxo de entrada.**

## 2. O que já existe no código

- Aplicação web em Apps Script com login, sessão e troca obrigatória de senha inicial.
- Base interna para usuários e auditoria.
- Base operacional em planilha identificada por propriedade de script.
- Estruturas para motoristas, caminhões, cavalos, carretas, conjuntos, locais, operações, cargas, escalas, tickets e eventos.
- Cadastro de motoristas/caminhões e importação CSV.
- Tela de entrada manual de solicitações.
- Núcleo de triagem que registra mensagem original, canal, remetente, dados extraídos, pendências e histórico.
- Interpretação por IA em arquivo separado.
- Revisão humana, aprovação e conversão idempotente de solicitação aprovada em carga, com vínculo de origem.

## 3. Bloqueios e divergências identificados

### B1 — Dependência funcional dos cadastros sincronizados do Bruno

Em `Code.gs`, funções como `listarRegistros_`, `contarAtivos_`, `contarStatus_` e o painel consultam `ftBrunoRowsAsLegacy_` para MOTORISTAS, CAVALOS, CARRETAS, CONJUNTOS e DOCUMENTOS. O adaptador lê guias `FT_CADASTRO_BRUNO_*` dentro da planilha operacional.

Isso significa que a tela ainda pode depender dos espelhos sincronizados, mesmo quando existem guias nativas. A migração precisa definir uma fonte nativa única por entidade, preservar IDs e vínculos e só então remover os leitores antigos.

### B2 — Integrações antigas ainda presentes

`IntegracaoCadastroBruno.gs` contém rotinas de leitura e sincronização da planilha externa, criação de gatilho e rotinas auxiliares. `PLANILHABRUNO-sincronizacao.gs` contém sincronização aditiva de lote de teste. Esses arquivos não devem ser executados no novo fluxo. Não os apagar ainda: primeiro identificar chamadas, gatilhos instalados e dependências de implantação.

### B3 — Canais externos não estão conectados

- A tela permite registrar manualmente mensagens e escolher o canal de origem.
- `diagnosticarNucleoSolicitacoesFullTime()` declara explicitamente `webhookAtivo: false`.
- Não foi encontrado, nesta auditoria estática, adaptador operacional de recebimento de e-mail.
- O tratamento de WhatsApp ainda não constitui um webhook de produção validado.
- O campo de canal da tela ainda cita “WhatsApp pessoal do Bruno”, divergindo da decisão de independência do Bruno.

### B4 — Fila durável ainda não demonstrada

O núcleo de solicitações grava registros na base e usa trava para operações concorrentes, mas não foi identificado um worker de fila durável com lease, tentativas, backoff, recuperação automática e fila de exceções. O campo de status, sozinho, não substitui uma fila recuperável.

### B5 — Persistência e implantação precisam de baseline

O repositório não permite confirmar quais propriedades estão configuradas no projeto Apps Script ativo, quais gatilhos existem, qual versão está implantada, quais guias já existem na base conectada ou se há cópias divergentes. Não executar inicializadores ou funções de migração sem essa conferência.

### B6 — Dados fictícios ainda precisam de isolamento formal

Há uma função `inserirDadosFakeFullTime()` que grava cinco motoristas e cinco caminhões fictícios em uma planilha configurada. Ela depende de `FT_REGISTRY_DATABASE_ID` e não deve ser executada até confirmar o ID da base de teste. Os registros usam prefixo `TESTE-FT-` e status `PENDENTE_REVISAO`, mas isso não substitui um ambiente de teste isolado.

## 4. Arquivos prioritários

| Arquivo | Papel atual | Próxima ação |
|---|---|---|
| `Code.gs` | Base, autenticação, cadastros, operações e adaptador legado | Mapear contratos e substituir leitores legados por repositórios nativos |
| `SolicitacoesFullTime.gs` | Persistência, triagem, aprovação e conversão | Evoluir para envelope canônico, idempotência multicanal e fila recuperável |
| `InterpretacaoSolicitacoesFullTime.gs` | Interpretação por IA | Tornar processamento assíncrono e tolerante à indisponibilidade de IA |
| `Index.html` | Interface e navegação | Atualizar canais e menu depois de garantir que cada rota tenha função real |
| `IntegracaoCadastroBruno.gs` | Integração antiga | Congelar e desativar somente após prova de ausência de dependências |
| `PLANILHABRUNO-sincronizacao.gs` | Sincronização antiga | Congelar; não executar na nova arquitetura |

## 5. Sequência de implementação técnica

1. **Congelar rotinas antigas:** não executar sincronização nem gatilhos Bruno durante o desenvolvimento.
2. **Definir o banco nativo:** comparar os cabeçalhos reais das guias já existentes com os contratos usados pelo código; não criar guias duplicadas.
3. **Migrar leitura de cadastros:** fazer MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS lerem exclusivamente a base nativa do Full Time; preservar os vínculos por IDs.
4. **Adicionar modo de teste:** validar que o projeto de teste usa somente a base de teste e rejeita dados sem identificador fictício nos testes automatizados.
5. **Fortalecer entrada:** envelope canônico, armazenamento original, anexos, deduplicação, fila persistente, tentativas e auditoria.
6. **Conectar canais individualmente:** painel, e-mail e WhatsApp, cada um com health check e teste de falha isolada.
7. **Homologar operações:** solicitação → revisão → aprovação → carga → alocação → viagem → comprovantes → encerramento.
8. **Atualizar navegação e UX:** exibir apenas módulos implementados e seus estados reais.

## 6. Testes mínimos de aceite

- Painel continua recebendo solicitações quando WhatsApp e e-mail estão desligados.
- E-mail continua recebendo solicitações quando WhatsApp está desligado.
- WhatsApp continua recebendo solicitações quando e-mail está desligado.
- Falha da IA mantém o envelope armazenado e disponível para revisão manual.
- Reentrega do mesmo evento não duplica solicitação nem carga.
- Uma mesma solicitação recebida por dois canais é vinculada ao mesmo caso, sem apagar as duas evidências.
- Cadastro e edição de motorista/conjunto não consultam a planilha do Bruno.
- Reprocessamento não aprova nem converte automaticamente uma solicitação.
- Nenhuma rotina de teste altera dados reais ou a guia protegida `CAVALOS-BRUNO`.

## 7. Limites desta auditoria

Esta análise foi feita sobre o conteúdo versionado na branch. Ela não executou Apps Script nem acessou planilhas, propriedades, gatilhos, caixa postal ou conta de WhatsApp. Portanto, nenhum resultado aqui afirma que o ambiente implantado esteja configurado ou homologado.

**Próximo marco:** concluir a migração dos cadastros para a base nativa do Full Time, pois a dependência de espelhos externos afeta painel, cadastros e contagens e é o principal bloqueio para autonomia.
