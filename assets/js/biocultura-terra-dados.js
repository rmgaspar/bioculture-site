/* Dados do Observatório da Terra partilhados: séries por país, valores de referência e as «dez conclusões».
   Usado pelo relatório (observatorio/observatorio-terra.html) e pelos cartões nas páginas temáticas.
   Todos os números vêm dos ficheiros de dados; nada é escrito à mão. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos;
  if (!G) return;
  const { EN, tr, fmt, esc, css, SER, miniBars } = G;
  const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });
  let cache = null;
  const load = () => (cache = cache || Promise.all([
    get("/data/observatorio-terra-relatorio.json?v=1"),
    get("/data/observatorio_global.json?v=2"),
    get("/data/vetores_pressao_global.json"),
    get("/data/observatorio_terra.json")
  ]).then(([R, CLIMA, VET, PT]) => ({ R, CLIMA, VET, PT })));

  function create(R, CLIMA, VET) {
    const IND = R.indicadores, P = R.paises;
    const SOB = Object.keys(P).filter((c) => P[c][4]);

    /* ---------- nomes ---------- */
    let DN; try { DN = new Intl.DisplayNames(EN ? ["en-GB", "en"] : ["pt-PT", "pt"], { type: "region" }); } catch (e) { DN = null; }
    const FIX = EN
      ? { CN: "China", US: "United States", GB: "United Kingdom", CI: "Côte d’Ivoire", CD: "DR Congo", KR: "South Korea", RU: "Russia", AE: "United Arab Emirates", VN: "Vietnam", IR: "Iran", TR: "Türkiye", LA: "Laos", SY: "Syria", TZ: "Tanzania", BO: "Bolivia", VE: "Venezuela", MD: "Moldova", KP: "North Korea", FM: "Micronesia", PS: "Palestine", CV: "Cabo Verde" }
      : { CN: "China", US: "Estados Unidos", GB: "Reino Unido", CI: "Costa do Marfim", CD: "RD Congo", KR: "Coreia do Sul", RU: "Rússia", AE: "Emirados Árabes Unidos", VN: "Vietname", IR: "Irão", TR: "Turquia", LA: "Laos", SY: "Síria", TZ: "Tanzânia", BO: "Bolívia", VE: "Venezuela", MD: "Moldávia", KP: "Coreia do Norte", FM: "Micronésia", PS: "Palestina", CV: "Cabo Verde" };
    const AGG = {
      WLD: tr("Mundo", "World"), EUU: tr("União Europeia", "European Union"), EUR: tr("Europa", "Europe"),
      HIC: tr("Rendimento alto", "High income"), UMC: tr("Rendimento médio-alto", "Upper-middle income"),
      LMC: tr("Rendimento médio-baixo", "Lower-middle income"), LIC: tr("Rendimento baixo", "Low income")
    };
    const nm = (c) => {
      if (AGG[c]) return AGG[c];
      const p = P[c]; if (!p) return c;
      if (FIX[p[0]]) return FIX[p[0]];
      if (DN) { try { const n = DN.of(p[0]); if (n && n !== p[0]) return n; } catch (e) { /* usa o nome inglês */ } }
      return p[1];
    };
    const SC = { PRT: "--s2", WLD: "--s1", EUU: "--s3", EUR: "--s3", HIC: "--s4", UMC: "--s5", LMC: "--s7", LIC: "--s8" };
    const colorOf = (c, i) => css(SC[c] || SER[(i + 3) % SER.length]);

    /* ---------- acesso aos dados ---------- */
    const ser = (k, c) => IND[k].series[c] || null;
    const last = (k, c) => { const s = ser(k, c); if (!s) return null; for (let i = s.v.length - 1; i >= 0; i--) if (s.v[i] != null) return { y: s.a + i, v: s.v[i] }; return null; };
    const at = (k, c, y) => { const s = ser(k, c); if (!s) return null; const v = s.v[y - s.a]; return v == null ? null : v; };
    const rowsOf = (k) => {
      const r = []; SOB.forEach((c) => { const l = last(k, c); if (l) r.push({ c, y: l.y, v: l.v }); });
      const maxY = Math.max(...r.map((x) => x.y)); return r.filter((x) => x.y >= maxY - 4);
    };
    const pct = (v, d = 1) => fmt(v, d) + "%";
    const META = {
      acesso_eletricidade: { n: tr("População com acesso a eletricidade", "Population with access to electricity"), f: (v) => pct(v), good: 1 },
      renovavel_final: { n: tr("Renováveis na energia final", "Renewables in final energy"), f: (v) => pct(v), good: 1 },
      eletricidade_renovavel: { n: tr("Renováveis na produção de eletricidade", "Renewables in electricity output"), f: (v) => pct(v), good: 1 },
      intensidade_energetica: { n: tr("Intensidade energética (MJ por dólar de PIB)", "Energy intensity (MJ per dollar of GDP)"), f: (v) => fmt(v, 2), good: 0 },
      pm25: { n: tr("Exposição a partículas finas PM2.5 (µg/m³)", "Exposure to fine particles PM2.5 (µg/m³)"), f: (v) => fmt(v, 1), good: 0 },
      mortalidade_ar: { n: tr("Mortalidade atribuída à poluição do ar (por 100 000)", "Mortality attributed to air pollution (per 100,000)"), f: (v) => fmt(v, 0), good: 0 },
      stress_hidrico: { n: tr("Stress hídrico (% dos recursos renováveis)", "Water stress (% of renewable resources)"), f: (v) => pct(v, v < 100 ? 1 : 0), good: 0 },
      agua_potavel: { n: tr("Água potável gerida em segurança (% da população)", "Safely managed drinking water (% of population)"), f: (v) => pct(v), good: 1 },
      terra_degradada: { n: tr("Terra degradada (% da área)", "Degraded land (% of area)"), f: (v) => pct(v), good: 0 },
      lista_vermelha: { n: tr("Índice da Lista Vermelha (1 = sem espécies ameaçadas)", "Red List Index (1 = no species threatened)"), f: (v) => fmt(v, 3), good: 1 },
      area_protegida_terra: { n: tr("Áreas terrestres protegidas (% do território)", "Terrestrial protected areas (% of land)"), f: (v) => pct(v), good: 1 },
      area_protegida_mar: { n: tr("Áreas marinhas protegidas (% das águas territoriais)", "Marine protected areas (% of territorial waters)"), f: (v) => pct(v), good: 1 }
    };
    const fv = (k, v) => META[k].f(v);

    const clima = CLIMA.series_temporais;
    const cs = (id) => { const s = clima[id]; return s.anos.map((a, i) => ({ a, v: s.valores[i] })).filter((p) => p.v != null); };
    const co2 = cs("co2_mauna_loa"), co2L = co2.at(-1), co2F = co2[0];
    const tmp = cs("temperatura_global"), mar = cs("nivel_medio_mar_satelite");
    const dest = Object.fromEntries(VET.destaques.map((d) => [d.id, d]));
    const fonte = Object.fromEntries(VET.fontes.map((f) => [f.id, f]));
    const wl = (k) => last(k, "WLD"), pt = (k) => last(k, "PRT"), eu = (k) => last(k, "EUU");
    const W = { re: wl("eletricidade_renovavel"), acc: wl("acesso_eletricidade"), pm: wl("pm25"), ws: wl("stress_hidrico"), dw: wl("agua_potavel"), dg: wl("terra_degradada"), tp: wl("area_protegida_terra"), mp: wl("area_protegida_mar") };
    const rli = ser("lista_vermelha", "WLD"), rli0 = rli.v.find((v) => v != null), rli1 = last("lista_vermelha", "WLD");
    const rliY0 = rli.a + rli.v.findIndex((v) => v != null);
    const pmRows = rowsOf("pm25"), pmAbove = pmRows.filter((r) => r.v > 5).length;
    const wsRows = rowsOf("stress_hidrico"), wsCrit = wsRows.filter((r) => r.v > 100).length;
    const accRows = rowsOf("acesso_eletricidade"), accLow = accRows.filter((r) => r.v < 50).length;
    const dwRows = rowsOf("agua_potavel"), dwLow = dwRows.filter((r) => r.v < 50).length;
    const gbf = 30; // Quadro Global de Biodiversidade de Kunming-Montreal, meta 3: 30% das terras e mares protegidos em 2030
    const D1 = { PM_GUIDE: 5 };

    /* As dez conclusões: id, capítulo do relatório onde se desenvolvem, texto e mini-gráfico. */
    const lowAcc = accRows.slice().sort((a, b) => a.v - b.v).slice(0, 3);
    const t24 = tmp.find((p) => p.a === 2024);
    const co90 = co2.find((p) => p.a === 1990);
    const F = [
      [tr(`<b>${dest.clima_2025.ano} esteve ${fmt(dest.clima_2025.valor, 2)} °C acima do nível de 1850–1900.</b> ${dest.clima_2025.leitura}`, `<b>${dest.clima_2025.ano} was ${fmt(dest.clima_2025.valor, 2)} °C above the 1850–1900 level.</b> 2025 was the second or third warmest year; 2015–2025 were the eleven warmest years observed.`),
        miniBars([1980, 2000, 2010, 2020, 2024].map((a) => ({ l: String(a), v: tmp.find((p) => p.a === a).v, t: fmt(tmp.find((p) => p.a === a).v, 2) + " °C", hl: a === 2024 })), { max: t24.v })],
      [tr(`<b>O CO₂ atmosférico subiu ${fmt((co2L.v / co2F.v - 1) * 100)}% desde ${co2F.a}</b>, de ${fmt(co2F.v, 0)} para ${fmt(co2L.v, 0)} ppm em Mauna Loa.`, `<b>Atmospheric CO₂ has risen ${fmt((co2L.v / co2F.v - 1) * 100)}% since ${co2F.a}</b>, from ${fmt(co2F.v, 0)} to ${fmt(co2L.v, 0)} ppm at Mauna Loa.`),
        miniBars([{ l: String(co2F.a), v: co2F.v, t: fmt(co2F.v, 0) }, { l: "1990", v: co90.v, t: fmt(co90.v, 0) }, { l: String(co2L.a), v: co2L.v, t: fmt(co2L.v, 0), hl: true }], { max: co2L.v })],
      [tr(`<b>O nível do mar sobe ${fmt(dest.nivel_mar.valor, 2)} mm por ano</b>, quase o dobro de ${dest.nivel_mar.referencia.periodo}. Desde 1993 já subiu cerca de ${fmt(mar.at(-1).v, 0)} mm.`, `<b>Sea level is rising ${fmt(dest.nivel_mar.valor, 2)} mm a year</b>, almost double the rate of ${dest.nivel_mar.referencia.periodo}. Since 1993 it has risen about ${fmt(mar.at(-1).v, 0)} mm.`),
        miniBars([{ l: dest.nivel_mar.referencia.periodo, v: dest.nivel_mar.referencia.valor, t: fmt(dest.nivel_mar.referencia.valor, 2) + " mm/" + tr("ano", "yr") }, { l: dest.nivel_mar.periodo, v: dest.nivel_mar.valor, t: fmt(dest.nivel_mar.valor, 2) + " mm/" + tr("ano", "yr"), hl: true }])],
      [tr(`<b>${fmt(W.re.v, 1)}% da eletricidade mundial é renovável; em Portugal, ${fmt(pt("eletricidade_renovavel").v, 1)}%.</b> A União Europeia está em ${fmt(eu("eletricidade_renovavel").v, 1)}%.`, `<b>${fmt(W.re.v, 1)}% of world electricity is renewable; in Portugal, ${fmt(pt("eletricidade_renovavel").v, 1)}%.</b> The European Union is at ${fmt(eu("eletricidade_renovavel").v, 1)}%.`),
        miniBars([{ l: nm("WLD"), v: W.re.v, t: fmt(W.re.v, 1) + "%", c: css("--s1") }, { l: nm("EUU"), v: eu("eletricidade_renovavel").v, t: fmt(eu("eletricidade_renovavel").v, 1) + "%", c: css("--s3") }, { l: nm("PRT"), v: pt("eletricidade_renovavel").v, t: fmt(pt("eletricidade_renovavel").v, 1) + "%", c: css("--s2"), hl: true }], { max: 100 })],
      [tr(`<b>${fmt(100 - W.acc.v, 1)}% da população mundial ainda não tem eletricidade</b>, e ${accLow} Estados têm menos de 50% de acesso.`, `<b>${fmt(100 - W.acc.v, 1)}% of the world’s population still has no electricity</b>, and ${accLow} states have less than 50% access.`),
        miniBars(lowAcc.map((r, i) => ({ l: nm(r.c), v: r.v, t: fmt(r.v, 1) + "%", hl: i === 0 })), { max: 100 })],
      [tr(`<b>${pmAbove} de ${pmRows.length} Estados ultrapassam o valor-guia da OMS para PM2.5.</b> A exposição média mundial é ${fmt(W.pm.v, 1)} µg/m³, ${fmt(W.pm.v / D1.PM_GUIDE, 1)} vezes o guia.`, `<b>${pmAbove} of ${pmRows.length} states exceed the WHO guideline for PM2.5.</b> World average exposure is ${fmt(W.pm.v, 1)} µg/m³, ${fmt(W.pm.v / D1.PM_GUIDE, 1)} times the guideline.`),
        miniBars([{ l: nm("WLD"), v: W.pm.v, t: fmt(W.pm.v, 1), c: css("--s1") }, { l: nm("PRT"), v: pt("pm25").v, t: fmt(pt("pm25").v, 1), c: css("--s2"), hl: true }, { l: tr("Guia OMS", "WHO guideline"), v: D1.PM_GUIDE, t: String(D1.PM_GUIDE), c: css("--s3") }])],
      [tr(`<b>${wsCrit} Estados captam mais água doce do que a que se renova</b> (stress acima de 100%). A média mundial é ${fmt(W.ws.v, 1)}%.`, `<b>${wsCrit} states withdraw more freshwater than is renewed</b> (stress above 100%). The world average is ${fmt(W.ws.v, 1)}%.`),
        miniBars([{ l: nm("WLD"), v: W.ws.v, t: fmt(W.ws.v, 1) + "%", c: css("--s1") }, { l: nm("PRT"), v: pt("stress_hidrico").v, t: fmt(pt("stress_hidrico").v, 1) + "%", c: css("--s2"), hl: true }, { l: tr("Limite «sem stress»", "“No stress” limit"), v: 25, t: "25%", c: css("--s3") }], { max: 100 })],
      [tr(`<b>${fmt(W.dw.v, 1)}% da população mundial usa água potável gerida em segurança</b>; em Portugal, ${fmt(pt("agua_potavel").v, 1)}%. Em ${dwLow} Estados, menos de metade.`, `<b>${fmt(W.dw.v, 1)}% of the world’s population uses safely managed drinking water</b>; in Portugal, ${fmt(pt("agua_potavel").v, 1)}%. In ${dwLow} states, fewer than half.`),
        miniBars([{ l: nm("WLD"), v: W.dw.v, t: fmt(W.dw.v, 1) + "%", c: css("--s1") }, { l: nm("PRT"), v: pt("agua_potavel").v, t: fmt(pt("agua_potavel").v, 1) + "%", c: css("--s2"), hl: true }], { max: 100 })],
      [tr(`<b>${fmt(W.dg.v, 1)}% da terra do mundo está degradada</b> (${W.dg.y}, UNCCD). Portugal declarou ${fmt(pt("terra_degradada").v, 1)}%.`, `<b>${fmt(W.dg.v, 1)}% of the world’s land is degraded</b> (${W.dg.y}, UNCCD). Portugal reported ${fmt(pt("terra_degradada").v, 1)}%.`),
        miniBars([{ l: "2015", v: at("terra_degradada", "WLD", 2015), t: fmt(at("terra_degradada", "WLD", 2015), 1) + "%", c: css("--s4") }, { l: String(W.dg.y), v: W.dg.v, t: fmt(W.dg.v, 1) + "%", c: css("--s8"), hl: true }, { l: nm("PRT") + " " + pt("terra_degradada").y, v: pt("terra_degradada").v, t: fmt(pt("terra_degradada").v, 1) + "%", c: css("--s2") }], { max: 30 })],
      [tr(`<b>O índice mundial da Lista Vermelha desceu de ${fmt(rli0, 3)} para ${fmt(rli1.v, 3)}</b> (${rliY0}–${rli1.y}), e só ${fmt(W.tp.v, 1)}% da terra e ${fmt(W.mp.v, 1)}% do mar estão protegidos, face à meta de ${gbf}% em 2030.`, `<b>The world Red List Index fell from ${fmt(rli0, 3)} to ${fmt(rli1.v, 3)}</b> (${rliY0}–${rli1.y}), and only ${fmt(W.tp.v, 1)}% of land and ${fmt(W.mp.v, 1)}% of sea are protected, against the ${gbf}% target for 2030.`),
        miniBars([{ l: tr("Terra", "Land"), v: W.tp.v, t: fmt(W.tp.v, 1) + "%", c: css("--s3") }, { l: tr("Mar", "Sea"), v: W.mp.v, t: fmt(W.mp.v, 1) + "%", c: css("--s1") }, { l: tr("Meta 2030", "2030 target"), v: gbf, t: gbf + "%", c: css("--s4") }], { max: 35 })]
    ];
    const META_F = [["clima", "clima"], ["co2", "clima"], ["mar", "clima"], ["renovaveis", "energia"], ["acesso", "energia"], ["ar", "ar"], ["stress", "agua"], ["agua", "agua"], ["solo", "terra-vida"], ["vida", "terra-vida"]];
    const findings = () => F.map((f, i) => ({ id: META_F[i][0], cap: META_F[i][1], html: f[0], mini: f[1] || "" }));

    return { IND, P, SOB, nm, SC, colorOf, ser, last, at, rowsOf, pct, META, fv, clima, cs, co2, co2L, co2F, tmp, mar, dest, fonte, wl, pt, eu, W, rli, rli0, rli1, rliY0, pmRows, pmAbove, wsRows, wsCrit, accRows, accLow, dwRows, dwLow, gbf, D1, findings };
  }

  window.BioCulturaTerra = { load, create };
})();
