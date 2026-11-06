# FullTime — Plano de massa fictícia e testes de desempenho

## Objetivo
Criar um ambiente de homologação integralmente sintético para testar integridade, concorrência, escalabilidade, experiência de uso e limites do Apps Script/Google Sheets. A massa deve representar operações reais de transporte sem misturar dados pessoais ou operacionais verdadeiros.

## Regras inegociáveis
- Não executar limpeza ou carga em produção.
- Antes de qualquer reset: identificar a base de homologação autorizada, backup, inventário somente leitura, dry-run e confirmação explícita.
- A guia `CAVALOS-BRUNO` é protegida: não listar, ler, copiar, limpar, alterar, migrar ou usar em rotinas de teste.
- Não apagar guias nem cabeçalhos. Limpar apenas linhas de dados em allowlist revisada.
- Não gravar massa fictícia na planilha do Bruno. A base nativa FullTime é o ambiente de homologação.
- IDs determinísticos por seed; toda linha marcada como TESTE; domínio de e-mail reservado `example.test`; endereços fictícios.
- Nunca gerar dados pessoais reais. CPFs e placas de teste devem ser sintéticos, identificados e restritos ao ambiente de homologação.

## Modelo de dados canônico

| Entidade | Quantidade inicial | Observação |
|---|---:|---|
| MOTORISTAS | 100 | Perfis fictícios variados, documentos e estados |
| CLIENTES | 100 | Empresas fictícias com CNPJ/email e contatos |\n| CAVALOS | 100 | Capacidades e especificações variadas |
| CARRETAS | 100 | Tipos, capacidades e combinações variadas |
| CONJUNTOS | 100 | Relacionamentos válidos e capacidades úteis |
| LOCAIS | 100 | Pátios, terminais, clientes e destinos fictícios |
| REGRAS_OPERACIONAIS | 100 | Restrições por local, veículo, peso e janela |
| OPERACOES | 100 | Clientes, rotas, volume, prazo, prioridade e total de viagens |
| PARTICIPACAO_OPERACOES | 100 | Metas individuais de viagens e toneladas por motorista/conjunto |
| VIAGENS | 500 | Ciclos individuais, sequências, estados e pesos |
| EVENTOS_VIAGEM | 1.500 | Marcos cronológicos e eventos fora de ordem para teste |
| DOCUMENTOS_VIAGEM | 300 | Comprovantes e evidências sintéticas |
| CONTROLE_DOCUMENTAL | 300 | Validade, pendências e estados documentais |
| DISPONIBILIDADE_DIARIA | 300 | Disponibilidade em datas variadas |
| FILA_MOTORISTAS | 100 | Posições e históricos sintéticos |
| OFERTAS_OPERACOES | 200 | Ofertas, respostas, expiração e recusas |
| EVENTOS_OPERACAO | 300 | Designações, substituições, alterações e auditoria |
| TICKETS | 100 | Metadados de mensagens e comprovantes sintéticos vinculáveis a VIAGENS |

**Não criar:** CAMINHOES, CARGAS, MOVIMENTACOES_OPERACAO ou ESCALAS como entidades/telas independentes. A OPERAÇÃO concentra o planejamento; PARTICIPACAO_OPERACOES concentra a distribuição por motorista/conjunto; VIAGENS registra cada execução.

## Regras de integridade para a massa

1. Cada CONJUNTO referencia exatamente um motorista e um cavalo ativos; carretas opcionais devem existir e não podem estar vinculadas a outro conjunto ativo.
2. Cada OPERAÇÃO tem cliente, origem, destino, volume total, prazo/janela, prioridade e total previsto de viagens.
3. Cada PARTICIPAÇÃO pertence a uma operação e referencia motorista e conjunto válidos.
4. A soma de `VIAGENS_PREVISTAS` das participações ativas deve ser exatamente igual a `TOTAL_VIAGENS_PREVISTAS` da operação.
5. A soma de `TONELADAS_PREVISTAS` das participações ativas deve ser exatamente igual ao volume total da operação.
6. Em cada participação, `TONELADAS_PREVISTAS <= VIAGENS_PREVISTAS × CAPACIDADE_UTIL_TONELADAS`.
7. Cada VIAGEM referencia uma única operação, participação, motorista e conjunto; sequência de operação e sequência do motorista não se repetem.
8. O peso real de uma viagem não ultrapassa capacidade útil do conjunto nem saldo da operação.
9. Um motorista ou conjunto não pode ter duas viagens simultâneas.
10. Eventos têm timestamp de ocorrência e recebimento, responsável, origem do registro e chave de idempotência.
11. Viagens concluídas não são apagadas. Cancelamentos, interrupções, substituições e replanejamentos preservam histórico.

## Diversidade de cenários

A massa deve incluir:
- Operações com um motorista/conjunto e com múltiplas participações.
- Operações com viagem única, 2–5 viagens, 6–20 viagens e mais de 20 viagens.
- Viagens parciais na última execução, volumes próximos do limite e operação com saldo zero.
- Prazos curtos e longos, janelas de horário, prioridades baixa/normal/alta/urgente.
- Rotas curtas, médias e longas; locais com restrições diferentes.
- Conjuntos com capacidades distintas e carretas opcionais.
- Motoristas disponíveis, indisponíveis, em descanso, com documento vencendo e com restrições.
- Viagens planejadas, em deslocamento, no carregamento, em trânsito, no destino, descarregando, concluídas, interrompidas e canceladas.
- Eventos duplicados, atrasados, fora de ordem e recebidos offline.
- Comprovantes ausentes, inválidos, duplicados e aceitos.

## Execução obrigatória

1. Inventário somente leitura das guias permitidas, cabeçalhos, fórmulas, contagens e dependências.
2. Backup integral da base de homologação autorizada.
3. Dry-run mostrando exatamente quais guias e quantas linhas seriam limpas e inseridas.
4. Aprovação explícita do usuário.
5. Reset controlado apenas da allowlist; preservar cabeçalhos, fórmulas, validações e formatação.
6. Gerar em lotes de 25/50/100, com seed, checkpoint, idempotência e log.
7. Validar contagens, duplicidades, chaves órfãs, metas, capacidade, saldos e transições.
8. Testar em degraus: 100, 250, 500, 1.000 e 2.500 registros por entidade selecionada.
9. Medir tempo de leitura/escrita, renderização, payload, chamadas Apps Script, cache, quotas e erros.
10. Produzir relatório p50/p95, gargalos e recomendações.

## Cenários de teste de desempenho e segurança

- Abrir painel com todas as entidades carregadas.
- Listar, pesquisar, filtrar e paginar motoristas, frota, operações e viagens; distribuir metas e replanejar dentro da operação.
- Designar 1, 2, 5 e 10 conjuntos à mesma operação.
- Distribuir e validar metas individuais de viagens/toneladas.
- Iniciar, atualizar eventos e concluir viagens em sequência.
- Concorrência na mesma operação, no mesmo motorista e no mesmo conjunto.
- Tentativas de peso acima da capacidade ou do saldo.
- Reenvio duplicado de evento e webhook.
- Replanejamento, substituição e cancelamento com auditoria.
- Login simultâneo de administradores e motoristas; isolamento de dados por usuário.
- Falhas temporárias, timeout, retry e retomada de lote.

## Critérios de aceite
- Zero registros órfãos ou duplicados.
- Zero divergência entre metas individuais e total da operação.
- Zero viagens acima da capacidade ou saldo.
- Zero sobreposição de viagens por motorista/conjunto.
- Nenhuma leitura/escrita fora da allowlist.
- Nenhuma leitura/escrita na guia protegida.
- Nenhum acesso de motorista a dados de terceiros ou funções administrativas.
- Massa reproduzível pelo mesmo seed.
- Relatório de desempenho produzido antes da liberação controlada.

## Estado
Este plano foi atualizado para o modelo OPERAÇÃO → PARTICIPAÇÃO → VIAGEM. O gerador relacional definitivo, o reset controlado e os testes de carga ainda não foram executados.
