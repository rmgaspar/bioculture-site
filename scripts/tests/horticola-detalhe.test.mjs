import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(`data/${name}.json`, 'utf8'));
const horticolas = read('horticolas_master'), pragas = read('pragas');
const context = vm.createContext({
    document: { getElementById: () => ({ innerHTML: '' }) },
    fetch: () => new Promise(() => {}),
});
vm.runInContext(readFileSync('assets/js/pages/calendario-horticola-detalhe-2.js', 'utf8'), context);

// Direct name/id matches, verified against the pragas.json "plantas_afetadas" source data.
assert(context.pestsForCrop('tomate', 'Tomate', pragas).some(p => p.id === 'pulgoes'));
assert(context.pestsForCrop('couve', 'Couve', pragas).some(p => p.id === 'mosca-da-raiz-da-couve'));

// Alias resolution (e.g. "batateira" -> batata, "videira"/"vinha"/"uva" -> uvas).
assert(context.pestsForCrop('batata', 'Batata', pragas).some(p => p.id === 'escaravelho-da-batateira'));
assert(context.pestsForCrop('uvas', 'Uvas', pragas).some(p => p.id === 'oidio-da-videira'));

// Generic/ambiguous terms (e.g. "hortícolas", "fruteiras", "ornamentais") must never fabricate
// a link for a crop that has no specific match in the source data.
assert.deepEqual(context.pestsForCrop('kiwi', 'Kiwi', pragas), []);

for (const [cid, crop] of Object.entries(horticolas)) {
    const pests = context.pestsForCrop(cid, crop.nome, pragas);
    for (const p of pests) {
        const card = context.pestCard(p);
        assert(card.includes(`/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(p.id)}`),
            `Ligação em falta para ${p.id} a partir de ${cid}`);
    }
}
console.log(`Teia hortícolas-pragas validada: ${horticolas ? Object.keys(horticolas).length : 0} culturas, ${pragas.length} pragas, sem correspondências genéricas fabricadas.`);
