/* Mapa das consultas públicas (Renováveis e território): um círculo por projeto, com cor e tamanho à escolha do leitor.
   Cor: tipo de projeto, relação com áreas classificadas ou estado da consulta. Tamanho: potência, área, participações ou igual.
   Dados: consultas de data/zaer_critico.json + atributos curados em data/consultas-mapa.json (potência, área e áreas classificadas
   tal como os promotores as indicam nos documentos). Contorno e concelhos: data/participa-geo.json. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const CATS = {
    solar: { pt: "Solar", en: "Solar", c: "#e0a800" },
    eolica: { pt: "Eólica", en: "Wind", c: "#2f7fd1" },
    hibrido: { pt: "Solar e eólica", en: "Solar and wind", c: "#7b4fb3" },
    mineracao: { pt: "Mineração", en: "Mining", c: "#8a5a2b" },
    biometano: { pt: "Biometano", en: "Biomethane", c: "#3f9a4a" },
    solo: { pt: "Uso do solo", en: "Land use", c: "#0f8b8d" },
    plano: { pt: "Estratégia ou programa", en: "Strategy or programme", c: "#8a8f86" },
    outro: { pt: "Outros", en: "Other", c: "#a9aea5" },
  };
  const AC = {
    dentro: { pt: "Sobrepõe-se a área classificada", en: "Overlaps a protected area", c: "#c0392b" },
    junto: { pt: "Junto a área classificada ou sensível", en: "Next to a protected or sensitive area", c: "#e58a1f" },
    fora: { pt: "Sem sobreposição indicada", en: "No overlap stated", c: "#3d8f5f" },
    nd: { pt: "Sem dado", en: "No data", c: "#a9aea5" },
  };
  const ESTADO = {
    aberta: { pt: "Consulta aberta", en: "Open consultation", c: "#17795a" },
    analise: { pt: "Em análise", en: "Under review", c: "#b87f00" },
  };
  const HA = {
    estudo: ["área de estudo", "study area"], intervencao: ["área intervencionada", "area to be developed"], concessao: ["concessão", "concession"],
    implantacao: ["implantação", "footprint"], desflorestar: ["a desflorestar", "to be cleared"], agua: ["plano de água", "water surface"], projeto: ["área do projeto", "project area"],
  };
  const SIZES = {
    mw: { pt: "Potência", en: "Capacity", unit: "MW", list: ["Maiores potências indicadas", "Largest capacities stated"] },
    ha: { pt: "Área", en: "Area", unit: "ha", list: ["Maiores áreas indicadas", "Largest areas stated"] },
    part: { pt: "Participações", en: "Responses", unit: "", list: ["Mais participadas", "Most responses"] },
    igual: { pt: "Igual", en: "Equal", unit: "", list: ["Mais participadas", "Most responses"] },
  };
  const MODES = {
    tipo: { pt: "Tipo", en: "Type" },
    areas: { pt: "Áreas classificadas", en: "Protected areas" },
    estado: { pt: "Estado", en: "Status" },
  };
  const RMIN = 1.7, RMAX = 8.6;

  const catOf = (x) => {
    const t = (x.titulo || "").toLowerCase();
    if (/estrat[ée]gias|programas/i.test(x.tipologia || "")) return "plano";
    if (/minei|concess[aã]o mineira/.test(t)) return "mineracao";
    if (/biometano/.test(t)) return "biometano";
    if (/desflorest/.test(t)) return "solo";
    const s = /solar|fotovolt/.test(t), e = /e[óo]lic/.test(t);
    return s && e ? "hibrido" : s ? "solar" : e ? "eolica" : "outro";
  };

  /* Cria o mapa em `box`. o: { GEO, items, meta, tr, isEn, esc, norm, open$, region, onFilter(visibleIds|null), onPick(id) } */
  function render(box, o) {
    const { GEO, tr, isEn, esc, norm } = o, en = isEn();
    const L = (t) => (en ? t.en : t.pt);
    const nf = (v, d = 0) => v.toLocaleString(en ? "en-GB" : "pt-PT", { maximumFractionDigits: d });
    const fmtDate = (v) => (v ? new Date(v + "T12:00:00").toLocaleDateString(en ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }) : "");

    // Um projeto por consulta, no centro dos concelhos que indica.
    const all = o.items.map((x) => {
      const m = (o.meta.itens || {})[x.id] || {};
      const pts = (x.municipios || []).map((k) => GEO.concelhos[norm(k)]).filter(Boolean);
      const ac = (x.territorio?.linhas || []).find((l) => l.rotulo === "Áreas classificadas");
      return {
        id: x.id, x, cat: m.cat || catOf(x), ac: m.ac || "nd", mw: m.mw ?? null, ha: m.ha ?? null, haTipo: m.ha_tipo, parts: typeof x.participacoes === "number" ? x.participacoes : null,
        nome: (en ? m.nome_en : m.nome) || m.nome || x.titulo, estado: o.open$(x) ? "aberta" : "analise", muns: x.municipios || [],
        acTxt: ac ? (en ? ac.texto_en || ac.texto : ac.texto) : "", pts, bx: pts.length ? pts.reduce((s, q) => s + q[0], 0) / pts.length : null, by: pts.length ? pts.reduce((s, q) => s + q[1], 0) / pts.length : null,
      };
    });
    const onMap = all.filter((p) => p.bx !== null);
    const nMun = new Set(onMap.flatMap((p) => p.muns.map(norm))).size;

    const S = { color: "tipo", size: "mw", estado: "todas", key: null };
    const keyOf = (p) => (S.color === "tipo" ? p.cat : S.color === "areas" ? p.ac : p.estado);
    const dict = () => (S.color === "tipo" ? CATS : S.color === "areas" ? AC : ESTADO);
    const colorOf = (p) => dict()[keyOf(p)].c;
    const valOf = (p, s = S.size) => (s === "mw" ? p.mw : s === "ha" ? p.ha : s === "part" ? p.parts : null);
    const inState = (p) => S.estado === "todas" || p.estado === S.estado;
    const visible = (p) => inState(p) && (!S.key || keyOf(p) === S.key);

    let terr = null, tipId = null, pinned = null;

    function radii() {
      const s = S.size, vs = onMap.map((p) => valOf(p, s)).filter((v) => v != null), max = Math.max(...vs, 1);
      const r = (v) => (s === "igual" ? 3.4 : v == null ? null : RMIN + (RMAX - RMIN) * (s === "part" ? Math.log10(1 + v) / Math.log10(1 + max) : Math.sqrt(v / max)));
      return { r, max };
    }

    // Afasta ligeiramente os círculos que se sobrepõem (a posição é indicativa de qualquer modo).
    function place(rf) {
      const q = onMap.map((p) => ({ p, x: p.bx, y: p.by, r: rf(valOf(p)) ?? 2.1 }));
      for (let it = 0; it < 60; it++) {
        for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) {
          const a = q[i], b = q[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, want = (a.r + b.r) * 0.62;
          if (d < want) {
            const f = (want - d) / 2 / d;
            a.x -= dx * f; a.y -= dy * f; b.x += dx * f; b.y += dy * f;
          }
        }
        q.forEach((a) => {
          const dx = a.x - a.p.bx, dy = a.y - a.p.by, d = Math.hypot(dx, dy);
          if (d > 7) { a.x = a.p.bx + dx / d * 7; a.y = a.p.by + dy / d * 7; }
        });
      }
      return q;
    }

    function tipHtml(p) {
      const rows = [];
      if (p.mw != null) rows.push([tr("Potência", "Capacity"), `${nf(p.mw, 1)} MW`]);
      if (p.ha != null) rows.push([tr("Área", "Area"), `${nf(p.ha, 1)} ha <em>${esc(HA[p.haTipo]?.[en ? 1 : 0] || "")}</em>`]);
      if (p.parts != null) rows.push([tr("Participações", "Responses"), nf(p.parts)]);
      rows.push([tr("Áreas classificadas", "Protected areas"), `<i style="background:${AC[p.ac].c}"></i>${esc(L(AC[p.ac]))}`]);
      const when = p.estado === "aberta" ? `${tr("Aberta até", "Open until")} ${fmtDate(p.x.fim)}` : tr("Em análise", "Under review");
      return `<small style="color:${CATS[p.cat].c}">${esc(L(CATS[p.cat]))} · ${when}</small><b>${esc(p.nome)}</b><dl>${rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl>${p.acTxt ? `<p>${esc(p.acTxt)}</p>` : ""}<span class="cm-go">${tr("Clica para ver a ficha ↓", "Click for the full card ↓")}</span>`;
    }

    function draw() {
      const { r, max } = radii(), q = place(r), W = GEO.largura, H = GEO.altura, pad = 2;
      const path = "M" + GEO.contorno.map((c) => c.join(",")).join("L") + "Z";
      const counts = {};
      all.filter(inState).forEach((p) => { counts[keyOf(p)] = (counts[keyOf(p)] || 0) + 1; });
      const keys = Object.keys(dict()).filter((k) => counts[k] || S.key === k);
      const shown = all.filter(visible);
      // círculos maiores primeiro, para os pequenos ficarem por cima
      const bubbles = q.slice().sort((a, b) => b.r - a.r).map(({ p, x, y }) => {
        const rr = r(valOf(p)), has = rr != null, c = colorOf(p), on = visible(p);
        return `<g class="cm-b${on ? "" : " is-dim"}" data-id="${esc(p.id)}" tabindex="${on ? 0 : -1}" role="button" aria-label="${esc(p.nome)}"><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(has ? rr : 2.1).toFixed(2)}" fill="${has ? c : "#fff"}" fill-opacity="${has ? 0.8 : 0.7}" stroke="${has ? "#fff" : c}" stroke-width="${has ? 0.7 : 0.9}"${has ? "" : ` stroke-dasharray="1.3 1"`}/></g>`;
      }).join("");
      const me = terr ? `<g class="ct-eu"><circle cx="${terr.x}" cy="${terr.y - 2.5}" r="3.4" fill="transparent"/><path d="M${terr.x} ${terr.y}c-1.3-1.8-2.4-3.2-2.4-4.5a2.4 2.4 0 1 1 4.8 0c0 1.3-1.1 2.7-2.4 4.5z" fill="#1d4d38" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/><circle cx="${terr.x}" cy="${terr.y - 4.5}" r=".85" fill="#fff"/></g>` : "";
      const svg = `<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${tr("Mapa das consultas em Portugal continental", "Map of consultations in mainland Portugal")}"><path d="${path}" fill="#eef1e8" stroke="#c9d1bd" stroke-width=".9" stroke-linejoin="round"/>${bubbles}${me}</svg>`;

      // lista dos maiores, na métrica escolhida
      const sizeKey = S.size === "igual" ? "part" : S.size, top = shown.filter((p) => valOf(p, sizeKey) != null && p.bx !== null).sort((a, b) => valOf(b, sizeKey) - valOf(a, sizeKey)).slice(0, 6), tmax = Math.max(...top.map((p) => valOf(p, sizeKey)), 1);
      const unit = SIZES[sizeKey].unit ? ` ${SIZES[sizeKey].unit}` : "";
      const list = top.map((p) => `<div class="zb cm-row" data-id="${esc(p.id)}"><span class="zb-l">${esc(p.nome)}</span><span class="zb-t"><i style="width:${valOf(p, sizeKey) / tmax * 100}%;background:${colorOf(p)}"></i></span><span class="zb-v">${nf(valOf(p, sizeKey), sizeKey === "ha" ? 1 : sizeKey === "mw" ? 1 : 0)}<em>${unit.trim()}</em></span></div>`).join("");

      const seg = (grp, dict2, cur) => Object.entries(dict2).map(([k, v]) => `<button type="button" class="cm-seg-b" data-${grp}="${k}" aria-pressed="${k === cur}">${esc(L(v))}</button>`).join("");
      const sizeSamples = (() => {
        if (S.size === "igual") return "";
        const nice = (v) => { const e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e; return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * e; };
        const vs = [nice(max / 12), nice(max / 3.2), nice(max)].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
        return `<div class="cm-size"><span>${tr("Área do círculo proporcional a", "Circle area proportional to")} <b>${esc(L(SIZES[S.size]).toLowerCase())}${SIZES[S.size].unit ? ` (${SIZES[S.size].unit})` : ""}</b>${S.size === "part" ? ` · ${tr("escala logarítmica", "log scale")}` : ""}</span><svg class="cm-size-svg" data-vs="${vs.join(",")}" aria-hidden="true"></svg><span class="cm-size-n">${vs.map((v) => nf(v)).join(" · ")}</span></div>`;
      })();
      const semDado = S.size !== "igual" ? onMap.filter((p) => valOf(p) == null).length : 0;
      const keysHtml = keys.map((k) => `<button type="button" class="cm-key${S.key === k ? " is-on" : ""}" data-key="${k}" style="--c:${dict()[k].c}" aria-pressed="${S.key === k}"><i></i>${esc(L(dict()[k]))} <b>${counts[k] || 0}</b></button>`).join("");

      box.innerHTML = `<div class="ct-map cm-map">${svg}<div class="cm-tip" hidden></div></div>
<div class="ct-leg cm-leg"><div class="cm-keys" role="group" aria-label="${tr("Legenda: clica para isolar", "Key: click to isolate")}">${keysHtml}</div><div class="cm-extra">${sizeSamples}${semDado ? `<span class="cm-nd"><i></i>${tr(`Círculo tracejado: sem este dado (${semDado})`, `Dashed circle: no such figure (${semDado})`)}</span>` : ""}${terr ? `<span class="ct-leg-eu"><svg viewBox="0 0 10 13" width="9" height="12" aria-hidden="true"><path d="M5 13C3 10.5 1 8.5 1 5.5a4 4 0 0 1 8 0c0 3-2 5-4 7.5z" fill="#1d4d38"/><circle cx="5" cy="5.4" r="1.5" fill="#fff"/></svg>${esc(tr("O teu território", "Your territory"))}: ${esc(terr.nome)}</span>` : ""}</div></div>
<div class="ct-side"><div class="ct-head"><small>${tr("Onde estão", "Where they are")}</small><h3>${tr(`${o.items.length} consultas abertas ou em análise sobre renováveis e outros temas do território`, `${o.items.length} open or under-review consultations on renewables and other land-use topics`)}</h3><p class="cm-sub">${tr(`${onMap.length} no mapa, em ${nMun} concelhos`, `${onMap.length} on the map, in ${nMun} municipalities`)}</p></div>
<div class="cm-ctls"><div class="cm-ctl"><span class="cm-ctl-l">${tr("Colorir por", "Colour by")}</span><div class="cm-seg" role="group" aria-label="${tr("Colorir por", "Colour by")}">${seg("color", MODES, S.color)}</div></div><div class="cm-ctl"><span class="cm-ctl-l">${tr("Tamanho por", "Size by")}</span><div class="cm-seg" role="group" aria-label="${tr("Tamanho por", "Size by")}">${seg("size", SIZES, S.size)}</div></div></div>
<div class="ct-list"><h4>${esc(en ? SIZES[sizeKey].list[1] : SIZES[sizeKey].list[0])}</h4>${list || `<p class="zc-unit">${tr("Sem dados para esta escolha.", "No data for this choice.")}</p>`}<details class="cm-note"><summary>${tr("Como ler este mapa e o que não mostra", "How to read this map and what it leaves out")}</summary><p class="zc-unit">${tr("Cada círculo fica no centro dos concelhos do projeto (posição indicativa; afastados um pouco quando se sobrepõem). Potência, área e relação com áreas classificadas são as que o promotor indica nos documentos da consulta; áreas de estudo são maiores do que a ocupação final e não se comparam com concessões ou implantações. Não é uma avaliação de impacte. Ficam de fora do mapa as consultas nacionais, as de Espanha e as sem concelho indicado.", "Each circle sits at the centre of the project's municipalities (indicative; nudged apart when they overlap). Capacity, area and the relation to protected areas are what the developer states in the consultation documents; study areas are larger than the final footprint and are not comparable with concessions or footprints. This is not an impact assessment. National and Spanish consultations, and those with no municipality stated, are left out of the map.")}</p></details></div>
<div class="c-chips" role="group" aria-label="${tr("Filtrar pelo estado da consulta", "Filter by consultation status")}">${[["todas", tr("Todas", "All"), all.length], ["aberta", tr("Abertas", "Open"), all.filter((p) => p.estado === "aberta").length], ["analise", tr("Em análise", "Under review"), all.filter((p) => p.estado === "analise").length]].map(([k, l, n]) => `<button type="button" class="c-chip${S.estado === k ? " is-on" : ""}" data-f="${k === "aberta" ? "open" : k === "analise" ? "analysis" : "all"}" data-e="${k}">${l} <b>${n}</b></button>`).join("")}</div></div>`;
      wire();
      sizeLegend();
      o.onFilter(new Set(all.filter(visible).map((p) => p.id)), S.estado !== "todas" || !!S.key);
    }

    function sizeLegend() {
      const sv = box.querySelector(".cm-size-svg"), map = box.querySelector(".cm-map svg");
      if (!sv || !map) return;
      const { r } = radii(), vs = sv.dataset.vs.split(",").map(Number), vb = map.viewBox.baseVal, k = (map.getBoundingClientRect().width || vb.width) / vb.width;
      const rs = vs.map((v) => (r(v) ?? 2) * k), h = Math.max(...rs) * 2 + 2, w = rs.reduce((s, x) => s + x * 2 + 5, 0) + 2;
      sv.setAttribute("viewBox", `0 0 ${w} ${h}`); sv.setAttribute("width", w); sv.setAttribute("height", h);
      let x = 1;
      sv.innerHTML = rs.map((rr) => { const c = `<circle cx="${x + rr}" cy="${h / 2}" r="${rr}" fill="#8a8f86" fill-opacity=".22" stroke="#6b726c" stroke-width="1"/>`; x += rr * 2 + 5; return c; }).join("");
    }

    function showTip(id, fromEl) {
      const p = all.find((a) => a.id === id), tip = box.querySelector(".cm-tip"), wrap = box.querySelector(".cm-map");
      if (!p || !tip || !wrap) return;
      tip.innerHTML = tipHtml(p); tip.hidden = false; tipId = id;
      const c = box.querySelector(`.cm-b[data-id="${CSS.escape(id)}"] circle`), wr = wrap.getBoundingClientRect(), cr = (c || fromEl).getBoundingClientRect();
      const tw = Math.min(250, wr.width - 8), cx = cr.left - wr.left + cr.width / 2, left = Math.max(4, Math.min(wr.width - tw - 4, cx - tw / 2));
      tip.style.width = tw + "px"; tip.style.left = left + "px";
      const below = cr.top - wr.top < wr.height * 0.45;
      tip.style.top = below ? Math.min(wr.height - 8, cr.bottom - wr.top + 8) + "px" : "auto";
      tip.style.bottom = below ? "auto" : Math.max(0, wr.bottom - cr.top + 8) + "px";
    }
    function hideTip() { const t = box.querySelector(".cm-tip"); if (t) t.hidden = true; tipId = null; }
    function hl(id, on) {
      box.querySelectorAll(`.cm-b[data-id="${CSS.escape(id)}"]`).forEach((g) => g.classList.toggle("is-hl", on));
      box.querySelectorAll(`.cm-row[data-id="${CSS.escape(id)}"]`).forEach((g) => g.classList.toggle("is-hl", on));
      if (on) showTip(id, box.querySelector(`.cm-row[data-id="${CSS.escape(id)}"]`)); else if (pinned !== id) hideTip();
    }

    function wire() {
      const tipFor = (n) => n.dataset.id;
      box.querySelectorAll(".cm-b, .cm-row").forEach((n) => {
        n.addEventListener("pointerenter", () => hl(tipFor(n), true));
        n.addEventListener("pointerleave", () => { pinned = null; hl(tipFor(n), false); });
        n.addEventListener("focus", () => hl(tipFor(n), true));
        n.addEventListener("blur", () => hl(tipFor(n), false));
        n.addEventListener("keydown", (e) => { if (e.key === "Enter") o.onPick(tipFor(n)); });
        n.addEventListener("click", (e) => {
          // no toque, o primeiro gesto mostra a ficha curta e o segundo vai ao cartão
          if (n.classList.contains("cm-b") && matchMedia("(hover: none)").matches && tipId !== tipFor(n)) { pinned = tipFor(n); hl(tipFor(n), true); return; }
          o.onPick(tipFor(n));
        });
      });
      box.querySelectorAll("[data-color]").forEach((b) => b.addEventListener("click", () => { S.color = b.dataset.color; S.key = null; draw(); }));
      box.querySelectorAll("[data-size]").forEach((b) => b.addEventListener("click", () => { S.size = b.dataset.size; draw(); }));
      box.querySelectorAll(".cm-key").forEach((b) => b.addEventListener("click", () => { S.key = S.key === b.dataset.key ? null : b.dataset.key; draw(); }));
      box.querySelectorAll("[data-e]").forEach((b) => b.addEventListener("click", () => { S.estado = b.dataset.e; if (S.color === "estado") S.key = null; draw(); }));
      const eu = box.querySelector(".ct-eu"), svgMap = box.querySelector(".cm-map svg");
      if (eu && terr && svgMap) {
        let t = null;
        eu.addEventListener("pointerenter", () => {
          const vb = svgMap.viewBox.baseVal, k = vb.width / (svgMap.getBoundingClientRect().width || vb.width), left = terr.x > vb.x + vb.width * 0.55;
          t = document.createElementNS(NS, "text");
          t.setAttribute("class", "ct-lab"); t.setAttribute("x", terr.x + (left ? -3.6 : 3.6)); t.setAttribute("y", terr.y - 3.2 + 4 * k * 0.6);
          t.setAttribute("text-anchor", left ? "end" : "start"); t.setAttribute("font-size", 11 * k); t.setAttribute("stroke-width", 3 * k); t.textContent = terr.nome;
          svgMap.appendChild(t);
        });
        eu.addEventListener("pointerleave", () => { if (t) { t.remove(); t = null; } });
      }
    }

    // O teu território: marca a localidade escolhida na barra lateral, com o mesmo símbolo de localização.
    draw();
    Promise.resolve(o.region).then((r) => {
      if (!r || typeof r.lat !== "number" || typeof r.lon !== "number") return;
      if (r.lat < 36.9 || r.lat > 42.2 || r.lon < -9.6 || r.lon > -6.1) return; // só o continente cabe neste mapa
      terr = { x: 30.60722652 * r.lon + 290.14813131, y: -39.70622747 * r.lat + 1673.11751331, nome: r.titulo || r.concelho || "" };
      draw();
    }).catch(() => {});
    if (window.ResizeObserver) new ResizeObserver(() => sizeLegend()).observe(box);
  }

  window.BioCulturaConsultasMapa = { render, catOf };
})();
