(function () {
  'use strict';
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
