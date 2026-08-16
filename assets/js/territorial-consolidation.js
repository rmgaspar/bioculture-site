(function () {
    "use strict";

    const routes = {
        "/calendario/regeneration-calendar.html": {
            source: "/calendario/calendario.html",
            stylesheet: "/assets/css/pages/calendario-calendario.css?v=1",
            script: "/assets/js/pages/calendario-calendario-2.js?v=1",
            label: "Portugal em detalhe",
            title: "Calendário territorial de Portugal",
            intro: "Região, mês, culturas, plano semanal, pragas e flora invasora passam a fazer parte do calendário global.",
            calendar: true
        },
        "/recursos/water.html": {
            source: "/recursos/agua.html",
            stylesheet: "/assets/css/pages/recursos-agua.css?v=2",
            script: "/assets/js/pages/recursos-agua-2.js?v=1",
            label: "Portugal em detalhe",
            title: "A água no território português",
            intro: "Indicadores, bacias, qualidade, retenção e práticas ligadas à região guardada."
        },
        "/recursos/air.html": {
            source: "/recursos/ar.html",
            stylesheet: "/assets/css/pages/recursos-ar.css?v=2",
            script: "/assets/js/pages/recursos-ar-2.js?v=1",
            label: "Portugal em detalhe",
            title: "O ar no território português",
            intro: "Fontes, exposição, saúde e leitura regional ligadas ao contexto guardado."
        },
        "/recursos/soil.html": {
            source: "/recursos/solo.html",
            stylesheet: "/assets/css/pages/recursos-solo.css?v=2",
            script: "/assets/js/pages/recursos-solo-2.js?v=1",
            label: "Portugal em detalhe",
            title: "O solo no território português",
            intro: "Perfil territorial, indicadores, observação e práticas adaptadas ao lugar."
        },
        "/ecossistemas/biodiversity.html": {
            source: "/ecossistemas/biodiversidade.html",
            stylesheet: "/assets/css/pages/ecossistemas-biodiversidade.css?v=2",
            script: "/assets/js/pages/ecossistemas-biodiversidade-2.js?v=1",
            label: "Portugal em detalhe",
            title: "A biodiversidade no território português",
            intro: "Espécies, habitats, relações ecológicas e inventários aproximados à região guardada."
        },
        "/energia/energy.html": {
            source: "/energia/energia.html", stylesheet: "/assets/css/pages/energia-energia.css?v=2", script: "/assets/js/pages/energia-energia-2.js?v=1",
            label: "Portugal em detalhe", title: "A energia no território português",
            intro: "Produção, consumo, redes e escolhas energéticas aproximadas ao contexto português."
        },
        "/energia/renewables-and-territory.html": {
            source: "/energia/transicao-etica.html", stylesheet: "/assets/css/pages/energia-transicao-etica.css?v=2", script: "/assets/js/pages/energia-transicao-etica-2.js?v=1",
            label: "Portugal em detalhe", title: "Renováveis e território em Portugal",
            intro: "Transição energética, implantação territorial, comunidades e critérios de justiça aplicados a Portugal."
        },
        "/energia/ai-data-centres.html": {
            source: "/energia/digital.html", stylesheet: "/assets/css/pages/energia-digital.css?v=2", script: "/assets/js/pages/energia-digital-2.js?v=1",
            label: "Portugal em detalhe", title: "O impacto digital em Portugal",
            intro: "Infraestruturas, energia, água, materiais e efeitos territoriais da transformação digital."
        },
        "/energia/mining.html": {
            source: "/energia/mineracao.html", stylesheet: "/assets/css/pages/energia-mineracao.css?v=2", script: "/assets/js/pages/energia-mineracao-2.js?v=1",
            label: "Portugal em detalhe", title: "Mineração e território português",
            intro: "Recursos minerais, pressões ecológicas, comunidades e decisões de longo prazo em Portugal."
        },
        "/energia/livestock.html": {
            source: "/energia/pecuaria.html", stylesheet: "/assets/css/pages/energia-pecuaria.css?v=2", script: "/assets/js/pages/energia-pecuaria-2.js?v=1",
            label: "Portugal em detalhe", title: "Pecuária e território português",
            intro: "Sistemas pecuários, alimentação, emissões, solo e bem-estar aproximados ao contexto nacional."
        },
        "/calendario/living-vineyard.html": {
            source: "/calendario/enologia.html", stylesheet: "/assets/css/pages/calendario-enologia.css?v=2", script: "/assets/js/pages/calendario-enologia-2.js?v=1",
            label: "Portugal em detalhe", title: "A vinha viva em Portugal",
            intro: "Castas, terroir, calendário, solo, água e práticas vitícolas ligadas às regiões portuguesas."
        },
        "/observatorio/vetores-pressao-global.html": {
            source: "/observatorio/observatorio-terra.html",
            direct: true
        }
    };

    const config = routes[location.pathname];
    if (!config) return;

    function addStylesheet() {
        if (document.querySelector(`link[href^="${config.stylesheet.split("?")[0]}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = config.stylesheet;
        const heroSystem = document.querySelector('link[href*="biocultura-hero-system.css"]');
        document.head.insertBefore(link, heroSystem || null);
    }

    function addJourneyNavigation(main) {
        const hero = main.querySelector(".bio-banner-hero");
        if (!hero || main.querySelector(".scope-switch")) return;
        const nav = document.createElement("nav");
        nav.className = "scope-switch";
        nav.setAttribute("aria-label", "Escala da página");
        const portugalTarget = config.direct || config.calendar ? config.source : "#portugal";
        nav.innerHTML = `<a href="#global-reading">Leitura global</a><a href="${portugalTarget}">Portugal em detalhe</a>`;
        const firstGlobalSection = hero.nextElementSibling;
        if (firstGlobalSection) firstGlobalSection.id ||= "global-reading";
        const calendarJourney = location.pathname === "/calendario/regeneration-calendar.html"
            ? main.querySelector(".journey-nav")
            : null;
        if (calendarJourney) {
            const bar = document.createElement("div");
            bar.className = "calendar-navigation-bar";
            bar.setAttribute("aria-label", "Escala e percurso da página");
            bar.append(nav, calendarJourney);
            hero.insertAdjacentElement("afterend", bar);
        } else {
            hero.insertAdjacentElement("afterend", nav);
        }
    }

    function createLayer(main) {
        const section = document.createElement("section");
        section.id = "portugal";
        section.className = "section-block portugal-layer";
        section.innerHTML = `
            <div class="section-head portugal-layer-head">
                <span class="eyebrow">${config.label}</span>
                <div><h2>${config.title}</h2><p>${config.intro}</p></div>
            </div>
            <div class="portugal-layer-content" aria-live="polite"><p class="portugal-layer-loading">A aproximar a leitura a Portugal…</p></div>`;
        const footer = main.querySelector(":scope > .footer");
        const method = main.querySelector(":scope > :is(.method-box,.methodology)");
        main.insertBefore(section, method || footer || null);
        return section.querySelector(".portugal-layer-content");
    }

    function importLegacyContent(html, mount) {
        const parsed = new DOMParser().parseFromString(html, "text/html");
        const sourceSection = parsed.querySelector("#main .inner > section");
        if (!sourceSection) throw new Error("Camada territorial sem conteúdo");
        const nodes = [...sourceSection.children].filter((node) => !node.matches("footer"));
        nodes.forEach((node, index) => {
            if (!config.calendar && index === 0 && node.matches(".hero")) return;
            const clone = document.importNode(node, true);
            if (config.calendar && index === 0 && clone.matches(".hero")) {
                clone.classList.add("territorial-calendar-tool");
            }
            mount.appendChild(clone);
        });
        mount.querySelector(".portugal-layer-loading")?.remove();
    }

    function loadLegacyScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = config.script;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    async function init() {
        const main = document.querySelector("#main .inner > main") || document.querySelector("#main .inner");
        if (!main || document.getElementById("portugal")) return;
        addJourneyNavigation(main);
        if (config.direct || config.calendar) return;
        document.body.classList.add("has-portugal-layer");
        addStylesheet();
        const mount = createLayer(main);
        try {
            const response = await fetch(config.source);
            if (!response.ok) throw new Error(config.source);
            importLegacyContent(await response.text(), mount);
            await loadLegacyScript();
            document.dispatchEvent(new CustomEvent("bioculture:territorial-layer-ready"));
        } catch (error) {
            console.error(error);
            mount.innerHTML = "<p>Não foi possível carregar a leitura territorial de Portugal.</p>";
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
})();
