/* «O que se passa na tua horta?»: respostas curtas para os problemas mais comuns (data/problemas-horta.json).
   Mostra as primeiras; «Ver mais» acrescenta mais algumas de cada vez e «Ver menos» volta ao início.
   Pesquisa e filtros mostram todas as que correspondem.
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
    const INITIAL = 12; // quadrados visíveis sem pesquisa nem filtros
    const STEP = 12; // quantos mais cada «Ver mais» acrescenta
    const CROP_CHIPS = 8; // culturas visíveis sem expandir

    const TIPOS = [["", "Todas as culturas", "All crops"], ["horticolas", "Hortícolas", "Vegetables"], ["fruteiras", "Árvores e plantas de fruto", "Fruit trees and plants"], ["aromaticas", "Aromáticas", "Herbs"], ["perenes", "Culturas perenes", "Perennial crops"]];
    const state = { grupo: "", cultura: "", tipo: "", q: "", shown: INITIAL, allCrops: false, open: "" };
    let rows = [];
    let names = { cultura: {}, tecnica: {}, praga: {} };
    let images = {};
    let kinds = {};
    let shown_ = [];
    let perennial = {};

    const searchable = (row) => {
        const c = SHARED.content(row);
        return normalize([c.titulo, c.resumo, row.pt.titulo, ...(row.palavras || [])].join(" "));
    };
    function matches(row, skip) {
        if (skip !== "grupo" && state.grupo && row.grupo !== state.grupo) return false;
        if (skip !== "cultura" && state.cultura && !(row.culturas || []).includes(state.cultura)) return false;
        if (state.tipo && !(row.culturas || []).some((id) => state.tipo === "perenes" ? perennial[id] : kinds[id] === state.tipo)) return false;
        // Palavras curtas e sem o «s» final do plural, para «lesmas» apanhar «lesma» e vice-versa.
        const terms = normalize(state.q).split(/\s+/).filter((term) => term.length > 2).map((term) => term.replace(/s$/, ""));
        if (!terms.length) return true;
        const text = row.__text || (row.__text = searchable(row));
        // A pesquisa casa com o início das palavras («roma» não apanha «aromáticas»).
        return terms.every((term) => new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text));
    }
    const filtered = () => !!(state.grupo || state.cultura || state.tipo || state.q.trim());

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
        const tooMany = cropList.length > CROP_CHIPS;
        let hiddenCrops = 0;
        if (tooMany && !state.allCrops) {
            hiddenCrops = cropList.length - CROP_CHIPS;
            const visible = cropList.slice(0, CROP_CHIPS);
            if (state.cultura && !visible.some((entry) => entry[0] === state.cultura)) visible.push(cropList.find((entry) => entry[0] === state.cultura));
            cropList = visible;
        }
        el("problemas-culturas").innerHTML = cropList.map(([id, count]) =>
            `<button type="button" class="${images[id] ? "has-img" : ""}" data-cultura="${esc(id)}" aria-pressed="${state.cultura === id}">${images[id] ? `<img src="${esc(images[id])}" alt="" loading="lazy" onerror="this.remove()">` : ""}${esc(names.cultura[id] || id)}<small>${count}</small></button>`).join("")
            + (hiddenCrops ? `<button type="button" data-mais-culturas="1" aria-label="${esc(tr("Mostrar todas as culturas", "Show all crops"))}">+${hiddenCrops} ${esc(tr("culturas", "crops"))}</button>` : "")
            + (tooMany && state.allCrops ? `<button type="button" data-menos-culturas="1">${esc(tr("Ver menos culturas", "Show fewer crops"))}</button>` : "");

        let all = rows.filter((row) => matches(row));
        // Com pesquisa: primeiro as respostas da cultura com esse nome («castanhas»), depois as palavras inteiras («esca») e só no fim as que começam assim («escaravelho»).
        const terms = normalize(state.q).split(/\s+/).filter((term) => term.length > 2).map((term) => term.replace(/s$/, ""));
        if (terms.length) {
            const whole = (row) => terms.every((term) => new RegExp(`(?:^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s|es)?(?![a-z0-9])`).test(row.__text));
            const ofCrop = (row) => (row.culturas || []).some((id) => terms.every((term) => normalize(names.cultura[id]).startsWith(term)));
            all = all.map((row, i) => [ofCrop(row) ? 0 : whole(row) ? 1 : 2, i, row]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).map((x) => x[2]);
        }
        const limited = !filtered();
        const shown = limited ? all.slice(0, state.shown) : all;
        const groupLabel = (row) => tr(...(GROUPS.find(([key]) => key === row.grupo)?.slice(1) || ["", ""]));
        shown_ = shown;
        el("problemas-lista").innerHTML = shown.length
            ? shown.map((row) => SHARED.tile(row, groupLabel(row), { active: state.open === row.id })).join("")
            : `<p class="problemas-vazio">${tr("Ainda não temos uma resposta curta para isso. Tenta outras palavras (por exemplo «lesmas», «amarelas», «não nascem») ou ", "We do not have a short answer for that yet. Try other words (for example “slugs”, “yellow”, “won't come up”) or ")}<a href="/contactos.html">${tr("diz-nos o que se passa", "tell us what is happening")}</a>.</p>`;
        placePanel(false);
        el("problemas-contagem").textContent = all.length === 1 ? tr("1 resposta", "1 answer") : tr(`${all.length} respostas`, `${all.length} answers`);

        // «Ver mais» (mais algumas) e «Ver menos» (volta ao início); só sem pesquisa nem filtros.
        const remaining = all.length - shown.length;
        const more = el("problemas-mais");
        more.hidden = !limited || remaining <= 0;
        more.textContent = tr(`Ver mais respostas (${remaining} restantes)`, `Show more answers (${remaining} more)`);
        const fewer = el("problemas-menos");
        fewer.hidden = !limited || state.shown <= INITIAL;
        fewer.textContent = tr("Ver menos", "Show fewer");
    }

    // O painel da resposta aberta fica a toda a largura, logo por baixo da linha de quadrados a que pertence.
    function placePanel(scroll) {
        const list = el("problemas-lista");
        list.querySelector(".problema-painel")?.remove();
        const row = rows.find((item) => item.id === state.open);
        const index = shown_.findIndex((item) => item.id === state.open);
        if (!row || index < 0) return;
        const tiles = [...list.querySelectorAll(".problema-quadro")];
        const columns = Math.max(1, getComputedStyle(list).gridTemplateColumns.split(" ").length);
        const last = Math.min(tiles.length - 1, (Math.floor(index / columns) + 1) * columns - 1);
        tiles[last].insertAdjacentHTML("afterend", SHARED.panel(row, names));
        if (scroll) list.querySelector(".problema-painel").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function openFromHash() {
        if (!location.hash.startsWith("#problema-")) return;
        const id = decodeURIComponent(location.hash.replace(/^#problema-/, ""));
        if (!rows.some((row) => row.id === id)) return;
        const position = rows.findIndex((row) => row.id === id);
        Object.assign(state, { grupo: "", cultura: "", tipo: "", q: "", open: id, allCrops: true, shown: Math.max(state.shown, Math.ceil((position + 1) / STEP) * STEP) });
        el("problemas-busca").value = "";
        el("problemas-tipo").value = "";
        render();
        el(`problema-${id}`)?.scrollIntoView({ block: "center" });
    }

    // Texto fixo do bloco.
    el("problemas-eyebrow").textContent = tr("Problemas na horta", "Garden problems");
    el("problemas-title").textContent = tr("O que se passa na tua horta?", "What is going on in your garden?");
    el("problemas-intro").textContent = tr("Escolhe o problema ou escreve o que vês. Respostas curtas, de agricultura biológica, sem pesticidas.", "Pick the problem or type what you see. Short answers, organic, no pesticides.");
    el("problemas-busca").placeholder = tr("Ex.: cenouras não nascem, lesmas, folhas amarelas…", "E.g. carrots won't come up, slugs, yellow leaves…");
    el("problemas-busca").setAttribute("aria-label", tr("Descrever o problema", "Describe the problem"));
    el("problemas-tipo").innerHTML = TIPOS.map(([key, pt, en]) => `<option value="${key}">${esc(tr(pt, en))}</option>`).join("");
    el("problemas-tipo").setAttribute("aria-label", tr("Tipo de cultura", "Crop type"));

    SHARED.load().then((data) => {
        rows = data.rows;
        names = data.names;
        images = data.images || {};
        kinds = data.kinds || {};
        perennial = data.perennial || {};
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
    el("problemas-tipo").addEventListener("change", (event) => {
        state.tipo = event.target.value;
        state.allCrops = false;
        state.cultura = "";
        state.open = "";
        render();
    });
    el("problemas-culturas").addEventListener("click", (event) => {
        if (event.target.closest("button[data-mais-culturas]")) { state.allCrops = true; render(); return; }
        if (event.target.closest("button[data-menos-culturas]")) { state.allCrops = false; render(); return; }
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
    el("problemas-lista").addEventListener("click", (event) => {
        if (event.target.closest("[data-fechar]")) {
            const anterior = state.open;
            state.open = "";
            render();
            el("problemas-lista").querySelector(`[data-problema="${anterior}"]`)?.focus();
            return;
        }
        const tile = event.target.closest("button[data-problema]");
        if (!tile) return;
        state.open = state.open === tile.dataset.problema ? "" : tile.dataset.problema;
        render();
        if (state.open) placePanel(true);
    });
    let resizeTimer = 0;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => placePanel(false), 150); });
    el("problemas-mais").addEventListener("click", () => {
        state.shown += STEP;
        render();
    });
    el("problemas-menos").addEventListener("click", () => {
        state.shown = INITIAL;
        state.allCrops = false;
        state.open = "";
        render();
        el("problemas").scrollIntoView({ block: "start" });
    });
    window.addEventListener("hashchange", openFromHash);
})();
