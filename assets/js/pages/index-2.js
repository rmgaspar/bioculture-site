
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

                // Só entra no sorteio diário quem tem uma síntese real: sem isto, quase
                // metade do inventário devolve frases que só repetem o nome ("é uma planta
                // da família X"), o que transforma "um motivo para voltar" em palha.
                const dashTitle = /—| - /,
                    englishHint = /\b(the|is a|species of|found in|native to|belongs to)\b/i,
                    ptAccent = /[àáâãçéêíóôõú]/i;
                const entries = Object.entries(species || {}).filter(([, x]) => {
                    const nome = String(x.nome || ""), sintese = String(x.sintese || "").trim();
                    if (dashTitle.test(nome)) return false;
                    if (!sintese || sintese === "-" || sintese.length < 100) return false;
                    if (sintese.startsWith(nome)) return false;
                    const looksEnglish = englishHint.test(sintese) && !ptAccent.test(sintese);
                    return isEnglish ? looksEnglish : !looksEnglish;
                });
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
                    "Pragas e invasoras": "/images/categoria-pragas-v1.jpg",
                    "Soluções naturais": "/images/controlo-biologico-pragas-v1.png",
                };
                const src = imageMap[title] || "/images/placeholder.jpg";
                return `<img src="${src}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`;
            }

            const fmt = (v, digits = 1) =>
                new Intl.NumberFormat(isEnglish ? "en-GB" : "pt-PT", { maximumFractionDigits: digits }).format(v);

            function stackChart(items, note) {
                const total = items.reduce((sum, item) => sum + item.val, 0) || 1;
                const track = items.map((item) =>
                    `<span style="width:${(item.val / total * 100).toFixed(2)}%;background:${item.color}"></span>`
                ).join("");
                const legend = items.map((item) =>
                    `<span class="chart-legend-item"><i class="dot" style="background:${item.color}"></i>${
                        esc(item.label)
                    } <b>${fmt(item.val, 0)}</b></span>`
                ).join("");
                return `<div class="portal-chart"><div class="stack-track">${track}</div><div class="chart-legend">${legend}</div>${
                    note ? `<p class="chart-note">${esc(note)}</p>` : ""
                }</div>`;
            }

            function percentBars(items, badges) {
                const rows = items.map((item) =>
                    `<div class="percent-row"><span class="percent-label" style="color:${item.color}">${
                        esc(item.label)
                    }</span><span class="bar-row"><span class="bar-track"><span class="bar-fill" style="width:${
                        Math.min(item.val, 100).toFixed(1)
                    }%;background:${item.color}"></span></span><span class="bar-value"><b>${
                        fmt(item.val, item.digits ?? 1)
                    }${item.suffix || "%"}</b></span></span>${
                        item.note ? `<span class="percent-note">${esc(item.note)}</span>` : ""
                    }</div>`
                ).join("");
                const badgeHTML = (badges || []).map((b) => `<p class="chart-note">${esc(b)}</p>`).join("");
                return `<div class="portal-chart percent-chart">${rows}${badgeHTML}</div>`;
            }

            function countBars(items, note) {
                const max = Math.max(...items.map((i) => i.val)) * 1.05 || 1;
                const rows = items.map((item) =>
                    `<div class="percent-row"><span class="percent-label" style="color:${item.color}">${
                        esc(item.label)
                    }</span><span class="bar-row"><span class="bar-track"><span class="bar-fill" style="width:${
                        (item.val / max * 100).toFixed(1)
                    }%;background:${item.color}"></span></span><span class="bar-value"><b>${
                        fmt(item.val, item.digits ?? 0)
                    }</b></span></span>${
                        item.note ? `<span class="percent-note">${esc(item.note)}</span>` : ""
                    }</div>`
                ).join("");
                return `<div class="portal-chart percent-chart">${rows}${note ? `<p class="chart-note">${esc(note)}</p>` : ""}</div>`;
            }

            function conhecimentoChartHTML(pragas) {
                const vinhaPests = (pragas || []).filter((p) => (p.grupos || []).includes("vinha")).length;
                const items = [
                    { label: isEnglish ? "Growing guides (crops)" : "Fichas de cultivo (hortícolas)", val: 94, color: "#81966e" },
                    { label: isEnglish ? "Grape varieties documented" : "Castas de videira documentadas", val: 60, color: "#7d3350" },
                ];
                if (vinhaPests) items.push({
                    label: isEnglish ? "Vineyard pests mapped" : "Pragas de videira mapeadas",
                    val: vinhaPests, color: "#c9762f",
                });
                return countBars(items);
            }

            function growthChart(items) {
                const rows = items.map((item) => {
                    const max = Math.max(item.from.v, item.to.v) * 1.05;
                    return `<div class="growth-row"><span class="growth-label" style="color:${item.color}">${esc(item.label)}</span>` +
                        `<span class="bar-row"><span class="bar-year">${esc(item.from.y)}</span><span class="bar-track"><span class="bar-fill" style="width:${
                            (item.from.v / max * 100).toFixed(1)
                        }%;background:${item.color};opacity:.45"></span></span><span class="bar-value">${fmt(item.from.v, item.digits)}</span></span>` +
                        `<span class="bar-row"><span class="bar-year">${esc(item.to.y)}</span><span class="bar-track"><span class="bar-fill" style="width:${
                            (item.to.v / max * 100).toFixed(1)
                        }%;background:${item.color}"></span></span><span class="bar-value"><b>${fmt(item.to.v, item.digits)}</b></span></span>` +
                        `<span class="growth-unit">${esc(item.unit)}</span></div>`;
                }).join("");
                return `<div class="portal-chart growth-chart">${rows}</div>`;
            }

            function pragasChartHTML(pragas, flora, fauna) {
                const groupMeta = isEnglish ? [
                        ["horticolas", "Vegetables", "#6b8f47"],
                        ["pomares", "Orchards", "#c17f3e"],
                        ["ornamentais", "Ornamentals", "#9b6bb5"],
                        ["vinha", "Vineyard", "#7d3350"],
                        ["vertebrados", "Vertebrates", "#4a4a4a"],
                    ] : [
                        ["horticolas", "Hortícolas", "#6b8f47"],
                        ["pomares", "Pomares", "#c17f3e"],
                        ["ornamentais", "Ornamentais", "#9b6bb5"],
                        ["vinha", "Vinha", "#7d3350"],
                        ["vertebrados", "Vertebrados", "#4a4a4a"],
                    ];
                const counts = {};
                (pragas || []).forEach((p) => (p.grupos || []).forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
                const items = groupMeta.filter(([id]) => counts[id]).map(([id, label, color]) => ({ label, val: counts[id], color }));
                const note = isEnglish
                    ? `${(pragas || []).length} pests and diseases mapped by affected crop group (one pest can affect more than one group), plus ${(flora || []).length} invasive plant species and ${(fauna || []).length} invasive animal species.`
                    : `${(pragas || []).length} pragas e doenças mapeadas por grupo de cultura afetado (uma praga pode afetar mais do que um grupo), mais ${(flora || []).length} espécies de flora invasora e ${(fauna || []).length} espécies de fauna invasora.`;
                return items.length ? stackChart(items, note) : "";
            }

            function solucoesChartHTML(solucoes) {
                const list = solucoes?.solucoes || [];
                const protectionIds = new Set(["pragas", "doencas", "prevencao"]);
                let soil = 0, protection = 0;
                list.forEach((s) => { if (protectionIds.has(s.categoria_id)) protection++; else soil++; });
                const items = [
                    { label: isEnglish ? "Soil and resources" : "Solo e recursos", val: soil, color: "#5c7a4a" },
                    { label: isEnglish ? "Protection and prevention" : "Proteção e prevenção", val: protection, color: "#c9762f" },
                ].filter((i) => i.val);
                const note = isEnglish
                    ? `${list.length} biological practices and products: from soil fertility and beneficial microorganisms to integrated pest and disease prevention.`
                    : `${list.length} práticas e produtos biológicos: da fertilidade do solo e microrganismos benéficos à prevenção integrada de pragas e doenças.`;
                return items.length ? stackChart(items, note) : "";
            }

            function vetoresChartHTML(vetores) {
                const find = (id) => (vetores?.destaques || []).find((d) => d.id === id);
                const materiais = find("materiais"), nivelMar = find("nivel_mar"), ewaste = find("ewaste");
                if (!materiais || !nivelMar || !ewaste) return "";
                return growthChart([
                    {
                        label: isEnglish ? "Material extraction" : "Extração de materiais",
                        from: { y: String(materiais.referencia.ano), v: materiais.referencia.valor },
                        to: { y: String(materiais.ano), v: materiais.valor },
                        unit: isEnglish ? "billion t/year" : "mil M t/ano",
                        color: "#8a5a3c",
                        digits: 1,
                    },
                    {
                        label: isEnglish ? "Sea-level rise rate" : "Subida do nível do mar",
                        from: { y: nivelMar.referencia.periodo, v: nivelMar.referencia.valor },
                        to: { y: nivelMar.periodo, v: nivelMar.valor },
                        unit: isEnglish ? "mm/year" : "mm/ano",
                        color: "#2b6cb0",
                        digits: 2,
                    },
                    {
                        label: isEnglish ? "Electronic waste (2022)" : "Resíduos eletrónicos (2022)",
                        from: { y: isEnglish ? "generated" : "gerados", v: ewaste.valor },
                        to: { y: isEnglish ? "recycled (22.3%)" : "reciclados (22,3%)", v: Math.round(ewaste.valor * 0.223 * 10) / 10 },
                        unit: isEnglish ? "million t" : "milhões t",
                        color: "#7b1fa2",
                        digits: 1,
                    },
                ]);
            }

            function recursosChartHTML(water, air, soil) {
                const waterStress = water?.headline_metrics?.find((m) => m.indicator_id === "sdg_6_4_2_water_stress");
                const airExposed = air?.contextual_findings?.find((f) => f.unit === "percent");
                const soilRecent = soil?.headline_metrics?.find((m) => m.year === 2019);
                const soilPrior = soil?.headline_metrics?.find((m) => m.year === 2015);
                const items = [];
                if (waterStress) items.push({
                    label: isEnglish ? "Water · stress level" : "Água · stress hídrico",
                    val: waterStress.value, color: "#3498db",
                    note: isEnglish ? `${waterStress.year}, freshwater withdrawn vs. renewable supply` : `${waterStress.year}, água doce retirada face ao disponível renovável`,
                });
                if (airExposed) items.push({
                    label: isEnglish ? "Air · population above WHO limits" : "Ar · população acima dos limites da OMS",
                    val: airExposed.value, color: "#95a5a6",
                });
                if (soilRecent) items.push({
                    label: isEnglish ? "Soil · degraded land" : "Solo · terra degradada",
                    val: soilRecent.value, color: "#e67e22",
                    note: soilPrior
                        ? (isEnglish ? `${soilRecent.year}, up from ${fmt(soilPrior.value)}% in ${soilPrior.year}` : `${soilRecent.year}, subiu de ${fmt(soilPrior.value)}% em ${soilPrior.year}`)
                        : String(soilRecent.year),
                });
                return items.length ? percentBars(items) : "";
            }

            function biodiversidadeChartHTML(bio) {
                const rli = (bio?.headline_metrics || []).filter((m) => m.indicator_id === "sdg_15_5_1_red_list_index");
                const first = rli.find((m) => m.year === 1993), last = rli.slice().sort((a, b) => b.year - a.year)[0];
                if (!first || !last) return "";
                const species = bio?.contextual_findings?.find((f) => f.unit === "species_assessed");
                return growthChart([{
                    label: isEnglish ? "Red List Index (1 = no extinction risk)" : "Índice da Lista Vermelha (1 = sem risco de extinção)",
                    from: { y: String(first.year), v: first.value },
                    to: { y: String(last.year), v: last.value },
                    unit: species ? (isEnglish ? `index · ${fmt(species.value, 0)} species assessed` : `índice · ${fmt(species.value, 0)} espécies avaliadas`) : "index",
                    color: "#1e8449",
                    digits: 3,
                }]);
            }

            function pressoesHumanasChartHTML(ai, energy, livestock) {
                const html = [];
                const series = (ai?.electricity_series || []).filter((s) => s.kind === "historical" || s.kind === "estimate");
                const first = series[0], last = series[series.length - 1];
                if (first && last) html.push(growthChart([{
                    label: isEnglish ? "AI data-centre electricity" : "Eletricidade em centros de dados (IA)",
                    from: { y: String(first.year), v: first.twh },
                    to: { y: String(last.year), v: last.twh },
                    unit: isEnglish ? "TWh/year" : "TWh/ano",
                    color: "#7b1fa2",
                    digits: 0,
                }]));
                const renewable = energy?.headline_metrics?.renewable_final_energy_pct;
                const items = [];
                if (renewable) items.push({
                    label: isEnglish ? "Renewables in final energy use" : "Renováveis no consumo final de energia",
                    val: renewable.value, color: "#b8860b",
                    note: String(renewable.year),
                });
                const livestockShare = livestock?.headline?.find((h) => (h.label_pt || "").includes("antropogénicas"));
                if (livestockShare) items.push({
                    label: isEnglish ? "Livestock share of human-caused emissions" : "Pecuária nas emissões antropogénicas",
                    val: parseFloat(livestockShare.value), color: "#a66f50",
                    note: livestockShare.context,
                });
                if (items.length) html.push(percentBars(items));
                return html.join("");
            }

            function portugalChartHTML(terra) {
                const ind = terra?.indicadores_territoriais;
                if (!ind) return "";
                const items = [];
                if (ind.suscetibilidade_desertificacao) items.push({
                    label: isEnglish ? "Mainland territory at desertification risk" : "Território continental suscetível a desertificação",
                    val: ind.suscetibilidade_desertificacao.valor, color: "#c17f3e",
                    note: isEnglish ? "up 22% since the 1960–1990 climate normal" : "subiu 22% desde a normal climatológica 1960–1990",
                });
                if (ind.erosao_costeira) items.push({
                    label: isEnglish ? "Sandy coastline in erosion" : "Costa arenosa baixa em erosão",
                    val: ind.erosao_costeira.costa_baixa_arenosa_em_erosao_percent, color: "#6d8992",
                    note: isEnglish
                        ? `${fmt(ind.erosao_costeira.extensao_em_erosao_aproximada_km, 0)} of ${fmt(ind.erosao_costeira.extensao_monitorizada_km, 0)} km monitored`
                        : `${fmt(ind.erosao_costeira.extensao_em_erosao_aproximada_km, 0)} km de ${fmt(ind.erosao_costeira.extensao_monitorizada_km, 0)} km monitorizados`,
                });
                const badges = [];
                if (ind.areas_risco_inundacao) {
                    const years = (ind.areas_risco_inundacao.periodo || "").replace(/^ciclo\s*/i, "");
                    badges.push(
                        isEnglish
                            ? `${ind.areas_risco_inundacao.valor} significant flood-risk areas identified (${years} cycle)`
                            : `${ind.areas_risco_inundacao.valor} áreas de risco de inundação identificadas (ciclo ${years})`
                    );
                }
                return items.length ? percentBars(items, badges) : "";
            }

            function atlasContent(pragas, flora, fauna, solucoes, vetores, water, air, soil, bio, ai, energy, livestock, terra) {
                const portals = isEnglish ? [
                        ["Planet and pressures","Planeta e pressões","Global pressure indicators are not standing still — material extraction, sea levels and e-waste keep climbing.",[["Planetary state","/observatorio/vetores-pressao-global.html?lang=en#planetary-state"],["Pressure systems","/observatorio/vetores-pressao-global.html?lang=en#pressure-systems"],["Method","/observatorio/vetores-pressao-global.html?lang=en#method"]]],
                        ["Vital resources","Recursos vitais","The three material foundations of life are already under measurable stress — water, air and soil, read without separating their relationships.",[["Water","/recursos/agua.html?lang=en"],["Air","/recursos/ar.html?lang=en"],["Soil","/recursos/solo.html?lang=en"]]],
                        ["Biodiversity","Biodiversidade","Species, habitats, extinction risk and ecological relationships — the Red List Index has been falling for three decades.",[["Global","/ecossistemas/biodiversidade.html?lang=en"],["Portugal","/ecossistemas/biodiversidade.html?lang=en"]]],
                        ["Human pressures","Pressões humanas","Energy, AI infrastructure and livestock systems keep expanding the chains of extraction and production that transform territory.",[["Energy","/energia/energy.html?lang=en"],["Territory","/energia/transicao-etica.html?lang=en"],["AI","/energia/digital.html?lang=en"],["Mining","/energia/mineracao.html?lang=en"],["Livestock","/energia/pecuaria.html?lang=en"]]],
                        ["Pests and invasive species","Pragas e invasoras","A searchable catalogue of pests, diseases and invasive flora and fauna threatening crops and ecosystems — with identification and prevention sheets.",[["Open the catalogue","/calendario/calendario.html?lang=en#pragas-catalogo"]]],
                        ["Natural solutions","Soluções naturais","Biological practices and products organised by function, from soil fertility to integrated pest prevention.",[["Explore solutions","/services/produtos.html?lang=en"]]],
                        ["Portugal in detail","Portugal em detalhe","Mainland Portugal, the Azores and Madeira through national, regional and local evidence — from desertification risk to coastal erosion.",[["Observatory","/observatorio/observatorio-terra.html?lang=en"],["Species","/ecossistemas/biodiversidade.html?lang=en"],["Local calendar","/calendario/calendario.html?lang=en"]]],
                        ["Knowledge for care","Conhecimento para cuidar","Global organic practice translated into seasonal decisions for soil, water, plants and vines.",[["Regeneration calendar","/calendario/regeneration-calendar.html?lang=en"],["Living vineyard","/calendario/living-vineyard.html?lang=en"]]]
                    ] : [
                        ["Planeta e pressões","Planeta e pressões","Os indicadores globais de pressão não estão parados — extração de materiais, nível do mar e resíduos eletrónicos continuam a subir.",[["Estado planetário","/observatorio/vetores-pressao-global.html?lang=pt#planetary-state"],["Sistemas de pressão","/observatorio/vetores-pressao-global.html?lang=pt#pressure-systems"],["Método","/observatorio/vetores-pressao-global.html?lang=pt#method"]]],
                        ["Recursos vitais","Recursos vitais","As três bases materiais da vida já mostram sinais mensuráveis de stress — água, ar e solo, sem separar as suas relações.",[["Água","/recursos/agua.html?lang=pt"],["Ar","/recursos/ar.html?lang=pt"],["Solo","/recursos/solo.html?lang=pt"]]],
                        ["Biodiversidade","Biodiversidade","Espécies, habitats, risco de extinção e relações ecológicas — o Índice da Lista Vermelha está a cair há três décadas.",[["Mundo","/ecossistemas/biodiversidade.html?lang=pt"],["Portugal","/ecossistemas/biodiversidade.html?lang=pt"]]],
                        ["Pressões humanas","Pressões humanas","Energia, infraestrutura de IA e sistemas pecuários continuam a expandir as cadeias de extração e produção que transformam o território.",[["Energia","/energia/energy.html?lang=pt"],["Território","/energia/transicao-etica.html?lang=pt"],["IA","/energia/digital.html?lang=pt"],["Mineração","/energia/mineracao.html?lang=pt"],["Pecuária","/energia/pecuaria.html?lang=pt"]]],
                        ["Pragas e invasoras","Pragas e invasoras","Um catálogo pesquisável de pragas, doenças e flora e fauna invasoras que ameaçam culturas e ecossistemas — com fichas de identificação e prevenção.",[["Abrir o catálogo","/calendario/calendario.html?lang=pt#pragas-catalogo"]]],
                        ["Soluções naturais","Soluções naturais","Práticas e produtos biológicos organizados por função, da fertilidade do solo à prevenção integrada de pragas.",[["Explorar soluções","/services/produtos.html?lang=pt"]]],
                        ["Portugal em detalhe","Portugal em detalhe","Portugal Continental, Açores e Madeira através de evidência nacional, regional e local — do risco de desertificação à erosão costeira.",[["Observatório","/observatorio/observatorio-terra.html?lang=pt"],["Espécies","/ecossistemas/biodiversidade.html?lang=pt"],["Calendário local","/calendario/calendario.html?lang=pt"]]],
                        ["Conhecimento para cuidar","Conhecimento para cuidar","Prática biológica global traduzida em decisões sazonais para solo, água, plantas e vinha.",[["Calendário de regeneração","/calendario/regeneration-calendar.html?lang=pt"],["Vinha viva","/calendario/living-vineyard.html?lang=pt"]]]
                    ];
                const charts = {
                    "Planeta e pressões": vetoresChartHTML(vetores),
                    "Recursos vitais": recursosChartHTML(water, air, soil),
                    "Biodiversidade": biodiversidadeChartHTML(bio),
                    "Pressões humanas": pressoesHumanasChartHTML(ai, energy, livestock),
                    "Pragas e invasoras": pragasChartHTML(pragas, flora, fauna),
                    "Soluções naturais": solucoesChartHTML(solucoes),
                    "Portugal em detalhe": portugalChartHTML(terra),
                    "Conhecimento para cuidar": conhecimentoChartHTML(pragas),
                };
                return portals.map(function(p){
                    const chart = charts[p[1]] || "";
                    return `<article class="portal"><a class="portal-mark" href="${p[3][0][1]}" aria-label="${esc(p[0])}">${getPortalMarkImage(p[1])}</a><div><h3>${esc(p[0])}</h3><p>${esc(p[2])}</p>${chart}<nav class="portal-links" aria-label="${esc(p[0])}">${p[3].map(function(link){return `<a href="${link[1]}">${esc(link[0])} →</a>`}).join("")}</nav></div></article>`;
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

                    const atlasNames = [
                        "pragas", "flora_invasora", "fauna_invasora", "solucoes-catalogo", "vetores_pressao_global",
                        "water-overview", "air-overview", "soil-overview", "biodiversity-overview",
                        "ai-data-centres-overview", "energy-overview", "livestock-global", "observatorio_terra",
                    ];
                    const atlasExtras = await Promise.all(atlasNames.map((n) =>
                        fetch(`/data/${n}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
                    ));
                    el("atlas-container").innerHTML = atlasContent(...atlasExtras);
                } catch (e) {
                    console.error("Não foi possível carregar a entrada do observatório:", e);
                    el("pulse").innerHTML = '<p class="empty">—</p>';
                }
            }

            fetch("/sidebar-content.html?v=24").then((r) => r.text()).then((h) => {
                el("sidebar").innerHTML = h;
                start();
            }).catch(() => start());
