(function () {
    "use strict";

    const languageStore = window.BioCultureLanguageStore || (() => {
        const valid = new Set(["pt", "en"]);
        function cookieValue() {
            const match = document.cookie.match(/(?:^|;\s*)bioculture_lang_v2=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : "";
        }
        function write(value) {
            const selected = valid.has(value) ? value : "pt";
            try { window.localStorage.setItem("selected_lang", selected); } catch (_) {}
            const domain = /(^|\.)bioculture\.net$/i.test(location.hostname)
                ? "; Domain=.bioculture.net"
                : "";
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
        const date = /^\d{4}-\d{2}-\d{2}$/.test(translated)
            ? new Date(`${translated}T12:00:00Z`)
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
    });
    if (!supported.has(lang)) return;

    let dictionary = null;
    let structuredDictionary = null;
    let loading = null;
    const originalFetch = window.fetch.bind(window);

    function normalise(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    async function loadDictionary() {
        if (dictionary) return dictionary;
        if (!loading) {
            loading = originalFetch(`/assets/lang/auto/${lang}.json?v=15`, { cache: "no-cache" })
                .then((response) => response.ok ? response.json() : {})
                .catch(() => ({}));
        }
        dictionary = await loading;
        if (!structuredDictionary) {
            structuredDictionary = await originalFetch(`/assets/lang/${lang}.json?v=8`, { cache: "no-cache" })
                .then((response) => response.ok ? response.json() : {})
                .catch(() => ({}));
        }
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
            value: async () => translateData(await readJson()),
        });
        return response;
    };

    function translateTextNode(node) {
        if (!dictionary || !node || node.nodeType !== Node.TEXT_NODE) return;
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, code, pre, [data-no-translate]")) return;
        const raw = node.nodeValue || "";
        const key = normalise(raw);
        if (!key || !dictionary[key]) return;
        const leading = raw.match(/^\s*/)?.[0] || "";
        const trailing = raw.match(/\s*$/)?.[0] || "";
        node.nodeValue = leading + dictionary[key] + trailing;
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
        document.title = translateString(document.title);
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
