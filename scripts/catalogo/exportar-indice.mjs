import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(name, 'utf8'));
const config = read('catalogo/config.json');
assert.equal(config.vendas_ativas, false);
assert.equal(config.catalogo_publico, false); // The commercial catalogue stays closed.
assert.equal(config.indice_informativo_publico, true);
const source = read('catalogo/solucoes.json');
const categories = read('catalogo/categorias.json');
const profiles = read('data/gestao-solucoes.json').perfis;
const pests = read('data/pragas.json');
const translate = name => { assert(name.pt && name.en); return {pt:name.pt,en:name.en}; };
// Explicit public projection. Never spread research, supplier or commercial records.
const output = {
    versao: 1, estado: 'em_preparacao', vendas_ativas: false,
    categorias: categories.map(c => ({id:c.id,nome:translate(c.nome)})),
    solucoes: source.map(s => ({
        id:s.id, nome:translate(s.nome), categoria_id:s.categoria_id, tipo:s.tipo,
        estado:'em_estudo',
        fichas: [...new Set(profiles.filter(p => p.opcoes.some(o => o.solucao_id === s.id)).flatMap(p => p.alvos))]
            .map(id => ({id, nome: pests.find(p => p.id === id)?.nome_comum || id,
                href:'/ecossistemas/especie-detalhe.html?id='+encodeURIComponent(id)+'#solucoes'})),
    })),
};
writeFileSync('data/solucoes-catalogo.json', JSON.stringify(output,null,2)+'\n');
console.log(`Índice informativo: ${output.solucoes.length} soluções; vendas desativadas.`);
