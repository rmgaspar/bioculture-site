import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Sementes (calendario/sementes.html): variedades de conservação do CNV 2026, fontes oficiais e ligações.
const D = JSON.parse(readFileSync('data/sementes.json', 'utf8'));
const html = readFileSync('calendario/sementes.html', 'utf8');
const js = readFileSync('assets/js/pages/sementes.js', 'utf8');
const hub = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));
const G = JSON.parse(readFileSync('data/glossario.json', 'utf8'));

const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const { filtrar, especies } = win.BioCulturaSementes;
const J = (x) => JSON.parse(JSON.stringify(x));

// Dados: as oito variedades de conservação do CNV 2026, em seis espécies.
assert.equal(D.edicao, '2026');
assert.equal(D.variedades.length, 8);
assert.deepEqual(J(especies(D.variedades)), ['Milho', 'Trigo-duro', 'Trigo-mole', 'Grão-de-bico', 'Abóbora-porqueira', 'Feijão']);
assert.deepEqual(D.variedades.map((v) => v.nome).sort(), ['Bornes', 'Corno de Carneiro', 'Da Terra', 'Do Ervedal', 'Pirana', 'Preto Amarelo', 'Santana', 'Tarreste']);
for (const v of D.variedades) {
  for (const k of ['id', 'nome', 'especie_pt', 'especie_en', 'cient', 'regiao_pt', 'regiao_en', 'resp']) assert(v[k], `${v.id}: falta ${k}`);
  assert(Number.isInteger(v.ano) && v.ano >= 2009 && v.ano <= 2026, `${v.id}: ano`);
}
assert.equal(new Set(D.variedades.map((v) => v.id)).size, 8, 'ids únicos');
assert.deepEqual(D.variedades.filter((v) => v.horta).map((v) => v.nome).sort(), ['Bornes', 'Corno de Carneiro', 'Do Ervedal', 'Tarreste'], 'as de interesse para a horta');
// Filtro por espécie.
assert.equal(J(filtrar(D.variedades, 'todas')).length, 8);
assert.deepEqual(J(filtrar(D.variedades, 'Milho')).map((v) => v.nome), ['Da Terra', 'Santana']);
assert.deepEqual(J(filtrar(D.variedades, 'Feijão')).map((v) => v.nome), ['Corno de Carneiro', 'Tarreste']);
assert.equal(J(filtrar(D.variedades, 'trigo-mole')).length, 1, 'sem acentos nem maiúsculas');

// Fontes: https, e cada uma é usada na página.
for (const [id, f] of Object.entries(D.fontes)) {
  assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en && f.usa_pt && f.usa_en, `fonte ${id}`);
  assert(js.includes(`S("${id}")`), `fonte sem uso: ${id}`);
}
// As afirmações legais citam os diplomas como a DGAV os cita.
for (const frase of ['Decreto-Lei n.º 257/2009', 'Decreto-Lei n.º 54/2011', 'Decreto-Lei n.º 42/2017', '2018/848', '1 de janeiro de 2022', '10 000']) assert(js.includes(frase), `falta ${frase}`);
assert(!/%\s*das sementes|0,5 ?%/.test(js), 'sem quotas que não confirmámos');

// A página: âncoras, «Voltar» só na barra fixa, hub, SEO, glossário.
for (const id of ['sumario', 'variedades', 'onde', 'biologico', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="sementes-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(hub.includes('href="/calendario/sementes.html"'), 'o hub liga à página');
assert(cfg.paginas['calendario/sementes.html']?.desc && existsSync('images/partilha/calendario-sementes.jpg'));
for (const id of ['variedade-conservacao', 'cnv', 'banco-germoplasma', 'semente-biologica']) assert(G.termos.some((t) => t.id === id), `glossário: ${id}`);
assert(js.includes('/glossario.html#variedade-conservacao'));
assert(js.includes('/calendario/apoios.html') && js.includes('/calendario/planeador-horta.html') && js.includes('/calendario/circuitos-curtos.html'), 'ligações às ferramentas');
assert(!/localStorage|sessionStorage|navigator\.geolocation|fetch\("https/.test(js), 'sem serviços externos nem dados guardados');
assert(/sementes\.js\?v=\d+/.test(html) && /sementes\.css\?v=\d+/.test(html));
console.log('sementes: ok');
