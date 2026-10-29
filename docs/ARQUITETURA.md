# Arquitetura — Full Time MVP

## Visão geral

A primeira versão utiliza Google Apps Script para a camada de aplicação, Google Sheets como persistência e uma interface HTML/CSS/JavaScript entregue por `doGet()`.

## Componentes

- `Code.gs`: autenticação, sessão, autorização de administrador, validação de dados, CRUD de motoristas e caminhões, métricas e auditoria.
- `Index.html`: login e experiência administrativa responsiva.
- Google Sheets: tabelas `USUARIOS`, `MOTORISTAS`, `CAMINHOES`, `AUDITORIA` e `CONFIGURACOES`.

## Modelo de dados

### USUARIOS
Identificador, login, nome, salt/hash da senha, papel, estado ativo, flag de troca obrigatória, data de criação e último login.

### MOTORISTAS
Identificador UUID, criação/atualização, status, nome, CPF, telefone, e-mail, dados de CNH, cidade/UF, contato de emergência, observações e usuário que cadastrou.

Status inicial: `PENDENTE_REVISAO`. Estados operacionais: `ATIVO`, `INATIVO`.

### CAMINHOES
Identificador UUID, criação/atualização, status, placa, RENAVAM, marca, modelo, ano, tipo, capacidade em toneladas, situação documental, observações e usuário que cadastrou.

Status inicial: `PENDENTE_REVISAO`. Estados operacionais: `ATIVO`, `INATIVO`.

### AUDITORIA
Data, usuário, login, ação, entidade, identificador e breve descrição da ação administrativa.

## Fluxos previstos

1. O administrador autentica-se.
2. Na primeira autenticação, deve trocar a senha temporária.
3. A aplicação obtém os indicadores e listas por funções de backend.
4. O formulário envia os dados à função de servidor apropriada.
5. O backend valida autorização, campos e duplicidades antes de gravar.
6. O registro novo é criado como pendente.
7. O administrador revisa e ativa/inativa manualmente.

## Limites deste MVP

- Não implementa ainda cargas, escalas, viagens, notificações, WhatsApp, relatórios exportáveis ou área de motorista.
- Não armazena imagens de documentos.
- Não realiza validação externa de CNH, CRLV-e, CPF ou situação legal.
- Google Sheets não deve ser presumido como banco definitivo para uma operação crítica com concorrência sem testes de carga, revisão de arquitetura e plano de recuperação.


## Entrada de operações por mensagem colada

`ENTRADA_OPERACOES_IA` é a fila de rascunhos com texto original, JSON extraído, campos pendentes e confirmação. Nenhuma linha é criada em `CARGAS` enquanto houver campos obrigatórios pendentes. Após confirmação do administrador, `CARGAS` recebe uma linha com o contrato de dados existente, status `A_ESCALAR`, ID próprio e referência da entrada nas observações. A captura é manual por copiar/colar; não é integração automática com WhatsApp. A primeira versão usa extração determinística e deve ser tratada como protótipo, não como IA generativa.
