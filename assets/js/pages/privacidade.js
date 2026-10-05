/* Página de privacidade: o conteúdo existe em PT e EN no HTML (data-no-translate);
   o CSS mostra a versão do idioma ativo. Aqui só se ajusta o título e se carrega o menu. */
(function () {
    "use strict";
    if (document.documentElement.lang === "en") document.title = "Privacy — bioCulture";
    fetch("/sidebar-content.html")
        .then((r) => r.text())
        .then((html) => { document.getElementById("sidebar").innerHTML = html; })
        .catch(() => {});
})();
