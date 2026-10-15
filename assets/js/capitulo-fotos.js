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
        if (f.proporcao) el.style.setProperty("--proporcao", f.proporcao); // fotografia mais larga ou mais alta que 3:2: mostra-se inteira
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

    // Crédito «só texto» por baixo de uma imagem do cabeçalho: alinha o fim do texto ao bordo direito visível da imagem.
    function alinharCreditos() {
        document.querySelectorAll("[data-credito-apenas][data-alinhar]").forEach((el) => {
            const alvo = document.querySelector(el.dataset.alinhar), caixa = el.offsetParent;
            if (!alvo || !caixa) return;
            caixa.style.removeProperty("margin-bottom");
            if (window.matchMedia("(max-width: 900px)").matches) {
                if (!el.hasAttribute("data-alinhar-sempre")) { el.style.top = el.style.right = el.style.left = ""; return; }
                // O círculo sai do cartão e fica centrado: o crédito vai por baixo dele, também centrado.
                const m = alvo.getBoundingClientRect(), k = caixa.getBoundingClientRect();
                Object.assign(el.style, { position: "absolute", left: "0", right: "0", width: "auto", textAlign: "center", top: `${Math.round(m.bottom - k.top + 10)}px`, bottom: "auto" });
                // Se o crédito ficar a menos de 16 px do que vem a seguir, abre espaço por baixo do cartão (até estar livre).
                caixa.style.removeProperty("margin-bottom");
                const seguinte = caixa.nextElementSibling;
                for (let i = 0; seguinte && i < 3; i++) {
                    const falta = 16 - (seguinte.getBoundingClientRect().top - el.getBoundingClientRect().bottom);
                    if (falta <= 0) break;
                    caixa.style.setProperty("margin-bottom", `${Math.ceil(parseFloat(getComputedStyle(caixa).marginBottom) + falta)}px`, "important");
                }
                return;
            }
            const a = alvo.getBoundingClientRect(), c = caixa.getBoundingClientRect();
            const direita = Math.min(a.right, document.documentElement.clientWidth - 16);
            el.style.right = `${Math.round(c.right - direita)}px`;
            el.style.top = `${Math.round(a.bottom - c.top + 12)}px`;
            el.style.bottom = "auto";
        });
    }
    window.addEventListener("resize", alinharCreditos);
    window.addEventListener("load", alinharCreditos);

    let marcado = false;
    const agendar = () => {
        if (marcado) return;
        marcado = true;
        requestAnimationFrame(() => { marcado = false; aplicar(); alinharCreditos(); });
    };
    fetch("/data/fotos-capitulos.json?v=22").then((r) => r.json()).then((dados) => {
        fotos = dados[pagina];
        aplicar();
        alinharCreditos();
        new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });
    }).catch((erro) => console.error("Fotografias dos capítulos:", erro));
})();
