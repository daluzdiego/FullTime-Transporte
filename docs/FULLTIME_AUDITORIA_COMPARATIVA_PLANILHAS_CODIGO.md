# FullTime — Auditoria comparativa dos arquivos, planilhas e código

**Branch:** `feat/arquitetura-multicanal-sem-planilha-bruno`  
**Data da auditoria:** 2026-11-06  
**Arquivos analisados:**  
- `Full Time Transporte e Consultoria (5).xlsx` — exportação da base FullTime/operacional.
- `FullTime_Base_Cadastro_Frota (6).xlsx` — modelo/base de cadastro recebido para entrada em lote.

**Proteção:** a guia `CAVALOS-BRUNO` foi excluída do escopo de leitura e comparação. Não deve ser consultada, alterada, limpa, movida ou usada em migrações.

## 1. Conclusão executiva

Os dois arquivos confirmam que já existe uma estrutura operacional concreta, com cadastros de motoristas, cavalos, carretas, conjuntos, documentos, operações e entrada de solicitações. A auditoria do código anterior estava incompleta porque considerava principalmente os cabeçalhos mínimos originais e não os campos adicionais que já existem nas planilhas.

Foram encontradas diferenças que impediam uma preparação segura da base:

- MOTORISTAS tinha 26 colunas no arquivo operacional, enquanto o código preparava somente 12.
- CAVALOS tinha 36 colunas; o código preparava 10.
- CARRETAS tinha 30 colunas; o código preparava 9.
- CONJUNTOS tinha 29 colunas; o código preparava 12.
- OPERACOES tinha 15 colunas; o código preparava 14.
- CONTROLE_DOCUMENTAL já existia com 14 colunas, mas não estava formalizado no esquema operacional principal nem roteado como guia operacional em `getSheet_()`.
- A guia ENTRADA_OPERACOES_IA tem 17 colunas no arquivo operacional e no contrato de `SolicitacoesFullTime.gs`, mas o segundo arquivo de cadastro traz uma versão antiga com 12 colunas.
- O painel e os métodos de listagem ainda consultavam espelhos legados para motoristas, cavalos, carretas, conjuntos e documentos, embora já existam guias nativas com dados.

**Ação já executada no código:** alinhei os esquemas de MOTORISTAS, CAMINHOES, CAVALOS, CARRETAS, CONJUNTOS, OPERACOES e CONTROLE_DOCUMENTAL aos cabeçalhos observados no arquivo operacional; roteiei CONTROLE_DOCUMENTAL para a base operacional; substituí a leitura de espelhos legados por leitura da base nativa FullTime nas funções de listagem e contagem; preservei a aplicação dos overrides de status de motoristas; e alterei a leitura de documentos do painel para a guia nativa CONTROLE_DOCUMENTAL.

Nenhuma planilha foi alterada. As mudanças foram feitas somente no código do repositório.

## 2. Inventário dos arquivos exportados

### 2.1 Arquivo operacional FullTime

O arquivo contém guias de formulário, controle, espelhos de integração, cadastros operacionais e módulos de escala. As contagens abaixo consideram linhas não vazias após o cabeçalho.

| Guia | Colunas | Linhas não vazias | Observação |
|---|---:|---:|---|
| Respostas ao formulário 2 | 20 | 0 | Estrutura de coleta de motorista; sem respostas nesta exportação. |
| FT_STATUS_CADASTROS | 6 | 23 | Controle administrativo de status. O código usa as cinco primeiras colunas; a sexta é OBSERVACAO. |
| ENTRADA_OPERACOES_IA | 17 | 0 | Estrutura compatível com o contrato atual de solicitações. |
| LINKS_GUIAS | 4 | 39 | Índice de links e finalidades de guias. |
| FT_CADASTRO_BRUNO_MOTORISTAS | 23 | 20 | Espelho de motorista. |
| FT_CADASTRO_BRUNO_CAVALOS | 33 | 20 | Espelho de cavalos. |
| FT_CADASTRO_BRUNO_CARRETAS | 28 | 20 | Espelho de carretas. |
| FT_CADASTRO_BRUNO_CONJUNTOS | 23 | 20 | Espelho de conjuntos. |
| FT_CADASTRO_BRUNO_DOCUMENTOS | 14 | 20 | Espelho de documentos. |
| OPERACOES | 15 | 21 | Registros de teste de operação. |
| CONTROLE_DOCUMENTAL | 14 | 20 | Cadastro documental operacional. |
| PARTICIPACAO_OPERACOES | 13 | 0 | Estrutura de participação. |
| MOVIMENTACOES_OPERACAO | 9 | 0 | Estrutura de movimentação. |
| Respostas ao formulário 1 | 10 | 0 | Guia oculta de formulário legado. |
| MOTORISTAS | 26 | 20 | Cadastro operacional nativo, com dados estendidos. |
| DISPONIBILIDADE_DIARIA | 9 | 0 | Estrutura de disponibilidade. |
| FILA_MOTORISTAS | 9 | 0 | Estrutura de fila. |
| OFERTAS_CARGAS | 11 | 0 | Estrutura de ofertas. |
| EVENTOS_ESCALA | 10 | 0 | Estrutura de eventos de escala. |
| SOLICITACOES_TESTE | 17 | 0 | Estrutura de teste de solicitações. |
| TICKETS | 18 | 0 | Estrutura de comprovantes recebidos. |
| CAVALOS | 36 | 20 | Cadastro operacional nativo, com dados estendidos. |
| CARRETAS | 30 | 20 | Cadastro operacional nativo, com dados estendidos. |
| CONJUNTOS | 29 | 20 | Cadastro operacional nativo, com vínculos e autorização. |
| LOCAIS | 9 | 0 | Estrutura ainda mínima, sem dados. |
| REGRAS_OPERACIONAIS | 10 | 0 | Estrutura ainda mínima, sem dados. |
| CARGAS | 20 | 0 | Cabeçalho presente; sem cargas preenchidas. |
| ESCALAS | 12 | 0 | Estrutura ainda sem dados. |
| HISTORICO_OPERACOES | 9 | 0 | Estrutura ainda sem dados. |
| CAMINHOES | 12 | 0 | Guia sem registros; manter como legado/compatibilidade até concluir migração. |

**Leitura dos dados:** os registros de cadastro observados usam identificadores `FT-TESTE-...`, descrições de teste e status como `TESTE_NAO_VALIDADO` ou `PENDENTE_REVISAO`. Portanto, os 20 registros de cada cadastro principal não devem ser tratados como cadastros reais aprovados nem usados para escalar operações reais.

### 2.2 Arquivo de cadastro/entrada

O segundo arquivo possui as seguintes guias no escopo de auditoria (a guia protegida foi excluída):

| Guia | Colunas | Linhas não vazias | Observação |
|---|---:|---:|---|
| INSTRUCOES | 2 | 0 | Oculta; sem conteúdo nas linhas de dados. |
| ENTRADA_OPERACOES_IA | 12 | 0 | Versão antiga do contrato; faltam cinco campos de rastreabilidade. |
| MOTORISTAS | 23 | 20 | Cadastro de entrada com dados pessoais, endereço e documentos do motorista. |
| PLANILHABRUNO_AUDITORIA_SINCRON | 10 | 0 | Estrutura de auditoria da sincronização. |
| OPERACOES | 15 | 20 | Cadastro de operações com ID externo e dados de volume. |
| CAVALOS | 33 | 20 | Cadastro veicular detalhado. |
| CARRETAS | 28 | 20 | Cadastro de implementos detalhado. |
| CONJUNTOS | 23 | 20 | Relação motorista/cavalo/carreta, vínculo e autorização. |
| CONTROLE_DOCUMENTAL | 14 | 20 | Controle de documentos por tipo de registro e ID externo. |

Os cadastros preenchidos são identificados como dados fictícios de teste. Os campos de identificação pessoal e veicular não foram reproduzidos neste relatório.

## 3. Comparação entre modelo de entrada e base operacional

### 3.1 MOTORISTAS

A entrada tem 23 colunas e inclui `ID_EXTERNO`, nome, CPF, RG, nascimento, telefone, WhatsApp, e-mail, endereço completo, CNH, EAR, validade do exame toxicológico, status documental, links e observações.

A guia operacional tem 26 colunas: mantém os 12 campos legados usados pelo código e acrescenta `ID_EXTERNO`, RG, DATA_NASCIMENTO, WHATSAPP, ENDERECO, CIDADE, UF, CEP, CNH_PRIMEIRA_HABILITACAO, CNH_EAR, EXAME_TOXICOLOGICO_VALIDADE, STATUS_DOCUMENTACAO, LINK_CNH e LINK_EXAME_TOXICOLOGICO.

**Diferença:** a guia operacional tem três campos adicionais em relação ao formulário de entrada? Não: os contratos têm organizações diferentes e devem ser mapeados por nome, não por posição. A integração deve continuar usando cabeçalhos e aliases, nunca cópia cega por índice.

### 3.2 CAVALOS

A entrada tem 33 colunas; a base operacional tem 36. A base operacional mantém os dez campos originais de sistema e adiciona os dados de identificação veicular, ano de fabricação/modelo, tipo, espécie, carroceria, cor, combustível, eixos, lotação, capacidade útil, proprietário, CRLV, AET, ANTT/RNTRC, validade e status documental, além de data de conferência.

**Risco anterior:** a função de preparação declarava somente dez campos e rejeitaria a guia operacional com 36 colunas.

### 3.3 CARRETAS

A entrada tem 28 colunas; a base operacional tem 30. O cadastro operacional mantém os campos-base e adiciona ID externo, RENAVAM, chassi, anos, espécie, carroceria, cor, eixos, lotação, proprietário, CRLV, AET, status documental, data de conferência, marca e modelo.

**Risco anterior:** a função de preparação declarava somente nove campos.

### 3.4 CONJUNTOS

A entrada tem 23 colunas; a base operacional tem 29. A base operacional mantém os campos de vínculo interno e acrescenta IDs externos, referências de motorista/cavalo/carreta por código externo e placa, quantidade de carretas, vínculo fixo, início/fim de vigência, status do vínculo, responsável e data de autorização.

**Implicação:** o conjunto não pode ser tratado como uma simples junção de três IDs. É necessário preservar a vigência do vínculo e a autorização, bem como validar a disponibilidade temporal dos componentes.

### 3.5 DOCUMENTOS

Há uma guia de espelho `FT_CADASTRO_BRUNO_DOCUMENTOS` e uma guia operacional `CONTROLE_DOCUMENTAL`, ambas com 14 colunas e 20 linhas não vazias nesta exportação.

**Diretriz:** `CONTROLE_DOCUMENTAL` é a fonte operacional do FullTime. O espelho deve deixar de ser consultado pelo painel e não deve ser confundido com a base canônica. A reconciliação entre as duas guias precisa ser idempotente e auditada antes de qualquer desligamento da sincronização.

### 3.6 OPERACOES

A guia de entrada possui 15 colunas, incluindo `ID_EXTERNO`. A definição anterior no código tinha 14 colunas e não incluía esse campo.

**Ação:** o esquema de preparação foi atualizado para incluir `ID_EXTERNO` na posição observada.

### 3.7 ENTRADA_OPERACOES_IA

O arquivo operacional e o código `SolicitacoesFullTime.gs` usam 17 campos:
`ID, CRIADO_EM, CRIADO_POR, STATUS_ENTRADA, TEXTO_ORIGINAL, DADOS_EXTRAIDOS_JSON, CAMPOS_PENDENTES_JSON, PERGUNTAS_IA, ID_CARGA_GERADA, CONFIRMADO_EM, CONFIRMADO_POR, ERRO_PROCESSAMENTO, CANAL_ORIGEM, IDENTIFICADOR_ORIGEM, CHAVE_IDEMPOTENCIA, ATUALIZADO_EM, HISTORICO_JSON`.

O segundo arquivo possui apenas os 12 campos iniciais. É uma versão antiga e não deve substituir a guia operacional atual.

## 4. Alterações já realizadas no código

Arquivo alterado: `Code.gs`.

Commit mais recente: `c508dd736849bfc0e24ebd3f1993b2700f138a4f`.

Mudanças:
1. Atualizei o esquema de MOTORISTAS para os 26 cabeçalhos observados na base operacional.
2. Mantive CAMINHOES com os 12 cabeçalhos atuais, como estrutura de compatibilidade enquanto suas dependências são retiradas.
3. Atualizei CAVALOS para os 36 cabeçalhos observados.
4. Atualizei CARRETAS para os 30 cabeçalhos observados.
5. Atualizei CONJUNTOS para os 29 cabeçalhos observados.
6. Atualizei OPERACOES para incluir ID_EXTERNO (15 campos).
7. Adicionei CONTROLE_DOCUMENTAL (14 campos) ao esquema operacional e ao roteamento de `getSheet_()`.
8. `listarRegistros_()` agora lê diretamente as guias nativas do FullTime para MOTORISTAS, CAVALOS, CARRETAS e CONJUNTOS, sem combinar espelhos legados.
9. Mantive a aplicação de overrides administrativos de status dos motoristas.
10. `contarAtivos_()` e `contarStatus_()` agora contam a base operacional nativa.
11. O painel passou a ler documentos da guia nativa CONTROLE_DOCUMENTAL em vez do espelho legado.
12. A capacidade útil do cavalo passou a ser lida do próprio cadastro CAVALOS, e não associada por placa a CAMINHOES.

**Importante:** estas mudanças estão no repositório. Não foram publicadas no Apps Script e não foram executadas contra a planilha real.

## 5. Módulos e entidades ainda ausentes ou insuficientes

Os arquivos atuais ainda não fornecem cadastros estruturados para:

- CLIENTES com CNPJ, razão social, nome fantasia, contatos e situação.
- ENDERECOS_CLIENTES com múltiplos endereços, CEP, cidade, UF, país e geolocalização.
- LOCAIS_OPERACIONAIS com portos, terminais, portarias, pátios, balanças, armazéns, fábricas, janelas de atendimento, tempo médio, restrições e documentos exigidos.
- ROTAS e PONTOS_ROTA com sequência, distância, tempo, paradas obrigatórias e restrições.
- MODELOS_OPERACAO para contratos/fluxos recorrentes.
- VIAGENS como execução individual de uma carga.
- EVENTOS_VIAGEM para chegada, fila, entrada, pesagem, carregamento, saída, trânsito, chegada ao destino e descarga, com data/hora/local.
- DOCUMENTOS normalizados com vínculo formal ao registro proprietário e, quando aplicável, à viagem/evento.
- ALOCAÇÕES de carga por conjunto e controle temporal da capacidade.
- Multiempresa/tenant_id e isolamento de dados em todas as entidades.

LOCAIS e REGRAS_OPERACIONAIS já existem, mas são estruturas mínimas e sem registros na exportação. Precisam evoluir, não ser duplicadas com nomes concorrentes.

## 6. Riscos de comportamento e implementação ainda abertos

1. O código antigo ainda possui formulários de CAMINHOES e rotinas de cadastro que não correspondem ao modelo de frota separado em cavalo e carreta.
2. A interface ainda apresenta nomes e fluxos legados e módulos em desenvolvimento.
3. A associação de conjunto usa dois campos fixos de carreta (`CARRETA_MEIO_ID`, `CARRETA_FINAL_ID`). O arquivo de entrada informa `QUANTIDADE_CARRETAS`, mas não existe uma relação normalizada de componentes de quantidade variável.
4. A operação e a carga ainda guardam cliente/origem/destino em texto; não há integridade referencial com cliente/local/rota.
5. O fluxo de movimentação registra tonelagem e indicador de viagem concluída, mas não mantém a entidade de viagem individual.
6. O importador em lote precisa ser centralizado. Os importadores CSV existentes são específicos de motorista/caminhão e não substituem a importação transacional multiaba.
7. A sincronização antiga ainda existe no repositório. Não remover arquivos nem gatilhos antes de inventariar triggers ativos, dependências e execução real.
8. O modelo multicanal está documentado, mas a integração automática de e-mail e WhatsApp ainda não está comprovada como ativa.

## 7. Plano de execução atualizado

### Etapa 1 — Contratos e compatibilidade (em andamento)
- [x] Ler os cabeçalhos dos dois arquivos exportados, excluindo a guia protegida.
- [x] Comparar com os esquemas declarados no código.
- [x] Atualizar esquemas operacionais existentes para corresponder ao arquivo operacional.
- [x] Retirar a dependência de espelhos legados das consultas principais de cadastros.
- [x] Direcionar documentos do painel para CONTROLE_DOCUMENTAL.
- [ ] Executar testes automatizados de contrato e validar índices usados pela interface.

### Etapa 2 — Cadastros de logística
- [ ] CLIENTES e ENDERECOS_CLIENTES.
- [ ] Evoluir LOCAIS para LOCAIS_OPERACIONAIS sem duplicar guias.
- [ ] ROTAS e PONTOS_ROTA.
- [ ] MODELOS_OPERACAO e regras por escopo.
- [ ] Normalizar composição variável de conjuntos e histórico de vigência.

### Etapa 3 — Execução operacional
- [ ] Operação → cargas → alocação → viagem.
- [ ] VIAGENS e EVENTOS_VIAGEM.
- [ ] Comprovantes e documentos vinculados à viagem/evento.
- [ ] Regras portuárias, janelas, filas, pesagem, portarias e restrições.

### Etapa 4 — Importação em lote
- [ ] Versão única do arquivo-modelo com contratos atuais.
- [ ] Pré-validação, prévia, correção e confirmação.
- [ ] Idempotência por hash + código externo + tenant.
- [ ] Processamento retomável e relatório por aba/linha/coluna.
- [ ] Não importar status de teste como aprovação operacional.

### Etapa 5 — UX e operação assistida
- [ ] Menu final aprovado.
- [ ] Painel de saúde dos canais.
- [ ] Revisão e aprovação humana.
- [ ] Fluxo operacional completo e histórico por viagem.
- [ ] Homologação com dados fictícios isolados.

## 8. Limites e segurança

- A auditoria foi feita em cópias exportadas; não prova que as planilhas online estejam idênticas hoje.
- Nenhuma rotina Apps Script foi executada.
- Nenhuma implantação foi publicada.
- Nenhuma planilha online foi alterada.
- Nenhum registro de teste foi convertido em cadastro aprovado.
- Nenhum registro real foi excluído ou migrado.
- A guia protegida `CAVALOS-BRUNO` permanece fora do escopo.
