(function () {
    "use strict";
    // Regresso ao mesmo cartão quando se volta de uma notícia.
    if (!window.__bioNewsReturn && !document.querySelector('script[src*="bioculture-news-return.js"]')) {
        const script = document.createElement("script");
        script.src = "/assets/js/bioculture-news-return.js?v=2";
        document.head.appendChild(script);
    }
    fetch("/sidebar-content.html?v=24")
        .then((response) => response.ok ? response.text() : "")
        .then((html) => { if (html) document.getElementById("sidebar").innerHTML = html; })
        .catch(() => {});

    const latest = document.getElementById("hub-latest-grid");
    if (latest) {
        const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
        fetch("/data/noticias.json")
            .then((response) => response.ok ? response.json() : [])
            .then((items) => {
                const categories = (latest.dataset.newsCategories || "agua,ar,solo,biodiversidade")
                    .split(",").map((category) => category.trim()).filter(Boolean);
                // Cada hub junta as palavras (no título) e as categorias principais dos seus temas, como nas páginas de tema.
                const registry = window.BioCultureNews?.topics || {};
                const known = categories.filter((category) => registry[category]);
                const words = [...new Set(known.flatMap((topic) => registry[topic].words))];
                const topicCategories = [...new Set(known.flatMap((topic) => registry[topic].categories))];
                // Um artigo científico só conta pelas palavras do tema da sua própria categoria.
                const belongs = (item) => {
                    if (item.estado === "proposta") return false;
                    // «fora_do_tema»: temas dos hubs de onde uma notícia é retirada à mão, mesmo que as palavras do título a apanhem.
                    if ((item.fora_do_tema || []).some((topic) => known.includes(topic))) return false;
                    if (item.capturado_em && item.tipo_fonte === "ciencia") {
                        const topic = registry[item.categoria_id];
                        return !!topic && known.includes(item.categoria_id) && window.BioCultureNews.about(item, topic.words, topic.categories);
                    }
                    return window.BioCultureNews.about(item, words, topicCategories);
                };
                const selected = known.length
                    ? window.BioCultureNews.rank(items).filter(belongs).slice(0, 6)
                    : (window.BioCultureNews?.select(items, { categories, context: "all", limit: 6, order: "relevance" }) || []);
                latest.innerHTML = selected.map((item) => window.BioCultureNews.cardHtml(item)).join("") || "<p>Sem notícias selecionadas neste momento.</p>";
                latest.querySelectorAll(".hub-latest-thumb").forEach((image) => {
                    image.addEventListener("error", () => {
                        if (image.dataset.fallbackApplied === "true") return;
                        image.dataset.fallbackApplied = "true";
                        image.src = "/images/noticias-sem-imagem.webp";
                        image.alt = window.BioCultureI18n?.isEnglish
                            ? "bioCulture editorial illustration"
                            : "Ilustração editorial bioCulture";
                    });
                });
            })
            .catch(() => { latest.innerHTML = "<p>Não foi possível carregar as notícias.</p>"; });
    }
})();
