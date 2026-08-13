(() => {
  'use strict';
  const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'pt';
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const number = value => new Intl.NumberFormat(lang === 'pt' ? 'pt-PT' : 'en-GB').format(value);
  const text = lang === 'pt' ? {
    profiles:'Fichas profundas', world:'Diversidade mundial', all:'Todas as culturas',
    placeholder:'Pesquisar nome, táxon, cultura, origem ou número de acesso…',
    accessions:'acessos conservados', named:'acessos com nome', taxa:'táxones', origins:'origens documentadas',
    found:'acessos encontrados', more:'Mostrar mais acessos', source:'Ver registo', loading:'A carregar o catálogo mundial…',
    empty:'Nenhum acesso corresponde à pesquisa.', crop:'Cultura', origin:'Origem', unknown:'não indicada'
  } : {
    profiles:'In-depth profiles', world:'World diversity', all:'All crops',
    placeholder:'Search name, taxon, crop, origin or accession number…',
    accessions:'conserved accessions', named:'named accessions', taxa:'taxa', origins:'documented origins',
    found:'accessions found', more:'Show more accessions', source:'View record', loading:'Loading the world catalogue…',
    empty:'No accession matches this search.', crop:'Crop', origin:'Origin', unknown:'not stated'
  };
  let data = null, filtered = [], limit = 30, loadPromise = null, timer = null;
  const profiles = document.getElementById('atlas-profiles');
  const world = document.getElementById('atlas-world');
  const buttons = [...document.querySelectorAll('[data-atlas-mode]')];

  function translate() {
    buttons[0].textContent = text.profiles; buttons[1].textContent = text.world;
    document.getElementById('world-search').placeholder = text.placeholder;
    document.getElementById('world-crop-filter').options[0].text = text.all;
    document.getElementById('world-more').textContent = text.more;
    if (lang === 'en') document.querySelector('.world-provenance').textContent = 'Source: World Vegetable Center, public Genesys PGR catalogue · MCPD v2.1 · collection TWN001.';
  }
  async function load() {
    if (data) return data;
    document.getElementById('world-summary').textContent = text.loading;
    if (!loadPromise) loadPromise = fetch('/data/crops-global-catalogue.json').then(response => {
      if (!response.ok) throw new Error('catalogue');
      return response.json();
    });
    data = await loadPromise;
    document.getElementById('world-proof').innerHTML = [
      [data.meta.accession_count,text.accessions],[data.meta.named_accession_count,text.named],
      [data.meta.taxon_count,text.taxa],[data.meta.origin_count,text.origins]
    ].map(item => `<span><strong>${number(item[0])}</strong>${item[1]}</span>`).join('');
    document.getElementById('world-scope').textContent = data.meta[`scope_note_${lang}`];
    const select = document.getElementById('world-crop-filter');
    select.innerHTML = `<option value="all">${text.all}</option>` + data.crops.map(item => `<option value="${esc(item.name)}">${esc(item.name)} · ${number(item.accessions)}</option>`).join('');
    applyFilters();
    return data;
  }
  function applyFilters(reset = true) {
    if (!data) return;
    if (reset) limit = 30;
    const query = norm(document.getElementById('world-search').value);
    const crop = document.getElementById('world-crop-filter').value;
    filtered = data.named_accessions.filter(row => (crop === 'all' || row[2] === crop) && (!query || norm(row.join(' ')).includes(query)));
    render();
  }
  function render() {
    const grid = document.getElementById('world-grid');
    document.getElementById('world-summary').textContent = `${number(filtered.length)} ${text.found} · ${number(Math.min(limit, filtered.length))} ${lang === 'pt' ? 'visíveis' : 'shown'}`;
    grid.innerHTML = filtered.slice(0, limit).map(row => {
      const [name,taxon,crop,origin,accession,doi] = row;
      const href = doi ? `https://doi.org/${encodeURIComponent(doi)}` : `https://genebank.worldveg.org/#/accession/${encodeURIComponent(accession)}`;
      return `<article class="world-card"><small>${esc(crop || text.unknown)} · ${esc(origin || text.unknown)}</small><h3>${esc(name)}</h3><p><i>${esc(taxon || text.unknown)}</i></p><p>${esc(accession)}</p><a href="${href}" target="_blank" rel="noopener">${text.source} ↗</a></article>`;
    }).join('') || `<p>${text.empty}</p>`;
    document.getElementById('world-more').hidden = filtered.length <= limit;
  }
  async function switchMode(mode) {
    const isWorld = mode === 'world';
    profiles.hidden = isWorld; world.hidden = !isWorld;
    buttons.forEach(button => {
      const active = button.dataset.atlasMode === mode;
      button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active));
    });
    if (isWorld) try { await load(); } catch (error) { document.getElementById('world-summary').textContent = lang === 'pt' ? 'Não foi possível carregar o catálogo.' : 'The catalogue could not be loaded.'; }
  }
  translate();
  buttons.forEach(button => button.addEventListener('click', () => switchMode(button.dataset.atlasMode)));
  document.getElementById('world-search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => applyFilters(true), 180); });
  document.getElementById('world-crop-filter').addEventListener('change', () => applyFilters(true));
  document.getElementById('world-more').addEventListener('click', () => { limit += 30; render(); });
})();
