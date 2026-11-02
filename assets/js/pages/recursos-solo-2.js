
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
                if (typeof value === "number" && !Number.isInteger(value)) {
                    value = new Intl.NumberFormat(window.BioCultureI18n?.isEnglish ? "en-GB" : "pt-PT", { maximumFractionDigits: 1 }).format(value);
                }
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
                const words = ["solo*", "soil*", "erosão", "erosion", "desertific*", "degradação", "land degradation", "land restoration", "restauro do solo", "compost*", "húmus", "humus", "pastagem*", "pasture*", "rangeland*"];
                const selected = window.BioCultureNews.rank(items)
                    .filter((n) => window.BioCultureNews.about(n, words, ["solo"]))
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
                    const [soil, loc, news] = await Promise.all(
                        ["solo_stats", "bioregioes", "noticias"].map((f) =>
                            f === "bioregioes" ? window.BioCultureRegion.load() : fetch(`/data/${f}.json`).then((r) => {
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
        