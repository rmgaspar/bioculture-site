import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const read = name => JSON.parse(readFileSync(name, 'utf8'));
const data = read('data/gestao-solucoes.json');
const targets = new Set([...read('data/pragas.json'), ...read('data/flora_invasora.json'), ...read('data/fauna_invasora.json')].map(x => x.id));
const solutions = new Set(read('catalogo/solucoes.json').map(x => x.id));
const used = new Set(), ids = new Set();
const translated = value => ['pt', 'en'].every(lang => typeof value?.[lang] === 'string' && value[lang].trim());
assert.equal(data.versao, 1);
for (const profile of data.perfis) {
    assert(!ids.has(profile.id), `Perfil repetido: ${profile.id}`); ids.add(profile.id);
    assert(profile.alvos.length && profile.passos.length && profile.fontes.length);
    assert(translated(profile.contexto) && translated(profile.avaliacao));
    assert(profile.passos.every(translated));
    assert(/^\d{4}-\d{2}-\d{2}$/.test(profile.data_revisao));
    for (const id of profile.alvos) {
        assert(targets.has(id), `Alvo desconhecido: ${id}`);
        assert(!used.has(id), `Alvo com dois perfis: ${id}`); used.add(id);
    }
    for (const option of profile.opcoes) {
        assert(translated(option.nome) && translated(option.condicao));
        assert(option.solucao_id === null || solutions.has(option.solucao_id), 'Solução desconhecida');
    }
    for (const source of profile.fontes) assert(source.nome && new URL(source.url).protocol === 'https:');
}
assert(new URL(data.verificacao_produtos.url).protocol === 'https:');
console.log(`Gestão validada: ${data.perfis.length} perfis documentados para ${used.size} fichas.`);
