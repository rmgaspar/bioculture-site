/* Voltar de uma notícia para o mesmo sítio da listagem.
   Ao abrir uma notícia guarda qual foi; ao regressar (← Voltar / botão do browser) espera que a
   listagem seja desenhada (os dados chegam por fetch) e centra o cartão. Se a notícia estava
   escondida atrás de «Ver mais», abre a listagem completa primeiro.
   Carregado por biocultura-sticky-nav.js e hub-pages.js. */
(function () {
    "use strict";
    if (window.__bioNewsReturn) return;
    window.__bioNewsReturn = true;

    const KEY = "bio-news-return";
    const LINKS = 'a[href*="noticia-detalhe.html"]';

    document.addEventListener("click", (event) => {
        const link = event.target.closest && event.target.closest(LINKS);
        if (!link) return;
        try {
            sessionStorage.setItem(KEY, JSON.stringify({ path: location.pathname, href: link.getAttribute("href"), t: Date.now() }));
        } catch (_) {}
    }, true);

    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (_) {}
    if (!saved || saved.path !== location.pathname || Date.now() - saved.t > 30 * 60 * 1000) return;
    try { history.scrollRestoration = "manual"; } catch (_) {}

    let userMoved = false, target = null, expanded = false;
    ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, () => { userMoved = true; }, { passive: true, once: true }));

    const center = () => { if (target && !userMoved) target.scrollIntoView({ block: "center" }); };
    const find = () => [...document.querySelectorAll(LINKS)].find((a) => a.getAttribute("href") === saved.href);
    const finish = () => {
        observer.disconnect();
        clearTimeout(giveUp);
        try { sessionStorage.removeItem(KEY); } catch (_) {}
        try { history.scrollRestoration = "auto"; } catch (_) {}
    };
    const attempt = () => {
        target = find();
        if (target) {
            center();
            try { target.focus({ preventScroll: true }); } catch (_) {}
            // As imagens e outros blocos ainda podem mudar a altura da página: recentra mais duas vezes.
            setTimeout(center, 450);
            setTimeout(center, 1300);
            finish();
            return true;
        }
        const toggle = document.getElementById("news-toggle");
        if (!expanded && toggle && !toggle.hidden && toggle.getAttribute("aria-expanded") === "false") {
            expanded = true;
            toggle.click();
            return attempt();
        }
        return false;
    };
    const observer = new MutationObserver(() => { attempt(); });
    const giveUp = setTimeout(finish, 10000);
    const start = () => { if (!attempt()) observer.observe(document.body, { childList: true, subtree: true }); };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
