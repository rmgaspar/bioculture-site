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
    let geo, indice, ano;

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
        }</div><h4>${tr("Causa apurada pelo ICNF", "Cause as classified by ICNF")}</h4><div class="fg-bar" role="img" aria-label="${tr("Área ardida por causa", "Burned area by cause")}">${
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
            label = (p, f) => {
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
                lab.textContent = `${f.c} · ${num(f.a)} ha`;
                svg.appendChild(lab);
            },
            hl = (i, on) => {
                const p = byI(i), f = d.fogos[i];
                if (p) p.classList.toggle("is-hl", on);
                root.querySelectorAll(`.fg-row[data-i="${i}"]`).forEach((r) => r.classList.toggle("is-hl", on));
                svg.classList.toggle("has-hl", on);
                label(on ? p : null, f);
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
    }

    function show(y) {
        ano = y;
        get(`/data/fogo/${y}.json`).then((d) => { if (ano === y) render(d); }).catch(() => { root.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados deste ano.", "This year's data could not be loaded.")}</p>`; });
    }

    Promise.all([get("/data/participa-geo.json"), get("/data/fogo/indice.json")]).then(([g, i]) => {
        geo = g; indice = i;
        const anos = Object.keys(i.anos).map(Number), q = new URLSearchParams(location.search).get("ano");
        show(anos.includes(+q) ? +q : Math.max(...anos));
    }).catch(() => { root.innerHTML = `<p class="prose">${tr("Não foi possível carregar o mapa.", "The map could not be loaded.")}</p>`; });
})();
