import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Página «O meu terreno» (calendario/meu-terreno.html): cálculo geográfico, classes oficiais, privacidade e ligações.
const html = readFileSync('calendario/meu-terreno.html', 'utf8');
const js = readFileSync('assets/js/pages/meu-terreno.js', 'utf8');
const hub = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
const priv = readFileSync('privacidade.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));

const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const T = win.BioCulturaTerreno;
assert(T, 'o script exporta BioCulturaTerreno para os testes');

// Área: um quadrado de 100 m × 100 m a 38,5° N tem ≈ 10 000 m².
const dLat = 100 / 111195, dLon = 100 / (111195 * Math.cos((38.5 * Math.PI) / 180));
const quad = [[38.5, -8], [38.5 + dLat, -8], [38.5 + dLat, -8 + dLon], [38.5, -8 + dLon]];
assert(Math.abs(T.areaAnelM2(quad) - 10000) < 80, 'área do quadrado de 100 m');
// Com um buraco de 50 m × 50 m sobram ≈ 7 500 m².
const dLat2 = 50 / 111195, dLon2 = 50 / (111195 * Math.cos((38.5 * Math.PI) / 180));
const buraco = [[38.5 + dLat / 4, -8 + dLon / 4], [38.5 + dLat / 4 + dLat2, -8 + dLon / 4], [38.5 + dLat / 4 + dLat2, -8 + dLon / 4 + dLon2], [38.5 + dLat / 4, -8 + dLon / 4 + dLon2]];
assert(Math.abs(T.areaPoligonoM2([quad, buraco]) - 7500) < 80, 'área com buraco');
assert.equal(T.areaAnelM2([[38, -8], [38, -8.1]]), 0);

// Centroide e ponto dentro do polígono (com buraco).
const c = T.centroide(quad);
assert(Math.abs(c[0] - (38.5 + dLat / 2)) < 1e-5 && Math.abs(c[1] - (-8 + dLon / 2)) < 1e-5, 'centroide do quadrado');
assert(T.pontoNoPoligono(38.5 + dLat * 0.9, -8 + dLon * 0.9, [quad, buraco]), 'ponto dentro, fora do buraco');
assert(!T.pontoNoPoligono(38.5 + dLat * 0.5, -8 + dLon * 0.5, [quad, buraco]), 'ponto dentro do buraco');
assert(!T.pontoNoPoligono(39, -8, [quad]), 'ponto fora');

// Textura USDA: pontos de referência conhecidos e cobertura total do triângulo.
assert.equal(T.texturaUSDA(90, 5), 'sand');
assert.equal(T.texturaUSDA(85, 7), 'loamy_sand');
assert.equal(T.texturaUSDA(65, 10), 'sandy_loam');
assert.equal(T.texturaUSDA(40, 20), 'loam');
assert.equal(T.texturaUSDA(20, 15), 'silt_loam');
assert.equal(T.texturaUSDA(5, 5), 'silt');
assert.equal(T.texturaUSDA(60, 25), 'sandy_clay_loam');
assert.equal(T.texturaUSDA(33, 33), 'clay_loam');
assert.equal(T.texturaUSDA(10, 33), 'silty_clay_loam');
assert.equal(T.texturaUSDA(50, 40), 'sandy_clay');
assert.equal(T.texturaUSDA(10, 45), 'silty_clay');
assert.equal(T.texturaUSDA(20, 60), 'clay');
for (let sand = 0; sand <= 100; sand++) for (let clay = 0; clay <= 100 - sand; clay++) {
  const k = T.texturaUSDA(sand, clay);
  assert(k && T.TEXTURAS[k], `sem classe de textura para areia ${sand}% e argila ${clay}%`);
}
// A textura de 0–30 cm pondera as camadas por 5, 10 e 15 cm.
const t030 = T.texturaDe030([{ sand: 60, clay: 10 }, { sand: 60, clay: 10 }, { sand: 70, clay: 10 }]);
assert(Math.abs(t030.sand - (60 * 5 + 60 * 10 + 70 * 15) / 30) < 1e-9 && t030.classe);

// Balanço da água, mínima mais baixa e distância.
assert.equal(JSON.stringify(T.balancoAgua([1, 2, null], [0.5, 0.5, 1])), JSON.stringify({ chuva: 3, et0: 2, saldo: 1 }));
assert.equal(JSON.stringify(T.minimaMaisBaixa([8, 3.5, null, 4])), JSON.stringify({ min: 3.5, idx: 1 }));
assert.equal(JSON.stringify(T.minimaMaisBaixa([])), JSON.stringify({ min: null, idx: -1 }));
assert(Math.abs(T.distanciaKm([38.7223, -9.1393], [41.1579, -8.6291]) - 274) < 8, 'Lisboa–Porto ≈ 274 km');

// Classes oficiais: as 36 siglas do quadro 4.1 do Manual de Conceitos e Regras de Delimitação do IFAP (fev. 2021), todas com PT e EN.
const SIGLAS = ['CTP-CA', 'TCR-FL', 'PPE-PP', 'PPE-QU', 'PPE-PM', 'PPE-OL', 'PPE-MX', 'PPE-AR', 'PPE-PL', 'POM-PM', 'VIN-VN', 'OLI-OL', 'MXP-MX', 'OUT-PE', 'SOB-CO', 'CAB-CP', 'CPR-OA',
  'FFL-FL', 'SAR-FL', 'FBQ-FL', 'ACE-ON', 'ZPC-ON', 'GRP-FL', 'SAS-AS', 'VIA-AS', 'IMP-AI', 'MAG-ON', 'ZPH-ON', 'OUT-ON', 'OPC-ON', 'CSS-ON', 'ARV-EC', 'FBQ-EP', 'GRP-EP', 'LAG-EL', 'ORI-EL', 'SCV-EL', 'TLD-EL'];
for (const s of SIGLAS) assert(T.OCUPACAO[s] && T.OCUPACAO[s][0] && T.OCUPACAO[s][1], `ocupação sem nome: ${s}`);
assert.equal(Object.keys(T.OCUPACAO).length, SIGLAS.length, 'sem siglas inventadas');
assert.equal(T.FOGO.length, 6, 'perigosidade: classe 0 e cinco classes');

// Privacidade: o beneficiário e o número da parcela nunca aparecem nem são guardados; só se pedem coordenadas aos serviços listados na página de privacidade.
assert(!/BENEF/.test(js), 'o script não lê o beneficiário');
assert(!/NPARCELA/.test(js.replace(/p\.NPARCELA|f\.properties && f\.properties\.NPARCELA/g, '')), 'NPARCELA só serve para juntar as subparcelas');
const guardar = js.match(/function guardarAtual[\s\S]*?\n  }\n/)?.[0] || '';
assert(guardar.length > 100 && !/\.id\b|NPARCELA|BENEF/.test(guardar), 'o terreno guardado leva só o nome e as coordenadas, nunca o id da parcela');
const hosts = [...new Set([...js.matchAll(/https:\/\/([a-z0-9.-]+)\//g)].map((m) => m[1]))].filter((h) => !/openstreetmap\.org$|leafletjs|dgterritorio\.gov\.pt$/.test(h) || /^tile\.|^cartografia\./.test(h));
for (const h of hosts) assert(/ifap|isric|open-meteo|openstreetmap|dgterritorio/.test(h), `anfitrião não declarado: ${h}`);
for (const nome of ['OpenStreetMap', 'IFAP', 'DGT', 'ISRIC', 'Open-Meteo']) {
  assert(priv.includes(nome), `privacidade não menciona ${nome}`);
}
assert(priv.includes('<strong>O meu terreno</strong>') && priv.includes('<strong>My plot</strong>'), 'privacidade PT e EN descrevem o mapa');

// Página, hub, SEO e ficheiros do mapa.
assert(html.includes('id="relatorio-terreno"') && html.includes('data-hero-theme="calendar"'));
for (const id of ['mapa', 'ficha', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="terreno-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(!/class="hub-back"[^>]*>[\s\S]{0,80}<section class="hero/.test(html), '«Voltar» nunca no topo');
assert(hub.includes('href="/calendario/meu-terreno.html"') && hub.includes('href="#terreno"'), 'o hub liga à página');
assert(cfg.paginas['calendario/meu-terreno.html']?.desc, 'config/paginas.json tem a página');
assert(existsSync('images/partilha/calendario-meu-terreno.jpg'), 'imagem de partilha');
for (const f of ['assets/vendor/leaflet/leaflet.js', 'assets/vendor/leaflet/leaflet.css', 'assets/vendor/leaflet/LICENSE.txt']) assert(existsSync(f), f);
assert(/Leaflet 1\.9\.4/.test(readFileSync('assets/vendor/leaflet/leaflet.js', 'utf8').slice(0, 300)));
for (const ref of [/meu-terreno\.js\?v=\d+/, /meu-terreno\.css\?v=\d+/, /leaflet\.js\?v=\d+/, /leaflet\.css\?v=\d+/]) assert(ref.test(html), `versão em falta: ${ref}`);
assert(/class="seg" role="group"[^`]*id="t-parcelas"/.test(js) || js.includes('id="t-parcelas"'), 'botão das parcelas');
console.log('meu-terreno: ok');
