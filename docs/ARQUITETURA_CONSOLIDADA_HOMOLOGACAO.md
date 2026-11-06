# FullTime-Transporte — Arquitetura consolidada (proposta de homologação)

**Revisão inicial:** 05/11/2026  
**Branch de trabalho:** `planejamento/controle-18-11-2026`  
**Base analisada:** `main`, PR #1 (`feat/agente-ia-entrada-operacoes`) e PR #4 (`fix/escala-automatica-motorista-centric`).

## 1. Objetivo arquitetural

Entregar até 18/11/2026 um fluxo homologado em que a planilha do Bruno seja a origem dos cadastros e da entrada assistida de operações, a planilha principal Full Time seja a base operacional do sistema, e o próprio sistema faça a distribuição de operações conforme as regras de escala confirmadas.

A unidade de distribuição é a **OPERAÇÃO**. Uma operação pode conter de 1 a 30 viagens/cargas-filhas. Atribuir uma operação a um motorista significa que todas as viagens-filhas herdam o mesmo motorista e conjunto, salvo substituição autorizada e auditada. O peso total da operação e o peso previsto/real de cada viagem são informações distintas.

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
| `CARGAS` | Viagens individuais pertencentes a uma operação | Deve referenciar a operação-pai por `OPERACAO_ID`; `PESO_TONELADAS` é previsto e `PESO_REAL_TONELADAS` é apurado nas movimentações |
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
- A confirmação gera um ID único de solicitação, um ID de operação e IDs estáveis para cada uma das 1–30 viagens na planilha do Bruno.
- A replicação para a planilha principal usa esse mesmo ID.
- O sistema deve verificar esse ID antes de criar operação/carga. Reenvio, repetição ou nova sincronização não pode duplicar.
- Na primeira liberação, a entrada será assistida por copiar/colar. Integração automática com a conta pessoal do WhatsApp não está assumida.

## 5. Modelo operacional: operação-pai e cargas/voltas-filhas

### Regra confirmada
A escala é distribuída por operação distinta. Uma operação pode conter de 1 a 30 voltas. As voltas não são oportunidades independentes e não podem alterar a posição global do motorista na fila.

### Modelo de operação-pai e viagens-filhas implementado na branch de trabalho
O esquema de `OPERACOES` já representa o volume/saldo da operação, enquanto `CARGAS` e `ESCALAS` usam identificadores de carga. O esquema original de `CARGAS`, `ESCALAS`, `OFERTAS_CARGAS` e `EVENTOS_ESCALA` não identificava uniformemente a operação-pai. A branch de trabalho acrescenta `OPERACAO_ID` a essas guias e `CARGA_ID` a `MOVIMENTACOES_OPERACAO`, com migração aditiva.

### Modelo proposto
- `OPERACOES.ID` é a chave da unidade de escala.
- `CARGAS.OPERACAO_ID` é a chave estrangeira para a operação-pai; `CARGAS.PESO_REAL_TONELADAS` guarda o peso somado nas movimentações.
- `OFERTAS_CARGAS` deve referenciar `OPERACAO_ID`; pode manter `CARGA_ID` quando houver necessidade de rastrear uma carga específica, mas não usar a volta como unidade de prioridade.
- `ESCALAS` deve registrar `OPERACAO_ID` como chave da atribuição. Pode manter referência à primeira carga para rastreabilidade, sem gerar uma nova decisão de escala por volta.
- `MOVIMENTACOES_OPERACAO.CARGA_ID` aponta para a viagem em execução; o peso real é somado por viagem.
- Uma única atribuição confirmada associa motorista e conjunto fixo à operação. Todas as cargas-filhas herdam essa associação.
- A confirmação da entrada IA gera 1–30 registros em `CARGAS`. Se o peso por viagem não estiver explícito, ele permanece vazio; o sistema nunca divide o volume total por suposição.
- Cada movimentação aponta para a próxima viagem pendente por `CARGA_ID`, soma `PESO_REAL_TONELADAS` e marca a viagem como concluída quando confirmado pelo responsável.
- Migração de cabeçalhos/colunas deve ser aditiva e validada em cópia de teste. Não renomear nem apagar colunas existentes durante a homologação.

## 6. Regras de escala a implementar

1. Filtrar motorista ativo/aprovado, habilitação válida e compatível, cavalo e todas as carretas ativos, vínculo fixo confirmado, condição APTO explícita, disponibilidade confirmada, sem bloqueio e sem conflito.
2. Usar o conjunto fixo vinculado ao motorista. A escala automática exige condição `APTO` explicitamente registrada; conjunto `APTO_COM_RESTRICAO` só pode ser atribuído por decisão administrativa justificada. Substituição exige autorização explícita do gestor e auditoria.
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

## ## 11. Implementações incorporadas à branch de consolidação em 06/11

- Painel de escalas: registro diário de disponibilidade por motorista ativo, com motivo obrigatório para indisponibilidade.
- Backend: gravação idempotente por motorista/data, atualizando o registro do dia em vez de criar uma segunda linha; duplicidades preexistentes são reportadas e não sobrescritas.
- Entrada IA: parser de rota ficou mais conservador; não interpreta "300 toneladas para 5 viagens" como origem/destino.
- Cargas: formulário de nova viagem agora exige a operação-pai; cada viagem recebe seu próprio peso previsto.
- Cargas: tela permite corrigir o peso previsto de cada viagem ainda não atribuída.
- Motor de ofertas: não cria oferta se não houver viagens, se a quantidade cadastrada divergir, se faltar peso previsto ou se a soma dos pesos das viagens divergir do volume da operação em mais de 0,05 t.
- Aceite: repete as validações de quantidade e peso antes de gravar a atribuição.
- Monitor de expiração: criada a função `instalarMonitoramentoOfertasEscalaFullTime()`, que instala um gatilho a cada 5 minutos após execução manual única no editor do Apps Script. O gatilho ainda não foi instalado.
- Suíte read-only: ampliada para verificar endpoints de disponibilidade, peso por viagem, monitor de expiração e regressão de rota.

**Validação executada fora do Apps Script:** sintaxe V8 dos quatro arquivos `.gs`, da suíte read-only e do script da interface aprovada; chamadas de backend identificadas na interface sem endpoints ausentes; 14/14 testes de extração e 4/4 testes de pesos aprovados. Essas verificações não substituem o runtime do Apps Script nem a leitura/escrita real das duas planilhas.

**Estado da integração:** as alterações estão na branch `planejamento/controle-18-11-2026`. A `main` não foi alterada, não houve merge e nenhum dado real foi modificado. A branch ainda precisa passar pela execução da suíte read-only e pelos testes ponta a ponta em cópias/ambiente de homologação.

10. Próximas verificações da etapa 1

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
5. Calcula assiduidade provisória como dias trabalhados ÷ dias disponíveis na janela de 30 dias (limitada a 100%); em empate, compara dias disponíveis e dias trabalhados.
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


## 14. Acompanhamento das viagens

- Cada operação confirmada pela IA possui de 1 a 30 linhas-filhas em `CARGAS`.
- `PESO_TONELADAS` registra peso previsto por viagem quando conhecido; pode ficar vazio se a mensagem só informar o total da operação.
- `PESO_REAL_TONELADAS` é a soma das movimentações vinculadas à viagem.
- `MOVIMENTACOES_OPERACAO.CARGA_ID` vincula cada registro à viagem em execução.
- Uma viagem é marcada `CONCLUIDA` somente quando o responsável confirma a conclusão. Movimentações parciais ficam `EM_ANDAMENTO`.
- O saldo da operação diminui pelas toneladas efetivamente movimentadas; o sistema impede que o conjunto exceda a capacidade útil numa mesma viagem.
- Se o saldo total for zerado, as viagens ainda não utilizadas são canceladas com observação de encerramento.

**Teste de simulação realizado fora do runtime Google:** uma operação fictícia com cinco viagens de 20 t criou uma operação-pai e cinco cargas-filhas; a segunda execução criou zero registros adicionais. Isso valida a lógica idempotente em simulação, mas não substitui o teste no Apps Script/Sheets.

**Regra de assiduidade provisória:** a ordenação usa a proporção de dias trabalhados sobre dias com disponibilidade confirmada nos últimos 30 dias. Esta fórmula foi escolhida para a primeira homologação, está coberta por teste determinístico e deve ser confirmada pela gestão antes da liberação real (bloqueio B03).

## 15. Capacidade do conjunto

- A capacidade útil do cavalo vem de `CAPACIDADE_UTIL_TONELADAS` no cadastro do Bruno, com fallback para `CAMINHOES.CAPACIDADE_TONELADAS` quando a placa corresponder.
- A capacidade de cada carreta vem de `CAPACIDADE_CARGA_TONELADAS`.
- Se não existir override administrativo, a capacidade do conjunto é derivada pela soma da capacidade útil do cavalo e das carretas vinculadas, seguindo a regra já usada no cadastro de conjuntos.
- A derivação só ocorre quando o cavalo e todas as carretas selecionadas possuem capacidade válida. Se faltar capacidade de qualquer componente, o conjunto permanece sem capacidade e não é elegível para escala.
- Um valor em `CONJUNTO_OVERRIDES` prevalece sobre a derivação, inclusive zero (zero mantém o conjunto sem capacidade elegível).
- A capacidade do conjunto é comparada com o peso previsto por viagem, quando conhecido, e com o peso real acumulado de cada viagem durante as movimentações.

**Inspeção obrigatória:** conjunto sem estado de conservação explicitamente registrado não participa da escala automática, mesmo que motorista, cavalo e carretas estejam ativos. Isso evita tratar ausência de inspeção como aprovação implícita.

- Estado `APTO` exige campo de restrições vazio. Se houver qualquer restrição, o estado correto é `APTO_COM_RESTRICAO`; esse estado fica fora da distribuição automática e exige decisão administrativa justificada.

## 16. Vínculo fixo do conjunto

- A escala automática exige `VINCULO_FIXO = SIM` no conjunto, além de motorista, cavalo e carretas ativos.
- O conjunto deve apontar para o motorista e os equipamentos que realmente operam juntos; não basta que os IDs existam.
- O sistema não troca motorista ou equipamento automaticamente.
- Conjunto sem vínculo fixo confirmado fica inelegível. Exceção administrativa continua exigindo justificativa e registro.
- O campo `VINCULO_FIXO` foi acrescentado ao schema operacional por migração aditiva e também é lido do cadastro do Bruno.

- O motor verifica o status ativo do cavalo e de cada carreta vinculada; não basta que o conjunto e o motorista estejam ativos.
