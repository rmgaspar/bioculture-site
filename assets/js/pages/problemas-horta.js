/* «O que se passa na tua horta?»: respostas curtas para os problemas mais comuns (data/problemas-horta.json).
   Pesquisa por palavras, filtro por tipo e cartões que abrem no próprio sítio; #problema-<id> abre um diretamente. */
(function () {
    "use strict";

    const root = document.getElementById("problemas");
    if (!root) return;
    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const GROUPS = [["sementeira", "Sementes que não nascem", "Seeds that won't come up"], ["pragas", "Pragas", "Pests"], ["doencas", "Doenças", "Diseases"], ["outros", "Outros", "Other"]];
    const LINKS = {
        cultura: (id) => `/calendario/horticola-detalhe.html?id=${encodeURIComponent(id)}`,
        tecnica: (id) => `/services/servicos.html#tecnica-${encodeURIComponent(id)}`,
        praga: (id) => `/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(id)}`,
    };
    const KIND = { cultura: ["Ficha da cultura", "Crop guide"], tecnica: ["Técnica", "Technique"], praga: ["Ficha completa", "Full guide"] };

    const state = { grupo: "", q: "" };
    let rows = [];
    let names = { cultura: {}, tecnica: {}, praga: {} };

    const content = (row) => (isEnglish ? row.en : row.pt) || row.pt;
    const searchable = (row) => normalize([content(row).titulo, content(row).resumo, row.pt.titulo, ...(row.palavras || [])].join(" "));

    function matches(row, skip) {
        if (skip !== "grupo" && state.grupo && row.grupo !== state.grupo) return false;
        // Palavras curtas e sem o «s» final do plural, para «lesmas» apanhar «lesma» e vice-versa.
        const terms = normalize(state.q).split(/\s+/).filter((term) => term.length > 2).map((term) => term.replace(/s$/, ""));
        if (!terms.length) return true;
        const text = row.__text || (row.__text = searchable(row));
        return terms.every((term) => text.includes(term));
    }

    const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
    function card(row) {
        const c = content(row);
        const links = (row.ver || []).map(([kind, id]) => `<a href="${LINKS[kind](id)}"><small>${esc(tr(...KIND[kind]))}</small> ${esc(names[kind][id] || id)} →</a>`).join("");
        const sources = (row.fontes || []).map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.titulo)} ↗</a>`).join(" · ");
        return `<details class="problema" id="problema-${esc(row.id)}"${state.open === row.id ? " open" : ""}>
            <summary><span class="problema-titulo">${esc(c.titulo)}</span><span class="problema-resumo">${esc(c.resumo)}</span></summary>
            <div class="problema-corpo">
                <div class="problema-col"><h3>${tr("O que costuma ser", "What it usually is")}</h3>${list(c.causas)}</div>
                <div class="problema-col problema-fazer"><h3>${tr("O que fazer", "What to do")}</h3><ol>${c.fazer.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></div>
                <div class="problema-col"><h3>${tr("Evitar", "Avoid")}</h3>${list(c.evitar)}</div>
            </div>
            ${links ? `<p class="problema-links">${links}</p>` : ""}
            ${sources ? `<p class="problema-fontes">${tr("Fontes", "Sources")}: ${sources}</p>` : ""}
        </details>`;
    }

    function render() {
        const chips = [["", tr("Tudo", "All"), rows.filter((row) => matches(row, "grupo")).length]]
            .concat(GROUPS.map(([key, pt, en]) => [key, tr(pt, en), rows.filter((row) => row.grupo === key && matches({ ...row, grupo: "" }, "grupo")).length]).filter((entry) => entry[2] > 0 || state.grupo === entry[0]));
        document.getElementById("problemas-chips").innerHTML = chips.map(([key, label, count]) =>
            `<button type="button" data-grupo="${key}" aria-pressed="${state.grupo === key}">${esc(label)}<small>${count}</small></button>`).join("");
        const shown = rows.filter((row) => matches(row));
        document.getElementById("problemas-lista").innerHTML = shown.length
            ? shown.map(card).join("")
            : `<p class="problemas-vazio">${tr("Ainda não temos uma resposta curta para isso. Tenta outras palavras (por exemplo «lesmas», «amarelas», «não nascem») ou ", "We do not have a short answer for that yet. Try other words (for example “slugs”, “yellow”, “won't come up”) or ")}<a href="/contactos.html">${tr("diz-nos o que se passa", "tell us what is happening")}</a>.</p>`;
        document.getElementById("problemas-contagem").textContent = shown.length === 1 ? tr("1 resposta", "1 answer") : tr(`${shown.length} respostas`, `${shown.length} answers`);
    }

    function openFromHash() {
        const id = decodeURIComponent(location.hash.replace(/^#problema-/, ""));
        if (!location.hash.startsWith("#problema-") || !rows.some((row) => row.id === id)) return;
        state.grupo = ""; state.q = ""; state.open = id;
        document.getElementById("problemas-busca").value = "";
        render();
        document.getElementById(`problema-${id}`)?.scrollIntoView({ block: "start" });
    }

    // Texto fixo do bloco.
    document.getElementById("problemas-eyebrow").textContent = tr("Problemas na horta", "Garden problems");
    document.getElementById("problemas-title").textContent = tr("O que se passa na tua horta?", "What is going on in your garden?");
    document.getElementById("problemas-intro").textContent = tr("Escolhe o problema ou escreve o que vês. Respostas curtas, de agricultura biológica, sem pesticidas.", "Pick the problem or type what you see. Short answers, organic, no pesticides.");
    document.getElementById("problemas-busca").placeholder = tr("Ex.: cenouras não nascem, lesmas, folhas amarelas…", "E.g. carrots won't come up, slugs, yellow leaves…");
    document.getElementById("problemas-busca").setAttribute("aria-label", tr("Descrever o problema", "Describe the problem"));

    Promise.all([
        fetch("/data/problemas-horta.json").then((response) => response.json()),
        fetch("/data/horticolas_master.json").then((response) => response.json()).catch(() => ({})),
        fetch("/data/dicas.json").then((response) => response.json()).catch(() => []),
        fetch("/data/pragas.json").then((response) => response.json()).catch(() => []),
    ]).then(([data, crops, tips, pests]) => {
        rows = data.problemas;
        names = {
            cultura: Object.fromEntries(Object.entries(crops).map(([id, item]) => [id, item.nome])),
            tecnica: Object.fromEntries(tips.map((item) => [item.id, item.titulo])),
            praga: Object.fromEntries(pests.map((item) => [item.id, item.nome_comum])),
        };
        render();
        openFromHash();
    }).catch(() => {
        document.getElementById("problemas-lista").innerHTML = `<p class="problemas-vazio">${tr("Não foi possível carregar as respostas.", "The answers could not be loaded.")}</p>`;
    });

    let timer = 0;
    document.getElementById("problemas-busca").addEventListener("input", (event) => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = event.target.value; state.open = ""; render(); }, 150);
    });
    document.getElementById("problemas-chips").addEventListener("click", (event) => {
        const chip = event.target.closest("button[data-grupo]");
        if (!chip) return;
        state.grupo = state.grupo === chip.dataset.grupo ? "" : chip.dataset.grupo;
        state.open = "";
        render();
    });
    window.addEventListener("hashchange", openFromHash);
})();
