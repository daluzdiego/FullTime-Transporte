# FullTime — Especificação operacional de viagens e pesagens

Data de consolidação: 19/11/2026  
Origem das regras: respostas do responsável da FullTime e dois comprovantes de pesagem enviados nesta conversa.  
Ambiente de implementação: branch de trabalho derivada de `homologacao/instalacao-segura-20261118`.

## Regras confirmadas pelo cliente

### Frota
- 40 cavalos mecânicos e 40 carretas no cenário atual.
- Configuração utilizada: cavalo + uma carreta.
- Um cavalo pode trocar de carreta.
- Motorista normalmente possui conjunto fixo, mas pode trocar.
- Tara do cavalo/conjunto não é fixa para fins de viagem: deve ser medida na pesagem real.
- Trocas de composição devem preservar histórico e vigência do vínculo.
- Podem existir restrições por tipo de operação.

### Capacidade
- Cliente considera PBT do conjunto e deseja controlar capacidade legal e operacional.
- Existem diferenças entre conjuntos aparentemente iguais.
- O sistema deve alertar excesso, exigir justificativa registrada e decisão administrativa.
- O sistema não deve interpretar uma autorização interna como certificação de legalidade.
- Não calcular capacidade legal por simples subtração de tara. Os limites precisam ser cadastrados/validados para cada conjunto.

### Pesagem
- Duas etapas obrigatórias: carregamento/origem e descarga/destino.
- Cada etapa deve registrar tara e bruto reais; líquido = bruto - tara.
- Comparação de divergência: peso líquido do carregamento versus peso líquido da descarga.
- Tolerância informada: 10%.
- Divergência acima de 10% gera alerta e exige justificativa/decisão administrativa.
- Mesmo dentro da tolerância, a aprovação administrativa de Bruno continua obrigatória.
- Não concluir viagem sem os dois comprovantes e a conferência.
- Arquivo original deve ser preservado; correção gera novo registro e mantém histórico.
- Bruno é o aprovador dos tickets e divergências.

### Operações e viagens
- Operações são controladas principalmente por toneladas.
- Quantidade estimada de viagens deve ser calculada a partir do volume e da capacidade operacional dos conjuntos selecionados.
- Vários conjuntos podem trabalhar na mesma operação.
- Um motorista pode fazer várias viagens na mesma operação, inclusive muitas viagens sucessivas.
- Carga parcial pode ocorrer no final da operação.
- Operações podem ser pausadas, retomadas e ter volume alterado; alteração exige registro de Bruno.
- Encerramento depende de autorização administrativa, não apenas de saldo zero.
- Saldo de toneladas não transportadas deve permanecer visível.

### Escala
- Distribuir volume proporcionalmente entre caminhões/conjuntos, considerando capacidade e disponibilidade.
- O sistema escolhe prioridade quando há mais de uma operação elegível para o motorista.
- A decisão deve considerar janelas, prazos, deslocamento, disponibilidade, conjunto e volume restante.
- Aceite de convocação não reserva automaticamente o conjunto; o sistema ainda deve impedir conflito físico de motorista/cavalo/carreta na mesma janela.
- Recusa de motorista só permite nova convocação após aprovação de Bruno.

### Financeiro
- O FullTime precisa permitir registrar valores de frete, viagens, diárias e pagamentos.
- A regra de remuneração é definida pelo Bruno, não pela Feeds Solutions.
- Não presumir ou impor a rotina financeira atual do cliente.

## Estrutura técnica de pesagem adicionada nesta branch

Foi criado o módulo `apps-script/PesagemViagensFullTime.gs` com:
- Guia aditiva `PESAGENS_VIAGEM`.
- Registro por viagem e etapa (`CARREGAMENTO` ou `DESCARGA`).
- Campos separados para tara, bruto e líquido em kg.
- Comparação dos pesos líquidos e cálculo percentual.
- Tolerância configurada em 10%.
- Aprovação administrativa obrigatória.
- Exigência de ticket original armazenado na guia `TICKETS`.
- Vínculo do ticket à viagem em `TICKETS.VIAGEM_ID`.
- Histórico de correção por substituição lógica, sem apagar o registro anterior.
- Campos aditivos de capacidade legal/operacional em `CONJUNTOS`; devem ser preenchidos e validados antes de aprovar pesagens com controle de capacidade.
- Teste puro de cálculo, sem acesso a planilhas.

A allowlist de backup da homologação foi ampliada para incluir `PESAGENS_VIAGEM` e os novos campos de capacidade.

## Resultado de referência dos comprovantes recebidos

| Campo | Ticket de origem | Recebimento no destino |
|---|---:|---:|
| Tara | 17.600 kg | 17.580 kg |
| Bruto | 48.720 kg | 48.810 kg |
| Líquido | 31.120 kg | 31.230 kg |

Diferença líquida: 110 kg, aproximadamente 0,3535% do peso líquido de origem. O exemplo fica dentro da tolerância de 10%, mas ainda exige aprovação administrativa.

## Pendências de engenharia antes de homologar o fluxo completo

1. Criar/ajustar o ciclo de vida de `VIAGENS`: criação, início, chegada, carregamento, deslocamento, descarga, conclusão, pausa e cancelamento.
2. Integrar o portal do motorista para apresentar viagem e receber comprovantes de carregamento e descarga.
3. Ajustar o webhook WhatsApp para que tickets recebidos sejam encaminhados a uma fila de conferência e vinculados à viagem correta; não associar automaticamente apenas por placa ou telefone.
4. Criar painel administrativo de tickets pendentes, divergências, justificativas e aprovação.
5. Fazer a conclusão da viagem atualizar toneladas realizadas e saldo da operação somente após os dois tickets aprovados.
6. Impedir que a antiga movimentação agregada registre viagens concluídas sem evidência de tickets aprovados.
7. Corrigir o motor de escala para avaliar conflitos por motorista, cavalo e carreta em intervalos reais, e calcular prioridade entre operações sem criar sobreposição.
8. Implementar distribuição proporcional do volume por capacidade e disponibilidade, com trilha de auditoria.
9. Criar testes integrados com dados fictícios e cenários de divergência, correção, duplicidade, troca de conjunto, excesso de capacidade, pausa e reabertura.
10. Revisar segurança, retenção, acesso aos documentos e backups antes de habilitar canais reais.

## Segurança de implantação

- Branch de trabalho isolada; não mesclar em `main`.
- Não executar funções de limpeza, reset, seed ou instalação de gatilhos durante esta etapa.
- Não alterar a planilha real do Bruno.
- Não implantar em produção.
- Executar backup integral da homologação antes de preparar novas guias ou testar gravações.
- O módulo adicionado ainda precisa ser integrado à interface e validado no Apps Script antes de ser considerado pronto para uso.
