import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Mapa das consultas (Renováveis e território): atributos curados ligados às consultas reais e valores válidos.
const z = JSON.parse(readFileSync('data/zaer_critico.json', 'utf8')).consultas_participa;
const meta = JSON.parse(readFileSync('data/consultas-mapa.json', 'utf8')).itens;
const ids = new Set([...(z.abertas || []), ...(z.em_analise || [])].map((x) => x.id));
const cats = new Set(['solar', 'eolica', 'hibrido', 'mineracao', 'biometano', 'solo', 'plano', 'outro']);
const ac = new Set(['dentro', 'junto', 'fora', 'nd']);
const haTipos = new Set(['estudo', 'intervencao', 'concessao', 'implantacao', 'desflorestar', 'agua', 'projeto']);
for (const [id, m] of Object.entries(meta)) {
  assert(ids.has(id), `consulta desconhecida no mapa: ${id} (já fechou? retirar de data/consultas-mapa.json)`);
  assert(cats.has(m.cat), `categoria inválida em ${id}`);
  assert(ac.has(m.ac), `áreas classificadas inválidas em ${id}`);
  assert(m.nome && m.nome_en, `falta nome PT/EN em ${id}`);
  if (m.mw !== undefined) assert(m.mw > 0, `potência inválida em ${id}`);
  if (m.ha !== undefined) { assert(m.ha > 0, `área inválida em ${id}`); assert(haTipos.has(m.ha_tipo), `falta o tipo de área em ${id}`); }
}
// Cada consulta atual com concelhos deve ter atributos (senão entra no mapa sem tamanho): avisa mas não falha.
const sem = [...ids].filter((id) => !meta[id]);
if (sem.length) console.log(`consultas sem atributos no mapa (entram sem tamanho): ${sem.join(', ')}`);
console.log('consultas-mapa: ok');
