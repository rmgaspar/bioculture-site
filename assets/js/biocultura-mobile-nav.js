/* Menu em ecrãs até 1280 px (telemóvel, tablet e portáteis pequenos) e ligação «Saltar para o conteúdo».
   O tema original escondia o menu lateral nessas larguras e confiava no main.js do HTML5 UP para
   criar o botão; esse ficheiro deixou de ser carregado e o site ficava sem navegação.
   Aqui o menu passa a gaveta lateral, aberta por um botão flutuante (canto inferior direito, para
   não colidir com a barra «Nesta página» no topo). Fecha com Esc, clique fora ou ao seguir uma
   ligação. Fechado, o menu fica «inert» para não receber o foco do teclado.
   Carregado por biocultura-i18n-runtime.js em todas as páginas. */
(function () {
    "use strict";
    if (window.__bioMobileNav) return;
    window.__bioMobileNav = true;

    const MQ = window.matchMedia("(max-width: 1280px)");
    const EN = () => document.documentElement.lang === "en";

    const css = `
@media (max-width:1280px){
  body.bio-nav #sidebar{display:block!important;position:fixed!important;top:0!important;left:0!important;bottom:0!important;
    width:min(20rem,88vw)!important;height:100%!important;max-height:none!important;margin:0!important;z-index:10050!important;
    overflow-y:auto!important;overscroll-behavior:contain;background:#fbfcf9;box-shadow:0 0 3rem rgba(20,52,38,.22);
    transform:translateX(-105%);visibility:hidden;transition:transform .28s ease,visibility 0s linear .28s}
  body.bio-nav.bio-nav-open #sidebar{transform:none;visibility:visible;transition:transform .28s ease}
  body.bio-nav #sidebar .bio-shell{min-height:100%;padding-bottom:5.5rem}
  .bio-nav-toggle{position:fixed;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));z-index:10060;
    display:inline-flex;align-items:center;gap:.55rem;height:3rem;padding:0 1.15rem 0 1rem;border:0;border-radius:999px;
    background:#143426!important;color:#fff!important;font:600 .95rem/1 "Source Sans Pro",system-ui,sans-serif!important;
    letter-spacing:.02em!important;text-transform:none!important;box-shadow:0 .5rem 1.5rem rgba(20,52,38,.28)!important;
    cursor:pointer;-webkit-tap-highlight-color:transparent}
  .bio-nav-toggle:hover{background:#1d4733!important}
  .bio-nav-toggle:focus-visible{outline:3px solid #e0b84f;outline-offset:3px}
  .bio-nav-toggle .bars,.bio-nav-toggle .bars::before,.bio-nav-toggle .bars::after{display:block;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .2s ease,opacity .2s ease}
  .bio-nav-toggle .bars{position:relative}
  .bio-nav-toggle .bars::before,.bio-nav-toggle .bars::after{content:"";position:absolute;left:0}
  .bio-nav-toggle .bars::before{top:-6px}.bio-nav-toggle .bars::after{top:6px}
  .bio-nav-open .bio-nav-toggle .bars{background:transparent}
  .bio-nav-open .bio-nav-toggle .bars::before{transform:translateY(6px) rotate(45deg)}
  .bio-nav-open .bio-nav-toggle .bars::after{transform:translateY(-6px) rotate(-45deg)}
  .bio-nav-backdrop{position:fixed;inset:0;z-index:10040;background:rgba(15,30,22,.42);opacity:0;visibility:hidden;transition:opacity .28s ease,visibility 0s linear .28s}
  .bio-nav-open .bio-nav-backdrop{opacity:1;visibility:visible;transition:opacity .28s ease}
  html.bio-nav-lock,html.bio-nav-lock body{overflow:hidden!important}
}
@media (min-width:1281px){.bio-nav-toggle,.bio-nav-backdrop{display:none!important}}
@media (prefers-reduced-motion:reduce){body.bio-nav #sidebar,.bio-nav-backdrop,.bio-nav-toggle .bars,.bio-nav-toggle .bars::before,.bio-nav-toggle .bars::after{transition:none!important}}
@media print{.bio-nav-toggle,.bio-nav-backdrop{display:none!important}}
.bio-skip{position:fixed;left:1rem;top:1rem;z-index:10070;padding:.7rem 1.1rem;border-radius:999px;background:#143426;color:#fff!important;
  font:600 .95rem/1 "Source Sans Pro",system-ui,sans-serif;text-decoration:none!important;border:0!important;transform:translateY(-200%);transition:transform .15s ease}
.bio-skip:focus{transform:none;outline:3px solid #e0b84f;outline-offset:2px}`;

    function start() {
        const sidebar = document.getElementById("sidebar");
        if (!sidebar) return;

        const style = document.createElement("style");
        style.dataset.bioMobileNav = "true";
        style.textContent = css;
        document.head.appendChild(style);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "bio-nav-toggle";
        toggle.setAttribute("aria-controls", "sidebar");
        toggle.setAttribute("data-no-translate", "");
        toggle.innerHTML = '<span class="bars" aria-hidden="true"></span><span class="label"></span>';
        const backdrop = document.createElement("div");
        backdrop.className = "bio-nav-backdrop";
        backdrop.setAttribute("aria-hidden", "true");
        document.body.append(backdrop, toggle);

        const body = document.body;
        let open = false;

        // Teclado: primeira paragem do Tab salta o menu e vai direta ao conteúdo.
        const main = document.getElementById("main");
        if (main && !document.querySelector(".bio-skip")) {
            if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
            const skip = document.createElement("a");
            skip.className = "bio-skip";
            skip.href = "#main";
            skip.setAttribute("data-no-translate", "");
            skip.textContent = EN() ? "Skip to content" : "Saltar para o conteúdo";
            skip.addEventListener("click", (event) => { event.preventDefault(); main.focus({ preventScroll: false }); main.scrollIntoView(); });
            body.prepend(skip);
        }

        function label() {
            toggle.querySelector(".label").textContent = open ? (EN() ? "Close" : "Fechar") : "Menu";
            toggle.setAttribute("aria-label", open ? (EN() ? "Close menu" : "Fechar menu") : (EN() ? "Open menu" : "Abrir menu"));
            toggle.setAttribute("aria-expanded", String(open));
        }
        function sync() {
            const small = MQ.matches;
            body.classList.toggle("bio-nav", small);
            if (!small && open) setOpen(false, false);
            if (small && !open) { sidebar.setAttribute("inert", ""); sidebar.setAttribute("aria-hidden", "true"); }
            else { sidebar.removeAttribute("inert"); sidebar.removeAttribute("aria-hidden"); }
            label();
        }
        function setOpen(value, moveFocus = true) {
            open = value;
            body.classList.toggle("bio-nav-open", open);
            document.documentElement.classList.toggle("bio-nav-lock", open);
            if (open) {
                sidebar.removeAttribute("inert");
                sidebar.removeAttribute("aria-hidden");
                if (moveFocus) {
                    const first = sidebar.querySelector("a[href], button, select, input");
                    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
                }
            } else {
                if (MQ.matches) { sidebar.setAttribute("inert", ""); sidebar.setAttribute("aria-hidden", "true"); }
                if (moveFocus) toggle.focus({ preventScroll: true });
            }
            label();
        }

        toggle.addEventListener("click", () => setOpen(!open));
        backdrop.addEventListener("click", () => setOpen(false));
        document.addEventListener("keydown", (event) => {
            if (open && event.key === "Escape") setOpen(false);
        });
        sidebar.addEventListener("click", (event) => {
            const link = event.target.closest && event.target.closest("a[href]");
            if (open && link && !link.getAttribute("href").startsWith("#")) setOpen(false, false);
        });
        // Ao voltar atrás (cache de navegação do Safari), a gaveta não deve reaparecer aberta.
        window.addEventListener("pageshow", () => { if (open) setOpen(false, false); });
        if (MQ.addEventListener) MQ.addEventListener("change", sync); else MQ.addListener(sync);
        // O idioma pode ser definido depois do arranque: mantém o texto do botão coerente.
        new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

        sync();
        // O tema só mostra o menu depois de retirar «is-preload» (antes fazia-o o main.js).
        body.classList.remove("is-preload");
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
})();
