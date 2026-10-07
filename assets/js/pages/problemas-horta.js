/* «O que se passa na tua horta?»: respostas curtas para os problemas mais comuns (data/problemas-horta.json).
   Mostra as primeiras e «Ver mais» abre as restantes; pesquisa e filtros mostram todas as que correspondem.
   Os cartões vêm de assets/js/biocultura-problemas.js (partilhado com as fichas das culturas).
   #problema-<id> abre uma resposta diretamente. */
(function () {
    "use strict";

    const root = document.getElementById("problemas");
    const SHARED = window.BioCulturaProblemas;
    if (!root || !SHARED) return;
    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const el = (id) => document.getElementById(id);
    const GROUPS = [["sementeira", "Sementes que não nascem", "Seeds that won't come up"], ["pragas", "Pragas", "Pests"], ["doencas", "Doenças", "Diseases"], ["outros", "Outros", "Other"]];
    const INITIAL = 6; // respostas visíveis sem pesquisa nem filtros
    const CROP_CHIPS = 8; // culturas visíveis sem expandir

    const state = { grupo: "", cultura: "", q: "", expanded: false, open: "" };
    let rows = [];
    let names = { cultura: {}, tecnica: {}, praga: {} };
    let images = {};

    const searchable = (row) => {
        const c = SHARED.content(row);
        return normalize([c.titulo, c.resumo, row.pt.titulo, ...(row.palavras || [])].join(" "));
    };
    function matches(row, skip) {
        if (skip !== "grupo" && state.grupo && row.grupo !== state.grupo) return false;
        if (skip !== "cultura" && state.cultura && !(row.culturas || []).includes(state.cultura)) return false;
        // Palavras curtas e sem o «s» final do plural, para «lesmas» apanhar «lesma» e vice-versa.
        const terms = normalize(state.q).split(/\s+/).filter((term) => term.length > 2).map((term) => term.replace(/s$/, ""));
        if (!terms.length) return true;
        const text = row.__text || (row.__text = searchable(row));
        return terms.every((term) => text.includes(term));
    }
    const filtered = () => !!(state.grupo || state.cultura || state.q.trim());

    function render() {
        const groupChips = [["", tr("Tudo", "All"), rows.filter((row) => matches(row, "grupo")).length]]
            .concat(GROUPS.map(([key, pt, en]) => [key, tr(pt, en), rows.filter((row) => row.grupo === key && matches({ ...row, grupo: "" }, "grupo")).length])
                .filter((entry) => entry[2] > 0 || state.grupo === entry[0]));
        el("problemas-chips").innerHTML = groupChips.map(([key, label, count]) =>
            `<button type="button" data-grupo="${key}" aria-pressed="${state.grupo === key}">${esc(label)}<small>${count}</small></button>`).join("");

        // Culturas com respostas (as mais citadas primeiro); só as primeiras até se expandir ou filtrar.
        const crops = {};
        rows.filter((row) => matches(row, "cultura")).forEach((row) => (row.culturas || []).forEach((id) => { crops[id] = (crops[id] || 0) + 1; }));
        if (state.cultura && !crops[state.cultura]) crops[state.cultura] = 0;
        let cropList = Object.entries(crops).sort((a, b) => b[1] - a[1] || String(names.cultura[a[0]]).localeCompare(String(names.cultura[b[0]])));
        const hiddenCrops = !state.expanded && !filtered() && cropList.length > CROP_CHIPS ? cropList.length - CROP_CHIPS : 0;
        if (hiddenCrops) cropList = cropList.slice(0, CROP_CHIPS);
        el("problemas-culturas").innerHTML = cropList.map(([id, count]) =>
            `<button type="button" class="${images[id] ? "has-img" : ""}" data-cultura="${esc(id)}" aria-pressed="${state.cultura === id}">${images[id] ? `<img src="${esc(images[id])}" alt="" loading="lazy" onerror="this.remove()">` : ""}${esc(names.cultura[id] || id)}<small>${count}</small></button>`).join("")
            + (hiddenCrops ? `<button type="button" data-mais-culturas="1" aria-label="${esc(tr("Mostrar todas as culturas", "Show all crops"))}">+${hiddenCrops} ${esc(tr("culturas", "crops"))}</button>` : "");

        const all = rows.filter((row) => matches(row));
        const limited = !state.expanded && !filtered();
        const shown = limited ? all.slice(0, INITIAL) : all;
        el("problemas-lista").innerHTML = shown.length
            ? shown.map((row) => SHARED.card(row, names, { open: state.open === row.id })).join("")
            : `<p class="problemas-vazio">${tr("Ainda não temos uma resposta curta para isso. Tenta outras palavras (por exemplo «lesmas», «amarelas», «não nascem») ou ", "We do not have a short answer for that yet. Try other words (for example “slugs”, “yellow”, “won't come up”) or ")}<a href="/contactos.html">${tr("diz-nos o que se passa", "tell us what is happening")}</a>.</p>`;
        el("problemas-contagem").textContent = all.length === 1 ? tr("1 resposta", "1 answer") : tr(`${all.length} respostas`, `${all.length} answers`);

        // «Ver mais» / «Ver menos» (só quando não há pesquisa nem filtros).
        const more = el("problemas-mais");
        if (filtered() || all.length <= INITIAL) {
            more.hidden = true;
        } else {
            more.hidden = false;
            more.textContent = state.expanded ? tr("Ver menos", "Show fewer") : tr(`Ver mais respostas (${all.length - INITIAL} restantes)`, `Show more answers (${all.length - INITIAL} more)`);
            more.setAttribute("aria-expanded", String(state.expanded));
        }
    }

    function openFromHash() {
        if (!location.hash.startsWith("#problema-")) return;
        const id = decodeURIComponent(location.hash.replace(/^#problema-/, ""));
        if (!rows.some((row) => row.id === id)) return;
        Object.assign(state, { grupo: "", cultura: "", q: "", open: id, expanded: true });
        el("problemas-busca").value = "";
        render();
        el(`problema-${id}`)?.scrollIntoView({ block: "start" });
    }

    // Texto fixo do bloco.
    el("problemas-eyebrow").textContent = tr("Problemas na horta", "Garden problems");
    el("problemas-title").textContent = tr("O que se passa na tua horta?", "What is going on in your garden?");
    el("problemas-intro").textContent = tr("Escolhe o problema ou escreve o que vês. Respostas curtas, de agricultura biológica, sem pesticidas.", "Pick the problem or type what you see. Short answers, organic, no pesticides.");
    el("problemas-busca").placeholder = tr("Ex.: cenouras não nascem, lesmas, folhas amarelas…", "E.g. carrots won't come up, slugs, yellow leaves…");
    el("problemas-busca").setAttribute("aria-label", tr("Descrever o problema", "Describe the problem"));

    SHARED.load().then((data) => {
        rows = data.rows;
        names = data.names;
        images = data.images || {};
        render();
        openFromHash();
    }).catch(() => {
        el("problemas-lista").innerHTML = `<p class="problemas-vazio">${tr("Não foi possível carregar as respostas.", "The answers could not be loaded.")}</p>`;
    });

    let timer = 0;
    el("problemas-busca").addEventListener("input", (event) => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = event.target.value; state.open = ""; render(); }, 150);
    });
    el("problemas-culturas").addEventListener("click", (event) => {
        if (event.target.closest("button[data-mais-culturas]")) { state.expanded = true; render(); return; }
        const chip = event.target.closest("button[data-cultura]");
        if (!chip) return;
        state.cultura = state.cultura === chip.dataset.cultura ? "" : chip.dataset.cultura;
        state.open = "";
        render();
    });
    el("problemas-chips").addEventListener("click", (event) => {
        const chip = event.target.closest("button[data-grupo]");
        if (!chip) return;
        state.grupo = state.grupo === chip.dataset.grupo ? "" : chip.dataset.grupo;
        state.open = "";
        render();
    });
    el("problemas-mais").addEventListener("click", () => {
        state.expanded = !state.expanded;
        render();
        if (!state.expanded) el("problemas").scrollIntoView({ block: "start" });
    });
    window.addEventListener("hashchange", openFromHash);
})();
