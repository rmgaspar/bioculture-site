import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(`data/${name}.json`, 'utf8'));
const master = read('especies_master'), pests = read('pragas'), invasives = read('flora_invasora'), fauna = read('fauna_invasora'), guidance = read('gestao-solucoes');
const horticolas = read('horticolas_master');
const element = { innerHTML: '' };
const context = vm.createContext({ URL, URLSearchParams, location: { search: '' }, window: {},
    document: { getElementById: () => element }, fetch: () => new Promise(() => {}) });
vm.runInContext(readFileSync('assets/js/pages/ecossistemas-especie-detalhe-2.js', 'utf8'), context);
const resolve = (id) => context.resolveSpecies(id, master, pests, invasives, fauna);
for (const [rows, group] of [[pests, 'Sanidade Vegetal'], [invasives, 'Flora Invasora'], [fauna, 'Fauna Invasora']]) {
    for (const row of rows) {
        const species = resolve(row.id);
        assert.equal(species.grupo, group);
        assert.equal(species.combate, row.combate);
        context.render(species, master, guidance, horticolas);
        assert(element.innerHTML.includes('id="prevencao"'));
        assert(element.innerHTML.includes('id="intervencao"'));
        assert(!element.innerHTML.includes('Prevenção e controlo responsável'), 'Resumo duplicado');
        if (group === 'Flora Invasora' || group === 'Fauna Invasora') assert(element.innerHTML.includes('Destino dos resíduos'));
        const profile = guidance.perfis.find(p => p.alvos.includes(row.id));
        assert.equal(element.innerHTML.includes('id="solucoes"'), Boolean(profile));
        const crops = context.cropsForPest(species, horticolas);
        for (const crop of crops) {
            assert(element.innerHTML.includes(`/calendario/horticola-detalhe.html?id=${crop.id}`),
                `Ligação em falta para ${crop.id} a partir de ${row.id}`);
        }
    }
}
assert(context.cropsForPest(resolve('pulgoes'), horticolas)
    .some(c => c.id === 'batata'), 'Alias batateira -> batata deve continuar a resolver');
const pest = resolve('bichado-da-fruta');
assert.equal(pest.grupo, 'Sanidade Vegetal');
context.render(resolve('pulgoes'), master, null);
assert(element.innerHTML.includes('id="diagnostico"'), 'Falha do suplemento não deve ocultar a ficha');
assert(!element.innerHTML.includes('id="solucoes"'));
const safe = context.sourcePanel([{ nome: '<script>x</script>', url: 'https://example.com' }, {url:'javascript:alert(1)'}]);
assert(!safe.includes('<script>') && !safe.includes('javascript:'));
context.window.BioCultureI18n = { isEnglish: true };
context.render(resolve('pulgoes'), master, guidance);
assert(element.innerHTML.includes('Solutions for this problem') && element.innerHTML.includes('Agricultural insecticidal soap'));
console.log(`Renderização validada: ${pests.length} pragas, ${invasives.length} flora invasora e ${fauna.length} fauna invasora; prioridade, falha parcial, escape e orientações EN.`);
