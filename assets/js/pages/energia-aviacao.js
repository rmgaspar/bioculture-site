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
  fetch("/sidebar-content.html?v=24").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=13"; document.body.appendChild(el); };
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

  Promise.all([get("/data/aviacao.json?v=2"), get("/data/aviacao-portugal.json?v=1"), get("/data/aeroportos.json?v=1"), get("/data/noticias.json").catch(() => []), get("/data/aviacao-rotas-portugal.json?v=1")])
    .then(([D, PT, AE, NEWS, RT]) => { build(D, PT, AE, RT); atualidade(NEWS); barraFixa(); irParaHash(); })
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

  function build(D, PT, AE, RT) {
    const cols = AE.meta.campos, ix = Object.fromEntries(cols.map((c, i) => [c, i]));
    const AER = new Map(AE.aeroportos.map((a) => [a[ix.iata], a]));
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
    <p>${tr("A aviação pesa cerca de <strong>2,5% do CO₂ mundial</strong> e só cerca de <strong>10% das pessoas voa</strong> num ano típico. Por isso o número que mais diz é o de cada viagem: vale a pena ver o valor de cada rota, em vez de falar da aviação em abstrato.", "Aviation accounts for about <strong>2.5% of world CO₂</strong> and only about <strong>10% of people fly</strong> in a typical year. That is why the number that says most is the one for each trip: it is worth seeing the value for each route instead of talking about aviation in the abstract.")}</p>
    <p>${tr("Os números que se seguem são <strong>estimativas por passageiro</strong>, com a incerteza à vista: a classe do bilhete e os efeitos que não são CO₂ mudam muito o resultado.", "The numbers below are <strong>per-passenger estimates</strong> with the uncertainty in plain sight: the ticket class and the non-CO₂ effects change the result a lot.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLink("owid")} · ${srcLink("lee2021")}</p>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("1 · A tua viagem", "1 · Your trip")}</span><h2>${tr("Quanto CO₂ cabe numa viagem?", "How much CO₂ is in a trip?")}</h2></div>
  <div class="prose"><p>${tr("Escolhe o aeroporto de partida e o de chegada, em qualquer parte do mundo. A estimativa é <strong>distância × fator por passageiro e quilómetro</strong>, e o fator já inclui o desvio das rotas reais face à linha reta.", "Choose the departure and arrival airports anywhere in the world. The estimate is <strong>distance × factor per passenger-kilometre</strong>, and the factor already includes the detour of real routes compared with a straight line.")}</p></div>
  <figure class="calc">
    <figcaption><span class="t">${tr("Calculadora de rota", "Route calculator")}</span><span class="d">${tr("Escreve a cidade ou o código IATA (por exemplo, Lisboa ou LIS) e escolhe na lista.", "Type the city or IATA code (for example, Lisbon or LIS) and pick from the list.")}</span></figcaption>
    <div class="calc-form">
      <label>${tr("De", "From")}<input id="av-de" list="av-lista" autocomplete="off" spellcheck="false" placeholder="${tr("Cidade ou código IATA", "City or IATA code")}"></label>
      <label>${tr("Para", "To")}<input id="av-para" list="av-lista" autocomplete="off" spellcheck="false" placeholder="${tr("Cidade ou código IATA", "City or IATA code")}"></label>
      <label>${tr("Classe", "Class")}<select id="av-classe">${["economica", "premium", "executiva", "primeira"].map((k) => `<option value="${k}"${k === "economica" ? " selected" : ""}>${tr(CL[k].pt, CL[k].en)}</option>`).join("")}</select></label>
      <label>${tr("Viagens por ano", "Trips per year")}<input id="av-n" type="number" min="1" max="100" value="1" inputmode="numeric"></label>
      <div class="seg" id="av-ida" role="group" aria-label="${tr("Tipo de viagem", "Trip type")}"><button aria-pressed="true" data-v="1">${tr("Só ida", "One way")}</button><button aria-pressed="false" data-v="2">${tr("Ida e volta", "Round trip")}</button></div>
      <datalist id="av-lista">${AE.aeroportos.map((a) => `<option value="${esc(rotulo(a))}"></option>`).join("")}</datalist>
    </div>
    <div class="chips" id="av-chips"><span>${tr("Exemplos:", "Examples:")}</span></div>
    <div id="av-res" aria-live="polite"></div>
    <div class="src"><span>${tr("Fatores: DESNZ 2025, voos entre aeroportos fora do Reino Unido. Aeroportos: OurAirports.", "Factors: DESNZ 2025, flights between non-UK airports. Airports: OurAirports.")}</span></div>
  </figure>
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

<section id="rotas">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Rotas de exemplo", "3 · Example routes")}</span><h2>${tr("A distância manda, mas não explica tudo", "Distance rules, but it does not explain everything")}</h2></div>
  <div class="prose"><p id="av-rotas-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("CO₂ por passageiro em classe económica, rotas de exemplo", "CO₂ per economy-class passenger, example routes")}</span><span class="d">${tr("Só ida, kg de CO₂e. A barra escura é a estimativa só com emissões diretas; a clara é o que se soma com os efeitos não-CO₂.", "One way, kg of CO₂e. The dark bar is the estimate with direct emissions only; the light one is what is added by non-CO₂ effects.")}</span></figcaption>
    <div class="legend" id="av-leg-rotas"></div>
    <div class="chart" id="av-rotas"></div>
    <div class="src"><span>${tr("Fonte: cálculo bioCulture com fatores DESNZ 2025 e coordenadas OurAirports; as rotas são exemplos, não as mais movimentadas.", "Source: bioCulture calculation with DESNZ 2025 factors and OurAirports coordinates; the routes are examples, not the busiest.")}</span></div>
  </figure>
</section>

<section id="classes">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Classe de bilhete", "4 · Ticket class")}</span><h2>${tr("Quanto espaço ocupas, tanto pesas", "The more space you take, the more you weigh")}</h2></div>
  <div class="prose"><p id="av-classes-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Gramas de CO₂e por passageiro e quilómetro, por classe", "Grams of CO₂e per passenger-kilometre, by class")}</span><span class="d">${tr("O avião emite o mesmo; muda a parte que é atribuída a cada passageiro, conforme o espaço que ocupa na cabine.", "The aircraft emits the same; what changes is the share assigned to each passenger, according to the cabin space they take.")}</span></figcaption>
    <div class="legend" id="av-leg-classes"></div>
    <div class="chart" id="av-classes"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «International, to/from non-UK». Os fatores por classe repartem as emissões pela área que cada passageiro ocupa.", "Source: DESNZ 2025, “International, to/from non-UK”. Class factors split emissions by the area each passenger takes.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Portugal", "5 · Portugal")}</span><h2>${tr("O transporte aéreo português em 30 anos", "Portuguese air transport over 30 years")}</h2></div>
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

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("6 · Limites e fontes", "6 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
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
      tr("<strong>É uma estimativa por passageiro, não a medição de um voo.</strong> O fator é uma média: a DESNZ calcula-o para voos entre aeroportos fora do Reino Unido, juntando voos curtos e longos. O consumo real depende do avião, da ocupação, da rota efetivamente voada e de haver escalas.", "<strong>It is a per-passenger estimate, not a measurement of a flight.</strong> The factor is an average: DESNZ calculates it for flights between airports outside the UK, pooling short and long flights. Real consumption depends on the aircraft, load factor, route actually flown and whether there are stopovers."),
      tr("<strong>Os efeitos não-CO₂ são incertos.</strong> Rastos de condensação, óxidos de azoto e vapor de água aquecem o clima, mas a dimensão exata ainda é discutida. Por isso mostramos sempre um intervalo: só emissões diretas, e com +70% aplicado ao CO₂, como recomenda a DESNZ.", "<strong>Non-CO₂ effects are uncertain.</strong> Contrails, nitrogen oxides and water vapour warm the climate, but the exact size is still debated. That is why we always show a range: direct emissions only, and with +70% applied to the CO₂, as DESNZ recommends."),
      tr("<strong>Comparação com o comboio.</strong> Quando o destino está na Europa e a menos de 2 000 km, mostramos o fator de comboio internacional da DESNZ como referência. Não significa que exista uma ligação ferroviária direta, e o comboio português pode ter um valor diferente.", "<strong>Comparison with rail.</strong> When the destination is in Europe and under 2,000 km away, we show DESNZ's international rail factor as a reference. It does not mean a direct rail link exists, and Portuguese rail may have a different value."),
      tr("<strong>Voos reais: é uma estimativa, não o combustível medido.</strong> Os voos e passageiros são do Eurostat (aeroportos principais de Portugal e seus parceiros, 2024, nos dois sentidos, voos comerciais de passageiros de todas as companhias; as rotas entre aeroportos portugueses aparecem duas vezes e levam a média). O combustível e o CO₂e saem da distância em linha reta e do fator médio por passageiro da DESNZ, e incluem o percurso completo, também a parte fora de Portugal; o consumo real depende do avião, da ocupação e da rota efetivamente voada.", "<strong>Real flights: an estimate, not measured fuel.</strong> Flights and passengers are from Eurostat (main Portuguese airports and their partners, 2024, both directions, commercial passenger flights of all airlines; routes between Portuguese airports appear twice and are averaged). Fuel and CO₂e come from the straight-line distance and DESNZ's average per-passenger factor, and include the full journey, also the part outside Portugal; real consumption depends on the aircraft, load factor and route actually flown."),
      tr("<strong>A equivalência com o aquecimento.</strong> Compara a energia que o querosene contém com a energia que as casas portuguesas gastam em aquecimento do espaço (Eurostat: 35 mil TJ em 2024, para 4,5 milhões de casas). Em Portugal esse consumo é baixo, por causa do clima ameno e de se aquecer pouco as casas, o que faz as rotas parecerem enormes. Uma casa não aquece com querosene: é só para dar escala.", "<strong>The heating equivalence.</strong> It compares the energy that jet fuel contains with the energy Portuguese homes use for space heating (Eurostat: 35 thousand TJ in 2024, for 4.5 million homes). In Portugal that consumption is low, because of the mild climate and because homes are little heated, which makes the routes look enormous. A home is not heated with jet fuel: it is only to give scale."),
      tr("<strong>Quantos aviões passam sobre uma região?</strong> Esta página não o diz. Não usamos contagens de serviços de rastreio comerciais e não encontrámos uma contagem aberta e citável para o espaço aéreo do Centro de Portugal. E sobrevoar não é emitir «ali»: a emissão pertence a quem abastece e voa, e os inventários nacionais seguem em geral o combustível abastecido no país.", "<strong>How many aircraft cross a region?</strong> This page does not say. We do not use counts from commercial tracking services and we did not find an open, citable count for the airspace over central Portugal. And overflying is not emitting “there”: emissions belong to whoever takes on fuel and flies, and national inventories generally follow fuel taken on in the country."),
      tr("<strong>Aeroportos.</strong> A lista (OurAirports) tem os aeroportos com serviço regular e código IATA; pode ter atrasos ou omissões. Os totais mundiais citados são de 2019 (e de 2018 nos efeitos não-CO₂), os anos mais recentes que as fontes citadas cobrem.", "<strong>Airports.</strong> The list (OurAirports) has airports with scheduled service and an IATA code; it may lag or have omissions. World totals cited are for 2019 (and 2018 for non-CO₂ effects), the most recent years the cited sources cover."),
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
    const CB = D.combustivel, MED = CL.media, AQ = RT.aquecimento, ROT = RT.rotas;
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
    const nomeRota = (r) => `${nomeAero(r.a, r.cidade_a)} ⇄ ${nomeAero(r.b, r.cidade_b)}`;
    const rotuloRota = (r) => `${nomeAero(r.a, r.cidade_a)} (${r.a}) ⇄ ${nomeAero(r.b, r.cidade_b)} (${r.b}) · ${fmt(r.passageiros / 1e6, 1)} M ${tr("passageiros", "passengers")}`;
    const tpl = (arr) => arr.map((t) => `<div class="tile"><span class="v">${t[0]}${t[1] ? `<small>${t[1]}</small>` : ""}</span><span class="k">${t[2]}</span><span class="s">${t[3] || ""}</span></div>`).join("");
    document.getElementById("av-tot").innerHTML = tpl([
      [fmt(Math.round(TODAS.voos / 365)), tr("voos/dia", "flights/day"), tr(`em média, nas ${ROT.length} rotas de e para Portugal (${RT.meta.ano}), nos dois sentidos`, `on average, on the ${ROT.length} routes to and from Portugal (${RT.meta.ano}), both directions`), tr(`${num(TODAS.pax / 365)} passageiros por dia`, `${num(TODAS.pax / 365)} passengers a day`)],
      [fmt(Math.round(TODAS.comb / 365)), tr("t de combustível/dia", "t of fuel/day"), tr("estimativa para o percurso completo destes voos", "estimate for the full journey of these flights"), tr(`${num(TODAS.litros / 365)} litros por dia; ${num(TODAS.comb / 12)} t por mês`, `${num(TODAS.litros / 365)} litres a day; ${num(TODAS.comb / 12)} t a month`)],
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

    /* ---------- calculadora ---------- */
    const de = document.getElementById("av-de"), para = document.getElementById("av-para"), res = document.getElementById("av-res");
    const sel = document.getElementById("av-classe"), nIn = document.getElementById("av-n"), idaBox = document.getElementById("av-ida");
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
      const cls = CL[sel.value], n = Math.max(1, Math.min(100, Math.round(+nIn.value) || 1));
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
    sel.addEventListener("change", calcular);
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
