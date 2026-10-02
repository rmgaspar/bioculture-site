import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// Derived data from the full territorial profiles (data/bioregioes.json):
//  - data/localidades.json: slim index used by the location search.
//  - data/regioes/<id>.json: one profile per locality, so each page loads only the selected one.
const regions = JSON.parse(readFileSync('data/bioregioes.json', 'utf8'));
const fields = ['id', 'titulo', 'concelho', 'distrito', 'pais', 'lat', 'lon', 'latitude', 'longitude'];
const rows = regions.map(row => Object.fromEntries(fields.filter(key => row[key] !== undefined).map(key => [key, row[key]])));
writeFileSync('data/localidades.json', JSON.stringify(rows) + '\n');
console.log(`Índice territorial: ${rows.length} localidades.`);

rmSync('data/regioes', { recursive: true, force: true });
mkdirSync('data/regioes', { recursive: true });
for (const region of regions) writeFileSync(`data/regioes/${region.id}.json`, JSON.stringify(region));
writeFileSync('data/regioes/_default.json', JSON.stringify(regions[0]));
console.log(`Perfis territoriais: ${regions.length} ficheiros em data/regioes/.`);
