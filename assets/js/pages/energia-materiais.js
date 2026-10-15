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

  Promise.all([get(`/data/${FICH[0]}.json?v=3`), get(`/data/${FICH[1]}.json?v=5`)])
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
    const srcLinks = (...ix) => ix.map((i) => `<a href="${FONTES[i].url}" target="_blank" rel="noopener">${esc(FONTES[i].curto ? tr(FONTES[i].curto, FONTES[i].curto_en) : tr(FONTES[i].nome, FONTES[i].nome_en).split(" — ")[0].split(" (")[0])} ↗</a>`).join(" · ");
    const anosDe = (obj) => Object.keys(obj).map(Number).sort((a, b) => a - b);
    const S = PT.co2_kt, tot = S.total_economia_familias;
    const y0 = 2019, y1 = Math.max(...anosDe(tot));
    const anos = anosDe(tot);
    const lin = (id, series, o = {}) => line(document.getElementById(id), Object.assign({ x: o.x || anos, series, zero: true, aria: series.map((s) => s.n).join(", "), table: true, tableEvery: o.tableEvery || 5 }, o));
    const COR = { a: css("--s2") || "#eb6834", b: css("--s1") || "#2a78d6", c: css("--s3") || "#1baf7a" };
    const COR_D = COR.a, COR_N = "#f4c4b0";
    const tiles = (arr) => arr.map((t) => `<div class="tile"><span class="v">${t[0]}${t[1] ? `<small>${t[1]}</small>` : ""}</span><span class="k">${t[2]}</span><span class="s">${t[3] || ""}</span></div>`).join("");
    const rec = (dim, valor, unid, txt, nota, fonte, lacuna) => `<article class="rec${lacuna ? " lacuna" : ""}"><small>${dim}</small><strong>${valor}${unid ? `<em>${unid}</em>` : ""}</strong><p>${txt}</p>${nota ? `<p class="rec-nota">${nota}</p>` : ""}${fonte ? `<span class="rec-fonte">${tr("Fonte: ", "Source: ")}${srcLinks(...fonte)}</span>` : ""}</article>`;
    const ultimo = (obj, ate) => Math.max(...Object.keys(obj).map(Number).filter((y) => y <= ate));
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
      const AR = PT.ar_kt;
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
    <p>${tr("Esta página olha sobretudo para o segundo: o carbono dos <strong>materiais</strong> e o que muda quando se reutiliza ou recicla. E olha para além do carbono: energia, materiais, água, terra, resíduos e qualidade do ar, cada um na sua unidade, e como a construção pesa em Portugal.", "This page looks mainly at the second: the carbon in <strong>materials</strong> and what changes when they are re-used or recycled. And it looks beyond carbon: energy, materials, water, land, waste and air quality, each in its own unit, and how construction weighs in Portugal.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLinks(0, 1, 3)}</p>
</section>

<section id="recursos">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Todos os recursos", "1 · All resources")}</span><h2>${tr("Tudo o que a construção afeta", "Everything construction affects")}</h2></div>
  <div class="prose"><p>${tr("O carbono é só uma das pressões da construção. Cada recurso aparece na sua unidade e <strong>não se soma</strong> aos outros: carbono, energia, materiais, água, terra, resíduos e ar.", "Carbon is only one of the pressures of construction. Each resource appears in its own unit and is <strong>not added</strong> to the others: carbon, energy, materials, water, land, waste and air.")}</p></div>
  <div class="rec-grid" id="mt-rec"></div>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Materiais", "2 · Materials")}</span><h2>${tr("Quanto carbono tem um material?", "How much carbon is in a material?")}</h2></div>
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
  <div class="sec-head"><span class="eyebrow">${tr("3 · Comparar", "3 · Compare")}</span><h2>${tr("Por tonelada, uns materiais pesam muito mais", "Per tonne, some materials weigh much more")}</h2></div>
  <div class="prose"><p id="mt-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Kg de CO₂e por tonelada de material de construção", "Kg of CO₂e per tonne of construction material")}</span><span class="d">${tr("Produção primária (barra inteira) e o que sobra com material reutilizado ou reciclado.", "Primary production (whole bar) and what is left with re-used or recycled material.")}</span></figcaption>
    <div class="legend" id="mt-leg"></div>
    <div class="chart" id="mt-graf"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use». Quando há reutilizado e reciclado, mostra-se o reutilizado.", "Source: DESNZ 2025, “Material use”. Where both re-used and recycled exist, the re-used value is shown.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Portugal", "4 · Portugal")}</span><h2>${tr("A construção e os seus materiais, em Portugal", "Construction and its materials in Portugal")}</h2></div>
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
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Energia usada pela construção e pelos produtos minerais", "Energy used by construction and mineral products")}</span><span class="d">${tr("Petajoules por ano (uso interno líquido de energia).", "Petajoules a year (net domestic energy use).")}</span></figcaption>
      <div class="legend" id="mt-leg-en"></div>
      <div class="chart" id="mt-pt-en"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas físicas de energia (env_ac_pefa04), NACE F e C23.", "Source: Eurostat, physical energy flow accounts (env_ac_pefa04), NACE F and C23.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("Minerais não metálicos extraídos em Portugal", "Non-metallic minerals extracted in Portugal")}</span><span class="d">${tr("Toneladas por pessoa e por ano: extração interna.", "Tonnes per person per year: domestic extraction.")}</span></figcaption>
      <div class="legend" id="mt-leg-mat"></div>
      <div class="chart" id="mt-pt-mat"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de fluxos de materiais (env_ac_mfa), MF3.", "Source: Eurostat, material flow accounts (env_ac_mfa), MF3.")}</span></div>
    </figure>
  </div>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Quanto pesam no ar do país", "How much they weigh in the country's air")}</span><span class="d">${tr("Percentagem do NOx e das partículas emitidos em Portugal, construção e produtos minerais juntos.", "Percentage of the NOx and particles emitted in Portugal, construction and mineral products together.")}</span></figcaption>
      <div class="legend" id="mt-leg-ar"></div>
      <div class="chart" id="mt-pt-ar"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE F e C23; cálculo bioCulture.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE F and C23; bioCulture calculation.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("NOx da construção e dos produtos minerais", "NOx from construction and mineral products")}</span><span class="d">${tr("Milhares de toneladas por ano, empresas residentes em Portugal.", "Thousand tonnes a year, companies resident in Portugal.")}</span></figcaption>
      <div class="legend" id="mt-leg-nox"></div>
      <div class="chart" id="mt-pt-nox"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), poluente NOX.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), pollutant NOX.")}</span></div>
    </figure>
  </div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Limites e fontes", "5 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
  <ol class="notes" id="mt-notas"></ol>
  <div class="srcs" id="mt-fontes"></div>
</section>`;

      document.getElementById("mt-txt").innerHTML = tr(
        `Por tonelada, os <strong>metais</strong> (${fmt(metais.primaria, 0)} kg CO₂e) pesam ${fmt(metais.primaria / betao.primaria, 0)} vezes o betão (${fmt(betao.primaria, 0)} kg) e ${fmt(metais.primaria / agreg.primaria, 0)} vezes os agregados (${fmt(agreg.primaria, 1)} kg). Mas o que conta num edifício é a <strong>massa de cada material</strong>, e essa depende do projeto: esta página compara fatores, não faz o balanço de uma obra. Com material reutilizado ou reciclado, a madeira fica em ${fmt(madeira.reutilizado, 0)} kg (${pct((madeira.reutilizado / madeira.primaria) * 100)} do valor primário), os metais em ${fmt(metais.reciclado, 0)} kg (${pct((metais.reciclado / metais.primaria) * 100)}) e os isolamentos quase não mudam (${fmt(isol.reciclado, 0)} kg, ${pct((isol.reciclado / isol.primaria) * 100)}).`,
        `Per tonne, <strong>metals</strong> (${fmt(metais.primaria, 0)} kg CO₂e) weigh ${fmt(metais.primaria / betao.primaria, 0)} times concrete (${fmt(betao.primaria, 0)} kg) and ${fmt(metais.primaria / agreg.primaria, 0)} times aggregates (${fmt(agreg.primaria, 1)} kg). But what counts in a building is the <strong>mass of each material</strong>, and that depends on the design: this page compares factors, it does not balance a construction project. With re-used or recycled material, wood falls to ${fmt(madeira.reutilizado, 0)} kg (${pct((madeira.reutilizado / madeira.primaria) * 100)} of the primary value), metals to ${fmt(metais.reciclado, 0)} kg (${pct((metais.reciclado / metais.primaria) * 100)}) and insulation barely changes (${fmt(isol.reciclado, 0)} kg, ${pct((isol.reciclado / isol.primaria) * 100)}).`);
      document.getElementById("mt-pt-txt").innerHTML = tr(
        `As contas do Eurostat seguem as empresas <strong>residentes em Portugal</strong>. Em ${y0}, a construção emitiu <strong>${mt(F[y0])} Mt</strong> de CO₂ e a indústria de produtos minerais não metálicos (cimento, cal, cerâmica, vidro) <strong>${mt(C[y0])} Mt</strong>; em ${y1}, ${mt(F[y1])} Mt e ${mt(C[y1])} Mt. Juntas, passaram de ${pct(qC(y0), 1)} para <strong>${pct(qC(y1), 1)}</strong> do CO₂ da economia e das famílias, porque o resto das emissões desceu mais depressa. Em resíduos, a construção gerou ${fmt(W.PT.construcao_t / 1e6, 1)} Mt em ${W.PT.ano} (${pct(W.PT.quota_pct, 1)} do total, contra ${pct(W.EU27_2020.quota_pct, 1)} na UE). Os resíduos minerais da construção e demolição, sem terras, foram ${fmt(RW.PT[wy.at(-1)], 0)} kg por pessoa em Portugal e ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg na UE em ${wy.at(-1)}; a diferença pode refletir métodos e registos diferentes, não necessariamente menos resíduos. O valor de ${y1} é uma estimativa do Eurostat (valor imputado, sinalizador «i»).`,
        `Eurostat's accounts follow companies <strong>resident in Portugal</strong>. In ${y0}, construction emitted <strong>${mt(F[y0])} Mt</strong> of CO₂ and the non-metallic mineral products industry (cement, lime, ceramics, glass) <strong>${mt(C[y0])} Mt</strong>; in ${y1}, ${mt(F[y1])} Mt and ${mt(C[y1])} Mt. Together they went from ${pct(qC(y0), 1)} to <strong>${pct(qC(y1), 1)}</strong> of economy and household CO₂, because the rest of emissions fell faster. In waste, construction generated ${fmt(W.PT.construcao_t / 1e6, 1)} Mt in ${W.PT.ano} (${pct(W.PT.quota_pct, 1)} of the total, against ${pct(W.EU27_2020.quota_pct, 1)} in the EU). Mineral waste from construction and demolition, excluding soil, was ${fmt(RW.PT[wy.at(-1)], 0)} kg per person in Portugal and ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg in the EU in ${wy.at(-1)}; the gap may reflect different methods and records, not necessarily less waste. The ${y1} value is a Eurostat estimate (imputed value, flag “i”).`);
      document.getElementById("mt-pt-tiles").innerHTML = tiles([
        [mt(F[y1]), "Mt CO₂", tr(`construção em ${y1}`, `construction in ${y1}`), tr(`${y0}: ${mt(F[y0])} Mt`, `${y0}: ${mt(F[y0])} Mt`)],
        [mt(C[y1]), "Mt CO₂", tr(`produtos minerais não metálicos em ${y1}`, `non-metallic mineral products in ${y1}`), tr(`${y0}: ${mt(C[y0])} Mt; em 1995: ${mt(C[1995])} Mt`, `${y0}: ${mt(C[y0])} Mt; in 1995: ${mt(C[1995])} Mt`)],
        [fmt(RW.PT[wy.at(-1)], 0), "kg", tr(`de resíduos de construção e demolição por pessoa em Portugal (${wy.at(-1)})`, `of construction and demolition waste per person in Portugal (${wy.at(-1)})`), tr(`UE: ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg`, `EU: ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg`)]]);
      document.getElementById("mt-notas").innerHTML = [
        tr("<strong>Fatores do berço ao portão.</strong> Cobrem extração, processamento, fabrico e transporte até ao ponto de venda; não incluem a obra, o uso do edifício nem o fim de vida, e não consideram emissões evitadas. Os fatores de material reutilizado e reciclado não servem para comparar opções de reciclagem (aviso da própria DESNZ).", "<strong>Cradle-to-gate factors.</strong> They cover extraction, processing, manufacturing and transport to the point of sale; they do not include construction, use or end of life, and they do not count avoided emissions. Re-used and recycled factors are not meant to compare recycling options (DESNZ's own warning)."),
        tr("<strong>Por tonelada não é por edifício.</strong> A calculadora multiplica massa por fator; não sabe quanto material leva uma casa, e o resultado de um projeto depende da quantidade de cada material e das soluções escolhidas.", "<strong>Per tonne is not per building.</strong> The calculator multiplies mass by a factor; it does not know how much material a house takes, and a project's result depends on the amount of each material and the solutions chosen."),
        tr("<strong>O funcionamento fica de fora.</strong> A quota de 37% do PNUA junta o funcionamento dos edifícios (aquecimento, arrefecimento, eletricidade) e a produção dos materiais; a calculadora desta página só toca nos materiais.", "<strong>Operation is left out.</strong> UNEP's 37% share adds the operation of buildings (heating, cooling, electricity) and the production of materials; this page's calculator only covers materials."),
        tr("<strong>Fatores de base britânica.</strong> A DESNZ calcula-os para empresas do Reino Unido; em Portugal, a eletricidade, a distância e o fabrico podem dar valores diferentes.", "<strong>UK-based factors.</strong> DESNZ calculates them for UK companies; in Portugal, electricity, distance and manufacturing can give different values."),
        tr("<strong>Eurostat.</strong> Segue o princípio da residência: conta as empresas residentes em Portugal. O CO₂ de «produtos minerais não metálicos» (C23) inclui cimento, cal, cerâmica e vidro, e nem tudo vai para a construção em Portugal. Nos resíduos, os países registam de formas diferentes, e as duas séries usadas são diferentes: os 38,7% e os 19,6% são todos os resíduos gerados pela construção; os 226 e os 728 kg por pessoa são só os resíduos minerais de construção e demolição, sem terras.", "<strong>Eurostat.</strong> It follows the residence principle: it counts companies resident in Portugal. The CO₂ of “non-metallic mineral products” (C23) includes cement, lime, ceramics and glass, and not all of it goes into construction in Portugal. In waste, countries record in different ways, and the two series used are different: the 38.7% and 19.6% are all waste generated by construction; the 226 and 728 kg per person are only mineral construction and demolition waste, excluding soil."),
        tr("<strong>Totais mundiais.</strong> Os valores de 37% do CO₂ e 34% da energia (2022) são do relatório do PNUA e da GlobalABC; consulta o original para as definições e para as edições mais recentes.", "<strong>World totals.</strong> The 37% of CO₂ and 34% of energy values (2022) are from the UNEP and GlobalABC report; check the original for definitions and for more recent editions."),
        tr("<strong>Energia e terra em Portugal.</strong> A energia é a usada pelas atividades de construção e de produtos minerais (Eurostat), não a do funcionamento dos edifícios, que fica nas famílias e nos serviços. O solo artificializado vem de uma amostra (LUCAS) que tem um salto entre 2015 e 2018, talvez por mudanças de amostra ou de método.", "<strong>Energy and land in Portugal.</strong> The energy is that used by construction and mineral products activities (Eurostat), not the operation of buildings, which sits in households and services. Artificial land comes from a sample (LUCAS) that has a jump between 2015 and 2018, perhaps from changes in sample or method."),
        tr("<strong>Qualidade do ar.</strong> O NOx e as partículas vêm das contas de emissões do Eurostat (empresas residentes em Portugal), por atividade: a construção (NACE F) e os produtos minerais não metálicos (C23, que incluem cimento, cal, cerâmica e vidro e nem tudo vai para a construção). Medem o que as atividades emitem, não a concentração de poeira ou de NO₂ à volta de uma obra ou de uma fábrica, nem o que as pessoas respiram. Poluentes diferentes nunca se somam entre si nem com o CO₂. Nas partículas há picos nos primeiros anos da série (a construção surge com " + fmt(AR.PM10.construcao[1998], 0) + " kt de PM10 em 1998, contra " + fmt(AR.PM10.construcao[1996], 0) + " kt em 1996): vêm dos dados do Eurostat, não os conseguimos explicar nem corrigir, e por isso esses anos leem-se com cautela.", "<strong>Air quality.</strong> NOx and particles come from Eurostat's emissions accounts (companies resident in Portugal), by activity: construction (NACE F) and non-metallic mineral products (C23, which include cement, lime, ceramics and glass, and not all of it goes into construction). They measure what the activities emit, not the concentration of dust or NO₂ around a building site or a factory, nor what people breathe. Different pollutants are never added to each other or to CO₂. For particles there are spikes in the first years of the series (construction appears with " + fmt(AR.PM10.construcao[1998], 0) + " kt of PM10 in 1998, against " + fmt(AR.PM10.construcao[1996], 0) + " kt in 1996): they come from Eurostat's data, we could not explain or correct them, so those years should be read with care.")
      ].map((n) => `<li>${n}</li>`).join("");
      document.getElementById("mt-fontes").innerHTML = FONTES.map((s) => `<div class="srcc"><h3>${esc(tr(s.nome, s.nome_en))}</h3><p>${tr(s.usa_pt, s.usa_en)}</p><a class="u" href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join("");

      /* ---------- todos os recursos ---------- */
      const EN_ = PT.energia_tj, yE = ultimo(EN_.construcao, 2023), eC = EN_.construcao[yE], eM = EN_.minerais_nao_metalicos[yE], eT = EN_.total_economia_familias[yE];
      const MAT = PT.materiais_t_por_pessoa, yM = ultimo(MAT.PT.MF3, 2023), SOL = PT.solo_artificial;
      const yA = ultimo(AR.NOX.construcao, 2024), arS = (p) => AR[p].total_economia_familias[yA];
      const arQ = (p, y = yA) => ((AR[p].construcao[y] + AR[p].minerais_nao_metalicos[y]) / AR[p].total_economia_familias[y]) * 100;
      document.getElementById("mt-rec").innerHTML = [
        rec(tr("Carbono", "Carbon"), pct(qC(y1), 1), "", tr(`do CO₂ da economia e das famílias em Portugal vem da construção e dos produtos minerais (${y1}).`, `of Portuguese economy and household CO₂ comes from construction and mineral products (${y1}).`), tr("A nível mundial, 37% do CO₂ de energia e de processos (2022).", "Worldwide, 37% of energy and process CO₂ (2022)."), [0, 2]),
        rec(tr("Energia", "Energy"), "34", "%", tr("da procura mundial de energia vem dos edifícios (2022).", "of world energy demand comes from buildings (2022)."), tr(`Em Portugal, a construção e os produtos minerais não metálicos usaram ${fmt((eC + eM) / 1000, 0)} PJ em ${yE}, ${pct(((eC + eM) / eT) * 100, 1)} da energia usada pela economia e pelas famílias.`, `In Portugal, construction and non-metallic mineral products used ${fmt((eC + eM) / 1000, 0)} PJ in ${yE}, ${pct(((eC + eM) / eT) * 100, 1)} of the energy used by the economy and households.`), [0, 5]),
        rec(tr("Materiais", "Materials"), fmt(MAT.PT.MF3[yM], 1), "t", tr(`de minerais não metálicos extraídos por pessoa em Portugal em ${yM} (UE: ${fmt(MAT.EU27_2020.MF3[yM], 1)} t).`, `of non-metallic minerals extracted per person in Portugal in ${yM} (EU: ${fmt(MAT.EU27_2020.MF3[yM], 1)} t).`), tr(`Areia e gravilha: ${fmt(MAT.PT.MF38[yM], 1)} t contra ${fmt(MAT.EU27_2020.MF38[yM], 1)} t. Os minerais não metálicos são ${pct((MAT.PT.MF3[yM] / MAT.PT.TOTAL[yM]) * 100)} de tudo o que se extrai em Portugal.`, `Sand and gravel: ${fmt(MAT.PT.MF38[yM], 1)} t against ${fmt(MAT.EU27_2020.MF38[yM], 1)} t. Non-metallic minerals are ${pct((MAT.PT.MF3[yM] / MAT.PT.TOTAL[yM]) * 100)} of everything extracted in Portugal.`), [6]),
        rec(tr("Água", "Water"), tr("Sem dado", "No data"), "", tr("Sem número para Portugal: o Eurostat só publica a água usada pela construção para alguns países, como a Alemanha e a França.", "No number for Portugal: Eurostat only publishes the water used by construction for some countries, such as Germany and France."), "", [8], true),
        rec(tr("Terra", "Land"), pct(SOL.PT.PC[2022], 1), "", tr(`do território português é solo artificializado (${fmt(SOL.PT.M2_HAB[2022], 0)} m² por pessoa, 2022).`, `of Portuguese territory is artificial land (${fmt(SOL.PT.M2_HAB[2022], 0)} m² per person, 2022).`), tr(`Em 2018: ${pct(SOL.PT.PC[2018], 1)} em Portugal e ${pct(SOL.EU27_2020.PC[2018], 1)} na UE (${fmt(SOL.EU27_2020.M2_HAB[2018], 0)} m² por pessoa). Há um salto entre 2015 e 2018 que pode refletir mudanças na amostra ou no método (LUCAS): compara com cautela.`, `In 2018: ${pct(SOL.PT.PC[2018], 1)} in Portugal and ${pct(SOL.EU27_2020.PC[2018], 1)} in the EU (${fmt(SOL.EU27_2020.M2_HAB[2018], 0)} m² per person). There is a jump between 2015 and 2018 that may reflect changes in the sample or method (LUCAS): compare with care.`), [7]),
        rec(tr("Resíduos", "Waste"), pct(W.EU27_2020.quota_pct, 1), "", tr(`dos resíduos da UE vêm da construção (${W.EU27_2020.ano}); em Portugal, ${pct(W.PT.quota_pct, 1)}.`, `of EU waste comes from construction (${W.EU27_2020.ano}); in Portugal, ${pct(W.PT.quota_pct, 1)}.`), tr(`Resíduos minerais da construção e demolição, sem terras: ${fmt(RW.PT[wy.at(-1)], 0)} kg por pessoa em Portugal e ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg na UE.`, `Mineral construction and demolition waste, excluding soil: ${fmt(RW.PT[wy.at(-1)], 0)} kg per person in Portugal and ${fmt(RW.EU27_2020[wy.at(-1)], 0)} kg in the EU.`), [3]),
        rec(tr("Qualidade do ar", "Air quality"), pct(arQ("NOX"), 0), "", tr(`do NOx de Portugal vem da construção e dos produtos minerais (${yA}); nas partículas PM10 são ${pct(arQ("PM10"), 0)} e nas PM2,5 ${pct(arQ("PM2_5"), 0)}.`, `of Portugal's NOx comes from construction and mineral products (${yA}); for PM10 particles it is ${pct(arQ("PM10"), 0)} and for PM2.5 ${pct(arQ("PM2_5"), 0)}.`), tr(`O peso vem sobretudo dos produtos minerais (cimento, cal, cerâmica, vidro): ${fmt(AR.NOX.minerais_nao_metalicos[yA], 0)} dos ${fmt(arS("NOX"), 0)} kt de NOx. Em 1995 a construção e os minerais davam ${pct(arQ("NOX", 1995), 0)} do NOx do país. São as emissões declaradas por atividade (combustão e processos), não a poeira junto de cada obra.`, `The weight comes mostly from mineral products (cement, lime, ceramics, glass): ${fmt(AR.NOX.minerais_nao_metalicos[yA], 0)} of the ${fmt(arS("NOX"), 0)} kt of NOx. In 1995 construction and minerals gave ${pct(arQ("NOX", 1995), 0)} of the country's NOx. These are emissions reported by activity (combustion and processes), not the dust next to each building site.`), [2]),
        rec(tr("Ainda por cobrir", "Not yet covered"), "—", "", tr("Poeira e qualidade do ar à volta de cada obra, ruído, perda de habitat e condições de trabalho: sem números abertos e comparáveis para Portugal.", "Dust and air quality around each building site, noise, habitat loss and working conditions: no open, comparable numbers for Portugal."), "", null, true)
      ].join("");
      legend(document.getElementById("mt-leg-en"), [{ n: tr("Construção", "Construction"), c: COR.a }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b }]);
      const aE = anosDe(EN_.construcao);
      lin("mt-pt-en", [{ n: tr("Construção", "Construction"), c: COR.a, v: aE.map((y) => EN_.construcao[y] / 1000) }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b, v: aE.map((y) => EN_.minerais_nao_metalicos[y] / 1000) }], { x: aE, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " PJ" });
      legend(document.getElementById("mt-leg-mat"), [{ n: "Portugal", c: COR.a }, { n: tr("UE-27", "EU-27"), c: COR.b }]);
      const aM = anosDe(MAT.EU27_2020.MF3).filter((y) => y >= 2000 && y <= 2023);
      lin("mt-pt-mat", [{ n: "Portugal", c: COR.a, v: aM.map((y) => MAT.PT.MF3[y]) }, { n: tr("UE-27", "EU-27"), c: COR.b, v: aM.map((y) => MAT.EU27_2020.MF3[y]) }], { x: aM, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " t" });

      legPilhas("mt-leg");
      pilhas(document.getElementById("mt-graf"), M.slice().sort((a, b) => a.primaria - b.primaria));
      legend(document.getElementById("mt-leg-co2"), [{ n: tr("Construção", "Construction"), c: COR.a }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b }]);
      lin("mt-pt-co2", [{ n: tr("Construção", "Construction"), c: COR.a, v: anos.map((y) => F[y] / 1000) }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b, v: anos.map((y) => C[y] / 1000) }], { yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 2) + " Mt" });
      const aA = anosDe(AR.NOX.construcao).filter((y) => AR.PM10.construcao[y] != null && AR.PM2_5.construcao[y] != null);
      legend(document.getElementById("mt-leg-ar"), [{ n: "NOx", c: COR.a }, { n: "PM10", c: COR.b }, { n: "PM2,5", c: COR.c }]);
      lin("mt-pt-ar", [{ n: "NOx", c: COR.a, v: aA.map((y) => arQ("NOX", y)) }, { n: "PM10", c: COR.b, v: aA.map((y) => arQ("PM10", y)) }, { n: "PM2,5", c: COR.c, v: aA.map((y) => arQ("PM2_5", y)) }], { x: aA, yf: (v) => fmt(v, 0) + "%", tf: (se, i) => fmt(se.v[i], 1) + "%" });
      legend(document.getElementById("mt-leg-nox"), [{ n: tr("Construção", "Construction"), c: COR.a }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b }]);
      lin("mt-pt-nox", [{ n: tr("Construção", "Construction"), c: COR.a, v: aA.map((y) => AR.NOX.construcao[y]) }, { n: tr("Produtos minerais não metálicos", "Non-metallic mineral products"), c: COR.b, v: aA.map((y) => AR.NOX.minerais_nao_metalicos[y]) }], { x: aA, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " kt" });
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
          <p class="av-nota">${tr("Estimativa por tonelada de material «do berço ao portão». Não inclui a obra, o uso nem o fim de vida. Os valores de reutilizado e reciclado não consideram o que o material reciclado substitui, e a DESNZ avisa que não servem para comparar opções de reciclagem.", "Estimate per tonne of material “cradle to gate”. It does not include construction, use or end of life. The re-used and recycled values do not count what the recycled material replaces, and DESNZ warns they are not meant to compare recycling options.")}</p>`;
      };
      sel.addEventListener("change", calc); nIn.addEventListener("input", calc); calc();
    }

    /* ============================ MODA E TÊXTEIS ============================ */
    function moda() {
      const T = S.texteis_vestuario_couro, RW = PT.residuos_kg_por_pessoa, R = D.roupa, MED = D.media_ue_roupa_kg;
      const q = (y) => (T[y] / tot[y]) * 100;
      const AR = PT.ar_kt, yA = ultimo(AR.NOX.texteis_vestuario_couro, 2024);
      const arQ = (p, y = yA) => (AR[p].texteis_vestuario_couro[y] / AR[p].total_economia_familias[y]) * 100;
      const wy = Object.keys(RW.PT).map(Number).filter((y) => y >= 2010).sort((a, b) => a - b);
      const plast = M[4], alum = M[1], vidro = M[5];
      box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("Sumário", "Summary")}</span><h2>${tr("Quanto pesa o que vestimos", "How much what we wear weighs")}</h2></div>
  <div class="tiles">${tiles(D.mundo.map(mundoTile).concat([[fmt(R.nova / 1000, 1), "kg CO₂e/kg", tr("de roupa nova, na produção primária; reutilizada: " + fmt(R.reutilizada / 1000, 2), "of new clothing in primary production; re-used: " + fmt(R.reutilizada / 1000, 2)), tr("Média de todas as fibras e peças (DESNZ 2025)", "Average across all fibres and garments (DESNZ 2025)")]]))}</div>
  <div class="prose">
    <p>${tr("Cada pessoa na UE comprou <strong>19 kg</strong> de roupa, calçado e têxteis para o lar em 2022, mais 2 kg do que em 2019. Para a Agência Europeia do Ambiente, os têxteis são a <strong>quinta maior pressão</strong> ambiental e climática do consumo das famílias, e, segundo a AEA, cerca de três quartos das emissões do consumo de têxteis da UE ocorreram fora da UE (dados de 2017).", "Each person in the EU bought <strong>19 kg</strong> of clothing, footwear and household textiles in 2022, 2 kg more than in 2019. For the European Environment Agency, textiles are the <strong>fifth largest</strong> environmental and climate pressure of household consumption, and, according to the EEA, about three quarters of the emissions from EU textile consumption took place outside the EU (2017 data).")}</p>
    <p>${tr("Esta página mede o carbono que vai na <strong>produção da roupa</strong>, com a incerteza à vista, e o que muda quando a roupa é reutilizada. E junta os outros recursos: matérias-primas, água, terra, energia, resíduos, microplásticos e qualidade do ar, cada um na sua unidade.", "This page measures the carbon that goes into <strong>producing clothing</strong>, with the uncertainty in plain sight, and what changes when clothing is re-used. And it adds the other resources: raw materials, water, land, energy, waste, microplastics and air quality, each in its own unit.")}</p>
  </div>
  <p class="src-line">${tr("Fontes: ", "Sources: ")}${srcLinks(0, 5, 6, 1, 2)}</p>
</section>

<section id="recursos">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Todos os recursos", "1 · All resources")}</span><h2>${tr("Tudo o que a moda afeta", "Everything fashion affects")}</h2></div>
  <div class="prose"><p>${tr("O carbono é só uma das pressões da moda. Cada recurso aparece na sua unidade e <strong>não se soma</strong> aos outros: carbono, energia, matérias-primas, água, terra, resíduos, química e ar. Os valores por pessoa são estimativas da Agência Europeia do Ambiente e do Parlamento Europeu, de anos e métodos diferentes.", "Carbon is only one of the pressures of fashion. Each resource appears in its own unit and is <strong>not added</strong> to the others: carbon, energy, raw materials, water, land, waste, chemicals and air. The per-person values are estimates from the European Environment Agency and the European Parliament, from different years and methods.")}</p></div>
  <div class="rec-grid" id="mt-rec"></div>
</section>

<section id="calcular">
  <div class="sec-head"><span class="eyebrow">${tr("2 · A tua roupa", "2 · Your clothes")}</span><h2>${tr("Quanto carbono cabe na roupa que compras?", "How much carbon is in the clothes you buy?")}</h2></div>
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
  <div class="sec-head"><span class="eyebrow">${tr("3 · Comparar", "3 · Compare")}</span><h2>${tr("Por quilo, a roupa pesa mais do que o plástico", "Per kilogram, clothing weighs more than plastic")}</h2></div>
  <div class="prose"><p id="mt-txt"></p></div>
  <figure>
    <figcaption><span class="t">${tr("Kg de CO₂e por tonelada de material", "Kg of CO₂e per tonne of material")}</span><span class="d">${tr("Produção primária (barra inteira) e o que sobra com material reutilizado ou reciclado.", "Primary production (whole bar) and what is left with re-used or recycled material.")}</span></figcaption>
    <div class="legend" id="mt-leg"></div>
    <div class="chart" id="mt-graf"></div>
    <div class="src"><span>${tr("Fonte: DESNZ 2025, «Material use». A roupa mostra o valor reutilizado; os restantes, o reciclado em ciclo fechado.", "Source: DESNZ 2025, “Material use”. Clothing shows the re-used value; the others, closed-loop recycled.")}</span></div>
  </figure>
</section>

<section id="portugal">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Portugal", "4 · Portugal")}</span><h2>${tr("A indústria e os resíduos têxteis em Portugal", "Textile industry and waste in Portugal")}</h2></div>
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
  <figure>
    <figcaption><span class="t">${tr("Energia usada pela indústria têxtil, de vestuário, couro e calçado", "Energy used by the textile, clothing, leather and footwear industry")}</span><span class="d">${tr("Petajoules por ano (uso interno líquido de energia), Portugal.", "Petajoules a year (net domestic energy use), Portugal.")}</span></figcaption>
    <div class="chart" id="mt-pt-en"></div>
    <div class="src"><span>${tr("Fonte: Eurostat, contas físicas de energia (env_ac_pefa04), NACE C13–C15.", "Source: Eurostat, physical energy flow accounts (env_ac_pefa04), NACE C13–C15.")}</span></div>
  </figure>
  <div class="grid2">
    <figure>
      <figcaption><span class="t">${tr("Quanto pesa no ar do país", "How much it weighs in the country's air")}</span><span class="d">${tr("Percentagem do NOx e das partículas emitidos em Portugal pela indústria têxtil, de vestuário, couro e calçado.", "Percentage of the NOx and particles emitted in Portugal by the textile, clothing, leather and footwear industry.")}</span></figcaption>
      <div class="legend" id="mt-leg-ar"></div>
      <div class="chart" id="mt-pt-ar"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), NACE C13–C15; cálculo bioCulture.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), NACE C13–C15; bioCulture calculation.")}</span></div>
    </figure>
    <figure>
      <figcaption><span class="t">${tr("NOx da indústria têxtil, de vestuário, couro e calçado", "NOx from the textile, clothing, leather and footwear industry")}</span><span class="d">${tr("Milhares de toneladas por ano, empresas residentes em Portugal.", "Thousand tonnes a year, companies resident in Portugal.")}</span></figcaption>
      <div class="chart" id="mt-pt-nox"></div>
      <div class="src"><span>${tr("Fonte: Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2), poluente NOX.", "Source: Eurostat, air emissions accounts (env_ac_ainah_r2), pollutant NOX.")}</span></div>
    </figure>
  </div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Limites e fontes", "5 · Limits and sources")}</span><h2>${tr("O que estes números não dizem", "What these numbers do not tell")}</h2></div>
  <ol class="notes" id="mt-notas"></ol>
  <div class="srcs" id="mt-fontes"></div>
</section>`;

      document.getElementById("mt-txt").innerHTML = tr(
        `Por quilo, a roupa nova tem um fator de <strong>${fmt(R.nova / 1000, 1)} kg CO₂e</strong>: ${fmt(R.nova / plast.primaria, 0)} vezes o do plástico médio (${fmt(plast.primaria / 1000, 1)} kg), ${fmt(R.nova / alum.primaria, 1)} vezes o do alumínio (${fmt(alum.primaria / 1000, 1)} kg) e ${fmt(R.nova / vidro.primaria, 0)} vezes o do vidro. O fator da roupa reutilizada é ${fmt(R.reutilizada / 1000, 2)} kg. O valor por quilo não diz quanto pesa uma peça: o que importa é <strong>quantos quilos se compram</strong>, e a média na UE é de ${MED} kg de roupa por pessoa.`,
        `Per kilogram, new clothing has a factor of <strong>${fmt(R.nova / 1000, 1)} kg CO₂e</strong>: ${fmt(R.nova / plast.primaria, 0)} times that of average plastic (${fmt(plast.primaria / 1000, 1)} kg), ${fmt(R.nova / alum.primaria, 1)} times that of aluminium (${fmt(alum.primaria / 1000, 1)} kg) and ${fmt(R.nova / vidro.primaria, 0)} times that of glass. The factor for re-used clothing is ${fmt(R.reutilizada / 1000, 2)} kg. The value per kilogram does not say how much a garment weighs: what matters is <strong>how many kilograms are bought</strong>, and the EU average is ${MED} kg of clothing per person.`);
      const wu = wy.at(-1), wu0 = wu;
      document.getElementById("mt-pt-txt").innerHTML = tr(
        `A indústria têxtil, de vestuário, couro e calçado (NACE C13–C15) emitiu <strong>${mt(T[y0], 2)} Mt</strong> de CO₂ em Portugal em ${y0} e <strong>${mt(T[y1], 2)} Mt</strong> em ${y1} (${fmt((T[y1] / T[y0] - 1) * 100, 0)}%), de um máximo de ${mt(Math.max(...anos.map((y) => T[y])), 2)} Mt. Pesa ${pct(q(y1), 1)} do CO₂ da economia e das famílias. Isto mede o que se <strong>produz cá</strong>, não o que os portugueses vestem: segundo a AEA, cerca de três quartos das emissões do consumo de têxteis da UE acontecem fora da UE. Nos resíduos, Portugal registou ${fmt(RW.PT[wu], 1)} kg de resíduos têxteis por pessoa em ${wu} e a UE ${fmt(RW.EU27_2020[wu], 1)} kg; são os resíduos registados como têxteis, e a AEA estima ao todo cerca de 16 kg por pessoa na UE, contando os que vão no lixo misturado. O valor de ${y1} é uma estimativa do Eurostat (valor imputado, sinalizador «i»).`,
        `The textile, clothing, leather and footwear industry (NACE C13–C15) emitted <strong>${mt(T[y0], 2)} Mt</strong> of CO₂ in Portugal in ${y0} and <strong>${mt(T[y1], 2)} Mt</strong> in ${y1} (${fmt((T[y1] / T[y0] - 1) * 100, 0)}%), from a peak of ${mt(Math.max(...anos.map((y) => T[y])), 2)} Mt. It accounts for ${pct(q(y1), 1)} of economy and household CO₂. This measures what is <strong>made here</strong>, not what the Portuguese wear: according to the EEA, about three quarters of the emissions from EU textile consumption happen outside the EU. In waste, Portugal recorded ${fmt(RW.PT[wu], 1)} kg of textile waste per person in ${wu} and the EU ${fmt(RW.EU27_2020[wu], 1)} kg; these are wastes recorded as textiles, and the EEA estimates about 16 kg per person in total in the EU, counting what goes into mixed waste. The ${y1} value is a Eurostat estimate (imputed value, flag “i”).`);
      document.getElementById("mt-pt-tiles").innerHTML = tiles([
        [mt(T[y0], 2), "Mt CO₂", tr(`têxteis, vestuário, couro e calçado em ${y0}`, `textiles, clothing, leather and footwear in ${y0}`), pct(q(y0), 1) + tr(" do total", " of the total")],
        [mt(T[y1], 2), "Mt CO₂", tr(`em ${y1}`, `in ${y1}`), pct(q(y1), 1) + tr(" do total", " of the total")],
        [fmt(RW.PT[wu], 1), "kg", tr(`de resíduos têxteis registados por pessoa em Portugal (${wu})`, `of registered textile waste per person in Portugal (${wu})`), tr(`UE: ${fmt(RW.EU27_2020[wu], 1)} kg`, `EU: ${fmt(RW.EU27_2020[wu], 1)} kg`)]]);
      document.getElementById("mt-notas").innerHTML = [
        tr("<strong>É uma média, não a tua camisola.</strong> O fator da roupa junta todas as fibras e peças (algodão, poliéster, lã…); o valor de uma peça concreta depende da fibra, do peso, de onde e como foi feita.", "<strong>It is an average, not your sweater.</strong> The clothing factor pools all fibres and garments (cotton, polyester, wool…); the value of a specific garment depends on the fibre, the weight, and where and how it was made."),
        tr("<strong>Do berço ao portão.</strong> Cobre extração, processamento, fabrico e transporte até ao ponto de venda; não inclui lavagens, secagem nem o fim de vida, e não considera emissões evitadas. O fator de roupa reutilizada é o que a DESNZ publica para a reutilização; não assumimos que cada peça em segunda mão evita uma nova.", "<strong>Cradle to gate.</strong> It covers extraction, processing, manufacturing and transport to the point of sale; it does not include washing, drying or end of life, and it does not count avoided emissions. The re-used clothing factor is what DESNZ publishes for re-use; we do not assume that each second-hand garment avoids a new one."),
        tr("<strong>Fatores de base britânica.</strong> A DESNZ calcula-os para empresas do Reino Unido; a eletricidade e o transporte de cada cadeia podem dar valores diferentes.", "<strong>UK-based factors.</strong> DESNZ calculates them for UK companies; electricity and transport in each supply chain can give different values."),
        tr("<strong>Produção cá, consumo lá.</strong> O CO₂ da indústria em Portugal (Eurostat, princípio da residência) não é a pegada de quem veste: cerca de três quartos das emissões do consumo de têxteis da UE ocorreram fora da UE (briefing da AEA de 2019, dados de 2017).", "<strong>Produced here, consumed there.</strong> The CO₂ of industry in Portugal (Eurostat, residence principle) is not the footprint of those who wear the clothes: about three quarters of the emissions from EU textile consumption took place outside the EU (EEA 2019 briefing, 2017 data)."),
        tr("<strong>Estimativas por pessoa de anos e métodos diferentes.</strong> A AEA publicou 654 kg de CO₂e e 104 m³ de água por pessoa (dados de 2017), depois cerca de 270 kg, 9 m³, 400 m² e 391 kg (rankings de 2020), e o Parlamento Europeu dá 355 kg, 12 m³, 323 m² e 523 kg para 2022. Não são comparáveis entre si; consulta os originais e usa-os como ordens de grandeza.", "<strong>Per-person estimates from different years and methods.</strong> The EEA published 654 kg of CO₂e and 104 m³ of water per person (2017 data), then about 270 kg, 9 m³, 400 m² and 391 kg (2020 rankings), and the European Parliament gives 355 kg, 12 m³, 323 m² and 523 kg for 2022. They are not comparable with one another; check the originals and use them as orders of magnitude."),
        tr("<strong>Qualidade do ar.</strong> O NOx e as partículas vêm das contas de emissões do Eurostat (empresas residentes em Portugal) para a indústria têxtil, de vestuário, couro e calçado (NACE C13–C15). Medem o que a indústria emite em Portugal, não a roupa que aqui se compra e é feita noutros países, nem a poluição da água, nem o que as pessoas respiram. Os valores são pequenos (menos de 1% do total do país), e poluentes diferentes nunca se somam entre si nem com o CO₂.", "<strong>Air quality.</strong> NOx and particles come from Eurostat's emissions accounts (companies resident in Portugal) for the textile, clothing, leather and footwear industry (NACE C13–C15). They measure what the industry emits in Portugal, not the clothes bought here and made in other countries, nor water pollution, nor what people breathe. The values are small (under 1% of the country's total), and different pollutants are never added to each other or to CO₂."),
        tr("<strong>Resíduos.</strong> O Eurostat só regista como têxteis (W076) os resíduos recolhidos como tal; a AEA estima cerca de 16 kg por pessoa na UE em 2022, contando a roupa que vai no lixo misturado. Antes de 2010 os valores mudam bruscamente (por exemplo, 92 kg por pessoa em Portugal em 2004) e não os mostramos.", "<strong>Waste.</strong> Eurostat only records as textiles (W076) the waste collected as such; the EEA estimates about 16 kg per person in the EU in 2022, counting clothing that goes into mixed waste. Before 2010 the values change abruptly (for example, 92 kg per person in Portugal in 2004) and we do not show them.")
      ].map((n) => `<li>${n}</li>`).join("");
      document.getElementById("mt-fontes").innerHTML = FONTES.map((s) => `<div class="srcc"><h3>${esc(tr(s.nome, s.nome_en))}</h3><p>${tr(s.usa_pt, s.usa_en)}</p><a class="u" href="${s.url}" target="_blank" rel="noopener">${s.url}</a></div>`).join("");

      /* ---------- todos os recursos ---------- */
      const ENG = PT.energia_tj, yE = ultimo(ENG.texteis_vestuario_couro, 2023), eT = ENG.texteis_vestuario_couro[yE], eTot = ENG.total_economia_familias[yE], eT19 = ENG.texteis_vestuario_couro[y0];
      document.getElementById("mt-rec").innerHTML = [
        rec(tr("Carbono", "Carbon"), "270", "kg", tr("de pegada de carbono por pessoa na UE, no consumo de roupa, calçado e têxteis para o lar (estimativa da AEA, sem ano indicado).", "of carbon footprint per person in the EU, from consumption of clothing, footwear and household textiles (EEA estimate, year not stated)."), tr("Parlamento Europeu: cerca de 355 kg de CO₂ por pessoa em 2022. Roupa nova, só a produção: 22,3 kg CO₂e por kg (DESNZ).", "European Parliament: about 355 kg of CO₂ per person in 2022. New clothing, production only: 22.3 kg CO₂e per kg (DESNZ)."), [5, 6, 2]),
        rec(tr("Energia", "Energy"), fmt(eT / 1000, 1), "PJ", tr(`usados pela indústria têxtil, de vestuário, couro e calçado em Portugal em ${yE}.`, `used by the textile, clothing, leather and footwear industry in Portugal in ${yE}.`), tr(`${pct((eT / eTot) * 100, 1)} da energia usada pela economia e pelas famílias; em ${y0} eram ${fmt(eT19 / 1000, 1)} PJ (${fmt((eT / eT19 - 1) * 100, 0)}%). Não encontrámos uma estimativa aberta da energia do consumo de têxteis por pessoa na UE.`, `${pct((eT / eTot) * 100, 1)} of the energy used by the economy and households; in ${y0} it was ${fmt(eT19 / 1000, 1)} PJ (${fmt((eT / eT19 - 1) * 100, 0)}%). We found no open estimate of the energy of textile consumption per person in the EU.`), [7]),
        rec(tr("Matérias-primas", "Raw materials"), "391", "kg", tr("de matérias-primas por pessoa na UE, no consumo de têxteis (AEA).", "of raw materials per person in the EU, from textile consumption (EEA)."), tr("Parlamento Europeu, 2022: 523 kg. 5.º lugar entre as categorias de consumo no uso de matérias-primas (2020); cerca de 85% desse uso ocorre fora da UE (briefing de 2019, dados de 2017).", "European Parliament, 2022: 523 kg. 5th place among consumption categories for use of raw materials (2020); about 85% of that use occurs outside the EU (2019 briefing, 2017 data)."), [5, 6, 1]),
        rec(tr("Água", "Water"), "9", "m³", tr("de água por pessoa na UE, no consumo de têxteis (AEA).", "of water per person in the EU, from textile consumption (EEA)."), tr("Parlamento Europeu, 2022: 12 m³. 3.º lugar nas pressões sobre a água; cerca de 92% da água é usada fora da UE (2017). Uma t-shirt de algodão pede cerca de 2 700 litros (estimativa do Parlamento Europeu, método diferente). Sem dado por setor para Portugal.", "European Parliament, 2022: 12 m³. 3rd place for pressure on water; about 92% of the water is used outside the EU (2017). A cotton T-shirt takes about 2,700 litres (European Parliament estimate, different method). No sector data for Portugal."), [5, 6, 1]),
        rec(tr("Terra", "Land"), "400", "m²", tr("de terra por pessoa na UE, no consumo de têxteis (AEA).", "of land per person in the EU, from textile consumption (EEA)."), tr("Parlamento Europeu, 2022: 323 m². 3.º lugar nas pressões sobre a terra; cerca de 93% fora da UE (2017).", "European Parliament, 2022: 323 m². 3rd place for pressure on land; about 93% outside the EU (2017)."), [5, 6, 1]),
        rec(tr("Resíduos", "Waste"), "16", "kg", tr("de resíduos têxteis por pessoa na UE em 2022, contando o lixo misturado (AEA).", "of textile waste per person in the EU in 2022, counting mixed waste (EEA)."), tr(`Só os registados como têxteis: ${fmt(RW.PT[wu0], 1)} kg em Portugal e ${fmt(RW.EU27_2020[wu0], 1)} kg na UE (${wu0}).`, `Only those recorded as textiles: ${fmt(RW.PT[wu0], 1)} kg in Portugal and ${fmt(RW.EU27_2020[wu0], 1)} kg in the EU (${wu0}).`), [0, 4]),
        rec(tr("Qualidade do ar", "Air quality"), pct(arQ("NOX"), 1), "", tr(`do NOx de Portugal vem da indústria têxtil, de vestuário, couro e calçado (${yA}); nas partículas, PM10 e PM2,5 são ${pct(arQ("PM10"), 1)} cada.`, `of Portugal's NOx comes from the textile, clothing, leather and footwear industry (${yA}); for particles, PM10 and PM2.5 are ${pct(arQ("PM10"), 1)} each.`), tr(`É pouco: ${fmt(AR.NOX.texteis_vestuario_couro[yA], 1)} kt de NOx em ${yA}, contra ${fmt(AR.NOX.texteis_vestuario_couro[1995], 1)} kt em 1995. As contas seguem só a indústria residente em Portugal: não contam o fabrico, noutros países, da roupa que aqui se compra, nem o que a indústria deita para a água.`, `It is little: ${fmt(AR.NOX.texteis_vestuario_couro[yA], 1)} kt of NOx in ${yA}, against ${fmt(AR.NOX.texteis_vestuario_couro[1995], 1)} kt in 1995. The accounts follow only industry resident in Portugal: they do not count the manufacture, in other countries, of the clothes bought here, nor what the industry discharges into water.`), [3]),
        rec(tr("Química e microplásticos", "Chemicals and microplastics"), "700 000", tr("fibras", "fibres"), tr("podem sair de uma só máquina de roupa de poliéster (estimativa do Parlamento Europeu).", "can come out of a single load of polyester laundry (European Parliament estimate)."), tr("A AEA refere ainda PFAS em alguns têxteis e a libertação de microfibras na lavagem. Não temos números comparáveis para Portugal.", "The EEA also mentions PFAS in some textiles and the release of microfibres when washing. We have no comparable numbers for Portugal."), [5, 6])
      ].join("");
      const aA = anosDe(AR.NOX.texteis_vestuario_couro).filter((y) => AR.PM10.texteis_vestuario_couro[y] != null && AR.PM2_5.texteis_vestuario_couro[y] != null);
      legend(document.getElementById("mt-leg-ar"), [{ n: "NOx", c: COR.a }, { n: "PM10", c: COR.b }, { n: "PM2,5", c: COR.c }]);
      lin("mt-pt-ar", [{ n: "NOx", c: COR.a, v: aA.map((y) => arQ("NOX", y)) }, { n: "PM10", c: COR.b, v: aA.map((y) => arQ("PM10", y)) }, { n: "PM2,5", c: COR.c, v: aA.map((y) => arQ("PM2_5", y)) }], { x: aA, yf: (v) => fmt(v, 1) + "%", tf: (se, i) => fmt(se.v[i], 2) + "%" });
      lin("mt-pt-nox", [{ n: "NOx", c: COR.a, v: aA.map((y) => AR.NOX.texteis_vestuario_couro[y]) }], { x: aA, yf: (v) => fmt(v, 1), tf: (se, i) => fmt(se.v[i], 2) + " kt" });
      const aE = anosDe(ENG.texteis_vestuario_couro);
      lin("mt-pt-en", [{ n: tr("Têxteis, vestuário, couro e calçado", "Textiles, clothing, leather and footwear"), c: COR.a, v: aE.map((y) => ENG.texteis_vestuario_couro[y] / 1000) }], { x: aE, yf: (v) => fmt(v, 0), tf: (se, i) => fmt(se.v[i], 1) + " PJ" });

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
