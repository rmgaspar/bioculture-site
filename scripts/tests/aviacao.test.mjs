import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Página «Aviação» (energia/aviacao.html): dados com fontes, fatores coerentes, cálculo de distância e séries do Eurostat.
const D = JSON.parse(readFileSync('data/aviacao.json', 'utf8'));
const PT = JSON.parse(readFileSync('data/aviacao-portugal.json', 'utf8'));
const AE = JSON.parse(readFileSync('data/aeroportos.json', 'utf8'));
const html = readFileSync('energia/aviacao.html', 'utf8');
const js = readFileSync('assets/js/pages/energia-aviacao.js', 'utf8');
const hubHtml = readFileSync('observatorio/pressoes-humanas.html', 'utf8');

// O tradutor do inglês passa também pelos textos dos ficheiros de dados: a página procura classes e fontes pela posição.
assert.deepEqual(D.fatores.classes.map((c) => c.id), ['media', 'economica', 'premium', 'executiva', 'primeira']);
assert.deepEqual(D.fontes.map((f) => f.id), ['owid', 'lee2021', 'desnz', 'icao', 'eurostat', 'ourairports', 'eurostat-rotas', 'eurostat-aquecimento', 'gistemp', 'bm-icao', 'owid-quota', 'eurostat-combustivel', 'apa-ruido-lisboa', 'apa-ruido-porto', 'easa-eaer']);
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

// Voos reais por rota (Eurostat avia_par_pt): rotas coerentes, combustível e aquecimento da mesma fonte oficial (DESNZ/Eurostat).
const RT = JSON.parse(readFileSync('data/aviacao-rotas-portugal.json', 'utf8'));
assert(RT.meta.ano >= 2023 && RT.rotas.length > 200, 'rotas de Portugal');
for (const r of RT.rotas) {
  assert(r.km > 20 && r.km < 15000 && r.voos > 0 && r.passageiros > 0 && r.lugares > 0 && r.passageiros / r.lugares < 1.3, `rota incoerente: ${r.a}-${r.b}`);
  const porVoo = r.passageiros / r.voos; assert(porVoo > 5 && porVoo < 450, `passageiros por voo fora do normal: ${r.a}-${r.b}`);
}
assert.equal(RT.rotas.filter((r) => r.interna).length, new Set(RT.rotas.filter((r) => r.interna).map((r) => r.icao.join('-'))).size, 'rotas internas duplicadas');
assert(RT.rotas.some((r) => r.a === 'LIS' && r.b === 'LHR') && RT.rotas.some((r) => r.a === 'LIS' && r.b === 'MAD'));
assert(RT.aquecimento.tj > 20000 && RT.aquecimento.casas_milhares > 3500, 'aquecimento e casas');
const CBS = D.combustivel;
assert(CBS.co2_kg_por_tonelada === 3149.67 && CBS.pcl_kwh_por_kg === 12.196 && CBS.litros_por_tonelada === 1250 && CBS.co2_kg_por_pkm_media === 0.08333, 'constantes de combustível da DESNZ 2025');
assert(js.includes('<section id="voos">') && html.includes('href="#voos"'), 'secção «Voos reais»');
// Linha do tempo: séries completas e coerentes com as fontes.
const TM = JSON.parse(readFileSync('data/aviacao-tempo.json', 'utf8'));
for (let y = 1970; y <= 2023; y++) if (y !== 1972) assert(TM.mundo.passageiros[y] > 0 && TM.mundo.partidas[y] > 0, `mundo ${y}`); // o Banco Mundial não tem 1972
assert(!(1972 in TM.mundo.passageiros), '1972 não se inventa');
assert(TM.mundo.passageiros[2023] > TM.mundo.passageiros[1970] * 10 && TM.mundo.partidas[2023] > TM.mundo.partidas[1970] * 3, 'crescimento do voo desde 1970');
for (let y = 1880; y <= 2025; y++) assert(Math.abs(TM.temperatura_global[y]) < 3, `temperatura ${y}`);
assert(TM.temperatura_global[2024] > 1 && TM.temperatura_global[1900] < 0.1, 'anomalia GISTEMP face a 1951–1980');
for (let y = 1940; y <= 2021; y++) assert(TM.quota_co2_aviacao_pct[y] > 0 && TM.quota_co2_aviacao_pct[y] < 5, `quota ${y}`);
for (let y = 1993; y <= 2024; y++) assert(TM.portugal[y].rotas > 50 && TM.portugal[y].passageiros > 5e6, `Portugal ${y}`);
assert(TM.portugal[2020].rotas < TM.portugal[2019].rotas && TM.portugal[2024].rotas === RT.rotas.length, 'as rotas de 2024 batem com as da calculadora');
assert(js.includes('<section id="tempo">') && html.includes('href="#tempo"'), 'secção «Linha do tempo»');
assert(js.includes('São estimativas, não a medição de voos') && js.includes('totais por rota') && !js.includes('É uma estimativa por passageiro, não a medição de um voo'), 'a nota de limites cobre as duas escalas (passageiro e rota)');
assert(js.includes('a carga que viaja no avião fica de fora') && js.includes('estimativa da parte dos passageiros'), 'o combustível das rotas é a parte dos passageiros, e diz-se');
assert(js.includes('não provam que uma causou a outra'), 'o aviso sobre correlação e causa tem de estar na página');
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
// Ligação às notícias: categoria no pipeline, fontes, tema e ligação no runtime, filtro da página de notícias, hub e bloco da página.
const runtime = readFileSync('assets/js/biocultura-i18n-runtime.js', 'utf8');
const topics = JSON.parse(runtime.match(/topics: (\{.*\}),?\n/)[1]);
assert(topics.aviacao && topics.aviacao.categories[0] === 'aviacao' && topics.aviacao.words.includes('contrail*') && topics.aviacao.words.includes('SAF'), 'tema «aviacao» no runtime');
assert(runtime.includes('aviacao: { read: [["/energia/aviacao.html"') && runtime.includes('aviacao: "aviacao"'), 'ligação «Continuar no bioCulture» e tema principal');
assert(readFileSync('assets/js/pages/noticias.js', 'utf8').includes('["aviacao", "Aviação", "Aviation"]'), 'filtro por tema na página de notícias');
assert(hubHtml.includes('data-news-categories="energia,impacto-digital,mineracao,pecuaria,aviacao"'), 'o hub junta as notícias de aviação');
assert(html.includes('id="atualidade"') && html.includes('news-cards.css') && js.includes('BioCultureNews'), 'bloco de notícias na página');
const fontes = JSON.parse(readFileSync('config/noticias_fontes.json', 'utf8')).fontes.map((f) => f.id);
for (const id of ['easa', 'icct', 'transport-environment']) assert(fontes.includes(id), `fonte de notícias em falta: ${id}`);
const py = spawnSync('python3', ['-c', `
import sys, json
sys.path.insert(0, 'scripts/noticias')
import atualizar as a
casos = {"EU sustainable aviation fuel supply exceeds 2025 ReFuelEU Aviation target": True,
 "Tackling contrails could avoid 10 years of aviation-related climate warming": True,
 "EU takes half-hearted step towards taxing international flights": True,
 "Oferta de combustível sustentável de aviação na União Europeia supera meta": True,
 "Flightless birds are declining on islands, study finds": False,
 "Wildfire smoke worsens air quality across Europe": False}
print(json.dumps({t: bool(a.classify(t)) and a.classify(t)[0][1] == "aviacao" for t in casos} == casos))
`], { encoding: 'utf8' });
if (!py.error) assert.equal(py.stdout.trim(), 'true', 'classificação de notícias de aviação: ' + py.stderr);
// «Não é só carbono»: combustível e NOx do Eurostat, ruído da APA e da AESA; a terra é uma lacuna assumida (sem fonte aberta).
const RC = JSON.parse(readFileSync('data/aviacao-recursos.json', 'utf8'));
const RTP = JSON.parse(readFileSync('data/aviacao-rotas-portugal.json', 'utf8'));
assert(html.includes('href="#recursos"') && js.includes('<section id="recursos">'), 'falta a secção «Não é só carbono»');
for (const k of ['internacional', 'domestica']) {
  assert(RC.combustivel_tj[k]['1990'] > 0 && RC.combustivel_tj[k]['2024'] > 0, `combustível ${k}: faltam anos`);
  assert(RC.combustivel_tj[k]['2020'] < RC.combustivel_tj[k]['2019'], `combustível ${k}: 2020 devia cair com a pandemia`);
}
assert(RC.nox_kt.aviacao['2023'] > 0 && RC.nox_kt.aviacao['2023'] < RC.nox_kt.total['2023'], 'NOx da aviação tem de ser parte do total');
// O combustível estimado pelas rotas (metade dos voos internacionais + todos os internos) fica perto do que o Eurostat regista.
const CBM = D.combustivel;
const estTJ = RTP.rotas.reduce((a, r) => a + (r.passageiros * r.km * CBM.co2_kg_por_pkm_media / CBM.co2_kg_por_tonelada) * CBM.pcl_kwh_por_kg * 0.0036 * (r.interna ? 1 : 0.5), 0);
const oficial = RC.combustivel_tj.internacional[RTP.meta.ano] + RC.combustivel_tj.domestica[RTP.meta.ano];
assert(Math.abs(estTJ / oficial - 1) < 0.1, `estimativa de combustível a mais de 10% do Eurostat: ${estTJ} vs ${oficial}`);
const rn = D.recursos.ruido;
assert.deepEqual(rn.aeroportos.map((a) => a.iata), ['LIS', 'OPO']);
for (const a of rn.aeroportos) assert(a.residentes_55 > a.residentes_65 && a.residentes_65 > 0 && a.area_55_km2 > 0 && a.movimentos_2016 > a.movimentos_2021, `ruído ${a.iata}: números incoerentes`);
assert(rn.europa.pessoas_55_2019_milhoes > rn.europa.pessoas_55_2023_milhoes && rn.europa.pessoas_55_2023_milhoes > rn.europa.pessoas_55_2005_milhoes, 'ruído europeu: 2019 > 2023 > 2005');
assert(js.includes('Sem dado') || js.includes('"Sem dado"'), 'a caixa «Terra» tem de dizer que falta o dado');

console.log('Aviação validada: fatores, fontes, aeroportos, cálculo de distância e série de Portugal.');
