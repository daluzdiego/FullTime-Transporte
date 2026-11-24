import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const files = execFileSync('git', ['ls-files', '*.gs'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
if (!files.length) throw new Error('Nenhum arquivo .gs encontrado.');
const serverBundle = files.map((file) => '\n;/* FILE: ' + file + ' */\n' + readFileSync(file, 'utf8')).join('\n');
new vm.Script(serverBundle, { filename: 'apps-script-server-bundle.js' });
console.log('OK: sintaxe conjunta de ' + files.length + ' arquivos .gs.');

const html = readFileSync('Index.html', 'utf8');
const scripts = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)];
if (!scripts.length) throw new Error('Nenhum script inline encontrado em Index.html.');
scripts.forEach((match, index) => {
  const source = match[1].replace(/<\\?!=\\s*JSON\\.stringify\\(RESET_TOKEN\\)\\s*\\?>/g, 'null');
  new vm.Script(source, { filename: 'Index.html:inline-script-' + (index + 1) });
});
console.log('OK: sintaxe de ' + scripts.length + ' bloco(s) JavaScript do Index.html.');
