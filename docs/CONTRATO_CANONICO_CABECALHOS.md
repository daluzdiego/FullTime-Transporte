# Full Time — Contrato canônico de cabeçalhos

**Revisão:** 2026-11-11  
**Fonte operacional única:** planilha principal `11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE`  
**Branch:** `fulltime-2.0`

## Regra

Os cabeçalhos abaixo são o contrato único da aplicação. Backend, formulários, interface e rotinas de escala devem localizar colunas pelo nome do cabeçalho. A ordem permanece documentada para leitura humana, mas não deve ser usada como chave de integração.

## Contrato operacional

| Guia | Cabeçalhos canônicos |
|---|---|
| MOTORISTAS | ID, CRIADO_EM, STATUS, NOME_COMPLETO, CPF, TELEFONE, EMAIL, CNH_NUMERO, CNH_CATEGORIA, CNH_VALIDADE, CIDADE_UF, OBSERVACOES |
| CAVALOS | ID, CRIADO_EM, STATUS, PLACA, MARCA, MODELO, ANO, TARA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES, CAPACIDADE_CARGA_TONELADAS |
| CARRETAS | ID, CRIADO_EM, STATUS, PLACA, TIPO_CARRETA, TARA_TONELADAS, CAPACIDADE_CARGA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES |
| CONJUNTOS | ID, CRIADO_EM, STATUS, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, OBSERVACOES, ESTADO_CONSERVACAO, RESTRICOES, CAPACIDADE_UTIL_TONELADAS, ATUALIZADO_POR |
| DOCUMENTOS | ID_DOCUMENTO, CRIADO_EM, STATUS, TIPO_DOCUMENTO, ENTIDADE, ID_EXTERNO, NUMERO_DOCUMENTO, DATA_EMISSAO, DATA_VALIDADE, OBSERVACOES |
| OPERACOES | ID, CRIADO_EM, STATUS, DATA_OPERACAO, CLIENTE, NOME_OPERACAO, ORIGEM, DESTINO, CATEGORIA, VOLUME_TOTAL_TONELADAS, TOTAL_VIAGENS_PREVISTAS, SALDO_TONELADAS, OBSERVACOES, CRIADO_POR, VIAGENS_REALIZADAS, TIPO_OPERACAO, PRODUTO_SERVICO, DISTANCIA_KM, DATA_ENTREGA, JANELA_INICIO, JANELA_FIM, TEMPO_ESTIMADO_HORAS |
| PARTICIPACAO_OPERACOES | ID, CRIADO_EM, OPERACAO_ID, CONJUNTO_ID, MOTORISTA_ID, STATUS_PARTICIPACAO, INICIO_EM, SAIDA_EM, RETORNO_EM, TONELADAS_MOVIMENTADAS, VIAGENS_CONCLUIDAS, MOTIVO, REGISTRADO_POR |
| MOVIMENTACOES_OPERACAO | ID, DATA_HORA, OPERACAO_ID, PARTICIPACAO_ID, CONJUNTO_ID, TONELADAS, VIAGEM_CONCLUIDA, OBSERVACOES, REGISTRADO_POR, QUANTIDADE_VIAGENS |
| LOCAIS | ID, CRIADO_EM, STATUS, NOME_LOCAL, CLIENTE, TIPO_LOCAL, ENDERECO, CIDADE_UF, REGRAS_OBSERVACOES |
| REGRAS_OPERACIONAIS | ID, CRIADO_EM, STATUS, LOCAL_ID, PESO_MIN_TONELADAS, PESO_MAX_TONELADAS, TIPO_CAVALO, TIPO_CARRETA, EXIGENCIAS, OBSERVACOES |
| DISPONIBILIDADE_DIARIA | ID, CRIADO_EM, DATA_OPERACAO, MOTORISTA_ID, STATUS_DISPONIBILIDADE, CONFIRMADO_EM, INDISPONIVEL_EM, MOTIVO, ATUALIZADO_POR |
| FILA_MOTORISTAS | ID, DATA_ENTRADA, MOTORISTA_ID, CONJUNTO_ID, STATUS_FILA, ULTIMA_OFERTA_EM, ULTIMA_OPERACAO_CONCLUIDA_EM, VIAGENS_PERIODO, OBSERVACOES |
| EVENTOS_ESCALA | ID, DATA_HORA, TIPO_EVENTO, OPERACAO_ID, MOTORISTA_ID, CONJUNTO_ID, POSICAO_ANTERIOR, POSICAO_NOVA, MOTIVO, REGISTRADO_POR |
| ENTRADA_OPERACOES_IA | ID, RECEBIDO_EM, ORIGEM_MENSAGEM, MENSAGEM_BRUTA, CLIENTE, NOME_OPERACAO, ORIGEM, DESTINO, DATA_OPERACAO, VOLUME_TONELADAS, VIAGENS_PREVISTAS, PRODUTO, TIPO_OPERACAO, STATUS_INTERPRETACAO, OPERACAO_ID, OBSERVACOES, INTERPRETACAO_JSON, PROCESSADO_EM |

## Comparação histórica com a planilha antiga do Bruno

Uma auditoria anterior, em 2026-11-06, registrou divergência de quantidade de colunas entre os contratos então usados no arquivo de referência e o código: MOTORISTAS 26 vs. 12; CAVALOS 36 vs. 10; CARRETAS 30 vs. 9; CONJUNTOS 29 vs. 12; OPERACOES 15 vs. 14; CONTROLE_DOCUMENTAL 14 colunas.

**Limitação importante:** a planilha antiga do Bruno foi posteriormente esvaziada por autorização do proprietário, mantendo a guia protegida `CAVALOS-BRUNO`. Como `clearContents()` removeu também os cabeçalhos, o Git atual não contém os nomes exatos de todas aquelas colunas antigas. Portanto, não é correto afirmar uma comparação textual completa Bruno × principal depois da limpeza. Os números acima são somente o registro histórico das larguras observadas, não uma prova dos nomes/ordem dos cabeçalhos antigos.

A planilha antiga não participa mais da execução. A comparação ativa passa a ser: cabeçalhos reais da planilha principal × este contrato canônico × consumidores do Apps Script.

## Validação

Execute no Apps Script:

```javascript
FT_AUDITAR_CONTRATO_CABECALHOS_20261111()
```

A função é somente leitura. Ela compara existência, quantidade, nome e ordem dos cabeçalhos das 14 guias com o contrato acima. Não modifica dados nem acessa a planilha antiga do Bruno ou a guia protegida.

## Regras de implementação

- Nunca usar índice de coluna fixo para localizar dados de negócio; montar mapa por cabeçalho.
- Para entidades com relações, usar IDs estáveis: MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID.
- A interface recebe `camposPorNome` além do vetor de compatibilidade `campos`.
- Não criar `CAMINHOES` nem `CARGAS`.
- Não reintroduzir sincronização Bruno → principal.
- Não apagar a base de autenticação nem a guia protegida `CAVALOS-BRUNO`.
