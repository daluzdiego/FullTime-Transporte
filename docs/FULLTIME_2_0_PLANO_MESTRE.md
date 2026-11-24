# FullTime 2.0 — Plano Mestre de Engenharia

**Status:** estruturação iniciada  
**Branch de trabalho:** `fulltime-2.0`  
**Base inicial:** `main`  
**Regra:** nenhuma alteração destrutiva na base operacional durante a fase de auditoria.

## 1. Objetivo

Evoluir o FullTime de um sistema administrativo/operacional assistido para uma plataforma de gestão de transporte com automação ponta a ponta. O WhatsApp será integrado somente depois que os fluxos internos estiverem implementados e testados.

Os dois canais futuros de entrada serão:
- **Cliente:** solicita transporte; o agente coleta, interpreta, valida e registra uma operação.
- **Motorista:** recebe instruções e envia comprovantes de carregamento/descarga; o agente interpreta os documentos e atualiza a viagem.

## 2. Princípios de engenharia

1. **Fonte de verdade definida:** cada entidade terá um sistema/guia responsável; espelhos não podem disputar autoridade.
2. **IA não grava diretamente:** IA extrai e propõe dados; validações determinísticas autorizam a gravação.
3. **Idempotência:** reprocessar uma mensagem, documento ou sincronização não pode duplicar operação, carga, viagem ou comprovante.
4. **Rastreabilidade:** toda mudança relevante registra origem, autor, data, identificador externo e valores anteriores/novos quando aplicável.
5. **Exceções explícitas:** dado ilegível, conflitante ou ambíguo gera pendência; nunca completar por suposição.
6. **Compatibilidade gradual:** preservar funcionalidades e IDs existentes; migrações devem ser aditivas e verificáveis.
7. **Testes fictícios isolados:** registros de teste são identificáveis e não podem ser tratados como disponibilidade ou capacidade real.
8. **Segurança:** permissões mínimas, segredos fora do código, documentos privados e dados pessoais protegidos.

## 3. Restrições conhecidas

- Planilha principal FullTime: `11f2Z2ojMpGI4BSMtRA3CtvwFqy0dnVtA3-CArYr2HdE`.
- Planilha de origem do Bruno: `1cpTzFLfoorlFGj3rW1yCCbm4pQDumBqFKP0UWinijQI`.
- A guia `CAVALOS-BRUNO` da planilha do Bruno é **protegida e intocável**: não ler, abrir, editar, formatar, validar, copiar ou sincronizar.
- Não duplicar guias que já existam.
- Não renomear `CONJUNTOS` nem alterar contratos de cabeçalhos sem migração compatível.
- A integração de cadastro Bruno → FullTime deve manter sua direção e escopo atuais até auditoria e aprovação.
- Não conectar WhatsApp nem contratar provedor nesta fase.

## 4. Situação inicial observada no GitHub

Na auditoria inicial:
- `main` e `feat/agente-ia-entrada-operacoes` estão divergentes.
- A comparação retornou 70 commits à frente na branch de agente e 10 commits à frente em `main`; portanto, não fazer merge integral nem substituir arquivos sem análise por função.
- A branch de agente contém funções de entrada assistida de operações por texto, sincronização e materialização idempotente em `CARGAS`, além de ferramentas de teste e auditoria.
- `main` contém funções de controle de status que não aparecem na branch de agente.
- A documentação existente ainda descreve partes do MVP antigo e precisa ser atualizada após a auditoria.
- Esta branch `fulltime-2.0` foi criada a partir de `main` como área segura de estruturação. Nenhum arquivo operacional foi alterado neste primeiro passo.

## 5. Domínios funcionais alvo

### 5.1 Cadastros e frota
Motoristas, cavalos, carretas, conjuntos, capacidade útil, documentação, contatos e disponibilidade. O conjunto é a unidade operacional que relaciona motorista + cavalo + carreta(s) + capacidade.

### 5.2 Clientes e solicitações
Cadastro de clientes, contatos autorizados, solicitações recebidas, conversas, anexos, campos extraídos, pendências, confirmação e conversão em operação.

### 5.3 Operações
Cliente, referência, origem, destino, produto/tipo, volume contratado, janela de execução, regras, prioridade, status, observações e histórico.

### 5.4 Alocação e escala
Distribuição do volume entre conjuntos. A quantidade prevista de viagens deve ser calculada por conjunto com base no volume alocado e capacidade operacional válida. Não inferir divisão entre conjuntos sem regra explícita.

### 5.5 Viagens / movimentos
Uma viagem é o ciclo operacional do conjunto dentro da operação. Terá sequência própria (ex.: `CARGA 6/10`) e estados como aguardando carregamento, carregada, em trânsito, aguardando descarga, concluída, divergente ou cancelada.

O comprovante de carregamento e o comprovante de descarga são eventos/documentos diferentes associados à mesma viagem. Não contam como duas viagens. A regra de contabilização do volume será única e explícita para impedir dupla contagem.

### 5.6 Documentos e comprovantes
Armazenar o arquivo original, metadados, tipo, emissor, número do ticket, data/hora, peso bruto/tara/líquido quando presentes, confiança por campo, estado de leitura, validação, duplicidade e vínculo com a viagem.

### 5.7 Agentes e canais
Agente de cliente e agente de motorista compartilharão contexto operacional controlado, mas terão permissões e intenções diferentes. WhatsApp será um adaptador de canal, não o núcleo do negócio.

### 5.8 Painel, auditoria e exceções
Visão operacional em tempo real, fila de pendências, alertas, indicadores, trilha de auditoria e relatórios.

## 6. Modelo lógico alvo (a validar contra as guias existentes)

Entidades conceituais:
- Cliente
- ContatoCliente
- Solicitacao
- Operacao
- AlocacaoConjuntoOperacao
- Viagem
- EventoViagem
- Comprovante
- Mensagem
- Anexo
- Motorista
- Veiculo
- Conjunto
- Disponibilidade
- Auditoria
- PendenciaExcecao

IDs internos estáveis devem ligar as entidades. Placas, telefones, nomes e números de ticket são atributos de busca, não chaves primárias.

## 7. Fluxo de comprovantes

1. Receber foto/arquivo e preservar o original.
2. Identificar remetente e localizar motorista autorizado.
3. Encontrar a viagem ativa sem ambiguidade.
4. Extrair campos com IA/OCR para estrutura tipada.
5. Validar campos, sequência, datas, emissor, peso e limites plausíveis.
6. Verificar duplicidade por ID do canal e por atributos do documento.
7. Se confiável, registrar o evento; se não, abrir pendência e solicitar somente os dados faltantes.
8. Manter o comprovante obrigatório mesmo quando houver preenchimento manual.
9. Atualizar a viagem e os indicadores somente após cumprir a regra de confirmação.

## 8. Arquitetura de implantação por fases

**Fase A — Auditoria e baseline:** inventariar arquivos, funções, guias, cabeçalhos, IDs, permissões, deploy e testes reais. Nenhuma escrita em planilhas nesta fase.

**Fase B — Núcleo operacional:** fechar contratos de dados e estados; corrigir operações, alocações, viagens, capacidade, sequência e saldo.

**Fase C — Documentos:** ingestão interna de arquivos fictícios, OCR/IA, validação, armazenamento e exceções sem WhatsApp.

**Fase D — Agente de clientes:** simular conversas, extrair solicitações, investigar lacunas, manter contexto e preparar/confirmar operações conforme política.

**Fase E — Agente de motoristas:** simular instruções, comprovantes, correções e conclusão de viagem.

**Fase F — Painel e robustez:** UX, permissões, concorrência, auditoria, observabilidade, recuperação e testes ponta a ponta.

**Fase G — WhatsApp:** conectar API oficial e webhooks somente após aprovação dos testes internos e disponibilidade do número.

## 9. Critérios mínimos de aceite antes do WhatsApp

- Criar e alterar operações sem duplicidade.
- Distribuir volume entre um ou vários conjuntos com capacidade válida.
- Calcular viagens previstas por conjunto e sequência sem reiniciar indevidamente.
- Associar carregamento e descarga ao mesmo ciclo de viagem.
- Não somar duas vezes o peso.
- Receber comprovante ilegível e solicitar correção mantendo o original.
- Detectar documento e mensagem duplicados.
- Tratar motorista sem operação ativa ou com múltiplas operações.
- Preservar histórico e permitir rastrear cada gravação até sua origem.
- Executar testes com múltiplas operações e conjuntos simultâneos.
- Não acessar a guia protegida `CAVALOS-BRUNO`.

## 10. Próximas atividades

1. Inventariar as guias e cabeçalhos da planilha principal sem modificar dados.
2. Inventariar somente as guias autorizadas da planilha Bruno, excluindo integralmente `CAVALOS-BRUNO`.
3. Comparar contratos de dados e funções entre `main` e `feat/agente-ia-entrada-operacoes`.
4. Identificar quais mudanças da branch de agente são aproveitáveis e quais mudanças de `main` precisam ser preservadas.
5. Gerar relatório de riscos e plano de integração seletiva.
6. Só então propor alterações de código e migrações aditivas.
