# FullTime — integração inicial de operações multi-cliente e lotes

**Status:** implementação backend adicionada; não executada em planilha real nem homologada.

## Arquivo
- `OperacoesLotes.gs`: novo módulo Apps Script, carregado junto aos demais arquivos .gs do projeto.

## Funcionalidades adicionadas
- Prévia e preparação explícita das guias `OPERACAO_CONFIGURACOES`, `OPERACAO_CLIENTES` e `LOTES_OPERACAO`.
- Cadastro de operação com nome próprio, particularidades JSON, múltiplos clientes e múltiplos lotes.
- Validação de cliente ativo e vínculo do cliente do lote à operação.
- Validação de volume, vagas, motoristas planejados, origem/destino e janelas.
- Consulta dos detalhes, clientes e lotes de uma operação.
- Lock de escrita e rollback compensatório das linhas criadas nesta chamada quando ocorre erro.

## Como ativar com segurança
1. Publicar/sincronizar o novo arquivo no projeto Apps Script de desenvolvimento.
2. Entrar como administrador e executar `prepararEstruturaLotesFullTime(token, false)` para prévia.
3. Conferir que as três guias estão ausentes ou compatíveis.
4. Somente em cópia de teste com dados fictícios, executar `prepararEstruturaLotesFullTime(token, true)`.
5. Não executar em planilha real sem backup e autorização explícita.

## Limitações conhecidas
- A interface ainda não chama estes endpoints.
- O motor atual de viagens/participações ainda precisa ser estendido para vincular cada participação a um lote.
- A política concreta de ordenação de candidatos ainda precisa ser parametrizada.
- O rollback é compensatório por linha criada; falhas de auditoria ou concorrência externa devem ser cobertas por testes de integração antes da homologação.
- `TOTAL_VIAGENS_PREVISTAS` na entidade-pai é, por enquanto, uma estimativa técnica provisória baseada no volume e não substitui o cálculo definitivo por capacidade dos conjuntos. A etapa de distribuição deverá recalcular o total de viagens antes de aprovar a operação.
