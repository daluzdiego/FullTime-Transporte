# FullTime — Arquitetura Multiempresa (ADR-001)

Status: proposta técnica aprovada para orientar a implementação; ainda não aplicada ao runtime.
Data: 2026-11-09
Repositório: daluzdiego/FullTime-Transporte
Branch de trabalho: feat/multiempresa-foundation
Base auditada: feat/arquitetura-multicanal-sem-planilha-bruno

## 1. Objetivo

Transformar o FullTime em um único produto SaaS da Feeds, capaz de atender várias transportadoras com código, evolução e operação compartilhados, mantendo isolamento estrito entre os dados, usuários, arquivos, integrações, configurações e cobranças de cada empresa.

A empresa do Bruno será o primeiro tenant operacional/homologador. Ela não será a dona da arquitetura nem terá regras exclusivas embutidas no núcleo do produto.

## 2. Diretrizes obrigatórias

1. Ecossistema Google exclusivamente para infraestrutura e serviços gerenciados.
2. Um produto e uma base de código; múltiplos tenants.
3. Isolamento de tenant aplicado no servidor e no banco, nunca apenas na interface.
4. Nenhuma consulta, gravação, exportação, arquivo, relatório, integração ou tarefa assíncrona pode atravessar tenants.
5. Regras operacionais variáveis devem ser configurações por tenant, não condicionais fixas por nome de cliente.
6. Dados reais do Bruno não serão usados em testes de arquitetura; testes usam tenants e dados inteiramente fictícios.
7. Não apagar, sobrescrever nem migrar dados operacionais existentes sem backup, prévia, plano de reversão e autorização específica.
8. Google Sheets e Apps Script podem permanecer como adaptadores de integração/transição, mas não serão o banco central do SaaS multiempresa.
9. A implantação e a tarifa por viagem são independentes da mensalidade da plataforma.
10. Medição de custo e consumo por tenant será parte da plataforma desde o início.

## 3. Arquitetura Google proposta

- Frontend: manter a interface atual como etapa de transição; evoluir para hospedagem gerenciada Google quando a separação frontend/backend estiver pronta.
- Backend/API: Google Cloud Run, com serviços stateless e APIs autenticadas.
- Identidade: Firebase Authentication / Google Identity Platform. O token de identidade será validado no backend; o tenant e os papéis efetivos serão resolvidos no servidor.
- Banco transacional: Cloud SQL for PostgreSQL. A natureza relacional de empresas, usuários, motoristas, conjuntos, operações, participações, viagens, faturamento e auditoria favorece SQL e integridade referencial.
- Isolamento de dados: tenant_id obrigatório nas entidades pertencentes ao cliente; políticas de Row-Level Security no PostgreSQL como defesa adicional; acesso à conexão do banco somente pelo backend.
- Arquivos: Google Cloud Storage com caminhos namespaced por tenant e autorização no backend; nunca expor bucket público para documentos privados.
- Segredos: Secret Manager.
- Processamento assíncrono: Cloud Tasks e/ou Pub/Sub para filas, webhooks, notificações e rotinas que precisem de retentativa.
- Observabilidade: Cloud Logging, Cloud Monitoring, Error Reporting e métricas de custo/uso por tenant.
- Planilhas: Google Sheets/Drive e Apps Script somente como conectores, importação/exportação ou compatibilidade temporária com a operação do Bruno.

A escolha final de serviços, regiões, redundância e dimensionamento será confirmada com estimativa de custo, requisitos de disponibilidade, volume e privacidade antes da produção.

## 4. Modelo de tenancy

Entidades de plataforma:
- tenants: id, nome legal, nome fantasia, CNPJ, status, plano, datas de ativação e encerramento.
- tenant_settings: tenant_id, configurações operacionais e preferências.
- users: identidade global do usuário.
- tenant_memberships: user_id, tenant_id, papel, status, permissões e validade.
- tenant_integrations: tenant_id, provedor, referência do segredo no Secret Manager, escopos e status.
- tenant_usage_daily: tenant_id, data, operações, viagens concluídas, armazenamento, processamento e métricas de uso.
- subscriptions: tenant_id, valor fixo, vigência e status.
- billing_periods / invoices / invoice_items / billing_events: fechamento, snapshot, itens e trilha de auditoria.

Entidades operacionais:
- motoristas, cavalos, carretas, conjuntos, clientes, locais, regras, operações, participações, viagens, eventos de viagem, documentos e filas/ofertas.
- Toda entidade operacional pertence a exatamente um tenant, diretamente ou por relação validada.
- IDs externos vindos de planilhas ou sistemas do cliente devem ser namespaced pelo tenant; nunca serão chaves globais confiáveis.

## 5. Regra de autorização

- O frontend não escolhe livremente tenant_id para ampliar acesso.
- O backend deriva o tenant autorizado da sessão/membership validada.
- Toda operação de leitura e escrita recebe contexto de tenant obrigatório.
- O repositório de dados exige tenant_id explicitamente.
- PostgreSQL RLS limita linhas ao tenant da transação.
- Jobs, webhooks e integrações carregam tenant_id validado e não reutilizam contexto de outra empresa.
- Administradores Feeds terão acesso de suporte controlado, justificado, temporário e auditado; não haverá acesso irrestrito implícito aos dados operacionais.
- Testes automatizados tentarão acesso cruzado por IDs, URLs, payloads, exports, arquivos, jobs e consultas.

## 6. Política comercial aprovada até aqui

- Implantação: R$ 15.000,00 por cliente, conforme escopo contratado.
- Plataforma: R$ 199,00 por mês.
- Viagem concluída elegível: R$ 1,00 por evento faturável.
- Não há cobrança por motorista definida como aprovada neste modelo.
- Fechamento: primeiro dia do mês seguinte.
- Contestação: 10 dias; o contrato deverá definir precisamente o marco inicial.
- Reabertura de viagem concluída: mantém o evento original, sem cobrança duplicada.
- Homologação/teste: isenta.
- A definição exata de viagem concluída elegível, cancelamentos, ajustes, vencimento e forma de pagamento deverá constar no contrato e nas regras de faturamento.
- Os valores comerciais não representam custo Google comprovado; devem ser validados com medição real de consumo, suporte, tributos e margem.

## 7. Auditoria inicial do código existente

Auditoria inicial da branch feat/arquitetura-multicanal-sem-planilha-bruno em 2026-11-09:

- Code.gs mantém FT_DATABASE_ID como propriedade global do script.
- getSheet_ resolve uma FT_REGISTRY_DATABASE_ID global para várias guias operacionais; portanto, as operações atuais usam uma base operacional compartilhada e não há resolução de tenant por sessão.
- loginFullTime consulta USUARIOS globalmente e a sessão atual contém id, login, nome, perfil, motoristaId e permissões, mas não contém tenantId nem membership validada.
- exigirAdmin_ verifica somente perfil === ADMIN; não verifica empresa/tenant.
- As guias operacionais MOTORISTAS, CAVALOS, CARRETAS, CONJUNTOS, OPERACOES, PARTICIPACAO_OPERACOES, VIAGENS, DOCUMENTOS e demais tabelas não apresentam tenant_id no esquema atual auditado.
- FT_BRUNO_CADASTROS e ftReadBrunoRows_ apontam para guias nomeadas explicitamente como cadastros do Bruno em um registro global; esta integração é específica do primeiro cliente e deverá ser convertida em adaptador por tenant.
- A criação inicial configurarSistemaFullTime cria uma base e usuários iniciais globais. Não deve ser usada para provisionar novos clientes.
- O portal do motorista já deriva o motoristaId da sessão, o que é uma boa prática local, mas o isolamento atual é por motorista, não por empresa.
- A arquitetura atual é Apps Script + Google Sheets, com separação parcial entre base interna e registro operacional. Não é ainda um SaaS multiempresa seguro.

## 8. Plano de execução

### Fase 0 — proteção e inventário
- Congelar a branch atual como referência; manter a nova branch de trabalho.
- Inventariar todas as funções de leitura/gravação, guias, propriedades de script, gatilhos, integrações e pontos de entrada.
- Identificar cada tabela por tenant, global de plataforma ou derivada.
- Criar cópia/backup verificável e plano de retorno antes de qualquer migração.

### Fase 1 — contrato de tenancy e identidade
- Definir tenants, memberships, papéis e permissões.
- Implementar contexto de tenant no backend.
- Remover confiança em tenant enviado pelo navegador.
- Criar testes negativos de isolamento antes de migrar dados.

### Fase 2 — persistência transacional Google
- Provisionar projeto/ambientes Google Cloud (desenvolvimento, homologação, produção).
- Criar Cloud SQL PostgreSQL e migrações versionadas.
- Implementar RLS, chaves estrangeiras, índices e auditoria.
- Não importar dados reais até que os testes de isolamento estejam aprovados.

### Fase 3 — migração dos módulos
- Migrar módulos em ordem: identidade e cadastros; frota/conjuntos; operações e participações; viagens/eventos/documentos; escala e ofertas; faturamento.
- Criar adaptador de importação para planilha do Bruno, identificado por tenant.
- Manter Sheets como origem legada apenas durante a transição controlada; estabelecer fonte única de verdade por módulo e data de corte.

### Fase 4 — billing e medição
- Registrar eventos únicos de viagem concluída, excluindo homologação e cancelamentos não concluídos.
- Medir custo de infraestrutura por tenant e por unidade de uso.
- Fechamento idempotente e trilha de contestação/ajustes.

### Fase 5 — homologação comercial
- Dois tenants fictícios simultâneos com usuários e dados independentes.
- Testes de tentativa de acesso cruzado em todos os módulos.
- Testes de concorrência, recuperação, backup/restauração, exportação e auditoria.
- Só então cadastrar Bruno como primeiro cliente de produção/migração controlada e preparar o onboarding do segundo cliente.

## 9. Critérios mínimos para considerar multiempresa pronto

- Um usuário da empresa A não consegue ler, alterar, enumerar, exportar ou baixar dados da empresa B.
- Um usuário não pode trocar tenant via parâmetro, URL, payload ou chamada direta.
- Jobs, arquivos, relatórios e integrações são tenant-scoped.
- As políticas RLS bloqueiam consultas sem contexto válido.
- Testes automatizados cobrem todos os módulos e rotas.
- Backup e restauração foram testados.
- A medição de uso e faturamento preserva snapshots e idempotência.
- O onboarding de um novo cliente não exige copiar código, duplicar a aplicação ou criar uma planilha operacional artesanal.

## 10. Limites desta entrega

Este documento registra a auditoria inicial e a direção arquitetural. Nenhuma alteração no runtime, banco, planilhas, implantação Google Cloud ou dados do Bruno foi realizada nesta etapa. Não executar migração nem provisionar recursos pagos até revisar o inventário e aprovar o plano de migração/custos.
