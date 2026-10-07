/* Respostas curtas «O que se passa na tua horta?» (data/problemas-horta.json), partilhadas pelo hub
   Conhecimento para cuidar e pelas fichas das culturas. */
(function () {
    "use strict";

    const isEnglish = () => !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish() ? en : pt);
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const LINKS = {
        cultura: (id) => `/calendario/horticola-detalhe.html?id=${encodeURIComponent(id)}`,
        tecnica: (id) => `/services/servicos.html#tecnica-${encodeURIComponent(id)}`,
        praga: (id) => `/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(id)}`,
    };
    const KIND = { cultura: ["Ficha da cultura", "Crop guide"], tecnica: ["Técnica", "Technique"], praga: ["Ficha completa", "Full guide"] };

    const plain = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function cropKind(item) {
        const value = plain(item.categoria);
        if (value.includes("aromatica")) return "aromaticas";
        if (/fruteira|citrino|pequeno fruto|casca rija|trepadeira frutifera/.test(value)) return "fruteiras";
        return "horticolas";
    }

    let loading = null;
    function load() {
        if (!loading) {
            loading = Promise.all([
                fetch("/data/problemas-horta.json").then((response) => { if (!response.ok) throw new Error("problemas"); return response.json(); }),
                fetch("/data/horticolas_master.json").then((response) => response.json()).catch(() => ({})),
                fetch("/data/dicas.json").then((response) => response.json()).catch(() => []),
                fetch("/data/pragas.json").then((response) => response.json()).catch(() => []),
            ]).then(([data, crops, tips, pests]) => ({
                rows: data.problemas,
                names: {
                    cultura: Object.fromEntries(Object.entries(crops).map(([id, item]) => [id, item.nome])),
                    tecnica: Object.fromEntries(tips.map((item) => [item.id, item.titulo])),
                    praga: Object.fromEntries(pests.map((item) => [item.id, item.nome_comum])),
                },
                // Tipo de cada cultura (como no catálogo de cultivo): hortícola, fruteira ou aromática; e se é perene.
                kinds: Object.fromEntries(Object.entries(crops).map(([id, item]) => [id, cropKind(item)])),
                perennial: Object.fromEntries(Object.entries(crops).filter(([, item]) => plain(item.ciclo).includes("perene")).map(([id]) => [id, true])),
                // Fotografia (ou ilustração) de cada cultura, para os chips com ícone.
                images: Object.fromEntries(Object.entries(crops).filter(([, item]) => item.imagem && item.imagem !== "-").map(([id, item]) => [id, item.imagem])),
            }));
        }
        return loading;
    }

    const content = (row) => (isEnglish() ? row.en : row.pt) || row.pt;
    const list = (items) => `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;

    // Corpo da resposta (causas, o que fazer, evitar, ligações e fontes), comum ao cartão e ao painel.
    function body(row, names, { skipKind = "", skipId = "" } = {}) {
        const c = content(row);
        const links = (row.ver || []).filter(([kind, id]) => !(kind === skipKind && id === skipId))
            .map(([kind, id]) => `<a href="${LINKS[kind](id)}"><small>${esc(tr(...KIND[kind]))}</small> ${esc(names[kind][id] || id)} →</a>`).join("");
        const sources = (row.fontes || []).map((source) => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.titulo)} ↗</a>`).join(" · ");
        return `<div class="problema-corpo">
                <div class="problema-col"><h3>${tr("O que costuma ser", "What it usually is")}</h3>${list(c.causas)}</div>
                <div class="problema-col problema-fazer"><h3>${tr("O que fazer", "What to do")}</h3><ol>${c.fazer.map((step) => `<li>${esc(step)}</li>`).join("")}</ol></div>
                <div class="problema-col"><h3>${tr("Evitar", "Avoid")}</h3>${list(c.evitar)}</div>
            </div>
            ${links ? `<p class="problema-links">${links}</p>` : ""}
            ${sources ? `<p class="problema-fontes">${tr("Fontes", "Sources")}: ${sources}</p>` : ""}`;
    }

    // `skipKind` evita ligar de volta à ficha em que o cartão já está (ex.: a própria cultura).
    function card(row, names, { open = false, skipKind = "", skipId = "" } = {}) {
        const c = content(row);
        return `<details class="problema" id="problema-${esc(row.id)}"${open ? " open" : ""}>
            <summary><span class="problema-titulo">${esc(c.titulo)}</span><span class="problema-resumo">${esc(c.resumo)}</span></summary>
            ${body(row, names, { skipKind, skipId })}
        </details>`;
    }

    // Quadrado discreto da grelha do hub: só o título e o grupo; a resposta abre num painel por baixo da linha.
    function tile(row, tag, { active = false } = {}) {
        const c = content(row);
        return `<button type="button" class="problema-quadro${active ? " is-active" : ""}" data-problema="${esc(row.id)}" aria-expanded="${active}" aria-controls="problema-${esc(row.id)}">
            <span class="problema-quadro-titulo">${esc(c.titulo)}</span><small>${esc(tag)}</small></button>`;
    }

    function panel(row, names) {
        const c = content(row);
        return `<section class="problema-painel" id="problema-${esc(row.id)}" aria-label="${esc(c.titulo)}">
            <button type="button" class="problema-fechar" data-fechar="1" aria-label="${esc(tr("Fechar resposta", "Close answer"))}">×</button>
            <h3 class="problema-painel-titulo">${esc(c.titulo)}</h3><p class="problema-painel-resumo">${esc(c.resumo)}</p>
            ${body(row, names)}
        </section>`;
    }

    window.BioCulturaProblemas = { load, card, tile, panel, content };
})();
