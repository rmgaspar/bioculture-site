import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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
d.cenario.refs.forEach((r) => assert(d.referencias[r], 'fonte do cenário inexistente ' + r));

// Página: bloco, separador na barra e scripts com versão; o JS é válido; as respostas ligadas existem.
const html = read('calendario/conhecimento-cuidar.html');
assert(html.includes('id="teia-jardim"') && html.includes('href="#teia-jardim"'));
for (const f of ['assets/js/pages/teia-jardim.js', 'assets/js/pages/teia-jardim-icones.js', 'assets/css/components/teia-jardim.css']) {
  assert(existsSync(f), f);
  assert(new RegExp(f.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\?v=\\d+').test(html), f + ' tem de ter versão');
}
new vm.Script(read('assets/js/pages/teia-jardim.js'));
const problemas = new Set(JSON.parse(read('data/problemas-horta.json')).problemas.map((p) => p.id));
for (const n of d.nos) for (const v of n.ver) if (v.t === 'prob') assert(problemas.has(v.id), 'resposta inexistente: ' + v.id);
// Cada elo tem a sua ilustração.
const sandbox = { window: {} };
vm.runInNewContext(read('assets/js/pages/teia-jardim-icones.js'), sandbox);
for (const n of d.nos) assert(/^<svg /.test(sandbox.window.BioCulturaTeiaIcones[n.id] || ''), n.id + ': falta ilustração');
// Fotografias: cada uma com autor, licença aberta e ligação à origem; as fichas ligadas existem no catálogo.
const indice = JSON.parse(read('data/especies-indice.json'));
for (const n of d.nos) {
  if (n.foto && n.foto.propria) assert(existsSync(n.foto.url.slice(1)), n.id + ': imagem própria inexistente');
  else if (n.foto) {
    assert(/^https:\/\//.test(n.foto.url) && n.foto.autor && /^CC/.test(n.foto.licenca) && /^https:\/\/creativecommons\.org\//.test(n.foto.licenca_url) && /^https:\/\/www\.inaturalist\.org\/photos\/\d+$/.test(n.foto.pagina), n.id + ': foto sem crédito completo');
    assert(['CC0', 'CC BY', 'CC BY-SA'].includes(n.foto.licenca), n.id + ': só licenças que permitem uso comercial e adaptação (CC0, CC BY, CC BY-SA), não ' + n.foto.licenca);
  }
  if (n.ficha) assert(indice[n.ficha], n.id + ': ficha inexistente no catálogo');
}
