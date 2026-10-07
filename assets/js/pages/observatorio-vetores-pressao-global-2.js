
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
                document.getElementById("nexus-grid").innerHTML = data.nexos.map((item) => { const translated = english[item.titulo]; const caution = isEnglish ? "Interpret together with scale, location, substitution and the stated evidence boundaries." : item.cautela; return `<article class="nexus-card"><h3>${escapeHtml(isEnglish && translated ? translated[0] : item.titulo)}</h3><p>${escapeHtml(isEnglish && translated ? translated[1] : item.mecanismo)}</p><details><summary>${isEnglish ? "Important note" : "Nota importante"}</summary><p>${escapeHtml(caution)}</p></details></article>`; }).join("");
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
                    `<button type="button" class="${index === 0 ? "active" : ""}" data-dimension="${item.id}">${escapeHtml(pick(item))}</button>`
                ).join("");
                const drawSystems = (dimension = "all") => {
                    const systems = architecture.systems.filter(item => dimension === "all" || item.dimensions.includes(dimension));
                    document.getElementById("system-summary").textContent = `${systems.length} ${isEnglish ? "systems shown" : "sistemas apresentados"}`;
                    document.getElementById("system-grid").innerHTML = systems.map(item => {
                        const dimensionNames = item.dimensions.map(id => pick(architecture.dimensions.find(d => d.id === id))).join(" · ");
                        const status = item.status === "live" ? (isEnglish ? "Explore" : "Explorar") : item.status === "next" ? (isEnglish ? "Next in-depth page" : "Próximo aprofundamento") : (isEnglish ? "Mapped in this overview" : "Mapeado nesta síntese");
                        const content = `<small>${escapeHtml(pick(item, "kicker"))}</small><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p><div class="system-dimensions">${escapeHtml(dimensionNames)}</div><strong>${status}${item.status === "live" ? " ↗" : ""}</strong>`;
                        return item.href && item.status === "live" ? `<a class="system-card" href="${escapeHtml(item.href)}?lang=${isEnglish ? "en" : "pt"}">${content}</a>` : `<article class="system-card ${item.status}">${content}</article>`;
                    }).join("");
                };
                document.getElementById("dimension-filters").addEventListener("click", event => {
                    const button = event.target.closest("button"); if (!button) return;
                    document.querySelectorAll("#dimension-filters button").forEach(item => item.classList.toggle("active", item === button));
                    drawSystems(button.dataset.dimension);
                });
                drawSystems();
                document.getElementById("pressure-scope").textContent = architecture.meta[`scope_${isEnglish ? "en" : "pt"}`];
                document.getElementById("rule-grid").innerHTML = architecture.rules.map((item, index) => `<article><span>0${index + 1}</span><h3>${escapeHtml(pick(item))}</h3><p>${escapeHtml(pick(item, "text"))}</p></article>`).join("");
            }

            function renderPressureSources(data) {
                document.getElementById("pressure-sources").innerHTML = data.fontes.slice(0, 12).map(source => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.entidade)} · ${isEnglish ? "source" : "fonte"} ↗</a>`).join("");
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
                    const [response, architectureResponse] = await Promise.all([fetch("/data/vetores_pressao_global.json?v=3"), fetch("/data/pressure-systems-global.json?v=1")]);
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
