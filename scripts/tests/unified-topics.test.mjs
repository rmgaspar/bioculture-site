import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read = p => readFileSync(p, 'utf8');
const pairs = [
 ['recursos/agua.html','recursos/water.html','country-select'],
 ['recursos/ar.html','recursos/air.html','country-select'],
 ['recursos/solo.html','recursos/soil.html','country-select'],
 ['ecossistemas/biodiversidade.html','ecossistemas/biodiversity.html','country-select'],
 ['energia/transicao-etica.html','energia/renewables-and-territory.html','pressure-projects'],
 ['energia/digital.html','energia/ai-data-centres.html','ai-metrics'],
 ['energia/mineracao.html','energia/mining.html','mine-grid'],
 ['energia/pecuaria.html','energia/livestock.html','frontier-grid'],
];
for (const [page,alias,control] of pairs) {
 const html=read(page), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size, `${page}: duplicate IDs can break controls`);
 for(const id of [control,'essencial','territorios','panorama-global','leitura-local','portugal']) assert(ids.includes(id),`${page}: missing ${id}`);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert(html.includes('Açores')&&html.includes('Madeira'));
 const script=html.match(/data-global-script="([^"]+)"/)[1].split('?')[0];
 assert(existsSync('.'+script)); new vm.Script(read('.'+script));
 assert(!read('.'+script).includes("fetch('/sidebar-content.html')"), 'Global panels must not replace the shared sidebar');
 const fallback=read(alias).match(/id="unified-destination" href="([^"]+)"/) || read(alias).match(/href="([^"]+)" id="unified-destination"/);
 assert(fallback,`Alias ${alias} needs a non-JS fallback`);
 assert.equal(fallback[1],'/'+page);
 for(const prefix of ['', '/bioculture-site']) {
  let destination;
  const href='https://example.test'+prefix+'/'+page;
  vm.runInNewContext(read('assets/js/pages/topic-redirect.js'), {URL,document:{getElementById:()=>({href})},location:{href:'https://example.test'+prefix+'/'+alias,search:'?lang=pt',hash:'#portugal',replace:v=>destination=v}});
  assert.equal(destination,href+'?lang=pt#portugal');
 }
}
const runtime=read('assets/js/biocultura-i18n-runtime.js');
const legacy=runtime.split('const consolidatedLegacyRoutes = {')[1].split('};')[0];
for(const [page] of pairs) assert(!legacy.includes('/'+page),`${page} must not redirect back to itself`);
const puzzle=read('recursos/vida-e-recursos.html').match(/<svg[^>]*class="life-puzzle"[\s\S]*?<\/svg>/)[0];
assert.equal((puzzle.match(/<clipPath/gi)||[]).length,4);
assert.equal(new Set([...puzzle.matchAll(/<a[^>]+href="([^"]+)"/g)].map(x=>x[1])).size,4);
assert(read('assets/js/pages/hub-pages.js').includes('class="news-media"'));
console.log('Eight unified topics: unique IDs, retained controls, aliases with language/hash and base path, no redirect loops, four linked puzzle pieces.');
