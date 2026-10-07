/* Página «Notícias»: todas as notícias publicadas, com filtros por onde (Portugal ou mundo), tema e tipo, pesquisa e ordem.
   O estado vive no endereço (?onde=portugal&tema=agua&tipo=estudo&q=…&ordem=recentes), por isso partilha-se e sobrevive ao «Voltar». */
(function () {
    "use strict";

    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const News = window.BioCultureNews;
    const STEP = 12;

    // Menu lateral e regresso ao cartão de onde se saiu (como nos hubs).
    if (!window.__bioNewsReturn && !document.querySelector('script[src*="bioculture-news-return.js"]')) {
        const script = document.createElement("script");
        script.src = "/assets/js/bioculture-news-return.js?v=2";
        document.head.appendChild(script);
    }
    fetch("/sidebar-content.html?v=24").then((response) => (response.ok ? response.text() : "")).then((html) => {
        if (html) document.getElementById("sidebar").innerHTML = html;
    }).catch(() => {});

    const THEMES = [
        ["agua", "Água", "Water"], ["ar", "Ar", "Air"], ["solo", "Solo", "Soil"], ["biodiversidade", "Biodiversidade", "Biodiversity"],
        ["agricultura", "Agricultura e alimentação", "Farming and food"], ["energia", "Energia", "Energy"], ["mineracao", "Mineração", "Mining"],
        ["impacto-digital", "Impacto digital e IA", "Digital impact and AI"], ["pecuaria", "Pecuária", "Livestock"],
        ["clima", "Clima e oceanos", "Climate and oceans"], ["terra", "Território e outros", "Territory and other"],
    ];
    const SCOPES = [["portugal", "Portugal", "Portugal"], ["mundo", "Mundo", "World"]];
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const el = (id) => document.getElementById(id);

    // Textos da interface (o resto da página é traduzido pelo runtime).
    el("news-search").placeholder = tr("Pesquisar no título e no resumo…", "Search titles and summaries…");
    el("news-search").previousElementSibling.textContent = tr("Pesquisar notícias", "Search news");
    el("news-order").previousElementSibling.textContent = tr("Ordenar", "Sort");
    el("news-order").options[0].textContent = tr("Relevância, com as mais recentes à frente", "Relevance, most recent first");
    el("news-order").options[1].textContent = tr("Mais recentes primeiro", "Most recent first");
    document.querySelector('[data-group="ambito"] .news-filter-label').textContent = tr("Onde", "Where");
    document.querySelector('[data-group="tema"] .news-filter-label').textContent = tr("Tema", "Topic");
    document.querySelector('[data-group="tipo"] .news-filter-label').textContent = tr("Tipo", "Type");
    el("news-clear").textContent = tr("Limpar filtros", "Clear filters");
    el("news-filters").setAttribute("aria-label", tr("Filtros de notícias", "News filters"));

    const query = new URLSearchParams(location.search);
    const state = {
        onde: ["portugal", "mundo"].includes(query.get("onde")) ? query.get("onde") : "",
        tema: query.get("tema") || "",
        tipo: query.get("tipo") || "",
        q: query.get("q") || "",
        ordem: query.get("ordem") === "recentes" ? "recentes" : "relevancia",
        shown: STEP,
    };
    let rows = [];

    const inPortugal = (item) => item.ambito === "portugal" || (item.paises || []).includes("PT");
    function prepare(items) {
        return items.filter((item) => item.estado !== "proposta").map((item) => {
            const content = item.pt || {};
            const english = item.en || {};
            return {
                item,
                themes: News.themes(item),
                tipo: item.tipo_conteudo || "",
                onde: inPortugal(item) ? "portugal" : "mundo",
                text: normalize(`${content.titulo} ${content.resumo_biocultura} ${english.titulo} ${english.resumo_biocultura} ${item.fonte}`),
            };
        });
    }

    // `skip` deixa de fora um grupo para contar as opções desse grupo com os outros filtros aplicados.
    function matches(row, skip) {
        if (skip !== "onde" && state.onde && row.onde !== state.onde) return false;
        if (skip !== "tema" && state.tema && !row.themes.includes(state.tema)) return false;
        if (skip !== "tipo" && state.tipo && row.tipo !== state.tipo) return false;
        if (state.q) {
            const terms = normalize(state.q).split(/\s+/).filter(Boolean);
            if (!terms.every((term) => row.text.includes(term))) return false;
        }
        return true;
    }

    function chips(group, options, key) {
        const container = el(`chips-${group}`);
        const base = rows.filter((row) => matches(row, group));
        const all = `<button type="button" data-group="${group}" data-value="" aria-pressed="${state[key] === ""}">${tr("Todos", "All")}<small>${base.length}</small></button>`;
        container.innerHTML = all + options.map(([value, label]) => {
            const count = base.filter((row) => (group === "tema" ? row.themes.includes(value) : group === "tipo" ? row.tipo === value : row.onde === value)).length;
            const selected = state[key] === value;
            return `<button type="button" data-group="${group}" data-value="${value}" aria-pressed="${selected}"${count === 0 && !selected ? " disabled" : ""}>${label}<small>${count}</small></button>`;
        }).join("");
    }

    function render() {
        const typeLabels = News.typeLabels;
        const present = [...new Set(rows.map((row) => row.tipo).filter((tipo) => typeLabels[tipo]))];
        const counts = (tipo) => rows.filter((row) => row.tipo === tipo).length;
        chips("ambito", SCOPES.map(([value, pt, en]) => [value, tr(pt, en)]), "onde");
        chips("tema", THEMES.filter(([key]) => rows.some((row) => row.themes.includes(key))).map(([value, pt, en]) => [value, tr(pt, en)]), "tema");
        chips("tipo", present.sort((a, b) => counts(b) - counts(a)).map((tipo) => [tipo, typeLabels[tipo][isEnglish ? 1 : 0]]), "tipo");

        let list = rows.filter((row) => matches(row)).map((row) => row.item);
        list = state.ordem === "recentes" ? [...list].sort((a, b) => News.compare(a, b)) : News.rank(list);
        const total = list.length;
        el("news-count").textContent = total === 1
            ? tr("1 notícia", "1 story")
            : tr(`${total} notícias`, `${total} stories`);
        el("news-grid").innerHTML = total
            ? list.slice(0, state.shown).map((item) => News.cardHtml(item)).join("")
            : `<p class="news-empty">${tr("Nenhuma notícia com estes filtros. Tenta tirar um filtro ou mudar a pesquisa.", "No stories match these filters. Try removing a filter or changing the search.")}</p>`;
        const remaining = total - state.shown;
        const toggle = el("news-toggle");
        toggle.hidden = remaining <= 0;
        toggle.textContent = tr(`Ver mais (${remaining} restantes)`, `Show more (${remaining} left)`);
        el("news-clear").hidden = !(state.onde || state.tema || state.tipo || state.q);
        el("news-search").value = state.q;
        el("news-order").value = state.ordem;
        syncUrl();
    }

    function syncUrl() {
        const next = new URLSearchParams(location.search);
        [["onde", state.onde], ["tema", state.tema], ["tipo", state.tipo], ["q", state.q.trim()], ["ordem", state.ordem === "recentes" ? "recentes" : ""]].forEach(([key, value]) => {
            if (value) next.set(key, value); else next.delete(key);
        });
        const text = next.toString();
        try { history.replaceState(null, "", `${location.pathname}${text ? `?${text}` : ""}${location.hash}`); } catch (_) {}
    }

    document.addEventListener("click", (event) => {
        const chip = event.target.closest && event.target.closest(".news-chips button");
        if (chip && !chip.disabled) {
            const key = { ambito: "onde", tema: "tema", tipo: "tipo" }[chip.dataset.group];
            state[key] = state[key] === chip.dataset.value ? "" : chip.dataset.value;
            state.shown = STEP;
            render();
        }
    });
    el("news-toggle").addEventListener("click", () => { state.shown += STEP; render(); });
    el("news-clear").addEventListener("click", () => { Object.assign(state, { onde: "", tema: "", tipo: "", q: "", shown: STEP }); render(); });
    el("news-order").addEventListener("change", (event) => { state.ordem = event.target.value; state.shown = STEP; render(); });
    let timer = 0;
    el("news-search").addEventListener("input", (event) => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = event.target.value; state.shown = STEP; render(); el("news-search").focus(); }, 200);
    });

    fetch("/data/noticias.json").then((response) => { if (!response.ok) throw new Error("noticias"); return response.json(); })
        .then((items) => { rows = prepare(items); render(); })
        .catch(() => { el("news-grid").innerHTML = `<p class="news-empty">${tr("Não foi possível carregar as notícias.", "The news could not be loaded.")}</p>`; });
})();
