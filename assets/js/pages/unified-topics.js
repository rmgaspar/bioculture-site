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

  // These pages fetch their content and render it asynchronously, which can grow the page after
  // the initial jump and leave the anchor scrolled out of view. Re-run the jump whenever the DOM
  // settles, until the visitor scrolls by themselves or a few seconds pass.
  if (location.hash) {
    var userScrolled = false;
    var stopScrollWatch = function () { userScrolled = true; };
    window.addEventListener('wheel', stopScrollWatch, {passive: true, once: true});
    window.addEventListener('touchmove', stopScrollWatch, {passive: true, once: true});
    var debounce;
    var observer = new MutationObserver(function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { if (!userScrolled) revealHash(); }, 150);
    });
    observer.observe(document.body, {childList: true, subtree: true});
    setTimeout(function () {
      observer.disconnect();
      window.removeEventListener('wheel', stopScrollWatch);
      window.removeEventListener('touchmove', stopScrollWatch);
    }, 6000);
  }
}());
