import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(`data/${name}.json`, 'utf8'));
const master = read('especies_master'), pests = read('pragas'), invasives = read('flora_invasora'), guidance = read('gestao-solucoes');
const element = { innerHTML: '' };
const context = vm.createContext({ URL, URLSearchParams, location: { search: '' }, window: {},
    document: { getElementById: () => element }, fetch: () => new Promise(() => {}) });
vm.runInContext(readFileSync('assets/js/pages/ecossistemas-especie-detalhe-2.js', 'utf8'), context);
for (const [rows, group] of [[pests, 'Sanidade Vegetal'], [invasives, 'Flora Invasora']]) {
    for (const row of rows) {
        const species = context.resolveSpecies(row.id, master, pests, invasives);
        assert.equal(species.grupo, group);
        assert.equal(species.combate, row.combate);
        context.render(species, master, guidance);
        assert(element.innerHTML.includes('id="prevencao"'));
        assert(element.innerHTML.includes('id="intervencao"'));
        assert(!element.innerHTML.includes('Prevenção e controlo responsável'), 'Resumo duplicado');
        if (group === 'Flora Invasora') assert(element.innerHTML.includes('Destino dos resíduos'));
        const profile = guidance.perfis.find(p => p.alvos.includes(row.id));
        assert.equal(element.innerHTML.includes('id="solucoes"'), Boolean(profile));
    }
}
const pest = context.resolveSpecies('bichado-da-fruta', master, pests, invasives);
assert.equal(pest.grupo, 'Sanidade Vegetal');
context.render(context.resolveSpecies('pulgoes', master, pests, invasives), master, null);
assert(element.innerHTML.includes('id="diagnostico"'), 'Falha do suplemento não deve ocultar a ficha');
assert(!element.innerHTML.includes('id="solucoes"'));
const safe = context.sourcePanel([{ nome: '<script>x</script>', url: 'https://example.com' }, {url:'javascript:alert(1)'}]);
assert(!safe.includes('<script>') && !safe.includes('javascript:'));
context.window.BioCultureI18n = { isEnglish: true };
context.render(context.resolveSpecies('pulgoes', master, pests, invasives), master, guidance);
assert(element.innerHTML.includes('Solutions for this problem') && element.innerHTML.includes('Agricultural insecticidal soap'));
console.log(`Renderização validada: ${pests.length} pragas e ${invasives.length} invasoras; prioridade, falha parcial, escape e orientações EN.`);
