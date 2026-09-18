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
const pestIndex = context.buildPestIndex(pragas);

// Wikipedia-style: a palavra só vira link quando (1) aparece literalmente no texto e (2)
// pragas.json confirma que essa praga específica afeta esta cultura específica.
const tomate = horticolas.tomate, couve = horticolas.couve, melao = horticolas.melao;

// "afídeos" (sinónimo coloquial de "pulgões") só liga em culturas que pulgões.json confirma
// afetar (tomateiro/couve), nunca em melão, que não consta de plantas_afetadas dessa praga.
assert(context.linkifyPests(tomate.problemas_comuns, pestIndex, 'tomate', tomate.nome)
    .includes('/ecossistemas/especie-detalhe.html?id=pulgoes'), 'afídeos deve ligar a pulgões no tomate');
assert(context.linkifyPests(couve.problemas_comuns, pestIndex, 'couve', couve.nome)
    .includes('/ecossistemas/especie-detalhe.html?id=pulgoes'), 'afídeos deve ligar a pulgões na couve');
assert(!context.linkifyPests(melao.problemas_comuns, pestIndex, 'melao', melao.nome)
    .includes('especie-detalhe'), 'melão não deve ganhar uma ligação que os dados não confirmam');

// Termos de família ambígua ("ácaros", "mosca-branca") nunca ligam sozinhos quando há mais do
// que uma praga candidata para a mesma cultura — evita apontar para a espécie errada.
const tomateLinked = context.linkifyPests(tomate.problemas_comuns, pestIndex, 'tomate', tomate.nome);
assert(!/ácaros<\/a>|ácaros?\s*<\/a>/.test(tomateLinked));
assert(!tomateLinked.match(/<a[^>]*>ácaro/i), '"ácaros" é ambíguo (2 pragas) e não deve ligar');
assert(!tomateLinked.match(/<a[^>]*>mosca-branca/i), '"mosca-branca" é ambíguo (2 pragas) e não deve ligar');

// O nome completo de uma praga, quando aparece por extenso no texto, liga por inteiro — não só
// à raiz truncada (regressão: "hérnia" a meio de "hérnia-das-crucíferas").
const couveLinked = context.linkifyPests(couve.problemas_comuns, pestIndex, 'couve', couve.nome);
assert(couveLinked.includes('>hérnia-das-crucíferas</a>'), 'nome completo da praga deve ficar inteiro dentro do link');
assert(!couveLinked.includes('>Hérnia</a>-das'), 'não deve cortar o link a meio da palavra');

// Nunca gera dois links aninhados para a mesma praga (bug encontrado com "afídeos"/"afídeo").
for (const [cid, crop] of Object.entries(horticolas)) {
    const linked = context.linkifyPests(crop.problemas_comuns, pestIndex, cid, crop.nome);
    assert(!/<a[^>]*>[^<]*<a /.test(linked), `Link aninhado em ${cid}`);
}

// Técnicas: o próprio termo usado na ficha (rega, cobertura do solo, composto, rotação) vira
// o link, mantendo a palavra inteira (regressão: "Rotaç" cortado antes de "ão").
const melaoRega = context.linkifyTechniques(melao.metodo_rega_recomendado);
assert(melaoRega.includes('/services/servicos.html#tecnica-rega-gota-a-gota'));
assert(melaoRega.includes('>Gota-a-gota</a>'));
const melaoManutencao = context.linkifyTechniques(melao.manutencao);
assert(melaoManutencao.includes('/services/servicos.html#tecnica-mulching-organico'));
const melaoFert = context.linkifyTechniques(melao.fertilizacao_organica);
assert(melaoFert.includes('/services/servicos.html#tecnica-composto-superficie'));
const melaoPrevencao = context.linkifyPestsAndTechniques(melao.prevencao_sem_pesticidas, pestIndex, 'melao', melao.nome);
assert(melaoPrevencao.includes('>Rotação</a>'), 'a palavra completa "Rotação" deve ficar dentro do link, não só "Rotaç"');
assert(melaoPrevencao.includes('/services/servicos.html#tecnica-mulching-organico'));

// Sem termo reconhecido no texto, não há ligação nenhuma (não inventa técnica).
assert.equal(context.linkifyTechniques('Um texto qualquer sem termos técnicos.').includes('<a '), false);
assert.equal(context.linkifyPests('Um texto sem nenhuma praga referida.', pestIndex, 'tomate', 'Tomate').includes('<a '), false);

console.log(`Teia hortícolas-pragas-técnicas validada (estilo wikipedia): ${Object.keys(horticolas).length} culturas, ${pragas.length} pragas, sem correspondências ambíguas ou fabricadas.`);
