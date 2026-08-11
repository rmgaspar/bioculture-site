const el = (id) => document.getElementById(id),
                safe = (v) => v === undefined || v === null || v === "" ? "—" : String(v);
            function source(data, id) {
                const x = data.fontes?.find((f) => f.id === id);
                return x
                    ? [x.entidade, x.titulo].filter(Boolean).join(" · ")
                    : "Fonte indicada no conjunto de dados";
            }
            function metric(x, data) {
                let value = x.valor !== undefined ? x.valor : x.valor_final;
                let unit = x.unidade || "";
                return `<article class="metric"><h3>${x.titulo}</h3><strong>${safe(value)}${
                    unit.startsWith("%") ? "%" : ""
                }</strong><p>${
                    safe(x.leitura || `${unit} · ${x.periodo || `${x.ano_inicial}–${x.ano_final}`}`)
                }</p><span class="source">${source(data, x.fonte_id)}</span></article>`;
            }
            function renderMetrics(data) {
                el("metrics").innerHTML = (data.destaques || []).slice(0, 3).map((x) => metric(x, data))
                    .join("");
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                const b = info.biomas || {};
                el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                el("local-note").textContent =
                    "O perfil abaixo é um enquadramento regional e não substitui uma análise da parcela.";
                el("local-soil").textContent = safe(b.solo);
                el("local-texture").textContent = safe(b.textura);
                el("local-ph").textContent = safe(b.ph_solo);
            }
            function renderIndicators(data) {
                const ids = [
                    "carbono_organico",
                    "ph",
                    "textura",
                    "densidade_aparente",
                    "agua_disponivel",
                    "biodiversidade",
                ];
                el("indicators").innerHTML = ids.map((id) => data.indicadores.find((x) => x.id === id))
                    .filter(Boolean).map((x) =>
                        `<article class="card"><span class="tag">${
                            safe(x.unidade_preferida)
                        }</span><h3>${x.nome}</h3><p>${x.o_que_mede} ${x.importancia}</p><ul class="small-list"><li>${x.cuidados}</li></ul></article>`
                    ).join("");
            }
            function renderThreats(data) {
                const ids = [
                    "erosao_hidrica",
                    "compactacao",
                    "perda_carbono",
                    "selagem",
                    "salinizacao",
                    "incendio",
                ];
                el("threats").innerHTML = ids.map((id) => data.ameacas.find((x) => x.id === id)).filter(
                    Boolean,
                ).map((x) =>
                    `<article class="card"><span class="tag">Ameaça</span><h3>${x.nome}</h3><p><strong>Sinais:</strong> ${
                        (x.sinais || []).join(" · ")
                    }</p><ul class="small-list">${
                        (x.respostas || []).slice(0, 4).map((y) => `<li>${y}</li>`).join("")
                    }</ul></article>`
                ).join("");
            }
            function renderPractices(data) {
                el("practices").innerHTML = (data.praticas_regenerativas || []).slice(0, 6).map((x) =>
                    `<article class="card practice"><span class="tag">Prática</span><h3>${x.pratica}</h3><p>${x.aplicacao}</p><ul class="small-list">${
                        (x.beneficios || []).map((y) => `<li>${y}</li>`).join("")
                    }</ul></article>`
                ).join("");
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = n.pt || n;
                    return /solo|terra|eros|desertifica|contamina|regenerativ|compost|agricultura/i
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
                    const [soil, loc, news] = await Promise.all(
                        ["solo_stats", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    renderMetrics(soil);
                    renderLocal(loc);
                    renderIndicators(soil);
                    renderThreats(soil);
                    renderPractices(soil);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados do solo:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
