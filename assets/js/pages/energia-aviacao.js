/* Vetores de pressão · Aviação.
   Dados: /data/aviacao.json (fatores DESNZ 2025, números de contexto, rotas de exemplo, fontes),
   /data/aviacao-portugal.json (Eurostat) e /data/aeroportos.json (OurAirports); os dois últimos são gerados por
   scripts/dados/aviacao.py. Gráficos: assets/js/biocultura-graficos.js. Os números do texto vêm dos dados. */
(function () {
  "use strict";
  /* ---------- cálculo (exportado para os testes) ---------- */
  const R_TERRA = 6371;
  const gcd = (a, b) => {
    const rad = (x) => (x * Math.PI) / 180, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
    return 2 * R_TERRA * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const viagem = (km, cls) => ({ km, direto: km * cls.direto, total: km * cls.total });
  window.BioCulturaAviacao = { gcd, viagem };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-aviacao");
  if (!G || !box) return;
  const { EN, tr, fmt, esc, css, line, legend, seg, showTip, hideTip, tableView } = G;

  /* Versão inglesa do texto fixo da página (cabeçalho e navegação). */
  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Aviation: the weight of every trip — bioCulture";
  }
  fetch("/sidebar-content.html?v=25").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=17"; document.body.appendChild(el); };
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

  Promise.all([get("/data/aviacao.json?v=4"), get("/data/aviacao-portugal.json?v=1"), get("/data/aeroportos.json?v=1"), get("/data/noticias.json").catch(() => []), get("/data/aviacao-rotas-portugal.json?v=1"), get("/data/aviacao-tempo.json?v=1"), get("/data/aviacao-recursos.json?v=1")])
    .then(([D, PT, AE, NEWS, RT, TM, RC]) => { build(D, PT, AE, RT, TM, RC); atualidade(NEWS); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });

  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  const kgTxt = (kg) => (kg >= 1000 ? fmt(kg / 1000, 1) + " t" : fmt(Math.round(kg)) + " kg");
  const mt = (kt) => fmt(kt / 1000, 1);

  /* Notícias sobre aviação: as aprovadas em data/noticias.json cujo título fala do tema (palavras do tema «aviacao» no
     runtime) ou cuja categoria é «aviacao». Sem nenhuma, o bloco e a ligação da barra ficam escondidos. */
  function atualidade(items) {
    const News = window.BioCultureNews, topic = News?.topics?.aviacao, grid = document.getElementById("av-news");
    if (!News || !topic || !grid || !Array.isArray(items)) return;
    const selecionadas = News.rank(items).filter((n) => n.estado !== "proposta" && News.about(n, topic.words, topic.categories)).slice(0, 6);
    if (!selecionadas.length) return;
    grid.innerHTML = selecionadas.map((n) => News.cardHtml(n)).join("");
    grid.querySelectorAll(".hub-latest-thumb").forEach((img) => img.addEventListener("error", () => {
      if (img.dataset.fallbackApplied === "true") return;
      img.dataset.fallbackApplied = "true";
      img.src = "/images/noticias-sem-imagem.webp";
    }));
    document.getElementById("atualidade").hidden = false;
    document.querySelectorAll('a[href="#atualidade"]').forEach((a) => (a.hidden = false));
  }

  function build(D, PT, AE, RT, TM, RC) {
    const cols = AE.meta.campos, ix = Object.fromEntries(cols.map((c, i) => [c, i]));
    const AER = new Map(AE.aeroportos.map((a) => [a[ix.iata], a]));
    const AQ = RT.aquecimento;
    /* Em inglês o tradutor da página também passa pelos textos dos ficheiros de dados, por isso nada se procura pelo «id»:
       as classes e as fontes têm posição fixa em aviacao.json (ver scripts/tests/aviacao.test.mjs). */
    const F = D.fatores, CL = Object.fromEntries(["media", "economica", "premium", "executiva", "primeira"].map((k, i) => [k, F.classes[i]]));
    const SRC = Object.fromEntries(["owid", "lee2021", "desnz", "icao", "eurostat", "ourairports"].map((k, i) => [k, D.fontes[i]]));
    const cidade = (a) => (EN && a[ix.cidade_en] ? a[ix.cidade_en] : a[ix.cidade]);
    let DN; try { DN = new Intl.DisplayNames(EN ? ["en-GB", "en"] : ["pt-PT", "pt"], { type: "region" }); } catch (e) { DN = null; }
    const pais = (a) => { try { return DN ? DN.of(a[ix.pais]) : a[ix.pais]; } catch (e) { return a[ix.pais]; } };
    const rotulo = (a) => `${cidade(a)} (${a[ix.iata]}) · ${a[ix.nome]}`;
    const srcLink = (id) => `<a href="${SRC[id].url}" target="_blank" rel="noopener">${esc(tr(SRC[id].nome, SRC[id].nome_en).split(" — ")[0].split(" (")[0])} ↗</a>`;

    const S = PT.series, anos = Object.keys(S.transporte_aereo).map(Number).sort((a, b) => a - b);
    const ar = (y) => S.transporte_aereo[y], tot = (y) => S.economia_familias[y];
    const quota = (y) => (ar(y) / tot(y)) * 100;
    const y0 = 2019, y1 = anos[anos.length - 1], yCovid = 2020;

    /* ---------- estrutura ---------- */
    box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("O que a ciência diz sobre voar", "What the science says about flying")}</h2></div>
  <div class="tiles">${D.mundo.map((m) => `<div class="tile"><span class="v">${m.valor}<small>${m.unidade}</small></span><span class="k">${tr(m.pt, m.en)}</span><span class="s">${tr(m.nota_pt, m.nota_en)}</span></div>`).join("")}</div>
  <div class="prose">
    <p>${tr("A aviação pesa cerca de <strong>2,5% do CO₂ mundial</strong> e só cerca de <strong>10% das pessoas voa</strong> num ano típico. Por isso vale a pena ver os números concretos, o de cada viagem e o de cada rota, em vez de falar da aviação em abstrato.", "Aviation accounts for about <strong>2.5% of world CO₂</strong> and only about <strong>10% of people fly</strong> in a typical year. That is why it is worth seeing the concrete numbers, for each trip and for each route, instead of talking about aviation in the abstract.")}</p>
    <p>${tr("Os números que se seguem são <strong>estimativas</strong>, com a incerteza à vista: por passageiro na calculadora da tua viagem e por rota nos voos reais. A classe do bilhete e os efeitos que não são CO₂ mudam muito o resultado.", "The numbers below are <strong>estimates</strong> with the uncertainty in plain sight: per passenger in the trip calculator and per route in the real flights. The ticket class and the non-CO₂ effects change the result a lot.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLink("owid")} · ${srcLink("lee2021")}</p>
</section>

<section id="recursos">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Todos os recursos", "1 · All resources")}</span><h2>${tr("Tudo o que voar afeta", "Everything flying affects")}</h2></div>
  <div class="prose"><p>${tr("O carbono é só uma das pressões de voar. Cada dimensão aparece na sua unidade e <strong>não se soma</strong> às outras: combustível, óxidos de azoto, ruído e terra.", "Carbon is only one of the pressures of flying. Each dimension appears in its own unit and is <strong>not added</strong> to the others: fuel, nitrogen oxides, noise and land.")}</p></div>
  <div class="rec-grid" id="av-rec"></div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Querosene fornecido em Portugal", "Jet fuel supplied in Portugal")}</span><span class="d">${tr("Milhares de toneladas por ano: abastecido para voos ao estrangeiro e para voos dentro do país.", "Thousand tonnes a year: taken on for flights abroad and for flights within the country.")}</span></figcaption>
      <div class="legend" id="av-leg-comb"></div>
      <div class="chart" id="av-rc-comb"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, balanços energéticos (nrg_bal_c); cálculo bioCulture com o poder calorífico da DESNZ (43,9 GJ por tonelada).", "Source: Eurostat, energy balances (nrg_bal_c); bioCulture calculation with DESNZ's calorific value (43.9 GJ per tonne).")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Óxidos de azoto (NOx) da aviação", "Nitrogen oxides (NOx) from aviation")}</span><span class="d">${tr("Milhares de toneladas por ano, empresas de transporte aéreo residentes em Portugal, onde quer que voem.", "Thousand tonnes a year, air transport companies resident in Portugal, wherever they fly.")}</span></figcaption>
      <div class="chart" id="av-rc-nox"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE H51, poluente NOX.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE H51, pollutant NOX.")}</span></div>
    </figure>
  </div>
</section>

<section id="voos">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Voos reais", "2 · Real flights")}</span><h2>${tr("Quanto gasta cada rota, por dia e por ano", "How much each route uses, per day and per year")}</h2></div>
  <div class="prose">
    <p>${tr("O Eurostat conta, por ano, os <strong>voos e os passageiros</strong> entre cada aeroporto português e os seus parceiros, nos dois sentidos e de todas as companhias. Multiplicámos os passageiros pela distância e pelo fator médio da DESNZ para estimar o <strong>combustível e o CO₂e da rota inteira</strong>, e dividimos pelo ano para chegar à média diária, semanal e mensal.", "Eurostat counts, per year, the <strong>flights and passengers</strong> between each Portuguese airport and its partners, in both directions and for all airlines. We multiplied passengers by distance and by the DESNZ average factor to estimate the <strong>fuel and CO₂e of the whole route</strong>, and divided by the year to get the daily, weekly and monthly average.")}</p>
  </div>
  <div class="tiles" id="av-tot"></div>
  <figure class="calc">
    <figcaption><span class="t">${tr("Calculadora de rotas reais", "Real routes calculator")}</span><span class="d">${tr("Escolhe uma rota de ou para Portugal: escreve a cidade ou o código IATA e escolhe na lista.", "Pick a route to or from Portugal: type the city or IATA code and choose from the list.")}</span></figcaption>
    <div class="calc-form">
      <label class="full">${tr("Rota", "Route")}<input id="rt-rota" list="rt-lista" autocomplete="off" spellcheck="false" placeholder="${tr("Por exemplo: Lisboa ⇄ Madrid", "For example: Lisbon ⇄ Madrid")}"></label>
      <datalist id="rt-lista"></datalist>
    </div>
    <div class="chips" id="rt-chips"><span>${tr("Mais movimentadas:", "Busiest:")}</span></div>
    <div id="rt-res" aria-live="polite"></div>
    <div class="src"><span>${tr("Fontes: Eurostat (voos e passageiros, aquecimento e casas), DESNZ 2025 (fatores e combustível), OurAirports (distâncias).", "Sources: Eurostat (flights and passengers, heating and homes), DESNZ 2025 (factors and fuel), OurAirports (distances).")}</span></div>
  </figure>
  <figure>
    <figcaption><span class="t">${tr("As 15 rotas que mais emitem, por ano", "The 15 routes that emit most, per year")}</span><span class="d">${tr("Mil toneladas de CO₂e da rota inteira, nos dois sentidos. A barra escura é só emissões diretas; a clara é o acréscimo dos efeitos não-CO₂.", "Thousand tonnes of CO₂e for the whole route, in both directions. The dark bar is direct emissions only; the light one is the addition from non-CO₂ effects.")}</span></figcaption>
    <div class="legend" id="rt-leg"></div>
    <div class="chart" id="rt-graf"></div>
    <div class="src"><span>${tr("Cálculo bioCulture a partir do Eurostat (avia_par_pt) e dos fatores da DESNZ 2025; estimativa, não o combustível medido.", "bioCulture calculation from Eurostat (avia_par_pt) and DESNZ 2025 factors; an estimate, not measured fuel.")}</span></div>
  </figure>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("3 · A tua viagem", "3 · Your trip")}</span><h2>${tr("Quanto CO₂ cabe numa viagem?", "How much CO₂ is in a trip?")}</h2></div>
  <div class="prose"><p>${tr("Escolhe o aeroporto de partida e o de chegada, em qualquer parte do mundo. A estimativa é <strong>distância × fator médio por passageiro e quilómetro</strong> (média de todas as classes), e o fator já inclui o desvio das rotas reais face à linha reta.", "Choose the departure and arrival airports anywhere in the world. The estimate is <strong>distance × factor per passenger-kilometre</strong>, and the factor already includes the detour of real routes compared with a straight line.")}</p></div>
  <figure class="calc">
    <figcaption><span class="t">${tr("Calculadora de rota", "Route calculator")}</span><span class="d">${tr("Escreve a cidade ou o código IATA (por exemplo, Lisboa ou LIS) e escolhe na lista.", "Type the city or IATA code (for example, Lisbon or LIS) and pick from the list.")}</span></figcaption>
    <div class="calc-form">
      <label>${tr("De", "From")}<input id="av-de" list="av-lista" autocomplete="off" spellcheck="false" placeholder="${tr("Cidade ou código IATA", "City or IATA code")}"></label>
      <label>${tr("Para", "To")}<input id="av-para" list="av-lista" autocomplete="off" spellcheck="false" placeholder="${tr("Cidade ou código IATA", "City or IATA code")}"></label>
      <label>${tr("Viagens por ano", "Trips per year")}<input id="av-n" type="number" min="1" max="100" value="1" inputmode="numeric"></label>
      <div class="seg" id="av-ida" role="group" aria-label="${tr("Tipo de viagem", "Trip type")}"><button aria-pressed="true" data-v="1">${tr("Só ida", "One way")}</button><button aria-pressed="false" data-v="2">${tr("Ida e volta", "Round trip")}</button></div>
      <datalist id="av-lista">${AE.aeroportos.map((a) => `<option value="${esc(rotulo(a))}"></option>`).join("")}</datalist>
    </div>
    <div class="chips" id="av-chips"><span>${tr("Exemplos:", "Examples:")}</span></div>
    <div id="av-res" aria-live="polite"></div>
    <div class="src"><span>${tr("Fatores: DESNZ 2025, voos entre aeroportos fora do Reino Unido. Aeroportos: OurAirports.", "Factors: DESNZ 2025, flights between non-UK airports. Airports: OurAirports.")}</span></div>
  </figure>
</section>

<section id="rotas">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Rotas de exemplo", "4 · Example routes")}</span><h2>${tr("A distância manda, mas não explica tudo", "Distance rules, but it does not explain everything")}</h2></div>
  <div class="prose"><p id="av-rotas-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("CO₂ por passageiro em classe económica, rotas de exemplo", "CO₂ per economy-class passenger, example routes")}</span><span class="d">${tr("Só ida, kg de CO₂e. A barra escura é a estimativa só com emissões diretas; a clara é o que se soma com os efeitos não-CO₂.", "One way, kg of CO₂e. The dark bar is the estimate with direct emissions only; the light one is what is added by non-CO₂ effects.")}</span></figcaption>
    <div class="legend" id="av-leg-rotas"></div>
    <div class="chart" id="av-rotas"></div>
    <div class="src"><span>${tr("Fonte: cálculo bioCulture com fatores DESNZ 2025 e coordenadas OurAirports; as rotas são exemplos, não as mais movimentadas.", "Source: bioCulture calculation with DESNZ 2025 factors and OurAirports coordinates; the routes are examples, not the busiest.")}</span></div>
  </figure>
</section>

<section id="classes">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Classe de bilhete", "5 · Ticket class")}</span><h2>${tr("Quanto espaço ocupas, tanto pesas", "The more space you take, the more you weigh")}</h2></div>
  <div class="prose"><p id="av-classes-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Gramas de CO₂e por passageiro e quilómetro, por classe", "Grams of CO₂e per passenger-kilometre, by class")}</span><span class="d">${tr("O avião emite o mesmo; muda a parte que é atribuída a cada passageiro, conforme o espaço que ocupa na cabine.", "The aircraft emits the same; what changes is the share assigned to each passenger, according to the cabin space they take.")}</span></figcaption>
    <div class="legend" id="av-leg-classes"></div>
    <div class="chart" id="av-classes"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «International, to/from non-UK». Os fatores por classe repartem as emissões pela área que cada passageiro ocupa.", "Source: DESNZ 2025, “International, to/from non-UK”. Class factors split emissions by the area each passenger takes.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("6 · Portugal", "6 · Portugal")}</span><h2>${tr("O transporte aéreo português em 30 anos", "Portuguese air transport over 30 years")}</h2></div>
  <div class="prose"><p id="av-pt-txt"></p></div>
  <div class="tiles" id="av-pt-tiles"></div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("CO₂ do transporte aéreo", "CO₂ from air transport")}</span><span class="d">${tr("Milhões de toneladas por ano, empresas residentes em Portugal.", "Million tonnes a year, companies resident in Portugal.")}</span></figcaption>
      <div class="chart" id="av-pt-abs"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE H51.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE H51.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Quanto pesa no total", "Share of the total")}</span><span class="d">${tr("Percentagem do CO₂ da economia e das famílias residentes.", "Percentage of CO₂ from the resident economy and households.")}</span></figcaption>
      <div class="chart" id="av-pt-pct"></div>
      <div class="src"><span>${tr("Cálculo bioCulture: H51 a dividir por «todas as atividades mais famílias» (Eurostat).", "bioCulture calculation: H51 divided by “all activities plus households” (Eurostat).")}</span></div>
    </figure>
  </div>
</section>

<section id="tempo">
  <div class="sec-head"><span class="eyebrow">${tr("7 · Linha do tempo", "7 · Timeline")}</span><h2>${tr("O voo cresceu, e o clima aqueceu: o que isso prova?", "Flying grew and the climate warmed: what does that prove?")}</h2></div>
  <div class="prose"><p id="tp-txt"></p><p id="tp-aviso"></p></div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Voos e passageiros no mundo", "Flights and passengers worldwide")}</span><span class="d">${tr("Índice, 1970 = 100: partidas de voos e passageiros transportados.", "Index, 1970 = 100: flight departures and passengers carried.")}</span></figcaption>
      <div class="legend" id="tp-leg-a"></div>
      <div class="chart" id="tp-a"></div>
      <div class="src"><span>${tr("Fonte: Banco Mundial, com dados da ICAO (IS.AIR.DPRT e IS.AIR.PSGR); cálculo bioCulture.", "Source: World Bank, with ICAO data (IS.AIR.DPRT and IS.AIR.PSGR); bioCulture calculation.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Temperatura global", "Global temperature")}</span><span class="d">${tr("Anomalia anual da temperatura à superfície, °C face a 1951–1980.", "Annual surface temperature anomaly, °C against 1951–1980.")}</span></figcaption>
      <div class="chart" id="tp-b"></div>
      <div class="src"><span>${tr("Fonte: NASA GISS, GISTEMP v4.", "Source: NASA GISS, GISTEMP v4.")}</span></div>
    </figure>
  </div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Quanto pesa a aviação no CO₂ mundial", "How much aviation weighs in world CO₂")}</span><span class="d">${tr("Percentagem do CO₂ de combustíveis fósseis e uso do solo, desde 1940, sem os efeitos não-CO₂.", "Percentage of CO₂ from fossil fuels and land use, since 1940, without non-CO₂ effects.")}</span></figcaption>
      <div class="chart" id="tp-c"></div>
      <div class="src"><span>${tr("Fonte: Our World in Data, a partir de Lee et al., Bergero et al. e Global Carbon Project.", "Source: Our World in Data, from Lee et al., Bergero et al. and the Global Carbon Project.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Rotas com passageiros em Portugal", "Routes with passengers in Portugal")}</span><span class="d">${tr("Número de rotas entre os aeroportos principais e os seus parceiros, por ano.", "Number of routes between the main airports and their partners, per year.")}</span></figcaption>
      <div class="chart" id="tp-d"></div>
      <div class="src"><span>${tr("Fonte: Eurostat (avia_par_pt); cálculo bioCulture, rotas internas contadas uma vez.", "Source: Eurostat (avia_par_pt); bioCulture calculation, domestic routes counted once.")}</span></div>
    </figure>
  </div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("8 · Limites e fontes", "8 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
  <ol class="notes" id="av-notas"></ol>
  <div class="srcs" id="av-fontes"></div>
</section>`;

    /* ---------- textos que dependem dos dados ---------- */
    const rotasDados = D.rotas.map(([a, b]) => {
      const A = AER.get(a), B = AER.get(b);
      if (!A || !B) throw new Error("Aeroporto em falta: " + a + " ou " + b);
      const km = gcd([A[ix.lat], A[ix.lon]], [B[ix.lat], B[ix.lon]]);
      return { a: A, b: B, ...viagem(km, CL.economica) };
    }).sort((x, y) => x.km - y.km);
    const curta = rotasDados[0], longa = rotasDados[rotasDados.length - 1];
    const r1000 = (x) => fmt(Math.round(x.km / 10) * 10);
    document.getElementById("av-rotas-txt").innerHTML = tr(
      `Em classe económica, só ida, a rota mais curta da lista (${cidade(curta.a)}–${cidade(curta.b)}, cerca de ${r1000(curta)} km) dá <strong>${kgTxt(curta.total)}</strong> de CO₂e com os efeitos não-CO₂ (${kgTxt(curta.direto)} só com emissões diretas). A mais longa (${cidade(longa.a)}–${cidade(longa.b)}, cerca de ${r1000(longa)} km) dá <strong>${kgTxt(longa.total)}</strong> (${kgTxt(longa.direto)} só diretas). O fator médio usado é o mesmo para todas as rotas, por isso o gráfico mostra sobretudo o efeito da distância; na realidade, voos curtos gastam proporcionalmente mais combustível na descolagem e na subida.`,
      `In economy class, one way, the shortest route in the list (${cidade(curta.a)}–${cidade(curta.b)}, about ${r1000(curta)} km) gives <strong>${kgTxt(curta.total)}</strong> of CO₂e with non-CO₂ effects (${kgTxt(curta.direto)} with direct emissions only). The longest (${cidade(longa.a)}–${cidade(longa.b)}, about ${r1000(longa)} km) gives <strong>${kgTxt(longa.total)}</strong> (${kgTxt(longa.direto)} direct only). The same average factor is used for every route, so the chart mostly shows the effect of distance; in reality, short flights burn proportionally more fuel on take-off and climb.`);
    const e = CL.economica, p = CL.premium, ex = CL.executiva, pr = CL.primeira;
    document.getElementById("av-classes-txt").innerHTML = tr(
      `Com os mesmos quilómetros, um bilhete de <strong>executiva pesa ${fmt(ex.total / e.total, 1)} vezes</strong> um de económica e um de primeira ${fmt(pr.total / e.total, 1)} vezes: ocupam mais espaço, por isso cabem menos pessoas no mesmo avião e a cada uma cabe uma parte maior das emissões. A classe económica premium fica nas ${fmt(p.total / e.total, 1)} vezes.`,
      `Over the same kilometres, a <strong>business ticket weighs ${fmt(ex.total / e.total, 1)} times</strong> an economy one and a first-class ticket ${fmt(pr.total / e.total, 1)} times: they take more space, so fewer people fit in the same aircraft and each is assigned a larger share of the emissions. Premium economy comes to ${fmt(p.total / e.total, 1)} times.`);
    document.getElementById("av-pt-txt").innerHTML = tr(
      `As contas de emissões do Eurostat seguem as empresas e as famílias <strong>residentes em Portugal</strong>, voem onde voarem: incluem o combustível que as companhias portuguesas abastecem noutros países e deixam de fora as estrangeiras que aterram cá. Em ${y0}, o transporte aéreo emitiu <strong>${mt(ar(y0))} Mt</strong> de CO₂; em ${yCovid}, ${mt(ar(yCovid))} Mt; e em ${y1}, <strong>${mt(ar(y1))} Mt</strong>, acima do nível de ${y0}. Como o resto das emissões desceu, o peso da aviação no total passou de ${fmt(quota(y0), 1)}% para <strong>${fmt(quota(y1), 1)}%</strong>. O valor de ${y1} é uma estimativa do Eurostat (valor imputado, sinalizador «i»).`,
      `Eurostat's emissions accounts follow the companies and households <strong>resident in Portugal</strong>, wherever they fly: they include fuel that Portuguese airlines take on in other countries and leave out foreign airlines landing here. In ${y0}, air transport emitted <strong>${mt(ar(y0))} Mt</strong> of CO₂; in ${yCovid}, ${mt(ar(yCovid))} Mt; and in ${y1}, <strong>${mt(ar(y1))} Mt</strong>, above the ${y0} level. As the rest of emissions fell, aviation's weight in the total went from ${fmt(quota(y0), 1)}% to <strong>${fmt(quota(y1), 1)}%</strong>. The ${y1} value is a Eurostat estimate (imputed value, flag “i”).`);
    document.getElementById("av-pt-tiles").innerHTML = [
      [mt(ar(y0)), "Mt CO₂", tr("transporte aéreo em " + y0, "air transport in " + y0), fmt(quota(y0), 1) + tr("% do total", "% of the total")],
      [mt(ar(yCovid)), "Mt CO₂", tr("em " + yCovid + ", com a pandemia", "in " + yCovid + ", during the pandemic"), fmt(quota(yCovid), 1) + tr("% do total", "% of the total")],
      [mt(ar(y1)), "Mt CO₂", tr("em " + y1, "in " + y1), fmt(quota(y1), 1) + tr("% do total", "% of the total")],
      [fmt((ar(y1) / ar(y0) - 1) * 100, 0) + "%", "", tr("variação " + y0 + "–" + y1, "change " + y0 + "–" + y1), tr("transporte aéreo, em CO₂", "air transport, in CO₂")]
    ].map((t) => `<div class="tile"><span class="v">${t[0]}${t[1] ? `<small>${t[1]}</small>` : ""}</span><span class="k">${t[2]}</span><span class="s">${t[3]}</span></div>`).join("");

    document.getElementById("av-notas").innerHTML = [
      tr("<strong>São estimativas, não a medição de voos.</strong> Na calculadora «A tua viagem» o valor é <strong>por passageiro</strong>; em «Voos reais» são <strong>totais por rota</strong> (todos os passageiros e voos de um ano). Em ambos, o fator é uma média: a DESNZ calcula-o para voos entre aeroportos fora do Reino Unido, juntando voos curtos e longos, a partir de dados de 2023 de companhias aéreas do Reino Unido e da ferramenta de combustível da Eurocontrol. O consumo real depende do avião, da ocupação, da rota efetivamente voada e de haver escalas.", "<strong>These are estimates, not measurements of flights.</strong> In the “Your trip” calculator the value is <strong>per passenger</strong>; in “Real flights” they are <strong>route totals</strong> (all passengers and flights in a year). In both, the factor is an average: DESNZ calculates it for flights between airports outside the UK, pooling short and long flights, from 2023 data of UK airlines and Eurocontrol's fuel tool. Real consumption depends on the aircraft, load factor, route actually flown and whether there are stopovers."),
      tr("<strong>Os efeitos não-CO₂ são incertos.</strong> Rastos de condensação, óxidos de azoto e vapor de água aquecem o clima, mas a dimensão exata ainda é discutida. Por isso mostramos sempre um intervalo: só emissões diretas, e com +70% aplicado ao CO₂, como recomenda a DESNZ.", "<strong>Non-CO₂ effects are uncertain.</strong> Contrails, nitrogen oxides and water vapour warm the climate, but the exact size is still debated. That is why we always show a range: direct emissions only, and with +70% applied to the CO₂, as DESNZ recommends."),
      tr("<strong>Comparação com o comboio.</strong> Quando o destino está na Europa e a menos de 2 000 km, mostramos o fator de comboio internacional da DESNZ como referência. Não significa que exista uma ligação ferroviária direta, e o comboio português pode ter um valor diferente.", "<strong>Comparison with rail.</strong> When the destination is in Europe and under 2,000 km away, we show DESNZ's international rail factor as a reference. It does not mean a direct rail link exists, and Portuguese rail may have a different value."),
      tr("<strong>Voos reais: é uma estimativa, não o combustível medido.</strong> Os voos e passageiros são do Eurostat (aeroportos principais de Portugal e seus parceiros, 2024, nos dois sentidos, voos comerciais de passageiros de todas as companhias; as rotas entre aeroportos portugueses aparecem duas vezes e levam a média). O combustível e o CO₂e saem da distância em linha reta e do fator médio por passageiro da DESNZ, e incluem o percurso completo, também a parte fora de Portugal. O fator atribui aos passageiros a sua parte das emissões do voo: a carga que viaja no avião fica de fora (a DESNZ atribui à carga cerca de 17% das emissões nos voos de longo curso e menos de 1% nos de curto curso), pelo que o consumo total dos aviões é um pouco maior. O consumo real depende do avião, da ocupação e da rota efetivamente voada.", "<strong>Real flights: an estimate, not measured fuel.</strong> Flights and passengers are from Eurostat (main Portuguese airports and their partners, 2024, both directions, commercial passenger flights of all airlines; routes between Portuguese airports appear twice and are averaged). Fuel and CO₂e come from the straight-line distance and DESNZ's average per-passenger factor, and include the full journey, also the part outside Portugal. The factor assigns passengers their share of the flight's emissions: cargo carried on board is left out (DESNZ assigns about 17% of emissions to cargo on long-haul flights and less than 1% on short-haul ones), so the aircraft's total consumption is somewhat higher. Real consumption depends on the aircraft, load factor and route actually flown."),
      tr("<strong>A equivalência com o aquecimento.</strong> Compara a energia que o querosene contém com a energia que as casas portuguesas gastam em aquecimento do espaço (Eurostat: " + fmt(AQ.tj / 1000, 0) + " mil TJ em " + AQ.ano + ", para " + fmt(AQ.casas_milhares / 1000, 1) + " milhões de casas). Em Portugal esse consumo é baixo, por causa do clima ameno e de se aquecer pouco as casas, o que faz as rotas parecerem enormes. Uma casa não aquece com querosene: é só para dar escala.", "<strong>The heating equivalence.</strong> It compares the energy that jet fuel contains with the energy Portuguese homes use for space heating (Eurostat: " + fmt(AQ.tj / 1000, 0) + " thousand TJ in " + AQ.ano + ", for " + fmt(AQ.casas_milhares / 1000, 1) + " million homes). In Portugal that consumption is low, because of the mild climate and because homes are little heated, which makes the routes look enormous. A home is not heated with jet fuel: it is only to give scale."),
      tr("<strong>Os outros recursos: o que cada número mede.</strong> O <strong>combustível</strong> é o querosene fornecido em Portugal (Eurostat): inclui a carga e as companhias estrangeiras que abastecem cá, e não é o consumo dos portugueses nem dos aviões portugueses. O <strong>NOx</strong> é o das empresas de transporte aéreo residentes em Portugal, onde quer que voem; o Eurostat não separa o que se emite junto aos aeroportos. O <strong>ruído</strong> vem dos mapas estratégicos de 2021 de Lisboa e do Porto (APA, com o Censos 2021) e do relatório europeu da AESA, de anos e métodos diferentes; não lemos os mapas dos outros aeroportos. Quanto à <strong>terra</strong>, não há um número aberto e citável. Estas dimensões nunca se somam entre si nem com o CO₂.", "<strong>The other resources: what each number measures.</strong> <strong>Fuel</strong> is the jet fuel supplied in Portugal (Eurostat): it includes cargo and the foreign airlines that refuel here, and it is neither the consumption of the Portuguese nor of Portuguese aircraft. <strong>NOx</strong> is that of air transport companies resident in Portugal, wherever they fly; Eurostat does not separate what is emitted near airports. <strong>Noise</strong> comes from the 2021 strategic noise maps of Lisbon and Porto (APA, using the 2021 Census) and from EASA's European report, of different years and methods; we did not read the maps of the other airports. As for <strong>land</strong>, there is no open, citable number. These dimensions are never added to each other or to CO₂."),
      tr("<strong>Linha do tempo: o que mede e o que não mede.</strong> Não existe uma série aberta do número de rotas no mundo; usamos as partidas de voos e os passageiros das companhias aéreas registadas em cada país (Banco Mundial, com dados da ICAO, desde 1970; sem dado para 1972, e a linha liga 1971 a 1973) e, para Portugal, o número de rotas nos aeroportos principais (Eurostat, desde 1993, cuja cobertura de aeroportos muda com os anos). Antes de 1970 só temos a quota da aviação no CO₂ (desde 1940, calculada pela Our World in Data). A temperatura é a anomalia global da NASA; não temos uma série longa e comparável para Portugal.", "<strong>Timeline: what it measures and what it does not.</strong> There is no open series for the number of routes worldwide; we use flight departures and passengers of airlines registered in each country (World Bank, with ICAO data, since 1970; no data for 1972, so the line joins 1971 to 1973) and, for Portugal, the number of routes at the main airports (Eurostat, since 1993, whose airport coverage changes over the years). Before 1970 we only have aviation's share of CO₂ (since 1940, calculated by Our World in Data). Temperature is NASA's global anomaly; we do not have a long, comparable series for Portugal."),
      tr("<strong>Quantos aviões sobrevoam uma região?</strong> A página diz quantos voos há entre os aeroportos portugueses e os seus parceiros, mas <strong>não quantos aviões atravessam o espaço aéreo de uma região sem aterrar</strong>, como o Centro de Portugal. Não usamos contagens de serviços de rastreio comerciais e não encontrámos uma contagem aberta e citável. E sobrevoar não é emitir «ali»: a emissão pertence a quem abastece e voa, e os inventários nacionais reportam a aviação internacional à parte, em regra a partir do combustível vendido no país, sem a incluir nos totais nacionais.", "<strong>How many aircraft overfly a region?</strong> The page says how many flights there are between Portuguese airports and their partners, but <strong>not how many aircraft cross the airspace of a region without landing</strong>, such as central Portugal. We do not use counts from commercial tracking services and we did not find an open, citable count. And overflying is not emitting “there”: emissions belong to whoever takes on fuel and flies, and national inventories report international aviation separately, usually from fuel sold in the country, without including it in national totals."),
      tr("<strong>Aeroportos.</strong> A lista (OurAirports) tem os aeroportos com serviço regular e código IATA; pode ter atrasos ou omissões. Os números mundiais são de anos diferentes, indicados em cada caixa e gráfico: 2019 para o total de CO₂ e para a percentagem de pessoas que voa (Our World in Data), 2018 para os efeitos não-CO₂ (Lee et al.) e até 2023 para voos e passageiros.", "<strong>Airports.</strong> The list (OurAirports) has airports with scheduled service and an IATA code; it may lag or have omissions. World numbers are from different years, shown in each box and chart: 2019 for total CO₂ and the share of people who fly (Our World in Data), 2018 for non-CO₂ effects (Lee et al.) and up to 2023 for flights and passengers."),
      tr("<strong>Fatores da DESNZ.</strong> Vêm de um organismo oficial do Reino Unido, com licença aberta, e servem para contas de empresas. A ICAO publica um método semelhante com tabelas de combustível por tipo de avião; só consultámos a versão 8 (2015), por isso não a usamos nos cálculos.", "<strong>DESNZ factors.</strong> They come from an official UK body, under an open licence, and are meant for company accounting. ICAO publishes a similar method with fuel tables by aircraft type; we only consulted version 8 (2015), so we do not use it in the calculations.")
    ].map((n) => `<li>${n}</li>`).join("");
    document.getElementById("av-fontes").innerHTML = D.fontes.map((s) => `<div class="srcc"><h3>${esc(tr(s.nome, s.nome_en))}</h3><p>${tr(s.usa_pt, s.usa_en)}</p><a class="u" href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join("");

    /* ---------- barras empilhadas (direto + não-CO₂) ---------- */
    const COR_D = css("--s2") || "#eb6834", COR_N = "#f4c4b0";
    function pilhas(el, rows, unidade) {
      const max = Math.max(...rows.map((r) => r.total));
      el.className = "chart hbars stk2";
      el.innerHTML = rows.map((r, i) => `<div class="hb" data-i="${i}"><span class="l" title="${esc(r.l)}">${esc(r.l)}</span><span class="tr"><span class="b" style="width:${(r.direto / max) * 100}%;background:${COR_D}"></span><span class="b" style="left:${(r.direto / max) * 100}%;width:${((r.total - r.direto) / max) * 100}%;background:${COR_N}"></span></span><span class="v">${r.t}</span></div>`).join("");
      el.querySelectorAll(".hb").forEach((n) => {
        const r = rows[+n.dataset.i];
        n.addEventListener("mousemove", (ev) => showTip(ev, `<div class="h">${esc(r.l)}</div>${r.tip}`));
        n.addEventListener("mouseleave", hideTip);
      });
      tableView(el, [tr("Item", "Item"), tr("Só emissões diretas", "Direct emissions only"), tr("Com efeitos não-CO₂", "With non-CO₂ effects")], rows.map((r) => [esc(r.l), r.td, r.tt]));
    }
    const legPilhas = (id) => legend(document.getElementById(id), [{ n: tr("Emissões diretas (CO₂, CH₄, N₂O)", "Direct emissions (CO₂, CH₄, N₂O)"), c: COR_D }, { n: tr("Acréscimo dos efeitos não-CO₂ (+70%)", "Added by non-CO₂ effects (+70%)"), c: COR_N }]);
    legPilhas("av-leg-rotas"); legPilhas("av-leg-classes");
    pilhas(document.getElementById("av-rotas"), rotasDados.map((r) => ({
      l: `${cidade(r.a)} – ${cidade(r.b)}`, direto: r.direto, total: r.total, t: kgTxt(r.total), td: kgTxt(r.direto), tt: kgTxt(r.total),
      tip: `<div class="r"><span>${tr("Distância", "Distance")}</span><b>${fmt(Math.round(r.km))} km</b></div><div class="r"><span>${tr("Só diretas", "Direct only")}</span><b>${kgTxt(r.direto)}</b></div><div class="r"><span>${tr("Com não-CO₂", "With non-CO₂")}</span><b>${kgTxt(r.total)}</b></div>`
    })), "kg");
    pilhas(document.getElementById("av-classes"), F.classes.map((c) => ({
      l: tr(c.pt, c.en), direto: c.direto * 1000, total: c.total * 1000, t: fmt(c.total * 1000) + " g", td: fmt(c.direto * 1000) + " g", tt: fmt(c.total * 1000) + " g",
      tip: `<div class="r"><span>${tr("Só diretas", "Direct only")}</span><b>${fmt(c.direto * 1000)} g</b></div><div class="r"><span>${tr("Com não-CO₂", "With non-CO₂")}</span><b>${fmt(c.total * 1000)} g</b></div>`
    })), "g");

    /* ---------- gráficos de Portugal ---------- */
    const lin = (id, vals, yf, tf, cor, nome) => line(document.getElementById(id), {
      x: anos, series: [{ n: nome, c: cor, v: anos.map((y) => vals(y)) }], zero: true, yf, tf: (se, i) => tf(se.v[i]), aria: nome, table: true, tableEvery: 5
    });
    lin("av-pt-abs", (y) => ar(y) / 1000, (v) => fmt(v, 0), (v) => fmt(v, 2) + " Mt", css("--s2") || "#eb6834", tr("Transporte aéreo (Mt CO₂)", "Air transport (Mt CO₂)"));
    lin("av-pt-pct", (y) => quota(y), (v) => fmt(v, 0) + "%", (v) => fmt(v, 1) + "%", css("--s1") || "#2a78d6", tr("Quota no total (%)", "Share of the total (%)"));

    /* ---------- voos reais por rota (Eurostat) ---------- */
    const CB = D.combustivel, MED = CL.media, ROT = RT.rotas;
    const KWH_TJ = 277777.78;
    const casaMWh = (AQ.tj * KWH_TJ) / (AQ.casas_milhares * 1000) / 1000; // MWh de aquecimento por casa e por ano
    const aqTotalMWh = (AQ.tj * KWH_TJ) / 1000;
    const totaisRota = (r) => {
      const pkm = r.passageiros * r.km, co2 = pkm * CB.co2_kg_por_pkm_media;
      const t = pkm * MED.direto / 1000, tt = pkm * MED.total / 1000; // toneladas de CO₂e
      const comb = co2 / CB.co2_kg_por_tonelada; // toneladas de combustível
      return { voos: r.voos, pax: r.passageiros, comb, litros: comb * CB.litros_por_tonelada, direto: t, total: tt, mwh: comb * CB.pcl_kwh_por_kg };
    };
    const soma = (arr) => arr.reduce((a, x) => ({ voos: a.voos + x.voos, pax: a.pax + x.pax, comb: a.comb + x.comb, litros: a.litros + x.litros, direto: a.direto + x.direto, total: a.total + x.total, mwh: a.mwh + x.mwh }), { voos: 0, pax: 0, comb: 0, litros: 0, direto: 0, total: 0, mwh: 0 });
    const TT = totaisRota, TODAS = soma(ROT.map(TT));
    const num = (v) => (v >= 1e6 ? fmt(v / 1e6, 1) + " M" : v >= 1e4 ? fmt(Math.round(v / 1e3)) + tr(" mil", "k") : fmt(Math.round(v)));
    const ton = (v) => (v >= 1e6 ? fmt(v / 1e6, 1) + " Mt" : v >= 1e3 ? fmt(v / 1e3, 1) + " kt" : fmt(v, v >= 100 ? 0 : 1) + " t");
    const nomeAero = (iata, cid) => { const a = AER.get(iata); return a ? cidade(a) : cid; };
    const nomeRota = (r) => `${nomeAero(r.a, r.cidade_a)} (${r.a}) ⇄ ${nomeAero(r.b, r.cidade_b)} (${r.b})`;
    const rotuloRota = (r) => `${nomeAero(r.a, r.cidade_a)} (${r.a}) ⇄ ${nomeAero(r.b, r.cidade_b)} (${r.b}) · ${fmt(r.passageiros / 1e6, 1)} M ${tr("passageiros", "passengers")}`;
    const tpl = (arr) => arr.map((t) => `<div class="tile"><span class="v">${t[0]}${t[1] ? `<small>${t[1]}</small>` : ""}</span><span class="k">${t[2]}</span><span class="s">${t[3] || ""}</span></div>`).join("");
    document.getElementById("av-tot").innerHTML = tpl([
      [fmt(Math.round(TODAS.voos / 365)), tr("voos/dia", "flights/day"), tr(`em média, nas ${ROT.length} rotas de e para Portugal (${RT.meta.ano}), nos dois sentidos`, `on average, on the ${ROT.length} routes to and from Portugal (${RT.meta.ano}), both directions`), tr(`${num(TODAS.pax / 365)} passageiros por dia`, `${num(TODAS.pax / 365)} passengers a day`)],
      [fmt(Math.round(TODAS.comb / 365)), tr("t de combustível/dia", "t of fuel/day"), tr("estimativa da parte dos passageiros, no percurso completo destes voos", "estimate of the passengers' share, over the full journey of these flights"), tr(`${num(TODAS.litros / 365)} litros por dia; ${num(TODAS.comb / 12)} t por mês`, `${num(TODAS.litros / 365)} litres a day; ${num(TODAS.comb / 12)} t a month`)],
      [ton(TODAS.total), tr("CO₂e por ano", "CO₂e a year"), tr("com efeitos não-CO₂", "with non-CO₂ effects"), tr(`só emissões diretas: ${ton(TODAS.direto)}`, `direct emissions only: ${ton(TODAS.direto)}`)],
      [fmt(TODAS.mwh / casaMWh / 1e6, 1), tr("milhões de casas", "million homes"), tr("é quantas casas portuguesas se aqueceriam um ano com a energia deste combustível", "is how many Portuguese homes could be heated for a year with the energy in this fuel"), tr(`${(TODAS.mwh / aqTotalMWh).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}× o aquecimento de todas as casas`, `${(TODAS.mwh / aqTotalMWh).toLocaleString("en-GB", { maximumFractionDigits: 1 })}× the heating of all homes`)]
    ]);
    document.getElementById("rt-lista").innerHTML = ROT.map((r) => `<option value="${esc(rotuloRota(r))}"></option>`).join("");
    const achaRota = (txt) => {
      const m = (txt || "").match(/\(([A-Z0-9]{3,4})\)\s*⇄\s*.*\(([A-Z0-9]{3,4})\)/);
      return m ? ROT.find((r) => r.a === m[1] && r.b === m[2]) : null;
    };
    const rtIn = document.getElementById("rt-rota"), rtRes = document.getElementById("rt-res");
    const periodos = [[tr("Dia", "Day"), 365], [tr("Semana", "Week"), 365 / 7], [tr("Mês", "Month"), 12], [tr("Ano", "Year"), 1]];
    const rtCalc = () => {
      const r = achaRota(rtIn.value);
      if (!r) { rtRes.innerHTML = `<p class="av-vazio">${tr("Escolhe uma rota da lista para ver os totais.", "Pick a route from the list to see the totals.")}</p>`; return; }
      const t = TT(r), casas = t.mwh / casaMWh, pc = (t.mwh / aqTotalMWh) * 100;
      const linhas = periodos.map(([n, d]) => `<tr><th>${n}</th><td>${fmt(t.voos / d, d === 1 ? 0 : 1)}</td><td>${num(t.pax / d)}</td><td>${ton(t.comb / d)}</td><td>${num(t.litros / d)}</td><td>${ton(t.direto / d)}</td><td>${ton(t.total / d)}</td><td>${fmt(t.mwh / d, t.mwh / d >= 100 ? 0 : 1)}</td></tr>`).join("");
      rtRes.innerHTML = `
        <div class="av-rota"><strong>${esc(nomeRota(r))}</strong><span>${fmt(r.km)} km ${tr("em linha reta", "in a straight line")} · ${RT.meta.ano} · ${tr("passageiros e voos nos dois sentidos", "passengers and flights in both directions")}</span></div>
        <div class="tiles">${tpl([
          [fmt(t.voos / 365, 1), tr("voos/dia", "flights/day"), tr("em média, nos dois sentidos", "on average, both directions"), tr(`${fmt(t.voos)} voos em ${RT.meta.ano}`, `${fmt(t.voos)} flights in ${RT.meta.ano}`)],
          [fmt(Math.round(t.pax / t.voos)), tr("passageiros por voo", "passengers per flight"), (r.passageiros > r.lugares ? tr("registo de lugares incompleto (voos com escalas?)", "seat record incomplete (multi-stop flights?)") : tr(`${fmt((r.passageiros / r.lugares) * 100)}% dos lugares ocupados`, `${fmt((r.passageiros / r.lugares) * 100)}% of seats filled`)), tr(`${num(t.pax)} passageiros no ano`, `${num(t.pax)} passengers in the year`)],
          [ton(t.comb / 365), tr("de combustível por dia", "of fuel per day"), tr(`${num(t.litros / 365)} litros por dia`, `${num(t.litros / 365)} litres a day`), tr(`${ton(t.comb / 12)} por mês`, `${ton(t.comb / 12)} a month`)],
          [ton(t.total), tr("CO₂e por ano", "CO₂e a year"), tr("com efeitos não-CO₂", "with non-CO₂ effects"), tr(`só emissões diretas: ${ton(t.direto)}`, `direct emissions only: ${ton(t.direto)}`)]])}</div>
        <div class="tscroll full"><table><thead><tr><th></th><th>${tr("Voos", "Flights")}</th><th>${tr("Passageiros", "Passengers")}</th><th>${tr("Combustível", "Fuel")}</th><th>${tr("Litros", "Litres")}</th><th>${tr("CO₂e direto", "Direct CO₂e")}</th><th>${tr("CO₂e com não-CO₂", "CO₂e with non-CO₂")}</th><th>${tr("Energia (MWh)", "Energy (MWh)")}</th></tr></thead><tbody>${linhas}</tbody></table></div>
        <div class="av-signif"><strong>${tr("O que significa", "What it means")}</strong>
          <p>${tr(`Num ano, o combustível desta rota tem a energia de <strong>${fmt(t.mwh)} MWh</strong>. Uma casa portuguesa gasta em média ${fmt(casaMWh, 1)} MWh por ano em aquecimento (${AQ.ano}). Em energia, é o aquecimento de <strong>${num(casas)} casas</strong> durante um ano, ${fmt(pc, pc < 1 ? 2 : 1)}% de tudo o que as casas portuguesas gastam a aquecer-se.`, `In a year, the fuel on this route holds <strong>${fmt(t.mwh)} MWh</strong> of energy. A Portuguese home uses on average ${fmt(casaMWh, 1)} MWh a year for heating (${AQ.ano}). In energy terms, that is the heating of <strong>${num(casas)} homes</strong> for a year, ${fmt(pc, pc < 1 ? 2 : 1)}% of everything Portuguese homes use to heat themselves.`)}</p>
          <p class="av-nota">${tr("É uma equivalência de energia (o que o combustível contém), não de eficiência: uma casa não aquece com querosene.", "It is an energy equivalence (what the fuel contains), not an efficiency one: a home is not heated with jet fuel.")}</p></div>`;
    };
    rtIn.addEventListener("input", rtCalc);
    const rtChips = document.getElementById("rt-chips");
    ROT.slice(0, 8).forEach((r) => { const bt = document.createElement("button"); bt.type = "button"; bt.textContent = nomeRota(r); bt.addEventListener("click", () => { rtIn.value = rotuloRota(r); rtCalc(); }); rtChips.appendChild(bt); });
    rtIn.value = rotuloRota(ROT.find((r) => r.a === "LIS" && r.b === "LHR") || ROT[0]); rtCalc();
    legPilhas("rt-leg");
    const topo = ROT.map((r) => ({ r, t: TT(r) })).sort((a, b) => b.t.total - a.t.total).slice(0, 15);
    pilhas(document.getElementById("rt-graf"), topo.map(({ r, t }) => ({ l: nomeRota(r), direto: t.direto / 1000, total: t.total / 1000, t: fmt(t.total / 1000, 0) + " kt", td: fmt(t.direto / 1000, 0) + " kt", tt: fmt(t.total / 1000, 0) + " kt",
      tip: `<div class="r"><span>${tr("Voos por dia", "Flights per day")}</span><b>${fmt(t.voos / 365, 1)}</b></div><div class="r"><span>${tr("Passageiros", "Passengers")}</span><b>${num(t.pax)}</b></div><div class="r"><span>${tr("Combustível", "Fuel")}</span><b>${ton(t.comb)}</b></div><div class="r"><span>${tr("Só diretas", "Direct only")}</span><b>${ton(t.direto)}</b></div><div class="r"><span>${tr("Com não-CO₂", "With non-CO₂")}</span><b>${ton(t.total)}</b></div>` })), "kt");

    /* ---------- todos os recursos: combustível, NOx, ruído e terra (cada um na sua unidade, sem somar) ---------- */
    {
      const RN = D.recursos.ruido, CI = RC.combustivel_tj, NX = RC.nox_kt, EU = RN.europa, ano = RT.meta.ano;
      const ktDe = (tj) => tj / CB.pcl_gj_por_tonelada; // 1 TJ = 1000 GJ; dividido por GJ por tonelada dá toneladas; /1000 dá kt
      const totTJ = (y) => CI.internacional[y] + CI.domestica[y];
      // Verificação: combustível estimado pelas rotas (metade dos voos internacionais parte de Portugal; os internos contam todos).
      const estTJ = ROT.reduce((a, r) => a + TT(r).mwh * 0.0036 * (r.interna ? 1 : 0.5), 0);
      const dif = (estTJ / totTJ(ano) - 1) * 100;
      const aC = Object.keys(CI.internacional).map(Number).sort((a, b) => a - b);
      const aN = Object.keys(NX.aviacao).map(Number).sort((a, b) => a - b), n0 = aN[0], ny = aN.at(-1);
      const noxQ = (y) => (NX.aviacao[y] / NX.total[y]) * 100;
      const L = RN.aeroportos.find((a) => a.iata === "LIS"), P = RN.aeroportos.find((a) => a.iata === "OPO");
      const srcs = (...ix) => ix.map((i) => `<a href="${D.fontes[i].url}" target="_blank" rel="noopener">${esc(D.fontes[i].curto ? tr(D.fontes[i].curto, D.fontes[i].curto_en) : tr(D.fontes[i].nome, D.fontes[i].nome_en).split(" — ")[0].split(" (")[0])} ↗</a>`).join(" · ");
      const rec = (dim, valor, unid, txt, nota, fonte, lacuna) => `<article class="rec${lacuna ? " lacuna" : ""}"><small>${dim}</small><strong>${valor}${unid ? `<em>${unid}</em>` : ""}</strong><p>${txt}</p>${nota ? `<p class="rec-nota">${nota}</p>` : ""}${fonte ? `<span class="rec-fonte">${tr("Fonte: ", "Source: ")}${srcs(...fonte)}</span>` : ""}</article>`;
      const mil = (v) => fmt(Math.round(v / 1000));
      const ruido = (A, nomePt, nomeEn, aero) => rec(tr("Ruído · " + nomePt, "Noise · " + nomeEn), fmt(A.residentes_55), tr("residentes (estimativa)", "residents (estimate)"),
        tr(`viviam em ${RN.ano} onde o ruído dos aviões do aeroporto ${aero} passava os 55 dB (Lden), numa área de ${A.area_55_km2} km²; ${fmt(A.residentes_65)} acima de 65 dB.`, `lived in ${RN.ano} where aircraft noise from ${aero} airport exceeded 55 dB (Lden), over an area of ${A.area_55_km2} km²; ${fmt(A.residentes_65)} above 65 dB.`),
        tr(`O Lden é o nível de ruído médio de 24 horas, com um reforço para o fim da tarde e a noite. ${RN.ano} ainda foi marcado pela pandemia, com menos voos (cerca de ${mil(A.movimentos_2021)} mil movimentos simulados, contra ${mil(A.movimentos_2016)} mil no mapa de 2016): num ano normal os números podem ser maiores.`, `Lden is the 24-hour average noise level, with an extra weight for the evening and night. ${RN.ano} was still marked by the pandemic, with fewer flights (about ${mil(A.movimentos_2021)} thousand simulated movements, against ${mil(A.movimentos_2016)} thousand in the 2016 map): in a normal year the numbers may be higher.`), [A === L ? 12 : 13]);
      document.getElementById("av-rec").innerHTML = [
        rec(tr("Combustível", "Fuel"), fmt(ktDe(totTJ(ano)) / 1000, 2), tr("Mt de querosene", "Mt of jet fuel"),
          tr(`de querosene de aviação foram fornecidos em Portugal em ${ano}, para voos ao estrangeiro e para voos dentro do país: cerca de ${fmt(Math.round(ktDe(totTJ(ano)) * 1000 / 365 / 100) * 100)} toneladas por dia (${fmt(totTJ(ano) / 1000, 0)} mil TJ).`, `of jet fuel were supplied in Portugal in ${ano}, for flights abroad and flights within the country: about ${fmt(Math.round(ktDe(totTJ(ano)) * 1000 / 365 / 100) * 100)} tonnes a day (${fmt(totTJ(ano) / 1000, 0)} thousand TJ).`),
          tr(`Confere com a estimativa por rotas de «Voos reais» (metade dos voos internacionais, que partem de Portugal, mais os voos internos): ${fmt(estTJ / 1000, 0)} mil TJ, ${fmt(Math.abs(dif), 1)}% ${dif < 0 ? "abaixo" : "acima"} do Eurostat. A estimativa deixa de fora a carga.`, `Matches the route-based estimate in “Real flights” (half of the international flights, which depart from Portugal, plus domestic flights): ${fmt(estTJ / 1000, 0)} thousand TJ, ${fmt(Math.abs(dif), 1)}% ${dif < 0 ? "below" : "above"} Eurostat. The estimate leaves out cargo.`), [11, 2]),
        rec("NOx", fmt(NX.aviacao[ny], 0), tr("kt de óxidos de azoto", "kt of nitrogen oxides"),
          tr(`emitiram as empresas de transporte aéreo residentes em Portugal em ${ny}: ${fmt(noxQ(ny), 0)}% de todo o NOx do país (${fmt(NX.total[ny], 0)} kt).`, `were emitted by air transport companies resident in Portugal in ${ny}: ${fmt(noxQ(ny), 0)}% of all NOx in the country (${fmt(NX.total[ny], 0)} kt).`),
          tr(`Em ${n0} eram ${fmt(NX.aviacao[n0], 0)} kt (${fmt(noxQ(n0), 0)}% do total); entretanto o NOx do país desceu ${fmt((1 - NX.total[ny] / NX.total[n0]) * 100, 0)}%. Segundo a AESA, o NOx e as partículas dos motores pioram a qualidade do ar junto dos aeroportos, e na aviação europeia o NOx cresce mais depressa do que o CO₂ desde 2005. A conta do Eurostat segue as empresas residentes onde quer que voem: não é só o que se respira à volta dos aeroportos.`, `In ${n0} it was ${fmt(NX.aviacao[n0], 0)} kt (${fmt(noxQ(n0), 0)}% of the total); meanwhile the country's NOx fell by ${fmt((1 - NX.total[ny] / NX.total[n0]) * 100, 0)}%. According to EASA, NOx and particles from engines worsen air quality near airports, and in European aviation NOx has grown faster than CO₂ since 2005. Eurostat's account follows resident companies wherever they fly: it is not only what is breathed around airports.`), [4, 14]),
        ruido(L, "Lisboa", "Lisbon", "Humberto Delgado"),
        ruido(P, "Porto", "Porto", "Francisco Sá Carneiro"),
        rec(tr("Ruído · Europa", "Noise · Europe"), fmt(EU.pessoas_55_2023_milhoes, 1), tr("milhões de pessoas", "million people"),
          tr(`viviam em 2023 dentro dos contornos de 55 dB (Lden) dos ${EU.aeroportos} principais aeroportos europeus (${fmt(EU.pessoas_55_2019_milhoes, 1)} milhões em 2019; ${fmt(EU.pessoas_55_2005_milhoes, 2)} em 2005).`, `lived in 2023 within the 55 dB (Lden) contours of Europe's ${EU.aeroportos} main airports (${fmt(EU.pessoas_55_2019_milhoes, 1)} million in 2019; ${fmt(EU.pessoas_55_2005_milhoes, 2)} in 2005).`),
          tr(`Segundo o mesmo relatório, os dados da Diretiva Ruído Ambiente de 2022 indicam ${fmt(EU.incomodadas)} pessoas com elevado incómodo e ${fmt(EU.sono)} com perturbação significativa do sono por causa do ruído dos aviões. O método e o âmbito são outros: não se somam nem se comparam com os mapas de Lisboa e do Porto.`, `According to the same report, 2022 Environmental Noise Directive data indicate ${fmt(EU.incomodadas)} people highly annoyed and ${fmt(EU.sono)} with significant sleep disturbance because of aircraft noise. The method and scope differ: they are not added to or compared with the Lisbon and Porto maps.`), [14]),
        rec(tr("Terra", "Land"), tr("Sem dado", "No data"), "",
          tr(`Sem número aberto: a área que os aeroportos portugueses ocupam não está publicada numa fonte que se possa citar. O mais próximo é a área dentro da linha dos 55 dB (${L.area_55_km2} km² em Lisboa e ${P.area_55_km2} km² no Porto), mas essa mede o ruído, não a terra ocupada.`, `No open number: the area the Portuguese airports occupy is not published in a source that can be cited. The closest is the area inside the 55 dB line (${L.area_55_km2} km² in Lisbon and ${P.area_55_km2} km² in Porto), but that measures noise, not the land taken.`), "", [12, 13], true)
      ].join("");
      const COR_I = "#2a78d6";
      legend(document.getElementById("av-leg-comb"), [{ n: tr("Abastecido para voos ao estrangeiro", "Taken on for flights abroad"), c: COR_D }, { n: tr("Voos dentro do país", "Flights within the country"), c: COR_I }]);
      line(document.getElementById("av-rc-comb"), { x: aC, series: [{ n: tr("Voos ao estrangeiro", "Flights abroad"), c: COR_D, v: aC.map((y) => ktDe(CI.internacional[y])) }, { n: tr("Voos dentro do país", "Flights within the country"), c: COR_I, v: aC.map((y) => ktDe(CI.domestica[y])) }], zero: true, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0) + " kt", aria: tr("Querosene fornecido em Portugal", "Jet fuel supplied in Portugal"), table: true, tableEvery: 5 });
      line(document.getElementById("av-rc-nox"), { x: aN, series: [{ n: tr("NOx da aviação (kt)", "Aviation NOx (kt)"), c: COR_D, v: aN.map((y) => NX.aviacao[y]) }], zero: true, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " kt", aria: tr("NOx da aviação em Portugal", "Aviation NOx in Portugal"), table: true, tableEvery: 5 });
    }

    /* ---------- linha do tempo ---------- */
    const mw = TM.mundo, tg = TM.temperatura_global, qc = TM.quota_co2_aviacao_pct, ptT = TM.portugal;
    const aA = Object.keys(mw.passageiros).map(Number).sort((a, b) => a - b), a0 = aA[0], a1 = aA.at(-1);
    const idx = (o) => aA.map((y) => (o[y] / o[a0]) * 100);
    const media = (o, de, ate) => { const v = []; for (let y = de; y <= ate; y++) if (o[y] != null) v.push(o[y]); return v.reduce((a, b) => a + b, 0) / v.length; };
    const yT1 = Math.max(...Object.keys(tg).map(Number));
    const subida = media(tg, yT1 - 4, yT1) - media(tg, a0, a0 + 4);
    const aT = Object.keys(tg).map(Number).filter((y) => y >= a0).sort((a, b) => a - b);
    const aQ = Object.keys(qc).map(Number).sort((a, b) => a - b), aP = Object.keys(ptT).map(Number).sort((a, b) => a - b);
    document.getElementById("tp-txt").innerHTML = tr(
      `Desde ${a0}, as partidas de voos no mundo multiplicaram-se por <strong>${fmt(mw.partidas[a1] / mw.partidas[a0], 1)}</strong> e os passageiros por <strong>${fmt(mw.passageiros[a1] / mw.passageiros[a0], 1)}</strong> (até ${a1}); cada voo leva, em média, mais passageiros. No mesmo período, a temperatura global subiu cerca de <strong>${fmt(subida, 1)} °C</strong> (média de ${yT1 - 4}–${yT1} contra ${a0}–${a0 + 4}). Em Portugal, o número de rotas nos aeroportos principais passou de <strong>${ptT[aP[0]].rotas}</strong> em ${aP[0]} para <strong>${ptT[2019].rotas}</strong> em 2019, caiu para ${ptT[2020].rotas} em 2020 e chegou a <strong>${ptT[aP.at(-1)].rotas}</strong> em ${aP.at(-1)}.`,
      `Since ${a0}, flight departures worldwide have multiplied by <strong>${fmt(mw.partidas[a1] / mw.partidas[a0], 1)}</strong> and passengers by <strong>${fmt(mw.passageiros[a1] / mw.passageiros[a0], 1)}</strong> (to ${a1}); each flight carries more passengers on average. Over the same period, global temperature rose by about <strong>${fmt(subida, 1)} °C</strong> (average of ${yT1 - 4}–${yT1} against ${a0}–${a0 + 4}). In Portugal, the number of routes at the main airports went from <strong>${ptT[aP[0]].rotas}</strong> in ${aP[0]} to <strong>${ptT[2019].rotas}</strong> in 2019, fell to ${ptT[2020].rotas} in 2020 and reached <strong>${ptT[aP.at(-1)].rotas}</strong> in ${aP.at(-1)}.`);
    document.getElementById("tp-aviso").innerHTML = tr(
      `<strong>Mas as duas curvas a subir não provam que uma causou a outra</strong>: quaisquer duas séries que crescem ao longo do tempo parecem ligadas. A aviação pesa cerca de <strong>${fmt(qc[2019], 1)}%</strong> do CO₂ mundial (2019, contra ${fmt(qc[1940], 1)}% em 1940) e é responsável por cerca de <strong>4% do aquecimento</strong> até hoje (Klöwer et al., 2021, citado pela Our World in Data). O resto vem sobretudo da queima de combustíveis fósseis em geral. Estes gráficos servem para ver as escalas, não para atribuir causa.`,
      `<strong>But two rising curves do not prove that one caused the other</strong>: any two series that grow over time look linked. Aviation accounts for about <strong>${fmt(qc[2019], 1)}%</strong> of world CO₂ (2019, against ${fmt(qc[1940], 1)}% in 1940) and for about <strong>4% of warming</strong> to date (Klöwer et al., 2021, cited by Our World in Data). The rest comes mostly from burning fossil fuels in general. These charts are for seeing scales, not for assigning cause.`);
    legend(document.getElementById("tp-leg-a"), [{ n: tr("Partidas de voos", "Flight departures"), c: COR_D }, { n: tr("Passageiros", "Passengers"), c: "#2a78d6" }]);
    line(document.getElementById("tp-a"), { x: aA, series: [{ n: tr("Partidas de voos", "Flight departures"), c: COR_D, v: idx(mw.partidas) }, { n: tr("Passageiros", "Passengers"), c: "#2a78d6", v: idx(mw.passageiros) }], zero: false, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0), aria: tr("Índice de voos e passageiros", "Index of flights and passengers"), table: true, tableEvery: 10 });
    line(document.getElementById("tp-b"), { x: aT, series: [{ n: tr("Anomalia (°C)", "Anomaly (°C)"), c: "#a43a32", v: aT.map((y) => tg[y]) }], zero: true, yf: (v) => fmt(v, 1), tf: (se, i) => fmt(se.v[i], 2) + " °C", aria: tr("Temperatura global", "Global temperature"), table: true, tableEvery: 10 });
    line(document.getElementById("tp-c"), { x: aQ, series: [{ n: tr("Quota da aviação (%)", "Aviation share (%)"), c: COR_D, v: aQ.map((y) => qc[y]) }], zero: true, yf: (v) => fmt(v, 1) + "%", tf: (se, i) => fmt(se.v[i], 2) + "%", aria: tr("Quota da aviação no CO₂", "Aviation share of CO₂"), table: true, tableEvery: 10 });
    line(document.getElementById("tp-d"), { x: aP, series: [{ n: tr("Rotas com passageiros", "Routes with passengers"), c: "#1baf7a", v: aP.map((y) => ptT[y].rotas) }], zero: true, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0) + tr(" rotas", " routes"), aria: tr("Rotas em Portugal", "Routes in Portugal"), table: true, tableEvery: 5 });

    /* ---------- calculadora ---------- */
    const de = document.getElementById("av-de"), para = document.getElementById("av-para"), res = document.getElementById("av-res");
    const nIn = document.getElementById("av-n"), idaBox = document.getElementById("av-ida");
    let ida = 1;
    const achar = (txt) => {
      const t = (txt || "").trim(); if (!t) return null;
      const m = t.match(/\(([A-Z]{3})\)/) || t.match(/^([A-Za-z]{3})$/);
      return m ? AER.get(m[1].toUpperCase()) || null : null;
    };
    const calcular = () => {
      const A = achar(de.value), B = achar(para.value);
      if (!A || !B) { res.innerHTML = `<p class="av-vazio">${tr("Escolhe os dois aeroportos na lista para ver a estimativa.", "Pick both airports from the list to see the estimate.")}</p>`; return; }
      if (A === B) { res.innerHTML = `<p class="av-vazio">${tr("A partida e a chegada são o mesmo aeroporto.", "Departure and arrival are the same airport.")}</p>`; return; }
      const cls = CL.media, n = Math.max(1, Math.min(100, Math.round(+nIn.value) || 1));
      const km = gcd([A[ix.lat], A[ix.lon]], [B[ix.lat], B[ix.lon]]), v = viagem(km, cls), troços = ida;
      const porViagem = { d: v.direto * troços, t: v.total * troços };
      const anual = { d: porViagem.d * n, t: porViagem.t * n };
      const perto = A[ix.continente] === "EU" && B[ix.continente] === "EU" && km <= 2000;
      const comboio = perto ? km * F.comboio_internacional * troços : null;
      res.innerHTML = `
        <div class="av-rota"><strong>${esc(cidade(A))} (${A[ix.iata]}) → ${esc(cidade(B))} (${B[ix.iata]})</strong><span>${esc(pais(A))} → ${esc(pais(B))} · ${fmt(Math.round(km))} km ${tr("em linha reta", "in a straight line")}${troços === 2 ? tr(" · ida e volta: " + fmt(Math.round(km * 2)) + " km", " · round trip: " + fmt(Math.round(km * 2)) + " km") : ""}</span></div>
        <div class="tiles">
          <div class="tile"><span class="v">${kgTxt(porViagem.d)}<small>CO₂e</small></span><span class="k">${tr("só emissões diretas", "direct emissions only")}</span><span class="s">${fmt(Math.round(km))} km × ${fmt(cls.direto * 1000, 0)} g/pkm${troços === 2 ? " × 2" : ""}</span></div>
          <div class="tile"><span class="v">${kgTxt(porViagem.t)}<small>CO₂e</small></span><span class="k">${tr("com efeitos não-CO₂", "with non-CO₂ effects")}</span><span class="s">${fmt(Math.round(km))} km × ${fmt(cls.total * 1000, 0)} g/pkm${troços === 2 ? " × 2" : ""}</span></div>
          <div class="tile"><span class="v">${n > 1 ? kgTxt(anual.t) : kgTxt(porViagem.t)}<small>CO₂e</small></span><span class="k">${n > 1 ? tr(n + " viagens por ano, com efeitos não-CO₂", n + " trips a year, with non-CO₂ effects") : tr("uma viagem por ano", "one trip a year")}</span><span class="s">${n > 1 ? tr("só diretas: ", "direct only: ") + kgTxt(anual.d) : tr("ajusta as viagens por ano", "adjust trips per year")}</span></div>
          ${comboio != null ? `<div class="tile"><span class="v">${kgTxt(comboio)}<small>CO₂e</small></span><span class="k">${tr("a mesma distância de comboio internacional", "same distance by international rail")}</span><span class="s">${tr("referência britânica, ", "UK reference, ")}${fmt(comboio / porViagem.t * 100, 0)}${tr("% do voo com não-CO₂", "% of the flight with non-CO₂")}</span></div>` : ""}
        </div>
        <p class="av-nota">${tr("Estimativa por passageiro: o valor de um voo concreto depende do avião, da ocupação e da rota efetiva. O intervalo vai das emissões diretas à soma com os efeitos não-CO₂.", "Per-passenger estimate: the value of a specific flight depends on the aircraft, load factor and actual route. The range runs from direct emissions to the sum with non-CO₂ effects.")}</p>`;
    };
    [de, para, nIn].forEach((x) => x.addEventListener("input", calcular));
    seg(idaBox, (v) => { ida = +v; calcular(); });
    const chips = document.getElementById("av-chips");
    D.rotas.forEach(([a, b]) => {
      const A = AER.get(a), B = AER.get(b);
      const bt = document.createElement("button"); bt.type = "button"; bt.textContent = `${cidade(A)}–${cidade(B)}`;
      bt.addEventListener("click", () => { de.value = rotulo(A); para.value = rotulo(B); calcular(); });
      chips.appendChild(bt);
    });
    de.value = rotulo(AER.get("LIS")); para.value = rotulo(AER.get("JFK")); calcular();
  }
})();
