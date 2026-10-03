/* Página inicial · «Em foco: participação pública».
   Atualiza o bloco estático com o último instantâneo de data/zaer_critico.json
   (gerado por scripts/participa/atualizar.py). Sem dados, fica o texto do HTML. */
(function () {
    "use strict";
    const text = document.getElementById("participa-home-text");
    const facts = document.getElementById("participa-home-facts");
    if (!text || !facts) return;
    const isEn = () => !!window.BioCultureI18n?.isEnglish || (document.documentElement.lang || "").startsWith("en");
    const tr = (pt, en) => (isEn() ? en : pt);
    const esc = (v) => String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
    const fmtDate = (v) => new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "long" });
    fetch("/data/zaer_critico.json")
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d) => {
            const c = d.consultas_participa || {};
            const open = (c.abertas || []).slice().sort((a, b) => (a.fim || "").localeCompare(b.fim || ""));
            const pending = (c.em_analise || []).filter((x) => !x.alerta_qualidade).length;
            const f = c.factos_participacao || {};
            const where = (x) => (x.municipios || []).slice(0, 3).join(", ") || x.ambito || "";
            if (open.length) {
                const next = open[0];
                text.innerHTML = tr(
                    `Há ${open.length} ${open.length === 1 ? "consulta pública de renováveis aberta" : "consultas públicas de renováveis abertas"} no Participa.pt. A próxima a fechar termina a ${fmtDate(next.fim)}: <strong>${esc(next.titulo)}</strong>${where(next) ? ` (${esc(where(next))})` : ""}.`,
                    `There ${open.length === 1 ? "is 1 renewables public consultation" : `are ${open.length} renewables public consultations`} open on Participa.pt. The next one closes on ${fmtDate(next.fim)}: <strong>${esc(next.titulo)}</strong>${where(next) ? ` (${esc(where(next))})` : ""}.`,
                );
            } else if (f.consultas_projetos) {
                text.textContent = tr(
                    `Nenhuma consulta pública de renováveis está aberta neste momento, mas ${pending} aguardam decisão. Em ${f.ano}, ${f.ate_21_dias} de ${f.consultas_projetos} consultas de projetos tiveram 21 dias ou menos para participar e ${f.com_dias_em_agosto} decorreram em agosto.`,
                    `No renewables public consultation is open right now, but ${pending} await a decision. In ${f.ano}, ${f.ate_21_dias} of ${f.consultas_projetos} project consultations allowed 21 days or fewer to take part and ${f.com_dias_em_agosto} ran in August.`,
                );
            }
            const rows = [
                [String(open.length), tr("consultas de renováveis abertas agora no Participa.pt", "renewables consultations open now on Participa.pt")],
                [String(pending), tr("a aguardar decisão", "awaiting decision")],
            ];
            if (f.consultas_projetos) {
                rows.push([`${f.ate_21_dias} ${tr("de", "of")} ${f.consultas_projetos}`, tr(`consultas de ${f.ano} com 21 dias ou menos para participar`, `${f.ano} consultations with 21 days or fewer to take part`)]);
            }
            facts.innerHTML = rows.map(([v, l]) => `<div><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join("");
        })
        .catch(() => {});
})();
