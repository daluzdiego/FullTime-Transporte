# FullTime — Registro de continuidade técnica (2026-11-06)

## Contexto e decisões preservadas

Esta continuidade parte da branch `feat/arquitetura-multicanal-sem-planilha-bruno` e mantém o contrato `FULLTIME_MODELO_OPERACIONAL_OPERACOES_VIAGENS.md`.

- OPERAÇÃO é a unidade central de planejamento e controle.
- PARTICIPACAO_OPERACOES distribui volume e meta de viagens por motorista/conjunto.
- VIAGENS registra cada execução física individual.
- Não criar módulos/entidades operacionais independentes de CAMINHOES, CARGAS ou ESCALAS.
- A base nativa FullTime permanece como fonte de verdade; a integração externa não substitui a base.
- Não executar limpeza, migração destrutiva, implantação ou alteração de dados reais nesta etapa.
- Não consultar, enumerar, copiar, escrever ou limpar a guia protegida `CAVALOS-BRUNO`.

## Alterações aplicadas nesta continuidade

### 1. Leitura de registros por cabeçalho — `Code.gs`

Problema encontrado: o leitor genérico assumia que a terceira coluna (índice 2) era sempre STATUS. Isso não é verdade para PARTICIPACAO_OPERACOES e VIAGENS:
- PARTICIPACAO_OPERACOES: índice 2 é OPERACAO_ID; STATUS_PARTICIPACAO está no índice 5.
- VIAGENS: índice 2 é OPERACAO_ID; STATUS está no índice 8.

Correção:
- `listarRegistros_` identifica STATUS pelo nome do cabeçalho.
- A identificação contempla STATUS, STATUS_PARTICIPACAO e estados equivalentes de ofertas, fila, disponibilidade, tickets e validação documental.
- Os metadados de participação e viagem continuam vinculados aos respectivos IDs, sem confundir OPERACAO_ID com status.
- `contarAtivos_` e `contarStatus_` passaram a contar pela coluna identificada pelo cabeçalho, não por posição fixa.

### 2. Regressão determinística

Foi incluída a função manual `testarRegressaoStatusPorCabecalhoFullTime()`, que não lê nem grava planilhas. Ela valida três contratos:
- PARTICIPACAO_OPERACOES → STATUS_PARTICIPACAO no índice 5.
- VIAGENS → STATUS no índice 8.
- OPERACOES → STATUS no índice 2.

Também foi incluída `testarRegressaoEscopoPortalMotoristaFullTime()`, com dados sintéticos, para provar que um motorista não recebe participações, operações ou viagens de outro motorista.\n\n**Execução pendente:** rodar as duas funções no editor do Apps Script e registrar os resultados. Os testes foram incluídos no código, mas não foram executados pelo GitHub.

### 3. Escopo do portal do motorista — `Code.gs` e `Index.html`

- O backend do portal deriva o escopo exclusivamente de `motoristaId` associado à sessão autenticada.
- Retorna somente as participações, operações e viagens vinculadas ao motorista autenticado.
- O frontend agora apresenta “Minhas operações” e “Minhas viagens”, além do cadastro e conjunto.
- O portal não recebe ID de motorista do navegador para ampliar o escopo.
- Ajustado o alinhamento dos cartões sem depender de classe CSS inexistente.

## Commits desta continuidade

- `0b5a0632af989543c2e1e9f41a0ac2f207834dbb` — leitura de status e contadores por cabeçalho.
- `32b73b119c0990df844d11376143e73c07ae0a28` — dados próprios no backend do portal.
- `86797e609053199e02bd36b367375f3d0ddfe838` — apresentação de operações e viagens no portal.
- `fbf9468422d6930c1d3ffa31aeaf6cc1a361125b` — ajuste de alinhamento do portal.
- `27c2f7d8cf0953e1680855fc6e30eb2451e4408f` — helper e teste de regressão de status.\n- `a4d3d0eda843410e2ff4cc358cba5c0975d292a6` — filtro puro e teste sintético de isolamento do portal.\n- `d4d105cdcb51c15f1ebf194d7adba30a617a058f` — corrige o alinhamento dos cartões de viagens no portal.

## Validação e implantação

- Alterações gravadas somente na branch de trabalho.
- `main` não foi alterada.
- Não houve merge, implantação no Apps Script nem escrita em planilhas operacionais.
- Não houve execução de rotina destrutiva nem carga de dados fictícios.
- A comparação com `main` antes desta continuidade indicava a branch de trabalho adiantada e sem commits atrás; manter a revisão isolada até homologação.

## Próximas etapas obrigatórias

1. Executar `testarRegressaoStatusPorCabecalhoFullTime()` no Apps Script.
2. Fazer revisão estática integral dos endpoints de OPERAÇÃO, PARTICIPAÇÃO e VIAGEM, procurando acessos por índice fixo onde o contrato já possui cabeçalhos.
3. Revisar a criação da operação e a transição de RASCUNHO/EM_PLANEJAMENTO/AGUARDANDO_APROVACAO para ABERTA; não liberar execução com distribuição incompleta.
4. Completar replanejamento com snapshot antes/depois, justificativa, histórico e reconciliação do saldo por operação e participação.
5. Completar ações permitidas do portal do motorista (disponibilidade, aceite/recusa quando habilitados e eventos da própria viagem) com autorização server-side e idempotência.
6. Completar documentos/evidências e validações de conclusão conforme exigência da operação.
7. Executar testes integrais no Apps Script com massa fictícia, concorrência, estados inválidos, saldo, capacidade, conflitos e isolamento por motorista.
8. Homologar antes de qualquer merge ou implantação.

## Critério de continuidade

Não considerar o sistema homologado ou pronto para liberação enquanto os itens acima e os critérios do contrato funcional não estiverem comprovados por testes executados no Apps Script.


## 4. Assiduidade como critério do motor de escala automática

A assiduidade foi incorporada ao ranking sem criar pontuação artificial ou penalizar motoristas sem histórico.

### Dados e apuração
- A rotina aditiva `prepararGuiasEscalaFullTime()` passa a preparar também `HISTORICO_ASSIDUIDADE`, com motorista, operação, participação, tipo de evento, horários previsto/realizado, justificativa, origem e responsável.
- A função pura `calcularAssiduidadeMotoristaFullTime()` apura compromissos aceitos e seus resultados.
- Comparecimento pontual e atrasado conta como presença; pontualidade é apurada separadamente.
- Ausência injustificada entra como resultado negativo.
- Ausência justificada e cancelamento pelo cliente ficam registrados, mas não reduzem a taxa de comparecimento.
- Oferta ainda pendente ou compromisso sem resultado não entra no denominador.
- A apuração é por participação/compromisso, evitando contar vários eventos do mesmo compromisso como várias ocorrências.

### Efeito no ranking
- Mantém-se a prioridade de equilíbrio diário: quem ainda não recebeu operação hoje permanece à frente.
- Mantém-se a janela móvel de 30 dias e os critérios já existentes de disponibilidade, trabalho recente, fila e última operação.
- Depois da disponibilidade, assiduidade e pontualidade passam a desempatar candidatos quando ambos têm histórico resolvido.
- Sem amostra para qualquer um dos candidatos, esse critério fica neutro. Motorista novo não recebe nota zero nem perde posição por não ter histórico.
- Não foram introduzidos pesos numéricos. A comparação é lexicográfica e transparente.

### Teste incluído
Foi adicionada `testarRegressaoAssiduidadeFullTime()`, com massa inteiramente sintética, cobrindo presença pontual, atraso, falta injustificada, justificativa, cancelamento pelo cliente, compromisso pendente e influência no desempate do ranking.

### Limite desta entrega
O esquema, o cálculo e a leitura do histórico foram incorporados ao código. **Ainda não existe integração completa de todos os eventos reais do ciclo de oferta/aceite/comparecimento**, portanto o ranking só refletirá assiduidade real quando os fluxos operacionais gravarem esses eventos. Não executar carga fictícia nem considerar a regra homologada até ligar os pontos de gravação e rodar os testes no Apps Script.

## Commits adicionais
- `3d454da07068f57317c910099303a409e6e81f6f` — prepara histórico de assiduidade, cálculo auditável, integração ao ranking e teste de regressão.
