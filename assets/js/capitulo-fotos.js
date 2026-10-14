/* Fotografia ao lado do cabeçalho e do texto de abertura de um capítulo.
   Lê data/fotos-capitulos.json (chave = data-pagina do script), espera que o capítulo seja desenhado (o conteúdo chega por
   fetch) e põe a fotografia ao lado do primeiro bloco de texto, com autor, licença e origem na legenda.
   O estilo vive em assets/css/components/capitulo-fotos.css. As fotografias são de terceiros: levam data-no-signature
   para o runtime não lhes pôr a marca bioCulture. Idempotente: se o runtime redesenhar o capítulo, volta a aplicar. */
(function () {
    "use strict";
    const script = document.currentScript;
    const pagina = script?.dataset.pagina;
    if (!pagina) return;
    const isEnglish = () => !!window.BioCultureI18n?.isEnglish;
    const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
    let fotos = null;

    function figura(f, L) {
        const nome = (v) => (L === "en" ? (v.licenca_en || v.licenca) : v.licenca);
        const licenca = f.licenca_url ? `<a href="${esc(f.licenca_url)}" target="_blank" rel="noopener">${esc(nome(f))}</a>` : esc(nome(f));
        const el = document.createElement("figure");
        el.className = "foto";
        el.setAttribute("data-no-signature", "");
        el.innerHTML = `<img src="/images/${esc(f.ficheiro)}" alt="${esc(f.alt[L] || f.alt.pt)}" loading="lazy" width="960" height="640"><figcaption>${esc(f.legenda[L] || f.legenda.pt)} <span class="credito">${L === "en" ? "Photo" : "Foto"}: ${esc(f.autor)} · ${licenca} · <a href="${esc(f.pagina)}" target="_blank" rel="noopener">Wikimedia Commons</a></span></figcaption>`;
        return el;
    }

    function aplicar() {
        if (!fotos) return;
        const L = isEnglish() ? "en" : "pt";
        Object.entries(fotos).forEach(([id, f]) => {
            // Modo capítulo: a fotografia entra ao lado do cabeçalho e do primeiro bloco de texto.
            const secao = document.getElementById(id);
            const prose = secao?.querySelector(":scope > .prose");
            if (secao && prose && secao.querySelector(":scope > .sec-head") && !secao.querySelector(":scope > .intro-foto")) {
                const caixa = document.createElement("div");
                caixa.className = "intro-foto";
                prose.before(caixa);
                caixa.append(prose, figura(f, L));
            }
            // Modo espaço: <div data-foto-slot="id"> no HTML recebe a figura.
            document.querySelectorAll(`[data-foto-slot="${id}"]:empty`).forEach((slot) => {
                if (slot.hasAttribute("data-credito-apenas")) {
                    const fig = figura(f, L);
                    slot.append(Object.assign(document.createElement("p"), { className: "foto-credito-solo", innerHTML: fig.querySelector("figcaption").innerHTML }));
                } else slot.append(figura(f, L));
            });
        });
    }

    let marcado = false;
    const agendar = () => {
        if (marcado) return;
        marcado = true;
        requestAnimationFrame(() => { marcado = false; aplicar(); });
    };
    fetch("/data/fotos-capitulos.json?v=9").then((r) => r.json()).then((dados) => {
        fotos = dados[pagina];
        aplicar();
        new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
    }).catch((erro) => console.error("Fotografias dos capítulos:", erro));
})();
