/* «← Voltar» que regressa ao sítio exato de onde saíste.
   Ao seguires uma ligação para outra página guarda de onde vinhas (página, ligação clicada e posição).
   Na página seguinte, o «← Voltar» leva-te de volta a essa página e centra a ligação que clicaste
   (esperando que o conteúdo, que chega por fetch, seja desenhado). Sem registo válido — abriste a página
   por um endereço direto, pela pesquisa ou noutro separador — o «← Voltar» segue o destino original (o hub).
   Carregado por biocultura-i18n-runtime.js. */
(function () {
    "use strict";
    if (window.__bioVoltar) return;
    window.__bioVoltar = true;

    const STACK = "bio-voltar-stack";
    const RESTORE = "bio-voltar-restore";
    const MAX_AGE = 30 * 60 * 1000;
    const norm = (p) => (p || "/").replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
    const read = (key) => { try { return JSON.parse(sessionStorage.getItem(key) || "null"); } catch (_) { return null; } };
    const write = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
    const drop = (key) => { try { sessionStorage.removeItem(key); } catch (_) {} };
    const NEWS = "noticia-detalhe"; // as notícias têm o seu próprio regresso (bioculture-news-return.js)

    // 1. Ao sair por uma ligação interna, guarda de onde vinhas.
    document.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest && event.target.closest("a[href]");
        if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
        let url;
        try { url = new URL(link.href, location.href); } catch (_) { return; }
        if (url.origin !== location.origin || norm(url.pathname) === norm(location.pathname)) return;
        if (url.pathname.includes(NEWS) || link.classList.contains("bio-voltar")) return;
        const same = [...document.querySelectorAll("a[href]")].filter((a) => a.getAttribute("href") === link.getAttribute("href"));
        const stack = (read(STACK) || []).filter((r) => Date.now() - r.t < MAX_AGE).slice(-9);
        stack.push({
            from: location.pathname + location.search,
            to: norm(url.pathname),
            href: link.getAttribute("href"),
            nth: Math.max(0, same.indexOf(link)),
            y: Math.round(window.scrollY),
            t: Date.now(),
        });
        write(STACK, stack);
    }, true);

    // 2. Nesta página: se vieste de uma página do site por uma ligação, o «← Voltar» regressa lá.
    const referrerPath = () => {
        try {
            const r = new URL(document.referrer);
            return r.origin === location.origin ? norm(r.pathname) : "";
        } catch (_) { return ""; }
    };
    const origin = () => {
        const ref = referrerPath();
        if (!ref) return null;
        const stack = read(STACK) || [];
        for (let i = stack.length - 1; i >= 0; i -= 1) {
            const r = stack[i];
            if (r.to === norm(location.pathname) && norm(r.from.split("?")[0]) === ref && Date.now() - r.t < MAX_AGE) return { rec: r, index: i };
        }
        return null;
    };
    const setupBack = () => {
        const backs = document.querySelectorAll("a.hub-back");
        if (!backs.length) return;
        const found = origin();
        backs.forEach((a) => {
            if (a.dataset.bioVoltar) return;
            a.dataset.bioVoltar = "1";
            a.classList.add("bio-voltar");
            const hub = a.getAttribute("href");
            if (!found) return;
            a.setAttribute("href", found.rec.from);
            a.addEventListener("click", (event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                const stack = read(STACK) || [];
                write(STACK, stack.slice(0, found.index));
                write(RESTORE, { path: norm(found.rec.from.split("?")[0]), href: found.rec.href, nth: found.rec.nth, y: found.rec.y, t: Date.now() });
            });
            a.dataset.bioHub = hub;
        });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupBack, { once: true });
    else setupBack();

    // 3. Na página de onde saíste: centra a ligação clicada (ou, se desapareceu, volta à mesma altura).
    const saved = read(RESTORE);
    drop(RESTORE);
    if (!saved || saved.path !== norm(location.pathname) || Date.now() - saved.t > 2 * 60 * 1000) return;
    try { history.scrollRestoration = "manual"; } catch (_) {}

    let userMoved = false, target = null, opened = 0;
    ["wheel", "touchstart", "keydown", "mousedown"].forEach((type) => window.addEventListener(type, () => { userMoved = true; }, { passive: true, once: true }));
    const center = () => { if (target && !userMoved) target.scrollIntoView({ block: "center" }); };
    const find = () => {
        const all = [...document.querySelectorAll("a[href]")].filter((a) => a.getAttribute("href") === saved.href && !a.classList.contains("bio-nav-top"));
        return all[saved.nth] || all[0] || null;
    };
    const finish = (fallback) => {
        observer.disconnect();
        clearTimeout(giveUp);
        if (fallback && !userMoved && !target) window.scrollTo(0, saved.y || 0);
        try { history.scrollRestoration = "auto"; } catch (_) {}
    };
    const attempt = () => {
        target = find();
        if (target) {
            center();
            try { target.focus({ preventScroll: true }); } catch (_) {}
            // Imagens e blocos tardios mudam a altura da página: recentra mais duas vezes.
            setTimeout(center, 450);
            setTimeout(center, 1300);
            finish(false);
            return true;
        }
        const more = document.getElementById("news-toggle");
        if (more && !more.hidden && opened < 60) {
            opened += 1;
            more.click();
            return attempt();
        }
        return false;
    };
    const observer = new MutationObserver(() => { attempt(); });
    const giveUp = setTimeout(() => finish(true), 8000);
    const start = () => {
        if (!attempt()) {
            window.scrollTo(0, saved.y || 0); // aproximação enquanto o conteúdo chega
            observer.observe(document.body, { childList: true, subtree: true });
        }
    };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
