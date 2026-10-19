/* Conhecimento para cuidar · Apoios (PEPAC no Continente).
   Dados: /data/apoios.json (resumo editorial das regras do IFAP, com a ligação à regra de cada apoio e as datas do PU 2026)
   e /data/apoios-concursos.json (concursos da Autoridade de Gestão, gerado por scripts/dados/pepac_concursos.py).
   O estado de cada concurso (aberto, a abrir, encerrado) calcula-se aqui, com o dia da visita, a partir das datas oficiais.
   Nada tem valores inventados: o que não está nas fontes aparece como «ver a regra». */
(function () {
  "use strict";

  /* ---------- lógica (exportada para os testes) ---------- */
  const hojeISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  /* «aberto», «abrir» (ainda não começou), «encerrado» ou «ver» (período ilegível: vale a linha oficial). */
  function estadoConcurso(c, hoje) {
    if (!c.inicio || !c.fim) return "ver";
    if (hoje < c.inicio) return "abrir";
    return hoje <= c.fim ? "aberto" : "encerrado";
  }
  const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  window.BioCulturaApoios = { estadoConcurso, hojeISO, diasEntre };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-apoios");
  if (!G || !box) return;
  const { EN, tr, esc } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Supports for the land — bioCulture";
  }
  fetch("/sidebar-content.html?v=28").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=19"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => (langQ ? href + (href.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) : href);
  const voltar = document.getElementById("apoios-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/calendario/conhecimento-cuidar.html"));
  const get = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); });

  Promise.all([get("/data/apoios.json?v=1"), get("/data/apoios-concursos.json?v=1").catch(() => null)])
    .then(([D, C]) => { build(D, C); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });

  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  const dmy = (iso) => { const p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; };
  const P = (o, k) => (EN ? o[k + "_en"] || o[k + "_pt"] : o[k + "_pt"]);
  const src = (D, id) => D.fontes.find((f) => f.id === id);

  function build(D, C) {
    const hoje = hojeISO();
    const concursos = (C && C.concursos ? C.concursos : []).map((c) => ({ ...c, estado: estadoConcurso(c, hoje) }));
    const abertos = concursos.filter((c) => c.estado === "aberto").sort((a, b) => (a.fim < b.fim ? -1 : 1));
    const aAbrir = concursos.filter((c) => c.estado === "abrir").sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
    const encerrados = concursos.filter((c) => c.estado === "encerrado" || c.estado === "ver");
    const novos = D.apoios.filter((a) => a.novos === "sim");
    const j0 = D.pu2026.janelas[0];
    const aberto = hoje >= j0.inicio && hoje <= j0.fim;
    const decorreu = hoje > j0.fim;

    const BADGE = {
      sim: [tr("Aceita candidatos novos em 2026", "Accepts new applicants in 2026"), "ok"],
      anual: [tr("Candidatura todos os anos", "Apply every year"), "an"],
      nao: [tr("Fechado a compromissos novos em 2026", "Closed to new commitments in 2026"), "no"],
      ver: [tr("Ver as regras para novos candidatos", "Check the rules for new applicants"), "ver"]
    };

    box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Sumário", "1 · Summary")}</span><h2>${tr("O que dá para pedir, e quando", "What you can ask for, and when")}</h2></div>
  <div class="prose">
    <p>${tr("O PEPAC (Plano Estratégico da Política Agrícola Comum) paga a quem cuida da terra de formas que a lei reconhece: agricultura biológica, gestão da pastagem, fertilização orgânica, biodiversidade na exploração, conservação do solo, montado. Esta página junta o essencial do <strong>Continente</strong> num sítio só, resumido das regras do IFAP, com a ligação à regra de cada apoio. <strong>Não é uma candidatura nem aconselhamento:</strong> o que vale é sempre o aviso e a portaria.", "The CAP Strategic Plan (PEPAC) pays those who care for the land in ways the law recognises: organic farming, pasture management, organic fertilisation, biodiversity on the holding, soil conservation, montado. This page gathers the essentials for <strong>mainland Portugal</strong> in one place, summarised from IFAP’s rules, with a link to each support’s rule. <strong>It is not an application nor advice:</strong> the call and the ordinance are what count.")}</p>
  </div>
  <div class="tiles">
    <div class="tile"><span class="v">${dmy(j0.inicio).slice(0, 5)}–${dmy(j0.fim).slice(0, 5)}<small>${j0.fim.slice(0, 4)}</small></span><span class="k">${tr("janela do Pedido Único de 2026, sem penalização", "2026 Single Application window, without penalty")}</span><span class="s">${aberto ? tr("está aberta agora", "open now") : decorreu ? tr("já terminou; as datas de 2027 ainda não estavam no IFAP em " + dmy(D.verificado), "it has ended; the 2027 dates were not yet on IFAP’s site on " + dmy(D.verificado)) : tr("ainda não começou", "has not started yet")}</span></div>
    <div class="tile"><span class="v">${abertos.length}<small>${tr("concursos", "calls")}</small></span><span class="k">${tr("abertos hoje no PEPAC do Continente", "open today in the mainland CAP Plan")}</span><span class="s">${aAbrir.length ? tr(`e ${aAbrir.length} a abrir`, `and ${aAbrir.length} about to open`) : tr("investimento, instalação e outros", "investment, farm start-up and others")}</span></div>
    <div class="tile"><span class="v">${D.apoios.length}<small>${tr("apoios", "supports")}</small></span><span class="k">${tr("descritos nesta página", "described on this page")}</span><span class="s">${tr("com a regra oficial ligada", "each linked to its official rule")}</span></div>
    <div class="tile"><span class="v">${novos.length}</span><span class="k">${tr("compromissos de vários anos aceitam candidatos novos em 2026", "multi-year commitments accept new applicants in 2026")}</span><span class="s">${novos.map((a) => a.id).join(" · ")}</span></div>
  </div>
  <p class="ap-nota">${P(D, "reprogramacao")}</p>
</section>

<section id="comecar">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Por onde começar", "2 · Where to start")}</span><h2>${tr("Cinco passos, pela ordem em que as coisas costumam acontecer", "Five steps, in the order things usually happen")}</h2></div>
  <ol class="ap-passos">
    <li><strong>${tr("Parcelas no iSIP.", "Parcels in iSIP.")}</strong> ${tr("Os apoios por área assentam no parcelário do IFAP. Antes de te candidatares, confirma na área reservada do portal do IFAP (iSIP) que as parcelas e o uso do solo registados estão corretos: é por eles que se contam os hectares.", "Area-based supports rest on IFAP’s parcel register. Before applying, check in the reserved area of IFAP’s portal (iSIP) that the registered parcels and land use are correct: hectares are counted from them.")}</li>
    <li><strong>${tr("Escolhe o apoio que serve a tua prática.", "Pick the support that fits your practice.")}</strong> ${tr("Lê os cartões abaixo e, em cada um, a regra completa no IFAP. Para quem começa, os que aceitam candidatos novos em 2026 são a agricultura biológica, a produção integrada e as raças autóctones; os ecorregimes pedem-se todos os anos.", "Read the cards below and, on each, the full rule at IFAP. For newcomers, those accepting new applicants in 2026 are organic farming, integrated production and native breeds; eco-schemes are applied for every year.")}</li>
    <li><strong>${tr("Prepara o que a regra exige antes do Pedido Único.", "Prepare what the rule requires before the Single Application.")}</strong> ${tr("Na agricultura biológica, notificar a DGADR até ao primeiro dia útil do ano, ter a área sob um organismo de controlo e a formação ou assistência técnica pedida. No maneio da pastagem, um plano de gestão do pastoreio e da fertilização feito por um técnico. Na fertilização orgânica, um plano de fertilização aprovado.", "For organic farming, notify DGADR by the first working day of the year, have the area under a control body and the training or technical assistance required. For pasture management, a grazing and fertilisation plan made by a technician. For organic fertilisation, an approved fertilisation plan.")}</li>
    <li><strong>${tr("Candidata-te no Pedido Único, dentro da janela.", "Apply in the Single Application, within the window.")}</strong> ${tr(`Em 2026 foi de ${dmy(j0.inicio)} a ${dmy(j0.fim)}. Faz-se na área reservada do portal do IFAP ou numa entidade reconhecida, numa sala de atendimento.`, `In 2026 it ran from ${dmy(j0.inicio)} to ${dmy(j0.fim)}. It is done in the reserved area of IFAP’s portal or at a recognised body, in a service office.`)} <a href="${src(D, "ifap-pu").url}" target="_blank" rel="noopener">${tr("Calendário no IFAP", "Calendar at IFAP")}</a>.</li>
    <li><strong>${tr("Investimento e instalação têm concursos próprios.", "Investment and farm start-up have their own calls.")}</strong> ${tr("Abrem e fecham ao longo do ano e cada um tem o seu aviso: vê a secção «Concursos» e confirma sempre no site da Autoridade de Gestão.", "They open and close during the year and each has its own call: see the “Open calls” section and always confirm on the Managing Authority’s site.")}</li>
  </ol>
</section>

<section id="apoios">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Os apoios", "3 · The supports")}</span><h2>${tr("O que cada apoio pede, em resumo", "What each support asks for, in short")}</h2></div>
  <div class="prose"><p>${P(D, "novos")}</p></div>
  <div class="ap-filtros" id="ap-filtros" role="group" aria-label="${tr("Filtrar apoios", "Filter supports")}">
    <button type="button" data-g="todos" aria-pressed="true">${tr("Todos", "All")}</button>
    ${D.grupos.map((g) => `<button type="button" data-g="${g.id}" aria-pressed="false">${esc(EN ? g.en : g.pt)}</button>`).join("")}
    <label class="ap-so-novos"><input type="checkbox" id="ap-novos"> ${tr("Só os que aceitam candidatos novos em 2026", "Only those accepting new applicants in 2026")}</label>
  </div>
  <div id="ap-lista"></div>
</section>

<section id="concursos">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Concursos", "4 · Open calls")}</span><h2>${tr("Investimento, instalação e outros, abertos agora", "Investment, farm start-up and others, open now")}</h2></div>
  <div class="prose"><p>${tr("Lista lida do site da Autoridade de Gestão do PEPAC no Continente e atualizada toda a semana. O período de cada concurso é o que está escrito no aviso; o estado («aberto», «a abrir», «encerrado») calcula-se aqui com a data de hoje. Inclui concursos para a floresta e outros fora da agricultura de pequena escala: usa a pesquisa.", "List read from the mainland CAP Plan Managing Authority’s site and refreshed every week. Each call’s period is what is written in the call; the state (“open”, “about to open”, “closed”) is computed here with today’s date. It includes calls for forestry and others beyond small-scale farming: use the search.")}</p></div>
  <div class="ap-filtros"><input type="search" id="ap-busca" placeholder="${tr("Pesquisar concursos (jovens agricultores, regadio, apicultura…)", "Search calls (young farmers, irrigation, beekeeping…)")}" aria-label="${tr("Pesquisar concursos", "Search calls")}"></div>
  <div id="ap-concursos"></div>
  <p class="ap-nota">${C ? tr(`Dados lidos a ${dmy(C.gerado)}.`, `Data read on ${dmy(C.gerado)}.`) + " " : ""}<a href="${src(D, "pepacc").url}" target="_blank" rel="noopener">${tr("Todos os concursos no site oficial", "All calls on the official site")}</a>.</p>
</section>

<section id="calendario">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Datas", "5 · Dates")}</span><h2>${tr("O Pedido Único de 2026 e o que vem a seguir", "The 2026 Single Application and what comes next")}</h2></div>
  <div class="tscroll full"><table class="ap-tab"><thead><tr><th>${tr("Formulário", "Form")}</th><th>${tr("Início", "Start")}</th><th>${tr("Fim", "End")}</th></tr></thead><tbody>
    ${D.pu2026.janelas.map((j) => `<tr><th>${esc(EN ? j.en : j.pt)}</th><td>${dmy(j.inicio)}</td><td>${dmy(j.fim)}</td></tr>`).join("")}
  </tbody></table></div>
  <p class="ap-nota">${P(D.pu2026, "nota")} ${tr(`Página do IFAP atualizada a ${dmy(D.pu2026.atualizado)}. As datas do Pedido Único de 2027 ainda não estavam publicadas quando verificámos (${dmy(D.verificado)}); o IFAP publica-as no mesmo sítio.`, `IFAP page updated ${dmy(D.pu2026.atualizado)}. The 2027 Single Application dates were not yet published when we checked (${dmy(D.verificado)}); IFAP publishes them in the same place.`)}</p>
  <p class="ap-nota">${tr("Os pagamentos do Apoio ao Rendimento Base e dos Pequenos Agricultores de 2026 fazem-se em, no máximo, duas prestações entre 1 de dezembro de 2026 e 30 de junho de 2027.", "2026 Basic Income Support and Small Farmers payments are made in at most two instalments between 1 December 2026 and 30 June 2027.")} <a href="https://www.ifap.pt/portal/calendario-indicativo-de-pagamentos-de-apoio" target="_blank" rel="noopener">${tr("Calendário indicativo de pagamentos (IFAP)", "Indicative payment calendar (IFAP)")}</a>.</p>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("6 · Limites e fontes", "6 · Limits and sources")}</span><h2>${tr("O que esta página não faz", "What this page does not do")}</h2></div>
  <ol class="notes" id="ap-notas"></ol>
  <div class="srcs" id="ap-fontes"></div>
</section>`;

    // Notas
    document.getElementById("ap-notas").innerHTML = [
      tr("<strong>É um resumo, não a regra.</strong> Cada cartão diz o essencial do que o IFAP escreve; os critérios completos, as exceções e os documentos estão na página de regras ligada. A decisão sobre a tua elegibilidade é do IFAP e da Autoridade de Gestão, e pode pedir a ajuda de uma DRAP, de uma associação de agricultores ou de um técnico.", "<strong>It is a summary, not the rule.</strong> Each card gives the gist of what IFAP writes; the full criteria, exceptions and documents are on the linked rules page. The decision on your eligibility is IFAP’s and the Managing Authority’s, and you can ask for help from a regional directorate (DRAP), a farmers’ association or a technician."),
      tr("<strong>As regras mudam.</strong> Em setembro de 2026 foi publicada a Portaria n.º 426/2026/1, que altera vários regimes dos eixos C e D, e o PEPAC já foi reprogramado (a agricultura biológica e a produção integrada mudaram de ecorregime para compromisso plurianual). Confirma sempre a versão em vigor.", "<strong>Rules change.</strong> In September 2026 Ordinance 426/2026/1 was published, amending several Axis C and D regimes, and the plan has already been reprogrammed (organic farming and integrated production moved from eco-scheme to multi-year commitment). Always check the version in force."),
      tr("<strong>Quase sem valores, de propósito.</strong> Só o Apoio ao Rendimento Base e o Pagamento aos Pequenos Agricultores têm valores indicativos publicados nas regras. Nos ecorregimes e nos compromissos agroambientais o montante depende do grupo de culturas e da campanha e vem em tabelas do IFAP; e os montantes unitários são indicativos: se a dotação for ultrapassada há uma redução linear.", "<strong>Almost no amounts, on purpose.</strong> Only Basic Income Support and the Small Farmers Payment have indicative amounts published in their rules. For eco-schemes and agri-environment commitments the amount depends on the crop group and the campaign and comes in IFAP tables; and unit amounts are indicative: if the budget is exceeded there is a linear reduction."),
      tr("<strong>Só o Continente.</strong> Os Açores e a Madeira têm autoridades de gestão e avisos próprios. Os apoios das áreas protegidas, do Douro, do Barroso e outros planos zonais (eixo D) têm regras específicas e não estão todos aqui.", "<strong>Mainland only.</strong> The Azores and Madeira have their own managing authorities and calls. Supports for protected areas, the Douro, the Barroso and other zonal plans (Axis D) have specific rules and are not all here."),
      tr("<strong>«Aceita candidatos novos» é a leitura de uma nota do IFAP</strong> sobre o Pedido Único de 2026: só C.1.1.8, C.1.1.7 e C.1.1.4 aceitam compromissos novos e aumentos; para o montado de gestão por resultados (D.2.2) e outros do eixo D a nota não diz, e pede-se «ver as regras». O prazo de cada concurso é o do aviso, não o desta lista.", "<strong>“Accepts new applicants” reads an IFAP note</strong> on the 2026 Single Application: only C.1.1.8, C.1.1.7 and C.1.1.4 accept new commitments and increases; for results-based montado management (D.2.2) and other Axis D supports the note does not say, hence “check the rules”. Each call’s deadline is the call’s own, not this list’s."),
      tr(`<strong>Siglas.</strong> PEPAC, PU, iSIP, ARB, PPA, ecorregime, condicionalidade ou OC estão explicados no <a href="${comLang("/glossario.html")}">Glossário</a>.`, `<strong>Acronyms.</strong> PEPAC, PU, iSIP, ARB, PPA, eco-scheme, cross-compliance or OC are explained in the <a href="${comLang("/glossario.html")}">Glossary</a>.`),
      tr("<strong>O bioCulture não é uma entidade oficial</strong> e não trata de candidaturas. Esta página não usa dados pessoais: lê ficheiros públicos e não guarda nada sobre ti.", "<strong>bioCulture is not an official body</strong> and does not handle applications. This page uses no personal data: it reads public files and stores nothing about you.")
    ].map((t) => `<li>${t}</li>`).join("");
    document.getElementById("ap-fontes").innerHTML = D.fontes.map((f) => `<div class="srcc"><h3>${esc(EN ? f.nome_en : f.nome)}</h3><p>${esc(EN ? f.usa_en : f.usa_pt)}</p><span class="u"><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a></span></div>`).join("")
      + `<div class="srcc"><h3>${tr("Ajuda oficial", "Official help")}</h3><p>${tr("Contactos do IFAP (apoio ao Pedido Único) e da Autoridade de Gestão do PEPAC no Continente.", "Contacts of IFAP (Single Application support) and of the mainland CAP Plan Managing Authority.")}</p><span class="u"><a href="https://www.ifap.pt/portal/contactos" target="_blank" rel="noopener">ifap.pt/portal/contactos</a> · <a href="https://pepacc.pt/contactos/" target="_blank" rel="noopener">pepacc.pt/contactos</a></span></div>`;

    // Cartões dos apoios
    let grupo = "todos", soNovos = false;
    const lista = document.getElementById("ap-lista");
    const cartao = (a) => {
      const [txt, tom] = BADGE[a.novos];
      return `<article class="ap-card" id="ap-${a.id.replace(/\./g, "-")}">
  <header><span class="ap-cod">${a.id}</span><span class="ap-badge ap-${tom}">${txt}</span></header>
  <h4>${esc(EN ? a.en : a.pt)}</h4>
  <p>${esc(EN ? a.r_en : a.r_pt)}</p>
  <dl><div><dt>${tr("Duração", "Duration")}</dt><dd>${esc(EN ? a.duracao_en : a.duracao_pt)}</dd></div>${a.valor_pt ? `<div><dt>${tr("Valores", "Amounts")}</dt><dd>${esc(EN ? a.valor_en : a.valor_pt)}</dd></div>` : ""}</dl>
  <a class="ap-link" href="${a.url}" target="_blank" rel="noopener">${tr("Regras no IFAP →", "Rules at IFAP →")}</a>
</article>`;
    };
    const pintarApoios = () => {
      const gs = D.grupos.filter((g) => grupo === "todos" || g.id === grupo);
      lista.innerHTML = gs.map((g) => {
        const itens = D.apoios.filter((a) => a.g === g.id && (!soNovos || a.novos === "sim"));
        if (!itens.length) return "";
        return `<div class="ap-grupo"><h3>${esc(EN ? g.en : g.pt)}</h3><p class="ap-gd">${esc(EN ? g.desc_en : g.desc_pt)}</p><div class="ap-grelha">${itens.map(cartao).join("")}</div></div>`;
      }).join("") || `<p class="ap-vazio">${tr("Nenhum apoio com este filtro.", "No support matches this filter.")}</p>`;
    };
    document.querySelectorAll("#ap-filtros button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#ap-filtros button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      grupo = b.dataset.g; pintarApoios();
    }));
    document.getElementById("ap-novos").addEventListener("change", (e) => { soNovos = e.target.checked; pintarApoios(); });
    pintarApoios();

    // Concursos
    const alvo = document.getElementById("ap-concursos");
    let busca = "";
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const linha = (c) => `<li class="ap-conc"><div><a href="${c.link}" target="_blank" rel="noopener">${esc(c.titulo)}</a><span class="ap-per">${esc(c.linha)}</span></div><span class="ap-est ap-e-${c.estado}">${c.estado === "aberto" ? tr("Aberto", "Open") + (c.fim ? ` · ${tr("até", "until")} ${dmy(c.fim)}` : "") : c.estado === "abrir" ? tr("A abrir", "Opening") + ` · ${dmy(c.inicio)}` : c.estado === "encerrado" ? tr("Encerrado", "Closed") : tr("Ver o aviso", "See the call")}</span></li>`;
    const pintarConcursos = () => {
      if (!C) { alvo.innerHTML = `<p class="ap-vazio">${tr("Não foi possível ler a lista de concursos. Vê-a no site oficial.", "The list of calls could not be read. See it on the official site.")}</p>`; return; }
      const f = (arr) => arr.filter((c) => !busca || norm(c.titulo + " " + (c.tema || []).join(" ")).includes(busca));
      const a = f(abertos), b = f(aAbrir), e = f(encerrados);
      alvo.innerHTML =
        `<h3 class="ap-h">${tr("Abertos hoje", "Open today")} <span>${a.length}</span></h3>` + (a.length ? `<ul class="ap-lc">${a.map(linha).join("")}</ul>` : `<p class="ap-vazio">${tr("Nenhum concurso aberto com esta pesquisa.", "No open call matches this search.")}</p>`) +
        (b.length ? `<h3 class="ap-h">${tr("A abrir", "About to open")} <span>${b.length}</span></h3><ul class="ap-lc">${b.map(linha).join("")}</ul>` : "") +
        `<details class="ap-enc"><summary>${tr("Encerrados", "Closed")} (${e.length})</summary><ul class="ap-lc">${e.map(linha).join("")}</ul></details>`;
    };
    document.getElementById("ap-busca").addEventListener("input", (e) => { busca = norm(e.target.value.trim()); pintarConcursos(); });
    pintarConcursos();
  }
})();
