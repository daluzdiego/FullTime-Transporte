# Ambiente de homologação isolado — Full Time MVP

## Objetivo e isolamento

Este ambiente usa duas planilhas novas:

1. **Base Operacional**: cadastros, frota, vínculos, clientes, regras, operações, cargas, fila, ofertas e escalas.
2. **Acesso e Auditoria**: usuários administrativos e trilha de auditoria.

A inicialização grava os IDs nas propriedades do projeto Apps Script atual:
- `FT_REGISTRY_DATABASE_ID`
- `FT_DATABASE_ID`
- `FT_ENVIRONMENT=HOMOLOGACAO`

**Não execute o bootstrap no projeto Apps Script atualmente publicado.** O projeto novo é a fronteira de isolamento. O bootstrap recusa execução quando já encontra qualquer um dos dois IDs configurados.

Nenhuma planilha existente é aberta, limpa, renomeada ou excluída. O antigo ID fixo da planilha de origem foi removido do helper de criação de guias; agora ele exige a propriedade explícita `FT_TARGET_SPREADSHEET_ID`.

## Dados fictícios criados

| Entidade | Quantidade |
|---|---:|
| Motoristas | 20 |
| Cavalos mecânicos | 10 |
| Carretas | 20 |
| Conjuntos vinculados | 10 |
| Clientes | 4 |
| Políticas de cliente | 4 |
| Operações | 4 |
| Cargas | 8 |
| Entradas na fila | 20 |
| Documentos de motoristas | 20 |
| Documentos de frota | 30 |

Os CPFs, telefones, e-mails, placas, documentos e nomes são marcadores fictícios de teste. Não representam pessoas ou veículos reais. Os conjuntos têm capacidade operacional fictícia declarada para cenários de teste; não se deve interpretar esse valor como cálculo legal de PBTC. A regra de capacidade real deve ser validada antes de produção.

## Como instalar

1. No Apps Script, crie um projeto independente chamado **Full Time — HOMOLOGAÇÃO MVP**.
2. Copie para ele os arquivos deste branch, mantendo os nomes:
   - `Code.gs`
   - `Index.html`
   - `HOMOLOGACAO_SETUP.gs`
   - `appsscript.json`
3. Confirme que o projeto novo não contém propriedades de script `FT_DATABASE_ID` ou `FT_REGISTRY_DATABASE_ID`.
4. Execute manualmente `criarAmbienteHomologacaoFullTime()`.
5. Autorize as permissões solicitadas e consulte o Registro de execução para obter as duas URLs.
6. Restrinja o compartilhamento das planilhas e mantenha o projeto separado da implantação atual.
7. Implante o aplicativo de homologação como uma implantação Web App independente, com acesso limitado aos participantes dos testes.

O bootstrap cria as planilhas e popula os registros. Ele não altera a implantação Web App existente e não configura WhatsApp.

## Ordem de validação

1. Conferir estrutura e contagens das guias.
2. Validar integridade dos vínculos: 10 motoristas associados a 10 cavalos e 20 carretas em 10 conjuntos.
3. Validar documentos, status, clientes e políticas.
4. Implementar e testar o motor de elegibilidade e fila.
5. Implementar oferta individual com expiração de duas horas, recusa e avanço para o próximo motorista.
6. Implementar aceite atômico e confirmação automática da escala.
7. Testar concorrência, expiração, inelegibilidade e ausência de candidatos.
8. Somente depois, construir o portal do motorista e preparar a integração WhatsApp.

## Estado real do código

O bootstrap cria uma base isolada com dados de teste. **Ele não significa que a escala automática já esteja implementada.** O teste anterior identificou que `gerarEscalasAutomaticasFullTime()` ainda não existe. A fila, o motor de ofertas, o aceite/recusa/expiração e os snapshots completos precisam ser implementados e cobertos por testes antes de considerar o MVP funcional.

A planilha `CAMINHOES` contém um espelho compatível dos cavalos fictícios para atender funções legadas que ainda consultam essa guia. O cadastro canônico dos cavalos é `CAVALOS`.

## Segurança e descarte

- Nunca inserir dados reais de Bruno ou de motoristas no ambiente de homologação.
- Não enviar mensagens, e-mails ou WhatsApp para contatos reais a partir dos dados fictícios.
- Não compartilhar links públicos das planilhas.
- Para reiniciar os testes, prefira criar um novo projeto e novas planilhas; não reutilize propriedades ou IDs de produção.
