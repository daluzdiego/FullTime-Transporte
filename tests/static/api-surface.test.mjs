import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../../Code.gs', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../Index.html', import.meta.url), 'utf8');

const declarations = [...code.matchAll(/^function\\s+([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)/gm)]
  .map(match => ({ name: match[1], args: match[2].trim(), index: match.index }));

const declaredNames = new Set(declarations.map(item => item.name));

function uiRemoteCalls(source) {
  const names = new Set();
  const pattern = /google\\.script\\.run/g;
  for (const match of source.matchAll(pattern)) {
    const end = source.indexOf(';', match.index);
    const segment = source.slice(match.index, end < 0 ? match.index + 1800 : end);
    const chain = [...segment.matchAll(/\\.([A-Za-z_$][\\w$]*)\\s*\\(/g)]
      .map(item => item[1])
      .filter(name => !['withSuccessHandler', 'withFailureHandler', 'withUserObject'].includes(name));
    if (chain.length) names.add(chain.at(-1));
  }
  return names;
}

test('todas as chamadas remotas encontradas na interface existem no backend', () => {
  const missing = [...uiRemoteCalls(html)].filter(name => !declaredNames.has(name));
  assert.deepEqual(missing, [], `Chamadas sem função correspondente: ${missing.join(', ')}`);
});

test('funções internas usam convenção de sufixo privado', () => {
  const internalNames = declarations.filter(item => item.name.endsWith('_'));
  assert.ok(internalNames.length > 0, 'Nenhum helper privado encontrado; revisar convenção.');
  for (const helper of internalNames) {
    assert.equal(uiRemoteCalls(html).has(helper.name), false,
      `Helper interno chamado diretamente pela interface: ${helper.name}`);
  }
});

test('superfície pública sem token permanece explicitamente inventariada', () => {
  const noToken = declarations
    .filter(item => !item.name.endsWith('_'))
    .filter(item => !item.args.split(',').map(arg => arg.trim()).includes('token'))
    .map(item => item.name)
    .sort();

  const approvedBaseline = [
    'abrirBaseFullTime',
    'calcularAssiduidadeMotoristaFullTime',
    'calcularViagensMinimasFullTime',
    'configurarSistemaFullTime',
    'contarOperacoesDistintasUltimos30DiasFullTime',
    'doGet',
    'importarCaminhoesCsvFullTime',
    'inserirDadosFakeFullTime',
    'loginFullTime',
    'motoristasSemConfirmacaoDiariaFullTime',
    'ordenarElegiveisEscalaFullTime',
    'prepararBaseOperacionalFullTime',
    'prepararGuiasEscalaFullTime',
    'recusaAplicaSomenteOperacaoAtualFullTime',
    'registrarMovimentacaoOperacaoFullTime',
    'salvarCaminhaoFullTime',
    'salvarCargaFullTime',
    'testarFuncoesPurasFullTime',
    'testarRegressaoAssiduidadeFullTime',
    'testarRegressaoEscopoPortalMotoristaFullTime',
    'testarRegressaoStatusPorCabecalhoFullTime',
    'validarMetaViagensFullTime'
  ].sort();

  assert.deepEqual(noToken, approvedBaseline,
    'A superfície global sem token mudou. Atualize a matriz de autorização antes de aceitar a mudança.');
});

test('o código ainda não deve ser confundido com implementação multi-tenant', () => {
  assert.match(code, /DB_PROPERTY:\\s*'FT_DATABASE_ID'/);
  assert.match(code, /function\\s+getSheet_\\s*\\(\\s*name\\s*\\)/);
  assert.doesNotMatch(code, /function\\s+getSheet_\\s*\\(\\s*tenantId\\s*,/);
});
