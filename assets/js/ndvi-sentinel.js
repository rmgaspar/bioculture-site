/* NDVI de um terreno com imagens Sentinel-2 L2A, lido no browser.
   Catálogo: Earth Search (Element 84, STAC) · Imagens: ficheiros COG públicos na AWS (bandas B04 vermelho e B08 infravermelho
   próximo a 10 m, e a máscara de nuvens SCL a 20 m). Só se lê a janela do terreno (pedidos por intervalos de bytes, via geotiff.js),
   o cálculo é (NIR − Vermelho) / (NIR + Vermelho) e nada passa por um servidor do bioCulture.
   Contém dados modificados do Copernicus Sentinel. Usado por assets/js/pages/meu-terreno.js. */
(function () {
  "use strict";

  /* ---------- projeção UTM (WGS84, séries de Krüger; erro < 1 mm) ---------- */
  const A_WGS = 6378137, F_WGS = 1 / 298.257223563, K0 = 0.9996, E0 = 500000;
  const n = F_WGS / (2 - F_WGS), n2 = n * n, n3 = n2 * n, n4 = n3 * n;
  const A = (A_WGS / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const ALFA = [n / 2 - (2 * n2) / 3 + (5 * n3) / 16, (13 * n2) / 48 - (3 * n3) / 5, (61 * n3) / 240];
  const BETA = [n / 2 - (2 * n2) / 3 + (37 * n3) / 96, n2 / 48 + n3 / 15, (17 * n3) / 480];
  const DELTA = [2 * n - (2 * n2) / 3 - 2 * n3, (7 * n2) / 3 - (8 * n3) / 5, (56 * n3) / 15];
  const rad = (x) => (x * Math.PI) / 180, deg = (x) => (x * 180) / Math.PI;
  const zonaDe = (epsg) => ({ zona: +epsg % 100, sul: +epsg >= 32700 });

  /* (lat, lon) → [E, N] em metros, na zona do código EPSG (326zz norte, 327zz sul). */
  function paraUtm(lat, lon, epsg) {
    const { zona, sul } = zonaDe(epsg), lon0 = rad((zona - 1) * 6 - 180 + 3);
    const phi = rad(lat), dl = rad(lon) - lon0, e = (2 * Math.sqrt(n)) / (1 + n);
    const t = Math.sinh(Math.atanh(Math.sin(phi)) - e * Math.atanh(e * Math.sin(phi)));
    const xi0 = Math.atan2(t, Math.cos(dl)), eta0 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
    let xi = xi0, eta = eta0;
    ALFA.forEach((a, i) => { const j = 2 * (i + 1); xi += a * Math.sin(j * xi0) * Math.cosh(j * eta0); eta += a * Math.cos(j * xi0) * Math.sinh(j * eta0); });
    return [E0 + K0 * A * eta, (sul ? 10000000 : 0) + K0 * A * xi];
  }
  /* [E, N] → [lat, lon] */
  function deUtm(E, N, epsg) {
    const { zona, sul } = zonaDe(epsg), lon0 = rad((zona - 1) * 6 - 180 + 3);
    const xi = (N - (sul ? 10000000 : 0)) / (K0 * A), eta = (E - E0) / (K0 * A);
    let xi1 = xi, eta1 = eta;
    BETA.forEach((b, i) => { const j = 2 * (i + 1); xi1 -= b * Math.sin(j * xi) * Math.cosh(j * eta); eta1 -= b * Math.cos(j * xi) * Math.sinh(j * eta); });
    const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
    let phi = chi;
    DELTA.forEach((d, i) => { phi += d * Math.sin(2 * (i + 1) * chi); });
    return [deg(phi), deg(lon0 + Math.atan2(Math.sinh(eta1), Math.cos(xi1)))];
  }

  /* ---------- geometria ---------- */
  function pontoNoAnelXY(x, y, anel) {
    let dentro = false;
    for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
      const xi = anel[i][0], yi = anel[i][1], xj = anel[j][0], yj = anel[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  }
  /* polígonos [[anel…]…] em [lat, lon] → polígonos em [E, N] */
  const polsParaUtm = (pols, epsg) => pols.map((p) => p.map((anel) => anel.map((q) => paraUtm(q[0], q[1], epsg))));
  const dentroDe = (x, y, polsUtm) => polsUtm.some((p) => pontoNoAnelXY(x, y, p[0]) && !p.slice(1).some((b) => pontoNoAnelXY(x, y, b)));

  /* Janela na grelha de 10 m da cena (alinhada a pixéis pares, para coincidir com a grelha de 20 m da máscara).
     transform = [10, 0, E0, 0, -10, N0] (proj:transform do STAC), shape = [linhas, colunas]. Devolve null se o terreno sai da cena. */
  function janela(polsUtm, transform, shape) {
    const xs = [], ys = [];
    polsUtm.forEach((p) => p[0].forEach((q) => { xs.push(q[0]); ys.push(q[1]); }));
    const res = transform[0], e0 = transform[2], n0 = transform[5];
    const c0 = Math.floor((Math.min(...xs) - e0) / res) - 1, c1 = Math.ceil((Math.max(...xs) - e0) / res) + 1;
    const r0 = Math.floor((n0 - Math.max(...ys)) / res) - 1, r1 = Math.ceil((n0 - Math.min(...ys)) / res) + 1;
    const x0 = Math.floor(c0 / 2) * 2, y0 = Math.floor(r0 / 2) * 2, x1 = Math.ceil(c1 / 2) * 2, y1 = Math.ceil(r1 / 2) * 2;
    if (x0 < 0 || y0 < 0 || x1 > shape[1] || y1 > shape[0]) return null;
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, res, e0: e0 + x0 * res, n0: n0 - y0 * res };
  }

  /* ---------- catálogo ---------- */
  const STAC = "https://earth-search.aws.element84.com/v1/search";
  /* Cenas Sentinel-2 L2A que tocam o terreno, mais recentes primeiro. */
  async function cenas(pols, dias) {
    const pts = pols.flat(2), la = pts.map((p) => p[0]), lo = pts.map((p) => p[1]);
    const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10) + "T00:00:00Z";
    const corpo = {
      collections: ["sentinel-2-l2a"], limit: 200, datetime: desde + "/..",
      bbox: [Math.min(...lo), Math.min(...la), Math.max(...lo), Math.max(...la)],
      query: { "eo:cloud_cover": { lt: 75 } }, sortby: [{ field: "properties.datetime", direction: "desc" }]
    };
    const r = await fetch(STAC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
    if (!r.ok) throw new Error("STAC " + r.status);
    const j = await r.json();
    return (j.features || []).filter((f) => f.assets && f.assets.red && f.assets.nir && f.assets.scl && f.properties["proj:epsg"]).map((f) => {
      const b = (f.assets.red["raster:bands"] || [{}])[0];
      return {
        id: f.id, data: f.properties.datetime.slice(0, 10), nuvens: f.properties["eo:cloud_cover"], epsg: f.properties["proj:epsg"],
        transform: f.assets.red["proj:transform"], shape: f.assets.red["proj:shape"],
        escala: b.scale == null ? 0.0001 : b.scale,
        href: { red: f.assets.red.href, nir: f.assets.nir.href, scl: f.assets.scl.href }
      };
    });
  }

  /* ---------- leitura de uma cena ---------- */
  const abertos = new Map();
  const abrir = (url) => { if (!abertos.has(url)) abertos.set(url, window.GeoTIFF.fromUrl(url).then((t) => t.getImage()).catch((e) => { abertos.delete(url); throw e; })); return abertos.get(url); };
  const ler = async (url, jn, largura, altura, factor) => {
    const img = await abrir(url);
    const r = await img.readRasters({ window: [jn.x0 / factor, jn.y0 / factor, jn.x1 / factor, jn.y1 / factor], width: largura, height: altura, samples: [0], resampleMethod: "nearest" });
    return r[0];
  };
  const SCL_VALIDOS = new Set([4, 5, 6]); // vegetação, solo nu e água; fora nuvens, sombras, neve e pixéis escuros

  /* Lê a janela do terreno. Devolve {valido: fração dos pixéis do terreno com céu limpo, ndvi?, media?, p10?, p90?}.
     Só lê o vermelho e o infravermelho se a máscara mostrar pelo menos `minimo` de pixéis limpos. */
  async function lerCena(cena, pols, minimo) {
    const polsUtm = polsParaUtm(pols, cena.epsg), jn = janela(polsUtm, cena.transform, cena.shape);
    if (!jn || jn.w > 480 || jn.h > 480) return null; // janela fora da cena, ou grande demais (≈ 4,8 km)
    const N = jn.w * jn.h, dentro = new Uint8Array(N);
    let nDentro = 0;
    for (let j = 0; j < jn.h; j++) for (let i = 0; i < jn.w; i++) if (dentroDe(jn.e0 + (i + 0.5) * jn.res, jn.n0 - (j + 0.5) * jn.res, polsUtm)) { dentro[j * jn.w + i] = 1; nDentro++; }
    if (!nDentro) return null;
    const scl = await ler(cena.href.scl, jn, jn.w, jn.h, 2);
    let limpos = 0;
    for (let k = 0; k < N; k++) if (dentro[k] && SCL_VALIDOS.has(scl[k])) limpos++;
    const out = { data: cena.data, id: cena.id, epsg: cena.epsg, jn, valido: limpos / nDentro, nuvens: cena.nuvens };
    if (out.valido < minimo) return out;
    const [vm, iv] = await Promise.all([ler(cena.href.red, jn, jn.w, jn.h, 1), ler(cena.href.nir, jn, jn.w, jn.h, 1)]);
    const ndvi = new Float32Array(N).fill(NaN), vals = [];
    for (let k = 0; k < N; k++) {
      if (!dentro[k] || !SCL_VALIDOS.has(scl[k]) || !vm[k] || !iv[k]) continue;
      /* O catálogo indica um desvio de −0,1 nas bandas, mas os valores destes ficheiros não o trazem (verificado: com o desvio
         o NDVI de pastagens em novembro dava > 1 e a vegetação ficava com reflectância vermelha negativa; sem ele, a fenologia
         mediterrânica sai certa, 0,3 no verão seco e 0,5–0,6 no inverno verde). Por isso usa-se só a escala. */
      const r = vm[k] * cena.escala, nir = iv[k] * cena.escala;
      if (r + nir <= 0) continue;
      const v = Math.max(-1, Math.min(1, (nir - r) / (nir + r)));
      ndvi[k] = v; vals.push(v);
    }
    if (!vals.length) return out;
    vals.sort((a, b) => a - b);
    out.ndvi = ndvi; out.n = vals.length;
    out.media = vals.reduce((s, v) => s + v, 0) / vals.length;
    out.p10 = vals[Math.floor(vals.length * 0.1)]; out.p90 = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.9))];
    return out;
  }

  /* Escolhe, para cada data, a cena que cobre melhor o terreno (duas cenas do mesmo dia = duas partes da órbita). */
  async function serie(lista, pols, o) {
    const minimo = (o && o.minimo) || 0.5, par = (o && o.paralelo) || 4, aoProgresso = (o && o.progresso) || (() => {});
    const resultados = [];
    let i = 0, feitos = 0;
    const trabalhador = async () => {
      while (i < lista.length) {
        if (o && o.cancelado && o.cancelado()) return;
        const c = lista[i++];
        try { const r = await lerCena(c, pols, minimo); if (r) resultados.push(r); } catch (e) { /* uma cena que falha não pára as outras */ }
        aoProgresso(++feitos, lista.length, resultados);
      }
    };
    await Promise.all(Array.from({ length: par }, trabalhador));
    const porData = new Map();
    resultados.forEach((r) => { if (r.ndvi && (!porData.has(r.data) || r.valido > porData.get(r.data).valido)) porData.set(r.data, r); });
    return [...porData.values()].sort((a, b) => (a.data < b.data ? -1 : 1));
  }

  /* ---------- cor e imagem para o mapa ---------- */
  const RAMPA = [[-0.1, [120, 90, 60]], [0.1, [196, 160, 100]], [0.2, [226, 205, 120]], [0.3, [200, 214, 110]], [0.45, [130, 185, 90]], [0.6, [60, 150, 70]], [0.8, [20, 100, 50]]];
  function cor(v) {
    if (v <= RAMPA[0][0]) return RAMPA[0][1];
    for (let k = 1; k < RAMPA.length; k++) if (v <= RAMPA[k][0]) {
      const a = RAMPA[k - 1], b = RAMPA[k], t = (v - a[0]) / (b[0] - a[0]);
      return a[1].map((c, q) => Math.round(c + (b[1][q] - c) * t));
    }
    return RAMPA[RAMPA.length - 1][1];
  }
  /* Pinta o NDVI de uma cena numa imagem alinhada com (lat, lon), para L.imageOverlay: devolve {url, limites: [[sul, oeste], [norte, este]]}. */
  function imagem(r) {
    const { jn, epsg, ndvi } = r, cantos = [[jn.e0, jn.n0], [jn.e0 + jn.w * jn.res, jn.n0], [jn.e0, jn.n0 - jn.h * jn.res], [jn.e0 + jn.w * jn.res, jn.n0 - jn.h * jn.res]].map((q) => deUtm(q[0], q[1], epsg));
    const sul = Math.min(...cantos.map((c) => c[0])), norte = Math.max(...cantos.map((c) => c[0])), oeste = Math.min(...cantos.map((c) => c[1])), este = Math.max(...cantos.map((c) => c[1]));
    const W = jn.w, H = jn.h, cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), px = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lat = norte - ((j + 0.5) / H) * (norte - sul), lon = oeste + ((i + 0.5) / W) * (este - oeste);
      const [E, N] = paraUtm(lat, lon, epsg), c = Math.floor((E - jn.e0) / jn.res), l = Math.floor((jn.n0 - N) / jn.res);
      const v = c >= 0 && c < W && l >= 0 && l < H ? ndvi[l * W + c] : NaN, o = (j * W + i) * 4;
      if (Number.isNaN(v)) { px.data[o + 3] = 0; continue; }
      const k = cor(v); px.data[o] = k[0]; px.data[o + 1] = k[1]; px.data[o + 2] = k[2]; px.data[o + 3] = 235;
    }
    ctx.putImageData(px, 0, 0);
    return { url: cv.toDataURL("image/png"), limites: [[sul, oeste], [norte, este]] };
  }

  window.BioCulturaNDVI = { paraUtm, deUtm, janela, polsParaUtm, dentroDe, cenas, lerCena, serie, imagem, cor, RAMPA, SCL_VALIDOS };
})();
