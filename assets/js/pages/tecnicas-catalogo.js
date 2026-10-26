(function () {
    const byId = (id) => document.getElementById(id);
    const isEnglish = document.documentElement.lang === "en";
    const tr = (pt, en) => (isEnglish ? en : pt);
    const L = isEnglish ? "en" : "pt";
    fetch("/sidebar-content.html?v=28").then((r) => r.text()).then((html) => { byId("sidebar").innerHTML = html; });

    const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const normalize = (v) => String(v).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    // O texto chega traduzido em inglês, por isso a categoria é reconhecida nas duas línguas.
    const SLUG = {"Solo e cobertura":"solo","Soil and cover":"solo","Compostagem e húmus":"compostagem","Composting and humus":"compostagem","Planeamento e fertilidade":"planeamento","Planning and fertility":"planeamento","Água e irrigação":"agua","Water and irrigation":"agua","Sementeiras e propagação":"sementeiras","Sowing and propagation":"sementeiras","Sementes e diversidade genética":"sementes","Seeds and genetic diversity":"sementes","Biodiversidade funcional":"biodiversidade","Functional biodiversity":"biodiversidade","Prevenção sem pesticidas":"prevencao","Prevention without pesticides":"prevencao","Árvores e sistemas perenes":"perenes","Trees and perennial systems":"perenes"};

    Promise.all([
        fetch("/data/dicas.json").then((r) => { if (!r.ok) throw Error("HTTP " + r.status); return r.json(); }),
        fetch("/data/dicas-fotos.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]).then(([dicas, fotos]) => {
        const fotoDe = (cat) => Object.values(fotos).find((f) => f.ficheiro === `dicas/${SLUG[cat]}.webp`);
        let query = "";

        // Imagens da própria técnica; sem elas, a fotografia da área (para nenhum cartão ficar sem imagem).
        const imagensDe = (item) => {
            if (item.imagens?.length) return item.imagens;
            const f = fotoDe(item.categoria);
            return f ? [{ ...f, tipo: "foto" }] : [];
        };
        const card = (item) => {
            const imagens = imagensDe(item), destaque = imagens.length > 1;
            const galeria = window.BioCulturaGaleria ? window.BioCulturaGaleria.html({ imagens }, L) : "";
            return `<article class="technique-card${destaque ? " technique-card--destaque" : ""}" id="tecnica-${esc(item.id)}"><div class="technique-card-in">${galeria}<div class="technique-body"><span class="technique-meta">${esc(item.nivel)}</span><h3>${esc(item.titulo)}</h3><p>${esc(item.resumo)}</p>${
                item.fontes?.length && item.quando ? `<p class="technique-quando"><b>${tr("Quando", "When")}</b> ${esc(item.quando)}</p>` : ""
            }${
                item.passos?.length
                    ? `<details${destaque && window.matchMedia("(min-width: 900px)").matches ? " open" : ""}><summary>${tr("Passos essenciais", "Key steps")}</summary><ol>${item.passos.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>`
                    : ""
            }${
                item.fontes?.length
                    ? `<p class="technique-fontes">${tr("Fontes", "Sources")}: ${item.fontes.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.nome)}</a>`).join(" · ")}</p>`
                    : ""
            }</div></div></article>`;
        };

        const render = () => {
            const term = normalize(query);
            const found = dicas.filter((d) => !term || normalize(`${d.titulo} ${d.categoria} ${d.resumo}`).includes(term));
            const groups = [...new Set(found.map((d) => d.categoria))].map((cat) => {
                const items = found.filter((d) => d.categoria === cat);
                // As fichas com várias imagens vão primeiro, a toda a largura; as outras enchem as linhas seguintes.
                items.sort((a, b) => (b.imagens?.length > 1) - (a.imagens?.length > 1));
                const slug = SLUG[cat] || "";
                return `<div class="technique-group" id="area-${esc(slug)}" data-tom="${esc(slug)}"><div class="technique-group-head"><h2>${esc(cat)}</h2><span class="technique-group-count">${items.length} ${tr(items.length === 1 ? "técnica" : "técnicas", items.length === 1 ? "technique" : "techniques")}</span></div><div class="technique-group-cards">${items.map(card).join("")}</div></div>`;
            });
            byId("technique-grid").innerHTML = groups.join("") || `<p class="empty">${tr("Nenhuma técnica encontrada para essa pesquisa.", "No technique found for this search.")}</p>`;
            byId("technique-count").textContent = tr(`${found.length} de ${dicas.length} técnicas`, `${found.length} of ${dicas.length} techniques`);
        };
        byId("technique-search").addEventListener("input", (e) => { query = e.target.value; render(); });
        render();

        // Ligações antigas: ?categoria=… leva à área; #tecnica-… abre a ficha.
        const area = SLUG[new URLSearchParams(location.search).get("categoria") || ""];
        const hashId = location.hash.slice(1);
        if (hashId.startsWith("tecnica-") && dicas.some((d) => `tecnica-${d.id}` === hashId)) {
            const entry = byId(hashId);
            entry?.querySelector("details")?.setAttribute("open", "");
            entry?.scrollIntoView({ block: "center" });
        } else if (area && !hashId) {
            byId(`area-${area}`)?.scrollIntoView({ block: "start" });
        } else if (hashId.startsWith("area-")) {
            byId(hashId)?.scrollIntoView({ block: "start" });
        }
    }).catch(() => {
        byId("technique-grid").innerHTML = `<p class="empty">${tr("Não foi possível carregar o catálogo de técnicas.", "The technique catalogue could not be loaded.")}</p>`;
    });
})();
