# Full Time — Transporte e Consultoria

Sistema web responsivo para apoio à operação de transporte, iniciado pelo MVP administrativo.

## Escopo do MVP

- Login administrativo com troca obrigatória da senha temporária no primeiro acesso.
- Painel administrativo responsivo.
- Cadastro, consulta, edição e inativação de motoristas.
- Cadastro, consulta, edição e inativação de caminhões.
- Validações de placa e CPF para minimizar duplicidades.
- Os demais módulos aparecem como **EM DESENVOLVIMENTO**.
- Interface otimizada para desktop e celular, com estética corporativa inspirada no Microsoft Fluent Design.

## Tecnologia

- Google Apps Script como backend e aplicação web.
- Google Sheets como persistência inicial.
- HTML, CSS e JavaScript no frontend.

## Estrutura do repositório

- `Code.gs`: backend, autenticação, permissões, validações e operações de dados.
- `Index.html`: interface responsiva de login e painel.
- `appsscript.json`: manifesto sugerido do Apps Script.
- `docs/ARQUITETURA.md`: visão técnica e modelo de dados.
- `docs/INSTALACAO.md`: configuração, implantação e primeiros testes.
- `docs/SEGURANCA.md`: premissas de segurança e proteção de dados.
- `docs/TESTES.md`: roteiro de validação manual.
- `docs/ROADMAP.md`: próximos módulos.

## Instalação resumida

1. Crie um projeto em [Google Apps Script](https://script.google.com/).
2. Copie `Code.gs` para o editor de script.
3. Crie um arquivo HTML chamado `Index` e copie `Index.html`.
4. Ajuste o manifesto conforme `appsscript.json`, se necessário.
5. Execute `configurarSistemaFullTime()` uma única vez e autorize as permissões solicitadas.
6. Consulte os logs para recuperar a planilha criada e as informações de bootstrap.
7. Implante como Aplicativo da web, restringindo o acesso à organização/usuários autorizados conforme as opções disponíveis na conta.
8. No primeiro acesso, defina uma senha individual e forte para cada administrador.

> **Importante:** credenciais temporárias servem apenas para bootstrap e não devem ser mantidas. Antes de usar dados reais de CNH, CPF ou documentos, restrinja o acesso à planilha e teste a autenticação e as permissões. Esta versão é um MVP em validação; não a considere pronta para operação crítica sem testes e revisão de segurança.

## Estado atual

MVP inicial: login, painel, cadastros administrativos de motoristas e caminhões. Cargas, escalas, viagens, relatórios e configurações operacionais completas permanecem em desenvolvimento.


## Entrada assistida de viagens — em testes

- A planilha do Bruno é a fonte de verdade para os cadastros e para a nova guia `ENTRADA_OPERACOES_IA`. A sincronização é unidirecional: Bruno → Full Time.
- `Entrada de viagens (IA)` recebe texto copiado e colado de mensagens de WhatsApp. Não acessa o WhatsApp automaticamente.
- A guia `ENTRADA_OPERACOES_IA` é criada/verificada nos dois arquivos. O agente grava o rascunho e a confirmação na planilha do Bruno; a sincronização copia os registros para a mesma guia no sistema e materializa a viagem confirmada em `CARGAS`.
- A primeira implementação usa extração determinística baseada em padrões, não um modelo generativo. Use somente mensagens fictícias e não considere o módulo pronto para produção.
- Em ambiente de teste, execute `prepararBaseOperacionalFullTime()` no sistema e `prepararEntradaOperacoesIAFullTime()` para criar/verificar `ENTRADA_OPERACOES_IA` nas duas planilhas. Não execute com dados reais até terminar os testes.
