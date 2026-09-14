import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/localidades.json', 'utf8'));
const source = readFileSync('assets/js/biocultura-shell.js', 'utf8').replace(/export \{[^}]+\};/, '');
function setup(fetcher = async () => ({ok:true,json:async()=>data})) {
    const timers = new Map(); let tick=0, reloads=0;
    const storage = new Map();
    const node = () => ({value:'',style:{},attrs:{},children:[],textContent:'',disabled:false,
        setAttribute(k,v){this.attrs[k]=v;}, removeAttribute(k){delete this.attrs[k];},
        appendChild(c){this.children.push(c);},querySelector(){return {textContent:''};}});
    const nodes = Object.fromEntries(['loc-dropdown','loc-search-input','bio-location-status','btn-gps-trigger'].map(id=>[id,node()]));
    Object.defineProperty(nodes['loc-dropdown'],'innerHTML',{set(){this.children=[];}});
    const localStorage = {getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
    const location = {search:'',hostname:'localhost',protocol:'http:',reload(){reloads++;}};
    const context=vm.createContext({URL,URLSearchParams,AbortController,console,location,localStorage,
        window:{location,localStorage,isSecureContext:true},navigator:{geolocation:{getCurrentPosition(){}}},
        document:{cookie:'',documentElement:{},getElementById:id=>nodes[id],createElement:node,dispatchEvent(){}},CustomEvent:class{},
        fetch:fetcher,setTimeout:fn=>{timers.set(++tick,fn);return tick;},clearTimeout:id=>timers.delete(id)});
    vm.runInContext(source,context);
    return {context,nodes,storage,reloads:()=>reloads,async runTimer(){const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();}};
}
const a=setup();
assert.equal(a.context.matchingRegions(data,'  cardigos  ')[0].titulo,'Cardigos');
assert(a.context.matchingRegions(data,'agueda').length);
assert(a.context.matchingRegions(data,'Cardigos Mação').some(x=>x.titulo==='Cardigos'));
assert.equal(a.context.coordinates({lat:null,lon:null}),null);
assert.equal(a.context.coordinates({lat:'',lon:' '}),null);
assert.equal(a.context.coordinates({lat:91,lon:0}),null);
assert.equal(a.context.coordinates({lat:0,lon:0}).latitude,0);
a.context.search('Cardigos');await a.runTimer();
assert.equal(a.nodes['loc-dropdown'].style.display,'block');
assert.equal(a.nodes['loc-dropdown'].children.length,1);
a.nodes['loc-dropdown'].children[0].onclick();
assert.equal(a.storage.get('biocultura_region'),data.find(x=>x.titulo==='Cardigos').id);
assert.equal(a.reloads(),1);
a.context.search('zzzzzzzz');await a.runTimer();assert(a.nodes['bio-location-status'].textContent.includes('não encontrada'));
let calls=0;const retry=setup(async()=>{if(++calls===1)throw Error('offline');return{ok:true,json:async()=>data};});
await assert.rejects(retry.context.regions());await retry.context.regions();assert.equal(calls,2);
let resolveData;const race=setup(()=>new Promise(resolve=>{resolveData=resolve;}));
race.context.search('Cardigos');const pending=race.runTimer();race.context.closeResults();
resolveData({ok:true,json:async()=>data});await pending;assert.equal(race.nodes['loc-dropdown'].style.display,'none');
const gps=setup();let success,error;
gps.context.navigator.geolocation.getCurrentPosition=(ok,fail)=>{success=ok;error=fail;};
await gps.context.locate();assert(gps.nodes['btn-gps-trigger'].disabled);
const cardigos=data.find(x=>x.titulo==='Cardigos');await success({coords:{latitude:cardigos.lat,longitude:cardigos.lon}});
assert.equal(gps.storage.get('biocultura_region'),cardigos.id);assert(!gps.nodes['btn-gps-trigger'].disabled);
for(const code of [1,2,3]){await gps.context.locate();error({code});assert(!gps.nodes['btn-gps-trigger'].disabled);assert(gps.nodes['bio-location-status'].textContent);}
await gps.context.locate();await success({coords:{latitude:0,longitude:0}});assert(gps.nodes['bio-location-status'].textContent.includes('Sem localidade próxima'));
const blocked=setup();blocked.context.localStorage.setItem=()=>{throw Error('blocked');};blocked.context.choose(cardigos);assert.equal(blocked.reloads(),0);assert(blocked.nodes['bio-location-status'].textContent.includes('armazenamento'));
console.log('Localização: pesquisa, seleção, acentos/concelho, concorrência, recuperação de rede, coordenadas, GPS e erros validados.');
