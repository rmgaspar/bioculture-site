/* «A teia do jardim»: quem come quem numa horta em Portugal (data/teia-jardim.json).
   Toca num animal para ver o que come, quem o come e como o ajudar; «Retira este elo» mostra o que
   perde controlo; o cenário do inseticida de largo espetro marca quem seria atingido.
   Cada ligação tem fonte. É um mapa simplificado da literatura, não uma medição do teu jardim. */
(function () {
    "use strict";

    const root = document.getElementById("teia-jardim");
    if (!root) return;
    const isEnglish = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en) => (isEnglish ? en : pt);
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    const pick = (obj) => (isEnglish ? obj.en : obj.pt);
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const NS = "http://www.w3.org/2000/svg";

    const icon = (id) => (window.BioCulturaTeiaIcones && window.BioCulturaTeiaIcones[id]) || "";
    // Fotografia (iNaturalist, licença aberta) quando existe; senão a ilustração do elo. Se a foto falhar, volta à ilustração.
    const media = (no) => (no.foto ? `<img class="tj-foto" data-id="${no.id}" src="${esc(no.foto.url)}" alt="" loading="lazy" decoding="async">` : icon(no.id));
    const credit = (no) => (no.foto
        ? `<figcaption>${tr("Foto", "Photo")}: ${esc(no.foto.autor)} · <a href="${esc(no.foto.licenca_url)}" target="_blank" rel="noopener noreferrer">${esc(no.foto.licenca)}</a> · <a href="${esc(no.foto.pagina)}" target="_blank" rel="noopener noreferrer">iNaturalist</a></figcaption>`
        : "");

    const state = { sel: "", removed: "", pest: false };
    let data = null, nodes = {}, links = [], refNumber = {}, mapa = null, svg = null, birds = null;

    const eats = (id) => links.filter((l) => l.de === id && l.forca !== "base" && l.forca !== "entre");
    const eatenBy = (id) => links.filter((l) => l.para === id && l.forca !== "base" && l.forca !== "entre");
    const names = (ids) => ids.map((id) => pick(nodes[id]).nome.toLowerCase()).join(", ");
    const refChips = (ids) => (ids || []).length
        ? `<span class="tj-refs">${[...ids].sort((x, y) => refNumber[x] - refNumber[y]).map((id) => `<a href="#tj-ref-${refNumber[id]}" title="${esc(data.referencias[id].citacao)}">[${refNumber[id]}]</a>`).join("")}</span>`
        : "";

    function skeleton() {
        const niveis = data.niveis.map((nivel) => `
            <div class="tj-nivel" data-nivel="${nivel.id}">
                <span class="tj-rotulo">${esc(pick(nivel))}</span>
                <div class="tj-nos">${data.nos.filter((no) => no.nivel === nivel.id).map((no) => `
                    <button type="button" class="tj-no" data-id="${no.id}" aria-pressed="false">
                        <span class="tj-ico${no.foto ? " tem-foto" : ""}">${media(no)}</span>
                        <span class="tj-nome">${esc(pick(no).nome)}</span>
                        <span class="tj-selo" aria-hidden="true"></span>
                    </button>`).join("")}
                </div>
            </div>`).join("");
        const refs = Object.keys(data.referencias).map((id) => {
            const r = data.referencias[id];
            return `<li id="tj-ref-${refNumber[id]}"><b>[${refNumber[id]}]</b> ${esc(r.citacao)} <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${tr("abrir", "open")} ↗</a></li>`;
        }).join("");
        root.innerHTML = `
            <div class="tj-cabeca">
                <span class="eyebrow">${tr("A teia do jardim", "The garden web")}</span>
                <h2 id="tj-titulo">${tr("Antes de eliminares, vê quem controla o quê", "Before you remove anything, see who controls what")}</h2>
                <p>${tr("Cada elo que removes deixa de controlar outra coisa. Toca num animal para ver o que come, quem o come e como o podes ajudar.", "Every link you remove stops controlling something else. Tap an animal to see what it eats, what eats it and how you can help it.")}</p>
            </div>
            <div class="tj-barra">
                <button type="button" class="tj-cenario-btn" id="tj-pest" aria-pressed="false">${tr("E se aplicas um inseticida de largo espetro?", "What if you apply a broad-spectrum insecticide?")}</button>
                <button type="button" class="tj-limpar" id="tj-limpar" hidden>${tr("Limpar", "Reset")}</button>
            </div>
            <div class="tj-cenario" id="tj-cenario" hidden></div>
            <div class="tj-mapa" id="tj-mapa">
                <svg class="tj-linhas" id="tj-linhas" aria-hidden="true"><defs>
                    <marker id="tj-seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.5L8.5 5 1 8.5z" fill="#93a296"/></marker>
                    <marker id="tj-seta-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.5L8.5 5 1 8.5z" fill="#2f5a3f"/></marker>
                </defs><g id="tj-g"></g></svg>
                ${niveis}
            </div>
            <div class="tj-painel" id="tj-painel" aria-live="polite"></div>
            <p class="tj-lei" id="tj-numeros" hidden></p>
            <p class="tj-nota">${esc(pick(data.nota))} ${esc(pick(data.nota_fotos))}</p>
            <details class="tj-fontes"><summary>${tr("Fontes e referências", "Sources and references")}</summary><ol class="tj-lista-fontes">${refs}</ol></details>
            <p class="tj-ver"><a href="/observatorio/bioweb.html">${tr("Ver a mesma teia à escala de Portugal: A teia →", "See the same web at Portugal's scale: The web →")}</a></p>`;
        mapa = document.getElementById("tj-mapa");
        svg = document.getElementById("tj-g");
    }

    function node(id) { return mapa.querySelector(`.tj-no[data-id="${id}"]`); }
    function center(el, base) {
        const r = el.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, top: r.top - base.top, bottom: r.bottom - base.top, y: r.top - base.top + r.height / 2 };
    }
    function draw() {
        if (!mapa) return;
        const base = mapa.getBoundingClientRect();
        svg.parentNode.setAttribute("width", base.width);
        svg.parentNode.setAttribute("height", base.height);
        svg.innerHTML = "";
        links.forEach((l, index) => {
            const a = center(node(l.de), base); // quem come
            const b = center(node(l.para), base); // quem é comido
            let d;
            if (Math.abs(a.y - b.y) < 20) {
                const lift = 46 + (index % 3) * 8;
                d = `M${b.x},${b.top} C${b.x},${b.top - lift} ${a.x},${a.top - lift} ${a.x},${a.top - 3}`;
            } else if (a.y < b.y) {
                const dy = (b.top - a.bottom) * 0.5;
                d = `M${b.x},${b.top} C${b.x},${b.top - dy} ${a.x},${a.bottom + dy} ${a.x},${a.bottom + 3}`;
            } else {
                const dy = (a.top - b.bottom) * 0.5;
                d = `M${b.x},${b.bottom} C${b.x},${b.bottom + dy} ${a.x},${a.top - dy} ${a.x},${a.top - 3}`;
            }
            const path = document.createElementNS(NS, "path");
            path.setAttribute("d", d);
            path.setAttribute("class", `tj-liga tj-${l.forca}`);
            path.setAttribute("marker-end", "url(#tj-seta)");
            path.dataset.de = l.de;
            path.dataset.para = l.para;
            svg.appendChild(path);
        });
        paint();
    }

    function paint() {
        const sel = state.sel, rem = state.removed;
        const related = new Set();
        if (sel) { related.add(sel); links.forEach((l) => { if (l.de === sel) related.add(l.para); if (l.para === sel) related.add(l.de); }); }
        const upset = new Set(), hungry = new Set();
        if (rem) { eats(rem).forEach((l) => upset.add(l.para)); eatenBy(rem).forEach((l) => hungry.add(l.de)); }
        const hit = new Set(state.pest ? data.nos.filter((n) => n.artropode).map((n) => n.id) : []);
        const indirect = new Set();
        if (state.pest) data.nos.filter((n) => n.nivel === "topo").forEach((n) => indirect.add(n.id));
        mapa.classList.toggle("tem-sel", !!sel);
        mapa.querySelectorAll(".tj-no").forEach((button) => {
            const id = button.dataset.id;
            button.classList.toggle("is-sel", id === sel);
            button.classList.toggle("is-rel", !!sel && related.has(id) && id !== sel);
            button.classList.toggle("is-dim", !!sel && !related.has(id));
            button.classList.toggle("is-removed", id === rem);
            button.classList.toggle("is-up", upset.has(id));
            button.classList.toggle("is-down", hungry.has(id));
            button.classList.toggle("is-hit", hit.has(id));
            button.classList.toggle("is-indirect", indirect.has(id) && !hit.has(id));
            button.setAttribute("aria-pressed", String(id === sel));
            const selo = button.querySelector(".tj-selo");
            selo.textContent = id === rem ? "✕" : upset.has(id) ? tr("▲ perde um inimigo", "▲ loses an enemy") : hungry.has(id) ? tr("▼ perde uma presa", "▼ loses a prey")
                : hit.has(id) ? tr("pode ser atingido", "may be hit") : indirect.has(id) ? tr("menos alimento", "less food") : "";
        });
        svg.querySelectorAll(".tj-liga").forEach((path) => {
            const on = !!sel && (path.dataset.de === sel || path.dataset.para === sel);
            path.classList.toggle("is-on", on);
            path.setAttribute("marker-end", on ? "url(#tj-seta-on)" : "url(#tj-seta)");
            path.classList.toggle("is-off", !!sel && !on);
            const cut = !!rem && (path.dataset.de === rem || path.dataset.para === rem);
            path.classList.toggle("is-cut", cut);
        });
        document.getElementById("tj-pest").setAttribute("aria-pressed", String(state.pest));
        document.getElementById("tj-limpar").hidden = !(sel || rem || state.pest);
    }

    function consequences(id) {
        const out = [];
        eats(id).forEach((l) => {
            const others = eatenBy(l.para).map((x) => x.de).filter((x) => x !== id);
            const prey = pick(nodes[l.para]).nome.toLowerCase();
            out.push(others.length
                ? tr(`<b>${esc(prey)}</b> fica com menos um inimigo natural. Neste mapa, também são comidos por: ${esc(names(others))}.`, `<b>${esc(prey)}</b> loses one natural enemy. On this map, they are also eaten by: ${esc(names(others))}.`)
                : tr(`<b>${esc(prey)}</b> fica, neste mapa, sem nenhum inimigo natural.`, `<b>${esc(prey)}</b> is left, on this map, with no natural enemy.`));
        });
        eatenBy(id).forEach((l) => {
            const otherPrey = eats(l.de).map((x) => x.para).filter((x) => x !== id);
            const eater = pick(nodes[l.de]).nome.toLowerCase();
            out.push(otherPrey.length
                ? tr(`<b>${esc(eater)}</b> perde uma presa. Também come: ${esc(names(otherPrey))}.`, `<b>${esc(eater)}</b> loses a prey. It also eats: ${esc(names(otherPrey))}.`)
                : tr(`<b>${esc(eater)}</b> perde, neste mapa, a única presa.`, `<b>${esc(eater)}</b> loses, on this map, its only prey.`));
        });
        return out;
    }

    function linkList(list, key, other) {
        if (!list.length) return `<li class="tj-vazio">${tr("Nada neste mapa.", "Nothing on this map.")}</li>`;
        return list.map((l) => {
            const target = nodes[l[other]];
            return `<li><button type="button" class="tj-salto" data-id="${target.id}">${esc(pick(target).nome)}</button> <span>${esc(pick(l))}</span>${refChips(l.refs)}${l.forca === "entre" ? ` <em>(${tr("entre auxiliares", "among helpers")})</em>` : ""}</li>`;
        }).join("");
    }

    function renderPanel() {
        const panel = document.getElementById("tj-painel");
        const id = state.sel;
        if (!id) {
            panel.innerHTML = `<p class="tj-dica">${tr("Escolhe um animal no mapa. O que vês aqui vem de estudos e guias citados em «Fontes e referências».", "Pick an animal on the map. What you see here comes from the studies and guides cited under «Sources and references».")}</p>`;
            return;
        }
        const no = nodes[id], c = pick(no);
        const comes = links.filter((l) => l.de === id);
        const comido = links.filter((l) => l.para === id);
        const ficha = no.ficha ? `<a href="/ecossistemas/especie-detalhe.html?id=${encodeURIComponent(no.ficha)}">${tr("Ficha no catálogo", "Catalogue entry")} →</a>` : "";
        const ver = ficha + (no.ver || []).map((v) => v.t === "prob"
            ? `<a href="#problema-${esc(v.id)}">${tr("Ver a resposta", "See the answer")} →</a>`
            : `<a href="${esc(v.href)}">${esc(isEnglish ? v.en : v.pt)} →</a>`).join("");
        const removable = no.nivel !== "base";
        const cons = state.removed === id ? consequences(id) : [];
        panel.innerHTML = `
            <div class="tj-ficha">
                <div class="tj-ficha-topo">
                    ${no.foto ? `<figure class="tj-retrato"><img class="tj-foto" data-id="${id}" src="${esc(no.foto.url)}" alt="${esc(c.nome)}" decoding="async">${credit(no)}</figure>` : `<span class="tj-ico tj-ico-grande">${icon(id)}</span>`}
                    <div><h3>${esc(c.nome)}</h3>${no.latim ? `<small>${esc(no.latim)}</small>` : ""}</div>
                    ${removable ? `<button type="button" class="tj-remover" id="tj-remover" aria-pressed="${state.removed === id}">${state.removed === id ? tr("Repor este elo", "Put this link back") : tr("Retira este elo", "Remove this link")}</button>` : ""}
                </div>
                <p class="tj-resumo">${esc(c.resumo)}${refChips(no.refs)}</p>
                ${cons.length ? `<div class="tj-efeitos"><h4>${tr("Sem este elo, nesta teia", "Without this link, on this web")}</h4><ul>${cons.map((t) => `<li>${t}</li>`).join("")}</ul><p>${tr("É uma leitura da teia, não uma previsão: o efeito real depende do lugar, da estação e das outras espécies.", "This is a reading of the web, not a forecast: the real effect depends on place, season and other species.")}</p></div>` : ""}
                <div class="tj-colunas">
                    <div><h4>${tr("O que come", "What it eats")}</h4><ul>${linkList(comes, "de", "para")}</ul></div>
                    <div><h4>${tr("Quem o come", "What eats it")}</h4><ul>${linkList(comido, "para", "de")}</ul></div>
                    <div class="tj-ajudar"><h4>${tr("Como ajudar", "How to help")}</h4><ul>${c.ajudar.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${ver ? `<p class="tj-ver-links">${ver}</p>` : ""}</div>
                </div>
            </div>`;
    }

    function renderCenario() {
        const box = document.getElementById("tj-cenario");
        box.hidden = !state.pest;
        if (!state.pest) { box.innerHTML = ""; return; }
        const c = pick(data.cenario);
        box.innerHTML = `<h3>${esc(c.titulo)}</h3><ul>${c.passos.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><p class="tj-cenario-fontes">${tr("Fontes", "Sources")}: ${refChips(data.cenario.refs)}</p>`;
    }

    function select(id) {
        state.sel = state.sel === id ? "" : id;
        if (state.removed && state.removed !== state.sel) state.removed = "";
        renderPanel(); paint();
        if (state.sel && window.innerWidth < 900) document.getElementById("tj-painel").scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    }

    function bind() {
        mapa.addEventListener("click", (event) => {
            const button = event.target.closest(".tj-no");
            if (button) select(button.dataset.id);
        });
        // Se uma fotografia não carregar, usa a ilustração do elo.
        root.addEventListener("error", (event) => {
            const img = event.target;
            if (!img.classList || !img.classList.contains("tj-foto")) return;
            const holder = img.closest(".tj-ico") || img.closest(".tj-retrato");
            if (holder && holder.classList.contains("tj-ico")) { holder.classList.remove("tem-foto"); holder.innerHTML = icon(img.dataset.id); }
            else if (holder) holder.innerHTML = `<span class="tj-ico tj-ico-grande">${icon(img.dataset.id)}</span>`;
        }, true);
        root.addEventListener("click", (event) => {
            const chip = event.target.closest(".tj-refs a");
            if (chip) {
                event.preventDefault();
                const target = document.getElementById(chip.getAttribute("href").slice(1));
                const details = root.querySelector(".tj-fontes");
                if (details) details.open = true;
                if (target) target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
                return;
            }
            const jump = event.target.closest(".tj-salto");
            if (jump) { state.sel = jump.dataset.id; if (state.removed !== state.sel) state.removed = ""; renderPanel(); paint(); return; }
            if (event.target.closest("#tj-remover")) { state.removed = state.removed === state.sel ? "" : state.sel; renderPanel(); paint(); return; }
            if (event.target.closest("#tj-pest")) { state.pest = !state.pest; renderCenario(); paint(); return; }
            if (event.target.closest("#tj-limpar")) { state.sel = ""; state.removed = ""; state.pest = false; renderCenario(); renderPanel(); paint(); }
        });
        document.addEventListener("keydown", (event) => { if (event.key === "Escape" && (state.sel || state.removed)) { state.sel = ""; state.removed = ""; renderPanel(); paint(); } });
        if (window.ResizeObserver) new ResizeObserver(() => draw()).observe(mapa);
        else window.addEventListener("resize", draw);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    }

    // Número real, medido (A teia): as aves de zonas agrícolas da UE.
    function showBirds() {
        fetch("/data/bioweb.json?v=4").then((r) => r.json()).then((bw) => {
            const s = bw.aves && bw.aves.agricolas;
            if (!s || !s.v || s.v.length < 2) return;
            const drop = Math.round((1 - s.v[s.v.length - 1] / s.v[0]) * 100);
            const el = document.getElementById("tj-numeros");
            el.innerHTML = tr(`Em números: o índice das <b>aves de zonas agrícolas na UE</b> desceu cerca de <b>${drop}%</b> entre ${s.a} e ${s.a + s.v.length - 1} (<a href="/observatorio/bioweb.html#vida">A teia</a>). O índice não identifica a causa nem é uma série nacional.`,
                `In numbers: the <b>EU farmland bird index</b> fell by about <b>${drop}%</b> between ${s.a} and ${s.a + s.v.length - 1} (<a href="/observatorio/bioweb.html#vida">The web</a>). The index does not identify the cause and is not a national series.`);
            el.hidden = false;
        }).catch(() => {});
    }

    fetch("/data/teia-jardim.json?v=2").then((r) => r.json()).then((json) => {
        data = json;
        data.nos.forEach((n) => { nodes[n.id] = n; });
        links = data.ligacoes.map((l) => ({ ...l }));
        Object.keys(data.referencias).forEach((id, i) => { refNumber[id] = i + 1; });
        root.removeAttribute("hidden");
        skeleton(); renderPanel(); bind(); draw(); showBirds();
    }).catch(() => { root.hidden = true; });
})();
