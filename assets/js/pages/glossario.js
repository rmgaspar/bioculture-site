/* Glossário do bioCulture.
   Dados: /data/glossario.json (escrito à mão: termos PT/EN, ligações entre termos, onde aparecem no site e a fonte de cada um).
   Pesquisa sem acentos, filtro por tema, índice A–Z e ligações diretas (#termo). Sem pedidos a serviços externos. */
(function () {
  "use strict";

  /* ---------- lógica (exportada para os testes) ---------- */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  /* Letra do índice: primeira letra sem acento; o que não é A–Z cai em «#». */
  const letraDe = (s) => { const c = norm(s).replace(/[^a-z0-9]/g, "").charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; };
  /* Termos que passam pelo tema e pela pesquisa (a pesquisa vê o termo nos dois idiomas e a definição). */
  function filtrar(termos, tema, busca) {
    const q = norm(busca).trim();
    return termos.filter((t) => (!tema || tema === "todos" || t.cat === tema) && (!q || norm([t.pt, t.en, t.d_pt, t.d_en].join(" ")).includes(q)));
  }
  window.BioCulturaGlossario = { norm, letraDe, filtrar };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-glossario");
  if (!G || !box) return;
  const { EN, tr, esc } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Glossary — bioCulture";
  }
  fetch("/sidebar-content.html?v=28").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=18"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => {
    if (!langQ) return href;
    const [p, hash] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) + (hash ? "#" + hash : "");
  };
  const voltar = document.getElementById("glossario-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/"));

  fetch("/data/glossario.json?v=6").then((r) => { if (!r.ok) throw new Error("glossario " + r.status); return r.json(); })
    .then((D) => { build(D); barraFixa(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar o glossário.", "The glossary could not be loaded.")}</p>`; });

  function build(D) {
    const col = new Intl.Collator(EN ? "en" : "pt", { sensitivity: "base" });
    const nome = (t) => (EN ? t.en : t.pt), outro = (t) => (EN ? t.pt : t.en);
    const termos = D.termos.slice().sort((a, b) => col.compare(nome(a), nome(b)));
    const porId = Object.fromEntries(D.termos.map((t) => [t.id, t]));
    const cat = (id) => D.categorias.find((c) => c.id === id);
    const usadas = [...new Set(D.termos.map((t) => t.fonte).filter(Boolean))];
    let tema = "todos", busca = "";

    box.innerHTML = `
<section id="procurar">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Procurar", "1 · Search")}</span><h2>${tr("Procura um termo", "Look up a term")}</h2></div>
  <div class="gl-barra">
    <input type="search" id="gl-busca" autocomplete="off" placeholder="${tr("Ex.: ecorregime, matéria orgânica, cabaz…", "E.g. eco-scheme, organic matter, box scheme…")}" aria-label="${tr("Procurar no glossário", "Search the glossary")}">
    <div class="gl-chips" id="gl-temas" role="group" aria-label="${tr("Filtrar por tema", "Filter by topic")}">
      <button type="button" data-t="todos" aria-pressed="true">${tr("Todos", "All")}</button>
      ${D.categorias.map((c) => `<button type="button" data-t="${c.id}" aria-pressed="false">${esc(EN ? c.en : c.pt)}</button>`).join("")}
    </div>
    <p class="gl-conta" id="gl-conta" aria-live="polite"></p>
  </div>
</section>

<section id="termos">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Termos", "2 · Terms")}</span><h2>${tr("De A a Z", "From A to Z")}</h2></div>
  <nav class="gl-az" id="gl-az" aria-label="${tr("Índice de letras", "Letter index")}"></nav>
  <div id="gl-lista"></div>
</section>

<section id="fontes">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Fontes", "3 · Sources")}</span><h2>${tr("De onde vêm as definições", "Where the definitions come from")}</h2></div>
  <div class="prose"><p>${tr("As definições são escritas pelo bioCulture, em linguagem simples, a partir das fontes abaixo. Quando um termo vem de uma regra (por exemplo, do IFAP), a regra manda: confirma sempre no texto oficial. Os termos sem fonte são conhecimento geral e podem ser discutidos. Falta algum termo? Diz-nos em <a href=\"" + comLang("/contactos.html") + "\">Contactos</a>.", "Definitions are written by bioCulture, in plain language, from the sources below. When a term comes from a rule (for example IFAP’s), the rule prevails: always check the official text. Terms without a source are general knowledge and open to debate. Missing a term? Tell us in <a href=\"" + comLang("/contactos.html") + "\">Contacts</a>.")}</p></div>
  <div class="srcs">${usadas.map((id) => { const f = D.fontes[id]; return `<div class="srcc"><h3>${esc(EN ? f.nome_en : f.nome)}</h3><span class="u"><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a></span></div>`; }).join("")}</div>
</section>`;

    const lista = document.getElementById("gl-lista"), az = document.getElementById("gl-az"), conta = document.getElementById("gl-conta");

    const cartao = (t) => {
      const f = t.fonte ? D.fontes[t.fonte] : null;
      return `<article class="gl-termo" id="${t.id}">
  <h3><a class="gl-ancora" href="#${t.id}" aria-label="${tr("Ligação direta para", "Direct link to")} ${esc(nome(t))}">${esc(nome(t))}</a>${nome(t) !== outro(t) ? `<small lang="${EN ? "pt" : "en"}">${esc(outro(t))}</small>` : ""}</h3>
  <span class="gl-cat">${esc(EN ? cat(t.cat).en : cat(t.cat).pt)}</span>
  <p>${esc(EN ? t.d_en : t.d_pt)}</p>
  ${t.ver.length ? `<p class="gl-ver"><span>${tr("Ver também", "See also")}</span>${t.ver.map((v) => `<a href="#${v}" data-ir="${v}">${esc(nome(porId[v]))}</a>`).join("")}</p>` : ""}
  ${t.onde.length ? `<p class="gl-onde"><span>${tr("No bioCulture", "On bioCulture")}</span>${t.onde.map((o) => `<a href="${comLang(o[0])}">${esc(EN ? o[2] : o[1])}</a>`).join("")}</p>` : ""}
  ${f ? `<p class="gl-fonte"><span>${tr("Fonte", "Source")}</span><a href="${f.url}" target="_blank" rel="noopener">${esc(EN ? f.nome_en : f.nome)}</a></p>` : ""}
</article>`;
    };

    function pintar() {
      const sel = filtrar(termos, tema, busca);
      conta.textContent = sel.length === termos.length ? tr(`${termos.length} termos`, `${termos.length} terms`) : tr(`${sel.length} de ${termos.length} termos`, `${sel.length} of ${termos.length} terms`);
      const grupos = new Map();
      sel.forEach((t) => { const l = letraDe(nome(t)); if (!grupos.has(l)) grupos.set(l, []); grupos.get(l).push(t); });
      const letras = [...grupos.keys()].sort();
      az.innerHTML = letras.map((l) => `<a href="#gl-l-${l}" data-l="${l}">${l}</a>`).join("");
      lista.innerHTML = letras.length
        ? letras.map((l) => `<div class="gl-letra" id="gl-l-${l}"><h3 class="gl-l">${l}</h3>${grupos.get(l).map(cartao).join("")}</div>`).join("")
        : `<p class="gl-vazio">${tr("Nenhum termo com esta pesquisa. Experimenta uma palavra mais curta, ou outro tema.", "No term matches this search. Try a shorter word, or another topic.")}</p>`;
      lista.querySelectorAll("[data-ir]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); ir(a.dataset.ir, true); }));
      az.querySelectorAll("[data-l]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); const alvo = document.getElementById("gl-l-" + a.dataset.l); if (alvo) alvo.scrollIntoView({ block: "start" }); }));
    }

    /* Vai a um termo: se o filtro o esconder, limpa-o; destaca-o e põe o endereço com #termo. */
    function ir(id, atualizarHash) {
      if (!porId[id]) return;
      if (!filtrar(termos, tema, busca).some((t) => t.id === id)) {
        tema = "todos"; busca = "";
        document.getElementById("gl-busca").value = "";
        document.querySelectorAll("#gl-temas button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === "todos")));
        pintar();
      }
      const el = document.getElementById(id);
      if (!el) return;
      document.querySelectorAll(".gl-termo.gl-foco").forEach((x) => x.classList.remove("gl-foco"));
      el.classList.add("gl-foco");
      el.scrollIntoView({ block: "center" });
      if (atualizarHash) { try { history.replaceState(null, "", "#" + id); } catch (e) { /* ignorar */ } }
    }

    document.getElementById("gl-busca").addEventListener("input", (e) => { busca = e.target.value; pintar(); });
    document.querySelectorAll("#gl-temas button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#gl-temas button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      tema = b.dataset.t; pintar();
    }));
    pintar();

    let alvo = "";
    try { alvo = decodeURIComponent(location.hash.slice(1)); } catch (e) { alvo = ""; }
    if (alvo && porId[alvo]) setTimeout(() => ir(alvo, false), 80);
    else if (/^(procurar|termos|fontes)$/.test(alvo)) setTimeout(() => document.getElementById(alvo).scrollIntoView({ block: "start" }), 80);
  }
})();
