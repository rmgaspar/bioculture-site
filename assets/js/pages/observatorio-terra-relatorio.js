/* Observatório da Terra · relatório de dados.
   Dados: /data/observatorio-terra-relatorio.json (séries por país, gerado por scripts/dados/relatorio_terra.py a partir dos
   ficheiros de energia, ar, água, solo e biodiversidade), /data/observatorio_global.json (clima), /data/vetores_pressao_global.json
   (grandezas curadas) e /data/observatorio_terra.json (Portugal). Gráficos: assets/js/biocultura-graficos.js.
   Todos os números do texto são lidos dos dados; nada é escrito à mão. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos;
  const box = document.getElementById("relatorio-terra");
  if (!G || !box || !window.BioCulturaTerra) return;
  const { EN, tr, fmt, esc, css, SER, hbars, line, legend, seg, miniBars, miniStack, tableView } = G;
  fetch("/sidebar-content.html?v=24").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});

  /* A barra fixa lê os destinos ao carregar; como os capítulos nascem aqui, só a ligamos depois de existirem. */
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=13"; document.body.appendChild(el); };

  const traduzirNav = () => {
    if (!EN) return;
    const M = { sumario: "Summary", clima: "Climate", energia: "Energy", ar: "Air", agua: "Water", "terra-vida": "Land and life", "portugal-mundo": "Portugal in the world", "leitura-local": "Portugal in detail", "pressure-systems": "Pressure systems" };
    document.querySelectorAll('.reading-nav a[href^="#"]').forEach((a) => { const k = a.getAttribute("href").slice(1); if (M[k]) a.textContent = M[k] + " ↓"; });
  };

  /* Ligações com #capítulo: os capítulos só existem depois de construídos, por isso saltamos para eles aqui. */
  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  window.BioCulturaTerra.load().then(({ R, CLIMA, VET, PT }) => { build(R, CLIMA, VET, PT); traduzirNav(); barraFixa(); irParaHash(); }).catch((e) => {
    console.error(e); traduzirNav(); barraFixa();
    box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados do relatório.", "The report data could not be loaded.")}</p>`;
  });

  function build(R, CLIMA, VET, PT) {
    const T = BioCulturaTerra.create(R, CLIMA, VET);
    const { IND, P, SOB, nm, SC, colorOf, ser, last, at, rowsOf, pct, META, fv, clima, cs, co2, co2L, co2F, tmp, mar, dest, fonte, wl, pt, eu, W, rli, rli0, rli1, rliY0, pmRows, pmAbove, wsRows, wsCrit, accRows, accLow, dwRows, dwLow, gbf, D1 } = T;

    /* ---------- gráfico de linhas por geografia ---------- */
    function lineGeo(el, k, codes, o = {}) {
      const items = codes.map((c) => ({ c, s: ser(k, c) })).filter((x) => x.s);
      const y0 = Math.max(o.from || 0, Math.min(...items.map((x) => x.s.a)));
      const y1 = Math.max(...items.map((x) => x.s.a + x.s.v.length - 1));
      const x = []; for (let y = y0; y <= y1; y++) x.push(y);
      const series = items.map((it, i) => ({ n: nm(it.c), c: colorOf(it.c, i), w: it.c === "PRT" ? 2.6 : 2, v: x.map((y) => { const v = it.s.v[y - it.s.a]; return v == null ? null : v; }) }));
      line(el, Object.assign({ x, series, zero: o.zero, endLabels: true, yf: o.yf || ((v) => fmt(v)), tf: (se, i) => (o.tf ? o.tf(se.v[i]) : fmt(se.v[i], o.d == null ? 1 : o.d)), unit: o.unit, ymax: o.ymax, table: true, tableEvery: 5, aria: o.aria || META[k]?.n || "" }, o.cfg || {}));
    }

    /* ---------- ranking com escolha de indicador ---------- */
    function ranking(host, keys, o = {}) {
      host.innerHTML = `<figcaption><span class="t">${o.title}</span><span class="d">${o.desc || ""}</span></figcaption>
        <div class="controls">${keys.length > 1 ? `<select aria-label="${tr("Indicador", "Indicator")}">${keys.map((k) => `<option value="${k}">${esc(META[k].n)}</option>`).join("")}</select>` : ""}
        <div class="seg" role="group" aria-label="${tr("Ordem", "Order")}"><button aria-pressed="true" data-v="top">${tr("Mais altos", "Highest")}</button><button aria-pressed="false" data-v="bottom">${tr("Mais baixos", "Lowest")}</button></div></div>
        <div class="chart" id="${host.id}-c"></div><p class="rknote" id="${host.id}-n"></p><div class="src"><span id="${host.id}-s"></span></div>`;
      let key = keys[0], dir = o.dir || "top";
      const sel = host.querySelector("select"), c = host.querySelector(".chart");
      if (o.dir === "bottom") { host.querySelectorAll(".seg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === "bottom")); }
      const draw = () => {
        const rows = rowsOf(key).sort((a, b) => (dir === "top" ? b.v - a.v : a.v - b.v));
        const N = o.n || 12, list = rows.slice(0, N), ptI = rows.findIndex((r) => r.c === "PRT");
        const yearTip = (y) => `<div class="r"><span>${tr("Ano", "Year")}</span><b>${y}</b></div>`;
        const out = list.map((r) => ({ l: nm(r.c), tl: nm(r.c) + " (" + r.y + ")", v: r.v, hl: r.c === "PRT", y: r.y }));
        if (ptI >= N) out.push({ l: nm("PRT") + " " + (ptI + 1) + ".º", tl: nm("PRT") + " " + (ptI + 1) + ".º (" + rows[ptI].y + ")", v: rows[ptI].v, hl: true, y: rows[ptI].y });
        const cap = key === "stress_hidrico" ? 150 : null;
        const col = css(dir === "top" ? "--bar" : "--s2");
        out.forEach((r) => { r.c = r.hl ? css("--s2") : col; r.t = fv(key, r.v); r.tip = `<div class="r"><span>${esc(META[key].n)}</span><b>${r.t}</b></div>` + yearTip(r.y); });
        hbars(c, out, { max: cap || Math.max(...out.map((r) => r.v)), f: (v) => fv(key, v), unit: META[key].n, ref: key === "stress_hidrico" ? 100 : null, table: [tr("País (último ano)", "Country (latest year)"), tr("Valor", "Value")] });
        host.querySelector(".rknote").textContent = tr(`${rows.length} Estados com dados dos últimos 5 anos. `, `${rows.length} states with data from the last 5 years. `) + (ptI >= 0 ? tr(`Portugal está em ${ptI + 1}.º lugar, do mais alto para o mais baixo.`, `Portugal ranks ${ptI + 1}th, from highest to lowest.`) : "") + (cap ? tr(" Barras cortadas em 150%; o valor está à direita.", " Bars are cut at 150%; the value is shown on the right.") : "");
        host.querySelector(".src span").textContent = tr("Fonte: ", "Source: ") + IND[key].fonte;
      };
      if (sel) sel.addEventListener("change", () => { key = sel.value; draw(); });
      seg(host.querySelector(".seg"), (v) => { dir = v; draw(); });
      draw();
    }

    /* ---------- faixas: quantos países em cada intervalo ---------- */
    function bands(el, k, edges, labels, colors, o = {}) {
      const rows = rowsOf(k), counts = labels.map(() => []);
      rows.forEach((r) => { let i = edges.findIndex((e) => r.v < e); if (i < 0) i = edges.length; counts[i].push(r); });
      const data = labels.map((l, i) => ({
        l, v: counts[i].length, c: colors[i], t: fmt(counts[i].length) + " " + tr("países", "countries"),
        tip: `<div class="r"><span>${tr("Países", "Countries")}</span><b>${counts[i].length}</b></div>` + counts[i].sort((a, b) => b.v - a.v).slice(0, 8).map((r) => `<div class="r"><span>${esc(nm(r.c))}</span><b>${fv(k, r.v)}</b></div>`).join("") + (counts[i].length > 8 ? `<div class="r"><span>…</span></div>` : "")
      }));
      hbars(el, data, { max: Math.max(...data.map((d) => d.v), 1), f: (v) => fmt(v), table: [tr("Faixa", "Band"), tr("Países", "Countries")] });
      return { rows, counts };
    }

    /* ---------- chapter frame ---------- */
    const sec = (id, eb, h, body) => `<section id="${id}"><div class="sec-head"><span class="eyebrow">${eb}</span><h2>${h}</h2></div>${body}</section>`;
    const fig = (id, t, d, extra = "") => `<figure><figcaption><span class="t">${t}</span><span class="d">${d}</span></figcaption>${extra}<div class="chart" id="${id}"></div><div class="src"><span></span></div></figure>`;
    const prose = (...ps) => `<div class="prose">${ps.map((p) => `<p>${p}</p>`).join("")}</div>`;


    /* ---------- esqueleto ---------- */
    const html = [];

    html.push(`<section id="sumario"><div class="tiles" id="tTiles"></div>
      <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("Dez coisas que os dados mostram", "Ten things the data show")}</h2></div>
      <ol class="findings" id="tFindings"></ol></section>`);

    html.push(sec("clima", tr("1 · Clima", "1 · Climate"), tr("Um planeta mais quente, com mais gases na atmosfera e o mar a subir", "A warmer planet, more gases in the air and a rising sea"),
      prose(
        tr(`O desvio da temperatura global face a 1951–1980 passou de ${fmt(tmp.find((p) => p.a === 1950)?.v, 2)} °C em 1950 para <strong>${fmt(tmp.find((p) => p.a === 2024)?.v, 2)} °C em 2024</strong> (NASA GISTEMP). Medido contra o período 1850–1900, a OMM calcula <strong>+${fmt(dest.clima_2025.valor, 2)} °C em ${dest.clima_2025.ano}</strong> (incerteza ±${fmt(dest.clima_2025.incerteza, 2)}). São bases diferentes, por isso os dois números não se comparam diretamente.`,
          `The global temperature departure from 1951–1980 went from ${fmt(tmp.find((p) => p.a === 1950)?.v, 2)} °C in 1950 to <strong>${fmt(tmp.find((p) => p.a === 2024)?.v, 2)} °C in 2024</strong> (NASA GISTEMP). Against 1850–1900, the WMO estimates <strong>+${fmt(dest.clima_2025.valor, 2)} °C in ${dest.clima_2025.ano}</strong> (uncertainty ±${fmt(dest.clima_2025.incerteza, 2)}). The baselines differ, so the two figures cannot be compared directly.`),
        tr(`O dióxido de carbono em Mauna Loa subiu de <strong>${fmt(co2F.v, 0)} ppm em ${co2F.a}</strong> para <strong>${fmt(co2L.v, 0)} ppm em ${co2L.a}</strong>. O nível do mar sobe hoje <strong>${fmt(dest.nivel_mar.valor, 2)} mm por ano</strong> (${dest.nivel_mar.periodo}), contra ${fmt(dest.nivel_mar.referencia.valor, 2)} mm por ano em ${dest.nivel_mar.referencia.periodo}.`,
          `Carbon dioxide at Mauna Loa rose from <strong>${fmt(co2F.v, 0)} ppm in ${co2F.a}</strong> to <strong>${fmt(co2L.v, 0)} ppm in ${co2L.a}</strong>. Sea level now rises <strong>${fmt(dest.nivel_mar.valor, 2)} mm a year</strong> (${dest.nivel_mar.periodo}), against ${fmt(dest.nivel_mar.referencia.valor, 2)} mm a year in ${dest.nivel_mar.referencia.periodo}.`)
      ) +
      fig("cTemp", tr("Temperatura global à superfície, desvio face a 1951–1980", "Global surface temperature, departure from 1951–1980"), tr("°C, anos selecionados (décadas e os dois últimos anos). NASA GISTEMP.", "°C, selected years (decades and the latest two years). NASA GISTEMP.")) +
      `<div class="grid2">` +
      fig("cCO2", tr("CO₂ atmosférico em Mauna Loa", "Atmospheric CO₂ at Mauna Loa"), tr("ppm, médias anuais de anos selecionados. NOAA.", "ppm, annual means of selected years. NOAA.")) +
      fig("cCH4", tr("Metano atmosférico global", "Global atmospheric methane"), tr("ppb, anos selecionados. NOAA.", "ppb, selected years. NOAA.")) +
      fig("cMar", tr("Nível médio global do mar", "Global mean sea level"), tr("mm acima do valor de 1993, altimetria por satélite.", "mm above the 1993 value, satellite altimetry.")) +
      fig("cGelo", tr("Gelo marinho do Ártico: mínimo anual", "Arctic sea ice: annual minimum"), tr("milhões de km², setembro, anos selecionados. Satélite.", "million km², September, selected years. Satellite.")) +
      `</div>` +
      `<div class="callout">${tr("Estas cinco séries usam <strong>anos selecionados</strong> (décadas e os mais recentes) e não todos os anos: servem para ver a direção, não para calcular tendências finas. O mínimo do gelo oscila muito de ano para ano. As séries completas estão nas fontes indicadas no fim da página.",
        "These five series use <strong>selected years</strong> (decades and the most recent) rather than every year: they show direction, not fine trends. The ice minimum varies a lot from year to year. The complete series are at the sources listed at the end of the page.")}</div>`));

    html.push(sec("energia", tr("2 · Energia", "2 · Energy"), tr("Eletricidade para quase todos, mas as renováveis ainda são minoria", "Electricity for almost everyone, but renewables are still a minority"),
      prose(
        tr(`Em ${W.acc.y}, <strong>${fmt(W.acc.v, 1)}%</strong> da população mundial tinha acesso a eletricidade, contra ${fmt(at("acesso_eletricidade", "WLD", ser("acesso_eletricidade", "WLD").a), 1)}% em ${ser("acesso_eletricidade", "WLD").a}. Ainda assim, ${accLow} Estados ficam abaixo de 50%. Na produção de eletricidade, as renováveis eram <strong>${fmt(W.re.v, 1)}%</strong> no mundo em ${W.re.y}, <strong>${fmt(eu("eletricidade_renovavel").v, 1)}%</strong> na União Europeia e <strong>${fmt(pt("eletricidade_renovavel").v, 1)}%</strong> em Portugal.`,
          `In ${W.acc.y}, <strong>${fmt(W.acc.v, 1)}%</strong> of the world’s population had access to electricity, against ${fmt(at("acesso_eletricidade", "WLD", ser("acesso_eletricidade", "WLD").a), 1)}% in ${ser("acesso_eletricidade", "WLD").a}. Even so, ${accLow} states are below 50%. In electricity generation, renewables were <strong>${fmt(W.re.v, 1)}%</strong> worldwide in ${W.re.y}, <strong>${fmt(eu("eletricidade_renovavel").v, 1)}%</strong> in the European Union and <strong>${fmt(pt("eletricidade_renovavel").v, 1)}%</strong> in Portugal.`),
        tr("Eletricidade e energia final são coisas diferentes: grande parte da energia que consumimos (transportes, calor industrial, aquecimento) não é eletricidade, por isso a quota de renováveis na <strong>energia final</strong> é bem menor. Em muitos países com quotas muito altas, uma parte importante é biomassa tradicional (lenha e carvão vegetal) usada para cozinhar, como documenta a Agência Internacional de Energia.",
          "Electricity and final energy are different things: much of the energy we use (transport, industrial heat, heating) is not electricity, so the renewable share of <strong>final energy</strong> is much lower. In many countries with very high shares, a large part is traditional biomass (firewood and charcoal) used for cooking, as the International Energy Agency documents.")
      ) +
      `<figure id="fEne"><figcaption><span class="t">${tr("Evolução por indicador", "Trend by indicator")}</span><span class="d">${tr("Mundo, União Europeia, Portugal e grupos de rendimento do Banco Mundial.", "World, European Union, Portugal and World Bank income groups.")}</span></figcaption>
        <div class="controls"><div class="seg" id="segEne" role="group" aria-label="${tr("Indicador", "Indicator")}">${["eletricidade_renovavel", "renovavel_final", "acesso_eletricidade", "intensidade_energetica"].map((k, i) => `<button aria-pressed="${i === 0}" data-v="${k}">${esc(META[k].n.replace(/ \(.*/, ""))}</button>`).join("")}</div></div>
        <div class="chart" id="cEne"></div><div class="src"><span id="sEne"></span></div></figure>` +
      `<figure id="rkEne"></figure>`));

    html.push(sec("ar", tr("3 · Ar", "3 · Air"), tr("Respirar: quase todos os países ultrapassam o valor-guia da OMS", "Breathing: almost every country exceeds the WHO guideline"),
      prose(
        tr(`A exposição média da população mundial a partículas finas (PM2.5) foi de <strong>${fmt(W.pm.v, 1)} µg/m³ em ${W.pm.y}</strong>. O valor-guia da OMS (2021) é de <strong>${D1.PM_GUIDE} µg/m³</strong> por ano: <strong>${pmAbove} dos ${pmRows.length} Estados</strong> com dados estão acima dele. Portugal tem ${fmt(pt("pm25").v, 1)} µg/m³ (${pt("pm25").y}), ${pt("pm25").v < 10 ? "dentro" : "fora"} da meta intermédia de 10 µg/m³.`,
          `Average population exposure to fine particles (PM2.5) was <strong>${fmt(W.pm.v, 1)} µg/m³ in ${W.pm.y}</strong>. The WHO guideline (2021) is <strong>${D1.PM_GUIDE} µg/m³</strong> a year: <strong>${pmAbove} of the ${pmRows.length} states</strong> with data are above it. Portugal has ${fmt(pt("pm25").v, 1)} µg/m³ (${pt("pm25").y}), ${pt("pm25").v < 10 ? "within" : "outside"} the 10 µg/m³ interim target.`),
        tr("Segundo a OMS, as partículas finas vêm sobretudo da queima de combustíveis em transportes, indústria, produção de energia e cozinha ou aquecimento doméstico. Mortalidade atribuída à poluição do ar existe nos dados só para 2019, por isso aparece apenas como comparação entre países.",
          "According to the WHO, fine particles come mainly from burning fuels in transport, industry, power generation and household cooking or heating. Mortality attributed to air pollution exists in the data only for 2019, so it appears only as a comparison between countries.")
      ) +
      fig("cAr", tr("Exposição a PM2.5, 1990–" + W.pm.y, "PM2.5 exposure, 1990–" + W.pm.y), tr("µg/m³, média anual ponderada pela população. Linha tracejada: valor-guia da OMS.", "µg/m³, annual mean weighted by population. Dashed line: WHO guideline.")) +
      fig("cArBandas", tr("Quantos países em cada faixa de PM2.5", "How many countries in each PM2.5 band"), tr("Estados por exposição média anual, " + W.pm.y + ". Metas intermédias da OMS: 35, 25, 15 e 10 µg/m³.", "States by annual mean exposure, " + W.pm.y + ". WHO interim targets: 35, 25, 15 and 10 µg/m³.")) +
      `<figure id="rkAr"></figure>`));

    html.push(sec("agua", tr("4 · Água", "4 · Water"), tr("Água: pouco stress em média, muito stress onde falta", "Water: little stress on average, a lot where it is scarce"),
      prose(
        tr(`O stress hídrico compara a água doce captada com a que se renova (depois de reservar caudais para os ecossistemas). A média mundial foi de <strong>${fmt(W.ws.v, 1)}%</strong> em ${W.ws.y}, mas <strong>${wsCrit} Estados</strong> captam mais do que os recursos renováveis disponíveis (acima de 100%). Portugal: ${fmt(pt("stress_hidrico").v, 1)}% (${pt("stress_hidrico").y}). Os números nacionais escondem as diferenças dentro de cada país e entre estações do ano.`,
          `Water stress compares freshwater withdrawn with what is renewed (after reserving flows for ecosystems). The world average was <strong>${fmt(W.ws.v, 1)}%</strong> in ${W.ws.y}, but <strong>${wsCrit} states</strong> withdraw more than the renewable resources available (above 100%). Portugal: ${fmt(pt("stress_hidrico").v, 1)}% (${pt("stress_hidrico").y}). National figures hide differences within each country and between seasons.`),
        tr(`Em ${W.dw.y}, <strong>${fmt(W.dw.v, 1)}%</strong> da população mundial usava água potável gerida em segurança (em Portugal, ${fmt(pt("agua_potavel").v, 1)}%). Em ${dwLow} Estados com dados, menos de metade da população tem esse serviço.`,
          `In ${W.dw.y}, <strong>${fmt(W.dw.v, 1)}%</strong> of the world’s population used safely managed drinking water (in Portugal, ${fmt(pt("agua_potavel").v, 1)}%). In ${dwLow} states with data, fewer than half of the population has that service.`)
      ) +
      `<div class="grid2">` +
      fig("cAguaBandas", tr("Estados por nível de stress hídrico", "States by level of water stress"), tr("Classes do ODS 6.4.2, " + W.ws.y + ".", "SDG 6.4.2 classes, " + W.ws.y + ".")) +
      fig("cAguaLin", tr("Água potável gerida em segurança", "Safely managed drinking water"), tr("% da população. Mundo, Europa e Portugal.", "% of population. World, Europe and Portugal.")) +
      `</div>` +
      `<figure id="rkAgua"></figure>`));

    html.push(sec("terra-vida", tr("5 · Solo e vida", "5 · Land and life"), tr("Terra degradada, espécies mais ameaçadas e proteção ainda abaixo da meta", "Degraded land, more threatened species and protection still below the target"),
      prose(
        tr(`Segundo a UNCCD, <strong>${fmt(W.dg.v, 1)}%</strong> da área terrestre estava degradada em ${W.dg.y} (${fmt(at("terra_degradada", "WLD", 2015), 1)}% em 2015). As duas datas vêm de ciclos de reporte diferentes: antes de ler a diferença como tendência, confirma a nota metodológica da UNCCD. Portugal declarou ${fmt(pt("terra_degradada").v, 1)}%.`,
          `According to UNCCD, <strong>${fmt(W.dg.v, 1)}%</strong> of land area was degraded in ${W.dg.y} (${fmt(at("terra_degradada", "WLD", 2015), 1)}% in 2015). The two dates come from different reporting cycles: before reading the difference as a trend, check the UNCCD methodological note. Portugal reported ${fmt(pt("terra_degradada").v, 1)}%.`),
        tr(`O Índice da Lista Vermelha da UICN mede o risco de extinção de grupos de espécies: 1 significa nenhuma ameaçada, 0 significa todas extintas. O índice mundial desceu de <strong>${fmt(rli0, 3)} em ${rliY0}</strong> para <strong>${fmt(rli1.v, 3)} em ${rli1.y}</strong>. A meta 3 do Quadro Global de Biodiversidade de Kunming-Montreal é proteger ${gbf}% das terras e dos mares até 2030; hoje estão protegidos <strong>${fmt(W.tp.v, 1)}%</strong> da terra e <strong>${fmt(W.mp.v, 1)}%</strong> das águas territoriais.`,
          `The IUCN Red List Index measures extinction risk across groups of species: 1 means none threatened, 0 means all extinct. The world index fell from <strong>${fmt(rli0, 3)} in ${rliY0}</strong> to <strong>${fmt(rli1.v, 3)} in ${rli1.y}</strong>. Target 3 of the Kunming-Montreal Global Biodiversity Framework is to protect ${gbf}% of land and sea by 2030; today <strong>${fmt(W.tp.v, 1)}%</strong> of land and <strong>${fmt(W.mp.v, 1)}%</strong> of territorial waters are protected.`)
      ) +
      `<div class="grid2">` +
      fig("cRLI", tr("Índice da Lista Vermelha", "Red List Index"), tr("1 = nenhuma espécie ameaçada. Mundo, Europa e Portugal.", "1 = no species threatened. World, Europe and Portugal.")) +
      fig("cProt", tr("Áreas protegidas no mundo", "Protected areas worldwide"), tr("% da terra e das águas territoriais, e meta de 30% para 2030.", "% of land and territorial waters, and the 30% target for 2030.")) +
      `</div>` +
      `<figure id="rkTerra"></figure>`));

    /* destaques curados */
    const NAT = { "estimativa modelada": "modelled estimate", "observação consolidada": "consolidated observation", "avaliação global": "global assessment", "estimativa de saúde": "health estimate", "estimativa global": "global estimate", "estimativa e projeção": "estimate and projection", "intervalo estimado": "estimated range" };
    const UN_EN = { "mil milhões t": "billion t", "milhões ha de perda líquida": "million ha net loss", "milhão de espécies aproximadamente": "million species, approx.", "milhões de mortes prematuras/ano": "million premature deaths a year", "milhões t": "million t", "milhões t de resíduos": "million t of waste", "TWh": "TWh" };
    const LE = {
      materiais: "Global material extraction has more than tripled since 1970.",
      floresta: "Net loss counts losses and gains together; it is not the same as gross deforestation.",
      biodiversidade: "Estimated number of species threatened with extinction, many within decades if the drivers of loss do not decline.",
      ar: "Combined burden attributed to ambient and household air pollution.",
      ewaste: "Only 22.3% was documented as formally collected and recycled.",
      plastico: "Global estimate; the no-new-action scenario approaches 1.2 billion t in 2060.",
      datacenters: "Electricity used by data centres, excluding crypto mining; about 1–1.3% of global final electricity demand."
    };
    const destCards = ["materiais", "floresta", "biodiversidade", "ar", "ewaste", "plastico", "datacenters"].map((id) => {
      const d = dest[id], f = fonte[d.fonte_id] || {};
      const val = d.intervalo ? d.intervalo.map((x) => fmt(x)).join("–") : fmt(d.valor, d.valor % 1 ? 1 : 0);
      const when = d.ano || d.periodo || d.ano_referencia || "";
      return `<div class="srcc"><h3><span class="num" style="font-family:var(--f-display);font-size:1.5rem">${val}</span> <small style="color:var(--muted);font-weight:400">${esc(EN ? (UN_EN[d.unidade] || d.unidade) : d.unidade)}${when ? " · " + esc(when) : ""}</small></h3><p>${esc(EN ? LE[id] : d.leitura)}</p><span class="pill nu">${esc(EN ? (NAT[d.natureza] || d.natureza) : d.natureza)}</span><span class="u"><a href="${esc(f.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(f.titulo || f.nome || d.fonte_id)} ↗</a></span></div>`;
    }).join("");
    html.push(sec("materia", tr("6 · Matéria e resíduos", "6 · Materials and waste"), tr("O que se extrai, o que se perde e o que sobra", "What is extracted, what is lost and what is left"),
      prose(tr("Estas grandezas não se somam nem se comparam entre si: cada uma tem a sua unidade, o seu período e o seu grau de certeza, indicado em cada cartão. São estimativas de organizações internacionais, não séries anuais completas.",
        "These quantities cannot be added or compared with each other: each has its own unit, period and degree of certainty, shown on each card. They are estimates by international organisations, not complete annual series.")) +
      `<div class="grid2">` +
      fig("cFloresta", tr("Floresta: perda líquida por década", "Forest: net loss by decade"), tr("Milhões de hectares por ano. Mudança líquida desconta a floresta que cresce; a desflorestação bruta é maior.", "Million hectares a year. Net change subtracts forest that grows; gross deforestation is larger.")) +
      fig("cEwaste", tr("Resíduos eletrónicos", "Electronic waste"), tr("Milhões de toneladas. O valor de 2030 é uma projeção.", "Million tonnes. The 2030 value is a projection.")) +
      fig("cMateriais", tr("Extração global de materiais", "Global material extraction"), tr("Mil milhões de toneladas: biomassa, combustíveis fósseis, minérios e minerais.", "Billion tonnes: biomass, fossil fuels, ores and minerals.")) +
      fig("cPlastico", tr("Resíduos plásticos", "Plastic waste"), tr("Milhões de toneladas. O valor de 2060 é um cenário sem intervenções urgentes.", "Million tonnes. The 2060 value is a no-urgent-action scenario.")) +
      `</div>` +
      `<div class="srcs">${destCards}</div>`));

    html.push(sec("portugal-mundo", tr("7 · Portugal no mundo", "7 · Portugal in the world"), tr("Onde Portugal está em cada indicador", "Where Portugal stands on each indicator"),
      prose(tr("Cada linha compara o último valor de Portugal com o mundo e com a média da União Europeia, e diz em que lugar fica entre os Estados com dados. «Melhor» tem em conta o sentido de cada indicador (mais renováveis é melhor; mais poluição é pior), e a posição 1.º é a melhor. Nas renováveis na energia final, quotas muito altas em países pobres refletem muita lenha, por isso esta linha merece mais cautela. Esta ordenação não mede, por si só, o esforço nem o contexto de cada país.",
        "Each row compares Portugal’s latest value with the world and the European Union, and shows its place among states with data. “Better” takes each indicator’s direction into account (more renewables is better; more pollution is worse), and rank 1st is the best. For renewables in final energy, very high shares in poor countries reflect a lot of firewood, so that row deserves more caution. This ranking does not by itself measure each country’s effort or context.")) +
      `<figure><div class="tscroll full"><table id="tPT"></table></div><div class="src"><span>${tr("Fontes: ver «Fontes e método» no fim da página. Último ano disponível de cada série; os anos diferem entre indicadores.", "Sources: see “Sources and method” at the end of the page. Latest available year of each series; years differ between indicators.")}</span></div></figure>
      <figure id="fCmp"><figcaption><span class="t">${tr("Compara países", "Compare countries")}</span><span class="d">${tr("Escolhe um indicador e até quatro países. O mundo aparece sempre como referência.", "Choose an indicator and up to four countries. The world is always shown as a reference.")}</span></figcaption>
        <div class="controls" id="cmpCtl"></div><div class="chart" id="cCmp"></div><div class="src"><span id="sCmp"></span></div></figure>`));

    /* ---------- Portugal: território ---------- */
    const ps = PT.series_temporais, it = PT.indicadores_territoriais;
    const pv = (id) => Object.entries(ps[id].valores).filter(([, v]) => typeof v === "number").map(([y, v]) => ({ y: +y, v }));
    const burned = pv("area_ardida_continente"), temp = pv("temperatura_media_anual_continente").at(-1), rain = pv("precipitacao_anual_continente").at(-1);
    const deserts = it.suscetibilidade_desertificacao, coast = it.erosao_costeira, flood = it.areas_risco_inundacao, ghg = pv("emissoes_gases_efeito_estufa").at(-1);
    const farms = pv("exploracoes_agricolas"), sau = pv("superficie_agricola_utilizada"), fleet = pv("parque_veiculos_motorizados");
    const srcLine = (id) => (ps[id].fontes || []).map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.nome)} ↗</a>`).join(" · ");
    html.push(`<span id="portugal"></span>` + sec("leitura-local", tr("8 · Portugal: território e riscos", "8 · Portugal: land and risks"), tr("Continente, Açores e Madeira: fogo, desertificação, costa e campo", "Mainland, Azores and Madeira: fire, desertification, coast and farmland"),
      `<div class="tiles" id="ptTiles"></div>` +
      prose(
        tr(`Os dados nacionais disponíveis mostram três pressões claras: <strong>incêndios rurais</strong> muito variáveis (${fmt(Math.max(...burned.map((b) => b.v)))} ha em ${burned.find((b) => b.v === Math.max(...burned.map((x) => x.v))).y}, o pior ano da série), <strong>${fmt(deserts.valor, 1)}%</strong> do Continente com suscetibilidade alta ou muito elevada à desertificação e <strong>${fmt(coast.costa_baixa_arenosa_em_erosao_percent)}%</strong> da costa baixa e arenosa em erosão. Açores e Madeira não são misturados com o Continente quando não existe uma série comparável.`,
          `The national data show three clear pressures: highly variable <strong>rural fires</strong> (${fmt(Math.max(...burned.map((b) => b.v)))} ha in ${burned.find((b) => b.v === Math.max(...burned.map((x) => x.v))).y}, the worst year of the series), <strong>${fmt(deserts.valor, 1)}%</strong> of the mainland with high or very high susceptibility to desertification and <strong>${fmt(coast.costa_baixa_arenosa_em_erosao_percent)}%</strong> of the low sandy coast eroding. The Azores and Madeira are not mixed with the mainland when no comparable series exists.`)
      ) +
      `<div class="grid2">` +
      fig("cFogo", tr("Área ardida em incêndios rurais, Continente", "Area burned in rural fires, mainland"), tr("Hectares por ano. 2025 é provisório (apurado até 15 de outubro).", "Hectares per year. 2025 is provisional (counted up to 15 October).")) +
      fig("cAgri", tr("Explorações agrícolas e superfície agrícola utilizada", "Farms and utilised agricultural area"), tr("Índice, primeiro ano da série = 100. Há quebras entre recenseamentos.", "Index, first year of the series = 100. There are breaks between censuses.")) +
      `</div>` +
      `<div class="grid2"><figure><figcaption><span class="t">${tr("Suscetibilidade à desertificação (ISD 2024)", "Susceptibility to desertification (ISD 2024)")}</span><span class="d">${tr("% do território continental por classe.", "% of mainland territory by class.")}</span></figcaption><div id="cDes"></div><div class="src"><span>${deserts.fontes.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">${esc(f.nome)} ↗</a>`).join(" · ")}</span></div></figure>` +
      fig("cFrota", tr("Veículos motorizados em circulação", "Motor vehicles in circulation"), tr("Milhões. Anos disponíveis; sem interpolar os intermédios.", "Millions. Years available; no interpolation in between.")) + `</div>` +
      `<div class="callout">${tr(`<strong>Erosão costeira:</strong> cerca de ${fmt(coast.extensao_em_erosao_aproximada_km)} km dos ${fmt(coast.extensao_monitorizada_km)} km monitorizados estão em erosão, e perderam-se ${fmt(coast.perda_area_1958_2023_ha)} ha de área costeira entre 1958 e 2023. <strong>Cheias:</strong> ${flood.valor} áreas de risco potencial significativo no ciclo ${flood.periodo.replace(/^ciclo\s+/i, "")}. A superfície semiárida aumentou ${deserts.area_semiarida.variacao_percent}% entre ${deserts.area_semiarida.de} e ${deserts.area_semiarida.ate} (${deserts.area_semiarida.fonte}).`,
        `<strong>Coastal erosion:</strong> about ${fmt(coast.extensao_em_erosao_aproximada_km)} km of the ${fmt(coast.extensao_monitorizada_km)} km monitored are eroding, and ${fmt(coast.perda_area_1958_2023_ha)} ha of coastal area were lost between 1958 and 2023. <strong>Floods:</strong> ${flood.valor} areas of significant potential risk in the ${flood.periodo.replace(/^ciclo\s+/i, "")} cycle. Semi-arid area grew ${deserts.area_semiarida.variacao_percent}% between ${deserts.area_semiarida.de} and ${deserts.area_semiarida.ate} (${deserts.area_semiarida.fonte}).`)}</div>` +
      `<div class="claims" id="ptClaims"></div>`));

    box.innerHTML = html.join("");

    /* «Ver também»: do capítulo para as páginas temáticas que o desenvolvem. */
    const VER = {
      clima: [["/observatorio/limitar-ultrapassagem-1-5.html", tr("Depois de 1,5 °C: limitar a ultrapassagem", "After 1.5°C: limiting the overshoot")]],
      energia: [["/energia/energia.html", tr("Energia consciente", "Conscious energy")], ["/energia/transicao-etica.html", tr("Renováveis e território", "Renewables and territory")]],
      ar: [["/recursos/ar.html", tr("Ar", "Air")]],
      agua: [["/recursos/agua.html", tr("Água", "Water")]],
      "terra-vida": [["/recursos/solo.html", tr("Solo", "Soil")], ["/ecossistemas/biodiversidade.html", tr("Biodiversidade", "Biodiversity")]],
      materia: [["/energia/mineracao.html", tr("Mineração", "Mining")], ["/energia/pecuaria.html", tr("Pecuária", "Livestock")], ["/energia/digital.html", tr("Digital", "Digital")]]
    };
    Object.entries(VER).forEach(([id, links]) => {
      const sec_ = box.querySelector("#" + id);
      if (!sec_) return;
      sec_.insertAdjacentHTML("beforeend", `<p class="vermais"><span>${tr("Ver também", "See also")}</span>${links.map(([h, t]) => `<a href="${h}">${esc(t)} →</a>`).join("")}</p>`);
    });

    /* ================= preencher ================= */
    const $ = (s) => box.querySelector(s);
    const srcNote = (id, txt) => { const f = box.querySelector("#" + id)?.closest("figure"); const s = f && f.querySelector(".src span"); if (s && !s.innerHTML) s.innerHTML = txt; };

    /* tiles do sumário */
    $("#tTiles").innerHTML = [
      [fmt(co2L.v, 1), "ppm", tr("CO₂ atmosférico em " + co2L.a, "Atmospheric CO₂ in " + co2L.a), tr("eram " + fmt(co2F.v, 0) + " ppm em " + co2F.a, "was " + fmt(co2F.v, 0) + " ppm in " + co2F.a)],
      ["+" + fmt(dest.clima_2025.valor, 2), "°C", tr("acima de 1850–1900, em " + dest.clima_2025.ano, "above 1850–1900, in " + dest.clima_2025.ano), tr("Organização Meteorológica Mundial", "World Meteorological Organization")],
      [fmt(W.re.v, 1), "%", tr("da eletricidade mundial é renovável (" + W.re.y + ")", "of world electricity is renewable (" + W.re.y + ")"), tr("em Portugal, " + fmt(pt("eletricidade_renovavel").v, 1) + "%", "in Portugal, " + fmt(pt("eletricidade_renovavel").v, 1) + "%")],
      [fmt(W.pm.v, 1), "µg/m³", tr("PM2.5, exposição média mundial (" + W.pm.y + ")", "PM2.5, world average exposure (" + W.pm.y + ")"), tr("valor-guia da OMS: " + D1.PM_GUIDE, "WHO guideline: " + D1.PM_GUIDE)]
    ].map((t) => `<div class="tile"><span class="v">${t[0]}<small>${t[1]}</small></span><span class="k">${t[2]}</span><span class="s">${t[3]}</span></div>`).join("");

    /* dez conclusões */
    const F = T.findings();
    $("#tFindings").innerHTML = F.map((f, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><div class="ftxt">${f.html}</div>${f.mini}</li>`).join("");

    /* clima */
    const climaLine = (id, key, o = {}) => {
      const s = cs(key);
      line($("#" + id), { x: s.map((p) => p.a), series: [{ n: o.n, c: css(o.c || "--s2"), v: s.map((p) => p.v) }], zero: o.zero, points: true, yf: o.yf || ((v) => fmt(v, o.d || 0)), tf: (se, i) => fmt(se.v[i], o.d == null ? 1 : o.d), unit: o.unit, table: true, aria: o.n, h: o.h || 230 });
      srcNote(id, tr("Fonte: ", "Source: ") + o.src);
    };
    climaLine("cTemp", "temperatura_global", { n: tr("Desvio da temperatura", "Temperature departure"), zero: true, d: 2, unit: "°C", src: "NASA GISTEMP v4", h: 260, yf: (v) => fmt(v, 1) });
    climaLine("cCO2", "co2_mauna_loa", { n: "CO₂", zero: false, unit: "ppm", src: "NOAA GML, Mauna Loa", c: "--s1" });
    climaLine("cCH4", "metano_global", { n: tr("Metano", "Methane"), zero: false, unit: "ppb", src: "NOAA GML", c: "--s4" });
    climaLine("cMar", "nivel_medio_mar_satelite", { n: tr("Nível do mar", "Sea level"), zero: true, unit: "mm", src: "NASA / CNES / AVISO, altimetria por satélite", c: "--s1" });
    climaLine("cGelo", "gelo_marinho_artico_minimo", { n: tr("Mínimo anual", "Annual minimum"), zero: true, d: 1, unit: tr("milhões de km²", "million km²"), src: "NSIDC", c: "--s5" });

    /* energia */
    const ENE = ["eletricidade_renovavel", "renovavel_final", "acesso_eletricidade", "intensidade_energetica"];
    const drawEne = (k) => {
      lineGeo($("#cEne"), k, ["PRT", "EUU", "WLD", "HIC", "LIC"], { zero: k === "intensidade_energetica" ? false : true, d: k === "intensidade_energetica" ? 2 : 1, unit: k === "intensidade_energetica" ? "MJ/USD" : "%", yf: (v) => fmt(v, k === "intensidade_energetica" ? 1 : 0), ymax: k === "intensidade_energetica" ? null : 100 });
      $("#sEne").textContent = tr("Fonte: ", "Source: ") + IND[k].fonte + ". " + (k === "intensidade_energetica" ? tr("Menos energia por dólar de PIB é melhor.", "Less energy per dollar of GDP is better.") : "");
    };
    seg($("#segEne"), drawEne); drawEne(ENE[0]);
    ranking($("#rkEne"), ENE, { title: tr("Países no topo e no fundo", "Countries at the top and the bottom"), desc: tr("Estados soberanos, último ano com dados (máx. 5 anos de atraso).", "Sovereign states, latest year with data (at most 5 years behind)."), n: 12 });

    /* ar */
    lineGeo($("#cAr"), "pm25", ["PRT", "EUU", "WLD", "HIC", "UMC", "LMC", "LIC"], { zero: true, d: 1, unit: "µg/m³", cfg: { ref: D1.PM_GUIDE, refLabel: tr("Guia OMS 5", "WHO guideline 5") } });
    srcNote("cAr", tr("Fonte: ", "Source: ") + IND.pm25.fonte);
    const BC = ["--s3", "--s6", "--s4", "--s2", "--s8", "--s7"].map((v) => css(v));
    bands($("#cArBandas"), "pm25", [5, 10, 15, 25, 35], [tr("Até 5 (cumpre o guia)", "Up to 5 (meets guideline)"), "5–10", "10–15", "15–25", "25–35", tr("Mais de 35", "Over 35")], BC);
    srcNote("cArBandas", tr("Fonte: ", "Source: ") + IND.pm25.fonte + tr(". Faixas: valor-guia e metas intermédias das Diretrizes de Qualidade do Ar da OMS (2021).", ". Bands: guideline and interim targets of the WHO Air Quality Guidelines (2021)."));
    ranking($("#rkAr"), ["pm25", "mortalidade_ar"], { title: tr("Países mais e menos expostos", "Most and least exposed countries"), desc: tr("Estados soberanos, último ano com dados.", "Sovereign states, latest year with data."), n: 12 });

    /* água */
    const SB = ["--s3", "--s6", "--s4", "--s2", "--s8"].map((v) => css(v));
    bands($("#cAguaBandas"), "stress_hidrico", [25, 50, 75, 100], [tr("Sem stress (< 25%)", "No stress (< 25%)"), tr("Baixo (25–50%)", "Low (25–50%)"), tr("Médio (50–75%)", "Medium (50–75%)"), tr("Alto (75–100%)", "High (75–100%)"), tr("Crítico (> 100%)", "Critical (> 100%)")], SB);
    srcNote("cAguaBandas", tr("Fonte: FAO AQUASTAT, ODS 6.4.2. Classes do metadado oficial do indicador.", "Source: FAO AQUASTAT, SDG 6.4.2. Classes from the indicator’s official metadata."));
    lineGeo($("#cAguaLin"), "agua_potavel", ["PRT", "EUR", "WLD"], { zero: true, d: 1, unit: "%", ymax: 100 });
    srcNote("cAguaLin", tr("Fonte: ", "Source: ") + IND.agua_potavel.fonte);
    ranking($("#rkAgua"), ["stress_hidrico", "agua_potavel"], { title: tr("Países com mais e menos água", "Countries with more and less water"), desc: tr("Stress hídrico e acesso a água potável gerida em segurança.", "Water stress and access to safely managed drinking water."), n: 12 });

    /* solo e vida */
    lineGeo($("#cRLI"), "lista_vermelha", ["PRT", "EUR", "WLD"], { zero: false, d: 3, yf: (v) => fmt(v, 2) });
    srcNote("cRLI", tr("Fonte: ", "Source: ") + IND.lista_vermelha.fonte);
    lineGeo($("#cProt"), "area_protegida_terra", ["WLD", "PRT"], { zero: true, d: 1, unit: "%", cfg: { ref: gbf, refLabel: tr("Meta 2030: 30%", "2030 target: 30%"), ymax: 35 } });
    srcNote("cProt", tr("Fonte: ", "Source: ") + IND.area_protegida_terra.fonte + " · " + IND.area_protegida_mar.fonte + tr(". A linha mostra a terra; no mar, o mundo está em ", ". The line shows land; for the sea, the world is at ") + fmt(W.mp.v, 1) + "%.");
    ranking($("#rkTerra"), ["terra_degradada", "lista_vermelha", "area_protegida_terra", "area_protegida_mar"], { title: tr("Países por indicador de solo e de vida", "Countries by land and life indicator"), desc: tr("Terra degradada, risco de extinção e proteção do território.", "Degraded land, extinction risk and protection of territory."), n: 12 });

    /* matéria e resíduos */
    const SR = VET.series, pc = css("--s2"), dim = css("--bar-dim");
    hbars($("#cFloresta"), SR.floresta_global.mudanca_liquida.map((d) => ({ l: d.periodo + tr(" · líquida", " · net"), v: Math.abs(d.valor), c: css("--s6"), t: fmt(Math.abs(d.valor), 1) })).concat(SR.floresta_global.desflorestacao_bruta.map((d) => ({ l: d.periodo + tr(" · bruta", " · gross"), v: d.valor, c: css("--s8"), t: fmt(d.valor, 1) }))), { f: (v) => fmt(v, 1), table: [tr("Período", "Period"), tr("Milhões ha/ano", "Million ha/yr")], max: 12 });
    srcNote("cFloresta", tr("Fonte: ", "Source: ") + (fonte.FAO_FRA2020.titulo) + tr(". Verde: perda líquida; vermelho: desflorestação bruta.", ". Green: net loss; red: gross deforestation."));
    const ew = SR.residuos_eletronicos;
    hbars($("#cEwaste"), [{ l: "2010 *", v: ew.dados[0].valor_aproximado, c: css("--s4") }, { l: String(ew.dados[1].ano), v: ew.dados[1].valor, c: css("--s2") }, { l: ew.projecoes[0].ano + tr(" (projeção)", " (projection)"), v: ew.projecoes[0].valor, dim: true }], { f: (v) => fmt(v, v % 1 ? 1 : 0), table: [tr("Ano", "Year"), "Mt"] });
    srcNote("cEwaste", tr("Fonte: ", "Source: ") + fonte.ITU_EWASTE2024.titulo + tr(". * Valor derivado do aumento de 82% comunicado para 2010–2022. Só 22,3% foi documentado como reciclado em 2022.", ". * Value derived from the 82% increase reported for 2010–2022. Only 22.3% was documented as recycled in 2022."));
    const mt = SR.extracao_global_materiais;
    hbars($("#cMateriais"), mt.dados.map((d) => ({ l: String(d.ano), v: d.valor, c: d.ano === 2024 ? css("--s2") : css("--s4") })), { f: (v) => fmt(v, 1), table: [tr("Ano", "Year"), tr("Mil milhões t", "Billion t")] });
    srcNote("cMateriais", tr("Fonte: ", "Source: ") + fonte.UNEP_GRO2024.titulo + tr(`. Sem ação urgente, a procura projeta +${mt.projecoes[0].variacao_desde_2020_pct}% entre 2020 e ${mt.projecoes[0].ano}. Não se desenha curva anual a partir de dois pontos.`, `. Without urgent action, demand is projected to grow ${mt.projecoes[0].variacao_desde_2020_pct}% between 2020 and ${mt.projecoes[0].ano}. No annual curve is drawn from two points.`));
    const pl = SR.plasticos;
    hbars($("#cPlastico"), [{ l: String(pl.dados[0].ano), v: pl.dados[0].valor_aproximado, c: css("--s2") }, { l: pl.projecoes[0].ano + tr(" (cenário)", " (scenario)"), v: pl.projecoes[0].valor_aproximado, dim: true }], { f: (v) => fmt(v), table: [tr("Ano", "Year"), "Mt"] });
    srcNote("cPlastico", tr("Fonte: ", "Source: ") + fonte.UNEP_PLASTIC.titulo);

    /* Portugal e o mundo */
    const order = ["renovavel_final", "eletricidade_renovavel", "acesso_eletricidade", "intensidade_energetica", "pm25", "mortalidade_ar", "stress_hidrico", "agua_potavel", "terra_degradada", "lista_vermelha", "area_protegida_terra", "area_protegida_mar"];
    $("#tPT").innerHTML = `<thead><tr><th>${tr("Indicador", "Indicator")}</th><th>Portugal</th><th>${nm("WLD")}</th><th>${nm("EUU")}</th><th>${tr("Posição (1.º = melhor)", "Rank (1st = best)")}</th><th>${tr("Melhor do que", "Better than")}</th></tr></thead><tbody>` +
      order.map((k) => {
        const p = pt(k), w = wl(k), e = eu(k), rows = rowsOf(k); if (!p) return "";
        const sorted = rows.slice().sort((a, b) => (META[k].good ? b.v - a.v : a.v - b.v)), idx = sorted.findIndex((r) => r.c === "PRT");
        const better = rows.filter((r) => (META[k].good ? r.v < p.v : r.v > p.v)).length, worse = rows.filter((r) => (META[k].good ? r.v > p.v : r.v < p.v)).length;
        const share = better + worse ? better / rows.length * 100 : null;
        const cell = (l) => (l ? `${fv(k, l.v)} <small style="color:var(--muted)">${l.y}</small>` : "–");
        return `<tr><td>${esc(META[k].n)}</td><td><b>${cell(p)}</b></td><td>${cell(w)}</td><td>${cell(e)}</td><td>${idx >= 0 ? (idx + 1) + ".º / " + rows.length : "–"}</td><td>${share == null ? "–" : fmt(share, 0) + "%"}</td></tr>`;
      }).join("") + "</tbody>";

    /* comparador */
    const CMPK = order.filter((k) => k !== "mortalidade_ar");
    const countries = SOB.slice().sort((a, b) => nm(a).localeCompare(nm(b), EN ? "en" : "pt"));
    const defaults = ["PRT", "ESP", "DEU", "BRA"];
    $("#cmpCtl").innerHTML = `<select id="cmpK" aria-label="${tr("Indicador", "Indicator")}">${CMPK.map((k) => `<option value="${k}">${esc(META[k].n)}</option>`).join("")}</select>` +
      defaults.map((d, i) => `<select class="cmpC" aria-label="${tr("País", "Country")} ${i + 1}"><option value="">${tr("— nenhum —", "— none —")}</option>${countries.map((c) => `<option value="${c}"${c === d ? " selected" : ""}>${esc(nm(c))}</option>`).join("")}</select>`).join("");
    const drawCmp = () => {
      const k = $("#cmpK").value, cs_ = [...box.querySelectorAll(".cmpC")].map((s) => s.value).filter(Boolean);
      const codes = [...new Set(cs_)].concat(["WLD"]);
      lineGeo($("#cCmp"), k, codes, { zero: META[k].f(1).includes("%") ? true : false, d: k === "lista_vermelha" ? 3 : k === "intensidade_energetica" ? 2 : 1, unit: IND[k].un === "%" ? "%" : "", cfg: { points: true } });
      $("#sCmp").textContent = tr("Fonte: ", "Source: ") + IND[k].fonte;
    };
    $("#cmpK").addEventListener("change", drawCmp);
    box.querySelectorAll(".cmpC").forEach((s) => s.addEventListener("change", drawCmp));
    drawCmp();

    /* Portugal: território */
    $("#ptTiles").innerHTML = [
      [fmt(temp.v, 2), "°C", tr("temperatura média anual do Continente (" + temp.y + ")", "mainland mean annual temperature (" + temp.y + ")"), tr("precipitação: " + fmt(rain.v) + " mm", "rainfall: " + fmt(rain.v) + " mm")],
      [fmt(burned.at(-1).v), "ha", tr("área ardida em " + burned.at(-1).y + " (provisório)", "area burned in " + burned.at(-1).y + " (provisional)"), tr("pior ano da série: " + burned.reduce((a, b) => (b.v > a.v ? b : a)).y, "worst year of the series: " + burned.reduce((a, b) => (b.v > a.v ? b : a)).y)],
      [fmt(deserts.valor, 1), "%", tr("do Continente com suscetibilidade alta ou muito elevada à desertificação", "of the mainland with high or very high susceptibility to desertification"), tr("ISD 2024", "ISD 2024")],
      [fmt(ghg.v, 1), "Mt CO₂e", tr("emissões de gases com efeito de estufa em " + ghg.y + " (sem uso do solo)", "greenhouse gas emissions in " + ghg.y + " (excluding land use)"), tr("inventário nacional, sujeito a revisões", "national inventory, subject to revision")]
    ].map((t) => `<div class="tile"><span class="v">${t[0]}<small>${t[1]}</small></span><span class="k">${t[2]}</span><span class="s">${t[3]}</span></div>`).join("");
    hbars($("#cFogo"), burned.map((b) => ({ l: String(b.y) + (b.y === burned.at(-1).y ? " *" : ""), v: b.v, c: b.y === 2017 ? css("--s8") : css("--s2"), dim: b.y === burned.at(-1).y })), { f: (v) => fmt(v), unit: "ha", table: [tr("Ano", "Year"), "ha"] });
    srcNote("cFogo", tr("Fonte: ", "Source: ") + srcLine("area_ardida_continente") + tr(". * Valor provisório.", ". * Provisional value."));
    const idxS = (a) => a.map((p) => 100 * p.v / a[0].v);
    const ax = [...new Set(farms.map((p) => p.y).concat(sau.map((p) => p.y)))].sort((a, b) => a - b);
    const onAx = (a) => ax.map((y) => { const p = a.find((q) => q.y === y); return p ? 100 * p.v / a[0].v : null; });
    line($("#cAgri"), { x: ax, series: [{ n: tr("Explorações", "Farms"), c: css("--s2"), v: onAx(farms) }, { n: tr("Superfície agrícola utilizada", "Utilised agricultural area"), c: css("--s3"), v: onAx(sau) }], zero: false, endLabels: true, points: true, yf: (v) => fmt(v), tf: (se, i) => fmt(se.v[i], 0), table: true, aria: tr("Explorações e superfície agrícola", "Farms and agricultural area"), h: 250 });
    srcNote("cAgri", tr("Fonte: ", "Source: ") + srcLine("exploracoes_agricolas") + tr(". Em 1989 havia ", ". In 1989 there were ") + fmt(farms[0].v) + tr(" explorações e ", " farms and ") + fmt(sau[0].v) + " ha; " + tr("em ", "in ") + farms.at(-1).y + ": " + fmt(farms.at(-1).v) + tr(" explorações e ", " farms and ") + fmt(sau.at(-1).v) + " ha.");
    const dcl = deserts.classes_percent;
    $("#cDes").innerHTML = miniStack([
      { l: tr("Muito elevada", "Very high"), v: dcl.muito_elevada, c: css("--s8") }, { l: tr("Alta", "High"), v: dcl.alta, c: css("--s2") },
      { l: tr("Moderada", "Moderate"), v: dcl.moderada, c: css("--s4") }, { l: tr("Ligeira", "Slight"), v: dcl.ligeira, c: css("--s3") }
    ]);
    hbars($("#cFrota"), fleet.map((p) => ({ l: String(p.y), v: p.v / 1e6, c: css("--s1") })), { f: (v) => fmt(v, 2), unit: tr("milhões", "million"), table: [tr("Ano", "Year"), tr("Milhões", "Millions")] });
    srcNote("cFrota", tr("Fonte: ", "Source: ") + srcLine("parque_veiculos_motorizados") + tr(". Os valores de 2010–2014 e de 2024 vêm da mesma fonte, mas mudanças administrativas podem afetar quebras.", ". Values for 2010–2014 and 2024 come from the same source, but administrative changes can affect breaks."));
    const bMax = burned.reduce((x, y) => (y.v > x.v ? y : x)), bMin = burned.reduce((x, y) => (y.v < x.v ? y : x));
    const avg0 = sau[0].v / farms[0].v, avg1 = sau.at(-1).v / farms.at(-1).v;
    const CL = [
      [tr("Incêndios rurais", "Rural fires"), tr(`A área ardida no Continente oscila entre ${fmt(bMin.v)} ha (${bMin.y}) e ${fmt(bMax.v)} ha (${bMax.y}) nos ${burned.length} anos da série. Um ano extremo não faz tendência, e ${burned.at(-1).y} ainda é provisório.`, `Area burned on the mainland ranges from ${fmt(bMin.v)} ha (${bMin.y}) to ${fmt(bMax.v)} ha (${bMax.y}) across the ${burned.length} years of the series. One extreme year is not a trend, and ${burned.at(-1).y} is still provisional.`)],
      [tr("Campo e desertificação", "Farmland and desertification"), tr(`Entre ${farms[0].y} e ${farms.at(-1).y}, as explorações agrícolas desceram ${fmt((1 - farms.at(-1).v / farms[0].v) * 100)}% e a superfície agrícola utilizada ${fmt((1 - sau.at(-1).v / sau[0].v) * 100)}%: a exploração média passou de ${fmt(avg0, 1)} para ${fmt(avg1, 1)} ha. Menos explorações não quer dizer menos terra cultivada. Em paralelo, ${fmt(deserts.valor, 1)}% do Continente tem suscetibilidade alta ou muito elevada à desertificação.`, `Between ${farms[0].y} and ${farms.at(-1).y}, farms fell ${fmt((1 - farms.at(-1).v / farms[0].v) * 100)}% and utilised agricultural area ${fmt((1 - sau.at(-1).v / sau[0].v) * 100)}%: the average farm grew from ${fmt(avg0, 1)} to ${fmt(avg1, 1)} ha. Fewer farms does not mean less farmed land. Meanwhile, ${fmt(deserts.valor, 1)}% of the mainland has high or very high susceptibility to desertification.`)],
      [tr("Motorização e emissões", "Motorisation and emissions"), tr(`O parque de veículos motorizados em circulação passou de ${fmt(fleet[0].v / 1e6, 2)} milhões em ${fleet[0].y} para ${fmt(fleet.at(-1).v / 1e6, 2)} milhões em ${fleet.at(-1).y}. As emissões nacionais de gases com efeito de estufa (sem uso do solo) foram ${fmt(ghg.v, 1)} Mt CO₂e em ${ghg.y}; o inventário é revisto todos os anos.`, `The fleet of motor vehicles in circulation went from ${fmt(fleet[0].v / 1e6, 2)} million in ${fleet[0].y} to ${fmt(fleet.at(-1).v / 1e6, 2)} million in ${fleet.at(-1).y}. National greenhouse gas emissions (excluding land use) were ${fmt(ghg.v, 1)} Mt CO₂e in ${ghg.y}; the inventory is revised every year.`)]
    ];
    $("#ptClaims").innerHTML = CL.map((c) => `<div class="claim"><h3>${c[0]}</h3><p>${c[1]}</p></div>`).join("");
    /* ---------- fontes e método ---------- */
    const ptSrc = [...new Map(Object.values(ps).flatMap((x) => x.fontes || []).concat(deserts.fontes, coast.fontes).map((f) => [f.url, f])).values()];
    const link = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)} ↗</a>`;
    const SRC = [
      [tr("Banco Mundial · Indicadores de Desenvolvimento Mundial", "World Bank · World Development Indicators"), tr("Acesso a eletricidade (EG.ELC.ACCS.ZS), renováveis na energia final (EG.FEC.RNEW.ZS), intensidade energética (EG.EGY.PRIM.PP.KD), renováveis na eletricidade (EG.ELC.RNEW.ZS), áreas protegidas (ER.LND.PTLD.ZS, ER.MRN.PTMR.ZS), PM2.5 (EN.ATM.PM25.MC.M3) e mortalidade por poluição do ar (SH.STA.AIRP.P5). Os agregados (mundo, UE, grupos de rendimento) são os do próprio Banco Mundial.", "Access to electricity (EG.ELC.ACCS.ZS), renewables in final energy (EG.FEC.RNEW.ZS), energy intensity (EG.EGY.PRIM.PP.KD), renewables in electricity (EG.ELC.RNEW.ZS), protected areas (ER.LND.PTLD.ZS, ER.MRN.PTMR.ZS), PM2.5 (EN.ATM.PM25.MC.M3) and air-pollution mortality (SH.STA.AIRP.P5). Aggregates (world, EU, income groups) are the World Bank’s own."), "https://data.worldbank.org/"],
      [tr("ONU · Base de dados global dos indicadores ODS", "UN · SDG Indicators Global Database"), tr("Stress hídrico (6.4.2, FAO AQUASTAT), água potável gerida em segurança (6.1.1, OMS/UNICEF JMP), terra degradada (15.3.1, UNCCD) e Índice da Lista Vermelha (15.5.1, UICN e BirdLife International).", "Water stress (6.4.2, FAO AQUASTAT), safely managed drinking water (6.1.1, WHO/UNICEF JMP), degraded land (15.3.1, UNCCD) and Red List Index (15.5.1, IUCN and BirdLife International)."), "https://unstats.un.org/sdgs/dataportal"],
      [tr("Clima: NASA, NOAA e OMM", "Climate: NASA, NOAA and WMO"), tr("Temperatura (NASA GISTEMP v4), CO₂ e metano (NOAA GML), nível do mar (altimetria por satélite), gelo do Ártico (NSIDC) e aquecimento e subida do mar em períodos (OMM, Estado do Clima Global 2025).", "Temperature (NASA GISTEMP v4), CO₂ and methane (NOAA GML), sea level (satellite altimetry), Arctic ice (NSIDC) and warming and sea-level rise by period (WMO, State of the Global Climate 2025)."), "https://data.giss.nasa.gov/gistemp/"],
      [tr("Grandezas curadas", "Curated quantities"), tr("Materiais (UNEP), floresta (FAO FRA 2020), biodiversidade (IPBES), poluição do ar (OMS), resíduos eletrónicos (ITU), plásticos (UNEP) e centros de dados (IEA). Cada cartão do capítulo 6 liga à sua fonte.", "Materials (UNEP), forests (FAO FRA 2020), biodiversity (IPBES), air pollution (WHO), e-waste (ITU), plastics (UNEP) and data centres (IEA). Each card in chapter 6 links to its source."), "https://www.unep.org/resources/Global-Resource-Outlook-2024"],
      [tr("Referências usadas nas leituras", "Reference values used in the readings"), tr("Valor-guia e metas intermédias de PM2.5 (Diretrizes de Qualidade do Ar da OMS, 2021); classes de stress hídrico (metadados oficiais do ODS 6.4.2); meta de 30% de áreas protegidas em 2030 (Quadro Global de Biodiversidade de Kunming-Montreal, meta 3).", "PM2.5 guideline and interim targets (WHO Air Quality Guidelines, 2021); water-stress classes (official SDG 6.4.2 metadata); 30% protected-area target for 2030 (Kunming-Montreal Global Biodiversity Framework, target 3)."), "https://www.cbd.int/gbf"],
      [tr("Portugal", "Portugal"), tr("IPMA (clima), ICNF (incêndios rurais), APA (desertificação, erosão costeira, emissões), Pordata e INE (agricultura e veículos). As ligações de cada série estão por baixo dos gráficos do capítulo 8.", "IPMA (climate), ICNF (rural fires), APA (desertification, coastal erosion, emissions), Pordata and INE (agriculture and vehicles). Links for each series are below the charts in chapter 8."), "https://rea.apambiente.pt/"]
    ];
    const NOTES = [
      tr("<b>Que países entram.</b> Os rankings usam os 193 Estados independentes da tabela ISO 3166-1. Territórios dependentes, a Palestina e o Kosovo existem nos dados mas ficam fora das ordenações. Há microestados e ilhas com valores extremos (por exemplo, 100% de área marinha protegida), que distorcem os extremos: lê as ordenações como panorama, não como mérito.", "<b>Which countries.</b> Rankings use the 193 independent states of the ISO 3166-1 table. Dependent territories, Palestine and Kosovo exist in the data but are left out of the rankings. Micro-states and islands have extreme values (for example, 100% marine protected area) that distort the ends: read rankings as an overview, not as merit."),
      tr("<b>Último ano.</b> Cada país entra com o último valor publicado, no máximo cinco anos antes do mais recente do indicador. Os anos diferem entre indicadores e entre países, e vêm indicados.", "<b>Latest year.</b> Each country enters with its latest published value, at most five years before the indicator’s most recent year. Years differ between indicators and between countries, and are shown."),
      tr("<b>Nada é inventado.</b> Não interpolamos, não preenchemos lacunas e não calculamos médias: as linhas interrompem-se onde falta o valor, e o mundo, a UE e os grupos de rendimento são os agregados publicados pelas fontes.", "<b>Nothing is made up.</b> We do not interpolate, fill gaps or compute averages: lines break where the value is missing, and the world, the EU and the income groups are the aggregates published by the sources."),
      tr("<b>Médias escondem desigualdades.</b> Um valor nacional não diz o que se passa em cada região, estação do ano ou grupo de população. Água, ar e solo variam muito dentro de cada país.", "<b>Averages hide inequalities.</b> A national figure does not tell what happens in each region, season or population group. Water, air and land vary a lot within each country."),
      tr("<b>A posição de Portugal não mede esforço.</b> Depende da geografia, da economia e da estrutura energética, e «melhor» segue só o sentido de cada indicador.", "<b>Portugal’s position does not measure effort.</b> It depends on geography, economy and energy mix, and “better” follows only each indicator’s direction."),
      tr("<b>Revisões.</b> As fontes revêem séries passadas e os últimos anos são muitas vezes estimativas ou provisórios. Os dados mundiais deste relatório (energia, ar, água, solo, biodiversidade) são atualizados automaticamente uma vez por semana; o clima e as grandezas curadas são revistos à mão.", "<b>Revisions.</b> Sources revise past series and the latest years are often estimates or provisional. The world data in this report (energy, air, water, land, biodiversity) are updated automatically once a week; climate and curated quantities are reviewed by hand."),
      tr(`<b>Dados gerados em ${R.gerado}.</b> Ficheiro de séries por país: ${link("/data/observatorio-terra-relatorio.json", "observatorio-terra-relatorio.json")}.`, `<b>Data generated on ${R.gerado}.</b> Per-country series file: ${link("/data/observatorio-terra-relatorio.json", "observatorio-terra-relatorio.json")}.`)
    ];
    const fb = document.getElementById("relatorio-fontes");
    if (fb) {
      fb.innerHTML = sec("fontes", tr("Fontes e método", "Sources and method"), tr("Fontes, definições e limitações", "Sources, definitions and limitations"),
        `<div class="srcs">${SRC.map((x) => `<div class="srcc"><h3>${x[0]}</h3><p>${x[1]}</p><span class="u">${link(x[2], x[2].replace(/^https?:\/\//, ""))}</span></div>`).join("")}${ptSrc.length ? `<div class="srcc"><h3>${tr("Ligações das séries de Portugal", "Links for Portugal’s series")}</h3><p>${ptSrc.map((f) => link(f.url, f.nome)).join("<br>")}</p></div>` : ""}</div><ol class="notes">${NOTES.map((n) => `<li>${n}</li>`).join("")}</ol>`);
    }
  }
})();
