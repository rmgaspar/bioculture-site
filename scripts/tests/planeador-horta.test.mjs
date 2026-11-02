import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Planeador de horta (calendario/planeador-horta.html): grupos de rotação do RHS, épocas lidas das fichas e plano sem repetições.
const M = JSON.parse(readFileSync('data/horticolas_master.json', 'utf8'));
const P = JSON.parse(readFileSync('data/planeador-horta.json', 'utf8'));
const html = readFileSync('calendario/planeador-horta.html', 'utf8');
const js = readFileSync('assets/js/pages/planeador-horta.js', 'utf8');
const hub = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));
const G = JSON.parse(readFileSync('data/glossario.json', 'utf8'));

const win = {};
const ctx = { window: win, document: { getElementById: () => null } };
vm.runInNewContext(readFileSync('assets/js/biocultura-seasonal.js', 'utf8'), ctx);
vm.runInNewContext(js, ctx);
const T = win.BioCulturaPlaneador, S = win.BioCulturaSeasonal;
const J = (x) => JSON.parse(JSON.stringify(x));

// Meses: o mesmo leitor do Calendário.
const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
assert.equal(T.rotulo(T.mesesDe('janeiro–março em abrigo', S), nomes), 'jan–mar');
assert.equal(T.rotulo(T.mesesDe('fevereiro–maio e setembro–novembro', S), nomes), 'fev–mai, set–nov');
assert.equal(T.rotulo(T.mesesDe('outubro–fevereiro', S), nomes), 'out–fev', 'faixa que atravessa o ano');
assert.equal(T.rotulo(T.mesesDe('quase todo o ano; evitar extremos', S), nomes, 'todo o ano'), 'todo o ano');
assert.equal(T.rotulo(T.mesesDe('sementeira direta', S), nomes), '');
assert.equal(T.rotulo(T.mesesDe('', S), nomes), '');

// Colheita estimada: só com prazo na ficha, contado desde a sementeira.
const sem = T.mesesDe('março', S); // sementeira em março
assert.equal(T.rotulo(T.colheitaEstimada('8–12 semanas', sem), nomes), 'abr–jun', '8–12 semanas depois de março');
assert.equal(T.rotulo(T.colheitaEstimada('30–70 dias após sementeira', sem), nomes), 'mar–jun');
assert.equal(T.colheitaEstimada('variável; sobretudo outono–primavera', sem), null, 'sem prazo, sem estimativa');
assert.equal(T.colheitaEstimada('4–8 semanas', Array(12).fill(false)), null, 'sem sementeira, sem estimativa');
const dez = T.mesesDe('dezembro', S);
assert(T.colheitaEstimada('8–12 semanas', dez)[1], 'a estimativa passa para o ano seguinte');

// Plano de rotação: ciclo completo, nenhum grupo repete no mesmo canteiro dentro do ciclo, e cada ano usa todos os grupos.
for (const ciclo of P.ciclos) {
  const R = ciclo.passos.length;
  assert.equal(R, Number(ciclo.id), `o plano de ${ciclo.id} anos tem ${ciclo.id} passos`);
  for (let camas = R; camas <= 8; camas++) {
    const { grelha, faltam } = J(T.planoRotacao(ciclo, camas, R));
    grelha.forEach((linha, i) => assert.equal(new Set(linha).size, R, `canteiro ${i + 1}: um passo só duas vezes no ciclo`));
    for (let y = 0; y < R; y++) assert.equal(new Set(grelha.map((l) => l[y])).size, R, `ano ${y + 1}: todos os passos têm canteiro`);
    assert(faltam.every((f) => f.length === 0));
  }
  // Com menos canteiros do que passos, a página diz quais ficam sem lugar.
  const poucas = J(T.planoRotacao(ciclo, 2, R));
  assert(poucas.faltam.every((f) => f.length === R - 2), 'faltam os passos que não cabem');
}
// Cada grupo avança um canteiro por ano: o que o canteiro i tem no ano y é o que o canteiro i+1 tinha no ano y−1.
const pl = J(T.planoRotacao(P.ciclos[0], 4, 4));
for (let y = 1; y < 4; y++) for (let i = 0; i < 3; i++) assert.equal(pl.grelha[i][y], pl.grelha[i + 1][y - 1]);
// Culturas livres: mudam de canteiro todos os anos.
for (let k = 0; k < 6; k++) for (let y = 1; y < 4; y++) assert.notEqual(T.camaLivre(k, y, 4), T.camaLivre(k, y - 1, 4));

// Dados: cada cultura existe nas fichas, tem grupo conhecido e nome em inglês; as épocas são legíveis.
const grupos = new Set(P.grupos.map((g) => g.id));
const ids = P.culturas.map((c) => c.id);
assert.equal(new Set(ids).size, ids.length);
for (const c of P.culturas) {
  assert(M[c.id], `${c.id}: não existe nas fichas`);
  assert(grupos.has(c.grupo) && c.en, `${c.id}: grupo ou nome em inglês`);
  const j = T.janelas(M[c.id], S);
  assert(j.S.some(Boolean), `${c.id}: sem época de sementeira legível`);
}
for (const g of P.grupos) for (const k of ['pt', 'en', 'papel_pt', 'papel_en', 'cor']) assert(g[k], `grupo ${g.id}: ${k}`);
// Os passos dos ciclos cobrem todos os grupos de rotação (menos os livres) e só esses.
for (const ciclo of P.ciclos) {
  const usados = ciclo.passos.flatMap((p) => p.grupos).sort();
  assert.deepEqual(usados, [...grupos].filter((g) => g !== 'livres').sort(), `ciclo ${ciclo.id}`);
}
// A família que as fichas já têm bate com o grupo (Fabaceae → leguminosas, Brassicaceae → brássicas, Solanaceae → batata e família).
const fam = { Fabaceae: 'leguminosas', Brassicaceae: 'brassicas', Solanaceae: 'solanaceas' };
for (const c of P.culturas) if (M[c.id].familia && fam[M[c.id].familia]) assert.equal(c.grupo, fam[M[c.id].familia], `${c.id}: grupo ≠ família ${M[c.id].familia}`);
for (const id of P.exemplo) assert(ids.includes(id), `exemplo: ${id}`);
// Vizinhanças: só as que as fichas dizem, entre culturas escolhidas.
const v = J(T.vizinhos(['couve', 'aipo', 'alho-frances', 'ervilha', 'cebola', 'tomate'], M));
assert(v.some((x) => x.de === 'couve' && x.para === 'aipo' && x.tipo === 'fav'));
assert(v.some((x) => x.de === 'couve' && x.para === 'alho-frances' && x.tipo === 'fav'), 'compara sem acentos nem hífen');
assert(v.some((x) => x.de === 'ervilha' && x.para === 'cebola' && x.tipo === 'evitar'));
assert(!v.some((x) => x.para === 'tomate'), 'sem inventar pares');
assert.equal(T.vizinhos(['tomate'], M).length, 0);

// A página: âncoras, sticky bar, SEO, hub, fontes e privacidade.
for (const id of ['horta', 'ano', 'rotacao', 'fichas', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="planeador-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(html.includes('biocultura-seasonal.js') && html.indexOf('biocultura-seasonal.js') < html.indexOf('planeador-horta.js'), 'seasonal.js antes do planeador');
assert(hub.includes('href="/calendario/planeador-horta.html"') && hub.includes('href="#ferramentas"'));
assert(cfg.paginas['calendario/planeador-horta.html']?.desc && existsSync('images/partilha/calendario-planeador-horta.jpg'));
for (const f of Object.values(P.fontes)) assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en && f.usa_pt && f.usa_en);
assert(P.fontes.rhs.url === 'https://www.rhs.org.uk/vegetables/crop-rotation');
assert(!/https?:\/\/[^'"`\s]+\.json/.test(js) && !/navigator\.geolocation|fetch\("https/.test(js), 'sem serviços externos');
assert(/planeador-horta\.js\?v=\d+/.test(html) && /planeador-horta\.css\?v=\d+/.test(html));
// O glossário explica os termos novos.
for (const id of ['canteiro', 'familia-botanica']) assert(G.termos.some((t) => t.id === id), `glossário: ${id}`);
console.log('planeador-horta: ok');
