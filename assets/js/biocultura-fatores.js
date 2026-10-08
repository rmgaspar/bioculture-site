/* «Dos dados à parcela»: fatores que mudam o que se pode cultivar, cada um com os números do Observatório da Terra
   e da produção agrícola mundial (FAOSTAT) e as práticas regenerativas que lhes respondem. Serve três páginas, escolhidas
   por data-contexto no <section id="fatores">: conhecimento (seis fatores), calendario (quatro) e vinha (cinco, com a uva).
   Nada é escrito à mão: os valores saem de /data/observatorio-terra-relatorio.json, observatorio_global.json,
   vetores_pressao_global.json, observatorio_terra.json e agriculture-global.json. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos, T = window.BioCulturaTerra;
  const host = document.getElementById("fatores");
  if (!G || !T || !host) return;
  const contexto = host.dataset.contexto || "conhecimento";
  const { tr, fmt, esc, css, hbars, line, legend, miniBars, miniStack, EN } = G;
  const lang = new URLSearchParams(location.search).get("lang");
  const L = (href) => {
    if (!lang) return href;
    const [p, h] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(lang) + (h ? "#" + h : "");
  };
  const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });

  const COR = { clima: "#b4472f", agua: "#2a6fb0", solo: "#7d5a36", floresta: "#3d7a4a", vida: "#7a5aa6", alimento: "#b87a0c" };

  function construir(R, CLIMA, VET, PT, A) {
    const t = T.create(R, CLIMA, VET);
    const { last, at, ser, nm, W, tmp, co2, co2L, co2F, dest, rli, wsCrit } = t;
    const yr = (o, y) => (o && o.valores ? o.valores[String(y)] : null);
    const ST = PT.series_temporais, IT = PT.indicadores_territoriais;

    /* ---------- dados agrícolas (FAOSTAT) ---------- */
    const land = A.land, li = land.years.length - 1, ly = land.years[li];
    const ls = (k) => land.series[k];
    const lv = (k) => ls(k)[li];
    const landA = lv("6601"), agri = lv("6610"), crop = lv("6620"), past = lv("6655"), forest = lv("6646"), irrig = lv("6690"), org = lv("6671");
    const firstOf = (k) => { const i = ls(k).findIndex((v) => v != null); return { y: land.years[i], v: ls(k)[i] }; };
    const f0 = firstOf("6646"), o0 = firstOf("6671"), r0 = firstOf("6690");
    const ptl = A.pt_land;
    const cer = A.cereals, cy = cer.years;
    const idx = (a) => a.map((v) => (v == null ? null : v / a[0] * 100));
    const ssr = (id) => A.pt_ssr.rows.find((r) => r.id === id);
    const ptWheat = ssr(15), ptMaize = ssr(56), ptOil = ssr(261), ptPear = ssr(521);

    /* ---------- Portugal: clima e território ---------- */
    const anom = yr(ST.anomalia_temperatura_continente, 2025), pr24 = yr(ST.precipitacao_anual_continente, 2024), pr25 = yr(ST.precipitacao_anual_continente, 2025);
    const fire = ST.area_ardida_continente.valores, fireYears = Object.keys(fire).map(Number).sort((a, b) => a - b);
    const des = IT.suscetibilidade_desertificacao, desC = des.classes_percent, semi = des.area_semiarida;
    const flood = IT.areas_risco_inundacao.valor;
    const dgW = (y) => at("terra_degradada", "WLD", y), dgP = (y) => at("terra_degradada", "PRT", y);
    const dgL = last("terra_degradada", "WLD"), dgPL = last("terra_degradada", "PRT");
    const pa = last("area_protegida_terra", "WLD"), pm = last("area_protegida_mar", "WLD");
    const rliP = last("lista_vermelha", "PRT"), rliW = last("lista_vermelha", "WLD");
    const ws = last("stress_hidrico", "WLD"), wsP = last("stress_hidrico", "PRT");
    const m = (n) => fmt(n, 1);

    /* Cada fator: valor-destaque do botão, gráfico(s), números com fonte, práticas e ligações. */
    const F = [
      {
        id: "clima", c: COR.clima, nome: tr("Calor e clima", "Heat and climate"),
        v: "+" + fmt(dest.clima_2025.valor, 2) + " °C", k: tr("2025 acima de 1850–1900", "2025 above 1850–1900"),
        titulo: tr("O clima já mudou o ano agrícola", "The climate has already changed the farming year"),
        fig: [{
          t: tr("Anomalia da temperatura global à superfície", "Global surface temperature anomaly"),
          d: tr("Diferença para a média de 1951–1980, em °C, 1880–" + tmp.at(-1).a + ".", "Difference from the 1951–1980 average, in °C, 1880–" + tmp.at(-1).a + "."),
          src: "NASA GISS, GISTEMP v4",
          draw: (el) => line(el, { x: tmp.map((p) => p.a), series: [{ n: tr("Anomalia", "Anomaly"), c: css("--s2"), v: tmp.map((p) => p.v), w: 2.2 }], zero: false, ref: 0, yf: (v) => fmt(v, 1), tf: (s, i) => fmt(s.v[i], 2) + " °C", aria: tr("Anomalia da temperatura global", "Global temperature anomaly"), table: true, tableEvery: 10 })
        }],
        factos: [
          tr(`<b>${dest.clima_2025.ano} esteve ${fmt(dest.clima_2025.valor, 2)} °C acima do nível de 1850–1900</b> (OMM). ${dest.clima_2025.leitura}`, `<b>${dest.clima_2025.ano} was ${fmt(dest.clima_2025.valor, 2)} °C above the 1850–1900 level</b> (WMO). 2025 was the second or third warmest year; 2015–2025 were the eleven warmest years observed.`),
          tr(`<b>O CO₂ atmosférico subiu de ${fmt(co2F.v, 0)} para ${fmt(co2L.v, 0)} ppm</b> entre ${co2F.a} e ${co2L.a} (NOAA, Mauna Loa).`, `<b>Atmospheric CO₂ rose from ${fmt(co2F.v, 0)} to ${fmt(co2L.v, 0)} ppm</b> between ${co2F.a} and ${co2L.a} (NOAA, Mauna Loa).`),
          tr(`<b>Em Portugal continental, 2025 ficou ${fmt(anom, 2)} °C acima da normal 1991–2020</b> (IPMA).`, `<b>In mainland Portugal, 2025 was ${fmt(anom, 2)} °C above the 1991–2020 normal</b> (IPMA).`),
          tr(`<b>A chuva oscila muito de ano para ano:</b> ${fmt(pr24, 0)} mm em 2024 e ${fmt(pr25, 0)} mm em 2025 em Portugal continental (IPMA). A média esconde os extremos.`, `<b>Rainfall swings a lot from year to year:</b> ${fmt(pr24, 0)} mm in 2024 and ${fmt(pr25, 0)} mm in 2025 in mainland Portugal (IPMA). The average hides the extremes.`)
        ],
        praticas: [
          [tr("Solo sempre coberto", "Keep the soil covered"), tr("Cobertura morta ou plantas de cobertura dão sombra ao solo e reduzem a evaporação; a terra nua aquece e seca mais depressa.", "Mulch or cover crops shade the soil and reduce evaporation; bare ground heats up and dries out faster.")],
          [tr("Mais matéria orgânica", "More organic matter"), tr("Composto e restos de poda alimentam o solo e ajudam-no a guardar água entre chuvas.", "Compost and pruning residues feed the soil and help it hold water between rains.")],
          [tr("Sombra e abrigo", "Shade and shelter"), tr("Sebes, árvores nas bordaduras e quebra-ventos suavizam o calor e o vento sobre as culturas.", "Hedges, trees on field edges and windbreaks soften heat and wind over crops.")],
          [tr("Janelas, não datas", "Windows, not dates"), tr("Antecipar ou atrasar sementeiras conforme o ano e repartir o risco por várias culturas e ciclos.", "Bring sowing forward or delay it according to the year and spread risk across several crops and cycles.")]
        ],
        links: [[tr("Clima no Observatório da Terra", "Climate in the Earth Observatory"), "/observatorio/observatorio-terra.html#clima"], [tr("Depois de 1,5 °C", "After 1.5 °C"), "/observatorio/limitar-ultrapassagem-1-5.html"], [tr("Calendário da regeneração", "Regeneration calendar"), "/calendario/calendario.html"]]
      },
      {
        id: "agua", c: COR.agua, nome: tr("Água e secas", "Water and drought"),
        v: "×" + fmt(irrig / r0.v, 1), k: tr("terra equipada para rega desde " + r0.y, "irrigation-equipped land since " + r0.y),
        titulo: tr("A água é o primeiro limite da parcela", "Water is the first limit of the plot"),
        fig: [{
          t: tr("Terra equipada para rega no mundo", "Irrigation-equipped land worldwide"),
          d: tr("Milhões de hectares, " + r0.y + "–" + ly + ".", "Million hectares, " + r0.y + "–" + ly + "."),
          src: "FAOSTAT, uso do solo (RL)",
          draw: (el) => line(el, { x: land.years, series: [{ n: tr("Terra equipada para rega", "Irrigation-equipped land"), c: css("--s1"), v: ls("6690"), w: 2.2 }], zero: false, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0) + " Mha", aria: tr("Terra equipada para rega", "Irrigation-equipped land"), table: true, tableEvery: 10 })
        }, {
          t: tr("Stress hídrico", "Water stress"),
          d: tr("Percentagem dos recursos de água doce renováveis que é captada (ano mais recente). Acima de 25% já há stress.", "Share of renewable freshwater resources that is withdrawn (latest year). Above 25% there is already stress."),
          src: "FAO AQUASTAT, ODS 6.4.2",
          html: miniBars([{ l: nm("WLD") + " " + ws.y, v: ws.v, t: fmt(ws.v, 1) + "%", c: css("--s1") }, { l: nm("PRT") + " " + wsP.y, v: wsP.v, t: fmt(wsP.v, 1) + "%", c: css("--s2"), hl: true }, { l: tr("Limite «sem stress»", "“No stress” limit"), v: 25, t: "25%", c: css("--s3") }], { max: 100 })
        }],
        factos: [
          tr(`<b>${wsCrit} Estados captam mais água doce do que a que se renova</b> (stress acima de 100%). A média mundial é ${fmt(ws.v, 1)}% e a de Portugal ${fmt(wsP.v, 1)}% (${wsP.y}); a média nacional esconde regiões e estações muito mais secas.`, `<b>${wsCrit} states withdraw more freshwater than is renewed</b> (stress above 100%). The world average is ${fmt(ws.v, 1)}% and Portugal’s is ${fmt(wsP.v, 1)}% (${wsP.y}); the national average hides much drier regions and seasons.`),
          tr(`<b>A terra equipada para rega passou de ${fmt(r0.v, 0)} para ${fmt(irrig, 0)} milhões de hectares</b> (${r0.y}–${ly}), ${fmt(irrig / agri * 100, 1)}% da terra agrícola mundial.`, `<b>Irrigation-equipped land went from ${fmt(r0.v, 0)} to ${fmt(irrig, 0)} million hectares</b> (${r0.y}–${ly}), ${fmt(irrig / agri * 100, 1)}% of the world’s agricultural land.`),
          tr(`<b>Em Portugal, ${fmt(ptl["6690"] / ptl["6610"] * 100, 1)}% da terra agrícola está equipada para rega</b> (${ptl.year}).`, `<b>In Portugal, ${fmt(ptl["6690"] / ptl["6610"] * 100, 1)}% of agricultural land is equipped for irrigation</b> (${ptl.year}).`),
          tr(`<b>Secas e cheias fazem parte do mesmo ciclo:</b> Portugal tem ${flood} áreas de risco potencial significativo de inundação (ciclo 2022–2027, APA).`, `<b>Droughts and floods are part of the same cycle:</b> Portugal has ${flood} areas of significant potential flood risk (2022–2027 cycle, APA).`)
        ],
        praticas: [
          [tr("Guardar a água onde cai", "Keep water where it falls"), tr("Valas e leiras em nível, solo coberto e matéria orgânica fazem a chuva infiltrar-se em vez de escorrer.", "Contour swales and ridges, covered soil and organic matter make rain soak in instead of running off.")],
          [tr("Captar a chuva", "Harvest rainwater"), tr("Cisternas, tanques e telhados ligados à horta guardam água do inverno para o verão.", "Cisterns, tanks and roofs connected to the garden store winter water for summer.")],
          [tr("Regar melhor, não mais", "Water better, not more"), tr("Gota a gota, de manhã cedo ou ao fim do dia, e só depois de olhar para a humidade do solo.", "Drip irrigation, early morning or evening, and only after checking soil moisture.")],
          [tr("Culturas à medida da água", "Crops matched to water"), tr("Variedades e culturas de sequeiro ou de ciclo curto nas zonas e épocas mais secas.", "Dryland or short-cycle varieties and crops in the driest zones and seasons.")]
        ],
        links: [[tr("Água no Observatório da Terra", "Water in the Earth Observatory"), "/observatorio/observatorio-terra.html#agua"], [tr("Página da água", "Water page"), "/recursos/agua.html"], [tr("Técnicas e soluções", "Techniques and solutions"), "/services/servicos.html#catalogo-tecnicas"]]
      },
      {
        id: "solo", c: COR.solo, nome: tr("Solo e desertificação", "Soil and desertification"),
        v: fmt(des.valor, 1) + "%", k: tr("do território continental com suscetibilidade alta ou muito elevada à desertificação", "of mainland Portugal highly or very highly susceptible to desertification"),
        titulo: tr("O solo é o que nos separa do deserto", "Soil is what stands between us and desert"),
        fig: [{
          t: tr("Suscetibilidade à desertificação em Portugal continental", "Desertification susceptibility in mainland Portugal"),
          d: tr("Percentagem do território por classe do Índice de Suscetibilidade à Desertificação, 2024.", "Share of territory by class of the Desertification Susceptibility Index, 2024."),
          src: "APA, Relatório do Estado do Ambiente (ISD 2024)",
          draw: (el) => hbars(el, [
            { l: tr("Muito elevada", "Very high"), v: desC.muito_elevada, t: fmt(desC.muito_elevada, 1) + "%", c: "#8f3b3b" },
            { l: tr("Alta", "High"), v: desC.alta, t: fmt(desC.alta, 1) + "%", c: "#c4693b" },
            { l: tr("Moderada", "Moderate"), v: desC.moderada, t: fmt(desC.moderada, 1) + "%", c: "#d9a441" },
            { l: tr("Ligeira", "Slight"), v: desC.ligeira, t: fmt(desC.ligeira, 1) + "%", c: "#9fb287" }
          ], { max: 50, unit: "%", table: [tr("Classe", "Class"), "%"] })
        }, {
          t: tr("Terra degradada (% da área)", "Degraded land (% of area)"),
          d: tr("Valores declarados por cada país à UNCCD; comparar com cautela entre países.", "Values reported by each country to UNCCD; compare with caution between countries."),
          src: "UNCCD, ODS 15.3.1",
          html: miniBars([{ l: nm("WLD") + " 2015", v: dgW(2015), t: fmt(dgW(2015), 1) + "%", c: css("--s4") }, { l: nm("WLD") + " " + dgL.y, v: dgL.v, t: fmt(dgL.v, 1) + "%", c: css("--s8"), hl: true }, { l: nm("PRT") + " 2015", v: dgP(2015), t: fmt(dgP(2015), 1) + "%", c: css("--s4") }, { l: nm("PRT") + " " + dgPL.y, v: dgPL.v, t: fmt(dgPL.v, 1) + "%", c: css("--s2"), hl: true }], { max: 30 })
        }],
        factos: [
          tr(`<b>${fmt(des.valor, 1)}% de Portugal continental tem suscetibilidade alta ou muito elevada à desertificação</b>, e 38,2% moderada (APA, ISD 2024).`, `<b>${fmt(des.valor, 1)}% of mainland Portugal has high or very high susceptibility to desertification</b>, and 38.2% moderate (APA, DSI 2024).`),
          tr(`<b>As áreas semiáridas aumentaram ${fmt(semi.variacao_percent, 0)}%</b> entre ${semi.de} e ${semi.ate} (${semi.fonte}).`, `<b>Semi-arid areas grew ${fmt(semi.variacao_percent, 0)}%</b> between ${semi.de} and ${semi.ate} (${semi.fonte}).`),
          tr(`<b>${fmt(dgL.v, 1)}% da terra do mundo está degradada</b> (${dgL.y}), contra ${fmt(dgW(2015), 1)}% em 2015 (UNCCD).`, `<b>${fmt(dgL.v, 1)}% of the world’s land is degraded</b> (${dgL.y}), up from ${fmt(dgW(2015), 1)}% in 2015 (UNCCD).`),
          tr(`<b>Cerca de 1,5 mil milhões de hectares precisam de restauro até 2030</b> (Relatório ODS 2025 da ONU).`, `<b>About 1.5 billion hectares need restoration by 2030</b> (UN SDG Report 2025).`)
        ],
        praticas: [
          [tr("Nunca deixar o solo nu", "Never leave soil bare"), tr("Plantas de cobertura, adubos verdes e cobertura morta protegem da chuva forte, do sol e do vento.", "Cover crops, green manures and mulch protect from heavy rain, sun and wind.")],
          [tr("Mexer o menos possível", "Disturb as little as possible"), tr("Mobilização mínima preserva a estrutura e a vida do solo, e reduz a erosão.", "Minimum tillage preserves soil structure and life, and reduces erosion.")],
          [tr("Compostar e rodar", "Compost and rotate"), tr("Composto devolve matéria orgânica; rotações e leguminosas mantêm a fertilidade sem esgotar a terra.", "Compost returns organic matter; rotations and legumes keep fertility without exhausting the land.")],
          [tr("Travar a erosão", "Stop erosion"), tr("Linhas em nível, sebes e faixas de vegetação seguram a terra nas encostas.", "Contour lines, hedges and vegetation strips hold the soil on slopes.")]
        ],
        links: [[tr("Solo no Observatório da Terra", "Soil in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"], [tr("Página do solo", "Soil page"), "/recursos/solo.html"], [tr("Problemas na horta", "Garden problems"), "#problemas"]]
      },
      {
        id: "floresta", c: COR.floresta, nome: tr("Floresta e fogo", "Forest and fire"),
        v: "−" + fmt(f0.v - forest, 0) + " Mha", k: tr("de floresta no mundo desde " + f0.y + " (balanço líquido)", "of world forest since " + f0.y + " (net)"),
        titulo: tr("Sem árvores, a parcela fica sozinha", "Without trees, the plot stands alone"),
        fig: [{
          t: tr("Área ardida em Portugal continental", "Area burned in mainland Portugal"),
          d: tr("Hectares por ano em incêndios rurais. 2025 é provisório.", "Hectares per year in rural fires. 2025 is provisional."),
          src: "ICNF, estatísticas de incêndios rurais",
          draw: (el) => hbars(el, fireYears.map((y) => ({ l: String(y) + (y === fireYears.at(-1) ? tr(" (provisório)", " (provisional)") : ""), v: fire[y], t: fmt(fire[y], 0) + " ha", hl: y === 2017 || y === fireYears.at(-1) })), { unit: "ha", table: [tr("Ano", "Year"), "ha"] })
        }, {
          t: tr("Como se usa a terra emersa do mundo", "How the world’s land is used"),
          d: tr("Percentagem da área terrestre, " + ly + ".", "Share of land area, " + ly + "."),
          src: "FAOSTAT, uso do solo (RL)",
          html: miniStack([{ l: tr("Floresta", "Forest"), v: forest / landA * 100, c: COR.floresta }, { l: tr("Pastagens", "Pasture"), v: past / landA * 100, c: css("--s3") }, { l: tr("Cultivo", "Cropland"), v: crop / landA * 100, c: css("--s4") }, { l: tr("Resto", "Other"), v: 100 - (forest + past + crop) / landA * 100, c: css("--bar-dim") }])
        }],
        factos: [
          tr(`<b>A floresta mundial passou de ${fmt(f0.v, 0)} para ${fmt(forest, 0)} milhões de hectares</b> (${f0.y}–${ly}), menos ${fmt((f0.v - forest) / f0.v * 100, 1)}%. É um balanço líquido (perdas menos ganhos), não desflorestação bruta (FAOSTAT).`, `<b>World forest went from ${fmt(f0.v, 0)} to ${fmt(forest, 0)} million hectares</b> (${f0.y}–${ly}), down ${fmt((f0.v - forest) / f0.v * 100, 1)}%. This is a net balance (losses minus gains), not gross deforestation (FAOSTAT).`),
          tr(`<b>A agricultura ocupa ${fmt(agri / landA * 100, 0)}% da terra emersa</b>, e ${fmt(past / agri * 100, 0)}% dessa área são pastagens (FAOSTAT).`, `<b>Agriculture occupies ${fmt(agri / landA * 100, 0)}% of the world’s land</b>, and ${fmt(past / agri * 100, 0)}% of that area is pasture (FAOSTAT).`),
          tr(`<b>Em Portugal, a floresta cobre ${fmt(ptl["6646"] / ptl["6601"] * 100, 1)}% do território</b> e a terra agrícola ${fmt(ptl["6610"] / ptl["6601"] * 100, 1)}% (${ptl.year}).`, `<b>In Portugal, forest covers ${fmt(ptl["6646"] / ptl["6601"] * 100, 1)}% of the territory</b> and agricultural land ${fmt(ptl["6610"] / ptl["6601"] * 100, 1)}% (${ptl.year}).`),
          tr(`<b>A área ardida varia muito:</b> ${fmt(fire[2017], 0)} ha em 2017 e ${fmt(fire[fireYears.at(-1)], 0)} ha em ${fireYears.at(-1)} (provisório). Área ardida num ano não equivale a desflorestação líquida (ICNF).`, `<b>Burned area varies a lot:</b> ${fmt(fire[2017], 0)} ha in 2017 and ${fmt(fire[fireYears.at(-1)], 0)} ha in ${fireYears.at(-1)} (provisional). Area burned in a year is not the same as net deforestation (ICNF).`)
        ],
        praticas: [
          [tr("Árvores dentro da parcela", "Trees inside the plot"), tr("Sistemas agroflorestais dão sombra, abrigo do vento, folhada para o solo e uma segunda colheita.", "Agroforestry gives shade, wind shelter, leaf litter for the soil and a second harvest.")],
          [tr("Mosaicos que travam o fogo", "Mosaics that slow fire"), tr("Parcelas agrícolas e pastagens verdes entre manchas de mato e floresta quebram a continuidade do combustível.", "Farmland and green pastures between patches of scrub and forest break the continuity of fuel.")],
          [tr("Gerir o combustível", "Manage fuel"), tr("Faixas limpas à volta de casas e caminhos, e pastoreio ou corte do mato nas zonas críticas.", "Cleared strips around houses and tracks, and grazing or cutting of scrub in critical zones.")],
          [tr("Proteger as linhas de água", "Protect watercourses"), tr("Galerias ripícolas mantêm a água, a humidade e a vida junto às ribeiras.", "Riparian strips keep water, moisture and life along streams.")]
        ],
        links: [[tr("Solo e vida no Observatório da Terra", "Land and life in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"], [tr("Biodiversidade", "Biodiversity"), "/ecossistemas/biodiversidade.html"], [tr("Soluções naturais", "Natural solutions"), "/services/servicos.html#catalogo-tecnicas"]]
      },
      {
        id: "vida", c: COR.vida, nome: tr("Vida e biodiversidade", "Life and biodiversity"),
        v: fmt(rliW.v, 3), k: tr("índice da Lista Vermelha mundial (1 = nenhuma espécie ameaçada)", "world Red List Index (1 = no species threatened)"),
        titulo: tr("Uma parcela viva trabalha por ti", "A living plot works for you"),
        fig: [{
          t: tr("Índice da Lista Vermelha", "Red List Index"),
          d: tr("1 = nenhuma espécie ameaçada; 0 = todas extintas. Descer significa mais risco de extinção.", "1 = no species threatened; 0 = all extinct. A decline means higher extinction risk."),
          src: "IUCN e BirdLife International, ODS 15.5.1",
          draw: (el) => {
            const a0 = Math.min(ser("lista_vermelha", "WLD").a, ser("lista_vermelha", "PRT").a), a1 = Math.max(rliW.y, rliP.y), xs = [];
            for (let y = a0; y <= a1; y++) xs.push(y);
            const row = (c) => xs.map((y) => at("lista_vermelha", c, y));
            line(el, { x: xs, series: [{ n: nm("WLD"), c: css("--s1"), v: row("WLD") }, { n: nm("PRT"), c: css("--s2"), v: row("PRT") }], zero: false, yf: (v) => fmt(v, 2), tf: (s, i) => fmt(s.v[i], 3), endLabels: true, aria: tr("Índice da Lista Vermelha", "Red List Index"), table: true, tableEvery: 5 });
          }
        }, {
          t: tr("Agricultura biológica (% da terra agrícola)", "Organic farming (% of agricultural land)"),
          d: tr("Área em agricultura biológica sobre a terra agrícola total, " + ly + ".", "Organic farming area over total agricultural land, " + ly + "."),
          src: "FAOSTAT, uso do solo (RL)",
          html: miniBars([{ l: nm("WLD"), v: org / agri * 100, t: fmt(org / agri * 100, 1) + "%", c: css("--s1") }, { l: nm("PRT"), v: ptl["6671"] / ptl["6610"] * 100, t: fmt(ptl["6671"] / ptl["6610"] * 100, 1) + "%", c: css("--s2"), hl: true }], { max: 30 })
        }],
        factos: [
          tr(`<b>O índice mundial da Lista Vermelha desceu de ${fmt(rli.v.find((v) => v != null), 3)} para ${fmt(rliW.v, 3)}</b> (${ser("lista_vermelha", "WLD").a}–${rliW.y}); o de Portugal é ${fmt(rliP.v, 3)} (${rliP.y}).`, `<b>The world Red List Index fell from ${fmt(rli.v.find((v) => v != null), 3)} to ${fmt(rliW.v, 3)}</b> (${ser("lista_vermelha", "WLD").a}–${rliW.y}); Portugal’s is ${fmt(rliP.v, 3)} (${rliP.y}).`),
          tr(`<b>Cerca de 1 milhão de espécies estão ameaçadas de extinção</b>, muitas nas próximas décadas, se os fatores de perda não diminuírem (IPBES, 2019).`, `<b>About 1 million species are threatened with extinction</b>, many in the coming decades, unless the drivers of loss decrease (IPBES, 2019).`),
          tr(`<b>Só ${fmt(pa.v, 1)}% da terra e ${fmt(pm.v, 1)}% do mar estão protegidos</b>, face à meta de ${t.gbf}% em 2030 (Quadro de Kunming-Montreal).`, `<b>Only ${fmt(pa.v, 1)}% of land and ${fmt(pm.v, 1)}% of sea are protected</b>, against the ${t.gbf}% target for 2030 (Kunming-Montreal Framework).`),
          tr(`<b>A agricultura biológica já cobre ${fmt(org, 0)} milhões de hectares no mundo</b>, ${fmt(org / o0.v, 1)} vezes mais do que em ${o0.y}, mas só ${fmt(org / agri * 100, 1)}% da terra agrícola. Em Portugal são ${fmt(ptl["6671"] / ptl["6610"] * 100, 1)}%.`, `<b>Organic farming now covers ${fmt(org, 0)} million hectares worldwide</b>, ${fmt(org / o0.v, 1)} times more than in ${o0.y}, but only ${fmt(org / agri * 100, 1)}% of agricultural land. In Portugal it is ${fmt(ptl["6671"] / ptl["6610"] * 100, 1)}%.`)
        ],
        praticas: [
          [tr("Bordaduras e sebes floridas", "Flowering edges and hedges"), tr("Abrigo e alimento para polinizadores e auxiliares, que fazem parte do controlo das pragas.", "Shelter and food for pollinators and beneficial insects, which are part of pest control.")],
          [tr("Menos intervenção, mais observação", "Less intervention, more observation"), tr("Diagnosticar antes de tratar e preferir métodos biológicos mantém vivos os inimigos naturais das pragas.", "Diagnosing before treating and preferring biological methods keeps the natural enemies of pests alive.")],
          [tr("Diversidade no tempo e no espaço", "Diversity in time and space"), tr("Consociações, rotações e várias variedades tornam a parcela menos vulnerável a uma só praga ou doença.", "Companion planting, rotations and several varieties make the plot less vulnerable to a single pest or disease.")],
          [tr("Água e abrigos", "Water and shelter"), tr("Uma charca, pedras, madeira morta e vegetação espontânea dão casa a anfíbios, aves e insetos.", "A pond, stones, dead wood and spontaneous vegetation give a home to amphibians, birds and insects.")]
        ],
        links: [[tr("Biodiversidade no Observatório da Terra", "Biodiversity in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"], [tr("Página da biodiversidade", "Biodiversity page"), "/ecossistemas/biodiversidade.html"], [tr("Problemas na horta", "Garden problems"), "#problemas"]]
      },
      {
        id: "alimento", c: COR.alimento, nome: tr("Alimento e terra", "Food and land"),
        v: "×" + fmt(cer.prod_mt.at(-1) / cer.prod_mt[0], 1), k: tr("cereais colhidos desde " + cy[0] + ", com só +" + fmt((cer.area_mha.at(-1) / cer.area_mha[0] - 1) * 100, 0) + "% de área", "cereals harvested since " + cy[0] + ", with only +" + fmt((cer.area_mha.at(-1) / cer.area_mha[0] - 1) * 100, 0) + "% area"),
        titulo: tr("Mais comida com quase a mesma terra, e a que custo", "More food from almost the same land, and at what cost"),
        fig: [{
          t: tr("Cereais no mundo: produção, rendimento e área", "World cereals: output, yield and area"),
          d: tr("Índice, " + cy[0] + " = 100.", "Index, " + cy[0] + " = 100."),
          src: "FAOSTAT, produção (QCL)",
          draw: (el) => line(el, { x: cy, series: [{ n: tr("Produção", "Output"), c: css("--s4"), v: idx(cer.prod_mt) }, { n: tr("Rendimento por hectare", "Yield per hectare"), c: css("--s6"), v: idx(cer.yield_tha) }, { n: tr("Área colhida", "Harvested area"), c: css("--s2"), v: idx(cer.area_mha) }], zero: true, ref: 100, yf: (v) => fmt(v, 0), tf: (s, i) => fmt(s.v[i], 0), endLabels: true, aria: tr("Cereais no mundo", "World cereals"), table: true, tableEvery: 10 })
        }, {
          t: tr("Quanto Portugal produz do que consome", "How much of what it consumes Portugal produces"),
          d: tr("Produção ÷ consumo aparente, média " + ptWheat.years[0] + "–" + ptWheat.years.at(-1) + ". 100% = autossuficiente.", "Production ÷ apparent consumption, " + ptWheat.years[0] + "–" + ptWheat.years.at(-1) + " average. 100% = self-sufficient."),
          src: "FAOSTAT, produção e comércio",
          html: miniBars([[ptWheat, tr("Trigo", "Wheat")], [ptMaize, tr("Milho", "Maize")], [ptPear, tr("Pera", "Pears")], [ptOil, tr("Azeite", "Olive oil")]].map(([r, l]) => ({ l, v: Math.min(r.ssr, 250), t: fmt(r.ssr, 0) + "%", hl: r.ssr >= 100 })), { max: 250, ref: 100 })
        }],
        factos: [
          tr(`<b>Os cereais multiplicaram-se por ${fmt(cer.prod_mt.at(-1) / cer.prod_mt[0], 1)} desde ${cy[0]}</b>; o rendimento por hectare por ${fmt(cer.yield_tha.at(-1) / cer.yield_tha[0], 1)} e a área só ${fmt((cer.area_mha.at(-1) / cer.area_mha[0] - 1) * 100, 0)}% (FAOSTAT).`, `<b>Cereals grew ${fmt(cer.prod_mt.at(-1) / cer.prod_mt[0], 1)}-fold since ${cy[0]}</b>; yield per hectare ${fmt(cer.yield_tha.at(-1) / cer.yield_tha[0], 1)}-fold and area only ${fmt((cer.area_mha.at(-1) / cer.area_mha[0] - 1) * 100, 0)}% (FAOSTAT).`),
          tr(`<b>A terra cultivada cresceu de ${fmt(ls("6620")[0], 0)} para ${fmt(crop, 0)} milhões de hectares</b> (${land.years[0]}–${ly}); as pastagens ocupam ${fmt(past / agri * 100, 0)}% da terra agrícola.`, `<b>Cropland grew from ${fmt(ls("6620")[0], 0)} to ${fmt(crop, 0)} million hectares</b> (${land.years[0]}–${ly}); pasture takes ${fmt(past / agri * 100, 0)}% of agricultural land.`),
          tr(`<b>Portugal produz cerca de ${fmt(ptWheat.ssr, 0)}% do trigo e ${fmt(ptMaize.ssr, 0)}% do milho que consome</b>, e bastante mais do que consome de azeite (${fmt(ptOil.ssr, 0)}%) e de pera (${fmt(ptPear.ssr, 0)}%).`, `<b>Portugal produces about ${fmt(ptWheat.ssr, 0)}% of the wheat and ${fmt(ptMaize.ssr, 0)}% of the maize it consumes</b>, and well above its own use of olive oil (${fmt(ptOil.ssr, 0)}%) and pears (${fmt(ptPear.ssr, 0)}%).`),
          tr(`<b>Em paralelo, a terra equipada para rega mais do que duplicou</b> (${r0.y}–${ly}). Os outros cinco fatores mostram o estado da água, do solo e da vida em que esta produção assenta.`, `<b>In parallel, irrigation-equipped land more than doubled</b> (${r0.y}–${ly}). The other five factors show the state of the water, soil and life on which this production rests.`)
        ],
        praticas: [
          [tr("Produzir perto de quem come", "Produce close to those who eat"), tr("Hortas, quintais e mercados locais encurtam a distância entre a terra e o prato.", "Gardens, yards and local markets shorten the distance between land and plate.")],
          [tr("Variedades locais e sementes próprias", "Local varieties and own seeds"), tr("Variedades adaptadas ao lugar aguentam melhor o clima e a falta de água, e guardam-se de um ano para o outro.", "Varieties adapted to the place cope better with climate and water scarcity, and can be saved from year to year.")],
          [tr("Rotações com leguminosas", "Rotations with legumes"), tr("Feijão, ervilha e favas devolvem azoto ao solo e dão alimento na mesma parcela.", "Beans, peas and broad beans return nitrogen to the soil and give food on the same plot.")],
          [tr("Medir o que se faz", "Measure what you do"), tr("Registar datas, produções e problemas num caderno ajuda a perceber o que funciona no teu terreno.", "Recording dates, yields and problems in a notebook helps you see what works on your land.")]
        ],
        links: [[tr("Relatório de produção agrícola", "Agricultural production report"), "/observatorio/producao-agricola.html"], [tr("Calendário da regeneração", "Regeneration calendar"), "/calendario/calendario.html"], [tr("Vinha Viva", "Living Vineyard"), "/calendario/enologia.html"]]
      }
    ];


    /* ---------- a uva e o vinho (só na Vinha Viva) ---------- */
    let DNr; try { DNr = new Intl.DisplayNames(EN ? ["en-GB", "en"] : ["pt-PT", "pt"], { type: "region" }); } catch (e) { DNr = null; }
    const an = (code) => {
      const a = A.areas[String(code)]; if (!a) return String(code);
      if (a.iso2 === "CN") return "China";
      if (a.iso2 === "US") return tr("Estados Unidos", "United States");
      if (a.iso2 && DNr) { try { const n = DNr.of(a.iso2); if (n && n !== a.iso2) return n; } catch (e) { /* usa o nome inglês */ } }
      return a.en || String(code);
    };
    const uvas = A.key.find((k) => k.id === 560), vinho = A.key.find((k) => k.id === 564);
    const rk = (r) => tr(`${r.rank}.º de ${r.n} países`, `rank ${r.rank} of ${r.n} countries`);
    const top5 = uvas.top.slice(0, 5).map((r) => an(r.a)).join(", ");
    const UVA = {
      id: "uva", c: "#8a3b5c", nome: tr("A uva e o vinho", "Grapes and wine"),
      v: fmt(uvas.world_mt, 1) + " Mt", k: tr("de uvas colhidas no mundo em " + uvas.year, "of grapes harvested worldwide in " + uvas.year),
      titulo: tr("Uma cultura concentrada em poucos países", "A crop concentrated in a few countries"),
      fig: [{
        t: tr("Uvas colhidas no mundo", "Grapes harvested worldwide"),
        d: tr("Milhões de toneladas por ano, " + uvas.world_ts.y0 + "–" + uvas.year + ".", "Million tonnes per year, " + uvas.world_ts.y0 + "–" + uvas.year + "."),
        src: "FAOSTAT, produção (QCL)",
        draw: (el) => line(el, { x: uvas.world_ts.mt.map((_, i) => uvas.world_ts.y0 + i), series: [{ n: tr("Uvas", "Grapes"), c: css("--s7"), v: uvas.world_ts.mt, w: 2.2 }], zero: false, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " Mt", aria: tr("Uvas colhidas no mundo", "Grapes harvested worldwide"), table: true, tableEvery: 10 })
      }, {
        t: tr("Quem mais colhe uvas", "Who harvests the most grapes"),
        d: tr("Milhões de toneladas, " + uvas.year + ". Portugal a laranja.", "Million tonnes, " + uvas.year + ". Portugal in orange."),
        src: "FAOSTAT, produção (QCL)",
        draw: (el) => hbars(el, uvas.top.slice(0, 8).map((r) => ({ l: an(r.a), v: r.t / 1e6, t: fmt(r.t / 1e6, 1) + " Mt" })).concat([{ l: "Portugal · " + rk(uvas.pt), v: uvas.pt.t / 1e6, t: fmt(uvas.pt.t / 1e6, 2) + " Mt", hl: true }]), { unit: "Mt", table: [tr("País", "Country"), "Mt"] })
      }],
      factos: [
        tr(`<b>O mundo colhe ${fmt(uvas.world_mt, 1)} milhões de toneladas de uvas</b> (${uvas.year}), contra ${fmt(uvas.world_ts.mt[0], 1)} em ${uvas.world_ts.y0} (FAOSTAT).`, `<b>The world harvests ${fmt(uvas.world_mt, 1)} million tonnes of grapes</b> (${uvas.year}), against ${fmt(uvas.world_ts.mt[0], 1)} in ${uvas.world_ts.y0} (FAOSTAT).`),
        tr(`<b>Cinco países colhem ${fmt(uvas.top5_share, 0)}% das uvas</b>: ${top5}.`, `<b>Five countries harvest ${fmt(uvas.top5_share, 0)}% of the grapes</b>: ${top5}.`),
        tr(`<b>Portugal colhe ${fmt(uvas.pt.t / 1000, 0)} mil toneladas de uvas</b> (${rk(uvas.pt)}) e produz ${fmt(vinho.pt.t / 1000, 0)} mil toneladas de vinho (${rk(vinho.pt)}, ${vinho.year}).`, `<b>Portugal harvests ${fmt(uvas.pt.t / 1000, 0)} thousand tonnes of grapes</b> (${rk(uvas.pt)}) and makes ${fmt(vinho.pt.t / 1000, 0)} thousand tonnes of wine (${rk(vinho.pt)}, ${vinho.year}).`),
        tr(`<b>O vinho mundial ronda ${fmt(vinho.world_mt, 1)} milhões de toneladas</b> (${vinho.year}); cinco países fazem ${fmt(vinho.top5_share, 0)}%.`, `<b>World wine output is about ${fmt(vinho.world_mt, 1)} million tonnes</b> (${vinho.year}); five countries make ${fmt(vinho.top5_share, 0)}%.`)
      ],
      praticas: [
        [tr("A casta certa no sítio certo", "The right variety in the right place"), tr("Casta, porta-enxerto, exposição e solo escolhidos em conjunto dão uma vinha mais equilibrada em cada clima.", "Variety, rootstock, aspect and soil chosen together give a more balanced vineyard in each climate.")],
        [tr("Guardar castas tradicionais", "Keep traditional varieties"), tr("As castas locais guardam características de resistência e de sabor que podem fazer falta noutro clima.", "Local varieties hold traits of resilience and flavour that may be needed in a different climate.")],
        [tr("Qualidade antes de volume", "Quality before volume"), tr("Uma vinha viva trabalha a identidade do lugar, em vez de competir pela quantidade com os maiores produtores.", "A living vineyard works on the identity of the place instead of competing on quantity with the biggest producers.")],
        [tr("Registar cada ano", "Record each year"), tr("Datas de abrolhamento, floração e vindima por parcela mostram como o clima mexe na tua vinha.", "Dates of budburst, flowering and harvest per plot show how the climate is moving in your vineyard.")]
      ],
      links: [[tr("Castas da Vinha Viva", "Living Vineyard varieties"), "#castas"], [tr("Produção agrícola mundial", "World agricultural production"), "/observatorio/producao-agricola.html"]]
    };

    /* ---------- contextos: que fatores, com que título e práticas, em cada página ---------- */
    const HUB = [tr("Ver os fatores todos", "See all the factors"), "/calendario/conhecimento-cuidar.html#fatores"];
    const CTX = {
      conhecimento: {
        ids: ["clima", "agua", "solo", "floresta", "vida", "alimento"], rotulo: tr("Na parcela", "On the plot"),
        eyebrow: tr("Dos dados à parcela", "From data to the plot"),
        h2: tr("Seis forças que mudam o que se pode cultivar", "Six forces that change what can be grown"),
        intro: tr("Os números vêm do Observatório da Terra e do relatório de produção agrícola. Escolhe um fator para ver o que os dados mostram e o que a agricultura regenerativa pode fazer na tua parcela.", "The numbers come from the Earth Observatory and the agricultural production report. Pick a factor to see what the data show and what regenerative agriculture can do on your plot.")
      },
      calendario: {
        ids: ["clima", "agua", "solo", "floresta"], rotulo: tr("No calendário", "In the calendar"),
        eyebrow: tr("Dos dados ao calendário", "From data to the calendar"),
        h2: tr("Quatro sinais que mexem nas janelas do calendário", "Four signals that move the calendar’s windows"),
        intro: tr("As janelas de sementeira, rega e colheita são referências. Os números do Observatório da Terra mostram porque convém confirmá-las no terreno, ano a ano, e que práticas ajudam a ajustá-las.", "The sowing, watering and harvest windows are references. The Earth Observatory numbers show why they should be checked on the ground, year by year, and which practices help adjust them."),
        over: {
          clima: { titulo: tr("As datas do calendário são hipóteses, não promessas", "Calendar dates are hypotheses, not promises"), praticas: [
            [tr("Sementeira por janela", "Sow by window"), tr("Usa a data do calendário como ponto de partida e ajusta pela temperatura do solo e pela previsão desse ano.", "Use the calendar date as a starting point and adjust to soil temperature and that year’s forecast.")],
            [tr("Escalonar", "Stagger"), tr("Semear em várias datas reparte o risco de um ano fora do normal.", "Sowing on several dates spreads the risk of an unusual year.")],
            [tr("Proteger do calor e do frio", "Protect from heat and cold"), tr("Sombra, cobertura do solo e rega ao amanhecer no verão; abrigo contra geadas tardias no fim do inverno.", "Shade, ground cover and dawn watering in summer; shelter from late frosts at the end of winter.")],
            [tr("Registar", "Record"), tr("Anotar datas e resultados todos os anos mostra a janela que funciona no teu terreno.", "Noting dates and results every year shows the window that works on your land.")]
          ] },
          agua: { titulo: tr("Chuva irregular, rega com critério", "Irregular rain, watering with judgement"), praticas: [
            [tr("No outono e na primavera", "In autumn and spring"), tr("Preparar o solo para guardar a chuva: cobertura, matéria orgânica e valas em nível.", "Prepare the soil to hold rain: cover, organic matter and contour swales.")],
            [tr("No verão", "In summer"), tr("Regar de manhã cedo, gota a gota, e só depois de ver a humidade do solo.", "Water early in the morning, by drip, and only after checking soil moisture.")],
            [tr("No inverno", "In winter"), tr("Captar e guardar a água da chuva para os meses secos.", "Collect and store rainwater for the dry months.")],
            [tr("Nos meses secos", "In the dry months"), tr("Preferir culturas e variedades de sequeiro ou de ciclo curto.", "Prefer dryland or short-cycle crops and varieties.")]
          ] },
          solo: { titulo: tr("Antes de semear, olha para o solo", "Before sowing, look at the soil"), praticas: [
            [tr("Cobrir antes dos extremos", "Cover before the extremes"), tr("Cobertura morta ou plantas de cobertura antes do verão e das chuvas fortes de outono.", "Mulch or cover crops before summer and the heavy autumn rains.")],
            [tr("Adubos verdes", "Green manures"), tr("Semeados no outono ou no pousio, alimentam o solo e protegem-no até à cultura seguinte.", "Sown in autumn or fallow, they feed the soil and protect it until the next crop.")],
            [tr("Compostar todo o ano", "Compost all year"), tr("Restos da horta e da poda voltam ao solo como matéria orgânica.", "Garden and pruning residues go back to the soil as organic matter.")],
            [tr("Rodar as culturas", "Rotate crops"), tr("Alternar famílias e incluir leguminosas mantém a fertilidade e quebra ciclos de pragas.", "Alternating families and including legumes keeps fertility and breaks pest cycles.")]
          ] },
          floresta: { titulo: tr("Do verão ao outono, o fogo faz parte do calendário", "From summer to autumn, fire is part of the calendar"), praticas: [
            [tr("Antes do verão", "Before summer"), tr("Faixas limpas à volta de casas, caminhos e parcelas, e mato cortado ou pastado nas zonas críticas.", "Cleared strips around houses, tracks and plots, and scrub cut or grazed in critical zones.")],
            [tr("Em dias de risco", "On risk days"), tr("Evitar trabalhos que façam faísca ou fogo e seguir os avisos de risco de incêndio.", "Avoid work that makes sparks or fire and follow the fire-risk warnings.")],
            [tr("Mosaicos", "Mosaics"), tr("Parcelas agrícolas e pastagens verdes entre manchas de mato e floresta quebram a continuidade do combustível.", "Farmland and green pastures between patches of scrub and forest break the continuity of fuel.")],
            [tr("Árvores na parcela", "Trees on the plot"), tr("Sistemas agroflorestais dão sombra e abrigo, com cuidado na gestão do mato por baixo.", "Agroforestry gives shade and shelter, with care in managing the scrub underneath.")]
          ] }
        }
      },
      vinha: {
        ids: ["clima", "agua", "solo", "vida", "uva"], extra: [UVA], rotulo: tr("Na vinha", "In the vineyard"),
        eyebrow: tr("Dos dados à vinha", "From data to the vineyard"),
        h2: tr("O que o clima, o solo e a vida pedem à videira", "What climate, soil and life ask of the vine"),
        intro: tr("Os números vêm do Observatório da Terra e da produção agrícola mundial (FAOSTAT). Escolhe um fator para ver o que os dados mostram e o que uma vinha viva pode fazer na parcela.", "The numbers come from the Earth Observatory and world agricultural production (FAOSTAT). Pick a factor to see what the data show and what a living vineyard can do on the plot."),
        over: {
          clima: { titulo: tr("Cada ano pede uma vinha diferente", "Each year asks for a different vineyard"), praticas: [
            [tr("Sombra funcional no cacho", "Functional shade on the bunch"), tr("Desfolha prudente na zona dos cachos protege do sol forte e mantém o arejamento.", "Careful leaf removal in the bunch zone protects from strong sun and keeps air moving.")],
            [tr("Casta e porta-enxerto ao clima", "Variety and rootstock for the climate"), tr("Escolher variedades e porta-enxertos adaptados ao calor e à seca da zona.", "Choose varieties and rootstocks adapted to the heat and drought of the area.")],
            [tr("Cobertura entre linhas", "Cover between rows"), tr("Mantém o solo mais fresco e protege-o do sol e da chuva forte.", "Keeps the soil cooler and protects it from sun and heavy rain.")],
            [tr("Colher uma parcela, não uma média", "Harvest a plot, not an average"), tr("Seguir a maturação de cada parcela, porque o ano muda o ponto de colheita.", "Follow the ripening of each plot, because the year changes the harvest point.")]
          ] },
          agua: { titulo: tr("Guardar, medir, regar só se faltar", "Store, measure, irrigate only if short"), praticas: [
            [tr("Cobertura e matéria orgânica", "Cover and organic matter"), tr("Retêm água entre chuvas; em anos secos, ceifar a tempo para o coberto não competir com a videira.", "They hold water between rains; in dry years, mow in time so the cover does not compete with the vine.")],
            [tr("Rega só com défice confirmado", "Irrigate only with a confirmed deficit"), tr("Gota a gota, depois de medir a humidade do solo e observar o estado da videira.", "By drip, after measuring soil moisture and observing the state of the vine.")],
            [tr("Reter a água na encosta", "Hold water on the slope"), tr("Linhas em nível, socalcos e muros de pedra abrandam a escorrência.", "Contour lines, terraces and stone walls slow the runoff.")],
            [tr("Drenar onde é preciso", "Drain where needed"), tr("Em solos pesados e anos de chuva forte, drenagem e infiltração evitam o encharcamento e a doença.", "In heavy soils and heavy-rain years, drainage and infiltration prevent waterlogging and disease.")]
          ] },
          solo: { titulo: tr("O solo é parte do terroir", "Soil is part of the terroir"), praticas: [
            [tr("Enrelvamento", "Grass cover"), tr("Coberto vivo entre linhas protege da erosão e alimenta a vida do solo.", "A living cover between rows protects against erosion and feeds soil life.")],
            [tr("Mexer o menos possível", "Disturb as little as possible"), tr("Mobilização mínima e tráfego controlado preservam a estrutura e a infiltração.", "Minimum tillage and controlled traffic preserve structure and infiltration.")],
            [tr("Compostar bagaço e poda", "Compost pomace and prunings"), tr("Devolver à vinha a matéria orgânica que ela própria produz.", "Return to the vineyard the organic matter it produces itself.")],
            [tr("Travar a erosão nas encostas", "Stop erosion on slopes"), tr("Socalcos, muros e linhas em nível seguram a terra.", "Terraces, walls and contour lines hold the soil.")]
          ] },
          vida: { titulo: tr("Uma vinha viva trabalha com auxiliares", "A living vineyard works with beneficial species"), praticas: [
            [tr("Sebes e bordaduras", "Hedges and edges"), tr("Abrigo e alimento para aves, morcegos e insetos auxiliares.", "Shelter and food for birds, bats and beneficial insects.")],
            [tr("Flores entre linhas", "Flowers between rows"), tr("Coberto diversificado com flores alimenta polinizadores e predadores de pragas.", "A diverse flowering cover feeds pollinators and pest predators.")],
            [tr("Diagnosticar antes de tratar", "Diagnose before treating"), tr("Clima, sintomas e monitorização definem o risco; tratar sem diagnóstico mata também os auxiliares.", "Climate, symptoms and monitoring define the risk; treating without a diagnosis also kills the beneficial species.")],
            [tr("Abrigos para a fauna", "Shelters for wildlife"), tr("Caixas-ninho, pedras e áreas não mobilizadas dão casa a quem come insetos.", "Nest boxes, stones and undisturbed areas give a home to those who eat insects.")]
          ] }
        }
      }
    };
    const cx = CTX[contexto] || CTX.conhecimento;
    F.push(...(cx.extra || []));
    const here = location.pathname.replace(/\.html$/, "");
    const FS = cx.ids.map((id) => F.find((f) => f.id === id)).filter(Boolean).map((f) => {
      const o = Object.assign({}, f, (cx.over || {})[f.id] || {});
      if (contexto !== "conhecimento") {
        /* Fora da página de conhecimento: sem ligações para âncoras que não existem aqui nem para a própria página; com ligação ao conjunto. */
        o.links = o.links.filter(([, h]) => (h === "#castas" ? contexto === "vinha" : !h.startsWith("#")) && h.split("#")[0].replace(/\.html$/, "") !== here).concat([HUB]);
      }
      return o;
    });

    /* ---------- desenho ---------- */
    const ficheira = (f) => f.fig.map((g, i) => `<figure class="ft-fig"><figcaption><span class="t">${esc(g.t)}</span><span class="d">${esc(g.d)}</span></figcaption>${g.html ? `<div class="ft-mini">${g.html}</div>` : `<div class="chart" id="ft-${f.id}-${i}"></div>`}<span class="src">${tr("Fonte", "Source")}: ${esc(g.src)}</span></figure>`).join("");
    const painel = (f) => `<div class="ft-painel" style="--cap:${f.c}" role="tabpanel" id="ft-painel" aria-labelledby="ft-tab-${f.id}">
      <h3 class="ft-titulo">${esc(f.titulo)}</h3>
      <div class="ft-grelha">
        <div class="ft-dados">
          <span class="ft-rotulo">${tr("O que os dados mostram", "What the data show")}</span>
          ${ficheira(f)}
          <ul class="ft-factos">${f.factos.map((x) => `<li>${x}</li>`).join("")}</ul>
        </div>
        <div class="ft-pratica">
          <span class="ft-rotulo">${cx.rotulo}</span>
          <ul class="ft-praticas">${f.praticas.map(([a, b]) => `<li><b>${esc(a)}.</b> ${esc(b)}</li>`).join("")}</ul>
          <div class="ft-links">${f.links.map(([a, h]) => `<a href="${esc(h.startsWith("#") ? h : L(h))}">${esc(a)} →</a>`).join("")}</div>
        </div>
      </div>
    </div>`;

    host.innerHTML = `<div class="agri-report fatores">
      <div class="sec-head">
        <span class="eyebrow">${cx.eyebrow}</span>
        <h2>${cx.h2}</h2>
        <p>${cx.intro}</p>
      </div>
      <div class="ft-tabs" role="tablist" style="--n:${FS.length}" aria-label="${tr("Fatores", "Factors")}">${FS.map((f, i) => `<button type="button" class="ft-tab" role="tab" id="ft-tab-${f.id}" data-id="${f.id}" aria-selected="${i === 0}" aria-controls="ft-painel" style="--cap:${f.c}"><span class="ft-n">${esc(f.nome)}</span><span class="ft-v">${esc(f.v)}</span><span class="ft-k">${esc(f.k)}</span></button>`).join("")}</div>
      <div id="ft-area"></div>
      <p class="ft-nota">${tr("As práticas são orientações gerais de agricultura regenerativa, não receitas: o conhecimento orienta, o território confirma. Cada valor tem a fonte indicada junto ao gráfico e os dados são atualizados automaticamente uma vez por semana.", "The practices are general regenerative-agriculture guidance, not recipes: knowledge guides, the land confirms. Each value has its source next to the chart, and the data are updated automatically once a week.")}</p>
    </div>`;

    const area = host.querySelector("#ft-area"), tabs = [...host.querySelectorAll(".ft-tab")];
    const mostrar = (id, foco) => {
      const f = FS.find((x) => x.id === id) || FS[0];
      tabs.forEach((b) => { const on = b.dataset.id === f.id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
      area.innerHTML = painel(f);
      f.fig.forEach((g, i) => { if (g.draw) g.draw(area.querySelector("#ft-" + f.id + "-" + i)); });
      if (foco) tabs.find((b) => b.dataset.id === f.id).focus();
    };
    tabs.forEach((b, i) => {
      b.addEventListener("click", () => {
        mostrar(b.dataset.id);
        /* Em ecrãs estreitos o painel fica abaixo dos seis botões: leva-se o leitor até ele. */
        if (innerWidth < 860) setTimeout(() => area.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
      });
      b.addEventListener("keydown", (e) => {
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (d) { e.preventDefault(); mostrar(tabs[(i + d + tabs.length) % tabs.length].dataset.id, true); }
      });
    });
    mostrar(FS[0].id);
  }

  let feito = false;
  const iniciar = () => {
    if (feito) return; feito = true;
    Promise.all([T.load(), get("/data/agriculture-global.json")])
      .then(([{ R, CLIMA, VET, PT }, A]) => {
        construir(R, CLIMA, VET, PT, A);
        if (location.hash === "#fatores") setTimeout(() => host.scrollIntoView({ block: "start" }), 60);
      })
      .catch(() => { host.hidden = true; });
  };
  if (location.hash === "#fatores" || !("IntersectionObserver" in window)) iniciar();
  else {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); iniciar(); } }, { rootMargin: "800px 0px" });
    io.observe(host);
    window.addEventListener("load", () => setTimeout(iniciar, 4000));
  }
})();
