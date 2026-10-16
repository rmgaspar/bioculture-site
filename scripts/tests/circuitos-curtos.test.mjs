import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Circuitos curtos (calendario/circuitos-curtos.html): dados do guia AproximaR, cálculo do preço e ligações.
const D = JSON.parse(readFileSync('data/circuitos-curtos.json', 'utf8'));
const html = readFileSync('calendario/circuitos-curtos.html', 'utf8');
const js = readFileSync('assets/js/pages/circuitos-curtos.js', 'utf8');
const hub = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));
const G = JSON.parse(readFileSync('data/glossario.json', 'utf8'));

const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const { num, precoVenda, diaDeVenda, filtrar } = win.BioCulturaCircuitos;
const J = (x) => JSON.parse(JSON.stringify(x));

// Leitura de números: vírgula decimal, lixo e negativos.
assert.equal(num('2,50'), 2.5);
assert.equal(num(' 12.5 '), 12.5);
assert.equal(num('abc'), 0);
assert.equal(num('-3'), 0);
assert.equal(num(''), 0);

// Preço mínimo: (produção + mão de obra + comercialização) / kg, mais a margem.
const p = J(precoVenda({ kg: 500, producao: 400, maoDeObra: 600, venda: 150, margem: 20 }));
assert.equal(p.custoTotal, 1150);
assert(Math.abs(p.custoKg - 2.3) < 1e-9 && Math.abs(p.precoKg - 2.76) < 1e-9 && Math.abs(p.vendaKg - 0.3) < 1e-9 && Math.abs(p.margemKg - 0.46) < 1e-9);
assert.equal(precoVenda({ kg: 0, producao: 100 }), null, 'sem quantidade não há preço');
assert.equal(J(precoVenda({ kg: 10, producao: 20 })).precoKg, 2, 'sem margem o preço é o custo');
// Dia de venda: 40 kg a 2,50 € = 100 €; menos 25 € de custos = 75 €; em 7 h dá ≈ 10,71 €/h.
const d = J(diaDeVenda({ kg: 40, preco: '2,50', horas: 7, custos: 25 }));
assert.equal(d.faturacao, 100); assert.equal(d.liquido, 75); assert(Math.abs(d.porHora - 75 / 7) < 1e-9);
assert.equal(diaDeVenda({ kg: 10, preco: 1, horas: 0, custos: 0 }).porHora, null, 'sem horas não há valor por hora');
assert(diaDeVenda({ kg: 1, preco: 1, horas: 2, custos: 10 }).porHora < 0, 'um dia que não paga os custos dá negativo');

// Dados: oito modalidades, PT e EN com o mesmo número de itens, fontes e etiquetas conhecidas.
const objs = D.objetivos.map((o) => o.id);
assert.equal(D.modalidades.length, 8);
assert.deepEqual(D.modalidades.map((m) => m.id), ['exploracao', 'colha', 'mercado', 'cabaz', 'restauracao', 'coletiva', 'loja', 'internet']);
for (const m of D.modalidades) {
  for (const k of ['pt', 'en', 'r_pt', 'r_en', 'sec']) assert(m[k], `${m.id}: falta ${k}`);
  for (const k of ['req', 'v', 'i']) { assert(m[k + '_pt'].length >= 3 && m[k + '_pt'].length === m[k + '_en'].length, `${m.id}: ${k} PT/EN diferentes`); }
  assert(m.tags.length >= 1 && m.tags.every((t) => objs.includes(t)), `${m.id}: etiquetas`);
  assert(D.fontes[m.fonte], `${m.id}: fonte`);
}
for (const [id, f] of Object.entries(D.fontes)) assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en && f.usa_pt && f.usa_en, `fonte ${id}`);
for (const o of D.objetivos) assert(D.modalidades.some((m) => m.tags.includes(o.id)), `objetivo sem modalidade: ${o.id}`);
assert(!/€/.test(JSON.stringify(D.modalidades)), 'sem valores em € nas modalidades: o guia não os dá');
// As etiquetas assentam em afirmações do guia.
const ids = (o) => J(filtrar(D.modalidades, o)).map((m) => m.id);
assert.equal(ids('todos').length, 8);
assert(ids('rendimento-previsivel').includes('cabaz') && ids('rendimento-previsivel').includes('coletiva'));
assert.deepEqual(ids('juntar-produtores'), ['loja']);
assert.deepEqual(ids('margem-maior'), ['exploracao']);
assert(ids('clientela-vasta').includes('internet') && !ids('pouco-investimento').includes('loja'), 'a loja de produtores pede investimento elevado');

// Números da lei de pequenas quantidades, como no texto da Portaria 74/2014 e na DGAV.
for (const frase of ['350 ovos', '50 galinhas', '80 litros', 'Portaria n.º 74/2014', 'Decreto-Lei n.º 85/2015', 'Decreto-Lei n.º 10/2015', 'Decreto-Lei n.º 73/2015', 'Decreto-Lei n.º 26/2016', '1169/2011', '543/2011', '852/2004', '2018/848', 'Decreto-Lei n.º 137/2026', '335/2026/1']) assert(js.includes(frase), `falta ${frase}`);
assert(!/\b(30|60|65|100)\s*(kg|litros)\b/.test(js.replace(/80 litros/g, '').replace(/80 litres/g, '')), 'sem outras quantidades inventadas');

// A página: âncoras, hub, SEO, glossário, privacidade.
for (const id of ['sumario', 'caminhos', 'legal', 'preco', 'comprar', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="circuitos-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(hub.includes('href="/calendario/circuitos-curtos.html"') && hub.includes('href="#ferramentas"'));
assert(cfg.paginas['calendario/circuitos-curtos.html']?.desc && existsSync('images/partilha/calendario-circuitos-curtos.jpg'));
for (const id of ['circuito-curto', 'cabaz', 'mercado-local-produtores']) assert(G.termos.some((t) => t.id === id), `glossário: ${id}`);
assert(js.includes('/glossario.html#circuito-curto'));
assert(!/https?:\/\/[^'"`\s]+\.json/.test(js) && !/localStorage|sessionStorage|navigator\.geolocation|fetch\("https/.test(js), 'sem serviços externos nem dados guardados');
assert(/circuitos-curtos\.js\?v=\d+/.test(html) && /circuitos-curtos\.css\?v=\d+/.test(html));
console.log('circuitos-curtos: ok');
