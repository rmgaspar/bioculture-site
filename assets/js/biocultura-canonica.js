/* Páginas de ficha (notícia, espécie, cultura, produto): o endereço canónico leva o `id` da ficha.
   O HTML não pode trazê-lo (é o mesmo modelo para todas as fichas), por isso, quando a ficha existe, este script escreve o canónico,
   os hreflang e o og:url com `?id=…`. Sem isto, todas as fichas apontavam para o modelo vazio e o Google juntava-as numa só página. */
(function () {
    "use strict";
    function par(selector, criar) {
        let el = document.head.querySelector(selector);
        if (!el) { el = criar(); document.head.appendChild(el); }
        return el;
    }
    window.BioCulturaCanonica = {
        definir(id) {
            if (!id) return;
            const origem = /(^|\.)bioculture\.pt$/.test(location.hostname) ? "https://www.bioculture.pt" : location.origin;
            const url = origem + location.pathname.replace(/\.html$/, "") + "?id=" + encodeURIComponent(id);
            const ligacao = (rel, hreflang, href) => {
                const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
                const el = par(sel, () => Object.assign(document.createElement("link"), { rel }));
                if (hreflang) el.hreflang = hreflang;
                el.href = href;
            };
            ligacao("canonical", "", url);
            ligacao("alternate", "pt-PT", url);
            ligacao("alternate", "en", url + "&lang=en");
            ligacao("alternate", "x-default", url);
            const og = par('meta[property="og:url"]', () => Object.assign(document.createElement("meta"), { content: "" }));
            og.setAttribute("property", "og:url");
            og.content = url;
        },
    };
})();
