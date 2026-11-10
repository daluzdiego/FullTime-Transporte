import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../OperacoesLotes.gs', import.meta.url), 'utf8');

test('estrutura de lotes exige confirmação explícita e nunca apaga guias', () => {
  assert.match(source, /function prepararEstruturaLotesFullTime\(token, confirmar\)/);
  assert.match(source, /if \(confirmar !== true\)/);
  assert.doesNotMatch(source, /deleteSheet\s*\(/);
});

test('cadastro multi-cliente valida relação cliente-lote e particularidades JSON', () => {
  assert.match(source, /function salvarOperacaoComLotesFullTime\(token, data\)/);
  assert.match(source, /clientes\.indexOf\(clienteId\)<0/);
  assert.match(source, /ftLotesValidateParticularidades_/);
  assert.match(source, /LockService\.getScriptLock/);
});

test('detalhe da operação exige sessão administrativa', () => {
  assert.match(source, /function obterDetalhesOperacaoComLotesFullTime\(token, operacaoId\)[\s\S]*?obterSessao_\(token\); exigirAdmin_\(session\)/);
});

test('cadastro multi-lote não inventa quantidade de viagens a partir do volume', () => {
  assert.match(source, /const totalViagens=0/);
  assert.match(source, /dependem da capacidade útil dos conjuntos/);
});

test('as guias relacionais são lidas na mesma base operacional oficial', () => {
  const code = readFileSync(new URL('../../Code.gs', import.meta.url), 'utf8');
  const match = code.match(/const operationalTabs = \[([^\]]+)\]/);
  assert.ok(match, 'Lista de guias operacionais não encontrada.');
  for (const tab of ['OPERACAO_CONFIGURACOES', 'OPERACAO_CLIENTES', 'LOTES_OPERACAO']) {
    assert.match(match[1], new RegExp("'" + tab + "'"));
  }
  assert.match(source, /PropertiesService\.getScriptProperties\(\)\.getProperty\('FT_REGISTRY_DATABASE_ID'\)/);
});

test('a estrutura relacional mantém identificadores de operação, cliente e lote', () => {
  assert.match(source, /OPERACAO_CONFIGURACOES:[\s\S]*?'OPERACAO_ID'/);
  assert.match(source, /OPERACAO_CLIENTES:[\s\S]*?'CLIENTE_ID'/);
  assert.match(source, /LOTES_OPERACAO:[\s\S]*?'OPERACAO_ID'[\s\S]*?'CLIENTE_ID'/);
});
