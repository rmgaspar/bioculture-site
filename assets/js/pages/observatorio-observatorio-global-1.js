async function applyLanguage(lang) {
                if (!lang) lang = localStorage.getItem("selected_lang") || "pt";
                try {
                    const response = await fetch(`/assets/lang/${lang}.json`);
                    if (!response.ok) return;
                    const t = await response.json();

                    // 1. Traduz elementos com data-i18n
                    document.querySelectorAll("[data-i18n]").forEach((el) => {
                        const key = el.getAttribute("data-i18n");
                        const text = key.split(".").reduce((obj, i) => (obj ? obj[i] : null), t);
                        if (text) el.innerHTML = text;
                    });

                    const selector = document.getElementById("lang-selector");
                    if (selector) selector.value = lang;
                    localStorage.setItem("selected_lang", lang);
                } catch (err) {
                    console.error("Erro i18n:", err);
                }
            }

            const chartPalette = ["#ef5350", "#444444", "#ffa726", "#42a5f5", "#5c6bc0"];

            function escapeHtml(value) {
                return String(value ?? "").replace(/[&<>'"]/g, (char) =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        "'": "&#39;",
                        '"': "&quot;",
                    })[char]);
            }

            function latest(series) {
                const index = series.valores.length - 1;
                return { year: series.anos[index], value: series.valores[index] };
            }

            function percentageChange(series) {
                const first = series.valores[0];
                const last = series.valores[series.valores.length - 1];
                if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null;
                return ((last - first) / Math.abs(first)) * 100;
            }

            function formatNumber(value, digits = 1) {
                return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits }).format(value);
            }

            function renderSummary(data) {
                const series = data.series_temporais;
                const temp = latest(series.temperatura_global);
                const co2 = latest(series.co2_mauna_loa);
                const sea = latest(series.nivel_medio_mar_satelite);
                const iceChange = percentageChange(series.gelo_marinho_artico_minimo);
                const items = [
                    {
                        title: "Temperatura global",
                        value: `${temp.value >= 0 ? "+" : ""}${formatNumber(temp.value, 2)} °C`,
                        text: `Anomalia em ${temp.year}, relativa à média 1951–1980.`,
                        period: series.temperatura_global.cobertura,
                    },
                    {
                        title: "CO₂ atmosférico",
                        value: `${formatNumber(co2.value, 2)} ppm`,
                        text: `Média anual em ${co2.year} na estação de referência de Mauna Loa.`,
                        period: series.co2_mauna_loa.cobertura,
                    },
                    {
                        title: "Nível médio do mar",
                        value: `+${formatNumber(sea.value, 1)} mm`,
                        text: `Variação global acumulada desde o início da série de satélite.`,
                        period: series.nivel_medio_mar_satelite.cobertura,
                    },
                    {
                        title: "Gelo marinho do Ártico",
                        value: `${formatNumber(iceChange, 1)}%`,
                        text: "Variação entre o primeiro e o último ponto desta seleção.",
                        period: series.gelo_marinho_artico_minimo.cobertura,
                    },
                ];
                document.getElementById("summary-grid").innerHTML = items.map((item) => `
                <article class="summary-item">
                    <h5>${escapeHtml(item.title)}</h5>
                    <span class="summary-value">${escapeHtml(item.value)}</span>
                    <p>${escapeHtml(item.text)}</p>
                    <span class="summary-period">${escapeHtml(item.period)}</span>
                </article>`).join("");
            }

            function renderCharts(seriesObject) {
                const grid = document.getElementById("charts-grid");
                const entries = Object.entries(seriesObject);
                grid.innerHTML = entries.map(([id, series], index) => `
                <article class="chart-box">
                    <h5>${escapeHtml(series.nome)}</h5>
                    <div class="chart-meta">${escapeHtml(series.cobertura)} · ${
                    escapeHtml(series.unidade)
                } · ${escapeHtml(series.frequencia)}</div>
                    <div class="chart-container"><canvas id="series-${escapeHtml(id)}"></canvas></div>
                    <p class="chart-explanation">${escapeHtml(series.interpretacao)}</p>
                    <a class="chart-source-subtle" href="${
                    escapeHtml(series.url)
                }" target="_blank" rel="noopener noreferrer">Fonte: ${escapeHtml(series.fonte)}</a>
                </article>`).join("");

                entries.forEach(([id, series], index) => {
                    const color = chartPalette[index % chartPalette.length];
                    new Chart(document.getElementById(`series-${id}`), {
                        type: "line",
                        data: {
                            labels: series.anos,
                            datasets: [{
                                label: series.unidade,
                                data: series.valores,
                                borderColor: color,
                                backgroundColor: `${color}18`,
                                borderWidth: 2.5,
                                pointRadius: 3,
                                pointHoverRadius: 6,
                                fill: true,
                                tension: 0.25,
                                spanGaps: false,
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
                                            `${formatNumber(context.parsed.y, 2)} ${series.unidade}`,
                                    },
                                },
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: {
                                        font: { size: 9 },
                                        maxRotation: 0,
                                        autoSkip: true,
                                        maxTicksLimit: 9,
                                    },
                                },
                                y: {
                                    ticks: {
                                        font: { size: 9 },
                                        callback: (value) =>
                                            `${formatNumber(value, 2)} ${series.unidade}`,
                                    },
                                },
                            },
                        },
                    });
                });
            }

            function renderContext(context) {
                const entries = Object.entries(context).filter(([, item]) =>
                    item.valores && Object.keys(item.valores).length
                );
                const grid = document.getElementById("context-grid");
                grid.innerHTML = entries.map(([id, item]) => `
                <article class="context-card">
                    <h3>${
                    id === "erosao_costeira"
                        ? "Erosão das praias arenosas"
                        : escapeHtml(id.replaceAll("_", " "))
                }</h3>
                    <span class="context-status">Dados medidos · ${escapeHtml(item.periodo)}</span>
                    ${
                    id === "erosao_costeira"
                        ? `<p><strong>24% das praias analisadas estavam em erosão superior a 0,5 metros por ano.</strong></p><p>Na mesma avaliação, 28% avançavam e 48% permaneciam estáveis. O comportamento varia de costa para costa.</p>`
                        : `<p>${escapeHtml(item.mensagem)}</p>`
                }
                    <a class="context-source" href="${
                    escapeHtml(item.url)
                }" target="_blank" rel="noopener noreferrer">${escapeHtml(item.fonte)} ↗</a>
                </article>`).join("");
            }

            function renderPrinciples() {
                const principles = [
                    "Compare valores apenas quando usam a mesma unidade e o mesmo período de referência.",
                    "Uma subida ou descida num único ano não representa, por si só, uma tendência.",
                    "Os valores globais escondem diferenças importantes entre países e regiões.",
                    "As ligações das fontes permitem consultar a metodologia e os dados originais.",
                ];
                document.getElementById("principles-list").innerHTML = principles.map((item) =>
                    `<li>${escapeHtml(item)}</li>`
                ).join("");
            }

            function renderReports(reports) {
                const usefulReports = reports.filter((report) => report.titulo !== "Solo e água");
                document.getElementById("reports-grid").innerHTML = usefulReports.map((report) => `
                <article class="report-card">
                    <h3>${escapeHtml(report.titulo)}</h3>
                    <p>${escapeHtml(report.conclusao)}</p>
                    <details>
                        <summary>Ver fonte e nota técnica</summary>
                        <p><strong>Fonte:</strong> ${escapeHtml(report.evidencia)}</p>
                        <p><strong>Importante:</strong> ${escapeHtml(report.cautela)}</p>
                    </details>
                </article>`).join("");
            }

            function renderOverview(data) {
                const series = data.series_temporais;
                const temp = latest(series.temperatura_global);
                const co2 = latest(series.co2_mauna_loa);
                const sea = latest(series.nivel_medio_mar_satelite);
                const ice = percentageChange(series.gelo_marinho_artico_minimo);
                document.getElementById("correlation-text").innerHTML =
                    `<p>Os indicadores apontam na mesma direção: o planeta está mais quente e a atmosfera contém mais gases com efeito de estufa. No último valor disponível, a temperatura global atingiu <strong>${
                        temp.value >= 0 ? "+" : ""
                    }${
                        formatNumber(temp.value, 2)
                    } °C</strong> face à média de 1951–1980 e o CO₂ chegou a <strong>${
                        formatNumber(co2.value, 1)
                    } ppm</strong>. Desde 1993, o nível médio do mar subiu cerca de <strong>${
                        formatNumber(sea.value, 0)
                    } mm</strong>; na seleção apresentada, o mínimo de gelo marinho do Ártico diminuiu <strong>${
                        formatNumber(Math.abs(ice), 1)
                    }%</strong>.</p>`;
            }

            async function loadGlobal() {
                const summary = document.getElementById("summary-grid");
                try {
                    const res = await fetch("/data/observatorio_global.json?v=" + Date.now());
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (!data.series_temporais || !Object.keys(data.series_temporais).length) {
                        throw new Error("O ficheiro não contém séries temporais utilizáveis.");
                    }
                    document.getElementById("page-title").innerText = data.titulo ||
                        "Relatório de Impacto Planetário";
                    renderOverview(data);
                    renderSummary(data);
                    renderCharts(data.series_temporais);
                    renderContext(data.indicadores_contextuais || {});
                    renderPrinciples();
                    renderReports(data.relatorios || []);
                } catch (err) {
                    console.error("Erro ao carregar o observatório global:", err);
                    summary.innerHTML =
                        `<div class="data-error"><strong>Não foi possível carregar os indicadores.</strong><br>${
                            escapeHtml(err.message)
                        }</div>`;
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                const savedLang = localStorage.getItem("selected_lang") || "pt";
                applyLanguage(savedLang).then(() => {
                    loadGlobal();
                });
                document.addEventListener("change", (e) => {
                    if (e.target.id === "lang-selector") applyLanguage(e.target.value);
                });
            });
