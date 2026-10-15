import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

// Páginas «Ambiente construído» e «Moda e têxteis» (energia-materiais.js): dados com fontes, posições fixas, séries do Eurostat,
// fotografias das secções e registo nos hubs.
const js = readFileSync('assets/js/pages/energia-materiais.js', 'utf8');
const lerJ = (f) => JSON.parse(readFileSync(f, 'utf8'));
const fotos = lerJ('data/fotos-capitulos.json');
const config = lerJ('config/paginas.json').paginas;
const hub = readFileSync('observatorio/pressoes-humanas.html', 'utf8');
const sistemas = lerJ('data/pressure-systems-global.json').systems;

const PAGINAS = {
  'ambiente-construido': { vetor: 'construcao', dados: 'ambiente-construido', pt: 'ambiente-construido-portugal', co2: ['construcao', 'minerais_nao_metalicos'], res: 'W121',
    posicoes: { 0: 'Agregados', 2: 'Betão', 5: 'Madeira', 7: 'Isolamentos', 8: 'Metais' }, sistema: 'built' },
  'moda-texteis': { vetor: 'moda', dados: 'moda-texteis', pt: 'moda-texteis-portugal', co2: ['texteis_vestuario_couro'], res: 'W076',
    posicoes: { 1: 'Alumínio', 4: 'Plástico', 5: 'Vidro' }, sistema: 'fashion' }
};

for (const [slug, P] of Object.entries(PAGINAS)) {
  const D = lerJ(`data/${P.dados}.json`), PT = lerJ(`data/${P.pt}.json`);
  const html = readFileSync(`energia/${slug}.html`, 'utf8');

  // O tradutor do inglês passa pelos textos dos ficheiros de dados: a página procura materiais e fontes pela posição.
  for (const [i, inicio] of Object.entries(P.posicoes)) assert(D.materiais[i].pt.startsWith(inicio), `${slug}: materiais[${i}] devia ser «${inicio}»`);
  for (const m of D.materiais) {
    assert(m.pt && m.en && m.primaria > 0, `${slug}: material incompleto`);
    for (const k of ['reutilizado', 'reciclado']) assert(m[k] === null || (m[k] > 0 && m[k] <= m.primaria), `${slug}/${m.pt}: ${k} fora do intervalo`);
  }
  for (const f of D.fontes) { assert(/^https:\/\//.test(f.url)); for (const k of ['nome', 'nome_en', 'usa_pt', 'usa_en']) assert(f[k], `${slug}: fonte sem ${k}`); }
  if (P.vetor === 'moda') {
    assert(D.roupa.nova === 22310 && D.roupa.reutilizada === 152.25, 'fatores de roupa da DESNZ 2025');
    for (const t of D.mundo) assert(t.pt && t.en && t.nota_pt && t.nota_en && D.fontes[t.fonte]);
  } else {
    assert.equal(D.materiais[8].primaria, 3824.09335); assert.equal(D.materiais[2].primaria, 118.79306);
    assert(D.mundo[0].valor === '37' && D.fontes[D.mundo[0].fonte]);
  }

  // Eurostat: 1995–2024 sem falhas; resíduos por pessoa de 2010 em diante para Portugal e UE-27.
  const anos = Object.keys(PT.co2_kt.total_economia_familias).map(Number).sort((a, b) => a - b);
  assert.equal(anos[0], 1995); assert.equal(anos.length, anos.at(-1) - 1995 + 1);
  for (const k of P.co2) for (const y of anos) assert(PT.co2_kt[k][y] > 0 && PT.co2_kt[k][y] < PT.co2_kt.total_economia_familias[y], `${slug}/${k}: série incoerente em ${y}`);
  assert.equal(PT.meta.codigo_residuos, P.res);
  // Energia por atividade (2000–2023) e, na construção, materiais e solo artificializado.
  for (const k of [...P.co2, 'total_economia_familias']) { const e = PT.energia_tj[k]; for (let y = 2000; y <= 2023; y++) assert(e[y] > 0, `${slug}: sem energia de ${k} em ${y}`); }
  for (const k of P.co2) assert(PT.energia_tj[k][2023] < PT.energia_tj.total_economia_familias[2023]);
  if (P.vetor === 'construcao') {
    for (const geo of ['PT', 'EU27_2020']) for (const m of ['MF3', 'MF38', 'TOTAL']) for (let y = 2000; y <= 2023; y++) assert(PT.materiais_t_por_pessoa[geo][m][y] > 0, `materiais ${geo}/${m}/${y}`);
    assert(PT.materiais_t_por_pessoa.PT.MF3[2023] < PT.materiais_t_por_pessoa.PT.TOTAL[2023]);
    for (const y of [2018, 2022]) assert(PT.solo_artificial.PT.PC[y] > 1 && PT.solo_artificial.PT.PC[y] < 30, 'solo artificializado de Portugal');
    assert(PT.solo_artificial.EU27_2020.PC[2018] > 1 && PT.solo_artificial.EU27_2020.M2_HAB[2018] > 100);
  }
  // Qualidade do ar (NOx e partículas): as atividades da página são parte do total do país.
  for (const pol of ['NOX', 'PM10', 'PM2_5']) {
    for (const k of [...P.co2, 'total_economia_familias']) assert(Object.keys(PT.ar_kt[pol][k]).length >= 25, `${slug}: ar_kt ${pol}/${k} com poucos anos`);
    assert(P.co2.reduce((a, k) => a + PT.ar_kt[pol][k][2023], 0) < PT.ar_kt[pol].total_economia_familias[2023], `${slug}: ar_kt ${pol}: as atividades têm de ser parte do total`);
  }
  for (const geo of ['PT', 'EU27_2020']) for (const y of [2010, 2022]) assert(PT.residuos_kg_por_pessoa[geo][y] > 0, `${slug}: sem resíduos ${geo} ${y}`);
  if (P.vetor === 'construcao') for (const geo of ['PT', 'EU27_2020']) assert(PT.residuos_totais_construcao[geo].quota_pct > 5, 'quota de resíduos da construção');

  // Página: scripts, tema, dados e foto do topo sem a marca bioCulture; secções com foto desenhadas pelo script.
  for (const t of [`data-vetor="${P.vetor}"`, 'energia-materiais.js', 'energia-materiais.css', 'relatorio-dados.css', 'topic-reading.css', `data-pagina="${slug}"`, 'data-foto-slot="hero"', 'biocultura-graficos.js']) assert(html.includes(t), `${slug}: falta ${t}`);
  assert(/class="observatory-visual"\s+data-no-signature/.test(html), `${slug}: o topo leva data-no-signature`);
  assert(existsSync(`images/partilha/energia-${slug}.jpg`) && existsSync(`images/${slug}/miniatura.webp`) && existsSync(`images/${slug}/hero.webp`));
  // «Todos os recursos»: secção e ligação na barra; cada caixa cita fontes que existem.
  assert(js.includes('<section id="recursos">') && html.includes('href="#recursos"'), `${slug}: secção «recursos»`);
  assert(D.fontes.length >= (P.vetor === 'moda' ? 8 : 9), `${slug}: faltam as fontes dos recursos`);
  for (const m of js.matchAll(/\[([0-9, ]+)\]\)(?:,|\s*\])/g)) for (const i of m[1].split(',').map(Number)) assert(D.fontes[i], `${slug}: índice de fonte ${i} inexistente`);
  for (const id of Object.keys(fotos[slug]).filter((k) => k !== 'hero')) assert(js.includes(`<section id="${id}">`), `${slug}: a secção ${id} não existe`);
  assert(config[`energia/${slug}.html`], `${slug}: sem registo em config/paginas.json`);
  assert(hub.includes(`/energia/${slug}.html`) && new RegExp(`class="hub-thumb"\\s+data-no-signature\\s+style="[^"]*${slug}\\/miniatura`).test(hub), `${slug}: cartão do hub`);
  const sis = sistemas.find((s) => s.id === P.sistema);
  assert.equal(sis.status, 'live'); assert.equal(sis.href, `/energia/${slug}.html`);
}
console.log('Ambiente construído e Moda e têxteis validados: fatores DESNZ, séries do Eurostat, fotografias e registo nos hubs.');
