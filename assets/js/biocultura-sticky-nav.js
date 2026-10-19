(function () {
    "use strict";
    // Regresso ao mesmo cartão quando se volta de uma notícia.
    if (!window.__bioNewsReturn && !document.querySelector('script[src*="bioculture-news-return.js"]')) {
        const script = document.createElement("script");
        script.src = "/assets/js/bioculture-news-return.js?v=2";
        document.head.appendChild(script);
    }
    // «↑ Topo»: só visível quando a barra está fixa no cimo do ecrã.
    if (!document.getElementById("bio-nav-top-style")) {
        const style = document.createElement("style");
        style.id = "bio-nav-top-style";
        style.textContent =
            "#main .bio-nav-top{display:none!important}" +
            "#main .bio-nav-pinned .bio-nav-top{display:inline-flex!important;align-items:center;margin-left:auto!important;" +
            "color:#7d8a80!important;-webkit-text-fill-color:#7d8a80!important;background:transparent!important;white-space:nowrap}" +
            "#main .bio-nav-pinned .bio-nav-top:hover,#main .bio-nav-pinned .bio-nav-top:focus-visible{color:#315b43!important;-webkit-text-fill-color:#315b43!important}";
        document.head.appendChild(style);
    }
    // Véu branco por cima da barra fixa: só quando a barra está presa no cimo do ecrã, para não ficarem conteúdos a espreitar por cima dela.
    if (!document.getElementById("bio-nav-veil-style")) {
        const style = document.createElement("style");
        style.id = "bio-nav-veil-style";
        style.textContent = ".bio-nav-veil{position:fixed;top:0;right:0;height:0;background:#fff;pointer-events:none;opacity:0;transition:opacity .15s ease}" +
            ".bio-nav-veil.is-on{opacity:1}";
        document.head.appendChild(style);
    }
    // Indício de continuação: esbatido nas pontas quando a barra desliza na horizontal e há mais links por ver.
    if (!document.getElementById("bio-nav-fade-style")) {
        const style = document.createElement("style");
        style.id = "bio-nav-fade-style";
        style.textContent =
            "#main .bio-nav-fade{position:sticky;flex:0 0 0!important;width:0;align-self:stretch;overflow:visible;opacity:0;pointer-events:none;z-index:2;transition:opacity .2s ease}" +
            "#main .bio-nav-fade::before{position:absolute;top:-.8em;bottom:-.8em;width:48px;display:flex;align-items:center;color:#5f7365;font:700 22px/1 system-ui,sans-serif;" +
            "background:linear-gradient(var(--bio-fade-dir,to right),rgba(255,255,255,0),#fff 55%)}" +
            "#main .bio-nav-fade-end{right:0}#main .bio-nav-fade-end::before{content:'\\203A';right:0;justify-content:flex-end;padding-right:8px}" +
            "#main .bio-nav-fade-start{left:0;--bio-fade-dir:to left}#main .bio-nav-fade-start::before{content:'\\2039';left:0;padding-left:8px}" +
            "#main .bio-nav-more-end .bio-nav-fade-end,#main .bio-nav-more-start .bio-nav-fade-start{opacity:1}" +
            "#main .bio-nav-more-end .bio-nav-fade-end::before,#main .bio-nav-more-start .bio-nav-fade-start::before{pointer-events:auto;cursor:pointer}" +
            "#main .bio-nav-more-end .bio-nav-fade-end:hover::before,#main .bio-nav-more-start .bio-nav-fade-start:hover::before{color:#315b43}";
        document.head.appendChild(style);
    }
    const topLabel = () => ((document.documentElement.lang || "").toLowerCase().startsWith("en") ? "↑ Top" : "↑ Topo");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const navigationBars = document.querySelectorAll("#main .scope-switch, #main .calendar-navigation-bar, #main .home-nav, #main .pressure-nav, #main .section-nav, #main .journey-nav, #main .reading-nav, #main .management-nav, #main .crop-nav");
    navigationBars.forEach((navigation) => {
        if (navigation.dataset.bioPinnedReady) return;
        navigation.dataset.bioPinnedReady = "true";
        const anchor = document.createElement("div");
        anchor.className = "bio-nav-anchor";
        navigation.before(anchor);

        const topLink = document.createElement("a");
        topLink.className = "bio-nav-top";
        topLink.href = "#topo";
        topLink.textContent = topLabel();
        topLink.addEventListener("click", (event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
            if (location.hash) history.replaceState(null, "", location.pathname + location.search);
        });
        const fadeEnd = document.createElement("span");
        fadeEnd.className = "bio-nav-fade bio-nav-fade-end";
        fadeEnd.setAttribute("aria-hidden", "true");
        const fadeStart = document.createElement("span");
        fadeStart.className = "bio-nav-fade bio-nav-fade-start";
        fadeStart.setAttribute("aria-hidden", "true");
        navigation.prepend(fadeStart);
        navigation.append(fadeEnd);
        navigation.append(topLink);
        const updateMore = () => {
            const max = navigation.scrollWidth - navigation.clientWidth;
            const gap = parseFloat(getComputedStyle(navigation).columnGap) || 0;
            // Os indicadores não ocupam lugar: anulam o espaço (gap) que o flex lhes daria.
            fadeStart.style.margin = fadeEnd.style.margin = `0 ${-gap}px`;
            fadeEnd.style.right = navigation.classList.contains("bio-nav-pinned") && topLink.offsetWidth ? `${topLink.offsetWidth}px` : "0";
            navigation.classList.toggle("bio-nav-more-end", max > 1 && navigation.scrollLeft < max - 2);
            navigation.classList.toggle("bio-nav-more-start", max > 1 && navigation.scrollLeft > 2);
        };
        navigation.addEventListener("scroll", updateMore, { passive: true });
        // A seta ‹ / › desliza a barra para mostrar o resto dos links.
        const slide = (direction) => navigation.scrollBy({ left: direction * navigation.clientWidth * 0.6, behavior: reduceMotion ? "auto" : "smooth" });
        fadeEnd.addEventListener("click", () => slide(1));
        fadeStart.addEventListener("click", () => slide(-1));

        // Com o rato perto de uma ponta da barra, ela desliza devagar para mostrar o resto das ligações; ao afastar o rato, abranda e pára.
        // Quanto mais perto da ponta, mais depressa (sempre suave). Só com rato e sem «reduzir movimento».
        if (!reduceMotion && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
            const ZONA = 130, VMAX = 4.4, SUAVIDADE = 0.09;
            let quadro = 0, velocidade = 0, alvo = 0, posicao = 0;
            const alvoDeVelocidade = (x) => {
                const max = navigation.scrollWidth - navigation.clientWidth;
                if (max <= 1) return 0;
                const caixa = navigation.getBoundingClientRect();
                const dir = caixa.right - x, esq = x - caixa.left;
                if (dir >= 0 && dir < ZONA && navigation.scrollLeft < max - 1) return (1 - dir / ZONA) * VMAX;
                if (esq >= 0 && esq < ZONA && navigation.scrollLeft > 1) return -(1 - esq / ZONA) * VMAX;
                return 0;
            };
            const passo = () => {
                velocidade += (alvo - velocidade) * SUAVIDADE;
                if (alvo === 0 && Math.abs(velocidade) < 0.03) { quadro = 0; velocidade = 0; return; }
                const max = navigation.scrollWidth - navigation.clientWidth;
                posicao = Math.min(max, Math.max(0, posicao + velocidade));
                navigation.scrollLeft = posicao;
                if ((velocidade > 0 && posicao >= max) || (velocidade < 0 && posicao <= 0)) { alvo = 0; velocidade = 0; quadro = 0; return; }
                quadro = requestAnimationFrame(passo);
            };
            navigation.addEventListener("mousemove", (event) => {
                alvo = alvoDeVelocidade(event.clientX);
                navigation.dataset.bioHover = alvo !== 0 ? "1" : "";
                if (alvo !== 0 && !quadro) { posicao = navigation.scrollLeft; quadro = requestAnimationFrame(passo); }
            }, { passive: true });
            navigation.addEventListener("mouseleave", () => { alvo = 0; navigation.dataset.bioHover = ""; });
        }

        const progress = document.createElement("div");
        progress.className = "bio-nav-progress";
        navigation.append(progress);

        const sections = [...navigation.querySelectorAll('a[href*="#"]')]
            .map((link) => {
                const hash = link.getAttribute("href").split("#")[1];
                return { link, el: hash ? document.getElementById(hash) : null };
            })
            .filter((item) => item.el);

        let lastActive = null;
        const setActive = () => {
            if (!sections.length) return;
            // Must stay >= the site's scroll-margin-top convention (6.5rem/104px) so a clicked
            // link's target — landed there by the browser's own anchor jump — is immediately
            // recognised as current, instead of leaving the previously active link stuck.
            const navHeight = navigation.classList.contains("bio-nav-pinned") ? navigation.getBoundingClientRect().height : 0;
            const offset = Math.max(navHeight + 40, 112);
            let current = null;
            sections.forEach((item) => {
                if (item.el.getBoundingClientRect().top - offset <= 0) current = item;
            });
            sections.forEach((item) => item.link.classList.toggle("bio-nav-active", item === current));
            // Barras que deslizam na horizontal: ao descer, quando a secção ativa chega perto do fim da barra, esta desliza (devagar)
            // para mostrar as ligações seguintes; ao subir, quando chega perto do início, desliza para mostrar as anteriores.
            // Só mexe na barra, nunca na página, e não interfere enquanto o rato está a deslizá-la.
            if (current && current !== lastActive && navigation.scrollWidth > navigation.clientWidth + 1 && !navigation.dataset.bioHover) {
                const caixa = navigation.getBoundingClientRect(), r = current.link.getBoundingClientRect();
                const esq = r.left - caixa.left, dir = r.right - caixa.left, largura = navigation.clientWidth;
                const max = navigation.scrollWidth - largura, atual = navigation.scrollLeft;
                const RESERVA = Math.min(340, largura * 0.3);
                let alvo = null;
                if (dir > largura - RESERVA && atual < max - 1) alvo = atual + esq - largura * 0.2;        // perto do fim: a ligação ativa passa para o início
                else if (esq < 150 && atual > 1) alvo = atual + esq - largura * 0.45;                       // perto do início: mostra as anteriores
                if (alvo !== null) navigation.scrollTo({ left: Math.min(max, Math.max(0, alvo)), behavior: reduceMotion ? "auto" : "smooth" });
            }
            lastActive = current;
        };

        const setProgress = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - doc.clientHeight;
            const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
            progress.style.width = `${pct}%`;
        };

        // O véu cobre a faixa do cimo do ecrã até ao fundo da barra fixa, da coluna principal até à margem direita (a barra lateral fica de fora): tapa o que espreitava por cima e pelos cantos redondos.
        const veil = document.querySelector(".bio-nav-veil") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "bio-nav-veil", ariaHidden: "true" }));
        const updateVeil = () => {
            const pinned = document.querySelector(".bio-nav-pinned");
            if (!pinned) { veil.classList.remove("is-on"); return; }
            const cs = getComputedStyle(pinned), main = document.getElementById("main");
            const z = parseInt(cs.zIndex, 10);
            veil.style.left = `${main ? Math.max(0, main.getBoundingClientRect().left) : 0}px`;
            veil.style.height = `${Math.ceil(pinned.getBoundingClientRect().bottom)}px`;
            veil.style.zIndex = Number.isFinite(z) ? String(z - 1) : "39";
            veil.classList.add("is-on");
        };

        // Ao carregar numa ligação da barra, o conteúdo do bloco (não o seu espaço em branco) fica logo por baixo da barra fixa.
        const FOLGA = 22;
        const primeiroVisivel = (bloco) => [...bloco.children].find((c) => c.getBoundingClientRect().height > 0 && getComputedStyle(c).position !== "absolute") || bloco;
        const alinhar = (alvo) => {
            const topo = window.innerWidth <= 760 ? 10 : 28;
            const delta = primeiroVisivel(alvo).getBoundingClientRect().top - (topo + navigation.getBoundingClientRect().height + FOLGA);
            window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "auto" });
        };
        const alvoDe = (link) => {
            if (!link || link.classList.contains("bio-nav-top") || link.classList.contains("hub-back")) return null;
            const url = new URL(link.href, location.href);
            if (url.pathname !== location.pathname || url.hash.length < 2) return null;
            return document.getElementById(decodeURIComponent(url.hash.slice(1)));
        };
        navigation.addEventListener("click", (event) => {
            const link = event.target.closest("a[href*='#']");
            const alvo = alvoDe(link);
            if (!alvo || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            history.replaceState(null, "", new URL(link.href, location.href).hash);
            alinhar(alvo);
            setTimeout(() => alinhar(alvo), 160); // a barra muda de altura ao ficar presa: acerta-se uma segunda vez
        });
        // Abrir a página já com #bloco: o mesmo alinhamento, depois de o conteúdo assentar.
        if (location.hash.length > 1 && !window.__bioNavHashDone) {
            const link = [...navigation.querySelectorAll("a[href*='#']")].find((a) => new URL(a.href, location.href).hash === location.hash);
            const alvo = alvoDe(link);
            if (alvo) {
                window.__bioNavHashDone = true;
                const inicial = () => { if (alvo.isConnected) alinhar(alvo); };
                window.addEventListener("load", () => setTimeout(inicial, 350), { once: true });
                if (document.readyState === "complete") setTimeout(inicial, 350);
            }
        }

        const update = () => {
            const top = window.innerWidth <= 760 ? 10 : 28;
            const shouldPin = anchor.getBoundingClientRect().top <= top;
            if (shouldPin && !navigation.classList.contains("bio-nav-pinned")) {
                const rect = navigation.getBoundingClientRect();
                const margin = parseFloat(getComputedStyle(navigation).marginBottom) || 0;
                const esquerda = Math.round(rect.left), direita = Math.round(rect.right);
                navigation.style.setProperty("--bio-nav-left", `${esquerda}px`);
                navigation.style.setProperty("--bio-nav-width", `${direita - esquerda}px`);
                anchor.style.height = `${rect.height + margin}px`;
                navigation.classList.add("bio-nav-pinned");
            } else if (!shouldPin && navigation.classList.contains("bio-nav-pinned")) {
                navigation.classList.remove("bio-nav-pinned");
                anchor.style.height = "0";
            }
            if (topLink.textContent !== topLabel()) topLink.textContent = topLabel();
            updateVeil();
            setActive();
            setProgress();
            updateMore();
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", () => {
            navigation.classList.remove("bio-nav-pinned");
            anchor.style.height = "0";
            update();
        }, { passive: true });
    });
})();
