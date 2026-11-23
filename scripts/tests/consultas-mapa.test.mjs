import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Mapa das consultas (Renováveis e território): atributos curados ligados às consultas reais e valores válidos.
const z = JSON.parse(readFileSync('data/zaer_critico.json', 'utf8')).consultas_participa;
const meta = JSON.parse(readFileSync('data/consultas-mapa.json', 'utf8')).itens;
const ids = new Set([...(z.abertas || []), ...(z.em_analise || [])].map((x) => x.id));
const encerradas = new Set((z.encerradas || []).map((x) => x.id));
const cats = new Set(['solar', 'eolica', 'hibrido', 'mineracao', 'biometano', 'solo', 'plano', 'outro']);
const ac = new Set(['dentro', 'junto', 'fora', 'nd']);
const haTipos = new Set(['estudo', 'intervencao', 'concessao', 'implantacao', 'desflorestar', 'agua', 'projeto']);
// Consultas que entretanto encerraram saem do mapa sozinhas (a atualização semanal passa-as para «encerradas»):
// os atributos ficam por limpar, mas isso não é um erro — avisa. Falha só se o id não existir em lado nenhum.
const fechadas = [];
for (const [id, m] of Object.entries(meta)) {
  if (!ids.has(id)) {
    assert(encerradas.has(id), `consulta desconhecida no mapa: ${id} (id errado? retirar de data/consultas-mapa.json)`);
    fechadas.push(id);
  }
  assert(cats.has(m.cat), `categoria inválida em ${id}`);
  assert(ac.has(m.ac), `áreas classificadas inválidas em ${id}`);
  assert(m.nome && m.nome_en, `falta nome PT/EN em ${id}`);
  if (m.mw !== undefined) assert(m.mw > 0, `potência inválida em ${id}`);
  if (m.ha !== undefined) { assert(m.ha > 0, `área inválida em ${id}`); assert(haTipos.has(m.ha_tipo), `falta o tipo de área em ${id}`); }
}
if (fechadas.length) console.log(`atributos de consultas já encerradas (podem sair de data/consultas-mapa.json): ${fechadas.join(', ')}`);
// Cada consulta atual com concelhos deve ter atributos (senão entra no mapa sem tamanho): avisa mas não falha.
const sem = [...ids].filter((id) => !meta[id]);
if (sem.length) console.log(`consultas sem atributos no mapa (entram sem tamanho): ${sem.join(', ')}`);
console.log('consultas-mapa: ok');
