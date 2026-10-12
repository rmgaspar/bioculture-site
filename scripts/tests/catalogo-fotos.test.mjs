import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Fotos do catálogo de espécies vindas do iNaturalist: só licenças que permitem uso comercial e adaptação
// (CC0, CC BY, CC BY-SA, domínio público), com autor e ligação à origem. Para refazer: scripts/catalogo/licencas-fotos.py.
const master = JSON.parse(readFileSync('data/especies_master.json', 'utf8'));
const permitidas = new Set(['CC0', 'CC BY', 'CC BY-SA', 'Domínio público']);
let inat = 0;
for (const [id, especie] of Object.entries(master)) {
  const url = especie.imagem || '';
  if (!/inaturalist/.test(url)) continue;
  inat += 1;
  assert(url.startsWith('https://inaturalist-open-data.s3.amazonaws.com/photos/'), `${id}: foto fora do repositório aberto do iNaturalist (${url})`);
  const f = especie.foto;
  assert(f, `${id}: foto sem crédito`);
  assert(permitidas.has(f.licenca), `${id}: licença não permitida (${f.licenca})`);
  assert(f.autor && /^https:\/\/creativecommons\.org\//.test(f.licenca_url) && /^https:\/\/www\.inaturalist\.org\/photos\/\d+$/.test(f.pagina), `${id}: crédito incompleto`);
  if (f.licenca !== 'CC0' && f.licenca !== 'Domínio público') assert(f.autor !== 'iNaturalist', `${id}: ${f.licenca} exige o nome do autor`);
}
assert(inat > 3500, 'esperadas mais de 3500 fotos do iNaturalist no catálogo');

// Pragas, hortícolas e fauna/flora invasora: sem imagens da Koppert nem da extensão da UMN (direitos reservados); as da Wikimedia
// e do iNaturalist têm licença permissiva e crédito. Para refazer: scripts/catalogo/fotos-terceiros.py.
const lerLista = (nome) => {
  const d = JSON.parse(readFileSync(`data/${nome}.json`, 'utf8'));
  return Array.isArray(d) ? d.map((x) => [x.id, x]) : Object.entries(d);
};
const licencaOk = /^(CC BY(-SA)? \d\.\d( \w+)?|CC BY(-SA)?|CC0( 1\.0)?|Public domain|Domínio público)$/i;
for (const nome of ['pragas', 'horticolas_master', 'fauna_invasora', 'flora_invasora']) {
  for (const [id, r] of lerLista(nome)) {
    const url = r.imagem || '';
    assert(!/koppert|extension\.umn|plantar\.pt|invasoras\.pt/.test(url), `${nome}/${id}: imagem de terceiros sem licença (${url})`);
    if (/wikimedia\.org|inaturalist/.test(url)) {
      const f = r.foto;
      assert(f && f.autor && licencaOk.test(f.licenca) && /^https:\/\//.test(f.pagina), `${nome}/${id}: foto sem crédito ou com licença não permitida`);
    }
  }
}

// Nenhuma ficha do catálogo de espécies usa imagens do plantar.pt (© sem licença).
for (const [id, e] of Object.entries(master)) assert(!/plantar\.pt|invasoras\.pt|koppert/.test(e.imagem || ''), `${id}: imagem de terceiros sem licença`);
