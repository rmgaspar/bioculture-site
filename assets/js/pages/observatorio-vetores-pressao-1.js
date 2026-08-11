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
                new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits }).format(value);

            function renderSummary(data) {
                const renewable = data.estatisticas.energia_renovavel;
                const dependency = data.estatisticas.dependencia_energetica;
                const solar = data.zaer.areas_propícias_proposta.solar_fotovoltaica;
                const wind = data.zaer.areas_propícias_proposta.eolica_onshore;
                const contracts = data.estatisticas.concessoes_ativas;
                const cards = [
                    [
                        "Eletricidade renovável",
                        `${format(renewable.dados.at(-1))}%`,
                        `${renewable.labels.at(-1)} · produção bruta nacional`,
                    ],
                    [
                        "Dependência energética",
                        `${format(dependency.dados.at(-1))}%`,
                        `${dependency.labels.at(-1)} · energia importada`,
                    ],
                    [
                        "Área proposta para solar",
                        `${format(solar.valor, 0)} ha`,
                        "área potencialmente propícia, não aprovada",
                    ],
                    [
                        "Área proposta para eólica",
                        `${format(wind.valor, 0)} ha`,
                        "área potencialmente propícia, não aprovada",
                    ],
                    [
                        "Contratos mineiros",
                        `${contracts.dados[0]}`,
                        "registos na tabela pública; não são minas ativas",
                    ],
                ];
                document.getElementById("summary-grid").innerHTML = cards.map(([title, value, note]) =>
                    `<article class="summary-card"><h3>${
                        escapeHtml(title)
                    }</h3><span class="summary-value">${escapeHtml(value)}</span><p>${
                        escapeHtml(note)
                    }</p></article>`
                ).join("");
                document.getElementById("overview-text").textContent = data.resumo;
            }

            function renderCharts(data) {
                const renewable = data.estatisticas.energia_renovavel;
                const dependency = data.estatisticas.dependencia_energetica;
                const solar = data.zaer.areas_propícias_proposta.solar_fotovoltaica;
                const wind = data.zaer.areas_propícias_proposta.eolica_onshore;
                document.getElementById("chart-grid").innerHTML = `
                <article class="chart-box"><h3>Renováveis e dependência energética</h3><div class="chart-meta">Portugal · percentagem · 2004–2024</div><div class="chart-container"><canvas id="chart-energy"></canvas></div><p>As duas linhas usam a mesma escala, mas medem realidades diferentes: produção elétrica renovável e dependência de energia importada.</p><a class="source-link" href="${
                    escapeHtml(renewable.fontes[0].url)
                }" target="_blank" rel="noopener noreferrer">Fonte: ${
                    escapeHtml(renewable.fontes[0].nome)
                } ↗</a></article>
                <article class="chart-box"><h3>Áreas potencialmente propícias para ZAER</h3><div class="chart-meta">Portugal continental · hectares · proposta de 2026</div><div class="chart-container"><canvas id="chart-zaer"></canvas></div><p>As áreas podem sobrepor-se. Não representam ocupação efetiva, licenças concedidas nem projetos aprovados.</p><a class="source-link" href="${
                    escapeHtml(data.zaer.fontes[0].url)
                }" target="_blank" rel="noopener noreferrer">Fonte: ${
                    escapeHtml(data.zaer.fontes[0].nome)
                } ↗</a></article>`;
                new Chart(document.getElementById("chart-energy"), {
                    type: "line",
                    data: {
                        labels: renewable.labels,
                        datasets: [{
                            label: "Eletricidade renovável",
                            data: renewable.dados,
                            borderColor: "#4caf50",
                            backgroundColor: "#4caf5018",
                            tension: .2,
                            pointRadius: 4,
                        }, {
                            label: "Dependência energética",
                            data: dependency.dados,
                            borderColor: "#c62828",
                            backgroundColor: "#c6282818",
                            tension: .2,
                            pointRadius: 4,
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: "index" },
                        plugins: {
                            legend: { display: true, labels: { boxWidth: 12, font: { size: 10 } } },
                            tooltip: {
                                callbacks: {
                                    label: (context) =>
                                        `${context.dataset.label}: ${format(context.parsed.y)}%`,
                                },
                            },
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { callback: (value) => `${value}%` },
                            },
                        },
                    },
                });
                new Chart(document.getElementById("chart-zaer"), {
                    type: "bar",
                    data: {
                        labels: ["Solar fotovoltaica", "Eólica terrestre"],
                        datasets: [{
                            data: [solar.valor, wind.valor],
                            backgroundColor: ["#ffa726", "#607d8b"],
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: { label: (context) => `${format(context.parsed.y, 0)} ha` },
                            },
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: { beginAtZero: true, ticks: { callback: (value) => format(value, 0) } },
                        },
                    },
                });
            }

            function renderTerritories(data) {
                const continent = data.territorio.continente;
                const azores = data.territorio.acores;
                const madeira = data.territorio.madeira;
                const cards = [
                    [
                        "Continente",
                        "PSZAER 2026",
                        `${continent.zaer} ${continent.mineracao}`,
                        data.zaer.fontes[0],
                    ],
                    [
                        "Açores",
                        `≈ ${format(azores.energia.quota_renovavel_aproximada, 0)}% renovável`,
                        `Sistema insular; a geotermia representa aproximadamente ${
                            format(azores.energia.geotermia_aproximada, 0)
                        }%.`,
                        azores.fontes[0],
                    ],
                    [
                        "Madeira",
                        `${format(madeira.energia_2024.renovavel_sem_rsu_percent)}% renovável`,
                        `Em 2024, a produção térmica representou ${
                            format(madeira.energia_2024.termica_percent)
                        }% da eletricidade regional.`,
                        madeira.fontes[0],
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

            function renderAnalysis(data) {
                document.getElementById("analysis-grid").innerHTML = data.analise.map((item) => {
                    const sentences = item.texto.split(". ");
                    return `<article class="analysis-card"><h3>${escapeHtml(item.topico)}</h3><p>${
                        escapeHtml(sentences[0] + ".")
                    }</p><details><summary>Compreender melhor</summary><p>${
                        escapeHtml(item.texto)
                    }</p></details></article>`;
                }).join("");
            }

            async function loadData() {
                try {
                    const response = await fetch("/data/pressao_vetores.json?v=" + Date.now());
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();
                    if (!data.estatisticas || !data.zaer || !data.territorio) {
                        throw new Error("O ficheiro não contém dados utilizáveis.");
                    }
                    document.getElementById("page-title").textContent = data.titulo ||
                        "Vetores de Pressão: Portugal";
                    renderSummary(data);
                    renderCharts(data);
                    renderTerritories(data);
                    renderAnalysis(data);
                } catch (error) {
                    console.error("Erro ao carregar os vetores nacionais:", error);
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
