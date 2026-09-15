(function () {
  'use strict';
  var detail = document.querySelector('[data-global-script]');
  if (!detail) return;
  var loading = false;
  function script(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement('script'); el.src = src;
      el.onload = resolve; el.onerror = function () { el.remove(); reject(new Error('Não foi possível carregar os gráficos.')); };
      document.body.appendChild(el);
    });
  }
  function load() {
    if (!detail.open || loading) return;
    loading = true;
    (window.Chart ? Promise.resolve() : script('https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js'))
      .then(function () { return script(detail.dataset.globalScript); })
      .catch(function () {
        loading = false;
        var note = document.createElement('p'); note.setAttribute('role', 'status');
        note.textContent = 'Não foi possível carregar os dados. Feche e volte a abrir esta secção para tentar novamente.';
        detail.appendChild(note);
      });
  }
  detail.addEventListener('toggle', load);
  function revealHash() {
    var id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    var target = document.getElementById(id);
    if (!target) return;
    for (var parent = target; parent; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    requestAnimationFrame(function () { target.scrollIntoView({block: 'start'}); });
  }
  window.addEventListener('hashchange', revealHash);
  revealHash();
}());
