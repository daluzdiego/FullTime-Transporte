# Arquitetura — Full Time (centralizada)

## Fonte de verdade

A planilha principal Full Time é a única fonte de dados operacionais. O identificador é configurado em `FT_REGISTRY_DATABASE_ID`. A função `getSheet_(name)` deve encaminhar todas as guias operacionais para essa planilha.

A base de autenticação é separada e identificada por `FT_DATABASE_ID`. Ela contém `USUARIOS`, `AUDITORIA`, `TOKENS_RECUPERACAO` e estruturas de autenticação. Rotinas de reconstrução operacional não podem limpar nem recriar essa base.

A antiga planilha do Bruno não participa mais de leitura, escrita ou sincronização operacional. A guia `CAVALOS-BRUNO` permanece protegida por decisão explícita do projeto.

## Camada de aplicação

- `Code.gs`: backend central, roteamento de planilhas, sessão, autenticação, autorização, cadastros e operações.
- `Index.html`: interface web.
- `CadastroMotoristasFullTime.gs`: cadastro e gestão de motoristas e conjuntos.
- `AutenticacaoEmailFullTime.gs`: e-mail e recuperação de senha.
- `CentroOperacoesFullTime.gs`: consolidação do centro de operações.
- `PortalMotoristaFullTime.gs`: portal do motorista.
- `ConvocacaoMotoristasFullTime.gs`: convocações.
- `SolicitacoesFullTime.gs` e `InterpretacaoSolicitacoesFullTime.gs`: entrada e interpretação de solicitações.
- `WhatsAppTickets.gs`: tickets recebidos por WhatsApp.

## Persistência operacional

As guias operacionais são:

1. `MOTORISTAS`
2. `CAVALOS`
3. `CARRETAS`
4. `CONJUNTOS`
5. `DOCUMENTOS`
6. `OPERACOES`
7. `PARTICIPACAO_OPERACOES`
8. `MOVIMENTACOES_OPERACAO`
9. `LOCAIS`
10. `REGRAS_OPERACIONAIS`
11. `DISPONIBILIDADE_DIARIA`
12. `FILA_MOTORISTAS`
13. `EVENTOS_ESCALA`
14. `ENTRADA_OPERACOES_IA`

Não manter tabelas genéricas `CAMINHOES` ou `CARGAS`. O cavalo mecânico e as carretas são entidades distintas e vinculadas por `CONJUNTOS`. A operação registra volume e viagens previstas; as viagens não são cadastradas como cargas independentes.

## Regras de integridade

- O vínculo motorista/cavalo/carreta é feito por IDs em `CONJUNTOS`.
- Capacidade útil deve ser validada no conjunto e compatibilizada com os limites dos implementos.
- Documentos são vinculados por entidade e ID externo.
- Operações guardam origem, destino, tipo, produto/serviço, volume, viagens, distância e janelas logísticas.
- Movimentações e participações registram execução; não devem sobrescrever o histórico da operação.
- A entrada de IA preserva a mensagem bruta, o resultado interpretado e o vínculo com a operação criada.

## Reconstrução de homologação

A rotina oficial é `FT_CENTRAL_PREPARAR_E_RECONSTRUIR_TESTES_20261111()`. Ela deve ser executada somente após sincronizar os arquivos e confirmar compilação sem erros. Antes de limpar a planilha principal, cria cópia de segurança. Valida que `FT_DATABASE_ID` existe e é diferente do ID operacional. A rotina não deve alterar a base de autenticação nem a guia protegida `CAVALOS-BRUNO`.

## Regra de manutenção do projeto

O escopo global de Apps Script é compartilhado entre todos os arquivos `.gs`. Não duplicar arquivos no editor nem declarar novamente identificadores globais com `const`/ `let`. Depois de qualquer alteração no GitHub, sincronizar o conteúdo no Apps Script; commit no GitHub não significa deploy automático.
