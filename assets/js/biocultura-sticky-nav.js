(function () {
    "use strict";
    // Regresso ao mesmo cartão quando se volta de uma notícia.
    if (!window.__bioNewsReturn && !document.querySelector('script[src*="bioculture-news-return.js"]')) {
        const script = document.createElement("script");
        script.src = "/assets/js/bioculture-news-return.js?v=1";
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
        navigation.append(topLink);

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
            // Barras que deslizam na horizontal: mantém a secção ativa à vista (sem mexer na página).
            if (current && current !== lastActive && navigation.scrollWidth > navigation.clientWidth + 1) {
                const link = current.link;
                const left = link.offsetLeft - navigation.offsetLeft;
                const visible = left >= navigation.scrollLeft && left + link.offsetWidth <= navigation.scrollLeft + navigation.clientWidth - 90;
                if (!visible) navigation.scrollTo({ left: Math.max(0, left - 140), behavior: reduceMotion ? "auto" : "smooth" });
            }
            lastActive = current;
        };

        const setProgress = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - doc.clientHeight;
            const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
            progress.style.width = `${pct}%`;
        };

        const update = () => {
            const top = window.innerWidth <= 760 ? 10 : 28;
            const shouldPin = anchor.getBoundingClientRect().top <= top;
            if (shouldPin && !navigation.classList.contains("bio-nav-pinned")) {
                const rect = navigation.getBoundingClientRect();
                const margin = parseFloat(getComputedStyle(navigation).marginBottom) || 0;
                navigation.style.setProperty("--bio-nav-left", `${rect.left}px`);
                navigation.style.setProperty("--bio-nav-width", `${rect.width}px`);
                anchor.style.height = `${rect.height + margin}px`;
                navigation.classList.add("bio-nav-pinned");
            } else if (!shouldPin && navigation.classList.contains("bio-nav-pinned")) {
                navigation.classList.remove("bio-nav-pinned");
                anchor.style.height = "0";
            }
            if (topLink.textContent !== topLabel()) topLink.textContent = topLabel();
            setActive();
            setProgress();
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
