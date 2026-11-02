
(function () {
            const colors = ["#c62828", "#2e7d32", "#607d8b"];
            const isEnglish = new URLSearchParams(location.search).get("lang") === "en" || !!window.BioCultureI18n?.isEnglish;
            const pick = (item, key = "name") => item?.[`${key}_${isEnglish ? "en" : "pt"}`] || item?.[`${key}_pt`] || "";
            const escapeHtml = (value) =>
                String(value ?? "").replace(
                    /[&<>'"]/g,
                    (char) => ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        "'": "&#39;",
                        '"': "&quot;",
                    }[char]),
                );
            const format = (value, digits = 1) =>
                new Intl.NumberFormat(window.BioCultureI18n?.isEnglish ? "en-GB" : "pt-PT", { maximumFractionDigits: digits }).format(value);
            const getSource = (data, id) => data.fontes.find((item) => item.id === id);
            const highlight = (data, id) => data.destaques.find((item) => item.id === id);

            function renderNexuses(data) {
                const english = {
                    "Alimentação–clima–natureza":["Food–climate–nature","Agricultural expansion, livestock, fertilisation and fishing connect food demand to emissions, water, nutrients and habitat conversion."],
                    "Energia–minerais–território":["Energy–minerals–territory","Energy technologies and grids require materials and space, while reducing emissions only when they replace more intensive systems."],
                    "Digital–energia–água":["Digital–energy–water","Computing increases electricity, equipment and cooling demand; impact depends on efficiency, climate, river basin and marginal electricity."],
                    "Cidade–solo–calor–cheia":["City–soil–heat–flood","Sealing and vegetation loss reduce infiltration and evapotranspiration, increasing runoff and local heat."],
                    "Clima–oceano–costas":["Climate–ocean–coasts","The ocean absorbs heat and CO₂, increasing temperature, acidification and sea level, with effects on ecosystems and coastal communities."]
                };
                // Indicadores a cruzar: o ficheiro de dados está em português; aqui só se traduz o rótulo.
                const indicatorsEn = { "mudança de cobertura": "land-cover change", "metano": "methane", "azoto": "nitrogen", "captação de água": "water abstraction", "estado de stocks": "stock status", "ciclo de vida": "life cycle", "origem mineral": "mineral origin", "reciclagem": "recycling", "fragmentação": "fragmentation", "mix elétrico": "electricity mix", "stress hídrico": "water stress", "selagem": "soil sealing", "coberto arbóreo": "tree cover", "temperatura superficial": "surface temperature", "cheia rápida": "flash flood", "calor oceânico": "ocean heat", "nível do mar": "sea level", "gelo": "ice", "exposição costeira": "coastal exposure" };
                // Cor de cada elo do esquema, pelo tema a que pertence (as mesmas cores das dimensões e dos sistemas).
                const nodeColor = { "alimentação": "#7a4d2b", "clima": "#b4472f", "natureza": "#4f7a2b", "energia": "#4b5563", "minerais": "#8a4b32", "território": "#7a4d2b", "digital": "#44529a", "água": "#1f6f8b", "cidade": "#6d675b", "solo": "#7a4d2b", "calor": "#b4472f", "cheia": "#1f6f8b", "oceano": "#1f6f8b", "costas": "#2a7473" };
                document.getElementById("nexus-grid").innerHTML = data.nexos.map((item) => {
                    const translated = english[item.titulo];
                    const caution = isEnglish ? "Interpret together with scale, location, substitution and the stated evidence boundaries." : item.cautela;
                    const title = isEnglish && translated ? translated[0] : item.titulo;
                    const names = title.split("–"), keys = item.titulo.split("–");
                    const nodes = names.map((name, i) => `<span class="nexus-node" style="--n:${nodeColor[keys[i].toLowerCase()] || "#4b5563"}"><i aria-hidden="true"></i><b>${escapeHtml(name)}</b></span>`).join('<span class="nexus-link" aria-hidden="true"></span>');
                    const indicators = (item.indicadores_para_cruzar || []).map(name => `<li>${escapeHtml(isEnglish ? (indicatorsEn[name] || name) : name)}</li>`).join("");
                    return `<article class="nexus-card" data-nexus="${escapeHtml(item.id)}"><div class="nexus-diagram" role="img" aria-label="${escapeHtml(title)}">${nodes}</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(isEnglish && translated ? translated[1] : item.mecanismo)}</p>${indicators ? `<div class="nexus-indicators"><span>${isEnglish ? "Indicators to cross-check" : "Indicadores a cruzar"}</span><ul>${indicators}</ul></div>` : ""}<details><summary>${isEnglish ? "Important note" : "Nota importante"}</summary><p>${escapeHtml(caution)}</p></details></article>`;
                }).join("");
            }

            function translatePressureShell() {
                if (!isEnglish) return;
                document.documentElement.lang = "en";
                const replacements = [
                    ["#sistemas h2", "Pressure systems"], ["#system-chain .chapter", "Material cycle"], ["#system-chain h2", "Pressure begins before the product"],
                    ["#system-chain .pressure-heading p", "Following the whole chain prevents impacts from disappearing between borders, suppliers and life-cycle stages."],
                    ["#pressure-systems .chapter", "Systems"], ["#pressure-systems h2", "The great machines of transformation"],
                    ["#pressure-systems .pressure-heading p", "Filter by environmental dimension. Each card shows the dominant mechanism and links to the specialised observatory when available."],
                    ["#method .chapter", "Method"], ["#method h2", "How not to lose the planet in the numbers"],
                    ["#pressure-news .chapter", "Latest"], ["#pressure-news h2", "Pressures in motion"],
                    ["#pressure-news .pressure-heading p", "Selected news on decisions, projects and chains that alter pressure on living systems."],
                    [".reading-box h3", "How to interpret this data"], ["#connections h2", "How pressures connect"], ["#connections p", "Simple explanations of mechanisms; additional detail remains collapsed."]
                ];
                replacements.forEach(([selector, html]) => { const node = document.querySelector(selector); if (node) node.innerHTML = html; });
                document.querySelector("#panorama-global .reading-box ul").innerHTML = "<li>Observed values, estimates and projections are identified separately.</li><li>A world average can conceal severe local impacts.</li><li>Production and consumption can occur in different regions because of trade.</li><li>Electricity, water and land use should not be converted using universal factors.</li>";
            }

            function renderPressureArchitecture(architecture) {
                document.getElementById("chain-grid").innerHTML = architecture.chain.map((item, index) =>
                    `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p></article>`
                ).join("");
                const filters = [{ id: "all", name_pt: "Todos", name_en: "All" }, ...architecture.dimensions];
                document.getElementById("dimension-filters").innerHTML = filters.map((item, index) =>
                    `<button type="button" class="${index === 0 ? "active" : ""}" data-dimension="${item.id}"><i aria-hidden="true"></i>${escapeHtml(pick(item))}</button>`
                ).join("");
                const credit = (photo) => `${isEnglish ? "Photo" : "Foto"}: ${escapeHtml(photo.author)} · <a href="${escapeHtml(photo.license_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(photo.license)}</a> · <a href="${escapeHtml(photo.page)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>`;
                const drawSystems = (dimension = "all") => {
                    const systems = architecture.systems.filter(item => dimension === "all" || item.dimensions.includes(dimension));
                    document.getElementById("system-summary").textContent = `${systems.length} ${isEnglish ? "systems shown" : "sistemas apresentados"}`;
                    document.getElementById("system-grid").innerHTML = systems.map(item => {
                        const dims = item.dimensions.map(id => `<li data-dim="${id}"${id === dimension ? ' class="focus"' : ""}>${escapeHtml(pick(architecture.dimensions.find(d => d.id === id)))}</li>`).join("");
                        const live = item.status === "live" && item.href;
                        const status = live ? (isEnglish ? "Explore" : "Explorar") : item.status === "next" ? (isEnglish ? "Next in-depth page" : "Próximo aprofundamento") : (isEnglish ? "Mapped in this overview" : "Mapeado nesta síntese");
                        const photo = item.photo ? `<figure class="system-photo" data-no-signature><img src="/images/${escapeHtml(item.photo.file)}" alt="${escapeHtml(isEnglish ? item.photo.alt_en : item.photo.alt_pt)}" width="1000" height="667" loading="lazy"><figcaption>${credit(item.photo)}</figcaption></figure>` : "";
                        const action = live ? `<a class="system-cta" href="${escapeHtml(item.href)}?lang=${isEnglish ? "en" : "pt"}">${status} ↗</a>` : `<span class="system-cta">${status}</span>`;
                        return `<article class="system-card ${item.status}" data-system="${escapeHtml(item.id)}">${photo}<div class="system-body"><small>${escapeHtml(pick(item, "kicker"))}</small><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p><ul class="system-dims">${dims}</ul>${action}</div></article>`;
                    }).join("");
                };
                document.getElementById("dimension-filters").addEventListener("click", event => {
                    const button = event.target.closest("button"); if (!button) return;
                    document.querySelectorAll("#dimension-filters button").forEach(item => item.classList.toggle("active", item === button));
                    drawSystems(button.dataset.dimension);
                });
                drawSystems();
                document.getElementById("pressure-scope").textContent = architecture.meta[`scope_${isEnglish ? "en" : "pt"}`];
                // Um ícone por regra (esquemas simples, a traço): unidades diferentes, lugar e cadeia, fluxo e reservatório, redução e deslocação.
                const svg = (body) => `<svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
                const ruleIcons = [
                    svg('<circle cx="12" cy="15" r="7"/><rect x="26" y="8" width="14" height="14" rx="2"/><path d="M10 40 18 28l8 12z"/><path d="M32 30l8 8M40 30l-8 8"/>'),
                    svg('<path d="M24 43S11 32 11 20a13 13 0 0 1 26 0c0 12-13 23-13 23z"/><circle cx="24" cy="20" r="4.5"/>'),
                    svg('<path d="M24 4s7 8 7 12a7 7 0 0 1-14 0c0-4 7-12 7-12z"/><path d="M10 30h28v10a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z"/><path d="M10 35h28"/>'),
                    svg('<path d="M10 6v22m0 0-6-6m6 6 6-6"/><path d="M22 36h22m0 0-6-6m6 6-6 6"/>')
                ];
                document.getElementById("rule-grid").innerHTML = architecture.rules.map((item, index) => `<article><i class="rule-icon" aria-hidden="true">${ruleIcons[index] || ""}</i><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p></article>`).join("");
            }

            function renderPressureSources(data) {
                document.getElementById("pressure-sources").innerHTML = `<span class="sources-label">${isEnglish ? "Reference sources" : "Fontes de referência"}</span>` + data.fontes.slice(0, 12).map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.entidade)} · ${isEnglish ? "source" : "fonte"} ↗</a>`).join("");
            }

            function renderPressureNews() {
                fetch("/data/noticias.json").then(response => response.json()).then(items => {
                    const selected = (window.BioCultureNews?.rank(items) || items).filter(item => window.BioCultureNews.about(item, ["clima*", "climate", "energia", "energy", "minera*", "mining", "construção", "construction", "urban*", "têxt*", "textile*", "moda", "fashion", "indústria*", "industr*", "resíduo*", "waste", "plástic*", "plastic*", "pecuári*", "livestock", "desflorest*", "deforestation", "biodivers*", "carvão", "coal", "nuclear", "emissões", "emissions"], ["clima", "energia", "mineracao", "impacto-digital", "biodiversidade"])).slice(0, 6);
                    document.getElementById("pressure-news-grid").innerHTML = selected.map(item => window.BioCultureNews.cardHtml(item)).join("") || `<p>${isEnglish ? "No selected news at this time." : "Sem notícias selecionadas neste momento."}</p>`;
                }).catch(() => { document.getElementById("pressure-news-grid").innerHTML = `<p>${isEnglish ? "News could not be loaded." : "Não foi possível carregar as notícias."}</p>`; });
            }

            async function loadData() {
                try {
                    translatePressureShell();
                    const [response, architectureResponse] = await Promise.all([fetch("/data/vetores_pressao_global.json?v=3"), fetch("/data/pressure-systems-global.json?v=3")]);
                    if (!response.ok || !architectureResponse.ok) throw new Error(`HTTP ${response.status}/${architectureResponse.status}`);
                    const [data, architecture] = await Promise.all([response.json(), architectureResponse.json()]);
                    if (!data.destaques || !data.series || !data.vetores) {
                        throw new Error("O ficheiro não contém dados utilizáveis.");
                    }
                    renderNexuses(data);
                    renderPressureArchitecture(architecture);
                    renderPressureSources(data);
                    renderPressureNews();
                } catch (error) {
                    console.error("Erro ao carregar os vetores globais:", error);
                    const chain = document.getElementById("chain-grid");
                    if (chain) chain.innerHTML = `<div class="data-error"><strong>${isEnglish ? "The indicators could not be loaded." : "Não foi possível carregar os indicadores."}</strong><br>${escapeHtml(error.message)}</div>`;
                }
            }
            loadData();
})();
