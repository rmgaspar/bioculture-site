/* Imagens demonstrativas de uma técnica (data/dicas.json → imagens): fotografias com crédito e esquemas próprios. */
(function () {
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    function figura(imagem, L, amplo) {
        const en = L === "en";
        const credito = imagem.tipo === "esquema" && !imagem.pagina
            ? `${en ? "Diagram" : "Esquema"}: ${esc(imagem.autor)}`
            : `${imagem.tipo === "esquema" ? (en ? "Diagram" : "Esquema") : imagem.tipo === "ilustracao" ? (en ? "Illustration" : "Ilustração") : (en ? "Photo" : "Foto")}: ${esc(imagem.autor)} · ${
                imagem.licenca_url
                    ? `<a href="${esc(imagem.licenca_url)}" target="_blank" rel="noopener noreferrer">${esc(en && imagem.licenca_en ? imagem.licenca_en : imagem.licenca)}</a>`
                    : esc(en && imagem.licenca_en ? imagem.licenca_en : imagem.licenca)
            } · <a href="${esc(imagem.pagina)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>`;
        return `<figure class="tec-fig tec-fig--${esc(imagem.tipo)}${amplo ? " tec-fig--ampla" : ""}"><img src="/images/${esc(en && imagem.ficheiro_en ? imagem.ficheiro_en : imagem.ficheiro)}${/\.svg$/.test(imagem.ficheiro) ? "?v=4" : ""}" alt="${esc(imagem.alt[L])}" width="1200" height="800" loading="lazy" decoding="async"><figcaption>${esc(imagem.legenda[L])}<span class="tec-credito">${credito}</span></figcaption></figure>`;
    }

    window.BioCulturaGaleria = {
        html(item, L) {
            const imagens = item?.imagens || [];
            if (!imagens.length) return "";
            // O esquema ocupa a largura toda; uma fotografia sozinha ao lado dele também.
            const fotos = imagens.filter((imagem) => imagem.tipo === "foto").length, esquemas = imagens.length - fotos;
            return `<div class="tec-galeria tec-galeria--n${imagens.length}${imagens.length === 1 ? " tec-galeria--um" : ""}" data-no-signature>${imagens.map((imagem) => figura(imagem, L, imagem.tipo === "foto" && esquemas && fotos === 1)).join("")}</div>`;
        },
    };
})();
