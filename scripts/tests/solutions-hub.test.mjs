import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(name,'utf8'));
const data = read('data/solucoes-catalogo.json');
const internal = read('catalogo/solucoes.json');
assert.equal(data.vendas_ativas,false);
assert.equal(data.solucoes.length,40);assert.equal(data.categorias.length,7);
assert.deepEqual(data.solucoes.map(s=>s.id),internal.map(s=>s.id));
for(const s of data.solucoes){
    assert.deepEqual(Object.keys(s).sort(),['id','nome','categoria_id','tipo','estado','fichas'].sort());
    assert(s.nome.pt && s.nome.en);
    assert(data.categorias.some(c=>c.id === s.categoria_id));
}
function context(en=false,hash=''){
    let redirect;
    const ctx=vm.createContext({URL,window:{BioCultureI18n:{isEnglish:en}},location:{href:'https://example.com/services/services.html'+hash,origin:'https://example.com',search:'',hash,replace:url=>{redirect=url;}},
        document:{documentElement:{lang:en?'en':'pt'},body:{dataset:{solutionsPage:'hub'}},querySelectorAll:()=>[]},fetch:()=>new Promise(()=>{})});
    vm.runInContext(readFileSync('assets/js/pages/solutions-hub.js','utf8'),ctx);
    return {api:ctx.window.BioCultureSolutions,redirect:()=>redirect};
}
const {api}=context();
assert.equal(api.filterSolutions(data,'','all').length,40);
assert.equal(api.filterSolutions(data,'acidos humicos','all')[0].id,'acidos-humicos');
assert.equal(api.filterSolutions(data,'mycorrhizae','all')[0].id,'micorrizas');
assert.equal(api.filterSolutions(data,'','fertilidade').length,10);
assert.equal(api.filterSolutions(data,'composto','pragas').length,0);
const soap=data.solucoes.find(s=>s.id==='sabao-potassico');
assert(api.card(soap,data).includes('id=pulgoes#solucoes'));
assert(context(true).api.card(soap,data).includes('lang=en'));
assert(context(false,'#solar').redirect().endsWith('/services/servicos.html#solar'));
assert(context(false,'#agua').redirect().endsWith('/services/servicos.html#chuva'));
const altered={...soap,nome:{pt:'<script>unsafe</script>',en:'test'}};
assert(!api.card(altered,data).includes('<script>'));
const guide=readFileSync('services/servicos.html','utf8');
for(const id of ['biofossa','chuva','solar','solo','calculate-solar','in-fatura','service-areas'])assert(guide.includes(`id="${id}"`));
for(const service of read('data/services.json').services){
    const anchor=service.href.split('#')[1];assert(guide.includes(`id="${anchor}"`));
}
console.log('Hub: exportação pública limitada, 40 soluções, pesquisa/filtros, PT/EN, links de pragas, compatibilidade e serviços validados.');
