# FullTime — Inventário técnico inicial (Fase 0)

**Data:** 2026-11-09  
**Branch de trabalho:** feat/multiempresa-foundation  
**Código inspecionado:** Code.gs e Index.html da branch feat/multiempresa-foundation  
**Objetivo:** separar o que pode avançar sem as respostas operacionais de Bruno do que depende de validação do cliente.

> Este é um inventário estático inicial, não uma certificação de segurança nem um levantamento exaustivo de todos os caminhos de execução. Não foram executados scripts no Apps Script, não foram acessadas planilhas reais e não foram alterados dados.

## 1. Decisões que podem avançar sem Bruno

1. Modelo SaaS multiempresa: um produto, uma base de código, tenants isolados.
2. Identidade global do usuário separada do vínculo do usuário com cada empresa (membership).
3. Autorização sempre validada no servidor; o navegador não define o tenant autorizado.
4. Separação entre dados de plataforma, dados operacionais do tenant e eventos de auditoria.
5. Estratégia de migração gradual de Apps Script/Sheets para serviços gerenciados Google, sem provisionar recursos pagos nesta fase.
6. Convenções de IDs, auditoria, idempotência, ambientes e testes automatizados.
7. Segurança transversal: isolamento de consultas, arquivos, relatórios, integrações, webhooks e tarefas assíncronas.
8. Política de proteção de dados: backup, restauração testada, retenção, exportação e exclusão controlada.
9. Modelo de faturamento já escolhido pelo produto: implantação R$ 15.000, mensalidade de plataforma R$ 199 e R$ 1 por viagem concluída elegível; homologação isenta. Não incluir tarifa por motorista sem nova aprovação.

## 2. Pontos identificados no código atual

| Área | Evidência no código | Consequência / trabalho necessário |
|---|---|---|
| Configuração | FT_DATABASE_ID e FT_REGISTRY_DATABASE_ID são propriedades globais do script | Substituir resolução global por configuração/escopo do tenant no backend |
| Login | loginFullTime consulta USUARIOS globalmente | Separar identidade de membership por empresa |
| Sessão | Sessão contém id, login, nome, perfil, motoristaId e permissões; não contém tenantId validado | Criar contexto de tenant no servidor e validar membership em cada requisição |
| Administração | exigirAdmin_ verifica perfil ADMIN | Autorizações devem combinar tenant, papel e permissão específica |
| Leitura de dados | listarRegistros_ lê a guia operacional sem filtro de empresa | Repositório deve exigir tenantId e aplicar filtro obrigatório |
| Esquema | Guias operacionais não incluem tenant_id no cabeçalho observado | Definir chaves e relações tenant-scoped antes da migração |
| Integração Bruno | FT_BRUNO_CADASTROS e ftReadBrunoRows_ usam nomes de guias globais específicos do Bruno | Converter em conector configurável por tenant; não espalhar exceções Bruno pelo núcleo |
| Provisionamento | configurarSistemaFullTime cria base e usuários iniciais globais | Não usar como onboarding de novos clientes; criar fluxo próprio de tenant |
| Portal motorista | obterPainelMotoristaFullTime deriva motoristaId da sessão e filtra dados do motorista | Preservar a defesa atual e acrescentar isolamento por tenant em todas as entidades consultadas |
| Operações | OPERACOES, PARTICIPACAO_OPERACOES e VIAGENS formam o núcleo do planejamento | Preservar relações e integridade; regras específicas de escala aguardam Bruno |
| Eventos/documentos | EVENTOS_VIAGEM, DOCUMENTOS_VIAGEM, TICKETS e auditoria armazenam histórico/arquivos | Definir tenant por relação validada e política de acesso/retensão |
| Escala | DISPONIBILIDADE_DIARIA, FILA_MOTORISTAS, OFERTAS_OPERACOES e EVENTOS_OPERACAO | Separar estrutura genérica de parâmetros operacionais ainda pendentes |

## 3. Inventário preliminar de dados

### Plataforma (global, sem dados operacionais de clientes)
- tenants
- users
- tenant_memberships
- tenant_settings (registro de configuração por tenant)
- tenant_integrations (referências de segredos, nunca segredos em texto)
- planos/contratos e parâmetros comerciais
- medição agregada de uso por tenant
- trilha de suporte administrativo da Feeds

### Operação (sempre pertencente a um tenant)
- MOTORISTAS
- CAVALOS
- CARRETAS
- CONJUNTOS
- CLIENTES
- LOCAIS
- REGRAS_OPERACIONAIS
- OPERACOES
- PARTICIPACAO_OPERACOES
- VIAGENS
- EVENTOS_VIAGEM
- DOCUMENTOS_VIAGEM
- TICKETS
- DISPONIBILIDADE_DIARIA
- FILA_MOTORISTAS
- OFERTAS_OPERACOES
- EVENTOS_OPERACAO
- HISTORICO_ASSIDUIDADE (presente em rotina de criação de guias de escala)

### Transversais / classificação ainda a fechar
- USUARIOS: a tabela atual é global, mas o desenho SaaS deve separar identidade global e memberships por tenant.
- AUDITORIA: eventos de plataforma e eventos operacionais precisam de escopo explícito; não assumir que uma única tabela global atual seja suficiente.
- CONTROLE_DOCUMENTAL: pertence ao tenant do registro referenciado; a relação precisa ser validada no servidor.
- billing: novos registros de faturamento devem ser imutáveis/auditáveis e vinculados ao tenant.

## 4. Entradas e superfícies que precisam de proteção

- doGet: entrega a aplicação web e também contém lógica de verificação de webhook WhatsApp.
- loginFullTime / encerrarSessaoFullTime / trocarSenhaInicial: ciclo de identidade e sessão.
- obterPainelFullTime / obterPainelMotoristaFullTime: agregação de dados para interfaces.
- Funções de salvar, atualizar, aprovar, iniciar, concluir, cancelar, replanejar e exportar registros.
- Webhook WhatsApp e ingestão de mídia/tickets.
- Gatilhos instaláveis, tarefas agendadas e qualquer execução acionada sem usuário interativo.
- Integrações Google Sheets/Drive e leitura de cadastros de Bruno.
- Uploads, links de documentos, PDFs, relatórios e exports.

O inventário completo dos nomes de funções e dos gatilhos deve ser fechado antes da primeira migração. Esta etapa não altera comportamento de produção.

## 5. Regras de engenharia a adotar

1. Toda função pública que recebe token deve resolver sessão e tenant no servidor.
2. Nenhuma função de negócio deve chamar leitura/gravação genérica sem contexto de tenant.
3. Não aceitar tenantId do payload como prova de autorização; no máximo, validar que coincide com membership autorizada.
4. Toda relação entre registros deve validar que ambos pertencem ao mesmo tenant.
5. IDs externos de planilhas devem ser tratados como identificadores locais do conector, nunca como IDs globais.
6. Eventos de webhook devem ter idempotência por provedor + tenant + ID externo.
7. Tarefas assíncronas devem carregar tenantId validado, correlationId e chave de idempotência.
8. Auditoria deve registrar ator, tenant, ação, entidade, ID, instante e correlação, sem armazenar segredos.
9. Exportações e arquivos devem verificar autorização no servidor antes de gerar ou entregar conteúdo.
10. Nenhuma migração destrutiva: backup verificável, prévia, contagem, reconciliação e rollback documentado.

## 6. O que fica deliberadamente pendente de Bruno

Não definir por suposição:
- regras de fila, rodízio, prioridade e desempate;
- janelas de apresentação, intervalos e exceções por operação/local;
- limites de simultaneidade e conflitos operacionais;
- quantidade de viagens por motorista e critérios de redistribuição/replanejamento;
- regras de descanso, disponibilidade, atraso, falta, recusa e substituição;
- exceções por cliente, terminal, navio, produto, local ou tipo de operação;
- aprovações humanas e responsabilidades em cada etapa;
- mensagens/formatos reais de WhatsApp e campos obrigatórios para confirmar uma operação;
- indicadores e relatórios operacionais que Bruno considera oficiais.

As 65 perguntas são a fonte para fechar esses requisitos. Respostas ausentes ou ambíguas devem permanecer como pendências rastreáveis, nunca virar regra padrão inventada.

## 7. Próximas entregas independentes das respostas

1. Fechar o mapa completo de funções públicas e chamadas de leitura/gravação.
2. Inventariar gatilhos, propriedades, integrações e dependências de planilhas sem executar alterações.
3. Especificar o modelo relacional inicial (DDL) para plataforma, membership, cadastros e auditoria, deixando campos operacionais variáveis marcados.
4. Criar testes de arquitetura com dois tenants fictícios e tentativas de acesso cruzado.
5. Definir contratos de repositório/API com tenant context obrigatório.
6. Definir o fluxo de onboarding de nova empresa sem clonar código nem planilhas.
7. Preparar matriz de migração: guia atual → entidade/tabela nova → validações → rollback.

## 8. Limites e proteção

- Não usar dados reais de Bruno em testes.
- Não limpar, renomear ou alterar guias existentes.
- Não alterar a planilha do Bruno nem a planilha principal.
- Não provisionar Cloud Run, Cloud SQL, Firebase ou buckets pagos sem estimativa e autorização.
- Não promover a branch de trabalho para produção.
- Não declarar o sistema multiempresa pronto antes de testes automatizados de isolamento e restauração.
