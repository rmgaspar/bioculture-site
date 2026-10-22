
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
                    solar = a.solar?.proposta_menos_10km_subestacao || {},
                    wind = a.eolica_terrestre?.proposta_poligonos_maiores_20ha || {},
                    c = p.consulta_publica || {};
                el("stats").innerHTML = [["Estado", c.estado_portal || "—", "consulta PSZAER"], [
                    "Participações",
                    Number(c.participacoes || 0).toLocaleString("pt-PT"),
                    "registadas no portal",
                ], [
                    "Solar proposto",
                    Number(solar.area_ha || 0).toLocaleString("pt-PT") + " ha",
                    isEn()
                        ? `${solar.poligonos || "—"} polygons within 10 km of a substation`
                        : `${solar.poligonos || "—"} polígonos a menos de 10 km de subestação`,
                ], [
                    "Eólica proposta",
                    Number(wind.area_ha || 0).toLocaleString("pt-PT") + " ha",
                    isEn()
                        ? `${wind.poligonos || "—"} polygons larger than 20 ha`
                        : `${wind.poligonos || "—"} polígonos superiores a 20 ha`,
                ]].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                        x[2]
                    }</span></article>`
                ).join("");
                el("zaer-warning").textContent = (a.leitura || []).join(" ");
                el("snapshot-copy").textContent += isEn()
                    ? ` Snapshot observed on ${date(c.observado_em)}.`
                    : ` Instantâneo observado em ${date(c.observado_em)}.`;
                const art = p.potencial_solar_artificializado || {};
                el("art-gw").textContent = `${art.total_capacidade_gw ?? "—"} GW`;
                el("art-twh").textContent = `${art.total_geracao_twh_ano ?? "—"} TWh/ano`;
            }
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
                el("participa-now").innerHTML = `<div class="now-figures"><span class="is-open"><strong>${open}</strong>${
                    tr(open === 1 ? "consulta aberta agora" : "consultas abertas agora", open === 1 ? "consultation open now" : "consultations open now")
                }</span><span class="is-analysis"><strong>${pending}</strong>${tr("em análise: prazo terminado, a aguardar decisão (2026)", "under review: closed, awaiting decision (2026)")}</span>${
                    partSum ? `<span class="is-parts"><strong>${num(partSum)}</strong>${tr("participações nestas consultas", "submissions in these consultations")}</span>` : ""
                }</div>${
                    top.length
                        ? `<div class="part-chart"><h4>${tr("Participações por consulta", "Submissions per consultation")}</h4>${miniBars(top.map((x) => ({
                            l: shortTitle(x.titulo), v: x.participacoes, c: /aberta/i.test(x.estado_consulta) ? PALETTE[2] : PALETTE[3],
                        })))}<div class="mlegend"><span><i style="background:${PALETTE[2]}"></i>${tr("Abertas", "Open")}</span><span><i style="background:${PALETTE[3]}"></i>${tr("Em análise", "Under review")}</span></div></div>`
                        : ""
                }<p>${
                    open
                        ? tr("Ainda é possível participar nas consultas assinaladas como abertas.", "You can still take part in the consultations marked as open.")
                        : tr(
                            "Não há nenhuma consulta de renováveis aberta neste momento. As que estão em análise aguardam decisão e, nas PDA, virá ainda a consulta do Estudo de Impacte Ambiental. Usa «Seguir» na ficha do projeto no Participa.pt para seres avisado.",
                            "No renewables consultation is open right now. Those under review await a decision, and scoping procedures will be followed by an EIA consultation. Use “Follow” on the Participa page to be notified."
                        )
                }</p>${
                    total
                        ? `<p class="now-note">${tr(
                            `O portal tem ${num(total)} consultas de renováveis${closed ? `, das quais ${num(closed)} encerradas, quase todas de anos anteriores`: ""}; aqui seguem-se as abertas e as de 2026.`,
                            `The portal lists ${num(total)} renewables consultations${closed ? `, ${num(closed)} of them closed, almost all from earlier years` : ""}; here we follow the open ones and those from 2026.`
                        )}</p>`
                        : ""
                }<span class="now-date">${tr("Verificado no Participa.pt em", "Checked on Participa.pt on")} ${date(meta.instantaneo_em)}</span>`;
                el("consults").innerHTML =
                    current.map((x) => {
                        const tags = signals(x);
                        return `<article class="consult ${/aberta/i.test(x.estado_consulta) ? "consult-open" : "consult-analysis"}"><small class="${
                            /aberta/i.test(x.estado_consulta) ? "status-open" : "status-analysis"
                        }">${esc(stateTxt(x.estado_consulta))} · ${date(x.fim)}</small><h3>${
                            esc(x.titulo)
                        }</h3>${
                            tags.length
                                ? `<div class="signals">${tags.map(([k, t]) => `<span class="signal signal-${k}">${esc(t)}</span>`).join("")}</div>`
                                : ""
                        }<p>${
                            esc((x.municipios || []).join(" · ") || (isEn() ? SCOPE_EN[x.ambito] || x.ambito : x.ambito) || x.tipologia)
                        }</p>${
                            x.participacoes !== undefined
                                ? `<div class="part"><strong>${
                                    Number(x.participacoes).toLocaleString(isEn() ? "en-GB" : "pt-PT")
                                }</strong><span>${x.participacoes === 1 ? tr("participação", "submission") : tr("participações", "submissions")}</span></div>`
                                : ""
                        }${
                            x.resumo_projeto
                                ? `<p>${esc(isEn() ? x.resumo_projeto_en || x.resumo_projeto : x.resumo_projeto)}</p>`
                                : ""
                        }${
                            x.alerta_qualidade
                                ? `<p><strong>${tr("Atenção:", "Note:")}</strong> ${esc(isEn() ? ALERT_EN[x.alerta_qualidade] || x.alerta_qualidade : x.alerta_qualidade)}</p>`
                                : ""
                        }${
                            x.url
                                ? `<a href="${
                                    esc(x.url)
                                }" target="_blank" rel="noopener">${tr("Abrir ficha original", "Open original page")}</a>`
                                : ""
                        }</article>`;
                    }).join("") || '<p class="empty">—</p>';
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
                    return `<article class="criterion criterion-vivo" style="--tom:${n[2]}"><span class="crit-n">${String(i + 1).padStart(2, "0")}</span><h3>${isEn() ? n[1] : n[0]}</h3><ul class="crit-chips">${
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
        