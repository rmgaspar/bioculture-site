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
        const disponibilidade = product.disponivel
            ? `<span class="hub-tag hub-tag--available">${tr('Disponível','Available')}</span>${product.preco?`<p class="product-price">${esc(money(product.preco))}</p>`:''}`
            : `<span class="hub-tag hub-tag--soon">${tr('Brevemente disponível','Coming soon')}</span>`;
        const detailHref = link('/services/produto-detalhe.html?id=' + encodeURIComponent(product.id));
        const visual = product.imagem ? `<img class="product-image" src="${esc(product.imagem)}" alt="">` : '';
        return `${visual}<div class="product-card-body">${product.marca?`<span class="product-brand">${esc(product.marca)}</span>`:''}<h2><a href="${esc(detailHref)}">${esc(text(product.nome))}</a></h2>${disponibilidade}<p class="product-summary">${esc(text(product.descricao_curta))}</p><a class="card-action" href="${esc(detailHref)}">${tr('Ver ficha completa →','View full details →')}</a></div>`;
    }
    // Category photo is shown once per group (categoryGroup); individual cards stay text-only until each
    // product has its own photo, to avoid repeating the same stock image across every card in a category.
    function card(solution, data) {
        const product = solution.produtos?.[0];
        const isPratica = solution.tipo === 'pratica';
        if (product) {
            return `<article class="product-card" id="${esc(solution.id)}">${productBlock(product)}</article>`;
        }
        const references = solution.fichas.map(f => `<li><a href="${esc(link(f.href))}">${esc(f.nome)} →</a></li>`).join('');
        return `<article class="product-card" id="${esc(solution.id)}"><div class="product-card-body"><h2>${esc(text(solution.nome))}</h2><span class="hub-tag">${isPratica ? tr('Prática em estudo','Practice under study') : tr('Solução em estudo','Solution under study')}</span><details><summary>${tr('O que estamos a preparar','What we are preparing')}</summary><p>${tr('Ficha técnica, utilizações, limitações e documentação. Ainda sem marca ou formulação selecionada.','Technical information, uses, limitations and documentation. No brand or formulation selected yet.')}</p>${references ? `<p>${tr('Antes de escolher, consulte as orientações relacionadas:','Before choosing, read the related guidance:')}</p><ul>${references}</ul>` : `<p>${tr('As orientações específicas serão acrescentadas após revisão das fontes.','Specific guidance will be added after source review.')}</p>`}</details></div></article>`;
    }
    function categoryGroup(category, solutions, data) {
        const items = solutions.map(s => card(s, data)).join('');
        const count = tr(`${solutions.length} soluções em estudo`,`${solutions.length} solutions under study`);
        return `<section class="category-group" id="cat-${esc(category.id)}"><div class="category-banner"><img class="category-image" src="${categoryImageSrc(category.id)}" alt=""><div class="category-banner-body"><h2>${esc(text(category.nome))}</h2><p class="category-count">${esc(count)}</p></div></div><div class="product-grid">${items}</div></section>`;
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
    async function products() {
        const grid = byId('product-grid');
        try {
            const data = productCatalogue(await fetchJSON('/data/solucoes-catalogo.json'));
            const filters = byId('category-filters'), input = byId('product-search');
            input.placeholder = tr('Ex.: composto, micorrizas, armadilhas','E.g. compost, mycorrhizae, traps');
            const requestedCategory = new URLSearchParams(location.search).get('categoria');
            let selected = data.categorias.some(c => c.id === requestedCategory) ? requestedCategory : 'all';
            const filterItems = [{id:'all',nome:{pt:'Todas as famílias',en:'All families'}},...data.categorias];
            filters.innerHTML = filterItems.map(c => `<button type="button" data-category="${esc(c.id)}" aria-pressed="${c.id === selected}">${esc(text(c.nome))}</button>`).join('');
            const render = () => {
                const found = filterSolutions(data, input.value, selected);
                const groups = data.categorias.map(cat => ({cat, items: found.filter(s => s.categoria_id === cat.id)})).filter(g => g.items.length);
                grid.innerHTML = groups.map(g => categoryGroup(g.cat, g.items, data)).join('') || `<div class="catalogue-empty">${tr('Nenhuma solução encontrada. Experimente outro termo ou escolha todas as famílias.','No solutions found. Try another term or select all families.')} <button type="button" id="reset-products">${tr('Limpar pesquisa','Clear search')}</button></div>`;
                byId('product-count').textContent = tr(`${found.length} de ${data.solucoes.length} soluções em estudo`,`${found.length} of ${data.solucoes.length} solutions under study`);
                filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.category === selected)));
                byId('reset-products')?.addEventListener('click',()=>{input.value='';selected='all';render();input.focus();});
            };
            filters.addEventListener('click',event=>{const button=event.target.closest('button[data-category]');if(button){selected=button.dataset.category;render();}});
            input.addEventListener('input',render);
            render();
            const id = location.hash.slice(1);
            if (id && data.solucoes.some(s=>s.id === id)) { const entry=byId(id);entry.querySelector('details')?.setAttribute('open','');entry.scrollIntoView(); }
        } catch (_) {
            grid.innerHTML=`<div class="hub-error" role="alert">${tr('Não foi possível carregar o catálogo.','The catalogue could not be loaded.')} <button type="button" id="retry-products">${tr('Tentar novamente','Try again')}</button></div>`;
            byId('retry-products').addEventListener('click',products);
        }
    }
    async function services() {
        try {
            const data = await fetchJSON('/data/services.json');
            byId('service-areas').innerHTML=data.services.map(s=>`<article class="path-card"><span class="eyebrow">${esc(s.symbol)}</span><h2>${esc(en ? s.en.titulo : s.titulo)}</h2><p>${esc(en ? s.en.descricao : s.descricao)}</p><a class="card-action" href="${esc(link(s.href))}">${tr('Explorar esta área →','Explore this area →')}</a></article>`).join('');
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
