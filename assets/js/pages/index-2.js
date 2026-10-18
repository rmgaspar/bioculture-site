
            const el = (id) => document.getElementById(id),
                isEnglish = new URLSearchParams(location.search).get("lang") === "en" || !!window.BioCultureI18n?.isEnglish,
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
                    );

            function count(data) {
                return Array.isArray(data) ? data.length : Object.keys(data || {}).length;
            }

            function showPulse(biodiversityGlobal, cropsGlobal, grapesGlobal) {
                const biodiversitySummary = biodiversityGlobal?.summary || {},
                    biodiversityMeta = biodiversityGlobal?.meta || {},
                    biodiversitySource = biodiversityGlobal?.sources?.[0] || {},
                    cropMeta = cropsGlobal?.meta || {},
                    grapeSource = grapesGlobal?.source || {},
                    grapeCount = Number(grapesGlobal?.count) || count(grapesGlobal?.varieties),
                    cropSourceLabel = "Genesys PGR / World Vegetable Center",
                    grapeSourceLabel = grapeSource.organisation || "UC Davis FPS Grape Registry";
                const rows = [
                    [isEnglish ? "Global biodiversity" : "Biodiversidade · Mundo", Number(biodiversitySummary.accepted_species) || 0, isEnglish ? "accepted species in the global taxonomic index" : "espécies aceites no índice taxonómico mundial", biodiversityMeta.snapshot, biodiversitySource.url, "#1e8449"],
                    [isEnglish ? "Global plant accessions" : "Acessos vegetais · Mundo", Number(cropMeta.accession_count) || 0, isEnglish ? "plant genetic resource samples conserved" : "amostras de recursos genéticos conservadas", cropSourceLabel, cropMeta.genesys_dataset || cropMeta.source_url, "#5c7a4a"],
                    [isEnglish ? "Cultivated taxa" : "Táxones cultivados · Mundo", Number(cropMeta.taxon_count) || 0, isEnglish ? "taxa represented in the global catalogue" : "táxones representados no catálogo global", cropSourceLabel, cropMeta.genesys_dataset || cropMeta.source_url, "#81966e"],
                    [isEnglish ? "Grapevines" : "Castas · Mundo", grapeCount, isEnglish ? "varieties in the global grapevine catalogue" : "variedades no catálogo mundial de videira", grapeSourceLabel, grapeSource.url, "#7d3350"],
                ];
                el("pulse").innerHTML = rows.map((x) =>
                    `<article class="number" style="--accent:${x[5]}"><small>${x[0]}</small><strong>${
                        x[1].toLocaleString(isEnglish ? "en-GB" : "pt-PT")
                    }</strong><span>${x[2]}</span>${
                        x[3] && x[4] ? `<a class="source" href="${esc(x[4])}" target="_blank" rel="noopener">${isEnglish ? "Source" : "Fonte"}: ${esc(x[3])} →</a>` : ""
                    }</article>`
                ).join("");
            }

            function showToday(species) {
                const now = new Date();

                // Só entra no sorteio diário quem tem uma síntese real (lista pré-calculada em
                // scripts/gerar-especies.mjs). Em inglês, a ficha só serve se já estiver traduzida.
                const eligible = (isEnglish ? species?.en : species?.pt) || [];
                if (!eligible.length) return;
                const day = Math.floor(now.getTime() / 86400000);
                (async () => {
                    for (let attempt = 0; attempt < 3; attempt++) {
                        const id = eligible[(Math.abs(day) + attempt) % eligible.length];
                        const x = await window.BioCulturaSpecies.record(id).catch(() => null);
                        if (!x) continue;
                        const image = x.imagem && x.imagem !== "-"
                            ? `<img class="species-image" src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy" onerror="this.style.display='none'">`
                            : "";
                        el("encounter").innerHTML = `<div><small>${isEnglish ? "Today's encounter" : "Encontro do dia"}</small><h3>${esc(x.nome)}</h3><em>${esc(x.nome_cientifico)}</em><p>${
                            esc(x.sintese || x.origem || (isEnglish ? "A species from the bioCulture inventory." : "Uma espécie do inventário bioCulture."))
                        }</p><a href="/ecossistemas/especie-detalhe.html?id=${
                            encodeURIComponent(id)
                        }">${isEnglish ? "Meet this species" : "Conhecer esta espécie"} →</a></div>${image}`;
                        return;
                    }
                })();
            }

            function showNews(items) {
                const rows = window.BioCultureNews?.select(items, { context: "all", limit: Number.MAX_SAFE_INTEGER, order: "relevance" }) || [...items]
                    .sort((a, b) => window.BioCultureNews?.compare(a, b) ?? (Date.parse(b.data || "") - Date.parse(a.data || "")));
                // Primeiro as principais; «Ver mais» acrescenta mais um bloco de cada vez, «Ver menos» volta ao início.
                const INITIAL = 8, STEP = 8;
                let shown = INITIAL;
                const render = () => {
                    const visible = rows.slice(0, shown);
                    el("news").innerHTML = visible.map((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    const scope = n.ambito === "portugal"
                        ? (isEnglish ? "Portugal" : "Portugal")
                        : n.ambito === "regional" ? "Regional" : (isEnglish ? "World" : "Mundo");
                    const summary = c.resumo_biocultura || c.resumo || "";
                    const image = typeof n.imagem === "string" &&
                            (/^https?:\/\//i.test(n.imagem) || n.imagem.startsWith("/"))
                        ? n.imagem
                        : "/images/noticias-sem-imagem.webp";
                    const imageAlt = image === "/images/noticias-sem-imagem.webp"
                        ? (isEnglish ? "bioCulture editorial illustration" : "Ilustração editorial bioCulture")
                        : "";
                    return `<a href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><img class="news-thumb" src="${esc(image)}" alt="${
                        esc(imageAlt)
                    }" loading="lazy" onerror="this.src='/images/noticias-sem-imagem.webp'"><div class="news-body"><small>${
                        esc(scope)
                    } · ${esc(window.BioCultureI18n?.date(n.data) || n.data)} · ${esc(n.fonte)}${window.BioCultureNews?.typeLabel(n) ? ` · ${esc(window.BioCultureNews.typeLabel(n))}` : ""}</small><h3>${esc(c.titulo)}</h3>${
                        summary ? `<p>${esc(summary)}</p>` : ""
                    }</div></a>`;
                    }).join("") || `<p class="empty">${isEnglish ? "No news available at this time." : "Sem notícias disponíveis neste momento."}</p>`;
                    const left = rows.length - visible.length;
                    const more = el("news-toggle"), less = el("news-collapse");
                    if (more) {
                        more.hidden = left <= 0;
                        more.textContent = isEnglish ? `Show more (${left} left)` : `Ver mais (${left} restantes)`;
                    }
                    if (less) {
                        less.hidden = shown <= INITIAL;
                        less.textContent = isEnglish ? "Show less" : "Ver menos";
                    }
                };
                const more = el("news-toggle"), less = el("news-collapse");
                if (more) more.onclick = () => { shown = Math.min(rows.length, shown + STEP); render(); };
                if (less) less.onclick = () => {
                    shown = INITIAL;
                    render();
                    el("news-block")?.scrollIntoView({ block: "start" });
                };
                render();
            }

            const PASSOS = {
                // Ícones de traço (24×24): lupa (observar), gráfico de linha (compreender), rebento (agir).
                observar: { n: "01", tit_pt: "Ver o que está a mudar", tit_en: "See what is changing", txt_pt: "Dados de organizações de referência (NASA, NOAA, FAO, Banco Mundial, ONU, OMS, IPMA, APA) sobre clima, ar, água, solo, biodiversidade e energia, país a país.", txt_en: "Data from reference organisations (NASA, NOAA, FAO, World Bank, UN, WHO, IPMA, APA) on climate, air, water, soil, biodiversity and energy, country by country.", c: "#6b8f47", pt: "Observar", en: "Observe", icon: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/>' },
                compreender: { n: "02", tit_pt: "Ler a evolução e as pressões", tit_en: "Read the trends and the pressures", txt_pt: "Séries de décadas, comparações entre países e as pressões por trás dos números (energia, alimentação, mineração, tecnologia, pecuária, aviação, construção e moda) para perceber o que cada mudança representa.", txt_en: "Decades-long series, comparisons between countries and the pressures behind the numbers (energy, food, mining, technology, livestock, aviation, construction and fashion) to see what each change represents.", c: "#a66f50", pt: "Compreender", en: "Understand", icon: '<path d="M4 4v16h16"/><path d="m7.5 15 4-5 3 3 5-7"/>' },
                agir: { n: "03", tit_pt: "Cruzar os dados e cuidar da terra", tit_en: "Combine the data and care for the land", txt_pt: "Clima, água, solo, floresta e vida cruzados com os ciclos do ano: calendários, problemas na horta e práticas regenerativas que respondem ao que os números mostram.", txt_en: "Climate, water, soil, forests and life combined with the cycles of the year: calendars, garden problems and regenerative practices that answer what the numbers show.", c: "#3f7373", pt: "Agir", en: "Act", icon: '<path d="M12 21v-8"/><path d="M12 13c0-4-3-6.5-7-6.5 0 4 2.8 6.5 7 6.5z"/><path d="M12 15c0-3.2 2.4-5.5 6-5.5 0 3.4-2.3 5.5-6 5.5z"/><path d="M7 21h10"/>' },
            };

            // Mapa de entrada: três passos, uma linha por entrada (título e uma frase), sem gráficos nem filtros.
            function atlasContent() {
                const t = (pt, en) => (isEnglish ? en : pt);
                const u = (path) => { const [p, h] = path.split("#"); return `${p}?lang=${isEnglish ? "en" : "pt"}${h ? "#" + h : ""}`; };
                const OBS = "/observatorio/observatorio-terra.html";
                const entradas = [
                    ["observar", t("Observatório da Terra", "Earth Observatory"), t("Dez conclusões, com séries por país.", "Ten findings, with country series."), OBS],
                    ["observar", t("Recursos vitais", "Vital resources"), t("Água, ar e solo sob stress.", "Water, air and soil under stress."), "/recursos/vida-e-recursos.html"],
                    ["observar", t("Biodiversidade", "Biodiversity"), t("Espécies, habitats e risco de extinção.", "Species, habitats and extinction risk."), "/ecossistemas/biodiversidade.html"],
                    ["compreender", t("Pressões e sistemas", "Pressures and systems"), t("Extração, energia e consumo que empurram os indicadores.", "Extraction, energy and consumption driving the indicators."), "/observatorio/vetores-pressao-global.html"],
                    ["compreender", t("Pressões humanas", "Human pressures"), t("Energia, IA, pecuária, aviação, construção e moda.", "Energy, AI, livestock, aviation, construction and fashion."), "/observatorio/pressoes-humanas.html"],
                    ["compreender", t("Produção agrícola", "Agricultural production"), t("O que o mundo produz e o que Portugal produz.", "What the world produces and what Portugal produces."), "/observatorio/producao-agricola.html"],
                    ["compreender", t("A teia", "The web"), t("Clima, aves, invasoras e pesticidas lado a lado.", "Climate, birds, invasives and pesticides side by side."), "/observatorio/bioweb.html"],
                    ["compreender", t("Portugal em detalhe", "Portugal in detail"), t("Continente, Açores e Madeira.", "Mainland, Azores and Madeira."), OBS + "#leitura-local"],
                    ["agir", t("Conhecimento para cuidar", "Knowledge for care"), t("Problemas na horta, calendário e vinha viva.", "Garden problems, calendar and living vineyard."), "/calendario/conhecimento-cuidar.html"],
                    ["agir", t("Pragas e invasoras", "Pests and invasive species"), t("Catálogo de pragas, doenças e invasoras.", "Catalogue of pests, diseases and invasives."), "/calendario/calendario.html#pragas-catalogo"],
                    ["agir", t("Soluções naturais", "Natural solutions"), t("Práticas e produtos biológicos por função.", "Biological practices and products by function."), "/services/services.html"],
                ];
                return Object.keys(PASSOS).map((k) => {
                    const passo = PASSOS[k];
                    const linhas = entradas.filter((e) => e[0] === k).map(([, titulo, frase, caminho]) =>
                        `<li><a href="${esc(u(caminho))}"><strong>${esc(titulo)}</strong><span>${esc(frase)}</span></a></li>`).join("");
                    return `<section class="atlas-passo" style="--c:${passo.c}"><h3><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${passo.icon}</svg><b>${passo.n}</b>${esc(isEnglish ? passo.en : passo.pt)}</h3><p class="atlas-titulo">${esc(isEnglish ? passo.tit_en : passo.tit_pt)}</p><p class="atlas-texto">${esc(isEnglish ? passo.txt_en : passo.txt_pt)}</p><ul>${linhas}</ul><div data-foto-slot="explorar-${k}"></div></section>`;
                }).join("");
            }

            // Destaques: poucos (3 ou 4), escolhidos à mão em /data/destaques.json; para os mudar basta editar esse ficheiro.
            async function showDestaques() {
                const lista = el("destaques-lista");
                if (!lista) return;
                const L = isEnglish ? "en" : "pt";
                el("destaques-label").textContent = isEnglish ? "Featured" : "Em destaque";
                el("destaques-titulo").textContent = isEnglish ? "What deserves your attention" : "O que merece a tua atenção";
                try {
                    const itens = await fetch("/data/destaques.json?v=2").then((r) => { if (!r.ok) throw Error("destaques"); return r.json(); });
                    const u = (path) => { const [p, h] = path.split("#"); return `${p}?lang=${L}${h ? "#" + h : ""}`; };
                    lista.innerHTML = itens.slice(0, 4).map((d) => `<li><a href="${esc(u(d.href))}"><img src="${esc(d.imagem)}"${d.semMarca ? " data-no-signature" : ""} alt="${esc(d.alt[L] || d.alt.pt)}" loading="lazy"><small>${esc(d.tag[L] || d.tag.pt)}</small><h3>${esc(d.titulo[L] || d.titulo.pt)}</h3><p>${esc(d.texto[L] || d.texto.pt)}</p><span>${isEnglish ? "Read" : "Ler"} →</span></a></li>`).join("");
                } catch (e) {
                    console.error("Destaques:", e);
                    lista.innerHTML = "";
                }
            }

            async function start() {
                try {
                    const names = [
                            "especies-encontro",
                            "biodiversity-global-catalogue",
                            "crops-global-summary",
                            "grape-varieties-global",
                            "noticias",
                        ],
                        data = await Promise.all(names.map((n) =>
                            fetch(`/data/${n}.json`).then((r) => {
                                if (!r.ok) throw Error(n);
                                return r.json();
                            })
                        ));

                    showPulse(data[1], data[2], data[3]);
                    showToday(data[0]);
                    showNews(data[4]);

                    el("atlas-container").innerHTML = atlasContent();
                    showDestaques();
                } catch (e) {
                    console.error("Não foi possível carregar a entrada do observatório:", e);
                    el("pulse").innerHTML = '<p class="empty">—</p>';
                }
            }

            fetch("/sidebar-content.html?v=28").then((r) => r.text()).then((h) => {
                el("sidebar").innerHTML = h;
                start();
            }).catch(() => start());
