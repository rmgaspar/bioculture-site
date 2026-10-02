import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
// Derived data from the full species inventory (data/especies_master.json), so pages load only what they show:
//  - data/especies-indice.json: slim records for the catalogue, search and cross-links.
//  - data/especies/b<N>.json: full records grouped in hash buckets; a species page loads a single bucket.
//  - data/especies-encontro.json: ids eligible for the daily "encounter" on the home page.
//  - data/crops-global-summary.json: only the metadata of the (large) global crops catalogue.
export const BUCKETS = 64;
// Must match the browser implementation in assets/js/biocultura-i18n-runtime.js (BioCulturaSpecies.bucket).
export function bucket(id) {
  let hash = 0x811c9dc5;
  const text = String(id).normalize('NFC');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % BUCKETS;
}

const master = JSON.parse(readFileSync('data/especies_master.json', 'utf8'));
const slimFields = ['nome', 'nome_cientifico', 'grupo', 'imagem', 'iucn_global', 'estatuto', 'invasora'];
const index = {};
const buckets = Array.from({ length: BUCKETS }, () => ({}));
for (const [id, record] of Object.entries(master)) {
  index[id] = Object.fromEntries(slimFields.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
  buckets[bucket(id)][id] = record;
}
writeFileSync('data/especies-indice.json', JSON.stringify(index));
rmSync('data/especies', { recursive: true, force: true });
mkdirSync('data/especies', { recursive: true });
buckets.forEach((rows, number) => writeFileSync(`data/especies/b${number}.json`, JSON.stringify(rows)));

// Same eligibility rules the home page applied to the whole inventory: a real synthesis, not a repeated name.
const dashTitle = /—| - /;
const englishHint = /\b(the|is a|species of|found in|native to|belongs to)\b/i;
const ptAccent = /[àáâãçéêíóôõú]/i;
const translated = new Set([
  ...Object.keys(JSON.parse(readFileSync('assets/lang/auto/en.json', 'utf8'))),
  ...Object.keys(JSON.parse(readFileSync('assets/lang/display/en.json', 'utf8'))),
]);
const sentences = (text) => String(text).trim().split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/);
const portuguese = [], english = [];
for (const [id, x] of Object.entries(master)) {
  const nome = String(x.nome || ''), sintese = String(x.sintese || '').trim();
  if (dashTitle.test(nome)) continue;
  if (!sintese || sintese === '-' || sintese.length < 100) continue;
  if (sintese.startsWith(nome)) continue;
  const rawEnglish = englishHint.test(sintese) && !ptAccent.test(sintese);
  if (!rawEnglish) portuguese.push(id);
  // In English a record qualifies when its text is already English or every sentence has a translation.
  if (rawEnglish || sentences(sintese).every(sentence => translated.has(sentence.trim()))) english.push(id);
}
writeFileSync('data/especies-encontro.json', JSON.stringify({ pt: portuguese, en: english }));

const crops = JSON.parse(readFileSync('data/crops-global-catalogue.json', 'utf8'));
writeFileSync('data/crops-global-summary.json', JSON.stringify({ meta: crops.meta }));
console.log(`Espécies: ${Object.keys(master).length} registos, índice + ${BUCKETS} blocos, ${portuguese.length} (PT) e ${english.length} (EN) para o encontro do dia.`);
