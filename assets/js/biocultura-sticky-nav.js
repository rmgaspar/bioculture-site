(function () {
    "use strict";
    const navigationBars = document.querySelectorAll("#main .scope-switch, #main .calendar-navigation-bar, #main .home-nav, #main .pressure-nav, #main .section-nav, #main .journey-nav, #main .reading-nav");
    navigationBars.forEach((navigation) => {
        if (navigation.dataset.bioPinnedReady) return;
        navigation.dataset.bioPinnedReady = "true";
        const anchor = document.createElement("div");
        anchor.className = "bio-nav-anchor";
        navigation.before(anchor);

        const progress = document.createElement("div");
        progress.className = "bio-nav-progress";
        navigation.append(progress);

        const sections = [...navigation.querySelectorAll('a[href*="#"]')]
            .map((link) => {
                const hash = link.getAttribute("href").split("#")[1];
                return { link, el: hash ? document.getElementById(hash) : null };
            })
            .filter((item) => item.el);

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
