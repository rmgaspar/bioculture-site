(function () {
    "use strict";

    const supported = new Set(["en"]);
    const stored = localStorage.getItem("selected_lang") || "pt";
    const lang = supported.has(stored) ? stored : "pt";
    if (stored !== lang) localStorage.setItem("selected_lang", lang);
    if (!supported.has(lang)) return;

    let dictionary = null;
    let loading = null;
    const originalFetch = window.fetch.bind(window);

    function normalise(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    async function loadDictionary() {
        if (dictionary) return dictionary;
        if (!loading) {
            loading = originalFetch(`/assets/lang/auto/${lang}.json?v=1`, { cache: "no-cache" })
                .then((response) => response.ok ? response.json() : {})
                .catch(() => ({}));
        }
        dictionary = await loading;
        return dictionary;
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
        translateElement(document.body);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
                    else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();

    document.addEventListener("biocultura:language-change", () => window.location.reload());
})();
