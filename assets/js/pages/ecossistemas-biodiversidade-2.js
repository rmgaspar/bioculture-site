
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
            let all = [], shown = 24, mode = "Tudo", query = "";
            const groupMap = {
                Plantas: ["Plantae", "Flora Invasora"],
                Aves: ["Aves"],
                Insetos: ["Insecta"],
                Mamíferos: ["Mammalia"],
                Fungos: ["Fungi"],
                Aquáticos: ["Actinopterygii", "Mollusca"],
                Outros: ["Arachnida", "Reptilia", "Amphibia", "Animalia", "Chromista"],
            };
            function threatened(x) {
                return /^(NT|VU|EN|CR)\b/.test(x.iucn_global || "") ||
                    /near threatened|vulnerable|endangered|critically endangered/i.test(
                        x.estatuto || "",
                    );
            }
            function filtered() {
                return all.filter((x) => {
                    const q = query.toLocaleLowerCase("pt");
                    const text = `${x.nome} ${x.nome_cientifico}`.toLocaleLowerCase("pt");
                    const matchQ = !q || text.includes(q);
                    let match = true;
                    if (groupMap[mode]) match = groupMap[mode].includes(x.grupo);
                    else if (mode === "Ameaçadas") match = threatened(x);
                    else if (mode === "Invasoras") {
                        match = x.invasora === true || /invasora/i.test(x.estatuto || "");
                    }
                    return matchQ && match;
                });
            }
            function renderStats() {
                const groups = new Set(all.map((x) => x.grupo).filter(valid));
                const threatenedCount = all.filter(threatened).length;
                const invasive =
                    all.filter((x) => x.invasora === true || /invasora/i.test(x.estatuto || "")).length;
                el("stats").innerHTML = [
                    ["Registos", all.length, "espécies e outros organismos no inventário"],
                    ["Grupos", groups.size, "grupos biológicos representados"],
                    ["IUCN registada", threatenedCount, "NT, VU, EN ou CR no campo disponível"],
                    ["Invasoras", invasive, "registos identificados como invasores"],
                ].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${
                        x[1].toLocaleString("pt-PT")
                    }</strong><span>${x[2]}</span></article>`
                ).join("");
            }
            function status(x) {
                if (threatened(x)) return valid(x.iucn_global) ? x.iucn_global : "Ameaçada";
                if (x.invasora || /invasora/i.test(x.estatuto || "")) return "Invasora";
                return valid(x.estatuto) ? x.estatuto : "";
            }
            function card(x) {
                return `<a class="species-card" href="especie-detalhe.html?id=${
                    encodeURIComponent(x.id)
                }"><div class="species-image" data-initial="${esc(String(x.nome || "?").charAt(0))}">${
                    valid(x.imagem)
                        ? `<img src="${esc(x.imagem)}" alt="${
                            esc(x.nome)
                        }" loading="lazy" onerror="this.remove()">`
                        : ""
                }</div><div class="species-body"><small>${esc(x.grupo)}</small><h3>${
                    esc(x.nome)
                }</h3><em>${esc(x.nome_cientifico)}</em>${
                    status(x) ? `<br><span class="badge">${esc(status(x))}</span>` : ""
                }</div></a>`;
            }
            function render() {
                const list = filtered();
                el("results-meta").textContent = `${list.length.toLocaleString("pt-PT")} resultados`;
                el("species-grid").innerHTML = list.slice(0, shown).map(card).join("") ||
                    '<p class="empty">Nenhuma espécie corresponde à pesquisa.</p>';
                el("load-more").style.display = list.length > shown ? "block" : "none";
            }
            function setupFilters() {
                const names = [
                    "Tudo",
                    "Plantas",
                    "Aves",
                    "Insetos",
                    "Mamíferos",
                    "Fungos",
                    "Aquáticos",
                    "Ameaçadas",
                    "Invasoras",
                ];
                el("filters").innerHTML = names.map((x, i) =>
                    `<button type="button" class="filter ${
                        i === 0 ? "active" : ""
                    }" data-filter="${x}">${x}</button>`
                ).join("");
                el("filters").addEventListener("click", (e) => {
                    const b = e.target.closest("button");
                    if (!b) return;
                    mode = b.dataset.filter;
                    shown = 24;
                    document.querySelectorAll(".filter").forEach((x) =>
                        x.classList.toggle("active", x === b)
                    );
                    render();
                });
                el("search").addEventListener("input", (e) => {
                    query = e.target.value.trim();
                    shown = 24;
                    render();
                });
                el("load-more").addEventListener("click", () => {
                    shown += 24;
                    render();
                });
            }
            function renderLocal(locations, master) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                const raw = [
                    ...(info.especies_ids || []),
                    ...(info.extensao_biocultura?.especies_ids || []),
                ];
                const ids = [...new Set(raw)].filter((id) => master[id]);
                el("local-count").innerHTML = `${ids.length}<small>espécies associadas</small>`;
                el("local-note").textContent = ids.length
                    ? "Seleção territorial disponível no perfil bioCultura."
                    : "Ainda não existem associações de espécies para este perfil.";
                el("local-species").innerHTML = ids.slice(0, 18).map((id) => {
                    const x = master[id];
                    return `<a class="local-chip" href="especie-detalhe.html?id=${
                        encodeURIComponent(id)
                    }">${valid(x.imagem) ? `<img src="${esc(x.imagem)}" alt="" loading="lazy">` : ""}${
                        esc(x.nome)
                    }</a>`;
                }).join("");
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return /biodiv|espéc|habitat|conserva|invasor|ecossistema|restauro/i.test(
                        [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(Boolean)
                            .join(" "),
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
                    const [master, locations, news] = await Promise.all(
                        ["especies_master", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    all = Object.entries(master).map(([id, x]) => ({ id, ...x })).filter((x) =>
                        valid(x.nome)
                    );
                    all.sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
                    renderStats();
                    renderLocal(locations, master);
                    setupFilters();
                    render();
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar a biodiversidade:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        