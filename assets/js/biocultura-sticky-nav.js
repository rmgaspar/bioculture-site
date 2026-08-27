(function () {
    "use strict";
    const navigationBars = document.querySelectorAll("#main .scope-switch, #main .calendar-navigation-bar, #main .home-nav, #main .pressure-nav, #main .section-nav");
    navigationBars.forEach((navigation) => {
        if (navigation.dataset.bioPinnedReady) return;
        navigation.dataset.bioPinnedReady = "true";
        const anchor = document.createElement("div");
        anchor.className = "bio-nav-anchor";
        navigation.before(anchor);
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
