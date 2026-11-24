# FullTime — Homologação da arquitetura V2.2

Branch de trabalho: `fulltime-2.0`

## O que mudou

- A planilha do Bruno é a fonte única dos cadastros de motoristas, cavalos, carretas e conjuntos.
- O sistema central lê os espelhos `FT_CADASTRO_BRUNO_*`; aprovações ficam em `FT_STATUS_CADASTROS`, sem alterar os dados de origem.
- Operações são criadas na planilha central a partir de solicitações aprovadas. A sincronização da planilha do Bruno não sobrescreve mais a guia `OPERACOES`.
- O módulo legado de `CAMINHOES` e o módulo de `CARGAS` foram retirados do fluxo ativo.
- A guia de entrada `ENTRADA_OPERACOES_IA` recebe o novo campo `ID_OPERACAO_GERADA` ao final, mantendo as colunas existentes.
- O cadastro de cavalos passa a incluir `CAPACIDADE_CARGA_TONELADAS`.
- Solicitações aprovadas geram uma operação uma única vez; o vínculo fica registrado em `ID_OPERACAO_GERADA`.
- A operação guarda o tipo de operação e a categoria de escala; a previsão de viagens é obrigatória.

## 1. Publicar os arquivos no Apps Script

Atualize os projetos Apps Script com os arquivos desta branch antes de executar as funções abaixo.

## 2. Na planilha de origem do Bruno

Execute nesta ordem:

1. `PLANILHABRUNO_gerarLoteTeste40()`
   - Acrescenta 40 motoristas, 40 cavalos, 40 carretas e 40 conjuntos fictícios, além de 120 documentos de teste vinculados (CNH/CRLV).
   - Não apaga nem sobrescreve registros existentes.
   - Acrescenta o cabeçalho `CAPACIDADE_CARGA_TONELADAS` na guia `CAVALOS`, se estiver ausente.
   - Não acessa a guia protegida `CAVALOS-BRUNO` e não grava na planilha central.

2. `PLANILHABRUNO_atualizarCabecalhoEntradaOperacoesIA()`
   - Acrescenta `ID_OPERACAO_GERADA` ao fim da guia `ENTRADA_OPERACOES_IA` nas duas planilhas.
   - Não move nem apaga colunas ou registros.
   - Interrompe se os cabeçalhos anteriores não estiverem idênticos.

3. `PLANILHABRUNO_validarSincronizacaoV2()`
   - Confira o relatório. Não sincronize se houver duplicidade ou erro.

4. `PLANILHABRUNO_sincronizarLoteTesteV2()`
   - Replica somente os registros fictícios com o prefixo `FT-TESTE-20261029-`.
   - A guia `OPERACOES` não é mais sincronizada da planilha do Bruno para a central.

## 3. Na planilha central do FullTime

Depois de confirmar que os espelhos `FT_CADASTRO_BRUNO_*` receberam os dados:

1. `conectarPlanilhaOperacionalFullTime()`
2. `prepararBaseOperacionalFullTime()`
3. Abra o sistema e confira os totais de motoristas, cavalos, carretas e conjuntos.

Quando a conferência estiver concluída, execute:

4. `arquivarGuiasLegadasFullTime()`

Essa última função apenas renomeia e oculta as guias antigas, preservando seus dados. Não exclui nenhuma guia.

## 4. Login dos motoristas

As contas de motorista ainda não devem ser geradas nesta etapa. O fluxo atual autentica administradores; primeiro será implementado o perfil e o painel do motorista, com vínculo ao cadastro sincronizado. Assim evitamos criar logins que ainda não teriam uma área funcional para acessar.

## Observação de segurança

Não execute funções de limpeza ou exclusão manual nas guias de origem. O gerador de teste é aditivo e idempotente: ao ser executado novamente, ele ignora os IDs fictícios que já existirem.
