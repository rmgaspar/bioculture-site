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
        let query = "", visiveis = dicas;

        // Imagens da própria técnica; sem elas, a fotografia da área (para nenhum cartão ficar sem imagem).
        const imagensDe = (item) => {
            if (item.imagens?.length) return item.imagens;
            const f = fotoDe(item.categoria);
            return f ? [{ ...f, tipo: "foto" }] : [];
        };

        // Cartão: imagem, título e resumo. Toda a área é uma ligação para a ficha (#tecnica-…).
        const card = (item) => {
            const imagens = imagensDe(item), capa = imagens.find((i) => i.tipo !== "esquema") || imagens[0];
            const extra = imagens.length > 1 ? `<span class="tcard-badge">${imagens.length} ${tr("imagens", "images")}</span>` : "";
            const img = capa ? `<img src="/images/${esc(capa.ficheiro)}" alt="${esc(capa.alt[L])}" width="1200" height="800" loading="lazy" decoding="async">` : "";
            return `<a class="tcard" id="tecnica-${esc(item.id)}" href="#tecnica-${esc(item.id)}" data-id="${esc(item.id)}"><span class="tcard-media">${img}${extra}</span><span class="tcard-body"><span class="tcard-meta">${esc(item.nivel)}</span><strong class="tcard-title">${esc(item.titulo)}</strong><span class="tcard-text">${esc(item.resumo)}</span><span class="tcard-more">${tr("Ver ficha", "Open sheet")} →</span></span></a>`;
        };

        const render = () => {
            const term = normalize(query);
            const found = dicas.filter((d) => !term || normalize(`${d.titulo} ${d.categoria} ${d.resumo}`).includes(term));
            visiveis = [];
            const groups = [...new Set(found.map((d) => d.categoria))].map((cat) => {
                const items = found.filter((d) => d.categoria === cat);
                visiveis.push(...items);
                const slug = SLUG[cat] || "";
                return `<div class="technique-group" id="area-${esc(slug)}" data-tom="${esc(slug)}"><div class="technique-group-head"><h2>${esc(cat)}</h2><span class="technique-group-count">${items.length} ${tr(items.length === 1 ? "técnica" : "técnicas", items.length === 1 ? "technique" : "techniques")}</span></div><div class="technique-group-cards">${items.map(card).join("")}</div></div>`;
            });
            byId("technique-grid").innerHTML = groups.join("") || `<p class="empty">${tr("Nenhuma técnica encontrada para essa pesquisa.", "No technique found for this search.")}</p>`;
            byId("technique-count").textContent = tr(`${found.length} de ${dicas.length} técnicas`, `${found.length} of ${dicas.length} techniques`);
        };

        // Ficha completa numa janela: galeria, época, passos e fontes. O endereço (#tecnica-…) abre-a diretamente.
        let janela = null, ultimoFoco = null;
        const fecharJanela = () => {
            if (!janela) return;
            janela.remove(); janela = null;
            document.documentElement.classList.remove("tec-aberta");
            ultimoFoco?.focus?.({ preventScroll: true });
        };
        const abrir = (id) => {
            const item = dicas.find((d) => d.id === id);
            if (!item) return;
            const lista = visiveis.some((d) => d.id === id) ? visiveis : dicas;
            const i = lista.findIndex((d) => d.id === id), ant = lista[i - 1], seg = lista[i + 1];
            const galeria = window.BioCulturaGaleria ? window.BioCulturaGaleria.html({ imagens: imagensDe(item) }, L) : "";
            const passos = item.passos?.length
                ? `<h3 class="tfiche-sub">${tr("Passos essenciais", "Key steps")}</h3><ol class="tfiche-passos">${item.passos.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : "";
            const quando = item.quando ? `<p class="tfiche-quando"><b>${tr("Quando", "When")}</b>${esc(item.quando)}</p>` : "";
            const fontes = item.fontes?.length
                ? `<p class="tfiche-fontes">${tr("Fontes", "Sources")}: ${item.fontes.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.nome)}</a>`).join(" · ")}</p>` : "";
            const nav = (t, rotulo, seta) => t ? `<a class="tfiche-nav" href="#tecnica-${esc(t.id)}" rel="${seta === "←" ? "prev" : "next"}">${seta === "←" ? "← " : ""}<span><small>${rotulo}</small>${esc(t.titulo)}</span>${seta === "→" ? " →" : ""}</a>` : "<span></span>";
            const html = `<div class="tfiche-fundo" data-fechar></div><article class="tfiche" role="dialog" aria-modal="true" aria-labelledby="tfiche-titulo" data-tom="${esc(SLUG[item.categoria] || "")}"><button type="button" class="tfiche-fechar" data-fechar aria-label="${tr("Fechar", "Close")}">×</button><div class="tfiche-grelha"><div class="tfiche-imagens">${galeria}</div><div class="tfiche-texto"><span class="tfiche-meta">${esc(item.categoria)} · ${esc(item.nivel)}</span><h2 id="tfiche-titulo">${esc(item.titulo)}</h2><p class="tfiche-resumo">${esc(item.resumo)}</p>${quando}${passos}${fontes}</div></div><div class="tfiche-rodape">${nav(ant, tr("Anterior", "Previous"), "←")}${nav(seg, tr("Seguinte", "Next"), "→")}</div></article>`;
            if (!janela) {
                ultimoFoco = document.activeElement;
                janela = document.createElement("div");
                janela.className = "tfiche-janela";
                document.body.appendChild(janela);
                document.documentElement.classList.add("tec-aberta");
            }
            janela.innerHTML = html;
            janela.querySelector(".tfiche").scrollTop = 0;
            janela.querySelector(".tfiche-fechar").focus({ preventScroll: true });
            // O cartão fica visível por trás, para o regresso ser no mesmo sítio.
            byId(`tecnica-${id}`)?.scrollIntoView({ block: "nearest" });
        };
        const sincronizar = () => {
            const h = location.hash.slice(1);
            if (h.startsWith("tecnica-")) abrir(h.slice(8));
            else fecharJanela();
        };
        const fechar = () => {
            fecharJanela();
            if (location.hash.startsWith("#tecnica-")) history.replaceState(null, "", location.pathname + location.search);
        };
        document.addEventListener("click", (e) => { if (janela && e.target.closest("[data-fechar]")) fechar(); });
        document.addEventListener("keydown", (e) => {
            if (!janela) return;
            if (e.key === "Escape") fechar();
            const alvo = e.key === "ArrowLeft" ? janela.querySelector('[rel="prev"]') : e.key === "ArrowRight" ? janela.querySelector('[rel="next"]') : null;
            if (alvo && !/input|textarea/i.test(e.target.tagName)) location.hash = alvo.getAttribute("href");
        });
        window.addEventListener("hashchange", sincronizar);

        byId("technique-search").addEventListener("input", (e) => { query = e.target.value; render(); });
        render();

        // Ligações: ?categoria=… leva à área; #area-… também; #tecnica-… abre a ficha.
        const area = SLUG[new URLSearchParams(location.search).get("categoria") || ""];
        const hashId = location.hash.slice(1);
        if (hashId.startsWith("tecnica-")) abrir(hashId.slice(8));
        else if (area && !hashId) byId(`area-${area}`)?.scrollIntoView({ block: "start" });
        else if (hashId.startsWith("area-")) byId(hashId)?.scrollIntoView({ block: "start" });
    }).catch(() => {
        byId("technique-grid").innerHTML = `<p class="empty">${tr("Não foi possível carregar o catálogo de técnicas.", "The technique catalogue could not be loaded.")}</p>`;
    });
})();
