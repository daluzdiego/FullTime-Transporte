# Full Time — Transporte

Aplicação de gestão e escala de operações de transporte, construída com Google Apps Script, Google Sheets e interface web.

## Arquitetura vigente (2026-11-11)

- **Planilha principal:** fonte única dos dados operacionais e cadastros de frota.
- **Base de autenticação:** arquivo separado, identificado pela propriedade de script `FT_DATABASE_ID`. Guarda usuários, auditoria e recuperação de senha. Não deve ser limpa pela reconstrução operacional.
- **Planilha antiga do Bruno:** integração desativada e fora do fluxo operacional. A guia protegida `CAVALOS-BRUNO` deve ser preservada conforme a regra do projeto.
- Não criar guias genéricas `CAMINHOES` ou `CARGAS`; os cadastros são `MOTORISTAS`, `CAVALOS`, `CARRETAS` e `CONJUNTOS`.

## Arquivos ativos

- `Code.gs`: backend, autenticação principal, sessões, autorização, acesso às planilhas, cadastros e operações.
- `Index.html`: interface web.
- `CadastroMotoristasFullTime.gs`: fluxo de cadastro e manutenção de motoristas/conjuntos.
- `AutenticacaoEmailFullTime.gs`: autenticação por e-mail e recuperação de senha.
- `CentroOperacoesFullTime.gs`: dados do centro de operações.
- `PortalMotoristaFullTime.gs`: funções do portal do motorista.
- `ConvocacaoMotoristasFullTime.gs`: convocação e resposta dos motoristas.
- `SolicitacoesFullTime.gs` e `InterpretacaoSolicitacoesFullTime.gs`: entrada e interpretação de solicitações.
- `WhatsAppTickets.gs`: recebimento e gestão de tickets WhatsApp.
- `FULLTIME_CENTRALIZACAO_RECONSTRUCAO_20261111.gs`: preparação da arquitetura central e geração de dados fictícios para homologação.
- `FULLTIME_OPERACOES_TESTE.gs`: geração adicional de operações de teste, quando necessária.
- `AuditoriaEstruturalFullTime2.gs`: auditoria estrutural.

Arquivos de sincronização Bruno e a rotina antiga de reconstrução foram retirados da branch ativa para evitar que sejam executados por engano.

## Guias operacionais esperadas

`MOTORISTAS`, `CAVALOS`, `CARRETAS`, `CONJUNTOS`, `DOCUMENTOS`, `OPERACOES`, `PARTICIPACAO_OPERACOES`, `MOVIMENTACOES_OPERACAO`, `LOCAIS`, `REGRAS_OPERACIONAIS`, `DISPONIBILIDADE_DIARIA`, `FILA_MOTORISTAS`, `EVENTOS_ESCALA` e `ENTRADA_OPERACOES_IA`.

## Sincronização com Apps Script

O GitHub **não atualiza automaticamente** o editor Apps Script, a menos que exista uma integração de deploy configurada. Ao sincronizar manualmente:

1. Atualize o conteúdo dos arquivos ativos listados acima.
2. Remova do projeto Apps Script os arquivos legados que foram excluídos desta branch: `FULLTIME_RECONSTRUCAO_BASE.gs`, `FULLTIME_AUDITORIA_INTEGRAL_20261111.gs`, `IntegracaoCadastroBruno.gs` e os quatro arquivos `PLANILHABRUNO-*.gs`.
3. Confirme que existe somente uma cópia de cada arquivo ativo. O escopo global do Apps Script é compartilhado por todos os arquivos `.gs`.
4. Salve e confirme que o projeto compila antes de executar qualquer função que grave dados.

## Reconstrução fictícia

A função de reconstrução é `FT_CENTRAL_PREPARAR_E_RECONSTRUIR_TESTES_20261111()`, no arquivo `FULLTIME_CENTRALIZACAO_RECONSTRUCAO_20261111.gs`.

Ela cria backup da planilha principal, aponta `FT_REGISTRY_DATABASE_ID` para a planilha principal, desconecta a integração antiga, prepara as guias operacionais e gera dados fictícios. A base de autenticação é validada como separada e não é apagada. A guia `CAVALOS-BRUNO` é protegida e não deve ser alterada.

**Não execute a reconstrução enquanto houver erro de compilação.** Depois de compilar, execute a função uma vez e confira o objeto de resumo no log.

## Segurança e homologação

- Os dados de homologação são fictícios e usam endereços `.test`.
- Não use credenciais de teste em produção.
- Restrinja o acesso às planilhas e ao aplicativo.
- Faça homologação ponta a ponta antes de liberar operações reais.
- Mantenha backups e valide restauração antes de qualquer limpeza de dados reais.
