import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(name, 'utf8'));
const config = read('catalogo/config.json');
assert.equal(config.vendas_ativas, false);
assert.equal(config.catalogo_publico, false); // The full storefront/checkout stays closed.
assert.equal(config.indice_informativo_publico, true);
const source = read('catalogo/solucoes.json');
const categories = read('catalogo/categorias.json');
const profiles = read('data/gestao-solucoes.json').perfis;
const pests = read('data/pragas.json');
const weeds = read('data/flora_invasora.json');
const fauna = read('data/fauna_invasora.json');
const targetName = id => pests.find(p => p.id === id)?.nome_comum || weeds.find(w => w.id === id)?.nome_comum || fauna.find(f => f.id === id)?.nome_comum || id;
const allProducts = read('catalogo/produtos.json');
const translate = name => { assert(name.pt && name.en); return {pt:name.pt,en:name.en}; };
// Explicit public projection. Never spread research, supplier, verification or commercial-negotiation records.
const publishedProducts = config.produtos_publico ? allProducts.filter(p => p.publicado) : [];
const productsBySolution = id => publishedProducts.filter(p => p.solucao_id === id).map(p => ({
    id: p.id,
    nome: translate(p.nome),
    marca: p.marca,
    descricao_curta: translate(p.descricao_curta),
    descricao: translate(p.descricao),
    beneficios: p.beneficios.map(translate),
    modo_aplicacao: (p.modo_aplicacao.pt && p.modo_aplicacao.en) ? translate(p.modo_aplicacao) : null,
    imagem: p.imagem,
    embalagem: p.embalagem.quantidade ? p.embalagem : null,
    disponivel: p.venda_ativa,
    // Price only ever leaves this projection when the product's own sale switch is on.
    preco: p.venda_ativa ? {valor:p.preco_referencia.valor,moeda:p.preco_referencia.moeda,iva_incluido:p.preco_referencia.iva_incluido} : null,
}));
const output = {
    versao: 1, estado: 'em_preparacao', vendas_ativas: false,
    categorias: categories.map(c => ({id:c.id,nome:translate(c.nome)})),
    solucoes: source.map(s => ({
        id:s.id, nome:translate(s.nome), categoria_id:s.categoria_id, tipo:s.tipo,
        estado:'em_estudo', tecnica_id: s.tecnica_id || null,
        fichas: [...new Set(profiles.filter(p => p.opcoes.some(o => o.solucao_id === s.id)).flatMap(p => p.alvos))]
            .map(id => ({id, nome: targetName(id),
                href:'/ecossistemas/especie-detalhe.html?id='+encodeURIComponent(id)+'#solucoes'})),
        produtos: productsBySolution(s.id),
    })),
};
writeFileSync('data/solucoes-catalogo.json', JSON.stringify(output,null,2)+'\n');
console.log(`Índice informativo: ${output.solucoes.length} soluções; ${publishedProducts.length} produtos publicados; vendas desativadas.`);
