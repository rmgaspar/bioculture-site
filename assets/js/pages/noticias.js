/* Página «Notícias»: todas as notícias publicadas, com filtros (de escolha múltipla) por onde (Portugal ou mundo), tema e tipo, nos botões da barra fixa, pesquisa e ordem.
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
    fetch("/sidebar-content.html?v=28").then((response) => (response.ok ? response.text() : "")).then((html) => {
        if (html) document.getElementById("sidebar").innerHTML = html;
    }).catch(() => {});

    const THEMES = [
        ["agua", "Água", "Water"], ["ar", "Ar", "Air"], ["solo", "Solo", "Soil"], ["biodiversidade", "Biodiversidade", "Biodiversity"],
        ["agricultura", "Agricultura e alimentação", "Farming and food"], ["energia", "Energia", "Energy"], ["mineracao", "Mineração", "Mining"],
        ["impacto-digital", "Impacto digital e IA", "Digital impact and AI"], ["pecuaria", "Pecuária", "Livestock"], ["aviacao", "Aviação", "Aviation"],
        ["clima", "Clima e oceanos", "Climate and oceans"], ["terra", "Território e outros", "Territory and other"],
    ];
    const SCOPES = [["portugal", "Portugal", "Portugal"], ["mundo", "Mundo", "World"]];
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const el = (id) => document.getElementById(id);

    el("news-nav-filtros").textContent = tr("Pesquisar ↓", "Search ↓");
    el("news-nav-lista").textContent = tr("Notícias ↓", "News ↓");
    // «Voltar»: à página de onde se veio (se for do próprio site); sem histórico, à página inicial.
    const voltar = el("news-back");
    if (voltar) voltar.addEventListener("click", (event) => {
        let mesmoSite = false;
        try { mesmoSite = document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { mesmoSite = false; }
        if (mesmoSite && history.length > 1) { event.preventDefault(); history.back(); }
    });

    // Textos da interface (o resto da página é traduzido pelo runtime).
    el("news-search").placeholder = tr("Pesquisar no título e no resumo…", "Search titles and summaries…");
    el("news-search").previousElementSibling.textContent = tr("Pesquisar notícias", "Search news");
    el("news-order").previousElementSibling.textContent = tr("Ordenar", "Sort");
    el("news-order").options[0].textContent = tr("Relevância, com as mais recentes à frente", "Relevance, most recent first");
    el("news-order").options[1].textContent = tr("Mais recentes primeiro", "Most recent first");
    const GROUPS = { ambito: { key: "onde", label: tr("Onde", "Where") }, tema: { key: "tema", label: tr("Tema", "Topic") }, tipo: { key: "tipo", label: tr("Tipo", "Type") } };
    Object.entries(GROUPS).forEach(([group, info]) => { document.querySelector(`.news-dd[data-group="${group}"] .news-dd-label`).textContent = info.label; });
    el("news-clear").textContent = tr("Limpar filtros", "Clear filters");
    el("news-filters").setAttribute("aria-label", tr("Filtros de notícias", "News filters"));

    // Cada grupo aceita várias opções (dentro do grupo vale «ou», entre grupos vale «e»); no endereço vão separadas por vírgulas.
    const query = new URLSearchParams(location.search);
    const list = (name) => (query.get(name) || "").split(",").map((value) => value.trim()).filter(Boolean);
    const state = {
        onde: list("onde").filter((value) => ["portugal", "mundo"].includes(value)),
        tema: list("tema"),
        tipo: list("tipo"),
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

    const rowHas = (row, group, value) => (group === "tema" ? row.themes.includes(value) : group === "tipo" ? row.tipo === value : row.onde === value);
    // `skip` deixa de fora um grupo para contar as opções desse grupo com os outros filtros aplicados.
    function matches(row, skip) {
        for (const [group, info] of Object.entries(GROUPS)) {
            const chosen = state[info.key];
            if (group !== skip && chosen.length && !chosen.some((value) => rowHas(row, group, value))) return false;
        }
        if (state.q) {
            const terms = normalize(state.q).split(/\s+/).filter(Boolean);
            if (!terms.every((term) => row.text.includes(term))) return false;
        }
        return true;
    }

    function options(group) {
        if (group === "ambito") return SCOPES.map(([value, pt, en]) => [value, tr(pt, en)]);
        if (group === "tema") return THEMES.filter(([key]) => rows.some((row) => row.themes.includes(key))).map(([value, pt, en]) => [value, tr(pt, en)]);
        const typeLabels = News.typeLabels;
        const present = [...new Set(rows.map((row) => row.tipo).filter((tipo) => typeLabels[tipo]))];
        const counts = (tipo) => rows.filter((row) => row.tipo === tipo).length;
        return present.sort((a, b) => counts(b) - counts(a)).map((tipo) => [tipo, typeLabels[tipo][isEnglish ? 1 : 0]]);
    }

    // Botões da barra fixa («Onde», «Tema», «Tipo») e o menu de escolha múltipla de cada um.
    const panel = document.createElement("div");
    panel.className = "news-dd-panel";
    panel.hidden = true;
    document.body.appendChild(panel);
    let openGroup = "";

    function renderPanel() {
        if (!openGroup) return;
        const info = GROUPS[openGroup];
        const base = rows.filter((row) => matches(row, openGroup));
        const chosen = state[info.key];
        const scroll = panel.querySelector(".news-dd-list")?.scrollTop || 0;
        panel.setAttribute("aria-label", info.label);
        panel.innerHTML = `<div class="news-dd-head"><span>${info.label}</span><button type="button" class="news-dd-reset"${chosen.length ? "" : " hidden"}>${tr("Limpar", "Clear")}</button></div>`
            + `<div class="news-dd-list">${options(openGroup).map(([value, label]) => {
                const count = base.filter((row) => rowHas(row, openGroup, value)).length;
                const selected = chosen.includes(value);
                if (count === 0 && !selected) return "";
                return `<label class="news-dd-opt" data-tema="${openGroup === "tema" ? value : ""}"><input type="checkbox" value="${value}"${selected ? " checked" : ""} /><i></i><span>${label}</span><small>${count}</small></label>`;
            }).join("")}</div>`;
        panel.querySelector(".news-dd-list").scrollTop = scroll;
    }

    function placePanel() {
        const trigger = document.querySelector(`.news-dd[data-group="${openGroup}"]`);
        if (!openGroup || !trigger) return;
        const box = trigger.getBoundingClientRect();
        const margin = 12;
        const width = Math.min(340, window.innerWidth - margin * 2);
        panel.style.width = `${width}px`;
        panel.style.left = `${Math.max(margin, Math.min(box.left, window.innerWidth - width - margin))}px`;
        panel.style.top = `${box.bottom + 8}px`;
        panel.style.maxHeight = `${Math.max(180, window.innerHeight - box.bottom - 24)}px`;
    }

    function closePanel(giveFocus) {
        if (!openGroup) return;
        const trigger = document.querySelector(`.news-dd[data-group="${openGroup}"]`);
        openGroup = "";
        panel.hidden = true;
        document.querySelectorAll(".news-dd").forEach((button) => button.setAttribute("aria-expanded", "false"));
        if (giveFocus && trigger) trigger.focus();
    }

    function openPanel(group) {
        openGroup = group;
        document.querySelectorAll(".news-dd").forEach((button) => button.setAttribute("aria-expanded", String(button.dataset.group === group)));
        renderPanel();
        panel.hidden = false;
        placePanel();
    }

    function renderTriggers() {
        Object.entries(GROUPS).forEach(([group, info]) => {
            const button = document.querySelector(`.news-dd[data-group="${group}"]`);
            const count = state[info.key].length;
            const badge = button.querySelector(".news-dd-n");
            badge.hidden = !count;
            badge.textContent = count || "";
            button.classList.toggle("tem-escolha", count > 0);
        });
        const tags = [];
        Object.entries(GROUPS).forEach(([group, info]) => {
            const labels = Object.fromEntries(options(group));
            state[info.key].forEach((value) => tags.push(`<button type="button" class="news-tag" data-group="${group}" data-value="${value}" data-tema="${group === "tema" ? value : ""}" aria-label="${tr("Tirar", "Remove")} ${labels[value] || value}"><span>${labels[value] || value}</span><b aria-hidden="true">×</b></button>`));
        });
        el("news-tags").innerHTML = tags.length ? tags.join("") : `<span class="news-tags-dica">${tr("Filtra por onde, tema e tipo nos botões da barra acima.", "Filter by place, topic and type with the buttons in the bar above.")}</span>`;
    }

    function render() {
        renderTriggers();
        renderPanel();

        let found = rows.filter((row) => matches(row)).map((row) => row.item);
        found = state.ordem === "recentes" ? [...found].sort((a, b) => News.compare(a, b)) : News.rank(found);
        const total = found.length;
        el("news-count").textContent = total === 1
            ? tr("1 notícia", "1 story")
            : tr(`${total} notícias`, `${total} stories`);
        el("news-grid").innerHTML = total
            ? found.slice(0, state.shown).map((item) => News.cardHtml(item)).join("")
            : `<p class="news-empty">${tr("Nenhuma notícia com estes filtros. Tenta tirar um filtro ou mudar a pesquisa.", "No stories match these filters. Try removing a filter or changing the search.")}</p>`;
        const remaining = total - state.shown;
        const toggle = el("news-toggle");
        toggle.hidden = remaining <= 0;
        toggle.textContent = tr(`Ver mais (${remaining} restantes)`, `Show more (${remaining} left)`);
        el("news-clear").hidden = !(state.onde.length || state.tema.length || state.tipo.length || state.q);
        el("news-search").value = state.q;
        el("news-order").value = state.ordem;
        syncUrl();
    }

    function syncUrl() {
        const next = new URLSearchParams(location.search);
        [["onde", state.onde.join(",")], ["tema", state.tema.join(",")], ["tipo", state.tipo.join(",")], ["q", state.q.trim()], ["ordem", state.ordem === "recentes" ? "recentes" : ""]].forEach(([key, value]) => {
            if (value) next.set(key, value); else next.delete(key);
        });
        const text = next.toString();
        try { history.replaceState(null, "", `${location.pathname}${text ? `?${text}` : ""}${location.hash}`); } catch (_) {}
    }

    document.addEventListener("click", (event) => {
        const target = event.target;
        const trigger = target.closest && target.closest(".news-dd");
        if (trigger) {
            const group = trigger.dataset.group;
            if (openGroup === group) closePanel(); else openPanel(group);
            return;
        }
        const tag = target.closest && target.closest(".news-tag");
        if (tag) {
            const key = GROUPS[tag.dataset.group].key;
            state[key] = state[key].filter((value) => value !== tag.dataset.value);
            state.shown = STEP;
            render();
            return;
        }
        if (target.closest && target.closest(".news-dd-reset")) {
            state[GROUPS[openGroup].key] = [];
            state.shown = STEP;
            render();
            return;
        }
        if (openGroup && !(target.closest && target.closest(".news-dd-panel"))) closePanel();
    });
    panel.addEventListener("change", (event) => {
        const box = event.target;
        if (!openGroup || !box.matches('input[type="checkbox"]')) return;
        const key = GROUPS[openGroup].key;
        state[key] = box.checked ? [...state[key], box.value] : state[key].filter((value) => value !== box.value);
        state.shown = STEP;
        render();
    });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closePanel(true); });
    window.addEventListener("scroll", () => { if (openGroup) placePanel(); }, { passive: true });
    window.addEventListener("resize", () => { if (openGroup) placePanel(); }, { passive: true });
    el("news-nav").addEventListener("scroll", () => { if (openGroup) placePanel(); }, { passive: true });
    el("news-toggle").addEventListener("click", () => { state.shown += STEP; render(); });
    el("news-clear").addEventListener("click", () => { Object.assign(state, { onde: [], tema: [], tipo: [], q: "", shown: STEP }); render(); });
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
