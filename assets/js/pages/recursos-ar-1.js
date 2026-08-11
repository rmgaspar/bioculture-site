const el = (id) => document.getElementById(id),
                safe = (v) => v === undefined || v === null || v === "" ? "—" : String(v);
            function sourceName(v) {
                const s = v?.fonte || v?.fontes;
                if (Array.isArray(s)) return s.map((x) => x.nome).filter(Boolean).join(" · ");
                return typeof s === "string" ? s : (s?.nome || "Fonte indicada no conjunto de dados");
            }
            function metric(title, value, text, source) {
                return `<article class="metric"><h3>${title}</h3><strong>${value}</strong><p>${text}</p><span class="source">${source}</span></article>`;
            }
            function renderMetrics(data) {
                const s = data.estado_nacional_2024 || {}, o = s.ozono || {}, n = s.no2 || {};
                el("metrics").innerHTML = [
                    metric(
                        "Classe dominante",
                        safe(s.classe_dominante_iqar),
                        "Resultado agregado nacional do índice QualAr. Não representa todos os locais.",
                        sourceName(s),
                    ),
                    metric(
                        "Dias Fraco ou Mau",
                        safe(s.dias_fraco_ou_mau_percent) + "%",
                        "Percentagem nacional de dias nestas classes durante 2024.",
                        sourceName(s),
                    ),
                    metric(
                        "Ozono · informação",
                        safe(o.ocorrencias_limiar_informacao),
                        "Ocorrências do limiar de informação; não houve ocorrências do limiar de alerta.",
                        sourceName(s),
                    ),
                    metric(
                        "NO₂ · excedências anuais",
                        safe(n.excedencias_anuais?.length),
                        "Aglomerações acima da referência anual indicada no conjunto de dados.",
                        sourceName(s),
                    ),
                ].join("");
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (info) {
                    el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(
                        ", ",
                    );
                }
            }
            function renderPollutants(data) {
                const ids = ["pm25", "pm10", "no2", "o3", "so2", "nh3"];
                const labels = {
                    pm25: "PM2,5",
                    pm10: "PM10",
                    no2: "NO₂",
                    o3: "O₃",
                    so2: "SO₂",
                    nh3: "NH₃",
                };
                el("pollutants").innerHTML = ids.map((id) => {
                    const p = data.poluentes?.[id] || {};
                    const effects = [...(p.efeitos_saude || []), ...(p.efeitos_ecossistemas || [])]
                        .slice(0, 2);
                    return `<article class="pollutant"><span class="symbol">${labels[id]}</span><h3>${
                        safe(p.nome)
                    }</h3><p>${
                        safe(p.comportamento || p.origem_principal?.slice(0, 2).join(" · "))
                    }</p>${
                        effects.length
                            ? `<ul class="small-list">${
                                effects.map((x) => `<li>${x}</li>`).join("")
                            }</ul>`
                            : ""
                    }</article>`;
                }).join("");
            }
            function renderEpisodes(data) {
                const ids = [
                    "incendios",
                    "poeira-saariana",
                    "ozono-calor",
                    "vulcanismo-acores",
                    "polen",
                ];
                const selected = ids.map((id) => data.episodios_especiais?.find((x) => x.id === id))
                    .filter(Boolean);
                el("episodes").innerHTML = selected.map((x) =>
                    `<article class="episode"><span class="symbol">${
                        (x.poluentes || []).join(" · ") || "Biológico"
                    }</span><h3>${x.titulo}</h3><ul class="small-list">${
                        (x.orientacao || []).slice(0, 4).map((y) => `<li>${y}</li>`).join("")
                    }</ul>${x.nota ? `<p>${x.nota}</p>` : ""}</article>`
                ).join("");
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = n.pt || n;
                    return /qualidade do ar|poluiç|emiss|atmosf|pm2|pm10|ozono|fumo|incênd|poeira|respirat/i
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
                    }"><span>${safe(n.data)}</span><h3>${safe(c.titulo)}</h3><span>${
                        safe(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
            }
            async function start() {
                try {
                    const [air, loc, news] = await Promise.all(
                        ["qualidade_ar", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    renderMetrics(air);
                    renderLocal(loc);
                    renderPollutants(air);
                    renderEpisodes(air);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados do ar:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
