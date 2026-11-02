/* Imagens demonstrativas de uma técnica (data/dicas.json → imagens): fotografias com crédito e esquemas próprios. */
(function () {
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    function figura(imagem, L) {
        const en = L === "en";
        const credito = imagem.tipo === "esquema"
            ? `${en ? "Diagram" : "Esquema"}: ${esc(imagem.autor)}`
            : `${en ? "Photo" : "Foto"}: ${esc(imagem.autor)} · ${
                imagem.licenca_url
                    ? `<a href="${esc(imagem.licenca_url)}" target="_blank" rel="noopener noreferrer">${esc(imagem.licenca)}</a>`
                    : esc(imagem.licenca)
            } · <a href="${esc(imagem.pagina)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>`;
        return `<figure class="tec-fig tec-fig--${esc(imagem.tipo)}"><img src="/images/${esc(imagem.ficheiro)}" alt="${esc(imagem.alt[L])}" width="1200" height="800" loading="lazy" decoding="async"><figcaption>${esc(imagem.legenda[L])}<span class="tec-credito">${credito}</span></figcaption></figure>`;
    }

    window.BioCulturaGaleria = {
        html(item, L) {
            const imagens = item?.imagens || [];
            if (!imagens.length) return "";
            return `<div class="tec-galeria tec-galeria--${Math.min(imagens.length, 3)}" data-no-signature>${imagens.map((imagem) => figura(imagem, L)).join("")}</div>`;
        },
    };
})();
