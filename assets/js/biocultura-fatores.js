/* «Dos dados à parcela»: fatores que mudam o que se pode cultivar, cada um com os números do Observatório da Terra
   e da produção agrícola mundial (FAOSTAT) e as práticas regenerativas que lhes respondem. Serve três páginas, escolhidas
   por data-contexto no <section id="fatores">: conhecimento (seis fatores), calendario (quatro), vinha (cinco, com a uva),
   pecuaria e mineracao (seis cada, com fatores próprios a partir de livestock-global, pecuaria_industrial, mining-global e mineracao),
   digital (centros de dados), energia (acesso, renováveis, ar, clima, território) e os recursos agua, ar e solo.
   Nada é escrito à mão: os valores saem de /data/observatorio-terra-relatorio.json, observatorio_global.json,
   vetores_pressao_global.json, observatorio_terra.json e agriculture-global.json. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos, T = window.BioCulturaTerra;
  const host = document.getElementById("fatores");
  if (!G || !T || !host) return;
  const contexto = host.dataset.contexto || "conhecimento";
  const { tr, fmt, esc, css, SER, hbars, line, legend, miniBars, miniStack, EN } = G;
  const lang = new URLSearchParams(location.search).get("lang");
  const L = (href) => {
    if (!lang) return href;
    const [p, h] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(lang) + (h ? "#" + h : "");
  };
  const get = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.json(); });

  const COR = { clima: "#b4472f", agua: "#2a6fb0", solo: "#7d5a36", floresta: "#3d7a4a", vida: "#7a5aa6", alimento: "#b87a0c" };

  function construir(R, CLIMA, VET, PT, A, X) {
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


    /* ---------- pecuária (só em Pecuária) ---------- */
    const LV = X["livestock-global"], PL = X.pecuaria_industrial;
    const hv = (re) => (LV ? LV.headline.find((h) => re.test(h.label_en)) : null);
    const hnum = (h) => (h ? parseFloat(String(h.value).replace(/[^0-9.]/g, "")) : null);
    const hEm = hv(/Anthropogenic/), hGt = hv(/Livestock-system/), hCh = hv(/methane/i);
    const sysOf = (id) => (LV ? LV.systems.find((x) => x.id === id) : null);
    const grp = (id) => A.world_groups.series.find((g) => g.id === id);
    const meatG = grp(1765), milkG = grp(1780);
    const contMeat = A.meat_continent;
    const CONT_EN = { 5300: "Asia", 5200: "Americas", 5400: "Europe", 5100: "Africa", 5500: "Oceania" };
    const contShare = (id, i) => { const tot = contMeat.series.reduce((a, x) => a + x.mt[i], 0); return contMeat.series.find((x) => x.id === id).mt[i] / tot * 100; };
    const pastMax = ls("6655").reduce((m, v, i) => (v != null && v > m.v ? { v, y: land.years[i] } : m), { v: 0, y: 0 });
    const carne = PT.temas.consumo_carne_peixe.indicador_atual, pp = (carne.match(/(\d+),(\d+)/) || [])[0];
    const tipoCount = (re) => (PL || []).filter((c) => re.test(c.tipo)).length;
    const ptEfl = (PL || []).filter((c) => (c.pressoes_ambientais_potenciais || []).some((x) => /chorume|efluente|nitrato|estrume/i.test(x))).length;
    const PEC = LV && PL ? {
      metano: {
        id: "metano", c: COR.clima, nome: tr("Clima e metano", "Climate and methane"),
        v: fmt(hnum(hEm), 0) + "%", k: tr("das emissões humanas de gases com efeito de estufa vêm dos sistemas pecuários (" + hEm.context + ")", "of human greenhouse-gas emissions come from livestock systems (" + hEm.context + ")"),
        titulo: tr("Metano, escala e concentração", "Methane, scale and concentration"),
        fig: [{
          t: tr("O peso da pecuária no clima", "Livestock’s weight in the climate"),
          d: tr("Percentagem das emissões humanas (em CO₂ equivalente) e do metano de origem humana.", "Share of human emissions (in CO₂ equivalent) and of human-caused methane."),
          src: hEm.context + "; " + hCh.context,
          html: miniBars([{ l: tr("Emissões humanas (CO₂e)", "Human emissions (CO₂e)"), v: hnum(hEm), t: fmt(hnum(hEm), 0) + "%", c: css("--s8"), hl: true }, { l: tr("Metano de origem humana", "Human-caused methane"), v: hnum(hCh), t: "≈" + fmt(hnum(hCh), 0) + "%", c: css("--s4") }], { max: 50 })
        }, {
          t: tr("Instalações pecuárias documentadas em Portugal", "Livestock facilities documented in Portugal"),
          d: tr("Casos acompanhados pelo bioCulture, por espécie principal. Não são todas as que existem.", "Cases followed by bioCulture, by main species. They are not all that exist."),
          src: tr("bioCulture, casos documentados (AIA e inspeções ambientais)", "bioCulture, documented cases (EIA and environmental inspections)"),
          draw: (el) => hbars(el, [[tr("Aves", "Poultry"), tipoCount(/^Aves/)], [tr("Suínos", "Pigs"), tipoCount(/^Suínos/)], [tr("Bovinos de leite", "Dairy cattle"), tipoCount(/^Bovinos/)]].map(([l, n], i) => ({ l, v: n, t: String(n), c: css(SER[(i + 1) % SER.length]) })), { unit: "n", table: [tr("Espécie", "Species"), "n"] })
        }],
        factos: [
          tr(`<b>Os sistemas pecuários emitem ${fmt(hnum(hGt), 1)} Gt CO₂e por ano</b>, ${fmt(hnum(hEm), 0)}% das emissões humanas (${hEm.context}).`, `<b>Livestock systems emit ${fmt(hnum(hGt), 1)} Gt CO₂e a year</b>, ${fmt(hnum(hEm), 0)}% of human emissions (${hEm.context}).`),
          tr(`<b>Cerca de ${fmt(hnum(hCh), 0)}% do metano de origem humana</b> está ligado à pecuária (${hCh.context}).`, `<b>About ${fmt(hnum(hCh), 0)}% of human-caused methane</b> is linked to livestock (${hCh.context}).`),
          tr(`<b>Bovinos:</b> ${sysOf("cattle").methane_pt}`, `<b>Cattle:</b> ${sysOf("cattle").methane_en}`),
          tr(`<b>O bioCulture documenta ${PL.length} instalações pecuárias em Portugal:</b> ${tipoCount(/^Aves/)} de aves, ${tipoCount(/^Suínos/)} de suínos e ${tipoCount(/^Bovinos/)} de bovinos de leite. Risco potencial não é dano comprovado.`, `<b>bioCulture documents ${PL.length} livestock facilities in Portugal:</b> ${tipoCount(/^Aves/)} poultry, ${tipoCount(/^Suínos/)} pig and ${tipoCount(/^Bovinos/)} dairy-cattle. Potential risk is not proven harm.`)
        ],
        praticas: [
          [tr("Animais saudáveis e bem alimentados", "Healthy, well-fed animals"), tr("Desperdiçam menos alimento e tendem a emitir menos por litro de leite ou quilo de carne.", "They waste less feed and tend to emit less per litre of milk or kilo of meat.")],
          [tr("Gerir bem o estrume", "Manage manure well"), tr("Armazenar coberto, compostar e aplicar ao solo em doses medidas tende a reduzir perdas de metano, amoníaco e nutrientes.", "Covered storage, composting and spreading on the soil in measured doses tend to reduce losses of methane, ammonia and nutrients.")],
          [tr("Escala à medida do território", "Scale matched to the territory"), tr("Menos animais por hectare e mais perto da terra que os alimenta evitam concentrar efluentes num só sítio.", "Fewer animals per hectare and closer to the land that feeds them avoid concentrating effluents in one place.")],
          [tr("Medir o balanço", "Measure the balance"), tr("Registar efetivos, alimento comprado, estrume produzido e aplicado mostra para onde vão os nutrientes.", "Recording herd size, purchased feed, manure produced and applied shows where the nutrients go.")]
        ],
        links: [[tr("Instalações documentadas", "Documented facilities"), "#instalacoes"], [tr("Clima no Observatório da Terra", "Climate in the Earth Observatory"), "/observatorio/observatorio-terra.html#clima"]]
      },
      pasto: {
        id: "pasto", c: COR.floresta, nome: tr("Terra e pasto", "Land and pasture"),
        v: fmt(past / agri * 100, 0) + "%", k: tr("da terra agrícola mundial são pastagens (" + ly + ")", "of the world’s agricultural land is pasture (" + ly + ")"),
        titulo: tr("Pasto: o maior uso agrícola da terra", "Pasture: the largest agricultural use of land"),
        fig: [{
          t: tr("Como se usa a terra emersa do mundo", "How the world’s land is used"),
          d: tr("Percentagem da área terrestre, " + ly + ".", "Share of land area, " + ly + "."),
          src: "FAOSTAT, uso do solo (RL)",
          html: miniStack([{ l: tr("Floresta", "Forest"), v: forest / landA * 100, c: COR.floresta }, { l: tr("Pastagens", "Pasture"), v: past / landA * 100, c: css("--s3") }, { l: tr("Cultivo", "Cropland"), v: crop / landA * 100, c: css("--s4") }, { l: tr("Resto", "Other"), v: 100 - (forest + past + crop) / landA * 100, c: css("--bar-dim") }])
        }, {
          t: tr("E em Portugal", "And in Portugal"),
          d: tr("Percentagem do território, " + ptl.year + ".", "Share of territory, " + ptl.year + "."),
          src: "FAOSTAT, uso do solo (RL)",
          html: miniStack([{ l: tr("Floresta", "Forest"), v: ptl["6646"] / ptl["6601"] * 100, c: COR.floresta }, { l: tr("Pastagens", "Pasture"), v: ptl["6655"] / ptl["6601"] * 100, c: css("--s3") }, { l: tr("Cultivo", "Cropland"), v: ptl["6620"] / ptl["6601"] * 100, c: css("--s4") }, { l: tr("Resto", "Other"), v: 100 - (ptl["6646"] + ptl["6655"] + ptl["6620"]) / ptl["6601"] * 100, c: css("--bar-dim") }])
        }],
        factos: [
          tr(`<b>As pastagens ocupam ${fmt(past, 0)} milhões de hectares</b>: ${fmt(past / landA * 100, 0)}% das terras emersas e ${fmt(past / agri * 100, 0)}% da terra agrícola (FAOSTAT, ${ly}).`, `<b>Pasture covers ${fmt(past, 0)} million hectares</b>: ${fmt(past / landA * 100, 0)}% of the world’s land and ${fmt(past / agri * 100, 0)}% of agricultural land (FAOSTAT, ${ly}).`),
          tr(`<b>Desde o máximo de ${pastMax.y} (${fmt(pastMax.v, 0)} Mha), as pastagens recuaram ${fmt((1 - past / pastMax.v) * 100, 1)}%</b> (FAOSTAT).`, `<b>Since the peak of ${pastMax.y} (${fmt(pastMax.v, 0)} Mha), pasture has shrunk ${fmt((1 - past / pastMax.v) * 100, 1)}%</b> (FAOSTAT).`),
          tr(`<b>Em Portugal, as pastagens ocupam ${fmt(ptl["6655"] / 1000, 2)} milhões de hectares</b>, ${fmt(ptl["6655"] / ptl["6601"] * 100, 0)}% do território (${ptl.year}).`, `<b>In Portugal, pasture covers ${fmt(ptl["6655"] / 1000, 2)} million hectares</b>, ${fmt(ptl["6655"] / ptl["6601"] * 100, 0)}% of the territory (${ptl.year}).`),
          tr(`<b>A pastagem é só uma parte da conta:</b> a terra cultivada (${fmt(crop / agri * 100, 0)}% da terra agrícola) também alimenta animais, porque parte dos cereais e das oleaginosas vai para ração.`, `<b>Pasture is only part of the account:</b> cropland (${fmt(crop / agri * 100, 0)}% of agricultural land) also feeds animals, because part of the cereals and oilseeds goes to feed.`)
        ],
        praticas: [
          [tr("Pastoreio rotativo", "Rotational grazing"), tr("Dividir o pasto em parcelas e dar tempo de descanso para a erva recuperar mantém o solo coberto e produtivo.", "Dividing the pasture into plots and giving the grass time to recover keeps the soil covered and productive.")],
          [tr("Árvores no pasto", "Trees in the pasture"), tr("Sistemas silvopastoris dão sombra e abrigo aos animais e ao solo, como o montado.", "Silvopastoral systems give shade and shelter to animals and soil, as in the montado.")],
          [tr("Pastagens diversas", "Diverse pastures"), tr("Misturas com leguminosas fixam azoto e dão alimento mais equilibrado ao longo do ano.", "Mixtures with legumes fix nitrogen and give more balanced feed through the year.")],
          [tr("Carga animal à medida", "Stocking matched to the land"), tr("Ajustar o número de animais ao que o terreno suporta em cada estação evita o sobrepastoreio.", "Matching the number of animals to what the land can carry in each season avoids overgrazing.")]
        ],
        links: [[tr("Solo e vida no Observatório da Terra", "Land and life in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"], [tr("Produção agrícola mundial", "World agricultural production"), "/observatorio/producao-agricola.html#terra"]]
      },
      escala: {
        id: "escala", c: COR.alimento, nome: tr("Carne e leite", "Meat and milk"),
        v: "×" + fmt(meatG.mt.at(-1) / meatG.mt[0], 1), k: tr("de carne produzida no mundo desde " + A.world_groups.years[0], "of meat produced worldwide since " + A.world_groups.years[0]),
        titulo: tr("Mais carne e leite: o que mudou e o que Portugal importa", "More meat and milk: what changed and what Portugal imports"),
        fig: [{
          t: tr("Carne produzida no mundo, por continente", "Meat produced worldwide, by continent"),
          d: tr("Milhões de toneladas por ano, " + contMeat.years[0] + "–" + contMeat.years.at(-1) + ".", "Million tonnes per year, " + contMeat.years[0] + "–" + contMeat.years.at(-1) + "."),
          src: "FAOSTAT, produção (QCL)",
          draw: (el) => line(el, { x: contMeat.years, series: contMeat.series.map((x, i) => ({ n: EN ? CONT_EN[x.id] : x.name, c: css(SER[i % SER.length]), v: x.mt })), zero: true, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0) + " Mt", endLabels: true, aria: tr("Carne por continente", "Meat by continent"), table: true })
        }, {
          t: tr("Quanto Portugal produz do que consome", "How much of what it consumes Portugal produces"),
          d: tr("Produção ÷ consumo aparente, média " + ptWheat.years[0] + "–" + ptWheat.years.at(-1) + ". 100% = autossuficiente.", "Production ÷ apparent consumption, " + ptWheat.years[0] + "–" + ptWheat.years.at(-1) + " average. 100% = self-sufficient."),
          src: "FAOSTAT, produção e comércio",
          html: miniBars([[ssr(1058), tr("Frango", "Chicken")], [ssr(1035), tr("Porco", "Pork")], [ssr(882), tr("Leite de vaca", "Cow milk")], [ptMaize, tr("Milho", "Maize")], [ssr(236), tr("Soja", "Soya")]].map(([r, l]) => ({ l, v: Math.min(r.ssr, 150), t: fmt(r.ssr, 0) + "%", hl: r.ssr >= 100 })), { max: 150, ref: 100 })
        }],
        factos: [
          tr(`<b>A produção mundial de carne passou de ${fmt(meatG.mt[0], 0)} para ${fmt(meatG.mt.at(-1), 0)} milhões de toneladas</b> (${A.world_groups.years[0]}–${A.world_groups.years.at(-1)}), e a de leite ×${fmt(milkG.mt.at(-1) / milkG.mt[0], 1)} (FAOSTAT).`, `<b>World meat production went from ${fmt(meatG.mt[0], 0)} to ${fmt(meatG.mt.at(-1), 0)} million tonnes</b> (${A.world_groups.years[0]}–${A.world_groups.years.at(-1)}), and milk ×${fmt(milkG.mt.at(-1) / milkG.mt[0], 1)} (FAOSTAT).`),
          tr(`<b>A Ásia produz ${fmt(contShare(5300, contMeat.years.length - 1), 0)}% da carne do mundo</b>; em ${contMeat.years[0]} a Europa liderava, com ${fmt(contShare(5400, 0), 0)}%.`, `<b>Asia produces ${fmt(contShare(5300, contMeat.years.length - 1), 0)}% of the world’s meat</b>; in ${contMeat.years[0]} Europe led, with ${fmt(contShare(5400, 0), 0)}%.`),
          tr(`<b>Portugal produz ${fmt(ssr(1058).ssr, 0)}% do frango e ${fmt(ssr(1035).ssr, 0)}% da carne de porco que consome</b>, mas só ${fmt(ptMaize.ssr, 0)}% do milho e ${ssr(236).ssr < 1 ? "praticamente nenhuma soja" : fmt(ssr(236).ssr, 0) + "% da soja"}, matérias-primas habituais das rações.`, `<b>Portugal produces ${fmt(ssr(1058).ssr, 0)}% of the chicken and ${fmt(ssr(1035).ssr, 0)}% of the pork it consumes</b>, but only ${fmt(ptMaize.ssr, 0)}% of the maize and ${ssr(236).ssr < 1 ? "practically no soya" : fmt(ssr(236).ssr, 0) + "% of the soya"}, usual feed raw materials.`),
          tr(`<b>Em 2024, a disponibilidade de carne, pescado e ovos excedeu em ${pp} pontos percentuais a proporção recomendada pela Roda dos Alimentos</b> (INE).`, `<b>In 2024, the availability of meat, fish and eggs exceeded the proportion recommended by the Portuguese Food Wheel by ${(pp || "").replace(",", ".")} percentage points</b> (INE).`)
        ],
        praticas: [
          [tr("Comer menos, e melhor", "Eat less, and better"), tr("Carne de pastoreio e de produção local, em menor quantidade, pesa menos no clima, na água e no território.", "Pasture-raised and locally produced meat, in smaller amounts, weighs less on climate, water and territory.")],
          [tr("Rações com menos importação", "Feed with fewer imports"), tr("Forragens e leguminosas da própria exploração reduzem a dependência de soja e milho vindos de fora.", "Forages and legumes from the farm itself reduce dependence on soya and maize from abroad.")],
          [tr("Aproveitar tudo", "Use everything"), tr("Estrume, sobras e subprodutos voltam ao solo como fertilidade em vez de resíduo.", "Manure, leftovers and by-products go back to the soil as fertility instead of waste.")],
          [tr("Conhecer a origem", "Know the origin"), tr("Perguntar onde e como foi criado o animal permite escolher sistemas menos concentrados.", "Asking where and how the animal was raised makes it possible to choose less concentrated systems.")]
        ],
        links: [[tr("Produção agrícola mundial", "World agricultural production"), "/observatorio/producao-agricola.html"], [tr("Portugal na produção agrícola", "Portugal in agricultural production"), "/observatorio/producao-agricola.html#portugal"]]
      }
    } : {};

    /* ---------- mineração (só em Mineração) ---------- */
    const MG = X["mining-global"], MP = X.mineracao;
    const comm = (id) => (MG ? MG.commodities.find((c) => c.id === id) : null);
    const cn = (c) => tr(c.name_pt, c.name_en);
    const cp = (c) => tr(c.pressure_pt, c.pressure_en);
    const mat = dest.materiais, ew = dest.ewaste;
    const ewPct = ew ? (ew.leitura.match(/(\d+),(\d+)/) || [])[0] : null;
    const fontes = (id) => (t.fonte[id] ? t.fonte[id].titulo : id);
    const casesBy = (id) => (MG ? MG.cases.filter((c) => c.commodity === id).length : 0);
    const mpLit = (MP || []).filter((m) => /l[íi]tio|lepidolite/i.test(m.mineral)).length;
    const mpExp = (MP || []).filter((m) => /^Em exploração/.test(m.status)).length;
    const mpEnc = (MP || []).filter((m) => /^Encerrada/.test(m.status)).length;
    const mpGrp = (st) => st.split(" — ")[0].replace(/ desde.*/, "");
    const tons = (c) => { const v = c.production_2024; return v >= 1e6 ? fmt(v / 1e6, 0) + tr(" milhões de t", " million t") : v >= 1e4 ? fmt(v / 1e3, 0) + tr(" mil t", " thousand t") : fmt(v, 0) + " t"; };
    const MIN = MG && MP && mat && ew ? {
      materiais: {
        id: "materiais", c: COR.solo, nome: tr("Materiais", "Materials"),
        v: "×" + fmt(mat.valor / mat.referencia.valor, 1), k: tr("extração mundial de materiais desde " + mat.referencia.ano, "world material extraction since " + mat.referencia.ano),
        titulo: tr("Cada telemóvel, painel e estrada começa numa mina", "Every phone, panel and road starts in a mine"),
        fig: [{
          t: tr("Extração mundial de materiais", "World material extraction"),
          d: tr("Mil milhões de toneladas por ano.", "Billion tonnes per year."),
          src: fontes(mat.fonte_id),
          html: miniBars([{ l: String(mat.referencia.ano), v: mat.referencia.valor, t: fmt(mat.referencia.valor, 0), c: css("--bar-dim") }, { l: String(mat.ano), v: mat.valor, t: fmt(mat.valor, 1), c: COR.solo, hl: true }])
        }, {
          t: tr("Casos globais acompanhados, por matéria", "Global cases followed, by commodity"),
          d: tr("Inventário curado do bioCulture; não representa todas as minas do mundo.", "Curated bioCulture inventory; it does not represent every mine in the world."),
          src: tr("bioCulture, inventário curado (não exaustivo)", "bioCulture, curated inventory (not exhaustive)"),
          draw: (el) => hbars(el, MG.commodities.map((c, i) => ({ l: cn(c), v: casesBy(c.id), t: String(casesBy(c.id)), c: css(SER[i % SER.length]) })).sort((a, b) => b.v - a.v), { unit: "n", table: [tr("Matéria", "Commodity"), "n"] })
        }],
        factos: [
          tr(`<b>A extração global de materiais passou de ${fmt(mat.referencia.valor, 0)} para ${fmt(mat.valor, 1)} mil milhões de toneladas</b> (${mat.referencia.ano}–${mat.ano}), mais do que o triplo (UNEP).`, `<b>Global material extraction rose from ${fmt(mat.referencia.valor, 0)} to ${fmt(mat.valor, 1)} billion tonnes</b> (${mat.referencia.ano}–${mat.ano}), more than triple (UNEP).`),
          tr(`<b>Em 2024 produziram-se cerca de ${tons(comm("copper"))} de cobre, ${tons(comm("lithium"))} de lítio e ${tons(comm("gold"))} de ouro</b> (USGS). As unidades diferem e não se somam.`, `<b>In 2024 about ${tons(comm("copper"))} of copper, ${tons(comm("lithium"))} of lithium and ${tons(comm("gold"))} of gold were produced</b> (USGS). Units differ and cannot be added.`),
          tr(`<b>Geraram-se ${fmt(ew.valor, 0)} milhões de toneladas de resíduos eletrónicos em ${ew.ano}</b>: só ${ewPct}% foram formalmente recolhidos e reciclados (ITU).`, `<b>${fmt(ew.valor, 0)} million tonnes of electronic waste were generated in ${ew.ano}</b>: only ${(ewPct || "").replace(",", ".")}% were formally collected and recycled (ITU).`),
          tr(`<b>Produção anual dá escala, não impacto:</b> teor do minério, método, resíduos, água, energia e ecossistema mudam completamente cada caso.`, `<b>Annual output gives scale, not impact:</b> ore grade, method, waste, water, energy and ecosystem change each case completely.`)
        ],
        praticas: [
          [tr("Reparar, reutilizar, reciclar", "Repair, reuse, recycle"), tr("Cada aparelho que dura mais anos evita extrair materiais novos.", "Every device that lasts more years avoids extracting new materials.")],
          [tr("Entregar os eletrónicos certos", "Hand in electronics properly"), tr("Pilhas, baterias e equipamentos em pontos de recolha certificados entram no circuito de reciclagem.", "Batteries and equipment at certified collection points enter the recycling chain.")],
          [tr("Ler o processo", "Read the process"), tr("Estudos de impacte ambiental, RECAPE e relatórios públicos dizem o que se mede e o que fica por medir.", "Environmental impact studies, RECAPE and public reports say what is measured and what is not.")],
          [tr("Participar", "Take part"), tr("As consultas públicas são o momento legal para pedir dados e deixar objeções fundamentadas.", "Public consultations are the legal moment to ask for data and file well-founded objections.")]
        ],
        links: [[tr("Casos globais e portugueses", "Global and Portuguese cases"), "#casos"], [tr("Participação pública", "Public participation"), "/index.html#participacao-publica"], [tr("Vetores de pressão", "Pressure vectors"), "/observatorio/vetores-pressao-global.html"]]
      },
      transicao: {
        id: "transicao", c: COR.alimento, nome: tr("Transição e Portugal", "Transition and Portugal"),
        v: mpLit + " " + tr("de", "of") + " " + MP.length, k: tr("casos mineiros portugueses acompanhados envolvem lítio", "Portuguese mining cases followed involve lithium"),
        titulo: tr("A transição energética também se mede nas minas", "The energy transition is also measured in mines"),
        fig: [{
          t: tr("Casos mineiros portugueses, por situação", "Portuguese mining cases, by status"),
          d: tr("Concessão ou licença não significa mina em atividade.", "A concession or licence does not mean an active mine."),
          src: tr("bioCulture, casos documentados (DGEG, APA e processos de AIA)", "bioCulture, documented cases (DGEG, APA and EIA procedures)"),
          draw: (el) => { const c = {}; MP.forEach((m) => { const g = mpGrp(m.status); c[g] = (c[g] || 0) + 1; }); hbars(el, Object.entries(c).sort((a, b) => b[1] - a[1]).map(([l, n], i) => ({ l, v: n, t: String(n), c: css(SER[i % SER.length]) })), { unit: "n", table: [tr("Situação", "Status"), "n"] }); }
        }, {
          t: tr("Eletricidade renovável", "Renewable electricity"),
          d: tr("Percentagem da produção de eletricidade, ano mais recente.", "Share of electricity output, latest year."),
          src: R.indicadores.eletricidade_renovavel.fonte,
          html: miniBars([{ l: nm("WLD"), v: W.re.v, t: fmt(W.re.v, 1) + "%", c: css("--s1") }, { l: nm("EUU"), v: t.eu("eletricidade_renovavel").v, t: fmt(t.eu("eletricidade_renovavel").v, 1) + "%", c: css("--s3") }, { l: nm("PRT"), v: t.pt("eletricidade_renovavel").v, t: fmt(t.pt("eletricidade_renovavel").v, 1) + "%", c: css("--s2"), hl: true }], { max: 100 })
        }],
        factos: [
          tr(`<b>Dos ${MP.length} casos mineiros portugueses acompanhados, ${mpLit} envolvem lítio, ${mpExp} estão em exploração e ${mpEnc} são passivos históricos em remediação.</b>`, `<b>Of the ${MP.length} Portuguese mining cases followed, ${mpLit} involve lithium, ${mpExp} are in operation and ${mpEnc} are historical liabilities under remediation.</b>`),
          tr(`<b>${fmt(W.re.v, 1)}% da eletricidade mundial é renovável; em Portugal, ${fmt(t.pt("eletricidade_renovavel").v, 1)}%</b>.`, `<b>${fmt(W.re.v, 1)}% of world electricity is renewable; in Portugal, ${fmt(t.pt("eletricidade_renovavel").v, 1)}%</b>.`),
          tr(`<b>${cn(comm("lithium"))}:</b> ${cp(comm("lithium"))}`, `<b>${cn(comm("lithium"))}:</b> ${cp(comm("lithium"))}`),
          tr(`<b>${cn(comm("rare-earths"))}:</b> ${cp(comm("rare-earths"))}`, `<b>${cn(comm("rare-earths"))}:</b> ${cp(comm("rare-earths"))}`)
        ],
        praticas: [
          [tr("Poupar energia primeiro", "Save energy first"), tr("A energia que não se gasta é a que não exige nem painel, nem bateria, nem mina.", "The energy not used is the one that needs no panel, battery or mine.")],
          [tr("Baterias com segunda vida", "Batteries with a second life"), tr("Reutilizar e reciclar baterias reduz a pressão sobre o lítio, o níquel e o cobalto.", "Reusing and recycling batteries reduces pressure on lithium, nickel and cobalt.")],
          [tr("Distinguir prospeção de exploração", "Tell prospecting from mining"), tr("Prospeção procura e caracteriza recursos; só uma exploração aprovada extrai.", "Prospecting looks for and characterises resources; only an approved operation extracts.")],
          [tr("Exigir medição antes, durante e depois", "Demand measurement before, during and after"), tr("Água, solo, ar e biodiversidade medidos antes da obra permitem provar o que mudou.", "Water, soil, air and biodiversity measured before works make it possible to prove what changed.")]
        ],
        links: [[tr("Casos e estado dos processos", "Cases and procedure status"), "#casos"], [tr("Energia no Observatório da Terra", "Energy in the Earth Observatory"), "/observatorio/observatorio-terra.html#energia"], [tr("Renováveis e território", "Renewables and territory"), "/energia/transicao-etica.html"]]
      }
    } : {};


    /* ---------- eletricidade renovável (Digital e Energia) ---------- */
    const reW = t.wl("eletricidade_renovavel"), reE = t.eu("eletricidade_renovavel"), reP = t.pt("eletricidade_renovavel");
    const rfW = t.wl("renovavel_final"), rfP = t.pt("renovavel_final"), rfE = t.eu("renovavel_final");
    const inW = t.wl("intensidade_energetica"), inP = t.pt("intensidade_energetica");
    const reSer = ser("eletricidade_renovavel", "WLD"), reYears = []; for (let y = Math.max(reSer.a, 2000); y <= reW.y; y++) reYears.push(y);
    const ghg = ST.emissoes_gases_efeito_estufa.valores, ghgY = Object.keys(ghg).map(Number).sort((a, b) => a - b);
    const REDE = {
      id: "rede", c: COR.alimento, nome: tr("Rede renovável", "Renewable grid"),
      v: fmt(reP.v, 1) + "%", k: tr("da eletricidade em Portugal é renovável (" + reP.y + "); no mundo, " + fmt(reW.v, 1) + "%", "of electricity in Portugal is renewable (" + reP.y + "); worldwide, " + fmt(reW.v, 1) + "%"),
      titulo: tr("De onde vem a eletricidade", "Where electricity comes from"),
      fig: [{
        t: tr("Eletricidade renovável", "Renewable electricity"),
        d: tr("Percentagem da produção de eletricidade, " + reYears[0] + "–" + reW.y + ".", "Share of electricity output, " + reYears[0] + "–" + reW.y + "."),
        src: R.indicadores.eletricidade_renovavel.fonte,
        draw: (el) => line(el, { x: reYears, series: [["WLD", "--s1"], ["EUU", "--s3"], ["PRT", "--s2"]].map(([c, v]) => ({ n: nm(c), c: css(v), v: reYears.map((y) => at("eletricidade_renovavel", c, y)) })), zero: true, yf: (v) => fmt(v, 0) + "%", tf: (se, i) => fmt(se.v[i], 1) + "%", endLabels: true, aria: tr("Eletricidade renovável", "Renewable electricity"), table: true, tableEvery: 5 })
      }, {
        t: tr("Eletricidade não é toda a energia", "Electricity is not all energy"),
        d: tr("Quota de renováveis na energia final (calor, transportes e eletricidade), ano mais recente.", "Share of renewables in final energy (heat, transport and electricity), latest year."),
        src: R.indicadores.renovavel_final.fonte,
        html: miniBars([{ l: nm("WLD") + " " + rfW.y, v: rfW.v, t: fmt(rfW.v, 1) + "%", c: css("--s1") }, { l: nm("EUU") + " " + rfE.y, v: rfE.v, t: fmt(rfE.v, 1) + "%", c: css("--s3") }, { l: nm("PRT") + " " + rfP.y, v: rfP.v, t: fmt(rfP.v, 1) + "%", c: css("--s2"), hl: true }], { max: 100 })
      }],
      factos: [
        tr(`<b>${fmt(reW.v, 1)}% da eletricidade mundial é renovável; em Portugal, ${fmt(reP.v, 1)}%</b> e na União Europeia ${fmt(reE.v, 1)}%.`, `<b>${fmt(reW.v, 1)}% of world electricity is renewable; in Portugal, ${fmt(reP.v, 1)}%</b> and in the European Union ${fmt(reE.v, 1)}%.`),
        tr(`<b>Na energia final, as renováveis são só ${fmt(rfW.v, 1)}% no mundo</b> (${rfW.y}) e ${fmt(rfP.v, 1)}% em Portugal: calor e transportes ainda dependem sobretudo de outras fontes.`, `<b>In final energy, renewables are only ${fmt(rfW.v, 1)}% worldwide</b> (${rfW.y}) and ${fmt(rfP.v, 1)}% in Portugal: heat and transport still depend mostly on other sources.`),
        tr(`<b>Cada dólar de atividade económica usa ${fmt(inW.v, 2)} MJ de energia no mundo</b> (${inW.y}) e ${fmt(inP.v, 2)} MJ em Portugal: um valor mais baixo significa menos energia por unidade produzida.`, `<b>Each dollar of economic activity uses ${fmt(inW.v, 2)} MJ of energy worldwide</b> (${inW.y}) and ${fmt(inP.v, 2)} MJ in Portugal: a lower value means less energy per unit produced.`)
      ],
      praticas: [],
      links: [[tr("Energia no Observatório da Terra", "Energy in the Earth Observatory"), "/observatorio/observatorio-terra.html#energia"]]
    };

    /* ---------- energia ---------- */
    const EN7 = X["energy-overview"], RP = X["renewable-projects"];
    const lowAcc = t.accRows.slice().sort((a, b) => a.v - b.v).slice(0, 4);
    const pmTop = t.pmRows.slice().sort((a, b) => b.v - a.v).slice(0, 6);
    const mortW = t.wl("mortalidade_ar"), mortP = t.pt("mortalidade_ar");
    const CPT = { India: "Índia", Kenya: "Quénia", Morocco: "Marrocos", "United Kingdom": "Reino Unido" };
    const pc = (c) => (EN ? c : CPT[c] || c);
    const AR_SHARED = {
        id: "ar", c: "#4f7f9e", nome: tr("Ar", "Air"),
        v: fmt(W.pm.v, 1) + " µg/m³", k: tr("exposição média mundial a partículas finas PM2.5 (guia da OMS: " + t.D1.PM_GUIDE + ")", "average world exposure to fine particles PM2.5 (WHO guideline: " + t.D1.PM_GUIDE + ")"),
        titulo: tr("O ar é o preço visível da combustão", "Air is the visible price of combustion"),
        fig: [{
          t: tr("Partículas finas PM2.5", "Fine particles PM2.5"),
          d: tr("Exposição média anual (µg/m³), ano mais recente.", "Average annual exposure (µg/m³), latest year."),
          src: R.indicadores.pm25.fonte,
          html: miniBars([{ l: nm("WLD"), v: W.pm.v, t: fmt(W.pm.v, 1), c: css("--s1") }, { l: nm("PRT"), v: t.pt("pm25").v, t: fmt(t.pt("pm25").v, 1), c: css("--s2"), hl: true }, { l: tr("Guia OMS", "WHO guideline"), v: t.D1.PM_GUIDE, t: String(t.D1.PM_GUIDE), c: css("--s3") }].concat(pmTop.slice(0, 3).map((r) => ({ l: nm(r.c), v: r.v, t: fmt(r.v, 1), c: css("--s8") }))), { ref: t.D1.PM_GUIDE })
        }],
        factos: [
          tr(`<b>${t.pmAbove} de ${t.pmRows.length} Estados ultrapassam o valor-guia da OMS para PM2.5.</b> A exposição média mundial é ${fmt(W.pm.v, 1)} µg/m³, ${fmt(W.pm.v / t.D1.PM_GUIDE, 1)} vezes o guia.`, `<b>${t.pmAbove} of ${t.pmRows.length} states exceed the WHO guideline for PM2.5.</b> World average exposure is ${fmt(W.pm.v, 1)} µg/m³, ${fmt(W.pm.v / t.D1.PM_GUIDE, 1)} times the guideline.`),
          tr(`<b>${fmt(mortW.v, 0)} mortes por 100 000 habitantes no mundo são atribuídas à poluição do ar</b> (${mortW.y}); em Portugal, ${fmt(mortP.v, 0)}.`, `<b>${fmt(mortW.v, 0)} deaths per 100,000 people worldwide are attributed to air pollution</b> (${mortW.y}); in Portugal, ${fmt(mortP.v, 0)}.`),
          tr(`<b>A exposição em Portugal é ${fmt(t.pt("pm25").v, 1)} µg/m³</b> (${t.pt("pm25").y}), ${fmt(t.pt("pm25").v / t.D1.PM_GUIDE, 1)} vezes o guia da OMS.`, `<b>Exposure in Portugal is ${fmt(t.pt("pm25").v, 1)} µg/m³</b> (${t.pt("pm25").y}), ${fmt(t.pt("pm25").v / t.D1.PM_GUIDE, 1)} times the WHO guideline.`)
        ],
        praticas: [
          [tr("Menos combustão", "Less combustion"), tr("Cada quilowatt-hora poupado e cada deslocação a pé, de bicicleta ou em transporte público evita emissões na origem.", "Every kilowatt-hour saved and every trip on foot, by bike or by public transport avoids emissions at source.")],
          [tr("Aquecimento limpo", "Clean heating"), tr("Isolar a casa e usar bombas de calor ou lenha em equipamento eficiente reduz partículas.", "Insulating the home and using heat pumps or wood in efficient equipment reduces particles.")],
          [tr("Nada de queimas", "No open burning"), tr("Queimar restos agrícolas ao ar livre liberta partículas e traz risco de incêndio; compostar ou triturar é melhor.", "Burning farm waste in the open releases particles and brings fire risk; composting or chipping is better.")]
        ],
        links: [[tr("Ar no Observatório da Terra", "Air in the Earth Observatory"), "/observatorio/observatorio-terra.html#ar"], [tr("Página do ar", "Air page"), "/recursos/ar.html"]]
      };
    const ENER = EN7 && RP ? {
      acesso: {
        id: "acesso", c: COR.alimento, nome: tr("Acesso à eletricidade", "Access to electricity"),
        v: fmt(100 - W.acc.v, 1) + "%", k: tr("da população mundial ainda não tem eletricidade (" + W.acc.y + ")", "of the world’s population still has no electricity (" + W.acc.y + ")"),
        titulo: tr("Antes de transitar, é preciso chegar a todos", "Before transitioning, power must reach everyone"),
        fig: [{
          t: tr("Estados com menos acesso", "States with the least access"),
          d: tr("População com acesso a eletricidade, ano mais recente.", "Population with access to electricity, latest year."),
          src: R.indicadores.acesso_eletricidade.fonte,
          html: miniBars([{ l: nm("WLD"), v: W.acc.v, t: fmt(W.acc.v, 1) + "%", c: css("--s1") }].concat(lowAcc.map((r, i) => ({ l: nm(r.c), v: r.v, t: fmt(r.v, 1) + "%", hl: i === 0 }))), { max: 100 })
        }],
        factos: [
          tr(`<b>${fmt(100 - W.acc.v, 1)}% da população mundial ainda não tem eletricidade</b>, e ${t.accLow} Estados têm menos de 50% de acesso.`, `<b>${fmt(100 - W.acc.v, 1)}% of the world’s population still has no electricity</b>, and ${t.accLow} states have less than 50% access.`),
          tr(`<b>${nm(lowAcc[0].c)} tem ${fmt(lowAcc[0].v, 1)}% de acesso</b> (${lowAcc[0].y}), o valor mais baixo entre os Estados com dados recentes.`, `<b>${nm(lowAcc[0].c)} has ${fmt(lowAcc[0].v, 1)}% access</b> (${lowAcc[0].y}), the lowest among states with recent data.`),
          tr(`<b>Acesso não é consumo:</b> ter ligação à rede não diz quanta eletricidade chega, quando, nem a que preço.`, `<b>Access is not consumption:</b> a grid connection does not say how much electricity arrives, when, or at what price.`)
        ],
        praticas: [
          [tr("Soluções descentralizadas", "Decentralised solutions"), tr("Solar com bateria e microrredes chegam onde a rede ainda não chega.", "Solar with batteries and mini-grids reach where the grid does not yet.")],
          [tr("Eficiência primeiro", "Efficiency first"), tr("Equipamentos eficientes fazem a mesma coisa com menos energia, o que torna o acesso mais barato.", "Efficient equipment does the same with less energy, which makes access cheaper.")],
          [tr("Energia para o que importa", "Energy for what matters"), tr("Saúde, água, escolas e agricultura são usos que mudam vidas.", "Health, water, schools and farming are uses that change lives.")]
        ],
        links: [[tr("Energia no Observatório da Terra", "Energy in the Earth Observatory"), "/observatorio/observatorio-terra.html#energia"]]
      },
      ar: AR_SHARED,
      projetos: {
        id: "projetos", c: COR.floresta, nome: tr("Território das renováveis", "Territory of renewables"),
        v: String(RP.projects.length), k: tr("grandes projetos renováveis analisados no mundo, com a área que ocupam", "large renewable projects analysed worldwide, with the area they occupy"),
        titulo: tr("Renováveis também ocupam território", "Renewables also occupy territory"),
        fig: [{
          t: tr("Área publicada de cada projeto", "Published area of each project"),
          d: tr("Hectares do projeto, concessão ou envolvente de planeamento. Não é pegada impermeabilizada.", "Hectares of the project, lease or planning envelope. It is not sealed footprint."),
          src: tr("bioCulture, casos curados (Global Energy Monitor e registos oficiais)", "bioCulture, curated cases (Global Energy Monitor and official records)"),
          draw: (el) => hbars(el, RP.projects.map((p, i) => ({ l: p.name + " · " + pc(p.country), v: p.area_ha, t: fmt(p.area_ha, 0) + " ha · " + fmt(p.capacity_mw, 0) + " MW", c: css(SER[i % SER.length]) })), { unit: "ha", table: [tr("Projeto", "Project"), "ha · MW"] })
        }],
        factos: [
          tr(`<b>Uma central solar de ${fmt(RP.projects[0].capacity_mw, 0)} MW na ${pc(RP.projects[0].country)} ocupa ${fmt(RP.projects[0].area_ha, 0)} ha</b> (${RP.projects[0].name}); a eólica terrestre do ${pc(RP.projects[3].country)} ocupa ${fmt(RP.projects[3].area_ha, 0)} ha para ${fmt(RP.projects[3].capacity_mw, 0)} MW.`, `<b>A ${fmt(RP.projects[0].capacity_mw, 0)} MW solar plant in ${RP.projects[0].country} occupies ${fmt(RP.projects[0].area_ha, 0)} ha</b> (${RP.projects[0].name}); the onshore wind farm in ${RP.projects[3].country} occupies ${fmt(RP.projects[3].area_ha, 0)} ha for ${fmt(RP.projects[3].capacity_mw, 0)} MW.`),
          tr(`<b>Área do projeto não é pegada direta:</b> a área publicada é a do projeto, da concessão ou da envolvente de planeamento, não a que fica impermeabilizada.`, `<b>Project area is not direct footprint:</b> the published area is that of the project, lease or planning envelope, not the sealed area.`),
          tr(`<b>Sem valor não é «nenhuma»:</b> quando falta o número de sobreposição com áreas protegidas, significa «não verificado», não «zero».`, `<b>No value is not “none”:</b> when the protected-area overlap figure is missing, it means “not verified”, not “zero”.`)
        ],
        praticas: [
          [tr("Escolher onde", "Choose where"), tr("Telhados, parques de estacionamento, zonas industriais e terrenos já artificializados primeiro.", "Rooftops, car parks, industrial zones and already-sealed land first.")],
          [tr("Evitar floresta e áreas sensíveis", "Avoid forest and sensitive areas"), tr("Evitar montado, floresta e áreas protegidas antes de pensar em compensar.", "Avoid oak woodland, forest and protected areas before thinking about offsetting.")],
          [tr("Agrovoltaico com critério", "Agrivoltaics with criteria"), tr("A produção agrícola só conta se se mantiver e for medida.", "Farm production only counts if it is kept and measured.")],
          [tr("Participar", "Take part"), tr("As consultas públicas são o momento para pedir a área real e as medidas de proteção.", "Public consultations are the moment to ask for the real area and the protection measures.")]
        ],
        links: [[tr("Renováveis e território", "Renewables and territory"), "/energia/transicao-etica.html"], [tr("Participação pública", "Public participation"), "/index.html#participacao-publica"]]
      }
    } : {};

    /* ---------- digital ---------- */
    const DG = X["ai-data-centres-overview"], DP = X["ai-data-centres-pressures"], DC = X.impacto_digital;
    const dpr = (id) => (DP ? DP.pressures.find((x) => x.id === id) : null), dsy = (id) => (DP ? DP.systems.find((x) => x.id === id) : null);
    const gm = DG ? DG.global_metrics : null;
    const seriesY = DG ? DG.electricity_series.map((x) => x.year) : [];
    const sines = DC ? DC.find((c) => c.id === "dc-sines-sin01") : null;
    const capRows = DC ? DC.filter((c) => typeof c.capacidade_ti_mw === "number") : [];
    const concelhos = DC ? new Set(DC.map((c) => c.concelho)).size : 0;
    const DIGI = DG && DP && DC ? {
      consumo: {
        id: "consumo", c: COR.alimento, nome: tr("Eletricidade", "Electricity"),
        v: fmt(gm.electricity_2024_twh, 0) + " TWh", k: tr("consumo estimado dos centros de dados em 2024, " + fmt(gm.electricity_2024_global_share_pct, 1) + "% da eletricidade mundial", "estimated data-centre consumption in 2024, " + fmt(gm.electricity_2024_global_share_pct, 1) + "% of world electricity"),
        titulo: tr("Quanta eletricidade pedem os centros de dados", "How much electricity data centres ask for"),
        fig: [{
          t: tr("Centros de dados: eletricidade por ano", "Data centres: electricity per year"),
          d: tr("TWh por ano. A linha tracejada é uma projeção (cenário-base da IEA), não consumo observado.", "TWh per year. The dashed line is a projection (IEA base case), not observed consumption."),
          src: "IEA, Energy and AI",
          draw: (el) => line(el, { x: seriesY, series: [{ n: tr("Histórico e estimativa", "Historical and estimate"), c: css("--s3"), v: DG.electricity_series.map((x) => (x.kind === "projection" ? null : x.twh)), w: 2.4 }, { n: tr("Projeção (cenário-base)", "Projection (base case)"), c: css("--s2"), dash: true, v: DG.electricity_series.map((x) => (x.kind === "projection" || x.year === 2024 ? x.twh : null)), w: 2.4 }], zero: true, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0) + " TWh", points: true, aria: tr("Eletricidade dos centros de dados", "Data-centre electricity"), table: true })
        }],
        factos: [
          tr(`<b>Os centros de dados consumiram cerca de ${fmt(gm.electricity_2024_twh, 0)} TWh em 2024</b>, ${fmt(gm.electricity_2024_global_share_pct, 1)}% da eletricidade mundial (estimativa da IEA).`, `<b>Data centres consumed about ${fmt(gm.electricity_2024_twh, 0)} TWh in 2024</b>, ${fmt(gm.electricity_2024_global_share_pct, 1)}% of world electricity (IEA estimate).`),
          tr(`<b>O cenário-base da IEA aponta para ${fmt(gm.electricity_2030_twh_base_case, 0)} TWh em 2030</b>, ${fmt(gm.annual_growth_2024_2030_pct, 0)}% ao ano. É uma projeção, não consumo observado nem destino inevitável.`, `<b>The IEA base case points to ${fmt(gm.electricity_2030_twh_base_case, 0)} TWh in 2030</b>, ${fmt(gm.annual_growth_2024_2030_pct, 0)}% a year. It is a projection, neither observed consumption nor an inevitable outcome.`),
          tr(`<b>Entre ${DG.electricity_series[0].year} e 2024 o consumo passou de ${fmt(DG.electricity_series[0].twh, 0)} para ${fmt(gm.electricity_2024_twh, 0)} TWh</b>, ×${fmt(gm.electricity_2024_twh / DG.electricity_series[0].twh, 1)}.`, `<b>Between ${DG.electricity_series[0].year} and 2024 consumption went from ${fmt(DG.electricity_series[0].twh, 0)} to ${fmt(gm.electricity_2024_twh, 0)} TWh</b>, ×${fmt(gm.electricity_2024_twh / DG.electricity_series[0].twh, 1)}.`),
          tr(`<b>Calor rejeitado:</b> ${dsy("heat").body_pt}`, `<b>Rejected heat:</b> ${dsy("heat").body_en}`)
        ],
        praticas: [
          [tr("Usar menos, melhor", "Use less, better"), tr("Apagar o que não precisas, evitar transmissões e armazenamento inúteis e usar modelos e serviços do tamanho da tarefa.", "Delete what you do not need, avoid useless streaming and storage, and use models and services sized to the task.")],
          [tr("Pedir números", "Ask for numbers"), tr("Consumo real, PUE, WUE e origem da energia publicados pelo operador permitem comparar.", "Real consumption, PUE, WUE and energy source published by the operator make comparison possible.")],
          [tr("Aproveitar o calor", "Reuse the heat"), tr("O calor dos servidores pode alimentar redes térmicas, estufas ou edifícios próximos.", "Server heat can feed heat networks, greenhouses or nearby buildings.")],
          [tr("Exigir medição pública", "Demand public measurement"), tr("Antes de novos campus, consumo, água, área e rede elétrica devem estar no processo de licenciamento.", "Before new campuses, consumption, water, area and grid connection should be in the licensing file.")]
        ],
        links: [[tr("Casos em Portugal", "Cases in Portugal"), "#casos"], [tr("Vetores de pressão", "Pressure vectors"), "/observatorio/vetores-pressao-global.html"]]
      },
      agua: {
        id: "dig-agua", c: COR.agua, nome: tr("Água", "Water"),
        v: tr("sem padrão", "no standard"), k: tr("global para medir a água dos centros de dados", "worldwide to measure data-centre water"),
        titulo: tr("A água dos centros de dados ainda não se compara", "Data-centre water cannot yet be compared"),
        fig: [{
          t: tr("Stress hídrico", "Water stress"),
          d: tr("Percentagem dos recursos de água doce renováveis que é captada (ano mais recente). Acima de 25% já há stress.", "Share of renewable freshwater resources that is withdrawn (latest year). Above 25% there is already stress."),
          src: "FAO AQUASTAT, ODS 6.4.2",
          html: miniBars([{ l: nm("WLD") + " " + ws.y, v: ws.v, t: fmt(ws.v, 1) + "%", c: css("--s1") }, { l: nm("PRT") + " " + wsP.y, v: wsP.v, t: fmt(wsP.v, 1) + "%", c: css("--s2"), hl: true }, { l: tr("Limite «sem stress»", "“No stress” limit"), v: 25, t: "25%", c: css("--s3") }], { max: 100 })
        }],
        factos: [
          tr(`<b>Sem padrão global:</b> ${dpr("water").detail_pt}`, `<b>No global standard:</b> ${dpr("water").detail_en}`),
          tr(`<b>${dsy("water").title_pt}:</b> ${dsy("water").body_pt}`, `<b>${dsy("water").title_en}:</b> ${dsy("water").body_en}`),
          tr(`<b>Em Portugal, o campus de Sines declara arrefecimento primário com água do mar e WUE 0</b>; os volumes de captação e descarga marinha não estão na página pública do operador.`, `<b>In Portugal, the Sines campus declares primary cooling with seawater and WUE 0</b>; seawater intake and discharge volumes are not on the operator’s public page.`),
          tr(`<b>O stress hídrico de Portugal é ${fmt(wsP.v, 1)}%</b> (${wsP.y}); a média nacional esconde regiões e estações mais secas.`, `<b>Portugal’s water stress is ${fmt(wsP.v, 1)}%</b> (${wsP.y}); the national average hides drier regions and seasons.`)
        ],
        praticas: [
          [tr("Perguntar «captação ou consumo?»", "Ask “withdrawal or consumption?”"), tr("São medidas diferentes: uma é a água que entra, a outra a que não volta.", "They are different measures: one is the water that comes in, the other the water that does not return.")],
          [tr("Preferir água reutilizada ou do mar", "Prefer reclaimed or sea water"), tr("Reduz a pressão sobre a água potável, mas não elimina impactos locais.", "It reduces pressure on drinking water, but does not remove local impacts.")],
          [tr("Olhar para a seca", "Look at drought"), tr("Em anos secos e ondas de calor a refrigeração pode competir com o abastecimento.", "In dry years and heatwaves cooling can compete with supply.")]
        ],
        links: [[tr("Água no Observatório da Terra", "Water in the Earth Observatory"), "/observatorio/observatorio-terra.html#agua"]]
      },
      territorio: {
        id: "territorio", c: COR.solo, nome: tr("Território e calor", "Territory and heat"),
        v: String(DC.length), k: tr("instalações em " + concelhos + " concelhos documentadas em Portugal", "facilities in " + concelhos + " municipalities documented in Portugal"),
        titulo: tr("Cada campus tem terreno, rede e vizinhança", "Each campus has land, grid and neighbours"),
        fig: [{
          t: tr("Capacidade de TI dos campus em Portugal", "IT capacity of campuses in Portugal"),
          d: tr("MW de capacidade de TI publicada. Não é consumo; operacional, em construção e planeado misturam-se, por isso lê o estado.", "MW of published IT capacity. It is not consumption; operational, under construction and planned are mixed, so read the status."),
          src: tr("bioCulture, casos documentados (operadores e processos públicos)", "bioCulture, documented cases (operators and public procedures)"),
          draw: (el) => hbars(el, capRows.map((c) => ({ l: c.nome.replace(/^.*— /, "") + " · " + c.concelho + " (" + c.status.split(/[ ;/]/)[0].toLowerCase() + ")", v: c.capacidade_ti_mw, t: fmt(c.capacidade_ti_mw, 1) + " MW", c: /^Operacional/.test(c.status) ? css("--s3") : /construção/.test(c.status) ? css("--s4") : css("--s5") })), { unit: "MW", table: [tr("Campus", "Campus"), "MW"] })
        }],
        factos: [
          tr(`<b>O bioCulture documenta ${DC.length} instalações em ${concelhos} concelhos</b> (Sines, Vila Franca de Xira, Oeiras, Loures e Covilhã).`, `<b>bioCulture documents ${DC.length} facilities in ${concelhos} municipalities</b> (Sines, Vila Franca de Xira, Oeiras, Loures and Covilhã).`),
          tr(`<b>Sines tem ${fmt(sines.capacidade_ti_mw, 1)} MW de TI em operação e prevê ${fmt(sines.capacidade_futura_campus_mw, 0)} MW no campus.</b> O consumo elétrico anual efetivo não está publicado.`, `<b>Sines has ${fmt(sines.capacidade_ti_mw, 1)} MW of IT in operation and plans ${fmt(sines.capacidade_futura_campus_mw, 0)} MW on the campus.</b> Actual annual electricity consumption is not published.`),
          tr(`<b>Solo e ecossistemas:</b> ${dpr("land").detail_pt}`, `<b>Land and ecosystems:</b> ${dpr("land").detail_en}`),
          tr(`<b>Em Sines, o EIA das fases seguintes identifica a ZEC Costa Sudoeste dentro de parte da área de estudo</b>; impactos concretos dependem da AIA e da monitorização.`, `<b>In Sines, the EIA for the following phases identifies the Costa Sudoeste SAC within part of the study area</b>; concrete impacts depend on the EIA conditions and monitoring.`)
        ],
        praticas: [
          [tr("Medir antes de construir", "Measure before building"), tr("Estado de referência do solo, da água e da biodiversidade permite provar o que mudou.", "A baseline of soil, water and biodiversity makes it possible to prove what changed.")],
          [tr("Contar linhas e subestações", "Count lines and substations"), tr("A área do campus é só parte do território afetado: acessos, linhas e geradores contam.", "The campus area is only part of the affected territory: access roads, lines and generators count.")],
          [tr("Preferir terreno já artificializado", "Prefer already-sealed land"), tr("Zonas industriais e antigas centrais pesam menos sobre solo agrícola e floresta.", "Industrial zones and former power plants weigh less on farmland and forest.")],
          [tr("Participar nas consultas", "Take part in consultations"), tr("As consultas públicas são o momento para pedir dados e deixar objeções fundamentadas.", "Public consultations are the moment to ask for data and file well-founded objections.")]
        ],
        links: [[tr("Casos em Portugal", "Cases in Portugal"), "#casos"], [tr("Participação pública", "Public participation"), "/index.html#participacao-publica"]]
      },
      equipamento: {
        id: "equipamento", c: COR.solo, nome: tr("Equipamento", "Equipment"),
        v: fmt(ew.valor, 0) + " Mt", k: tr("de resíduos eletrónicos gerados no mundo em " + ew.ano, "of electronic waste generated worldwide in " + ew.ano),
        titulo: tr("Servidores e telemóveis também acabam", "Servers and phones end too"),
        fig: [{
          t: tr("Resíduos eletrónicos", "Electronic waste"),
          d: tr("Milhões de toneladas, " + ew.ano + ".", "Million tonnes, " + ew.ano + "."),
          src: fontes(ew.fonte_id),
          html: miniBars([{ l: tr("Gerados", "Generated"), v: ew.valor, t: fmt(ew.valor, 0), c: css("--s8") }, { l: tr("Recolhidos e reciclados", "Collected and recycled"), v: ew.valor * parseFloat(String(ewPct).replace(",", ".")) / 100, t: fmt(ew.valor * parseFloat(String(ewPct).replace(",", ".")) / 100, 1), c: css("--s3"), hl: true }])
        }, {
          t: tr("Extração mundial de materiais", "World material extraction"),
          d: tr("Mil milhões de toneladas por ano.", "Billion tonnes per year."),
          src: fontes(mat.fonte_id),
          html: miniBars([{ l: String(mat.referencia.ano), v: mat.referencia.valor, t: fmt(mat.referencia.valor, 0), c: css("--bar-dim") }, { l: String(mat.ano), v: mat.valor, t: fmt(mat.valor, 1), c: COR.solo, hl: true }])
        }],
        factos: [
          tr(`<b>Geraram-se ${fmt(ew.valor, 0)} milhões de toneladas de resíduos eletrónicos em ${ew.ano}</b>: só ${ewPct}% foram formalmente recolhidos e reciclados (ITU).`, `<b>${fmt(ew.valor, 0)} million tonnes of electronic waste were generated in ${ew.ano}</b>: only ${(ewPct || "").replace(",", ".")}% were formally collected and recycled (ITU).`),
          tr(`<b>A extração global de materiais passou de ${fmt(mat.referencia.valor, 0)} para ${fmt(mat.valor, 1)} mil milhões de toneladas</b> (${mat.referencia.ano}–${mat.ano}), mais do triplo (UNEP).`, `<b>Global material extraction rose from ${fmt(mat.referencia.valor, 0)} to ${fmt(mat.valor, 1)} billion tonnes</b> (${mat.referencia.ano}–${mat.ano}), more than triple (UNEP).`),
          tr(`<b>Cada equipamento tem uma origem mineira:</b> a cadeia dos centros de dados começa em minas e acaba em resíduos.`, `<b>Every device has a mining origin:</b> the data-centre chain starts in mines and ends in waste.`)
        ],
        praticas: [
          [tr("Prolongar a vida", "Extend life"), tr("Usar o equipamento mais anos é a forma mais eficaz de reduzir resíduos e extração.", "Using equipment for more years is the most effective way to reduce waste and extraction.")],
          [tr("Reparar e recondicionar", "Repair and refurbish"), tr("Peças substituíveis e aparelhos recondicionados mantêm o material em uso.", "Replaceable parts and refurbished devices keep material in use.")],
          [tr("Entregar em recolha certificada", "Hand in at certified collection"), tr("Só o que é formalmente recolhido entra na reciclagem.", "Only what is formally collected enters recycling.")]
        ],
        links: [[tr("Mineração", "Mining"), "/energia/mineracao.html"], [tr("Vetores de pressão", "Pressure vectors"), "/observatorio/vetores-pressao-global.html"]]
      }
    } : {};


    /* ---------- água (só em Água) ---------- */
    const WO = X["water-overview"];
    const wHead = (id) => (WO ? WO.headline_metrics.find((m) => m.indicator_id === id) : null);
    const wJmp = (id) => (WO ? WO.jmp_report_context.find((m) => m.indicator === id) : null);
    const wSafe = wHead("sdg_6_1_1_safely_managed_drinking_water"), wNoSafe = wJmp("people_without_safely_managed_drinking_water"), wN160 = wJmp("countries_with_safely_managed_drinking_water_estimates");
    const dwP = t.pt("agua_potavel");
    const wsSorted = t.wsRows.slice().sort((a, b) => b.v - a.v);
    const dwLowRows = t.dwRows.slice().sort((a, b) => a.v - b.v).slice(0, 3);
    const wsSer = ser("stress_hidrico", "WLD"), wsYears = []; for (let y = wsSer.a; y <= ws.y; y++) wsYears.push(y);
    const WAT = WO && wSafe && wNoSafe ? {
      escassez: {
        id: "escassez", c: COR.agua, nome: tr("Escassez", "Scarcity"),
        v: String(wsCrit), k: tr("Estados captam mais água doce do que a que se renova (stress acima de 100%)", "states withdraw more freshwater than is renewed (stress above 100%)"),
        titulo: tr("Onde a água já não chega para o que se tira", "Where water no longer covers what is taken"),
        fig: [{
          t: tr("Estados com maior stress hídrico", "States with the highest water stress"),
          d: tr("Percentagem da água doce renovável que é captada. As barras cortam nos 300%; a marca a tracejado é 100% (capta-se tudo o que se renova).", "Share of renewable freshwater that is withdrawn. Bars are cut at 300%; the dashed mark is 100% (everything that renews is withdrawn)."),
          src: R.indicadores.stress_hidrico.fonte,
          draw: (el) => hbars(el, wsSorted.slice(0, 7).map((r) => ({ l: nm(r.c), v: Math.min(r.v, 300), t: fmt(r.v, 0) + "%", c: css("--s8") })).concat([{ l: nm("PRT") + " " + wsP.y, v: wsP.v, t: fmt(wsP.v, 1) + "%", hl: true, c: css("--s2") }, { l: nm("WLD") + " " + ws.y, v: ws.v, t: fmt(ws.v, 1) + "%", c: css("--s1") }]), { max: 300, ref: 100, unit: "%", table: [tr("Estado", "State"), "%"] })
        }, {
          t: tr("Mundo e Portugal ao longo do tempo", "World and Portugal over time"),
          d: tr("Stress hídrico (% dos recursos renováveis), " + wsYears[0] + "–" + ws.y + ".", "Water stress (% of renewable resources), " + wsYears[0] + "–" + ws.y + "."),
          src: R.indicadores.stress_hidrico.fonte,
          draw: (el) => line(el, { x: wsYears, series: [["WLD", "--s1"], ["PRT", "--s2"]].map(([c, v]) => ({ n: nm(c), c: css(v), v: wsYears.map((y) => at("stress_hidrico", c, y)) })), zero: true, ref: 25, refLabel: tr("25%: início do stress", "25%: start of stress"), yf: (v) => fmt(v, 0) + "%", tf: (se, i) => fmt(se.v[i], 1) + "%", endLabels: true, aria: tr("Stress hídrico", "Water stress"), table: true, tableEvery: 5 })
        }],
        factos: [
          tr(`<b>${wsCrit} Estados captam mais água doce do que a que se renova</b> (stress acima de 100%).`, `<b>${wsCrit} states withdraw more freshwater than is renewed</b> (stress above 100%).`),
          tr(`<b>A média mundial é ${fmt(ws.v, 1)}% e a de Portugal ${fmt(wsP.v, 1)}%</b> (${ws.y}). Acima de 25% já há stress (classes do ODS 6.4.2); a média nacional esconde regiões e estações mais secas.`, `<b>The world average is ${fmt(ws.v, 1)}% and Portugal’s ${fmt(wsP.v, 1)}%</b> (${ws.y}). Above 25% there is already stress (SDG 6.4.2 classes); the national average hides drier regions and seasons.`),
          tr(`<b>Em Portugal o stress hídrico passou de ${fmt(at("stress_hidrico", "PRT", wsYears[0]), 1)}% em ${wsYears[0]} para ${fmt(wsP.v, 1)}% em ${wsP.y}</b>, enquanto a média mundial ficou quase igual (${fmt(at("stress_hidrico", "WLD", wsYears[0]), 1)}% para ${fmt(ws.v, 1)}%).`, `<b>In Portugal water stress went from ${fmt(at("stress_hidrico", "PRT", wsYears[0]), 1)}% in ${wsYears[0]} to ${fmt(wsP.v, 1)}% in ${wsP.y}</b>, while the world average stayed almost the same (${fmt(at("stress_hidrico", "WLD", wsYears[0]), 1)}% to ${fmt(ws.v, 1)}%).`)
        ],
        praticas: [
          [tr("Medir o que gastas", "Measure what you use"), tr("Ler o contador e a fatura mostra onde está o consumo, em casa e na parcela.", "Reading the meter and the bill shows where the consumption is, at home and on the plot.")],
          [tr("Regar ao amanhecer", "Water at dawn"), tr("Gota a gota, de manhã cedo ou ao fim do dia, perde-se menos por evaporação.", "Drip irrigation, early morning or evening, loses less to evaporation.")],
          [tr("Reutilizar e captar", "Reuse and harvest"), tr("Águas cinzentas tratadas e água da chuva guardada servem a rega e à limpeza.", "Treated greywater and stored rainwater serve irrigation and cleaning.")],
          [tr("Culturas à medida da água", "Crops matched to water"), tr("Variedades de sequeiro ou de ciclo curto nos meses e zonas mais secos.", "Dryland or short-cycle varieties in the driest months and zones.")]
        ],
        links: [[tr("Água no Observatório da Terra", "Water in the Earth Observatory"), "/observatorio/observatorio-terra.html#agua"], [tr("Sistemas de captação de água", "Water harvesting systems"), "/services/servicos.html#catalogo-tecnicas"]]
      },
      potavel: {
        id: "potavel", c: COR.agua, nome: tr("Água potável", "Drinking water"),
        v: fmt(wNoSafe.value, 1) + tr(" mil M", " bn"), k: tr("de pessoas sem água potável gerida em segurança (" + wNoSafe.year + ")", "people without safely managed drinking water (" + wNoSafe.year + ")"),
        titulo: tr("Beber em segurança ainda não é para todos", "Safe drinking is still not for everyone"),
        fig: [{
          t: tr("População com água potável gerida em segurança", "Population with safely managed drinking water"),
          d: tr("Percentagem da população, ano mais recente. Estados com menos acesso em vermelho.", "Share of the population, latest year. States with least access in red."),
          src: R.indicadores.agua_potavel.fonte,
          html: miniBars([{ l: nm("WLD") + " " + wSafe.year, v: wSafe.value, t: fmt(wSafe.value, 1) + "%", c: css("--s1") }, { l: nm("PRT") + " " + dwP.y, v: dwP.v, t: fmt(dwP.v, 1) + "%", c: css("--s2"), hl: true }].concat(dwLowRows.map((r) => ({ l: nm(r.c) + " " + r.y, v: r.v, t: fmt(r.v, 1) + "%", c: css("--s8") }))), { max: 100 })
        }],
        factos: [
          tr(`<b>${fmt(wSafe.value, 1)}% da população mundial usa água potável gerida em segurança</b> (${wSafe.year}); em Portugal, ${fmt(dwP.v, 1)}%.`, `<b>${fmt(wSafe.value, 1)}% of the world’s population uses safely managed drinking water</b> (${wSafe.year}); in Portugal, ${fmt(dwP.v, 1)}%.`),
          tr(`<b>${fmt(wNoSafe.value, 1)} mil milhões de pessoas ainda não têm água potável gerida em segurança</b> (${wNoSafe.year}, OMS e UNICEF).`, `<b>${fmt(wNoSafe.value, 1)} billion people still lack safely managed drinking water</b> (${wNoSafe.year}, WHO and UNICEF).`),
          tr(`<b>${t.dwLow} Estados têm menos de metade da população com água potável gerida em segurança.</b> ${nm(dwLowRows[0].c)} tem ${fmt(dwLowRows[0].v, 1)}%.`, `<b>${t.dwLow} states have fewer than half of their population with safely managed drinking water.</b> ${nm(dwLowRows[0].c)} has ${fmt(dwLowRows[0].v, 1)}%.`),
          tr(`<b>${wN160.value} países têm estimativas</b> de água potável gerida em segurança (JMP).`, `<b>${wN160.value} countries have estimates</b> of safely managed drinking water (JMP).`)
        ],
        praticas: [
          [tr("Conhecer a origem", "Know the source"), tr("Saber de onde vem a água de casa, do furo ou do poço e quem a controla.", "Know where the water at home, from the borehole or well comes from and who monitors it.")],
          [tr("Analisar furos e poços", "Test boreholes and wells"), tr("Análises periódicas mostram contaminação que não se vê nem se cheira.", "Regular tests reveal contamination that cannot be seen or smelled.")],
          [tr("Proteger nascentes e lençóis", "Protect springs and aquifers"), tr("Fossas bem feitas, menos nutrientes e pesticidas na terra e zonas de recarga livres de contaminação.", "Well-built septic systems, fewer nutrients and pesticides on the land and recharge zones free of contamination.")]
        ],
        links: [[tr("Água no Observatório da Terra", "Water in the Earth Observatory"), "/observatorio/observatorio-terra.html#agua"]]
      },
      ciclo: {
        id: "ciclo", c: COR.agua, nome: tr("Ciclo da água", "Water cycle"),
        v: tr("1 em 3", "1 in 3"), k: tr("bacias hidrográficas com condições normais em 2024 (OMM)", "river basins with normal conditions in 2024 (WMO)"),
        titulo: tr("Chuva irregular, bacias fora do normal", "Irregular rain, basins out of the normal"),
        fig: [{
          t: tr("Chuva em Portugal continental", "Rainfall in mainland Portugal"),
          d: tr("Precipitação anual (mm). A média esconde os extremos.", "Annual precipitation (mm). The average hides the extremes."),
          src: "IPMA, boletins climatológicos anuais",
          html: miniBars([{ l: "2024", v: pr24, t: fmt(pr24, 0) + " mm", c: css("--s4") }, { l: "2025", v: pr25, t: fmt(pr25, 0) + " mm", c: css("--s1"), hl: true }], { max: 1200 })
        }],
        factos: [
          tr(`<b>Só um terço das bacias hidrográficas do mundo teve condições normais em 2024</b> (OMM).`, `<b>Only a third of the world’s river basins had normal conditions in 2024</b> (WMO).`),
          tr(`<b>Todas as regiões de glaciares do mundo registaram perdas por degelo pelo terceiro ano seguido</b> (OMM, 2024).`, `<b>All glacier regions worldwide reported melt losses for a third consecutive year</b> (WMO, 2024).`),
          tr(`<b>Em Portugal continental choveu ${fmt(pr24, 0)} mm em 2024 e ${fmt(pr25, 0)} mm em 2025</b> (IPMA): dois anos seguidos muito diferentes.`, `<b>Mainland Portugal had ${fmt(pr24, 0)} mm of rain in 2024 and ${fmt(pr25, 0)} mm in 2025</b> (IPMA): two very different consecutive years.`),
          tr(`<b>Secas e cheias fazem parte do mesmo ciclo:</b> ${flood} áreas de risco potencial significativo de inundação (ciclo 2022–2027) e ${fmt(semi.variacao_percent, 0)}% mais área semiárida entre ${semi.de} e ${semi.ate}.`, `<b>Droughts and floods are part of the same cycle:</b> ${flood} areas of significant potential flood risk (2022–2027 cycle) and ${fmt(semi.variacao_percent, 0)}% more semi-arid area between ${semi.de} and ${semi.ate}.`)
        ],
        praticas: [
          [tr("Guardar a chuva", "Store the rain"), tr("Cisternas, tanques e telhados ligados à horta guardam a água do inverno para o verão.", "Cisterns, tanks and roofs connected to the garden store winter water for summer.")],
          [tr("Deixar a água infiltrar", "Let water soak in"), tr("Solo coberto, valas em nível e pavimentos permeáveis reduzem a escorrência e as cheias a jusante.", "Covered soil, contour swales and permeable paving reduce runoff and downstream floods.")],
          [tr("Proteger as ribeiras", "Protect streams"), tr("Galerias ripícolas seguram as margens, filtram a água e guardam humidade.", "Riparian strips hold the banks, filter water and keep moisture.")]
        ],
        links: [[tr("Clima no Observatório da Terra", "Climate in the Earth Observatory"), "/observatorio/observatorio-terra.html#clima"]]
      }
    } : {};

    /* ---------- ar (só em Ar) ---------- */
    const QA = X.qualidade_ar, QN = QA ? QA.estado_nacional_2024 : null;
    const qnum = (m) => (m ? parseFloat(String(m[1]).replace(",", ".")) : null);
    const qMax = QN ? QN.tendencia_2002_2024.match(/máximo de (\d+,\d+)% em (\d{4})/) : null;
    const qGuiaNo2 = QA ? QA.referencias_oms_2021.no2.anual : null;
    const qEp = (id) => (QA ? QA.episodios_especiais.find((e) => e.id === id) : null);
    const AIR = QN && qMax ? {
      qualar: {
        id: "qualar", c: "#4f7f9e", nome: tr("Portugal em 2024", "Portugal in 2024"),
        v: fmt(QN.dias_fraco_ou_mau_percent, 1) + "%", k: tr("dos dias de 2024 com qualidade do ar Fraca ou Má em Portugal", "of days in 2024 with Poor or Bad air quality in Portugal"),
        titulo: tr("O ar em Portugal melhorou, mas não é igual em todo o lado", "Air in Portugal has improved, but it is not the same everywhere"),
        fig: [{
          t: tr("Dias com qualidade do ar Fraca ou Má", "Days with Poor or Bad air quality"),
          d: tr("Percentagem dos dias do ano, índice QualAr.", "Share of days in the year, QualAr index."),
          src: QN.fonte.nome,
          html: miniBars([{ l: qMax[2], v: qnum([0, qMax[1]]), t: fmt(qnum([0, qMax[1]]), 1) + "%", c: css("--s8") }, { l: "2024", v: QN.dias_fraco_ou_mau_percent, t: fmt(QN.dias_fraco_ou_mau_percent, 1) + "%", c: css("--s3"), hl: true }], { max: 20 })
        }, {
          t: tr("Dióxido de azoto (NO₂) nas aglomerações", "Nitrogen dioxide (NO₂) in urban areas"),
          d: tr("Média anual 2024 (µg/m³) face ao limite de referência e ao guia da OMS.", "2024 annual mean (µg/m³) against the reference limit and the WHO guideline."),
          src: QN.fonte.nome + "; " + QA.referencias_oms_2021.fonte.nome,
          html: miniBars(QN.no2.excedencias_anuais.map((e) => ({ l: e.aglomeracao, v: e.valor, t: String(e.valor), c: css("--s8") })).concat([{ l: tr("Limite anual", "Annual limit"), v: QN.no2.limite_anual_referencia_2024, t: String(QN.no2.limite_anual_referencia_2024), c: css("--s4") }, { l: tr("Guia OMS", "WHO guideline"), v: qGuiaNo2, t: String(qGuiaNo2), c: css("--s3") }]), { max: 50 })
        }],
        factos: [
          tr(`<b>Em 2024 a classe dominante foi «${QN.classe_dominante_iqar}»</b> e só ${fmt(QN.dias_fraco_ou_mau_percent, 1)}% dos dias foram Fracos ou Maus, contra o máximo de ${qMax[1]}% em ${qMax[2]} (APA).`, `<b>In 2024 the dominant class was “Good”</b> and only ${fmt(QN.dias_fraco_ou_mau_percent, 1)}% of days were Poor or Bad, against the peak of ${qMax[1].replace(",", ".")}% in ${qMax[2]} (APA).`),
          tr(`<b>O NO₂ continuou acima do limite anual de ${QN.no2.limite_anual_referencia_2024} µg/m³</b> em ${QN.no2.excedencias_anuais.map((e) => `${e.aglomeracao} (${e.valor})`).join(" e ")}; o guia da OMS é ${qGuiaNo2}.`, `<b>NO₂ stayed above the annual limit of ${QN.no2.limite_anual_referencia_2024} µg/m³</b> in ${QN.no2.excedencias_anuais.map((e) => `${e.aglomeracao} (${e.valor})`).join(" and ")}; the WHO guideline is ${qGuiaNo2}.`),
          tr(`<b>Uma melhoria anual não elimina o risco crónico:</b> a média nacional não representa a exposição junto a vias de tráfego, áreas industriais ou episódios regionais.`, `<b>One year’s improvement does not remove chronic risk:</b> the national average does not represent exposure near traffic routes, industrial areas or regional episodes.`)
        ],
        praticas: [
          [tr("Consultar o QualAr", "Check QualAr"), tr("Antes de esforço intenso ao ar livre, ver a qualidade do ar da tua zona.", "Before intense outdoor effort, check the air quality in your area.")],
          [tr("Afastar-te do tráfego", "Move away from traffic"), tr("Percursos a pé e de bicicleta longe das vias mais carregadas reduzem a exposição.", "Walking and cycling routes away from the busiest roads reduce exposure.")],
          [tr("Ventilar na hora certa", "Ventilate at the right time"), tr("Abrir janelas quando o exterior está melhor e fechar em picos de tráfego ou fumo.", "Open windows when outdoor air is better and close them at traffic or smoke peaks.")]
        ],
        links: [[tr("Ar no Observatório da Terra", "Air in the Earth Observatory"), "/observatorio/observatorio-terra.html#ar"], [tr("Aplicação prática", "Practical use"), "#aplicacao-pratica"]]
      },
      ozono: {
        id: "ozono", c: "#4f7f9e", nome: tr("Ozono e culturas", "Ozone and crops"),
        v: String(QN.ozono.ocorrencias_limiar_informacao), k: tr("ocorrências do limiar de informação do ozono em 2024 (" + fmt(QN.ozono.variacao_ocorrencias_face_2023_percent, 1).replace("-", "−") + "% face a 2023)", "occurrences of the ozone information threshold in 2024 (" + fmt(QN.ozono.variacao_ocorrencias_face_2023_percent, 1).replace("-", "−") + "% vs 2023)"),
        titulo: tr("O ozono não fica na cidade: chega ao campo", "Ozone does not stay in the city: it reaches the countryside"),
        fig: [],
        factos: [
          tr(`<b>Houve ${QN.ozono.ocorrencias_limiar_informacao} ocorrências do limiar de informação e ${QN.ozono.ocorrencias_limiar_alerta} do limiar de alerta</b> em ${QN.ozono.estacoes_monitorizacao} estações (2024, APA).`, `<b>There were ${QN.ozono.ocorrencias_limiar_informacao} occurrences of the information threshold and ${QN.ozono.ocorrencias_limiar_alerta} of the alert threshold</b> at ${QN.ozono.estacoes_monitorizacao} stations (2024, APA).`),
          tr(`<b>Persistiram níveis acima do objetivo de longo prazo</b> (${QN.ozono.objetivo_longo_prazo} µg/m³, máximo diário da média de 8 horas); o ozono varia muito com a meteorologia e a região.`, `<b>Levels above the long-term objective persisted</b> (${QN.ozono.objetivo_longo_prazo} µg/m³, daily maximum 8-hour mean); ozone varies strongly with weather and region.`),
          tr(`<b>O ozono forma-se na atmosfera e pode atingir zonas rurais.</b> Além da saúde, reduz a fotossíntese, a produtividade agrícola e o crescimento florestal (APA).`, `<b>Ozone forms in the atmosphere and can reach rural areas.</b> Besides health, it reduces photosynthesis, farm productivity and forest growth (APA).`)
        ],
        praticas: [
          [tr("Cuidado nos dias de calor", "Care on hot days"), tr("Reduzir esforço intenso ao ar livre nas horas de pico, normalmente à tarde.", "Reduce intense outdoor effort in peak hours, usually in the afternoon.")],
          [tr("Menos precursores", "Fewer precursors"), tr("Tráfego, combustão e solventes alimentam a formação de ozono: menos de cada um ajuda.", "Traffic, combustion and solvents feed ozone formation: less of each helps.")],
          [tr("Observar as culturas", "Observe the crops"), tr("Manchas nas folhas em dias de calor podem ter várias causas, uma delas o ozono; regista e confirma antes de tratar.", "Leaf spots on hot days can have several causes, one of them ozone; record and confirm before treating.")]
        ],
        links: [[tr("Ar no Observatório da Terra", "Air in the Earth Observatory"), "/observatorio/observatorio-terra.html#ar"]]
      },
      fogo: {
        id: "fogo-ar", c: COR.clima, nome: tr("Fumo e poeira", "Smoke and dust"),
        v: fmt(fire[fireYears.at(-1)] / 1000, 0) + tr(" mil ha", "k ha"), k: tr("ardidos em Portugal continental em " + fireYears.at(-1) + " (provisório)", "burned in mainland Portugal in " + fireYears.at(-1) + " (provisional)"),
        titulo: tr("Quando o ar vem do fogo ou do deserto", "When the air comes from fire or desert"),
        fig: [F.find((f) => f.id === "floresta").fig[0]],
        factos: [
          tr(`<b>O fumo de incêndios rurais traz ${qEp("incendios").poluentes.join(", ")}.</b> Sinais: ${qEp("incendios").sinais.join(", ")}.`, `<b>Rural-fire smoke carries PM2.5, PM10, CO, NO₂ and volatile organic compounds.</b> Signs: smell of smoke, reduced visibility, rapid rise in particles.`),
          tr(`<b>A distância ao incêndio não determina sozinha a exposição:</b> vento, estabilidade atmosférica e topografia controlam a pluma.`, `<b>Distance from the fire alone does not determine exposure:</b> wind, atmospheric stability and topography control the plume.`),
          tr(`<b>A poeira do Norte de África</b> faz subir sobretudo o PM10, e o PM2,5 em fração variável; também deve ser assinalada como episódio.`, `<b>North African dust</b> raises mainly PM10, and PM2.5 in a variable fraction; it should also be flagged as an episode.`),
          tr(`<b>A área ardida varia muito:</b> ${fmt(fire[2017], 0)} ha em 2017 e ${fmt(fire[fireYears.at(-1)], 0)} ha em ${fireYears.at(-1)} (provisório, ICNF).`, `<b>Burned area varies a lot:</b> ${fmt(fire[2017], 0)} ha in 2017 and ${fmt(fire[fireYears.at(-1)], 0)} ha in ${fireYears.at(-1)} (provisional, ICNF).`)
        ],
        praticas: [
          [tr("Seguir os avisos", "Follow the warnings"), tr("Proteção Civil, QualAr e direção do vento dizem se a pluma chega onde estás.", "Civil Protection, QualAr and wind direction tell whether the plume reaches you.")],
          [tr("Reduzir esforço", "Reduce effort"), tr("Evitar esforço intenso ao ar livre durante a passagem do fumo.", "Avoid intense outdoor effort while the smoke passes.")],
          [tr("Fechar e voltar a ventilar", "Close, then ventilate again"), tr("Fechar entradas durante a pluma quando o exterior está pior e ventilar quando melhorar.", "Close openings during the plume when outdoor air is worse and ventilate when it improves.")],
          [tr("Prevenir à origem", "Prevent at source"), tr("Gestão de combustível e mosaicos agrícolas reduzem o fogo e, com ele, o fumo.", "Fuel management and farm mosaics reduce fire and with it the smoke.")]
        ],
        links: [[tr("Qualidade do ar", "Air quality"), "#aplicacao-pratica"], [tr("Solo e vida no Observatório da Terra", "Land and life in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"]]
      }
    } : {};

    /* ---------- solo (só em Solo) ---------- */
    const SS = X.solo_stats;
    const sDest = (id) => (SS ? SS.destaques.find((d) => d.id === id) : null);
    const sArt = sDest("artificializacao"), sMud = sDest("mudanca_ocupacao"), sOcu = SS ? SS.ocupacao_solo_continente_2018 : null;
    const CLS_EN = { Florestas: "Forests", Agricultura: "Agriculture", Matos: "Scrub", Pastagens: "Pastures", "Sistemas agroflorestais": "Agroforestry systems", "Territórios artificializados": "Artificial land", "Outras classes": "Other classes" };
    const AM_EN = {
      erosao_hidrica: ["gullies, rills, exposed roots, cloudy water downstream", "permanent cover, contour sowing, vegetated strips, riparian restoration, reduced tillage"],
      perda_carbono: ["fragile aggregates, surface crust, low infiltration", "rotations, cover crops, mature compost, agroforestry, less disturbance"],
      compactacao: ["ponding, deformed roots, hardened layer, low infiltration", "controlled traffic, avoiding operations on saturated soil, decompacting roots, adaptive grazing"],
      incendio: ["water repellency, mobilised ash, accelerated erosion", "protect the soil without turning it, retain sediment, restore native vegetation, monitor watercourses"]
    };
    const amOf = (id) => SS.ameacas.find((a) => a.id === id);
    const amFact = (id) => { const a = amOf(id); return tr(`<b>${a.nome}:</b> sinais — ${a.sinais.join(", ")}. Respostas — ${a.respostas.join(", ")}.`, `<b>${{ erosao_hidrica: "Water erosion", perda_carbono: "Loss of organic carbon", compactacao: "Compaction", incendio: "Post-fire degradation" }[id]}:</b> signs — ${AM_EN[id][0]}. Responses — ${AM_EN[id][1]}.`); };
    const SOL = SS && sArt && sOcu ? {
      artificializacao: {
        id: "artificializacao", c: COR.solo, nome: tr("Solo selado", "Sealed soil"),
        v: "+" + fmt(sArt.variacao_percentual, 0) + "%", k: tr("de território artificializado em Portugal continental, " + sArt.ano_inicial + "–" + sArt.ano_final, "of artificial land in mainland Portugal, " + sArt.ano_inicial + "–" + sArt.ano_final),
        titulo: tr("Cada hectare selado deixa de ser solo", "Every sealed hectare stops being soil"),
        fig: [{
          t: tr("Território artificializado", "Artificial land"),
          d: tr("Hectares em Portugal continental.", "Hectares in mainland Portugal."),
          src: "DGT, COS e COSc",
          html: miniBars([{ l: String(sArt.ano_inicial), v: sArt.valor_inicial, t: fmt(sArt.valor_inicial, 0) + " ha", c: css("--bar-dim") }, { l: String(sArt.ano_final), v: sArt.valor_final, t: fmt(sArt.valor_final, 0) + " ha", c: COR.solo, hl: true }])
        }, {
          t: tr("Ocupação do solo em Portugal continental", "Land cover in mainland Portugal"),
          d: tr("Percentagem do território, 2018 (valores cartográficos arredondados).", "Share of the territory, 2018 (rounded map values)."),
          src: "DGT, COS 2018",
          draw: (el) => hbars(el, sOcu.classes.map((c, i) => ({ l: EN ? CLS_EN[c.classe] || c.classe : c.classe, v: c.valor, t: c.valor + "%", c: css(SER[i % SER.length]) })), { unit: "%", table: [tr("Classe", "Class"), "%"] })
        }],
        factos: [
          tr(`<b>O território artificializado cresceu ${fmt(sArt.variacao_absoluta_ha, 0)} ha</b> (${fmt(sArt.variacao_percentual, 1)}%) entre ${sArt.ano_inicial} e ${sArt.ano_final} (DGT).`, `<b>Artificial land grew by ${fmt(sArt.variacao_absoluta_ha, 0)} ha</b> (${fmt(sArt.variacao_percentual, 1)}%) between ${sArt.ano_inicial} and ${sArt.ano_final} (DGT).`),
          tr(`<b>${fmt(sMud.valor, 0)}% do território continental mudou de classe de ocupação</b> entre 1995 e 2018, cerca de 1 milhão de hectares (DGT).`, `<b>${fmt(sMud.valor, 0)}% of mainland territory changed land-cover class</b> between 1995 and 2018, about 1 million hectares (DGT).`),
          tr(`<b>A impermeabilização reduz infiltração, armazenamento de carbono, produção biológica e regulação térmica.</b> O indicador mede ocupação artificial, não apenas edifícios.`, `<b>Sealing reduces infiltration, carbon storage, biological production and thermal regulation.</b> The indicator measures artificial land cover, not only buildings.`)
        ],
        praticas: [
          [tr("Reabilitar antes de construir", "Rehabilitate before building"), tr("Reutilizar edifícios e terrenos já artificializados poupa solo vivo.", "Reusing buildings and already-sealed land saves living soil.")],
          [tr("Manter o solo permeável", "Keep soil permeable"), tr("Jardins, canteiros e pavimentos drenantes deixam a água infiltrar.", "Gardens, beds and drainage paving let water soak in.")],
          [tr("Proteger o solo agrícola bom", "Protect good farmland"), tr("Respeitar a Reserva Agrícola Nacional e os solos de melhor aptidão.", "Respect the National Agricultural Reserve and the best-suited soils.")]
        ],
        links: [[tr("Solo no Observatório da Terra", "Soil in the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"]]
      },
      ameacas: {
        id: "ameacas", c: COR.solo, nome: tr("Ameaças", "Threats"),
        v: String(SS.ameacas.length), k: tr("ameaças ao solo acompanhadas, da erosão à contaminação", "soil threats followed, from erosion to contamination"),
        titulo: tr("Sinais no terreno e respostas que funcionam", "Signs in the field and responses that work"),
        fig: [],
        factos: ["erosao_hidrica", "perda_carbono", "compactacao", "incendio"].map(amFact),
        praticas: [
          [tr("Controlar tráfego e pisoteio", "Control traffic and trampling"), tr("Concentrar passagens, reduzir cargas e não entrar em solo encharcado.", "Concentrate passes, reduce loads and do not enter saturated soil.")],
          [tr("Árvores, sebes e faixas ripícolas", "Trees, hedges and riparian strips"), tr("Protegem do vento, criam habitat e interceptam a escorrência.", "They protect from wind, create habitat and intercept runoff.")],
          [tr("Irrigar segundo solo e cultura", "Irrigate according to soil and crop"), tr("Sensores ou balanço hídrico reduzem o desperdício e limitam a salinização.", "Sensors or a water balance reduce waste and limit salinisation.")],
          [tr("Analisar antes de corrigir", "Test before correcting"), tr("Carbono orgânico, pH e textura dizem o que o solo precisa de facto.", "Organic carbon, pH and texture say what the soil actually needs.")]
        ],
        links: [[tr("Teste caseiro do solo", "Home soil test"), "#teste-caseiro"], [tr("Problemas na horta", "Garden problems"), "/calendario/conhecimento-cuidar.html#problemas"]]
      }
    } : {};

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
      pecuaria: {
        ids: ["metano", "pasto", "agua", "solo", "floresta", "escala"], extra: Object.values(PEC), rotulo: tr("Na exploração", "On the farm"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html"],
        eyebrow: tr("Dos dados à pecuária", "From data to livestock"),
        h2: tr("Seis frentes onde a escala pecuária se mede", "Six fronts where livestock scale is measured"),
        intro: tr("Os números vêm do Observatório da Terra, da FAO e dos casos documentados no bioCulture. Escolhe uma frente para ver o que os dados mostram e o que sistemas menos concentrados fazem de diferente.", "The numbers come from the Earth Observatory, FAO and the cases documented by bioCulture. Pick a front to see what the data show and what less concentrated systems do differently."),
        over: {
          agua: { nome: tr("Água e efluentes", "Water and effluents"), titulo: tr("Água e efluentes: o que se mede à saída", "Water and effluents: what is measured at the outlet"), fig: "stress", factos: "pec-agua", praticas: [
            [tr("Efluentes na dose certa", "Effluents in the right dose"), tr("Chorume e estrume aplicados segundo as necessidades do solo, não em excesso, evitam nitratos nas águas.", "Slurry and manure applied according to the soil’s needs, not in excess, avoid nitrates in water.")],
            [tr("Separar a água limpa da suja", "Keep clean water apart from dirty water"), tr("Desviar a água da chuva dos currais e das nitreiras reduz o volume de efluente a tratar.", "Diverting rainwater away from pens and manure pits reduces the volume of effluent to treat.")],
            [tr("Animais longe das linhas de água", "Animals away from watercourses"), tr("Vedar ribeiras e manter galerias ripícolas protege a água e a margem.", "Fencing streams and keeping riparian strips protects water and banks.")],
            [tr("Bebedouros sem perdas", "Drinkers without losses"), tr("Reparar fugas e usar bebedouros bem regulados poupa água todos os dias.", "Fixing leaks and using well-set drinkers saves water every day.")]
          ] },
          solo: { titulo: tr("Solo: o gado pode degradá-lo ou regenerá-lo", "Soil: livestock can degrade it or regenerate it"), praticas: [
            [tr("Descanso do pasto", "Rest for the pasture"), tr("Dar tempo à erva para recuperar mantém o solo coberto e a raiz viva.", "Giving the grass time to recover keeps the soil covered and the roots alive.")],
            [tr("Estrume compostado", "Composted manure"), tr("Devolve matéria orgânica e nutrientes ao solo de forma mais estável.", "It returns organic matter and nutrients to the soil in a more stable form.")],
            [tr("Evitar compactação", "Avoid compaction"), tr("Menos pisoteio em solo encharcado e zonas de passagem protege a infiltração.", "Less trampling on waterlogged soil and in gateways protects infiltration.")],
            [tr("Cobertura permanente", "Permanent cover"), tr("Pasto vivo todo o ano segura o solo contra a chuva forte e o vento.", "Living pasture all year holds the soil against heavy rain and wind.")]
          ] },
          floresta: { titulo: tr("Floresta, pasto e fogo", "Forest, pasture and fire"), praticas: [
            [tr("Árvores e sombra", "Trees and shade"), tr("Sistemas silvopastoris protegem animais e solo do calor.", "Silvopastoral systems protect animals and soil from heat.")],
            [tr("Pastoreio como gestão do mato", "Grazing as scrub management"), tr("Gado bem conduzido pode reduzir o combustível em faixas e zonas críticas.", "Well-managed livestock can reduce fuel in strips and critical zones.")],
            [tr("Mosaicos com pasto verde", "Mosaics with green pasture"), tr("Pastagens entre manchas de mato e floresta quebram a continuidade do fogo.", "Pastures between patches of scrub and forest break the continuity of fire.")],
            [tr("Proteger as linhas de água", "Protect watercourses"), tr("Galerias ripícolas mantêm humidade e vida junto às ribeiras.", "Riparian strips keep moisture and life along streams.")]
          ] }
        }
      },
      mineracao: {
        ids: ["materiais", "transicao", "agua", "solo", "floresta", "vida"], extra: Object.values(MIN), rotulo: tr("O que fazer", "What to do"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html"],
        eyebrow: tr("Dos dados à mineração", "From data to mining"),
        h2: tr("Seis frentes onde a mineração se mede", "Six fronts where mining is measured"),
        intro: tr("Os números vêm do Observatório da Terra, da USGS, da UNEP e dos casos documentados no bioCulture. Produção anual dá escala, não impacto: escolhe uma frente para ver o que se deve medir e o que cada pessoa pode fazer.", "The numbers come from the Earth Observatory, USGS, UNEP and the cases documented by bioCulture. Annual output gives scale, not impact: pick a front to see what should be measured and what each person can do."),
        over: {
          agua: { nome: tr("Água", "Water"), titulo: tr("Água: o primeiro ponto a medir", "Water: the first thing to measure"), fig: "stress", factos: "mining-agua", praticas: [
            [tr("Pedir o balanço hídrico", "Ask for the water balance"), tr("Captação, armazenamento, recirculação e descarga devem estar escritas no estudo e na licença.", "Abstraction, storage, recirculation and discharge should be written in the study and the licence.")],
            [tr("Medir antes, durante e depois", "Measure before, during and after"), tr("Nascentes, furos e ribeiras monitorizados desde antes da obra permitem provar o que mudou.", "Springs, boreholes and streams monitored from before the works make it possible to prove what changed.")],
            [tr("Proteger nascentes e linhas de água", "Protect springs and watercourses"), tr("Zonas de recarga e cabeceiras de ribeiras são difíceis de repor depois de alteradas.", "Recharge zones and stream headwaters are hard to restore once altered.")],
            [tr("Perguntar pelos rejeitados", "Ask about tailings"), tr("O local, a impermeabilização e a vigilância da escombreira ou da barragem de rejeitados contam tanto como a cava.", "The location, lining and monitoring of the waste dump or tailings dam count as much as the pit.")]
          ] },
          solo: { nome: tr("Solo e rejeitados", "Soil and tailings"), titulo: tr("Solo: rejeitados, cavas e o que se repõe", "Soil: tailings, pits and what is restored"), factos: "mining-solo", praticas: [
            [tr("Guardar e repor o solo vivo", "Keep and restore living soil"), tr("A camada superficial separada e conservada durante a obra volta a ser a base da recuperação.", "The topsoil set aside and kept during works becomes the base of restoration again.")],
            [tr("Plano de recuperação com garantia", "Restoration plan with a guarantee"), tr("Recuperação paisagística e caução financeira definidas à partida evitam passivos para as gerações seguintes.", "Landscape restoration and a financial bond defined up front avoid liabilities for later generations.")],
            [tr("Medir a drenagem ácida", "Measure acid drainage"), tr("Rochas com sulfuretos podem acidificar as águas: convém monitorizar pH e metais.", "Rocks with sulphides can acidify water: pH and metals should be monitored.")],
            [tr("Ver os passivos históricos", "Look at historical liabilities"), tr("Os casos encerrados mostram quanto tempo dura a remediação.", "Closed cases show how long remediation lasts.")]
          ] },
          floresta: { nome: tr("Floresta e acessos", "Forest and access"), titulo: tr("Floresta: cavas, acessos e fogo", "Forest: pits, access roads and fire"), factos: "mining-floresta", praticas: [
            [tr("Evitar primeiro", "Avoid first"), tr("Antes de compensar, perguntar se o projeto pode evitar floresta, montado e áreas protegidas.", "Before compensating, ask whether the project can avoid forest, oak woodland and protected areas.")],
            [tr("Contar acessos e infraestruturas", "Count access roads and infrastructure"), tr("Estradas, linhas, poeiras e escombreiras alteram mais paisagem do que a cava.", "Roads, power lines, dust and waste dumps alter more landscape than the pit.")],
            [tr("Prevenir o fogo", "Prevent fire"), tr("Faixas de gestão de combustível e meios de combate previstos desde o início.", "Fuel-management strips and firefighting means planned from the start.")],
            [tr("Compensar com medição", "Offset with measurement"), tr("A compensação só vale se for medida e verificada durante décadas.", "Compensation is only worth something if it is measured and verified for decades.")]
          ] },
          vida: { nome: tr("Vida e áreas sensíveis", "Life and sensitive areas"), titulo: tr("Vida: evitar primeiro, compensar depois", "Life: avoid first, offset later"), factos: "mining-vida", fig: "primeira", praticas: [
            [tr("Ver a sobreposição", "Check the overlap"), tr("Confirmar se a área do projeto toca em áreas protegidas, Rede Natura ou habitats sensíveis.", "Check whether the project area touches protected areas, Natura 2000 or sensitive habitats.")],
            [tr("Estado de referência", "Baseline"), tr("Inventários de espécies e habitats antes da obra, por pessoas independentes quando possível.", "Inventories of species and habitats before works, by independent people when possible.")],
            [tr("Monitorizar e publicar", "Monitor and publish"), tr("Resultados públicos permitem a quem vive no território acompanhar o que acontece.", "Public results let people who live in the territory follow what happens.")],
            [tr("Dar voz a quem vive lá", "Give a voice to those who live there"), tr("Comunidades e agricultores locais conhecem o que a carta e o estudo não mostram.", "Local communities and farmers know what the map and the study do not show.")]
          ] }
        }
      },
      digital: {
        ids: ["consumo", "rede", "dig-agua", "territorio", "equipamento"], extra: [DIGI.consumo, REDE, DIGI.agua, DIGI.territorio, DIGI.equipamento].filter(Boolean), rotulo: tr("O que fazer", "What to do"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html"],
        eyebrow: tr("Dos dados ao digital", "From data to digital"),
        h2: tr("Cinco frentes onde a infraestrutura digital se mede", "Five fronts where digital infrastructure is measured"),
        intro: tr("Os números vêm da IEA, do Observatório da Terra e dos casos documentados no bioCulture. Projeção não é consumo observado: escolhe uma frente para ver o que se mede, o que falta medir e o que cada pessoa pode fazer.", "The numbers come from the IEA, the Earth Observatory and the cases documented by bioCulture. A projection is not observed consumption: pick a front to see what is measured, what is missing and what each person can do."),
        over: {
          rede: { titulo: tr("Que eletricidade alimenta a nuvem", "What electricity powers the cloud"), praticas: [
            [tr("Renovável adicional", "Additional renewables"), tr("Contratos que financiam nova produção renovável contam mais do que certificados que só redistribuem a que já existe.", "Contracts that fund new renewable output count more than certificates that only reshuffle what already exists.")],
            [tr("Perfil horário", "Hourly profile"), tr("Saber quando o campus consome mostra se a energia renovável coincide com a hora de uso.", "Knowing when the campus consumes shows whether renewable energy matches the hour of use.")],
            [tr("Eficiência primeiro", "Efficiency first"), tr("Menos energia por tarefa (melhor PUE, equipamento e software) é o que menos pesa na rede.", "Less energy per task (better PUE, equipment and software) is what weighs least on the grid.")]
          ] }
        }
      },
      energia: {
        ids: ["acesso", "rede", "clima", "ar", "projetos"], extra: [ENER.acesso, REDE, ENER.ar, ENER.projetos].filter(Boolean), rotulo: tr("O que fazer", "What to do"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html"],
        eyebrow: tr("Dos dados à energia", "From data to energy"),
        h2: tr("Cinco frentes onde a energia se mede", "Five fronts where energy is measured"),
        intro: tr("Os números vêm do Observatório da Terra, dos indicadores do ODS 7 e dos projetos analisados no bioCulture. Escolhe uma frente para ver o que os dados mostram e o que pode fazer-se em casa, na exploração e no território.", "The numbers come from the Earth Observatory, the SDG 7 indicators and the projects analysed by bioCulture. Pick a front to see what the data show and what can be done at home, on the farm and in the territory."),
        over: {
          rede: { praticas: [
            [tr("Poupar primeiro", "Save first"), tr("Isolamento, equipamentos eficientes e hábitos simples são a energia mais barata e mais limpa.", "Insulation, efficient equipment and simple habits are the cheapest and cleanest energy.")],
            [tr("Eletrificar com renovável", "Electrify with renewables"), tr("Bombas de calor, mobilidade elétrica e indução fazem sentido quando a eletricidade é cada vez mais renovável.", "Heat pumps, electric mobility and induction make sense when electricity is increasingly renewable.")],
            [tr("Autoconsumo e armazenamento", "Self-consumption and storage"), tr("Produzir e guardar perto de onde se usa alivia a rede e dá resiliência.", "Producing and storing close to where it is used eases the grid and gives resilience.")],
            [tr("Calor e transportes", "Heat and transport"), tr("São onde a quota renovável ainda é menor; também aí há trabalho a fazer.", "That is where the renewable share is still lowest; there is work to do there too.")]
          ] },
          clima: { nome: tr("Clima", "Climate"), titulo: tr("A energia que usamos e o clima que medimos", "The energy we use and the climate we measure"), factos: "energia-clima", praticas: [
            [tr("Medir a fatura", "Measure the bill"), tr("Saber quanto se gasta, e em quê, é o primeiro passo para reduzir.", "Knowing how much is spent, and on what, is the first step to reduce it.")],
            [tr("Casa e exploração eficientes", "Efficient home and farm"), tr("Isolar, sombrear e escolher equipamentos eficientes reduz o consumo sem perder conforto.", "Insulating, shading and choosing efficient equipment cut consumption without losing comfort.")],
            [tr("Sombra e abrigo", "Shade and shelter"), tr("Árvores, sebes e coberto vegetal arrefecem edifícios e terrenos.", "Trees, hedges and plant cover cool buildings and land.")],
            [tr("Ler o inventário", "Read the inventory"), tr("Os valores nacionais de emissões são revistos todos os anos: compara sempre a mesma edição.", "National emission figures are revised every year: always compare the same edition.")]
          ] }
        }
      },
      agua: {
        ids: ["escassez", "potavel", "ciclo", { id: "rega", from: "agua" }, { id: "solo-agua", from: "solo" }], extra: [WAT.escassez, WAT.potavel, WAT.ciclo].filter(Boolean), rotulo: tr("Em casa e na parcela", "At home and on the plot"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html#agua"],
        eyebrow: tr("Dos dados à água", "From data to water"),
        h2: tr("Cinco frentes onde a água se mede", "Five fronts where water is measured"),
        intro: tr("Os números vêm do Observatório da Terra, da FAO, da OMS e UNICEF, da OMM e do IPMA. Escolhe uma frente para ver o que os dados mostram e o que se pode fazer em casa e na parcela.", "The numbers come from the Earth Observatory, FAO, WHO and UNICEF, WMO and IPMA. Pick a front to see what the data show and what can be done at home and on the plot."),
        over: {
          rega: { nome: tr("Rega", "Irrigation"), titulo: tr("A terra regada mais do que duplicou", "Irrigated land has more than doubled"), fig: "primeira", factos: "rega", praticas: [
            [tr("Regar segundo o solo e a cultura", "Irrigate by soil and crop"), tr("Sensores ou balanço hídrico mostram quando e quanto regar, em vez de regar por hábito.", "Sensors or a water balance show when and how much to irrigate, instead of watering by habit.")],
            [tr("Gota a gota", "Drip"), tr("Leva a água à raiz e perde menos por evaporação e deriva.", "Takes water to the root and loses less to evaporation and drift.")],
            [tr("Verificar a qualidade da água", "Check water quality"), tr("Água salobra ou contaminada degrada o solo e a cultura; convém analisá-la.", "Brackish or contaminated water degrades soil and crop; it should be tested.")],
            [tr("Cobrir o solo", "Cover the soil"), tr("Cobertura morta e matéria orgânica retêm a água entre regas.", "Mulch and organic matter hold water between waterings.")]
          ] },
          "solo-agua": { nome: tr("Solo", "Soil"), titulo: tr("O solo é a primeira esponja", "Soil is the first sponge"), fig: "primeira", praticas: [
            [tr("Manter o solo coberto", "Keep the soil covered"), tr("Reduz o impacto da chuva, limita a evaporação e alimenta a vida do solo.", "Reduces rain impact, limits evaporation and feeds soil life.")],
            [tr("Reduzir a perturbação", "Reduce disturbance"), tr("Protege os agregados e os fungos que deixam a água infiltrar.", "Protects the aggregates and fungi that let water soak in.")],
            [tr("Composto maduro", "Mature compost"), tr("Devolve matéria orgânica, que ajuda a guardar água.", "Returns organic matter, which helps store water.")],
            [tr("Árvores e sebes", "Trees and hedges"), tr("Interceptam a escorrência e aumentam a diversidade de raízes.", "Intercept runoff and increase root diversity.")]
          ] }
        }
      },
      ar: {
        ids: ["ar", "qualar", "ozono", "fogo-ar", { id: "rede-ar", from: "rede" }], extra: [AR_SHARED, AIR.qualar, AIR.ozono, AIR.fogo, REDE].filter(Boolean), rotulo: tr("O que fazer", "What to do"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html#ar"],
        eyebrow: tr("Dos dados ao ar", "From data to air"),
        h2: tr("Cinco frentes onde o ar se mede", "Five fronts where air is measured"),
        intro: tr("Os números vêm do Observatório da Terra, da OMS e da APA. Uma média anual não elimina o risco crónico nem os episódios locais: escolhe uma frente para ver o que os dados mostram e o que fazer.", "The numbers come from the Earth Observatory, WHO and APA. An annual average does not remove chronic risk or local episodes: pick a front to see what the data show and what to do."),
        over: {
          ar: { nome: tr("Exposição mundial", "World exposure"), titulo: tr("O ar que o mundo respira e o preço da combustão", "The air the world breathes and the price of combustion") },
          "rede-ar": { nome: tr("Combustão e energia", "Combustion and energy"), titulo: tr("Menos combustão, ar mais limpo", "Less combustion, cleaner air"), praticas: [
            [tr("Poupar energia", "Save energy"), tr("Cada quilowatt-hora que não se gasta evita emissões, onde quer que seja produzido.", "Every kilowatt-hour not used avoids emissions, wherever it is produced.")],
            [tr("Aquecer sem fumo", "Heat without smoke"), tr("Isolar a casa e usar bombas de calor ou equipamento eficiente reduz partículas.", "Insulating the home and using heat pumps or efficient equipment reduces particles.")],
            [tr("Mover-se de outra forma", "Move differently"), tr("Andar a pé, de bicicleta ou em transporte público tira carros das ruas.", "Walking, cycling or taking public transport takes cars off the streets.")]
          ] }
        }
      },
      solo: {
        ids: ["solo", "artificializacao", "ameacas", "floresta", "vida"], extra: [SOL.artificializacao, SOL.ameacas].filter(Boolean), rotulo: tr("Na parcela", "On the plot"),
        hub: [tr("Ver o Observatório da Terra", "See the Earth Observatory"), "/observatorio/observatorio-terra.html#terra-vida"],
        eyebrow: tr("Dos dados ao solo", "From data to soil"),
        h2: tr("Cinco frentes onde o solo se mede", "Five fronts where soil is measured"),
        intro: tr("Os números vêm do Observatório da Terra, da APA, da DGT e do INFOSOLO. Suscetibilidade não é desertificação já ocorrida: escolhe uma frente para ver o que os dados mostram e que práticas regeneram o solo.", "The numbers come from the Earth Observatory, APA, DGT and INFOSOLO. Susceptibility is not desertification that has already happened: pick a front to see what the data show and which practices regenerate soil."),
        over: {
          solo: { titulo: tr("Suscetibilidade, degradação e o que se pode fazer", "Susceptibility, degradation and what can be done"), praticas: [
            [tr("Manter o solo coberto", "Keep the soil covered"), tr("Cobertura viva, restolho ou mulch reduzem o impacto da chuva, limitam a evaporação e alimentam a biologia.", "Living cover, stubble or mulch reduce rain impact, limit evaporation and feed biology.")],
            [tr("Rotações e diversidade", "Rotations and diversity"), tr("Alternar famílias e incluir leguminosas quebra ciclos de pragas e diversifica raízes.", "Alternating families and including legumes breaks pest cycles and diversifies roots.")],
            [tr("Reduzir a perturbação", "Reduce disturbance"), tr("Mínima mobilização compatível com o solo e a cultura protege agregados e fungos.", "Minimum tillage compatible with soil and crop protects aggregates and fungi.")],
            [tr("Composto maduro quando necessário", "Mature compost when needed"), tr("Dose baseada em análise do solo e do composto; devolve matéria orgânica.", "Dose based on soil and compost analysis; returns organic matter.")]
          ] },
          floresta: { nome: tr("Fogo e erosão", "Fire and erosion"), v: fmt(fire[fireYears.at(-1)] / 1000, 0) + tr(" mil ha", "k ha"), k: tr("ardidos em Portugal continental em " + fireYears.at(-1) + " (provisório)", "burned in mainland Portugal in " + fireYears.at(-1) + " (provisional)"), titulo: tr("Depois do fogo, o solo fica à chuva", "After fire, the soil is left to the rain"), fig: "primeira", factos: "solo-fogo", praticas: [
            [tr("Proteger sem revolver", "Protect without turning"), tr("Cobrir o solo ardido e não o mobilizar reduz a erosão acelerada.", "Covering burned soil and not tilling it reduces accelerated erosion.")],
            [tr("Reter sedimentos", "Retain sediment"), tr("Barreiras de ramos e faixas vegetadas seguram a terra nas encostas.", "Brush barriers and vegetated strips hold soil on slopes.")],
            [tr("Recuperar com plantas locais", "Recover with native plants"), tr("A vegetação autóctone refaz a cobertura e a vida do solo.", "Native vegetation rebuilds cover and soil life.")],
            [tr("Vigiar as linhas de água", "Watch the watercourses"), tr("Cinzas e sedimentos mobilizados chegam às ribeiras com a primeira chuva forte.", "Mobilised ash and sediment reach streams with the first heavy rain.")]
          ] },
          vida: { nome: tr("Solo vivo", "Living soil"), v: fmt(org / agri * 100, 1) + "%", k: tr("da terra agrícola mundial em agricultura biológica (em Portugal, " + fmt(ptl["6671"] / ptl["6610"] * 100, 1) + "%)", "of the world’s agricultural land is organic (in Portugal, " + fmt(ptl["6671"] / ptl["6610"] * 100, 1) + "%)"), titulo: tr("Solo vivo, vida acima do chão", "Living soil, life above ground"), fig: "segunda", factos: "solo-vida", praticas: [
            [tr("Alimentar o solo", "Feed the soil"), tr("Restos vegetais, composto e raízes vivas dão alimento a quem faz o solo.", "Plant residues, compost and living roots feed those who build the soil.")],
            [tr("Cobrir e diversificar", "Cover and diversify"), tr("Várias espécies e raízes diferentes sustentam mais organismos.", "Several species and different roots sustain more organisms.")],
            [tr("Evitar mexer sem necessidade", "Avoid unnecessary disturbance"), tr("Cada mobilização expõe e consome matéria orgânica.", "Every tillage exposes and burns up organic matter.")],
            [tr("Sebes e bordaduras", "Hedges and edges"), tr("Abrigo e alimento para auxiliares que trabalham o solo e as culturas.", "Shelter and food for beneficial species that work soil and crops.")]
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
    const FS = cx.ids.map((e) => { const id = typeof e === "string" ? e : e.id, from = typeof e === "string" ? e : e.from, b = F.find((f) => f.id === from); return b ? Object.assign({}, b, { id }) : null; }).filter(Boolean).map((f) => {
      const ov = (cx.over || {})[f.id] || {}, base = f.factos;
      /* Textos de números que dependem dos factos já calculados do fator (indicados por chave nos contextos). */
      const FX = {
        "pec-agua": () => [base[0], base[1], tr(`<b>${ptEfl} das ${(PL || []).length} instalações documentadas têm efluentes, estrume ou nitratos entre as pressões potenciais a medir.</b> Pressão potencial não é dano comprovado.`, `<b>${ptEfl} of the ${(PL || []).length} documented facilities have effluents, manure or nitrates among the potential pressures to measure.</b> Potential pressure is not proven harm.`)],
        "mining-agua": () => [base[0], tr(`<b>${cn(comm("copper"))}:</b> ${cp(comm("copper"))}`, `<b>${cn(comm("copper"))}:</b> ${cp(comm("copper"))}`), tr(`<b>${cn(comm("lithium"))}:</b> ${cp(comm("lithium"))}`, `<b>${cn(comm("lithium"))}:</b> ${cp(comm("lithium"))}`)],
        "mining-solo": () => [tr(`<b>${cn(comm("gold"))}:</b> ${cp(comm("gold"))}`, `<b>${cn(comm("gold"))}:</b> ${cp(comm("gold"))}`), tr(`<b>${cn(comm("coal"))}:</b> ${cp(comm("coal"))}`, `<b>${cn(comm("coal"))}:</b> ${cp(comm("coal"))}`), base[0], base[2]],
        "mining-floresta": () => [tr(`<b>${cn(comm("nickel-cobalt"))}:</b> ${cp(comm("nickel-cobalt"))}`, `<b>${cn(comm("nickel-cobalt"))}:</b> ${cp(comm("nickel-cobalt"))}`), tr(`<b>${cn(comm("iron-bauxite"))}:</b> ${cp(comm("iron-bauxite"))}`, `<b>${cn(comm("iron-bauxite"))}:</b> ${cp(comm("iron-bauxite"))}`), base[0], base[3]],
        "mining-vida": () => [base[0], base[1], base[2]],
        "rega": () => [base[1], base[2]],
        "solo-fogo": () => [base[3], amFact("incendio"), tr(`<b>O incêndio é um dos fatores da erosão hídrica</b>, a par do solo descoberto, do declive, da chuva intensa e da mobilização no sentido do declive.`, `<b>Fire is one of the drivers of water erosion</b>, along with bare soil, slope, intense rain and tillage along the slope.`)],
        "solo-vida": () => [base[3], base[0], base[1]],
        "energia-clima": () => [base[0], base[1], tr(`<b>Portugal emitiu ${fmt(ghg[ghgY.at(-1)], 1)} Mt CO₂e em ${ghgY.at(-1)}</b> (${fmt(ghg[ghgY[0]], 1)} em ${ghgY[0]}), sem uso do solo e florestas (APA). O inventário é revisto todos os anos.`, `<b>Portugal emitted ${fmt(ghg[ghgY.at(-1)], 1)} Mt CO₂e in ${ghgY.at(-1)}</b> (${fmt(ghg[ghgY[0]], 1)} in ${ghgY[0]}), excluding land use and forests (APA). The inventory is revised every year.`), base[2]]
      };
      const o = Object.assign({}, f);
      Object.keys(ov).forEach((k) => {
        const v = ov[k];
        if (k === "factos") o.factos = FX[v] ? FX[v]() : v;
        else if (k === "fig") o.fig = v === "stress" ? [f.fig[1]] : v === "primeira" ? [f.fig[0]] : v === "segunda" ? [f.fig[1]] : v;
        else o[k] = v;
      });
      if (contexto !== "conhecimento") {
        /* Fora da página de conhecimento: só âncoras que existem nesta página e nenhuma ligação para ela própria; no fim, ligação ao conjunto. */
        o.links = o.links.filter(([, h]) => (h.startsWith("#") ? !!document.getElementById(h.slice(1)) : true) && h.split("#")[0].replace(/\.html$/, "") !== here).concat([cx.hub || HUB]).filter(([, h], i, arr) => arr.findIndex(([, x]) => x === h) === i);
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
    const EXTRA = { pecuaria: ["livestock-global", "pecuaria_industrial"], mineracao: ["mining-global", "mineracao"], digital: ["ai-data-centres-overview", "ai-data-centres-pressures", "impacto_digital"], energia: ["energy-overview", "renewable-projects"], agua: ["water-overview"], ar: ["qualidade_ar"], solo: ["solo_stats"] }[contexto] || [];
    Promise.all([T.load(), get("/data/agriculture-global.json"), Promise.all(EXTRA.map((n) => get("/data/" + n + ".json")))])
      .then(([{ R, CLIMA, VET, PT }, A, ex]) => {
        const X = {}; EXTRA.forEach((n, i) => { X[n] = ex[i]; });
        construir(R, CLIMA, VET, PT, A, X);
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
