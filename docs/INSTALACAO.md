# Instalação e implantação

## Requisitos

- Conta Google autorizada para administrar o projeto.
- Acesso a Google Apps Script e Google Sheets.
- Permissão para criar planilha e implantar um aplicativo da web.

## Criar o projeto

1. Acesse https://script.google.com/ e crie um projeto independente.
2. Copie o conteúdo de `Code.gs` para o editor de script.
3. Crie um arquivo HTML chamado exatamente `Index` e copie o conteúdo de `Index.html`.
4. Salve os arquivos.

## Inicializar a base

1. No editor, selecione `configurarSistemaFullTime`.
2. Execute apenas uma vez e autorize as permissões solicitadas.
3. Abra o registro de execução e anote:
   - URL da planilha;
   - senha temporária impressa para Diego;
   - senha temporária impressa para Bruno.
4. Guarde as credenciais em local seguro e não as coloque no código, README, issues ou commits.
5. Restrinja imediatamente o compartilhamento da planilha aos administradores necessários.

O bootstrap impede uma segunda execução quando a propriedade `FT_DATABASE_ID` já existe. Não apague essa propriedade nem repita o bootstrap para tentar corrigir problemas sem antes verificar a base existente.

## Implantar aplicativo da web

1. Clique em **Implantar → Nova implantação**.
2. Selecione **Aplicativo da web**.
3. Execute como o proprietário do script, se essa for a decisão operacional da empresa.
4. Restrinja “Quem tem acesso” ao público mínimo permitido pela política de segurança e pelas opções disponíveis na conta Google.
5. Faça a implantação e abra a URL do aplicativo.

Evite publicar o sistema para “qualquer pessoa” quando houver dados pessoais. O acesso ao aplicativo e o compartilhamento da planilha são controles separados: configure ambos.

## Primeiro acesso

1. Entre com `Diego` ou `Bruno` e a senha temporária correspondente que apareceu no log do bootstrap.
2. O sistema solicitará uma nova senha de no mínimo 12 caracteres, com letras maiúsculas, minúsculas e números.
3. Teste cadastro, edição, aprovação e inativação com dados fictícios.
4. Antes de produção, faça revisão de segurança e teste em navegador de computador e celular.

## Atualizar o aplicativo

Depois de alterar o código, crie uma nova versão da implantação em **Implantar → Gerenciar implantações → Editar**. Confirme a implantação usada pela equipe para evitar testar uma versão antiga.
