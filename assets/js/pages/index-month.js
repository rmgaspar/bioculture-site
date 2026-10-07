/* «Este mês no teu território»: o que semear, colher e vigiar neste mês, ordenado pelo pH da localidade
   guardada. Usa os mesmos catálogos e a mesma lógica de janelas do calendário (calendario-calendario-2.js:
   periodMatches, phMatches, practiceIdsFor, seasonalPests). Os catálogos (~600 kB) só são pedidos quando o
   bloco se aproxima do ecrã. */
(function () {
    "use strict";

    // Em inglês o runtime pode substituir os nós da página: o bloco procura-se sempre pelo id, nunca por uma referência guardada.
    const target = () => document.getElementById("month-plan");
    if (!target()) return;
    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const monthsPt = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const month = new Date().getMonth();

    function season(day) {
        const md = month * 100 + day;
        if (md >= 1121 || md < 220) return { key: "inverno", note: tr("Planear, proteger o solo e aproveitar os períodos adequados para plantações lenhosas.", "Plan, protect the soil and make the most of the right windows for woody plantings.") };
        if (md < 521) return { key: "primavera", note: tr("Época de crescimento rápido: semear por etapas, vigiar jovens plantas e favorecer polinizadores.", "Fast growth season: sow in stages, watch young plants and support pollinators.") };
        if (md < 823) return { key: "verao", note: tr("Gerir água, sombra e cobertura; colher com frequência e observar sinais de stress.", "Manage water, shade and cover; harvest often and watch for signs of stress.") };
        return { key: "outono", note: tr("Colher, guardar sementes, iniciar coberturas e preparar o solo sem o deixar exposto.", "Harvest, save seeds, start cover crops and prepare the soil without leaving it bare.") };
    }

    function periodMatches(text) {
        const source = normalize(text).replace(/[–—]/g, "-");
        if (!source) return false;
        if (/todo o ano|durante todo o ano|sempre/.test(source)) return true;
        const names = monthsPt.map(normalize);
        return source.split(/\s+e\s+|;/).some((segment) => {
            const found = names.map((name, index) => (segment.includes(name) ? index : -1)).filter((index) => index >= 0);
            if (!found.length) return false;
            if (found.includes(month)) return true;
            if (found.length >= 2) {
                const start = found[0], end = found.at(-1);
                return start <= end ? month >= start && month <= end : month >= start || month <= end;
            }
            return false;
        });
    }

    const localPh = (region) => parseFloat(region?.biomas?.ph_solo);
    function phMatches(item, ph) {
        if (!Number.isFinite(ph)) return true;
        const nums = String(item.ph_solo || "").replace(",", ".").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
        return nums.length < 2 || (ph >= nums[0] - 0.3 && ph <= nums[1] + 0.3);
    }
    function cropsFor(db, field, ph, limit) {
        const unique = new Map();
        Object.entries(db)
            .filter(([, item]) => periodMatches(item[field]))
            // pH compatível primeiro; as culturas «quase todo o ano» (pouco informativas) ficam para o fim.
            .sort((a, b) => (Number(phMatches(b[1], ph)) - Number(phMatches(a[1], ph)))
                || (Number(/todo o ano/.test(normalize(a[1][field]))) - Number(/todo o ano/.test(normalize(b[1][field])))))
            .forEach((entry) => {
                const key = normalize(entry[1].nome || entry[0]);
                if (key && !unique.has(key)) unique.set(key, entry);
            });
        return [...unique.values()].slice(0, limit);
    }
    function practiceIds() {
        if ([11, 0, 1].includes(month)) return ["rotacao-culturas", "sebe-viva", "abrigo-insetos", "composto-frio"];
        if ([2, 3, 4].includes(month)) return ["sementeira-direta", "sementeira-sucessiva", "consociacao", "monitorizacao-pragas"];
        if ([5, 6, 7].includes(month)) return ["mulching-organico", "rega-profunda", "olla", "guardar-sementes"];
        return ["adubo-verde", "solo-sempre-com-raiz", "captacao-chuva", "composto-superficie"];
    }
    function seasonalPests(pests, key) {
        const keywords = {
            inverno: ["inverno", "todo o ano", "protegidas"],
            primavera: ["primavera", "tempo ameno", "rebentos"],
            verao: ["verao", "tempo quente", "calor", "seco"],
            outono: ["outono", "humidade", "chuva"],
        }[key].map(normalize);
        return pests.filter((item) => {
            const text = normalize(`${item.sazonalidade_portugal || ""} ${item.quando || ""}`);
            return keywords.some((word) => text.includes(word)) || periodMatches(text);
        });
    }

    const list = (rows) => `<ul>${rows.join("") || `<li class="empty">${tr("Sem entradas claras para este mês.", "No clear entries for this month.")}</li>`}</ul>`;
    const crop = ([id, item], field) => `<li><a href="/calendario/horticola-detalhe.html?id=${encodeURIComponent(id)}"><strong>${esc(item.nome)}</strong><small>${esc(item[field] || "")}</small></a></li>`;

    function render(crops, practices, pests, region) {
        const now = new Date();
        const current = season(now.getDate());
        const ph = localPh(region);
        const sow = cropsFor(crops, "sementeira", ph, 4);
        const harvest = cropsFor(crops, "colheita", ph, 4);
        const watch = seasonalPests(pests, current.key).slice(0, 3);
        const invasive = (region?.biomas?.flora_invasora || []).slice(0, 3);
        const tips = practiceIds().map((id) => practices.find((item) => item.id === id)).filter(Boolean).slice(0, 3);
        const place = region?.titulo
            ? tr(`Janelas indicativas para Portugal continental, ordenadas pelo pH do solo de ${region.titulo}${Number.isFinite(ph) ? ` (${String(region.biomas.ph_solo).replace(".", ",")})` : ""}. O microclima, a altitude e a exposição da tua parcela mandam.`,
                `Indicative windows for mainland Portugal, ordered by the soil pH of ${region.titulo}${Number.isFinite(ph) ? ` (${region.biomas.ph_solo})` : ""}. Your plot's microclimate, altitude and exposure rule.`)
            : tr("Janelas indicativas para Portugal continental. Escolhe a tua localidade no menu para ordenar pelo pH do solo e ver as invasoras da tua zona.",
                "Indicative windows for mainland Portugal. Choose your locality in the menu to order by soil pH and see invasive plants in your area.");
        const root = target();
        if (!root) return;
        root.innerHTML = `
            <p class="month-plan-note"><strong>${esc(tr(["Inverno", "Primavera", "Verão", "Outono"][["inverno", "primavera", "verao", "outono"].indexOf(current.key)], ["Winter", "Spring", "Summer", "Autumn"][["inverno", "primavera", "verao", "outono"].indexOf(current.key)]))}:</strong> ${esc(current.note)}</p>
            <div class="month-plan-grid">
                <article><small>${tr("Semear", "Sow")}</small>${list(sow.map((entry) => crop(entry, "sementeira")))}</article>
                <article><small>${tr("Colher", "Harvest")}</small>${list(harvest.map((entry) => crop(entry, "colheita")))}</article>
                <article><small>${tr("Vigiar", "Watch")}</small>${list(watch.map((item) => `<li><a href="/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(item.id)}"><strong>${esc(item.nome_comum)}</strong><small>${esc(item.tipo || "")}</small></a></li>`))}${invasive.length ? `<p class="month-plan-local">${tr("Invasoras na tua zona", "Invasive plants in your area")}: ${esc(invasive.join(", "))}</p>` : ""}</article>
                <article><small>${tr("Práticas do mês", "This month's practices")}</small>${list(tips.map((item) => `<li><a href="/services/servicos.html#tecnica-${encodeURIComponent(item.id)}"><strong>${esc(item.titulo)}</strong><small>${esc(item.categoria || "")}</small></a></li>`))}</article>
            </div>
            <p class="month-plan-caption">${esc(place)} <a href="/calendario/calendario.html">${tr("Ver o calendário completo →", "See the full calendar →")}</a></p>`;
        root.hidden = false;
    }

    let started = false;
    function start() {
        if (started) return;
        started = true;
        const read = (url) => fetch(url).then((response) => { if (!response.ok) throw new Error(url); return response.json(); });
        Promise.all([
            read("/data/horticolas_master.json"),
            read("/data/dicas.json"),
            read("/data/pragas.json"),
            (window.BioCultureRegion ? window.BioCultureRegion.load({ fallback: false }) : Promise.resolve([])).catch(() => []),
        ]).then(([crops, practices, pests, regions]) => render(crops, practices, pests, regions[0]))
            .catch((error) => { console.error("Este mês no teu território:", error); if (target()) target().hidden = true; });
    }

    // Só pede os catálogos quando o bloco está perto do ecrã (por scroll, sem guardar referências a nós que o runtime possa trocar).
    const near = () => {
        const node = target();
        return !node || node.getBoundingClientRect().top < window.innerHeight + 600;
    };
    const check = () => {
        if (!near()) return;
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
        start();
    };
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
})();
