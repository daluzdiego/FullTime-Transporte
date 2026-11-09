# FullTime — Estratégia de desenvolvimento e testes 100% gratuitos

**Status:** regra obrigatória do projeto  
**Data:** 2026-11-09  
**Branch:** feat/multiempresa-foundation

## 1. Regra financeira inegociável

Até que a homologação funcional seja concluída e aprovada, o FullTime será desenvolvido e testado sem contratar infraestrutura, sem ativar faturamento e sem gerar despesas.

É proibido nesta fase:
- Criar instâncias pagas de Cloud SQL, Cloud Run ou outros serviços Google Cloud.
- Ativar faturamento ou cadastrar cartão para viabilizar testes.
- Manter recursos em nuvem que possam gerar cobrança, mesmo que estejam ociosos.
- Enviar mensagens, documentos ou chamadas por serviços externos tarifados.
- Usar dados reais de Bruno ou de qualquer transportadora em testes.

Nenhuma etapa técnica autoriza gasto automaticamente. Qualquer futura mudança para serviço pago exige estimativa documentada, aprovação explícita e plano de desligamento.

## 2. Ambiente local gratuito

O desenvolvimento será executado no computador da equipe, com ferramentas gratuitas:

| Necessidade | Ferramenta/abordagem |
|---|---|
| Controle de versão | Git e GitHub |
| Runtime JavaScript | Node.js |
| Testes unitários | Vitest ou Node test runner |
| Testes de interface | Playwright |
| Banco relacional | PostgreSQL instalado localmente ou em container local gratuito |
| Testes de políticas RLS | PostgreSQL local, com papéis e usuários fictícios |
| Interface atual | Servidor HTTP local, sem publicação |
| Apps Script | Código versionado localmente com clasp; serviços Google simulados nos testes automatizados |
| Identidade | Testes com identidade/membership simuladas; Firebase Emulator Suite apenas se necessário, localmente |
| Arquivos | Diretório local temporário com fixtures fictícias |
| WhatsApp | Mensagens fictícias gravadas como fixtures; sem WhatsApp Business API |
| E-mail e notificações | Adaptadores simulados; nenhum envio externo |

A instalação das ferramentas pode exigir download, mas não contratação de serviços. O ambiente não deve solicitar ativação de billing.

## 3. Camadas de teste

### Camada A — testes unitários
Validar funções puras: validação de dados, cálculo de capacidade, metas de viagens, transições de status, idempotência, parsing de mensagens e regras configuráveis.

### Camada B — testes de integração local
Executar backend e PostgreSQL no computador, com dados fictícios. Validar transações, chaves estrangeiras, índices, constraints e políticas RLS.

### Camada C — testes de interface
Executar a aplicação localmente com navegador automatizado. Validar login, permissões, formulários, navegação, estados de erro e fluxos principais.

### Camada D — testes de isolamento multiempresa
Criar no mínimo dois tenants fictícios: Empresa A e Empresa B, cada uma com usuários, motoristas, frota, operações, viagens e documentos próprios.

Executar tentativas explícitas de acesso cruzado por ID, URL, payload, consulta, arquivo, relatório, exportação, webhook e tarefa assíncrona. Todas devem ser negadas ou retornar ausência de dados, sem revelar a existência de registros da outra empresa.

### Camada E — regressão operacional
Preservar os testes existentes do FullTime e acrescentar casos de regressão para cada correção. Regras ainda pendentes de Bruno devem ser marcadas como PENDENTE_DE_VALIDACAO, não testadas como se fossem requisitos confirmados.

## 4. Dados de teste
- Usar exclusivamente empresas, pessoas, placas, documentos, mensagens e operações fictícias.
- Não copiar linhas, documentos, números de telefone, CPF, CNPJ ou mensagens reais de Bruno.
- Gerar IDs determinísticos ou identificadores fictícios isolados por execução.
- Recriar o banco de testes do zero quando necessário.
- Não apontar testes automatizados para planilhas reais ou produção.

## 5. Integrações externas
- WhatsApp: testar o parser com arquivos de mensagens fictícias e respostas simuladas.
- Google Sheets/Drive: testar adaptadores com mocks; testes manuais com conta real só se não houver custo e sem dados reais, após autorização.
- E-mail: usar caixa simulada/local; não enviar e-mails reais automaticamente.
- Mapas, geocodificação, SMS, OCR e IA externa: usar fixtures e respostas simuladas. Não consumir APIs tarifadas.
- Pagamentos/faturamento: simular eventos e faturas; não realizar cobranças reais.

Os testes com mocks demonstram a lógica do sistema, mas não certificam a integração real com o provedor. A validação externa será uma etapa separada, com limites de consumo e autorização explícita.

## 6. Portões de aprovação antes de qualquer gasto
Não considerar a migração para nuvem paga até que todos os portões estejam aprovados:
1. Testes unitários e de integração sem falhas críticas.
2. Dois tenants fictícios operando simultaneamente.
3. Testes negativos de isolamento aprovados em todos os módulos e superfícies.
4. Testes de autenticação, autorização, sessão expirada e revogação aprovados.
5. Fluxos operacionais centrais executados ponta a ponta com dados fictícios.
6. Backup e restauração locais demonstrados.
7. Testes de concorrência, idempotência e recuperação de falhas aprovados.
8. Requisitos operacionais de Bruno incorporados após suas respostas e homologados.
9. Estimativa de custo mensal, limites, alertas e plano de desligamento documentados.
10. Aprovação explícita do responsável pelo projeto antes de ativar qualquer serviço com cobrança.

## 7. Critério de mudança de fase
A passagem de ambiente gratuito para infraestrutura de produção não é automática. Primeiro será apresentado:
- o que precisa sair do ambiente local;
- qual serviço será contratado e por quê;
- custo estimado mínimo e cenários de crescimento;
- limites/alertas de orçamento;
- riscos e alternativas gratuitas;
- plano de implantação, rollback e desligamento.

Sem aprovação explícita, o projeto permanece no ambiente gratuito.

## 8. Limites conhecidos
O ambiente local valida a lógica, o modelo de dados, a interface e boa parte da segurança. Ele não comprova sozinho disponibilidade em produção, latência real, comportamento de serviços Google hospedados, entrega real de WhatsApp/e-mail, nem custos de produção. Essas validações ficam para uma fase posterior, controlada e autorizada.