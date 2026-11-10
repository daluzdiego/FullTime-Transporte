import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('todos os arquivos Apps Script compilam juntos no mesmo escopo global', () => {
  const files = [
    '../../Code.gs',
    '../../OperacoesLotes.gs',
    '../../MotorEscalaFullTime.gs',
    '../../CadastroMotoristasFullTime.gs',
    '../../SolicitacoesFullTime.gs',
    '../../WhatsAppTickets.gs',
    '../../IntegracaoCadastroBruno.gs',
    '../../IntegracaoDriveCliente.gs',
    '../../InterpretacaoSolicitacoesFullTime.gs',
    '../../Homologacao.gs'
  ];
  const combined = files.map(read).join('\n;\n');
  assert.doesNotThrow(() => new vm.Script(combined, { filename: 'FullTime-AppsScript-bundle.js' }));
});

test('scripts inline da interface compilam sem erro de sintaxe', () => {
  const html = read('../../Index.html');
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(source => source.trim());
  assert.ok(scripts.length > 0, 'Nenhum script inline encontrado na interface.');
  for (let i = 0; i < scripts.length; i++) {
    try { new vm.Script(scripts[i], { filename: 'Index-inline-' + i + '.js' }); }
    catch (error) { throw new Error('Erro de sintaxe no script inline ' + i + ': ' + error.stack); }
  }
});
