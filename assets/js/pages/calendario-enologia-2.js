
            let locationsDB = [], castasDB = [], pragasDB = [], dicasDB = [], noticiasEno = [];
            let currentRegion = "Portugal",
                showAllRegional = false,
                showAllPests = false,
                visibleNews = 4,
                atlasLimit = 12,
                atlasQuickFilter = "";
            const regionOrder = [
                "Vinhos Verdes",
                "Trás-os-Montes",
                "Douro",
                "Dão",
                "Bairrada",
                "Beira Interior",
                "Lisboa",
                "Tejo",
                "Península de Setúbal",
                "Alentejo",
                "Algarve",
                "Madeira",
                "Açores",
            ];
            const concelhoVinhoMap = { "mação": "Beira Interior" };
            const regiaoVinhoMap = {
                "minho": "Vinhos Verdes",
                "douro litoral": "Vinhos Verdes",
                "trás-os-montes": "Trás-os-Montes",
                "beira alta": "Dão",
                "beira litoral": "Bairrada",
                "beira baixa": "Beira Interior",
                "centro": "Beira Interior",
                "estremadura": "Lisboa",
                "ribatejo": "Tejo",
                "oeste-e-vale-do-tejo": "Tejo",
                "alentejo": "Alentejo",
                "algarve": "Algarve",
                "madeira": "Madeira",
                "acores": "Açores",
                "açores": "Açores",
            };
            const regionIntros = {
                "Vinhos Verdes":
                    "Influência atlântica, humidade e solos frequentemente graníticos favorecem castas de elevada frescura.",
                "Douro":
                    "Encostas, calor e solos xistosos exigem gestão rigorosa da água e proteção contra erosão.",
                "Dão":
                    "Altitude, abrigo montanhoso e solos graníticos favorecem maturação equilibrada e acidez.",
                "Bairrada":
                    "A influência atlântica e os solos argilo-calcários sustentam vinhos frescos e estruturados.",
                "Beira Interior":
                    "Altitude, amplitude térmica e solos graníticos ou xistosos marcam a viticultura do interior; a realidade de cada parcela deve ser confirmada localmente.",
                "Lisboa":
                    "A proximidade do Atlântico cria diversidade de microclimas, vento e maturações moderadas.",
                "Tejo":
                    "A influência do Tejo, os terraços fluviais e as zonas mais secas criam condições vitícolas diversas.",
                "Alentejo":
                    "Calor e secura tornam essenciais a cobertura do solo, sombra e utilização eficiente da água.",
                "Madeira":
                    "Solos vulcânicos, relevo e humidade criam contrastes fortes em pequenas distâncias.",
                "Açores":
                    "Solos vulcânicos, vento e salinidade atlântica moldam uma viticultura insular singular.",
                "Portugal":
                    "Selecione uma localidade para apresentar o contexto vitícola mais próximo.",
            };
            const practiceIds = [
                "adubo-verde",
                "composto-superficie",
                "rega-gota-a-gota",
                "sebe-viva",
                "poda-seletiva",
                "solo-sempre-com-raiz",
            ];
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
            const titleCase = (value) =>
                String(value || "").split(" ").map((word) =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(" ");

           function vineVignette(c) {
                const isBranco = c.cor === "Branco";
                const cls = `${isBranco ? "branco" : "tinto"} ${
                    String(c.maturacao || "").toLowerCase().includes("precoce") ? "precoce" : "tardia"
                }`;

                const img = isBranco
                    ? "/images/videira-branca.jpg"
                    : "/images/videira-tinta.jpg";

                return `<span class="vine-vignette ${cls}" aria-hidden="true">
                    <img src="${img}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" />
                </span>`;
            }

            function grapeCard(c) {
                const soil = c.tecnico?.solo || "-";
                return `<article class="casta-card" tabindex="0" role="button" data-casta="${
                    escapeHtml(c.id)
                }" aria-label="Abrir ficha de ${escapeHtml(c.nome)}">${vineVignette(c)}<div class="casta-content"><div class="casta-top"><span class="casta-name">${
                    escapeHtml(c.nome)
                }</span><span class="color-dot ${c.cor === "Branco" ? "branco" : ""}"></span></div><span class="casta-origin">${
                    escapeHtml(c.origem || "-")
                } · ${escapeHtml(c.cor || "-")}</span><p><strong>Solo:</strong> ${
                    escapeHtml(soil)
                }</p><div class="card-tags"><span class="tag">${
                    escapeHtml(c.maturacao || "-")
                }</span><span class="tag">${escapeHtml(c.vigor || "-")}</span></div></div></article>`;
            }

            function renderStats() {
                const regions = new Set(castasDB.flatMap((c) => c.regioes || []));
                const countries = new Set(castasDB.flatMap((c) => c.paises || []));
                const native = castasDB.filter((c) => c.autoctone).length;
                document.getElementById("stat-strip").innerHTML = [
                    [castasDB.length, "castas documentadas"],
                    [native, "castas autóctones"],
                    [regions.size, "regiões vitícolas"],
                    [countries.size, "países representados"],
                ].map(([v, l]) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`)
                    .join("");
            }

            function renderRegion(info) {
                const location = info
                    ? (info.titulo + (info.concelho ? ", " + titleCase(info.concelho) : ""))
                    : "Portugal";
                const concelho = String(info?.concelho || "").toLowerCase();
                const regiao = String(info?.regiao || "").toLowerCase();
                currentRegion = info?.regiao_vinho || concelhoVinhoMap[concelho] ||
                    regiaoVinhoMap[regiao] || "Portugal";
                document.getElementById("reg-name").textContent = location;
                document.getElementById("wine-region").textContent = currentRegion;
                document.getElementById("region-description").textContent =
                    regionIntros[currentRegion] ||
                    `Património vitícola de ${currentRegion}, moldado pelo solo, clima e práticas locais.`;
                const regional = castasDB.filter((c) =>
                    (c.regioes || []).some((r) => r.toLowerCase() === currentRegion.toLowerCase()) &&
                    c.autoctone
                );
                const visible = showAllRegional ? regional : regional.slice(0, 4);
                document.getElementById("regional-grid").innerHTML = visible.length
                    ? visible.map(grapeCard).join("")
                    : '<div class="empty-state">Ainda não existem castas regionais comparáveis para esta localização.</div>';
                const button = document.getElementById("show-region-all");
                button.style.display = regional.length > 4 ? "inline-block" : "none";
                button.textContent = showAllRegional ? "Recolher" : `Ver todas (${regional.length})`;
            }

            function renderAtlas(reset = false) {
                if (reset) atlasLimit = 12;
                const query = document.getElementById("casta-search").value.trim().toLowerCase();
                const color = document.getElementById("color-filter").value;
                const origin = document.getElementById("origin-filter").value;
                const filtered = castasDB.filter((c) => {
                    const quick = !atlasQuickFilter ||
                        atlasQuickFilter === "autoctone" && c.autoctone ||
                        atlasQuickFilter === "precoce" && String(c.maturacao || "").toLowerCase().includes("precoce") ||
                        atlasQuickFilter === "tardia" && String(c.maturacao || "").toLowerCase().includes("tardia");
                    return quick && (!query ||
                        [c.nome, c.origem, c.tipo_vinho, ...(c.regioes || []), ...(c.aromas || [])]
                            .join(" ").toLowerCase().includes(query)) &&
                        (!color || c.cor === color) && (!origin || c.origem === origin);
                });
                document.getElementById("result-count").textContent = `${filtered.length} ${
                    filtered.length === 1 ? "casta encontrada" : "castas encontradas"
                } · a mostrar ${Math.min(filtered.length, atlasLimit)}`;
                document.getElementById("atlas-grid").innerHTML = filtered.length
                    ? filtered.slice(0, atlasLimit).map(grapeCard).join("")
                    : '<div class="empty-state">Nenhuma casta corresponde aos filtros selecionados.</div>';
                const more = document.getElementById("atlas-more");
                more.style.display = filtered.length > atlasLimit ? "inline-block" : "none";
            }

            function renderPractices() {
                const selected = practiceIds.map((id) => dicasDB.find((item) => item.id === id)).filter(
                    Boolean,
                );
                document.getElementById("practice-grid").innerHTML = selected.map((item) =>
                    `<article class="practice-card"><h3>${
                        escapeHtml(item.titulo)
                    }</h3><span class="practice-meta">${escapeHtml(item.categoria)} · ${
                        escapeHtml(item.quando)
                    }</span><p>${
                        escapeHtml(item.resumo)
                    }</p><details><summary>Ver aplicação</summary><ol>${
                        (item.passos || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")
                    }</ol></details></article>`
                ).join("");
            }

            function vinePests() {
                return pragasDB.filter((item) => {
                    const text = [item.nome_comum, item.descricao, ...(item.plantas_afetadas || [])]
                        .join(" ").toLowerCase();
                    return /videira|vinha|uva/.test(text);
                });
            }
            function renderPests() {
                const all = vinePests(), visible = showAllPests ? all : all.slice(0, 6);
                document.getElementById("pest-grid").innerHTML = visible.map((item) =>
                    `<article class="pest-card"><h3>${
                        escapeHtml(item.nome_comum)
                    }</h3><span class="pest-meta">${escapeHtml(item.tipo)} · ${
                        escapeHtml(item.sazonalidade_portugal || "-")
                    }</span><p><strong>Sinais:</strong> ${
                        escapeHtml(item.sintomas)
                    }</p><details><summary>Prevenção biológica</summary><p>${
                        escapeHtml(item.prevencao)
                    }</p><p><strong>Auxiliares:</strong> ${
                        escapeHtml((item.aliados_naturais || []).join(", ") || "-")
                    }.</p></details><a class="pest-detail-link" href="/ecossistemas/especie-detalhe.html?id=${
                        encodeURIComponent(item.id)
                    }">Ver ficha completa →</a></article>`
                ).join("");
                const button = document.getElementById("toggle-pests");
                button.style.display = all.length > 6 ? "inline-block" : "none";
                button.textContent = showAllPests ? "Recolher lista" : `Ver todos (${all.length})`;
            }

            function showDetail(id) {
                const c = castasDB.find((item) => item.id === id);
                if (!c) return;
                const related = castasDB.filter((item) =>
                    item.id !== c.id && item.cor === c.cor &&
                    (item.regioes || []).some((r) => (c.regioes || []).includes(r))
                ).slice(0, 4);
                const profile = c.perfil || {}, tech = c.tecnico || {};
                document.getElementById("casta-detail-view").innerHTML =
                    `<span class="detail-back" id="detail-back">← voltar ao atlas</span><div class="detail-hero"><div><span class="category-label">${
                        escapeHtml(c.cor)
                    } · ${escapeHtml(c.tipo_vinho)}</span><h1>${
                        escapeHtml(c.nome)
                    }</h1><p class="detail-intro">${
                        escapeHtml(c.historia || "-")
                    }</p><div class="profile-grid">${
                        [["Acidez", profile.acidez], ["Corpo", profile.corpo], [
                            "Taninos",
                            profile.taninos,
                        ], ["Álcool", profile.alcool]].map(([l, v]) =>
                            `<div class="profile-cell"><span>${l}</span><strong>${
                                v ?? "-"
                            }/10</strong></div>`
                        ).join("")
                    }</div></div><aside class="detail-panel"><h3>Identidade</h3><p><strong>Origem:</strong> ${
                        escapeHtml(c.origem || "-")
                    }</p><p><strong>Regiões:</strong> ${
                        escapeHtml((c.regioes || []).join(", ") || "-")
                    }</p><p><strong>Sinónimos:</strong> ${
                        escapeHtml((c.sinonimos || []).join(", ") || "-")
                    }</p><p><strong>Aromas:</strong> ${
                        escapeHtml((c.aromas || []).join(" · ") || "-")
                    }</p><p><strong>Potencial de guarda:</strong> ${
                        escapeHtml(c.potencial_guarda || "-")
                    }</p></aside></div><div class="detail-columns"><article class="detail-box"><h3>Condições da vinha</h3><p><strong>Solo:</strong> ${
                        escapeHtml(tech.solo || "-")
                    }</p><p><strong>Clima:</strong> ${
                        escapeHtml(tech.clima || "-")
                    }</p><p><strong>Exposição:</strong> ${
                        escapeHtml(tech.exposicao || "-")
                    }</p><p><strong>Irrigação:</strong> ${
                        escapeHtml(tech.irrigacao || "-")
                    }</p><p><strong>Compasso:</strong> ${
                        escapeHtml(tech.distancia || "-")
                    }</p></article><article class="detail-box"><h3>Gestão e observação</h3><p><strong>Maturação:</strong> ${
                        escapeHtml(c.maturacao || "-")
                    }</p><p><strong>Vigor:</strong> ${
                        escapeHtml(c.vigor || "-")
                    }</p><p><strong>Produtividade:</strong> ${
                        escapeHtml(c.produtividade || "-")
                    }</p><p><strong>Sensibilidades:</strong> ${
                        escapeHtml((c.sensibilidades || []).join(", ") || "-")
                    }</p><p>${
                        escapeHtml(tech.observacao || "Confirmar sempre as decisões na parcela.")
                    }</p></article><article class="detail-box"><h3>Castas próximas</h3><div class="card-tags">${
                        related.map((item) =>
                            `<button class="btn-clean related-casta" data-id="${escapeHtml(item.id)}">${
                                escapeHtml(item.nome)
                            }</button>`
                        ).join("") || "-"
                    }</div></article><article class="detail-box"><h3>Biodiversidade útil</h3><p>Manter cobertura adaptada, flora espontânea identificada, sebes nativas e refúgios. Monitorizar antes de intervir e preservar auxiliares já presentes.</p></article></div>`;
                document.getElementById("enologia-list-view").style.display = "none";
                document.getElementById("casta-detail-view").style.display = "block";
                window.scrollTo({ top: 0, behavior: "smooth" });
                document.getElementById("detail-back").onclick = hideDetail;
                document.querySelectorAll(".related-casta").forEach((button) =>
                    button.onclick = () => showDetail(button.dataset.id)
                );
            }
            function hideDetail() {
                document.getElementById("enologia-list-view").style.display = "block";
                document.getElementById("casta-detail-view").style.display = "none";
                window.scrollTo({ top: 0, behavior: "smooth" });
            }

            function renderNews() {
                const container = document.getElementById("noticias-enologia-dinamico");
                container.innerHTML =
                    noticiasEno.slice(0, visibleNews).map((n) => {
                        const content = window.BioCultureI18n?.content(n) || n.pt || n;
                        return `<a href="/observatorio/noticia-detalhe.html?id=${
                            encodeURIComponent(n.id)
                        }" class="news-item"><h3>${escapeHtml(content.titulo)}</h3><span class="news-meta">${
                            escapeHtml(n.fonte || window.BioCultureI18n?.choose("Notícia", "News") || "Notícia")
                        } · ${escapeHtml(window.BioCultureI18n?.date(n.data) || n.data || "")}</span></a>`;
                    }).join("") ||
                    '<div class="empty-state">Sem notícias de enologia disponíveis neste momento.</div>';
                document.getElementById("btn-load-more-eno").style.display =
                    noticiasEno.length > visibleNews ? "inline-block" : "none";
            }

            function setupLocationLogic() {
                $(document).off("input", "#loc-search-input").on(
                    "input",
                    "#loc-search-input",
                    function () {
                        const value = $(this).val().toLowerCase(),
                            dropdown = $("#loc-dropdown").empty();
                        if (value.length < 2) return dropdown.hide();
                        locationsDB.filter((item) => item.titulo.toLowerCase().includes(value)).slice(
                            0,
                            8,
                        ).forEach((item) =>
                            $('<div class="bio-res-item"></div>').text(
                                item.titulo + (item.concelho ? " (" + item.concelho + ")" : ""),
                            ).on("click", () => {
                                localStorage.setItem("biocultura_region", item.id);
                                location.reload();
                            }).appendTo(dropdown)
                        );
                        dropdown.show();
                    },
                );
            }

            async function init() {
                try {
                    const responses = await Promise.all(
                        [
                            "/data/bioregioes.json",
                            "/data/castas.json",
                            "/data/pragas.json",
                            "/data/dicas.json",
                            "/data/noticias.json",
                        ].map((url) =>
                            fetch(url, { cache: "no-cache" }).then((r) => {
                                if (!r.ok) throw new Error(url);
                                return r.json();
                            })
                        ),
                    );
                    [locationsDB, castasDB, pragasDB, dicasDB] = responses;
                    noticiasEno = responses[4].filter((n) => {
                        const original = n.pt || n;
                        return `${n.categoria || ""} ${original.categoria || ""} ${original.titulo || ""}`
                            .toLowerCase().match(/enologia|vinho|vinha|viticultura/);
                    });
                    const origins = [...new Set(castasDB.map((c) => c.origem).filter(Boolean))].sort((
                        a,
                        b,
                    ) => a.localeCompare(b, "pt"));
                    document.getElementById("origin-filter").insertAdjacentHTML(
                        "beforeend",
                        origins.map((origin) =>
                            `<option value="${escapeHtml(origin)}">${escapeHtml(origin)}</option>`
                        ).join(""),
                    );
                    const saved = localStorage.getItem("biocultura_region");
                    const info = locationsDB.find((item) => String(item.id) === String(saved)) || null;
                    renderStats();
                    renderRegion(info);
                    renderAtlas();
                    renderPractices();
                    renderPests();
                    renderNews();
                    setupLocationLogic();
                    document.getElementById("show-region-all").onclick = () => {
                        showAllRegional = !showAllRegional;
                        renderRegion(info);
                    };
                    document.getElementById("toggle-pests").onclick = () => {
                        showAllPests = !showAllPests;
                        renderPests();
                    };
                    document.getElementById("btn-load-more-eno").onclick = () => {
                        visibleNews += 4;
                        renderNews();
                    };
                    ["casta-search", "color-filter", "origin-filter"].forEach((id) =>
                        document.getElementById(id).addEventListener(
                            id === "casta-search" ? "input" : "change",
                            () => renderAtlas(true),
                        )
                    );
                    document.getElementById("atlas-more").onclick = () => {
                        atlasLimit += 12;
                        renderAtlas();
                    };
                    document.querySelectorAll(".quick-filter").forEach((button) => {
                        button.onclick = () => {
                            atlasQuickFilter = button.dataset.quick;
                            document.querySelectorAll(".quick-filter").forEach((item) => item.classList.toggle("active", item === button));
                            renderAtlas(true);
                        };
                    });
                    document.addEventListener("click", (event) => {
                        const card = event.target.closest("[data-casta]");
                        if (card) showDetail(card.dataset.casta);
                    });
                    document.addEventListener("keydown", (event) => {
                        const card = event.target.closest("[data-casta]");
                        if (card && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            showDetail(card.dataset.casta);
                        }
                    });
                } catch (error) {
                    console.error("Erro ao carregar a Vinha Viva:", error);
                    document.getElementById("atlas-grid").innerHTML =
                        '<div class="empty-state">Não foi possível carregar os dados da vinha.</div>';
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                init();
            }).catch(() => init());
        