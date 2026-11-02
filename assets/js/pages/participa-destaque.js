/* Página inicial · «Em foco: participação pública».
   Atualiza o bloco estático com o último instantâneo de data/zaer_critico.json
   (gerado por scripts/participa/atualizar.py). Sem dados, fica o texto do HTML. */
(function () {
    "use strict";
    const text = document.getElementById("participa-home-text");
    if (!text) return;
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
                if (f.consultas_projetos) {
                    text.innerHTML += tr(
                        ` Em ${f.ano}, ${f.ate_21_dias} de ${f.consultas_projetos} consultas de projetos tiveram 21 dias ou menos para participar.`,
                        ` In ${f.ano}, ${f.ate_21_dias} of ${f.consultas_projetos} project consultations allowed 21 days or fewer to take part.`,
                    );
                }
            } else if (f.consultas_projetos) {
                text.textContent = tr(
                    `Nenhuma consulta pública de renováveis está aberta neste momento, mas ${pending} aguardam decisão. Em ${f.ano}, ${f.ate_21_dias} de ${f.consultas_projetos} consultas de projetos tiveram 21 dias ou menos para participar e ${f.com_dias_em_agosto} decorreram em agosto.`,
                    `No renewables public consultation is open right now, but ${pending} await a decision. In ${f.ano}, ${f.ate_21_dias} of ${f.consultas_projetos} project consultations allowed 21 days or fewer to take part and ${f.com_dias_em_agosto} ran in August.`,
                );
            }
            const todas = [...(c.abertas || []), ...(c.em_analise || []), ...(c.encerradas || [])];
            document.querySelectorAll(".caso-live[data-consulta]").forEach((el) => {
                const x = todas.find((y) => y.id === el.dataset.consulta);
                if (!x) return;
                const n = x.participacoes != null ? String(x.participacoes).replace(/\B(?=(\d{3})+(?!\d))/g, isEn() ? "," : "\u00a0") : "";
                const aberta = x.estado_consulta === "Aberta";
                el.textContent = tr(
                    `${aberta ? `Consulta aberta até ${fmtDate(x.fim)}` : `Consulta terminada a ${fmtDate(x.fim)}`}${n ? ` · ${n} participações` : ""}.`,
                    `${aberta ? `Consultation open until ${fmtDate(x.fim)}` : `Consultation closed on ${fmtDate(x.fim)}`}${n ? ` · ${n} submissions` : ""}.`,
                );
            });
            const local = document.getElementById("participa-home-local");
            if (local && window.BioCultureParticipaLocal) {
                const T = window.BioCultureParticipaLocal.title;
                window.BioCultureParticipaLocal.match(d).then(({ region, concelho, distrito }) => {
                    if (!region) {
                        local.textContent = tr("Escolhe o teu território na barra lateral para ver as consultas do teu concelho.",
                            "Choose your area in the sidebar to see the consultations in your municipality.");
                        return;
                    }
                    const mun = T(region.concelho), dist = T(region.distrito);
                    const list = (xs) => xs.slice(0, 2).map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.titulo)}</a>`).join("; ");
                    if (concelho.length) {
                        local.innerHTML = tr(`<strong>No teu concelho (${esc(mun)}):</strong> ${concelho.length} ${concelho.length === 1 ? "consulta" : "consultas"}, ${list(concelho)}.`,
                            `<strong>In your municipality (${esc(mun)}):</strong> ${concelho.length}: ${list(concelho)}.`);
                    } else if (distrito.length) {
                        local.innerHTML = tr(`<strong>No teu concelho (${esc(mun)}):</strong> nenhuma. No distrito de ${esc(dist)}: ${distrito.length}, ${list(distrito)}.`,
                            `<strong>In your municipality (${esc(mun)}):</strong> none. In the district of ${esc(dist)}: ${distrito.length}, ${list(distrito)}.`);
                    } else {
                        local.innerHTML = tr(`<strong>No teu concelho (${esc(mun)}):</strong> nenhuma consulta de renováveis aberta ou em análise, nem no distrito de ${esc(dist)}.`,
                            `<strong>In your municipality (${esc(mun)}):</strong> no renewables consultation open or under review, nor in the district of ${esc(dist)}.`);
                    }
                });
            }
        })
        .catch(() => {});
})();
