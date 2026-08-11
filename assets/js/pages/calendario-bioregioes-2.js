
            window.locationsDB = [];
            let currentSpeciesList = [];
            let filteredSpecies = [];
            let visibleCount = 8;
            let currentCategory = "All";

            const bioFacts = [
                {
                    titulo: "Biodiversidade",
                    desc: "Portugal abriga mais de 35.000 espécies de fauna e flora.",
                },
                {
                    titulo: "Solo Vivo",
                    desc: "A saúde do bioma depende da microvida do solo. Evite químicos.",
                },
                {
                    titulo: "Corredores",
                    desc: "A fragmentação do território é a maior ameaça à fauna nacional.",
                },
            ];

            function calcularDistancia(lat1, lon1, lat2, lon2) {
                const R = 6371;
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
            }

            async function initBiomas() {
                try {
                    // Caminho corrigido para subir um nível e entrar em data
                    const response = await fetch("../data/bioregioes.json");
                    window.locationsDB = await response.json();

                    const savedId = localStorage.getItem("biocultura_region");
                    const info = window.locationsDB.find((i) => String(i.id) === String(savedId)) ||
                        window.locationsDB[0];

                    renderPageData(info);
                    setupSidebarLogic();
                    iniciarCiclos();
                } catch (e) {
                    console.error("Erro ao carregar dados:", e);
                }
            }

            function renderPageData(info) {
                if (!info) return;
                document.getElementById("reg-name").innerText = info.titulo;
                const b = info.biomas || {};

                document.getElementById("txt-threatened").innerText = (b.fauna_ameacada?.length)
                    ? "Registadas: " + b.fauna_ameacada.join(", ")
                    : "Sem espécies em risco crítico registadas.";
                document.getElementById("txt-protected").innerText = (b.fauna_protegida?.length)
                    ? "Sob proteção: " + b.fauna_protegida.join(", ")
                    : "Monitorização geral ICNF.";

                document.getElementById("report-grid-bio").innerHTML = `
                <div class="report-item"><h5>Geologia</h5><p>Solo: ${b.solo || "N/A"}. pH: ${
                    b.ph_solo || "N/A"
                }. Textura: ${b.textura || "N/A"}.</p></div>
                <div class="report-item"><h5>Flora</h5><p>Espécies principais: ${
                    b.flora ? b.flora.join(", ") : "N/A"
                }.</p></div>
            `;

                currentSpeciesList = b.fauna_comum || [];
                filterBy("All");
            }

            function filterBy(cat) {
                currentCategory = cat;
                visibleCount = 8;

                document.querySelectorAll(".filter-btn").forEach((btn) => {
                    const btnText = btn.innerText;
                    const match = (cat === "All" && btnText === "Todos") ||
                        (translateTaxonomyReverse(cat) === btnText);
                    btn.classList.toggle("active", match);
                });

                filteredSpecies = currentCategory === "All"
                    ? currentSpeciesList
                    : currentSpeciesList.filter((s) => s.grupo === cat);
                renderSpeciesGrid();
            }

            function renderSpeciesGrid() {
                const grid = document.getElementById("species-grid");
                const show = filteredSpecies.slice(0, visibleCount);

                grid.innerHTML = show.length
                    ? show.map((s) => `
                <div class="species-card">
                    <img src="${s.imagem}" onerror="this.src='../images/placeholder-bio.jpg'">
                    <b>${s.nome}</b>
                    <span>${translateTaxonomy(s.grupo)}</span>
                </div>
            `).join("")
                    : '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#bbb;">Nenhuma espécie registada nesta categoria.</p>';

                document.getElementById("btn-load-more").style.display =
                    filteredSpecies.length > visibleCount ? "block" : "none";
            }

            function translateTaxonomy(g) {
                const d = {
                    "Amphibia": "Anfíbio",
                    "Insecta": "Inseto",
                    "Reptilia": "Réptil",
                    "Plantae": "Planta",
                    "Mammalia": "Mamífero",
                    "Aves": "Ave",
                    "Mollusca": "Molusco",
                    "Fungi": "Fungo",
                    "Actinopterygii": "Peixe",
                };
                return d[g] || g;
            }
            function translateTaxonomyReverse(g) {
                const d = {
                    "Amphibia": "Anfíbios",
                    "Insecta": "Insetos",
                    "Reptilia": "Répteis",
                    "Plantae": "Plantas",
                    "Mammalia": "Mamíferos",
                    "Aves": "Aves",
                    "Mollusca": "Moluscos",
                    "Fungi": "Fungos",
                    "Actinopterygii": "Peixe",
                };
                for (let k in d) if (d[k] === g) return k;
                return g;
            }

            function setupSidebarLogic() {
                $(document).on("click", "#btn-gps-trigger", function () {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        let closest = window.locationsDB[0], minD = Infinity;
                        window.locationsDB.forEach((c) => {
                            const d = calcularDistancia(
                                pos.coords.latitude,
                                pos.coords.longitude,
                                c.lat,
                                c.lon,
                            );
                            if (d < minD) {
                                minD = d;
                                closest = c;
                            }
                        });
                        localStorage.setItem("biocultura_region", closest.id);
                        location.reload();
                    });
                });
                $(document).on("input", "#loc-search-input", function () {
                    const val = $(this).val().toLowerCase(), dropdown = $("#loc-dropdown").empty();
                    if (val.length < 2) return dropdown.hide();
                    window.locationsDB.filter((i) => i.titulo.toLowerCase().includes(val)).slice(0, 8)
                        .forEach((m) => {
                            $('<div class="bio-res-item"></div>').text(m.titulo).on("click", () => {
                                localStorage.setItem("biocultura_region", m.id);
                                location.reload();
                            }).appendTo(dropdown);
                        });
                    dropdown.show();
                });
            }

            function iniciarCiclos() {
                const imgs = document.querySelectorAll("#bio-globe-cycler img");
                let imgP = 0;
                if (imgs.length) {
                    setInterval(() => {
                        imgs.forEach((i) => i.classList.remove("active"));
                        imgP = (imgP + 1) % imgs.length;
                        imgs[imgP].classList.add("active");
                    }, 6000);
                }
                const container = document.getElementById("bio-facts-container");
                if (container) {
                    container.innerHTML = bioFacts.map((f, i) =>
                        `<div class="bio-fact-item ${
                            i === 0 ? "active" : ""
                        }"><b>${f.titulo}:</b> ${f.desc}</div>`
                    ).join("");
                    let factP = 0;
                    setInterval(() => {
                        const items = document.querySelectorAll(".bio-fact-item");
                        if (items.length) {
                            items.forEach((el) => el.classList.remove("active"));
                            factP = (factP + 1) % items.length;
                            items[factP].classList.add("active");
                        }
                    }, 8000);
                }
            }

            async function carregarBioregioes() {
                try {
                    // O "?v=" + Date.now() garante que o ficheiro nunca venha da cache
                    const response = await fetch("data/bioregioes.json?v=" + Date.now());
                    const data = await response.json();

                    console.log("Dados carregados:", data);
                    // Resto da tua lógica de renderização...
                } catch (e) {
                    console.error("Erro ao carregar biomas:", e);
                }
            }

            document.getElementById("btn-load-more").onclick = () => {
                visibleCount += 8;
                renderSpeciesGrid();
            };

            fetch("../sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                initBiomas();
            });
        