
            const colors = ["#c62828", "#2e7d32", "#607d8b"];
            const isEnglish = new URLSearchParams(location.search).get("lang") === "en" || !!window.BioCultureI18n?.isEnglish;
            const pick = (item, key = "name") => item?.[`${key}_${isEnglish ? "en" : "pt"}`] || item?.[`${key}_pt`] || "";
            const escapeHtml = (value) =>
                String(value ?? "").replace(
                    /[&<>'"]/g,
                    (char) => ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        "'": "&#39;",
                        '"': "&quot;",
                    }[char]),
                );
            const format = (value, digits = 1) =>
                new Intl.NumberFormat(window.BioCultureI18n?.isEnglish ? "en-GB" : "pt-PT", { maximumFractionDigits: digits }).format(value);
            const getSource = (data, id) => data.fontes.find((item) => item.id === id);
            const highlight = (data, id) => data.destaques.find((item) => item.id === id);

            function renderSummary(data) {
                const material = highlight(data, "materiais");
                const climate = highlight(data, "clima_2025");
                const air = highlight(data, "ar");
                const ewaste = highlight(data, "ewaste");
                const dc = highlight(data, "datacenters");
                const cards = [
                    [
                        isEnglish ? "Material extraction" : "Extração de materiais",
                        `${format(material.valor)} ${isEnglish ? "billion t" : "mil milhões t"}`,
                        isEnglish ? "Global material extraction has more than tripled since 1970." : material.leitura,
                    ],
                    [
                        isEnglish ? "Global warming" : "Aquecimento global",
                        `+${format(climate.valor, 2)} °C`,
                        isEnglish ? `${climate.ano}, compared with 1850–1900` : `${climate.ano}, comparado com 1850–1900`,
                    ],
                    [
                        isEnglish ? "Air pollution" : "Poluição do ar",
                        `${format(air.valor)} ${isEnglish ? "million" : "milhões"}`,
                        isEnglish ? "attributable premature deaths per year" : "de mortes prematuras atribuídas por ano",
                    ],
                    [
                        isEnglish ? "Electronic waste" : "Resíduos eletrónicos",
                        `${format(ewaste.valor, 0)} ${isEnglish ? "million t" : "milhões t"}`,
                        isEnglish ? `${ewaste.ano}; only 22.3% had documented recycling` : `${ewaste.ano}; só 22,3% teve reciclagem documentada`,
                    ],
                    [
                        isEnglish ? "Data centres" : "Centros de dados",
                        `${dc.intervalo[0]}–${dc.intervalo[1]} TWh`,
                        isEnglish ? `${dc.ano}; estimated global electricity, excluding cryptocurrency mining` : `${dc.ano}; eletricidade global estimada, sem criptomoedas`,
                    ],
                ];
                document.getElementById("summary-grid").innerHTML = cards.map(([title, value, text]) =>
                    `<article class="summary-card"><h3>${
                        escapeHtml(title)
                    }</h3><span class="summary-value">${escapeHtml(value)}</span><p>${
                        escapeHtml(text)
                    }</p></article>`
                ).join("");
                document.getElementById("overview-text").textContent =
                    isEnglish ? "Environmental pressure does not come from one activity. Energy, food, transport, construction and consumption require materials, occupy land and generate emissions and waste. Responses must also be integrated: a technology can reduce fossil fuels while increasing demand for minerals, electricity, water or land." : "A pressão ambiental não vem de uma única atividade. Energia, alimentação, transportes, construção e consumo exigem materiais, ocupam território e produzem emissões e resíduos. As soluções também precisam de ser integradas: uma tecnologia pode reduzir combustíveis fósseis e, ao mesmo tempo, aumentar a procura de minerais, eletricidade, água ou solo.";
            }

            function makeBarChart(canvas, labels, datasets, unit) {
                new Chart(canvas, {
                    type: "bar",
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: datasets.length > 1 },
                            tooltip: {
                                callbacks: {
                                    label: (context) =>
                                        `${context.dataset.label ? context.dataset.label + ": " : ""}${
                                            format(context.parsed.y)
                                        } ${unit}`,
                                },
                            },
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                            y: {
                                beginAtZero: true,
                                ticks: { font: { size: 9 }, callback: (value) => format(value) },
                            },
                        },
                    },
                });
            }

            function renderCharts(data) {
                const sea = data.series.subida_nivel_mar;
                const forest = data.series.floresta_global;
                const waste = data.series.residuos_eletronicos;
                const cards = [
                    [
                        isEnglish ? "Average rate of global mean sea-level rise" : sea.titulo,
                        isEnglish ? "consolidated observation" : sea.natureza,
                        isEnglish ? "The average rate almost doubled between the two periods. These are period averages, not annual values." : "A taxa média quase duplicou entre os dois períodos. São médias, não valores de cada ano.",
                        sea.fonte_id,
                    ],
                    [
                        isEnglish ? "Net forest-area loss" : "Perda líquida de área florestal",
                        isEnglish ? "global assessment" : forest.natureza,
                        isEnglish ? "Annual net loss slowed but remained negative. It is not equivalent to gross deforestation." : "A perda líquida anual abrandou, mas continuou negativa. Não equivale à desflorestação bruta.",
                        forest.fonte_id,
                    ],
                    [
                        isEnglish ? "Global electronic waste" : waste.titulo,
                        isEnglish ? "global estimate" : waste.natureza,
                        isEnglish ? "The 2030 value is a projection and is visually separated from previous estimates." : "O valor de 2030 é uma projeção e aparece visualmente separado dos valores anteriores.",
                        waste.fonte_id,
                    ],
                ];
                document.getElementById("chart-grid").innerHTML = cards.map((item, index) => {
                    const link = getSource(data, item[3]);
                    return `<article class="chart-box"><h3>${
                        escapeHtml(item[0])
                    }</h3><div class="chart-meta">${
                        escapeHtml(item[1])
                    }</div><div class="chart-container"><canvas id="pressure-chart-${index}"></canvas></div><p>${
                        escapeHtml(item[2])
                    }</p><a class="source-link" href="${
                        escapeHtml(link.url)
                    }" target="_blank" rel="noopener noreferrer">${isEnglish ? "Source" : "Fonte"}: ${
                        escapeHtml(link.entidade)
                    } ↗</a></article>`;
                }).join("");
                makeBarChart(
                    document.getElementById("pressure-chart-0"),
                    sea.dados.map((item) => item.periodo),
                    [{ data: sea.dados.map((item) => item.valor), backgroundColor: colors[0] }],
                    isEnglish ? "mm/year" : sea.unidade,
                );
                makeBarChart(
                    document.getElementById("pressure-chart-1"),
                    forest.mudanca_liquida.map((item) => item.periodo),
                    [{
                        data: forest.mudanca_liquida.map((item) => Math.abs(item.valor)),
                        backgroundColor: colors[1],
                    }],
                    isEnglish ? "million ha/year lost" : "milhões ha/ano perdidos",
                );
                makeBarChart(document.getElementById("pressure-chart-2"), ["2010", "2022", "2030"], [{
                    label: isEnglish ? "Estimated" : "Estimado",
                    data: [waste.dados[0].valor_aproximado, waste.dados[1].valor, null],
                    backgroundColor: colors[2],
                }, {
                    label: isEnglish ? "Projection" : "Projeção",
                    data: [null, null, waste.projecoes[0].valor],
                    backgroundColor: "#ef9a9a",
                }], waste.unidade);
            }

            function renderVectors(data) {
                const selected = new Set([
                    "clima",
                    "biodiversidade",
                    "extracao",
                    "agua",
                    "alimentacao",
                    "digital",
                    "plasticos",
                    "oceanos",
                ]);
                document.getElementById("vector-grid").innerHTML = data.vetores.filter((item) =>
                    selected.has(item.id)
                ).map((item) =>
                    `<article class="vector-card"><h3>${
                        escapeHtml(item.titulo)
                    }</h3><p><strong>Principais causas:</strong> ${
                        escapeHtml(item.pressao.slice(0, 3).join(", "))
                    }.</p><p><strong>Resposta:</strong> ${
                        escapeHtml(item.respostas.slice(0, 3).join(", "))
                    }.</p></article>`
                ).join("");
            }

            function renderNexuses(data) {
                const english = {
                    "Alimentação–clima–natureza":["Food–climate–nature","Agricultural expansion, livestock, fertilisation and fishing connect food demand to emissions, water, nutrients and habitat conversion."],
                    "Energia–minerais–território":["Energy–minerals–territory","Energy technologies and grids require materials and space, while reducing emissions only when they replace more intensive systems."],
                    "Digital–energia–água":["Digital–energy–water","Computing increases electricity, equipment and cooling demand; impact depends on efficiency, climate, river basin and marginal electricity."],
                    "Cidade–solo–calor–cheia":["City–soil–heat–flood","Sealing and vegetation loss reduce infiltration and evapotranspiration, increasing runoff and local heat."],
                    "Clima–oceano–costas":["Climate–ocean–coasts","The ocean absorbs heat and CO₂, increasing temperature, acidification and sea level, with effects on ecosystems and coastal communities."]
                };
                document.getElementById("nexus-grid").innerHTML = data.nexos.map((item) => { const translated = english[item.titulo]; const caution = isEnglish ? "Interpret together with scale, location, substitution and the stated evidence boundaries." : item.cautela; return `<article class="nexus-card"><h3>${escapeHtml(isEnglish && translated ? translated[0] : item.titulo)}</h3><p>${escapeHtml(isEnglish && translated ? translated[1] : item.mecanismo)}</p><details><summary>${isEnglish ? "Important note" : "Nota importante"}</summary><p>${escapeHtml(caution)}</p></details></article>`; }).join("");
            }

            function translatePressureShell() {
                if (!isEnglish) return;
                document.documentElement.lang = "en";
                document.title = "bioCulture — Global Pressure Systems";
                const replacements = [
                    [".category-label", "Planetary pressure observatory"],
                    ["#page-title", "Planetary <br><em>Pressure Systems</em>"],
                    [".hero-intro", "The planet does not experience isolated sectors. It experiences extraction, occupation, emissions, pollution and waste accumulated in the same territory and along the same chain."],
                    [".overview h2", "The global picture in a few words"],
                    ["#system-chain .chapter", "01 · Material cycle"], ["#system-chain h2", "Pressure begins before the product"],
                    ["#system-chain .pressure-heading p", "Following the whole chain prevents impacts from disappearing between borders, suppliers and life-cycle stages."],
                    ["#pressure-systems .chapter", "02 · Systems"], ["#pressure-systems h2", "The great machines of transformation"],
                    ["#pressure-systems .pressure-heading p", "Filter by environmental dimension. Each card shows the dominant mechanism and links to the specialised observatory when available."],
                    ["#global-signals .chapter", "03 · Global signals"], ["#global-signals h2", "Magnitudes that do not fit one unit"],
                    ["#global-signals .pressure-heading p", "Cards keep climate, materials, health, waste and energy separate to avoid a false universal score."],
                    ["#method .chapter", "05 · Method"], ["#method h2", "How not to lose the planet in the numbers"],
                    ["#pressure-news .chapter", "06 · Latest"], ["#pressure-news h2", "Pressures in motion"],
                    ["#pressure-news .pressure-heading p", "Selected news on decisions, projects and chains that alter pressure on living systems."],
                    [".comparison-heading h2", "Comparisons supported by data"], [".comparison-heading p", "We do not draw false annual curves when only period averages or a few observations exist."],
                    [".reading-box h3", "How to interpret this data"], ["#connections h2", "How pressures connect"], ["#connections p", "Simple explanations of mechanisms; additional detail remains collapsed."]
                ];
                replacements.forEach(([selector, html]) => { const node = document.querySelector(selector); if (node) node.innerHTML = html; });
                document.querySelector(".pressure-nav").innerHTML = '<a href="#system-chain">Cycle</a><a href="#pressure-systems">Systems</a><a href="#global-signals">Indicators</a><a href="#planetary-state">State</a><a href="#connections">Connections</a><a href="#method">Method</a>';
                document.querySelector(".reading-box ul").innerHTML = "<li>Observed values, estimates and projections are identified separately.</li><li>A world average can conceal severe local impacts.</li><li>Production and consumption can occur in different regions because of trade.</li><li>Electricity, water and land use should not be converted using universal factors.</li>";
            }

            function renderPressureArchitecture(architecture) {
                document.getElementById("chain-grid").innerHTML = architecture.chain.map((item, index) =>
                    `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p></article>`
                ).join("");
                const filters = [{ id: "all", name_pt: "Todos", name_en: "All" }, ...architecture.dimensions];
                document.getElementById("dimension-filters").innerHTML = filters.map((item, index) =>
                    `<button type="button" class="${index === 0 ? "active" : ""}" data-dimension="${item.id}">${escapeHtml(pick(item))}</button>`
                ).join("");
                const drawSystems = (dimension = "all") => {
                    const systems = architecture.systems.filter(item => dimension === "all" || item.dimensions.includes(dimension));
                    document.getElementById("system-summary").textContent = `${systems.length} ${isEnglish ? "systems shown" : "sistemas apresentados"}`;
                    document.getElementById("system-grid").innerHTML = systems.map(item => {
                        const dimensionNames = item.dimensions.map(id => pick(architecture.dimensions.find(d => d.id === id))).join(" · ");
                        const status = item.status === "live" ? (isEnglish ? "Explore" : "Explorar") : item.status === "next" ? (isEnglish ? "Next in-depth page" : "Próximo aprofundamento") : (isEnglish ? "Mapped in this overview" : "Mapeado nesta síntese");
                        const content = `<small>${escapeHtml(pick(item, "kicker"))}</small><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p><div class="system-dimensions">${escapeHtml(dimensionNames)}</div><strong>${status}${item.status === "live" ? " ↗" : ""}</strong>`;
                        return item.href && item.status === "live" ? `<a class="system-card" href="${escapeHtml(item.href)}?lang=${isEnglish ? "en" : "pt"}">${content}</a>` : `<article class="system-card ${item.status}">${content}</article>`;
                    }).join("");
                };
                document.getElementById("dimension-filters").addEventListener("click", event => {
                    const button = event.target.closest("button"); if (!button) return;
                    document.querySelectorAll("#dimension-filters button").forEach(item => item.classList.toggle("active", item === button));
                    drawSystems(button.dataset.dimension);
                });
                drawSystems();
                document.getElementById("pressure-scope").textContent = architecture.meta[`scope_${isEnglish ? "en" : "pt"}`];
                document.getElementById("rule-grid").innerHTML = architecture.rules.map((item, index) => `<article><span>0${index + 1}</span><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p></article>`).join("");
            }

            function renderPressureSources(data) {
                document.getElementById("pressure-sources").innerHTML = data.fontes.slice(0, 12).map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.entidade)} · ${isEnglish ? "source" : "fonte"} ↗</a>`).join("");
            }

            function renderPressureNews() {
                fetch("/data/noticias.json").then(response => response.json()).then(items => {
                    const selected = items.filter(item => /clima|energia|minera|constru|urban|têxt|moda|indústr|resíduo|plást|pecuár|desflorest|biodivers/i.test([item.categoria, item.categoria_id, item.pt?.titulo, item.pt?.resumo, item.en?.titulo, item.en?.resumo].filter(Boolean).join(" "))).slice(0, 6);
                    document.getElementById("pressure-news-grid").innerHTML = selected.map(item => {
                        const content = isEnglish ? (item.en || item.pt || item) : (item.pt || item);
                        return `<a href="/observatorio/noticia-detalhe.html?id=${encodeURIComponent(item.id)}"><small>${escapeHtml(item.data || "")}</small><h3>${escapeHtml(content.titulo || "")}</h3><span>${escapeHtml(item.fonte || "bioCulture")}</span></a>`;
                    }).join("") || `<p>${isEnglish ? "No selected news at this time." : "Sem notícias selecionadas neste momento."}</p>`;
                }).catch(() => { document.getElementById("pressure-news-grid").innerHTML = `<p>${isEnglish ? "News could not be loaded." : "Não foi possível carregar as notícias."}</p>`; });
            }

            async function loadData() {
                try {
                    translatePressureShell();
                    const [response, architectureResponse] = await Promise.all([fetch("/data/vetores_pressao_global.json?v=3"), fetch("/data/pressure-systems-global.json?v=1")]);
                    if (!response.ok || !architectureResponse.ok) throw new Error(`HTTP ${response.status}/${architectureResponse.status}`);
                    const [data, architecture] = await Promise.all([response.json(), architectureResponse.json()]);
                    if (!data.destaques || !data.series || !data.vetores) {
                        throw new Error("O ficheiro não contém dados utilizáveis.");
                    }
                    renderSummary(data);
                    renderCharts(data);
                    renderNexuses(data);
                    renderPressureArchitecture(architecture);
                    renderPressureSources(data);
                    renderPressureNews();
                } catch (error) {
                    console.error("Erro ao carregar os vetores globais:", error);
                    document.getElementById("summary-grid").innerHTML =
                        `<div class="data-error"><strong>Não foi possível carregar os indicadores.</strong><br>${
                            escapeHtml(error.message)
                        }</div>`;
                }
            }
            fetch("/sidebar-content.html?v=19").then((response) => response.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
            }).catch(() => {});
            loadData();
