
            const $id = (id) => document.getElementById(id),
                clean = (v) => v === undefined || v === null || v === "" ? "—" : String(v);
            function sourceName(item) {
                const s = item?.fonte || item?.fontes;
                if (Array.isArray(s)) {
                    return s.map((x) => x.nome || x.entidade).filter(Boolean).join(" · ") ||
                        "Fonte indicada no conjunto de dados";
                }
                return typeof s === "string"
                    ? s
                    : (s?.nome || s?.entidade || "Fonte indicada no conjunto de dados");
            }
            function findValue(obj, key) {
                if (!obj || typeof obj !== "object") return null;
                if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
                for (const v of Object.values(obj)) {
                    const x = findValue(v, key);
                    if (x !== null) return x;
                }
                return null;
            }
            function metric(title, value, text, source) {
                return `<article class="metric"><h3>${title}</h3><strong>${value}</strong><p>${text}</p><span class="source">${source}</span></article>`;
            }
            function renderMetrics(obs, soil) {
                const desert = obs?.indicadores_territoriais?.suscetibilidade_desertificacao || {};
                const flood = obs?.indicadores_territoriais?.areas_risco_inundacao || {};
                const rain = obs?.series_temporais?.precipitacao_anual_continente || {};
                const r24 = rain?.valores?.["2024"], r25 = rain?.valores?.["2025"];
                $id("metrics").innerHTML = [
                    metric(
                        "Desertificação",
                        clean(desert.valor ?? desert.percentagem) + "%",
                        "Território continental suscetível, segundo a normal climatológica indicada.",
                        sourceName(desert),
                    ),
                    metric(
                        "Risco de inundação",
                        clean(flood.valor ?? flood.numero),
                        "Áreas de risco potencial significativo no ciclo 2022–2027.",
                        sourceName(flood),
                    ),
                    metric(
                        "Precipitação anual",
                        clean(r24) + " mm",
                        "Continente, 2024. Valor anual isolado.",
                        sourceName(rain),
                    ),
                    metric(
                        "Precipitação anual",
                        clean(r25) + " mm",
                        "Continente, 2025. Valor anual isolado.",
                        sourceName(rain),
                    ),
                ].join("");
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                const b = info.biomas || {};
                $id("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                $id("local-desc").textContent =
                    "Este perfil descreve o solo e o enquadramento territorial disponível para a região selecionada.";
                $id("local-soil").textContent = clean(b.solo);
                $id("local-texture").textContent = clean(b.textura);
                $id("local-ph").textContent = clean(b.ph_solo);
            }
            function renderPractices(items) {
                const wanted = [
                    "rega-gota-a-gota",
                    "rega-profunda",
                    "captacao-chuva",
                    "olla",
                    "jardim-chuva",
                    "zonas-tampao",
                ];
                const selected = wanted.map((id) => items.find((x) => x.id === id)).filter(Boolean);
                $id("practices").innerHTML = selected.map((x, i) => {
                    const title = x.titulo || x.nome || "Prática";
                    const desc = x.resumo || x.descricao || x.introducao || "";
                    const raw = x.passos || x.como_fazer || x.aplicacao || [];
                    const steps = Array.isArray(raw) ? raw : [];
                    return `<article class="practice"><span class="tag">${
                        String(i + 1).padStart(2, "0")
                    }</span><h3>${title}</h3><p>${desc}</p>${
                        steps.length
                            ? `<details><summary>Ver como aplicar</summary><ol class="steps">${
                                steps.slice(0, 5).map((s) =>
                                    `<li>${
                                        typeof s === "string" ? s : (s.descricao || s.passo || "")
                                    }</li>`
                                ).join("")
                            }</ol></details>`
                            : ""
                    }</article>`;
                }).join("") || '<p class="empty">—</p>';
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = n.pt || n;
                    return /água|agua|water|seca|rio|aquífer|aquifer|hídric|hidric|inunda/i.test(
                        [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(Boolean)
                            .join(" "),
                    );
                }).slice(0, 6);
                $id("news").innerHTML = selected.map((n) => {
                    const c = n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${clean(n.data)}</span><h3>${clean(c.titulo)}</h3><span>${
                        clean(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias de água disponíveis neste momento.</p>';
            }
            async function start() {
                try {
                    const [loc, obs, soil, tips, news] = await Promise.all(
                        ["bioregioes", "observatorio_terra", "solo_stats", "dicas", "noticias"].map(
                            (f) =>
                                fetch(`/data/${f}.json`).then((r) => {
                                    if (!r.ok) throw Error(f);
                                    return r.json();
                                }),
                        ),
                    );
                    renderMetrics(obs, soil);
                    renderLocal(loc);
                    renderPractices(tips);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados da página:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                $id("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        