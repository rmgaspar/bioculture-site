(function () {
    "use strict";
    var en = !!window.BioCultureI18n?.isEnglish,
        $ = function (x) {
            return document.getElementById(x);
        },
        tr = function (a, b) {
            return en ? b : a;
        };
    fetch("/data/livestock-global.json")
        .then(function (r) {
            return r.json();
        })
        .then(function (d) {
            $("livestock-metrics").innerHTML = d.headline
                .map(function (x) {
                    return (
                        '<article class="metric-card"><small>' +
                        (en ? x.label_en : x.label_pt) +
                        "</small><strong>" +
                        x.value +
                        "</strong><span>" +
                        x.context +
                        "</span></article>"
                    );
                })
                .join("");
            var names = { all: tr("Todos", "All") };
            d.systems.forEach(function (x) {
                names[x.id] = en ? x.name_en : x.name_pt;
            });
            var render = function (k) {
                var a =
                    k === "all"
                        ? d.frontiers
                        : d.frontiers.filter(function (x) {
                              return x.system === k;
                          });
                $("frontier-grid").innerHTML = a
                    .map(function (x) {
                        return (
                            '<article class="frontier-card"><small>' +
                            names[x.system] +
                            " · " +
                            x.region +
                            "</small><h3>" +
                            x.name +
                            "</h3><p><strong>" +
                            (en ? x.ecosystem_en : x.ecosystem_pt) +
                            "</strong></p><p>" +
                            (en ? x.pressure_en : x.pressure_pt) +
                            "</p></article>"
                        );
                    })
                    .join("");
            };
            $("system-filters").innerHTML = ["all"]
                .concat(
                    d.systems.map(function (x) {
                        return x.id;
                    }),
                )
                .map(function (k, i) {
                    return (
                        '<button class="' +
                        (i ? "" : "active") +
                        '" data-system="' +
                        k +
                        '">' +
                        names[k] +
                        " · " +
                        (k === "all" ? d.coverage.frontiers : d.coverage.systems[k]) +
                        "</button>"
                    );
                })
                .join("");
            $("system-filters").onclick = function (e) {
                var b = e.target.closest("button");
                if (!b) return;
                document.querySelectorAll("[data-system]").forEach(function (x) {
                    x.classList.toggle("active", x === b);
                });
                render(b.dataset.system);
            };
            render("all");
            $("frontier-grid").insertAdjacentHTML(
                "beforebegin",
                '<p class="reading-note"><strong>' +
                    tr("Cobertura:", "Coverage:") +
                    "</strong> " +
                    (en ? d.coverage.note_en : d.coverage.note_pt) +
                    "</p>",
            );
            $("report-grid").innerHTML = [
                [
                    "FAO",
                    tr("Emissões e caminhos de redução", "Emissions and reduction pathways"),
                    tr(
                        "Avaliação global dos sistemas pecuários, gases, espécies, regiões e opções de mitigação.",
                        "Global assessment of livestock systems, gases, species, regions and mitigation options.",
                    ),
                    "https://www.fao.org/3/cc9029en/cc9029en.pdf",
                ],
                [
                    "UNEP",
                    tr("A urgência do metano", "The methane imperative"),
                    tr(
                        "Reduzir metano oferece benefícios climáticos rápidos e melhora ar, saúde e produtividade.",
                        "Cutting methane offers rapid climate benefits and improves air quality, health and productivity.",
                    ),
                    "https://www.unep.org/explore-topics/energy/facts-about-methane",
                ],
                [
                    "IPCC",
                    tr("Solo, clima e alimentação", "Land, climate and food"),
                    tr(
                        "Uso do solo, dietas, produção, segurança alimentar e ecossistemas são partes do mesmo sistema.",
                        "Land use, diets, production, food security and ecosystems are parts of the same system.",
                    ),
                    "https://www.ipcc.ch/srccl/",
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
                        '" target="_blank">' +
                        tr("Consultar fonte ↗", "Read source ↗") +
                        "</a></article>"
                    );
                })
                .join("");
            $("source-links").innerHTML = d.sources
                .map(function (x) {
                    return '<a href="' + x.url + '" target="_blank">' + x.organisation + " ↗</a>";
                })
                .join("");
        });
    Promise.resolve();
})();
