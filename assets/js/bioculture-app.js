/* bioCulture UI v2 — comportamento comum a todas as páginas */
(() => {
  const initShell = async () => {
    if (!document.getElementById('sidebar')) return;
    try {
      const module = await import('/assets/js/biocultura-shell.js?v=7');
      await module.init();
    } catch (error) { console.warn('Menu bioCulture indisponível', error); }
  };
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const observer = new MutationObserver(() => {
      if (sidebar.querySelector('.bio-shell')) { observer.disconnect(); initShell(); }
    });
    observer.observe(sidebar, {childList:true});
    if (sidebar.querySelector('.bio-shell')) { observer.disconnect(); initShell(); }
  }
  const body = document.body;
  const mainInner = document.querySelector('#main > .inner');
  if (mainInner) {
    let footer = Array.from(mainInner.children).find(node => node.tagName === 'FOOTER');
    if (!footer) { footer = document.createElement('footer'); mainInner.appendChild(footer); }
    if (!footer.classList.contains('footer-wordmark')) {
      footer.className = 'footer footer-wordmark';
      footer.innerHTML = '<div class="bio-wordmark"><strong>bioCulture</strong><small>GLOBAL REGENERATION</small></div>';
    }
  }
  if (body.classList.contains('bio-detail')) {
    const inner = mainInner;
    if (inner && !inner.querySelector('.bio-back')) {
      const back = document.createElement('a');
      back.className = 'bio-back'; back.href = '/index.html'; back.textContent = '← Voltar';
      if (document.referrer && new URL(document.referrer).origin === location.origin) {
        back.href = document.referrer; back.addEventListener('click', e => { e.preventDefault(); history.back(); });
      }
      inner.prepend(back);
    }
  }
})();
