import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = (p) => readFileSync(p, 'utf8');

// «A teia do jardim»: dados coerentes (ligações entre nós existentes, fontes presentes, PT/EN completos).
const d = JSON.parse(read('data/teia-jardim.json'));
const ids = new Set(d.nos.map((n) => n.id));
assert.equal(ids.size, d.nos.length, 'nós repetidos');
const niveis = new Set(d.niveis.map((n) => n.id));
for (const n of d.nos) {
  assert(niveis.has(n.nivel), n.id + ': nível inexistente');
  for (const lang of ['pt', 'en']) {
    assert(n[lang].nome && n[lang].resumo && n[lang].ajudar.length, n.id + ': texto ' + lang + ' incompleto');
  }
  assert(n.refs.length, n.id + ': sem fonte');
  n.refs.forEach((r) => assert(d.referencias[r], n.id + ': fonte inexistente ' + r));
}
for (const l of d.ligacoes) {
  assert(ids.has(l.de) && ids.has(l.para), `ligação inválida ${l.de}>${l.para}`);
  assert(l.pt && l.en, `ligação sem texto ${l.de}>${l.para}`);
  if (l.forca !== 'base') assert(l.refs.length, `ligação sem fonte ${l.de}>${l.para}`);
  l.refs.forEach((r) => assert(d.referencias[r], 'fonte inexistente ' + r));
}
for (const [id, r] of Object.entries(d.referencias)) assert(r.citacao && /^https:\/\//.test(r.url), 'referência sem endereço: ' + id);

// Já não há mapa na página: a informação vive nas fichas dos elos que têm ficha (espécie ou praga).
assert(!d.cenario && !d.nos.some((n) => n.foto), 'dados do mapa antigo (cenário, fotografias) já não são usados');
const html = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
assert(!html.includes('teia-jardim'), 'o mapa saiu de Conhecimento para cuidar');
const problemas = new Set(JSON.parse(read('data/problemas-horta.json')).problemas.map((p) => p.id));
for (const n of d.nos) for (const v of n.ver) if (v.t === 'prob') assert(problemas.has(v.id), 'resposta inexistente: ' + v.id);
const indice = JSON.parse(read('data/especies-indice.json'));
const pragas = new Set(JSON.parse(read('data/pragas.json')).map((p) => p.id));
let comFicha = 0;
for (const n of d.nos) {
  if (n.ficha) { assert(indice[n.ficha], n.id + ': ficha inexistente no catálogo'); comFicha++; }
  if (n.praga) { assert(pragas.has(n.praga), n.id + ': praga inexistente no catálogo'); comFicha++; }
}
assert(comFicha >= 8, 'os elos com ficha têm de aparecer nas fichas');
const ficha = read('assets/js/pages/ecossistemas-especie-detalhe-2.js');
assert(ficha.includes('teiaPanel(esp, teia)') && ficha.includes('/data/teia-jardim.json'), 'a ficha tem de mostrar «Na teia do jardim»');
console.log(`Teia do jardim validada: ${d.nos.length} elos, ${d.ligacoes.length} ligações com fonte, ${comFicha} fichas.`);
