(function () {
    "use strict";
    // Mapa de áreas ardidas: perímetros do ICNF por ano (data/fogo/<ano>.json), no mesmo desenho do mapa das consultas.
    const root = document.getElementById("mapa");
    if (!root) return;
    const isEn = () => !!window.BioCultureI18n?.isEnglish,
        tr = (pt, en) => (isEn() ? en : pt),
        esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]),
        num = (n) => Math.round(n).toLocaleString(isEn() ? "en-GB" : "pt-PT"),
        CAUSAS = {
            N: ["Negligência", "Negligence", "#d98a1f"],
            I: ["Intencional", "Intentional", "#a1362b"],
            A: ["Natural", "Natural", "#3f7f9f"],
            R: ["Reacendimento", "Rekindling", "#8a6d3b"],
            D: ["Desconhecida", "Unknown", "#9aa093"],
            "?": ["Sem classificação", "Unclassified", "#c3c8bd"],
        },
        EMBER = "#c4552b",
        cache = {};
    const ZAER = { solar: ["PSZAER solar", "PSZAER solar", "#e0a800"], eolica: ["PSZAER eólica", "PSZAER wind", "#2f7fd1"] },
        MINAS = { concessoes: ["Concessões", "Concessions", "#7b4aa5"], pesquisa: ["Prospeção e pesquisa", "Prospecting and exploration", "#c0397f"] },
        ESTADO = { C: ["Atribuída", "Granted"], P: ["Requerida", "Requested"], B: ["Em publicação", "Being published"], R: ["Reservada", "Reserved"], "?": ["", ""] },
        zon = { solar: false, eolica: false, concessoes: false, pesquisa: false, litio: false };
    let geo, indice, ano, zmeta, minas;

    const get = (url) => cache[url] || (cache[url] = fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }));
    const dia = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short", year: "numeric" }) : "");

    function render(d) {
        const idx = indice.anos[d.ano], oficial = idx.oficial_ha, W = geo.largura, H = geo.altura, pad = 4,
            contorno = "M" + geo.contorno.map((q) => q.join(",")).join("L") + "Z",
            total = Object.values(d.causas_ha).reduce((s, v) => s + v, 0),
            top = d.fogos.slice(0, 6), maxA = top[0]?.a || 1,
            rest = d.n - d.mostrados, pctShown = Math.round((d.ha_mostrados / d.ha) * 100),
            dif = oficial ? Math.round(Math.abs(d.ha - oficial) / oficial * 1000) / 10 : null,
            prov = d.ano === Math.max(...Object.keys(indice.anos).map(Number));
        root.innerHTML = `<div class="fg-top"><div class="fg-map"><svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(tr(`Mapa das áreas ardidas em Portugal continental em ${d.ano}`, `Map of burned areas in mainland Portugal in ${d.ano}`))}"><path d="${contorno}" fill="#eef1e8" stroke="#c9d1bd" stroke-width=".9" stroke-linejoin="round"/>${
            d.fogos.map((f) => `<path class="fg-fire" data-i="${d.fogos.indexOf(f)}" data-t="${f.t || "?"}" d="${f.p}" fill="${EMBER}" fill-opacity=".72" stroke="${EMBER}" stroke-width=".25" stroke-linejoin="round"/>`).join("")
        }</svg><p class="fg-unit">${tr("Cada mancha é um fogo de 25 ha ou mais.", "Each patch is a fire of 25 ha or more.")}</p></div><div class="fg-side"><small>${tr("Área ardida · Portugal continental", "Burned area · mainland Portugal")}</small><h3>${
            tr(`${num(oficial || d.ha)} hectares ardidos em ${d.ano}`, `${num(oficial || d.ha)} hectares burned in ${d.ano}`)
        }</h3><div class="fg-years" role="group" aria-label="${tr("Ano", "Year")}">${
            Object.keys(indice.anos).map((y) => `<button type="button" class="fg-year${+y === d.ano ? " is-on" : ""}" data-y="${y}">${y}</button>`).join("")
        }</div><div class="fg-layers" role="group" aria-label="${tr("Camadas", "Layers")}"><span>${tr("Zonas PSZAER", "PSZAER zones")}</span>${
            Object.entries(ZAER).map(([k, v]) => `<button type="button" class="fg-layer${zon[k] ? " is-on" : ""}" data-z="${k}" style="--c:${v[2]}"><i></i>${v[isEn() ? 1 : 0]} · ${tr("aprox.", "approx.")}</button>`).join("")
        }</div><div class="fg-layers" role="group" aria-label="${tr("Mineração", "Mining")}"><span>${tr("Mineração", "Mining")}</span>${
            Object.entries(MINAS).map(([k, v]) => `<button type="button" class="fg-layer${zon[k] ? " is-on" : ""}" data-z="${k}" style="--c:${v[2]}"><i></i>${v[isEn() ? 1 : 0]}</button>`).join("")
        }<button type="button" class="fg-layer fg-lit${zon.litio ? " is-on" : ""}" data-z="litio" style="--c:#2b2f2a"><i></i>${tr("só lítio", "lithium only")}</button></div><div class="fg-zaer-note" hidden></div><h4>${tr("Causa apurada pelo ICNF", "Cause as classified by ICNF")}</h4><div class="fg-bar" role="img" aria-label="${tr("Área ardida por causa", "Burned area by cause")}">${
            Object.entries(d.causas_ha).map(([k, v]) => `<i data-t="${k}" style="width:${v / total * 100}%;background:${CAUSAS[k][2]}" title="${esc(CAUSAS[k][isEn() ? 1 : 0])}: ${num(v)} ha"></i>`).join("")
        }</div><ul class="fg-leg">${
            Object.entries(d.causas_ha).map(([k, v]) => `<li data-t="${k}" tabindex="0"><i style="background:${CAUSAS[k][2]}"></i><span>${CAUSAS[k][isEn() ? 1 : 0]}</span><b>${v / total < 0.01 ? "<1" : Math.round(v / total * 100)} %</b></li>`).join("")
        }</ul><h4>${tr("Os maiores fogos", "The largest fires")}</h4>${
            top.map((f, i) => `<div class="fg-row" data-i="${i}" tabindex="0"><span class="fg-l">${esc(f.c)}<em>${dia(f.d)}</em></span><span class="fg-t"><i style="width:${f.a / maxA * 100}%"></i></span><span class="fg-v">${num(f.a)}<em>ha</em></span></div>`).join("")
        }<p class="fg-note">${
            tr(`Desenhados os ${d.mostrados} fogos com 25 ha ou mais, que somam ${pctShown} % da área ardida. Os outros ${num(rest)} são mais pequenos: contam nos totais, mas não se veem aqui. Os contornos estão simplificados.`,
                `Drawn: the ${d.mostrados} fires of 25 ha or more, which add up to ${pctShown} % of the burned area. The other ${num(rest)} are smaller: they count in the totals but cannot be seen here. Outlines are simplified.`)
        }${
            oficial ? " " + tr(`A cartografia soma ${num(d.ha)} ha e a estatística oficial indica ${num(oficial)} ha (diferença de ${dif} %): são duas contagens do ICNF e não coincidem.`, `The map data add up to ${num(d.ha)} ha and the official statistic is ${num(oficial)} ha (a ${dif} % difference): two counts from ICNF that do not match.`) : ""
        }${prov ? " " + tr("Os dados do ano mais recente são provisórios.", "Data for the most recent year are provisional.") : ""}</p><p class="fg-fonte">${tr("Fonte:", "Source:")} <a href="${esc(indice.fonte_url)}" target="_blank" rel="noopener">ICNF, áreas ardidas</a> · ${tr("estatísticas de incêndios rurais do ICNF", "ICNF rural fire statistics")}.</p></div></div>`;
        wire(d);
    }

    // Ligar mancha, linha da lista e causa: ao passar o rato num, realça o outro.
    function wire(d) {
        const svg = root.querySelector("svg"), fires = [...root.querySelectorAll(".fg-fire")], rows = [...root.querySelectorAll(".fg-row")];
        let lab = null;
        const byI = (i) => fires.find((p) => +p.dataset.i === +i),
            label = (p, linhas) => {
                if (lab) { lab.remove(); lab = null; }
                if (!p) return;
                const b = p.getBBox(), vb = svg.viewBox.baseVal, k = vb.width / (svg.getBoundingClientRect().width || vb.width),
                    left = b.x + b.width / 2 > vb.x + vb.width * 0.55;
                lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
                lab.setAttribute("class", "fg-lab");
                lab.setAttribute("x", left ? b.x - 1.5 : b.x + b.width + 1.5);
                lab.setAttribute("y", b.y + b.height / 2 + 4 * k);
                lab.setAttribute("text-anchor", left ? "end" : "start");
                lab.setAttribute("font-size", 12 * k);
                const x0 = lab.getAttribute("x");
                linhas.filter(Boolean).forEach((t, n) => {
                    const ts = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
                    ts.setAttribute("x", x0);
                    if (n) { ts.setAttribute("dy", 13 * k); ts.setAttribute("font-weight", 500); ts.setAttribute("font-size", 10.5 * k); }
                    ts.textContent = t;
                    lab.appendChild(ts);
                });
                svg.appendChild(lab);
            },
            hl = (i, on) => {
                const p = byI(i), f = d.fogos[i];
                if (p) p.classList.toggle("is-hl", on);
                root.querySelectorAll(`.fg-row[data-i="${i}"]`).forEach((r) => r.classList.toggle("is-hl", on));
                svg.classList.toggle("has-hl", on);
                label(on ? p : null, [`${f.c} · ${num(f.a)} ha`]);
            },
            cause = (t, on) => {
                svg.classList.toggle("has-cause", on);
                fires.forEach((p) => { p.classList.toggle("is-cause", on && p.dataset.t === t); if (on && p.dataset.t === t) p.setAttribute("fill", CAUSAS[t][2]); else p.setAttribute("fill", EMBER); });
                root.querySelectorAll(".fg-leg li").forEach((li) => li.classList.toggle("is-hl", on && li.dataset.t === t));
                root.querySelectorAll(".fg-bar i").forEach((i) => i.classList.toggle("is-dim", on && i.dataset.t !== t));
            };
        fires.forEach((p) => { p.addEventListener("pointerenter", () => hl(p.dataset.i, true)); p.addEventListener("pointerleave", () => hl(p.dataset.i, false)); });
        rows.forEach((r) => { ["pointerenter", "focus"].forEach((e) => r.addEventListener(e, () => hl(r.dataset.i, true))); ["pointerleave", "blur"].forEach((e) => r.addEventListener(e, () => hl(r.dataset.i, false))); });
        root.querySelectorAll(".fg-leg li, .fg-bar i").forEach((n) => { ["pointerenter", "focus"].forEach((e) => n.addEventListener(e, () => cause(n.dataset.t, true))); ["pointerleave", "blur"].forEach((e) => n.addEventListener(e, () => cause(n.dataset.t, false))); });
        root.querySelectorAll(".fg-year").forEach((b) => b.addEventListener("click", () => show(+b.dataset.y)));
        const NS = "http://www.w3.org/2000/svg", mk = (t, at) => { const n = document.createElementNS(NS, t); Object.entries(at).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
        const aplicar = () => {
            svg.querySelectorAll(".fg-zaer, .fg-mina").forEach((n) => n.remove());
            if (zmeta) Object.keys(ZAER).filter((k) => zon[k]).forEach((k) => {
                svg.appendChild(mk("image", { class: "fg-zaer", href: `/data/fogo/zaer-${k}.png?v=1`, width: zmeta.largura, height: zmeta.altura, preserveAspectRatio: "none", transform: `matrix(${zmeta.matriz.join(" ")})` }));
            });
            if (minas) Object.keys(MINAS).filter((k) => zon[k]).forEach((k) => (minas[k] || []).forEach((m) => {
                const atr = m.e === "C" || m.e === "?", li = /lítio/i.test(m.s);
                const el = mk("path", { class: "fg-mina" + (li ? " is-li" : ""), d: m.p, fill: MINAS[k][2], "fill-opacity": k === "pesquisa" ? (atr ? 0.35 : 0.12) : (atr ? 0.9 : 0.35), stroke: MINAS[k][2], "stroke-width": 0.55, "stroke-linejoin": "round" });
                if (k === "pesquisa") el.setAttribute("stroke-dasharray", "1.6 1");
                if (m.caso) { el.classList.add("tem-caso"); el.addEventListener("click", () => { location.href = `/energia/mineracao#caso-${m.caso}`; }); }
                el.addEventListener("pointerenter", () => { el.classList.add("is-hl"); label(el, [`${m.n}${ESTADO[m.e][isEn() ? 1 : 0] ? " · " + ESTADO[m.e][isEn() ? 1 : 0] : ""}`, m.s, m.caso ? tr("Clica para ver o dossiê →", "Click for the case file →") : MINAS[k][isEn() ? 1 : 0]]); });
                el.addEventListener("pointerleave", () => { el.classList.remove("is-hl"); label(null, []); });
                svg.appendChild(el);
            }));
            svg.classList.toggle("so-litio", zon.litio);
            root.querySelectorAll(".fg-layer").forEach((b) => b.classList.toggle("is-on", zon[b.dataset.z]));
            const nota = root.querySelector(".fg-zaer-note"), zaer = zon.solar || zon.eolica, min = zon.concessoes || zon.pesquisa;
            nota.hidden = !(zaer || min);
            nota.innerHTML = (zaer ? `<p>${tr(
                `Zonas PSZAER, camada aproximada: reconstituída a partir dos mapas em imagem do portal do PSZAER, porque os polígonos oficiais não estão publicados. Serve para ver a mancha geral, não para medir áreas nem sobreposições. As zonas são potenciais, não são projetos, e os fogos de ${d.ano} são anteriores à proposta (maio de 2026).`,
                `PSZAER zones, approximate layer: rebuilt from the image maps on the PSZAER portal, because the official polygons are not published. It shows the general pattern; it cannot measure areas or overlaps. The zones are potential, not projects, and the ${d.ano} fires predate the proposal (May 2026).`)}</p>` : "") +
                (min && minas ? `<p>${tr(
                    `Mineração: áreas atribuídas, requeridas ou em publicação, em vigor, em Portugal continental (DGEG, consultado em ${dia(minas.consultado)}). Mostram onde há direitos ou pedidos, não minas em atividade; as de prospeção e pesquisa são áreas de estudo e não de exploração. Linha cheia: atribuída; mais clara: requerida ou em publicação.`,
                    `Mining: areas granted, requested or being published, in force, in mainland Portugal (DGEG, consulted ${dia(minas.consultado)}). They show where rights or applications exist, not active mines; prospecting and exploration areas are for study, not extraction. Solid: granted; lighter: requested or being published.`)}</p>` + (zon.concessoes && Object.keys(minas.casos || {}).length ? `<p>${tr("Dossiês na página de Mineração:", "Case files on the Mining page:")} ${Object.entries(minas.casos).map(([id, n]) => `<a href="/energia/mineracao#caso-${esc(id)}">${esc(n)}</a>`).join(" · ")}.</p>` : "") : "");
        };
        root.querySelectorAll(".fg-layer").forEach((b) => b.addEventListener("click", () => {
            zon[b.dataset.z] = !zon[b.dataset.z];
            if ((zon.concessoes || zon.pesquisa) && !minas) get("/data/fogo/minas.json?v=2").then((m) => { minas = m; aplicar(); }).catch(() => {});
            aplicar();
        }));
        if ((zon.concessoes || zon.pesquisa) && !minas) get("/data/fogo/minas.json?v=2").then((m) => { minas = m; aplicar(); }).catch(() => {});
        aplicar();
    }

    function show(y) {
        ano = y;
        get(`/data/fogo/${y}.json`).then((d) => { if (ano === y) render(d); }).catch(() => { root.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados deste ano.", "This year's data could not be loaded.")}</p>`; });
    }

    Promise.all([get("/data/participa-geo.json"), get("/data/fogo/indice.json"), get("/data/fogo/zaer-aprox.json").catch(() => null)]).then(([g, i, z]) => {
        geo = g; indice = i; zmeta = z;
        const anos = Object.keys(i.anos).map(Number), q = new URLSearchParams(location.search).get("ano");
        show(anos.includes(+q) ? +q : Math.max(...anos));
    }).catch(() => { root.innerHTML = `<p class="prose">${tr("Não foi possível carregar o mapa.", "The map could not be loaded.")}</p>`; });
})();
