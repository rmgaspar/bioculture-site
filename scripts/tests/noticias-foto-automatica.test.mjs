import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Foto de contexto automática (scripts/noticias/foto_contexto.py): tema pelo título, crédito limpo, licença no formato do site,
// e ligação ao processo semanal (depois do corte por relevância, com os ficheiros a seguir no commit das propostas).
const py = `
import json, sys
sys.path.insert(0, 'scripts/noticias')
import foto_contexto as f
print(json.dumps({
  'haze': f.tema('Singapore pollution spikes as Indonesia wildfire haze intensifies', 'ar')[0],
  'sol': f.tema('Portugal installs record solar capacity', 'energia')[0],
  'cat': f.tema('Statement by the Executive Director', 'energia')[0],
  'autor': f.autor('<a href="x">Ken Lund</a> from Reno, Nevada, USA'),
  'autor2': f.autor('Szodorai Imre [Hun]'),
  'pd': f.licenca('Public domain'), 'cc': f.licenca('CC BY-SA 4.0'),
  'ok': bool(f.LICENCA.match('CC BY 2.0')) and bool(f.LICENCA.match('CC0')) and not f.LICENCA.match('CC BY-NC 4.0') and not f.LICENCA.match('GFDL'),
}))`;
const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
assert.equal(r.status, 0, r.stderr);
const o = JSON.parse(r.stdout);
assert.equal(o.haze, 'smog haze city skyline');
assert.equal(o.sol, 'solar panels');
assert.equal(o.cat, 'electricity pylons');
assert.equal(o.autor, 'Ken Lund');
assert.equal(o.autor2, 'Szodorai Imre');
assert.deepEqual(o.pd, ['domínio público', 'public domain']);
assert.deepEqual(o.cc, ['CC BY-SA 4.0', 'CC BY-SA 4.0']);
assert(o.ok, 'só licenças que permitem uso comercial com crédito');

const atualizar = readFileSync('scripts/noticias/atualizar.py', 'utf8');
assert(atualizar.indexOf('proposals = proposals[: int(config["limite_por_execucao"])]') < atualizar.indexOf('fotos_de_contexto(proposals'), 'as fotos só se descarregam depois do corte');
assert(atualizar.includes('--fotos'), 'falta a opção --fotos');
assert(readFileSync('.github/workflows/propor-noticias.yml', 'utf8').includes('git add data/noticias_propostas.json media/noticias'), 'o fluxo tem de guardar as fotos novas');
console.log('Foto de contexto automática validada.');
