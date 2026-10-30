
            const el = (id) => document.getElementById(id),
                esc = (v) =>
                    String(v ?? "—").replace(
                        /[&<>'"]/g,
                        (c) => ({
                            "&": "&amp;",
                            "<": "&lt;",
                            ">": "&gt;",
                            "'": "&#39;",
                            '"': "&quot;",
                        }[c]),
                    ),
                date = (v) => {
                    if (!v || v === "-") return "—";
                    const d = new Date(v + "T12:00:00");
                    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString(isEn() ? "en-GB" : "pt-PT");
                },
                isEn = () => !!window.BioCultureI18n?.isEnglish;
            function renderStats(d) {
                const p = d.pszaer || {},
                    a = p.areas_mapeadas || {},
                    S = a.solar || {},
                    W = a.eolica_terrestre || {},
                    solar = S.proposta_menos_10km_subestacao || {},
                    wind = W.proposta_poligonos_maiores_20ha || {},
                    c = p.consulta_publica || {},
                    rf = c.relatorio_final || {},
                    tr = (pt, en) => (isEn() ? en : pt),
                    nf = (v) => Number(v || 0).toLocaleString(isEn() ? "en-GB" : "pt-PT"),
                    SOL = "#eda100", WIN = "#2a78d6", PAR = "#eb6834";
                const chip = (t) => `<i>${esc(t)}</i>`,
                    dshort = (v) => new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }),
                    hero = [
                    [SOL, tr("Solar proposto", "Proposed solar"), `${nf(solar.area_ha)} ha`,
                        tr(`${nf(solar.poligonos)} polígonos de 100 ha ou mais, a menos de 10 km de uma subestação`, `${nf(solar.poligonos)} polygons of 100 ha or more, within 10 km of a substation`),
                        [S.recurso_minimo && tr(`Recurso: ${S.recurso_minimo}`, `Resource: ${S.recurso_minimo}`), S.area_minima_poligono_ha && tr(`Polígono mínimo: ${S.area_minima_poligono_ha} ha`, `Minimum polygon: ${S.area_minima_poligono_ha} ha`)]],
                    [WIN, tr("Eólica proposta", "Proposed wind"), `${nf(wind.area_ha)} ha`,
                        tr(`${nf(wind.poligonos)} polígonos de 20 ha ou mais`, `${nf(wind.poligonos)} polygons of 20 ha or more`),
                        [W.recurso_minimo && tr(`Recurso: ${W.recurso_minimo}`, `Resource: ${W.recurso_minimo}`), W.area_minima_poligono_ha && tr(`Polígono mínimo: ${W.area_minima_poligono_ha} ha`, `Minimum polygon: ${W.area_minima_poligono_ha} ha`)]],
                    [PAR, tr("Participações", "Submissions"), nf(rf.participacoes || c.participacoes),
                        rf.tipologia_pct ? tr(`${rf.tipologia_pct.discordancia} % classificadas como discordância (${nf(c.participacoes)} no portal)`, `${rf.tipologia_pct.discordancia}% classified as disagreement (${nf(c.participacoes)} on the portal)`) : tr("registadas no portal", "registered on the portal"),
                        [c.inicio && c.fim && `${dshort(c.inicio)} – ${dshort(c.fim)}`, rf.modelo_pct && tr(`${String(rf.modelo_pct).replace(".", ",")} % modelo`, `${rf.modelo_pct}% template`)]],
                ];
                el("stats").innerHTML = hero.map((x) => `<article class="stat zhero" style="--tom:${x[0]}"><small>${x[1]}</small><strong>${x[2]}</strong><span>${x[3]}</span><div class="zchips">${x[4].filter(Boolean).map(chip).join("")}</div></article>`).join("");
                // Percurso da consulta
                const dm = (v) => new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }),
                    span = c.inicio && c.fim ? Math.round((new Date(c.fim + "T12:00:00") - new Date(c.inicio + "T12:00:00")) / 864e5) + 1 : null,
                    steps = [
                        [tr("Proposta", "Proposal"), tr("maio de 2026", "May 2026"), "done"],
                        [tr("Consulta pública", "Public consultation"), c.inicio ? `${dm(c.inicio)} – ${dm(c.fim)}${span ? ` · ${span} ${tr("dias", "days")}` : ""}` : "", "done"],
                        [tr("Em análise", "Under review"), c.fim ? tr(`desde ${dm(c.fim)}`, `since ${dm(c.fim)}`) : "", "now"],
                        [tr("Versão final", "Final version"), tr("por concluir", "yet to come"), "next"],
                    ];
                el("zaer-flow").innerHTML = `<ol>${steps.map((x) => `<li class="${x[2]}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></li>`).join("")}</ol>${
                    rf.url ? `<a href="${esc(rf.url)}" target="_blank" rel="noopener">${tr("Relatório final da consulta", "Final consultation report")} →</a>` : ""}`;
                // Gráficos
                const bar = (label, v, max, color, note) => `<div class="zb"><span class="zb-l">${esc(label)}</span><span class="zb-t"><i style="width:${Math.max(v / max * 100, 1)}%;background:${color}"></i></span><span class="zb-v">${nf(v)}<em>${note ? esc(note) : ""}</em></span></div>`,
                    maxA = Math.max(S.sem_condicionantes_exclusao?.area_ha || 0, W.sem_limite_minimo?.area_ha || 0, 1),
                    funnel = `<article class="zc"><small>${tr("Do possível à proposta", "From possible to proposed")}</small><h3>${tr("A área vai encolhendo à medida que se aplicam critérios", "The area shrinks as criteria are applied")}</h3><h4 style="--tom:${SOL}">${tr("Solar fotovoltaica", "Solar photovoltaic")}</h4>${
                        bar(tr("Sem condicionantes de exclusão", "No exclusion constraints"), S.sem_condicionantes_exclusao?.area_ha, maxA, "#f3d88a")
                    }${bar(tr("A menos de 20 km de subestação", "Within 20 km of a substation"), S.menos_20km_subestacao?.area_ha, maxA, "#eda100", `${S.menos_20km_subestacao?.percentagem_area_base} %`)
                    }${bar(tr("Proposta: a menos de 10 km", "Proposal: within 10 km"), solar.area_ha, maxA, "#b87f00", `${solar.percentagem_area_base} %`)
                    }<h4 style="--tom:${WIN}">${tr("Eólica terrestre", "Onshore wind")}</h4>${
                        bar(tr("Sem limite mínimo de área", "No minimum area"), W.sem_limite_minimo?.area_ha, maxA, "#a9c8ee")
                    }${bar(tr("Proposta (20 ha ou mais)", "Proposal (20 ha or more)"), wind.area_ha, maxA, WIN)
                    }${bar(tr("A menos de 10 km de subestação", "Within 10 km of a substation"), W.menos_10km_subestacao?.area_ha, maxA, "#1c4f94", `${W.menos_10km_subestacao?.percentagem_area_base} %`)
                    }<p>${tr(S.capacidade_rede || "", "These totals do not take available grid connection capacity into account. Taking it into account, the estimated area falls sharply.")} ${
                        tr(`Na eólica proposta, ${(W.criterio_rede || "").charAt(0).toLowerCase() + (W.criterio_rede || "").slice(1)}`, "For the proposed wind areas, distance to a substation was not applied.")
                    }</p><span class="zc-unit">${tr("Hectares (ha). A percentagem compara com a área-base de cada tecnologia.", "Hectares (ha). The percentage compares with each technology's base area.")}</span></article>`;
                const classShare = (list, total) => (list || []).map((r) => ({ ...r, pct: total ? r.area_ha / total * 100 : 0 })),
                    sc = classShare(S.distribuicao_dimensao_menos_10km, solar.area_ha),
                    wc = classShare(W.distribuicao_dimensao, wind.area_ha),
                    tones = ["#7a4d00", "#c98a00", "#f0c04a", "#f6dc93", "#fbefc9"],
                    tonesW = ["#16406f", "#2a78d6", "#6ea4e3", "#a9c8ee", "#d8e6f6"],
                    stack = (rows, ts) => `<div class="zs">${rows.map((r, i) => `<span style="width:${r.pct}%;background:${ts[i]}" title="${esc(r.classe)}: ${nf(Math.round(r.pct))} % · ${nf(r.poligonos)} ${tr("polígonos", "polygons")}"><b>${r.pct >= 9 ? Math.round(r.pct) + " %" : ""}</b></span>`).join("")}</div><ul class="zs-leg">${
                        rows.map((r, i) => `<li><i style="background:${ts[i]}"></i>${esc(r.classe)} <em>${nf(r.poligonos)} ${tr("polígonos", "polygons")}</em></li>`).join("")}</ul>`,
                    big = (rows, total) => rows[0] ? tr(`${nf(rows[0].poligonos)} polígonos de ${rows[0].classe} concentram ${Math.round(rows[0].pct)} % da área.`, `${nf(rows[0].poligonos)} polygons of ${rows[0].classe} hold ${Math.round(rows[0].pct)}% of the area.`) : "",
                    concentration = `<article class="zc"><small>${tr("Escala", "Scale")}</small><h3>${tr("Poucos polígonos grandes pesam muito", "A few large polygons weigh heavily")}</h3><h4 style="--tom:${SOL}">${tr("Solar proposto, por dimensão do polígono", "Proposed solar, by polygon size")}</h4>${stack(sc, tones)}<p class="zc-big">${big(sc)}</p><h4 style="--tom:${WIN}">${tr("Eólica proposta, por dimensão do polígono", "Proposed wind, by polygon size")}</h4>${stack(wc, tonesW)}<p class="zc-big">${big(wc)}</p><span class="zc-unit">${tr("Percentagem da área proposta em cada classe de dimensão.", "Share of the proposed area in each size class.")}</span></article>`;
                el("zaer-charts").innerHTML = funnel + concentration;
                el("zaer-warning").innerHTML = `<strong>${tr("Como ler estes números", "How to read these numbers")}</strong><ul>${(a.leitura || []).map((t) => `<li>${esc(isEn() ? READ_EN[t] || t : t)}</li>`).join("")}</ul>`;
                el("snapshot-copy").textContent += isEn()
                    ? ` Snapshot observed on ${date(c.observado_em)}.`
                    : ` Instantâneo observado em ${date(c.observado_em)}.`;
                const art = p.potencial_solar_artificializado || {};
                el("art-gw").textContent = `${art.total_capacidade_gw ?? "—"} GW`;
                el("art-twh").textContent = `${art.total_geracao_twh_ano ?? "—"} TWh/ano`;
            }
            const READ_EN = {
                "As áreas solar e eólica podem sobrepor-se e não devem ser somadas como ocupação total.": "Solar and wind areas can overlap and must not be added up as total occupation.",
                "As manchas indicam potencial após critérios nacionais; o desenho final depende do projeto e do licenciamento.": "The patches show potential after national criteria; the final layout depends on the project and licensing.",
                "A ligação à rede pode exigir linhas e subestações fora da mancha, com impactos próprios.": "Grid connection may need lines and substations outside the patch, with impacts of their own.",
                "Os dados espaciais considerados na proposta estavam atualizados até março de 2026.": "The spatial data used in the proposal were current to March 2026.",
            };
            const TEMA_EN = { "Mineração": "Mining", "Biometano": "Biomethane", "Desflorestação": "Deforestation" };
            const STATE_EN = { "Aberta": "Open", "Em análise": "Under review", "Encerrada": "Closed" };
            const ALERT_EN = {
                "Estado sem atualização visível desde 2019; confirmar decisão na autoridade competente antes de inferir situação do projeto.":
                    "Status not visibly updated since 2019; confirm the decision with the competent authority before drawing conclusions about the project.",
                "Título abreviado e estado sem atualização visível desde 2019; não assumir que corresponde ao ativo atualmente em exploração.":
                    "Abbreviated title and status not visibly updated since 2019; do not assume it is the asset currently in operation.",
            };
            const SCOPE_EN = { "Nacional": "National", "Nacional — Portugal continental": "National — mainland Portugal", "Transfronteiriço": "Cross-border", "Transfronteiriço — Zamora (Espanha)": "Cross-border — Zamora (Spain)" };
            const stateTxt = (v) => (isEn() ? STATE_EN[v] || v : v);
            /* Mini-gráficos coloridos (mesma paleta e regras do relatório de Produção agrícola). */
            const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
            const num = (v) => Number(v || 0).toLocaleString(isEn() ? "en-GB" : "pt-PT");
            const miniStack = (parts) => {
                const total = parts.reduce((a, p) => a + p.v, 0) || 1;
                return `<div class="mini"><div class="mstack">${parts.filter((p) => p.v > 0).map((p, i) =>
                    `<span style="width:${p.v / total * 100}%;background:${p.c || PALETTE[i]}" title="${esc(p.l)}: ${num(p.v)}"></span>`).join("")}</div><div class="mlegend">${
                    parts.map((p, i) => `<span><i style="background:${p.c || PALETTE[i]}"></i>${esc(p.l)} ${num(p.v)}</span>`).join("")}</div></div>`;
            };
            const miniBars = (rows) => {
                const max = Math.max(...rows.map((r) => r.v)) || 1;
                return `<div class="mini">${rows.map((r, i) => `<div class="mr"><span class="ml">${esc(r.l)}</span><span class="mt"><span class="mb" style="width:${Math.max(r.v / max * 100, 0.8)}%;background:${r.c || PALETTE[i]}"></span></span><span class="mv">${num(r.v)}</span></div>`).join("")}</div>`;
            };
            /* Texto fixo com versão inglesa em data-en (bloco «Como participar»). */
            function applyEnglishBlocks() {
                if (!isEn()) return;
                document.querySelectorAll("#consultas [data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
            }
            let GEO = null;
            const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const TYPE_EN = { "Avaliação de Impacte Ambiental": "Environmental Impact Assessment", "Licenciamento Único de Ambiente": "Single Environmental Licence", "Programas": "Programmes", "Estratégias": "Strategies", "Avaliação de Incidências Ambientais": "Environmental Incidence Assessment" };
            /* Mini-mapa de Portugal continental (contorno em data/participa-geo.json); pontos em unidades do desenho. */
            const mapSvg = (dots, o = {}) => {
                if (!GEO) return "";
                const pad = o.pad ?? 4, W = GEO.largura, H = GEO.altura,
                    path = "M" + GEO.contorno.map((q) => q.join(",")).join("L") + "Z";
                return `<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" ${o.w ? `width="${o.w}"` : ""} xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true"><path d="${path}" fill="${o.fill ? o.fill : "#eef1e8"}" fill-opacity="${o.fill ? 0.22 : 1}" stroke="${o.fill || "#c9d1bd"}" stroke-width="0.9" stroke-linejoin="round"/>${
                    dots.map((d) => `<g${d.k ? ` class="ct-dot" data-k="${esc(d.k)}" data-n="${esc(d.n)}"` : ""}>${o.halo ? `<circle cx="${d.q[0]}" cy="${d.q[1]}" r="${d.r * 2.1}" fill="${d.c}" fill-opacity=".18"/>` : ""}<circle cx="${d.q[0]}" cy="${d.q[1]}" r="${d.r}" fill="${d.c}" stroke="#fff" stroke-width=".7">${d.t ? `<title>${esc(d.t)}</title>` : ""}</circle></g>`).join("")
                }</svg>`;
            };
            function renderConsults(d) {
                applyEnglishBlocks();
                const c = d.consultas_participa || {},
                    meta = c.metadados || {},
                    tr = (pt, en) => (isEn() ? en : pt),
                    today = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00"),
                    days = (v) => Math.round((new Date(v + "T12:00:00") - today) / 864e5),
                    byEnd = (dir) => (a, b) => dir * String(a.fim || "").localeCompare(String(b.fim || "")),
                    current = [...(c.abertas || []).slice().sort(byEnd(1)), ...(c.em_analise || []).slice().sort(byEnd(-1)), ...(c.encerradas || [])],
                    recent = current.filter((x) => !x.alerta_qualidade);
                // Sinais de atenção: factos observáveis, sem pontuação nem juízo sobre o projeto.
                const byMunicipality = {};
                recent.forEach((x) => (x.municipios || []).forEach((m) => {
                    byMunicipality[m] = (byMunicipality[m] || 0) + 1;
                }));
                const signals = (x) => {
                    const out = [];
                    if (/aberta/i.test(x.estado_consulta) && x.fim) {
                        const n = days(x.fim);
                        out.push(["urgent", n <= 0 ? tr("Último dia", "Last day") : tr(`Fecha em ${n} dias`, `Closes in ${n} days`)]);
                    }
                    if (x.subtipologia === "Proposta de definição de âmbito" || /\bPDA\b/.test(x.titulo || "")) {
                        out.push(["phase", tr("PDA: haverá nova consulta do EIA", "Scoping: an EIA consultation will follow")]);
                    }
                    if (!x.alerta_qualidade) {
                        const shared = Math.max(0, ...(x.municipios || []).map((m) => byMunicipality[m] - 1));
                        if (shared > 0) out.push(["cumulative", tr(`+${shared} no mesmo concelho`, `+${shared} in the same municipality`)]);
                        if (typeof x.participacoes === "number" && x.participacoes < 50 && !(x.inicio && (Date.now() - new Date(x.inicio)) / 864e5 < 7)) { // só depois de uma semana de prazo
                            out.push(["low", tr("Pouca participação", "Low participation")]);
                        }
                    }
                    return out;
                };
                const open = (c.abertas || []).length,
                    pool = [...(c.abertas || []), ...(c.em_analise || [])].filter((x) => !x.alerta_qualidade),
                    pending = (c.em_analise || []).filter((x) => !x.alerta_qualidade).length,
                    withParts = pool.filter((x) => typeof x.participacoes === "number"),
                    partSum = withParts.reduce((acc, x) => acc + x.participacoes, 0),
                    top = [...withParts.filter((x) => /aberta/i.test(x.estado_consulta)), ...withParts.filter((x) => !/aberta/i.test(x.estado_consulta)).sort((x, y) => y.participacoes - x.participacoes)].slice(0, 8).sort((x, y) => y.participacoes - x.participacoes),
                    shortTitle = (t) => String(t || "").replace(/^(Central Solar Fotovoltaica|Projeto Solar Fotovoltaico|Projeto|Parque Solar|Parque Eólico)\s+(de|do|da|dos|das)?\s*/i, "").replace(/\s+e\s+LMAT associadas.*$/i, "").slice(0, 60),
                    total = meta.resumo_pesquisa?.consultas_renovaveis,
                    closed = meta.resumo_pesquisa?.encerradas;
                const nowNf = (v) => Number(v || 0).toLocaleString(isEn() ? "en-GB" : "pt-PT"),
                    nowDm = (v) => new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }),
                    cut = (t, n) => (String(t).length > n ? String(t).slice(0, String(t).lastIndexOf(" ", n)) + "…" : String(t)),
                    openList = (c.abertas || []).filter((x) => x.fim).slice().sort(byEnd(1)),
                    next = openList[0],
                    fNow = c.factos_participacao || {},
                    topTwo = [...top].sort((x, y) => y.participacoes - x.participacoes).slice(0, 2),
                    topShare = partSum ? Math.round(topTwo.reduce((acc, x) => acc + x.participacoes, 0) / partSum * 100) : 0,
                    lead = open && next
                        ? tr(`${open === 1 ? "Há 1 consulta aberta" : `Há ${open} consultas abertas`}. A próxima a fechar é «${shortTitle(next.titulo)}», a ${nowDm(next.fim)} (daqui a ${Math.max(days(next.fim), 0)} dias).`,
                            `${open === 1 ? "1 consultation is open" : `${open} consultations are open`}. The next to close is “${shortTitle(next.titulo)}”, on ${nowDm(next.fim)} (in ${Math.max(days(next.fim), 0)} days).`)
                        : tr("Não há nenhuma consulta de renováveis aberta neste momento.", "No renewables consultation is open right now."),
                    cards = [
                        ["#1baf7a", nowNf(open), tr(open === 1 ? "consulta aberta agora" : "consultas abertas agora", open === 1 ? "consultation open now" : "consultations open now"),
                            next ? tr(`A próxima fecha em ${Math.max(days(next.fim), 0)} dias`, `The next closes in ${Math.max(days(next.fim), 0)} days`) : tr("A seguir pelo «Seguir» do Participa", "Follow them with Participa's “Follow”")],
                        ["#eda100", nowNf(pending), tr("em análise", "under review"), tr("Prazo terminado, a aguardar decisão (2026)", "Closed, awaiting decision (2026)")],
                        ["#eb6834", nowNf(partSum), tr("participações nestas consultas", "submissions in these consultations"),
                            fNow.participacoes_mediana ? tr(`Mediana de ${nowNf(fNow.participacoes_mediana)} por projeto em ${fNow.ano}`, `Median of ${nowNf(fNow.participacoes_mediana)} per project in ${fNow.ano}`) : ""],
                    ],
                    barMax = Math.max(...top.map((x) => x.participacoes), 1),
                    chartRows = top.map((x) => `<div class="zb"><span class="zb-l" title="${esc(x.titulo)}">${esc(cut(shortTitle(x.titulo), 60))}</span><span class="zb-t"><i style="width:${Math.max(x.participacoes / barMax * 100, 1)}%;background:${/aberta/i.test(x.estado_consulta) ? "#1baf7a" : "#eda100"}"></i></span><span class="zb-v">${nowNf(x.participacoes)}</span></div>`).join(""),
                    openRows = openList.map((x) => {
                        const start = new Date(x.inicio + "T12:00:00"), end = new Date(x.fim + "T12:00:00"),
                            done = Math.min(Math.max((today - start) / Math.max(end - start, 1), 0), 1) * 100, left = Math.max(days(x.fim), 0);
                        return `<li><a href="${esc(x.url || "#")}" target="_blank" rel="noopener">${esc(cut(shortTitle(x.titulo), 52))}</a><div class="nowbar"><i style="width:${done}%"></i></div><span><b>${tr(`${left} dias`, `${left} days`)}</b> ${tr("para fechar", "to close")} · ${nowDm(x.fim)}${typeof x.participacoes === "number" ? ` · ${nowNf(x.participacoes)} ${tr("participações", "submissions")}` : ""}</span></li>`;
                    }).join("");
                el("participa-now").innerHTML = `<div class="now-head"><small>${tr("Estado das consultas", "State of the consultations")}</small><h3>${esc(lead)}</h3></div><div class="now-figures nf3">${
                    cards.map((x) => `<span class="nowcard" style="--tom:${x[0]}"><strong>${x[1]}</strong><b>${x[2]}</b><em>${x[3]}</em></span>`).join("")
                }</div><div class="now-grid"><div class="part-chart"><h4>${tr("Participações por consulta", "Submissions per consultation")}</h4>${chartRows}<div class="mlegend"><span><i style="background:#1baf7a"></i>${tr("Abertas", "Open")}</span><span><i style="background:#eda100"></i>${tr("Em análise", "Under review")}</span></div>${
                    topTwo.length === 2 && topShare ? `<p class="now-insight">${tr(`Só duas consultas, «${shortTitle(topTwo[0].titulo)}» e «${shortTitle(topTwo[1].titulo)}», reúnem ${topShare} % de todas as participações.`, `Just two consultations, “${shortTitle(topTwo[0].titulo)}” and “${shortTitle(topTwo[1].titulo)}”, account for ${topShare}% of all submissions.`)}</p>` : ""
                }</div><div class="now-open"><h4>${tr("Prazos a decorrer", "Deadlines running")}</h4>${
                    openRows ? `<ul>${openRows}</ul><p class="now-hint">${tr("A barra mostra quanto do prazo já passou.", "The bar shows how much of the period has passed.")}</p>` : `<p>${tr("Nenhuma consulta aberta. Usa «Seguir» na ficha do projeto no Participa.pt para seres avisado quando abrir outra.", "None open. Use “Follow” on the project's Participa page to be told when another opens.")}</p>`
                }</div></div>${
                    total ? `<p class="now-note">${tr(`O portal tem ${nowNf(total)} consultas de renováveis${closed ? `, das quais ${nowNf(closed)} encerradas, quase todas de anos anteriores`: ""}; aqui seguem-se as abertas e as de 2026. Seguimos também mineração, biometano e desflorestação.`, `The portal lists ${nowNf(total)} renewables consultations${closed ? `, ${nowNf(closed)} of them closed, almost all from earlier years` : ""}; here we follow the open ones and those from 2026. We also follow mining, biomethane and deforestation.`)}</p>` : ""
                }<span class="now-date">${tr("Verificado no Participa.pt em", "Checked on Participa.pt on")} ${date(meta.instantaneo_em)}</span>`;
                const open$ = (x) => /aberta/i.test(x.estado_consulta),
                    dmShort = (v) => (v ? new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }) : ""),
                    nPos = (n) => Math.min(100, Math.max(1, Math.log10(Math.max(n, 1)) / 4 * 100)),
                    medPos = nPos(c.factos_participacao?.participacoes_mediana || 149),
                    spanDays = (x) => (x.inicio && x.fim ? Math.round((new Date(x.fim + "T12:00:00") - new Date(x.inicio + "T12:00:00")) / 864e5) + 1 : 0),
                    ptsOf = (x) => (x.municipios || []).map((m) => GEO?.concelhos?.[norm(m)]).filter(Boolean),
                    cardMap = (x) => {
                        if (!GEO) return "";
                        const pts = ptsOf(x),
                            col = open$(x) ? "#17795a" : "#b87f00";
                        if (pts.length) return `<div class="c-map" role="img" aria-label="${esc((x.municipios || []).join(", "))}">${mapSvg(pts.map((q) => ({ q, r: 3.6, c: col })), { w: 92, halo: true })}</div>`;
                        if (x.ambito && /Nacional/i.test(x.ambito)) return `<div class="c-map c-map-nacional" role="img" aria-label="${tr("Âmbito nacional", "National scope")}">${mapSvg([], { w: 92, fill: col })}<span>${tr("Nacional", "National")}</span></div>`;
                        if (/Espanha|Spain|Zamora/i.test(x.titulo || "") || /Transfronteiri/i.test(x.ambito || "")) return `<div class="c-map c-map-nacional" role="img" aria-label="${tr("Espanha, junto à fronteira", "Spain, near the border")}">${mapSvg([], { w: 92, fill: "#8f98a3" })}<span>${tr("Espanha", "Spain")}</span></div>`;
                        return `<div class="c-map c-map-nacional" role="img" aria-label="${tr("Localização não indicada", "Location not stated")}">${mapSvg([], { w: 92, fill: "#c3c8bd" })}<span>${tr("Local por indicar", "Location n/a")}</span></div>`;
                    },
                    periodBar = (x) => {
                        const n = spanDays(x);
                        if (!n) return "";
                        const cap = 45, w = Math.min(n / cap * 100, 100), short = n <= 21;
                        return `<div class="c-days${short ? " is-short" : ""}"><div class="c-days-t"><span>${tr(`Prazo de ${n} dias`, `${n}-day period`)}</span><em>${dmShort(x.inicio)} – ${dmShort(x.fim)}</em></div><div class="c-days-bar" title="${tr("A linha marca 21 dias", "The line marks 21 days")}"><i style="width:${w}%"></i><b style="left:${21 / cap * 100}%"></b></div></div>`;
                    },
                    cardHtml = (x) => {
                        const tags = signals(x).filter(([k]) => k !== "urgent"),
                            isOpen = open$(x),
                            n = x.fim ? days(x.fim) : null,
                            when = isOpen && n !== null ? (n <= 0 ? tr("Último dia", "Last day") : tr(`Fecha em ${n} dias`, `Closes in ${n} days`)) : tr(`Fechou a ${dmShort(x.fim)}`, `Closed ${dmShort(x.fim)}`),
                            where = (x.municipios || []).join(" · ") || (isEn() ? SCOPE_EN[x.ambito] || x.ambito : x.ambito) || x.tipologia,
                            who = [x.tipologia && (isEn() ? TYPE_EN[x.tipologia] || x.tipologia : x.tipologia), x.promotor_projeto].filter(Boolean).join(" · "),
                            map = cardMap(x),
                            ref = x.territorio?.url2;
                        return `<article class="consult ${isOpen ? "consult-open" : "consult-analysis"}" data-state="${x.alerta_qualidade ? "archive" : isOpen ? "open" : "analysis"}"><header class="c-top"><span class="c-badge">${esc(stateTxt(x.estado_consulta))}</span>${x.tema ? `<span class="c-tema">${esc(isEn() ? TEMA_EN[x.tema] || x.tema : x.tema)}</span>` : ""}<span class="c-when">${esc(when)}</span></header><h3>${esc(x.titulo)}</h3>${
                            who ? `<p class="c-meta">${esc(who)}</p>` : ""
                        }<div class="c-main${map ? " has-map" : ""}">${map}<div class="c-fig">${
                            x.participacoes !== undefined
                                ? `<div class="part"><strong>${Number(x.participacoes).toLocaleString(isEn() ? "en-GB" : "pt-PT")}</strong><span>${x.participacoes === 1 ? tr("participação", "submission") : tr("participações", "submissions")}</span></div><div class="c-scale" title="${tr("Escala logarítmica; a linha marca a mediana de 2026", "Logarithmic scale; the line marks the 2026 median")}"><i style="width:${nPos(x.participacoes)}%"></i><b style="left:${medPos}%"></b></div><small class="c-scale-l">${tr("a linha é a mediana de 2026", "the line is the 2026 median")}</small>`
                                : ""
                        }<p class="c-where">${esc(where)}</p></div></div>${periodBar(x)}${
                            tags.length ? `<div class="signals">${tags.map(([k, t]) => `<span class="signal signal-${k}">${esc(t)}</span>`).join("")}</div>` : ""
                        }${
                            x.resumo_projeto ? `<p class="c-resumo">${esc(isEn() ? x.resumo_projeto_en || x.resumo_projeto : x.resumo_projeto)}</p>` : ""
                        }${
                            x.territorio
                                ? `<details class="territorio"><summary>${tr("Território, ecossistemas e espécies", "Land, ecosystems and species")}</summary><dl>${
                                    (x.territorio.linhas || []).map((l) => `<div><dt>${esc(isEn() ? l.rotulo_en || l.rotulo : l.rotulo)}</dt><dd>${esc(isEn() ? l.texto_en || l.texto : l.texto)}</dd></div>`).join("")
                                }</dl><p class="territorio-nota">${esc(isEn() ? x.territorio.nota_en || x.territorio.nota : x.territorio.nota)}</p><p class="territorio-fonte">${tr("Fonte:", "Source:")} <a href="${esc(x.territorio.url)}" target="_blank" rel="noopener">${esc(isEn() ? x.territorio.fonte_en || x.territorio.fonte : x.territorio.fonte)}</a>${
                                    ref ? ` · <a href="${esc(ref)}" target="_blank" rel="noopener">${tr("relatório da consulta", "consultation report")}</a>` : ""
                                }</p></details>`
                                : ""
                        }${
                            x.alerta_qualidade ? `<p class="c-alert"><strong>${tr("Atenção:", "Note:")}</strong> ${esc(isEn() ? ALERT_EN[x.alerta_qualidade] || x.alerta_qualidade : x.alerta_qualidade)}</p>` : ""
                        }${
                            x.url ? `<footer class="c-foot"><a href="${esc(x.url)}" target="_blank" rel="noopener">${tr("Abrir ficha no Participa", "Open on Participa")} ↗</a></footer>` : ""
                        }</article>`;
                    };
                el("consults").innerHTML = current.map(cardHtml).join("") || '<p class="empty">—</p>';
                // Panorama: mapa com todas as consultas, concelhos mais visados e filtro por estado.
                if (el("consults-top") && GEO) {
                    const per = {};
                    recent.forEach((x) => (x.municipios || []).forEach((m) => {
                        const k = norm(m), o = (per[k] ||= { name: m, n: 0, open: 0, parts: 0 });
                        o.n += 1; o.parts += x.participacoes || 0; if (open$(x)) o.open += 1;
                    }));
                    const dots = Object.entries(per).filter(([k]) => GEO.concelhos[k]).map(([k, o]) => ({ k, n: o.name, q: GEO.concelhos[k], r: 1.9 + o.n * 0.9, c: o.open ? "#17795a" : "#b87f00", t: `${o.name}: ${o.n} ${o.n === 1 ? tr("consulta", "consultation") : tr("consultas", "consultations")}` })),
                        top = Object.values(per).sort((p, q) => q.n - p.n || q.parts - p.parts).slice(0, 8),
                        maxN = Math.max(...top.map((t) => t.n), 1),
                        nOpen = recent.filter(open$).length,
                        nAn = recent.length - nOpen,
                        chip = (k, label, n, on) => `<button type="button" class="c-chip${on ? " is-on" : ""}" data-f="${k}">${label} <b>${n}</b></button>`;
                    el("consults-top").innerHTML = `<div class="ct-map">${mapSvg(dots, { w: 290, halo: true, pad: 0 })}</div><div class="ct-leg"><span><i style="background:#17795a"></i>${tr("Com consulta aberta", "With an open consultation")}</span><span><i style="background:#b87f00"></i>${tr("Só em análise", "Under review only")}</span></div><div class="ct-side"><div class="ct-head"><small>${tr("Onde estão", "Where they are")}</small><h3>${
                        tr(`${Object.keys(per).length} concelhos com consultas abertas ou em análise sobre renováveis e outros temas do território`, `${Object.keys(per).length} municipalities with open or under-review consultations on renewables and other land-use topics`)
                    }</h3></div><div class="ct-list"><h4>${tr("Concelhos mais visados", "Most affected municipalities")}</h4>${
                        top.map((t) => `<div class="zb" data-k="${esc(norm(t.name))}"><span class="zb-l">${esc(t.name)}</span><span class="zb-t"><i style="width:${t.n / maxN * 100}%;background:${t.open ? "#17795a" : "#b87f00"}"></i></span><span class="zb-v">${t.n}<em>${tr("consultas", "consultations")}</em></span></div>`).join("")
                    }<p class="zc-unit">${tr("O ponto de cada concelho é indicativo. Os projetos que abrangem vários concelhos contam em cada um; as consultas nacionais e as de Espanha não entram.", "Each municipality's dot is indicative. Projects spanning several municipalities count in each; national and Spanish consultations are left out.")}</p></div><div class="c-chips" role="group" aria-label="${tr("Filtrar por estado", "Filter by state")}">${
                        chip("all", tr("Todas", "All"), recent.length, true)}${chip("open", tr("Abertas", "Open"), nOpen, false)}${chip("analysis", tr("Em análise", "Under review"), nAn, false)
                    }</div></div>`;
                    // Ligar pontos e linhas: ao passar o rato num, realça o outro e o mapa mostra o nome do concelho.
                    const ct = el("consults-top"), svg = ct.querySelector("svg"), dotOf = (k) => [...ct.querySelectorAll(".ct-dot")].find((g) => g.dataset.k === k);
                    let lab = null;
                    const hl = (k, on) => {
                        const g = dotOf(k);
                        ct.querySelectorAll(`.zb[data-k="${k}"]`).forEach((r) => r.classList.toggle("is-hl", on));
                        if (g) g.classList.toggle("is-hl", on);
                        if (lab) { lab.remove(); lab = null; }
                        if (!on || !g || !svg) return;
                        const c0 = g.querySelector("circle:last-of-type"), vb = svg.viewBox.baseVal, cx = +c0.getAttribute("cx"), cy = +c0.getAttribute("cy"), r = +c0.getAttribute("r"),
                            k2 = vb.width / (svg.getBoundingClientRect().width || vb.width), left = cx > vb.x + vb.width * 0.55;
                        lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
                        lab.setAttribute("class", "ct-lab");
                        lab.setAttribute("x", cx + (left ? -1 : 1) * (r * 2.1 + 1.5));
                        lab.setAttribute("y", cy + 4 * k2);
                        lab.setAttribute("text-anchor", left ? "end" : "start");
                        lab.setAttribute("font-size", 12 * k2);
                        lab.textContent = g.dataset.n;
                        svg.appendChild(lab);
                    };
                    ct.querySelectorAll(".ct-dot, .zb[data-k]").forEach((n) => {
                        n.addEventListener("pointerenter", () => hl(n.dataset.k, true));
                        n.addEventListener("pointerleave", () => hl(n.dataset.k, false));
                    });
                    el("consults-top").querySelectorAll(".c-chip").forEach((btn) => btn.addEventListener("click", () => {
                        el("consults-top").querySelectorAll(".c-chip").forEach((b2) => b2.classList.toggle("is-on", b2 === btn));
                        el("consults").querySelectorAll(".consult").forEach((card) => { card.hidden = btn.dataset.f !== "all" && card.dataset.state !== btn.dataset.f; });
                    }));
                }
                const dm = (v) => new Date(v + "T12:00:00").toLocaleDateString(isEn() ? "en-GB" : "pt-PT", { day: "numeric", month: "short" }),
                    nameOf = (x) => String(x.titulo || "").replace(/\s+-\s+projeto reformulado$/i, ""),
                    closing = (c.abertas || []).filter((x) => x.fim).slice().sort((x, y) => String(x.fim).localeCompare(String(y.fim))),
                    justClosed = (c.em_analise || []).filter((x) => x.fim && !x.alerta_qualidade).slice().sort((x, y) => String(y.fim).localeCompare(String(x.fim))).slice(0, 3),
                    row = (x, tag, cls) => `<li class="${cls}"><span class="pz-when">${esc(tag)}</span><a href="${esc(x.url || "#")}" target="_blank" rel="noopener">${esc(nameOf(x))}</a>${
                        typeof x.participacoes === "number" ? `<em>${num(x.participacoes)} ${tr("participações", "submissions")}</em>` : ""
                    }</li>`;
                if (el("participa-prazos")) {
                    el("participa-prazos").innerHTML = (closing.length || justClosed.length) ? `${
                        closing.length ? `<h4>${tr("Fecham em breve", "Closing soon")}</h4><ul>${closing.map((x) => { const n = days(x.fim); return row(x, n <= 0 ? tr("Hoje", "Today") : tr(`${dm(x.fim)} · ${n} dias`, `${dm(x.fim)} · ${n} days`), "pz-open"); }).join("")}</ul>` : ""
                    }${
                        justClosed.length ? `<h4>${tr("Terminaram há pouco, a aguardar decisão", "Recently closed, awaiting decision")}</h4><ul>${justClosed.map((x) => row(x, tr(`Fechou a ${dm(x.fim)}`, `Closed ${dm(x.fim)}`), "pz-analysis")).join("")}</ul>` : ""
                    }` : "";
                }
                const f = c.factos_participacao,
                    ps = d.pszaer?.consulta_publica || {};
                const span = (x) => Math.round((new Date(x.fim + "T12:00:00") - new Date(x.inicio + "T12:00:00")) / 864e5) + 1,
                    projects = recent.filter((x) => x.inicio && x.fim && !/Estrat[ée]gias|Programas/i.test(x.tipologia || "")).map((x) => ({ x, d: span(x) })).filter((r) => r.d > 0),
                    short = projects.sort((a, b) => a.d - b.d || (b.x.participacoes || 0) - (a.x.participacoes || 0)).slice(0, 7),
                    maxD = Math.max(...projects.map((r) => r.d), 1),
                    clean = (t) => String(t || "").replace(/\s+-\s+projeto reformulado$/i, "").replace(/^(PDA\s+(do\s+Projeto\s+d[aeo]\s+)?[—-]?\s*|Proposta de Definição Âmbito:\s*)/i, "").replace(/\s+e\s+LMAT associadas.*$/i, "").replace(/^Central Solar Fotovoltaica de Sophia$/i, "Central Solar de Sophia").replace(/^Central Solar Fotovoltaica/i, "Central Solar").replace(/^Parque Eólico/i, "P. Eólico"),
                    shortest = short.length ? `<div class="part-curtas"><h4>${tr("As consultas mais curtas", "The shortest consultations")}</h4><ul>${short.map((r) => `<li class="${r.d <= 21 ? "curta" : ""}"><span class="pc-nome">${esc(clean(r.x.titulo))}</span><span class="pc-bar"><b style="width:${Math.max(6, r.d / maxD * 100)}%"></b></span><em>${r.d} ${tr("dias", "days")}${typeof r.x.participacoes === "number" ? ` · ${num(r.x.participacoes)}` : ""}</em></li>`).join("")}</ul><p>${tr("Dias de prazo e, a seguir, participações recebidas. Uma consulta de 14 dias pode ter milhares de contributos; o prazo curto não impede a participação, mas reduz o tempo para ler os documentos.", "Days allowed and, after it, submissions received. A 14-day consultation can draw thousands of submissions; a short deadline does not stop participation, but it shortens the time to read the documents.")}</p></div>` : "";
                el("participa-facts").innerHTML = f && f.consultas_projetos
                    ? `<small>${tr("Factos sobre a participação", "Facts about participation")} · ${f.ano}</small><h3>${
                        tr(`${f.consultas_projetos} consultas de projetos de renováveis`, `${f.consultas_projetos} renewables project consultations`)
                    }</h3><ul><li>${
                        tr(`<strong>${f.ate_21_dias}</strong> tiveram 21 dias ou menos para participar (mediana: ${f.duracao_mediana_dias} dias).`,
                            `<strong>${f.ate_21_dias}</strong> allowed 21 days or fewer to take part (median: ${f.duracao_mediana_dias} days).`)
                    }${miniStack([
                        { l: tr("21 dias ou menos", "21 days or fewer"), v: f.ate_21_dias, c: PALETTE[1] },
                        { l: tr("Mais de 21 dias", "More than 21 days"), v: f.consultas_projetos - f.ate_21_dias, c: PALETTE[0] },
                    ])}</li><li>${
                        tr(`<strong>${f.com_dias_em_agosto}</strong> decorreram total ou parcialmente em agosto; em <strong>${f.maioria_em_agosto}</strong>, a maior parte do prazo calhou em agosto.`,
                            `<strong>${f.com_dias_em_agosto}</strong> ran fully or partly in August; for <strong>${f.maioria_em_agosto}</strong>, most of the period fell in August.`)
                    }${miniStack([
                        { l: tr("Sobretudo em agosto", "Mostly in August"), v: f.maioria_em_agosto, c: PALETTE[1] },
                        { l: tr("Parte em agosto", "Partly in August"), v: f.com_dias_em_agosto - f.maioria_em_agosto, c: PALETTE[3] },
                        { l: tr("Fora de agosto", "Outside August"), v: f.consultas_projetos - f.com_dias_em_agosto, c: PALETTE[0] },
                    ])}</li><li>${
                        tr(`Mediana de <strong>${Number(f.participacoes_mediana).toLocaleString("pt-PT")}</strong> participações por consulta. O PSZAER, com cobertura mediática, recebeu ${Number(ps.participacoes || 0).toLocaleString("pt-PT")}.`,
                            `Median of <strong>${Number(f.participacoes_mediana).toLocaleString("en-GB")}</strong> submissions per consultation. The PSZAER, which had media coverage, received ${Number(ps.participacoes || 0).toLocaleString("en-GB")}.`)
                    }${miniBars([
                        { l: tr("Mediana por projeto", "Median per project"), v: f.participacoes_mediana },
                        { l: tr("PSZAER (com cobertura mediática)", "PSZAER (media coverage)"), v: ps.participacoes || 0 },
                    ])}</li></ul><p>${
                        tr("Prazos curtos e períodos de férias reduzem a possibilidade real de participar. A divulgação oficial é feita sobretudo no portal e por editais.",
                            "Short deadlines and holiday periods reduce the real chance to take part. Official notice is given mainly on the portal and through public notices.")
                    }</p><span class="now-date">${esc(isEn() ? "Projects subject to environmental assessment; excludes national programmes and strategies. Duration in calendar days, including the first and last day." : f.nota)}</span>${shortest}`
                    : "";
                const lp = c.leitura_participacoes,
                    rf = d.pszaer?.consulta_publica?.relatorio_final;
                if (el("participa-leitura") && f && lp) {
                    const top1 = f.participacoes_maxima || 0,
                        topRec = withParts.find((x) => x.participacoes === top1),
                        share = f.participacoes_total ? Math.round(f.participacoes_maxima / f.participacoes_total * 100) : 0,
                        times = f.participacoes_mediana ? Math.round(f.participacoes_maxima / f.participacoes_mediana) : 0,
                        nf = (v) => Number(v).toLocaleString(isEn() ? "en-GB" : "pt-PT"),
                        TONE = { concordancia: "#1baf7a", discordancia: "#eb6834", outros: "#c3c8bd" },
                        TONE_L = { concordancia: tr("Concordância", "Agreement"), discordancia: tr("Discordância", "Disagreement"), outros: tr("Outras", "Other") },
                        compare = miniBars([
                            { l: tr("Mediana dos projetos", "Median of projects"), v: f.participacoes_mediana, c: PALETTE[2] },
                            { l: tr("Média dos projetos", "Mean of projects"), v: f.participacoes_media, c: PALETTE[3] },
                            { l: esc(shortTitle(topRec?.titulo)), v: top1, c: PALETTE[1] },
                        ]),
                        rows = (lp.posicoes || []).map((r) => {
                            const parts = (isEn() && r.partes_en ? r.partes_en : r.partes),
                                tot = parts.reduce((acc, x) => acc + x[1], 0) || 1;
                            return `<div class="vs-row"><div class="vs-h"><strong>${esc(isEn() ? r.titulo_en || r.titulo : r.titulo)}</strong><em>${esc(isEn() ? r.total_en || r.total : r.total)} ${tr("participações", "submissions")}</em></div><div class="vs-bar">${
                                parts.map((x) => `<span style="width:${x[1] / tot * 100}%;background:${TONE[x[0]]}" title="${esc(TONE_L[x[0]])}${x[2] ? ": " + esc(x[2]) : ""}"><b>${x[1] / tot > 0.12 ? esc(x[2]) : ""}</b></span>`).join("")
                            }</div><p>${esc(isEn() ? r.nota_en || r.nota : r.nota)} <a href="${esc(r.url)}" target="_blank" rel="noopener">${tr("Relatório", "Report")}</a></p></div>`;
                        }).join(""),
                        legend = `<div class="vs-leg">${["concordancia", "discordancia", "outros"].map((k) => `<span><i style="background:${TONE[k]}"></i>${TONE_L[k]}</span>`).join("")}</div>`,
                        tip = rf?.tipologia_pct || {},
                        tipRows = [
                            ["discordancia", tr("Discordância", "Disagreement"), "#eb6834"], ["reclamacao", tr("Reclamação", "Complaint"), "#eda100"],
                            ["sugestao", tr("Sugestão", "Suggestion"), "#2a78d6"], ["concordancia", tr("Concordância", "Agreement"), "#1baf7a"], ["geral", tr("Geral", "General"), "#8f98a3"],
                        ].filter((x) => tip[x[0]] !== undefined),
                        maxT = Math.max(...(rf?.temas || []).map((t) => t.n), 1),
                        pszaer = rf ? `<article class="voz"><small>${tr("Quando a APA conta tudo", "When APA counts everything")}</small><h3>${
                            tr(`O que disseram as ${nf(rf.participacoes)} participações do PSZAER`, `What the ${nf(rf.participacoes)} PSZAER submissions said`)
                        }</h3><div class="voz-grid"><div><h4>${tr("Que tipo de participação", "What kind of submission")}</h4><div class="vs-bar vs-tall">${
                            tipRows.map((x) => `<span style="width:${Math.max(tip[x[0]], 0.8)}%;background:${x[2]}" title="${esc(x[1])}: ${tip[x[0]]} %"><b>${tip[x[0]] >= 8 ? tip[x[0]] + " %" : ""}</b></span>`).join("")
                        }</div><ul class="vs-key">${tipRows.map((x) => `<li><i style="background:${x[2]}"></i>${esc(x[1])} <em>${tip[x[0]]} %</em></li>`).join("")}</ul><p>${
                            tr(`<strong>${String(rf.modelo_pct).replace(".", ",")} %</strong> eram participações-modelo, com texto repetido na íntegra. O concelho mais mencionado foi a <strong>${esc(rf.concelho_mais_mencionado?.nome)}</strong>, com ${nf(rf.concelho_mais_mencionado?.mencoes)} menções (${String(rf.concelho_mais_mencionado?.pct).replace(".", ",")} %).`,
                                `<strong>${rf.modelo_pct}%</strong> were template submissions with identical text. The most-mentioned municipality was <strong>${esc(rf.concelho_mais_mencionado?.nome)}</strong>, with ${nf(rf.concelho_mais_mencionado?.mencoes)} mentions (${rf.concelho_mais_mencionado?.pct}%).`)
                        }</p></div><div><h4>${tr("De que falaram (número de participações por tema)", "What they talked about (submissions per theme)")}</h4>${
                            (rf.temas || []).map((t, i) => `<div class="zb"><span class="zb-l">${esc(isEn() ? t.en : t.pt)}</span><span class="zb-t"><i style="width:${t.n / maxT * 100}%;background:${i < 2 ? "#3f7a3a" : i < 6 ? "#7fae6e" : "#b7d2ac"}"></i></span><span class="zb-v">${nf(t.n)}</span></div>`).join("")
                        }<span class="zc-unit">${esc(isEn() ? rf.nota_en || rf.nota : rf.nota)} <a href="${esc(rf.url)}" target="_blank" rel="noopener">${tr("Relatório final", "Final report")}</a></span></div></div></article>` : "";
                    el("participa-leitura").innerHTML = `<small>${tr("Como ler os números", "How to read the numbers")}</small><h3>${
                        tr(`O que significam ${nf(top1)} participações?`, `What do ${nf(top1)} submissions mean?`)
                    }</h3><div class="leitura-grid"><article><h4>${tr("É muito ou pouco?", "Is it a lot?")}</h4>${compare}<p>${
                        tr(`A mediana dos projetos de ${f.ano} é de <strong>${nf(f.participacoes_mediana)}</strong> participações. ${esc(shortTitle(topRec?.titulo))} tem cerca de ${times} vezes mais e sozinha pesa ${share} % do total (${nf(f.participacoes_total)}). Sem ela, a média desce de ${nf(f.participacoes_media)} para ${nf(f.participacoes_media_sem_maxima)}, por isso a mediana descreve melhor o caso típico.`,
                            `The median for ${f.ano} projects is <strong>${nf(f.participacoes_mediana)}</strong> submissions. ${esc(shortTitle(topRec?.titulo))} has about ${times} times more and alone makes up ${share}% of the total (${nf(f.participacoes_total)}). Without it the mean falls from ${nf(f.participacoes_media)} to ${nf(f.participacoes_media_sem_maxima)}, so the median describes the typical case better.`)
                    }</p><p>${
                        tr("Uma participação é um comentário submetido no portal. O número mede mobilização, não decide o resultado, e o Participa não diz se vêm de pessoas diferentes.",
                            "A submission is a comment filed on the portal. The number measures mobilisation, it does not decide the outcome, and Participa does not say whether they come from different people.")
                    }</p></article><article><h4>${tr("São todas contra?", "Are they all against?")}</h4>${rows}${legend}<p>${
                        tr(`Quem participa escolhe um classificador (${(lp.classificadores || []).join(", ")}), mas a ficha pública não mostra quantas há de cada. A divisão só aparece no relatório de encerramento da APA, e só nas consultas que já o têm. As restantes não as estimamos.`,
                            "Participants pick a classifier (Agreement, Disagreement, General, Competing proposal, Complaint, Suggestion), but the public page does not show how many there are of each. The split only appears in APA's closing report, and only for consultations that have one. We do not estimate the others.")
                    }</p></article></div>${pszaer}<details class="leitura-rel"><summary>${tr("Ler o que dizem os relatórios", "Read what the reports say")}</summary><ul class="leitura-casos">${
                        (lp.exemplos || []).map((e) => `<li><strong>${esc(isEn() ? e.titulo_en || e.titulo : e.titulo)}</strong> <em>${esc(isEn() ? e.numero_en || e.numero : e.numero)}</em><span>${esc(isEn() ? e.texto_en || e.texto : e.texto)}</span> <a href="${esc(e.url)}" target="_blank" rel="noopener">${tr("Relatório da APA", "APA report")}</a></li>`).join("")
                    }</ul></details><p class="leitura-nota">${
                        tr("Prioridade: aqui só se ordena o que se pode medir, o prazo (as abertas primeiro, por data de fecho). Não há pontuação de impacto, porque exigiria as geometrias oficiais de cada projeto (ver «O que deve entrar numa decisão»). As fichas de território dos casos maiores resumem o que consta dos documentos oficiais e dizem quem os escreveu.",
                            "Priority: only what can be measured is ranked here, the deadline (open ones first, by closing date). There is no impact score, because it would need each project's official geometries (see “What should go into a decision”). The land fiches for the larger cases summarise what the official documents say and who wrote them.")
                    }</p>`;
                }
            }
            function renderLocal(d) {
                const box = el("participa-local");
                if (!box || !window.BioCultureParticipaLocal) return;
                const tr = (pt, en) => (isEn() ? en : pt),
                    T = window.BioCultureParticipaLocal.title,
                    item = (x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.titulo)}</a> <span>${esc(stateTxt(x.estado_consulta))} · ${date(x.fim)}</span></li>`;
                window.BioCultureParticipaLocal.match(d).then(({ region, concelho, distrito, nacional }) => {
                    if (!region) {
                        box.innerHTML = `<small>${tr("No teu território", "In your area")}</small><p>${
                            tr("Escolhe a tua localidade em «O teu território», na barra lateral, para ver as consultas do teu concelho e distrito.",
                                "Choose your locality under “Your area” in the sidebar to see the consultations in your municipality and district.")
                        }</p>`;
                        return;
                    }
                    const mun = T(region.concelho), dist = T(region.distrito);
                    const col = (head, rows, none) => `<div class="local-col"><h4>${head}</h4>${
                        rows.length ? `<ul>${rows.map(item).join("")}</ul>` : `<p>${none}</p>`
                    }</div>`;
                    const html = `<small>${tr("No teu território", "In your area")} · ${esc(region.titulo)}</small><div class="local-grid">${
                        col(tr(`Concelho de ${esc(mun)}`, `Municipality of ${esc(mun)}`), concelho,
                            tr("Nenhuma consulta de renováveis aberta ou em análise.", "No renewables consultation open or under review."))
                    }${
                        col(tr(`Outros concelhos do distrito de ${esc(dist)}`, `Elsewhere in the district of ${esc(dist)}`), distrito,
                            tr("Nenhuma consulta de renováveis aberta ou em análise.", "No renewables consultation open or under review."))
                    }${
                        col(tr("Âmbito nacional, abrange também o teu território", "National scope, also covers your area"), nacional,
                            tr("Nenhuma consulta nacional em curso.", "No national consultation in progress."))
                    }</div>`;
                    box.innerHTML = html;
                });
            }
            function renderPlants(d) {
                const x = d.grandes_centrais_existentes || {};
                const rows = (x.registos || []).filter((v) => !v.abaixo_limiar_observatorio);
                const max = Math.max(...rows.map((v) => Number(v.potencia_mw) || 0), 1);
                const tone = (t) => (/e[óo]lic|wind/i.test(t || "") ? "#2f78b0" : /solar|fotovolt/i.test(t || "") ? "#b88a1a" : "#2a8a7a");
                el("plants").innerHTML = rows.map((v) => {
                    const mw = Number(v.potencia_mw);
                    return `<article class="plant plant-vivo" style="--tom:${tone(v.tecnologia)}"><small>${esc(v.estado_operacional)}</small><h3>${esc(v.titulo)}</h3>${
                        mw ? `<div class="plant-mw"><strong>${mw.toLocaleString(isEn() ? "en-GB" : "pt-PT")}</strong><span>MW</span></div><div class="plant-bar"><b style="width:${Math.max(4, mw / max * 100)}%"></b></div>` : ""
                    }<p class="plant-tec">${esc(v.tecnologia)}</p><p class="plant-local">${esc(v.municipio || v.regiao || "Localização: —")}</p></article>`;
                }).join("");
            }
            function renderCriteria(d) {
                const names = {
                    biodiversidade: ["Biodiversidade", "Biodiversity", "#3f7a3a"],
                    solo_agricultura: ["Solo e agricultura", "Soil and farming", "#8a5a2b"],
                    agua: ["Água", "Water", "#2f78b0"],
                    paisagem_patrimonio: ["Paisagem e património", "Landscape and heritage", "#8a4f7d"],
                    comunidades: ["Comunidades", "Communities", "#b0553a"],
                    rede_acessos: ["Rede e acessos", "Grid and access", "#5b6f86"],
                    clima_circularidade: ["Clima e circularidade", "Climate and circularity", "#2a8a7a"],
                    cumulativos: ["Efeitos cumulativos", "Cumulative effects", "#b8860b"],
                };
                el("criteria").innerHTML = (d.matriz_criticidade?.dimensoes || []).map((x, i) => {
                    const n = names[x.id] || [x.id.replaceAll("_", " "), x.id.replaceAll("_", " "), "#6b776f"];
                    return `<article class="criterion criterion-vivo" style="--tom:${n[2]}"><h3>${isEn() ? n[1] : n[0]}</h3><ul class="crit-chips">${
                        (x.indicadores || []).slice(0, 6).map((v) => `<li>${esc(v)}</li>`).join("")
                    }</ul></article>`;
                }).join("");
            }
            function renderMeasures(d) {
                const m = d.mitigacao_e_monitorizacao || {};
                const names = {
                    solar: ["Solar", "Solar", "med-solar", "#b88a1a"],
                    eolica: ["Eólica", "Wind", "med-eolica", "#2f78b0"],
                    baterias: ["Baterias", "Batteries", "med-baterias", "#5b6f86"],
                    comunidade: ["Comunidade", "Community", "med-comunidade", "#b0553a"],
                    desativacao: ["Desativação", "Decommissioning", "med-desativacao", "#4e7d3a"],
                };
                el("measures").innerHTML = Object.entries(m).map(([k, v]) => {
                    const n = names[k] || [k, k, "", "#6b776f"];
                    return `<article class="measure measure-vivo" style="--tom:${n[3]}">${
                        n[2] ? `<div class="measure-foto" data-foto-slot="${n[2]}" data-sem-legenda></div>` : ""
                    }<div class="measure-corpo"><small>${isEn() ? "Measures" : "Medidas"}</small><h3>${isEn() ? n[1] : n[0]}</h3><ul class="crit-chips">${
                        (v || []).slice(0, 8).map((x) => `<li>${esc(x)}</li>`).join("")
                    }</ul></div></article>`;
                }).join("");
            }
            function renderNews(items) {
                const words = ["ZAER", "solar", "eólic*", "wind", "renew*", "renov*", "licenciamento", "licensing", "fotovolta*", "photovoltaic*", "land use", "mapa verde"];
                const selected = window.BioCultureNews.rank(items)
                    .filter((n) => window.BioCultureNews.about(n, words, []))
                    .slice(6, 12);
                el("news").innerHTML = selected.map((n) => window.BioCultureNews.cardHtml(n)).join("") ||
                    '<p class="empty">Sem notícias desta categoria neste momento.</p>';
                // O bloco «Atualidade» do fim da página mostra as notícias a seguir às do bloco «em foco» (não as mesmas);
                // sem mais notícias, esconde-se com a ligação que lhe aponta.
                const section = el("news").closest("section");
                if (section && !selected.length) {
                    section.hidden = true;
                    if (section.id) document.querySelectorAll(`a[href="#${section.id}"]`).forEach((link) => (link.hidden = true));
                }
            }
            async function start() {
                try {
                    const [d, news] = await Promise.all(
                        ["zaer_critico", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    try { GEO = await fetch("/data/participa-geo.json").then((r) => (r.ok ? r.json() : null)); } catch (_) { GEO = null; }
                    renderStats(d);
                    renderConsults(d);
                    renderLocal(d);
                    renderPlants(d);
                    renderCriteria(d);
                    renderMeasures(d);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados territoriais:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        