# FullTime-Transporte — Arquitetura consolidada (proposta de homologação)

**Revisão inicial:** 05/11/2026  
**Branch de trabalho:** `planejamento/controle-18-11-2026`  
**Base analisada:** `main`, PR #1 (`feat/agente-ia-entrada-operacoes`) e PR #4 (`fix/escala-automatica-motorista-centric`).

## 1. Objetivo arquitetural

Entregar até 18/11/2026 um fluxo homologado em que a planilha do Bruno seja a origem dos cadastros e da entrada assistida de operações, a planilha principal Full Time seja a base operacional do sistema, e o próprio sistema faça a distribuição de operações conforme as regras de escala confirmadas.

A unidade de distribuição é a **OPERAÇÃO**. Uma operação pode conter várias cargas/voltas. Atribuir uma operação a um motorista significa que as cargas/voltas filhas herdam o mesmo motorista e conjunto, salvo substituição autorizada e auditada.

## 2. Arquitetura lógica

```text
USUÁRIO ADMINISTRADOR
        |
        v
Index.html (interface web)
        |
        v
Google Apps Script — backend
  |          |            |
  |          |            +--> WhatsApp Cloud API (tickets/imagens, fluxo separado)
  |          |
  |          +--> Parser de entrada (regras locais + Gemini opcional)
  |
  +--> Autenticação / autorização / auditoria
        |
        v
PLANILHA PRINCIPAL FULL TIME
  - cadastros espelhados do Bruno
  - operações e cargas/voltas
  - disponibilidade e fila
  - ofertas e escalas
  - histórico e eventos

PLANILHA DO BRUNO (ORIGEM)
  - MOTORISTAS
  - CAVALOS
  - CARRETAS
  - CONJUNTOS
  - CONTROLE_DOCUMENTAL
  - ENTRADA_OPERACOES_IA
        |
        | sincronização unidirecional, por ID, idempotente
        v
PLANILHA PRINCIPAL FULL TIME
```

## 3. Responsabilidade de cada componente

| Componente | Responsabilidade | Fonte/observação |
|---|---|---|
| `Index.html` | Interface administrativa, entrada assistida e acompanhamento | Não deve conter regras críticas como única validação |
| `Code.gs` | Backend, autenticação, autorização, validação, operações, integração e escala | Deve ser a camada de serviço; evitar cópias globais de funções |
| `CadastroMotoristasFullTime.gs` | Formulário/fluxo de cadastro legado | Revisar sobreposição com cadastro oficial do Bruno |
| `IntegracaoCadastroBruno.gs` | Sincronização dos cadastros e espelhos `FT_CADASTRO_BRUNO_*` | Caminho de sincronização a consolidar |
| `WhatsAppTickets.gs` | Webhook Meta para recebimento de tickets/imagens | Não é, por si só, o canal de entrada de operações |
| `ENTRADA_OPERACOES_IA` | Registro original, interpretação, revisão e confirmação da solicitação | Deve existir nas duas planilhas, com o mesmo ID da solicitação |
| `OPERACOES` | Entidade-pai que representa o trabalho contratado/atendimento | Unidade de distribuição da escala |
| `CARGAS` | Cargas/voltas individuais pertencentes a uma operação | Deve referenciar a operação-pai |
| `DISPONIBILIDADE_DIARIA` | Confirmação de disponibilidade por motorista/data | Lembretes não equivalem a confirmação |
| `FILA_MOTORISTAS` | Posição/tempo de fila e estado de participação | Contagem deve ser por operação distinta |
| `OFERTAS_CARGAS` | Persistência do ciclo de oferta e resposta | Necessita vínculo inequívoco com a operação |
| `ESCALAS` | Atribuição confirmada | Deve permitir rastrear a operação e suas cargas/voltas |
| `EVENTOS_ESCALA` | Trilha auditável de decisões e alterações | Registrar ordem anterior/nova, motivo e autor |

## 4. Fontes de verdade e sincronização

### Cadastros
- A planilha do Bruno é a origem oficial de motoristas, cavalos, carretas, conjuntos e documentação.
- A planilha principal Full Time recebe espelhos sincronizados e os utiliza para o funcionamento do painel.
- A sincronização é unidirecional: **Bruno → Full Time**.
- Cada registro deve ser identificado por ID externo estável; placa, CPF ou nome servem para validação/consulta, não para substituir a chave primária.
- Sincronizações repetidas devem atualizar o registro de mesmo ID, sem duplicar.
- Decisões locais do sistema (por exemplo, bloqueio administrativo) precisam ficar em camada de override/auditoria, sem serem apagadas pela sincronização seguinte.
- A mesma entidade não pode ter duas rotinas concorrentes de sincronização com regras diferentes.

### Entrada de operações
- A mensagem original colada pelo Bruno é preservada.
- O parser produz um rascunho; dados inferidos ou incertos devem ser identificados e revisados.
- A confirmação gera um ID único de solicitação na planilha do Bruno.
- A replicação para a planilha principal usa esse mesmo ID.
- O sistema deve verificar esse ID antes de criar operação/carga. Reenvio, repetição ou nova sincronização não pode duplicar.
- Na primeira liberação, a entrada será assistida por copiar/colar. Integração automática com a conta pessoal do WhatsApp não está assumida.

## 5. Modelo operacional: operação-pai e cargas/voltas-filhas

### Regra confirmada
A escala é distribuída por operação distinta. Uma operação pode conter de 1 a 30 voltas. As voltas não são oportunidades independentes e não podem alterar a posição global do motorista na fila.

### Ajuste necessário no modelo atual
O esquema de `OPERACOES` já representa o volume/saldo da operação, enquanto `CARGAS` e `ESCALAS` usam identificadores de carga. O esquema atual de `CARGAS` não apresenta um campo explícito `OPERACAO_ID`, e `ESCALAS`/`OFERTAS_CARGAS` estão centradas em `CARGA_ID`. Isso cria risco de distribuir cada volta como se fosse uma operação diferente.

### Modelo proposto
- `OPERACOES.ID` é a chave da unidade de escala.
- Adicionar/revisar `CARGAS.OPERACAO_ID` como chave estrangeira para a operação-pai.
- `OFERTAS_CARGAS` deve referenciar `OPERACAO_ID`; pode manter `CARGA_ID` quando houver necessidade de rastrear uma carga específica, mas não usar a volta como unidade de prioridade.
- `ESCALAS` deve registrar `OPERACAO_ID` como chave da atribuição. Pode manter referência às cargas filhas para rastreabilidade, sem gerar uma nova decisão de escala por volta.
- Uma única atribuição confirmada associa motorista e conjunto fixo à operação. As cargas filhas herdam essa associação.
- Migração de cabeçalhos/colunas deve ser aditiva e validada em cópia de teste. Não renomear nem apagar colunas existentes durante a homologação.

## 6. Regras de escala a implementar

1. Filtrar motorista ativo/aprovado, habilitação válida e compatível, disponibilidade confirmada, sem bloqueio e sem conflito.
2. Usar o conjunto fixo vinculado ao motorista. Substituição exige autorização explícita do gestor e auditoria.
3. Priorizar motoristas com zero operações atribuídas no dia.
4. Dentro do grupo, considerar assiduidade em componentes identificáveis, menor número de operações distintas nos últimos 30 dias e maior tempo de fila.
5. Não usar valor do frete como critério.
6. Recusa/indisponibilidade retira o motorista apenas da operação atual; não altera permanentemente sua posição.
7. Oferta, aceite, recusa e expiração são estados distintos. Oferta não equivale a atribuição confirmada.
8. O gestor pode alterar a ordem com justificativa obrigatória e trilha de auditoria.
9. Usar lock/idempotência para impedir duas atribuições simultâneas ou duplicadas.
10. Pesos de assiduidade, prazo de aceite e fuso horário/gatilhos precisam ser confirmados/configurados antes da ativação real.

## 7. Achados e decisões de consolidação

| Achado | Evidência no código/repositório | Tratamento proposto |
|---|---|---|
| Função global duplicada | `salvarConjuntoVeicularFullTime` está em `Code.gs` e `CadastroMotoristasFullTime.gs` na `main` | Manter uma única implementação oficial em `Code.gs`; PR #1 já remove a cópia em Cadastro |
| Status/listas/contadores podem divergir | `listarRegistros_` aplica combinações e overrides; `contarAtivos_`/`contarStatus_` consultam diretamente espelhos | Criar uma única camada de leitura normalizada e derivar os contadores dela |
| Fontes de cadastros com caminhos sobrepostos | Adaptador `FT_BRUNO_CADASTROS` lê `FT_CADASTRO_BRUNO_*`; há scripts separados de sincronização/diagnóstico | Escolher uma rotina canônica de sincronização; manter scripts de diagnóstico como ferramentas read-only |
| PR #1 não está pronto para merge | GitHub reportou `mergeable=false` na consulta de 05/11 | Resolver conflitos sobre a versão-base consolidada; não fazer merge às cegas |
| PR #4 é preparatório | GitHub reportou `mergeable=true`; descrição reconhece que o motor completo ainda falta | Reaproveitar correções de vínculos/UI, mas completar o motor antes de desabilitar qualquer fluxo |
| WhatsApp de tickets é distinto | `doPost` em `WhatsAppTickets.gs` processa mensagens/imagens de tickets e guia `TICKETS` | Não reutilizar esse endpoint como se fosse o parser de operações sem contrato e testes próprios |
| Unidade de escala não está refletida uniformemente no schema | `OPERACOES` representa operação; `CARGAS`, `ESCALAS` e `OFERTAS_CARGAS` usam `CARGA_ID` | Corrigir relacionamento operação-pai/cargas-filhas antes do motor de escala |

## 8. Estratégia de integração de código

1. Manter `main` intacta enquanto a consolidação ocorre.
2. Usar a branch `planejamento/controle-18-11-2026` como área de documentação e integração planejada.
3. Comparar PR #4 com a base e reaproveitar apenas alterações verificadas.
4. Resolver o conflito do PR #1 sobre a mesma base, preservando a remoção da função duplicada e o fluxo de entrada IA.
5. Integrar em commits pequenos por módulo; após cada integração, validar sintaxe, funções globais, contratos de cabeçalhos e testes determinísticos.
6. Não publicar Apps Script automaticamente após commit; a implantação é etapa separada e exige versão identificada.

## 9. Fora do escopo da primeira liberação

- Leitura automática de mensagens do WhatsApp pessoal do Bruno.
- Portal completo do motorista, salvo se for indispensável e seguro para a homologação.
- Otimizações avançadas de rota, geolocalização contínua e integrações externas não confirmadas.
- Substituição de Google Sheets por outro banco durante esta janela.
- Qualquer limpeza/apagamento de dados reais antes de backup, ambiente de teste e autorização operacional.

## 10. Próximas verificações da etapa 1

- [ ] Comparar os patches completos dos PRs #1 e #4 e registrar os trechos conflitantes.
- [ ] Inventariar todos os cabeçalhos reais/esperados e IDs de origem/destino sem expor dados pessoais.
- [ ] Definir contrato definitivo de `OPERACOES` → `CARGAS` → `OFERTAS` → `ESCALAS`.
- [ ] Unificar leitura, status e contadores de cadastros.
- [ ] Produzir a versão-base consolidada e a sequência de commits.
- [ ] Atualizar README, arquitetura e testes para refletir o que está efetivamente implementado.

**Limite desta revisão:** documento baseado em leitura estática do GitHub. Não foram executados Apps Script, chamadas Gemini, webhooks, gatilhos ou operações nas planilhas reais. Nenhum dado real foi alterado.


## 11. Implementações incorporadas na branch de trabalho

Em 05/11/2026 foram incorporadas, na branch `planejamento/controle-18-11-2026`, partes verificadas dos PRs #1 e #4 e correções adicionais:

- Tela de entrada assistida por IA incorporada ao painel de operações.
- A confirmação da entrada gera um registro-pai em `OPERACOES` e de 1 a 30 registros-filhos em `CARGAS`, todos com o mesmo `OPERACAO_ID`.
- A quantidade de viagens e o volume total são campos distintos. Peso por viagem só é preenchido quando informado explicitamente; não dividir o total por suposição.
- A guia de entrada mantém IDs estáveis da operação e de todas as cargas geradas, permitindo sincronização repetida sem duplicação.
- Cabeçalhos novos são acrescentados de forma aditiva, preservando as colunas e os dados anteriores.
- A escala cria uma oferta pendente por operação, com expiração em 120 minutos. A recusa/indisponibilidade/expiração exclui o motorista apenas daquela operação; não altera sua fila global.
- O aceite registrado confirma a participação, cria o snapshot em `ESCALAS` e vincula as cargas-filhas ao mesmo motorista e conjunto.
- Existe processador de expiração e função para instalar gatilho a cada 5 minutos. **O gatilho ainda não foi instalado.**
- Nesta fase, o administrador registra no painel a resposta recebida do motorista. Envio/retorno automático por WhatsApp ainda não está ativo.
- Listas e contadores usam a mesma camada normalizada; registros legados locais não sobrescrevem registros originados na planilha do Bruno.
- Condição, restrições e capacidade operacional do conjunto podem ser mantidas em `CONJUNTO_OVERRIDES`, sem sobrescrever o cadastro de origem.

## 12. Critério de distribuição implementado

A ordenação atual:
1. Exige disponibilidade confirmada para a data da operação.
2. Exige motorista e conjunto ativos, conjunto `APTO`, capacidade útil positiva e CNH válida para a data.
3. Exclui conjunto/motorista já alocado em outra operação ativa.
4. Prioriza quem ainda não recebeu operação na data de destino.
5. Compara dias disponíveis e proporção de dias trabalhados na janela de 30 dias.
6. Compara quantidade de operações distintas nos últimos 30 dias.
7. Usa tempo de entrada na fila e última operação como desempate.
8. Exclui recusas, indisponibilidades e ofertas expiradas somente para a operação atual.

O valor do frete não participa da ordenação. A implementação deve ser validada com dados fictícios e com a gestão antes de uso real.

## 13. Limitações que ainda impedem declarar o sistema pronto

- O canal de resposta do motorista ainda é manual pelo administrador; integração automática com WhatsApp/portal não está homologada.
- A rotina de expiração existe, mas o gatilho não foi instalado.
- Lembretes diários de disponibilidade às 06h, 12h e 18h ainda precisam ser implementados/configurados.
- Não foram executadas funções Apps Script contra planilhas reais nem testes transacionais no runtime Google.
- O sincronizador de cadastros e o fluxo de entrada ainda precisam ser executados com massa fictícia em cópias/ambiente autorizado.
- A implantação Web App e as permissões do projeto Apps Script ainda precisam ser verificadas.

**Estado atual:** código consolidado na branch de trabalho e aprovado em verificação estática de sintaxe/nomes globais; ainda não homologado no runtime Google.
