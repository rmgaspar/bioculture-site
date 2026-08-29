(() => {
  'use strict';
  const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'pt';
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const container = document.getElementById('regeneration-news');
  if (!container) return;
  if (lang === 'en') {
    document.querySelector('#news .eyebrow').textContent = '07 · Latest';
    document.querySelector('#news h2').textContent = 'Agriculture in transformation';
    document.querySelector('#news .section-head p').textContent = 'Selected news on organic agriculture, seeds, soil, water, climate, cultivated biodiversity and crop protection.';
  }
  fetch('/data/noticias.json').then(response => response.json()).then(items => {
    const selected = items.filter(item => {
      const content = window.BioCultureI18n?.content(item) || item.pt || item;
      return /agricult|agroecolog|biológic|organic|solo|soil|semente|seed|hort|cultiv|crop|rega|irrig|compost|poliniz|pest|praga/i.test(
        [item.categoria, item.categoria_id, ...(item.categorias || []), content.titulo, content.resumo].filter(Boolean).join(' ')
      );
    }).filter(item => window.BioCultureNews?.visibleIn(item, 'global') ?? true)
      .sort((a,b) => window.BioCultureNews?.compare(a, b) ?? (Date.parse(b.data || '') - Date.parse(a.data || ''))).slice(0, 6);
    container.innerHTML = selected.map(item => {
      const content = window.BioCultureI18n?.content(item) || item.pt || item;
      const date = window.BioCultureI18n?.date(item.data) || item.data || '';
      return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${encodeURIComponent(item.id)}"><span>${esc(date)}</span><h3>${esc(content.titulo || '')}</h3><span class="news-source">${esc(item.fonte || 'bioCulture')}</span></a>`;
    }).join('') || `<p>${lang === 'pt' ? 'Sem notícias desta categoria neste momento.' : 'No news in this category at the moment.'}</p>`;
  }).catch(() => {
    container.innerHTML = `<p>${lang === 'pt' ? 'Não foi possível carregar as notícias.' : 'News could not be loaded.'}</p>`;
  });
})();
