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
const { filtrar, especies, filtrarGuardar, distancia, durabilidade } = win.BioCulturaSementes;
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

// Quadro de guardar semente (UC Master Gardeners): 19 grupos, distâncias convertidas de pés e milhas, durabilidade em anos.
const Q = D.guardar;
assert.equal(Q.length, 19);
assert.equal(new Set(Q.map((c) => c.id)).size, 19);
for (const c of Q) {
  for (const k of ['id', 'pt', 'en', 'cient']) assert(c[k], `${c.id}: falta ${k}`);
  assert(['A', 'B'].includes(c.ciclo) && ['self', 'cross', 'both'].includes(c.polin), `${c.id}: ciclo/polinização`);
  assert(c.polin === 'self' ? c.agente === null : ['vento', 'insetos'].includes(c.agente), `${c.id}: agente`);
  assert(c.iso_m.length === 2 && c.iso_m[0] <= c.iso_m[1] && c.anos.length === 2 && c.anos[0] <= c.anos[1], `${c.id}: intervalos`);
  assert(!!c.nota_pt === !!c.nota_en, `${c.id}: notas PT/EN`);
}
const q = (id) => Q.find((c) => c.id === id);
// Valores do quadro: pés e milhas em metros (100' ≈ 30 m, 50' ≈ 15 m, 1500' ≈ 450 m, ½ milha ≈ 800 m).
assert.deepEqual(q('feijao').iso_m, [30, 30]); assert.deepEqual(q('alface').iso_m, [15, 15]); assert.deepEqual(q('ervilha').iso_m, [15, 15]);
assert.deepEqual(q('tomate').iso_m, [8, 30]); assert.deepEqual(q('tomate').anos, [5, 10]);
assert.deepEqual(q('cenoura').iso_m, [450, 450]); assert.deepEqual(q('milho').iso_m, [800, 800]); assert.deepEqual(q('pepino').anos, [5, 10]);
assert.deepEqual(q('cebola').anos, [1, 1]); assert.deepEqual(q('pimento').iso_m, [150, 150]);
assert.equal(q('pimento').polin, 'both');
assert.deepEqual(Q.filter((c) => c.ciclo === 'B').map((c) => c.id), ['beterraba-acelga', 'brassicas', 'cenoura', 'aipo', 'alho-frances', 'cebola'], 'as bienais do quadro');
assert.deepEqual(Q.filter((c) => c.polin === 'self').map((c) => c.id), ['feijao', 'beringela', 'alface', 'ervilha', 'tomate'], 'as autofecundadas');
assert(Q.filter((c) => c.polin === 'self').every((c) => c.facil === 'facil'), 'todas as autofecundadas são fáceis');
assert.equal(J(filtrarGuardar(Q, 'todas')).length, 19); assert.equal(J(filtrarGuardar(Q, 'self')).length, 5);
assert.equal(J(filtrarGuardar(Q, 'cross')).length, 14); assert.equal(J(filtrarGuardar(Q, 'bienal')).length, 6);
assert.equal(distancia([30, 30]), '≈ 30 m'); assert.equal(distancia([8, 30]), '≈ 8 a 30 m');
assert.equal(distancia([8, 30], true), '≈ 8 to 30 m'); assert.equal(durabilidade([2, 3]), '2 a 3'); assert.equal(durabilidade([2, 3], true), '2 to 3'); assert.equal(durabilidade([1, 1]), '1');

// Fontes: https, e cada uma é usada na página.
for (const [id, f] of Object.entries(D.fontes)) {
  assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en && f.usa_pt && f.usa_en, `fonte ${id}`);
  assert(js.includes(`S("${id}")`), `fonte sem uso: ${id}`);
}
// As afirmações legais citam os diplomas como a DGAV os cita.
for (const frase of ['Decreto-Lei n.º 257/2009', 'Decreto-Lei n.º 54/2011', 'Decreto-Lei n.º 42/2017', '2018/848', '1 de janeiro de 2022', '10 000']) assert(js.includes(frase), `falta ${frase}`);
assert(!/%\s*das sementes|0,5 ?%/.test(js), 'sem quotas que não confirmámos');

// A página: âncoras, «Voltar» só na barra fixa, hub, SEO, glossário.
for (const id of ['sumario', 'variedades', 'onde', 'guardar', 'biologico', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="sementes-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(hub.includes('href="/calendario/sementes.html"'), 'o hub liga à página');
assert(cfg.paginas['calendario/sementes.html']?.desc && existsSync('images/partilha/calendario-sementes.jpg'));
for (const id of ['variedade-conservacao', 'cnv', 'banco-germoplasma', 'semente-biologica', 'polinizacao-cruzada']) assert(G.termos.some((t) => t.id === id), `glossário: ${id}`);
assert(js.includes('/glossario.html#variedade-conservacao'));
assert(js.includes('/calendario/apoios.html') && js.includes('/calendario/planeador-horta.html') && js.includes('/calendario/circuitos-curtos.html'), 'ligações às ferramentas');
assert(!/localStorage|sessionStorage|navigator\.geolocation|fetch\("https/.test(js), 'sem serviços externos nem dados guardados');
assert(/sementes\.js\?v=\d+/.test(html) && /sementes\.css\?v=\d+/.test(html));
assert(readFileSync('assets/css/pages/sementes.css', 'utf8').includes('tr.sm-foco'), 'a linha ligada pelas fichas fica destacada');
// Ligação ao Planeador e às fichas: cada cultura aponta para um só grupo do quadro e existe no Planeador.
const P = JSON.parse(readFileSync('data/planeador-horta.json', 'utf8'));
const planeavel = new Set(P.culturas.map((c) => c.id));
const mapeadas = Q.flatMap((c) => c.culturas || []);
assert.equal(mapeadas.length, 22); assert.equal(new Set(mapeadas).size, 22, 'cada cultura só num grupo');
for (const id of mapeadas) assert(planeavel.has(id), `cultura que o Planeador não tem: ${id}`);
for (const id of ['melancia', 'repolho', 'nabo', 'alho', 'batata', 'fava', 'feijao-frade', 'pimenta-malagueta']) assert(!mapeadas.includes(id), `${id} não está no quadro da fonte`);
const w2 = {}; vm.runInNewContext(readFileSync('assets/js/sementes-resumo.js', 'utf8'), { window: w2 });
const { porCultura, resumo } = w2.BioCulturaSementesResumo;
assert.equal(porCultura(D, 'melancia'), null); assert.equal(porCultura(D, 'tomate').id, 'tomate'); assert.equal(porCultura(D, 'curgete').id, 'abobora-curgete');
assert.deepEqual(J(resumo(q('tomate'), false)), ['Autofecundada, fácil de guardar', 'isolar ≈ 8 a 30 m', 'a semente dura 5 a 10 anos']);
assert.deepEqual(J(resumo(q('cenoura'), true)), ['Cross-pollinated (insects), easy, but it crosses', 'isolate ≈ 450 m', 'seed lasts 2 to 3 years', 'biennial: seed in the 2nd year']);
assert.deepEqual(J(resumo(q('cebola'), false)).slice(2), ['a semente dura 1 ano', 'bienal: dá semente no 2.º ano'], 'singular em «1 ano»');
const plan = readFileSync('assets/js/pages/planeador-horta.js', 'utf8'), planHtml = readFileSync('calendario/planeador-horta.html', 'utf8');
const ficha = readFileSync('assets/js/pages/calendario-horticola-detalhe-2.js', 'utf8'), fichaHtml = readFileSync('calendario/horticola-detalhe.html', 'utf8');
for (const [src, pg] of [[plan, planHtml], [ficha, fichaHtml]]) { assert(src.includes('/data/sementes.json?v=') && src.includes('BioCulturaSementesResumo') && src.includes('sementes.html')); assert(/sementes-resumo\.js\?v=\d+/.test(pg)); }
assert(js.includes('id="g-${c.id}"'), 'a linha do quadro tem a âncora que as fichas usam');
// Fotografias ao lado do texto: ficheiros existentes, licença aberta e crédito com ligação à ficha da Commons.
for (const f of ['variedade-de-sementes', 'espigueiros-soajo', 'sementes-guardadas', 'plantas-jovens']) assert(existsSync(`images/sementes/${f}.webp`) && js.includes(`src: "${f}"`), `foto ${f}`);
assert((js.match(/commons\.wikimedia\.org\/wiki\/File:/g) || []).length >= 1 && /CC BY-SA/.test(js) && js.includes('data-no-signature'), 'crédito e licença nas fotos');
assert((js.match(/\$\{duo\(/g) || []).length === 4, 'quatro secções com fotografia');
// Círculo do topo: fotografia de feijões num banco de sementes (Neil Palmer, CC BY-SA 2.0), com crédito visível.
assert(existsSync('images/sementes/hero-feijoes.webp') && readFileSync('assets/css/pages/sementes.css', 'utf8').includes('/images/sementes/hero-feijoes.webp'));
assert(html.includes('Neil Palmer') && html.includes('Four_bean_varieties_in_a_gene_bank.jpg') && html.includes('CC BY-SA 2.0'), 'crédito da foto do topo');
console.log('sementes: ok');
