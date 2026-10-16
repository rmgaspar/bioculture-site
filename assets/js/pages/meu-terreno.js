/* Conhecimento para cuidar · O meu terreno (primeira fase).
   O visitante toca numa parcela (IFAP) ou desenha o contorno e recebe uma ficha com o tempo e o balanço da água
   (Open-Meteo), o solo (ISRIC SoilGrids), o perigo de incêndio (carta ICNF, via IFAP) e o uso do solo do parcelário (IFAP).
   Tudo é pedido do browser às fontes abertas; o desenho fica só no browser (localStorage). Nada é escrito à mão:
   os números vêm das fontes. Mapa: Leaflet (assets/vendor/leaflet). Gráficos: assets/js/biocultura-graficos.js. */
(function () {
  "use strict";

  /* ---------- cálculo (exportado para os testes) ---------- */
  const R_TERRA = 6371008.8;
  const rad = (x) => (x * Math.PI) / 180;

  /* anel = [[lat, lon], …] (aberto ou fechado) → m² (fórmula esférica; erro desprezável à escala de um terreno). */
  function areaAnelM2(anel) {
    if (!anel || anel.length < 3) return 0;
    let s = 0;
    for (let i = 0; i < anel.length; i++) {
      const a = anel[i], b = anel[(i + 1) % anel.length];
      s += rad(b[1] - a[1]) * (2 + Math.sin(rad(a[0])) + Math.sin(rad(b[0])));
    }
    return Math.abs((s * R_TERRA * R_TERRA) / 2);
  }
  /* polígono = [anel exterior, ...buracos] */
  const areaPoligonoM2 = (pol) => pol.reduce((t, a, i) => t + (i === 0 ? 1 : -1) * areaAnelM2(a), 0);

  /* Centroide de um anel, em metros locais (cai fora de polígonos muito côncavos, o que serve: só pedimos dados a um ponto). */
  function centroide(anel) {
    const n = anel.length;
    const lat0 = anel.reduce((t, p) => t + p[0], 0) / n, lon0 = anel.reduce((t, p) => t + p[1], 0) / n;
    const k = Math.cos(rad(lat0));
    let A = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      const x1 = (anel[i][1] - lon0) * k, y1 = anel[i][0] - lat0, x2 = (anel[(i + 1) % n][1] - lon0) * k, y2 = anel[(i + 1) % n][0] - lat0;
      const c = x1 * y2 - x2 * y1;
      A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
    }
    if (Math.abs(A) < 1e-14) return [lat0, lon0];
    A /= 2;
    return [lat0 + cy / (6 * A), lon0 + cx / (6 * A) / k];
  }

  function pontoNoAnel(lat, lon, anel) {
    let dentro = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const yi = anel[i][0], xi = anel[i][1], yj = anel[j][0], xj = anel[j][1];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  const pontoNoPoligono = (lat, lon, pol) => pontoNoAnel(lat, lon, pol[0]) && !pol.slice(1).some((b) => pontoNoAnel(lat, lon, b));

  /* Classe de textura USDA (sand, clay em %; silte = 100 − areia − argila). */
  const TEXTURAS = {
    sand: ["Areia", "Sand"], loamy_sand: ["Areia franca", "Loamy sand"], sandy_loam: ["Franco-arenoso", "Sandy loam"],
    loam: ["Franco", "Loam"], silt_loam: ["Franco-limoso", "Silt loam"], silt: ["Limo", "Silt"],
    sandy_clay_loam: ["Franco-argilo-arenoso", "Sandy clay loam"], clay_loam: ["Franco-argiloso", "Clay loam"],
    silty_clay_loam: ["Franco-argilo-limoso", "Silty clay loam"], sandy_clay: ["Argilo-arenoso", "Sandy clay"],
    silty_clay: ["Argilo-limoso", "Silty clay"], clay: ["Argila", "Clay"]
  };
  function texturaUSDA(sand, clay) {
    const silt = 100 - sand - clay;
    if (silt + 1.5 * clay < 15) return "sand";
    if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "loamy_sand";
    if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30)) return "sandy_loam";
    if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "loam";
    if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "silt_loam";
    if (silt >= 80 && clay < 12) return "silt";
    if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy_clay_loam";
    if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay_loam";
    if (clay >= 27 && clay < 40 && sand <= 20) return "silty_clay_loam";
    if (clay >= 35 && sand > 45) return "sandy_clay";
    if (clay >= 40 && silt >= 40) return "silty_clay";
    if (clay >= 40 && sand <= 45 && silt < 40) return "clay";
    return null;
  }

  /* Carta de perigosidade estrutural 2020–2030 (ICNF, servida pelo IFAP): cinco classes; 0 = sem classe. */
  const FOGO = [
    ["Sem classe", "No class"], ["Muito baixa", "Very low"], ["Baixa", "Low"], ["Média", "Medium"], ["Alta", "High"], ["Muito alta", "Very high"]
  ];

  /* Classes de ocupação do solo do parcelário (IFAP, Manual de Conceitos e Regras de Delimitação, fev. 2021, quadro 4.1; CHL-EP vem do anexo XIV da Portaria 54-E/2023, «Lagoas e charcas»). */
  const OCUPACAO = {
    "CTP-CA": ["Cultura temporária", "Annual crop"], "TCR-FL": ["Talhadia de curta duração", "Short-rotation coppice"],
    "PPE-PP": ["Pastagem permanente", "Permanent grassland"], "PPE-QU": ["Pastagem sob coberto de quercíneas", "Grassland under oaks"],
    "PPE-PM": ["Pastagem sob pinheiro manso ou castanheiro", "Grassland under stone pine or chestnut"], "PPE-OL": ["Pastagem sob olival", "Grassland under olive grove"],
    "PPE-MX": ["Pastagem sob coberto misto", "Grassland under mixed cover"], "PPE-AR": ["Pastagem arbustiva", "Shrubby grassland"],
    "PPE-PL": ["Pastagem de prática local", "Local-practice grassland"], "POM-PM": ["Cultura frutícola", "Orchard"], "VIN-VN": ["Vinha", "Vineyard"],
    "OLI-OL": ["Olival", "Olive grove"], "MXP-MX": ["Misto de culturas permanentes", "Mixed permanent crops"], "OUT-PE": ["Outras culturas permanentes", "Other permanent crops"],
    "SOB-CO": ["Sobreiros para cortiça", "Cork oaks"], "CAB-CP": ["Cabeceiras de culturas permanentes", "Headlands of permanent crops"], "CPR-OA": ["Culturas protegidas", "Protected crops"],
    "FFL-FL": ["Espaço florestal arborizado", "Forest"], "SAR-FL": ["Vegetação arbustiva", "Shrubland"], "FBQ-FL": ["Bosquete", "Small wood"],
    "ACE-ON": ["Aceiro florestal", "Forest firebreak"], "ZPC-ON": ["Zona de proteção ou conservação", "Protection or conservation area"],
    "GRP-FL": ["Galeria ripícola em espaço florestal", "Riparian gallery in forest"], "SAS-AS": ["Área social", "Built-up area"], "VIA-AS": ["Vias", "Roads"],
    "IMP-AI": ["Improdutivo", "Unproductive"], "MAG-ON": ["Massa de água", "Water body"], "ZPH-ON": ["Zona húmida", "Wetland"], "OUT-ON": ["Outras superfícies", "Other surfaces"],
    "OPC-ON": ["Ocupação por classificar", "Unclassified"], "CSS-ON": ["Cultura sem contacto com o solo", "Crops without soil contact"],
    "ARV-EC": ["Árvores ou culturas permanentes por classificar", "Trees or permanent crops to classify"], "FBQ-EP": ["Bosquete (elemento da paisagem)", "Small wood (landscape feature)"],
    "GRP-EP": ["Galeria ripícola (elemento da paisagem)", "Riparian gallery (landscape feature)"], "LAG-EL": ["Linha de água", "Watercourse"],
    "ORI-EL": ["Elemento linear em orizicultura", "Linear feature in rice growing"], "SCV-EL": ["Sebe ou corta-vento", "Hedge or windbreak"], "TLD-EL": ["Talude ou muro de suporte da vinha", "Vineyard bank or retaining wall"],
    "CHL-EP": ["Lagoa ou charca (elemento da paisagem)", "Pond or pool (landscape feature)"]
  };

  /* Balanço simples: chuva menos evapotranspiração de referência (mm) nos dias dados. */
  function balancoAgua(chuva, et0) {
    const soma = (a) => a.reduce((t, v) => t + (v || 0), 0);
    const c = soma(chuva), e = soma(et0);
    return { chuva: c, et0: e, saldo: c - e };
  }
  /* Mínima mais baixa dos dias dados e o índice em que ocorre. */
  function minimaMaisBaixa(tmin) {
    let m = null, idx = -1;
    tmin.forEach((v, i) => { if (v != null && (m == null || v < m)) { m = v; idx = i; } });
    return { min: m, idx };
  }
  /* Textura de 0–30 cm: média das três camadas do SoilGrids ponderada pela espessura (5, 10 e 15 cm). */
  function texturaDe030(camadas) {
    const w = [5, 10, 15];
    const med = (k) => camadas.reduce((t, c, i) => t + c[k] * w[i], 0) / w.reduce((a, b) => a + b, 0);
    const sand = med("sand"), clay = med("clay");
    return { sand, clay, silt: 100 - sand - clay, classe: texturaUSDA(sand, clay) };
  }
  /* Distância (km) entre dois pontos [lat, lon]. */
  function distanciaKm(a, b) {
    const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return (2 * R_TERRA * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000;
  }
  window.BioCulturaTerreno = { areaAnelM2, areaPoligonoM2, centroide, pontoNoAnel, pontoNoPoligono, texturaUSDA, texturaDe030, balancoAgua, minimaMaisBaixa, distanciaKm, OCUPACAO, FOGO, TEXTURAS };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-terreno");
  if (!G || !box || !window.L) return;
  const L = window.L;
  const { EN, tr, fmt, esc, tableView } = G;

  /* Versão inglesa do texto fixo da página (cabeçalho e navegação). */
  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "My plot — bioCulture";
  }
  fetch("/sidebar-content.html?v=24").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=17"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => (langQ ? href + (href.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) : href);
  const voltar = document.getElementById("terreno-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/calendario/conhecimento-cuidar.html"));

  /* ---------- serviços abertos ---------- */
  const IFAP_WFS = "https://www.ifap.pt/isip/ows/isip.data/wfs";
  const IFAP_WMS = "https://www.ifap.pt/isip/ows/isip.data/wms";
  const DGT_ORTOS = "https://cartografia.dgterritorio.gov.pt/wms/ortos2025";
  const json = async (url, ms = 25000) => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) { const e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return await r.json();
    } finally { clearTimeout(t); }
  };
  const cache = new Map();
  const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f().catch((e) => { cache.delete(k); throw e; })); return cache.get(k); };

  function wfs(camada, bbox, extra = {}) {
    const q = new URLSearchParams({ service: "WFS", version: "2.0.0", request: "GetFeature", typeNames: "isip.data:" + camada, outputFormat: "application/json", srsName: "EPSG:4326", bbox: `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]},urn:ogc:def:crs:EPSG::4326`, ...extra });
    return json(IFAP_WFS + "?" + q);
  }
  /* GeoJSON [lon, lat] → polígonos [[anel [lat, lon]…]…] */
  const polDe = (geom) => {
    const par = (ring) => ring.map((p) => [p[1], p[0]]);
    if (!geom) return [];
    if (geom.type === "Polygon") return [geom.coordinates.map(par)];
    if (geom.type === "MultiPolygon") return geom.coordinates.map((p) => p.map(par));
    return [];
  };
  async function parcelaEm(lat, lon, d = 0.00003) {
    const r = await wfs("parcelas.atual", [lat - d, lon - d, lat + d, lon + d], { count: "10" });
    const achadas = (r.features || []).map((f) => ({ pols: polDe(f.geometry), id: f.properties && f.properties.NPARCELA })).filter((p) => p.pols.length);
    return achadas.find((p) => p.pols.some((pol) => pontoNoPoligono(lat, lon, pol))) || null;
  }
  async function ocupacaoDe(parcela) {
    const todos = parcela.pols.flat(2);
    const la = todos.map((p) => p[0]), lo = todos.map((p) => p[1]);
    const r = await wfs("ocupacoes.solo.atual", [Math.min(...la), Math.min(...lo), Math.max(...la), Math.max(...lo)], { count: "400" });
    const por = {};
    let revisao = "";
    (r.features || []).forEach((f) => {
      const p = f.properties || {};
      if (p.NPARCELA !== parcela.id) return;
      por[p.CLASSE] = (por[p.CLASSE] || 0) + (p.AREA || 0);
      if (p.DATA_REVISAO && p.DATA_REVISAO > revisao) revisao = p.DATA_REVISAO;
    });
    return { classes: Object.entries(por).map(([c, a]) => ({ c, a })).sort((x, y) => y.a - x.a), revisao: revisao.slice(0, 10) };
  }
  async function perigoFogo(lat, lon) {
    const d = 0.00005;
    const r = await wfs("PERIGOSIDADE_INCENDIO_RURAL", [lat - d, lon - d, lat + d, lon + d], { count: "3", propertyName: "gridcode" });
    const cods = (r.features || []).map((f) => f.properties && f.properties.gridcode).filter((v) => v != null);
    return cods.length ? Math.max(...cods) : null;
  }
  const tempo = (lat, lon) => memo(`tempo:${lat.toFixed(2)},${lon.toFixed(2)}`, () => json("https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
    latitude: lat.toFixed(4), longitude: lon.toFixed(4), timezone: "auto", past_days: "14", forecast_days: "7",
    current: "temperature_2m,relative_humidity_2m", daily: "temperature_2m_min,temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration", hourly: "soil_moisture_0_to_7cm"
  })));
  const solo = (lat, lon) => memo(`solo:${lat.toFixed(3)},${lon.toFixed(3)}`, async () => {
    const q = "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=" + lon.toFixed(5) + "&lat=" + lat.toFixed(5) +
      "&property=phh2o&property=soc&property=clay&property=sand&property=silt&property=nitrogen&depth=0-5cm&depth=5-15cm&depth=15-30cm&value=mean&value=Q0.05&value=Q0.95";
    const r = await json(q, 40000);
    const camadas = r.properties.layers, out = [0, 1, 2].map(() => ({}));
    camadas.forEach((l) => l.depths.forEach((d, i) => {
      const f = l.unit_measure.d_factor || 1, v = d.values || {};
      if (v.mean == null) return;
      out[i][l.name] = v.mean / f; out[i][l.name + "_lo"] = v["Q0.05"] / f; out[i][l.name + "_hi"] = v["Q0.95"] / f;
    }));
    return out.every((c) => c.phh2o != null && c.sand != null) ? out : null;
  });
  const procurar = (q) => json("https://geocoding-api.open-meteo.com/v1/search?" + new URLSearchParams({ name: q, count: "6", language: EN ? "en" : "pt", format: "json" }), 15000);

  /* ---------- guardados (só neste browser) ---------- */
  const CHAVE = "biocultura_terrenos";
  const lerGuardados = () => { try { const v = JSON.parse(localStorage.getItem(CHAVE) || "[]"); return Array.isArray(v) ? v.slice(0, 5) : []; } catch (e) { return []; } };
  const gravarGuardados = (l) => { try { localStorage.setItem(CHAVE, JSON.stringify(l.slice(0, 5))); return true; } catch (e) { return false; } };

  /* ---------- página ---------- */
  const dec = (n, d) => fmt(n, d);
  const kmTxt = (m2) => (m2 >= 10000 ? dec(m2 / 10000, m2 >= 1e6 ? 0 : 2) + " ha" : dec(m2, 0) + " m²");
  const dataCurta = (iso) => { const p = iso.slice(0, 10).split("-"); return p[2] + "/" + p[1]; };
  const TRES_DIAS = 86400000;

  box.innerHTML = `
<section id="mapa">
  <div class="sec-head"><span class="eyebrow">${tr("1 · O mapa", "1 · The map")}</span><h2>${tr("Marca o teu terreno", "Mark your plot")}</h2></div>
  <div class="prose"><p>${tr("Em Portugal continental, <strong>toca numa parcela</strong> e o contorno vem do parcelário do IFAP. Em qualquer ponto do mundo, ou se o contorno não for o teu, <strong>desenha-o</strong> ponto a ponto. O desenho fica só neste browser.", "In mainland Portugal, <strong>tap a parcel</strong> and its outline comes from the IFAP parcel register. Anywhere in the world, or if the outline is not yours, <strong>draw it</strong> point by point. The drawing stays in this browser only.")}</p></div>
  <div class="t-barra">
    <form class="t-busca" id="t-busca" role="search">
      <input id="t-q" type="search" autocomplete="off" placeholder="${tr("Procurar localidade…", "Search for a place…")}" aria-label="${tr("Procurar localidade", "Search for a place")}">
      <button type="submit">${tr("Procurar", "Search")}</button>
      <button type="button" id="t-gps">${tr("A minha localização", "My location")}</button>
      <button type="button" id="t-exemplo">${tr("Ver um exemplo", "See an example")}</button>
    </form>
    <ul class="t-resultados" id="t-resultados" hidden></ul>
    <div class="t-opcoes">
      <div class="seg" id="t-base" role="group" aria-label="${tr("Fundo do mapa", "Map background")}">
        <button type="button" data-v="osm" aria-pressed="true">${tr("Mapa", "Map")}</button>
        <button type="button" data-v="orto" aria-pressed="false">${tr("Ortofoto", "Aerial")}</button>
        <button type="button" data-v="irg" aria-pressed="false">${tr("Infravermelho", "Infrared")}</button>
      </div>
      <div class="seg" role="group" aria-label="${tr("Camada de parcelas", "Parcel layer")}"><button type="button" id="t-parcelas" aria-pressed="true">${tr("Parcelas do IFAP", "IFAP parcels")}</button></div>
      <div class="seg" id="t-modo" role="group" aria-label="${tr("Modo", "Mode")}">
        <button type="button" data-v="parcela" aria-pressed="true">${tr("Tocar numa parcela", "Tap a parcel")}</button>
        <button type="button" data-v="desenho" aria-pressed="false">${tr("Desenhar o contorno", "Draw the outline")}</button>
      </div>
    </div>
    <div class="t-desenho" id="t-desenho" hidden>
      <button type="button" id="t-fechar" disabled>${tr("Fechar o contorno", "Close the outline")}</button>
      <button type="button" id="t-desfazer" disabled>${tr("Desfazer o último ponto", "Undo last point")}</button>
      <button type="button" id="t-limpar">${tr("Limpar", "Clear")}</button>
    </div>
  </div>
  <div id="t-mapa" class="t-mapa" role="application" aria-label="${tr("Mapa para marcar o terreno", "Map to mark the plot")}"></div>
  <p class="t-estado" id="t-estado" aria-live="polite">${tr("Aproxima o mapa até veres as parcelas (a partir do zoom 14) e toca numa.", "Zoom in until you see the parcels (from zoom 14) and tap one.")}</p>
  <div class="t-guardados" id="t-guardados" hidden></div>
</section>

<section id="ficha">
  <div class="sec-head"><span class="eyebrow">${tr("2 · A ficha", "2 · The sheet")}</span><h2>${tr("O que as fontes abertas dizem deste lugar", "What open sources say about this place")}</h2></div>
  <div id="t-ficha"><p class="av-vazio">${tr("Ainda não marcaste nenhum terreno. Escolhe uma parcela ou desenha o contorno no mapa acima, ou carrega em «Ver um exemplo».", "You have not marked a plot yet. Pick a parcel or draw an outline on the map above, or press “See an example”.")}</p></div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Limites e fontes", "3 · Limits and sources")}</span><h2>${tr("O que esta ficha não diz", "What this sheet does not tell")}</h2></div>
  <ol class="notes" id="t-notas"></ol>
  <div class="srcs" id="t-fontes"></div>
</section>`;

  document.getElementById("t-notas").innerHTML = [
    tr("<strong>O contorno é o do parcelário, não o do cadastro.</strong> As parcelas do IFAP servem para as ajudas agrícolas; podem não coincidir com a propriedade nem com a tua exploração. Não mostramos nem guardamos a quem pertence a parcela.", "<strong>The outline is the parcel register’s, not the land registry’s.</strong> IFAP parcels exist for farm payments; they may not match property or your holding. We do not show or store who the parcel belongs to."),
    tr("<strong>O uso do solo é o classificado no parcelário</strong> (fotointerpretação e declarações), na data de revisão indicada. Não diz o que lá está hoje.", "<strong>Land use is the one classified in the parcel register</strong> (photo-interpretation and declarations), on the review date shown. It does not say what is there today."),
    tr("<strong>O tempo vem de um modelo em grelha</strong> (Open-Meteo), não de um posto no teu terreno: a escala é de alguns quilómetros. A evapotranspiração é a de uma cultura de referência, não a da tua, e a humidade do solo (0–7 cm) é modelada.", "<strong>The weather comes from a gridded model</strong> (Open-Meteo), not a station on your plot: its scale is a few kilometres. Evapotranspiration is for a reference crop, not yours, and soil moisture (0–7 cm) is modelled."),
    tr("<strong>O solo é uma estimativa de 250 m</strong> (SoilGrids), com os intervalos de incerteza à vista; em Portugal o carbono orgânico, em particular, varia muito de campo para campo. Não substitui uma análise de laboratório.", "<strong>Soil is a 250 m estimate</strong> (SoilGrids), with its uncertainty ranges shown; in Portugal organic carbon in particular varies a lot from field to field. It does not replace a laboratory analysis."),
    tr("<strong>A perigosidade de incêndio é estrutural</strong> (carta 2020–2030, de cinco classes, da muito baixa à muito alta): diz como o território arde, não o risco de hoje, que é o do IPMA.", "<strong>Fire hazard is structural</strong> (2020–2030 map, five classes from very low to very high): it says how the land burns, not today’s risk, which is IPMA’s."),
    tr("<strong>As camadas do IFAP cobrem o continente.</strong> Nos Açores, na Madeira e fora de Portugal tens o tempo e o solo, mas não as parcelas, o uso do solo nem o fogo.", "<strong>IFAP layers cover mainland Portugal.</strong> In the Azores, Madeira and abroad you get weather and soil, but not parcels, land use or fire hazard."),
    tr("<strong>Privacidade.</strong> O desenho e os terrenos guardados ficam só no teu browser. Para os dados, o browser pede às fontes abaixo o ponto ou a zona que vês (o IFAP, o ISRIC, a Open-Meteo, o OpenStreetMap, a DGT, o Earth Search e a AWS); nós não recebemos nada.", "<strong>Privacy.</strong> The drawing and saved plots stay in your browser only. For the data, your browser asks the sources below for the point or area you are viewing (IFAP, ISRIC, Open-Meteo, OpenStreetMap, DGT, Earth Search and AWS); we receive nothing."),
    tr("<strong>O NDVI é do satélite, com pixéis de 10 m.</strong> Só contam os pixéis que a máscara da ESA dá como limpos (sem nuvens, sombras nem neve); por isso há semanas sem imagem, e um terreno muito pequeno fica com poucos pixéis. Não é o mesmo que a saúde da cultura: mostra o verde, e o verde muda com a estação e com a cultura.", "<strong>NDVI comes from the satellite, with 10 m pixels.</strong> Only pixels the ESA mask calls clear (no clouds, shadows or snow) count; so some weeks have no image, and a very small plot gets few pixels. It is not the same as crop health: it shows greenness, and greenness changes with the season and the crop."),
    tr("<strong>As imagens são lidas no teu browser.</strong> Pedimos só a janela do terreno às bandas vermelha e infravermelha de cada imagem (ficheiros públicos na AWS) e calculamos aqui o índice; não passa por nenhum servidor nosso. Contém dados modificados do Copernicus Sentinel.", "<strong>Images are read in your browser.</strong> We ask only for the plot’s window of each image’s red and near-infrared bands (public files on AWS) and compute the index here; nothing goes through a server of ours. Contains modified Copernicus Sentinel data.")
  ].map((t) => `<li>${t}</li>`).join("");

  const FONTES = [
    ["IFAP · Parcelário e ocupação do solo", "IFAP · Parcel register and land use", "Parcelas, subparcelas e classes de ocupação do solo (Manual de Conceitos e Regras de Delimitação, fev. 2021). Serviço WMS/WFS aberto, sem condições de acesso declaradas.", "Parcels, sub-parcels and land-use classes (Concepts and Delimitation Rules Manual, Feb. 2021). Open WMS/WFS service, no access conditions stated.", "https://www.ifap.pt/isip/ows"],
    ["ICNF · Carta de perigosidade de incêndio rural", "ICNF · Rural fire hazard map", "Carta de perigosidade estrutural 2020–2030, de cinco classes, servida pelo IFAP.", "Structural hazard map 2020–2030, five classes, served by IFAP.", "https://www.ifap.pt/isip/ows"],
    ["Open-Meteo · Tempo e geocodificação", "Open-Meteo · Weather and geocoding", "Temperatura, chuva, evapotranspiração de referência e humidade do solo modelada, em grelha. Dados CC BY 4.0, para uso não comercial.", "Temperature, rain, reference evapotranspiration and modelled soil moisture, gridded. Data CC BY 4.0, for non-commercial use.", "https://open-meteo.com/"],
    ["ISRIC · SoilGrids 2.0", "ISRIC · SoilGrids 2.0", "Propriedades do solo previstas a 250 m (pH, carbono orgânico, azoto, areia, silte, argila), com intervalos de incerteza. CC BY 4.0.", "Soil properties predicted at 250 m (pH, organic carbon, nitrogen, sand, silt, clay), with uncertainty ranges. CC BY 4.0.", "https://www.isric.org/explore/soilgrids"],
    ["DGT · Ortofotomapa 2025", "DGT · Orthophoto map 2025", "Ortofotos RGB e infravermelho de Portugal continental (Direção-Geral do Território), serviço WMS aberto.", "RGB and infrared orthophotos of mainland Portugal (Directorate-General for Territory), open WMS service.", "https://www.dgterritorio.gov.pt/"],
    ["Copernicus Sentinel-2 · Imagens e NDVI", "Copernicus Sentinel-2 · Images and NDVI", "Imagens Sentinel-2 L2A de 10 m (ESA/Copernicus, dados abertos), pesquisadas no catálogo Earth Search (Element 84) e lidas dos ficheiros COG públicos na AWS com geotiff.js. Contém dados modificados do Copernicus Sentinel.", "10 m Sentinel-2 L2A images (ESA/Copernicus, open data), searched in the Earth Search catalogue (Element 84) and read from the public COG files on AWS with geotiff.js. Contains modified Copernicus Sentinel data.", "https://registry.opendata.aws/sentinel-2-l2a-cogs/"],
    ["OpenStreetMap · Fundo do mapa", "OpenStreetMap · Map background", "© contribuidores do OpenStreetMap (ODbL). Mapa interativo com Leaflet (BSD-2).", "© OpenStreetMap contributors (ODbL). Interactive map with Leaflet (BSD-2).", "https://www.openstreetmap.org/copyright"]
  ];
  document.getElementById("t-fontes").innerHTML = FONTES.map((f) => `<div class="srcc"><h3>${tr(f[0], f[1])}</h3><p>${tr(f[2], f[3])}</p><span class="u"><a href="${f[4]}" target="_blank" rel="noopener">${f[4]}</a></span></div>`).join("");

  /* ---------- mapa ---------- */
  const estado = document.getElementById("t-estado");
  const dizer = (t) => { estado.textContent = t; };
  const map = L.map("t-mapa", { center: [39.6, -8.0], zoom: 7, minZoom: 3, maxZoom: 19, worldCopyJump: true });
  const bases = {
    osm: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© <a href=\"https://www.openstreetmap.org/copyright\" target=\"_blank\" rel=\"noopener\">OpenStreetMap</a>" }),
    orto: L.tileLayer.wms(DGT_ORTOS, { layers: "Ortos2025-RGB", format: "image/jpeg", version: "1.3.0", maxZoom: 19, attribution: "Ortofotomapa 2025 © DGT" }),
    irg: L.tileLayer.wms(DGT_ORTOS, { layers: "Ortos2025-IRG", format: "image/jpeg", version: "1.3.0", maxZoom: 19, attribution: "Ortofotomapa 2025 (infravermelho) © DGT" })
  };
  let baseAtual = "osm";
  bases.osm.addTo(map);
  const parcelasWms = L.tileLayer.wms(IFAP_WMS, { layers: "isip.data:parcelas.atual", format: "image/png", transparent: true, version: "1.3.0", minZoom: 14, maxZoom: 19, attribution: "Parcelário © IFAP" }).addTo(map);
  map.createPane("ndvi").style.zIndex = 350; // por cima das parcelas e da ortofoto, por baixo do contorno
  let camadaNdvi = null;
  const camadaSel = L.layerGroup().addTo(map);
  const camadaDes = L.layerGroup().addTo(map);

  const segBotoes = (el, f) => el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); f(b.dataset.v); }));
  segBotoes(document.getElementById("t-base"), (v) => {
    map.removeLayer(bases[baseAtual]); baseAtual = v; bases[v].addTo(map).bringToBack();
    if (v !== "osm") dizer(tr("As ortofotos cobrem só Portugal continental e aparecem a partir do zoom 14. No infravermelho, a vegetação viva aparece a vermelho.", "Aerial imagery covers mainland Portugal only and appears from zoom 14. In infrared, living vegetation shows red."));
  });
  document.getElementById("t-parcelas").addEventListener("click", (e) => {
    const lig = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", String(lig));
    if (lig) parcelasWms.addTo(map); else map.removeLayer(parcelasWms);
  });

  let modo = "parcela", pontos = [];
  const desenhoBox = document.getElementById("t-desenho");
  const btnFechar = document.getElementById("t-fechar"), btnDesfazer = document.getElementById("t-desfazer");
  segBotoes(document.getElementById("t-modo"), (v) => {
    modo = v; desenhoBox.hidden = v !== "desenho";
    if (v === "desenho") { dizer(tr("Toca no mapa para pôr os pontos do contorno (pelo menos 3) e carrega em «Fechar o contorno».", "Tap the map to place the outline points (at least 3) and press “Close the outline”.")); }
    else { limparDesenho(); dizer(tr("Aproxima o mapa até veres as parcelas (a partir do zoom 14) e toca numa.", "Zoom in until you see the parcels (from zoom 14) and tap one.")); }
  });
  function pintarDesenho() {
    camadaDes.clearLayers();
    if (pontos.length > 1) L.polyline(pontos, { color: "#9a5a3c", weight: 3, dashArray: "6 5" }).addTo(camadaDes);
    pontos.forEach((p) => L.circleMarker(p, { radius: 5, color: "#9a5a3c", weight: 2, fillColor: "#fff", fillOpacity: 1 }).addTo(camadaDes));
    btnFechar.disabled = pontos.length < 3; btnDesfazer.disabled = !pontos.length;
  }
  function limparDesenho() { pontos = []; pintarDesenho(); }
  btnDesfazer.addEventListener("click", () => { pontos.pop(); pintarDesenho(); });
  document.getElementById("t-limpar").addEventListener("click", () => { limparDesenho(); camadaSel.clearLayers(); });
  btnFechar.addEventListener("click", () => {
    if (pontos.length < 3) return;
    const anel = pontos.map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]);
    limparDesenho();
    selecionar({ tipo: "desenho", pols: [[anel]], nome: tr("Contorno desenhado", "Drawn outline") });
  });

  map.on("click", async (e) => {
    const lat = e.latlng.lat, lon = e.latlng.lng;
    if (modo === "desenho") { pontos.push([lat, lon]); pintarDesenho(); return; }
    await escolherPonto(lat, lon);
  });

  async function escolherPonto(lat, lon, nome) {
    if (map.getZoom() < 14) dizer(tr("A procurar a parcela… (aproxima mais o mapa para veres os contornos)", "Looking for the parcel… (zoom in further to see the outlines)"));
    else dizer(tr("A procurar a parcela…", "Looking for the parcel…"));
    try {
      const p = await parcelaEm(lat, lon);
      if (p) { selecionar({ tipo: "parcela", pols: p.pols, id: p.id, ponto: [lat, lon], nome: nome || tr("Parcela do IFAP", "IFAP parcel") }); return; }
      dizer(tr("Não há parcela do IFAP neste ponto (ou estás fora do continente): usei o ponto. Desenha o contorno se queres a área.", "There is no IFAP parcel at this point (or you are outside the mainland): I used the point. Draw the outline if you want the area."));
    } catch (err) {
      dizer(tr("Não consegui falar com o IFAP agora: usei só o ponto.", "Could not reach IFAP right now: I used the point only."));
    }
    selecionar({ tipo: "ponto", pols: [], ponto: [lat, lon], nome: nome || tr("Ponto no mapa", "Point on the map") });
  }

  /* ---------- procurar, GPS, exemplo ---------- */
  const lista = document.getElementById("t-resultados");
  document.getElementById("t-busca").addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = document.getElementById("t-q").value.trim();
    if (q.length < 2) return;
    lista.hidden = false; lista.innerHTML = `<li class="t-nada">${tr("A procurar…", "Searching…")}</li>`;
    try {
      const r = await procurar(q), res = r.results || [];
      lista.innerHTML = res.length ? res.map((x, i) => `<li><button type="button" data-i="${i}">${esc(x.name)}<small>${esc([x.admin2, x.admin1, x.country].filter(Boolean).join(", "))}</small></button></li>`).join("") : `<li class="t-nada">${tr("Nada encontrado.", "Nothing found.")}</li>`;
      lista.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const x = res[+b.dataset.i]; lista.hidden = true; map.setView([x.latitude, x.longitude], 14);
        dizer(tr(`${x.name}: aproxima e toca numa parcela.`, `${x.name}: zoom in and tap a parcel.`));
      }));
    } catch (err) { lista.innerHTML = `<li class="t-nada">${tr("A pesquisa não está disponível agora.", "Search is not available right now.")}</li>`; }
  });
  document.getElementById("t-gps").addEventListener("click", () => {
    if (!navigator.geolocation || !window.isSecureContext) { dizer(tr("Este browser não permite usar a localização.", "This browser does not allow using your location.")); return; }
    dizer(tr("A obter a tua localização…", "Getting your location…"));
    navigator.geolocation.getCurrentPosition((pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 16); dizer(tr("Estás aqui. Toca na parcela que queres ler.", "You are here. Tap the parcel you want to read.")); },
      () => dizer(tr("Não foi possível obter a localização (permissão recusada?).", "Could not get your location (permission denied?).")), { enableHighAccuracy: true, timeout: 15000 });
  });
  document.getElementById("t-exemplo").addEventListener("click", async () => {
    dizer(tr("A abrir um exemplo no Alentejo…", "Opening an example in the Alentejo…"));
    map.setView([38.5503, -7.9496], 16);
    try {
      const r = await wfs("parcelas.atual", [38.5495, -7.9505, 38.5510, -7.9485], { count: "20" });
      const ps = (r.features || []).map((f) => ({ pols: polDe(f.geometry), id: f.properties && f.properties.NPARCELA })).filter((p) => p.pols.length).sort((a, b) => areaPoligonoM2(b.pols[0]) - areaPoligonoM2(a.pols[0]));
      if (!ps.length) throw new Error("sem parcelas");
      const c = centroide(ps[0].pols[0][0]);
      const p = pontoNoPoligono(c[0], c[1], ps[0].pols[0]) ? c : ps[0].pols[0][0][0];
      selecionar({ tipo: "parcela", pols: ps[0].pols, id: ps[0].id, ponto: p, nome: tr("Exemplo: parcela no Alentejo", "Example: parcel in the Alentejo") });
    } catch (err) { dizer(tr("Não consegui abrir o exemplo agora. Tenta tocar numa parcela no mapa.", "Could not open the example now. Try tapping a parcel on the map.")); }
  });

  /* ---------- guardados ---------- */
  const caixaGuardados = document.getElementById("t-guardados");
  let atual = null;
  function pintarGuardados() {
    const l = lerGuardados();
    caixaGuardados.hidden = !l.length;
    if (!l.length) return;
    caixaGuardados.innerHTML = `<span class="t-gt">${tr("Guardados neste browser", "Saved in this browser")}</span>` + l.map((g, i) => `<span class="t-chip"><button type="button" data-abrir="${i}">${esc(g.nome)}</button><button type="button" class="x" data-apagar="${i}" aria-label="${tr("Apagar", "Delete")} ${esc(g.nome)}">×</button></span>`).join("");
    caixaGuardados.querySelectorAll("[data-abrir]").forEach((b) => b.addEventListener("click", () => abrirGuardado(lerGuardados()[+b.dataset.abrir])));
    caixaGuardados.querySelectorAll("[data-apagar]").forEach((b) => b.addEventListener("click", () => { const l2 = lerGuardados(); l2.splice(+b.dataset.apagar, 1); gravarGuardados(l2); pintarGuardados(); }));
  }
  async function abrirGuardado(g) {
    if (!g) return;
    if (g.tipo === "desenho") selecionar({ tipo: "desenho", pols: [[g.anel]], nome: g.nome });
    else await escolherPonto(g.ponto[0], g.ponto[1], g.nome);
  }
  function guardarAtual(nome) {
    if (!atual) return false;
    const l = lerGuardados();
    const reg = { nome: (nome || atual.nome).slice(0, 40), tipo: atual.tipo === "desenho" ? "desenho" : "ponto" };
    if (atual.tipo === "desenho") reg.anel = atual.pols[0][0].map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]);
    else reg.ponto = [+atual.ponto[0].toFixed(6), +atual.ponto[1].toFixed(6)];
    if (l.length >= 5) l.shift();
    l.push(reg);
    return gravarGuardados(l);
  }

  /* ---------- seleção e ficha ---------- */
  let ficheiro = 0;
  function selecionar(t) {
    const id = ++ficheiro;
    atual = t;
    camadaSel.clearLayers();
    if (camadaNdvi) { map.removeLayer(camadaNdvi); camadaNdvi = null; }
    if (t.pols.length) {
      const poly = L.polygon(t.pols.map((p) => p.map((r) => r)), { color: "#2f8035", weight: 3, fillColor: "#2f8035", fillOpacity: 0.18 }).addTo(camadaSel);
      map.fitBounds(poly.getBounds(), { maxZoom: 17, padding: [30, 30] });
    }
    t.areaM2 = t.pols.length ? t.pols.reduce((s, p) => s + areaPoligonoM2(p), 0) : 0;
    t.centro = t.pols.length ? centroide(t.pols.reduce((m, p) => (areaAnelM2(p[0]) > areaAnelM2(m[0]) ? p : m))[0]) : t.ponto;
    if (!t.ponto) t.ponto = t.centro;
    if (!t.pols.length) L.circleMarker(t.ponto, { radius: 8, color: "#2f8035", weight: 3, fillColor: "#fff", fillOpacity: 0.9 }).addTo(camadaSel), map.setView(t.ponto, Math.max(map.getZoom(), 15));
    dizer(tr(`${t.nome}${t.areaM2 ? ", " + kmTxt(t.areaM2) : ""}: a ficha está mais abaixo.`, `${t.nome}${t.areaM2 ? ", " + kmTxt(t.areaM2) : ""}: the sheet is below.`));
    construirFicha(t, id);
  }

  const celula = (cls, titulo, corpo) => `<div class="t-cartao ${cls}"><h3>${titulo}</h3><div class="t-corpo">${corpo}</div></div>`;
  const aCarregar = () => `<p class="t-carga">${tr("A carregar…", "Loading…")}</p>`;
  const semDado = (t) => `<p class="t-sem">${t}</p>`;

  function construirFicha(t, id) {
    const ficha = document.getElementById("t-ficha");
    const [lat, lon] = t.centro;
    const coord = `${dec(Math.abs(lat), 4)}° ${lat >= 0 ? "N" : "S"}, ${dec(Math.abs(lon), 4)}° ${lon >= 0 ? "E" : "W"}`;
    ficha.innerHTML = `
<div class="t-cab">
  <div><strong class="t-nome">${esc(t.nome)}</strong><span class="t-meta">${t.areaM2 ? kmTxt(t.areaM2) + " · " : ""}${coord}<span id="t-alt"></span></span></div>
  <div class="t-acoes">
    <form class="t-guardar" id="t-guardar"><input id="t-nome" type="text" maxlength="40" placeholder="${tr("Nome (opcional)", "Name (optional)")}" aria-label="${tr("Nome do terreno", "Plot name")}"><button type="submit">${tr("Guardar neste browser", "Save in this browser")}</button></form>
    <button type="button" id="t-cal">${tr("Calendário para este lugar →", "Calendar for this place →")}</button>
  </div>
</div>
<div class="t-tiles tiles" id="t-tiles"></div>
<div class="t-grelha">
  ${celula("t-agua", tr("Tempo e balanço da água", "Weather and water balance"), `<div id="t-agua">${aCarregar()}</div>`)}
  ${celula("t-ndvi", tr("Vegetação vista do espaço (NDVI)", "Vegetation seen from space (NDVI)"), `<div id="t-ndvi">${aCarregar()}</div>`)}
  ${celula("t-solo", tr("Solo", "Soil"), `<div id="t-solo">${aCarregar()}</div>`)}
  ${celula("t-fogo", tr("Perigo de incêndio", "Fire hazard"), `<div id="t-fogo">${aCarregar()}</div>`)}
  ${celula("t-uso", tr("Uso do solo no parcelário", "Land use in the parcel register"), `<div id="t-uso">${aCarregar()}</div>`)}
</div>
<div class="t-leitura" id="t-leitura" hidden><h3>${tr("Pistas para o terreno", "Clues for the plot")}</h3><ul id="t-pistas"></ul><p class="t-nota">${tr("São hipóteses a confirmar no terreno, a partir dos números acima; não são recomendações técnicas.", "These are hypotheses to confirm on the ground, based on the numbers above; they are not technical recommendations.")}</p></div>`;

    document.getElementById("t-guardar").addEventListener("submit", (e) => {
      e.preventDefault();
      const ok = guardarAtual(document.getElementById("t-nome").value.trim());
      dizer(ok ? tr("Guardado só neste browser.", "Saved in this browser only.") : tr("Não foi possível guardar (o browser bloqueia o armazenamento).", "Could not save (the browser blocks storage)."));
      pintarGuardados();
    });
    document.getElementById("t-cal").addEventListener("click", () => irCalendario(t.centro));

    const ctx = { t, fogo: null, agua: null, textura: null, pH: null };
    const vivo = () => id === ficheiro;
    const pistas = () => { if (vivo()) pintarPistas(ctx); };

    tempo(lat, lon).then((d) => {
      if (!vivo()) return;
      ctx.agua = pintarTempo(d);
      pistas();
    }).catch(() => { if (vivo()) document.getElementById("t-agua").innerHTML = semDado(tr("O serviço do tempo não respondeu. Tenta daqui a pouco.", "The weather service did not respond. Try again shortly.")); });

    solo(lat, lon).then((s) => {
      if (!vivo()) return;
      const r = pintarSolo(s);
      ctx.textura = r && r.textura; ctx.pH = r && r.pH;
      pistas();
    }).catch((e) => { if (vivo()) document.getElementById("t-solo").innerHTML = semDado(e && e.status === 429 ? tr("O serviço do solo tem um limite de pedidos por minuto; tenta daqui a um minuto.", "The soil service limits requests per minute; try again in a minute.") : tr("O serviço do solo não respondeu. Tenta daqui a pouco.", "The soil service did not respond. Try again shortly.")); });

    perigoFogo(lat, lon).then((g) => {
      if (!vivo()) return;
      ctx.fogo = g; pintarFogo(g); pistas();
    }).catch(() => { if (vivo()) document.getElementById("t-fogo").innerHTML = semDado(tr("Sem resposta do IFAP, ou fora do continente.", "No answer from IFAP, or outside the mainland.")); });

    pintarNdvi(t, ctx, vivo, pistas);

    if (t.tipo === "parcela" && t.id) {
      ocupacaoDe(t).then((o) => { if (vivo()) pintarUso(o); }).catch(() => { if (vivo()) document.getElementById("t-uso").innerHTML = semDado(tr("O IFAP não respondeu. Tenta daqui a pouco.", "IFAP did not respond. Try again shortly.")); });
    } else {
      document.getElementById("t-uso").innerHTML = semDado(t.tipo === "desenho" ? tr("Só para parcelas do IFAP: o contorno desenhado não tem uso do solo no parcelário.", "Only for IFAP parcels: a drawn outline has no land use in the register.") : tr("Sem parcela do IFAP neste ponto.", "No IFAP parcel at this point."));
    }
  }

  /* Tempo: tiles, gráfico e devolve o que as pistas usam. */
  function pintarTempo(d) {
    const dia = d.daily, n = dia.time.length, hoje = 14;
    const passado = (a) => a.slice(0, hoje), futuro = (a) => a.slice(hoje, hoje + 7);
    const b14 = balancoAgua(passado(dia.precipitation_sum), passado(dia.et0_fao_evapotranspiration));
    const prox = balancoAgua(futuro(dia.precipitation_sum), futuro(dia.et0_fao_evapotranspiration));
    const mn = minimaMaisBaixa(futuro(dia.temperature_2m_min));
    const horaAtual = (d.current && d.current.time ? d.current.time.slice(0, 13) + ":00" : "");
    let hi = d.hourly.time.indexOf(horaAtual); if (hi < 0) hi = d.hourly.time.length - 1 - 24 * 6;
    const hum = d.hourly.soil_moisture_0_to_7cm[hi];
    const alt = document.getElementById("t-alt");
    if (alt && d.elevation != null) alt.textContent = ` · ${tr("altitude do modelo", "model elevation")} ${dec(d.elevation, 0)} m`;
    const sinal = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + dec(Math.abs(v), 0);
    document.getElementById("t-tiles").innerHTML = [
      [d.current ? dec(d.current.temperature_2m, 1) : "–", "°C", tr("agora no ar", "now, air"), d.current ? tr(`humidade do ar ${dec(d.current.relative_humidity_2m, 0)}%`, `air humidity ${dec(d.current.relative_humidity_2m, 0)}%`) : ""],
      [mn.min != null ? dec(mn.min, 1) : "–", "°C", tr("mínima mais baixa nos próximos 7 dias", "lowest minimum in the next 7 days"), mn.idx >= 0 ? tr(`a ${dataCurta(futuro(dia.time)[mn.idx])}`, `on ${dataCurta(futuro(dia.time)[mn.idx])}`) : ""],
      [dec(prox.chuva, 0), "mm", tr("chuva prevista nos próximos 7 dias", "rain forecast for the next 7 days"), tr(`evapotranspiração ${dec(prox.et0, 0)} mm`, `evapotranspiration ${dec(prox.et0, 0)} mm`)],
      [sinal(b14.saldo), "mm", tr("balanço dos últimos 14 dias", "balance of the last 14 days"), tr(`chuva ${dec(b14.chuva, 0)} − evapotranspiração ${dec(b14.et0, 0)}`, `rain ${dec(b14.chuva, 0)} − evapotranspiration ${dec(b14.et0, 0)}`)],
      [hum != null ? dec(hum * 100, 0) : "–", "%", tr("humidade do solo, 0–7 cm (modelada)", "soil moisture, 0–7 cm (modelled)"), tr("água em volume", "water by volume")]
    ].map((x) => `<div class="tile"><span class="v">${x[0]}${x[1] ? `<small>${x[1]}</small>` : ""}</span><span class="k">${x[2]}</span><span class="s">${x[3]}</span></div>`).join("");
    const alvo = document.getElementById("t-agua");
    alvo.innerHTML = `<div class="legend"><span><i style="background:#2a78d6"></i>${tr("Chuva (mm/dia)", "Rain (mm/day)")}</span><span class="ln"><i style="background:#eb6834"></i>${tr("Evapotranspiração de referência (mm/dia)", "Reference evapotranspiration (mm/day)")}</span></div><div class="chart" id="t-graf-agua"></div><p class="t-nota">${tr("Os 14 dias antes de hoje e os 7 seguintes (a zona mais clara é previsão).", "The 14 days before today and the next 7 (the lighter area is forecast).")}</p>`;
    const graf = document.getElementById("t-graf-agua");
    const desenhar = () => graficoAgua(graf, dia.time.slice(0, n), dia.precipitation_sum, dia.et0_fao_evapotranspiration, hoje);
    desenhar();
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (graf._w !== graf.clientWidth) { graf._w = graf.clientWidth; desenhar(); } }); ro.observe(graf); }
    tableView(graf, [tr("Dia", "Day"), tr("Chuva (mm)", "Rain (mm)"), tr("Evapotranspiração (mm)", "Evapotranspiration (mm)"), tr("Mínima (°C)", "Minimum (°C)")],
      dia.time.map((dd, i) => [dataCurta(dd) + (i >= hoje ? "" : ""), dec(dia.precipitation_sum[i], 1), dec(dia.et0_fao_evapotranspiration[i], 1), dec(dia.temperature_2m_min[i], 1)]));
    return { b14, prox, minima: mn.min, diaMinima: mn.idx >= 0 ? futuro(dia.time)[mn.idx] : null };
  }

  function graficoAgua(el, datas, chuva, et0, hoje) {
    const W = Math.max(300, el.clientWidth), H = 236, M = { t: 20, r: 10, b: 28, l: 38 }, n = datas.length;
    const topo = Math.max(...chuva.filter((v) => v != null), ...et0.filter((v) => v != null), 4);
    const passo = topo <= 8 ? 2 : topo <= 20 ? 5 : 10, yMax = Math.ceil(topo / passo) * passo;
    const bw = (W - M.l - M.r) / n, X = (i) => M.l + i * bw, Y = (v) => M.t + (1 - v / yMax) * (H - M.t - M.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tr("Chuva e evapotranspiração diárias", "Daily rain and evapotranspiration"))}">`;
    s += `<rect x="${X(hoje)}" y="${M.t}" width="${W - M.r - X(hoje)}" height="${H - M.t - M.b}" fill="#eef1ec"/>`;
    for (let v = 0; v <= yMax; v += passo) s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#dfe5dc"/><text x="${M.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#626f67">${v}</text>`;
    chuva.forEach((v, i) => { if (v != null) s += `<rect x="${X(i) + bw * 0.15}" y="${Y(v)}" width="${bw * 0.7}" height="${Math.max(0, H - M.b - Y(v))}" fill="#2a78d6"><title>${dataCurta(datas[i])}: ${dec(v, 1)} mm</title></rect>`; });
    let d = "", pen = false;
    et0.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + (X(i) + bw / 2).toFixed(1) + "," + Y(v).toFixed(1); pen = true; });
    s += `<path d="${d}" fill="none" stroke="#eb6834" stroke-width="2.2" stroke-linejoin="round"/>`;
    et0.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i) + bw / 2}" cy="${Y(v)}" r="2.6" fill="#eb6834"><title>${dataCurta(datas[i])}: ${dec(v, 1)} mm</title></circle>`; });
    s += `<line x1="${X(hoje) + bw / 2}" x2="${X(hoje) + bw / 2}" y1="${M.t}" y2="${H - M.b}" stroke="#1c2a22" stroke-dasharray="3 3"/><text x="${X(hoje) + bw / 2 + 4}" y="${M.t + 10}" font-size="11" fill="#1c2a22">${tr("hoje", "today")}</text>`;
    const cada = W < 520 ? 4 : 2;
    datas.forEach((dd, i) => { if (i % cada === 0 || i === n - 1) s += `<text x="${X(i) + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#626f67">${dataCurta(dd)}</text>`; });
    s += `<text x="${M.l - 6}" y="9" text-anchor="end" font-size="11" fill="#626f67">mm</text></svg>`;
    el.innerHTML = s;
  }

  /* Solo: tabela por camada e classe de textura. */
  const phClasse = (p) => (p < 5.6 ? tr("ácido", "acidic") : p < 6.6 ? tr("ligeiramente ácido", "slightly acidic") : p <= 7.3 ? tr("neutro", "neutral") : tr("alcalino", "alkaline"));
  function pintarSolo(s) {
    const alvo = document.getElementById("t-solo");
    if (!s) { alvo.innerHTML = semDado(tr("O SoilGrids não tem dados para este ponto (zona urbana, água ou gelo).", "SoilGrids has no data for this point (urban, water or ice).")); return null; }
    const nomes = ["0–5 cm", "5–15 cm", "15–30 cm"];
    const faixa = (c, k, d) => `${dec(c[k], d)}<small> (${dec(c[k + "_lo"], d)}–${dec(c[k + "_hi"], d)})</small>`;
    const tx = texturaDe030(s);
    alvo.innerHTML = `
<div class="t-textura"><span class="t-tx">${tx.classe ? tr(TEXTURAS[tx.classe][0], TEXTURAS[tx.classe][1]) : "–"}</span><span class="t-txs">${tr("textura (USDA), 0–30 cm", "texture (USDA), 0–30 cm")} · ${tr("areia", "sand")} ${dec(tx.sand, 0)}% · ${tr("silte", "silt")} ${dec(tx.silt, 0)}% · ${tr("argila", "clay")} ${dec(tx.clay, 0)}%</span></div>
<div class="tscroll full"><table class="t-tab"><thead><tr><th>${tr("Camada", "Layer")}</th><th>pH</th><th>${tr("Carbono orgânico (g/kg)", "Organic carbon (g/kg)")}</th><th>${tr("Azoto (g/kg)", "Nitrogen (g/kg)")}</th></tr></thead><tbody>
${s.map((c, i) => `<tr><th>${nomes[i]}</th><td>${faixa(c, "phh2o", 1)}</td><td>${faixa(c, "soc", 0)}</td><td>${faixa(c, "nitrogen", 1)}</td></tr>`).join("")}
</tbody></table></div>
<p class="t-nota">${tr(`pH ${dec(s[0].phh2o, 1)} à superfície: ${phClasse(s[0].phh2o)}. Entre parênteses, o intervalo de 90% do modelo (5%–95%): é largo, e diz quanto o número é incerto.`, `Surface pH ${dec(s[0].phh2o, 1)}: ${phClasse(s[0].phh2o)}. In brackets, the model’s 90% interval (5%–95%): it is wide, and tells how uncertain the number is.`)}</p>`;
    return { textura: tx, pH: s[0].phh2o };
  }

  function pintarFogo(g) {
    const alvo = document.getElementById("t-fogo");
    if (g == null) { alvo.innerHTML = semDado(tr("Sem dado da carta neste ponto (fora do continente, ou fora da carta).", "No map data at this point (outside the mainland, or outside the map).")); return; }
    const cores = ["#9aa39d", "#7fa56b", "#b9c05a", "#e0a63a", "#d9622f", "#a83a2c"];
    const c = Math.min(5, Math.max(0, g));
    alvo.innerHTML = `
<div class="t-fogo-v"><strong>${tr(FOGO[c][0], FOGO[c][1])}</strong><span>${c ? tr(`classe ${c} de 5`, `class ${c} of 5`) : tr("fora das cinco classes", "outside the five classes")}</span></div>
<div class="t-escala" role="img" aria-label="${tr("Escala de 1 a 5", "Scale from 1 to 5")}">${[1, 2, 3, 4, 5].map((k) => `<i class="${k === c ? "on" : ""}" style="background:${cores[k]}"></i>`).join("")}</div>
<p class="t-nota">${tr("Carta de perigosidade estrutural 2020–2030, no ponto central do terreno. É o do território, não o risco do dia (esse é o do IPMA). Consulta o plano municipal de defesa da floresta contra incêndios do teu concelho.", "Structural hazard map 2020–2030, at the plot’s central point. It is the land’s, not the day’s risk (that is IPMA’s). Check your municipality’s forest fire defence plan.")}</p>`;
  }

  function pintarUso(o) {
    const alvo = document.getElementById("t-uso");
    if (!o.classes.length) { alvo.innerHTML = semDado(tr("O parcelário não tem subparcelas para esta parcela.", "The register has no sub-parcels for this parcel.")); return; }
    const total = o.classes.reduce((s, c) => s + c.a, 0) || 1;
    const nome = (c) => (OCUPACAO[c] ? tr(OCUPACAO[c][0], OCUPACAO[c][1]) : tr(`Outra classe do parcelário (${c})`, `Other register class (${c})`));
    alvo.innerHTML = `<div class="chart" id="t-graf-uso"></div><p class="t-nota">${tr(`Classificação do parcelário do IFAP${o.revisao ? ", última revisão em " + o.revisao : ""}. Pode não ser o que lá está hoje.`, `IFAP parcel register classification${o.revisao ? ", last reviewed " + o.revisao : ""}. It may not be what is there today.`)}</p>`;
    G.hbars(document.getElementById("t-graf-uso"), o.classes.map((c) => ({ l: nome(c.c), v: c.a / total * 100, t: dec(c.a / total * 100, 0) + "% · " + kmTxt(c.a) })), { max: 100 });
  }

  /* Pistas: regras simples sobre os números da ficha; cada uma diz de onde vem. */
  function pintarPistas(ctx) {
    const out = [], A = ctx.agua;
    if (A) {
      const s = A.b14.saldo;
      if (s <= -30) out.push([tr(`Nos últimos 14 dias a evapotranspiração (${dec(A.b14.et0, 0)} mm) superou a chuva (${dec(A.b14.chuva, 0)} mm): solo nu perde água depressa. Cobertura morta e cobertura viva a tapar o solo ajudam a guardá-la.`, `In the last 14 days evapotranspiration (${dec(A.b14.et0, 0)} mm) exceeded rain (${dec(A.b14.chuva, 0)} mm): bare soil loses water fast. Mulch and living cover protecting the soil help keep it.`), "/services/servicos.html?categoria=Solo%20e%20cobertura#catalogo-tecnicas", tr("Técnicas de solo e cobertura →", "Soil and cover techniques →")]);
      else if (s >= 30) out.push([tr(`Nos últimos 14 dias choveu mais (${dec(A.b14.chuva, 0)} mm) do que o que evaporou (${dec(A.b14.et0, 0)} mm): em solos pesados, evita trabalhar a terra molhada para não a compactar.`, `In the last 14 days it rained more (${dec(A.b14.chuva, 0)} mm) than evaporated (${dec(A.b14.et0, 0)} mm): on heavy soils, avoid working wet ground so it does not compact.`), null, null]);
      if (A.minima != null && A.minima <= 2) out.push([tr(`Mínima de ${dec(A.minima, 1)} °C prevista a ${dataCurta(A.diaMinima)}: atenção à geada em sementeiras e transplantes sensíveis.`, `A minimum of ${dec(A.minima, 1)} °C is forecast on ${dataCurta(A.diaMinima)}: watch for frost on sensitive sowings and transplants.`), "/calendario/conhecimento-cuidar.html#problemas", tr("Problemas na horta →", "Garden problems →")]);
    }
    const T = ctx.textura;
    if (T && T.classe) {
      if (["sand", "loamy_sand", "sandy_loam"].includes(T.classe)) out.push([tr("Textura leve: drena depressa e guarda pouca água e nutrientes. Matéria orgânica e cobertura do solo melhoram isso.", "Light texture: it drains fast and holds little water and few nutrients. Organic matter and soil cover improve that."), "/services/servicos.html?categoria=Solo%20e%20cobertura#catalogo-tecnicas", tr("Técnicas de solo e cobertura →", "Soil and cover techniques →")]);
      else if (["clay", "silty_clay", "sandy_clay", "clay_loam", "silty_clay_loam"].includes(T.classe)) out.push([tr("Textura pesada: guarda água mas encharca e compacta. Evita mexer quando molhado; raízes profundas e matéria orgânica abrem o solo.", "Heavy texture: it holds water but waterlogs and compacts. Avoid working it wet; deep roots and organic matter open the soil."), "/services/servicos.html?categoria=Solo%20e%20cobertura#catalogo-tecnicas", tr("Técnicas de solo e cobertura →", "Soil and cover techniques →")]);
    }
    if (ctx.pH != null && (ctx.pH < 5.6 || ctx.pH > 7.3)) out.push([tr(`pH estimado de ${dec(ctx.pH, 1)} (${phClasse(ctx.pH)}): é uma estimativa de 250 m. Confirma com uma análise antes de pensar em corrigir.`, `Estimated pH of ${dec(ctx.pH, 1)} (${phClasse(ctx.pH)}): it is a 250 m estimate. Confirm with a lab analysis before thinking of correcting it.`), "/calendario/conhecimento-cuidar.html#fatores", tr("Dos dados à parcela →", "From data to the plot →")]);
    if (ctx.ndvi && ctx.ndvi.n >= 6 && ctx.ndvi.abaixo / ctx.ndvi.n >= 0.5) out.push([tr(`Em ${ctx.ndvi.abaixo} das ${ctx.ndvi.n} imagens limpas do último ano o NDVI médio ficou abaixo de 0,3 (solo nu ou vegetação rala): o solo fica pouco coberto durante boa parte do ano. Cobertura viva ou morta nesses meses protege-o do sol e da chuva.`, `In ${ctx.ndvi.abaixo} of the ${ctx.ndvi.n} clear images of the past year the mean NDVI was below 0.3 (bare soil or sparse vegetation): the soil stays poorly covered for much of the year. Living or dead cover in those months shields it from sun and rain.`), "/services/servicos.html?categoria=Solo%20e%20cobertura#catalogo-tecnicas", tr("Técnicas de solo e cobertura →", "Soil and cover techniques →")]);
    if (ctx.fogo != null && ctx.fogo >= 4) out.push([tr("Perigosidade de incêndio alta ou muito alta: descontinuar o combustível (faixas limpas, pastoreio, culturas e árvores de menor combustibilidade) pesa mais do que qualquer outra escolha.", "High or very high fire hazard: breaking up fuel continuity (clear strips, grazing, lower-flammability crops and trees) weighs more than any other choice."), "/recursos/vida-e-recursos.html", tr("Vida e recursos →", "Life and resources →")]);
    out.push([tr("Há apoios do PEPAC para quem cuida da terra de forma biológica ou regenerativa, e um Pedido Único por ano: vê o que cada um pede e quais aceitam candidatos novos.", "There are CAP Plan supports for those who farm organically or regeneratively, and one Single Application a year: see what each asks for and which accept new applicants."), "/calendario/apoios.html", tr("Apoios →", "Supports →")]);
    out.push([tr("Vê o que semear e plantar neste lugar, mês a mês, e as espécies da região.", "See what to sow and plant at this place, month by month, and the region’s species."), "/ecossistemas/biodiversidade.html", tr("Espécies da região →", "Species of the region →")]);
    const alvo = document.getElementById("t-pistas");
    document.getElementById("t-leitura").hidden = false;
    alvo.innerHTML = out.map((p) => `<li>${p[0]}${p[1] ? ` <a href="${comLang(p[1])}">${p[2]}</a>` : ""}</li>`).join("");
  }

  /* ---------- NDVI (Sentinel-2) ---------- */
  const carregarScript = (src) => new Promise((ok, ko) => { const e = document.createElement("script"); e.src = src; e.onload = ok; e.onerror = () => ko(new Error(src)); document.body.appendChild(e); });
  let ndviPronto = null;
  const prepararNdvi = () => (ndviPronto = ndviPronto || (window.GeoTIFF ? Promise.resolve() : carregarScript("/assets/vendor/geotiff/geotiff.js?v=1")).then(() => (window.BioCulturaNDVI ? 0 : carregarScript("/assets/js/ndvi-sentinel.js?v=1"))).then(() => window.BioCulturaNDVI).catch((e) => { ndviPronto = null; throw e; }));
  const dataLonga = (iso) => { const p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; };
  const ndviTxt = (v) => dec(v, 2);

  function graficoNdvi(el, serie, selData, aoEscolher, U) {
    const W = Math.max(300, el.clientWidth), H = 230, M = { t: 14, r: 12, b: 28, l: 38 };
    const fim = Date.now(), ini = fim - 365 * 86400000, X = (d) => M.l + ((Date.parse(d) - ini) / (fim - ini)) * (W - M.l - M.r);
    const lo = Math.min(0, ...serie.map((s) => s.media)), Y = (v) => M.t + (1 - (v - lo) / (1 - lo)) * (H - M.t - M.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(tr("NDVI médio do terreno em cada imagem limpa do último ano", "Mean NDVI of the plot in each clear image of the past year"))}">`;
    [0, 0.2, 0.4, 0.6, 0.8, 1].filter((v) => v >= lo - 1e-9).forEach((v) => { s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="#dfe5dc"/><text x="${M.l - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#626f67">${dec(v, 1)}</text>`; });
    s += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(0.3)}" y2="${Y(0.3)}" stroke="#9a5a3c" stroke-dasharray="4 4"/>`;
    const mes = new Date(ini); mes.setDate(1); mes.setMonth(mes.getMonth() + 1);
    const nomes = EN ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    for (let k = 0; k < 13; k++) { const d = new Date(mes.getFullYear(), mes.getMonth() + k, 1); if (d.getTime() > fim) break; if (k % 2 === 0 || W > 560) s += `<text x="${X(d.toISOString().slice(0, 10))}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#626f67">${nomes[d.getMonth()]}</text>`; }
    s += `<path d="${serie.map((q, i) => (i ? "L" : "M") + X(q.data).toFixed(1) + "," + Y(q.media).toFixed(1)).join("")}" fill="none" stroke="#9aa39d" stroke-width="1.5"/>`;
    serie.forEach((q) => {
      const c = U.cor(q.media), on = q.data === selData;
      s += `<circle class="t-pt" data-d="${q.data}" tabindex="0" role="button" aria-label="${dataLonga(q.data)}: NDVI ${ndviTxt(q.media)}" cx="${X(q.data).toFixed(1)}" cy="${Y(q.media).toFixed(1)}" r="${on ? 7 : 5}" fill="rgb(${c.join(",")})" stroke="${on ? "#1c2a22" : "#fff"}" stroke-width="${on ? 2.5 : 1.5}" style="cursor:pointer"><title>${dataLonga(q.data)} · NDVI ${ndviTxt(q.media)}</title></circle>`;
    });
    el.innerHTML = s + "</svg>";
    el.querySelectorAll(".t-pt").forEach((c) => { const f = () => aoEscolher(c.dataset.d); c.addEventListener("click", f); c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }); });
  }

  async function pintarNdvi(t, ctx, vivo, pistas) {
    const alvo = document.getElementById("t-ndvi");
    if (!t.pols.length) { alvo.innerHTML = semDado(tr("Precisas de uma parcela ou de um contorno para ler a vegetação.", "You need a parcel or an outline to read the vegetation.")); return; }
    const pts = t.pols.flat(2), la = pts.map((p) => p[0]), lo = pts.map((p) => p[1]);
    if ((Math.max(...la) - Math.min(...la)) * 111.2 > 4.5 || (Math.max(...lo) - Math.min(...lo)) * 111.2 * Math.cos(rad(la[0])) > 4.5) { alvo.innerHTML = semDado(tr("O terreno é grande demais para ler o NDVI (limite de cerca de 4,5 km de lado). Desenha só uma parte.", "The plot is too large to read NDVI (limit of about 4.5 km across). Draw only part of it.")); return; }
    const estado = (txt) => { const e = document.getElementById("t-ndvi-prog") || document.getElementById("t-ndvi-estado"); if (e) e.textContent = txt; };
    alvo.innerHTML = `<p class="t-carga" id="t-ndvi-estado">${tr("A procurar imagens do satélite Sentinel-2…", "Looking for Sentinel-2 satellite images…")}</p>`;
    let U, lista;
    try { U = await prepararNdvi(); lista = await U.cenas(t.pols, 365); } catch (e) { if (vivo()) alvo.innerHTML = semDado(tr("Não consegui falar com o catálogo de imagens Sentinel-2 agora. Tenta daqui a pouco.", "Could not reach the Sentinel-2 image catalogue right now. Try again shortly.")); return; }
    if (!vivo()) return;
    if (!lista.length) { alvo.innerHTML = semDado(tr("Não há imagens Sentinel-2 com poucas nuvens para este lugar no último ano.", "There are no low-cloud Sentinel-2 images for this place in the past year.")); return; }
    let selData = null, escolhido = false, mostrar = true;
    const porData = (rs) => { const m = new Map(); rs.forEach((r) => { if (r.ndvi && (!m.has(r.data) || r.valido > m.get(r.data).valido)) m.set(r.data, r); }); return [...m.values()].sort((a, b) => (a.data < b.data ? -1 : 1)); };
    const aplicarMapa = (r) => {
      if (camadaNdvi) { map.removeLayer(camadaNdvi); camadaNdvi = null; }
      if (!mostrar || !r) return;
      const im = U.imagem(r);
      camadaNdvi = L.imageOverlay(im.url, im.limites, { pane: "ndvi", opacity: 0.95, interactive: false }).addTo(map);
    };
    const gradiente = `linear-gradient(90deg, ${U.RAMPA.map((q) => `rgb(${q[1].join(",")}) ${Math.round(((q[0] + 0.1) / 0.9) * 100)}%`).join(", ")})`;
    const desenhar = (rs, fim) => {
      const serie = porData(rs);
      if (!serie.length) { if (fim) alvo.innerHTML = semDado(tr("Nenhuma imagem do último ano mostra este terreno com o céu limpo. Tenta mais tarde ou com um terreno maior.", "No image from the past year shows this plot under a clear sky. Try later or with a larger plot.")); return; }
      const sel = (escolhido && serie.find((q) => q.data === selData)) || serie[serie.length - 1]; selData = sel.data;
      ctx.ndvi = { n: serie.length, abaixo: serie.filter((q) => q.media < 0.3).length };
      alvo.innerHTML = `
<div class="tiles t-ndvi-tiles">
  <div class="tile"><span class="v">${ndviTxt(sel.media)}<small>NDVI</small></span><span class="k">${tr("médio na imagem de", "mean in the image of")} ${dataLonga(sel.data)}</span><span class="s">${tr(`${sel.n} pixéis de 10 m, ${dec(sel.valido * 100, 0)}% do terreno com céu limpo`, `${sel.n} pixels of 10 m, ${dec(sel.valido * 100, 0)}% of the plot under a clear sky`)}</span></div>
  <div class="tile"><span class="v">${ndviTxt(sel.p10)}–${ndviTxt(sel.p90)}</span><span class="k">${tr("90% dos pixéis estão neste intervalo", "90% of pixels fall in this range")}</span><span class="s">${tr("quanto mais largo, mais desigual é o terreno", "the wider, the more uneven the plot")}</span></div>
  <div class="tile"><span class="v">${serie.length}<small>${tr("imagens", "images")}</small></span><span class="k">${tr("limpas no último ano", "clear in the past year")}</span><span class="s">${tr(`${ctx.ndvi.abaixo} com NDVI médio abaixo de 0,3`, `${ctx.ndvi.abaixo} with mean NDVI below 0.3`)}</span></div>
</div>
<div class="t-ndvi-ctl"><div class="seg"><button type="button" id="t-ndvi-mapa" aria-pressed="${mostrar}">${tr("NDVI no mapa", "NDVI on the map")}</button></div><div class="t-rampa"><span>${tr("solo nu", "bare soil")}</span><i style="background:${gradiente}"></i><span>${tr("vegetação densa", "dense vegetation")}</span></div></div>
<div class="chart" id="t-graf-ndvi"></div>
<p class="t-nota" id="t-ndvi-estado"><span id="t-ndvi-prog">${fim ? "" : tr("A ler mais imagens… ", "Reading more images… ")}</span> ${tr("Carrega num ponto para ver essa data no mapa. A linha tracejada marca 0,3.", "Press a point to see that date on the map. The dashed line marks 0.3.")}</p>
<p class="t-nota">${tr("NDVI mede o verde da vegetação a partir da luz que ela reflete: perto de 0, solo nu ou rocha; entre 0,2 e 0,4, pastagem seca ou vegetação rala; acima de 0,6, vegetação densa e vigorosa. Varia com a estação e com o tipo de cultura: compara o terreno com ele próprio na mesma época, não com outras culturas.", "NDVI measures vegetation greenness from the light it reflects: near 0, bare soil or rock; between 0.2 and 0.4, dry grassland or sparse vegetation; above 0.6, dense, vigorous vegetation. It varies with the season and crop type: compare the plot with itself at the same time of year, not with other crops.")} <a href="https://earthobservatory.nasa.gov/features/MeasuringVegetation" target="_blank" rel="noopener">NASA</a></p>`;
      graficoNdvi(document.getElementById("t-graf-ndvi"), serie, selData, (d) => { selData = d; escolhido = true; desenhar(rs, fim); }, U);
      document.getElementById("t-ndvi-mapa").addEventListener("click", (e) => { mostrar = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", String(mostrar)); aplicarMapa(sel); });
      aplicarMapa(sel);
    };
    try {
      const res = await U.serie(lista.slice(0, 150), t.pols, {
        minimo: 0.6, paralelo: 4, cancelado: () => !vivo(),
        progresso: (feitos, total, rs) => {
          if (!vivo()) return;
          if (feitos === total) return;
          if (porData(rs).length && (feitos === 1 || feitos % 12 === 0 || !document.getElementById("t-graf-ndvi"))) desenhar(rs, false);
          else estado(tr(`A ler imagens… ${feitos} de ${total}`, `Reading images… ${feitos} of ${total}`));
        }
      });
      if (!vivo()) return;
      desenhar(res, true);
      pistas();
    } catch (e) { if (vivo()) alvo.innerHTML = semDado(tr("Não consegui ler as imagens agora. Tenta daqui a pouco.", "Could not read the images right now. Try again shortly.")); }
  }

  /* Calendário para o lugar: a localidade mais próxima (até 50 km) passa a ser o «teu território». */
  async function irCalendario(centro) {
    dizer(tr("A procurar a localidade mais próxima…", "Finding the nearest locality…"));
    try {
      const r = await json("/data/localidades.json", 30000);
      let melhor = null, dm = 1e9;
      r.forEach((x) => { if (x.lat == null || x.lon == null) return; const d = distanciaKm(centro, [x.lat, x.lon]); if (d < dm) { dm = d; melhor = x; } });
      if (!melhor || dm > 50) { dizer(tr("Não há localidade do bioCulture a menos de 50 km deste terreno. Escolhe uma no menu «O teu território».", "There is no bioCulture locality within 50 km of this plot. Pick one in the “Your territory” menu.")); return; }
      try { localStorage.setItem("biocultura_region", String(melhor.id)); } catch (e) { dizer(tr("O browser bloqueou o armazenamento: escolhe a localidade no menu «O teu território».", "The browser blocked storage: pick the locality in the “Your territory” menu.")); return; }
      location.href = comLang("/calendario/calendario.html");
    } catch (e) { dizer(tr("Não consegui consultar as localidades agora.", "Could not look up localities right now.")); }
  }

  pintarGuardados();
  barraFixa();
  setTimeout(() => map.invalidateSize(), 300);
  if (/^#(mapa|ficha|limites)$/.test(location.hash)) setTimeout(() => { const a = document.getElementById(location.hash.slice(1)); if (a) a.scrollIntoView({ block: "start" }); }, 80);
})();
