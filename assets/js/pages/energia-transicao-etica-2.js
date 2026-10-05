
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
                    current = [...(c.abertas || []), ...(c.em_analise || []), ...(c.encerradas || [])],
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
                        if (typeof x.participacoes === "number" && x.participacoes < 50) {
                            out.push(["low", tr("Pouca participação", "Low participation")]);
                        }
                    }
                    return out;
                };
                const open = (c.abertas || []).length,
                    pending = (c.em_analise || []).filter((x) => !x.alerta_qualidade).length,
                    total = meta.resumo_pesquisa?.consultas_renovaveis;
                el("participa-now").innerHTML = `<div class="now-figures"><span><strong>${open}</strong>${
                    tr(open === 1 ? "consulta aberta agora" : "consultas abertas agora", "open now")
                }</span><span><strong>${pending}</strong>${tr("a aguardar decisão (2026)", "awaiting decision (2026)")}</span>${
                    total ? `<span><strong>${total}</strong>${tr("consultas de renováveis no portal", "renewables consultations on the portal")}</span>` : ""
                }</div>${
                    meta.resumo_pesquisa
                        ? miniStack([
                            { l: tr("Abertas", "Open"), v: meta.resumo_pesquisa.abertas, c: PALETTE[2] },
                            { l: tr("Em análise", "Under review"), v: meta.resumo_pesquisa.em_analise, c: PALETTE[3] },
                            { l: tr("Encerradas", "Closed"), v: meta.resumo_pesquisa.encerradas, c: "#b9cbbd" },
                        ])
                        : ""
                }<p>${
                    open
                        ? tr("Ainda é possível participar nas consultas assinaladas como abertas.", "You can still take part in the consultations marked as open.")
                        : tr(
                            "Não há nenhuma consulta de renováveis aberta neste momento. As que estão em análise aguardam decisão e, nas PDA, virá ainda a consulta do Estudo de Impacte Ambiental. Usa «Seguir» na ficha do Participa para ser avisado.",
                            "No renewables consultation is open right now. Those under review await a decision, and scoping procedures will be followed by an EIA consultation. Use “Follow” on the Participa page to be notified.",
                        )
                }</p><span class="now-date">${tr("Verificado no Participa.pt em", "Checked on Participa.pt on")} ${date(meta.instantaneo_em)}</span>`;
                el("consults").innerHTML =
                    current.map((x) => {
                        const tags = signals(x);
                        return `<article class="consult"><small class="${
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
                                ? `<p>${
                                    Number(x.participacoes).toLocaleString(isEn() ? "en-GB" : "pt-PT")
                                } ${x.participacoes === 1 ? tr("participação", "submission") : tr("participações", "submissions")}</p>`
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
                const f = c.factos_participacao,
                    ps = d.pszaer?.consulta_publica || {};
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
                    }</p><span class="now-date">${esc(isEn() ? "Projects subject to environmental assessment; excludes national programmes and strategies. Duration in calendar days, including the first and last day." : f.nota)}</span>`
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
                el("plants").innerHTML = (x.registos || []).filter((v) => !v.abaixo_limiar_observatorio)
                    .map((v) =>
                        `<article class="plant"><small>${esc(v.estado_operacional)}</small><h3>${
                            esc(v.titulo)
                        }</h3><p>${esc(v.tecnologia)} · ${v.potencia_mw ?? "—"} MW</p><p>${
                            esc(v.municipio || v.regiao || "Localização: —")
                        }</p></article>`
                    ).join("");
            }
            function renderCriteria(d) {
                el("criteria").innerHTML = (d.matriz_criticidade?.dimensoes || []).map((x) =>
                    `<article class="criterion"><small>Dimensão</small><h3>${
                        esc(x.id.replaceAll("_", " "))
                    }</h3><p>${esc((x.indicadores || []).slice(0, 5).join(" · "))}</p></article>`
                ).join("");
            }
            function renderMeasures(d) {
                const m = d.mitigacao_e_monitorizacao || {};
                const names = {
                    solar: "Solar",
                    eolica: "Eólica",
                    baterias: "Baterias",
                    comunidade: "Comunidade",
                    desativacao: "Desativação",
                };
                el("measures").innerHTML = Object.entries(m).map(([k, v]) =>
                    `<article class="measure"><small>Medidas</small><h3>${names[k] || k}</h3><p>${
                        esc((v || []).slice(0, 5).join(" · "))
                    }</p></article>`
                ).join("");
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return /ZAER|solar|eólic|renovável|licenciamento|consulta pública|território|fotovolta/i
                        .test(
                            [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(
                                Boolean,
                            ).join(" "),
                        );
                }).slice(0, 6);
                el("news").innerHTML = selected.map((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(window.BioCultureI18n?.date(n.data) || n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
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
        