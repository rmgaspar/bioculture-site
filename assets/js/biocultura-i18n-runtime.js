(function () {
    "use strict";

    const consolidatedLegacyRoutes = {
        "/observatorio/vetores-pressao.html": "/observatorio/observatorio-terra.html"
    };
    if (consolidatedLegacyRoutes[location.pathname]) {
        location.replace(consolidatedLegacyRoutes[location.pathname]);
        return;
    }

    /* Mantém todas as páginas no mesmo sistema editorial, incluindo páginas
       antigas que ainda não declaram explicitamente esta folha de estilos. */
    const heroSystem = document.querySelector('link[href*="biocultura-hero-system.css"]') || document.createElement("link");
    heroSystem.rel = "stylesheet";
    heroSystem.href = "/assets/css/biocultura-hero-system.css?v=20";
    heroSystem.dataset.bioculturaHeroSystem = "true";
    if (!heroSystem.parentNode) document.head.appendChild(heroSystem);

    /* Algumas páginas antigas ainda incluem a folha depois deste runtime.
       No fim da leitura do HTML, uniformiza a versão e elimina duplicados
       para impedir que uma cópia antiga em cache volte a ganhar prioridade. */
    function normalizeHeroStylesheet() {
        const links = Array.from(document.querySelectorAll('link[href*="biocultura-hero-system.css"]'));
        const canonical = links[0] || heroSystem;
        canonical.href = "/assets/css/biocultura-hero-system.css?v=20";
        canonical.dataset.bioculturaHeroSystem = "true";
        links.slice(1).forEach((link) => link.remove());
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", normalizeHeroStylesheet, { once: true });
    } else {
        normalizeHeroStylesheet();
    }

    /* Identifica apenas aberturas editoriais com imagem própria. Painéis
       funcionais, como o calendário mensal, mantêm a sua composição. */
    function markEditorialHero() {
        if (document.body.dataset.heroTheme === "forest") return;
        const hero = document.querySelector("#main .water-hero, #main .regen-hero, #main .observatory-hero, #main .hero");
        if (!hero) return;
        const visual = hero.querySelector(":scope > .water-hero-image, :scope > .regen-hero-image, :scope > .observatory-visual, :scope > .water-orbit, :scope > .air-orbit, :scope > .soil-orbit, :scope > .life-orbit, :scope > .grape-stage, :scope > .energy-orbit, :scope > .territory-orbit, :scope > .ore-orbit, :scope > .digital-orbit, :scope > .field-mark, :scope > .living-mark");
        if (!visual) return;
        hero.classList.add("bio-banner-hero");

        /* O banner contém apenas identidade, título e subtítulo. Informação
           complementar continua imediatamente depois, sem ser cortada. */
        const extras = hero.querySelectorAll(":scope .hero-proof, :scope .hero-guide, :scope .location-guide, :scope .hero-reading-bridge, :scope .vineyard-reading-bridge");
        if (extras.length) {
            const followup = document.createElement("div");
            followup.className = "bio-hero-followup";
            extras.forEach((element) => followup.appendChild(element));
            hero.insertAdjacentElement("afterend", followup);
        }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", markEditorialHero, { once: true });
    else markEditorialHero();

    const consolidatedRoutes = new Set(["/calendario/regeneration-calendar.html", "/energia/energy.html", "/calendario/living-vineyard.html", "/observatorio/vetores-pressao-global.html"]);
    if (consolidatedRoutes.has(location.pathname)) {
        const consolidationStyle = document.createElement("link");
        consolidationStyle.rel = "stylesheet";
        consolidationStyle.href = "/assets/css/territorial-consolidation.css?v=7";
        document.head.appendChild(consolidationStyle);
        import("/assets/js/territorial-consolidation.js?v=8").catch((error) => {
            console.error("Não foi possível carregar a leitura territorial.", error);
        });
    }

    const languageStore = window.BioCultureLanguageStore || (() => {
        const valid = new Set(["pt", "en"]);
        function cookieValue() {
            const match = document.cookie.match(/(?:^|;\s*)bioculture_lang_v2=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : "";
        }
        function write(value) {
            const selected = valid.has(value) ? value : "pt";
            try { window.localStorage.setItem("selected_lang", selected); } catch (_) {}
            const rootDomainMatch = /(?:^|\.)(bioculture\.(?:net|pt))$/i.exec(location.hostname);
            const domain = rootDomainMatch ? `; Domain=.${rootDomainMatch[1]}` : "";
            document.cookie = `bioculture_lang_v2=${encodeURIComponent(selected)}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${location.protocol === "https:" ? "; Secure" : ""}`;
            document.documentElement.lang = selected;
            return selected;
        }
        function read() {
            const parameter = new URLSearchParams(window.location.search).get("lang");
            if (valid.has(parameter)) return write(parameter);
            let local = "";
            try { local = window.localStorage.getItem("selected_lang") || ""; } catch (_) {}
            const cookie = cookieValue();
            return write(valid.has(cookie) ? cookie : valid.has(local) ? local : "pt");
        }
        return Object.freeze({ read, write });
    })();
    window.BioCultureLanguageStore = languageStore;

    // Arranque explícito do módulo territorial. O menu lateral é injetado
    // depois do HTML principal; não dependemos de imagens invisíveis nem de
    // eventos onload que o Safari pode omitir ao restaurar a cache.
    let biocultureShellBooted = false;
    function bootBioCultureShell() {
        if (biocultureShellBooted) return;
        biocultureShellBooted = true;
        import("/assets/js/biocultura-shell.js?v=15")
            .then((module) => module.init())
            .catch((error) => {
                biocultureShellBooted = false;
                console.error("Não foi possível iniciar a localização bioCulture.", error);
            });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootBioCultureShell, { once: true });
    } else {
        bootBioCultureShell();
    }

    const supported = new Set(["en"]);
    const stored = languageStore.read();
    const lang = supported.has(stored) ? stored : "pt";

    function navigateToLanguage(value) {
        const selected = value === "en" ? "en" : "pt";
        languageStore.write(selected);
        const url = new URL(window.location.href);
        if (selected === "en") url.searchParams.set("lang", "en");
        else url.searchParams.delete("lang");
        window.location.assign(url.href);
    }

    function syncLanguageSelector(root) {
        const selector = root?.matches?.("#lang-selector")
            ? root
            : root?.querySelector?.("#lang-selector");
        if (!selector) return;
        selector.value = lang;
        selector.dataset.biocultureRuntimeBound = "true";
    }

    // O sidebar é injetado depois do carregamento da página. A delegação no
    // documento evita depender do onchange inline ou do restauro de formulários
    // do Safari.
    document.addEventListener("change", (event) => {
        if (event.target?.id !== "lang-selector") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateToLanguage(event.target.value);
    }, true);

    function preserveLanguageInLinks(root) {
        if (lang !== "en") return;
        root.querySelectorAll?.("a[href]").forEach((link) => {
            const raw = link.getAttribute("href");
            if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
            try {
                const url = new URL(raw, window.location.href);
                if (url.origin !== window.location.origin) return;
                url.searchParams.set("lang", "en");
                link.href = url.href;
            } catch (_) {}
        });
    }

    // O Safari pode recuperar uma página completa da memória de navegação.
    // Se o idioma guardado mudou entretanto, força uma reconstrução coerente.
    window.addEventListener("pageshow", (event) => {
        const selected = languageStore.read();
        if (event.persisted && document.documentElement.lang !== selected) {
            window.location.reload();
        }
    });

    const categoryNames = {
        "Água": "Water",
        "Ar": "Air",
        "Solo": "Soil",
        "Impacto Digital & IA": "Digital Impact & AI",
        "Mineração": "Mining",
        "Biodiversidade": "Biodiversity",
        "Energia Ética": "Ethical Energy",
        "Pecuária Industrial": "Industrial Livestock",
        "Geral": "General",
    };

    function selectedContent(record) {
        if (!record || typeof record !== "object") return record || {};
        return record[lang] || record.pt || record;
    }

    function formatDate(value) {
        if (!value) return "";
        const raw = String(value).trim();
        const portugueseMonths = {
            jan: "Jan", fev: "Feb", mar: "Mar", abr: "Apr", mai: "May", jun: "Jun",
            jul: "Jul", ago: "Aug", set: "Sep", out: "Oct", nov: "Nov", dez: "Dec",
        };
        const translated = raw.replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi,
            (month) => portugueseMonths[month.toLowerCase()] || month);
        const textual = translated.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
        const monthIndex = textual ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(textual[2]) : -1;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(translated)
            ? new Date(`${translated}T12:00:00Z`)
            : textual && monthIndex >= 0
                ? new Date(Date.UTC(Number(textual[3]), monthIndex, Number(textual[1]), 12))
                : new Date(translated);
        if (Number.isNaN(date.getTime())) return raw;
        return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", {
            day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
        }).format(date);
    }

    window.BioCultureI18n = Object.freeze({
        language: lang,
        isEnglish: lang === "en",
        content: selectedContent,
        date: formatDate,
        category(value) {
            return lang === "en" ? (categoryNames[value] || value || "General") : (value || "Geral");
        },
        choose(pt, en) {
            return lang === "en" ? en : pt;
        },
        t(key) {
            return nestedValue(structuredDictionary, key) || key;
        },
        updateDOM(root = document) {
            applyStructuredTranslations(root);
            translateElement(root === document ? document.body : root);
        },
    });

    window.BioCultureNews = {
        compare(a, b) {
            const dateValue = (item) => {
                const raw = item?.publicado_em || item?.data || item?.capturado_em || "";
                const normalized = String(raw)
                    .replace(/\bJan\b/i, "Jan").replace(/\bFev\b/i, "Feb")
                    .replace(/\bMar\b/i, "Mar").replace(/\bAbr\b/i, "Apr")
                    .replace(/\bMai\b/i, "May").replace(/\bJun\b/i, "Jun")
                    .replace(/\bJul\b/i, "Jul").replace(/\bAgo\b/i, "Aug")
                    .replace(/\bSet\b/i, "Sep").replace(/\bOut\b/i, "Oct")
                    .replace(/\bNov\b/i, "Nov").replace(/\bDez\b/i, "Dec");
                const value = Date.parse(normalized.slice(0, 10));
                return Number.isNaN(value) ? 0 : value;
            };
            const dateDifference = dateValue(b) - dateValue(a);
            if (dateDifference) return dateDifference;
            return (+b?.prioridade || +b?.relevancia || 0) - (+a?.prioridade || +a?.relevancia || 0);
        },
        categories(item) {
            return [...new Set([...(item?.categorias || []), ...(item?.tags || []), item?.categoria_id].filter(Boolean))];
        },
        scope(item) {
            return item?.ambito || (item?.paises?.includes?.("PT") ? "portugal" : "global");
        },
        visibleIn(item, context = "global") {
            const scope = this.scope(item);
            if (context === "all") return true;
            if (context === "portugal") return scope === "portugal";
            return scope !== "portugal" || item?.relevancia_global === true;
        },
        select(items, { categories = [], context = "global", limit = 6 } = {}) {
            const wanted = new Set(categories);
            return [...(items || [])]
                .filter((item) => item?.estado !== "proposta" && this.visibleIn(item, context))
                .filter((item) => !wanted.size || this.categories(item).some((category) => wanted.has(category)))
                .sort((a, b) => this.compare(a, b))
                .slice(0, limit);
        },
    };

    function installImageSignatures() {
        if (!document.getElementById("bioculture-image-signature-style")) {
            const style = document.createElement("style");
            style.id = "bioculture-image-signature-style";
            style.textContent = `
                .bioculture-owned-visual { position: relative !important; }
                .bioculture-image-signature-frame { display: block; overflow: hidden; }
                .bioculture-image-signature-frame > img { display: block; }
                .bioculture-owned-visual::after {
                    content: "bioCulture";
                    position: absolute;
                    z-index: 6;
                    right: .72rem;
                    bottom: .58rem;
                    color: rgba(255,255,255,.42);
                    font: 400 .62rem/1 Georgia, "Times New Roman", serif;
                    letter-spacing: -.035em;
                    text-shadow: 0 1px 3px rgba(20,38,29,.28);
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }

        const ownedPath = (value) => {
            try {
                const url = new URL(value, location.href);
                if (url.origin !== location.origin) return false;
                if (!/^\/(images|assets\/dicas)\//.test(url.pathname)) return false;
                return !/(logo|mark|placeholder|favicon|icon)/i.test(url.pathname);
            } catch (_) { return false; }
        };
        const excluded = "#sidebar, .bio-wordmark, .source-logo-detail, [data-no-signature]";
        const mark = (root = document) => {
            root.querySelectorAll?.("img[src]").forEach((image) => {
                if (!ownedPath(image.getAttribute("src")) || image.closest(excluded)) return;
                let frame = image.closest("picture, .hero-image, .hero-globe, .portal-mark, .dossier-visual, .vine-vignette, .hub-thumb");
                if (!frame) {
                    if (image.parentElement?.classList.contains("bioculture-image-signature-frame")) frame = image.parentElement;
                    else {
                        frame = document.createElement("span");
                        frame.className = "bioculture-image-signature-frame";
                        image.before(frame);
                        frame.appendChild(image);
                    }
                }
                if (frame && !frame.closest(excluded)) frame.classList.add("bioculture-owned-visual");
            });
            root.querySelectorAll?.("[style*='background-image'], .observatory-visual, .hub-thumb").forEach((element) => {
                if (element.closest(excluded)) return;
                const match = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
                if (match && ownedPath(match[1])) element.classList.add("bioculture-owned-visual");
            });
        };
        mark();
        new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) mark(node);
        }))).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installImageSignatures, { once: true });
    else installImageSignatures();

    function filterNewsForPage(data, url) {
        if (!url.includes("/data/noticias.json") || !Array.isArray(data) || location.pathname.includes("noticia-detalhe")) return data;
        const pageCategories = [
            [/\/(water|agua)\.html$/, ["agua"]],
            [/\/(air|ar)\.html$/, ["ar"]],
            [/\/(soil|solo)\.html$/, ["solo"]],
            [/\/(biodiversity|biodiversidade)\.html$/, ["biodiversidade"]],
            [/\/(energy|energia)\.html$/, ["energia"]],
            [/\/(renewables-and-territory|transicao-etica)\.html$/, ["energia"]],
            [/\/(ai-data-centres|digital)\.html$/, ["impacto-digital"]],
            [/\/(mining|mineracao)\.html$/, ["mineracao"]],
            [/\/(livestock|pecuaria)\.html$/, ["pecuaria"]],
            [/\/(regeneration-calendar|calendario)\.html$/, ["agricultura"]],
            [/\/(living-vineyard|enologia)\.html$/, ["agricultura"]],
        ];
        const pageRule = pageCategories.find(([pattern]) => pattern.test(location.pathname));
        if (pageRule) {
            const wanted = new Set(pageRule[1]);
            data = data.filter((item) => window.BioCultureNews.categories(item).some((category) => wanted.has(category)));
        }
        // Estas páginas já juntam a leitura global ("No mundo") e a nacional
        // ("Portugal e ilhas") na mesma página, pelo que o widget de notícias
        // deve mostrar as duas escalas, não só a portuguesa.
        const mergedPages = /\/(agua|ar|solo|biodiversidade|energia|transicao-etica|digital|mineracao|pecuaria|calendario|enologia|observatorio-terra)\.html$/;
        if (mergedPages.test(location.pathname)) return data.filter((item) => window.BioCultureNews.visibleIn(item, "all"));
        return data;
    }

    if (!supported.has(lang)) {
        const portugueseFetch = window.fetch.bind(window);
        window.fetch = async function (...args) {
            const response = await portugueseFetch(...args);
            const url = String(args[0] instanceof Request ? args[0].url : args[0]);
            if (!url.includes("/data/noticias.json")) return response;
            const readJson = response.json.bind(response);
            Object.defineProperty(response, "json", { configurable: true, value: async () => filterNewsForPage(await readJson(), url) });
            return response;
        };
        return;
    }

    let dictionary = null;
    let structuredDictionary = null;
    /* Traduções só de apresentação: aplicam-se ao texto já desenhado na página,
       mas nunca aos dados JSON, porque o código das páginas (calendário, filtros,
       cruzamentos) lê valores em português como "março–maio" ou "fruteira". */
    let displayDictionary = {};
    let loading = null;
    const originalFetch = window.fetch.bind(window);

    function normalise(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    /* Um único carregamento partilhado: quem chega depois espera por todos os
       dicionários (automático, estruturado e de apresentação). */
    let fullLoading = null;
    async function loadDictionary() {
        if (!fullLoading) {
            const read = (url) => originalFetch(url, { cache: "no-cache" })
                .then((response) => response.ok ? response.json() : {})
                .catch(() => ({}));
            fullLoading = Promise.all([
                read(`/assets/lang/auto/${lang}.json?v=31`),
                read(`/assets/lang/${lang}.json?v=11`),
                read(`/assets/lang/display/${lang}.json?v=32`),
            ]).then(([auto, structured, display]) => {
                dictionary = auto;
                structuredDictionary = structured;
                displayDictionary = display;
            });
        }
        await fullLoading;
        return dictionary;
    }

    function nestedValue(object, path) {
        return String(path || "").split(".").reduce((value, key) => value?.[key], object);
    }

    function applyStructuredTranslations(root) {
        if (!structuredDictionary) return;
        const scope = root?.querySelectorAll ? root : document;
        const nodes = [];
        if (root?.matches?.("[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]")) nodes.push(root);
        scope.querySelectorAll?.("[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]").forEach((node) => nodes.push(node));
        nodes.forEach((node) => {
            const text = nestedValue(structuredDictionary, node.dataset.i18n);
            const html = nestedValue(structuredDictionary, node.dataset.i18nHtml);
            const placeholder = nestedValue(structuredDictionary, node.dataset.i18nPlaceholder);
            const title = nestedValue(structuredDictionary, node.dataset.i18nTitle);
            if (typeof text === "string") node.textContent = text;
            if (typeof html === "string") node.innerHTML = html;
            if (typeof placeholder === "string") node.setAttribute("placeholder", placeholder);
            if (typeof title === "string") {
                node.setAttribute("title", title);
                node.setAttribute("aria-label", title);
            }
        });
    }

    function translateString(value) {
        if (!dictionary || typeof value !== "string") return value;
        const key = normalise(value);
        return dictionary[key] || value;
    }

    /* Permite às páginas ordenar pelo nome já traduzido (ex.: catálogo de culturas). */
    window.BioCultureDisplayTranslate = (value) => {
        const key = normalise(value);
        return displayDictionary[key] || (dictionary && dictionary[key]) || value;
    };

    function translateData(value) {
        if (typeof value === "string") return translateString(value);
        if (Array.isArray(value)) return value.map(translateData);
        if (value && typeof value === "object") {
            Object.keys(value).forEach((key) => {
                value[key] = translateData(value[key]);
            });
        }
        return value;
    }

    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const url = String(args[0] instanceof Request ? args[0].url : args[0]);
        if (!url.includes("/data/") || !url.includes(".json")) return response;
        await loadDictionary();
        const readJson = response.json.bind(response);
        Object.defineProperty(response, "json", {
            configurable: true,
            value: async () => {
                const data = translateData(await readJson());
                return filterNewsForPage(data, url);
            },
        });
        return response;
    };

    /* Textos compostos pelas páginas ("Fonte 2", "cerca de 27 km · Tondela",
       "· Estado", "Tipo · Ano"): traduz cada parte conhecida e mantém o resto. */
    function lookupDisplay(key) {
        return dictionary[key] || displayDictionary[key] || "";
    }
    const HYMENOPTERA = { vespas: "wasps", formigas: "ants", abelhas: "bees", "vespas-oleiras": "mud-dauber wasps", "vespas verdadeiras": "true wasps" };
    const FAMILY_PT = { coccinelídeos: "Coccinellidae", crambídeos: "Crambidae", esfingídeos: "Sphingidae", ninfalídeos: "Nymphalidae", erebídeos: "Erebidae" };
    function translateTaxonSentence(key) {
        let m;
        const head = "(.+?)(?:,\\s*(?:(?:também |comummente )?conhecid[ao] (?:como|por|pelo nome comum de) |com o nome comum de )(.+?),?)?";
        const name = (a, b) => (b ? `${a}, also known as ${b},` : a);
        const family = (value) => FAMILY_PT[value.replace(/^dos /, "").toLowerCase()] || value.replace(/^dos /, "");
        const rx = (body) => new RegExp(`^${head} ${body}$`);
        if ((m = key.match(rx("é uma espécie de insetos lepidópteros, mais especificamente de (traças|borboletas)(?: conhecidas? por .+?)?,? pertenc(?:ente|endo) à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of lepidopteran insect, more specifically of ${m[3] === "traças" ? "moths" : "butterflies"}, belonging to the family ${family(m[4])}.`;
        }
        if ((m = key.match(rx("é uma espécie de insetos coleópteros(?: polífagos)? pertencente à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of beetle (coleopteran insect) belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(rx("é uma espécie de insetos himenópteros, mais especificamente de (vespas-oleiras|vespas verdadeiras|vespas|formigas|abelhas),? pertenc(?:ente|entes) à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of hymenopteran insect, more specifically of ${HYMENOPTERA[m[3]]}, belonging to the family ${family(m[4])}.`;
        }
        if ((m = key.match(rx("é uma espécie de artrópode pertencente à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of arthropod belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(/^(.+?) é um gênero de mariposa pertencente à família (.+)\.$/))) {
            return `${m[1]} is a genus of moths belonging to the family ${family(m[2])}.`;
        }
        if ((m = key.match(/^(.+?) é uma espécie de inseto do gênero (.+?), pertencente à família (.+)\.$/))) {
            return `${m[1]} is a species of insect of the genus ${m[2]}, belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(/^(.+?) é uma espécie de libelinha da família (.+)\.$/))) {
            return `${m[1]} is a species of damselfly or dragonfly of the family ${family(m[2])}.`;
        }
        if ((m = key.match(/^A autoridade científica da espécie é (.+?), tendo sido descrita no ano de (\d+)\.$/))) {
            return `The scientific authority of the species is ${m[1]}, who described it in ${m[2]}.`;
        }
        return "";
    }

    function translateComposite(key) {
        const direct = lookupDisplay(key);
        if (direct) return direct;
        let match;
        if (key.endsWith(" ↗") || key.endsWith(" →")) {
            const rest = translateComposite(key.slice(0, -2));
            if (rest) return `${rest} ${key.slice(-1)}`;
        }
        if ((match = key.match(/^Fonte (\d+)$/))) return `Source ${match[1]}`;
        if ((match = key.match(/^Localização: (.+)$/))) {
            return `Location: ${translateComposite(match[1]) || match[1]}`;
        }
        if ((match = key.match(/^cerca de (\d+) km(.*)$/))) {
            const rest = match[2] ? translateComposite(match[2]) || match[2] : "";
            return `about ${match[1]} km${rest}`;
        }
        /* Fichas de insetos: frases-modelo da Wikipédia ("X é uma espécie de … pertencente à família Y"). */
        const taxon = translateTaxonSentence(key);
        if (taxon) return taxon;
        /* Fichas de pragas: frases-modelo com nomes e listas já traduzidos. */
        if ((match = key.match(/^(.+) afeta sobretudo (.+)\. A gestão recomendada combina prevenção, observação regular, tolerância a dano ligeiro e intervenção seletiva apenas quando o crescimento da praga ou doença ameaça a cultura\.$/))) {
            const plants = match[2].split(", ").map((item) => lookupDisplay(item) || item).join(", ");
            return `${lookupDisplay(match[1]) || match[1]} mainly affects ${plants}. The recommended management combines prevention, regular observation, tolerance of slight damage and selective intervention only when the growth of the pest or disease threatens the crop.`;
        }
        if ((match = key.match(/^Conservar ou, quando permitido e tecnicamente adequado, recorrer a: (.+)\.$/))) {
            const items = match[1].split("; ").map((item) => lookupDisplay(item) || item).join("; ");
            return `Conserve or, where permitted and technically appropriate, use: ${items}.`;
        }
        if ((match = key.match(/^(Flora|Fauna) invasora \((.+)\)$/))) {
            return `Invasive ${match[1] === "Flora" ? "flora" : "fauna"} (${match[2]})`;
        }
        if ((match = key.match(/^(\d+) participações$/))) return `${match[1]} ${match[1] === "1" ? "submission" : "submissions"}`;
        if ((match = key.match(/^registos com (.+) disponível$/))) {
            return `records with ${lookupDisplay(match[1]) || match[1]} available`;
        }
        /* Vários campos juntos em frases consecutivas. */
        const sentences = key.split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/);
        if (sentences.length > 1) {
            /* Procura sempre o maior grupo de frases que já exista no dicionário
               (um campo pode ter várias frases). */
            const translated = [];
            let index = 0;
            while (index < sentences.length) {
                let end = sentences.length;
                let found = "";
                for (; end > index; end--) {
                    found = lookupDisplay(sentences.slice(index, end).join(" "));
                    if (found) break;
                }
                if (found) {
                    translated.push(found);
                    index = end;
                } else {
                    translated.push(translateComposite(sentences[index]) || sentences[index]);
                    index += 1;
                }
            }
            if (translated.some((part, position) => part !== sentences[position])) return translated.join(" ");
        }
        /* "Rótulo: valor" — traduz o rótulo e o valor conhecidos, mantém o resto. */
        if ((match = key.match(/^([^:·.]{1,30}): (.+)$/))) {
            const label = lookupDisplay(match[1]);
            const rest = translateComposite(match[2]);
            if (label || rest) return `${label || match[1]}: ${rest || match[2]}`;
        }
        if (key.startsWith("· ")) {
            const rest = translateComposite(key.slice(2));
            return rest ? `· ${rest}` : "";
        }
        if (key.includes(" · ")) {
            const parts = key.split(" · ");
            const translated = parts.map((part) => translateComposite(part) || part);
            return translated.some((part, index) => part !== parts[index]) ? translated.join(" · ") : "";
        }
        if (key.includes(" — ")) {
            const parts = key.split(" — ");
            const translated = parts.map((part) => translateComposite(part) || part);
            if (translated.some((part, index) => part !== parts[index])) return translated.join(" — ");
        }
        return "";
    }

    function translateTextNode(node) {
        if (!dictionary || !node || node.nodeType !== Node.TEXT_NODE) return;
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, code, pre, [data-no-translate]")) return;
        const raw = node.nodeValue || "";
        const key = normalise(raw);
        const translated = key && translateComposite(key);
        if (!translated) return;
        const leading = raw.match(/^\s*/)?.[0] || "";
        const trailing = raw.match(/\s*$/)?.[0] || "";
        node.nodeValue = leading + translated + trailing;
    }

    function translateElement(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(translateTextNode);
        root.querySelectorAll?.("[placeholder], [title], [aria-label]").forEach((element) => {
            ["placeholder", "title", "aria-label"].forEach((attribute) => {
                if (element.hasAttribute(attribute)) {
                    element.setAttribute(attribute, translateString(element.getAttribute(attribute)));
                }
            });
        });
    }

    async function start() {
        await loadDictionary();
        document.documentElement.lang = lang;
        const translateTitle = () => {
            const translated = translateComposite(normalise(document.title)) || translateString(document.title);
            if (translated && translated !== document.title) document.title = translated;
        };
        translateTitle();
        /* Páginas de detalhe definem o título depois de carregar os dados. */
        const titleElement = document.querySelector("title");
        if (titleElement) new MutationObserver(translateTitle).observe(titleElement, { childList: true });
        applyStructuredTranslations(document);
        translateElement(document.body);
        preserveLanguageInLinks(document);
        syncLanguageSelector(document);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
                    else if (node.nodeType === Node.ELEMENT_NODE) {
                        syncLanguageSelector(node);
                        applyStructuredTranslations(node);
                        translateElement(node);
                        preserveLanguageInLinks(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();

    document.addEventListener("biocultura:language-change", () => window.location.reload());
})();
