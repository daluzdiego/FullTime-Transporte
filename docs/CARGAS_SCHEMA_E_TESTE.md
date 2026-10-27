# Cargas — correção de schema e preparação para teste

## O que foi alterado
- `Code.gs`: leitura de CARGAS usa a largura real da guia, preserva as 19 colunas já existentes e lê a nova coluna `VALOR_FRETE` (coluna 20).
- `Code.gs`: gravação de carga persiste os 20 campos alinhados ao cabeçalho, incluindo `TIPO_OPERACAO`, URLs de ticket (vazias até a integração de comprovantes) e `VALOR_FRETE`.
- `Code.gs`: valida data, horário, peso, tipo de operação e valor do frete; usa lock para evitar colisões em gravações simultâneas.
- `Index.html`: formulário de carga agora tem tipo de operação e valor do frete; a lista administrativa exibe o frete.

## Cabeçalho final esperado de CARGAS
`ID, CRIADO_EM, STATUS, DATA_OPERACAO, HORARIO_PREVISTO, CLIENTE, ORIGEM, DESTINO, PESO_TONELADAS, DESCRICAO, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, OBSERVACOES, CRIADO_POR, TIPO_OPERACAO, TICKET_CARREGAMENTO_URL, TICKET_DESCARGA_URL, VALOR_FRETE`

## Aplicação no Apps Script
1. Copie as versões atualizadas de `Code.gs` e `Index.html` do repositório para o projeto Apps Script correspondente.
2. Confirme que a propriedade `FT_REGISTRY_DATABASE_ID` aponta para a planilha operacional correta.
3. Execute manualmente `prepararBaseOperacionalFullTime()` uma vez e autorize as permissões. A função valida as guias existentes e só acrescenta colunas finais ausentes quando os cabeçalhos existentes forem um prefixo compatível; não deve apagar linhas de dados.
4. Confira a linha 1 de `CARGAS`: deve terminar em `VALOR_FRETE`.
5. Implante uma nova versão em **Implantar > Gerenciar implantações > Editar > Nova versão > Implantar**.
6. Teste com uma carga fictícia: tipo de operação, valor do frete, data, horário, cliente, origem, destino e peso. Verifique que a linha tem 20 colunas e que o painel mostra o frete.
7. Teste também uma carga sem frete: o campo deve ficar vazio, não virar um valor inventado.

## Limites atuais
- Alterações no GitHub não atualizam automaticamente o Apps Script.
- Nenhuma planilha real foi alterada por este commit; a migração ocorre somente quando a função de preparação é executada no Apps Script.
- O painel de cargas continua sendo administrativo. O portal autenticado do motorista, candidaturas, regras de elegibilidade e notificações são uma etapa separada e não devem ser consideradas ativadas por esta correção.
- O WhatsApp ainda depende das configurações oficiais da Meta; esta alteração não envia mensagens nem executa OCR.
