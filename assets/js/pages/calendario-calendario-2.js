
            let locationsDB = [],
                pragasDB = [],
                floraDB = [],
                dicasDB = [],
                horticolasDB = {},
                infoGlobal = null,
                weatherNow = null;
            let viewedDate = new Date(), showMorePests = false, showMoreFlora = false, catalogLimit = 12;
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
            const isEn = () => !!window.BioCultureI18n?.isEnglish;
            const monthsEn = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December",
            ];

            // Fronteiras astronómicas aproximadas (equinócios/solstícios, hemisfério norte).
            function seasonFor(month, day = 15) {
                const en = isEn();
                const md = month * 100 + day;
                const SPRING = 2 * 100 + 20; // 20 março
                const SUMMER = 5 * 100 + 21; // 21 junho
                const AUTUMN = 8 * 100 + 23; // 23 setembro
                const WINTER = 11 * 100 + 21; // 21 dezembro
                if (md >= WINTER || md < SPRING) {
                    return en
                        ? { key: "inverno", name: "Winter", emoji: "❄️", cue: "typically cold",
                            note: "Plan, protect the soil and make the most of the right windows for woody plantings." }
                        : { key: "inverno", name: "Inverno", emoji: "❄️", cue: "tipicamente frio",
                            note: "Planear, proteger o solo e aproveitar os períodos adequados para plantações lenhosas." };
                }
                if (md < SUMMER) {
                    return en
                        ? { key: "primavera", name: "Spring", emoji: "🌱", cue: "temperatures rising",
                            note: "Fast growth season: sow in stages, watch young plants and support pollinators." }
                        : { key: "primavera", name: "Primavera", emoji: "🌱", cue: "temperaturas a subir",
                            note: "Época de crescimento rápido: semear por etapas, vigiar jovens plantas e favorecer polinizadores." };
                }
                if (md < AUTUMN) {
                    return en
                        ? { key: "verao", name: "Summer", emoji: "☀️", cue: "typically hot and dry",
                            note: "Manage water, shade and cover; harvest often and watch for signs of stress." }
                        : { key: "verao", name: "Verão", emoji: "☀️", cue: "tipicamente quente e seco",
                            note: "Gerir água, sombra e cobertura; colher com frequência e observar sinais de stress." };
                }
                return en
                    ? { key: "outono", name: "Autumn", emoji: "🍂", cue: "temperatures falling",
                        note: "Harvest, save seeds, start cover crops and prepare the soil without leaving it bare." }
                    : { key: "outono", name: "Outono", emoji: "🍂", cue: "temperaturas a descer",
                        note: "Colher, guardar sementes, iniciar coberturas e preparar o solo sem o deixar exposto." };
            }

            function moonInfo(date) {
                const en = isEn();
                const known = Date.UTC(2000, 0, 6, 18, 14), cycle = 29.53058867;
                let age = ((date.getTime() - known) / 86400000) % cycle;
                if (age < 0) age += cycle;
                if (age < 1.85 || age > 27.68) return { name: en ? "New moon" : "Lua nova", cls: "new", emoji: "🌑" };
                if (age < 5.54) return { name: en ? "Waxing crescent" : "Crescente inicial", cls: "", emoji: "🌒" };
                if (age < 9.23) return { name: en ? "First quarter" : "Quarto crescente", cls: "quarter", emoji: "🌓" };
                if (age < 12.92) return { name: en ? "Waxing gibbous" : "Crescente gibosa", cls: "", emoji: "🌔" };
                if (age < 16.61) return { name: en ? "Full moon" : "Lua cheia", cls: "full", emoji: "🌕" };
                if (age < 20.30) return { name: en ? "Waning gibbous" : "Minguante gibosa", cls: "", emoji: "🌖" };
                if (age < 23.99) return { name: en ? "Last quarter" : "Quarto minguante", cls: "quarter", emoji: "🌗" };
                return { name: en ? "Waning crescent" : "Minguante final", cls: "", emoji: "🌘" };
            }

            // Códigos WMO devolvidos pela API Open-Meteo (sem chave, gratuita).
            const WEATHER_CODES_PT = {
                0: ["☀️", "Céu limpo"], 1: ["🌤️", "Céu quase limpo"], 2: ["⛅", "Parcialmente nublado"],
                3: ["☁️", "Encoberto"], 45: ["🌫️", "Nevoeiro"], 48: ["🌫️", "Nevoeiro"],
                51: ["🌦️", "Chuvisco fraco"], 53: ["🌦️", "Chuvisco"], 55: ["🌦️", "Chuvisco forte"],
                56: ["🌧️", "Chuvisco gelado"], 57: ["🌧️", "Chuvisco gelado"],
                61: ["🌧️", "Chuva fraca"], 63: ["🌧️", "Chuva"], 65: ["🌧️", "Chuva forte"],
                66: ["🌧️", "Chuva gelada"], 67: ["🌧️", "Chuva gelada"],
                71: ["🌨️", "Neve fraca"], 73: ["🌨️", "Neve"], 75: ["🌨️", "Neve forte"], 77: ["🌨️", "Grãos de neve"],
                80: ["🌦️", "Aguaceiros fracos"], 81: ["🌦️", "Aguaceiros"], 82: ["🌧️", "Aguaceiros fortes"],
                85: ["🌨️", "Aguaceiros de neve"], 86: ["🌨️", "Aguaceiros de neve"],
                95: ["⛈️", "Trovoada"], 96: ["⛈️", "Trovoada com granizo"], 99: ["⛈️", "Trovoada com granizo"],
            };
            const WEATHER_CODES_EN = {
                0: ["☀️", "Clear sky"], 1: ["🌤️", "Mostly clear sky"], 2: ["⛅", "Partly cloudy"],
                3: ["☁️", "Overcast"], 45: ["🌫️", "Fog"], 48: ["🌫️", "Fog"],
                51: ["🌦️", "Light drizzle"], 53: ["🌦️", "Drizzle"], 55: ["🌦️", "Heavy drizzle"],
                56: ["🌧️", "Freezing drizzle"], 57: ["🌧️", "Freezing drizzle"],
                61: ["🌧️", "Light rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"],
                66: ["🌧️", "Freezing rain"], 67: ["🌧️", "Freezing rain"],
                71: ["🌨️", "Light snow"], 73: ["🌨️", "Snow"], 75: ["🌨️", "Heavy snow"], 77: ["🌨️", "Snow grains"],
                80: ["🌦️", "Light showers"], 81: ["🌦️", "Showers"], 82: ["🌧️", "Heavy showers"],
                85: ["🌨️", "Snow showers"], 86: ["🌨️", "Snow showers"],
                95: ["⛈️", "Thunderstorm"], 96: ["⛈️", "Thunderstorm with hail"], 99: ["⛈️", "Thunderstorm with hail"],
            };
            function describeWeather(code) {
                const [emoji, label] = (isEn() ? WEATHER_CODES_EN : WEATHER_CODES_PT)[code] || ["🌡️", isEn() ? "No description" : "Sem descrição"];
                return { emoji, label };
            }
            async function fetchWeather() {
                const lat = infoGlobal?.lat, lon = infoGlobal?.lon;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
                try {
                    const response = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`,
                    );
                    if (!response.ok) throw new Error("weather");
                    const data = await response.json();
                    weatherNow = {
                        temp: Math.round(data.current.temperature_2m),
                        code: data.current.weather_code,
                        max: Math.round(data.daily.temperature_2m_max[0]),
                        min: Math.round(data.daily.temperature_2m_min[0]),
                    };
                } catch (_) {
                    weatherNow = null;
                }
                renderConditions();
            }

            function renderConditions() {
                const year = viewedDate.getFullYear(), month = viewedDate.getMonth(), today = new Date();
                const last = new Date(year, month + 1, 0);
                const selectedDay = Math.min(today.getDate(), last.getDate());
                const season = seasonFor(month, selectedDay);
                const selectedMoon = moonInfo(new Date(year, month, selectedDay));
                const en = isEn();
                const weatherChip = weatherNow
                    ? (() => {
                        const w = describeWeather(weatherNow.code);
                        return `<div class="condition-chip">
                            <span class="condition-icon" aria-hidden="true">${w.emoji}</span>
                            <span><strong>${weatherNow.temp}°C ${en ? "now" : "agora"}</strong><small>${
                            w.label
                        } · ${en ? "max" : "máx"} ${weatherNow.max}° ${en ? "min" : "mín"} ${weatherNow.min}°</small></span>
                        </div>`;
                    })()
                    : `<div class="condition-chip condition-chip-loading">
                        <span class="condition-icon" aria-hidden="true">🌡️</span>
                        <span><strong>${en ? "Weather now" : "Tempo agora"}</strong><small>${en ? "loading…" : "a carregar…"}</small></span>
                    </div>`;
                document.getElementById("calendar-conditions").innerHTML = `<div class="condition-chip">
                        <span class="condition-icon" aria-hidden="true">${season.emoji}</span>
                        <span><strong>${season.name}</strong><small>${en ? monthsEn[month] : months[month]}</small></span>
                    </div>${weatherChip}<div class="condition-chip">
                        <span class="condition-icon" aria-hidden="true">${selectedMoon.emoji}</span>
                        <span><strong>${selectedMoon.name}</strong><small>${en ? "moon phase today" : "fase da lua hoje"}</small></span>
                    </div>`;
            }
            function renderCalendar() {
                const year = viewedDate.getFullYear(),
                    month = viewedDate.getMonth(),
                    today = new Date();
                document.getElementById("calendar-title").textContent = `${isEn() ? monthsEn[month] : months[month]} ${year}`;
                document.getElementById("selected-month-label").textContent = isEn() ? monthsEn[month] : months[month];
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
                renderConditions();
                const sowing = cropsFor("sementeira", month).slice(0, 3);
                document.getElementById("calendar-suggestion").innerHTML = sowing.length
                    ? `<strong>Boa altura para semear:</strong> ${
                        sowing.map(([id, item]) =>
                            `<a href="/calendario/horticola-detalhe.html?id=${
                                encodeURIComponent(id)
                            }">${escapeHtml(item.nome)}</a>`
                        ).join(", ")
                    }`
                    : `<strong>${seasonFor(month).name}:</strong> ${seasonFor(month).note}`;
                renderActions();
                renderWeekPlan();
                renderPractices();
                renderPests();
                requestAnimationFrame(syncPanelHeight);
            }

            function syncPanelHeight() {
                const panel = document.querySelector(".calendar-panel");
                const context = document.querySelector(".calendar-local-context");
                if (!panel || !context) return;
                context.style.minHeight = "";
                const panelRect = panel.getBoundingClientRect(), contextRect = context.getBoundingClientRect();
                const sideBySide = panelRect.left >= contextRect.right;
                const needed = panelRect.bottom - contextRect.top;
                if (sideBySide && needed > contextRect.height) {
                    context.style.minHeight = `${needed}px`;
                }
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
                document.getElementById("action-intro").textContent = isEn()
                    ? `Suggestions for ${monthsEn[month]}, cross-checked with local pH whenever the catalogue has a comparable range.`
                    : `Sugestões para ${months[month]}, cruzadas com o pH local sempre que o catálogo contém um intervalo comparável.`;
                document.getElementById("action-grid").innerHTML = groups.map(([title, field, note]) =>
                    `<article class="action-card"><div class="action-card-head"><div><span class="action-label">${
                        escapeHtml(isEn() ? monthsEn[month] : months[month])
                    }</span><h3>${title}</h3></div><p>${note}</p></div><div class="crop-list">${
                        cropMarkup(cropsFor(field, month), field)
                    }</div></article>`
                ).join("");
                const sowing = new Map(cropsFor("sementeira", month).map(([id, item]) => [normalize(item.nome || id), item.nome || id]));
                const harvesting = new Set(cropsFor("colheita", month).map(([id, item]) => normalize(item.nome || id)));
                const overlap = [...sowing].filter(([key]) => harvesting.has(key)).map(([, name]) => name);
                const note = document.getElementById("cycle-note");
                if (overlap.length) {
                    const en = isEn();
                    note.innerHTML = en
                        ? `<strong>Why does the same crop appear in different phases?</strong> ${
                            escapeHtml(overlap.slice(0, 4).join(", "))
                        } ${overlap.length > 4 ? "and others" : ""} can be sown and harvested this month. Generally, one already-developed generation is harvested while another is started, or staggered varieties and dates are used. Always confirm the variety, soil temperature and microclimate.`
                        : `<strong>Porque aparece a mesma cultura em fases diferentes?</strong> ${
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
                document.getElementById("catalog-summary").textContent = isEn()
                    ? `${format(entries.length)} crops found · ${format(Object.keys(horticolasDB).length)} complete records in the catalogue`
                    : `${format(entries.length)} culturas encontradas · ${format(Object.keys(horticolasDB).length)} fichas completas no catálogo`;
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
                const month = viewedDate.getMonth(), season = seasonFor(month).key;
                const seasonal = {
                    inverno: [
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
                    primavera: [
                        ["Semear por etapas", "Evite concentrar toda a produção numa única data."],
                        [
                            "Proteger plantas jovens",
                            "Use barreiras físicas apenas quando existe risco identificado.",
                        ],
                        ["Acolher auxiliares", "Mantenha flores e água rasa com saída segura."],
                        ["Verificar rega", "Teste linhas e emissores antes do calor."],
                    ],
                    verao: [
                        [
                            "Verificar humidade",
                            "Observe a zona radicular antes de regar profundamente.",
                        ],
                        ["Cobrir o solo", "Reponha cobertura sem a encostar aos caules."],
                        ["Colher regularmente", "Retire frutos maduros e observe sinais de doença."],
                        ["Criar sombra seletiva", "Proteja culturas sensíveis sem impedir ventilação."],
                    ],
                    outono: [
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
                const season = seasonFor(month).key,
                    keywords = {
                        inverno: ["inverno", "todo o ano", "protegidas"],
                        primavera: ["primavera", "tempo ameno", "rebentos"],
                        verao: ["verao", "tempo quente", "calor", "seco"],
                        outono: ["outono", "humidade", "chuva"],
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
                const all = unique.length ? unique : floraDB,
                    visible = all.slice(0, showMoreFlora ? 12 : 6);
                const notice = unique.length
                    ? ""
                    : '<div class="empty">O perfil regional ainda não tem espécies invasoras confirmadas no inventário local — pode ser falta de registo, não ausência real. Eis o inventário nacional para consulta e identificação.</div>';
                document.getElementById("flora-grid").innerHTML = notice + visible.map((item) =>
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
                    }</p><p>${escapeHtml(item.combate)}</p></details><a class="watch-detail" href="/ecossistemas/especie-detalhe.html?id=${
                        encodeURIComponent(item.id)
                    }">Ver ficha completa →</a></article>`
                ).join("");
                const button = document.getElementById("toggle-flora");
                button.style.display = all.length > 6 ? "inline-block" : "none";
                button.textContent = showMoreFlora
                    ? (isEn() ? "Collapse" : "Recolher")
                    : (isEn() ? `See more invasive species (${all.length} in total)` : `Ver mais espécies invasoras (${all.length} no total)`);
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
                    fetchWeather();
                    renderCatalog();
                    renderFlora();
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
                    document.getElementById("toggle-flora").onclick = () => {
                        showMoreFlora = !showMoreFlora;
                        renderFlora();
                    };
                    let resizeTimer;
                    window.addEventListener("resize", () => {
                        clearTimeout(resizeTimer);
                        resizeTimer = setTimeout(syncPanelHeight, 150);
                    }, { passive: true });
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
        