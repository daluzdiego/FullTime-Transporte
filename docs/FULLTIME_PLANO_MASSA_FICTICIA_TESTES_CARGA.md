# FullTime — Plano de massa fictícia e testes de carga

## Objetivo
Preparar um ambiente de homologação com dados inteiramente sintéticos para testar consistência, concorrência, desempenho e limites operacionais. Nenhum dado real deve ser misturado à massa.

## Regra de segurança
- Não executar limpeza nem carga em produção.
- Antes de qualquer limpeza: identificar explicitamente a planilha operacional autorizada, gerar cópia de segurança, apresentar inventário de guias e contagens e exigir confirmação explícita.
- A guia `CAVALOS-BRUNO` é permanentemente protegida: não listar, ler, limpar, alterar, copiar, migrar ou usar em rotinas de carga.
- Não apagar abas nem cabeçalhos. A limpeza de homologação deve apagar apenas linhas de dados de uma allowlist aprovada, preservando estrutura, fórmulas, validações e formatação.
- A planilha de Bruno não é a base oficial. Não importar nem gravar dados nela durante o teste de carga sem plano de integração específico.

## Massa alvo inicial
A meta é aproximadamente 100 registros por entidade, não 100 valores arbitrários em cada coluna. Cada linha deve ser completa conforme o esquema, com relacionamentos válidos e IDs estáveis.

| Entidade | Quantidade inicial |
|---|---:|
| MOTORISTAS | 100 |
| CAMINHOES | 100 |
| CAVALOS | 100 |
| CARRETAS | 100 |
| CONJUNTOS | 100 |
| LOCAIS | 100 |
| REGRAS_OPERACIONAIS | 100 |
| OPERACOES | 100 |
| CARGAS | 100 |
| ESCALAS | 100 |
| PARTICIPACAO_OPERACOES | 100 |
| MOVIMENTACOES_OPERACAO | 100 |
| CONTROLE_DOCUMENTAL | 100 |
| DISPONIBILIDADE_DIARIA | 100 |
| FILA_MOTORISTAS | 100 |
| OFERTAS_CARGAS | 100 |
| EVENTOS_ESCALA | 100 |
| TICKETS | 100 |

A massa será gerada com prefixo identificável `TESTE-`, e-mails em domínio reservado `example.test`, CPFs sintéticos válidos apenas para testes, placas sintéticas, endereços fictícios e datas distribuídas. Não usar dados pessoais reais.

## Integridade referencial
- Cada conjunto aponta para um motorista e um cavalo existentes; carretas opcionais devem existir.
- Cada carga aponta para uma operação/local/cliente coerentes quando o esquema oferecer essas chaves.
- Escalas e participações referenciam cargas/operações e conjuntos existentes.
- Movimentações não podem ultrapassar o saldo da operação.
- Documentos e eventos referenciam o cadastro correto.
- A geração deve ser determinística por seed, para reproduzir falhas.

## Etapas obrigatórias
1. **Inventário somente leitura:** planilha, guias permitidas, cabeçalhos, fórmulas, linhas e dependências.
2. **Backup:** cópia integral das planilhas autorizadas e registro dos IDs/horários.
3. **Dry-run:** apresentar contagem a limpar e contagem a inserir por guia; não gravar.
4. **Limpeza controlada:** apenas após confirmação explícita, somente em ambiente de homologação e allowlist aprovada.
5. **Carga em lotes:** lotes configuráveis (ex.: 25/50/100), com checkpoint, idempotência e log por lote.
6. **Validação pós-carga:** contagem, duplicidade, chaves órfãs, saldos, estados e integridade referencial.
7. **Testes de carga graduais:** 100, 250, 500, 1.000 e 2.500 registros por entidade selecionada, sem saltar direto para volume extremo.
8. **Medição:** tempo de leitura, escrita, renderização, chamadas Apps Script, uso de cache, falhas, quotas e tamanho de payload.
9. **Relatório:** p50/p95, taxa de erro, maior gargalo, guias e funções mais lentas, recomendações.

## Cenários de desempenho
- Abrir painel com todas as entidades populadas.
- Filtrar e pesquisar motoristas, frota, operações e cargas.
- Abrir listas grandes e alternar páginas.
- Criar e editar cadastros em sequência.
- Concorrência de gravações simultâneas e colisão de CPF/placa.
- Montar e alterar conjuntos.
- Criar operações com múltiplas cargas.
- Designar, remanejar e concluir viagens.
- Sincronização Drive com alterações repetidas, eventos fora de ordem e falhas temporárias.
- Login/logout e carregamento simultâneo de vários motoristas.

## Critérios de aceite
- Zero registros órfãos.
- Zero duplicidades de CPF/placa.
- Nenhuma operação de limpeza fora da allowlist.
- Nenhuma leitura/escrita na guia protegida.
- Nenhuma permissão de motorista para acessar dados de terceiros ou funções administrativas.
- Todas as cargas reproduzíveis por seed e registradas em log.
- Relatório de desempenho produzido antes de qualquer liberação.

## Estado
Este documento define o plano. A limpeza, a geração de massa e os testes reais ainda não foram executados.
