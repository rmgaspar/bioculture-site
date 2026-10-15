import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Página «Aviação» (energia/aviacao.html): dados com fontes, fatores coerentes, cálculo de distância e séries do Eurostat.
const D = JSON.parse(readFileSync('data/aviacao.json', 'utf8'));
const PT = JSON.parse(readFileSync('data/aviacao-portugal.json', 'utf8'));
const AE = JSON.parse(readFileSync('data/aeroportos.json', 'utf8'));
const html = readFileSync('energia/aviacao.html', 'utf8');
const js = readFileSync('assets/js/pages/energia-aviacao.js', 'utf8');

// O tradutor do inglês passa também pelos textos dos ficheiros de dados: a página procura classes e fontes pela posição.
assert.deepEqual(D.fatores.classes.map((c) => c.id), ['media', 'economica', 'premium', 'executiva', 'primeira']);
assert.deepEqual(D.fontes.map((f) => f.id), ['owid', 'lee2021', 'desnz', 'icao', 'eurostat', 'ourairports']);
for (const f of D.fontes) {
  assert(/^https:\/\//.test(f.url), `${f.id}: sem ligação`);
  for (const k of ['nome', 'nome_en', 'usa_pt', 'usa_en']) assert(f[k], `${f.id}: falta ${k}`);
}
for (const c of D.fatores.classes) {
  assert(c.total > c.direto && c.direto > 0, `${c.id}: fatores incoerentes`);
  // A DESNZ aplica +70% ao CO2 para os efeitos não-CO2 (as outras parcelas são mínimas).
  assert(Math.abs(c.total / c.direto - D.fatores.multiplicador_nao_co2) < 0.04, `${c.id}: total/direto fora de 1,7`);
  assert(c.pt && c.en);
}
for (const m of D.mundo) for (const k of ['valor', 'unidade', 'pt', 'en', 'nota_pt', 'nota_en', 'fonte']) assert(m[k], `mundo/${m.id}: falta ${k}`);
for (const m of D.mundo) assert(D.fontes.some((f) => f.id === m.fonte), `mundo/${m.id}: fonte desconhecida`);

// Aeroportos: IATA únicos, coordenadas válidas, rotas de exemplo existentes.
const iata = AE.aeroportos.map((a) => a[0]);
assert(new Set(iata).size === iata.length && iata.length > 3500);
for (const a of AE.aeroportos) assert(/^[A-Z]{3}$/.test(a[0]) && Math.abs(a[5]) <= 90 && Math.abs(a[6]) <= 180, `aeroporto inválido: ${a[0]}`);
for (const [a, b] of D.rotas) assert(iata.includes(a) && iata.includes(b), `rota com aeroporto em falta: ${a}-${b}`);

// Cálculo: distância em círculo máximo (valores de referência conhecidos) e fatores.
const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const { gcd, viagem } = win.BioCulturaAviacao;
const por = Object.fromEntries(AE.aeroportos.map((a) => [a[0], [a[5], a[6]]]));
const km = (a, b) => gcd(por[a], por[b]);
assert(Math.abs(km('LIS', 'LHR') - 1564) < 25, 'Lisboa–Londres ≈ 1 564 km');
assert(Math.abs(km('LIS', 'JFK') - 5404) < 40, 'Lisboa–Nova Iorque ≈ 5 400 km');
assert(Math.abs(km('LIS', 'OPO') - 274) < 8, 'Lisboa–Porto ≈ 275 km');
assert.equal(km('LIS', 'LIS'), 0);
const eco = D.fatores.classes[1], v = viagem(1000, eco);
assert(Math.abs(v.direto - 64.49) < 0.01 && Math.abs(v.total - 109.16) < 0.01);

// Série do Eurostat: 1995–2024 sem falhas, e a aviação cabe sempre na economia mais famílias.
const S = PT.series, anos = Object.keys(S.transporte_aereo).map(Number).sort((a, b) => a - b);
assert.equal(anos[0], 1995); assert(anos.at(-1) >= 2024); assert.equal(anos.length, anos.at(-1) - 1995 + 1);
for (const y of anos) assert(S.transporte_aereo[y] > 0 && S.transporte_aereo[y] < S.economia_familias[y], `série incoerente em ${y}`);
assert(S.transporte_aereo[2020] < S.transporte_aereo[2019] / 2, 'a pandemia tem de aparecer em 2020');

// Página: carrega os scripts, a foto do cabeçalho e os estilos; e está registada para partilha.
for (const t of ['biocultura-graficos.js', 'energia-aviacao.js', 'data-pagina="aviacao"', 'energia-aviacao.css', 'relatorio-dados.css', 'data-hero-theme="aviation"']) assert(html.includes(t), `energia/aviacao.html: falta ${t}`);
// Fotografias: «hero» é o espaço do topo; as restantes chaves são secções desenhadas por energia-aviacao.js.
const fotos = JSON.parse(readFileSync('data/fotos-capitulos.json', 'utf8')).aviacao;
assert(html.includes('data-foto-slot="hero"'));
for (const id of Object.keys(fotos).filter((k) => k !== 'hero')) assert(js.includes(`<section id="${id}">`), `aviacao: a secção ${id} não existe`);
assert(existsSync('images/aviacao/hero.webp') && existsSync('images/partilha/energia-aviacao.jpg'));
// As imagens são de terceiros (NASA): o runtime não lhes pode pôr a marca bioCulture.
assert(/class="observatory-visual"\s+data-no-signature/.test(html), 'o topo da página leva data-no-signature');
assert(/class="hub-thumb"\s+data-no-signature\s+style="[^"]*aviacao\/miniatura/.test(readFileSync('observatorio/pressoes-humanas.html', 'utf8')), 'o cartão do hub leva data-no-signature');
assert(JSON.parse(readFileSync('config/paginas.json', 'utf8')).paginas['energia/aviacao.html']);
assert(readFileSync('observatorio/pressoes-humanas.html', 'utf8').includes('/energia/aviacao.html'), 'o hub dos vetores liga à página');
console.log('Aviação validada: fatores, fontes, aeroportos, cálculo de distância e série de Portugal.');
