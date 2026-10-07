/* Gráficos dos relatórios de dados (barras, barras divergentes, linhas, mini-gráficos, tabelas).
   Sem bibliotecas: HTML e SVG. Usado pelo Observatório da Terra; o relatório de produção agrícola tem
   a sua cópia embutida. Estilos em assets/css/components/relatorio-dados.css (tudo dentro de .agri-report). */
(function () {
  "use strict";
  const EN = !!window.BioCultureI18n?.isEnglish || (document.documentElement.lang || "").startsWith("en");
  const tr = (pt, en) => (EN ? en : pt);
  const nf = (d = 0) => new Intl.NumberFormat(EN ? "en-GB" : "pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? "–" : nf(d).format(v));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const SER = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"];
  const root = () => document.querySelector(".agri-report") || document.documentElement;
  const css = (v) => getComputedStyle(root()).getPropertyValue(v).trim();

  /* dica flutuante */
  let tip = document.getElementById("agri-tip");
  if (!tip) { tip = document.createElement("div"); tip.id = "agri-tip"; tip.hidden = true; document.body.appendChild(tip); }
  function showTip(e, html) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
  }
  const hideTip = () => { tip.hidden = true; };

  /* tabela por baixo do gráfico, para quem não vê ou não quer o desenho */
  function tableView(el, head, rows) {
    let d = el.parentElement.querySelector(":scope > details.tbl[data-for='" + el.id + "']");
    if (!d) { d = document.createElement("details"); d.className = "tbl"; d.dataset.for = el.id; el.after(d); }
    d.innerHTML = "<summary>" + tr("Ver tabela de dados", "Show data table") + "</summary><div class=\"tscroll\"><table><thead><tr>" + head.map((h) => `<th>${h}</th>`).join("") +
      "</tr></thead><tbody>" + rows.map((r) => "<tr>" + r.map((c) => `<td>${c}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
  }

  /* barras horizontais: rows = [{l, v, c?, hl?, dim?, tip?, t?}] */
  function hbars(el, rows, o = {}) {
    const max = o.max || Math.max(...rows.map((r) => r.v || 0), 1e-9);
    const f = o.f || ((v) => fmt(v, 1));
    el.className = "chart hbars";
    el.innerHTML = rows.map((r, i) => `<div class="hb${r.hl ? " pt" : ""}${r.dim ? " dim" : ""}" data-i="${i}"><span class="l" title="${esc(r.l)}">${esc(r.l)}</span><span class="tr">${o.ref != null ? `<span class="mref" style="left:${Math.min(100, o.ref / max * 100)}%"></span>` : ""}<span class="b" style="width:${Math.min(100, (r.v || 0) / max * 100)}%${r.c ? `;background:${r.c}` : ""}"></span></span><span class="v">${r.t || f(r.v)}</span></div>`).join("");
    el.querySelectorAll(".hb").forEach((n) => {
      const r = rows[+n.dataset.i];
      n.addEventListener("mousemove", (e) => showTip(e, `<div class="h">${esc(r.l)}</div>` + (r.tip || `<div class="r"><span>${o.unit || ""}</span><b>${r.t || f(r.v)}</b></div>`)));
      n.addEventListener("mouseleave", hideTip);
    });
    if (o.table) tableView(el, o.table, rows.map((r) => [esc(r.tl || r.l), r.t || f(r.v)]));
  }

  const niceTicks = (a, b, n) => {
    const span = b - a || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    const st = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, lo = Math.floor(a / st) * st, hi = Math.ceil(b / st) * st, t = [];
    for (let v = lo; v <= hi + st / 2; v += st) t.push(+v.toFixed(10));
    return t;
  };
  const lastI = (se) => { for (let i = se.v.length - 1; i >= 0; i--) if (se.v[i] != null) return i; return -1; };
  const ro = new ResizeObserver((es) => es.forEach((e) => { const el = e.target, w = el.clientWidth; if (el._w !== w) { el._w = w; el._draw && el._draw(); } }));

  /* linhas SVG, um eixo y: cfg = {x:[anos], series:[{n, c, v:[...], dash?}], zero?, ref?, yf?, tf?, unit?, endLabels?, h?, aria?, table?, tableEvery?} */
  function line(el, cfg) {
    const draw = () => {
      const W = Math.max(300, el.clientWidth), H = cfg.h || Math.round(Math.min(360, Math.max(240, W * 0.42)));
      const narrow = cfg.endLabels && W < 560; // em ecrãs estreitos os nomes das séries passam para uma legenda por cima
      const padR = cfg.endLabels && !narrow ? Math.min(150, W * 0.26) : 14, M = { t: 12, r: padR, b: 26, l: 48 };
      const xs = cfg.x, x0 = xs[0], x1 = xs[xs.length - 1];
      const all = cfg.series.flatMap((s) => s.v.filter((v) => v != null));
      let yMax = Math.max(...all), yMin = cfg.zero === false ? Math.min(...all) : Math.min(0, ...all);
      if (cfg.ymax != null) yMax = Math.max(yMax, cfg.ymax);
      const ticks = niceTicks(yMin, yMax, 5); yMin = ticks[0]; yMax = ticks[ticks.length - 1];
      const X = (v) => M.l + (v - x0) / (x1 - x0 || 1) * (W - M.l - M.r), Y = (v) => M.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - M.t - M.b);
      let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.aria || "")}"><g class="ax">`;
      ticks.forEach((t) => { s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(t)}" y2="${Y(t)}" ${t === yMin ? "class=\"base\"" : ""}/><text x="${M.l - 8}" y="${Y(t) + 4}" text-anchor="end">${cfg.yf ? cfg.yf(t) : fmt(t)}</text>`; });
      const step = (x1 - x0) > 40 ? 10 : (x1 - x0) > 15 ? 5 : 2;
      for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) s += `<text x="${X(y)}" y="${H - 6}" text-anchor="middle">${y}</text>`;
      s += "</g>";
      if (cfg.ref != null) s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(cfg.ref)}" y2="${Y(cfg.ref)}" stroke="${css("--muted")}" stroke-dasharray="3 3"/>` + (cfg.refLabel ? `<text class="lbl" x="${W - M.r - 4}" y="${Y(cfg.ref) - 5}" text-anchor="end">${esc(cfg.refLabel)}</text>` : "");
      const ends = [];
      cfg.series.forEach((se) => {
        let d = "", pen = false;
        se.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(xs[i]).toFixed(1) + "," + Y(v).toFixed(1); pen = true; });
        s += `<path d="${d}" fill="none" stroke="${se.c}" stroke-width="${se.w || 2}" ${se.dash ? "stroke-dasharray=\"5 4\"" : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
        se.v.forEach((v, i) => { if (v != null && cfg.points) s += `<circle cx="${X(xs[i])}" cy="${Y(v)}" r="3" fill="${se.c}"/>`; });
        const li = lastI(se);
        if (li >= 0) { s += `<circle cx="${X(xs[li])}" cy="${Y(se.v[li])}" r="3.5" fill="${se.c}" stroke="${css("--surface")}" stroke-width="2"/>`; ends.push({ y: Y(se.v[li]), n: se.n, c: se.c }); }
      });
      if (cfg.endLabels && !narrow) {
        ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
        ends.forEach((e) => { s += `<text class="lbl" x="${W - M.r + 8}" y="${e.y + 4}">${esc(e.n)}</text>`; });
      }
      s += `<line class="xh" x1="0" x2="0" y1="${M.t}" y2="${H - M.b}" stroke="${css("--muted")}" stroke-width="1" visibility="hidden"/><g class="dots"></g><rect x="${M.l}" y="0" width="${W - M.l - M.r}" height="${H}" fill="transparent"/></svg>`;
      el.innerHTML = (narrow ? `<div class="legend" style="margin-bottom:6px">${cfg.series.map((se) => `<span class="ln"><i style="background:${se.c}"></i>${esc(se.n)}</span>`).join("")}</div>` : "") + s;
      const svg = el.querySelector("svg"), xh = svg.querySelector(".xh"), dots = svg.querySelector(".dots");
      svg.querySelector("rect").addEventListener("mousemove", (e) => {
        const b = svg.getBoundingClientRect(), px = (e.clientX - b.left) / b.width * W;
        let best = 0, bd = 1e9; xs.forEach((x, i) => { const d = Math.abs(X(x) - px); if (d < bd) { bd = d; best = i; } });
        const i = best;
        xh.setAttribute("x1", X(xs[i])); xh.setAttribute("x2", X(xs[i])); xh.setAttribute("visibility", "visible");
        dots.innerHTML = cfg.series.map((se) => se.v[i] == null ? "" : `<circle cx="${X(xs[i])}" cy="${Y(se.v[i])}" r="4" fill="${se.c}" stroke="${css("--surface")}" stroke-width="2"/>`).join("");
        showTip(e, `<div class="h">${xs[i]}</div>` + cfg.series.filter((se) => se.v[i] != null).sort((a, b) => b.v[i] - a.v[i]).map((se) => `<div class="r"><span><i style="background:${se.c}"></i>${esc(se.n)}</span><b>${cfg.tf ? cfg.tf(se, i) : fmt(se.v[i], 1)}${cfg.unit ? " " + cfg.unit : ""}</b></div>`).join(""));
      });
      svg.querySelector("rect").addEventListener("mouseleave", () => { xh.setAttribute("visibility", "hidden"); dots.innerHTML = ""; hideTip(); });
    };
    el._draw = draw; draw(); ro.observe(el);
    if (cfg.table) {
      const idx = cfg.x.map((_, i) => i).filter((i) => (cfg.tableEvery ? (cfg.x[i] % cfg.tableEvery === 0 || i === cfg.x.length - 1) : true) && cfg.series.some((s) => s.v[i] != null));
      tableView(el, [tr("Ano", "Year"), ...cfg.series.map((s) => esc(s.n))], idx.map((i) => [cfg.x[i], ...cfg.series.map((s) => (cfg.tf ? (s.v[i] == null ? "–" : cfg.tf(s, i)) : fmt(s.v[i], 1)))]));
    }
  }

  const legend = (el, items) => { el.className = "legend"; el.innerHTML = items.map((i) => `<span class="ln"><i style="background:${i.c}"></i>${esc(i.n)}</span>`).join(""); };
  const seg = (el, onChange) => el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); onChange(b.dataset.v); }));

  /* mini-gráfico das conclusões: rows = [{l, v, t, hl?, c?}] */
  const miniBars = (rows, o = {}) => {
    const max = o.max || Math.max(...rows.map((r) => Math.abs(r.v)), 1e-9);
    return `<div class="mini">${rows.map((r, i) => `<div class="mr${r.hl ? " hl" : ""}"><span class="ml">${esc(r.l)}</span><span class="mt">${o.ref != null ? `<span class="mref" style="left:${o.ref / max * 100}%"></span>` : ""}<span class="mb" style="width:${Math.min(100, Math.abs(r.v) / max * 100)}%;background:${r.c || css(SER[i % SER.length])}"></span></span><span class="mv">${r.t}</span></div>`).join("")}</div>`;
  };
  const miniStack = (parts) => `<div class="mini"><div class="mstack">${parts.map((p) => `<span style="width:${p.v}%;background:${p.c}" title="${esc(p.l)}: ${fmt(p.v)}%"></span>`).join("")}</div><div class="mlegend">${parts.map((p) => `<span><i style="background:${p.c}"></i>${esc(p.l)} ${fmt(p.v)}%</span>`).join("")}</div></div>`;

  window.BioCulturaGraficos = { EN, tr, nf, fmt, esc, css, SER, hbars, line, legend, seg, miniBars, miniStack, tableView, showTip, hideTip };
})();
