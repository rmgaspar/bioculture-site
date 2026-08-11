
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
                    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-PT");
                };
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
                    `${solar.poligonos || "—"} polígonos a menos de 10 km de subestação`,
                ], [
                    "Eólica proposta",
                    Number(wind.area_ha || 0).toLocaleString("pt-PT") + " ha",
                    `${wind.poligonos || "—"} polígonos superiores a 20 ha`,
                ]].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                        x[2]
                    }</span></article>`
                ).join("");
                el("zaer-warning").textContent = (a.leitura || []).join(" ");
                el("snapshot-copy").textContent += ` Instantâneo observado em ${date(c.observado_em)}.`;
                const art = p.potencial_solar_artificializado || {};
                el("art-gw").textContent = `${art.total_capacidade_gw ?? "—"} GW`;
                el("art-twh").textContent = `${art.total_geracao_twh_ano ?? "—"} TWh/ano`;
            }
            function renderConsults(d) {
                const c = d.consultas_participa || {},
                    items = [...(c.abertas || []), ...(c.em_analise || []), ...(c.encerradas || [])];
                el("consults").innerHTML =
                    items.map((x) =>
                        `<article class="consult"><small class="${
                            /aberta/i.test(x.estado_consulta) ? "status-open" : "status-analysis"
                        }">${esc(x.estado_consulta)} · ${date(x.fim)}</small><h3>${
                            esc(x.titulo)
                        }</h3><p>${
                            esc((x.municipios || []).join(" · ") || x.ambito || x.tipologia)
                        }</p>${
                            x.participacoes !== undefined
                                ? `<p>${
                                    Number(x.participacoes).toLocaleString("pt-PT")
                                } participações</p>`
                                : ""
                        }${
                            x.alerta_qualidade
                                ? `<p><strong>Atenção:</strong> ${esc(x.alerta_qualidade)}</p>`
                                : ""
                        }${
                            x.url
                                ? `<a href="${
                                    esc(x.url)
                                }" target="_blank" rel="noopener">Abrir ficha original</a>`
                                : ""
                        }</article>`
                    ).join("") || '<p class="empty">—</p>';
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
                    const c = n.pt || n;
                    return /ZAER|solar|eólic|renovável|licenciamento|consulta pública|território|fotovolta/i
                        .test(
                            [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(
                                Boolean,
                            ).join(" "),
                        );
                }).slice(0, 6);
                el("news").innerHTML = selected.map((n) => {
                    const c = n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
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
        