import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const read = (p) => readFileSync(p, 'utf8');

const html = read('observatorio/observatorio-terra.html');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
assert.equal(ids.length, new Set(ids).size, 'IDs repetidos na página do Observatório da Terra');
for (const id of ['relatorio-terra', 'relatorio-fontes', 'panorama-global', 'sistemas', 'pressure-news', 'sidebar']) assert(ids.includes(id), `falta #${id}`);
assert.equal((html.match(/<h1\b/g) || []).length, 1);

for (const script of ['assets/js/biocultura-graficos.js', 'assets/js/pages/observatorio-terra-relatorio.js', 'assets/js/pages/observatorio-vetores-pressao-global-2.js']) {
  assert(existsSync(script), script);
  new vm.Script(read(script));
  assert(new RegExp(script.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '\\?v=\\d+').test(html), `${script} tem de ser carregado com versão`);
}
// A barra fixa só pode ser ligada depois de os capítulos existirem.
assert(!html.includes('biocultura-sticky-nav.js'), 'a barra fixa é ligada pelo relatório, depois de construído');
assert(read('assets/js/pages/observatorio-terra-relatorio.js').includes('biocultura-sticky-nav.js'));

// Dados do relatório: mundo e Portugal em todos os indicadores, países conhecidos, séries bem formadas.
const dados = JSON.parse(read('data/observatorio-terra-relatorio.json'));
const iso = JSON.parse(read('data/paises-iso.json')).paises;
const esperados = ['acesso_eletricidade', 'renovavel_final', 'intensidade_energetica', 'eletricidade_renovavel', 'area_protegida_terra', 'area_protegida_mar', 'pm25', 'mortalidade_ar', 'stress_hidrico', 'agua_potavel', 'terra_degradada', 'lista_vermelha'];
for (const chave of esperados) {
  const bloco = dados.indicadores[chave];
  assert(bloco, `falta o indicador ${chave}`);
  assert(bloco.series.WLD && bloco.series.PRT, `${chave}: sem mundo ou Portugal`);
  assert(Object.keys(bloco.series).length >= 120, `${chave}: poucas geografias`);
  for (const [codigo, serie] of Object.entries(bloco.series)) {
    assert(Number.isInteger(serie.a) && serie.a > 1900 && serie.a < 2100, `${chave} ${codigo}: ano inicial`);
    assert(serie.v.length >= 1 && serie.v.every((v) => v === null || Number.isFinite(v)), `${chave} ${codigo}: valores`);
  }
}
for (const codigo of Object.keys(dados.paises)) assert(iso[codigo], `país desconhecido ${codigo}`);
assert(Object.values(dados.paises).filter((p) => p[4] === 1).length >= 150, 'poucos Estados independentes para as ordenações');
assert(dados.paises.PRT && dados.paises.PRT[4] === 1);
console.log('Observatório da Terra: página sem IDs repetidos, scripts válidos e com versão, barra fixa ligada depois do relatório, 12 indicadores com mundo e Portugal.');
