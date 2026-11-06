# FullTime — Ambiente Particular do Cliente (Google Drive)

**Decisão aprovada:** planilha de propriedade do cliente + integração bidirecional controlada.  
**Implementação inicial:** vínculo, validação por allowlist e captura durável de edições.  
**Status:** fundação técnica; sincronização de entidades ainda não liberada.

## 1. Propriedade e autorização

- A planilha é criada e permanece no Google Drive do cliente.
- O cliente compartilha o arquivo diretamente com a identidade Google que executa o projeto Apps Script do FullTime.
- Não usar compartilhamento público por link.
- O FullTime guarda o ID do arquivo vinculado e acessa somente as guias explicitamente permitidas.
- A primeira versão do conector é single-tenant por implantação. Antes de atender várias empresas na mesma implantação, o vínculo deve migrar para um registro por tenant com credenciais, permissões e filas isoladas.

## 2. Fonte oficial e direção dos dados

A base operacional nativa do FullTime é a fonte oficial para IDs internos, estados operacionais, aprovações, escalas, viagens e auditoria. A planilha particular é o espaço colaborativo do cliente para cadastros e manutenção dos campos que lhe pertencem.

A integração será bidirecional, mas não por espelhamento cego:

1. Drive → FullTime: alterações de campos administráveis pelo cliente entram em fila, são validadas e aplicadas por entidade.
2. FullTime → Drive: o sistema devolve ID interno, status de processamento, erros de validação, timestamps e campos operacionais que o sistema controla.
3. Campo controlado pelo sistema não pode ser sobrescrito por edição do Drive.
4. Exclusões na planilha nunca apagam registros no FullTime. Devem gerar solicitação de inativação/revisão.
5. Conflitos são registrados e enviados para resolução; não há política de “última gravação vence” para campos críticos.

## 3. Regras de identidade e prevenção de duplicidade

- Cada linha recebe um ID externo permanente, gerado uma única vez e mantido após edições.
- Cada registro recebe um ID interno FullTime, devolvido à planilha.
- Chaves naturais por tenant: CPF normalizado para motorista; placa normalizada para cavalo/carreta; identificador documental e vínculo de entidade para documento.
- Conjunto é identificado por ID externo próprio; seus componentes são referências, não uma chave concatenada instável.
- A gravação no FullTime deve ser transacional/serializada, com unicidade por tenant e chave natural.
- Idempotência por evento: origem + identificador do evento + entidade + ID externo + hash do conteúdo normalizado.
- Reentrega do mesmo evento não cria nova linha nem nova auditoria de negócio.
- Alteração da mesma chave natural para outro registro é conflito, não atualização automática.

## 4. Contrato mínimo de sincronização

Guias de cadastro reconhecidas pelo conector:
- MOTORISTAS
- CAVALOS
- CARRETAS
- CONJUNTOS
- CONTROLE_DOCUMENTAL
- OPERACOES

A validação lê apenas essas guias e seus cabeçalhos necessários. A guia protegida CAVALOS-BRUNO permanece fora da allowlist: não é lida, enumerada, alterada ou usada.

A captura de edição grava um evento durável em FT_SYNC_DRIVE na base interna do FullTime. A fila contém apenas metadados do evento e localização da edição; não copia documentos pessoais para logs. O processador de eventos será ligado após a conclusão do mapeamento por cabeçalho e da matriz de propriedade de campos.

## 5. Matriz de propriedade dos campos

| Campo / informação | Autoridade de edição | Retorno à planilha |
|---|---|---|
| Dados cadastrais de motorista | Cliente autorizado | ID interno, status e validação |
| Dados técnicos de cavalo/carreta | Cliente autorizado | ID interno, status documental e validação |
| Composição de conjunto | Cliente autorizado, com validação | IDs internos dos componentes e resultado |
| Documentos e datas informadas | Cliente autorizado | Estado de conferência e pendências |
| Aprovação/inativação operacional | FullTime | Status e motivo |
| Disponibilidade, escala e viagens | FullTime | Resumo/status quando aplicável |
| IDs internos, auditoria e timestamps de processamento | FullTime | Sempre |

Campos críticos podem exigir revisão humana antes de efetivar alteração, conforme regra por entidade.

## 6. Conflitos e recuperação

- Evento duplicado: ignorar efeito de negócio e marcar como já processado.
- Evento fora de ordem: comparar versão/hash e encaminhar para revisão se houver risco de sobrescrever dado mais novo.
- Chave natural já existente: bloquear criação e indicar o registro correspondente sem revelar dados de outro tenant.
- Referência de conjunto inexistente: manter pendente; não gravar vínculo parcial.
- Google Drive indisponível: manter eventos já capturados e exibir estado degradado; não prometer captura de edições que o Google não entregou ao gatilho.
- Falha no processador: retry com limite e backoff; depois fila de exceção.
- Exclusão de linha: não apagar cadastro operacional; exigir ação explícita de inativação.
- Escritas do FullTime na planilha devem usar marca de origem/correlação para não provocar loop de sincronização.

## 7. Implementação por etapas

### Etapa 1 — Fundação (commit 2adf133)
- Conexão da planilha do cliente por ID.
- Validação dos cabeçalhos em allowlist.
- Gatilho instalável para edição direta no Drive.
- Fila durável FT_SYNC_DRIVE na base interna.
- Diagnóstico de conexão e fila.
- Nenhuma importação ou sobrescrita automática de cadastros.

### Etapa 2 — Mapeamento canônico
- Mapeamento por nome de cabeçalho, nunca por posição.
- ID externo obrigatório e ID interno FullTime retornado.
- Normalização e chaves únicas por tenant.
- Matriz completa de campos editáveis por origem.
- Reconciliação inicial sem apagar nem sobrescrever dados existentes.

### Etapa 3 — Drive → FullTime
- Processador de fila com lock, idempotência e retry.
- Validação de CPF/placas/documentos e referências.
- Prévia/revisão para conflitos e campos críticos.
- Testes com dados fictícios e eventos repetidos/fora de ordem.

### Etapa 4 — FullTime → Drive
- Escrita de IDs, status, erros, timestamps e resultados.
- Proteção contra loops de gatilho.
- Controle de concorrência e versionamento.
- Testes de edição simultânea nos dois lados.

### Etapa 5 — Multiempresa
- Registro de integração por tenant.
- Isolamento de arquivos, filas, auditoria e permissões.
- OAuth/consentimento e revogação por empresa.
- Monitoramento de quota, gatilhos e falhas por tenant.

## 8. Limites da implementação inicial

O arquivo IntegracaoDriveCliente.gs não deve ser considerado sincronização bidirecional concluída. Ele estabelece o vínculo e captura eventos de edição com segurança básica. Ainda não aplica alterações de negócio nem escreve os resultados de volta às guias do cliente. Essa separação é intencional: evita que uma integração recém-conectada sobrescreva cadastros reais antes da homologação das regras de conflito e propriedade dos campos.
