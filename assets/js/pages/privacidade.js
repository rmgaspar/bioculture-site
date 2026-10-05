/* Páginas de texto simples (privacidade, 404): o conteúdo existe em PT e EN no HTML (data-no-translate);
   o CSS mostra a versão do idioma ativo. Aqui só se ajusta o título e se carrega o menu. */
(function () {
    "use strict";
    if (document.documentElement.lang === "en") document.title = document.documentElement.dataset.titleEn || "Privacy — bioCulture";
    fetch("/sidebar-content.html")
        .then((r) => r.text())
        .then((html) => { document.getElementById("sidebar").innerHTML = html; })
        .catch(() => {});
})();
