# FullTime — Transporte e Consultoria

Repositório oficial do sistema FullTime de gestão de operações de transporte.

## Estrutura oficial

```text
FullTime-Transporte/
├── apps-script/                 # Única pasta com os arquivos do projeto Apps Script
│   ├── Code.gs
│   ├── Index.html
│   ├── MotorConvocacaoAutomaticaFullTime.gs
│   ├── CadastroMotoristasFullTime.gs
│   ├── IntegracaoCadastroBruno.gs
│   ├── PLANILHABRUNO-cargateste.gs
│   ├── PLANILHABRUNO-diagnostico-sincronizacao.gs
│   ├── PLANILHABRUNO-sincronizacao.gs
│   ├── WhatsAppTickets.gs
│   └── appsscript.json
├── docs/                        # Arquitetura, instalação, segurança e testes
└── README.md
```

**Regra do repositório:** todo arquivo que pertence ao projeto executável do Google Apps Script fica em `apps-script/`. Não manter cópias desses arquivos na raiz nem em pastas paralelas.

## Aplicação

- Backend e serviços centrais: `apps-script/Code.gs`
- Interface web: `apps-script/Index.html`
- Convocação automática e reconciliação de ofertas: `apps-script/MotorConvocacaoAutomaticaFullTime.gs`
- Cadastro de motoristas: `apps-script/CadastroMotoristasFullTime.gs`
- Integração com a planilha do Bruno: `apps-script/IntegracaoCadastroBruno.gs` e arquivos `PLANILHABRUNO-*.gs`
- Tickets e entrada de mensagens WhatsApp: `apps-script/WhatsAppTickets.gs`
- Manifesto do Apps Script: `apps-script/appsscript.json`

## Implantação e sincronização

A pasta `apps-script/` é a raiz local do projeto ao utilizar clasp. Entre nela antes de clonar ou sincronizar o projeto. O arquivo `.clasp.json` é específico do ambiente e não deve conter o ID privado do script no repositório.

Exemplo para um clone novo, executado dentro de `apps-script/`:

```bash
clasp clone SEU_SCRIPT_ID
clasp pull
```

Para enviar alterações depois de revisar o diff:

```bash
clasp status
clasp push
```

## Documentação

- `docs/ARQUITETURA.md`: visão técnica e componentes.
- `docs/INSTALACAO.md`: configuração e implantação.
- `docs/SEGURANCA.md`: premissas de segurança.
- `docs/TESTES.md`: roteiro de homologação.
- `docs/ROADMAP.md`: planejamento evolutivo.

## Segurança e dados

Não versionar senhas, tokens, IDs privados de planilhas, credenciais ou dados pessoais reais. Testes de convocação e integrações devem ocorrer com dados fictícios antes de qualquer liberação operacional.
