# Full Time — Transporte e Consultoria

Sistema administrativo e operacional em evolução para gestão de transporte, cadastros de frota, operações, cargas, disponibilidade e geração automática de escalas.

## Arquitetura atual
- Google Apps Script: backend e aplicação web.
- Google Sheets: persistência operacional e sincronização dos cadastros recebidos da planilha do Bruno.
- `Code.gs`: autenticação, autorização, cadastros, integração, operações e regras de escala em evolução.
- `Index.html`: interface administrativa responsiva.

## Regra central do produto
**A escala será gerada pelo próprio sistema.** O administrador mantém operações, cadastros, vínculos e regras; não escolhe manualmente o motorista para cada operação. Em etapa posterior, o motorista acessará uma área própria apenas para informar sua disponibilidade para o próximo dia. O horário limite para essa confirmação depende de validação com Bruno e permanece pendente.

O vínculo veicular é feito no cadastro: motorista → cavalo mecânico → zero, uma ou mais carretas conforme a configuração operacional suportada. Na escala, o sistema recupera automaticamente as placas e os dados desse vínculo. Alterações precisam preservar o histórico das escalas anteriores.

## Módulos presentes no código
- Login administrativo e troca obrigatória da senha inicial.
- Painel e cadastros administrativos.
- Leitura/sincronização de motoristas, cavalos, carretas e conjuntos da planilha de origem.
- Cadastro de operações e cargas.
- Cadastro de vínculos veiculares.
- Estruturas de disponibilidade, fila, ofertas, eventos e participações operacionais.

A presença de uma função ou guia não significa que o fluxo esteja pronto para produção. A geração automática completa, as regras de distribuição e a área do motorista ainda exigem implementação integrada e testes.

## Integração da planilha do Bruno
O adaptador lê dados por nome de cabeçalho e converte identificadores externos para o modelo interno. Os campos `MOTORISTA_ID_EXTERNO`, `CAVALO_ID_EXTERNO`, `CARRETA_MEIO_ID_EXTERNO` e `CARRETA_FINAL_ID_EXTERNO` devem ser preservados e resolvidos sem criar cópias desnecessárias de guias.

## Segurança e implantação
- Use somente dados fictícios durante a validação.
- Restrinja o acesso ao aplicativo e às planilhas.
- Não considere o sistema pronto para operação crítica sem testes, revisão de segurança, concorrência, recuperação e proteção de dados.
- Atualizar o GitHub não atualiza automaticamente a implantação publicada do Apps Script.

## Estrutura principal
- `Code.gs`
- `Index.html`
- `appsscript.json`
- `docs/ARQUITETURA.md`
- `docs/INSTALACAO.md`
- `docs/SEGURANCA.md`
- `docs/TESTES.md`
- `docs/ROADMAP.md`

## Homologação isolada

O branch `homologacao/mvp-isolado` contém o bootstrap `HOMOLOGACAO_SETUP.gs` para criar uma base independente com dados fictícios. Leia [`docs/HOMOLOGACAO.md`](docs/HOMOLOGACAO.md) antes de executar: o bootstrap deve rodar somente em um projeto Apps Script novo, nunca no projeto publicado atual.
