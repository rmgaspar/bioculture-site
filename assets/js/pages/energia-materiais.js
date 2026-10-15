/* Vetores de pressão · Ambiente construído e Moda e têxteis.
   Uma só página-modelo, escolhida por <body data-vetor="construcao|moda">:
     construção  /data/ambiente-construido.json  + /data/ambiente-construido-portugal.json
     moda        /data/moda-texteis.json         + /data/moda-texteis-portugal.json
   Os ficheiros «-portugal» são gerados por scripts/dados/construcao_textil.py (Eurostat). Os fatores por tonelada de
   material são da DESNZ 2025 («Material use», berço ao portão). Gráficos: assets/js/biocultura-graficos.js.
   Os números do texto vêm dos dados; nada se escreve à mão. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-vetor");
  const VETOR = document.body.dataset.vetor;
  if (!G || !box || !["construcao", "moda"].includes(VETOR)) return;
  const { EN, tr, fmt, esc, css, line, legend, seg, showTip, hideTip, tableView } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    if (document.body.dataset.tituloEn) document.title = document.body.dataset.tituloEn;
  }
  fetch("/sidebar-content.html?v=24").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=13"; document.body.appendChild(el); };
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });
  const FICH = VETOR === "construcao" ? ["ambiente-construido", "ambiente-construido-portugal"] : ["moda-texteis", "moda-texteis-portugal"];

  Promise.all([get(`/data/${FICH[0]}.json?v=1`), get(`/data/${FICH[1]}.json?v=1`)])
    .then(([D, PT]) => { build(D, PT); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });

  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  const kgTxt = (kg) => (Math.abs(kg) >= 1000 ? fmt(kg / 1000, 1) + " t" : kg >= 10 ? fmt(Math.round(kg)) + " kg" : fmt(kg, 1) + " kg");
  const mt = (kt, d = 1) => fmt(kt / 1000, d);
  const pct = (v, d = 0) => fmt(v, d) + "%";

  function build(D, PT) {
    const FONTES = D.fontes, M = D.materiais;
    const nome = (m) => tr(m.pt, m.en);
    const srcLinks = (...ix) => ix.map((i) => `<a href="${FONTES[i].url}" target="_blank" rel="noopener">${esc(tr(FONTES[i].nome, FONTES[i].nome_en).split(" — ")[0].split(" (")[0])} ↗</a>`).join(" · ");
    const anosDe = (obj) => Object.keys(obj).map(Number).sort((a, b) => a - b);
    const S = PT.co2_kt, tot = S.total_economia_familias;
    const y0 = 2019, y1 = Math.max(...anosDe(tot));
    const anos = anosDe(tot);
    const lin = (id, series, o = {}) => line(document.getElementById(id), Object.assign({ x: o.x || anos, series, zero: true, aria: series.map((s) => s.n).join(", "), table: true, tableEvery: o.tableEvery || 5 }, o));
    const COR = { a: css("--s2") || "#eb6834", b: css("--s1") || "#2a78d6", c: css("--s3") || "#1baf7a" };
    const COR_D = COR.a, COR_N = "#f4c4b0";
    const tiles = (arr) => arr.map((t) => `<div class="tile"><span class="v">${t[0]}${t[1] ? `<small>${t[1]}</small>` : ""}</span><span class="k">${t[2]}</span><span class="s">${t[3] || ""}</span></div>`).join("");
    const mundoTile = (m) => [m.valor, m.unidade, tr(m.pt, m.en), tr(m.nota_pt, m.nota_en)];

    /* ---------- barras empilhadas: o que fica com material reutilizado/reciclado + o que se poupa ---------- */
    const melhor = (m) => (m.reutilizado != null ? m.reutilizado : m.reciclado);
    function pilhas(el, itens, uni) {
      const max = Math.max(...itens.map((m) => m.primaria));
      el.className = "chart hbars stk2";
      el.innerHTML = itens.map((m, i) => { const r = melhor(m), d = r != null ? r : m.primaria;
        return `<div class="hb" data-i="${i}"><span class="l" title="${esc(nome(m))}">${esc(nome(m))}</span><span class="tr"><span class="b" style="width:${(d / max) * 100}%;background:${COR_D}"></span><span class="b" style="left:${(d / max) * 100}%;width:${((m.primaria - d) / max) * 100}%;background:${COR_N}"></span></span><span class="v">${fmt(m.primaria, m.primaria < 100 ? 1 : 0)}</span></div>`; }).join("");
      el.querySelectorAll(".hb").forEach((n) => {
        const m = itens[+n.dataset.i], r = melhor(m);
        n.addEventListener("mousemove", (ev) => showTip(ev, `<div class="h">${esc(nome(m))}</div><div class="r"><span>${tr("Produção primária", "Primary production")}</span><b>${fmt(m.primaria, 1)}</b></div>` + (m.reutilizado != null ? `<div class="r"><span>${tr("Reutilizado", "Re-used")}</span><b>${fmt(m.reutilizado, 1)}</b></div>` : "") + (m.reciclado != null ? `<div class="r"><span>${tr("Reciclado (ciclo fechado)", "Recycled (closed loop)")}</span><b>${fmt(m.reciclado, 1)}</b></div>` : "") + (r == null ? `<div class="r"><span>${tr("Sem valor alternativo na tabela", "No alternative value in the table")}</span></div>` : "")));
        n.addEventListener("mouseleave", hideTip);
      });
      tableView(el, [tr("Material", "Material"), tr("Produção primária", "Primary production"), tr("Reutilizado", "Re-used"), tr("Reciclado (ciclo fechado)", "Recycled (closed loop)")], itens.map((m) => [esc(nome(m)), fmt(m.primaria, 1), m.reutilizado != null ? fmt(m.reutilizado, 1) : "–", m.reciclado != null ? fmt(m.reciclado, 1) : "–"]));
    }
    const legPilhas = (id) => legend(document.getElementById(id), [{ n: tr("Com material reutilizado ou reciclado", "With re-used or recycled material"), c: COR_D }, { n: tr("O que se poupa face à produção primária", "What is saved compared with primary production"), c: COR_N }]);

    if (VETOR === "construcao") construcao(); else moda();

    /* ============================ AMBIENTE CONSTRUÍDO ============================ */
    function construcao() {
      const F = S.construcao, C = S.minerais_nao_metalicos, W = PT.residuos_totais_construcao, RW = PT.residuos_kg_por_pessoa;
      const qC = (y) => ((F[y] + C[y]) / tot[y]) * 100;
      const wy = Object.keys(RW.PT).map(Number).filter((y) => y >= 2010).sort((a, b) => a - b);
      const metais = M[8], betao = M[2], agreg = M[0], madeira = M[5], isol = M[7];
      box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("O carbono que já está nas paredes", "The carbon already in the walls")}</h2></div>
  <div class="tiles">${tiles([
    mundoTile(D.mundo[0]),
    [pct(W.EU27_2020.quota_pct, 1), "", tr(`dos resíduos da UE vêm da construção (${W.EU27_2020.ano})`, `of EU waste comes from construction (${W.EU27_2020.ano})`), tr(`Em Portugal, ${pct(W.PT.quota_pct, 1)}`, `In Portugal, ${pct(W.PT.quota_pct, 1)}`)],
    [fmt(metais.primaria, 0), "kg CO₂e/t", tr(`nos metais, contra ${fmt(betao.primaria, 0)} no betão e ${fmt(agreg.primaria, 1)} nos agregados`, `in metals, against ${fmt(betao.primaria, 0)} in concrete and ${fmt(agreg.primaria, 1)} in aggregates`), tr("Produção primária, por tonelada (DESNZ 2025)", "Primary production, per tonne (DESNZ 2025)")],
    [pct(qC(y1), 1), "", tr(`do CO₂ da economia portuguesa e das famílias vem da construção e dos produtos minerais (${y1})`, `of Portuguese economy and household CO₂ comes from construction and mineral products (${y1})`), tr(`Em ${y0} eram ${pct(qC(y0), 1)}`, `In ${y0} it was ${pct(qC(y0), 1)}`)]])}</div>
  <div class="prose">
    <p>${tr("Um edifício pesa duas vezes no clima: <strong>gasta energia enquanto funciona</strong> e <strong>custou carbono para existir</strong>, porque foi preciso extrair, transformar e transportar os materiais. Em 2022, o setor da construção e dos edifícios esteve ligado a 37% do CO₂ mundial de energia e de processos.", "A building weighs twice on the climate: it <strong>uses energy while it runs</strong> and it <strong>cost carbon to exist</strong>, because materials had to be extracted, processed and transported. In 2022, the buildings and construction sector was linked to 37% of world energy and process CO₂.")}</p>
    <p>${tr("Esta página olha sobretudo para o segundo: o carbono dos <strong>materiais</strong>, o que muda quando se reutiliza ou recicla, e como a construção pesa em Portugal.", "This page looks mainly at the second: the carbon in <strong>materials</strong>, what changes when they are re-used or recycled, and how construction weighs in Portugal.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLinks(0, 1, 3)}</p>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Materiais", "1 · Materials")}</span><h2>${tr("Quanto carbono tem um material?", "How much carbon is in a material?")}</h2></div>
  <div class="prose"><p>${tr("Escolhe um material e a quantidade em toneladas. O cálculo é <strong>massa × fator da DESNZ</strong> para a produção primária, e compara com material reutilizado ou reciclado quando a tabela o tem.", "Choose a material and the amount in tonnes. The calculation is <strong>mass × DESNZ factor</strong> for primary production, and compares it with re-used or recycled material when the table has it.")}</p></div>
  <figure class="calc">
    <figcaption><span class="t">${tr("Calculadora de material", "Material calculator")}</span><span class="d">${tr("Fatores «do berço ao portão»: extração, fabrico e transporte até ao ponto de venda.", "“Cradle-to-gate” factors: extraction, manufacturing and transport to the point of sale.")}</span></figcaption>
    <div class="calc-form">
      <label>${tr("Material", "Material")}<select id="mt-mat">${M.map((m, i) => `<option value="${i}"${m === betao ? " selected" : ""}>${esc(nome(m))}</option>`).join("")}</select></label>
      <label>${tr("Quantidade (toneladas)", "Amount (tonnes)")}<input id="mt-t" type="number" min="0" step="any" value="100" inputmode="decimal"></label>
    </div>
    <div id="mt-res" aria-live="polite"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use». Não consideram emissões evitadas nem o uso e o fim de vida.", "Source: DESNZ 2025, “Material use”. They do not count avoided emissions, use or end of life.")}</span></div>
  </figure>
</section>

<section id="materiais">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Comparar", "2 · Compare")}</span><h2>${tr("Por tonelada, uns materiais pesam muito mais", "Per tonne, some materials weigh much more")}</h2></div>
  <div class="prose"><p id="mt-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Kg de CO₂e por tonelada de material de construção", "Kg of CO₂e per tonne of construction material")}</span><span class="d">${tr("Produção primária (barra inteira) e o que sobra com material reutilizado ou reciclado.", "Primary production (whole bar) and what is left with re-used or recycled material.")}</span></figcaption>
    <div class="legend" id="mt-leg"></div>
    <div class="chart" id="mt-graf"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use». Quando há reutilizado e reciclado, mostra-se o reutilizado.", "Source: DESNZ 2025, “Material use”. Where both re-used and recycled exist, the re-used value is shown.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Portugal", "3 · Portugal")}</span><h2>${tr("A construção e os seus materiais, em Portugal", "Construction and its materials in Portugal")}</h2></div>
  <div class="prose"><p id="mt-pt-txt"></p></div>
  <div class="tiles" id="mt-pt-tiles"></div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("CO₂ da construção e dos produtos minerais", "CO₂ from construction and mineral products")}</span><span class="d">${tr("Milhões de toneladas por ano, empresas residentes em Portugal.", "Million tonnes a year, companies resident in Portugal.")}</span></figcaption>
      <div class="legend" id="mt-leg-co2"></div>
      <div class="chart" id="mt-pt-co2"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE F e C23.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE F and C23.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Resíduos minerais da construção e demolição", "Mineral waste from construction and demolition")}</span><span class="d">${tr("Quilos por pessoa e por ano, sem terras escavadas.", "Kilograms per person per year, excluding excavated soil.")}</span></figcaption>
      <div class="legend" id="mt-leg-res"></div>
      <div class="chart" id="mt-pt-res"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, env_wasgen (W121) e demo_pjan; cálculo bioCulture.", "Source: Eurostat, env_wasgen (W121) and demo_pjan; bioCulture calculation.")}</span></div>
    </figure>
  </div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Limites e fontes", "4 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
  <ol class="notes" id="mt-notas"></ol>
  <div class="srcs" id="mt-fontes"></div>
</section>`;

      document.getElementById("mt-txt").innerHTML = tr(
        `Por tonelada, os <strong>metais</strong> (${fmt(metais.primaria, 0)} kg CO₂e) pesam ${fmt(metais.primaria / betao.primaria, 0)} vezes o betão (${fmt(betao.primaria, 0)} kg) e ${fmt(metais.primaria / agreg.primaria, 0)} vezes os agregados (${fmt(agreg.primaria, 1)} kg). Mas o que conta num edifício é a <strong>massa de cada material</strong>, e essa depende do projeto: esta página compara fatores, não faz o balanço de uma obra. Com material reutilizado ou reciclado, a madeira fica em ${fmt(madeira.reutilizado, 0)} kg (${pct((madeira.reutilizado / madeira.primaria) * 100)} do valor primário), os metais em ${fmt(metais.reciclado, 0)} kg (${pct((metais.reciclado / metais.primaria) * 100)}) e os isolamentos quase não mudam (${fmt(isol.reciclado, 0)} kg, ${pct((isol.reciclado / isol.primaria) * 100)}).`,
        `Per tonne, <strong>metals</strong> (${fmt(metais.primaria, 0)} kg CO₂e) weigh ${fmt(metais.primaria / betao.primaria, 0)} times concrete (${fmt(betao.primaria, 0)} kg) and ${fmt(metais.primaria / agreg.primaria, 0)} times aggregates (${fmt(agreg.primaria, 1)} kg). But what counts in a building is the <strong>mass of each material</strong>, and that depends on the design: this page compares factors, it does not balance a construction project. With re-used or recycled material, wood falls to ${fmt(madeira.reutilizado, 0)} kg (${pct((madeira.reutilizado / madeira.primaria) * 100)} of the primary value), metals to ${fmt(metais.reciclado, 0)} kg (${pct((metais.reciclado / metais.primaria) * 100)}) and insulation barely changes (${fmt(isol.reciclado, 0)} kg, ${pct((isol.reciclado / isol.primaria) * 100)}).`);
      document.getElementById("mt-pt-txt").innerHTML = tr(
        `As contas do Eurostat seguem as empresas <strong>residentes em Portugal</strong>. Em ${y0}, a construção emitiu <strong>${mt(F[y0])} Mt</strong> de CO₂ e a indústria de produtos minerais não metálicos (cimento, cal, cerâmica, vidro) <strong>${mt(C[y0])} Mt</strong>; em ${y1}, ${mt(F[y1])} Mt e ${mt(C[y1])} Mt. Juntas, passaram de ${pct(qC(y0), 1)} para <strong>${pct(qC(y1), 1)}</strong> do CO₂ da economia e das famílias, porque o resto das emissões desceu mais depressa. Em resíduos, a construção gerou ${fmt(W.PT.construcao_t / 1e6, 1)} Mt em ${W.PT.ano} (${pct(W.PT.quota_pct, 1)} do total, contra ${pct(W.EU27_2020.quota_pct, 1)} na UE). Os resíduos minerais da construção e demolição, sem terras, foram ${fmt(RW.PT[wy.at(-1)], 0)} kg por pessoa em Portugal e ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg na UE em ${wy.at(-1)}; a diferença pode refletir métodos e registos diferentes, não necessariamente menos resíduos. O valor de ${y1} vem sinalizado pelo Eurostat com uma nota explicativa.`,
        `Eurostat's accounts follow companies <strong>resident in Portugal</strong>. In ${y0}, construction emitted <strong>${mt(F[y0])} Mt</strong> of CO₂ and the non-metallic mineral products industry (cement, lime, ceramics, glass) <strong>${mt(C[y0])} Mt</strong>; in ${y1}, ${mt(F[y1])} Mt and ${mt(C[y1])} Mt. Together they went from ${pct(qC(y0), 1)} to <strong>${pct(qC(y1), 1)}</strong> of economy and household CO₂, because the rest of emissions fell faster. In waste, construction generated ${fmt(W.PT.construcao_t / 1e6, 1)} Mt in ${W.PT.ano} (${pct(W.PT.quota_pct, 1)} of the total, against ${pct(W.EU27_2020.quota_pct, 1)} in the EU). Mineral waste from construction and demolition, excluding soil, was ${fmt(RW.PT[wy.at(-1)], 0)} kg per person in Portugal and ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg in the EU in ${wy.at(-1)}; the gap may reflect different methods and records, not necessarily less waste. The ${y1} value is flagged by Eurostat with an explanatory note.`);
      document.getElementById("mt-pt-tiles").innerHTML = tiles([
        [mt(F[y1]), "Mt CO₂", tr(`construção em ${y1}`, `construction in ${y1}`), tr(`${y0}: ${mt(F[y0])} Mt`, `${y0}: ${mt(F[y0])} Mt`)],
        [mt(C[y1]), "Mt CO₂", tr(`produtos minerais não metálicos em ${y1}`, `non-metallic mineral products in ${y1}`), tr(`${y0}: ${mt(C[y0])} Mt; em 1995: ${mt(C[1995])} Mt`, `${y0}: ${mt(C[y0])} Mt; in 1995: ${mt(C[1995])} Mt`)],
        [fmt(RW.PT[wy.at(-1)], 0), "kg", tr(`de resíduos de construção e demolição por pessoa em Portugal (${wy.at(-1)})`, `of construction and demolition waste per person in Portugal (${wy.at(-1)})`), tr(`UE: ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg`, `EU: ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg`)]]);
      document.getElementById("mt-notas").innerHTML = [
        tr("<strong>Fatores do berço ao portão.</strong> Cobrem extração, processamento, fabrico e transporte até ao ponto de venda; não incluem a obra, o uso do edifício nem o fim de vida, e não consideram emissões evitadas. Os fatores de material reutilizado e reciclado não servem para comparar opções de reciclagem (aviso da própria DESNZ).", "<strong>Cradle-to-gate factors.</strong> They cover extraction, processing, manufacturing and transport to the point of sale; they do not include construction, use or end of life, and they do not count avoided emissions. Re-used and recycled factors are not meant to compare recycling options (DESNZ's own warning)."),
        tr("<strong>Por tonelada não é por edifício.</strong> A calculadora multiplica massa por fator; não sabe quanto material leva uma casa, e o resultado de um projeto depende da quantidade de cada material e das soluções escolhidas.", "<strong>Per tonne is not per building.</strong> The calculator multiplies mass by a factor; it does not know how much material a house takes, and a project's result depends on the amount of each material and the solutions chosen."),
        tr("<strong>O funcionamento fica de fora.</strong> A quota de 37% do PNUA junta o funcionamento dos edifícios (aquecimento, arrefecimento, eletricidade) e a produção dos materiais; a calculadora desta página só toca nos materiais.", "<strong>Operation is left out.</strong> UNEP's 37% share adds the operation of buildings (heating, cooling, electricity) and the production of materials; this page's calculator only covers materials."),
        tr("<strong>Fatores de base britânica.</strong> A DESNZ calcula-os para empresas do Reino Unido; em Portugal, a eletricidade, a distância e o fabrico podem dar valores diferentes.", "<strong>UK-based factors.</strong> DESNZ calculates them for UK companies; in Portugal, electricity, distance and manufacturing can give different values."),
        tr("<strong>Eurostat.</strong> Segue o princípio da residência: conta as empresas residentes em Portugal. O CO₂ de «produtos minerais não metálicos» (C23) inclui cimento, cal, cerâmica e vidro, e nem tudo vai para a construção em Portugal. Nos resíduos, os países registam de formas diferentes.", "<strong>Eurostat.</strong> It follows the residence principle: it counts companies resident in Portugal. The CO₂ of “non-metallic mineral products” (C23) includes cement, lime, ceramics and glass, and not all of it goes into construction in Portugal. In waste, countries record in different ways."),
        tr("<strong>Total mundial.</strong> O valor de 37% (2022) é do relatório do PNUA e da GlobalABC; consulta o original para as definições e para as edições mais recentes.", "<strong>World total.</strong> The 37% value (2022) is from the UNEP and GlobalABC report; check the original for definitions and for more recent editions.")
      ].map((n) => `<li>${n}</li>`).join("");
      document.getElementById("mt-fontes").innerHTML = FONTES.map((s) => `<div class="srcc"><h3>${esc(tr(s.nome, s.nome_en))}</h3><p>${tr(s.usa_pt, s.usa_en)}</p><a class="u" href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join("");

      legPilhas("mt-leg");
      pilhas(document.getElementById("mt-graf"), M.slice().sort((a, b) => a.primaria - b.primaria));
      legend(document.getElementById("mt-leg-co2"), [{ n: tr("Construção", "Construction"), c: COR.a }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b }]);
      lin("mt-pt-co2", [{ n: tr("Construção", "Construction"), c: COR.a, v: anos.map((y) => F[y] / 1000) }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b, v: anos.map((y) => C[y] / 1000) }], { yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 2) + " Mt" });
      legend(document.getElementById("mt-leg-res"), [{ n: "Portugal", c: COR.a }, { n: tr("UE-27", "EU-27"), c: COR.b }]);
      lin("mt-pt-res", [{ n: "Portugal", c: COR.a, v: wy.map((y) => RW.PT[y]) }, { n: tr("UE-27", "EU-27"), c: COR.b, v: wy.map((y) => RW.EU27_2020[y]) }], { x: wy, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 0) + " kg", tableEvery: 0 });

      /* calculadora */
      const sel = document.getElementById("mt-mat"), nIn = document.getElementById("mt-t"), res = document.getElementById("mt-res");
      const calc = () => {
        const m = M[+sel.value], t = Math.max(0, +nIn.value || 0), p = m.primaria * t;
        const alt = [];
        if (m.reutilizado != null) alt.push([tr("reutilizado", "re-used"), m.reutilizado * t, m.reutilizado]);
        if (m.reciclado != null) alt.push([tr("reciclado (ciclo fechado)", "recycled (closed loop)"), m.reciclado * t, m.reciclado]);
        res.innerHTML = `<div class="av-rota"><strong>${esc(nome(m))} · ${fmt(t, t < 10 ? 1 : 0)} t</strong><span>${tr("Fator de produção primária: ", "Primary production factor: ")}${fmt(m.primaria, 1)} kg CO₂e/t</span></div>
          <div class="tiles"><div class="tile"><span class="v">${kgTxt(p)}<small>CO₂e</small></span><span class="k">${tr("produção primária", "primary production")}</span><span class="s">${fmt(t, t < 10 ? 1 : 0)} t × ${fmt(m.primaria, 1)} kg/t</span></div>${alt.map((a) => `<div class="tile"><span class="v">${kgTxt(a[1])}<small>CO₂e</small></span><span class="k">${a[0]}</span><span class="s">${p > 0 ? tr("menos " + pct((1 - a[1] / p) * 100) + " do que o primário", pct((1 - a[1] / p) * 100) + " less than primary") : ""} · ${fmt(a[2], 1)} kg/t</span></div>`).join("")}${alt.length ? "" : `<div class="tile"><span class="v">–</span><span class="k">${tr("sem valor reutilizado ou reciclado", "no re-used or recycled value")}</span><span class="s">${tr("a tabela não tem alternativa para este material", "the table has no alternative for this material")}</span></div>`}</div>
          <p class="av-nota">${tr("Estimativa por tonelada de material «do berço ao portão». Não inclui a obra, o uso nem o fim de vida.", "Estimate per tonne of material “cradle to gate”. It does not include construction, use or end of life.")}</p>`;
      };
      sel.addEventListener("change", calc); nIn.addEventListener("input", calc); calc();
    }

    /* ============================ MODA E TÊXTEIS ============================ */
    function moda() {
      const T = S.texteis_vestuario_couro, RW = PT.residuos_kg_por_pessoa, R = D.roupa, MED = D.media_ue_roupa_kg;
      const q = (y) => (T[y] / tot[y]) * 100;
      const wy = Object.keys(RW.PT).map(Number).filter((y) => y >= 2010).sort((a, b) => a - b);
      const plast = M[4], alum = M[1], vidro = M[5];
      box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("Quanto pesa o que vestimos", "How much what we wear weighs")}</h2></div>
  <div class="tiles">${tiles(D.mundo.map(mundoTile).concat([[fmt(R.nova / 1000, 1), "kg CO₂e/kg", tr("de roupa nova, na produção primária; reutilizada: " + fmt(R.reutilizada / 1000, 2), "of new clothing in primary production; re-used: " + fmt(R.reutilizada / 1000, 2)), tr("Média de todas as fibras e peças (DESNZ 2025)", "Average across all fibres and garments (DESNZ 2025)")]]))}</div>
  <div class="prose">
    <p>${tr("Cada pessoa na UE comprou <strong>19 kg</strong> de roupa, calçado e têxteis para o lar em 2022, mais 2 kg do que em 2019. Para a Agência Europeia do Ambiente, os têxteis são a <strong>quinta maior pressão</strong> ambiental e climática do consumo das famílias, e a maior parte das emissões acontece fora da UE, onde se produz.", "Each person in the EU bought <strong>19 kg</strong> of clothing, footwear and household textiles in 2022, 2 kg more than in 2019. For the European Environment Agency, textiles are the <strong>fifth largest</strong> environmental and climate pressure of household consumption, and most emissions happen outside the EU, where the goods are made.")}</p>
    <p>${tr("Esta página mede o carbono que vai na <strong>produção da roupa</strong>, com a incerteza à vista, e o que muda quando a roupa é reutilizada.", "This page measures the carbon that goes into <strong>producing clothing</strong>, with the uncertainty in plain sight, and what changes when clothing is re-used.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLinks(0, 1, 2)}</p>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("1 · A tua roupa", "1 · Your clothes")}</span><h2>${tr("Quanto carbono cabe na roupa que compras?", "How much carbon is in the clothes you buy?")}</h2></div>
  <div class="prose"><p>${tr(`Diz quantos quilos de roupa nova compras por ano (a média na UE é ${MED} kg) e quantos quilos reutilizas ou compras em segunda mão. O cálculo é <strong>quilos × fator da DESNZ</strong>.`, `Say how many kilograms of new clothing you buy a year (the EU average is ${MED} kg) and how many kilograms you re-use or buy second-hand. The calculation is <strong>kilograms × DESNZ factor</strong>.`)}</p></div>
  <figure class="calc">
    <figcaption><span class="t">${tr("Calculadora de roupa", "Clothing calculator")}</span><span class="d">${tr("Fator médio de todas as fibras e peças: berço ao portão, sem lavagens nem fim de vida.", "Average factor for all fibres and garments: cradle to gate, without washing or end of life.")}</span></figcaption>
    <div class="calc-form">
      <label>${tr("Roupa nova por ano (kg)", "New clothing per year (kg)")}<input id="mt-nova" type="number" min="0" step="any" value="${MED}" inputmode="decimal"></label>
      <label>${tr("Roupa reutilizada por ano (kg)", "Re-used clothing per year (kg)")}<input id="mt-reut" type="number" min="0" step="any" value="0" inputmode="decimal"></label>
    </div>
    <div id="mt-res" aria-live="polite"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use», linha «Clothing». Média da UE: Agência Europeia do Ambiente, dados de 2022.", "Source: DESNZ 2025, “Material use”, row “Clothing”. EU average: European Environment Agency, 2022 data.")}</span></div>
  </figure>
</section>

<section id="materiais">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Comparar", "2 · Compare")}</span><h2>${tr("Por quilo, a roupa pesa mais do que o plástico", "Per kilogram, clothing weighs more than plastic")}</h2></div>
  <div class="prose"><p id="mt-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Kg de CO₂e por tonelada de material", "Kg of CO₂e per tonne of material")}</span><span class="d">${tr("Produção primária (barra inteira) e o que sobra com material reutilizado ou reciclado.", "Primary production (whole bar) and what is left with re-used or recycled material.")}</span></figcaption>
    <div class="legend" id="mt-leg"></div>
    <div class="chart" id="mt-graf"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use». A roupa mostra o valor reutilizado; os restantes, o reciclado em ciclo fechado.", "Source: DESNZ 2025, “Material use”. Clothing shows the re-used value; the others, closed-loop recycled.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Portugal", "3 · Portugal")}</span><h2>${tr("A indústria e os resíduos têxteis em Portugal", "Textile industry and waste in Portugal")}</h2></div>
  <div class="prose"><p id="mt-pt-txt"></p></div>
  <div class="tiles" id="mt-pt-tiles"></div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("CO₂ de têxteis, vestuário, couro e calçado", "CO₂ from textiles, clothing, leather and footwear")}</span><span class="d">${tr("Milhões de toneladas por ano, empresas residentes em Portugal.", "Million tonnes a year, companies resident in Portugal.")}</span></figcaption>
      <div class="chart" id="mt-pt-co2"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE C13–C15.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE C13–C15.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Resíduos têxteis registados", "Registered textile waste")}</span><span class="d">${tr("Quilos por pessoa e por ano.", "Kilograms per person per year.")}</span></figcaption>
      <div class="legend" id="mt-leg-res"></div>
      <div class="chart" id="mt-pt-res"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, env_wasgen (W076) e demo_pjan; cálculo bioCulture.", "Source: Eurostat, env_wasgen (W076) and demo_pjan; bioCulture calculation.")}</span></div>
    </figure>
  </div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Limites e fontes", "4 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
  <ol class="notes" id="mt-notas"></ol>
  <div class="srcs" id="mt-fontes"></div>
</section>`;

      document.getElementById("mt-txt").innerHTML = tr(
        `Por quilo, a roupa nova tem um fator de <strong>${fmt(R.nova / 1000, 1)} kg CO₂e</strong>: ${fmt(R.nova / plast.primaria, 0)} vezes o do plástico médio (${fmt(plast.primaria / 1000, 1)} kg), ${fmt(R.nova / alum.primaria, 1)} vezes o do alumínio (${fmt(alum.primaria / 1000, 1)} kg) e ${fmt(R.nova / vidro.primaria, 0)} vezes o do vidro. O fator da roupa reutilizada é ${fmt(R.reutilizada / 1000, 2)} kg. O valor por quilo não diz quanto pesa uma peça: o que importa é <strong>quantos quilos se compram</strong>, e a média na UE é de ${MED} kg de roupa por pessoa.`,
        `Per kilogram, new clothing has a factor of <strong>${fmt(R.nova / 1000, 1)} kg CO₂e</strong>: ${fmt(R.nova / plast.primaria, 0)} times that of average plastic (${fmt(plast.primaria / 1000, 1)} kg), ${fmt(R.nova / alum.primaria, 1)} times that of aluminium (${fmt(alum.primaria / 1000, 1)} kg) and ${fmt(R.nova / vidro.primaria, 0)} times that of glass. The factor for re-used clothing is ${fmt(R.reutilizada / 1000, 2)} kg. The value per kilogram does not say how much a garment weighs: what matters is <strong>how many kilograms are bought</strong>, and the EU average is ${MED} kg of clothing per person.`);
      const wu = wy.at(-1);
      document.getElementById("mt-pt-txt").innerHTML = tr(
        `A indústria têxtil, de vestuário, couro e calçado (NACE C13–C15) emitiu <strong>${mt(T[y0], 2)} Mt</strong> de CO₂ em Portugal em ${y0} e <strong>${mt(T[y1], 2)} Mt</strong> em ${y1} (${fmt((T[y1] / T[y0] - 1) * 100, 0)}%), de um máximo de ${mt(Math.max(...anos.map((y) => T[y])), 2)} Mt. Pesa ${pct(q(y1), 1)} do CO₂ da economia e das famílias. Isto mede o que se <strong>produz cá</strong>, não o que os portugueses vestem: segundo a AEA, cerca de três quartos das emissões do consumo de têxteis da UE acontecem fora da UE. Nos resíduos, Portugal registou ${fmt(RW.PT[wu], 1)} kg de resíduos têxteis por pessoa em ${wu} e a UE ${fmt(RW.EU27_2020[wu], 1)} kg; são os resíduos registados como têxteis, e a AEA estima ao todo cerca de 16 kg por pessoa na UE, contando os que vão no lixo misturado. O valor de ${y1} vem sinalizado pelo Eurostat com uma nota explicativa.`,
        `The textile, clothing, leather and footwear industry (NACE C13–C15) emitted <strong>${mt(T[y0], 2)} Mt</strong> of CO₂ in Portugal in ${y0} and <strong>${mt(T[y1], 2)} Mt</strong> in ${y1} (${fmt((T[y1] / T[y0] - 1) * 100, 0)}%), from a peak of ${mt(Math.max(...anos.map((y) => T[y])), 2)} Mt. It accounts for ${pct(q(y1), 1)} of economy and household CO₂. This measures what is <strong>made here</strong>, not what the Portuguese wear: according to the EEA, about three quarters of the emissions from EU textile consumption happen outside the EU. In waste, Portugal recorded ${fmt(RW.PT[wu], 1)} kg of textile waste per person in ${wu} and the EU ${fmt(RW.EU27_2020[wu], 1)} kg; these are wastes recorded as textiles, and the EEA estimates about 16 kg per person in total in the EU, counting what goes into mixed waste. The ${y1} value is flagged by Eurostat with an explanatory note.`);
      document.getElementById("mt-pt-tiles").innerHTML = tiles([
        [mt(T[y0], 2), "Mt CO₂", tr(`têxteis, vestuário, couro e calçado em ${y0}`, `textiles, clothing, leather and footwear in ${y0}`), pct(q(y0), 1) + tr(" do total", " of the total")],
        [mt(T[y1], 2), "Mt CO₂", tr(`em ${y1}`, `in ${y1}`), pct(q(y1), 1) + tr(" do total", " of the total")],
        [fmt(RW.PT[wu], 1), "kg", tr(`de resíduos têxteis registados por pessoa em Portugal (${wu})`, `of registered textile waste per person in Portugal (${wu})`), tr(`UE: ${fmt(RW.EU27_2020[wu], 1)} kg`, `EU: ${fmt(RW.EU27_2020[wu], 1)} kg`)]]);
      document.getElementById("mt-notas").innerHTML = [
        tr("<strong>É uma média, não a tua camisola.</strong> O fator da roupa junta todas as fibras e peças (algodão, poliéster, lã…); o valor de uma peça concreta depende da fibra, do peso, de onde e como foi feita.", "<strong>It is an average, not your sweater.</strong> The clothing factor pools all fibres and garments (cotton, polyester, wool…); the value of a specific garment depends on the fibre, the weight, and where and how it was made."),
        tr("<strong>Do berço ao portão.</strong> Cobre extração, processamento, fabrico e transporte até ao ponto de venda; não inclui lavagens, secagem nem o fim de vida, e não considera emissões evitadas. O fator de roupa reutilizada é o que a DESNZ publica para a reutilização; não assumimos que cada peça em segunda mão evita uma nova.", "<strong>Cradle to gate.</strong> It covers extraction, processing, manufacturing and transport to the point of sale; it does not include washing, drying or end of life, and it does not count avoided emissions. The re-used clothing factor is what DESNZ publishes for re-use; we do not assume that each second-hand garment avoids a new one."),
        tr("<strong>Fatores de base britânica.</strong> A DESNZ calcula-os para empresas do Reino Unido; a eletricidade e o transporte de cada cadeia podem dar valores diferentes.", "<strong>UK-based factors.</strong> DESNZ calculates them for UK companies; electricity and transport in each supply chain can give different values."),
        tr("<strong>Produção cá, consumo lá.</strong> O CO₂ da indústria em Portugal (Eurostat, princípio da residência) não é a pegada de quem veste: a Agência Europeia do Ambiente estima 654 kg de CO₂e por pessoa na UE em 2017, cerca de três quartos fora da UE.", "<strong>Produced here, consumed there.</strong> The CO₂ of industry in Portugal (Eurostat, residence principle) is not the footprint of those who wear the clothes: the European Environment Agency estimates 654 kg of CO₂e per person in the EU in 2017, about three quarters outside the EU."),
        tr("<strong>Resíduos.</strong> O Eurostat só regista como têxteis (W076) os resíduos recolhidos como tal; a AEA estima cerca de 16 kg por pessoa na UE em 2022, contando a roupa que vai no lixo misturado. Antes de 2010 as séries não são comparáveis e não as mostramos.", "<strong>Waste.</strong> Eurostat only records as textiles (W076) the waste collected as such; the EEA estimates about 16 kg per person in the EU in 2022, counting clothing that goes into mixed waste. Before 2010 the series are not comparable and we do not show them.")
      ].map((n) => `<li>${n}</li>`).join("");
      document.getElementById("mt-fontes").innerHTML = FONTES.map((s) => `<div class="srcc"><h3>${esc(tr(s.nome, s.nome_en))}</h3><p>${tr(s.usa_pt, s.usa_en)}</p><a class="u" href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join("");

      legPilhas("mt-leg");
      pilhas(document.getElementById("mt-graf"), M.slice().sort((a, b) => a.primaria - b.primaria));
      lin("mt-pt-co2", [{ n: tr("Têxteis, vestuário, couro e calçado", "Textiles, clothing, leather and footwear"), c: COR.a, v: anos.map((y) => T[y] / 1000) }], { yf: (v) => fmt(v, 1), tf: (se, i) => fmt(se.v[i], 2) + " Mt" });
      legend(document.getElementById("mt-leg-res"), [{ n: "Portugal", c: COR.a }, { n: tr("UE-27", "EU-27"), c: COR.b }]);
      lin("mt-pt-res", [{ n: "Portugal", c: COR.a, v: wy.map((y) => RW.PT[y]) }, { n: tr("UE-27", "EU-27"), c: COR.b, v: wy.map((y) => RW.EU27_2020[y]) }], { x: wy, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " kg", tableEvery: 0 });

      const novaIn = document.getElementById("mt-nova"), reutIn = document.getElementById("mt-reut"), res = document.getElementById("mt-res");
      const calc = () => {
        const n = Math.max(0, +novaIn.value || 0), r = Math.max(0, +reutIn.value || 0);
        const cN = (n * R.nova) / 1000, cR = (r * R.reutilizada) / 1000, ref = (MED * R.nova) / 1000, tot2 = cN + cR;
        res.innerHTML = `<div class="av-rota"><strong>${tr(`${fmt(n, 1)} kg de roupa nova e ${fmt(r, 1)} kg reutilizada por ano`, `${fmt(n, 1)} kg of new clothing and ${fmt(r, 1)} kg re-used per year`)}</strong><span>${tr("Fatores: nova ", "Factors: new ")}${fmt(R.nova / 1000, 2)} kg CO₂e/kg; ${tr("reutilizada ", "re-used ")}${fmt(R.reutilizada / 1000, 3)} kg CO₂e/kg</span></div>
          <div class="tiles">
            <div class="tile"><span class="v">${kgTxt(cN)}<small>CO₂e</small></span><span class="k">${tr("roupa nova", "new clothing")}</span><span class="s">${fmt(n, 1)} kg × ${fmt(R.nova / 1000, 2)}</span></div>
            <div class="tile"><span class="v">${kgTxt(cR)}<small>CO₂e</small></span><span class="k">${tr("roupa reutilizada", "re-used clothing")}</span><span class="s">${fmt(r, 1)} kg × ${fmt(R.reutilizada / 1000, 3)}</span></div>
            <div class="tile"><span class="v">${kgTxt(tot2)}<small>CO₂e</small></span><span class="k">${tr("total por ano", "total per year")}</span><span class="s">${tr(`média da UE (${MED} kg novos): ${kgTxt(ref)}`, `EU average (${MED} kg new): ${kgTxt(ref)}`)}</span></div></div>
          <p class="av-nota">${tr("Estimativa por quilo de roupa «do berço ao portão», com o fator médio de todas as fibras e peças. Não inclui lavagens nem fim de vida.", "Estimate per kilogram of clothing “cradle to gate”, with the average factor for all fibres and garments. It does not include washing or end of life.")}</p>`;
      };
      novaIn.addEventListener("input", calc); reutIn.addEventListener("input", calc); calc();
    }
  }
})();
