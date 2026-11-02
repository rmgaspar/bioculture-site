/* Cartões vivos: nas listas longas das páginas dos vetores de pressão (minas, pecuárias, centros de dados, renováveis),
   dá cor a cada cartão por categoria, junta bandeiras aos países, pinta o estado e põe por cima da lista uma faixa com um gráfico de barras
   e, onde existe, a fotografia da categoria escolhida. Lê o que cada página já desenhou (não mexe nos dados) e volta a desenhar
   quando o filtro muda a lista. As fotografias e os créditos vêm de data/fotos-capitulos.json (chaves «cat-…»), preenchidos por capitulo-fotos.js. */
(function () {
    "use strict";
    const en = !!window.BioCultureI18n?.isEnglish;
    const tr = (pt, en2) => (en ? en2 : pt);
    const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

    const PAISES = { australia: "AU", chile: "CL", argentina: "AR", "united states": "US", "dr congo": "CD", indonesia: "ID", peru: "PE", brazil: "BR", guinea: "GN", germany: "DE", serbia: "RS", uzbekistan: "UZ", "papua new guinea": "PG", mongolia: "MN", panama: "PA", madagascar: "MG", "new caledonia": "NC", canada: "CA", china: "CN", greenland: "GL", colombia: "CO", mozambique: "MZ", "south africa": "ZA", paraguay: "PY", bolivia: "BO", venezuela: "VE", kenya: "KE", tanzania: "TZ", ethiopia: "ET", italy: "IT", netherlands: "NL", india: "IN", pakistan: "PK", ireland: "IE", spain: "ES", france: "FR", denmark: "DK", belgium: "BE", vietnam: "VN", thailand: "TH", poland: "PL", egypt: "EG", morocco: "MA", bangladesh: "BD", "new zealand": "NZ", portugal: "PT" };
    const EMOJI = { "amazon basin": "🌎", "high seas": "🌊", "west and central africa": "🌍", region: "📍" };
    const nomes = (() => { try { return new Intl.DisplayNames([en ? "en" : "pt-PT"], { type: "region" }); } catch (e) { return null; } })();
    const bandeira = (iso) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
    function pais(nome) {
        const k = norm(nome);
        const iso = PAISES[k];
        if (iso) return { icone: bandeira(iso), nome: (nomes && nomes.of(iso)) || nome };
        if (EMOJI[k]) return { icone: EMOJI[k], nome: k === "amazon basin" ? tr("Bacia amazónica", "Amazon basin") : k === "high seas" ? tr("Alto-mar", "High seas") : k === "region" ? tr("região", "region") : tr("África Ocidental e Central", "West and Central Africa") };
        return { icone: "", nome };
    }

    const ESTADOS = [
        [/explora|operacional|operating|operational|ativa|retomada/, "#3f8a4e"],
        [/constru|desenvolvimento|development|planeado|planned|projeto|expans/, "#c28a1e"],
        [/contestad|recusad|suspens|disputa|proposto|nao operacional|não operacional|licenci/, "#b0483a"],
        [/encerrad|fecho|passivo|closed|legacy/, "#7a7f85"],
        [/direitos|condicionad/, "#4a6fa5"],
    ];
    const corEstado = (texto) => { const t = norm(texto); const e = ESTADOS.find(([r]) => r.test(t)); return e ? e[1] : "#6b776f"; };

    const MINERAIS = [
        ["lithium", ["litio", "lithium"], "#2f8f8a"], ["gold", ["ouro", "gold"], "#b9922e"], ["copper", ["cobre", "copper"], "#b35a2d"],
        ["nickel-cobalt", ["niquel e cobalto", "nickel and cobalt", "nickel-cobalt"], "#5f8a4b"], ["iron-bauxite", ["ferro e bauxite", "iron and bauxite", "iron-bauxite"], "#a8473d"],
        ["rare-earths", ["terras raras", "rare earths"], "#7b5ea7"], ["coal", ["carvao", "coal"], "#55595e"],
    ];
    const ANIMAIS = [
        ["cattle", ["bovinos", "cattle"], "#a85a32"], ["dairy", ["leite intensivo", "intensive dairy", "dairy"], "#3f7fb5"],
        ["pigs", ["suinos", "pigs"], "#c4727f"], ["poultry", ["aves", "poultry"], "#d19a1f"],
    ];
    const FASES = [
        ["operar", ["em exploracao", "operacionais", "operacional", "operating", "in operation"], "#3f8a4e"],
        ["projeto", ["projetos nao operacionais", "em desenvolvimento", "planeado", "projects not operating", "in development"], "#c28a1e"],
        ["direitos", ["direitos e fases condicionadas", "rights and conditional stages"], "#4a6fa5"],
        ["fecho", ["passivos e fecho", "legacy and closure"], "#7a7f85"],
    ];
    const TECNOLOGIAS = [["solar", ["solar"], "#d19a1f"], ["eolica", ["eolica onshore", "onshore wind", "wind onshore"], "#4a7fb0"], ["offshore", ["eolica offshore", "offshore wind", "wind offshore"], "#2a7f8f"]];
    const acha = (tabela, texto) => { const t = norm(texto); return tabela.find(([, nomes2]) => nomes2.some((n) => t === n || t.startsWith(n))) || null; };

    // Cada lista: onde está, como se lê a categoria de um cartão e que gráfico e fotografia leva por cima.
    const LISTAS = [
        { grelha: "#mine-grid", cartao: ".mine-card", filtros: "#commodity-filters", tabela: MINERAIS, categoria: (c) => segmentos(c)[0],
          titulo: [tr("Casos por matéria", "Cases by commodity"), tr("Casos por país", "Cases by country")], pais: "lugar", fotos: true, estado: 2 },
        { grelha: "#frontier-grid", cartao: ".frontier-card", filtros: "#system-filters", tabela: ANIMAIS, categoria: (c) => segmentos(c)[0],
          titulo: [tr("Fronteiras por sistema", "Frontiers by system"), tr("Fronteiras por país", "Frontiers by country")], pais: "resto", fotos: true },
        { grelha: "#cases", cartao: ".case", filtros: "#filters", tabela: ANIMAIS, categoria: (c) => segmentos(c)[0],
          titulo: [tr("Casos por tipo de animal", "Cases by animal type"), tr("Casos", "Cases")], fotos: true },
        { grelha: "#projects", cartao: ".project", filtros: "#filters", tabela: FASES, categoria: (c) => c.querySelector("small")?.textContent,
          titulo: [tr("Registos por fase", "Records by stage"), tr("Registos", "Records")], mw: true },
        { grelha: "#case-grid", cartao: ".case-card", semFaixa: true, filtros: null, tabela: FASES, categoria: (c) => c.querySelector("small")?.textContent,
          titulo: [tr("Capacidade TI publicada (MW)", "Published IT capacity (MW)"), ""], mw: true },
        { grelha: "#pressure-projects", cartao: ".pressure-card", filtros: null, tabela: TECNOLOGIAS, categoria: (c) => (c.querySelector(".tech")?.textContent || "").split(" · ")[0], semReescrever: true,
          titulo: [tr("Perímetro publicado (ha)", "Published perimeter (ha)"), tr("Perímetro publicado (ha)", "Published perimeter (ha)")], area: true },
    ];

    const FAIXAS = new WeakMap();
    function segmentos(cartao) {
        const s = cartao.querySelector("small");
        if (!s) return [];
        const partes = [...s.querySelectorAll(":scope > span")].map((x) => x.textContent.trim());
        return partes.length ? partes : s.textContent.split(" · ").map((x) => x.trim());
    }

    function decorarCartao(cartao, lista) {
        if (!cartao.dataset.catNome) cartao.dataset.catNome = (lista.categoria(cartao) || "").trim();
        const cat = acha(lista.tabela, cartao.dataset.catNome);
        const cor = cat ? cat[2] : "#6b776f";
        cartao.classList.add("cv");
        cartao.style.setProperty("--tom", cor);
        cartao.dataset.cat = cat ? cat[0] : "";
        if (cartao.dataset.cvFeito) return;
        cartao.dataset.cvFeito = "1";
        const small = lista.semReescrever ? null : cartao.querySelector("small");
        if (small && lista.estado !== undefined) {
            const seg = segmentos(cartao);
            if (seg.length >= 3) small.innerHTML = `<span class="cv-cat">${seg[0]}</span><span class="cv-metodo">${seg[1]}</span><span class="cv-estado" style="--cv-estado:${corEstado(seg[2])}">${seg[2]}</span>`;
        } else if (small && lista.tabela === FASES) {
            small.innerHTML = `<span class="cv-estado" style="--cv-estado:${cat ? cat[2] : "#6b776f"}">${small.textContent}</span>`;
        } else if (small && lista.tabela === TECNOLOGIAS) {
            const seg = segmentos(cartao);
            small.innerHTML = `<span class="cv-cat">${seg[0]}</span>${seg[1] ? `<span class="cv-estado" style="--cv-estado:${corEstado(seg[1])}">${seg[1]}</span>` : ""}`;
        }
        if (lista.pais === "lugar") {
            const lugar = cartao.querySelector(".place");
            if (lugar) { const [p, ...resto] = lugar.textContent.split(" · "); const info = pais(p); lugar.innerHTML = `<span class="cv-pais" data-nome="${info.nome}" data-icone="${info.icone}">${info.icone ? `<i aria-hidden="true">${info.icone}</i>` : ""}${info.nome}</span>${resto.length ? ` · ${resto.join(" · ")}` : ""}`; }
        } else if (lista.pais === "resto") {
            const seg = segmentos(cartao).slice(1);
            if (small && seg.length) { const lugares = seg.map(pais); cartao.querySelector("small").insertAdjacentHTML("afterend", `<span class="place cv-lugares">${lugares.map((i) => `<span class="cv-pais" data-nome="${i.nome}" data-icone="${i.icone}">${i.icone ? `<i aria-hidden="true">${i.icone}</i>` : ""}${i.nome}</span>`).join("")}</span>`); small.innerHTML = `<span class="cv-cat">${segmentos(cartao)[0]}</span>`; }
        }
    }

    function barras(itens, cor) {
        const max = Math.max(...itens.map((i) => i.valor), 1);
        return `<ul class="cv-barras">${itens.map((i) => `<li style="--tom:${i.cor || cor}"><span class="cv-rotulo">${i.icone ? `<i aria-hidden="true">${i.icone}</i>` : ""}${i.rotulo}</span><span class="cv-pista"><b style="width:${Math.max(4, (i.valor / max) * 100)}%"></b></span><em>${i.texto || i.valor}</em></li>`).join("")}</ul>`;
    }

    function faixa(lista, grelha) {
        const cartoes = [...grelha.querySelectorAll(":scope > " + lista.cartao)];
        let el = FAIXAS.get(grelha) || null;
        if (!cartoes.length) { if (el) el.hidden = true; return; }
        const porCat = new Map();
        cartoes.forEach((c) => { const k = c.dataset.cat || "?"; const cat = acha(lista.tabela, c.dataset.catNome || ""); const e = porCat.get(k) || { rotulo: c.dataset.catNome || "", cor: cat ? cat[2] : "#6b776f", valor: 0 }; e.valor++; porCat.set(k, e); });
        const unica = porCat.size === 1 ? [...porCat.keys()][0] : "todos";
        let itens = null, titulo;
        if (lista.area) {
            itens = cartoes.map((c) => { const t = c.querySelector(".pressure-area strong")?.textContent || ""; const m = t.replace(/\s/g, "").match(/([\d]+(?:[.,]\d+)?)/); return m ? { rotulo: (c.querySelector("h3")?.textContent || "").trim(), valor: parseFloat(m[1].replace(",", ".")), texto: t.trim(), cor: c.style.getPropertyValue("--tom") } : null; }).filter(Boolean).sort((a, b) => b.valor - a.valor);
            if (itens.length >= 2) titulo = lista.titulo[0]; else itens = null;
        } else if (lista.mw) {
            itens = cartoes.map((c) => { const m = c.textContent.match(/([\d]+(?:[.,]\d+)?)\s*MW/); return m ? { rotulo: (c.querySelector("h3")?.textContent || "").trim(), valor: parseFloat(m[1].replace(",", ".")), texto: m[1] + " MW", cor: c.style.getPropertyValue("--tom") } : null; }).filter(Boolean);
            if (itens.length >= 2) titulo = tr("Capacidade TI publicada (MW)", "Published IT capacity (MW)"); else itens = null;
        }
        if (!itens) {
            if (unica === "todos") { itens = [...porCat.values()].map((e) => ({ rotulo: e.rotulo, valor: e.valor, cor: e.cor })).sort((a, b) => b.valor - a.valor); titulo = lista.titulo[0]; }
            else if (lista.pais) {
                const paises = new Map();
                cartoes.forEach((c) => c.querySelectorAll(".cv-pais").forEach((p) => { const k = p.dataset.nome; const e = paises.get(k) || { rotulo: k, valor: 0, icone: p.dataset.icone }; e.valor++; paises.set(k, e); }));
                itens = [...paises.values()].sort((a, b) => b.valor - a.valor).slice(0, 8);
                titulo = lista.titulo[1];
            } else { itens = [...porCat.values()].map((e) => ({ rotulo: e.rotulo, valor: e.valor, cor: e.cor })); titulo = lista.titulo[1] || lista.titulo[0]; }
        }
        const total = tr(`${cartoes.length} ${cartoes.length === 1 ? "caso" : "casos"}`, `${cartoes.length} ${cartoes.length === 1 ? "case" : "cases"}`);
        const cor = unica !== "todos" ? (porCat.get(unica)?.cor || "#6b776f") : "#4f6b57";
        const chaveFoto = lista.fotos ? "cat-" + (unica === "todos" ? "todos" : unica) : "";
        const assinatura = `${unica}|${cartoes.length}|${titulo}`;
        if (!el) { el = document.createElement("div"); el.className = "cv-faixa"; grelha.before(el); FAIXAS.set(grelha, el); }
        if (el.dataset.assinatura === assinatura) return;
        el.dataset.assinatura = assinatura;
        el.hidden = false;
        el.style.setProperty("--tom", cor);
        el.classList.toggle("com-foto", !!chaveFoto);
        el.innerHTML = `<div class="cv-dados"><h3>${titulo}</h3><p class="cv-total">${total}</p>${barras(itens, cor)}</div>${chaveFoto ? `<div class="cv-foto" data-foto-slot="${chaveFoto}"></div>` : ""}`;
    }

    function arranjar() {
        LISTAS.forEach((lista) => {
            const grelha = document.querySelector(lista.grelha);
            if (!grelha) return;
            [...grelha.querySelectorAll(":scope > " + lista.cartao)].forEach((c) => decorarCartao(c, lista));
            if (!lista.semFaixa) faixa(lista, grelha);
            grelha.classList.add("cv-grelha");
        });
    }
    // Os seis passos da «hierarquia das decisões» (e blocos iguais): o número sai do título e vira um selo; corre depois da tradução da página.
    function passos() {
        document.querySelectorAll(".principle-grid > article > b, .solutions-grid > article > strong").forEach((b) => {
            if (b.dataset.cvPasso) return;
            const m = b.textContent.trim().match(/^(\d{1,2})\s*[·.\-–]\s*(.+)$/);
            if (!m) return;
            b.dataset.cvPasso = "1";
            b.innerHTML = `<span class="pr-n">${m[1]}</span><span class="pr-t">${m[2]}</span>`;
            b.parentElement.classList.add("pr-passo");
        });
    }
    setTimeout(passos, 700);
    window.addEventListener("load", () => setTimeout(passos, 400));
    let agendado = 0;
    const agendar = () => { clearTimeout(agendado); agendado = setTimeout(arranjar, 40); };
    arranjar();
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
})();
