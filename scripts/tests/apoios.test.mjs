import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Página «Apoios» (calendario/apoios.html): dados curados com a regra do IFAP ligada, concursos lidos da fonte oficial e estado calculado.
const D = JSON.parse(readFileSync('data/apoios.json', 'utf8'));
const C = JSON.parse(readFileSync('data/apoios-concursos.json', 'utf8'));
const html = readFileSync('calendario/apoios.html', 'utf8');
const js = readFileSync('assets/js/pages/apoios.js', 'utf8');
const hub = readFileSync('calendario/conhecimento-cuidar.html', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));
const wf = readFileSync('.github/workflows/atualizar-dados.yml', 'utf8');

// Estado de um concurso comparando o período oficial com o dia.
const win = {};
vm.runInNewContext(js, { window: win, document: { getElementById: () => null } });
const { estadoConcurso, hojeISO, diasEntre } = win.BioCulturaApoios;
const c = { inicio: '2026-10-01', fim: '2026-10-31' };
assert.equal(estadoConcurso(c, '2026-09-30'), 'abrir');
assert.equal(estadoConcurso(c, '2026-10-01'), 'aberto');
assert.equal(estadoConcurso(c, '2026-10-31'), 'aberto');
assert.equal(estadoConcurso(c, '2026-11-01'), 'encerrado');
assert.equal(estadoConcurso({ inicio: null, fim: null }, '2026-10-16'), 'ver');
assert.equal(hojeISO(new Date(2026, 0, 5)), '2026-01-05');
assert.equal(diasEntre('2026-10-01', '2026-10-31'), 30);

// Dados curados: ids únicos, grupos e fontes existentes, regra do IFAP ligada, PT e EN em tudo.
const ids = D.apoios.map((a) => a.id);
assert.equal(new Set(ids).size, ids.length, 'ids únicos');
const grupos = new Set(D.grupos.map((g) => g.id));
for (const g of D.grupos) for (const k of ['pt', 'en', 'desc_pt', 'desc_en']) assert(g[k], `grupo ${g.id}: falta ${k}`);
for (const a of D.apoios) {
  assert(grupos.has(a.g), `${a.id}: grupo desconhecido`);
  for (const k of ['pt', 'en', 'r_pt', 'r_en', 'duracao_pt', 'duracao_en']) assert(a[k], `${a.id}: falta ${k}`);
  assert(/^https:\/\/www\.ifap\.pt\/portal\/[a-z0-9.-]+-regras$/.test(a.url), `${a.id}: ligação às regras do IFAP`);
  assert(['sim', 'anual', 'nao', 'ver'].includes(a.novos), `${a.id}: estado inválido`);
  assert.equal(Boolean(a.valor_pt), Boolean(a.valor_en), `${a.id}: valor só num idioma`);
}
// Nota do IFAP sobre o PU 2026: só C.1.1.8, C.1.1.7 e C.1.1.4 aceitam compromissos novos.
assert.deepEqual(D.apoios.filter((a) => a.novos === 'sim').map((a) => a.id).sort(), ['C.1.1.4', 'C.1.1.7', 'C.1.1.8']);
for (const a of D.apoios.filter((x) => /^C\.1\.1\.[1-3]/.test(x.id))) assert.equal(a.novos, 'nao', `${a.id}: fechado a novos em 2026`);
for (const a of D.apoios.filter((x) => x.g === 'ecorregimes')) assert.equal(a.novos, 'anual', `${a.id}: ecorregime anual`);
// Valores só onde o IFAP os publica nas regras: ARB e PPA, com os números exatos.
assert.deepEqual(D.apoios.filter((a) => a.valor_pt).map((a) => a.id), ['A.1.1', 'A.2.1']);
const arb = D.apoios.find((a) => a.id === 'A.1.1').valor_pt, ppa = D.apoios.find((a) => a.id === 'A.2.1').valor_pt;
assert(arb.includes('107,96') && arb.includes('80,97') && arb.includes('134,95'));
assert(ppa.includes('500 €') && ppa.includes('850 €') && ppa.includes('1 050 €'));
for (const a of D.apoios.filter((x) => !x.valor_pt)) assert(!/\d\s?€|€\s?\d/.test(a.r_pt + a.r_en), `${a.id}: valor em € sem fonte`);
// Janelas do PU 2026 e fontes.
for (const j of D.pu2026.janelas) assert(/^\d{4}-\d\d-\d\d$/.test(j.inicio) && j.fim >= j.inicio && j.pt && j.en);
assert.equal(D.pu2026.janelas[0].inicio, '2026-02-16');
assert.equal(D.pu2026.janelas[0].fim, '2026-06-01');
for (const f of D.fontes) { assert(/^https:\/\//.test(f.url) && f.nome && f.nome_en && f.usa_pt && f.usa_en, `fonte ${f.id}`); }
for (const id of ['ifap-pu', 'ifap-apoios', 'ifap-regras', 'pepacc']) assert(D.fontes.some((f) => f.id === id), `fonte ${id} usada na página`);

// Concursos lidos da fonte oficial.
assert(C.concursos.length >= 20, 'lista de concursos');
for (const k of C.concursos) {
  assert(k.titulo && /^https:\/\/pepacc\.pt\//.test(k.link) && k.linha, `concurso sem dados: ${k.titulo}`);
  if (k.inicio) assert(/^\d{4}-\d\d-\d\d$/.test(k.inicio) && /^\d{4}-\d\d-\d\d$/.test(k.fim) && k.fim >= k.inicio, `datas: ${k.titulo}`);
  assert(!/‎/.test(k.tema.join('')), 'sem marcas invisíveis nos temas');
}
assert(C.concursos.filter((k) => k.inicio).length >= 0.9 * C.concursos.length, 'quase todos os períodos são legíveis');

// Leitura do período no script de atualização.
const py = spawnSync('python3', ['-I', '-c', `
import sys; sys.path.insert(0, 'scripts/dados')
import pepac_concursos as p
casos = [
 ('Candidaturas abertas de 16 de setembro a 9 de outubro de 2026', '2026-09-16', '2026-10-09'),
 ('De 7 de outubro de 2026 a 9 de dezembro de 2026', '2026-10-07', '2026-12-09'),
 ('Candidaturas abertas de 25 de junho a 25 de setembro', '2026-06-25', '2026-09-25'),
 ('Candidaturas abertas de 10 de novembro de 2025 a 12 de janeiro de 2026', '2025-11-10', '2026-01-12'),
 ('Candidaturas abertas de 7 de fevereiro a 21 de abril 2025', '2025-02-07', '2025-04-21'),
 ('Candidaturas no portal do IFAP', None, None),
]
for linha, a, b in casos:
    r = p.periodo(linha, '2026-09-15T10:00:00')
    assert r == (a, b), (linha, r)
print('ok')
`], { encoding: 'utf8' });
assert.equal(py.stdout.trim(), 'ok', py.stderr || py.stdout);

// Página, hub, SEO, privacidade e atualização semanal.
assert(html.includes('id="relatorio-apoios"') && html.includes('data-hero-theme="calendar"'));
for (const id of ['sumario', 'comecar', 'apoios', 'concursos', 'calendario', 'limites']) assert(html.includes(`href="#${id}"`) && js.includes(`id="${id}"`), `âncora #${id}`);
assert(/class="hub-back" id="apoios-voltar" href="\/calendario\/conhecimento-cuidar\.html"/.test(html), '«Voltar» só na barra fixa');
assert(hub.includes('href="/calendario/apoios.html"') && hub.includes('href="#ferramentas"'), 'o hub liga à página');
assert(cfg.paginas['calendario/apoios.html']?.desc && existsSync('images/partilha/calendario-apoios.jpg'));
assert(wf.includes('scripts/dados/pepac_concursos.py'), 'atualização semanal dos concursos');
assert(!/https?:\/\/[^'"`\s]+\.json/.test(js), 'a página só lê ficheiros do próprio site');
assert(!/localStorage|sessionStorage|navigator\.geolocation/.test(js), 'sem dados do visitante');
assert(/apoios\.js\?v=\d+/.test(html) && /apoios\.css\?v=\d+/.test(html));
console.log('apoios: ok');
