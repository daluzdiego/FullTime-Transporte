# Full Time — WhatsApp tickets de operação

## Objetivo

Receber as fotos dos tickets enviadas pelos motoristas ao número oficial de WhatsApp da Full Time, guardar o original no Google Drive e registrar os metadados na guia `TICKETS` da planilha operacional. O recebimento é idempotente por ID da mensagem da Meta, para evitar duplicação quando o webhook for reenviado.

## Estado desta entrega

Implementado no repositório:
- `WhatsAppTickets.gs`: webhook POST, verificação básica do número destinatário, download de imagem da WhatsApp Cloud API, armazenamento no Drive, registro na guia `TICKETS`, associação do telefone ao cadastro do motorista e estrutura para expiração auditável.
- `Code.gs`: verificação GET do webhook Meta no `doGet(e)`, inclusão da guia `TICKETS` e colunas de comprovantes na preparação da base operacional.
- O aplicativo web continua sendo servido pelo mesmo `doGet`.

Ainda NÃO implementado:
- OCR/IA para ler automaticamente data/hora impressas no ticket.
- Associação automática do ticket a uma carga quando houver mais de uma possibilidade.
- Resposta automática ao motorista no WhatsApp.
- Gatilho de exclusão programada. As imagens não serão excluídas automaticamente até definir e configurar o prazo de retenção.

## Arquitetura

1. Motorista envia uma foto ao número de WhatsApp Business da Full Time.
2. Meta chama o webhook do Apps Script no URL publicado terminado em `/exec`.
3. O webhook valida o tipo de evento e o ID do número de destino configurado.
4. O script baixa a imagem usando o token da Cloud API e a grava numa pasta privada do Drive.
5. A guia `TICKETS` guarda remetente, ID da mensagem, tipo inferido da legenda, arquivo original, estado da leitura e dados de auditoria.
6. A próxima etapa OCR extrairá data/hora e identificador do ticket; os valores extraídos deverão ser validados antes de alterar o estado da carga.

## Configuração necessária no Google Apps Script

1. Abra o projeto Apps Script vinculado ao aplicativo Full Time.
2. Crie um arquivo de script chamado `WhatsAppTickets.gs` e copie o conteúdo desse arquivo do repositório.
3. Atualize `Code.gs` com a versão do repositório. Não remova funções já existentes.
4. Na planilha operacional conectada, execute `prepararBaseOperacionalFullTime()`. A função cria a guia `TICKETS` e acrescenta cabeçalhos faltantes somente quando os cabeçalhos existentes forem um prefixo compatível; não apaga dados.
5. Crie uma pasta no Google Drive exclusiva para os comprovantes, com acesso restrito aos responsáveis autorizados. Copie o ID da pasta.
6. No Apps Script, vá a **Configurações do projeto > Propriedades do script** e configure:

| Propriedade | Valor |
|---|---|
| `FT_WA_VERIFY_TOKEN` | Segredo aleatório criado por vocês; o mesmo valor será informado na configuração do webhook da Meta |
| `FT_WA_WEBHOOK_SECRET` | Segundo segredo aleatório para proteger os POSTs; será usado como parâmetro `hook_secret` na URL de callback |
| `FT_WA_ACCESS_TOKEN` | Token de acesso da WhatsApp Cloud API |
| `FT_WA_PHONE_NUMBER_ID` | ID do número de telefone apresentado no painel Meta |
| `FT_WA_GRAPH_VERSION` | Versão Graph API atualmente suportada pelo aplicativo Meta, no formato `vNN.0` |
| `FT_TICKET_DRIVE_FOLDER_ID` | ID da pasta privada do Drive criada no passo 5 |
| `FT_TICKET_RETENTION_DAYS` | **Deixar sem configurar até a Full Time aprovar o prazo de retenção** |

Não coloque tokens em arquivos do GitHub, planilhas ou mensagens. O token de acesso é segredo.

## Configuração necessária na Meta

1. Configurar um aplicativo Meta com o produto WhatsApp e um número de WhatsApp Business habilitado para Cloud API.
2. Configurar o webhook para a URL pública `/exec` da implantação do Apps Script, acrescentando `?hook_secret=VALOR_DO_SEGREDO` à URL de callback. Use exatamente o valor guardado em `FT_WA_WEBHOOK_SECRET`.
3. Informar o mesmo segredo de verificação usado em `FT_WA_VERIFY_TOKEN).
4. Subscrever o webhook ao evento de mensagens (`messages`).
5. Garantir que o token tenha permissões de leitura de mídia e que o número/conta estejam autorizados.
6. Enviar uma imagem de teste de um número de motorista cadastrado. Confirmar a criação do arquivo na pasta Drive e uma linha em `TICKETS`.

A URL do Web App precisa estar implantada para execução como a identidade configurada e acessível pela Meta. O Apps Script não expõe diretamente os cabeçalhos HTTP usados para validar a assinatura HMAC da Meta; por isso, este primeiro esqueleto usa um segredo adicional na URL do webhook. Para produção com maior exigência de segurança, recomenda-se um intermediário HTTPS que valide `X-Hub-Signature-256` antes de encaminhar o evento ao Apps Script. A disponibilidade de acesso anônimo e as políticas do Workspace devem ser avaliadas pelo administrador. Se a política da organização impedir que a Meta chame o endpoint do Apps Script, será necessário um intermediário HTTPS compatível com a validação de assinatura da Meta.

## Retenção e privacidade

- O original fica no Drive e a planilha mantém o registro de auditoria.
- O prazo ainda não foi definido; sem `FT_TICKET_RETENTION_DAYS`, o script não marca expiração e não apaga arquivos.
- Depois que o prazo for aprovado, configure a propriedade e teste manualmente `limparImagensTicketsExpiradasFullTime()` num ambiente controlado. A função move para a lixeira apenas arquivos com prazo vencido e preserva a linha de auditoria.
- Só depois de homologar o comportamento deve-se criar um acionador diário para a limpeza. Não crie o acionador antes da aprovação do prazo.
- Restringir a pasta do Drive e o acesso à planilha a pessoas autorizadas. Os links dos arquivos não devem ser tornados públicos.
- Definir com a Full Time o período de retenção e requisitos legais/contratuais antes de apagar comprovantes.

## OCR — próxima etapa

A mensagem entra inicialmente com status `AGUARDANDO_LEITURA`. O OCR ainda não está ativado. Na próxima etapa, conectar um serviço OCR (por exemplo, Google Cloud Vision/Document AI ou outro serviço aprovado), guardar os campos extraídos e uma medida de confiança, e exigir revisão quando o horário estiver ilegível ou ambíguo. Não atualizar automaticamente o início/fim da carga com base em leitura incerta.

## Diagnóstico

Depois de configurar propriedades e implantar, executar `diagnosticarIntegracaoWhatsAppFullTime()`. A função informa apenas se cada propriedade existe; não revela os valores secretos.
