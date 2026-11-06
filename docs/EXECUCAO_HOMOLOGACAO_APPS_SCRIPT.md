# FullTime — roteiro de execução da homologação no Apps Script

**Branch de código:** `planejamento/controle-18-11-2026`  
**Objetivo:** validar o código no runtime real do Apps Script antes de qualquer gravação operacional.

## 1. Antes de executar

- Confirme que os arquivos do projeto Apps Script correspondem à branch de trabalho, não à `main` antiga.
- Confirme `FT_BRUNO_CONFIG.SOURCE_ID` como a planilha do Bruno e `FT_BRUNO_CONFIG.OPERATIONAL_ID` como a planilha principal.
- Confirme que as Script Properties `FT_BRUNO_SOURCE_ID`, `FT_BRUNO_OPERATIONAL_ID` e `FT_REGISTRY_DATABASE_ID` não apontam para arquivos diferentes.
- Não execute rotinas de limpeza, exclusão, recadastro em massa ou geração de dados fictícios na base real.
- Para testes que gravem dados, prefira cópias das duas planilhas e um projeto Apps Script de homologação.

## 2. Testes sem escrita

Executar no editor do Apps Script:

1. `testarExtracaoEntradaOperacoesIAFullTime()` — parser e regressões de extração.
2. `testarValidacaoPesosViagensOperacaoFullTime()` — quantidade de viagens, pesos ausentes e soma do volume.
3. `executarTesteFluxoIntegralFullTime()` — suíte integrada somente de leitura.

A suíte read-only consulta cabeçalhos, cadastros espelhados, vínculos, capacidades, consistência e pré-requisitos do motor. Ela não deve criar, editar ou apagar dados. Guardar o JSON completo do resultado, incluindo `falhas`, `bloqueios` e `prontoParaHomologacao`.

## 3. Pré-condições para uma oferta de escala

Antes de executar `gerarEscalasAutomaticasFullTime(token, operacaoId)`, confirmar:

- Operação aberta e com todas as viagens filhas registradas.
- Quantidade de viagens filhas igual a `TOTAL_CARGAS_PREVISTAS`.
- Cada viagem tem `PESO_TONELADAS` maior que zero.
- Soma dos pesos das viagens corresponde a `VOLUME_TOTAL_TONELADAS`, com tolerância máxima de 0,05 t.
- Motorista ativo, CNH válida para a data da operação e disponibilidade diária `DISPONIVEL`.
- Conjunto ativo, vínculo fixo confirmado, motorista associado correto, cavalo e todas as carretas ativos, condição `APTO`, sem restrições e capacidade útil suficiente.

O painel de escalas registra a disponibilidade diária. A tela de cargas permite informar/corrigir o peso previsto de cada viagem ainda não atribuída. Uma oferta pendente não equivale a atribuição; a atribuição só ocorre depois do aceite registrado.

## 4. Fluxo de homologação com dados fictícios

1. Preparar cópias das planilhas do Bruno e Full Time.
2. Configurar o projeto de homologação para apontar somente às cópias.
3. Executar as funções de preparação de estrutura e integração apenas nas cópias, após conferir os cabeçalhos.
4. Cadastrar motoristas, cavalos, carretas e conjuntos fictícios com IDs consistentes; marcar explicitamente os registros como fictícios.
5. Confirmar a disponibilidade diária dos motoristas fictícios.
6. Criar uma operação fictícia com 1, 2 e 5 viagens em testes separados; preencher pesos por viagem e conferir que a soma fecha com o volume total.
7. Gerar oferta, registrar aceite, verificar `PARTICIPACAO_OPERACOES`, `ESCALAS`, `CARGAS` e `EVENTOS_ESCALA`.
8. Repetir com recusa, indisponibilidade e expiração; confirmar que a próxima oferta não reutiliza o motorista recusante naquela operação e não altera sua fila global.
9. Reexecutar sincronizações para comprovar idempotência.
10. Guardar evidências e somente então preparar a liberação controlada.

## 5. Instalação de gatilhos

Não instalar gatilhos antes da homologação do fluxo:

- `instalarMonitoramentoOfertasEscalaFullTime()`: instala o processamento de ofertas expiradas a cada 5 minutos. Executar uma única vez no editor do Apps Script após aprovar o fluxo.
- `instalarSincronizacaoAutomaticaBrunoFullTime()`: instala sincronização Bruno → Full Time a cada 5 minutos e executa uma primeira sincronização. Executar somente depois de validar IDs, cabeçalhos, permissões e dados de homologação.

As funções de instalação alteram gatilhos e/ou executam sincronização. Não são testes read-only.

## 6. Limites atuais da primeira liberação controlada

- Entrada de operações: o Bruno cola a mensagem do WhatsApp no painel; IA/regras criam rascunho e o responsável revisa e confirma.
- WhatsApp automático: `WhatsAppTickets.gs` é o fluxo de recebimento de tickets/imagens. Não é o canal de entrada de operações nem envia automaticamente ofertas de escala.
- Resposta à oferta: nesta primeira fase, o administrador registra no painel a resposta recebida do motorista. Portal/resposta automática do motorista e envio de mensagens pelo WhatsApp ficam para uma etapa posterior, após homologação do canal e credenciais.

## 7. Critério de liberação

Não liberar com bloqueios na suíte integrada, divergência de cadastros, viagens sem peso, vínculos incompletos, capacidade desconhecida, disponibilidade ausente ou falha de aceite/recusa/expiração. A primeira liberação deve ser acompanhada e reversível.
