# Checklist de testes — MVP

## Homologação sequencial — estado em 2026-11-24

**Regra de execução:** executar exatamente um teste por vez. Não iniciar o próximo até o atual apresentar o resultado esperado. Cada orientação ao operador deve conter arquivo, função, local de execução, resultado esperado e log solicitado.

### Resultados já confirmados pelo operador

- [x] **Preparação de destinos:** arquivo `MvpDestinosFullTime.gs`, função `prepararEstruturaMvpDestinosFullTime()`. Log recebido: `FT_MVP_PREPARACAO_DESTINOS {"ok":true,...,"guia":"DESTINOS_OPERACAO","colunas":13,"colunaIdDestinoAdicionada":true}`. A guia já existia e a coluna `ID_DESTINO` foi acrescentada.
- [x] **Preparação de comprovantes:** arquivo `RecibosViagemFullTime.gs`, função `prepararEstruturaRecibosViagemFullTime()`. Log recebido: `FT_RECIBOS_PREPARACAO {"ok":true,"guia":"TICKETS","colunas":29,"pastaDrive":"FULL TIME — Recibos de Viagem","pastaIdConfigurada":true,"ocr":"NAO_INCLUIDO_NESTA_ETAPA"}`. Isso confirma a preparação da guia/pasta, não a integridade de todos os cabeçalhos nem o envio real de foto.

### Próximo teste — TESTE 3: auditoria somente leitura de comprovantes

- **Arquivo:** `RecibosViagemFullTime.gs`
- **Função:** `testarEstruturaRecibosViagemFullTime()`
- **Onde executar:** editor do Apps Script; selecionar a função no seletor e clicar em Executar.
- **Tipo:** somente leitura. Não cria pasta/guia, não altera cabeçalhos e não grava linhas.
- **Resultado esperado:** log `FT_TESTE_ESTRUTURA_RECIBOS` com `ok:true`, `guiaEncontrada:true`, `cabecalhosAusentes:[]`, `duplicados:[]`, `cabecalhosVazios:[]` e `pastaDriveAcessivel:true`.
- **Enviar:** registro completo da execução, incluindo o JSON iniciado por `FT_TESTE_ESTRUTURA_RECIBOS`.
- **Critério:** se qualquer item divergir, parar e corrigir antes do teste de foto.

Após o TESTE 3, executar somente o teste de foto fictícia com vínculo a operação, participação e destino. Depois seguir a ordem do documento `docs/CONSOLIDACAO_FUNCIONAL_20261124.md`.


Executar com dados fictícios, em implantação de teste, antes de cadastrar dados reais.

## Bootstrap e login

- [ ] Executar `configurarSistemaFullTime()` uma única vez.
- [ ] Confirmar URL da planilha e criação das cinco abas.
- [ ] Confirmar que Diego e Bruno constam em `USUARIOS` com papel `ADMIN`.
- [ ] Entrar com cada senha temporária e trocar por uma senha pessoal.
- [ ] Confirmar que a senha anterior não funciona após a troca.
- [ ] Testar senha errada e usuário desconhecido.
- [ ] Encerrar sessão e confirmar retorno ao login.
- [ ] Confirmar que recarregar a página exige login novamente.

## Motoristas

- [ ] Criar um motorista com dados fictícios válidos.
- [ ] Confirmar status `PENDENTE_REVISAO`.
- [ ] Pesquisar por nome e telefone.
- [ ] Filtrar por status.
- [ ] Confirmar que CPF está mascarado na listagem.
- [ ] Tentar inserir o mesmo CPF novamente; o sistema deve bloquear.
- [ ] Tentar CPF inválido, CNH sem validade ou categoria inválida.
- [ ] Editar um cadastro e confirmar os valores atualizados.
- [ ] Aprovar, inativar e reativar.
- [ ] Confirmar entradas de auditoria para ações administrativas.

## Cavalos mecânicos e carretas

- [ ] Criar cavalo mecânico de teste com placa válida.
- [ ] Confirmar status `PENDENTE_REVISAO`.
- [ ] Tentar cadastrar a mesma placa novamente; o sistema deve bloquear.
- [ ] Testar placa inválida, ano inválido e capacidade zero/negativa.
- [ ] Criar carretas de teste e validar tipo, tara e capacidade.
- [ ] Pesquisar por placa/modelo e filtrar por status.
- [ ] Editar, aprovar, inativar e reativar.
- [ ] Confirmar auditoria.

## Interface e responsividade

- [ ] Testar em navegador de computador.
- [ ] Testar layout em viewport estreita / celular.
- [ ] Testar navegação lateral no celular.
- [ ] Confirmar que os botões têm área de toque clara e espaçamento.
- [ ] Testar foco por teclado e mensagens de erro.
- [ ] Verificar que os demais módulos exibem **EM DESENVOLVIMENTO**.

## Segurança e operação

- [ ] Confirmar que não há senhas reais no código nem no Git.
- [ ] Restringir compartilhamento da planilha.
- [ ] Restringir acesso da implantação.
- [ ] Não cadastrar documentos reais até aprovação dos controles de segurança.
- [ ] Testar com duas sessões administrativas antes de uso conjunto.
- [ ] Documentar como restaurar a base e recuperar acesso.


## Solicitações — entrada e interpretação Gemini

Executar somente em ambiente de homologação, com mensagem fictícia.

- [ ] Confirmar que `ENTRADA_OPERACOES_IA` possui exatamente os 18 cabeçalhos do contrato canônico.
- [ ] Registrar uma solicitação pelo painel e confirmar que a mensagem original foi gravada em `MENSAGEM_BRUTA`.
- [ ] Executar `testarConexaoGeminiFullTime()`; confirmar autenticação e geração de texto sem expor a chave nos logs.
- [ ] Executar a ação **IA** em uma solicitação fictícia.
- [ ] Confirmar que a análise usa `MENSAGEM_BRUTA`, grava os dados e o histórico dentro de `INTERPRETACAO_JSON` e atualiza `STATUS_INTERPRETACAO`.
- [ ] Confirmar que a mensagem original permanece idêntica após a análise.
- [ ] Confirmar que campos ausentes são listados como pendências e impedem aprovação.
- [ ] Confirmar que a análise não cria uma operação nem uma carga.
- [ ] Simular indisponibilidade da API e confirmar status `AGUARDANDO_IA`, registro do erro em metadados e preservação da mensagem.
- [ ] Reexecutar a análise após indisponibilidade e confirmar que a solicitação pode ser processada novamente.
- [ ] Abrir **Revisar**, editar os dados e salvar; confirmar persistência em `INTERPRETACAO_JSON`.
- [ ] Aprovar somente depois de preencher os requisitos operacionais; conferir que a conversão é uma ação separada e idempotente.

**Contrato do módulo:** `SolicitacoesFullTime.gs` define os 18 cabeçalhos; `InterpretacaoSolicitacoesFullTime.gs` deve consumir apenas esses cabeçalhos e o objeto JSON de metadados. Não criar colunas paralelas como `TEXTO_ORIGINAL`, `DADOS_EXTRAIDOS_JSON`, `CAMPOS_PENDENTES_JSON`, `PERGUNTAS_IA` ou `HISTORICO_JSON`.


### Contingência de capacidade Gemini

- [ ] Simular HTTP 503 no modelo principal e confirmar retentativas com backoff exponencial e jitter.
- [ ] Confirmar fallback automático para `gemini-3.7-flash` e, depois, `gemini-3.5-flash-lite`.
- [ ] Confirmar que o retorno registra qual modelo respondeu, sem registrar a chave da API.
- [ ] Confirmar que erros HTTP 400/401/402/403 não acionam fallback, pois exigem correção de requisição, autenticação ou cobrança.
- [ ] Executar `testarConexaoGeminiFullTime()` e verificar qual modelo está conseguindo gerar texto no momento.


## MVP — seis execuções de preparação e homologação

**Importante:** sincronize primeiro todos os arquivos do branch `fulltime-2.0` no Apps Script. Não execute reconstruções que limpem a planilha de produção. As duas primeiras rotinas são aditivas e não apagam dados.

1. `prepararBaseOperacionalFullTime()` — confere/prepara as guias operacionais previstas, preservando linhas e cabeçalhos adicionais compatíveis.
2. `prepararEstruturaMvpDestinosFullTime()` — cria `DESTINOS_OPERACAO` e acrescenta `ID_DESTINO` ao fim de `MOVIMENTACOES_OPERACAO`.
3. `auditarMvpDestinosFullTime()` — deve retornar `ok: true`, sem alertas.
4. `testarRegrasMvpDestinosFullTime()` — teste sem escrita: 800 t com destinos 120/100/300/50/90 (660 t distribuídas, 140 t não destinadas), destino único e bloqueio de excesso.
5. `testarConexaoGeminiFullTime()` — verifica geração real e modelos alternativos; não lê nem grava solicitações.
6. Homologação funcional pela interface: criar uma operação fictícia pelo formulário **Cadastro manual completo — sem IA**, com 800 t e cinco destinos; confirmar que aparecem 660 t distribuídas e 140 t não destinadas; designar um conjunto de teste e registrar entrega em um destino; conferir redução simultânea do saldo do destino e da operação. Depois, registrar uma solicitação fictícia e testar **IA → Revisar → Aprovar → Gerar operação**, verificando os mesmos destinos. Não usar dados reais até concluir os testes.

### Casos obrigatórios de aceite

- [ ] Destino único e múltiplos destinos.
- [ ] Soma dos destinos acima do total deve ser bloqueada.
- [ ] Volume não distribuído permanece no saldo geral.
- [ ] Entrega não pode exceder saldo do destino nem saldo geral.
- [ ] Operação com destinos não pode usar endpoint antigo sem `ID_DESTINO`.
- [ ] IA indisponível não bloqueia o formulário manual.
- [ ] IA não aprova nem cria operação automaticamente.
- [ ] Solicitação preserva mensagem original e permite reprocessamento.
- [ ] Cancelamento exige motivo, bloqueia novas entregas e preserva histórico.
- [ ] Reabertura exige justificativa e nova conferência operacional.
- [ ] Regressão de operações legadas sem destinos continua usando movimentação antiga.
