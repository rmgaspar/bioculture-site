
            const colors = ["#c62828", "#2e7d32", "#607d8b"];
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
                        "Extração de materiais",
                        `${format(material.valor)} mil milhões t`,
                        material.leitura,
                    ],
                    [
                        "Aquecimento global",
                        `+${format(climate.valor, 2)} °C`,
                        `${climate.ano}, comparado com 1850–1900`,
                    ],
                    [
                        "Poluição do ar",
                        `${format(air.valor)} milhões`,
                        "de mortes prematuras atribuídas por ano",
                    ],
                    [
                        "Resíduos eletrónicos",
                        `${format(ewaste.valor, 0)} milhões t`,
                        `${ewaste.ano}; só 22,3% teve reciclagem documentada`,
                    ],
                    [
                        "Centros de dados",
                        `${dc.intervalo[0]}–${dc.intervalo[1]} TWh`,
                        `${dc.ano}; eletricidade global estimada, sem criptomoedas`,
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
                    "A pressão ambiental não vem de uma única atividade. Energia, alimentação, transportes, construção e consumo exigem materiais, ocupam território e produzem emissões e resíduos. As soluções também precisam de ser integradas: uma tecnologia pode reduzir combustíveis fósseis e, ao mesmo tempo, aumentar a procura de minerais, eletricidade, água ou solo.";
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
                        sea.titulo,
                        sea.natureza,
                        "A taxa média quase duplicou entre os dois períodos. São médias, não valores de cada ano.",
                        sea.fonte_id,
                    ],
                    [
                        "Perda líquida de área florestal",
                        forest.natureza,
                        "A perda líquida anual abrandou, mas continuou negativa. Não equivale à desflorestação bruta.",
                        forest.fonte_id,
                    ],
                    [
                        waste.titulo,
                        waste.natureza,
                        "O valor de 2030 é uma projeção e aparece visualmente separado dos valores anteriores.",
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
                    }" target="_blank" rel="noopener noreferrer">Fonte: ${
                        escapeHtml(link.entidade)
                    } ↗</a></article>`;
                }).join("");
                makeBarChart(
                    document.getElementById("pressure-chart-0"),
                    sea.dados.map((item) => item.periodo),
                    [{ data: sea.dados.map((item) => item.valor), backgroundColor: colors[0] }],
                    sea.unidade,
                );
                makeBarChart(
                    document.getElementById("pressure-chart-1"),
                    forest.mudanca_liquida.map((item) => item.periodo),
                    [{
                        data: forest.mudanca_liquida.map((item) => Math.abs(item.valor)),
                        backgroundColor: colors[1],
                    }],
                    "milhões ha/ano perdidos",
                );
                makeBarChart(document.getElementById("pressure-chart-2"), ["2010", "2022", "2030"], [{
                    label: "Estimado",
                    data: [waste.dados[0].valor_aproximado, waste.dados[1].valor, null],
                    backgroundColor: colors[2],
                }, {
                    label: "Projeção",
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
                document.getElementById("nexus-grid").innerHTML = data.nexos.map((item) =>
                    `<article class="nexus-card"><h3>${escapeHtml(item.titulo)}</h3><p>${
                        escapeHtml(item.mecanismo)
                    }</p><details><summary>Nota importante</summary><p>${
                        escapeHtml(item.cautela)
                    }</p></details></article>`
                ).join("");
            }

            async function loadData() {
                try {
                    const response = await fetch("/data/vetores_pressao_global.json?v=" + Date.now());
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    if (!data.destaques || !data.series || !data.vetores) {
                        throw new Error("O ficheiro não contém dados utilizáveis.");
                    }
                    document.getElementById("page-title").textContent = data.metadados?.titulo ||
                        "Vetores de Pressão Planetária";
                    renderSummary(data);
                    renderCharts(data);
                    renderVectors(data);
                    renderNexuses(data);
                } catch (error) {
                    console.error("Erro ao carregar os vetores globais:", error);
                    document.getElementById("summary-grid").innerHTML =
                        `<div class="data-error"><strong>Não foi possível carregar os indicadores.</strong><br>${
                            escapeHtml(error.message)
                        }</div>`;
                }
            }
            fetch("/sidebar-content.html").then((response) => response.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
            }).catch(() => {});
            loadData();
        