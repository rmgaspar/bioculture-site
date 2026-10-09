/* A teia (bioWeb): clima, vida selvagem, espécies invasoras, pesticidas e produção agrícola ao longo do tempo.
   Dados: /data/bioweb.json (scripts/dados/bioweb.py), /data/agriculture-global.json (FAOSTAT) e as listas de lista vermelha
   de /data/observatorio-terra-relatorio.json. Todos os números do texto são lidos dos dados ou calculados a partir deles
   (médias, variações e tendências ficam identificadas como cálculo do bioCulture). Gráficos: assets/js/biocultura-graficos.js. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos, T = window.BioCulturaTerra;
  const box = document.getElementById("relatorio-bioweb");
  if (!G || !T || !box) return;
  const { EN, tr, fmt, esc, css, hbars, line, legend, miniBars, tableView } = G;
  const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });

  fetch("/sidebar-content.html?v=24").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  /* A barra fixa lê os destinos ao carregar; como os capítulos nascem aqui, só a ligamos depois de existirem. */
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=10"; document.body.appendChild(el); };
  const traduzirNav = () => {
    if (!EN) return;
    const M = { sumario: "Summary", clima: "Climate", vida: "Wildlife", invasoras: "Invasive species", pesticidas: "Pesticides", producao: "Production", teia: "The web", fontes: "Sources" };
    document.querySelectorAll('.reading-nav a[href^="#"]').forEach((a) => { const k = a.getAttribute("href").slice(1); if (M[k]) a.textContent = M[k] + " ↓"; });
    const o = document.querySelector('.reading-nav a[href="/observatorio/observatorio-terra.html"]'); if (o) o.textContent = "Earth Observatory →";
    const lead = document.querySelector(".hero-lead"), nota = document.querySelector(".hero-guide p");
    if (lead) lead.textContent = "Climate, wildlife, invasive species, pesticides and farm output, measured over time and read side by side: what the data confirm, what they contradict and what we do not yet know.";
    if (nota) nota.textContent = "Series side by side show what happens in parallel, not causes. The links between them come from the scientific literature, cited in each chapter, and every series states its scope: world, European Union or Portugal.";
    const cl = document.querySelector(".category-label"); if (cl) cl.textContent = "Observatory · bioWeb";
    const h1 = document.getElementById("page-title"); if (h1) h1.textContent = "The web";
    document.title = "The web — bioCulture";
  };
  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  Promise.all([T.load(), get("/data/bioweb.json?v=2"), get("/data/agriculture-global.json")])
    .then(([{ R, CLIMA, VET }, B, A]) => { construir(T.create(R, CLIMA, VET), B, A); traduzirNav(); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); traduzirNav(); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados da teia.", "The web data could not be loaded.")}</p>`; });

  /* ---------- pequenas contas (identificadas como cálculo do bioCulture) ---------- */
  const lastI = (v) => { for (let i = v.length - 1; i >= 0; i--) if (v[i] != null) return i; return -1; };
  const anos = (a, v) => v.map((_, i) => a + i);
  const media = (a, v, y0, y1) => { const s = []; for (let y = y0; y <= y1; y++) { const x = v[y - a]; if (x != null) s.push(x); } return s.length ? s.reduce((p, q) => p + q, 0) / s.length : null; };
  const declive = (a, v, y0, y1) => { const px = [], py = []; for (let y = y0; y <= y1; y++) { const x = v[y - a]; if (x != null) { px.push(y); py.push(x); } } const n = px.length, mx = px.reduce((p, q) => p + q, 0) / n, my = py.reduce((p, q) => p + q, 0) / n; return px.reduce((s, x, i) => s + (x - mx) * (py[i] - my), 0) / px.reduce((s, x) => s + (x - mx) ** 2, 0); };
  const movel = (v, k) => v.map((_, i) => (i + 1 >= k && v.slice(i + 1 - k, i + 1).every((x) => x != null) ? v.slice(i + 1 - k, i + 1).reduce((p, q) => p + q, 0) / k : null));
  const idx100 = (v, base = 0) => v.map((x) => (x == null ? null : x / v[base] * 100));
  const pct = (a, b) => (b / a - 1) * 100;
  const sinal = (x, d = 0) => (x > 0 ? "+" : x < 0 ? "−" : "") + fmt(Math.abs(x), d);
  const COR = { clima: "#b4472f", vida: "#7a5aa6", invasoras: "#8f3b3b", pesticidas: "#b87a0c", producao: "#6b7a24", teia: "#2f6147", fontes: "#626f67" };

  function construir(t, B, A) {
    const css1 = (n) => css(n);
    /* ----- números de base ----- */
    const C = B.clima, tempMedia = (y0, y1) => media(C.a, C.v, y0, y1);
    const m6190 = tempMedia(1961, 1990), m9120 = tempMedia(1991, 2020), m1322 = tempMedia(2013, 2022), m1900 = tempMedia(1901, 1930);
    const dec = declive(C.a, C.v, 1990, C.a + C.v.length - 1) * 10, anoC1 = C.a + C.v.length - 1;
    const AV = B.aves, avA = AV.agricolas, avF = AV.florestais, avT = AV.todas;
    const avLast = (s) => { const i = lastI(s.v); return { y: s.a + i, v: s.v[i] }; };
    const aA = avLast(avA), aF = avLast(avF), aT = avLast(avT);
    const IV = B.invasoras, IG = IV.por_grupo, D = IV.decadas;
    const totDec = D.map((_, i) => Object.values(IG).reduce((s, g) => s + g[i], 0));
    const iD = (d) => D.indexOf(d);
    const somaDe = (d0, d1) => totDec.slice(iD(d0), iD(d1) + 1).reduce((p, q) => p + q, 0);
    const desde1990 = somaDe(1990, 2020), medAntes = somaDe(1960, 1980) / 3, medDepois = somaDe(1990, 2000) / 2; /* décadas de 1960 a 1980 e de 1990 a 2000 */
    const P = B.pesticidas, PW = P.mundo, PP = P.portugal, PE = P.portugal_eurostat, HR = PE.risco, VE = PE.vendas;
    const pa = PW.a, pLast = lastI(PW.total), pYear = pa + pLast;
    const ptPeak = PP.total.reduce((m, v, i) => (v != null && v > m.v ? { v, y: PP.a + i } : m), { v: 0, y: 0 });
    const hrLast = lastI(HR.hri1), hrY = HR.a + hrLast;
    const shInorg = VE.fungicidas_inorganicos[lastI(VE.total)] / VE.total[lastI(VE.total)] * 100;
    const cer = A.cereals, i90 = cer.years.indexOf(1990), cLast = cer.years.length - 1;
    const rliW = t.ser("lista_vermelha", "WLD"), rliP = t.ser("lista_vermelha", "PRT");
    const rl = (s) => { const i = lastI(s.v); const j = s.v.findIndex((v) => v != null); return { y0: s.a + j, v0: s.v[j], y1: s.a + i, v1: s.v[i] }; };
    const rW = rl(rliW), rP = rl(rliP);
    const pr = (id) => A.pt_prod.series.find((s) => s.id === id);

    const sec = (id, ordem, eyebrow, titulo, corpo) => `<section id="${id}"><div class="sec-head"><span class="eyebrow">${ordem ? ordem + " · " : ""}${eyebrow}</span><h2>${titulo}</h2></div>${corpo}</section>`;
    const fig = (id, titulo, desc, src, extra = "") => `<figure><figcaption><span class="t">${titulo}</span><span class="d">${desc}</span></figcaption>${legendaHtml(id)}<div class="chart ${extra}" id="${id}"></div><span class="src">${tr("Fonte", "Source")}: ${src}</span></figure>`;
    const legendaHtml = (id) => `<div class="legend" id="lg-${id}"></div>`;
    const vermais = (links) => `<div class="vermais"><span>${tr("Ver também", "See also")}</span>${links.map(([a, h]) => `<a href="${h}">${a} →</a>`).join("")}</div>`;
    const prose = (...ps) => `<div class="prose">${ps.map((p) => `<p>${p}</p>`).join("")}</div>`;

    /* ---------- sumário ---------- */
    const tiles = [
      [sinal(dec, 2), "°C", tr("por década em Portugal, desde 1990", "per decade in Portugal, since 1990"), tr("média anual do território, " + C.a + "–" + anoC1, "annual territory mean, " + C.a + "–" + anoC1)],
      [sinal(pct(100, aA.v), 0) + "%", "", tr("aves agrícolas na União Europeia", "farmland birds in the European Union"), tr("1990–" + aA.y + " (sem série nacional)", "1990–" + aA.y + " (no national series)")],
      [fmt(desde1990 / IV.especies * 100, 0) + "%", "", tr("das espécies não nativas de Portugal continental tiveram o 1.º registo desde 1990", "of mainland Portugal’s non-native species had their first record since 1990"), tr(fmt(IV.especies, 0) + " espécies com ano de 1.º registo", fmt(IV.especies, 0) + " species with a first-record year")],
      ["×" + fmt(PW.total[pLast] / PW.total[0], 1), "", tr("pesticidas usados no mundo, em toneladas", "pesticides used worldwide, in tonnes"), "1990–" + pYear],
      [sinal(pct(100, HR.hri1[hrLast] / 100 * 100), 0) + "%", "", tr("risco dos pesticidas em Portugal (indicador harmonizado)", "pesticide risk in Portugal (harmonised indicator)"), tr("face à média 2011–2013, em " + hrY, "vs the 2011–2013 average, in " + hrY)]
    ];
    const HRIv = HR.hri1[hrLast];
    tiles[4][0] = sinal(HRIv - 100, 0) + "%";

    const F = [
      [tr(`<b>Portugal aqueceu: de ${fmt(m6190, 2)} °C (1961–1990) para ${fmt(m9120, 2)} °C (1991–2020) e ${fmt(m1322, 2)} °C (2013–2022).</b> Desde 1990 a tendência é de ${sinal(dec, 2)} °C por década.`, `<b>Portugal has warmed: from ${fmt(m6190, 2)} °C (1961–1990) to ${fmt(m9120, 2)} °C (1991–2020) and ${fmt(m1322, 2)} °C (2013–2022).</b> Since 1990 the trend is ${sinal(dec, 2)} °C per decade.`),
        miniBars([{ l: "1901–1930", v: m1900, t: fmt(m1900, 2) + " °C" }, { l: "1961–1990", v: m6190, t: fmt(m6190, 2) + " °C" }, { l: "1991–2020", v: m9120, t: fmt(m9120, 2) + " °C" }, { l: "2013–2022", v: m1322, t: fmt(m1322, 2) + " °C", hl: true }], { max: m1322 })],
      [tr(`<b>As aves comuns dos campos da União Europeia desceram ${fmt(Math.abs(pct(100, aA.v)), 0)}% desde 1990</b>; as das florestas ${fmt(Math.abs(pct(100, aF.v)), 0)}% e o conjunto ${fmt(Math.abs(pct(100, aT.v)), 0)}%. Não há série nacional nesta fonte.`, `<b>Common farmland birds in the European Union fell ${fmt(Math.abs(pct(100, aA.v)), 0)}% since 1990</b>; forest birds ${fmt(Math.abs(pct(100, aF.v)), 0)}% and all common species ${fmt(Math.abs(pct(100, aT.v)), 0)}%. This source has no national series.`),
        miniBars([{ l: tr("Aves agrícolas", "Farmland birds"), v: aA.v, t: fmt(aA.v, 0), c: css("--s8"), hl: true }, { l: tr("Todas as comuns", "All common"), v: aT.v, t: fmt(aT.v, 0), c: css("--s4") }, { l: tr("Aves florestais", "Forest birds"), v: aF.v, t: fmt(aF.v, 0), c: css("--s3") }, { l: "1990", v: 100, t: "100", c: css("--bar-dim") }], { max: 110 })],
      [tr(`<b>Os primeiros registos de espécies não nativas em Portugal continental aceleraram:</b> ${fmt(medAntes, 0)} por década entre 1960 e 1989, ${fmt(medDepois, 0)} por década entre 1990 e 2009. Parte do aumento é esforço de deteção e de publicação.`, `<b>First records of non-native species in mainland Portugal accelerated:</b> ${fmt(medAntes, 0)} per decade from 1960 to 1989, ${fmt(medDepois, 0)} per decade from 1990 to 2009. Part of the rise is detection and publication effort.`),
        miniBars([{ l: tr("1960–1989 (por década)", "1960–1989 (per decade)"), v: medAntes, t: fmt(medAntes, 0), c: css("--bar-dim") }, { l: tr("1990–2009 (por década)", "1990–2009 (per decade)"), v: medDepois, t: fmt(medDepois, 0), c: css("--s8"), hl: true }])],
      [tr(`<b>No mundo, o uso de pesticidas passou de ${fmt(PW.total[0] / 1e6, 2)} para ${fmt(PW.total[pLast] / 1e6, 2)} milhões de toneladas</b> (${pa}–${pYear}), e por hectare de ${fmt(PW.por_ha[0], 2)} para ${fmt(PW.por_ha[pLast], 2)} kg.`, `<b>Worldwide, pesticide use went from ${fmt(PW.total[0] / 1e6, 2)} to ${fmt(PW.total[pLast] / 1e6, 2)} million tonnes</b> (${pa}–${pYear}), and per hectare from ${fmt(PW.por_ha[0], 2)} to ${fmt(PW.por_ha[pLast], 2)} kg.`),
        miniBars([{ l: String(pa), v: PW.total[0] / 1e6, t: fmt(PW.total[0] / 1e6, 2) + " Mt", c: css("--bar-dim") }, { l: String(pYear), v: PW.total[pLast] / 1e6, t: fmt(PW.total[pLast] / 1e6, 2) + " Mt", c: css("--s4"), hl: true }])],
      [tr(`<b>Em Portugal os pesticidas não seguiram o mundo:</b> o uso subiu até ${ptPeak.y} (${fmt(ptPeak.v / 1000, 1)} mil t) e desceu para ${fmt(PP.total[lastI(PP.total)] / 1000, 1)} mil t em ${PP.a + lastI(PP.total)}; o indicador harmonizado de risco desceu ${fmt(Math.abs(HRIv - 100), 0)}% face a 2011–2013.`, `<b>In Portugal pesticides did not follow the world:</b> use rose until ${ptPeak.y} (${fmt(ptPeak.v / 1000, 1)} thousand t) and fell to ${fmt(PP.total[lastI(PP.total)] / 1000, 1)} thousand t in ${PP.a + lastI(PP.total)}; the harmonised risk indicator fell ${fmt(Math.abs(HRIv - 100), 0)}% against 2011–2013.`),
        miniBars([{ l: tr("Pico " + ptPeak.y, "Peak " + ptPeak.y), v: ptPeak.v / 1000, t: fmt(ptPeak.v / 1000, 1) + " kt", c: css("--s4") }, { l: String(PP.a + lastI(PP.total)), v: PP.total[lastI(PP.total)] / 1000, t: fmt(PP.total[lastI(PP.total)] / 1000, 1) + " kt", c: css("--s3"), hl: true }])],
      [tr(`<b>O rendimento mundial dos cereais passou de ${fmt(cer.yield_tha[i90], 2)} para ${fmt(cer.yield_tha[cLast], 2)} t/ha</b> (${cer.years[i90]}–${cer.years[cLast]}): mais produção por hectare, com mais pesticida por hectare. Que um provoque o outro não se vê nestes totais.`, `<b>World cereal yield went from ${fmt(cer.yield_tha[i90], 2)} to ${fmt(cer.yield_tha[cLast], 2)} t/ha</b> (${cer.years[i90]}–${cer.years[cLast]}): more output per hectare, with more pesticide per hectare. These totals cannot show that one causes the other.`),
        miniBars([{ l: tr("Rendimento dos cereais", "Cereal yield"), v: cer.yield_tha[cLast] / cer.yield_tha[i90] * 100, t: "×" + fmt(cer.yield_tha[cLast] / cer.yield_tha[i90], 1), c: css("--s4"), hl: true }, { l: tr("Pesticida por hectare", "Pesticide per hectare"), v: PW.por_ha[pLast] / PW.por_ha[0] * 100, t: "×" + fmt(PW.por_ha[pLast] / PW.por_ha[0], 1), c: css("--s8") }], { ref: 100, max: 350 })]
    ];

    const sumario = `<section id="sumario"><div class="tiles">${tiles.map((x) => `<div class="tile"><span class="v">${x[0]}${x[1] ? `<small>${x[1]}</small>` : ""}</span><span class="k">${x[2]}</span><span class="s">${x[3]}</span></div>`).join("")}</div>
      <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("Seis coisas que a teia mostra", "Six things the web shows")}</h2></div>
      <ol class="findings">${F.map((f, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><div class="ftxt">${f[0]}</div>${f[1]}</li>`).join("")}</ol></section>`;

    /* ---------- 1 · clima ---------- */
    const clima = sec("clima", "1", tr("Clima", "Climate"), tr("Portugal está mais quente, ano após ano", "Portugal is warmer, year after year"),
      prose(tr(`A temperatura média anual do território subiu de ${fmt(m1900, 2)} °C (média de 1901–1930) para ${fmt(m1322, 2)} °C (média de 2013–2022). Desde 1990 sobe ${sinal(dec, 2)} °C por década. É o ponto de partida da teia: o calor altera a duração das estações, a água disponível e a forma como pragas e invasoras se instalam.`, `Mean annual temperature of the territory rose from ${fmt(m1900, 2)} °C (1901–1930 average) to ${fmt(m1322, 2)} °C (2013–2022 average). Since 1990 it rises ${sinal(dec, 2)} °C per decade. It is the web’s starting point: heat changes season length, available water and how pests and invasive species settle.`)) +
      `<div class="grid2">${fig("cTemp", tr("Temperatura média anual de Portugal", "Mean annual temperature of Portugal"), tr(`°C, ${C.a}–${anoC1}. A linha grossa é a média móvel de 10 anos (cálculo do bioCulture).`, `°C, ${C.a}–${anoC1}. The thick line is the 10-year moving average (bioCulture calculation).`), esc(C.fonte))}
      <div class="kfacts" id="kClima"></div></div>` +
      vermais([[tr("Clima no Observatório da Terra", "Climate in the Earth Observatory"), "/observatorio/observatorio-terra.html#clima"], [tr("Depois de 1,5 °C", "After 1.5 °C"), "/observatorio/limitar-ultrapassagem-1-5.html"]]));

    /* ---------- 2 · vida ---------- */
    const vida = sec("vida", "2", tr("Vida selvagem", "Wildlife"), tr("Menos aves nos campos, risco de extinção a subir", "Fewer birds in the fields, extinction risk rising"),
      prose(tr(`A tua memória de flores, abelhas e pássaros que já não estão no mesmo sítio tem correspondência nos números que existem. Na União Europeia, as aves comuns dos campos desceram ${fmt(Math.abs(pct(100, aA.v)), 0)}% desde 1990; as das florestas, ${fmt(Math.abs(pct(100, aF.v)), 0)}%. O índice da Lista Vermelha mundial desceu de ${fmt(rW.v0, 3)} para ${fmt(rW.v1, 3)} (${rW.y0}–${rW.y1}); o de Portugal, de ${fmt(rP.v0, 3)} para ${fmt(rP.v1, 3)} (${rP.y0}–${rP.y1}).`, `Your memory of flowers, bees and birds that are no longer in the same place has a match in the numbers that exist. In the European Union, common farmland birds fell ${fmt(Math.abs(pct(100, aA.v)), 0)}% since 1990; forest birds, ${fmt(Math.abs(pct(100, aF.v)), 0)}%. The world Red List Index fell from ${fmt(rW.v0, 3)} to ${fmt(rW.v1, 3)} (${rW.y0}–${rW.y1}); Portugal’s, from ${fmt(rP.v0, 3)} to ${fmt(rP.v1, 3)} (${rP.y0}–${rP.y1}).`),
        tr(`<b>O que ainda não medimos:</b> não há nesta página uma série nacional de aves, de insetos ou de polinizadores. É a lacuna mais importante da teia (ver capítulo «A teia»).`, `<b>What we do not yet measure:</b> this page has no national series of birds, insects or pollinators. It is the most important gap in the web (see the chapter “The web”).`)) +
      `<div class="grid2">${fig("cAves", tr("Aves comuns na União Europeia", "Common birds in the European Union"), tr("Índice, 1990 = 100. Agregado dos 27 Estados-membros, estimativa suavizada.", "Index, 1990 = 100. Aggregate of the 27 member states, smoothed estimate."), esc(AV.fonte))}
      ${fig("cRli", tr("Índice da Lista Vermelha", "Red List Index"), tr("1 = nenhuma espécie ameaçada. Descer significa mais risco de extinção.", "1 = no species threatened. A decline means higher extinction risk."), esc(t.IND.lista_vermelha.fonte))}</div>` +
      vermais([[tr("Biodiversidade", "Biodiversity"), "/ecossistemas/biodiversidade.html"], [tr("Solo e vida no Observatório da Terra", "Land and life in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"]]));

    /* ---------- 3 · invasoras e pragas ---------- */
    const GRP = [["plantas", tr("Plantas vasculares", "Vascular plants"), css("--s6")], ["insetos", tr("Insetos", "Insects"), css("--s4")], ["aves", tr("Aves", "Birds"), css("--s1")], ["outros", tr("Outros (incl. aquáticos)", "Others (incl. aquatic)"), css("--s7")]];
    const maxDec = Math.max(...totDec);
    const stack = D.map((d, i) => `<div class="sk"><span class="y">${d}${d >= 2010 ? "*" : ""}</span><div class="barwrap"><div class="bars" style="flex:0 0 ${Math.max(totDec[i] / maxDec * 88, 2).toFixed(1)}%">${GRP.map(([k, n, c]) => (IG[k][i] ? `<span class="part" style="flex:${IG[k][i]} 0 0;background:${c}" title="${esc(n)}: ${IG[k][i]}">${IG[k][i] >= 8 ? IG[k][i] : ""}</span>` : "")).join("")}</div><span class="tot">${totDec[i]}</span></div></div>`).join("");
    const invasoras = sec("invasoras", "3", tr("Espécies invasoras e pragas", "Invasive species and pests"), tr("Cada vez mais espécies chegam, e mudam o que se cultiva", "More and more species arrive, and they change what is grown"),
      prose(tr(`Das ${fmt(IV.especies, 0)} espécies não nativas de Portugal continental com ano de primeiro registo, ${fmt(desde1990 / IV.especies * 100, 0)}% foram registadas desde 1990. Os registos de plantas, insetos e aves não nativas multiplicaram-se nas décadas de 1990 e 2000. Este número conta espécies que chegaram, não quanto dano fazem, e depende também de quanto se procura e se publica.`, `Of the ${fmt(IV.especies, 0)} non-native species of mainland Portugal with a first-record year, ${fmt(desde1990 / IV.especies * 100, 0)}% were recorded since 1990. Records of non-native plants, insects and birds multiplied in the 1990s and 2000s. This number counts species that arrived, not how much harm they do, and it also depends on how much is searched for and published.`),
        tr(`<b>E as pragas das culturas?</b> O bioCulture tem o inventário (<span id="nPragas">…</span> pragas e doenças, <span id="nFlora">…</span> plantas invasoras e <span id="nFauna">…</span> animais invasores, com fichas de identificação e prevenção), mas não uma série temporal de surtos. É a segunda lacuna da teia.`, `<b>And crop pests?</b> bioCulture has the inventory (<span id="nPragas">…</span> pests and diseases, <span id="nFlora">…</span> invasive plants and <span id="nFauna">…</span> invasive animals, with identification and prevention sheets), but not a time series of outbreaks. It is the web’s second gap.`)) +
      `<figure><figcaption><span class="t">${tr("Primeiros registos de espécies não nativas em Portugal continental", "First records of non-native species in mainland Portugal")}</span><span class="d">${tr("Espécies por década do primeiro registo. *A década de 2010 está incompleta pelo atraso na publicação e a de 2020 ainda não tem registos nesta fonte.", "Species by decade of first record. *The 2010s are incomplete because of publication lag and the 2020s have no records in this source yet.")}</span></figcaption><div class="legend" id="lg-cInv"></div><div class="chart stk" id="cInv">${stack}</div><span class="src">${tr("Fonte", "Source")}: <a href="${esc(IV.url)}" target="_blank" rel="noopener">${esc(IV.fonte)}</a> · ${esc(IV.ambito)}</span></figure>` +
      vermais([[tr("Catálogo de pragas e invasoras", "Pest and invasive species catalogue"), "/calendario/calendario.html#pragas-catalogo"], [tr("Biodiversidade", "Biodiversity"), "/ecossistemas/biodiversidade.html"]]));

    /* ---------- 4 · pesticidas ---------- */
    const pesticidas = sec("pesticidas", "4", tr("Pesticidas", "Pesticides"), tr("O mundo usa o dobro; Portugal usa menos do que em " + ptPeak.y, "The world uses double; Portugal uses less than in " + ptPeak.y),
      prose(tr(`Há duas maneiras de contar: <b>quanto</b> se usa (toneladas de substância ativa) e <b>quanto risco</b> isso representa. As duas contam histórias diferentes. No mundo, as toneladas passaram de ${fmt(PW.total[0] / 1e6, 2)} para ${fmt(PW.total[pLast] / 1e6, 2)} milhões. Em Portugal subiram até ${ptPeak.y} e desceram, e o indicador harmonizado de risco da UE caiu para ${fmt(HRIv, 0)} (2011–2013 = 100).`, `There are two ways to count: <b>how much</b> is used (tonnes of active substance) and <b>how much risk</b> it represents. They tell different stories. Worldwide, tonnes went from ${fmt(PW.total[0] / 1e6, 2)} to ${fmt(PW.total[pLast] / 1e6, 2)} million. In Portugal they rose until ${ptPeak.y} and then fell, and the EU harmonised risk indicator dropped to ${fmt(HRIv, 0)} (2011–2013 = 100).`),
        tr(`<b>Cuidado com as toneladas:</b> em Portugal cerca de ${fmt(shInorg, 0)}% do peso vendido em ${VE.a + lastI(VE.total)} são fungicidas inorgânicos (enxofre e cobre), também usados na agricultura biológica. Peso não é risco.`, `<b>Careful with tonnes:</b> in Portugal about ${fmt(shInorg, 0)}% of the weight sold in ${VE.a + lastI(VE.total)} is inorganic fungicides (sulphur and copper), also used in organic farming. Weight is not risk.`)) +
      `<div class="grid2">${fig("cPestIdx", tr("Uso de pesticidas: mundo e Portugal", "Pesticide use: world and Portugal"), tr("Índice, 1990 = 100, toneladas de substância ativa.", "Index, 1990 = 100, tonnes of active substance."), `<a href="https://www.fao.org/faostat/en/#data/RP" target="_blank" rel="noopener">FAOSTAT</a>`)}
      ${fig("cPestHa", tr("Pesticida por hectare de terra cultivada", "Pesticide per hectare of cropland"), tr("kg por hectare.", "kg per hectare."), "FAOSTAT")}</div>
      <div class="grid2">${fig("cPestPt", tr("Portugal por tipo de pesticida", "Portugal by pesticide type"), tr("Toneladas de substância ativa, 1990–" + (PP.a + lastI(PP.total)) + ".", "Tonnes of active substance, 1990–" + (PP.a + lastI(PP.total)) + "."), "FAOSTAT")}
      ${fig("cHri", tr("Risco dos pesticidas em Portugal", "Pesticide risk in Portugal"), tr("Indicador harmonizado de risco 1 (média 2011–2013 = 100): mede o risco das substâncias vendidas, não só o peso.", "Harmonised risk indicator 1 (2011–2013 average = 100): it measures the risk of the substances sold, not just weight."), `<a href="https://ec.europa.eu/eurostat/databrowser/view/aei_hri/default/table" target="_blank" rel="noopener">Eurostat (aei_hri)</a>`)}</div>` +
      `<div class="callout"><b>${tr("Uma divergência por esclarecer.", "A divergence still to explain.")}</b> ${tr(`Segundo a FAO, os inseticidas em Portugal passaram de ${fmt(PP.inseticidas[25], 0)} t em ${PP.a + 25} para ${fmt(PP.inseticidas[lastI(PP.inseticidas)], 0)} t em ${PP.a + lastI(PP.inseticidas)}; as vendas do Eurostat (${fmt(VE.inseticidas[0], 0)} t em ${VE.a} e ${fmt(VE.inseticidas[lastI(VE.inseticidas)], 0)} t em ${VE.a + lastI(VE.inseticidas)}) não mostram essa subida. Enquanto as fontes não coincidirem, não tiramos conclusões sobre inseticidas.`, `According to FAO, insecticides in Portugal went from ${fmt(PP.inseticidas[25], 0)} t in ${PP.a + 25} to ${fmt(PP.inseticidas[lastI(PP.inseticidas)], 0)} t in ${PP.a + lastI(PP.inseticidas)}; Eurostat sales (${fmt(VE.inseticidas[0], 0)} t in ${VE.a} and ${fmt(VE.inseticidas[lastI(VE.inseticidas)], 0)} t in ${VE.a + lastI(VE.inseticidas)}) do not show that rise. Until the sources agree, we draw no conclusion on insecticides.`)}</div>` +
      vermais([[tr("Prevenção sem pesticidas", "Prevention without pesticides"), "/calendario/calendario.html#vigilancia"], [tr("Problemas na horta", "Garden problems"), "/calendario/conhecimento-cuidar.html#problemas"]]));

    /* ---------- 5 · produção ---------- */
    const ptItems = [[261, tr("Azeite", "Olive oil"), "--s4"], [564, tr("Vinho", "Wine"), "--s7"], [388, tr("Tomate", "Tomato"), "--s8"]];
    const producao = sec("producao", "5", tr("Produção agrícola", "Farm output"), tr("Mais produção por hectare, e mais pesticida por hectare", "More output per hectare, and more pesticide per hectare"),
      prose(tr(`No mundo, o rendimento dos cereais passou de ${fmt(cer.yield_tha[i90], 2)} para ${fmt(cer.yield_tha[cLast], 2)} t/ha desde ${cer.years[i90]}, e o pesticida por hectare de ${fmt(PW.por_ha[0], 2)} para ${fmt(PW.por_ha[pLast], 2)} kg. Em Portugal, o pesticida por unidade de produção agrícola passou de ${fmt(PP.por_valor[0], 1)} g por dólar internacional em ${PP.a} para ${fmt(PP.por_valor[lastI(PP.por_valor)], 1)} em ${PP.a + lastI(PP.por_valor)} (no mundo, de ${fmt(PW.por_valor[0], 1)} para ${fmt(PW.por_valor[lastI(PW.por_valor)], 1)}).`, `Worldwide, cereal yield went from ${fmt(cer.yield_tha[i90], 2)} to ${fmt(cer.yield_tha[cLast], 2)} t/ha since ${cer.years[i90]}, and pesticide per hectare from ${fmt(PW.por_ha[0], 2)} to ${fmt(PW.por_ha[pLast], 2)} kg. In Portugal, pesticide per unit of farm output went from ${fmt(PP.por_valor[0], 1)} g per international dollar in ${PP.a} to ${fmt(PP.por_valor[lastI(PP.por_valor)], 1)} in ${PP.a + lastI(PP.por_valor)} (worldwide, from ${fmt(PW.por_valor[0], 1)} to ${fmt(PW.por_valor[lastI(PW.por_valor)], 1)}).`)) +
      `<div class="grid2">${fig("cCer", tr("Cereais no mundo: rendimento e pesticida por hectare", "World cereals: yield and pesticide per hectare"), tr("Índice, 1990 = 100.", "Index, 1990 = 100."), "FAOSTAT")}
      ${fig("cPtProd", tr("Produção portuguesa de azeite, vinho e tomate", "Portuguese output of olive oil, wine and tomato"), tr("Milhares de toneladas, 1990–" + A.pt_prod.years.at(-1) + ".", "Thousand tonnes, 1990–" + A.pt_prod.years.at(-1) + "."), "FAOSTAT")}</div>` +
      vermais([[tr("Produção agrícola mundial", "World agricultural production"), "/observatorio/producao-agricola.html"], [tr("Portugal na produção agrícola", "Portugal in agricultural production"), "/observatorio/producao-agricola.html#portugal"]]));

    /* ---------- 6 · a teia ---------- */
    const nodos = [
      ["1", tr("Clima", "Climate"), "medido", tr(`${sinal(dec, 2)} °C por década em Portugal`, `${sinal(dec, 2)} °C per decade in Portugal`), "#clima"],
      ["2", tr("Habitat e uso do solo", "Habitat and land use"), "parcial", tr("Floresta, pastagens e solo selado no Observatório da Terra", "Forest, pasture and sealed land in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"],
      ["3", tr("Aves e vida selvagem", "Birds and wildlife"), "parcial", tr(`Aves agrícolas da UE ${sinal(pct(100, aA.v), 0)}%; sem série nacional`, `EU farmland birds ${sinal(pct(100, aA.v), 0)}%; no national series`), "#vida"],
      ["4", tr("Insetos, polinizadores e inimigos naturais", "Insects, pollinators and natural enemies"), "lacuna", tr("Sem série oficial no bioCulture", "No official series in bioCulture"), "#teia"],
      ["5", tr("Pragas das culturas", "Crop pests"), "lacuna", tr("Inventário sim, série de surtos não", "Inventory yes, outbreak series no"), "#invasoras"],
      ["6", tr("Espécies invasoras", "Invasive species"), "parcial", tr(`${fmt(IV.especies, 0)} espécies com 1.º registo; esforço de deteção varia`, `${fmt(IV.especies, 0)} species with a first record; detection effort varies`), "#invasoras"],
      ["7", tr("Pesticidas", "Pesticides"), "medido", tr("Uso, vendas e risco, 1990–" + pYear, "Use, sales and risk, 1990–" + pYear), "#pesticidas"],
      ["8", tr("Produção agrícola", "Farm output"), "medido", tr("Cereais, azeite, vinho e tomate", "Cereals, olive oil, wine and tomato"), "#producao"]
    ];
    const ESTADO = { medido: [tr("Medido", "Measured"), "#2f7a4f"], parcial: [tr("Parcial", "Partial"), "#b87a0c"], lacuna: [tr("Lacuna", "Gap"), "#8f3b3b"] };
    const diagrama = `<div class="teia" role="list">${nodos.map((n) => `<a class="nodo" role="listitem" href="${n[4]}" style="--e:${ESTADO[n[2]][1]}"><span class="n">${n[0]}</span><b>${n[1]}</b><small>${n[3]}</small><em>${ESTADO[n[2]][0]}</em></a>`).join("")}</div>`;
    const lit = [
      ["Bebber et al. (2013)", "Crop pests and pathogens move polewards in a warming world", "Nature Climate Change", "10.1038/nclimate1990", tr("O aquecimento desloca pragas e doenças das culturas para os polos.", "Warming shifts crop pests and pathogens towards the poles.")],
      ["Deutsch et al. (2018)", "Increase in crop losses to insect pests in a warming climate", "Science", "10.1126/science.aat3466", tr("O aquecimento aumenta as perdas de trigo, arroz e milho para insetos.", "Warming increases wheat, rice and maize losses to insects.")],
      ["Dainese et al. (2019)", "A global synthesis reveals biodiversity-mediated benefits for crop production", "Science Advances", "10.1126/sciadv.aax0121", tr("Paisagens mais simples têm menos controlo natural de pragas e menos polinização.", "Simpler landscapes have less natural pest control and less pollination.")],
      ["Donald et al. (2001)", "Agricultural intensification and the collapse of Europe's farmland bird populations", "Proceedings of the Royal Society B", "10.1098/rspb.2000.1325", tr("A intensificação agrícola está associada ao colapso das aves agrícolas na Europa.", "Agricultural intensification is associated with the collapse of farmland birds in Europe.")],
      ["Hallmann et al. (2017)", "More than 75 percent decline over 27 years in total flying insect biomass in protected areas", "PLOS ONE", "10.1371/journal.pone.0185809", tr("A biomassa de insetos voadores desceu mais de 75% em 27 anos em áreas protegidas alemãs.", "Flying-insect biomass fell by more than 75% in 27 years in German protected areas.")],
      ["Seebens et al. (2017)", "No saturation in the accumulation of alien species worldwide", "Nature Communications", "10.1038/ncomms14435", tr("As espécies exóticas continuam a acumular-se no mundo, sem sinais de saturação.", "Alien species keep accumulating worldwide, with no sign of saturation.")]
    ];
    const iB = [["temp", tr("Temperatura (Portugal)", "Temperature (Portugal)"), tr("°C, média anual", "°C, annual mean")], ["aves", tr("Aves agrícolas (UE)", "Farmland birds (EU)"), tr("índice 1990 = 100", "index 1990 = 100")], ["pt", tr("Pesticidas (Portugal)", "Pesticides (Portugal)"), tr("toneladas por ano", "tonnes per year")], ["mundo", tr("Pesticidas (mundo)", "Pesticides (world)"), tr("milhões de toneladas por ano", "million tonnes per year")], ["cer", tr("Rendimento dos cereais (mundo)", "Cereal yield (world)"), "t/ha"]];
    const teia = sec("teia", "6", tr("A teia", "The web"), tr("O que se liga, o que não se vê e o que falta medir", "What connects, what cannot be seen and what is left to measure"),
      prose(tr(`Cada ponto da teia é uma série diferente, de um âmbito diferente. Em baixo estão alinhadas no mesmo período, para veres o que acontece em paralelo. Isto <b>não prova</b> que uma coisa cause outra: o que a literatura científica já mostrou está listado mais abaixo.`, `Every point of the web is a different series with a different scope. Below they are aligned on the same period so you can see what happens in parallel. This <b>does not prove</b> that one thing causes another: what the scientific literature has already shown is listed further down.`)) +
      diagrama +
      `<div class="alinhadas">${iB.map(([k, n, u]) => `<figure><figcaption><span class="t">${n}</span><span class="d">${u}</span></figcaption><div class="chart" id="cA-${k}"></div></figure>`).join("")}</div>` +
      `<h3 class="sub">${tr("O que sobe e o que desce", "What rises and what falls")}</h3><div class="tscroll full"><table class="mudancas" id="tMud"></table></div>` +
      `<div class="leitura"><article class="ok"><h3>${tr("Os dados confirmam", "The data confirm")}</h3><p>${tr(`O aquecimento de Portugal, a descida das aves agrícolas na UE, a acumulação de espécies não nativas e a duplicação do uso mundial de pesticidas.`, `Portugal’s warming, the fall of farmland birds in the EU, the accumulation of non-native species and the doubling of world pesticide use.`)}</p></article>
      <article class="nao"><h3>${tr("Os dados não confirmam (em Portugal)", "The data do not confirm (in Portugal)")}</h3><p>${tr(`Que o uso de pesticidas tenha subido: as toneladas desceram desde ${ptPeak.y} e o risco harmonizado desceu ${fmt(Math.abs(HRIv - 100), 0)}% desde 2011–2013. A pressão das pragas pode ter mudado de outras formas (que culturas, que substâncias, em que anos), mas estes totais não a mostram.`, `That pesticide use has risen: tonnes have fallen since ${ptPeak.y} and the harmonised risk fell ${fmt(Math.abs(HRIv - 100), 0)}% since 2011–2013. Pest pressure may have changed in other ways (which crops, which substances, which years), but these totals do not show it.`)}</p></article>
      <article class="falta"><h3>${tr("O que ainda não sabemos", "What we do not yet know")}</h3><p>${tr(`Se a perda de insetos, polinizadores e inimigos naturais em Portugal levou a mais pragas e a mais tratamentos. Faltam séries nacionais de aves, insetos e surtos de pragas. As fontes a investigar são o Censo de Aves Comuns da SPEA, o monitor europeu de borboletas (eBMS), a Direção-Geral de Alimentação e Veterinária (DGAV) e a EPPO.`, `Whether the loss of insects, pollinators and natural enemies in Portugal led to more pests and more treatments. National series of birds, insects and pest outbreaks are missing. Sources to investigate are SPEA’s Common Bird Census, the European Butterfly Monitoring Scheme (eBMS), the Portuguese food and veterinary authority (DGAV) and EPPO.`)}</p></article></div>` +
      `<h3 class="sub">${tr("O que a literatura científica já mostrou", "What the scientific literature has already shown")}</h3><ul class="refs">${lit.map((l) => `<li><b>${l[0]}</b> ${l[4]} <a href="https://doi.org/${l[3]}" target="_blank" rel="noopener">${esc(l[1])}, <i>${esc(l[2])}</i> ↗</a></li>`).join("")}</ul>`);

    /* ---------- fontes e método ---------- */
    const fontes = sec("fontes", "", tr("Fontes e método", "Sources and method"), tr("De onde vêm os números e o que não dizem", "Where the numbers come from and what they do not say"),
      `<div class="srcs"><div class="srcc"><h3>${tr("Clima", "Climate")}</h3><p>${esc(C.fonte)}. ${tr("Média do território, 1901–2022.", "Territory mean, 1901–2022.")} <a href="${esc(C.url)}" target="_blank" rel="noopener">↗</a></p></div>
      <div class="srcc"><h3>${tr("Aves", "Birds")}</h3><p>${esc(AV.fonte)}. ${tr("Agregado da UE27, não nacional.", "EU27 aggregate, not national.")} <a href="${esc(AV.url)}" target="_blank" rel="noopener">↗</a></p></div>
      <div class="srcc"><h3>${tr("Espécies não nativas", "Non-native species")}</h3><p>${esc(IV.fonte)}. ${esc(IV.nota)} <a href="${esc(IV.url)}" target="_blank" rel="noopener">↗</a></p></div>
      ${P.fontes.map((f) => `<div class="srcc"><h3>${tr("Pesticidas", "Pesticides")}</h3><p>${esc(f.nome)} <a href="${esc(f.url)}" target="_blank" rel="noopener">↗</a></p></div>`).join("")}
      <div class="srcc"><h3>${tr("Produção e lista vermelha", "Production and Red List")}</h3><p>FAOSTAT; ${esc(t.IND.lista_vermelha.fonte)}.</p></div></div>
      <ul class="limites"><li>${tr("<b>Âmbitos diferentes.</b> Mundo, UE27 e Portugal não se comparam diretamente: servem para ver tendências, não valores.", "<b>Different scopes.</b> World, EU27 and Portugal are not directly comparable: they show trends, not values.")}</li>
      <li>${tr("<b>Correlação não é causa.</b> Duas séries a subir ou a descer em simultâneo podem ter causas comuns ou nenhuma ligação.", "<b>Correlation is not causation.</b> Two series rising or falling together may have common causes or no link at all.")}</li>
      <li>${tr("<b>Toneladas não são risco.</b> O peso das substâncias ativas depende das substâncias usadas; o indicador de risco corrige em parte isso.", "<b>Tonnes are not risk.</b> The weight of active substances depends on which substances are used; the risk indicator partly corrects for that.")}</li>
      <li>${tr("<b>Primeiros registos não são abundância.</b> Dizem quando uma espécie foi registada pela primeira vez, não quantas há nem o dano que fazem.", "<b>First records are not abundance.</b> They say when a species was first recorded, not how many there are or the harm they do.")}</li>
      <li>${tr(`<b>Atualização.</b> Os dados são reunidos por <code>scripts/dados/bioweb.py</code> a partir das fontes oficiais, sem interpolar nem preencher valores em falta. Última recolha: ${esc(B.gerado)}.`, `<b>Updates.</b> Data are gathered by <code>scripts/dados/bioweb.py</code> from official sources, without interpolating or filling gaps. Last collection: ${esc(B.gerado)}.`)}</li></ul>`);

    box.innerHTML = sumario + clima + vida + invasoras + pesticidas + producao + teia + fontes;

    /* ---------- gráficos ---------- */
    const x90 = Array.from({ length: pLast + 1 }, (_, i) => pa + i);
    const ptLast = lastI(PP.total);
    legend(document.getElementById("lg-cInv"), GRP.map(([k, n, c]) => ({ n, c })));

    const tempMa = movel(C.v, 10);
    line(document.getElementById("cTemp"), { x: anos(C.a, C.v), series: [{ n: tr("Anual", "Annual"), c: css("--bar-dim"), v: C.v, w: 1.4 }, { n: tr("Média móvel de 10 anos", "10-year moving average"), c: COR.clima, v: tempMa, w: 2.8 }], zero: false, yf: (v) => fmt(v, 1), tf: (s, i) => fmt(s.v[i], 2) + " °C", aria: tr("Temperatura média anual de Portugal", "Mean annual temperature of Portugal"), table: true, tableEvery: 10 });
    document.getElementById("lg-cTemp") && legend(document.getElementById("lg-cTemp"), [{ n: tr("Anual", "Annual"), c: css("--bar-dim") }, { n: tr("Média móvel de 10 anos", "10-year moving average"), c: COR.clima }]);
    document.getElementById("kClima").innerHTML = [[sinal(dec, 2) + " °C", tr("por década desde 1990", "per decade since 1990")], [fmt(m1322 - m6190, 2) + " °C", tr("a mais em 2013–2022 do que em 1961–1990", "more in 2013–2022 than in 1961–1990")], [fmt(C.v[C.v.length - 1], 2) + " °C", tr("em " + anoC1 + ", o último ano da série", "in " + anoC1 + ", the last year of the series")]].map(([v, k]) => `<div class="kf"><b>${v}</b><span>${k}</span></div>`).join("");

    const xa = anos(avA.a, avA.v);
    line(document.getElementById("cAves"), { x: xa, series: [{ n: tr("Aves agrícolas", "Farmland birds"), c: css("--s8"), v: avA.v, w: 2.6 }, { n: tr("Todas as comuns", "All common"), c: css("--s4"), v: avT.v }, { n: tr("Aves florestais", "Forest birds"), c: css("--s3"), v: avF.v }], zero: false, ref: 100, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 1), endLabels: true, aria: tr("Aves comuns na UE", "Common birds in the EU"), table: true, tableEvery: 5 });
    const rx = []; for (let y = Math.min(rliW.a, rliP.a); y <= Math.max(rW.y1, rP.y1); y++) rx.push(y);
    line(document.getElementById("cRli"), { x: rx, series: [["WLD", "--s1"], ["PRT", "--s2"]].map(([c, v]) => ({ n: t.nm(c), c: css(v), v: rx.map((y) => t.at("lista_vermelha", c, y)) })), zero: false, yf: (v) => fmt(v, 2), tf: (s, i) => fmt(s.v[i], 3), endLabels: true, aria: tr("Índice da Lista Vermelha", "Red List Index"), table: true, tableEvery: 5 });

    line(document.getElementById("cPestIdx"), { x: x90, series: [{ n: tr("Mundo", "World"), c: css("--s1"), v: idx100(PW.total) }, { n: "Portugal", c: css("--s2"), v: idx100(PP.total) }], zero: true, ref: 100, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0), endLabels: true, aria: tr("Uso de pesticidas", "Pesticide use"), table: true, tableEvery: 5 });
    line(document.getElementById("cPestHa"), { x: x90, series: [{ n: tr("Mundo", "World"), c: css("--s1"), v: PW.por_ha }, { n: "Portugal", c: css("--s2"), v: PP.por_ha }], zero: true, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 2) + " kg/ha", endLabels: true, aria: tr("Pesticida por hectare", "Pesticide per hectare"), table: true, tableEvery: 5 });
    const xp = x90.slice(0, ptLast + 1);
    line(document.getElementById("cPestPt"), { x: xp, series: [{ n: tr("Fungicidas e bactericidas", "Fungicides and bactericides"), c: css("--s4"), v: PP.fungicidas.slice(0, ptLast + 1) }, { n: tr("Herbicidas", "Herbicides"), c: css("--s3"), v: PP.herbicidas.slice(0, ptLast + 1) }, { n: tr("Inseticidas", "Insecticides"), c: css("--s8"), v: PP.inseticidas.slice(0, ptLast + 1) }], zero: true, yf: (v) => fmt(v / 1000, 0) + (EN ? "k" : " mil"), tf: (s, i) => fmt(s.v[i], 0) + " t", endLabels: true, aria: tr("Pesticidas em Portugal por tipo", "Pesticides in Portugal by type"), table: true, tableEvery: 5 });
    const xh = anos(HR.a, HR.hri1);
    line(document.getElementById("cHri"), { x: xh, series: [{ n: tr("Risco (todas as substâncias)", "Risk (all substances)"), c: css("--s2"), v: HR.hri1, w: 2.6 }], zero: true, ref: 100, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0), endLabels: false, aria: tr("Indicador harmonizado de risco", "Harmonised risk indicator"), table: true });

    const ci0 = cer.years.indexOf(1990), xc = cer.years.slice(ci0);
    const cerY = idx100(cer.yield_tha.slice(ci0)), pHaW = idx100(PW.por_ha);
    line(document.getElementById("cCer"), { x: xc, series: [{ n: tr("Rendimento dos cereais", "Cereal yield"), c: css("--s4"), v: cerY }, { n: tr("Pesticida por hectare (mundo)", "Pesticide per hectare (world)"), c: css("--s8"), v: pHaW.slice(0, xc.length) }], zero: true, ref: 100, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0), endLabels: true, aria: tr("Rendimento e pesticida por hectare", "Yield and pesticide per hectare"), table: true, tableEvery: 5 });
    const py = A.pt_prod.years, pi0 = py.indexOf(1990), xpp = py.slice(pi0);
    line(document.getElementById("cPtProd"), { x: xpp, series: ptItems.map(([id, n, v]) => ({ n, c: css(v), v: pr(id).kt.slice(pi0) })), zero: true, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0) + " kt", endLabels: true, aria: tr("Produção portuguesa", "Portuguese output"), table: true, tableEvery: 5 });

    /* ---------- séries alinhadas (1990–último ano) ---------- */
    const x0 = 1990, x1 = Math.max(pYear, aA.y);
    const xs = Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i);
    const pick = (a, v) => xs.map((y) => (v[y - a] == null ? null : v[y - a]));
    const alin = (id, nome, cor, v, unid, yf) => line(document.getElementById(id), { x: xs, series: [{ n: nome, c: cor, v, w: 2.4 }], zero: false, h: 150, yf, tf: (s, i) => fmt(s.v[i], 2) + unid, aria: nome });
    alin("cA-temp", tr("Temperatura (Portugal)", "Temperature (Portugal)"), COR.clima, pick(C.a, C.v), " °C", (v) => fmt(v, 1));
    alin("cA-aves", tr("Aves agrícolas (UE)", "Farmland birds (EU)"), COR.vida, pick(avA.a, avA.v), "", (v) => fmt(v, 0));
    alin("cA-pt", tr("Pesticidas (Portugal)", "Pesticides (Portugal)"), COR.pesticidas, pick(PP.a, PP.total), " t", (v) => fmt(v / 1000, 0) + (EN ? "k" : " mil"));
    alin("cA-mundo", tr("Pesticidas (mundo)", "Pesticides (world)"), COR.invasoras, pick(PW.a, PW.total.map((v) => (v == null ? null : v / 1e6))), " Mt", (v) => fmt(v, 1));
    alin("cA-cer", tr("Rendimento dos cereais (mundo)", "Cereal yield (world)"), COR.producao, pick(cer.years[0], cer.yield_tha), " t/ha", (v) => fmt(v, 1));

    /* ---------- tabela de variações ---------- */
    const linhas = [
      [tr("Temperatura média anual", "Mean annual temperature"), "Portugal", tr("1991–2000", "1991–2000"), fmt(tempMedia(1991, 2000), 2) + " °C", "2013–2022", fmt(m1322, 2) + " °C", sinal(m1322 - tempMedia(1991, 2000), 2) + " °C", "up"],
      [tr("Aves comuns dos campos", "Common farmland birds"), "UE27", "1990", "100", String(aA.y), fmt(aA.v, 0), sinal(pct(100, aA.v), 0) + "%", "down"],
      [tr("Aves comuns das florestas", "Common forest birds"), "UE27", "1990", "100", String(aF.y), fmt(aF.v, 0), sinal(pct(100, aF.v), 0) + "%", "down"],
      [tr("Índice da Lista Vermelha", "Red List Index"), tr("Mundo", "World"), String(rW.y0), fmt(rW.v0, 3), String(rW.y1), fmt(rW.v1, 3), sinal(pct(rW.v0, rW.v1), 1) + "%", "down"],
      [tr("Índice da Lista Vermelha", "Red List Index"), "Portugal", String(rP.y0), fmt(rP.v0, 3), String(rP.y1), fmt(rP.v1, 3), sinal(pct(rP.v0, rP.v1), 1) + "%", "down"],
      [tr("Espécies não nativas (1.º registos por década)", "Non-native species (first records per decade)"), tr("Portugal continental", "Mainland Portugal"), "1960–1989", fmt(medAntes, 0), "1990–2009", fmt(medDepois, 0), sinal(pct(medAntes, medDepois), 0) + "%", "up"],
      [tr("Pesticidas (toneladas)", "Pesticides (tonnes)"), tr("Mundo", "World"), String(pa), fmt(PW.total[0] / 1e6, 2) + " Mt", String(pYear), fmt(PW.total[pLast] / 1e6, 2) + " Mt", sinal(pct(PW.total[0], PW.total[pLast]), 0) + "%", "up"],
      [tr("Pesticidas (toneladas)", "Pesticides (tonnes)"), "Portugal", String(pa), fmt(PP.total[0] / 1000, 1) + " kt", String(PP.a + ptLast), fmt(PP.total[ptLast] / 1000, 1) + " kt", sinal(pct(PP.total[0], PP.total[ptLast]), 0) + "%", "flat"],
      [tr("Pesticida por hectare", "Pesticide per hectare"), tr("Mundo", "World"), String(pa), fmt(PW.por_ha[0], 2) + " kg", String(pYear), fmt(PW.por_ha[pLast], 2) + " kg", sinal(pct(PW.por_ha[0], PW.por_ha[pLast]), 0) + "%", "up"],
      [tr("Risco dos pesticidas (HRI 1)", "Pesticide risk (HRI 1)"), "Portugal", "2011–2013", "100", String(hrY), fmt(HRIv, 0), sinal(HRIv - 100, 0) + "%", "down"],
      [tr("Rendimento dos cereais", "Cereal yield"), tr("Mundo", "World"), String(cer.years[i90]), fmt(cer.yield_tha[i90], 2) + " t/ha", String(cer.years[cLast]), fmt(cer.yield_tha[cLast], 2) + " t/ha", sinal(pct(cer.yield_tha[i90], cer.yield_tha[cLast]), 0) + "%", "up"]
    ];
    const SETA = { up: "▲", down: "▼", flat: "▬" };
    document.getElementById("tMud").innerHTML = `<thead><tr><th>${tr("Indicador", "Indicator")}</th><th>${tr("Âmbito", "Scope")}</th><th>${tr("Início", "Start")}</th><th></th><th>${tr("Fim", "End")}</th><th></th><th>${tr("Variação", "Change")}</th></tr></thead><tbody>${linhas.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="num">${r[3]}</td><td>${r[4]}</td><td class="num">${r[5]}</td><td class="num"><span class="seta ${r[7]}">${SETA[r[7]]}</span> ${r[6]}</td></tr>`).join("")}</tbody>`;

    /* ---------- contagens do inventário do bioCulture (não bloqueiam a página) ---------- */
    [["nPragas", "/data/pragas.json"], ["nFlora", "/data/flora_invasora.json"], ["nFauna", "/data/fauna_invasora.json"]].forEach(([id, url]) => get(url).then((d) => { const el = document.getElementById(id); if (el) el.textContent = fmt(Array.isArray(d) ? d.length : Object.keys(d).length, 0); }).catch(() => { const el = document.getElementById(id); if (el) el.textContent = "—"; }));
  }
})();
