# Arquitetura — Full Time Transporte

## Objetivo
O sistema recebe operações e cargas, mantém cadastros e vínculos veiculares, coleta disponibilidade diária dos motoristas (em etapa futura) e gera a escala automaticamente. O administrador acompanha e trata exceções; não distribui manualmente motoristas como fluxo normal.

## Componentes
- `Code.gs`: autenticação, autorização, validação, persistência, adaptador da planilha de origem, operações e regras de escala.
- `Index.html`: interface administrativa.
- Planilha operacional: cadastros e dados da operação.
- Planilha de origem do Bruno: fonte dos cadastros sincronizados, sem duplicar guias desnecessariamente.

## Modelo conceitual
### Motorista
Cadastro, status, habilitação documental e identificador externo estável.

### Veículos
Cavalo mecânico e carretas com placa, situação, capacidade e documentação. Capacidade útil não deve ser calculada por soma nominal sem validar limites legais do conjunto.

### Vínculo veicular
Associação vigente entre motorista e cavalo mecânico, com carretas opcionais. O vínculo é configurado no cadastro, não na tela de escala. Toda troca deve registrar início/fim de vigência e preservar um retrato dos veículos utilizados em cada escala histórica.

### Operação e carga
Operação contém cliente, origem, destino, data, categoria, volume e quantidade prevista. Cargas representam unidades concretas a distribuir e executar. É necessário manter clara a diferença entre operação, carga e viagem realizada.

### Disponibilidade diária
Confirmação do motorista para uma data específica. A data de referência será o próximo dia; horário de abertura/fechamento permanece pendente de decisão operacional.

### Escala automática
O motor deve:
1. selecionar somente motoristas ativos e habilitados para a data;
2. resolver o vínculo vigente do motorista;
3. validar cavalo, carretas, capacidade, documentos, restrições e conflitos;
4. aplicar regras aprovadas de prioridade, equilíbrio e sequência;
5. impedir dupla alocação incompatível de motorista ou veículo;
6. gravar escala e retrato dos veículos utilizados;
7. registrar motivo da seleção e motivos de inelegibilidade;
8. manter auditoria e permitir tratamento administrativo de exceções sem apagar histórico.

Nenhum peso ou critério de prioridade deve ser inventado. As regras precisam ser confirmadas com a Full Time antes da ativação.

## Integração Bruno → sistema
O adaptador lê por cabeçalho normalizado. IDs externos de motorista, cavalo e carretas devem mapear para os campos internos equivalentes. Placas e CPF/nome podem ajudar no diagnóstico, nunca substituir silenciosamente um ID ambíguo. Registros sem correspondência devem ficar pendentes de revisão.

## Estado de implementação
Há estruturas e funções de operações, candidatos, participações e histórico, mas isso não equivale a um motor automático completo. A interface administrativa não deve oferecer designação manual como fluxo padrão. A disponibilidade do motorista e a execução automática precisam ser implementadas e testadas de ponta a ponta.

## Limitações
Google Sheets e Apps Script têm cotas e limites de concorrência. Antes de operação crítica, realizar testes simultâneos, revisar locks, autenticação, backup, restauração, LGPD e observabilidade.
