async function initObservatorio() {
                try {
                    const response = await fetch("observatorio.json");
                    const data = await response.json();
                    const ds = data.datasets;

                    // Alinhamento dinâmico de anos (Eixo X)
                    const anos = [
                        ...new Set([
                            ...Object.keys(ds.incendios),
                            ...Object.keys(ds.agricultura),
                            ...Object.keys(ds.temperatura),
                        ]),
                    ].sort();

                    const ctx = document.getElementById("chartBioCultura").getContext("2d");

                    new Chart(ctx, {
                        type: "line",
                        data: {
                            labels: anos,
                            datasets: [
                                {
                                    label: "Área Ardida (ha)",
                                    data: anos.map((a) => ds.incendios[a] || null),
                                    borderColor: "#e74c3c",
                                    backgroundColor: "rgba(231, 76, 60, 0.1)",
                                    yAxisID: "y",
                                    borderWidth: 2,
                                    tension: 0.3,
                                },
                                {
                                    label: "Prod. Agrícola (Índice)",
                                    data: anos.map((a) => ds.agricultura[a] || null),
                                    borderColor: "#2ecc71",
                                    yAxisID: "y1",
                                    borderWidth: 2,
                                    tension: 0.3,
                                },
                                {
                                    label: "Temp. Média (°C)",
                                    data: anos.map((a) => ds.temperatura[a] || null),
                                    borderColor: "#f1c40f",
                                    yAxisID: "y1",
                                    borderWidth: 2,
                                    tension: 0.3,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    type: "linear",
                                    position: "left",
                                    title: { display: true, text: "Hectares (Incêndios)" },
                                },
                                y1: {
                                    type: "linear",
                                    position: "right",
                                    title: { display: true, text: "Índice / Graus" },
                                    grid: { drawOnChartArea: false },
                                },
                            },
                            plugins: {
                                legend: { position: "bottom" },
                            },
                        },
                    });
                } catch (e) {
                    console.error("Erro ao carregar dados do observatório:", e);
                }
            }

            // Carregar Sidebar e Gráfico
            $(function () {
                $("#sidebar-content").load("sidebar-content.html"); // Mantendo a lógica do teu projeto
                initObservatorio();
            });
