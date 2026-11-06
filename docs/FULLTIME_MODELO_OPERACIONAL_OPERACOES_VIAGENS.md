# FullTime — Modelo operacional definitivo: operações e viagens

**Status:** decisão arquitetural aprovada para implementação  
**Unidade de negócio:** OPERAÇÃO  
**Unidade de execução:** VIAGEM  
**Cadastros de frota:** MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS

## 1. Decisões definitivas

1. `CAMINHOES` não é entidade do produto. O cadastro de veículos pesados é dividido entre `CAVALOS` e `CARRETAS`; `CONJUNTOS` representa o vínculo operacional entre motorista e composição veicular.
2. `CARGAS` não é entidade independente. Cliente, serviço, origem, destino, volume e regras comerciais pertencem à OPERAÇÃO.
3. Uma OPERAÇÃO pode exigir uma ou muitas VIAGENS. Cada viagem é uma execução individual, com ID próprio, sequência e ciclo de vida.
4. A escala é feita por OPERAÇÃO. O vínculo entre operação e motorista/conjunto é uma PARTICIPAÇÃO_OPERACAO.
5. Cada participação registra a meta de viagens daquele motorista/conjunto na operação. A soma das metas individuais deve ser igual ao total de viagens planejadas da operação.
6. A quantidade de viagens é uma estimativa operacional calculada com volume planejado e capacidade útil aprovada do conjunto. O gestor pode ajustar a distribuição entre motoristas, mas não pode deixar metas inconsistentes.
7. Viagens realizadas são registros individuais. Não se deve inferir que uma viagem terminou apenas porque uma movimentação de toneladas foi salva.
8. Correções e cancelamentos preservam trilha de auditoria. Registros executados não são apagados.

## 2. Entidades e relacionamentos

- **OPERACOES (1) → (N) PARTICIPACAO_OPERACOES**
- **PARTICIPACAO_OPERACOES (1) → (N) VIAGENS**
- **OPERACOES (1) → (N) VIAGENS** (referência direta para consultas e relatórios)
- **VIAGENS (1) → (N) EVENTOS_VIAGEM**
- **VIAGENS (1) → (N) DOCUMENTOS/COMPROVANTES**
- **PARTICIPACAO_OPERACOES (N) → (1) MOTORISTAS**
- **PARTICIPACAO_OPERACOES (N) → (1) CONJUNTOS**
- **CONJUNTOS → MOTORISTA/CAVALO/CARRETAS**, conforme vínculo vigente e autorização.

A mesma pessoa ou conjunto pode participar de operações diferentes em períodos compatíveis, mas não pode ter viagens simultâneas ou sobreposição de agenda incompatível.

## 3. Campos essenciais

### OPERACOES
- ID, CRIADO_EM, STATUS, DATA_INICIO_PREVISTA, DATA_FIM_LIMITE
- CLIENTE, CONTATO_CLIENTE, NOME_OPERACAO, TIPO_OPERACAO
- LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID, ORIGEM_DESCRICAO, DESTINO_DESCRICAO
- PRODUTO_SERVICO, VOLUME_TOTAL_PREVISTO_TONELADAS
- TOTAL_VIAGENS_PREVISTAS, TOTAL_VIAGENS_CONCLUIDAS
- TOTAL_TONELADAS_REALIZADAS, SALDO_TONELADAS
- JANELA_INICIO, JANELA_FIM, PRIORIDADE, RESTRICOES, OBSERVACOES
- CRIADO_POR, ATUALIZADO_EM, ATUALIZADO_POR, ID_EXTERNO

### PARTICIPACAO_OPERACOES
- ID, OPERACAO_ID, MOTORISTA_ID, CONJUNTO_ID, STATUS_PARTICIPACAO
- VIAGENS_PREVISTAS, VIAGENS_INICIADAS, VIAGENS_CONCLUIDAS
- TONELADAS_PREVISTAS, TONELADAS_MOVIMENTADAS
- INICIO_PREVISTO, FIM_PREVISTO, INICIO_REAL, FIM_REAL
- POSICAO_ESCALA, MOTIVO_DESIGNACAO, OBSERVACOES
- CRIADO_EM, CRIADO_POR, ATUALIZADO_EM, ATUALIZADO_POR

### VIAGENS
- ID, OPERACAO_ID, PARTICIPACAO_ID, SEQUENCIA_OPERACAO, SEQUENCIA_MOTORISTA
- MOTORISTA_ID, CONJUNTO_ID, STATUS
- ORIGEM_ID, DESTINO_ID, ORIGEM_DESCRICAO, DESTINO_DESCRICAO
- PESO_PREVISTO_TONELADAS, PESO_REAL_TONELADAS
- PREVISTA_INICIO, PREVISTA_CHEGADA, INICIO_REAL, CHEGADA_ORIGEM_REAL
- SAIDA_ORIGEM_REAL, CHEGADA_DESTINO_REAL, FIM_REAL
- DISTANCIA_PREVISTA_KM, DISTANCIA_REAL_KM
- CRIADA_EM, CRIADA_POR, ATUALIZADA_EM, ATUALIZADA_POR
- MOTIVO_CANCELAMENTO, OBSERVACOES

### EVENTOS_VIAGEM
- ID, VIAGEM_ID, TIPO_EVENTO, DATA_HORA, LOCAL_ID
- LATITUDE, LONGITUDE, RESPONSAVEL_ID, ORIGEM_REGISTRO
- DESCRICAO, OBSERVACOES, CRIADO_EM

### DOCUMENTOS_VIAGEM
- ID, VIAGEM_ID, EVENTO_VIAGEM_ID, TIPO_DOCUMENTO
- DRIVE_FILE_ID, URL, NOME_ARQUIVO, MIME_TYPE, HASH_ARQUIVO
- RECEBIDO_EM, RECEBIDO_POR, STATUS_VALIDACAO, OBSERVACOES

## 4. Cálculo de viagens

- Para uma participação com um conjunto definido: `viagens_minimas = teto(volume_alocado / capacidade_util_aprovada_do_conjunto)`.
- Capacidade útil não é PBTC. É o limite operacional de carga do conjunto, calculado/validado a partir dos dados técnicos e regras aplicáveis.
- Quando vários conjuntos participam, o gestor distribui o volume entre participações. O sistema calcula a meta de viagens de cada participação com a capacidade daquele conjunto.
- `TOTAL_VIAGENS_PREVISTAS` da operação é a soma de `VIAGENS_PREVISTAS` de todas as participações ativas.
- `TONELADAS_PREVISTAS` por participação deve somar o volume total planejado da operação.
- Não aceitar volume alocado acima da capacidade × meta de viagens, nem metas negativas, zero para participação ativa ou soma divergente.
- Se houver arredondamento ou carga parcial na última viagem, a última viagem recebe o saldo restante, sem exceder a capacidade útil.
- A estimativa pode mudar por troca de conjunto, restrição de acesso, janela operacional, fila, tempo de ciclo, pausas legais, indisponibilidade e condições reais da rota. Toda revisão deve guardar valor anterior, novo valor, autor, data e justificativa.

## 5. Ciclo de vida da viagem

Estados mínimos:
- PLANEJADA
- AGUARDANDO_LIBERACAO
- A_CAMINHO_ORIGEM
- NO_LOCAL_ORIGEM
- CARREGANDO
- CARREGADA
- EM_TRANSITO
- NO_LOCAL_DESTINO
- DESCARREGANDO
- CONCLUIDA
- INTERROMPIDA
- CANCELADA

Transições são controladas por regras. Exemplo: não concluir sem peso real, evento de descarga e comprovante quando exigido pela operação. Eventos recebem timestamp, autor, origem do registro e localização quando disponível. Eventos atrasados/offline são aceitos com hora do evento e hora de recebimento distintas, marcados para validação.

## 6. Regras de integridade e concorrência

- IDs imutáveis; nunca usar número de linha como chave.
- Lock transacional ao alocar participação, criar viagem, iniciar/concluir viagem e atualizar saldo.
- Idempotência por chave de evento/mensagem para impedir duplicação em reenvio.
- Uma viagem só pode pertencer a uma participação e a uma operação.
- Uma participação ativa precisa ter motorista e conjunto válidos, ativos e autorizados.
- Um conjunto não pode executar duas viagens sobrepostas.
- Um motorista não pode executar viagens sobrepostas.
- Viagens concluídas não são apagadas nem reabertas sem fluxo de correção auditado.
- O volume total concluído não pode exceder o contratado sem autorização registrada.
- Operação só é concluída quando saldo de volume estiver zerado dentro da tolerância e não houver viagem aberta, interrompida ou pendente de conferência.
- Troca de motorista/conjunto após início de operação encerra a participação anterior e cria nova participação; não reescreve viagens históricas.

## 7. O que sai do produto

- Remover `CAMINHOES` do menu, dashboard, formulários, validações, consultas e novos esquemas.
- Remover `CARGAS` do menu, dashboard, formulários, consultas, novos esquemas e relações de escala.
- Não apagar automaticamente as antigas guias físicas. Dados legados ficam preservados e isolados até uma migração aprovada, sem serem consultados pelo fluxo novo.
- Renomear conceitos de fila/oferta para operação/participação quando o escopo for a operação, e manter eventos associados à operação ou viagem, nunca a CARGA_ID.

## 8. Migração segura

1. Inventariar referências legadas em código, triggers, integrações e planilhas.
2. Criar schemas novos de forma aditiva: VIAGENS, EVENTOS_VIAGEM e DOCUMENTOS_VIAGEM; ampliar OPERACOES e PARTICIPACAO_OPERACOES.
3. Manter snapshots/backup e executar relatório dry-run sem alteração.
4. Mapear dados legados apenas se o usuário autorizar; nenhuma linha será apagada automaticamente.
5. Desativar chamadas antigas para CARGAS/CAMINHOES no caminho ativo.
6. Executar testes de integridade e permissões com dados sintéticos isolados.
7. Só então publicar versão controlada.

## 9. Critérios de aceite

- Criar operação com volume, rota, janela, prazo, regras e meta.
- Designar um ou vários motoristas/conjuntos e definir viagens previstas por participação.
- Sistema calcula e confere total de viagens e volume.
- Gerar viagens individuais com sequência e carga prevista, sem ultrapassar capacidade.
- Registrar eventos, horários, peso real e comprovantes por viagem.
- Acompanhar progresso por operação, motorista, conjunto, viagem, toneladas, prazo e desvios.
- Replanejar com auditoria e sem alterar o histórico concluído.
- Nenhuma tela ou API operacional depende de CARGAS ou CAMINHOES.
