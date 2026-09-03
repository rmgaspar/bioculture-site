(function () {
    "use strict";
    fetch("/sidebar-content.html?v=22")
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
                const selected = window.BioCultureNews?.select(items, { categories, context: "all", limit: 6 }) || items.filter((item) => {
                    const itemCategories = new Set([item.categoria_id, ...(item.categorias || []), ...(item.tags || [])]);
                    return categories.some((category) => itemCategories.has(category));
                }).slice(0, 6);
                latest.innerHTML = selected.map((item) => {
                    const content = window.BioCultureI18n?.content(item) || item.pt || item;
                    const summary = content.resumo_biocultura || content.resumo || "";
                    const sourceImage = typeof item.imagem === "string" && (/^https?:\/\//i.test(item.imagem) || item.imagem.startsWith("/"))
                        ? item.imagem
                        : "/images/noticias-sem-imagem.webp";
                    const imageAlt = sourceImage === "/images/noticias-sem-imagem.webp"
                        ? (window.BioCultureI18n?.isEnglish ? "bioCulture editorial illustration" : "Ilustração editorial bioCulture")
                        : (content.titulo || "");
                    const itemHref = item.pagina || `/observatorio/noticia-detalhe.html?id=${encodeURIComponent(item.id)}`;
                    return `<a href="${escapeHtml(itemHref)}"><img class="hub-latest-thumb" src="${escapeHtml(sourceImage)}" alt="${escapeHtml(imageAlt)}" loading="lazy"><div class="hub-latest-card-body"><small>${escapeHtml(item.data || item.categoria || "Atualidade")}</small><h3>${escapeHtml(content.titulo || "Notícia")}</h3><p>${escapeHtml(summary)}</p><span>${escapeHtml(item.fonte || "bioCulture")} →</span></div></a>`;
                }).join("") || "<p>Sem notícias selecionadas neste momento.</p>";
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
