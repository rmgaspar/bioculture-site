import { readFileSync, writeFileSync } from 'node:fs';
// Derived index: preserve region IDs used by the calendar and regional profiles.
const regions = JSON.parse(readFileSync('data/bioregioes.json', 'utf8'));
const fields = ['id', 'titulo', 'concelho', 'distrito', 'pais', 'lat', 'lon', 'latitude', 'longitude'];
const rows = regions.map(row => Object.fromEntries(fields.filter(key => row[key] !== undefined).map(key => [key, row[key]])));
writeFileSync('data/localidades.json', JSON.stringify(rows) + '\n');
console.log(`Índice territorial: ${rows.length} localidades.`);
