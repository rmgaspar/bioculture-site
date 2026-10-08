/* Cartões do Observatório da Terra nas páginas temáticas (água, ar, solo, biodiversidade, energia, clima).
   Cada <aside data-terra-cartoes="id1,id2" data-cap="capitulo"> recebe as conclusões indicadas, com o mesmo texto e
   mini-gráfico do sumário do relatório, e uma ligação ao capítulo. Os dados só são pedidos quando o bloco está quase à vista. */
(function () {
  "use strict";
  const G = window.BioCulturaGraficos, T = window.BioCulturaTerra;
  const boxes = [...document.querySelectorAll("[data-terra-cartoes]")];
  if (!G || !T || !boxes.length) return;
  const { tr, esc } = G;
  const CAP = {
    clima: [tr("Clima", "Climate"), "#b4472f"], energia: [tr("Energia", "Energy"), "#b87a0c"], ar: [tr("Ar", "Air"), "#4f7f9e"],
    agua: [tr("Água", "Water"), "#2a6fb0"], "terra-vida": [tr("Solo e vida", "Land and life"), "#7d5a36"]
  };
  const lang = new URLSearchParams(location.search).get("lang");
  let all = null;
  const compute = () => (all ? Promise.resolve(all) : T.load().then(({ R, CLIMA, VET }) => (all = T.create(R, CLIMA, VET).findings())));

  function render(box) {
    const ids = box.dataset.terraCartoes.split(",").map((s) => s.trim()), cap = box.dataset.cap, info = CAP[cap] || CAP.clima;
    compute().then((list) => {
      const sel = ids.map((id) => list.find((f) => f.id === id)).filter(Boolean);
      if (!sel.length) return;
      box.innerHTML = `<div class="agri-report terra-cartoes" style="--cap:${info[1]}">
        <div class="sec-head"><span class="eyebrow">${tr("Do Observatório da Terra", "From the Earth Observatory")} · ${esc(info[0])}</span></div>
        <ol class="findings tc">${sel.map((f) => `<li><span class="n"><i class="tc-dot"></i></span><div class="ftxt">${f.html}</div>${f.mini}</li>`).join("")}</ol>
        <a class="tc-link" href="/observatorio/observatorio-terra.html${lang ? "?lang=" + encodeURIComponent(lang) : ""}#${esc(cap)}">${tr(`Ver o capítulo «${info[0]}» no Observatório da Terra`, `See the “${info[0]}” chapter in the Earth Observatory`)} →</a>
      </div>`;
    }).catch(() => { box.hidden = true; });
  }

  const done = new WeakSet();
  const once = (box) => { if (done.has(box)) return; done.add(box); render(box); };
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); once(e.target.querySelector("[data-terra-cartoes]") || e.target); } }), { rootMargin: "500px 0px" });
    boxes.forEach((b) => io.observe(b.parentElement || b));
  }
  /* Rede de segurança: se o bloco não chegar a ser observado (ou não houver IntersectionObserver), constrói-se pouco depois de a página carregar. */
  const fallback = () => setTimeout(() => boxes.forEach(once), 4000);
  if (document.readyState === "complete") fallback(); else window.addEventListener("load", fallback);
})();
