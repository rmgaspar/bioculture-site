import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Glossário (glossario.html): dados escritos à mão, ligações entre termos, páginas do site e fontes; pesquisa sem acentos.
const D = JSON.parse(readFileSync('data/glossario.json', 'utf8'));
const html = readFileSync('glossario.html', 'utf8');
const js = readFileSync('assets/js/pages/glossario.js', 'utf8');
const sidebar = readFileSync('sidebar-content.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));
const build = readFileSync('scripts/build-pages.mjs', 'utf8');

const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const { norm, letraDe, filtrar } = win.BioCulturaGlossario;
assert.equal(norm('Matéria Orgânica'), 'materia organica');
assert.equal(letraDe('Évora'), 'E');
assert.equal(letraDe('ÁGUA'), 'A');
assert.equal(letraDe('₂ ET'), 'E');
assert.equal(letraDe('1,5 °C'), '1'.match(/[A-Z]/) ? '1' : '#');

// Estrutura dos termos.
const ids = D.termos.map((t) => t.id);
assert.equal(new Set(ids).size, ids.length, 'ids únicos');
assert(D.termos.length >= 60, 'glossário com pelo menos 60 termos');
const cats = new Set(D.categorias.map((c) => c.id));
for (const c of D.categorias) assert(c.pt && c.en, `categoria ${c.id}`);
for (const t of D.termos) {
  for (const k of ['pt', 'en', 'd_pt', 'd_en']) assert(t[k] && t[k].length > 2, `${t.id}: falta ${k}`);
  assert(/^[a-z0-9-]+$/.test(t.id), `${t.id}: id inválido`);
  assert(cats.has(t.cat), `${t.id}: tema desconhecido`);
  assert(t.d_pt.length >= 60 && t.d_pt.length <= 700, `${t.id}: definição com tamanho estranho`);
  for (const v of t.ver) { assert(ids.includes(v), `${t.id}: «ver também» desconhecido ${v}`); assert.notEqual(v, t.id, `${t.id}: aponta para si próprio`); }
  assert(t.fonte === null || D.fontes[t.fonte], `${t.id}: fonte desconhecida`);
  for (const o of t.onde) {
    assert(o.length === 3 && o[1] && o[2], `${t.id}: «onde» incompleto`);
    const ficheiro = o[0].split('#')[0].split('?')[0].replace(/^\//, '');
    assert(existsSync(ficheiro), `${t.id}: a página ${o[0]} não existe`);
  }
  // Sem aspas retas dentro do texto (usamos «»), para não partir o HTML.
  assert(!/"/.test(t.d_pt + t.d_en + t.pt + t.en), `${t.id}: aspas retas`);
}
// Cada tema tem termos; as fontes usadas existem e têm ligação https.
for (const c of D.categorias) assert(D.termos.some((t) => t.cat === c.id), `tema sem termos: ${c.id}`);
for (const [id, f] of Object.entries(D.fontes)) assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en, `fonte ${id}`);
for (const id of Object.keys(D.fontes)) assert(D.termos.some((t) => t.fonte === id), `fonte sem uso: ${id}`);
// Termos que as outras páginas usam têm de estar lá.
for (const id of ['ndvi', 'sentinel-2', 'pixel', 'mascara-nuvens', 'soilgrids', 'et0', 'balanco-hidrico', 'isip', 'pu', 'ecorregime', 'agroambientais', 'arb-ppa', 'condicionalidade', 'oc', 'co2e', 'efeitos-nao-co2', 'agricultura-regenerativa', 'cobertura-solo']) assert(ids.includes(id), `falta o termo ${id}`);
// Os números das definições batem com o que o site diz noutras páginas.
const t = (id) => D.termos.find((x) => x.id === id);
assert(t('ph').d_pt.includes('5,6') && t('ph').d_pt.includes('6,5') && t('ph').d_pt.includes('7,3'), 'classes de pH iguais às de «O meu terreno»');
assert(t('unidades').d_pt.includes('3,6 megajoules') && t('unidades').d_pt.includes('278 000'));
assert(t('sementeira-direta').d_pt.includes('3 ha') && t('agroambientais').d_pt.includes('2, 3 ou 5'));
assert(t('efeitos-nao-co2').d_pt.includes('70 %'), 'o acréscimo da DESNZ é o da página da Aviação');

// Pesquisa: por acento, por idioma e por tema.
assert(filtrar(D.termos, 'todos', 'materia organica').some((x) => x.id === 'materia-organica'));
assert(filtrar(D.termos, 'todos', 'organic matter').some((x) => x.id === 'materia-organica'), 'a pesquisa vê o termo em inglês');
assert(filtrar(D.termos, 'apoios', 'ndvi').length === 0 && filtrar(D.termos, 'dados', 'ndvi').length >= 1);
assert.equal(filtrar(D.termos, 'todos', '').length, D.termos.length);

// Página, barra lateral, SEO e build.
for (const id of ['procurar', 'termos', 'fontes']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="glossario-voltar" href="\/"/.test(html), '«Voltar» só na barra fixa');
assert(sidebar.includes('href="/glossario.html"') && sidebar.includes('sidebar.item_glossary'), 'ligação na barra lateral');
for (const f of ['assets/lang/pt.json', 'assets/lang/en.json']) assert(JSON.parse(readFileSync(f, 'utf8')).sidebar.item_glossary, `${f}: item_glossary`);
assert(cfg.paginas['glossario.html']?.desc && existsSync('images/partilha/glossario.jpg'));
assert(build.includes('"glossario.html"'), 'o build publica glossario.html');
assert(!/https?:\/\/[^'"`\s]+\.json/.test(js) && !/localStorage|navigator\.geolocation/.test(js), 'só lê o ficheiro do próprio site, sem dados do visitante');
assert(/glossario\.js\?v=\d+/.test(html) && /glossario\.css\?v=\d+/.test(html));
console.log('glossario: ok');
