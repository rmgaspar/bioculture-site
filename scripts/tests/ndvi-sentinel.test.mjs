import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// NDVI do terreno (assets/js/ndvi-sentinel.js): projeção UTM, janela na grelha de 10 m e cálculo com a máscara de nuvens.
const js = readFileSync('assets/js/ndvi-sentinel.js', 'utf8');
const win = {};
vm.runInNewContext(js, { window: win });
const U = win.BioCulturaNDVI;
assert(U, 'o módulo exporta BioCulturaNDVI');

// UTM: o meridiano central a 45° N dá 4 982 950,40 m (0,9996 × o arco de meridiano); o equador no meridiano central dá N = 0.
const p = U.paraUtm(45, 9, 32632);
assert(Math.abs(p[0] - 500000) < 0.001 && Math.abs(p[1] - 4982950.4) < 0.05, 'UTM a 45° N no meridiano central');
assert.equal(Math.round(U.paraUtm(0, 3, 32631)[1]), 0);
// Ida e volta em Portugal continental (29 N), Açores (26 N), Madeira (28 N) e hemisfério sul (34 S).
for (const [lat, lon, epsg] of [[38.55, -7.948, 32629], [41.15, -8.61, 32629], [37.74, -25.67, 26 + 32600], [32.65, -16.91, 28 + 32600], [-33.9, 18.4, 34 + 32700]]) {
  const [E, N] = U.paraUtm(lat, lon, epsg), [la, lo] = U.deUtm(E, N, epsg);
  assert(Math.abs(la - lat) < 1e-7 && Math.abs(lo - lon) < 1e-7, `ida e volta ${lat},${lon}`);
}
// Uma cena Sentinel-2 29SNC tem a origem em E 499 980, N 4 300 020 e cobre 109,8 km: o terreno do exemplo cai dentro dela.
const [E0, N0] = U.paraUtm(38.55, -7.948, 32629);
assert(E0 > 499980 && E0 < 499980 + 109800 && N0 < 4300020 && N0 > 4300020 - 109800, 'o exemplo cai na cena 29SNC');

// Janela: alinhada a pixéis pares (a máscara SCL tem 20 m) e nula se sair da cena.
const tr = [10, 0, 499980, 0, -10, 4300020], shape = [10980, 10980];
const d = 0.0007, pol = [[[38.55 - d, -7.948 - d], [38.55 + d, -7.948 - d], [38.55 + d, -7.948 + d], [38.55 - d, -7.948 + d]]];
const pu = U.polsParaUtm([pol], 32629), jn = U.janela(pu, tr, shape);
assert(jn && jn.x0 % 2 === 0 && jn.y0 % 2 === 0 && jn.w % 2 === 0 && jn.h % 2 === 0, 'janela alinhada a 20 m');
assert(jn.w >= 14 && jn.w <= 24, 'um terreno de ~150 m ocupa ~15–20 pixéis');
assert.equal(U.janela(U.polsParaUtm([[[[38.55, -7.0], [38.56, -7.0], [38.56, -6.99]]]], 32629), tr, shape), null, 'fora da cena');
assert(U.dentroDe(E0, N0, pu) && !U.dentroDe(E0 + 5000, N0, pu), 'ponto dentro e fora');

// Rampa de cores: extremos e valor intermédio.
assert.deepEqual([...U.cor(-0.5)], [...U.RAMPA[0][1]]);
assert.deepEqual([...U.cor(0.95)], [...U.RAMPA[U.RAMPA.length - 1][1]]);
assert(U.cor(0.7)[1] < U.cor(0.2)[1] && U.cor(0.7)[0] < U.cor(0.2)[0], 'mais verde, menos vermelho');

// Cálculo com leituras simuladas: vermelho 1000, infravermelho 3000 → NDVI 0,5 (sem desvio nos valores); nuvens e sombras ficam de fora.
const W = jn.w, H = jn.h, N = W * H;
const imagemDe = (valorDe) => ({ readRasters: async (o) => [Float32Array.from({ length: o.width * o.height }, (_, k) => valorDe(k, o))] });
let cobertura = 0.25; // fração de pixéis com nuvem (SCL 9)
const sclDe = (k) => (k % 4 < cobertura * 4 ? 9 : 4);
win.GeoTIFF = { fromUrl: async (url) => ({ getImage: async () => imagemDe((k, o) => (/SCL/.test(url) ? sclDe(k) : /B04/.test(url) ? 1000 : 3000)) }) };
const cena = { id: 'x', data: '2026-10-15', nuvens: 5, epsg: 32629, transform: tr, shape, escala: 0.0001, href: { red: 'u/B04.tif', nir: 'u/B08.tif', scl: 'u/SCL.tif' } };
const r = await U.lerCena(cena, [pol], 0.5);
assert(r.ndvi && Math.abs(r.media - 0.5) < 1e-6, 'NDVI = (3000 − 1000) / (3000 + 1000) = 0,5');
assert(Math.abs(r.valido - 0.75) < 0.1, 'três quartos dos pixéis com céu limpo');
assert(r.n < N && r.n > 0, 'só pixéis dentro do contorno');
cobertura = 1; // tudo nuvem: não lê as bandas e devolve só a fração limpa
const nublada = await U.lerCena(cena, [pol], 0.5);
assert(nublada.valido === 0 && !nublada.ndvi, 'imagem nublada não dá NDVI');
// A escala vem do catálogo, o desvio não se aplica (os ficheiros já não o trazem).
assert(!/cena\.desvio|\.offset/.test(js.replace(/\/\*[\s\S]*?\*\//g, '')), 'não se aplica o desvio de −0,1 do catálogo');
console.log('ndvi-sentinel: ok');
