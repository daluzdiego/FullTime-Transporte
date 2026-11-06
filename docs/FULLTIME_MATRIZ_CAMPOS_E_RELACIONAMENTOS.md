> **Atualização normativa (2026-11-06):** este documento registra também problemas e estruturas históricas. Para a arquitetura vigente, CARGAS e CAMINHOES estão descontinuados. A fonte normativa é `docs/FULLTIME_MODELO_OPERACIONAL_OPERACOES_VIAGENS.md`: OPERAÇÃO → PARTICIPACAO_OPERACOES → VIAGENS → EVENTOS_VIAGEM/DOCUMENTOS_VIAGEM.

# FullTime — Matriz de campos, estruturas e relacionamentos

**Branch:** `feat/arquitetura-multicanal-sem-planilha-bruno`  
**Base auditada:** código do repositório nesta branch  
**Escopo:** inventário estático dos contratos declarados em `Code.gs` e comparação com o modelo de cadastro em lote.  
**Limite da auditoria:** esta matriz não representa uma leitura ao vivo das planilhas Google. Os cabeçalhos reais, dados, fórmulas, validações, proteções e gatilhos ainda precisam ser conferidos com acesso autorizado. Nenhuma planilha foi aberta ou modificada nesta auditoria.

## 1. Resultado executivo

O repositório já declara uma base operacional com 18 guias de negócio, além das guias internas de usuários e auditoria. Há, porém, quatro problemas arquiteturais que precisam ser tratados antes de ampliar os cadastros:

1. **Leitura legada ainda ativa:** `listarRegistros_()`, `contarAtivos_()` e `contarStatus_()` ainda recorrem a `ftBrunoRowsAsLegacy_()` para MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS. A consulta de documentos do painel também lê o espelho legado. Portanto, a base nativa ainda não é a fonte exclusiva dessas consultas.
2. **Modelo duplicado de veículo:** existem MOTORISTAS e CAMINHOES (LEGADO — DESCONTINUADO) no cadastro inicial, e também CAVALOS e CARRETAS no esquema operacional. O código faz associação de capacidade de CAMINHOES (LEGADO — DESCONTINUADO) com CAVALOS pela placa normalizada. Isso cria dois contratos para informações que precisam ter uma definição canônica.
3. **Relacionamentos incompletos:** OPERACOES e CARGAS (LEGADO — DESCONTINUADO) guardam cliente, origem e destino como texto, enquanto o modelo futuro exige referências estáveis para CLIENTES, ENDERECOS, LOCAIS e ROTAS.
4. **Viagem não está modelada como entidade própria no esquema operacional auditado:** há MOVIMENTACOES_OPERACAO e HISTORICO_OPERACOES, mas não uma tabela/guia VIAGENS com ciclo individual, identificador próprio e eventos/comprovantes vinculados.

**Conclusão:** não é seguro criar novas guias ou migrar dados antes de fechar o dicionário canônico, mapear os campos legados e definir chaves de relacionamento.

## 2. Inventário de estruturas declaradas no código

Os campos abaixo foram extraídos dos arrays de cabeçalho encontrados em `Code.gs`. A ordem é a ordem declarada no código.

### 2.1 Base interna inicial

| Guia | Campos declarados | Observação |
|---|---|---|
| USUARIOS | ID, LOGIN, NOME, PERFIL, SALT, HASH_SENHA, ATIVO, TROCAR_SENHA, CRIADO_EM | Identidade e autenticação; não é cadastro operacional. |
| AUDITORIA | DATA_HORA, LOGIN, ACAO, ENTIDADE, REGISTRO_ID, DETALHES | Trilha administrativa básica; avaliar tenant_id, ator_id e estrutura de evento. |
| MOTORISTAS | ID, CRIADO_EM, STATUS, NOME_COMPLETO, CPF, TELEFONE, EMAIL, CNH_NUMERO, CNH_CATEGORIA, CNH_VALIDADE, CIDADE_UF, OBSERVACOES | O cadastro inicial é de 12 campos. |
| CAMINHOES (LEGADO — DESCONTINUADO) | ID, CRIADO_EM, STATUS, PLACA, RENAVAM, MARCA, MODELO, ANO, TIPO_VEICULO, CAPACIDADE_TONELADAS, SITUACAO_DOCUMENTAL, OBSERVACOES | Estrutura genérica de caminhão; conflita conceitualmente com CAVALOS e CARRETAS. |

### 2.2 Base operacional preparada por `prepararBaseOperacionalFullTime()`

| Guia | Campos declarados | Qtde. |
|---|---|---:|
| CAVALOS | ID, CRIADO_EM, STATUS, PLACA, MARCA, MODELO, ANO, TARA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES | 10 |
| CARRETAS | ID, CRIADO_EM, STATUS, PLACA, TIPO_CARRETA, TARA_TONELADAS, CAPACIDADE_CARGA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES | 9 |
| CONJUNTOS | ID, CRIADO_EM, STATUS, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, OBSERVACOES, ESTADO_CONSERVACAO, RESTRICOES, CAPACIDADE_UTIL_TONELADAS, ATUALIZADO_POR | 12 |
| OPERACOES | ID, CRIADO_EM, STATUS, DATA_OPERACAO, CLIENTE, NOME_OPERACAO, ORIGEM, DESTINO, CATEGORIA, VOLUME_TOTAL_TONELADAS, TOTAL_CARGAS (LEGADO — DESCONTINUADO)_PREVISTAS, SALDO_TONELADAS, OBSERVACOES, CRIADO_POR | 14 |
| PARTICIPACAO_OPERACOES | ID, CRIADO_EM, OPERACAO_ID, CONJUNTO_ID, MOTORISTA_ID, STATUS_PARTICIPACAO, INICIO_EM, SAIDA_EM, RETORNO_EM, TONELADAS_MOVIMENTADAS, VIAGENS_CONCLUIDAS, MOTIVO, REGISTRADO_POR | 13 |
| MOVIMENTACOES_OPERACAO | ID, DATA_HORA, OPERACAO_ID, PARTICIPACAO_ID, CONJUNTO_ID, TONELADAS, VIAGEM_CONCLUIDA, OBSERVACOES, REGISTRADO_POR | 9 |
| LOCAIS | ID, CRIADO_EM, STATUS, NOME_LOCAL, CLIENTE, TIPO_LOCAL, ENDERECO, CIDADE_UF, REGRAS_OBSERVACOES | 9 |
| REGRAS_OPERACIONAIS | ID, CRIADO_EM, STATUS, LOCAL_ID, PESO_MIN_TONELADAS, PESO_MAX_TONELADAS, TIPO_CAVALO, TIPO_CARRETA, EXIGENCIAS, OBSERVACOES | 10 |
| CARGAS (LEGADO — DESCONTINUADO) | ID, CRIADO_EM, STATUS, DATA_OPERACAO, HORARIO_PREVISTO, CLIENTE, ORIGEM, DESTINO, PESO_TONELADAS, DESCRICAO, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, OBSERVACOES, CRIADO_POR, TIPO_OPERACAO, TICKET_CARREGAMENTO_URL, TICKET_DESCARGA_URL, VALOR_FRETE | 20 |
| ESCALAS | ID, CRIADO_EM, STATUS, CARGA_ID, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, MOTIVO_SELECAO, INICIO_PREVISTO, FIM_PREVISTO, OBSERVACOES | 12 |
| HISTORICO_OPERACOES | ID, DATA_HORA, CARGA_ID, MOTORISTA_ID, ORIGEM, DESTINO, EVENTO, OBSERVACOES, REGISTRADO_POR | 9 |
| TICKETS | ID, RECEBIDO_EM, WHATSAPP_MESSAGE_ID, TELEFONE_REMETENTE, MOTORISTA_ID, CARGA_ID, TIPO_TICKET, MEDIA_ID, DRIVE_FILE_ID, DRIVE_FILE_URL, NOME_ARQUIVO, MIME_TYPE, STATUS_LEITURA, DATA_HORA_EXTRAIDA, CONFIANCA_LEITURA, ERRO_VALIDACAO, RETENCAO_ATE, METADADOS_JSON | 18 |
| DISPONIBILIDADE_DIARIA | ID, CRIADO_EM, DATA_OPERACAO, MOTORISTA_ID, STATUS_DISPONIBILIDADE, CONFIRMADO_EM, INDISPONIVEL_EM, MOTIVO, ATUALIZADO_POR | 9 |
| FILA_MOTORISTAS | ID, DATA_ENTRADA, MOTORISTA_ID, CONJUNTO_ID, STATUS_FILA, ULTIMA_OFERTA_EM, ULTIMA_CARGA_CONCLUIDA_EM, VIAGENS_PERIODO, OBSERVACOES | 9 |
| OFERTAS_CARGAS (LEGADO — DESCONTINUADO) | ID, CRIADO_EM, CARGA_ID, MOTORISTA_ID, CONJUNTO_ID, POSICAO_FILA, STATUS_OFERTA, EXPIRA_EM, RESPONDIDO_EM, MOTIVO_RECUSA, CRIADO_POR | 11 |
| EVENTOS_ESCALA | ID, DATA_HORA, TIPO_EVENTO, CARGA_ID, MOTORISTA_ID, CONJUNTO_ID, POSICAO_ANTERIOR, POSICAO_NOVA, MOTIVO, REGISTRADO_POR | 10 |

### 2.3 Espelhos legados identificados

O objeto `FT_BRUNO_CADASTROS` declara os seguintes espelhos:

| Entidade lógica | Guia espelhada | Campos esperados |
|---|---|---|
| MOTORISTAS | FT_CADASTRO_BRUNO_MOTORISTAS | ID, CRIADO_EM, STATUS, NOME_COMPLETO, CPF, TELEFONE, EMAIL, CNH_NUMERO, CNH_CATEGORIA, CNH_VALIDADE, CIDADE_UF, OBSERVACOES |
| CAVALOS | FT_CADASTRO_BRUNO_CAVALOS | ID, CRIADO_EM, STATUS, PLACA, MARCA, MODELO, ANO, TARA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES |
| CARRETAS | FT_CADASTRO_BRUNO_CARRETAS | ID, CRIADO_EM, STATUS, PLACA, TIPO_CARRETA, TARA_TONELADAS, CAPACIDADE_CARGA_TONELADAS, PBTC_MAX_TONELADAS, OBSERVACOES |
| CONJUNTOS | FT_CADASTRO_BRUNO_CONJUNTOS | ID, CRIADO_EM, STATUS, MOTORISTA_ID, CAVALO_ID, CARRETA_MEIO_ID, CARRETA_FINAL_ID, OBSERVACOES, ESTADO_CONSERVACAO, RESTRICOES, CAPACIDADE_UTIL_TONELADAS, ATUALIZADO_POR |
| DOCUMENTOS | FT_CADASTRO_BRUNO_DOCUMENTOS | ID_DOCUMENTO, CRIADO_EM, STATUS, TIPO_DOCUMENTO, ENTIDADE, ID_EXTERNO, NUMERO_DOCUMENTO, DATA_EMISSAO, DATA_VALIDADE, OBSERVACOES |

O leitor legado normaliza nomes de cabeçalho e tenta mapear aliases. Quando uma coluna não é encontrada, o campo correspondente é retornado vazio. Isso pode mascarar divergências de cabeçalho como campos em branco, em vez de interromper a leitura.

## 3. Divergências e riscos encontrados

| ID | Divergência | Evidência no código | Risco | Tratamento necessário |
|---|---|---|---|---|
| D-01 | Cadastros de frota ainda dependem de espelhos Bruno | `listarRegistros_()`, `contarAtivos_()`, `contarStatus_()` | O sistema não opera de forma independente da planilha externa | Migrar leitura para tabelas nativas após reconciliação e homologação. |
| D-02 | MOTORISTAS é lido do espelho e combinado com registros locais | Bloco especial de `listarRegistros_('MOTORISTAS')` | Precedência e status podem divergir; risco de duplicidade | Definir chave canônica e política de reconciliação. |
| D-03 | CONJUNTOS combina espelho e guia local | Bloco especial de `listarRegistros_('CONJUNTOS')` | Mesmo conjunto pode existir em duas fontes com dados diferentes | Resolver origem, IDs e conflitos antes de desligar integração. |
| D-04 | CAMINHOES (LEGADO — DESCONTINUADO) e CAVALOS coexistem | Esquema inicial e operacional | Dois cadastros podem representar o mesmo veículo | Definir CAMINHOES (LEGADO — DESCONTINUADO) como legado/compatibilidade ou migrar seus campos para CAVALOS. Não apagar antes da prova de dependências. |
| D-05 | Capacidade do cavalo é derivada de CAMINHOES (LEGADO — DESCONTINUADO) pela placa | `listarRegistros_('CAVALOS')` | Dependência indireta e associação por placa mutável | Capacidade e atributos devem pertencer ao registro canônico do veículo; vínculo por ID. |
| D-06 | CLIENTE, ORIGEM e DESTINO são texto em OPERAÇÕES/CARGAS (LEGADO — DESCONTINUADO) | Cabeçalhos OPERACOES e CARGAS (LEGADO — DESCONTINUADO) | Erros de digitação e ausência de integridade referencial | Introduzir CLIENTE_ID, LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID e, quando aplicável, ROTA_ID. |
| D-07 | LOCAIS guarda endereço em um único campo | Cabeçalho LOCAIS | Não representa geocódigo, portaria, terminal, município, UF, país e dados de acesso separadamente | Normalizar endereço e dados operacionais do local. |
| D-08 | REGRAS_OPERACIONAIS tem escopo centrado em LOCAL_ID | Cabeçalho REGRAS_OPERACIONAIS | Regras por cliente, rota, operação e veículo não ficam bem representadas | Definir escopo, referência, vigência, prioridade e precedência. |
| D-09 | CARGAS (LEGADO — DESCONTINUADO) possui tickets como URL direta | Campos TICKET_CARREGAMENTO_URL e TICKET_DESCARGA_URL | Baixa rastreabilidade para múltiplos comprovantes e múltiplas viagens | Criar entidade de documento/comprovante vinculada à viagem e ao evento. |
| D-10 | Não há guia VIAGENS no esquema operacional | Ausência no mapa de schemas; MOVIMENTACOES_OPERACAO e HISTORICO_OPERACOES existentes | Uma carga pode ser confundida com execução/viagem | Criar modelo de viagem independente com eventos próprios. |
| D-11 | Participação e movimentação agregam viagens | VIAGENS_CONCLUIDAS e VIAGEM_CONCLUIDA | Não detalha ciclo individual de cada viagem | Relacionar cada movimentação a VIAGEM_ID e preservar histórico. |
| D-12 | Documentos só aparecem no espelho legado identificado | FT_CADASTRO_BRUNO_DOCUMENTOS e painel | Dependência legada e ausência de cadastro nativo formal no schema principal | Criar DOCUMENTOS com entidade proprietária, tipo, número, emissão, validade, arquivo e status. |
| D-13 | Esquemas não apresentam tenant_id | Arrays auditados | Bloqueia isolamento multiempresa real | Incluir TENANT_ID em todas as entidades de negócio e validar em cada consulta/escrita. |
| D-14 | IDs externos e códigos de importação não estão padronizados | Esquemas operacionais atuais | Importação repetida e atualização segura ficam frágeis | Adotar CODIGO_EXTERNO e chave única por tenant e entidade; manter ID interno imutável. |
| D-15 | Preparação de guias valida cabeçalhos estritamente | `prepararBaseOperacionalFullTime()` | Execução pode parar diante de cabeçalho divergente; não é migração | Criar ferramenta de diagnóstico somente leitura antes de qualquer preparação. |

## 4. Modelo canônico proposto — campos essenciais

Esta seção é uma proposta de contrato para discussão técnica e implementação. Não afirma que os campos já existam na planilha.

### 4.1 Campos comuns para entidades de negócio

- `ID`: identificador interno imutável.
- `TENANT_ID`: empresa proprietária do registro.
- `CODIGO_EXTERNO`: código informado no arquivo de importação ou sistema de origem, único por tenant e entidade quando preenchido.
- `STATUS`: estado padronizado do registro.
- `CRIADO_EM`, `CRIADO_POR`, `ATUALIZADO_EM`, `ATUALIZADO_POR`.
- `ORIGEM_REGISTRO`: PAINEL, IMPORTACAO, API, WHATSAPP, EMAIL ou MIGRACAO.
- `VERSAO_REGISTRO`: controle otimista de concorrência, quando necessário.

Não repetir todos esses campos em entidades puramente derivadas sem avaliar o custo; o contrato de auditoria deve ser consistente.

### 4.2 CLIENTES

- ID, TENANT_ID, CODIGO_EXTERNO, RAZAO_SOCIAL, NOME_FANTASIA, CNPJ, INSCRICAO_ESTADUAL, STATUS, SEGMENTO, OBSERVACOES.
- Contatos e endereços ficam em entidades próprias, permitindo múltiplos registros por cliente.
- CNPJ deve ser validado e não deve ser usado como chave primária.

### 4.3 ENDERECOS_CLIENTES

- ID, TENANT_ID, CLIENTE_ID, CODIGO_EXTERNO, TIPO_ENDERECO, LOGRADOURO, NUMERO, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, PAIS, LATITUDE, LONGITUDE, PRINCIPAL, INSTRUCOES_ACESSO, STATUS.
- Um cliente pode possuir vários endereços.
- Endereço de cliente não substitui LOCAL_OPERACIONAL: uma unidade empresarial pode não ser um ponto operacional de carga.

### 4.4 LOCAIS_OPERACIONAIS

- ID, TENANT_ID, CODIGO_EXTERNO, CLIENTE_ID opcional, NOME_LOCAL, TIPO_LOCAL, LOGRADOURO, NUMERO, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, PAIS, LATITUDE, LONGITUDE, FUSO_HORARIO, PORTARIA_REFERENCIA, JANELA_ATENDIMENTO, TEMPO_MEDIO_OPERACAO_MIN, REGRAS_ACESSO, DOCUMENTOS_EXIGIDOS, CONTATO_OPERACIONAL_ID, STATUS.
- Tipos configuráveis: PORTO, TERMINAL, ARMAZEM, PATIO, BALANCA, FABRICA, CENTRO_DISTRIBUICAO, CLIENTE, OUTRO.
- Dados de portaria e acesso devem ser estruturados quando impactarem a execução.

### 4.5 MOTORISTAS

- ID, TENANT_ID, CODIGO_EXTERNO, NOME_COMPLETO, CPF, DATA_NASCIMENTO opcional conforme política, TELEFONE, EMAIL, CNH_NUMERO, CNH_CATEGORIA, CNH_VALIDADE, RNTRC quando aplicável, CIDADE, UF, STATUS, OBSERVACOES.
- CPF e CNH são atributos sensíveis: restringir exibição, logs e exportações por perfil.
- Dados pessoais adicionais só devem ser coletados se houver finalidade operacional/legal definida.

### 4.6 CAVALOS

- ID, TENANT_ID, CODIGO_EXTERNO, PLACA, RENAVAM, MARCA, MODELO, ANO_FABRICACAO, ANO_MODELO, TIPO_TRACAO, NUMERO_EIXOS, TARA_KG, PBTC_HOMOLOGADO_KG, RNTRC/REGISTRO quando aplicável, STATUS, OBSERVACOES.
- Capacidade não deve ser estimada apenas por soma de campos. Restrições legais e configuração homologada devem ser consideradas.

### 4.7 CARRETAS

- ID, TENANT_ID, CODIGO_EXTERNO, PLACA, RENAVAM quando aplicável, MARCA, MODELO, TIPO_CARRETA, NUMERO_EIXOS, TARA_KG, CAPACIDADE_CARGA_KG, PBTC_HOMOLOGADO_KG, STATUS, OBSERVACOES.

### 4.8 CONJUNTOS

- ID, TENANT_ID, CODIGO_EXTERNO, MOTORISTA_ID, CAVALO_ID, STATUS, DATA_INICIO_VIGENCIA, DATA_FIM_VIGENCIA, CAPACIDADE_UTIL_KG calculada/validada, CONFIGURACAO_EIXOS, RESTRICOES, OBSERVACOES.
- Componentes de carreta devem ser normalizados em relação própria se a composição precisar suportar quantidade variável de implementos. O esquema atual de CARRETA_MEIO_ID e CARRETA_FINAL_ID permite somente dois vínculos explícitos.
- Deve haver histórico de composição: troca de motorista, cavalo ou carreta não pode apagar a configuração anterior.
- A regra de quantidade e tipo de carretas deve ser configurável por operação/empresa e homologada com o cliente; não assumir universalmente uma composição.

### 4.9 ROTAS e PONTOS_ROTA

- ROTAS: ID, TENANT_ID, CODIGO_EXTERNO, NOME_ROTA, LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID, DISTANCIA_REFERENCIA_KM, TEMPO_ESTIMADO_MIN, TIPO_ROTA, RESTRICOES, STATUS.
- PONTOS_ROTA: ID, TENANT_ID, ROTA_ID, SEQUENCIA, LOCAL_ID, TIPO_PARADA, DISTANCIA_ACUMULADA_KM, TEMPO_PARADA_MIN, INSTRUCOES, OBRIGATORIO.
- A sequência deve ser única por rota; origem e destino precisam corresponder aos extremos da sequência.

### 4.10 MODELOS_OPERACAO e OPERACOES

- MODELOS_OPERACAO: ID, TENANT_ID, CODIGO_EXTERNO, CLIENTE_ID, NOME, TIPO_OPERACAO, PRODUTO_CARGA, UNIDADE_MEDIDA, VOLUME_CONTRATADO, LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID, ROTA_ID, JANELAS, FREQUENCIA, REGRAS e STATUS.
- OPERACOES: ID, TENANT_ID, CODIGO_EXTERNO, MODELO_OPERACAO_ID opcional, CLIENTE_ID, TIPO_OPERACAO, DATA_INICIO, DATA_FIM, LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID, ROTA_ID, VOLUME_TOTAL, UNIDADE_MEDIDA, STATUS, OBSERVACOES.
- Modelo recorrente/contrato não deve ser confundido com operação concreta.

### 4.11 CARGAS (LEGADO — DESCONTINUADO), VIAGENS e EVENTOS_VIAGEM

- CARGAS (LEGADO — DESCONTINUADO): ID, TENANT_ID, CODIGO_EXTERNO, OPERACAO_ID, CLIENTE_ID, LOCAL_ORIGEM_ID, LOCAL_DESTINO_ID, ROTA_ID, PRODUTO, PESO_PLANEJADO_KG, JANELA_CARREGAMENTO, JANELA_DESCARGA, STATUS.
- VIAGENS: ID, TENANT_ID, CARGA_ID, CONJUNTO_ID, MOTORISTA_ID, INICIO_PREVISTO, INICIO_REAL, FIM_REAL, PESO_REAL_KG, STATUS, identificadores externos e observações.
- EVENTOS_VIAGEM: ID, TENANT_ID, VIAGEM_ID, TIPO_EVENTO, DATA_HORA, LOCAL_ID, LATITUDE, LONGITUDE, RESPONSAVEL_ID, OBSERVACOES.
- DOCUMENTOS/COMPROVANTES devem referenciar VIAGEM_ID e, quando aplicável, EVENTO_VIAGEM_ID.
- Uma operação pode gerar várias cargas; uma carga pode gerar várias viagens. Não usar CARGA_ID como identificador de uma execução individual.

## 5. Contratos de importação em lote

O arquivo-modelo continua sendo interface de entrada, não banco operacional. A versão inicial de abas já proposta no documento `FULLTIME_CADASTRO_EM_LOTE_MODELO_DADOS.md` precisa ser alinhada ao contrato canônico final.

Regras obrigatórias:
- Importar primeiro entidades-pai e resolver referências por CODIGO_EXTERNO dentro do mesmo TENANT_ID.
- Validar dependências entre abas antes de gravar.
- Apresentar prévia com novos, atualizações, duplicados idênticos, conflitos e erros.
- Não atualizar nem excluir silenciosamente.
- Repetir o mesmo arquivo não pode duplicar registros.
- Guardar hash do arquivo, versão do modelo, usuário, data, linha original, payload original, resultado e ID de destino.
- Processar em lotes retomáveis; falha parcial não pode perder o estado.
- Permitir que a empresa importe cadastros em massa sem preencher formulários individuais.

Ordem recomendada de dependência:
1. CLIENTES.
2. ENDERECOS_CLIENTES.
3. LOCAIS_OPERACIONAIS.
4. MOTORISTAS.
5. CAVALOS e CARRETAS.
6. CONJUNTOS e vínculos de composição.
7. ROTAS e PONTOS_ROTA.
8. MODELOS_OPERACAO e REGRAS_OPERACIONAIS.
9. OPERACOES.
10. CARGAS (LEGADO — DESCONTINUADO), quando o processo de importação de operação/carga estiver aprovado.

## 6. Decisões que precisam ser fechadas antes da implementação

| Tema | Decisão necessária | Proposta técnica |
|---|---|---|
| CAMINHOES (LEGADO — DESCONTINUADO) x CAVALOS | CAMINHOES (LEGADO — DESCONTINUADO) será descontinuado, alias ou cadastro de outro tipo de veículo? | Tratar como legado/compatibilidade até mapear dependências; não excluir agora. |
| Composição | Quantos implementos e quais tipos podem compor um conjunto? | Relação de composição variável, parametrizada por empresa/operação, após confirmação das regras reais. |
| Peso e capacidade | Unidade padrão? | Armazenar em kg como inteiro/decimal controlado; converter para toneladas apenas na interface/importação. |
| Cliente/local | Origem e destino podem ser endereço livre ou devem referenciar local? | Preferir LOCAL_ID; permitir entrada provisória para revisão sem perder o texto original. |
| Viagem | Uma carga pode ter mais de uma viagem? | Sim, modelo explícito 1:N. |
| Documentos | Documento pertence ao motorista, cavalo, carreta, conjunto, cliente, operação, carga ou viagem? | Entidade DOCUMENTOS com proprietário polimórfico controlado ou tabelas de vínculo específicas. |
| Multiempresa | A base atual já contém dados de mais de uma empresa? | Não presumir. Implementar tenant_id e isolamento antes de habilitar múltiplos clientes. |
| Dados reais | Pode haver atualização automática durante importação? | Não; primeiro prévia e confirmação autorizada. |

## 7. Próxima sequência técnica

1. Obter inventário somente leitura das guias reais, cabeçalhos, fórmulas, validações, proteções e gatilhos, sem alterar conteúdo.
2. Cruzar esse inventário com as estruturas deste documento.
3. Criar testes de contrato para os cabeçalhos e mapeamentos.
4. Corrigir a leitura legada para usar repositórios nativos, preservando IDs e status após plano de migração validado.
5. Definir a migração CAMINHOES (LEGADO — DESCONTINUADO) → CAVALOS (ou contrato alternativo aprovado).
6. Implementar entidades CLIENTES, ENDERECOS_CLIENTES, LOCAIS_OPERACIONAIS, ROTAS, PONTOS_ROTA, VIAGENS e DOCUMENTOS conforme os contratos aprovados.
7. Implementar importação em lote com prévia, relatório e processamento retomável.
8. Só depois iniciar a migração de dados reais e desligamento controlado da sincronização antiga.

## 8. Proteções desta auditoria

- Nenhuma função Apps Script foi executada.
- Nenhuma planilha Google foi aberta, alterada, limpa ou apagada.
- Nenhum gatilho foi criado ou removido.
- Nenhuma implantação foi publicada.
- Nenhum dado real foi migrado.
- A guia `CAVALOS-BRUNO` não foi acessada.
- As conclusões sobre planilhas são limitadas aos cabeçalhos e mapeamentos declarados no código; a conferência ao vivo permanece pendente.


## Decisão de produto — operações e viagens (2026-11-06)

A unidade de negócio é OPERAÇÃO; a execução é VIAGEM. Não criar entidade CARGAS. Não utilizar CAMINHOES como cadastro: frota = MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS. Cada participação em operação recebe VIAGENS_PREVISTAS e TONELADAS_PREVISTAS. A soma das metas das participações deve fechar o TOTAL_VIAGENS_PREVISTAS e o volume total da operação. Cada viagem possui ID próprio, sequência, participação, motorista, conjunto, pesos, horários, status, eventos e documentos. Consultar `docs/FULLTIME_MODELO_OPERACIONAL_OPERACOES_VIAGENS.md` como contrato normativo.
