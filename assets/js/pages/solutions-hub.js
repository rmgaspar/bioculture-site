(function () {
    const en = window.BioCultureI18n?.isEnglish ?? (document.documentElement.lang === 'en');
    const tr = (pt, english) => en ? english : pt;
    const text = value => value?.[en ? 'en' : 'pt'] || value?.pt || '';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const byId = id => document.getElementById(id);
    const page = document.body.dataset.solutionsPage;
    function link(href) {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return '#';
        if (en) url.searchParams.set('lang', 'en');
        return url.pathname + url.search + url.hash;
    }
    function filterSolutions(data, query, category) {
        const terms = normalize(query).split(/\s+/).filter(Boolean);
        return data.solucoes.filter(s => (category === 'all' || s.categoria_id === category) &&
            terms.every(term => normalize([s.nome.pt,s.nome.en,
                ...Object.values(data.categorias.find(c => c.id === s.categoria_id)?.nome || {}),
                ...(s.produtos||[]).flatMap(p=>[p.nome.pt,p.nome.en,p.marca])].join(' ')).includes(term)));
    }
    function money(preco) {
        const amount = new Intl.NumberFormat(en?'en-IE':'pt-PT',{style:'currency',currency:preco.moeda||'EUR'}).format(preco.valor);
        return preco.iva_incluido === false ? `${amount} ${tr('+ IVA','+ VAT')}` : amount;
    }
    function categoryImageSrc(categoryId) {
        const id = ['fertilidade','correcao','bioestimulantes','microrganismos','pragas','doencas','prevencao'].includes(categoryId) ? categoryId : 'fertilidade';
        return `/images/categoria-${id}-v1.jpg`;
    }
    function productBlock(product) {
        const detailHref = link('/services/produto-detalhe.html?id=' + encodeURIComponent(product.id));
        const visual = product.imagem ? `<img class="product-image" src="${esc(product.imagem)}" alt="">` : '';
        const kicker = product.disponivel ? tr('Disponível','Available') : tr('Brevemente disponível','Coming soon');
        const price = (product.disponivel && product.preco) ? `<p class="product-price">${esc(money(product.preco))}</p>` : '';
        return `${visual}<div class="product-card-body">${product.marca?`<span class="product-brand">${esc(product.marca)}</span>`:''}<small class="${product.disponivel?'is-available':'is-soon'}">${esc(kicker)}</small><h3><a href="${esc(detailHref)}">${esc(text(product.nome))}</a></h3><p>${esc(text(product.descricao_curta))}</p>${price}<a class="card-action" href="${esc(detailHref)}">${tr('Ver ficha completa →','View full details →')}</a></div>`;
    }
    // Cards follow the same visual language as the other catalogues (calendário, pragas): a small
    // uppercase kicker, a title and a short description, always visible — no accordions.
    function card(solution, data) {
        const product = solution.produtos?.[0];
        const isPratica = solution.tipo === 'pratica';
        if (product) {
            return `<article class="product-card" id="${esc(solution.id)}">${productBlock(product)}</article>`;
        }
        const kicker = isPratica ? tr('Prática em estudo','Practice under study') : tr('Solução em estudo','Solution under study');
        const references = solution.fichas.map(f => `<a href="${esc(link(f.href))}">${esc(f.nome)} →</a>`).join(' ');
        const refsBlock = references ? `<p class="product-refs">${tr('Consulte:','See:')} ${references}</p>` : '';
        return `<article class="product-card product-card--placeholder" id="${esc(solution.id)}"><div class="product-card-body"><small>${esc(kicker)}</small><h3>${esc(text(solution.nome))}</h3><p>${tr('Ficha técnica, utilizações, limitações e documentação. Ainda sem marca ou formulação selecionada.','Technical information, uses, limitations and documentation. No brand or formulation selected yet.')}</p>${refsBlock}</div></article>`;
    }
    function categoryGroup(category, solutions, data) {
        const items = solutions.map(s => card(s, data)).join('');
        const count = tr(`${solutions.length} soluções em estudo`,`${solutions.length} solutions under study`);
        return `<section class="category-group" id="cat-${esc(category.id)}" data-tom="${esc(category.id)}" data-total="${solutions.length}"><div class="category-banner"><img class="category-image" src="${categoryImageSrc(category.id)}" alt=""><div class="category-banner-body"><h2>${esc(text(category.nome))}</h2><p class="category-count">${esc(count)}</p></div></div><div class="product-grid">${items}</div></section>`;
    }
    async function fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) throw Error('HTTP '+response.status);
        return response.json();
    }
    // Practices belong to the técnicas catalogue only — they are the grower's own work, not something bioCulture sells.
    function productCatalogue(raw) {
        return {...raw, solucoes: raw.solucoes.filter(s => s.tipo !== 'pratica')};
    }
    // A barra fixa lê os destinos ao carregar; como as famílias nascem aqui, só a ligamos depois de existirem.
    function barraFixa() {
        if (!document.querySelector('nav.reading-nav') || document.querySelector('script[src*="biocultura-sticky-nav"]')) return;
        const el = document.createElement('script');
        el.src = '/assets/js/biocultura-sticky-nav.js?v=19';
        document.body.appendChild(el);
    }
    async function products() {
        const grid = byId('product-grid');
        try {
            const data = productCatalogue(await fetchJSON('/data/solucoes-catalogo.json'));
            const input = byId('product-search'), nav = document.querySelector('nav.reading-nav');
            input.placeholder = tr('Ex.: neem, micorrizas, armadilhas','E.g. neem, mycorrhizae, traps');
            // Os grupos ficam sempre no sítio (a barra fixa guarda-os); a pesquisa só esconde cartões e grupos sem resultados.
            grid.innerHTML = data.categorias.map(cat => categoryGroup(cat, data.solucoes.filter(s => s.categoria_id === cat.id), data)).join('')
                + `<div class="catalogue-empty" id="product-empty" hidden>${tr('Nenhuma solução encontrada. Experimenta outro termo.','No solutions found. Try another term.')} <button type="button" id="reset-products">${tr('Limpar pesquisa','Clear search')}</button></div>`;
            const groups = [...grid.querySelectorAll('.category-group')], cards = [...grid.querySelectorAll('.product-card')];
            const render = () => {
                const found = new Set(filterSolutions(data, input.value, 'all').map(s => s.id));
                cards.forEach(card => { card.hidden = !found.has(card.id); });
                groups.forEach(group => {
                    const visible = group.querySelectorAll('.product-card:not([hidden])').length, total = Number(group.dataset.total);
                    group.classList.toggle('is-vazio', visible === 0);
                    group.querySelector('.category-count').textContent = visible === total ? tr(`${total} soluções em estudo`,`${total} solutions under study`) : tr(`${visible} de ${total} soluções`,`${visible} of ${total} solutions`);
                    nav?.querySelectorAll(`a[href$="#${group.id}"]`).forEach(a => a.classList.toggle('is-vazio', visible === 0));
                });
                byId('product-empty').hidden = found.size > 0;
                byId('product-count').textContent = tr(`${found.size} de ${data.solucoes.length} soluções em estudo`,`${found.size} of ${data.solucoes.length} solutions under study`);
            };
            input.addEventListener('input', render);
            byId('reset-products').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
            // Um separador da barra cujo grupo ficou escondido pela pesquisa limpa a pesquisa e segue para o grupo.
            nav?.addEventListener('click', event => {
                const a = event.target.closest('a[href*="#cat-"]');
                if (!a || !a.classList.contains('is-vazio')) return;
                event.preventDefault(); event.stopImmediatePropagation();
                input.value = ''; render();
                setTimeout(() => a.click(), 0);
            }, true);
            render();
            barraFixa();
            const requested = new URLSearchParams(location.search).get('categoria');
            if (requested && data.categorias.some(c => c.id === requested)) setTimeout(() => byId('cat-' + requested)?.scrollIntoView(), 350);
            const id = location.hash.slice(1);
            if (id && data.solucoes.some(s=>s.id === id)) byId(id)?.scrollIntoView();
        } catch (_) {
            grid.innerHTML=`<div class="hub-error" role="alert">${tr('Não foi possível carregar o catálogo.','The catalogue could not be loaded.')} <button type="button" id="retry-products">${tr('Tentar novamente','Try again')}</button></div>`;
            byId('retry-products').addEventListener('click',products);
            barraFixa();
        }
    }
    async function services() {
        try {
            const data = await fetchJSON('/data/services.json');
            byId('service-areas').innerHTML=data.services.map(s=>`<article class="path-card" data-tom="${esc(s.id)}"><span class="eyebrow">${esc(s.symbol)}</span><h2>${esc(en ? s.en.titulo : s.titulo)}</h2><p>${esc(en ? s.en.descricao : s.descricao)}</p><a class="card-action" href="${esc(link(s.href))}">${tr('Explorar esta área →','Explore this area →')}</a></article>`).join('');
        } catch (_) {
            byId('service-areas').innerHTML=`<p class="hub-error">${tr('As áreas de apoio estão temporariamente indisponíveis. Os guias continuam disponíveis abaixo.','Support areas are temporarily unavailable. The guides remain available below.')}</p>`;
        }
    }
    // Existing links to the former guide page continue to reach the same content.
    if (page === 'hub' && ['#agua','#biofossa','#chuva','#solar','#solo'].includes(location.hash)) {
        const url=new URL('/services/servicos.html',location.href);
        url.search=location.search;url.hash=location.hash === '#agua' ? '#chuva' : location.hash;
        location.replace(url.href);return;
    }
    if(en) document.querySelectorAll('[data-en]').forEach(node=>{node.innerHTML=node.dataset.en;});
    document.querySelectorAll('a[href]').forEach(a=>a.href=link(a.getAttribute('href')));
    if(page !== 'services') fetch('/sidebar-content.html').then(r=>{if(!r.ok)throw Error('sidebar');return r.text();}).then(html=>{byId('sidebar').innerHTML=html;}).catch(()=>{byId('sidebar').innerHTML=`<a href="${link('/index.html')}">${tr('Página inicial','Home')}</a>`;});
    if(page === 'products') products();
    if(page === 'services') services();
    window.BioCultureSolutions = {filterSolutions,card,productCatalogue};
})();
