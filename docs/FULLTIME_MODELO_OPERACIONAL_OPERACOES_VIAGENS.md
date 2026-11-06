# FullTime — Contrato funcional detalhado de Operações e Viagens

**Status:** contrato normativo para implementação e homologação  
**Entidade central:** OPERAÇÃO  
**Execução física:** VIAGEM  
**Distribuição de trabalho:** PARTICIPACAO_OPERACOES  
**Frota:** MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS

Este documento detalha o comportamento obrigatório do produto. Em caso de divergência com telas antigas, prevalece este contrato. Nenhuma referência legada autoriza recriar CAMINHOES, CARGAS ou uma entidade independente de ESCALAS.

## 1. Decisões de produto

1. Não existe cadastro, menu, API ou relacionamento operacional de CAMINHOES. Cavalo mecânico é CAVALOS; implementos são CARRETAS; o vínculo operacional é CONJUNTOS.
2. Não existe entidade CARGAS. O contrato, o serviço, o cliente, os locais, o produto/material, o volume, a rota, os prazos e as restrições pertencem à OPERAÇÃO.
3. Não existe módulo separado de ESCALAS. A escala é a distribuição de PARTICIPACOES dentro da própria OPERAÇÃO.
4. Uma OPERAÇÃO pode exigir uma ou milhares de VIAGENS. Cada VIAGEM é um ciclo individual rastreável, não uma movimentação agregada.
5. A OPERAÇÃO informa a meta global de viagens. Cada participação informa quantas viagens e quantas toneladas cabem ao motorista/conjunto designado. A soma das metas individuais deve fechar exatamente a meta global e o volume contratado.
6. O sistema deve calcular uma estimativa de viagens com base no volume e na capacidade útil aprovada do conjunto. O gestor pode ajustar a distribuição, mas toda divergência deve ser explicitamente validada e justificada.
7. Uma operação pode ser executada por vários motoristas/conjuntos em paralelo ou em sequência, conforme disponibilidade, janela, restrições e política do cliente.
8. Uma viagem concluída nunca é apagada. Correções, cancelamentos, interrupções, substituições e replanejamentos preservam o histórico.

## 2. Entidades e cardinalidade

- CLIENTE 1:N OPERACOES.
- CLIENTE 1:N LOCAIS; um local pode ser compartilhado quando sua política permitir.
- OPERACAO 1:N PARTICIPACOES.
- PARTICIPACAO 1:N VIAGENS.
- OPERACAO 1:N VIAGENS (referência direta para consultas e indicadores).
- VIAGEM 1:N EVENTOS_VIAGEM.
- VIAGEM 1:N DOCUMENTOS_VIAGEM.
- PARTICIPACAO N:1 MOTORISTA e N:1 CONJUNTO.
- CONJUNTO 1:1 motorista vigente, 1:1 cavalo e 0..2 carretas, conforme composição aprovada.

IDs são UUIDs imutáveis. Não utilizar número de linha como chave.

## 3. Cadastro da operação — campos e validações

### Identificação e contrato
- ID, número/código legível, status, criada em/por, atualizada em/por.
- Cliente contratante e contato autorizado.
- Nome da operação, tipo de serviço, produto/material e observações.
- Referência externa do cliente, pedido/contrato e centro de custo, quando aplicáveis.

### Planejamento físico
- Local de origem e local de destino referenciados por ID; snapshots de nome/endereço para preservar o contexto histórico.
- Endereço completo, cidade/UF, coordenadas quando disponíveis, instruções de acesso e contato local.
- Distância estimada, rota sugerida, pontos intermediários e restrições de percurso.
- Volume total contratado/previsto em unidade explícita; toneladas como unidade padrão quando se tratar de peso.
- Tolerância de peso, margem operacional e regra de arredondamento.
- Meta total de viagens prevista; meta não pode ser zero em operação que exige transporte.
- Estimativa de viagens calculada pelo sistema e quantidade confirmada pelo gestor, armazenadas separadamente.
- Data/hora de início prevista, prazo final, janela diária de operação, dias da semana e feriados aplicáveis.
- Prioridade, categoria operacional, criticidade, necessidade de autorização e regras específicas.

### Campos derivados e indicadores
- Total de viagens previstas, planejadas, iniciadas, concluídas, interrompidas e canceladas.
- Toneladas previstas, realizadas, pendentes e saldo.
- Percentual físico por toneladas e percentual operacional por viagens.
- Ritmo necessário (viagens/dia e toneladas/dia) para cumprir o prazo.
- Ritmo real, previsão de término, atraso projetado e desvio.
- Participações ativas e quantidade de motoristas/conjuntos envolvidos.
- Último evento, última atualização, alertas e pendências documentais.

Não atualizar campos derivados diretamente pela interface. Eles devem ser recalculados no servidor a partir de registros fonte e reconciliados por rotina de integridade.

## 4. Dimensionamento da operação e metas por motorista

### Estimativa inicial
1. Validar volume total, unidade, origem, destino e período.
2. Obter capacidade útil operacional aprovada de cada conjunto elegível. PBTC, tara e capacidade legal não são intercambiáveis.
3. Calcular viagens mínimas por conjunto: teto(volume alocado / capacidade útil).
4. Considerar restrições do local, tipo de carroceria, eixos, limites de acesso, janela, distância, duração do ciclo, pausas/descanso, disponibilidade e produtividade.
5. Exibir a estimativa como estimativa, nunca como garantia. O gestor confirma a meta global e a distribuição.
6. Se não houver conjunto elegível ou capacidade útil confiável, bloquear o cálculo automático e solicitar dado técnico/revisão.

### Distribuição por participação
Cada PARTICIPACAO_OPERACOES deve registrar:
- ID, operação, motorista, conjunto, status e posição/prioridade na distribuição.
- Volume em toneladas atribuído.
- Viagens previstas atribuídas.
- Viagens iniciadas, concluídas e canceladas (derivadas das viagens vinculadas).
- Datas previstas e reais de início/fim.
- Motivo da designação, responsável, data e histórico de alterações.
- Confirmação/aceite do motorista quando o fluxo exigir.

Validações:
- Motorista e conjunto devem estar ativos, aprovados, autorizados e disponíveis.
- O motorista informado deve ser o motorista vigente do conjunto, salvo substituição formal registrada.
- Conjunto e motorista não podem ter conflito de agenda nem viagens simultâneas.
- Volume atribuído > 0; viagens previstas > 0 para participação ativa.
- Volume atribuído não pode exceder capacidade útil × viagens previstas.
- Soma do volume atribuído = volume da operação dentro da tolerância aprovada.
- Soma das viagens previstas = meta global confirmada.
- Não permitir duplicidade de participação ativa para o mesmo motorista/conjunto na mesma operação.
- A alteração de metas após início exige motivo, autor, timestamp e snapshot antes/depois.
- Se a soma não fechar, a operação fica em PLANEJAMENTO/REPLANEJAMENTO e não pode liberar novas viagens.

### Exemplo de cálculo
Operação de 1.000 t:
- Conjunto A: capacidade útil 25 t, volume atribuído 500 t → mínimo 20 viagens.
- Conjunto B: capacidade útil 20 t, volume atribuído 500 t → mínimo 25 viagens.
- Meta global: 45 viagens.
O sistema mostra 45 viagens mínimas estimadas e o gestor confirma ou ajusta com justificativa. A última viagem de cada participação leva apenas o saldo restante, sem ultrapassar capacidade.

## 5. Geração e controle das viagens

Uma viagem é criada para cada execução prevista ou sob demanda conforme política da operação. Campos:
- ID, operação, participação, sequência na operação e sequência do motorista.
- Motorista e conjunto snapshots, para preservar quem executou mesmo se o vínculo de frota mudar depois.
- Status, origem/destino IDs e snapshots, rota e distância.
- Peso previsto, peso real, unidade e tolerância.
- Horários previstos e reais: início, chegada à origem, início/fim de carregamento, saída da origem, chegada ao destino, início/fim de descarga e conclusão.
- Motivo de atraso, interrupção, cancelamento ou divergência.
- Criada/atualizada por e em.

Regras:
- A soma do peso previsto das viagens deve reconciliar com o volume atribuído à participação.
- A última viagem pode ser parcial.
- Peso real não pode exceder capacidade útil do conjunto nem saldo restante da operação sem autorização.
- Uma viagem não pode estar simultaneamente ativa em dois conjuntos/motoristas.
- Ao trocar motorista/conjunto depois de iniciada a operação, encerrar a participação anterior e criar outra; não reescrever viagens passadas.
- Viagens futuras podem ser replanejadas, mas viagens iniciadas/concluídas preservam seus snapshots.

## 6. Ciclo de vida e eventos

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

Cada transição deve validar o estado anterior e gerar EVENTO_VIAGEM com:
- tipo, hora de ocorrência e hora de recebimento (se offline/atrasado);
- usuário responsável, origem (portal, painel, WhatsApp, integração);
- local e coordenadas quando disponíveis;
- descrição, observação, anexos e chave idempotente.

Não concluir viagem sem os requisitos configurados na operação: peso real, confirmação de descarga e comprovante quando exigido. Eventos fora de ordem entram em revisão, não reescrevem silenciosamente o estado atual.

## 7. Documentos e evidências

DOCUMENTOS_VIAGEM guarda tipo, viagem/evento, arquivo privado, nome, MIME, hash, recebido em/por, estado de validação, observações e trilha de revisão.
Tipos configuráveis: comprovante de carregamento, ticket de balança origem/destino, comprovante de descarga, canhoto, foto, ocorrência e documento complementar.
Deduplicar por hash e origem. Arquivo inválido ou ausente gera pendência sem perder o evento original.

## 8. Disponibilidade, jornada e conflitos

- Disponibilidade é por motorista e período/data, com origem da informação, confirmação e motivo.
- Considerar jornada, descanso, afastamento, férias, restrições e bloqueios administrativos, conforme regras configuradas.
- A disponibilidade de motorista não implica disponibilidade do conjunto; validar ambos.
- Impedir sobreposição de viagens e janelas incompatíveis.
- Recalcular candidatos quando mudar prazo, janela, rota, capacidade, disponibilidade ou composição.
- Registrar recusas, expiração de oferta, aceite e substituição sem apagar tentativas anteriores.

## 9. Estados da operação

Estados sugeridos e suas regras:
- RASCUNHO: dados incompletos, sem alocação liberada.
- EM_PLANEJAMENTO: dados essenciais completos; distribuição em construção.
- AGUARDANDO_APROVACAO: plano consistente aguardando aprovação.
- ABERTA: aprovada e apta a receber/gerar viagens.
- EM_ANDAMENTO: pelo menos uma viagem iniciada.
- PAUSADA: interrupção administrativa/operacional com motivo.
- PENDENTE_REPLANEJAMENTO: plano perdeu consistência ou exige nova distribuição.
- CONCLUIDA: volume conciliado dentro da tolerância e nenhuma viagem pendente/aberta.
- CANCELADA: encerrada com motivo, preservando viagens e eventos.

Transições são feitas no servidor e auditadas. Status não é campo livre.

## 10. Relatórios e alertas

Painel da operação deve mostrar:
- previsto x realizado de viagens e toneladas;
- progresso por motorista, conjunto e viagem;
- ritmo necessário para prazo e previsão de término;
- atrasos, paradas, desvios de rota, falta de atualização e viagens sem comprovantes;
- capacidade ociosa, conflitos, recusas e substituições;
- documentos vencidos ou pendentes;
- custo/indicadores financeiros somente quando houver fonte de dados e regra aprovada.

Relatórios devem permitir filtros por cliente, operação, período, motorista, conjunto, status, origem/destino e prioridade.

## 11. Segurança, auditoria e integridade

- Toda escrita crítica usa lock, validação dentro do lock e gravação idempotente.
- A mesma requisição repetida não pode criar participação, viagem ou evento duplicado.
- Auditoria guarda autor, ação, entidade, ID, data/hora, motivo e antes/depois para alterações críticas.
- Não confiar em validações feitas apenas no navegador.
- Portal do motorista deriva o motorista exclusivamente da sessão; nunca aceita ID de terceiro enviado pelo cliente.
- Motorista vê somente suas operações/participações/viagens e pode executar somente ações permitidas.
- Dados de cliente e operações ficam isolados por tenant quando o produto multiempresa for ativado.
- Reconciliador identifica órfãos, soma divergente, capacidade excedida, saldo negativo e status incompatível.

## 12. Fora do produto e legado

Não criar nem utilizar em fluxos ativos:
- CAMINHOES;
- CARGAS;
- MOVIMENTACOES_OPERACAO como registro agregado de execução;
- ESCALAS como entidade/tela independente.

Não apagar automaticamente guias antigas nem dados legados. Isolar referências antigas, inventariar dependências e manter preservação até migração explicitamente aprovada. A guia protegida CAVALOS-BRUNO não deve ser consultada, listada, migrada, limpa ou usada por qualquer rotina.

## 13. Critérios de aceite

1. Criar operação completa com cliente, locais, volume, rota, prazos, janelas, restrições e meta de viagens.
2. Calcular estimativa mínima de viagens com base em capacidade útil aprovada.
3. Distribuir volume e metas entre um ou vários motoristas/conjuntos.
4. Bloquear plano inconsistente e mostrar exatamente o que falta corrigir.
5. Gerar viagens individuais e distribuir carga prevista, inclusive última viagem parcial.
6. Registrar ciclo completo, eventos, pesos, horários e comprovantes.
7. Replanejar sem alterar histórico executado.
8. Identificar conflitos de disponibilidade/jornada/capacidade.
9. Mostrar progresso e previsão de término por operação e por participação.
10. Não haver telas/APIs ativas dependentes de CAMINHOES, CARGAS ou ESCALAS independentes.
11. Todas as ações críticas protegidas no servidor e auditadas.
12. Testes automatizados com cenários normais, limites, falhas, concorrência e dados fictícios.

## 14. Ordem de implementação

A. Alinhar esquema canônico e inventário de referências legadas.  
B. Completar CRUD de clientes, locais, frota e operações.  
C. Completar motor de dimensionamento e distribuição de metas.  
D. Completar geração e ciclo de vida de viagens.  
E. Integrar portal do motorista e permissões.  
F. Completar documentos, eventos, disponibilidade e alertas.  
G. Testes de integridade, segurança e carga com massa sintética.  
H. Homologação e liberação controlada.

**Regra final:** o gestor cria uma OPERAÇÃO, informa o que precisa ser transportado e em que prazo, o sistema calcula quantas VIAGENS serão necessárias, distribui as metas por motorista/conjunto e acompanha cada VIAGEM até a conclusão e conciliação do volume.
