(function () {
    "use strict";
    var D = "/data/",
        en = !!window.BioCultureI18n?.isEnglish,
        $ = function (x) {
            return document.getElementById(x);
        },
        tr = function (a, b) {
            return en ? b : a;
        },
        fmt = function (v, d) {
            return new Intl.NumberFormat(en ? "en-GB" : "pt-PT", {
                maximumFractionDigits: d == null ? 1 : d,
            }).format(v);
        },
        load = function (n) {
            return fetch(D + n).then(function (r) {
                if (!r.ok) throw Error(n);
                return r.json();
            });
        };
    var tx = {
        "Observatório global · Energia": "Global observatory · Energy",
        "Energia para viver.": "Energy for living.",
        "Limites para respeitar.": "Limits to respect.",
        "A energia liga bem-estar, economia e clima. O desafio global é garantir acesso, reduzir desperdício e substituir fontes fósseis sem transferir custos para comunidades e sistemas vivos.":
            "Energy connects wellbeing, the economy and climate. The global challenge is to ensure access, reduce waste and replace fossil fuels without shifting costs to communities and living systems.",
        "Retrato global": "Global picture",
        "O acesso cresce, a transição permanece desigual":
            "Access is growing, the transition remains unequal",
        "Três indicadores dos ODS 7 permitem observar acesso à eletricidade, quota renovável no consumo final e energia necessária por unidade de economia.":
            "Three SDG 7 indicators track electricity access, the renewable share of final consumption and energy used per unit of economic output.",
        "A carregar dados…": "Loading data…",
        "Como ler:": "How to read:",
        "mais acesso e maior quota renovável são desejáveis; na intensidade energética, um valor mais baixo indica menor energia por unidade de atividade económica.":
            "more access and a higher renewable share are desirable; for energy intensity, a lower value means less energy per unit of economic activity.",
        Evolução: "Trends",
        "Três dimensões da transição": "Three dimensions of the transition",
        "As datas mais recentes diferem entre indicadores porque os calendários estatísticos e as fontes não são iguais.":
            "Latest dates differ because statistical calendars and sources are not the same.",
        "Acesso mundial à eletricidade": "Global access to electricity",
        "Percentagem da população com acesso, sem medir qualidade, preço ou continuidade do serviço.":
            "Share of the population with access, without measuring service quality, price or continuity.",
        "Renováveis no consumo final": "Renewables in final consumption",
        "Percentagem do consumo final de energia que vem de fontes renováveis. Subir é bom.":
            "Share of final energy consumption that comes from renewable sources. Higher is better.",
        "Intensidade energética": "Energy intensity",
        "Megajoules gastos por cada dólar de riqueza produzida (PPC de 2021). Descer é bom: menos energia para o mesmo resultado.":
            "Megajoules used per dollar of output (2021 PPP). Lower is better: less energy for the same result.",
        "Como ler os gráficos:": "How to read the charts:",
        "observa tendências de longo prazo e confirma sempre o ano de cada série.":
            "follow long-term trends and always check the year of each series.",
        "Países e territórios": "Countries and territories",
        "Mudar de escala": "Change scale",
        "Escolhe uma geografia para comparar os três indicadores. Lacunas são mostradas como ausência de dados e nunca preenchidas por nós.":
            "Choose a geography to compare the three indicators. Gaps are shown as missing data and are never filled by us.",
        "Explorar país ou território": "Explore a country or territory",
        "Ver energia em Portugal": "See energy in Portugal",
        "Escolha uma geografia": "Choose a geography",
        "Os indicadores e tendências aparecerão aqui.": "Indicators and trends will appear here.",
        "Sistema energético": "Energy system",
        "Do acesso à suficiência": "From access to sufficiency",
        "Uma transição robusta combina justiça energética, eficiência, descarbonização e proteção territorial.":
            "A robust transition combines energy justice, efficiency, decarbonisation and territorial protection.",
        Relatórios: "Reports",
        "O que as instituições observam": "What institutions observe",
        Atualidade: "Latest",
        "Energia em foco": "Energy in focus",
        Transparência: "Transparency",
        "Como ler estes dados": "How to read this data",
        "Anos diferentes": "Different years",
        "Acesso não é serviço": "Access is not service",
        "Renovável não é só eletricidade": "Renewable is not only electricity",
        "Sem preenchimento": "No gap filling",
    };
    if (en) {
        var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT),
            ns = [];
        while (w.nextNode()) ns.push(w.currentNode);
        ns.forEach(function (n) {
            var k = (n.nodeValue || "").trim();
            if (tx[k]) n.nodeValue = n.nodeValue.replace(k, tx[k]);
        });
    }
    if (en) {
        var txMore = {
                "01 · Aceder": "01 · Access",
                "Energia moderna, fiável e financeiramente suportável para todas as pessoas.":
                    "Modern, reliable and affordable energy for everyone.",
                "02 · Reduzir": "02 · Reduce",
                "Eliminar desperdício e melhorar edifícios, equipamentos, mobilidade e processos.":
                    "Eliminate waste and improve buildings, equipment, mobility and processes.",
                "03 · Substituir": "03 · Replace",
                "Abandonar combustíveis fósseis e aumentar eletrificação e renováveis adequadas ao lugar.":
                    "Phase out fossil fuels and expand electrification and renewables suited to place.",
                "04 · Proteger": "04 · Protect",
                "Considerar minerais, água, solo, biodiversidade, participação e repartição de benefícios.":
                    "Consider minerals, water, soil, biodiversity, participation and benefit sharing.",
                "A transição energética deve ser lida em conjunto com desenvolvimento, clima, redes, materiais e território.":
                    "The energy transition must be read together with development, climate, grids, materials and territory.",
                "Notícias selecionadas por relevância para eletricidade, renováveis, eficiência, redes e comunidades energéticas.":
                    "News selected for its relevance to electricity, renewables, efficiency, grids and energy communities.",
                "A carregar notícias…": "Loading news…",
                "Cada indicador apresenta o último valor disponível na respetiva série oficial.":
                    "Each indicator shows the latest available value in its official series.",
                "A ligação elétrica não descreve preço, estabilidade, potência disponível ou origem da eletricidade.":
                    "An electricity connection does not describe price, stability, available power or the electricity source.",
                "O indicador mede a quota no consumo final total, incluindo usos térmicos e transportes.":
                    "The indicator measures the share of total final consumption, including heat uses and transport.",
                "Registos sem valor foram excluídos; as lacunas não são inventadas nem interpoladas.":
                    "Records without values were excluded; gaps are neither invented nor interpolated.",
            },
            wm = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT),
            nm = [];
        while (wm.nextNode()) nm.push(wm.currentNode);
        nm.forEach(function (n) {
            var k = (n.nodeValue || "").trim();
            if (txMore[k]) n.nodeValue = n.nodeValue.replace(k, txMore[k]);
        });
        var hero = document.querySelector('.energy-hero [role="img"]');
        if (hero)
            hero.setAttribute(
                "aria-label",
                "Landscape of renewable energy, community and territory",
            );
        $("access-chart").setAttribute("aria-label", "Global electricity access trend");
        $("transition-chart").setAttribute("aria-label", "Global renewable share of final energy consumption");
        $("intensity-chart").setAttribute("aria-label", "Global energy intensity trend");
    }
    // Um eixo por gráfico: grandezas diferentes (percentagem e MJ por dólar) vão para gráficos separados.
    function chart(id, rows, sets) {
        return new Chart($(id), {
            type: "line",
            data: { labels: rows, datasets: sets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: { legend: { display: sets.length > 1, labels: { boxWidth: 10 } } },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: false },
                },
            },
        });
    }
    Promise.all(
        [
            "energy-overview.json",
            "energy-countries.json",
            "energy-timeseries.json",
            "energy-sources.json",
        ].map(load),
    )
        .then(function (a) {
            var o = a[0],
                c = a[1],
                t = a[2],
                s = a[3],
                h = o.headline_metrics,
                access = h.electricity_access_pct,
                renew = h.renewable_final_energy_pct,
                intensity = h.energy_intensity_mj_per_usd;
            $("global-metrics").innerHTML = [
                [
                    tr("Acesso à eletricidade", "Electricity access"),
                    fmt(access.value, 1) + "%",
                    access.year,
                ],
                [
                    tr("Renováveis no consumo final", "Renewables in final consumption"),
                    fmt(renew.value, 1) + "%",
                    renew.year,
                ],
                [
                    tr("Intensidade energética", "Energy intensity"),
                    fmt(intensity.value, 2) + tr(" MJ por $ PPC", " MJ per PPP $"),
                    intensity.year,
                ],
                [
                    tr("Geografias com dados", "Geographies with data"),
                    c.entities.length,
                    tr("países, territórios e agregados", "countries, territories and aggregates"),
                ],
            ]
                .map(function (x) {
                    return (
                        '<article class="metric-card"><small>' +
                        x[0] +
                        "</small><strong>" +
                        x[1] +
                        "</strong><span>" +
                        x[2] +
                        "</span></article>"
                    );
                })
                .join("");
            $("global-metrics").setAttribute("aria-busy", "false");
            $("global-insight").hidden = false;
            $("global-insight").innerHTML =
                "<strong>" +
                tr("O retrato conjunto:", "The combined picture:") +
                "</strong> " +
                tr(
                    "o acesso aproxima-se da universalidade, mas quase uma em cada doze pessoas continua sem eletricidade e a quota renovável avança lentamente.",
                    "access is approaching universality, yet almost one in twelve people still lacks electricity and the renewable share is advancing slowly.",
                );
            var world = t.observations.filter(function (x) {
                    return x.geography.code === "WLD";
                }),
                years = [
                    ...new Set(
                        world.map(function (x) {
                            return x.year;
                        }),
                    ),
                ].sort(),
                series = function (key) {
                    var m = {};
                    world
                        .filter(function (x) {
                            return x.key === key;
                        })
                        .forEach(function (x) {
                            m[x.year] = x.value;
                        });
                    return years.map(function (y) {
                        return m[y] ?? null;
                    });
                };
            chart(
                "access-chart",
                years,
                [
                    {
                        label: tr("Acesso (%)", "Access (%)"),
                        data: series("electricity_access_pct"),
                        borderColor: "#b4762d",
                        backgroundColor: "#b4762d18",
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0,
                    },
                ],
            );
            chart(
                "transition-chart",
                years,
                [
                    {
                        label: tr("Renováveis (%)", "Renewables (%)"),
                        data: series("renewable_final_energy_pct"),
                        borderColor: "#6f8c4a",
                        backgroundColor: "#6f8c4a18",
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0,
                    },
                ],
            );
            chart(
                "intensity-chart",
                years,
                [
                    {
                        label: tr("MJ por dólar PPC", "MJ per PPP dollar"),
                        data: series("energy_intensity_mj_per_usd"),
                        borderColor: "#b4762d",
                        backgroundColor: "#b4762d18",
                        fill: true,
                        tension: 0.2,
                        pointRadius: 0,
                    },
                ],
            );
            var q = $("country-select");
            q.innerHTML = '<option value="">' + tr("Escolher…", "Choose…") + "</option>";
            window.BioCulturaGeo.fill(
                q,
                c.entities.filter(function (e) {
                    return e.geography.code !== "WLD";
                }),
                function (e) {
                    return e.geography.code;
                },
            );
            q.disabled = false;
            q.onchange = function () {
                var e = c.entities.find(function (x) {
                    return x.geography.code === q.value;
                });
                if (!e) {
                    $("country-panel").innerHTML =
                        '<div class="empty-state"><strong>' +
                        tr("Escolha uma geografia", "Choose a geography") +
                        "</strong></div>";
                    return;
                }
                var vals = [
                    ["electricity_access_pct", tr("Acesso à eletricidade", "Electricity access")],
                    [
                        "renewable_final_energy_pct",
                        tr("Renováveis no consumo final", "Renewables in final consumption"),
                    ],
                    [
                        "energy_intensity_mj_per_usd",
                        tr("Intensidade energética", "Energy intensity"),
                    ],
                ];
                $("country-panel").innerHTML =
                    '<div class="country-summary">' +
                    vals
                        .map(function (v) {
                            var x = e.latest[v[0]];
                            return (
                                '<article class="country-value"><small>' +
                                v[1] +
                                "</small><strong>" +
                                (x
                                    ? fmt(x.value, v[0].includes("intensity") ? 2 : 1) +
                                      (x.unit === "%" ? "%" : tr(" MJ por $ PPC", " MJ per PPP $"))
                                    : "—") +
                                "</strong><p>" +
                                (x ? x.year : tr("Sem dados", "No data")) +
                                "</p>" +
                                (x
                                    ? window.BioCulturaLevel.html(v[0], x.value, {
                                          world: (function () {
                                              var w = c.entities.find(function (z) {
                                                  return z.geography.code === "WLD";
                                              });
                                              return w && w.latest[v[0]] ? w.latest[v[0]].value : null;
                                          })(),
                                          entities: c.entities,
                                          codeOf: function (z) {
                                              return z.geography.code;
                                          },
                                      })
                                    : "") +
                                "</article>"
                            );
                        })
                        .join("") +
                    '<p class="country-note">' +
                    tr(
                        "Os anos podem variar entre indicadores; não comparamos valores como se fossem contemporâneos.",
                        "Years may differ across indicators; values are not treated as contemporaneous.",
                    ) +
                    "</p></div>";
            };
            $("report-grid").innerHTML = [
                [
                    "IEA",
                    tr("Energia e desenvolvimento", "Energy and development"),
                    tr(
                        "O acompanhamento do ODS 7 combina acesso, combustíveis limpos, renováveis, eficiência e meios de implementação.",
                        "SDG 7 tracking combines access, clean cooking, renewables, efficiency and means of implementation.",
                    ),
                    "https://www.iea.org/reports/sdg7-data-and-projections",
                ],
                [
                    "IRENA",
                    tr("Acelerar renováveis", "Accelerating renewables"),
                    tr(
                        "Capacidade, custos, emprego e financiamento ajudam a perceber a escala material e social da transição.",
                        "Capacity, costs, employment and finance reveal the material and social scale of the transition.",
                    ),
                    "https://www.irena.org/Publications",
                ],
                [
                    "ONU",
                    tr("Progresso do ODS 7", "SDG 7 progress"),
                    tr(
                        "A leitura conjunta expõe avanços no acesso e insuficiência na velocidade da transformação energética.",
                        "The combined view reveals progress in access and insufficient speed in energy transformation.",
                    ),
                    "https://unstats.un.org/sdgs/report/2025/goal-07/",
                ],
            ]
                .map(function (x) {
                    return (
                        '<article class="report-card"><div class="report-brand"><span class="tag">' +
                        x[0] +
                        "</span></div><strong>" +
                        x[1] +
                        "</strong><p>" +
                        x[2] +
                        '</p><a href="' +
                        x[3] +
                        '" target="_blank" rel="noopener noreferrer">' +
                        tr("Consultar fonte ↗", "Read source ↗") +
                        "</a></article>"
                    );
                })
                .join("");
            $("source-links").innerHTML = s.sources
                .map(function (x) {
                    return (
                        '<a href="' +
                        x.url +
                        '" target="_blank" rel="noopener noreferrer">' +
                        x.organisation +
                        " ↗</a>"
                    );
                })
                .join("");
        })
        .catch(function (e) {
            console.error(e);
            $("global-metrics").innerHTML =
                "<p>" + tr("Dados indisponíveis.", "Data unavailable.") + "</p>";
        });
    fetch("/data/noticias.json")
        .then(function (r) {
            return r.json();
        })
        .then(function (items) {
            var n = (window.BioCultureNews ? window.BioCultureNews.rank(items) : items)
                .filter(function (x) {
                    var c = window.BioCultureI18n?.content(x) || x.pt || x;
                    return window.BioCultureNews.about(x, ["energia", "energy", "renovável*", "renováveis", "renewable*", "solar", "eólic*", "wind", "elétric*", "eletric*", "electric*", "eficiência", "efficiency", "rede elétrica", "grid", "autoconsumo", "self-consumption", "nuclear", "hidroelétric*", "fotovolta*", "photovoltaic*", "bateria*", "battery", "armazenamento", "storage"], ["energia"]);
                })
                .slice(0, 6);
            $("energy-news").innerHTML =
                n.map(function (x) { return window.BioCultureNews.cardHtml(x); }).join("") ||
                "<p>" + tr("Sem notícias desta categoria.", "No news in this category.") + "</p>";
        });
})();
