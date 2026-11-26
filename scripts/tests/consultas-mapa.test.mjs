import assert from 'node:assert/strict';
import { estadoDoMapa, avisosDoMapa } from '../consultas-mapa-estado.mjs';

// Mapa das consultas (Renováveis e território): atributos curados ligados às consultas reais e valores válidos.
const estado = estadoDoMapa();
const { meta } = estado;
const cats = new Set(['solar', 'eolica', 'hibrido', 'mineracao', 'biometano', 'solo', 'plano', 'outro']);
const ac = new Set(['dentro', 'junto', 'fora', 'nd']);
const haTipos = new Set(['estudo', 'intervencao', 'concessao', 'implantacao', 'desflorestar', 'agua', 'projeto']);
// Consultas que entretanto encerraram saem do mapa sozinhas (a atualização semanal passa-as para «encerradas»):
// os atributos ficam por limpar, mas isso não é um erro — avisa. Falha só se o id não existir em nenhuma lista.
for (const id of estado.desconhecidas) {
  assert.fail(`consulta desconhecida no mapa: ${id} (id errado? retirar de data/consultas-mapa.json)`);
}
for (const [id, m] of Object.entries(meta)) {
  assert(cats.has(m.cat), `categoria inválida em ${id}`);
  assert(ac.has(m.ac), `áreas classificadas inválidas em ${id}`);
  assert(m.nome && m.nome_en, `falta nome PT/EN em ${id}`);
  if (m.mw !== undefined) assert(m.mw > 0, `potência inválida em ${id}`);
  if (m.ha !== undefined) { assert(m.ha > 0, `área inválida em ${id}`); assert(haTipos.has(m.ha_tipo), `falta o tipo de área em ${id}`); }
  // «numeros»: dois ou três factos do documento do promotor, com valor e legenda nas duas línguas.
  if (m.numeros !== undefined) {
    assert(Array.isArray(m.numeros) && m.numeros.length >= 2 && m.numeros.length <= 3, `${id}: «numeros» deve ter dois ou três factos`);
    for (const n of m.numeros) {
      assert(n.v && /\d/.test(n.v), `${id}: cada número precisa de um valor com algarismos`);
      assert(n.t && n.t_en, `${id}: falta a legenda PT/EN de «${n.v}»`);
      assert(n.v.length <= 18 && n.t.length <= 90 && n.t_en.length <= 90, `${id}: «${n.v}» é comprido demais para o cartão`);
      if (n.v_en !== undefined) assert(/\d/.test(n.v_en), `${id}: valor em inglês inválido em «${n.v}»`);
    }
  }
}
// Atributos de consultas encerradas e consultas em curso sem atributos: avisa mas não falha.
for (const linha of avisosDoMapa(estado)) console.log(linha);
console.log('consultas-mapa: ok');
