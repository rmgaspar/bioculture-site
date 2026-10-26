/* «Este mês no teu território»: o que semear, colher e vigiar neste mês, ordenado pelo pH da localidade
   guardada. Usa os mesmos catálogos e a mesma lógica sazonal do Calendário, que vive em
   assets/js/biocultura-seasonal.js. Os catálogos (~600 kB) só são pedidos quando o bloco se aproxima do ecrã. */
(function () {
    "use strict";

    // Em inglês o runtime pode substituir os nós da página: o bloco procura-se sempre pelo id, nunca por uma referência guardada.
    const target = () => document.getElementById("month-plan");
    if (!target() || !window.BioCulturaSeasonal) return;
    const seasonal = window.BioCulturaSeasonal;
    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const month = new Date().getMonth();

    const NOTES = {
        inverno: () => tr("Planear, proteger o solo e aproveitar os períodos adequados para plantações lenhosas.", "Plan, protect the soil and make the most of the right windows for woody plantings."),
        primavera: () => tr("Época de crescimento rápido: semear por etapas, vigiar jovens plantas e favorecer polinizadores.", "Fast growth season: sow in stages, watch young plants and support pollinators."),
        verao: () => tr("Gerir água, sombra e cobertura; colher com frequência e observar sinais de stress.", "Manage water, shade and cover; harvest often and watch for signs of stress."),
        outono: () => tr("Colher, guardar sementes, iniciar coberturas e preparar o solo sem o deixar exposto.", "Harvest, save seeds, start cover crops and prepare the soil without leaving it bare."),
    };
    const NAMES = { inverno: ["Inverno", "Winter"], primavera: ["Primavera", "Spring"], verao: ["Verão", "Summer"], outono: ["Outono", "Autumn"] };
    const localPh = (region) => parseFloat(region?.biomas?.ph_solo);

    const list = (rows) => `<ul>${rows.join("") || `<li class="empty">${tr("Sem entradas claras para este mês.", "No clear entries for this month.")}</li>`}</ul>`;

    const MONTHS = [["janeiro", "January"], ["fevereiro", "February"], ["março", "March"], ["abril", "April"], ["maio", "May"], ["junho", "June"],
        ["julho", "July"], ["agosto", "August"], ["setembro", "September"], ["outubro", "October"], ["novembro", "November"], ["dezembro", "December"]];
    const COR = { sow: "#6b8f47", harvest: "#a66f50", watch: "#3f7373", tips: "#526b57" };
    const sob = (label, cor, body) => `<article style="--c:${cor}"><small class="mp-label">${label}</small>${body}</article>`;
    // Culturas com fotografia redonda (como no resto do site); sem fotografia fica a inicial.
    const foto = (item) => `<span class="mp-foto" data-initial="${esc(String(item.nome || "?").charAt(0))}">${item.imagem && item.imagem !== "-" ? `<img src="${esc(item.imagem)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;
    const cultura = ([id, item], field) => `<li><a href="/calendario/horticola-detalhe.html?id=${encodeURIComponent(id)}">${foto(item)}<span><strong>${esc(item.nome)}</strong>${item[field] ? `<small>${esc(item[field])}</small>` : ""}</span></a></li>`;

    function render(crops, practices, pests, region, campo) {
        const now = new Date();
        const key = seasonal.seasonKey(month, now.getDate());
        const ph = localPh(region);
        const sow = seasonal.cropsFor(crops, "sementeira", month, ph, 4);
        const harvest = seasonal.cropsFor(crops, "colheita", month, ph, 4);
        const watch = seasonal.seasonalPests(pests, month, now.getDate()).slice(0, 3);
        const invasive = (region?.biomas?.flora_invasora || []).slice(0, 3);
        // Podar, enxertar, vindimar… quando for a altura vêm primeiro; as práticas gerais do mês completam a lista.
        const trabalhos = seasonal.fieldTasks(campo, month).slice(0, 2).map((task) => ({
            href: task.href || `/services/tecnicas.html#tecnica-${encodeURIComponent(task.tecnica)}`,
            titulo: tr(task.titulo, task.titulo_en),
            categoria: tr("Trabalho de campo", "Field work"),
        }));
        const usados = new Set(seasonal.fieldTasks(campo, month).map((task) => task.tecnica));
        const gerais = seasonal.practiceIds(month, campo).filter((id) => !usados.has(id)).map((id) => practices.find((item) => item.id === id)).filter(Boolean)
            .map((item) => ({ href: `/services/tecnicas.html#tecnica-${encodeURIComponent(item.id)}`, titulo: item.titulo, categoria: item.categoria }));
        const tips = [...trabalhos, ...gerais].slice(0, 3);
        const place = region?.titulo
            ? tr(`Janelas indicativas para Portugal continental, ordenadas pelo pH do solo de ${region.titulo}${Number.isFinite(ph) ? ` (${String(region.biomas.ph_solo).replace(".", ",")})` : ""}. O microclima, a altitude e a exposição da tua parcela mandam.`,
                `Indicative windows for mainland Portugal, ordered by the soil pH of ${region.titulo}${Number.isFinite(ph) ? ` (${region.biomas.ph_solo})` : ""}. Your plot's microclimate, altitude and exposure rule.`)
            : tr("Janelas indicativas para Portugal continental. Escolhe a tua localidade no menu para ordenar pelo pH do solo e ver as invasoras da tua zona.",
                "Indicative windows for mainland Portugal. Choose your locality in the menu to order by soil pH and see invasive plants in your area.");
        // Linha por baixo do título: onde, quando e o que a estação pede (uma só vez; antes repetia-se em três sítios).
        const linha = document.getElementById("today-line");
        if (linha) linha.innerHTML = `<strong>${esc(region?.titulo || "Portugal")} · ${esc(tr(MONTHS[month][0], MONTHS[month][1]))} · ${esc(tr(NAMES[key][0], NAMES[key][1]))}</strong> — ${esc(NOTES[key]())}`;
        const root = target();
        if (!root) return;
        root.innerHTML = `
            <div class="month-plan-grid">
                ${sob(tr("Semear agora", "Sow now"), COR.sow, list(sow.map((entry) => cultura(entry, "sementeira"))))}
                ${sob(tr("Colher agora", "Harvest now"), COR.harvest, list(harvest.map((entry) => cultura(entry, "colheita"))))}
                ${sob(tr("Vigiar", "Watch"), COR.watch, list(watch.map((item) => `<li><a href="/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(item.id)}"><span><strong>${esc(item.nome_comum)}</strong><small>${esc(item.tipo || "")}</small></span></a></li>`)) + (invasive.length ? `<p class="month-plan-local">${tr("Invasoras na tua zona", "Invasive plants in your area")}: ${esc(invasive.join(", "))}</p>` : ""))}
                ${sob(tr("Práticas do mês", "This month's practices"), COR.tips, list(tips.map((item) => `<li><a href="${esc(item.href)}"><span><strong>${esc(item.titulo)}</strong><small>${esc(item.categoria || "")}</small></span></a></li>`)))}
            </div>
            <p class="month-plan-caption">${esc(place)} <a href="/calendario/calendario.html">${tr("Ver o calendário completo →", "See the full calendar →")}</a> <a href="/calendario/conhecimento-cuidar.html#problemas">${tr("Problema na horta? Vê as respostas →", "Garden problem? See the answers →")}</a></p>`;
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
            read("/data/trabalhos-campo.json").then((doc) => doc.trabalhos || []).catch(() => []),
            (window.BioCultureRegion ? window.BioCultureRegion.load({ fallback: false }) : Promise.resolve([])).catch(() => []),
        ]).then(([crops, practices, pests, campo, regions]) => render(crops, practices, pests, regions[0], campo))
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
