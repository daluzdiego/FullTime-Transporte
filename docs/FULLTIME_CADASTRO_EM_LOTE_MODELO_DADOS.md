# Full Time — Cadastro em lote e modelo de dados da logística portuária

**Status:** especificação funcional e técnica para desenvolvimento e homologação com dados fictícios.  
**Princípio:** a planilha de entrada é uma interface de carga em lote; o banco de dados do Full Time é a fonte oficial após validação e importação.

## 1. Decisão de produto

O Full Time deve permitir que um administrador da transportadora (por exemplo, Bruno ou outro responsável autorizado) cadastre dezenas ou centenas de registros de uma só vez, sem abrir formulários individuais.

A solução terá duas formas equivalentes de entrada:
1. **Planilha-modelo de importação**, com abas padronizadas e instruções, que pode ser preenchida por várias pessoas.
2. **Importação pelo próprio sistema**, permitindo enviar a planilha preenchida e acompanhar validação, prévia, confirmação e resultado.

A planilha não será o banco operacional. Ela será um lote de entrada controlado. Após a confirmação, os dados validados serão gravados nas tabelas nativas do Full Time e receberão IDs internos.

O fluxo individual continuará disponível para correções e pequenos cadastros, mas não será o caminho obrigatório de implantação.

## 2. Experiência de importação em lote

Fluxo obrigatório:

1. Administrador baixa o modelo atualizado pelo sistema.
2. Preenche uma ou mais abas, ou distribui abas entre responsáveis.
3. Envia o arquivo XLSX/CSV pelo módulo **Cadastros → Importação em lote**.
4. O sistema identifica a versão do modelo, a empresa/tenant e as abas presentes.
5. Executa validação sem gravar cadastros operacionais.
6. Apresenta prévia por entidade: novos, atualizações, duplicados idênticos, conflitos, inválidos e dependências ausentes.
7. Exibe erros por linha e coluna, com orientação objetiva.
8. Usuário corrige o arquivo ou confirma somente os registros válidos, conforme política da importação.
9. Sistema grava em lotes transacionais/retomáveis, registra auditoria e devolve relatório de processamento.
10. Usuário pode baixar relatório de erros e consultar histórico/reverter um lote quando tecnicamente seguro.

### Regras de segurança e qualidade

- Nunca gravar silenciosamente linhas inválidas.
- Nunca substituir cadastro existente apenas porque uma placa, CPF ou nome coincide.
- Usar chaves externas estáveis quando fornecidas; caso contrário, aplicar regra de correspondência e enviar possíveis colisões para revisão.
- Atualização de cadastro existente deve mostrar campos que serão alterados e exigir permissão específica.
- Não apagar registros por ausência em uma nova planilha. Importação é aditiva/atualizadora; exclusão é fluxo separado e auditado.
- Preservar o arquivo original, hash, autor, data, versão do modelo e relatório.
- Suportar reenvio do mesmo arquivo sem duplicar registros (idempotência por lote + linha + entidade).
- Validar referências entre abas independentemente da ordem das linhas.
- Permitir importação parcial segura: registros válidos podem ser importados enquanto inválidos ficam pendentes, desde que dependências estejam resolvidas.
- Exibir progresso, permitir retomar lote interrompido e impedir execução concorrente do mesmo lote.
- Restringir dados por empresa/tenant; um cliente nunca acessa cadastros de outra empresa.

## 3. Estrutura da planilha-modelo

A planilha terá abas separadas por entidade, com uma aba inicial de instruções e uma aba de listas controladas. Não misturar entidades diferentes na mesma tabela.

### 00_LEIA_ME
- VERSAO_MODELO
- EMPRESA_CODIGO (preenchido/atribuído pelo sistema; não editável no modelo)
- DATA_PREENCHIMENTO
- RESPONSAVEL
- CONTATO_RESPONSAVEL
- INSTRUCOES
- STATUS_IMPORTACAO (preenchido pelo sistema no relatório, não pelo usuário)

### 01_CLIENTES
- CODIGO_EXTERNO (chave do ERP/sistema atual, se existir)
- TIPO_PESSOA (PJ/PF)
- RAZAO_SOCIAL
- NOME_FANTASIA
- CNPJ_CPF
- INSCRICAO_ESTADUAL
- INSCRICAO_MUNICIPAL
- EMAIL_FINANCEIRO
- TELEFONE_PRINCIPAL
- WHATSAPP
- SITE
- CONTATO_OPERACIONAL
- CONTATO_FINANCEIRO
- OBSERVACOES
- STATUS

### 02_ENDERECOS_CLIENTES
Uma linha por endereço. Um cliente pode ter vários endereços.
- CODIGO_EXTERNO
- CLIENTE_CODIGO_EXTERNO (referência a 01_CLIENTES)
- IDENTIFICACAO (Matriz, Filial, Portaria, Faturamento, etc.)
- TIPO_ENDERECO (COLETA, ENTREGA, FATURAMENTO, ADMINISTRATIVO, OUTRO)
- CEP
- LOGRADOURO
- NUMERO
- COMPLEMENTO
- BAIRRO
- CIDADE
- UF
- PAIS
- REFERENCIA_ACESSO
- LATITUDE (opcional)
- LONGITUDE (opcional)
- JANELA_ATENDIMENTO
- RESTRICOES_ACESSO
- CONTATO_LOCAL
- TELEFONE_LOCAL
- STATUS

### 03_LOCAIS_OPERACIONAIS
Locais recorrentes de carga/descarga, terminais, portos, armazéns, pátios e fábricas. Não presumir que todo local seja endereço de cliente.
- CODIGO_EXTERNO
- NOME_LOCAL
- TIPO_LOCAL (PORTO, TERMINAL, ARMAZEM, PATIO, FABRICA, CLIENTE, BALANCA, OUTRO)
- CLIENTE_CODIGO_EXTERNO (opcional)
- ENDERECO_COMPLETO
- CEP
- CIDADE
- UF
- PAIS
- LATITUDE
- LONGITUDE
- PORTAO_PORTARIA
- INSTRUCOES_ACESSO
- HORARIO_FUNCIONAMENTO
- JANELA_CARREGAMENTO
- JANELA_DESCARGA
- TEMPO_MEDIO_OPERACAO_MIN
- RESTRICOES_VEICULO
- EQUIPAMENTOS_EXIGIDOS
- DOCUMENTOS_EXIGIDOS
- CONTATO_OPERACIONAL
- TELEFONE
- OBSERVACOES
- STATUS

### 04_MOTORISTAS
- CODIGO_EXTERNO
- NOME_COMPLETO
- CPF
- RG
- DATA_NASCIMENTO
- TELEFONE
- WHATSAPP
- EMAIL
- CEP
- LOGRADOURO
- NUMERO
- COMPLEMENTO
- BAIRRO
- CIDADE
- UF
- CNH_NUMERO
- CNH_CATEGORIA
- CNH_VALIDADE
- CNH_EAR
- EXAME_TOXICOLOGICO_VALIDADE (quando aplicável)
- VINCULO (PROPRIO, AGREGADO, TERCEIRO)
- EMPRESA_VINCULADA
- STATUS
- OBSERVACOES

Dados pessoais devem ter acesso restrito por perfil e finalidade. Não exibir CPF/documentos integralmente em telas ou relatórios sem necessidade.

### 05_CAVALOS
- CODIGO_EXTERNO
- PLACA
- RENAVAM
- CHASSI
- MARCA
- MODELO
- ANO_FABRICACAO
- ANO_MODELO
- TIPO_CAVALO
- CONFIGURACAO_EIXOS
- TARA_TONELADAS
- PBTC_MAX_TONELADAS
- CAPACIDADE_OPERACIONAL_TONELADAS (se definida e validada)
- PROPRIETARIO
- VINCULO (PROPRIO, AGREGADO, TERCEIRO)
- RNTRC (quando aplicável)
- CRLV_VALIDADE (se controlado)
- STATUS
- OBSERVACOES

### 06_CARRETAS
Uma linha por implemento físico.
- CODIGO_EXTERNO
- PLACA
- RENAVAM
- CHASSI
- MARCA
- MODELO
- TIPO_CARRETA
- CONFIGURACAO_EIXOS
- TARA_TONELADAS
- CAPACIDADE_CARGA_TONELADAS
- PBTC_MAX_TONELADAS (quando aplicável)
- COMPRIMENTO_METROS
- LARGURA_METROS
- ALTURA_METROS
- VINCULO (PROPRIO, AGREGADO, TERCEIRO)
- PROPRIETARIO
- STATUS
- OBSERVACOES

### 07_CONJUNTOS
Uma linha por composição operacional. Referenciar os códigos externos das entidades já cadastradas; não repetir os dados dos veículos.
- CODIGO_EXTERNO
- MOTORISTA_CODIGO_EXTERNO
- CAVALO_CODIGO_EXTERNO
- CARRETA_1_CODIGO_EXTERNO
- CARRETA_2_CODIGO_EXTERNO (opcional)
- CARRETA_3_CODIGO_EXTERNO (opcional, se configuração permitir)
- DATA_INICIO_VINCULO
- DATA_FIM_VINCULO (opcional)
- CAPACIDADE_UTIL_TONELADAS (calculada ou informada para validação, nunca aceita sem regra)
- RESTRICOES_OPERACIONAIS
- ESTADO_CONSERVACAO
- STATUS
- OBSERVACOES

O modelo físico deve suportar mais de uma carreta quando a configuração de frota da empresa permitir, sem codificar a aplicação para somente uma composição fixa.

### 08_DOCUMENTOS_FROTA
Uma linha por documento, associado por entidade e código externo.
- CODIGO_EXTERNO
- TIPO_ENTIDADE (MOTORISTA, CAVALO, CARRETA, CONJUNTO, EMPRESA)
- ENTIDADE_CODIGO_EXTERNO
- TIPO_DOCUMENTO
- NUMERO_DOCUMENTO
- ORGAO_EMISSOR
- DATA_EMISSAO
- DATA_VALIDADE
- ARQUIVO_REFERENCIA (opcional; arquivo enviado separadamente ou link autorizado)
- OBSERVACOES
- STATUS

### 09_ROTAS
Uma rota é uma relação reutilizável entre pontos ordenados; não é apenas um texto origem/destino.
- CODIGO_EXTERNO
- NOME_ROTA
- ORIGEM_LOCAL_CODIGO_EXTERNO
- DESTINO_LOCAL_CODIGO_EXTERNO
- VIA_PRINCIPAL
- DISTANCIA_KM_REFERENCIA
- TEMPO_ESTIMADO_MIN
- TIPO_ROTA (RODOVIARIA, PORTUARIA, INTERNA, MISTA)
- RESTRICOES
- PEDAGIOS_REFERENCIA (opcional)
- PONTOS_INTERMEDIARIOS (usar aba 10, não lista livre, quando necessário)
- OBSERVACOES
- STATUS

### 10_PONTOS_ROTA
Uma linha por ponto sequencial da rota.
- ROTA_CODIGO_EXTERNO
- SEQUENCIA
- LOCAL_CODIGO_EXTERNO
- TIPO_PARADA (ORIGEM, DESTINO, PORTARIA, BALANCA, PATIO, ABASTECIMENTO, INTERMEDIARIO)
- DISTANCIA_ACUMULADA_KM (opcional)
- TEMPO_PARADA_MIN (opcional)
- INSTRUCOES
- OBRIGATORIO (SIM/NAO)

### 11_OPERACOES_MODELO
Modelo de operação recorrente/contrato, não uma viagem executada.
- CODIGO_EXTERNO
- CLIENTE_CODIGO_EXTERNO
- NOME_OPERACAO
- TIPO_OPERACAO (DESCARGA_NAVIO, TRANSFERENCIA_FABRICAS, REMOCAO_INTERNA, EXPORTACAO, IMPORTACAO, OUTRA)
- PRODUTO_CARGA
- UNIDADE_MEDIDA
- VOLUME_CONTRATADO
- LOCAL_ORIGEM_CODIGO_EXTERNO
- LOCAL_DESTINO_CODIGO_EXTERNO
- ROTA_CODIGO_EXTERNO
- JANELA_INICIO
- JANELA_FIM
- FREQUENCIA
- PESO_MINIMO_VIAGEM_T
- PESO_MAXIMO_VIAGEM_T
- TIPO_CONJUNTO_PERMITIDO
- REGRAS_PORTARIA
- DOCUMENTOS_EXIGIDOS
- RESTRICOES
- OBSERVACOES
- STATUS

### 12_REGRAS_OPERACIONAIS
- CODIGO_EXTERNO
- ESCOPO (EMPRESA, CLIENTE, LOCAL, ROTA, OPERACAO, VEICULO)
- REFERENCIA_CODIGO_EXTERNO
- REGRA
- VALOR
- UNIDADE
- VIGENCIA_INICIO
- VIGENCIA_FIM
- PRIORIDADE
- OBSERVACOES
- STATUS

### 13_CONTATOS_E_ACESSOS
Opcional, conforme política de segurança da empresa.
- CODIGO_EXTERNO
- ENTIDADE_TIPO
- ENTIDADE_CODIGO_EXTERNO
- NOME_CONTATO
- FUNCAO
- TELEFONE
- WHATSAPP
- EMAIL
- HORARIO_CONTATO
- OBSERVACOES

## 4. Entidades que não devem ser confundidas

- **Cliente:** empresa contratante ou destinatária.
- **Endereço:** endereço administrativo, fiscal ou operacional de um cliente.
- **Local operacional:** porto, terminal, pátio, balança, armazém, fábrica ou ponto de acesso.
- **Rota:** percurso planejado entre locais, podendo conter portarias e pontos intermediários.
- **Modelo de operação:** regra recorrente de trabalho contratada ou planejada.
- **Operação:** demanda concreta com volume, período e acompanhamento.
- **Carga:** unidade de trabalho planejada para transporte.
- **Viagem:** execução real de um conjunto para uma carga/operação, com ciclo, eventos e comprovantes próprios.

Uma operação pode gerar várias cargas; uma carga pode ter mais de uma viagem; cada viagem deve ter identificador próprio e eventos de carregamento/descarga vinculados à mesma viagem. Não usar uma única linha de carga como substituta do histórico de viagens.

## 5. Validações e integridade referencial

- CNPJ/CPF: validar formato e dígitos quando aplicável; evitar usar CPF como chave primária.
- Placa: normalizar caixa e caracteres; impedir duplicidade ativa na mesma empresa.
- Código externo: único por entidade e empresa quando informado.
- Motorista do conjunto deve existir e estar ativo; cavalo e carretas devem existir e não estar alocados em composições incompatíveis no mesmo período.
- Conjunto deve respeitar configuração de eixos, capacidade útil e limites legais/operacionais cadastrados. Não somar capacidades de forma simplista sem regra de PBTC e configuração.
- Endereço deve ter cidade/UF/país; CEP e geocodificação podem ser validados/enriquecidos sem bloquear importação quando o serviço externo estiver indisponível.
- Origem e destino devem referenciar locais cadastrados ou ser encaminhados para criação/revisão de local.
- Rota deve ter origem, destino e sequência válida de pontos.
- Operação deve referenciar cliente, locais e rota coerentes; volume e unidade precisam ser explícitos.
- Datas devem ser interpretadas no fuso configurado para a empresa, com formato ISO no armazenamento.
- Campos de lista devem usar valores padronizados; evitar variações livres como "ton", "tonelada", "T".
- Datas de validade vencidas geram alerta e política de bloqueio configurável, não exclusão do cadastro.

## 6. Modelo de processamento do lote

Entidades técnicas sugeridas:
- `IMPORT_BATCH`: id, tenant_id, arquivo_nome, arquivo_hash, modelo_versao, criado_por, criado_em, status, resumo_json.
- `IMPORT_BATCH_ROW`: id, batch_id, entidade, numero_linha, codigo_externo, payload_original_json, payload_normalizado_json, status, erros_json, avisos_json, registro_destino_id.
- `IMPORT_BATCH_EVENT`: id, batch_id, evento, ator, timestamp, detalhes_json.

Estados do lote:
`RECEBIDO → VALIDANDO → AGUARDANDO_CORRECAO | PRONTO_PARA_IMPORTAR → IMPORTANDO → CONCLUIDO | CONCLUIDO_COM_ERROS | FALHA_RECUPERAVEL`.

Estados por linha:
`NOVA → VALIDA | AVISO | ERRO | CONFLITO | IMPORTADA | ATUALIZADA | IGNORADA_DUPLICADA`.

O processador deve ser retomável, idempotente, usar trava/lease, registrar tentativas e não depender de uma execução única longa do Apps Script. Para volumes altos, processar páginas/lotes limitados e continuar por gatilho/worker.

## 7. Relatório que o usuário recebe

- Arquivo e versão processados.
- Total de linhas lidas.
- Novos cadastros.
- Atualizações propostas e efetivadas.
- Duplicados idênticos ignorados.
- Conflitos que exigem decisão.
- Erros por entidade, aba, linha, coluna e motivo.
- Referências não encontradas.
- Tempo e usuário responsável.
- IDs gerados para os registros importados.
- Link para baixar planilha de erros/correções.

## 8. Estratégia para implantação em outras transportadoras

A arquitetura deve ser multiempresa desde o início:
- `tenant_id` obrigatório em todos os registros de negócio.
- Usuários e papéis vinculados à empresa.
- Modelo de importação versionado e configurável por empresa.
- Campos obrigatórios e regras operacionais configuráveis.
- Dicionário de tipos de operação e veículos extensível.
- Auditoria de alterações e importações.
- Separação de documentos e anexos por empresa.
- Possibilidade de integração futura com ERP, TMS, portos, terminais e provedores de mapas sem acoplar o núcleo a um fornecedor.

## 9. Roadmap de execução

1. Inventariar e comparar os cabeçalhos atuais das guias e os campos realmente usados pelo código.
2. Aprovar o dicionário de dados e as chaves de relacionamento.
3. Implementar o banco nativo e repositórios por entidade.
4. Criar planilha-modelo versionada com abas, listas e instruções.
5. Implementar upload, pré-validação, prévia, confirmação, importação retomável e relatório.
6. Criar conjunto de dados fictícios completo cobrindo clientes, endereços, locais portuários, motoristas, cavalos, carretas, conjuntos, rotas e operações.
7. Testar importação repetida, duplicidade, dependências ausentes, conflitos, atualização, lote interrompido e recuperação.
8. Só depois conectar os canais de solicitação à criação de operações e cargas.

## 10. Critério de aceite

Uma empresa nova deve conseguir preparar sua base inicial preenchendo um único arquivo-modelo com múltiplas abas, importar centenas de registros, corrigir somente as linhas apontadas, confirmar a carga e ter os cadastros disponíveis no FullTime sem digitação individual e sem depender de planilha de terceiro como banco operacional.

**Nota:** este documento define o desenho. Os nomes finais de colunas, tipos, obrigatoriedade e relações devem ser reconciliados com o código e as planilhas atuais antes de qualquer migração ou execução destrutiva.
