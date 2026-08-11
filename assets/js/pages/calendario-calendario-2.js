
            let locationsDB = [],
                pragasDB = [],
                floraDB = [],
                dicasDB = [],
                horticolasDB = {},
                infoGlobal = null;
            let viewedDate = new Date(), showMorePests = false, catalogLimit = 12;
            const months = [
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
            ];
            const normalize = (value) =>
                String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
            const format = (value) => new Intl.NumberFormat("pt-PT").format(value);

            function seasonFor(month) {
                if ([11, 0, 1].includes(month)) {
                    return [
                        "Inverno",
                        "Planear, proteger o solo e aproveitar os períodos adequados para plantações lenhosas.",
                    ];
                }
                if ([2, 3, 4].includes(month)) {
                    return [
                        "Primavera",
                        "Época de crescimento rápido: semear por etapas, vigiar jovens plantas e favorecer polinizadores.",
                    ];
                }
                if ([5, 6, 7].includes(month)) {
                    return [
                        "Verão",
                        "Gerir água, sombra e cobertura; colher com frequência e observar sinais de stress.",
                    ];
                }
                return [
                    "Outono",
                    "Colher, guardar sementes, iniciar coberturas e preparar o solo sem o deixar exposto.",
                ];
            }

            function moonInfo(date) {
                const known = Date.UTC(2000, 0, 6, 18, 14), cycle = 29.53058867;
                let age = ((date.getTime() - known) / 86400000) % cycle;
                if (age < 0) age += cycle;
                if (age < 1.85 || age > 27.68) return { name: "Lua nova", cls: "new" };
                if (age < 5.54) return { name: "Crescente inicial", cls: "" };
                if (age < 9.23) return { name: "Quarto crescente", cls: "quarter" };
                if (age < 12.92) return { name: "Crescente gibosa", cls: "" };
                if (age < 16.61) return { name: "Lua cheia", cls: "full" };
                if (age < 20.30) return { name: "Minguante gibosa", cls: "" };
                if (age < 23.99) return { name: "Quarto minguante", cls: "quarter" };
                return { name: "Minguante final", cls: "" };
            }

            function renderCalendar() {
                const year = viewedDate.getFullYear(),
                    month = viewedDate.getMonth(),
                    today = new Date();
                document.getElementById("calendar-title").textContent = `${months[month]} ${year}`;
                document.getElementById("selected-month-label").textContent = months[month];
                const first = new Date(year, month, 1),
                    last = new Date(year, month + 1, 0),
                    start = (first.getDay() + 6) % 7;
                const cells = [];
                for (let i = 0; i < 42; i++) {
                    const day = i - start + 1,
                        date = new Date(year, month, day),
                        outside = date.getMonth() !== month,
                        isToday = date.toDateString() === today.toDateString(),
                        moon = moonInfo(date);
                    const marker = ["new", "full", "quarter"].includes(moon.cls)
                        ? `<span class="moon-dot ${moon.cls}" title="${escapeHtml(moon.name)}"></span>`
                        : "";
                    cells.push(
                        `<div class="calendar-day ${outside ? "outside" : ""} ${
                            isToday ? "today" : ""
                        }">${date.getDate()}${marker}</div>`,
                    );
                }
                document.getElementById("calendar-days").innerHTML = cells.join("");
                const [season, note] = seasonFor(month),
                    selectedMoon = moonInfo(
                        new Date(year, month, Math.min(today.getDate(), last.getDate())),
                    );
                document.getElementById("season-label").innerHTML =
                    `<strong>${season}</strong> · ${note}`;
                document.getElementById("moon-label").innerHTML =
                    `Referência lunar: <strong>${selectedMoon.name}</strong>`;
                renderActions();
                renderWeekPlan();
                renderPractices();
                renderPests();
            }

            function periodMatches(text, month) {
                const source = normalize(text).replace(/[–—]/g, "-");
                if (!source) return false;
                if (/todo o ano|durante todo o ano|sempre/.test(source)) return true;
                const normalizedMonths = months.map(normalize);
                return source.split(/\s+e\s+|;/).some((segment) => {
                    const found = normalizedMonths.map((name, index) =>
                        segment.includes(name) ? index : -1
                    ).filter((index) => index >= 0);
                    if (!found.length) return false;
                    if (found.includes(month)) return true;
                    if (found.length >= 2) {
                        const start = found[0], end = found.at(-1);
                        return start <= end
                            ? month >= start && month <= end
                            : month >= start || month <= end;
                    }
                    return false;
                });
            }

            function phMatches(item) {
                const local = parseFloat(infoGlobal?.biomas?.ph_solo);
                if (!Number.isFinite(local)) return true;
                const nums =
                    String(item.ph_solo || "").replace(",", ".").match(/\d+(?:\.\d+)?/g)?.map(Number) ||
                    [];
                return nums.length < 2 || local >= nums[0] - .3 && local <= nums[1] + .3;
            }

            function cropsFor(field, month) {
                const matching = Object.entries(horticolasDB).filter(([, item]) =>
                    periodMatches(item[field], month)
                ).sort((a, b) => Number(phMatches(b[1])) - Number(phMatches(a[1])));
                const unique = new Map();
                matching.forEach((entry) => {
                    const key = normalize(entry[1].nome || entry[0]);
                    if (key && !unique.has(key)) unique.set(key, entry);
                });
                return [...unique.values()].slice(0, 6);
            }
            function cropMarkup(entries, field) {
                return entries.length
                    ? entries.map(([id, item]) =>
                        `<a class="crop-link" href="/calendario/horticola-detalhe.html?id=${
                            encodeURIComponent(id)
                        }"><img src="${
                            escapeHtml(item.imagem && item.imagem !== "-" ? item.imagem : "/images/cultura-placeholder.svg")
                        }" alt="" loading="lazy" onerror="this.onerror=null;this.src='/images/cultura-placeholder.svg'"><span><strong>${
                            escapeHtml(item.nome)
                        }</strong><span>${
                            escapeHtml(item[field] || item.categoria || "")
                        }</span></span></a>`
                    ).join("")
                    : '<div class="empty">Não existem entradas suficientemente claras para este mês. Consulte as condições locais antes de decidir.</div>';
            }

            function renderActions() {
                const month = viewedDate.getMonth(),
                    groups = [["Semear", "sementeira", "Sementeiras cuja janela inclui este mês."], [
                        "Plantar ou transplantar",
                        "plantacao_ou_transplante",
                        "Instalações indicadas para o período selecionado.",
                    ], ["Colher", "colheita", "Culturas com colheita provável neste mês."]];
                document.getElementById("action-intro").textContent = `Sugestões para ${
                    months[month]
                }, cruzadas com o pH local sempre que o catálogo contém um intervalo comparável.`;
                document.getElementById("action-grid").innerHTML = groups.map(([title, field, note]) =>
                    `<article class="action-card"><div class="action-card-head"><div><span class="action-label">${
                        escapeHtml(months[month])
                    }</span><h3>${title}</h3></div><p>${note}</p></div><div class="crop-list">${
                        cropMarkup(cropsFor(field, month), field)
                    }</div></article>`
                ).join("");
                const sowing = new Map(cropsFor("sementeira", month).map(([id, item]) => [normalize(item.nome || id), item.nome || id]));
                const harvesting = new Set(cropsFor("colheita", month).map(([id, item]) => normalize(item.nome || id)));
                const overlap = [...sowing].filter(([key]) => harvesting.has(key)).map(([, name]) => name);
                const note = document.getElementById("cycle-note");
                if (overlap.length) {
                    note.innerHTML = `<strong>Porque aparece a mesma cultura em fases diferentes?</strong> ${
                        escapeHtml(overlap.slice(0, 4).join(", "))
                    } ${overlap.length > 4 ? "e outras" : ""} podem ser semeadas e colhidas neste mês. Em geral, colhe-se uma geração já desenvolvida enquanto se inicia outra, ou usam-se variedades e datas escalonadas. Confirme sempre a variedade, a temperatura do solo e o microclima.`;
                    note.classList.add("visible");
                } else {
                    note.textContent = "";
                    note.classList.remove("visible");
                }
            }

            function catalogKind(item) {
                const value = normalize(item.categoria || "");
                if (value.includes("aromatica")) return "aromaticas";
                if (/fruteira|citrino|pequeno fruto|casca rija|trepadeira frutifera/.test(value)) return "fruteiras";
                return "horticolas";
            }

            function renderCatalog(reset = false) {
                if (reset) catalogLimit = 12;
                const query = normalize(document.getElementById("catalog-search")?.value),
                    filter = document.getElementById("catalog-filter")?.value || "all";
                const entries = Object.entries(horticolasDB).filter(([id, item]) => {
                    const haystack = normalize(`${id} ${item.nome || ""} ${item.nome_cientifico || ""} ${item.categoria || ""}`);
                    const kind = catalogKind(item);
                    const filterMatch = filter === "all" || filter === kind || filter === "perenes" && normalize(item.ciclo).includes("perene");
                    return filterMatch && (!query || haystack.includes(query));
                }).sort((a, b) => String(a[1].nome || a[0]).localeCompare(String(b[1].nome || b[0]), "pt"));
                document.getElementById("catalog-summary").textContent = `${format(entries.length)} culturas encontradas · ${
                    format(Object.keys(horticolasDB).length)
                } fichas completas no catálogo`;
                document.getElementById("catalog-grid").innerHTML = entries.slice(0, catalogLimit).map(([id, item]) =>
                    `<a class="catalog-card" href="/calendario/horticola-detalhe.html?id=${encodeURIComponent(id)}"><img src="${
                        escapeHtml(item.imagem && item.imagem !== "-" ? item.imagem : "/images/cultura-placeholder.svg")
                    }" alt="${escapeHtml(item.nome || "Cultura")}" loading="lazy" onerror="this.onerror=null;this.src='/images/cultura-placeholder.svg'"><div class="catalog-card-body"><small>${
                        escapeHtml(item.categoria || catalogKind(item))
                    }</small><h3>${escapeHtml(item.nome || id)}</h3><p>${
                        escapeHtml(item.nome_cientifico || item.ciclo || "Consultar ficha de cultivo")
                    }</p></div></a>`
                ).join("") || '<div class="empty">Não foram encontradas culturas com estes critérios.</div>';
                const more = document.getElementById("catalog-more");
                more.hidden = entries.length <= catalogLimit;
                more.onclick = () => { catalogLimit += 12; renderCatalog(); };
            }

            function renderWeekPlan() {
                const month = viewedDate.getMonth(), [season] = seasonFor(month);
                const seasonal = {
                    Inverno: [
                        ["Observar o solo", "Evite trabalhar solo saturado e proteja zonas nuas."],
                        [
                            "Planear rotações",
                            "Reveja famílias, necessidades e registos da campanha anterior.",
                        ],
                        [
                            "Criar habitat",
                            "Instale sebes ou abrigos sem perturbar refúgios existentes.",
                        ],
                        [
                            "Rever ferramentas",
                            "Limpe e repare ferramentas antes da época de crescimento.",
                        ],
                    ],
                    Primavera: [
                        ["Semear por etapas", "Evite concentrar toda a produção numa única data."],
                        [
                            "Proteger plantas jovens",
                            "Use barreiras físicas apenas quando existe risco identificado.",
                        ],
                        ["Acolher auxiliares", "Mantenha flores e água rasa com saída segura."],
                        ["Verificar rega", "Teste linhas e emissores antes do calor."],
                    ],
                    Verão: [
                        [
                            "Verificar humidade",
                            "Observe a zona radicular antes de regar profundamente.",
                        ],
                        ["Cobrir o solo", "Reponha cobertura sem a encostar aos caules."],
                        ["Colher regularmente", "Retire frutos maduros e observe sinais de doença."],
                        ["Criar sombra seletiva", "Proteja culturas sensíveis sem impedir ventilação."],
                    ],
                    Outono: [
                        [
                            "Guardar sementes",
                            "Escolha plantas saudáveis e deixe maturar completamente.",
                        ],
                        ["Semear coberturas", "Mantenha raízes vivas entre culturas."],
                        [
                            "Compostar materiais",
                            "Equilibre materiais secos e verdes sem enterrar resíduos.",
                        ],
                        ["Preparar infiltração", "Abrande escorrência antes da época mais chuvosa."],
                    ],
                };
                document.getElementById("week-plan").innerHTML = seasonal[season].map((
                    [title, text],
                    index,
                ) => `<article class="week-task"><span class="task-number">0${
                    index + 1
                }</span><h3>${title}</h3><p>${text}</p></article>`).join("");
            }

            function practiceIdsFor(month) {
                if ([11, 0, 1].includes(month)) {
                    return [
                        "rotacao-culturas",
                        "teste-germinacao",
                        "sebe-viva",
                        "abrigo-insetos",
                        "higiene-ferramentas",
                        "composto-frio",
                    ];
                }
                if ([2, 3, 4].includes(month)) {
                    return [
                        "sementeira-direta",
                        "sementeira-sucessiva",
                        "consociacao",
                        "corredor-floral",
                        "monitorizacao-pragas",
                        "rega-gota-a-gota",
                    ];
                }
                if ([5, 6, 7].includes(month)) {
                    return [
                        "mulching-organico",
                        "rega-profunda",
                        "olla",
                        "guardar-sementes",
                        "faixa-nao-cortada",
                        "registos-horta",
                    ];
                }
                return [
                    "adubo-verde",
                    "solo-sempre-com-raiz",
                    "folhas-molde",
                    "captacao-chuva",
                    "composto-superficie",
                    "zonas-tampao",
                ];
            }
            function renderPractices() {
                const selected = practiceIdsFor(viewedDate.getMonth()).map((id) =>
                    dicasDB.find((item) => item.id === id)
                ).filter(Boolean);
                document.getElementById("practice-grid").innerHTML = selected.map((item) =>
                    `<article class="practice-card"><h3>${
                        escapeHtml(item.titulo)
                    }</h3><span class="practice-meta">${escapeHtml(item.categoria)} · ${
                        escapeHtml(item.nivel)
                    }</span><p>${
                        escapeHtml(item.resumo)
                    }</p><details><summary>Passos essenciais</summary><ol>${
                        (item.passos || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")
                    }</ol></details></article>`
                ).join("");
            }

            function seasonalPests(month) {
                const [season] = seasonFor(month),
                    keywords = {
                        Inverno: ["inverno", "todo o ano", "protegidas"],
                        Primavera: ["primavera", "tempo ameno", "rebentos"],
                        Verão: ["verao", "tempo quente", "calor", "seco"],
                        Outono: ["outono", "humidade", "chuva"],
                    }[season].map(normalize);
                return pragasDB.filter((item) => {
                    const text = normalize(`${item.sazonalidade_portugal || ""} ${item.quando || ""}`);
                    return keywords.some((key) => text.includes(key)) || periodMatches(text, month);
                });
            }
            function renderPests() {
                const all = seasonalPests(viewedDate.getMonth()),
                    visible = (all.length ? all : pragasDB).slice(0, showMorePests ? 12 : 6);
                document.getElementById("pest-grid").innerHTML = visible.map((item) =>
                    `<article class="watch-card"><img class="watch-image" src="${
                        escapeHtml(item.imagem || "/images/pragas-placeholder.svg")
                    }" alt="${
                        escapeHtml(item.nome_comum)
                    }" loading="lazy" onerror="this.onerror=null;this.src='/images/pragas-placeholder.svg'"><span class="watch-kind">Praga ou doença</span><h3>${
                        escapeHtml(item.nome_comum)
                    }</h3><span class="watch-meta">${
                        escapeHtml(item.sazonalidade_portugal || "Observação regular")
                    }</span><p>${
                        escapeHtml(item.sintomas)
                    }</p><details><summary>Prevenção</summary><p>${
                        escapeHtml(item.prevencao)
                    }</p></details><a class="watch-detail" href="/ecossistemas/especie-detalhe.html?id=${
                        encodeURIComponent(item.id)
                    }">Ver ficha completa →</a></article>`
                ).join("");
                const button = document.getElementById("toggle-pests");
                button.style.display = (all.length || pragasDB.length) > 6 ? "inline-block" : "none";
                button.textContent = showMorePests ? "Recolher" : "Ver mais pragas sazonais";
            }

            function renderFlora() {
                const names = infoGlobal?.biomas?.flora_invasora || [];
                const local = names.map((name) => {
                    const n = normalize(name);
                    return floraDB.find((item) =>
                        n.includes(normalize(item.nome_comum)) ||
                        n.includes(normalize(item.nome_cientifico)) ||
                        normalize(item.nome_comum).includes(n.split(" (")[0])
                    );
                }).filter(Boolean);
                const unique = [...new Map(local.map((item) => [item.id, item])).values()];
                document.getElementById("flora-grid").innerHTML = unique.length
                    ? unique.slice(0, 6).map((item) =>
                        `<article class="watch-card"><img class="watch-image" src="${
                            escapeHtml(item.imagem || "/images/pragas-placeholder.svg")
                        }" alt="${
                            escapeHtml(item.nome_comum)
                        }" loading="lazy" onerror="this.onerror=null;this.src='/images/pragas-placeholder.svg'"><span class="watch-kind">Flora invasora</span><h3>${
                            escapeHtml(item.nome_comum)
                        }</h3><span class="watch-meta">${escapeHtml(item.nome_cientifico)}</span><p>${
                            escapeHtml(item.impacto)
                        }</p><details><summary>Prevenção e controlo</summary><p>${
                            escapeHtml(item.prevencao)
                        }</p><p>${escapeHtml(item.combate)}</p></details></article>`
                    ).join("")
                    : '<div class="empty">O perfil regional não contém espécies invasoras que possam ser ligadas de forma segura ao inventário atual.</div>';
            }

            function renderLocalProfile() {
                const bio = infoGlobal?.biomas || {};
                document.getElementById("reg-name").textContent = infoGlobal
                    ? `${infoGlobal.titulo}${
                        infoGlobal.concelho ? ", " + infoGlobal.concelho.toUpperCase() : ""
                    }`
                    : "Portugal";
                document.getElementById("local-profile").innerHTML = [["Solo", bio.solo || "-"], [
                    "pH indicativo",
                    bio.ph_solo || "-",
                ], ["Textura", bio.textura || "-"]].map(([label, value]) =>
                    `<div class="profile-chip"><span>${label}</span><strong>${
                        escapeHtml(value)
                    }</strong></div>`
                ).join("");
            }

            function setupLocationLogic() {
                $(document).off("click", "#btn-gps-trigger").on(
                    "click",
                    "#btn-gps-trigger",
                    function (event) {
                        event.preventDefault();
                        if (!navigator.geolocation) return;
                        const button = $(this).css("opacity", ".5");
                        navigator.geolocation.getCurrentPosition((position) => {
                            let closest = locationsDB[0], distance = Infinity;
                            locationsDB.forEach((item) => {
                                if (!item.lat || !item.lon) return;
                                const dLat = (item.lat - position.coords.latitude) * Math.PI / 180,
                                    dLon = (item.lon - position.coords.longitude) * Math.PI / 180,
                                    a = Math.sin(dLat / 2) ** 2 +
                                        Math.cos(position.coords.latitude * Math.PI / 180) *
                                            Math.cos(item.lat * Math.PI / 180) *
                                            Math.sin(dLon / 2) ** 2,
                                    d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                if (d < distance) {
                                    distance = d;
                                    closest = item;
                                }
                            });
                            if (closest) {
                                localStorage.setItem("biocultura_region", closest.id);
                                location.reload();
                            }
                        }, () => button.css("opacity", "1"));
                    },
                );
                $(document).off("input", "#loc-search-input").on(
                    "input",
                    "#loc-search-input",
                    function () {
                        const value = normalize($(this).val()), dropdown = $("#loc-dropdown").empty();
                        if (value.length < 2) return dropdown.hide();
                        locationsDB.filter((item) => normalize(item.titulo).includes(value)).slice(0, 8)
                            .forEach((item) =>
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
                    const urls = [
                        "/data/bioregioes.json",
                        "/data/pragas.json",
                        "/data/flora_invasora.json",
                        "/data/horticolas_master.json",
                        "/data/dicas.json",
                    ];
                    const data = await Promise.all(
                        urls.map((url) =>
                            fetch(url + "?v=" + Date.now()).then((response) => {
                                if (!response.ok) throw new Error(url);
                                return response.json();
                            })
                        ),
                    );
                    [locationsDB, pragasDB, floraDB, horticolasDB, dicasDB] = data;
                    const saved = localStorage.getItem("biocultura_region");
                    infoGlobal = locationsDB.find((item) => String(item.id) === String(saved)) ||
                        locationsDB[0];
                    renderLocalProfile();
                    renderCalendar();
                    renderCatalog();
                    renderFlora();
                    setupLocationLogic();
                    document.getElementById("catalog-search").addEventListener("input", () => renderCatalog(true));
                    document.getElementById("catalog-filter").addEventListener("change", () => renderCatalog(true));
                    document.getElementById("guide-location-button").onclick = () => {
                        const input = document.getElementById("loc-search-input");
                        if (input) {
                            input.focus();
                            input.style.boxShadow = "0 0 0 3px rgba(64,120,69,.2)";
                            setTimeout(() => input.style.boxShadow = "", 1800);
                        }
                    };
                    document.getElementById("prev-month").onclick = () => {
                        viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() - 1, 1);
                        renderCalendar();
                    };
                    document.getElementById("next-month").onclick = () => {
                        viewedDate = new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 1);
                        renderCalendar();
                    };
                    document.getElementById("toggle-pests").onclick = () => {
                        showMorePests = !showMorePests;
                        renderPests();
                    };
                } catch (error) {
                    console.error("Erro ao carregar o calendário:", error);
                    document.getElementById("action-grid").innerHTML =
                        '<div class="empty">Não foi possível carregar os dados do calendário.</div>';
                }
            }
            fetch("/sidebar-content.html").then((response) => response.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                init();
            }).catch(() => init());
        