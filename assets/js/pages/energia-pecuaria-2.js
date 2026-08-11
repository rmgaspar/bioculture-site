
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
            let records = [], kind = "Todos";
            function distance(a, b) {
                const r = Math.PI / 180,
                    R = 6371,
                    dLat = (+b.lat - +a.lat) * r,
                    dLon = (+b.lon - +a.lon) * r,
                    q = Math.sin(dLat / 2) ** 2 +
                        Math.cos(+a.lat * r) * Math.cos(+b.lat * r) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
            }
            function family(x) {
                return /suín|suin/i.test(x.tipo || "")
                    ? "Suínos"
                    : /bovin/i.test(x.tipo || "")
                    ? "Bovinos"
                    : /ave|frango|peru|poedeira|capoeira/i.test(x.tipo || "")
                    ? "Aves"
                    : "Outros";
            }
            function renderStats() {
                const families = ["Suínos", "Aves", "Bovinos"];
                el("stats").innerHTML = [
                    ["Casos", records.length, "processos documentados acompanhados"],
                    ...families.map((f) => [
                        f,
                        records.filter((x) => family(x) === f).length,
                        "registos desta tipologia",
                    ]),
                ].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                        x[2]
                    }</span></article>`
                ).join("");
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region"),
                    info = locations.find((x) => String(x.id) === String(saved)) ||
                        locations.find((x) => Number(x.lat) && Number(x.lon));
                if (!info) return;
                el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                if (!Number(info.lat) || !Number(info.lon)) {
                    el("local-copy").textContent = "Sem coordenadas utilizáveis para esta região.";
                    return;
                }
                const near = records.filter((x) => Number(x.lat) && Number(x.lon)).map((x) => ({
                    ...x,
                    dist: distance(info, x),
                })).sort((a, b) => a.dist - b.dist).slice(0, 3);
                el("local-copy").textContent = "Três registos mais próximos dentro desta amostra.";
                el("nearest").innerHTML = near.map((x) =>
                    `<article class="near"><small>${esc(family(x))}</small><b>${
                        esc(x.nome)
                    }</b><span>cerca de ${Math.round(x.dist)} km · ${esc(x.concelho)}</span></article>`
                ).join("");
            }
            function list(v) {
                if (!valid(v)) return "—";
                return Array.isArray(v)
                    ? `<ul>${v.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
                    : esc(v);
            }
            function detail(x) {
                const cells = [
                    ["Capacidade documentada", x.capacidade_documentada],
                    ["Enquadramento", x.enquadramento],
                    ["Água", x.recursos_hidricos],
                    ["Solo", x.solo],
                    ["Ar", x.ar],
                    ["Proximidades sensíveis", x.proximidades_sensiveis],
                    ["Pressões potenciais", x.pressoes_ambientais_potenciais],
                    ["Medidas prioritárias", x.medidas_prioritarias],
                    ["Indicadores a monitorizar", x.indicadores_monitorizar],
                    ["Bem-estar documentado", x.bem_estar],
                ];
                return `<details><summary>Ver contexto, medidas e fontes</summary><div class="details">${
                    cells.map(([k, v]) => `<div class="datum"><b>${k}</b><span>${list(v)}</span></div>`)
                        .join("")
                }</div><div class="sources">${
                    (x.fontes || []).map((u, i) =>
                        `<a href="${esc(u)}" target="_blank" rel="noopener">Fonte ${i + 1}</a>`
                    ).join("")
                }</div></details>`;
            }
            function renderCases() {
                const items = kind === "Todos" ? records : records.filter((x) => family(x) === kind);
                el("cases").innerHTML =
                    items.map((x) =>
                        `<article class="case"><small>${esc(family(x))} · ${
                            esc(x.ano_referencia)
                        }</small><h3>${esc(x.nome)}</h3><p><strong>${esc(x.concelho)}, ${
                            esc(x.distrito)
                        }</strong> · ${esc(x.status)}</p><p>${esc(x.detalhe)}</p><p>Localização: ${
                            esc(x.precisao_localizacao)
                        }</p>${detail(x)}</article>`
                    ).join("") || '<p class="empty">—</p>';
            }
            function filters() {
                const names = ["Todos", "Suínos", "Aves", "Bovinos"];
                el("filters").innerHTML = names.map((x, i) =>
                    `<button type="button" class="filter ${
                        i ? "" : "active"
                    }" data-kind="${x}">${x}</button>`
                ).join("");
                el("filters").addEventListener("click", (e) => {
                    const b = e.target.closest("button");
                    if (!b) return;
                    kind = b.dataset.kind;
                    document.querySelectorAll(".filter").forEach((x) =>
                        x.classList.toggle("active", x === b)
                    );
                    renderCases();
                });
            }
            function renderNews(items) {
                const chosen = items.filter((n) => {
                    const c = n.pt || n;
                    return /pecu|suin|aviário|aviario|bovin|efluente|estrume|chorume|bem-estar animal/i
                        .test(
                            [n.categoria, n.categoria_id, c.titulo, c.resumo].filter(Boolean).join(" "),
                        );
                }).slice(0, 6);
                el("news").innerHTML = chosen.map((n) => {
                    const c = n.pt || n;
                    return `<a href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
            }
            async function start() {
                try {
                    const [livestock, locations, news] = await Promise.all(
                        ["pecuaria_industrial", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    records = livestock;
                    renderStats();
                    renderLocal(locations);
                    filters();
                    renderCases();
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados de pecuária:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((h) => {
                el("sidebar").innerHTML = h;
                start();
            }).catch(() => start());
        