
            const palette = ["#ef5350", "#2e7d32", "#42a5f5", "#ffa726"];
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
            const formatNumber = (value, digits = 0) =>
                new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits }).format(value);
            const entries = (series) =>
                Object.entries(series.valores).map(([year, value]) => ({ year, value })).filter(
                    (point) => typeof point.value === "number",
                );
            const source = (series) => series.fontes?.[0] || null;

            function renderSummary(data) {
                const burned = entries(data.series_temporais.area_ardida_continente).at(-1);
                const temp = entries(data.series_temporais.temperatura_media_anual_continente).at(-1);
                const desert = data.indicadores_territoriais.suscetibilidade_desertificacao;
                const coast = data.indicadores_territoriais.erosao_costeira;
                const cards = [
                    [
                        "Temperatura média",
                        `${formatNumber(temp.value, 2)} °C`,
                        `${temp.year} · Portugal continental`,
                    ],
                    [
                        "Área ardida",
                        `${formatNumber(burned.value)} ha`,
                        `${burned.year} · valor provisório no Continente`,
                    ],
                    ["Desertificação", `${desert.valor}%`, "do território continental suscetível"],
                    [
                        "Costa em erosão",
                        `${coast.costa_baixa_arenosa_em_erosao_percent}%`,
                        "da costa baixa e arenosa continental",
                    ],
                ];
                document.getElementById("summary-grid").innerHTML = cards.map(([title, value, note]) =>
                    `<article class="summary-card"><h3>${
                        escapeHtml(title)
                    }</h3><span class="summary-value">${escapeHtml(value)}</span><p>${
                        escapeHtml(note)
                    }</p></article>`
                ).join("");
                document.getElementById("overview-text").innerHTML =
                    `Os dados disponíveis mostram três pressões claras: incêndios rurais muito variáveis e severos em alguns anos, mais de metade do Continente suscetível à desertificação e uma parte significativa da costa arenosa em erosão. Ao mesmo tempo, Portugal tem hoje menos explorações agrícolas, embora a superfície utilizada tenha diminuído muito menos — sinal de concentração da atividade em unidades maiores.`;
            }

            function addChart(canvas, series, index, type = "line") {
                const points = entries(series);
                new Chart(canvas, {
                    type,
                    data: {
                        labels: points.map((point) => point.year),
                        datasets: [{
                            data: points.map((point) => point.value),
                            borderColor: palette[index % palette.length],
                            backgroundColor: type === "bar"
                                ? `${palette[index % palette.length]}bb`
                                : `${palette[index % palette.length]}18`,
                            borderWidth: 2.5,
                            pointRadius: 3,
                            pointHoverRadius: 6,
                            fill: type === "line",
                            tension: .2,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: "index" },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (context) =>
                                        `${formatNumber(context.parsed.y, 1)} ${series.unidade}`,
                                },
                            },
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 9 }, autoSkip: true, maxTicksLimit: 9 },
                            },
                            y: {
                                beginAtZero: type === "bar",
                                ticks: { font: { size: 9 }, callback: (value) => formatNumber(value) },
                            },
                        },
                    },
                });
            }

            function renderCharts(data) {
                const selected = [
                    [
                        "area_ardida_continente",
                        "bar",
                        "Os totais mudam fortemente de ano para ano. 2017 foi excecional e 2025 ainda é provisório.",
                    ],
                    [
                        "exploracoes_agricolas",
                        "line",
                        "O número de explorações diminuiu bastante desde 1989; este indicador deve ser lido juntamente com a área agrícola.",
                    ],
                    [
                        "superficie_agricola_utilizada",
                        "line",
                        "A área utilizada variou menos do que o número de explorações, sugerindo unidades agrícolas de maior dimensão média.",
                    ],
                    [
                        "parque_veiculos_motorizados",
                        "line",
                        "O parque motorizado aumentou no período mais recente disponível e representa pressão sobre energia, emissões e espaço urbano.",
                    ],
                ];
                const grid = document.getElementById("chart-grid");
                grid.innerHTML = selected.map(([id, type, explanation], index) => {
                    const series = data.series_temporais[id];
                    const link = source(series);
                    return `<article class="chart-box"><h3>${
                        escapeHtml(series.titulo)
                    }</h3><div class="chart-meta">${escapeHtml(series.ambito)} · ${
                        escapeHtml(series.unidade)
                    }</div><div class="chart-container"><canvas id="pt-chart-${index}"></canvas></div><p class="chart-explanation">${
                        escapeHtml(explanation)
                    }</p>${
                        link
                            ? `<a class="source-link" href="${
                                escapeHtml(link.url)
                            }" target="_blank" rel="noopener noreferrer">Fonte: ${
                                escapeHtml(link.nome)
                            } ↗</a>`
                            : ""
                    }</article>`;
                }).join("");
                selected.forEach(([id, type], index) =>
                    addChart(
                        document.getElementById(`pt-chart-${index}`),
                        data.series_temporais[id],
                        index,
                        type,
                    )
                );
            }

            function renderTerritory(data) {
                const indicators = data.indicadores_territoriais;
                const desert = indicators.suscetibilidade_desertificacao;
                const coast = indicators.erosao_costeira;
                const flood = indicators.areas_risco_inundacao;
                const cards = [
                    [
                        "Suscetibilidade à desertificação",
                        `${desert.valor}% do Continente`,
                        desert.descricao,
                        desert.fontes[0],
                    ],
                    [
                        "Erosão costeira",
                        `≈ ${formatNumber(coast.extensao_em_erosao_aproximada_km)} km`,
                        `${
                            formatNumber(coast.perda_area_1958_2023_ha)
                        } hectares de área costeira perdidos entre 1958 e 2023.`,
                        coast.fontes[0],
                    ],
                    [
                        "Risco de inundação",
                        `${flood.valor} áreas identificadas`,
                        `Áreas de risco potencial significativo no ciclo ${flood.periodo}.`,
                        flood.fontes[0],
                    ],
                ];
                document.getElementById("territory-grid").innerHTML = cards.map((
                    [title, value, text, link],
                ) => `<article class="territory-card"><h3>${
                    escapeHtml(title)
                }</h3><span class="territory-value">${escapeHtml(value)}</span><p>${
                    escapeHtml(text)
                }</p><a class="source-link" href="${
                    escapeHtml(link.url)
                }" target="_blank" rel="noopener noreferrer">Fonte: ${
                    escapeHtml(link.nome)
                } ↗</a></article>`).join("");
            }

            function renderConclusions(data) {
                const allowed = new Set(["fogo", "solo", "mobilidade", "litoral"]);
                document.getElementById("conclusion-grid").innerHTML = data.relatorios.filter(
                    (report) => allowed.has(report.id),
                ).map((report) =>
                    `<article class="conclusion-card"><h3>${escapeHtml(report.titulo)}</h3><p>${
                        escapeHtml(report.resumo.split(". ")[0] + ".")
                    }</p><details><summary>Compreender melhor</summary><p>${
                        escapeHtml(report.resumo)
                    }</p></details></article>`
                ).join("");
            }

            async function loadObservatory() {
                try {
                    const response = await fetch("/data/observatorio_terra.json?v=" + Date.now());
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    if (!data.series_temporais || !data.indicadores_territoriais) {
                        throw new Error("O ficheiro não contém indicadores utilizáveis.");
                    }
                    document.getElementById("page-title").textContent = data.metadados?.titulo ||
                        "Portugal em dados";
                    renderSummary(data);
                    renderCharts(data);
                    renderTerritory(data);
                    renderConclusions(data);
                } catch (error) {
                    console.error("Erro ao carregar o Observatório de Portugal:", error);
                    document.getElementById("summary-grid").innerHTML =
                        `<div class="data-error"><strong>Não foi possível carregar os indicadores.</strong><br>${
                            escapeHtml(error.message)
                        }</div>`;
                }
            }

            fetch("/sidebar-content.html").then((response) => response.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
            }).catch(() => {});
            loadObservatory();
        