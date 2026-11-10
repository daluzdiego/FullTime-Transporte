import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRAZO_CONVITE_MS, validarOperacao, validarParticipacoesMotorista,
  detectarConflitoAgenda, calcularExpiracaoConvite, conviteExpirou,
  selecionarProximoElegivel, sugerirRedistribuicao
} from '../../src/domain/operational-rules.mjs';

test('operação aceita particularidades próprias sem impor campos universais', () => {
  assert.equal(validarOperacao({ nome: 'Navio Alfa', particularidades: { navio: 'Alfa', terminal: 'T1' } }).valido, true);
  assert.equal(validarOperacao({ nome: 'Serviço Beta', particularidades: { contrato: 'C-9', janela: 'noturna' } }).valido, true);
  assert.equal(validarOperacao({ nome: '', particularidades: {} }).valido, false);
});

test('motorista pode participar simultaneamente de lotes diferentes da mesma operação', () => {
  const r = validarParticipacoesMotorista([
    { operacaoId: 'OP1', loteId: 'L1', motoristaId: 'M1' },
    { operacaoId: 'OP1', loteId: 'L2', motoristaId: 'M1' }
  ]);
  assert.equal(r.valido, true);
});

test('rejeita vínculo duplicado do mesmo motorista no mesmo lote', () => {
  const r = validarParticipacoesMotorista([
    { operacaoId: 'OP1', loteId: 'L1', motoristaId: 'M1' },
    { operacaoId: 'OP1', loteId: 'L1', motoristaId: 'M1' }
  ]);
  assert.equal(r.valido, false);
  assert.equal(r.erros[0].codigo, 'PARTICIPACAO_DUPLICADA_NO_LOTE');
});

test('detecta conflito de motorista ou conjunto em operações diferentes', () => {
  const base = { motoristaId: 'M1', conjuntoId: 'C1', inicio: '2026-11-10T08:00:00Z', fim: '2026-11-10T12:00:00Z' };
  assert.equal(detectarConflitoAgenda([
    { ...base, id: 'A', operacaoId: 'OP1' },
    { ...base, id: 'B', operacaoId: 'OP2', motoristaId: 'M2' }
  ])[0].recurso, 'CONJUNTO');
  assert.equal(detectarConflitoAgenda([
    { ...base, id: 'A', operacaoId: 'OP1' },
    { ...base, id: 'B', operacaoId: 'OP2', conjuntoId: 'C2' }
  ])[0].recurso, 'MOTORISTA');
});

test('convite expira exatamente duas horas após o envio', () => {
  const enviado = '2026-11-10T08:00:00.000Z';
  assert.equal(PRAZO_CONVITE_MS, 7200000);
  assert.equal(calcularExpiracaoConvite(enviado), '2026-11-10T10:00:00.000Z');
  assert.equal(conviteExpirou({ status: 'PENDENTE', prazoRespostaEm: '2026-11-10T10:00:00Z' }, '2026-11-10T10:00:00Z'), true);
  assert.equal(conviteExpirou({ status: 'ACEITA', prazoRespostaEm: '2026-11-10T10:00:00Z' }, '2026-11-10T11:00:00Z'), false);
});

test('seleciona primeiro candidato elegível na ordem recebida', () => {
  const escolhido = selecionarProximoElegivel([
    { id: 'M1', elegivel: false, disponivel: true },
    { id: 'M2', elegivel: true, disponivel: false },
    { id: 'M3', elegivel: true, disponivel: true },
    { id: 'M4', elegivel: true, disponivel: true }
  ]);
  assert.equal(escolhido.id, 'M3');
});

test('redistribuição equilibra volume relativo à capacidade e exige aprovação', () => {
  const r = sugerirRedistribuicao({
    viagensPendentes: [
      { id: 'V1', volumeToneladas: 30 },
      { id: 'V2', volumeToneladas: 30 },
      { id: 'V3', volumeToneladas: 30 }
    ],
    motoristas: [
      { id: 'M1', capacidadeToneladas: 30, toneladasJaAlocadas: 30, elegivel: true, disponivel: true },
      { id: 'M2', capacidadeToneladas: 60, toneladasJaAlocadas: 0, elegivel: true, disponivel: true }
    ]
  });
  assert.equal(r.possivel, true);
  assert.equal(r.requerAprovacao, true);
  assert.equal(r.sugestoes.length, 3);
  assert.equal(r.naoAlocadas.length, 0);
});

test('não aloca viagem sem motorista com capacidade disponível', () => {
  const r = sugerirRedistribuicao({
    viagensPendentes: [{ id: 'V1', volumeToneladas: 50 }],
    motoristas: [{ id: 'M1', capacidadeToneladas: 30, limiteToneladas: 30, elegivel: true, disponivel: true }]
  });
  assert.equal(r.possivel, false);
  assert.equal(r.naoAlocadas[0].motivo, 'SEM_CAPACIDADE_ELEGIVEL');
});

test('motoristas indisponíveis não recebem redistribuição', () => {
  const r = sugerirRedistribuicao({
    viagensPendentes: [{ id: 'V1', volumeToneladas: 10 }],
    motoristas: [{ id: 'M1', capacidadeToneladas: 30, elegivel: true, disponivel: false }]
  });
  assert.equal(r.sugestoes.length, 0);
  assert.equal(r.naoAlocadas.length, 1);
});
