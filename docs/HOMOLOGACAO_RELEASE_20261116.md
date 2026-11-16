# Homologação de release — FullTime

## Escopo desta rodada

- Confirmar que o prazo de 2 horas vale para a resposta do motorista, não para a confirmação administrativa de um aceite já registrado.
- Garantir que cancelamentos automáticos por reprogramação não preencham `RESPONDIDA_EM`.
- Verificar portal, histórico, avanço da fila e ciclo de vida das operações em base exclusiva de homologação.

## Bloqueios antes de executar

1. Confirmar que `FT_REGISTRY_DATABASE_ID` aponta para a planilha exclusiva de homologação.
2. Confirmar que `FT_DATABASE_ID` aponta para a base de autenticação de homologação.
3. Fazer backup das guias permitidas de homologação.
4. Não executar limpeza, geração de massa ou padronização de senhas em planilha de produção.
5. Confirmar que as guias `PARTICIPACAO_OPERACOES`, `EVENTOS_ESCALA`, `FILA_MOTORISTAS`, `OPERACOES` e `MOVIMENTACOES_OPERACAO` têm os cabeçalhos esperados.

## Testes funcionais obrigatórios

| ID | Cenário | Resultado esperado |
|---|---|---|
| H01 | Oferta criada para motorista fictício | Status `OFERTADA`, expiração em 2 horas e evento de disponibilização no portal |
| H02 | Motorista aceita antes do vencimento; administrador confirma após o horário original | Aceite permanece válido e confirmação administrativa muda para `ATIVO` |
| H03 | Motorista recusa | Status `RECUSADA`, resposta registrada, motorista reposicionado ao fim da fila e próximo elegível ofertado |
| H04 | Oferta vence sem resposta | Status `NAO_RESPONDEU`, `RESPONDIDA_EM` vazio, evento de prazo encerrado e motorista no fim da fila |
| H05 | Operação é reprogramada com oferta ainda pendente | Status `CANCELADA_REPROGRAMACAO`, `RESPONDIDA_EM` vazio e evento com motivo |
| H06 | Outro motorista tenta consultar oferta alheia | Acesso negado; nenhum dado de outro motorista exposto |
| H07 | Operação ultrapassa DATA_ENTREGA | Continua operacionalmente aberta/em andamento e é sinalizada como atrasada |
| H08 | Saldo zero, mas viagens pendentes | Não sugere nem permite conclusão |
| H09 | Saldo e viagens conferidos, mas há participação ativa | Não permite conclusão |
| H10 | Saldo zero, viagens conferidas e nenhuma participação ativa | Sugere conclusão; somente confirmação administrativa encerra |

## Evidências a registrar

- Logs das funções de auditoria estrutural e ciclo de vida.
- Capturas do portal do motorista fictício antes e depois da resposta.
- Linhas de participação e eventos correspondentes aos IDs de teste.
- Estado da fila antes e depois de recusa/expiração.
- Resultado do workflow de sintaxe do GitHub Actions.

## Limite conhecido

A criação de oferta nesta versão registra a convocação como disponibilizada no portal. Isso não comprova envio ou entrega por WhatsApp ou e-mail. A homologação desta rodada não deve declarar esses canais como integrados sem confirmação de um provedor, credenciais, retorno de entrega e teste real controlado.
