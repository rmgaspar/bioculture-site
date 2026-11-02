/* Resumo de «guardar semente» por cultura, a partir de /data/sementes.json (quadro «guardar»).
   Usado no Planeador de horta e nas fichas das culturas; a página Sementes tem o quadro completo. */
(function () {
  "use strict";
  /* Grupo do quadro a que pertence uma cultura do Planeador (null se o quadro não a cobre). */
  const porCultura = (D, id) => ((D && D.guardar) || []).find((g) => (g.culturas || []).includes(id)) || null;
  const faixa = (a, en, un) => (a[0] === a[1] ? `${a[0]}` : `${a[0]} ${en ? "to" : "a"} ${a[1]}`) + (un ? ` ${un}` : "");
  /* Frases curtas: como poliniza, a que distância isolar e quantos anos dura a semente. */
  function resumo(g, en) {
    const agente = g.agente === "vento" ? (en ? "wind" : "vento") : g.agente === "insetos" ? (en ? "insects" : "insetos") : "";
    const pol = g.polin === "self" ? (en ? "Self-pollinated" : "Autofecundada")
      : g.polin === "both" ? (en ? `Self- and cross-pollinated (${agente})` : `Autofecundada e cruzada (${agente})`)
      : (en ? `Cross-pollinated (${agente})` : `Cruza com outras variedades (${agente})`);
    const facil = g.facil === "facil" ? (en ? "easy to save" : "fácil de guardar") : g.facil === "facil-cruza" ? (en ? "easy, but it crosses" : "fácil, mas cruza") : "";
    const partes = [facil ? `${pol}, ${facil}` : pol,
      (en ? "isolate " : "isolar ") + "≈ " + faixa(g.iso_m, en, "m"),
      (en ? "seed lasts " : "a semente dura ") + faixa(g.anos, en, g.anos[1] === 1 ? (en ? "year" : "ano") : (en ? "years" : "anos"))];
    if (g.ciclo === "B") partes.push(en ? "biennial: seed in the 2nd year" : "bienal: dá semente no 2.º ano");
    return partes;
  }
  window.BioCulturaSementesResumo = { porCultura, resumo };
})();
