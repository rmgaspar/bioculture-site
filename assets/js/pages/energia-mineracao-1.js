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
                const s = x.status || "";
                if (/^Em exploração$/i.test(s)) return "Em exploração";
                if (/encerrad|remediação|passivo/i.test(s) || /passivo/i.test(x.id)) {
                    return "Passivos e fecho";
                }
                if (/não operacional/i.test(s)) return "Projetos não operacionais";
                return "Direitos e fases condicionadas";
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
                const active = records.filter((x) => phase(x) === "Em exploração").length,
                    proposed = records.filter((x) => phase(x) === "Projetos não operacionais").length,
                    legacy = records.filter((x) => phase(x) === "Passivos e fecho").length,
                    lithium = records.filter((x) => /lítio|lepidolite/i.test(x.mineral || "")).length;
                el("stats").innerHTML = [["Registos", records.length, "seleção do observatório"], [
                    "Em exploração",
                    active,
                    "estado explicitamente indicado",
                ], [
                    "Projetos não operacionais",
                    proposed,
                    "em avaliação, reformulação ou licenciamento",
                ], ["Com lítio", lithium, "registos cujo mineral inclui lítio ou lepidolite"]].map(
                    (x) =>
                        `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                            x[2]
                        }</span></article>`,
                ).join("");
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
                    ["Água", x.agua],
                    ["Solo e agricultura", x.solo_agricultura],
                    ["Biodiversidade", x.biodiversidade],
                    ["Resíduos", x.residuos_rejeitados],
                    ["Populações", x.populacoes_saude],
                    ["Lacunas", x.lacunas],
                ].filter(([, v]) => valid(v));
                return `<details><summary>Ver impactos, lacunas e fontes</summary><div class="detail-grid">${
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
                        }</h3><p><strong>${esc(x.mineral)}</strong></p><p>${esc(x.status)}</p><p>${
                            esc(x.concelho)
                        } · ${esc(x.distrito)}</p>${
                            valid(x.detalhe) ? `<p>${esc(x.detalhe)}</p>` : ""
                        }${details(x)}</article>`
                    ).join("") || '<p class="empty">—</p>';
            }
            function setupFilters() {
                const phases = [
                    "Todos",
                    "Em exploração",
                    "Projetos não operacionais",
                    "Direitos e fases condicionadas",
                    "Passivos e fecho",
                ];
                el("filters").innerHTML = phases.map((x, i) =>
                    `<button class="filter ${i === 0 ? "active" : ""}" type="button" data-phase="${
                        esc(x)
                    }">${esc(x)}</button>`
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
                    const c = n.pt || n;
                    return /minera|mina|lítio|metal|concessão|extração|jazida|rejeitado/i.test(
                        [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(Boolean)
                            .join(" "),
                    );
                }).slice(0, 6);
                el("news").innerHTML = selected.map((n) => {
                    const c = n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
            }
            async function start() {
                try {
                    const [mines, locations, news] = await Promise.all(
                        ["mineracao", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    records = mines;
                    renderStats();
                    renderLocal(locations);
                    setupFilters();
                    renderProjects();
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados mineiros:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
