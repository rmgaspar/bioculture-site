import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

// Fotografias editoriais dos capítulos (data/fotos-capitulos.json): ficheiro local, autor, licença que permite uso comercial,
// ligação à origem, texto alternativo e legenda em PT e EN; e cada página que as usa carrega o script e o estilo.
const dados = JSON.parse(readFileSync('data/fotos-capitulos.json', 'utf8'));
const PERMITIDAS = /^(CC0|CC BY( \d\.\d)?|CC BY-SA( \d\.\d)?|domínio público|Copernicus Sentinel)$/;
const PAGINAS = { glossario: 'glossario.html', 'vida-recursos': 'recursos/vida-e-recursos.html', 'pressoes-humanas': 'observatorio/pressoes-humanas.html', noticias: 'observatorio/noticias.html', inicio: 'index.html', conhecimento: 'calendario/conhecimento-cuidar.html', bioweb: 'observatorio/bioweb.html', 'observatorio-terra': 'observatorio/observatorio-terra.html', 'producao-agricola': 'observatorio/producao-agricola.html', biodiversidade: 'ecossistemas/biodiversidade.html', pecuaria: 'energia/pecuaria.html', servicos: 'services/services.html', mongolia: 'recursos/mongolia-solo-cop17.html', finlandia: 'recursos/google-finlandia-floresta.html', douro: 'recursos/douro-apoio-vindimas.html', clima15: 'observatorio/limitar-ultrapassagem-1-5.html', aviacao: 'energia/aviacao.html', 'ambiente-construido': 'energia/ambiente-construido.html', 'moda-texteis': 'energia/moda-texteis.html', vinha: 'calendario/enologia.html', manifesto: 'manifesto.html', contactos: 'contactos.html', energia: 'energia/energia.html', agua: 'recursos/agua.html', ar: 'recursos/ar.html', solo: 'recursos/solo.html', renovaveis: 'energia/transicao-etica.html', mineracao: 'energia/mineracao.html', digital: 'energia/digital.html' };
let total = 0;
for (const [pagina, capitulos] of Object.entries(dados)) {
  const html = readFileSync(PAGINAS[pagina], 'utf8');
  assert(html.includes(`data-pagina="${pagina}"`) && html.includes('capitulo-fotos.js') && html.includes('capitulo-fotos.css'), pagina + ': falta o script ou o estilo');
  for (const id of Object.keys(capitulos).filter((x) => !x.startsWith('cat-') && !x.startsWith('med-'))) if (['biodiversidade', 'pecuaria', 'servicos', 'mongolia', 'finlandia', 'douro', 'clima15', 'conhecimento', 'energia', 'agua', 'ar', 'solo', 'renovaveis'].includes(pagina)) assert(html.includes(`data-foto-slot="${id}"`), pagina + ': sem lugar para ' + id);
  for (const [id, f] of Object.entries(capitulos)) {
    total++;
    assert(existsSync(`images/${f.ficheiro}`), `${pagina}/${id}: ficheiro em falta`);
    assert(f.autor, `${pagina}/${id}: sem autor`);
    assert(PERMITIDAS.test(f.licenca), `${pagina}/${id}: licença não permitida: ${f.licenca}`);
    assert(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(f.pagina), `${pagina}/${id}: sem ligação à origem`);
    for (const campo of ['legenda', 'alt']) assert(f[campo].pt && f[campo].en, `${pagina}/${id}: falta ${campo} em PT ou EN`);
  }
}
const js = readFileSync('assets/js/capitulo-fotos.js', 'utf8');
assert(js.includes('data-no-signature'), 'fotos de terceiros não levam a marca bioCulture (data-no-signature)');
console.log(`Fotografias dos capítulos validadas: ${total}, todas com autor, licença aberta e origem.`);
