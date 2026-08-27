(function () {
    "use strict";
    fetch("/sidebar-content.html?v=22")
        .then((response) => response.ok ? response.text() : "")
        .then((html) => { if (html) document.getElementById("sidebar").innerHTML = html; })
        .catch(() => {});
})();
