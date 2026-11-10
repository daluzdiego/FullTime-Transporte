# FullTime — operações multi-cliente, lotes e alocação

**Status:** implementação vertical inicial no branch de desenvolvimento; suíte gratuita de sintaxe e testes estáticos/domínio aprovada. Ainda exige homologação funcional em cópia isolada do Apps Script com massa fictícia.

## Componentes alterados

- `Code.gs`
  - Roteia as guias relacionais novas para a base operacional oficial.
  - Acrescenta a coluna `LOTE_ID` ao final dos esquemas de `PARTICIPACAO_OPERACOES` e `VIAGENS`; a rotina de preparação existente consegue completar esquemas antigos por extensão aditiva.
  - Inicia viagens com origem/destino do lote quando a participação está vinculada a um lote.
  - Ao concluir viagem, valida e atualiza o volume realizado do lote antes de gravar o encerramento.
- `OperacoesLotes.gs`
  - Prévia e criação das guias `OPERACAO_CONFIGURACOES`, `OPERACAO_CLIENTES` e `LOTES_OPERACAO`.
  - Migração aditiva das colunas `LOTE_ID` em participações e viagens.
  - Cadastro de operação com múltiplos clientes, lotes, janelas e particularidades JSON.
  - Alocação de motorista/conjunto por lote, permitindo o mesmo conjunto em lotes diferentes da mesma operação, sem duplicar o mesmo lote e sem conflito com outra operação.
  - Consulta de alocações por lote.
- `MotorEscalaFullTime.gs`
  - Seleção de candidatos específica para o lote, usando local de origem, regra operacional e particularidades do lote.
  - Considera a data de início da operação para consultar disponibilidade.
- `Index.html`
  - Formulário avançado multi-cliente/lotes.
  - Gestão dos lotes, consulta de candidatos por lote e designação com volume e meta de viagens.
  - O formulário legado continua disponível para operações antigas.
- `tests/static` e `tests/domain`
  - Verificação de superfície de API, sintaxe do bundle Apps Script e scripts inline, migração aditiva e regras de domínio.

## Estrutura relacional

### OPERACAO_CONFIGURACOES
Guarda as particularidades gerais da operação em JSON e versão da configuração.

### OPERACAO_CLIENTES
Relaciona a operação a todos os clientes participantes.

### LOTES_OPERACAO
Guarda cliente responsável, código, produto/serviço, origem, destino, volume, vagas, motoristas planejados, janelas, particularidades e status do lote.

### PARTICIPACAO_OPERACOES
A coluna `LOTE_ID` liga cada participação do motorista/conjunto ao lote. O mesmo motorista/conjunto pode assumir lotes diferentes dentro da mesma operação, mas não pode ser comprometido em outra operação ao mesmo tempo.

### VIAGENS
A coluna `LOTE_ID` registra o lote da viagem. Origem/destino são carregados do lote e o peso realizado atualiza o saldo realizado do lote.

## Preparação segura

O botão **Preparar guias de lotes** chama a rotina administrativa com confirmação explícita. Ela:
1. verifica as três guias relacionais;
2. bloqueia guias existentes com cabeçalhos incompatíveis;
3. cria somente guias ausentes;
4. adiciona `LOTE_ID` ao final de `PARTICIPACAO_OPERACOES` e `VIAGENS` quando necessário;
5. não apaga, renomeia nem reescreve registros existentes.

A rotina deve ser exercitada primeiro em uma cópia de homologação com dados fictícios. Nenhuma planilha real foi modificada nesta implementação.

## Limitações ainda abertas

- A política de ordenação de candidatos permanece baseada na política atual de compatibilidade; critérios de justiça/prioridade precisam ser formalizados com a operação.
- A alocação por lote exige que o local de origem exista em `LOCAIS` e tenha regra ativa em `REGRAS_OPERACIONAIS`; o sistema não cria regra silenciosamente.
- O cálculo de viagens mínimas usa a capacidade útil do conjunto; pesos por viagem, restrições legais por composição, retornos, tempos de ciclo e exceções operacionais precisam de homologação.
- A fila de convites e a substituição automática após expiração/retirada ainda precisam ser integradas ao fluxo por lote.
- A liberação escalonada após seis horas, a fila de chegada e o replanejamento com aprovação ainda não estão concluídos.
- A suíte aprovada valida sintaxe, contratos estáticos e regras puras; não substitui teste de integração real no Apps Script.
- Nenhum deploy, ativação de serviço pago ou alteração em planilha real foi executado.

## Testes gratuitos

Executar localmente com Node.js 20 ou no GitHub Actions:
`npm test`

A suíte não consome APIs pagas nem depende de dados reais. Para a próxima etapa, criar uma cópia vazia de homologação, carregar massa fictícia e testar o fluxo completo no Apps Script antes de qualquer liberação.
