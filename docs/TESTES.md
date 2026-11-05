# Plano de testes — Full Time Transporte

Executar em ambiente de teste, somente com dados fictícios. Não ativar escalas reais enquanto houver falhas.

## Integração dos cadastros Bruno → sistema
- [ ] Conferir cabeçalhos de todas as guias de origem.
- [ ] Validar leitura de `ID_EXTERNO` como identificador estável.
- [ ] Validar `MOTORISTA_ID_EXTERNO` → `MOTORISTA_ID`.
- [ ] Validar `CAVALO_ID_EXTERNO` → `CAVALO_ID`.
- [ ] Validar `CARRETA_MEIO_ID_EXTERNO` → `CARRETA_MEIO_ID`.
- [ ] Validar `CARRETA_FINAL_ID_EXTERNO` → `CARRETA_FINAL_ID`.
- [ ] Confirmar que placas e nomes correspondem aos IDs vinculados.
- [ ] Testar IDs ausentes, duplicados e não encontrados; vínculo ambíguo não pode ser ativado.
- [ ] Confirmar que sincronização não cria guias duplicadas nem sobrescreve cadastros locais.

## Vínculo motorista–veículos
- [ ] Associar motorista a cavalo sem carreta.
- [ ] Associar motorista a cavalo e uma carreta.
- [ ] Associar motorista a cavalo e duas carretas.
- [ ] Impedir reutilização simultânea indevida do mesmo motorista ou veículo.
- [ ] Impedir ativação se motorista ou veículo estiver pendente/inativo.
- [ ] Trocar veículo e confirmar vigência/histórico sem alterar escalas passadas.
- [ ] Confirmar que a tela de escala não exige escolher cavalo ou carreta.

## Operações e cargas
- [ ] Validar datas, origem, destino, cliente, volume e quantidade.
- [ ] Confirmar relação entre volume total, cargas previstas e cargas individuais.
- [ ] Impedir alocação acima do saldo.
- [ ] Validar estados de operação e transições válidas.

## Motor de escala automática — pendente de implementação integrada
- [ ] Considerar somente motoristas que confirmaram disponibilidade para a data-alvo.
- [ ] Excluir motoristas indisponíveis, inativos ou sem vínculo válido.
- [ ] Validar documentos, restrições, capacidade e conflitos.
- [ ] Aplicar regras de prioridade aprovadas pelo cliente.
- [ ] Distribuir cargas sem duplicar motorista ou veículo em conflitos.
- [ ] Gravar placas do cavalo e carretas como retrato histórico.
- [ ] Registrar justificativa da seleção e inelegibilidade.
- [ ] Reexecutar sem duplicar escalas já geradas.
- [ ] Tratar falta de elegíveis sem criar designações artificiais.

## Interface e segurança
- [ ] Confirmar que interface administrativa não oferece designação manual como fluxo normal.
- [ ] Testar desktop, celular, teclado e mensagens de erro.
- [ ] Testar autorização das funções de backend.
- [ ] Testar duas execuções concorrentes do gerador.
- [ ] Confirmar auditoria e recuperação de dados.
- [ ] Não cadastrar dados reais antes da revisão de segurança e LGPD.

## Suíte automatizada de fluxo integral (somente leitura)

Arquivo: `TESTE_FLUXO_INTEGRAL.gs`

1. Copie o conteúdo do arquivo para o projeto Apps Script vinculado ao sistema (ou mantenha o arquivo no projeto, se já estiver sincronizado).
2. Confirme que `FT_REGISTRY_DATABASE_ID` aponta para a planilha de homologação, nunca para a planilha de produção durante os testes.
3. No editor do Apps Script, selecione e execute `executarTesteFluxoIntegralFullTime`.
4. Autorize as permissões solicitadas e consulte **Execuções > Registros**.
5. O retorno contém `total`, `aprovados`, `falhas`, `bloqueios` e o detalhamento de cada etapa.

A suíte é não destrutiva: não cria, altera nem apaga linhas. Verifica conexão, estrutura das guias, leitura dos espelhos do Bruno, integridade dos vínculos, listagens operacionais, IDs duplicados, participações simultâneas e ordenação determinística.

**Critério de aprovação:** `prontoParaProducao` só será verdadeiro quando não houver falhas nem bloqueios. No estado atual, espera-se bloqueio explícito porque a função de geração automática de escalas ainda não foi implementada. A suíte não simula uma escala que o sistema ainda não gera e não substitui testes transacionais em uma cópia isolada da planilha.

