import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

// Fotografias editoriais de «A teia» (bioWeb): ficheiro local, autor, licença que permite uso comercial e ligação à origem.
const js = readFileSync('assets/js/pages/observatorio-bioweb.js', 'utf8');
const bloco = js.slice(js.indexOf('const FOTOS = {'), js.indexOf('const intro = '));
const entradas = [...bloco.matchAll(/^\s{6}(\w+): \{(.*)\},?$/gm)];
assert(entradas.length >= 5, 'faltam fotografias');
for (const [, id, corpo] of entradas) {
  assert(existsSync(`images/bioweb/${id}.webp`), id + ': ficheiro em falta');
  const autor = /autor: "([^"]+)"/.exec(corpo)?.[1];
  const licenca = /lic: (?:tr\("([^"]+)"|"([^"]+)")/.exec(corpo);
  const pag = /pag: "([^"]+)"/.exec(corpo)?.[1];
  assert(autor, id + ': sem autor');
  assert(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(pag || ''), id + ': sem ligação à origem');
  const lic = licenca?.[1] || licenca?.[2] || '';
  assert(/^(CC0|CC BY( \d\.\d)?|CC BY-SA( \d\.\d)?|domínio público)$/.test(lic), id + ': licença não permitida: ' + lic);
  assert(/alt: tr\("/.test(corpo) && /en: "/.test(corpo), id + ': falta texto alternativo ou legenda em inglês');
}
assert(js.includes('<figure class="foto" data-no-signature>'), 'fotos de terceiros não levam a marca bioCulture (data-no-signature)');
console.log(`Fotografias de A teia validadas: ${entradas.length}, todas com autor, licença aberta e origem.`);
