import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(`data/${name}.json`, 'utf8'));
const pragas = read('pragas'), castas = read('castas');
const context = vm.createContext({
    document: { getElementById: () => ({ innerHTML: '' }) },
    fetch: () => new Promise(() => {}),
});
vm.runInContext(readFileSync('assets/js/pages/calendario-enologia-2.js', 'utf8'), context);

// Réplica do filtro interno de vinePests() (pragasDB é uma variável de módulo,
// não exposta pelo vm) para poder testar linkifySensibilidade isoladamente.
const vinePests = pragas.filter((item) => {
    const text = [item.nome_comum, item.descricao, ...(item.plantas_afetadas || [])]
        .join(' ').toLowerCase();
    return /videira|vinha|uva/.test(text);
});
assert(vinePests.length > 0, 'deve haver pelo menos uma praga de videira nos dados reais');

// Wikipedia-style: o termo "Míldio"/"Oídio" nas sensibilidades de uma casta liga à
// praga de videira correspondente, confirmada pelos dados (nunca por adivinhação).
assert.equal(
    context.linkifySensibilidade('Míldio', vinePests),
    '<a href="/ecossistemas/especie-detalhe.html?id=mildio-da-videira">Míldio</a>',
);
assert(context.linkifySensibilidade('Oídio em ambientes húmidos', vinePests)
    .includes('/ecossistemas/especie-detalhe.html?id=oidio-da-videira'));

// Termos que não correspondem a nenhuma praga de videira confirmada (fenómenos
// fisiológicos, não organismos, ou pragas sem entrada específica de videira) ficam
// como texto simples — nunca inventa uma ligação.
for (const termo of ['Desavinho', 'Escaldão', 'Ácaros', 'Vírus do enrolamento', 'Coulure']) {
    const out = context.linkifySensibilidade(termo, vinePests);
    assert(!out.includes('<a '), `"${termo}" não deve gerar link (sem praga de videira confirmada)`);
    assert.equal(out, termo);
}

// Escapa HTML corretamente mesmo sem correspondência.
assert.equal(context.linkifySensibilidade('<script>x</script>', vinePests),
    '&lt;script&gt;x&lt;/script&gt;');

// Todas as castas reais: cada sensibilidade linkada tem de apontar para uma praga
// que está de facto na lista de pragas de videira.
const vineIds = new Set(vinePests.map((p) => p.id));
for (const casta of castas) {
    for (const termo of casta.sensibilidades || []) {
        const out = context.linkifySensibilidade(termo, vinePests);
        const match = out.match(/id=([a-z0-9-]+)"/);
        if (match) assert(vineIds.has(match[1]), `Ligação para praga desconhecida: ${match[1]}`);
    }
}

console.log(`Sensibilidades das castas validadas: ${castas.length} castas, ${vinePests.length} pragas de videira, sem ligações inventadas.`);
