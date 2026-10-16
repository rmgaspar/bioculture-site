/* Conhecimento para cuidar · Planeador de horta.
   Dados: /data/horticolas_master.json (épocas de sementeira, plantação e colheita, pH, família: fichas do bioCulture) e
   /data/planeador-horta.json (grupo de rotação de cada cultura e planos de 3 e 4 anos, segundo o RHS).
   Os meses lêem-se com BioCulturaSeasonal.periodMatches, o mesmo código do Calendário. Nada é inventado: a colheita só é
   estimada quando a ficha dá um prazo («30–70 dias», «8–12 semanas») contado desde a sementeira, e vem marcada como estimada. */
(function () {
  "use strict";

  /* ---------- lógica (exportada para os testes) ---------- */
  const MES = 30.4;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

  /* 12 booleanos (jan = 0) com os meses que o texto da ficha cobre; sem meses legíveis, tudo falso. */
  function mesesDe(texto, seasonal) {
    return Array.from({ length: 12 }, (_, m) => Boolean(texto) && seasonal.periodMatches(texto, m));
  }
  /* Colheita a partir do prazo «30–70 dias» ou «8–12 semanas» contado desde a sementeira; null se a ficha não o dá. */
  function colheitaEstimada(textoColheita, sementeira) {
    const m = String(textoColheita || "").match(/(\d+)\s*[–-]\s*(\d+)\s*(dias|semanas)/i);
    if (!m || !sementeira.some(Boolean)) return null;
    const f = /sem/i.test(m[3]) ? 7 : 1, a = +m[1] * f, b = +m[2] * f, out = Array(12).fill(false);
    sementeira.forEach((on, mes) => {
      if (!on) return;
      for (let k = Math.floor(a / MES); k <= Math.ceil(b / MES); k++) out[(mes + k) % 12] = true;
    });
    return out;
  }
  /* Janelas de uma cultura: S sementeira, T plantação, C colheita (declarada ou estimada). */
  function janelas(c, seasonal) {
    const S = mesesDe(c.sementeira, seasonal), T = mesesDe(c.plantacao_ou_transplante, seasonal);
    let C = mesesDe(c.colheita, seasonal), estimada = false;
    if (!C.some(Boolean)) { const e = colheitaEstimada(c.colheita, S); if (e) { C = e; estimada = true; } }
    return { S, T, C, estimada, abrigo: /abrigo/i.test(c.sementeira || "") };
  }
  /* «mar–mai, set–out» a partir de 12 booleanos; se jan e dez estão ligados, a faixa atravessa o ano. */
  function rotulo(arr, nomes, todo) {
    if (!arr.some(Boolean)) return "";
    if (arr.every(Boolean)) return todo || "∗";
    const runs = [];
    let i = 0;
    while (i < 12) {
      if (!arr[i]) { i++; continue; }
      let j = i;
      while (j + 1 < 12 && arr[j + 1]) j++;
      runs.push([i, j]); i = j + 1;
    }
    if (runs.length > 1 && runs[0][0] === 0 && runs[runs.length - 1][1] === 11) { const last = runs.pop(); runs[0][0] = last[0]; }
    return runs.map(([a, b]) => (a === b ? nomes[a] : nomes[a] + "–" + nomes[b])).join(", ");
  }
  /* Plano de rotação: o canteiro i, no ano y, recebe o passo (i + y) mod R do ciclo; cada grupo avança um canteiro por ano.
     Devolve a grelha, e os grupos que ficam sem canteiro quando há menos canteiros do que passos. */
  function planoRotacao(ciclo, camas, anos) {
    const R = ciclo.passos.length, grelha = [], faltam = [];
    for (let i = 0; i < camas; i++) grelha.push(Array.from({ length: anos }, (_, y) => (i + y) % R));
    for (let y = 0; y < anos; y++) {
      const usados = new Set(grelha.map((linha) => linha[y]));
      const fora = [];
      for (let p = 0; p < R; p++) if (!usados.has(p)) fora.push(p);
      faltam.push(fora);
    }
    return { R, grelha, faltam };
  }
  /* Canteiro de uma cultura livre (sem lugar fixo): muda de canteiro todos os anos. */
  const camaLivre = (indice, ano, camas) => (indice + ano) % camas;
  /* Pares que as fichas indicam: «favorável» ou «evitar» entre culturas escolhidas (compara nomes sem acentos). */
  function vizinhos(ids, master) {
    const out = [], chave = (s) => norm(s);
    const nomes = new Map(ids.map((id) => [chave(id), id]));
    ids.forEach((id) => {
      const c = master[id] || {};
      [["fav", c.consociacoes_favoraveis], ["evitar", c.evitar_consociar]].forEach(([tipo, lista]) => (lista || []).forEach((x) => {
        const alvo = nomes.get(chave(x));
        if (alvo && alvo !== id) out.push({ de: id, para: alvo, tipo });
      }));
    });
    return out;
  }
  window.BioCulturaPlaneador = { norm, mesesDe, colheitaEstimada, janelas, rotulo, planoRotacao, camaLivre, vizinhos };

  const G = window.BioCulturaGraficos, S = window.BioCulturaSeasonal, box = document.getElementById("relatorio-planeador");
  if (!G || !S || !box) return;
  const { EN, tr, esc } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Garden planner — bioCulture";
  }
  fetch("/sidebar-content.html?v=25").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=17"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => {
    if (!langQ) return href;
    const [p, hash] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) + (hash ? "#" + hash : "");
  };
  const voltar = document.getElementById("planeador-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/calendario/conhecimento-cuidar.html"));
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

  Promise.all([get("/data/horticolas_master.json"), get("/data/planeador-horta.json?v=1")])
    .then(([M, P]) => { build(M, P); barraFixa(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });

  const MESES = EN ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const CHAVE = "biocultura_horta";

  function build(M, P) {
    const culturas = P.culturas.filter((c) => M[c.id]);
    const porId = Object.fromEntries(culturas.map((c) => [c.id, c]));
    const grupo = (id) => P.grupos.find((g) => g.id === id);
    const nome = (id) => (EN ? porId[id].en : M[id].nome);
    const hoje = new Date(), mesAgora = hoje.getMonth();
    const J = Object.fromEntries(culturas.map((c) => [c.id, janelas(M[c.id], S)]));
    const rot = (arr) => rotulo(arr, MESES, tr("todo o ano", "all year"));

    /* estado: da ligação (?c=…&n=…&p=…&y=…), senão do que ficou guardado neste browser */
    const q = new URLSearchParams(location.search);
    let guardado = {};
    try { guardado = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch (e) { guardado = {}; }
    const doQ = q.get("c") !== null;
    const lista = (doQ ? q.get("c").split(",") : guardado.c || []).filter((id) => porId[id]);
    const estado = {
      sel: new Set(lista),
      camas: Math.min(8, Math.max(2, parseInt(doQ ? q.get("n") : guardado.n, 10) || 4)),
      ciclo: (doQ ? q.get("p") : guardado.p) === "3" ? "3" : "4",
      ano: parseInt(doQ ? q.get("y") : guardado.y, 10) || hoje.getFullYear()
    };

    box.innerHTML = `
<section id="horta">
  <div class="sec-head"><span class="eyebrow">${tr("1 · A tua horta", "1 · Your garden")}</span><h2>${tr("O que queres cultivar?", "What do you want to grow?")}</h2></div>
  <div class="prose"><p>${tr("Toca nas culturas para as juntar ao plano. Escolhe quantos canteiros tens e o plano de rotação; a página guarda a escolha só neste browser e dá-te uma ligação para a partilhares.", "Tap crops to add them to the plan. Choose how many beds you have and the rotation plan; the page keeps your choice in this browser only and gives you a link to share.")}</p></div>
  <div class="pl-ctl">
    <label>${tr("Canteiros", "Beds")}<select id="pl-camas">${[2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}">${n}</option>`).join("")}</select></label>
    <label>${tr("Plano de rotação", "Rotation plan")}<select id="pl-ciclo">${P.ciclos.map((c) => `<option value="${c.id}">${esc(EN ? c.en : c.pt)}</option>`).join("")}</select></label>
    <label>${tr("Primeiro ano", "First year")}<select id="pl-ano">${[0, 1, 2].map((k) => { const y = hoje.getFullYear() + k; return `<option value="${y}">${y}</option>`; }).join("")}</select></label>
    <div class="pl-acoes">
      <button type="button" id="pl-exemplo">${tr("Ver um exemplo", "See an example")}</button>
      <button type="button" id="pl-limpar">${tr("Limpar", "Clear")}</button>
    </div>
  </div>
  ${P.grupos.map((g) => `<div class="pl-grupo"><h3><i style="background:${g.cor}"></i>${esc(EN ? g.en : g.pt)}</h3><p>${esc(EN ? g.papel_en : g.papel_pt)}</p><div class="pl-chips" data-g="${g.id}">${culturas.filter((c) => c.grupo === g.id).map((c) => `<button type="button" data-id="${c.id}" aria-pressed="false">${esc(nome(c.id))}</button>`).join("")}</div></div>`).join("")}
  <p class="pl-conta" id="pl-conta" aria-live="polite"></p>
</section>

<section id="ano">
  <div class="sec-head"><span class="eyebrow">${tr("2 · O ano", "2 · The year")}</span><h2>${tr("Quando semear, plantar e colher", "When to sow, plant and harvest")}</h2></div>
  <div id="pl-agora"></div>
  <div id="pl-cal"></div>
</section>

<section id="rotacao">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Rotação", "3 · Rotation")}</span><h2>${tr("Onde cultivar em cada ano", "Where to grow each year")}</h2></div>
  <div id="pl-rot"></div>
</section>

<section id="fichas">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Culturas", "4 · Crops")}</span><h2>${tr("As culturas escolhidas, em resumo", "Your chosen crops, at a glance")}</h2></div>
  <div id="pl-fichas"></div>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Limites e fontes", "5 · Limits and sources")}</span><h2>${tr("O que este plano não diz", "What this plan does not tell")}</h2></div>
  <ol class="notes" id="pl-notas"></ol>
  <div class="srcs" id="pl-fontes"></div>
</section>`;

    document.getElementById("pl-notas").innerHTML = [
      tr("<strong>As épocas são orientativas.</strong> Vêm das fichas das culturas, para Portugal continental, e não olham à tua região, à altitude, à geada nem à variedade: antecipa ou atrasa conforme o teu sítio. Em <a href=\"" + comLang("/calendario/meu-terreno.html") + "\">O meu terreno</a> vês as mínimas previstas para os próximos dias, e o <a href=\"" + comLang("/calendario/calendario.html") + "\">Calendário</a> ajusta o mês ao teu concelho.", "<strong>Times are indicative.</strong> They come from the crop sheets, for mainland Portugal, and ignore your region, altitude, frost and variety: bring them forward or push them back for your place. In <a href=\"" + comLang("/calendario/meu-terreno.html") + "\">My plot</a> you can see the forecast minimums for the coming days, and the <a href=\"" + comLang("/calendario/calendario.html") + "\">Calendar</a> tailors the month to your municipality."),
      tr("<strong>A colheita estimada</strong> (barra mais clara) só aparece quando a ficha dá um prazo desde a sementeira (por exemplo, «8–12 semanas») e conta-se a partir dos meses de sementeira. Onde a ficha só diz «variável» ou fala de estações, não desenhamos barra.", "<strong>Estimated harvest</strong> (lighter bar) only appears when the sheet gives a time from sowing (for example, “8–12 weeks”) and is counted from the sowing months. Where the sheet only says “variable” or mentions seasons, we draw no bar."),
      tr("<strong>A rotação segue o RHS.</strong> Os grupos, a ordem em que se sucedem e os planos de três e quatro anos são os do RHS; as culturas «livres» (cucurbitáceas, saladas, espinafre, batata-doce, manjericão) não têm lugar fixo e mudam de canteiro todos os anos. Com menos canteiros do que passos do plano, há grupos que não têm sítio em certos anos, e a página diz quais.", "<strong>The rotation follows RHS.</strong> The groups, the order they follow and the three- and four-year plans are RHS’s; “free” crops (cucurbits, salads, spinach, sweet potato, basil) have no fixed place and change bed every year. With fewer beds than plan steps, some groups have no place in some years, and the page says which."),
      tr("<strong>Falta o espaçamento e a quantidade.</strong> Não há aqui distâncias entre plantas nem número de plantas por canteiro: as fichas não dão valores fiáveis para isso. As «vizinhanças» são só as que as fichas já dizem, entre culturas que escolheste: são sugestões, não regras.", "<strong>Spacing and quantity are missing.</strong> There are no plant distances or plants per bed here: the sheets do not give reliable values for that. The “neighbours” are only those the sheets already state, between crops you picked: they are suggestions, not rules."),
      tr("<strong>E depois da colheita?</strong> Para vender o que produzes, vê os <a href=\"" + comLang("/calendario/circuitos-curtos.html") + "\">circuitos curtos</a>; e os <a href=\"" + comLang("/calendario/apoios.html") + "\">apoios</a> dizem o que a PAC paga a quem cuida da terra.", "<strong>And after the harvest?</strong> To sell what you grow, see the <a href=\"" + comLang("/calendario/circuitos-curtos.html") + "\">short chains</a>; and the <a href=\"" + comLang("/calendario/apoios.html") + "\">supports</a> say what the CAP pays those who care for the land."),
      tr("<strong>Privacidade.</strong> A escolha fica guardada só neste browser e na ligação que copiares. Não enviamos nada a ninguém.", "<strong>Privacy.</strong> Your choice is kept in this browser only and in the link you copy. We send nothing to anyone.")
    ].map((t) => `<li>${t}</li>`).join("");
    document.getElementById("pl-fontes").innerHTML = Object.values(P.fontes).map((f) => `<div class="srcc"><h3>${esc(EN ? f.nome_en : f.nome)}</h3><p>${esc(EN ? f.usa_en : f.usa_pt)}</p><span class="u"><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a></span></div>`).join("")
      + `<div class="srcc"><h3>${tr("Fichas das culturas · bioCulture", "Crop sheets · bioCulture")}</h3><p>${tr("As épocas de sementeira, plantação e colheita e o pH de cada cultura, das fichas do Calendário (cada uma cita a sua fonte).", "Sowing, planting and harvest times and each crop’s pH, from the Calendar sheets (each cites its source).")}</p><span class="u"><a href="${comLang("/calendario/calendario.html")}">/calendario/calendario</a></span></div>`;

    const $ = (id) => document.getElementById(id);
    $("pl-camas").value = String(estado.camas); $("pl-ciclo").value = estado.ciclo; $("pl-ano").value = String(estado.ano);
    if (![...$("pl-ano").options].some((o) => +o.value === estado.ano)) { const o = document.createElement("option"); o.value = o.textContent = estado.ano; $("pl-ano").appendChild(o); $("pl-ano").value = String(estado.ano); }

    function guardar() {
      const ids = [...estado.sel];
      try { localStorage.setItem(CHAVE, JSON.stringify({ c: ids, n: estado.camas, p: estado.ciclo, y: estado.ano })); } catch (e) { /* sem armazenamento: só a ligação */ }
      try {
        const u = new URL(location.href);
        if (ids.length) { u.searchParams.set("c", ids.join(",")); u.searchParams.set("n", estado.camas); u.searchParams.set("p", estado.ciclo); u.searchParams.set("y", estado.ano); } else ["c", "n", "p", "y"].forEach((k) => u.searchParams.delete(k));
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      } catch (e) { /* ignorar */ }
    }

    const vazio = (t) => `<p class="pl-vazio">${t}</p>`;
    function pintar() {
      const ids = culturas.map((c) => c.id).filter((id) => estado.sel.has(id));
      document.querySelectorAll(".pl-chips button").forEach((b) => b.setAttribute("aria-pressed", String(estado.sel.has(b.dataset.id))));
      $("pl-conta").textContent = ids.length ? tr(`${ids.length} culturas no plano`, `${ids.length} crops in the plan`) : tr("Ainda não escolheste nenhuma cultura.", "You have not picked any crop yet.");
      pintarAno(ids); pintarRotacao(ids); pintarFichas(ids);
      guardar();
    }

    function pintarAno(ids) {
      if (!ids.length) { $("pl-agora").innerHTML = ""; $("pl-cal").innerHTML = vazio(tr("Escolhe culturas na secção anterior para veres o ano.", "Pick crops in the previous section to see the year.")); return; }
      const agora = (k) => ids.filter((id) => J[id][k][mesAgora]);
      const lin = (rot, arr) => `<div class="pl-ag"><strong>${rot}</strong><span>${arr.length ? arr.map((id) => esc(nome(id))).join(", ") : "–"}</span></div>`;
      $("pl-agora").innerHTML = `<div class="pl-agora"><h3>${tr("Este mês", "This month")} (${MESES[mesAgora]})</h3>${lin(tr("Semear", "Sow"), agora("S"))}${lin(tr("Plantar", "Plant"), agora("T"))}${lin(tr("Colher", "Harvest"), agora("C"))}</div>`;
      const cab = `<tr><th></th>${MESES.map((m, i) => `<th class="${i === mesAgora ? "pl-hoje" : ""}">${m}</th>`).join("")}</tr>`;
      const linhas = ids.map((id) => {
        const j = J[id], g = grupo(porId[id].grupo);
        const celulas = MESES.map((m, i) => `<td class="${i === mesAgora ? "pl-hoje" : ""}"><span class="pl-b">${j.S[i] ? `<i class="s"></i>` : "<i></i>"}${j.T[i] ? `<i class="t"></i>` : "<i></i>"}${j.C[i] ? `<i class="c${j.estimada ? " e" : ""}"></i>` : "<i></i>"}</span></td>`).join("");
        const desc = `${nome(id)}: ${tr("semear", "sow")} ${rot(j.S) || "–"}; ${tr("plantar", "plant")} ${rot(j.T) || "–"}; ${tr("colher", "harvest")} ${rot(j.C) || "–"}`;
        return `<tr aria-label="${esc(desc)}"><th scope="row"><i class="pl-dot" style="background:${g.cor}"></i>${esc(nome(id))}</th>${celulas}</tr>`;
      }).join("");
      $("pl-cal").innerHTML = `<div class="pl-leg"><span><i class="s"></i>${tr("Semear", "Sow")}</span><span><i class="t"></i>${tr("Plantar", "Plant")}</span><span><i class="c"></i>${tr("Colher", "Harvest")}</span><span><i class="c e"></i>${tr("Colheita estimada", "Estimated harvest")}</span></div>
<div class="tscroll full"><table class="pl-tab" aria-label="${tr("Calendário das culturas escolhidas", "Calendar of the chosen crops")}"><thead>${cab}</thead><tbody>${linhas}</tbody></table></div>`;
    }

    function pintarRotacao(ids) {
      const ciclo = P.ciclos.find((c) => c.id === estado.ciclo), N = estado.camas, anos = ciclo.passos.length;
      if (!ids.length) { $("pl-rot").innerHTML = vazio(tr("Escolhe culturas para veres a rotação.", "Pick crops to see the rotation.")); return; }
      const { R, grelha, faltam } = planoRotacao(ciclo, N, anos);
      const doPasso = (p) => ids.filter((id) => p.grupos.includes(porId[id].grupo));
      const cor = (p) => grupo(p.grupos[0]).cor;
      const cab = `<tr><th></th>${Array.from({ length: anos }, (_, y) => `<th>${tr("Ano", "Year")} ${y + 1}<small>${estado.ano + y}</small></th>`).join("")}</tr>`;
      const linhas = grelha.map((linha, i) => `<tr><th scope="row">${tr("Canteiro", "Bed")} ${i + 1}</th>${linha.map((p) => {
        const passo = ciclo.passos[p], cs = doPasso(passo);
        return `<td style="--c:${cor(passo)}"><strong>${esc(EN ? passo.en : passo.pt)}</strong>${cs.length ? `<span>${cs.map((id) => esc(nome(id))).join(", ")}</span>` : `<em>${tr("cobertura do solo ou pousio", "soil cover or fallow")}</em>`}</td>`;
      }).join("")}</tr>`).join("");
      const avisos = [];
      if (N < R) avisos.push(tr(`Com ${N} canteiros não cabem os ${R} passos do plano: em cada ano há grupos sem canteiro (${faltam.map((f, y) => `ano ${y + 1}: ${f.map((p) => (ciclo.passos[p].pt)).join(" e ")}`).join("; ")}). Para cumprir a pausa, dá-lhes outro canteiro ou usa o plano de 3 anos.`, `With ${N} beds the plan’s ${R} steps do not fit: each year some groups have no bed (${faltam.map((f, y) => `year ${y + 1}: ${f.map((p) => ciclo.passos[p].en).join(" and ")}`).join("; ")}). To keep the break, give them another bed or use the 3-year plan.`));
      const semGrupo = ciclo.passos.filter((p) => !doPasso(p).length).map((p) => (EN ? p.en : p.pt));
      if (semGrupo.length) avisos.push(tr(`Não escolheste culturas de: ${semGrupo.join(", ")}. Nesses anos o canteiro fica para cobertura do solo (adubo verde) ou pousio, o que também faz parte da rotação.`, `You did not pick crops from: ${semGrupo.join(", ")}. In those years the bed is left for soil cover (green manure) or fallow, which is also part of the rotation.`));
      const livres = ids.filter((id) => porId[id].grupo === "livres");
      const tabLivres = livres.length ? `<h3 class="pl-h3">${tr("Culturas livres", "Free crops")}</h3><p class="pl-nota">${esc(EN ? grupo("livres").papel_en : grupo("livres").papel_pt)} ${tr("Aqui mudam de canteiro todos os anos:", "Here they change bed every year:")}</p>
<div class="tscroll full"><table class="pl-tab pl-liv"><thead>${cab}</thead><tbody>${livres.map((id, k) => `<tr><th scope="row"><i class="pl-dot" style="background:${grupo("livres").cor}"></i>${esc(nome(id))}</th>${Array.from({ length: anos }, (_, y) => `<td>${tr("Canteiro", "Bed")} ${camaLivre(k, y, N) + 1}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
      $("pl-rot").innerHTML = `<div class="prose"><p>${esc(EN ? ciclo.nota_en : ciclo.nota_pt)} ${tr("Cada grupo avança um canteiro por ano, pela ordem:", "Each group moves one bed forward each year, in this order:")} <strong>${ciclo.passos.map((p) => esc(EN ? p.en : p.pt)).join(" → ")}</strong>.</p></div>
<div class="tscroll full"><table class="pl-tab pl-rot"><thead>${cab}</thead><tbody>${linhas}</tbody></table></div>
${avisos.map((a) => `<p class="pl-aviso">${a}</p>`).join("")}${tabLivres}
<div class="pl-acoes pl-fim"><button type="button" id="pl-copiar">${tr("Copiar a ligação deste plano", "Copy this plan’s link")}</button><button type="button" id="pl-imprimir">${tr("Imprimir", "Print")}</button><span id="pl-msg" aria-live="polite"></span></div>`;
      $("pl-copiar").addEventListener("click", async () => {
        guardar();
        const msg = $("pl-msg");
        try { await navigator.clipboard.writeText(location.href); msg.textContent = tr("Ligação copiada.", "Link copied."); } catch (e) { msg.textContent = tr("Copia o endereço do browser: já tem o teu plano.", "Copy the browser address: it already has your plan."); }
      });
      $("pl-imprimir").addEventListener("click", () => window.print());
    }

    function pintarFichas(ids) {
      if (!ids.length) { $("pl-fichas").innerHTML = vazio(tr("Sem culturas escolhidas.", "No crops chosen.")); return; }
      const pares = vizinhos(ids, M);
      const cartoes = ids.map((id) => {
        const c = M[id], j = J[id], g = grupo(porId[id].grupo);
        return `<article class="pl-ficha"><h3><i class="pl-dot" style="background:${g.cor}"></i>${esc(nome(id))}<small>${esc(c.nome_cientifico || "")}</small></h3>
<dl><div><dt>${tr("Grupo", "Group")}</dt><dd>${esc(EN ? g.en : g.pt)}</dd></div>
<div><dt>${tr("Semear", "Sow")}</dt><dd>${rot(j.S) || "–"}${j.abrigo ? ` <small>(${tr("em abrigo", "sheltered")})</small>` : ""}</dd></div>
<div><dt>${tr("Plantar", "Plant")}</dt><dd>${rot(j.T) || tr("sementeira direta ou ver a ficha", "direct sowing or see the sheet")}</dd></div>
<div><dt>${tr("Colher", "Harvest")}</dt><dd>${rot(j.C) || tr("ver a ficha", "see the sheet")}${j.estimada ? ` <small>(${tr("estimada", "estimated")})</small>` : ""}</dd></div>
${c.ph_solo ? `<div><dt>pH</dt><dd>${esc(c.ph_solo)}</dd></div>` : ""}</dl>
<a href="${comLang("/calendario/horticola-detalhe.html?id=" + encodeURIComponent(id))}">${tr("Ficha completa →", "Full sheet →")}</a></article>`;
      }).join("");
      const viz = pares.length ? `<h3 class="pl-h3">${tr("Vizinhanças que as fichas indicam", "Neighbours the sheets indicate")}</h3><ul class="pl-viz">${pares.map((p) => `<li class="${p.tipo}"><b>${p.tipo === "fav" ? "✓" : "✗"}</b> ${tr(`A ficha de ${esc(nome(p.de))} ${p.tipo === "fav" ? "sugere" : "manda evitar"} ${esc(nome(p.para))} ao lado.`, `The ${esc(nome(p.de))} sheet ${p.tipo === "fav" ? "suggests" : "says to avoid"} ${esc(nome(p.para))} nearby.`)}</li>`).join("")}</ul>` : "";
      $("pl-fichas").innerHTML = `<div class="pl-fichas">${cartoes}</div>${viz}`;
    }

    document.querySelectorAll(".pl-chips button").forEach((b) => b.addEventListener("click", () => { const id = b.dataset.id; if (estado.sel.has(id)) estado.sel.delete(id); else estado.sel.add(id); pintar(); }));
    $("pl-camas").addEventListener("change", (e) => { estado.camas = +e.target.value; pintar(); });
    $("pl-ciclo").addEventListener("change", (e) => { estado.ciclo = e.target.value; pintar(); });
    $("pl-ano").addEventListener("change", (e) => { estado.ano = +e.target.value; pintar(); });
    $("pl-exemplo").addEventListener("click", () => { estado.sel = new Set(P.exemplo.filter((id) => porId[id])); estado.camas = 4; estado.ciclo = "4"; $("pl-camas").value = "4"; $("pl-ciclo").value = "4"; pintar(); });
    $("pl-limpar").addEventListener("click", () => { estado.sel = new Set(); pintar(); });
    pintar();
    if (/^#(horta|ano|rotacao|fichas|limites)$/.test(location.hash)) setTimeout(() => document.getElementById(location.hash.slice(1)).scrollIntoView({ block: "start" }), 80);
  }
})();
