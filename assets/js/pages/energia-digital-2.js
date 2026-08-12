
            const el = (id) => document.getElementById(id),
                esc = (v) =>
                    String(v ?? "—").replace(
                        /[&<>'"]/g,
                        (c) => ({
                            "&": "&amp;",
                            "<": "&lt;",
                            ">": "&gt;",
                            "'": "&#39;",
                            '"': "&quot;",
                        }[c]),
                    ),
                valid = (v) => v !== undefined && v !== null && v !== "" && v !== "-";
            let records = [], mode = "Todos";
            function phase(x) {
                return /operacional/i.test(x.status || "") &&
                        !/planeado|construção|desenvolvimento|expansão/i.test(x.status || "")
                    ? "Operacionais"
                    : "Em desenvolvimento";
            }
            function distance(a, b) {
                const r = Math.PI / 180,
                    R = 6371,
                    dLat = (+b.lat - +a.lat) * r,
                    dLon = (+b.lon - +a.lon) * r,
                    q = Math.sin(dLat / 2) ** 2 +
                        Math.cos(+a.lat * r) * Math.cos(+b.lat * r) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
            }
            function renderStats() {
                const operational = records.filter((x) => phase(x) === "Operacionais").length,
                    development = records.length - operational,
                    published = records.filter((x) => typeof x.capacidade_ti_mw === "number").length,
                    known = records.reduce(
                        (s, x) => s + (typeof x.capacidade_ti_mw === "number" ? x.capacidade_ti_mw : 0),
                        0,
                    );
                el("stats").innerHTML = [
                    ["Casos", records.length, "instalações e projetos acompanhados"],
                    ["Operacionais", operational, "estado operacional indicado"],
                    ["Em desenvolvimento", development, "planeados, em construção ou expansão"],
                    [
                        "Capacidade TI publicada",
                        known.toLocaleString("pt-PT") + " MW",
                        `soma de ${published} valores operacionais e futuros; não é consumo atual`,
                    ],
                ].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                        x[2]
                    }</span></article>`
                ).join("");
                const fields = [["Capacidade TI", "capacidade_ti_mw"], ["Água", "consumo_agua"], [
                    "PUE",
                    "pue",
                ], ["WUE", "wue"]];
                el("transparency").innerHTML = fields.map(([n, k]) => {
                    const count = records.filter((x) => valid(x[k])).length;
                    return `<div><b>${count}/${records.length}</b><span>registos com ${n} disponível</span></div>`;
                }).join("");
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                if (!Number(info.lat) || !Number(info.lon)) {
                    el("local-copy").textContent = "Sem coordenadas utilizáveis para este perfil.";
                    return;
                }
                const n = records.filter((x) => Number(x.lat) && Number(x.lon)).map((x) => ({
                    ...x,
                    distance: distance(info, x),
                })).sort((a, b) => a.distance - b.distance).slice(0, 3);
                el("local-copy").textContent =
                    "Três registos mais próximos entre os casos acompanhados.";
                el("nearest").innerHTML = n.map((x) =>
                    `<article class="near"><small>${esc(phase(x))}</small><b>${esc(x.nome)}</b><span>${
                        Math.round(x.distance)
                    } km · ${esc(x.concelho)}</span></article>`
                ).join("");
            }
            function details(x) {
                const cells = [
                    ["Energia", x.consumo_energia],
                    ["Água", x.consumo_agua],
                    ["Refrigeração", x.refrigeracao],
                    ["Energia renovável", x.energia_renovavel],
                    ["Biodiversidade", x.biodiversidade],
                    ["Calor e solo", x.aquecimento_solo],
                    ["Resíduos", x.residuos],
                    ["Incertezas", x.incertezas],
                ].filter(([, v]) => valid(v));
                return `<details><summary>Ver dados, lacunas e fontes</summary><div class="detail-grid">${
                    cells.map(([k, v]) => `<div class="detail"><b>${k}</b><span>${esc(v)}</span></div>`)
                        .join("")
                }</div>${
                    (x.fontes || []).length
                        ? `<div class="sources">${
                            x.fontes.map((u, i) =>
                                `<a href="${esc(u)}" target="_blank" rel="noopener">Fonte ${i + 1}</a>`
                            ).join("")
                        }</div>`
                        : ""
                }</details>`;
            }
            function renderProjects() {
                const list = mode === "Todos" ? records : records.filter((x) => phase(x) === mode);
                el("projects").innerHTML =
                    list.map((x) =>
                        `<article class="project"><small>${esc(phase(x))}</small><h3>${
                            esc(x.nome)
                        }</h3><p><strong>${esc(x.operador)}</strong> · ${esc(x.tipo)}</p><p>${
                            esc(x.status)
                        } · ${esc(x.concelho)}</p><p>Capacidade TI: ${esc(x.capacidade_ti_mw)}${
                            typeof x.capacidade_ti_mw === "number" ? " MW" : ""
                        } · PUE: ${esc(x.pue)} · WUE: ${esc(x.wue)}</p>${
                            valid(x.detalhe) ? `<p>${esc(x.detalhe)}</p>` : ""
                        }${details(x)}</article>`
                    ).join("") || '<p class="empty">—</p>';
            }
            function setupFilters() {
                const names = ["Todos", "Operacionais", "Em desenvolvimento"];
                el("filters").innerHTML = names.map((x, i) =>
                    `<button class="filter ${
                        i === 0 ? "active" : ""
                    }" type="button" data-phase="${x}">${x}</button>`
                ).join("");
                el("filters").addEventListener("click", (e) => {
                    const b = e.target.closest("button");
                    if (!b) return;
                    mode = b.dataset.phase;
                    document.querySelectorAll(".filter").forEach((x) =>
                        x.classList.toggle("active", x === b)
                    );
                    renderProjects();
                });
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return /centro de dados|data center|datacenter|inteligência artificial|\bIA\b|digital|chips|semicondutor|resíduo eletr/i
                        .test(
                            [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(
                                Boolean,
                            ).join(" "),
                        );
                }).slice(0, 6);
                el("news").innerHTML = selected.map((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(window.BioCultureI18n?.date(n.data) || n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
            }
            async function start() {
                try {
                    const [digital, locations, news] = await Promise.all(
                        ["impacto_digital", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    records = digital;
                    renderStats();
                    renderLocal(locations);
                    setupFilters();
                    renderProjects();
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados digitais:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        