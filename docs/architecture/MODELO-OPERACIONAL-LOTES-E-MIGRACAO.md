# FullTime — desenho de evolução do modelo operacional para lotes

**Data:** 2026-11-10  
**Status:** modelo-alvo parcialmente implementado no branch de desenvolvimento; nenhuma planilha real foi migrada  
**Base:** `Code.gs` atual, inventário de guias e respostas operacionais

## 1. Objetivo

Permitir que uma operação agregue vários clientes e lotes, sem quebrar a base atual nem apagar dados. Preservar `OPERACOES` como entidade-pai e manter `VIAGENS` como execução individual.

Este documento é um desenho de migração. Não é autorização para executar alterações em planilhas reais.

## 2. Estrutura-alvo proposta

### 2.1 OPERACOES — entidade-pai
Manter a guia existente. Campos atuais permanecem. O campo `CLIENTE_ID` e a coluna `CLIENTE` tornam-se compatibilidade/cliente principal legado, não a fonte completa de clientes participantes.

Adicionar campos:
- `TIPO_IDENTIFICADOR_OPERACAO` (ex.: navio, contrato, serviço; opções aguardam resposta)
- `REFERENCIA_EXTERNA` (texto livre)
- `INICIO_REAL` (timestamp que inicia contagem dos seis horas)
- `REGRA_LIBERACAO_JSON` (configuração da liberação escalonada)
- `ENCERRADA_COM_PENDENCIAS` (boolean)
- `MOTIVO_ENCERRAMENTO_PENDENCIAS`

### 2.2 OPERACAO_CLIENTES — relação N:N
Nova guia:
- `ID`
- `OPERACAO_ID`
- `CLIENTE_ID`
- `PAPEL` (SOLICITANTE/PARTICIPANTE, confirmar se necessário)
- `STATUS`
- `CRIADO_EM`
- `CRIADO_POR`

Chave lógica única: `OPERACAO_ID + CLIENTE_ID`.

### 2.3 LOTES_OPERACAO — demanda segmentada
Nova guia:
- `ID`
- `OPERACAO_ID`
- `CLIENTE_ID`
- `CODIGO_LOTE`
- `PRODUTO_SERVICO`
- `ORIGEM`, `ORIGEM_ID`
- `DESTINO`, `DESTINO_ID`
- `VOLUME_PREVISTO_TONELADAS`
- `VOLUME_REALIZADO_TONELADAS`
- `VAGAS_OFERTADAS`
- `MOTORISTAS_MINIMOS`
- `MOTORISTAS_MAXIMOS`
- `MOTORISTAS_PLANEJADOS`
- `JANELA_INICIO`, `JANELA_FIM`
- `STATUS`
- `CRIADO_EM`, `CRIADO_POR`
- `ENCERRADO_EM`, `ENCERRADO_POR`, `MOTIVO_ENCERRAMENTO`

A quantidade de vagas é independente do número de viagens. O sistema não deve assumir que uma vaga equivale a uma viagem ou a um motorista sem confirmação do operador portuário.

### 2.4 PARTICIPACAO_OPERACOES — alocação de motorista/conjunto
Manter a guia atual e adicionar:
- `LOTE_ID`
- `INICIO_VIGENCIA`
- `FIM_VIGENCIA`
- `TRANSFERENCIA_DE_PARTICIPACAO_ID`
- `MOTIVO_TRANSFERENCIA`

A mesma pessoa poderá ter participações em lotes diferentes da mesma operação, mas não poderá ter intervalos sobrepostos em operações distintas. Transferência encerra a vigência anterior e cria novo vínculo; não sobrescreve o histórico.

Regra operacional confirmada: o mesmo motorista/conjunto pode participar de mais de um lote da mesma operação. A implementação permite essa simultaneidade desde que o vínculo de conjunto seja o mesmo e impede compromissos simultâneos em operações diferentes. A transferência entre lotes deve preservar o histórico e ainda requer fluxo específico de transferência.

### 2.5 VIAGENS
Manter a relação com `PARTICIPACAO_ID`, que determina lote e cliente. A implementação inicial adiciona `LOTE_ID` como referência explícita para facilitar o ciclo de viagem e relatórios; o backend valida o vínculo com a participação e o lote antes de usar os dados.

Cada viagem mantém:
- peso previsto e real;
- sequência da operação e do motorista;
- origem/destino;
- estados do percurso;
- horários;
- retorno à origem antes da próxima viagem;
- eventos e evidências.

A conclusão deve exigir descarga confirmada. O formato exato do ticket e os campos obrigatórios dependem da resposta 53.

### 2.6 FILA_MOTORISTAS — chegada e liberação
Adicionar:
- `OPERACAO_ID`
- `LOTE_ID` (opcional quando a fila for da operação inteira)
- `CHEGADA_EM`
- `LIBERADO_EM`
- `LIBERADO_POR`
- `GRUPO_LIBERACAO`
- `STATUS_APRESENTACAO`

A ordem é derivada de `CHEGADA_EM`, não de número de fila digitado. A regra de seis horas usa `OPERACOES.INICIO_REAL`; a liberação efetiva continua sendo controlada pelo responsável. Bloqueios de horário permanecem configuráveis após resposta sobre janelas proibidas.

### 2.7 OFERTAS_OPERACOES
Manter guia existente. Adicionar:
- `LOTE_ID`
- `PRAZO_RESPOSTA_EM`
- `ORDEM_TENTATIVA`
- `SUBSTITUI_OFERTA_ID`
- `CANCELADA_POR`
- `CANCELADA_EM`

A substituição automática após recusa deve selecionar somente candidato elegível e disponível. Prazo, critérios de ordenação e fluxo de desistência pós-aceite dependem das respostas pendentes.

## 3. Regras de consistência obrigatórias

1. Cliente associado ao lote deve estar associado à operação.
2. Soma dos volumes dos lotes não pode exceder o volume total da operação; divergência deve bloquear publicação ou exigir ajuste explícito.
3. Vagas ofertadas são informativas/operacionais e não devem ser convertidas automaticamente em motoristas sem regra confirmada.
4. Motorista e conjunto devem pertencer ao mesmo vínculo ativo e passar no checklist.
5. O mesmo motorista/conjunto não pode ter escalas sobrepostas em operações distintas.
6. Uma viagem pertence a uma única participação e a um único lote.
7. Uma viagem não pode ser concluída duas vezes.
8. Redistribuição deve mover somente saldo não executado e manter trilha de auditoria.
9. Encerramento de lote não encerra automaticamente operação.
10. Operação encerrada com lote pendente exige motivo e registro de responsável.
11. O relógio de seis horas começa no início real registrado da operação, não no primeiro motorista nem na criação do cadastro.
12. Toda mudança de lote, meta, convite, liberação ou status deve produzir evento auditável.

## 4. Compatibilidade e migração segura

- Não excluir nem renomear colunas existentes.
- Não criar uma segunda guia com nome duplicado ou semelhante.
- Criar guias novas somente após verificar a lista real de guias.
- Preservar `OPERACOES.CLIENTE_ID` como cliente legado/principal.
- Para cada operação antiga, criar uma relação em `OPERACAO_CLIENTES` e um lote legado apenas se os dados existentes forem suficientes; caso contrário, marcar `MIGRACAO_PENDENTE` para revisão humana.
- Não inferir vagas ofertadas, mínimo/máximo de motoristas ou regra de liberação para registros antigos.
- Fazer backup e prévia antes de qualquer migração.
- Executar primeiro em cópia de teste com massa fictícia.
- Migração real exige autorização específica e plano de rollback.

## 5. Ordem de implementação no código

1. Criar helpers de leitura/escrita por cabeçalho para novas guias.
2. Criar validação de operação + clientes + lotes, mantendo endpoint legado de cadastro compatível.
3. Criar endpoints protegidos para cadastrar/editar clientes participantes e lotes.
4. Atualizar listagem/detalhe da operação para montar lotes e clientes.
5. Atualizar participação para referenciar lote e preservar histórico de transferências.
6. Criar cálculo de viagens por conjunto e por lote, com preview antes de salvar.
7. Atualizar fila e liberação com timestamp de chegada e marco de seis horas.
8. Fechar ciclo de viagem e anexos de ticket.
9. Atualizar interface em etapas, sem reescrever telas não relacionadas.
10. Adicionar testes de regressão e isolamento.

## 6. Bloqueios antes da conclusão da homologação

Não implementar como regra fixa até confirmar:
- identidade principal da operação (pergunta 3);
- mínimo/máximo de motoristas por lote (11);
- critérios finais de convite, aceite, retirada e substituição automática;
- janelas proibidas e reagendamento por atraso (28 e 29);
- critérios de elegibilidade por produto/local (34);
- critério formal de indisponibilidade (41);
- integração do prazo de convite de duas horas com a fila sequencial por lote;
- campos do registro de viagem (53);
- perfis de acesso e canais de notificação (58–61).

**Conclusão:** a primeira fatia vertical (modelo + backend + interface + testes gratuitos) está implementada no branch de desenvolvimento e validada com planilhas simuladas. A homologação real em cópia isolada e os fluxos de convite, fila de chegada, liberação após seis horas, transferência, replanejamento aprovado e auditoria operacional continuam como etapas seguintes.
