
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
                    cropMeta = cropsGlobal?.meta || {},
                    grapeCount = Number(grapesGlobal?.count) || count(grapesGlobal?.varieties);
                const rows = [
                    [isEnglish ? "Global biodiversity" : "Biodiversidade · Mundo", Number(biodiversitySummary.accepted_species) || 0, isEnglish ? "accepted species in the global taxonomic index" : "espécies aceites no índice taxonómico mundial"],
                    [isEnglish ? "Global plant accessions" : "Acessos vegetais · Mundo", Number(cropMeta.accession_count) || 0, isEnglish ? "plant genetic resource samples conserved" : "amostras de recursos genéticos conservadas"],
                    [isEnglish ? "Cultivated taxa" : "Táxones cultivados · Mundo", Number(cropMeta.taxon_count) || 0, isEnglish ? "taxa represented in the global catalogue" : "táxones representados no catálogo global"],
                    [isEnglish ? "Grapevines" : "Castas · Mundo", grapeCount, isEnglish ? "varieties in the global grapevine catalogue" : "variedades no catálogo mundial de videira"],
                ];
                el("pulse").innerHTML = rows.map((x) =>
                    `<article class="number"><small>${x[0]}</small><strong>${
                        x[1].toLocaleString(isEnglish ? "en-GB" : "pt-PT")
                    }</strong><span>${x[2]}</span></article>`
                ).join("");
            }

            function showToday(regions, species) {
                const months = isEnglish ? ["January","February","March","April","May","June","July","August","September","October","November","December"] : [
                        "janeiro",
                        "fevereiro",
                        "março",
                        "abril",
                        "maio",
                        "junho",
                        "julho",
                        "agosto",
                        "setembro",
                        "outubro",
                        "novembro",
                        "dezembro",
                    ],
                    now = new Date();
                el("month").textContent = months[now.getMonth()];

                const saved = localStorage.getItem("biocultura_region"),
                    region = regions.find((x) => String(x.id) === String(saved));

                if (region) {
                    el("place").firstChild.textContent = `${region.titulo} · `;
                    el("place-copy").textContent =
                        `${isEnglish ? "A starting point for connecting calendars, species and pressures with" : "Um ponto de entrada para relacionar calendário, espécies e pressões com"} ${
                            region.concelho || region.regiao || (isEnglish ? "the selected territory" : "o território selecionado")
                        }.`;
                }

                const entries = Object.entries(species || {});
                if (!entries.length) return;

                const day = Math.floor(now.getTime() / 86400000),
                    [id, x] = entries[Math.abs(day) % entries.length],
                    image = x.imagem && x.imagem !== "-"
                        ? `<img class="species-image" src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy" onerror="this.style.display='none'">`
                        : "";

                el("encounter").innerHTML = `<div><small>${isEnglish ? "Today's encounter" : "Encontro do dia"}</small><h3>${esc(x.nome)}</h3><em>${esc(x.nome_cientifico)}</em><p>${
                    esc(x.sintese || x.origem || (isEnglish ? "A species from the bioCulture inventory." : "Uma espécie do inventário bioCultura."))
                }</p><a href="/ecossistemas/especie-detalhe.html?id=${
                    encodeURIComponent(id)
                }">${isEnglish ? "Meet this species" : "Conhecer esta espécie"} →</a></div>${image}`;
            }

            function showNews(items) {
                const rows = window.BioCultureNews?.select(items, { context: "all", limit: Number.MAX_SAFE_INTEGER }) || [...items]
                    .sort((a, b) => window.BioCultureNews?.compare(a, b) ?? (Date.parse(b.data || "") - Date.parse(a.data || "")));
                let expanded = false;
                const render = () => {
                    const visible = expanded ? rows : rows.slice(0, 6);
                    el("news").innerHTML = visible.map((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    const scope = n.ambito === "portugal"
                        ? (isEnglish ? "Portugal · territorial case" : "Portugal · caso territorial")
                        : n.ambito === "regional" ? "Regional" : (isEnglish ? "World" : "Mundo");
                    return `<a href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><small>${esc(scope)} · ${esc(window.BioCultureI18n?.date(n.data) || n.data)}</small><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    } →</span></a>`;
                    }).join("") || `<p class="empty">${isEnglish ? "No news available at this time." : "Sem notícias disponíveis neste momento."}</p>`;
                    const toggle = el("news-toggle");
                    if (toggle) {
                        toggle.hidden = rows.length <= 6;
                        toggle.textContent = expanded
                            ? (isEnglish ? "Show less" : "Recolher")
                            : (isEnglish ? `Show all (${rows.length})` : `Ver mais (${rows.length})`);
                        toggle.setAttribute("aria-expanded", String(expanded));
                    }
                };
                const toggle = el("news-toggle");
                if (toggle) toggle.onclick = () => { expanded = !expanded; render(); };
                render();
            }

            function getPortalMarkImage(title) {
                const imageMap = {
                    "Planeta e pressões": "/images/observatorio-planeta-v2.webp",
                    "Recursos vitais": "/images/recursos.jpg",
                    "Biodiversidade": "/images/biodiversidade-teia-viva.webp",
                    "Pressões humanas": "/images/energia_pressao.jpg",
                    "Portugal em detalhe": "/images/pressoes-portugal.webp",
                    "Conhecimento para cuidar": "/images/calendario_regeneracao.jpg",
                };
                const src = imageMap[title] || "/images/placeholder.jpg";
                return `<img src="${src}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`;
            }

            function atlasContent() {
                const portals = isEnglish ? [
                        ["Planet and pressures","Planeta e pressões","Physical signals, environmental pressures and the connections between systems.",[["Planetary state","/observatorio/vetores-pressao-global.html?lang=en#planetary-state"],["Pressure systems","/observatorio/vetores-pressao-global.html?lang=en#pressure-systems"],["Method","/observatorio/vetores-pressao-global.html?lang=en#method"]]],
                        ["Vital resources","Recursos vitais","The three material foundations of life, read globally and without separating their relationships.",[["Water","/recursos/water.html?lang=en"],["Air","/recursos/air.html?lang=en"],["Soil","/recursos/soil.html?lang=en"]]],
                        ["Biodiversity","Biodiversidade","Species, habitats, extinction risk and ecological relationships, from the world to Portugal.",[["Global","/ecossistemas/biodiversity.html?lang=en"],["Portugal","/ecossistemas/biodiversidade.html?lang=en"]]],
                        ["Human pressures","Pressões humanas","Energy and the infrastructures, extraction and production chains transforming territory.",[["Energy","/energia/energy.html?lang=en"],["Territory","/energia/renewables-and-territory.html?lang=en"],["AI","/energia/ai-data-centres.html?lang=en"],["Mining","/energia/mining.html?lang=en"],["Livestock","/energia/livestock.html?lang=en"]]],
                        ["Portugal in detail","Portugal em detalhe","Mainland Portugal, the Azores and Madeira through national, regional and local evidence.",[["Observatory","/observatorio/observatorio-terra.html?lang=en"],["Species","/ecossistemas/biodiversidade.html?lang=en"],["Local calendar","/calendario/calendario.html?lang=en"]]],
                        ["Knowledge for care","Conhecimento para cuidar","Global organic practice translated into seasonal decisions for soil, water, plants and vines.",[["Regeneration calendar","/calendario/regeneration-calendar.html?lang=en"],["Living vineyard","/calendario/living-vineyard.html?lang=en"]]]
                    ] : [
                        ["Planeta e pressões","Planeta e pressões","Sinais físicos, pressões ambientais e ligações entre sistemas que não funcionam isoladamente.",[["Estado planetário","/observatorio/vetores-pressao-global.html?lang=pt#planetary-state"],["Sistemas de pressão","/observatorio/vetores-pressao-global.html?lang=pt#pressure-systems"],["Método","/observatorio/vetores-pressao-global.html?lang=pt#method"]]],
                        ["Recursos vitais","Recursos vitais","As três bases materiais da vida, lidas à escala global e sem separar as suas relações.",[["Água","/recursos/water.html?lang=pt"],["Ar","/recursos/air.html?lang=pt"],["Solo","/recursos/soil.html?lang=pt"]]],
                        ["Biodiversidade","Biodiversidade","Espécies, habitats, risco de extinção e relações ecológicas, do mundo a Portugal.",[["Mundo","/ecossistemas/biodiversity.html?lang=pt"],["Portugal","/ecossistemas/biodiversidade.html?lang=pt"]]],
                        ["Pressões humanas","Pressões humanas","Energia e cadeias de infraestrutura, extração e produção que transformam o território.",[["Energia","/energia/energy.html?lang=pt"],["Território","/energia/renewables-and-territory.html?lang=pt"],["IA","/energia/ai-data-centres.html?lang=pt"],["Mineração","/energia/mining.html?lang=pt"],["Pecuária","/energia/livestock.html?lang=pt"]]],
                        ["Portugal em detalhe","Portugal em detalhe","Portugal Continental, Açores e Madeira através de evidência nacional, regional e local.",[["Observatório","/observatorio/observatorio-terra.html?lang=pt"],["Espécies","/ecossistemas/biodiversidade.html?lang=pt"],["Calendário local","/calendario/calendario.html?lang=pt"]]],
                        ["Conhecimento para cuidar","Conhecimento para cuidar","Prática biológica global traduzida em decisões sazonais para solo, água, plantas e vinha.",[["Calendário de regeneração","/calendario/regeneration-calendar.html?lang=pt"],["Vinha viva","/calendario/living-vineyard.html?lang=pt"]]]
                    ];
                return portals.map(function(p){
                    return `<article class="portal"><a class="portal-mark" href="${p[3][0][1]}" aria-label="${esc(p[0])}">${getPortalMarkImage(p[1])}</a><div><h3>${esc(p[0])}</h3><p>${esc(p[2])}</p><nav class="portal-links" aria-label="${esc(p[0])}">${p[3].map(function(link){return `<a href="${link[1]}">${esc(link[0])} →</a>`}).join("")}</nav></div></article>`;
                }).join("");
            }

            async function start() {
                try {
                    const names = [
                            "especies_master",
                            "biodiversity-global-catalogue",
                            "crops-global-catalogue",
                            "grape-varieties-global",
                            "bioregioes",
                            "noticias",
                        ],
                        data = await Promise.all(names.map((n) =>
                            fetch(`/data/${n}.json`).then((r) => {
                                if (!r.ok) throw Error(n);
                                return r.json();
                            })
                        ));

                    showPulse(data[1], data[2], data[3]);
                    showToday(data[4], data[0]);
                    showNews(data[5]);
                    el("atlas-container").innerHTML = atlasContent();
                } catch (e) {
                    console.error("Não foi possível carregar a entrada do observatório:", e);
                    el("pulse").innerHTML = '<p class="empty">—</p>';
                }
            }

            fetch("/sidebar-content.html?v=19").then((r) => r.text()).then((h) => {
                el("sidebar").innerHTML = h;
                start();
            }).catch(() => start());
