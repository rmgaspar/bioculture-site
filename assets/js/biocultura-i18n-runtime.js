(function () {
    "use strict";

    /* Perfil territorial da localidade escolhida: cada página carrega apenas o seu
       ficheiro (data/regioes/<id>.json) em vez do ficheiro completo com todas as localidades.
       Devolve [] sem localidade escolhida; com fallback devolve o perfil por omissão. */
    window.BioCultureRegion = {
        load(options) {
            const useDefault = !options || options.fallback !== false;
            let saved = "";
            try { saved = window.localStorage.getItem("biocultura_region") || ""; } catch (_) {}
            const get = (name) => fetch(`/data/regioes/${encodeURIComponent(name)}.json`).then((response) => {
                if (!response.ok) throw new Error(name);
                return response.json();
            });
            const fallback = () => (useDefault ? get("_default").then((row) => [row]).catch(() => []) : Promise.resolve([]));
            return saved ? get(saved).then((row) => [row]).catch(fallback) : fallback();
        }
    };

    /* Cada ficheiro de dados é pedido uma única vez por página. Vários scripts (a página, a leitura
       global, o menu) pediam o mesmo JSON — noticias.json, en.json — e descarregavam-no duas vezes;
       os pedidos seguintes reutilizam agora uma cópia da mesma resposta. */
    (function shareDataRequests() {
        const base = window.fetch.bind(window);
        const pending = new Map();
        window.fetch = function (input, init) {
            const url = String(input instanceof Request ? input.url : input);
            const method = String((init && init.method) || (input instanceof Request ? input.method : "GET")).toUpperCase();
            if (method !== "GET" || !/\/(?:data|assets\/lang)\/[^?#]+\.json(?:[?#]|$)/.test(url)) return base(input, init);
            const key = new URL(url, location.href).href;
            if (!pending.has(key)) {
                pending.set(key, base(input, init).then(
                    (response) => { if (!response.ok) pending.delete(key); return response; },
                    (error) => { pending.delete(key); throw error; },
                ));
            }
            return pending.get(key).then((response) => response.clone());
        };
    })();

    /* Fichas de espécie: o inventário completo é dividido em blocos (data/especies/b<N>.json) e a
       página carrega apenas o bloco da espécie pedida. A função de dispersão tem de coincidir com
       scripts/gerar-especies.mjs. */
    window.BioCulturaSpecies = {
        bucket(id) {
            let hash = 0x811c9dc5;
            const text = String(id).normalize("NFC");
            for (let i = 0; i < text.length; i++) {
                hash ^= text.charCodeAt(i);
                hash = Math.imul(hash, 0x01000193) >>> 0;
            }
            return hash % 64;
        },
        record(id) {
            return fetch(`/data/especies/b${this.bucket(id)}.json`).then((response) => {
                if (!response.ok) throw new Error(`b${this.bucket(id)}`);
                return response.json();
            }).then((rows) => rows[id]);
        }
    };

    /* Seletor de países por continente: cada continente é um bloco que expande e recolhe, com
       pesquisa por nome. O <select> original continua no DOM (escondido) e recebe o valor e o
       evento "change", por isso o código de cada página não muda. Entidades que não são países
       (regiões, grupos de rendimento, mundo…) ficam num grupo final. O mapa código -> continente
       está em data/geografias.json e cobre códigos M49 numéricos e ISO3. */
    window.BioCulturaGeo = {
        styled: false,
        injectStyle() {
            if (this.styled) return;
            this.styled = true;
            const style = document.createElement("style");
            style.textContent = `
                .geo-native { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; border: 0 !important; overflow: hidden !important; clip: rect(0 0 0 0) !important; opacity: 0; pointer-events: none; }
                .geo-picker { position: relative; width: 100%; }
                .geo-trigger { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 1em; text-align: left; cursor: pointer; box-sizing: border-box; height: auto; text-transform: none; letter-spacing: 0; font-weight: 400; line-height: 1.3; }
                .geo-trigger:disabled { cursor: default; opacity: .6; }
                .geo-trigger:focus-visible, .geo-picker.is-open .geo-trigger { outline: none; box-shadow: 0 0 0 3px rgba(47,130,145,.22); }
                .geo-trigger::after { content: ""; flex: 0 0 auto; width: .5em; height: .5em; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translateY(-.15em); opacity: .55; transition: transform .2s ease; }
                .geo-picker.is-open .geo-trigger::after { transform: rotate(-135deg) translateY(-.1em); }
                .geo-panel { position: absolute; z-index: 60; left: 0; right: 0; top: calc(100% + .3rem); max-height: min(24rem, 65vh); overflow: auto; padding: .3rem 0; background: #fff; border: 1px solid #dce5dc; border-radius: 14px; box-shadow: 0 14px 34px rgba(31,54,40,.12); }
                .geo-panel[hidden] { display: none; }
                .geo-group { border-top: 1px solid #f0f3f0; }
                .geo-group:first-child { border-top: 0; }
                .geo-head { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 1em; padding: .75em 1.1em; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: inherit !important; font: inherit; font-weight: 700; text-transform: none; letter-spacing: 0; text-align: left; cursor: pointer; box-shadow: none !important; }
                .geo-head:hover { background: #f4f8f4 !important; }
                .geo-head small { margin-left: auto; font-size: .8em; font-weight: 400; opacity: .5; }
                .geo-head::after { content: ""; flex: 0 0 auto; width: .45em; height: .45em; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translateY(-.1em); opacity: .5; transition: transform .2s ease; }
                .geo-group.is-open > .geo-head::after { transform: rotate(-135deg); }
                .geo-items { display: none; padding: 0 0 .4rem; }
                .geo-group.is-open > .geo-items { display: block; }
                .geo-item { display: block; width: 100%; padding: .5em 1.1em .5em 2em; border: 0 !important; border-radius: 0 !important; background: transparent !important; color: inherit !important; font: inherit; font-weight: 400; text-transform: none; letter-spacing: 0; text-align: left; cursor: pointer; box-shadow: none !important; }
                .geo-item:hover, .geo-item:focus-visible { background: #f1f6f1 !important; outline: none; }
                .geo-item[aria-selected="true"] { background: var(--hero-accent, #2f6147) !important; color: #fff !important; }
            `;
            document.head.appendChild(style);
        },
        fill(select, entities, valueOf) {
            const english = window.BioCultureI18n?.language === "en";
            const plain = () => entities.forEach((entity) => {
                const option = document.createElement("option");
                option.value = valueOf(entity);
                option.textContent = entity.geography.name;
                select.appendChild(option);
            });
            return fetch("/data/geografias.json").then((response) => {
                if (!response.ok) throw new Error("geografias");
                return response.json();
            }).then((geo) => {
                this.geo = geo;
                this.injectStyle();
                const collator = new Intl.Collator(english ? "en" : "pt", { sensitivity: "base" });
                const buckets = new Map(geo.groups.map((group) => [group.key, []]));
                entities.forEach((entity) => buckets.get(geo.countries[valueOf(entity)] || "AGG").push(entity));
                // Mantém todos os valores no <select> escondido: o código da página continua a usá-lo.
                plain();
                // Lê o aspeto do seletor original antes de o esconder.
                const lookKeys = ["fontSize", "fontFamily", "color", "backgroundColor", "borderRadius", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "borderTopWidth", "borderTopColor"];
                const snapshot = Object.fromEntries(lookKeys.map((key) => [key, getComputedStyle(select)[key]]));
                select.classList.add("geo-native");
                select.tabIndex = -1;
                select.setAttribute("aria-hidden", "true");

                const placeholder = select.options[0]?.textContent || (english ? "Choose…" : "Escolher…");
                const picker = document.createElement("div");
                picker.className = "geo-picker";
                const trigger = document.createElement("button");
                trigger.type = "button";
                trigger.className = "geo-trigger";
                trigger.setAttribute("aria-haspopup", "true");
                trigger.setAttribute("aria-expanded", "false");
                // Reutiliza o aspeto do seletor original (tamanho, cantos, borda, tipo de letra).
                ["fontSize", "fontFamily", "color", "backgroundColor", "borderRadius", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight"].forEach((key) => { trigger.style[key] = snapshot[key]; });
                trigger.style.border = `${snapshot.borderTopWidth} solid ${snapshot.borderTopColor}`;
                const label = document.createElement("span");
                trigger.appendChild(label);
                const panel = document.createElement("div");
                panel.className = "geo-panel";
                panel.hidden = true;
                const list = document.createElement("div");
                panel.appendChild(list);

                const groups = [];
                geo.groups.forEach((group) => {
                    const rows = buckets.get(group.key);
                    if (!rows.length) return;
                    rows.sort((a, b) => collator.compare(a.geography.name, b.geography.name));
                    const block = document.createElement("div");
                    block.className = "geo-group";
                    const head = document.createElement("button");
                    head.type = "button";
                    head.className = "geo-head";
                    head.setAttribute("aria-expanded", "false");
                    const title = document.createElement("span");
                    title.textContent = english ? group.en : group.pt;
                    const count = document.createElement("small");
                    count.textContent = String(rows.length);
                    head.append(title, count);
                    const items = document.createElement("div");
                    items.className = "geo-items";
                    const buttons = rows.map((entity) => {
                        const item = document.createElement("button");
                        item.type = "button";
                        item.className = "geo-item";
                        item.setAttribute("role", "option");
                        item.dataset.value = valueOf(entity);
                        item.textContent = entity.geography.name;
                        item.addEventListener("click", () => {
                            select.value = item.dataset.value;
                            select.dispatchEvent(new Event("change", { bubbles: true }));
                            close();
                        });
                        items.appendChild(item);
                        return item;
                    });
                    block.append(head, items);
                    list.appendChild(block);
                    const setOpen = (open) => {
                        block.classList.toggle("is-open", open);
                        head.setAttribute("aria-expanded", String(open));
                    };
                    head.addEventListener("click", () => {
                        const open = !block.classList.contains("is-open");
                        groups.forEach((g) => g.setOpen(false));
                        setOpen(open);
                    });
                    groups.push({ block, buttons, setOpen });
                });
                const sync = () => {
                    const current = select.value;
                    label.textContent = current ? select.options[select.selectedIndex].textContent : placeholder;
                    groups.forEach((group) => group.buttons.forEach((item) => item.setAttribute("aria-selected", String(item.dataset.value === current && current !== ""))));
                };
                function close() {
                    panel.hidden = true;
                    picker.classList.remove("is-open");
                    trigger.setAttribute("aria-expanded", "false");
                }
                const open = () => {
                    panel.hidden = false;
                    picker.classList.add("is-open");
                    trigger.setAttribute("aria-expanded", "true");
                    groups.forEach((group) => group.setOpen(false));
                    const selected = groups.find((group) => group.buttons.some((item) => item.getAttribute("aria-selected") === "true"));
                    if (selected) selected.setOpen(true);
                };
                trigger.addEventListener("click", () => (panel.hidden ? open() : close()));
                document.addEventListener("click", (event) => { if (!picker.contains(event.target)) close(); });
                picker.addEventListener("keydown", (event) => {
                    if (event.key === "Escape") { close(); trigger.focus(); }
                });
                select.addEventListener("change", sync);
                const syncDisabled = () => { trigger.disabled = select.disabled; };
                new MutationObserver(syncDisabled).observe(select, { attributes: true, attributeFilter: ["disabled"] });
                syncDisabled();
                sync();
                picker.append(trigger, panel);
                select.after(picker);
            }).catch(plain);
        }
    };

    /* Barra de nível para valores por país: situa o valor numa escala, mostra a referência
       mundial e, quando existe um limiar oficial, as zonas correspondentes. Só usa limiares
       publicados (OMS, ODS 6.4.2/FAO, meta 30x30) e referências calculadas a partir dos próprios
       dados (média mundial e percentil entre os países com dados). */
    window.BioCulturaLevel = {
        styled: false,
        config: {
            sdg_6_1_1_safely_managed_drinking_water: { max: 100, better: "high", digits: 1, unit: "%" },
            sdg_6_4_2_water_stress: {
                max: 100, digits: 1, unit: "%",
                // Classes do indicador ODS 6.4.2 (FAO AQUASTAT / ONU-Água).
                zones: [
                    { to: 25, tone: "ok", pt: "Sem stress hídrico (abaixo de 25%)", en: "No water stress (below 25%)" },
                    { to: 50, tone: "low", pt: "Stress hídrico baixo (25–50%)", en: "Low water stress (25–50%)" },
                    { to: 75, tone: "mid", pt: "Stress hídrico médio (50–75%)", en: "Medium water stress (50–75%)" },
                    { to: 100, tone: "high", pt: "Stress hídrico alto (75–100%)", en: "High water stress (75–100%)" },
                    { to: Infinity, tone: "severe", pt: "Stress hídrico crítico (acima de 100%)", en: "Critical water stress (above 100%)" }
                ]
            },
            pm25_mean_annual_exposure: {
                max: 60, digits: 1, unit: " µg/m³",
                // Recomendação anual da OMS (2021): 5 µg/m³; meta intermédia 1: 35 µg/m³.
                zones: [
                    { to: 5, tone: "ok", pt: "Dentro da recomendação da OMS (5 µg/m³)", en: "Within the WHO guideline (5 µg/m³)" },
                    { to: 15, tone: "mid", pt: "Acima da recomendação da OMS (5 µg/m³)", en: "Above the WHO guideline (5 µg/m³)" },
                    { to: 35, tone: "high", pt: "Muito acima da recomendação da OMS (5 µg/m³)", en: "Far above the WHO guideline (5 µg/m³)" },
                    { to: Infinity, tone: "severe", pt: "Acima de todas as metas intermédias da OMS", en: "Above all WHO interim targets" }
                ],
                ticks: [5, 15, 35]
            },
            air_pollution_mortality_rate: { max: 320, better: "low", digits: 0, unit: "" },
            sdg_15_3_1_degraded_land: { max: 75, better: "low", digits: 1, unit: "%" },
            sdg_15_5_1_red_list_index: { max: 1, better: "high", digits: 3, unit: "" },
            electricity_access_pct: { max: 100, better: "high", digits: 1, unit: "%" },
            renewable_final_energy_pct: { max: 100, better: "high", digits: 1, unit: "%" },
            energy_intensity_mj_per_usd: { max: 20, better: "low", digits: 2, unit: "" },
            renewable_electricity_pct: { max: 100, better: "high", digits: 1, unit: "%" },
            terrestrial_protected_pct: { max: 100, better: "high", digits: 1, unit: "%", ticks: [30], target: { at: 30, pt: "Meta global de 30% até 2030", en: "Global target of 30% by 2030" } },
            marine_protected_pct: { max: 100, better: "high", digits: 1, unit: "%", ticks: [30], target: { at: 30, pt: "Meta global de 30% até 2030", en: "Global target of 30% by 2030" } }
        },
        injectStyle() {
            if (this.styled) return;
            this.styled = true;
            const style = document.createElement("style");
            style.textContent = `
                .lvl { margin-top: 1.1rem; }
                .lvl-track { position: relative; height: 8px; border-radius: 99px; background: #e8eee9; }
                .lvl-track.is-better-high { background: linear-gradient(90deg, #e2b2a6, #ead9a4 50%, #b4d2bd); }
                .lvl-track.is-better-low { background: linear-gradient(90deg, #b4d2bd, #ead9a4 50%, #e2b2a6); }
                .lvl-zone { position: absolute; top: 0; bottom: 0; }
                .lvl-zone:first-child { border-radius: 99px 0 0 99px; }
                .lvl-zone:last-child { border-radius: 0 99px 99px 0; }
                .lvl-zone.t-ok { background: #8dbf9f; } .lvl-zone.t-low { background: #c6d58a; } .lvl-zone.t-mid { background: #ecc86b; }
                .lvl-zone.t-high { background: #e19a62; } .lvl-zone.t-severe { background: #c9605a; }
                .lvl-dot { position: absolute; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: #1f3628; border: 3px solid #fff; box-shadow: 0 1px 5px rgba(0,0,0,.28); }
                .lvl-world { position: absolute; top: -5px; bottom: -5px; width: 0; border-left: 2px dashed rgba(31,54,40,.55); }
                .lvl-world b { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); padding-bottom: 2px; font-size: .62rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; color: #5d6e63; }
                .lvl-scale { position: relative; height: 1.1rem; margin-top: .45rem; font-size: .66rem; color: #8a978e; }
                .lvl-scale span { position: absolute; transform: translateX(-50%); white-space: nowrap; }
                .lvl-scale span:first-child { transform: none; } .lvl-scale span:last-child { transform: translateX(-100%); }
                .lvl-scale span.is-target { color: #2f6147; font-weight: 800; }
                .lvl-text { margin: .5rem 0 0 !important; font-size: .78rem !important; line-height: 1.5 !important; color: #5d6e63 !important; }
                .lvl-text strong, .country-value .lvl-text strong { display: inline !important; margin: 0 !important; font-size: inherit !important; font-weight: 700 !important; line-height: inherit !important; color: #1f3628 !important; letter-spacing: 0 !important; }
                .lvl-text em { font-style: normal; white-space: nowrap; }
            `;
            document.head.appendChild(style);
        },
        // Valores por país (apenas países, sem regiões nem agregados) para calcular o percentil.
        countryValues(key, entities, codeOf) {
            const geo = window.BioCulturaGeo?.geo;
            return (entities || []).filter((entity) => !geo || geo.countries[codeOf(entity)])
                .map((entity) => entity.latest?.[key]?.value).filter((value) => typeof value === "number");
        },
        html(key, value, context) {
            const settings = this.config[key];
            if (!settings || typeof value !== "number" || !isFinite(value)) return "";
            this.injectStyle();
            const english = window.BioCultureI18n?.language === "en";
            const tr = (pt, en) => (english ? en : pt);
            const locale = english ? "en-GB" : "pt-PT";
            const number = (n) => new Intl.NumberFormat(locale, { maximumFractionDigits: settings.digits }).format(n);
            const percent = (n) => Math.max(0, Math.min(100, (n / settings.max) * 100));
            const context_ = context || {};
            const zones = settings.zones;
            const track = [];
            if (zones) {
                let from = 0;
                zones.forEach((zone) => {
                    const to = Math.min(zone.to, settings.max);
                    if (to > from) track.push(`<i class="lvl-zone t-${zone.tone}" style="left:${percent(from)}%;width:${percent(to) - percent(from)}%"></i>`);
                    from = Math.max(from, to);
                });
            }
            const ticks = [0, ...(settings.ticks || []), settings.max];
            const scale = ticks.map((tick, index) => {
                const label = index === ticks.length - 1 ? `${number(tick)}${value > settings.max ? "+" : ""}` : number(tick);
                const target = settings.target && tick === settings.target.at ? " is-target" : "";
                return `<span class="${target.trim()}" style="left:${percent(tick)}%">${label}</span>`;
            }).join("");
            const world = typeof context_.world === "number" ? context_.world : null;
            const worldTick = world === null ? "" : `<i class="lvl-world" style="left:${percent(world)}%"><b>${tr("Mundo", "World")}</b></i>`;
            const lines = [];
            if (zones) {
                const zone = zones.find((candidate) => value < candidate.to) || zones[zones.length - 1];
                lines.push(`<strong>${english ? zone.en : zone.pt}</strong>`);
            }
            if (world !== null) {
                const shown = `${number(world)}${settings.unit}`;
                lines.push(`<em>${value > world ? tr(`Acima do valor mundial (${shown})`, `Above the world value (${shown})`)
                    : value < world ? tr(`Abaixo do valor mundial (${shown})`, `Below the world value (${shown})`)
                    : tr(`Igual ao valor mundial (${shown})`, `Equal to the world value (${shown})`)}</em>`);
            }
            if (context_.rank !== false) {
                const values = this.countryValues(key, context_.entities, context_.codeOf);
                if (values.length >= 20) {
                    const below = Math.round((values.filter((other) => other < value).length / values.length) * 100);
                    lines.push(`<em>${tr(`Superior a ${below}% dos países com dados`, `Higher than ${below}% of countries with data`)}</em>`);
                }
            }
            if (settings.target) {
                const reached = value >= settings.target.at;
                lines.push(`<em>${english ? settings.target.en : settings.target.pt} · ${reached ? tr("já atingida", "reached") : tr("ainda não atingida", "not yet reached")}</em>`);
            }
            const trackClass = !zones && settings.better ? ` is-better-${settings.better}` : "";
            const label = lines.map((line) => line.replace(/<[^>]+>/g, "")).join(". ");
            return `<div class="lvl" role="img" aria-label="${label.replace(/"/g, "&quot;")}"><div class="lvl-track${trackClass}">${track.join("")}${worldTick}<i class="lvl-dot" style="left:${percent(value)}%"></i></div><div class="lvl-scale">${scale}</div><p class="lvl-text">${zones ? `${lines[0]}<br>${lines.slice(1).join(" · ")}` : lines.join(" · ")}</p></div>`;
        }
    };

    /* Os intervalos de anos nos cabeçalhos dos gráficos acompanham os dados (que se atualizam sozinhos). */
    window.BioCulturaSeries = {
        label(canvas, years) {
            const heading = canvas?.closest(".chart-card")?.querySelector(".chart-title b");
            const valid = (years || []).filter((year) => Number.isFinite(year));
            if (!heading || !valid.length) return;
            const first = Math.min(...valid), last = Math.max(...valid);
            heading.textContent = first === last ? String(first) : `${first}–${last}`;
        }
    };

    const consolidatedLegacyRoutes = {
        "/observatorio/vetores-pressao.html": "/observatorio/observatorio-terra.html"
    };
    if (consolidatedLegacyRoutes[location.pathname]) {
        location.replace(consolidatedLegacyRoutes[location.pathname]);
        return;
    }

    /* Mantém todas as páginas no mesmo sistema editorial, incluindo páginas
       antigas que ainda não declaram explicitamente esta folha de estilos. */
    const heroSystem = document.querySelector('link[href*="biocultura-hero-system.css"]') || document.createElement("link");
    heroSystem.rel = "stylesheet";
    heroSystem.href = "/assets/css/biocultura-hero-system.css?v=27";
    heroSystem.dataset.bioculturaHeroSystem = "true";
    if (!heroSystem.parentNode) document.head.appendChild(heroSystem);

    /* Algumas páginas antigas ainda incluem a folha depois deste runtime.
       No fim da leitura do HTML, uniformiza a versão e elimina duplicados
       para impedir que uma cópia antiga em cache volte a ganhar prioridade. */
    function normalizeHeroStylesheet() {
        const links = Array.from(document.querySelectorAll('link[href*="biocultura-hero-system.css"]'));
        const canonical = links[0] || heroSystem;
        canonical.href = "/assets/css/biocultura-hero-system.css?v=27";
        canonical.dataset.bioculturaHeroSystem = "true";
        links.slice(1).forEach((link) => link.remove());
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", normalizeHeroStylesheet, { once: true });
    } else {
        normalizeHeroStylesheet();
    }

    /* Identifica apenas aberturas editoriais com imagem própria. Painéis
       funcionais, como o calendário mensal, mantêm a sua composição. */
    function markEditorialHero() {
        if (document.body.dataset.heroTheme === "forest") return;
        const hero = document.querySelector("#main .water-hero, #main .regen-hero, #main .observatory-hero, #main .hero");
        if (!hero) return;
        const visual = hero.querySelector(":scope > .water-hero-image, :scope > .regen-hero-image, :scope > .observatory-visual, :scope > .water-orbit, :scope > .air-orbit, :scope > .soil-orbit, :scope > .life-orbit, :scope > .grape-stage, :scope > .energy-orbit, :scope > .territory-orbit, :scope > .ore-orbit, :scope > .digital-orbit, :scope > .field-mark, :scope > .living-mark");
        if (!visual) return;
        hero.classList.add("bio-banner-hero");

        /* O banner contém apenas identidade, título e subtítulo. Informação
           complementar continua imediatamente depois, sem ser cortada. */
        const extras = hero.querySelectorAll(":scope .hero-proof, :scope .hero-guide, :scope .location-guide, :scope .hero-reading-bridge, :scope .vineyard-reading-bridge");
        if (extras.length) {
            const followup = document.createElement("div");
            followup.className = "bio-hero-followup";
            extras.forEach((element) => followup.appendChild(element));
            hero.insertAdjacentElement("afterend", followup);
        }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", markEditorialHero, { once: true });
    else markEditorialHero();

    const consolidatedRoutes = new Set(["/calendario/regeneration-calendar.html", "/energia/energy.html", "/calendario/living-vineyard.html", "/observatorio/vetores-pressao-global.html"]);
    if (consolidatedRoutes.has(location.pathname)) {
        const consolidationStyle = document.createElement("link");
        consolidationStyle.rel = "stylesheet";
        consolidationStyle.href = "/assets/css/territorial-consolidation.css?v=8";
        document.head.appendChild(consolidationStyle);
        import("/assets/js/territorial-consolidation.js?v=10").catch((error) => {
            console.error("Não foi possível carregar a leitura territorial.", error);
        });
    }

    const languageStore = window.BioCultureLanguageStore || (() => {
        const valid = new Set(["pt", "en"]);
        function cookieValue() {
            const match = document.cookie.match(/(?:^|;\s*)bioculture_lang_v2=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : "";
        }
        function write(value) {
            const selected = valid.has(value) ? value : "pt";
            try { window.localStorage.setItem("selected_lang", selected); } catch (_) {}
            const rootDomainMatch = /(?:^|\.)(bioculture\.(?:net|pt))$/i.exec(location.hostname);
            const domain = rootDomainMatch ? `; Domain=.${rootDomainMatch[1]}` : "";
            document.cookie = `bioculture_lang_v2=${encodeURIComponent(selected)}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${location.protocol === "https:" ? "; Secure" : ""}`;
            document.documentElement.lang = selected;
            return selected;
        }
        function read() {
            const parameter = new URLSearchParams(window.location.search).get("lang");
            if (valid.has(parameter)) return write(parameter);
            let local = "";
            try { local = window.localStorage.getItem("selected_lang") || ""; } catch (_) {}
            const cookie = cookieValue();
            return write(valid.has(cookie) ? cookie : valid.has(local) ? local : "pt");
        }
        return Object.freeze({ read, write });
    })();
    window.BioCultureLanguageStore = languageStore;

    // Arranque explícito do módulo territorial. O menu lateral é injetado
    // depois do HTML principal; não dependemos de imagens invisíveis nem de
    // eventos onload que o Safari pode omitir ao restaurar a cache.
    let biocultureShellBooted = false;
    function bootBioCultureShell() {
        if (biocultureShellBooted) return;
        biocultureShellBooted = true;
        import("/assets/js/biocultura-shell.js?v=19")
            .then((module) => module.init())
            .catch((error) => {
                biocultureShellBooted = false;
                console.error("Não foi possível iniciar a localização bioCulture.", error);
            });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootBioCultureShell, { once: true });
    } else {
        bootBioCultureShell();
    }

    // Menu em ecrãs até 1280 px: botão e gaveta lateral (ver biocultura-mobile-nav.js).
    if (!document.querySelector('script[src*="biocultura-mobile-nav.js"]')) {
        const mobileNav = document.createElement("script");
        mobileNav.src = "/assets/js/biocultura-mobile-nav.js?v=3";
        mobileNav.defer = true;
        document.head.appendChild(mobileNav);
    }

    const supported = new Set(["en"]);
    const stored = languageStore.read();
    const lang = supported.has(stored) ? stored : "pt";

    function navigateToLanguage(value) {
        const selected = value === "en" ? "en" : "pt";
        languageStore.write(selected);
        const url = new URL(window.location.href);
        if (selected === "en") url.searchParams.set("lang", "en");
        else url.searchParams.delete("lang");
        window.location.assign(url.href);
    }

    function syncLanguageSelector(root) {
        const selector = root?.matches?.("#lang-selector")
            ? root
            : root?.querySelector?.("#lang-selector");
        if (!selector) return;
        selector.value = lang;
        selector.dataset.biocultureRuntimeBound = "true";
    }

    // O sidebar é injetado depois do carregamento da página. A delegação no
    // documento evita depender do onchange inline ou do restauro de formulários
    // do Safari.
    document.addEventListener("change", (event) => {
        if (event.target?.id !== "lang-selector") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateToLanguage(event.target.value);
    }, true);

    function preserveLanguageInLinks(root) {
        if (lang !== "en") return;
        root.querySelectorAll?.("a[href]").forEach((link) => {
            const raw = link.getAttribute("href");
            if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
            try {
                const url = new URL(raw, window.location.href);
                if (url.origin !== window.location.origin) return;
                url.searchParams.set("lang", "en");
                link.href = url.href;
            } catch (_) {}
        });
    }

    // O Safari pode recuperar uma página completa da memória de navegação.
    // Se o idioma guardado mudou entretanto, força uma reconstrução coerente.
    window.addEventListener("pageshow", (event) => {
        const selected = languageStore.read();
        if (event.persisted && document.documentElement.lang !== selected) {
            window.location.reload();
        }
    });

    const categoryNames = {
        "Água": "Water",
        "Ar": "Air",
        "Solo": "Soil",
        "Impacto Digital & IA": "Digital Impact & AI",
        "Mineração": "Mining",
        "Biodiversidade": "Biodiversity",
        "Energia Ética": "Ethical Energy",
        "Pecuária Industrial": "Industrial Livestock",
        "Geral": "General",
    };

    function selectedContent(record) {
        if (!record || typeof record !== "object") return record || {};
        return record[lang] || record.pt || record;
    }

    function formatDate(value) {
        if (!value) return "";
        const raw = String(value).trim();
        const portugueseMonths = {
            jan: "Jan", fev: "Feb", mar: "Mar", abr: "Apr", mai: "May", jun: "Jun",
            jul: "Jul", ago: "Aug", set: "Sep", out: "Oct", nov: "Nov", dez: "Dec",
        };
        const translated = raw.replace(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi,
            (month) => portugueseMonths[month.toLowerCase()] || month);
        const textual = translated.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
        const monthIndex = textual ? ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(textual[2]) : -1;
        const date = /^\d{4}-\d{2}-\d{2}$/.test(translated)
            ? new Date(`${translated}T12:00:00Z`)
            : textual && monthIndex >= 0
                ? new Date(Date.UTC(Number(textual[3]), monthIndex, Number(textual[1]), 12))
                : new Date(translated);
        if (Number.isNaN(date.getTime())) return raw;
        return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pt-PT", {
            day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
        }).format(date);
    }

    window.BioCultureI18n = Object.freeze({
        language: lang,
        isEnglish: lang === "en",
        content: selectedContent,
        date: formatDate,
        category(value) {
            return lang === "en" ? (categoryNames[value] || value || "General") : (value || "Geral");
        },
        choose(pt, en) {
            return lang === "en" ? en : pt;
        },
        t(key) {
            return nestedValue(structuredDictionary, key) || key;
        },
        updateDOM(root = document) {
            applyStructuredTranslations(root);
            translateElement(root === document ? document.body : root);
        },
    });

    window.BioCultureNews = {
        dateValue(item) {
            const raw = item?.publicado_em || item?.data || item?.capturado_em || "";
            const normalized = String(raw)
                .replace(/\bJan\b/i, "Jan").replace(/\bFev\b/i, "Feb")
                .replace(/\bMar\b/i, "Mar").replace(/\bAbr\b/i, "Apr")
                .replace(/\bMai\b/i, "May").replace(/\bJun\b/i, "Jun")
                .replace(/\bJul\b/i, "Jul").replace(/\bAgo\b/i, "Aug")
                .replace(/\bSet\b/i, "Sep").replace(/\bOut\b/i, "Oct")
                .replace(/\bNov\b/i, "Nov").replace(/\bDez\b/i, "Dec");
            const value = Date.parse(normalized.slice(0, 10));
            return Number.isNaN(value) ? 0 : value;
        },
        compare(a, b) {
            const dateDifference = this.dateValue(b) - this.dateValue(a);
            if (dateDifference) return dateDifference;
            return (+b?.prioridade || +b?.relevancia || 0) - (+a?.prioridade || +a?.relevancia || 0);
        },
        // Mais recentes à frente, por escalões de idade (até 7 dias, até 3 semanas, até 6 semanas, mais antigas);
        // dentro de cada escalão manda a relevância, depois o tipo de fonte (organismos oficiais antes de imprensa,
        // e esta antes de artigos científicos) e só por fim a data.
        compareByRelevance(items) {
            const newest = Math.max(0, ...items.map((item) => this.dateValue(item)));
            const tier = (item) => {
                const age = (newest - this.dateValue(item)) / 86400000;
                return age <= 7 ? 0 : age <= 21 ? 1 : age <= 45 ? 2 : 3;
            };
            const sourceRank = (item) => ({
                "organizacao-internacional": 0, "agencia-publica": 0, "fonte-primaria": 0,
                "servico-publico": 1, "jornalismo-especializado": 1, "agencia-noticiosa": 1,
                "imprensa-internacional": 1, "imprensa-nacional": 1, "ciencia": 2,
            }[item?.tipo_fonte] ?? 1);
            const relevance = (item) => +item?.prioridade || +item?.relevancia || 0;
            return (a, b) => tier(a) - tier(b)
                || relevance(b) - relevance(a)
                || sourceRank(a) - sourceRank(b)
                || this.dateValue(b) - this.dateValue(a);
        },
        // Palavras inteiras (com plural simples); «raiz*» aceita qualquer terminação. Assim «rio» já não apanha «negócio».
        wordsRegex(words) {
            const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const body = (letters) => words.map((word) => {
                const stem = word.endsWith("*");
                const text = escape(word.replace(/\*$/, ""));
                return stem ? `${text}${letters}*` : `${text}s?(?!${letters})`;
            }).join("|");
            try {
                return new RegExp(`(?<![\\p{L}\\p{N}])(?:${body("[\\p{L}\\p{N}]").replace(/\(\?!\[\\p\{L\}\\p\{N\}\]\)/g, "(?![\\p{L}\\p{N}])")})`, "iu");
            } catch (_) {
                return new RegExp(`(?:^|[^\\wÀ-ÿ])(?:${body("[\\wÀ-ÿ]").replace(/\(\?!\[\\wÀ-ÿ\]\)/g, "(?![\\wÀ-ÿ])")})`, "i");
            }
        },
        // Uma notícia é «sobre» um tema se o título o diz. Nas notícias captadas automaticamente só conta o título
        // (o resumo apanha referências de passagem); nas escritas à mão conta também o resumo e o corpo.
        about(item, words, categories = []) {
            this._topics = this._topics || {};
            const key = words.join("|");
            const rx = this._topics[key] || (this._topics[key] = this.wordsRegex(words));
            const titles = [item?.pt?.titulo, item?.en?.titulo, item?.titulo].filter(Boolean).join(" ");
            if (item?.capturado_em) {
                // Artigos científicos: além do título, a categoria principal tem de ser a do tema («water» num título
                // sobre lavagem de hortícolas não faz dele uma notícia de água).
                if (item.tipo_fonte === "ciencia" && categories.length && !categories.includes(item.categoria_id)) return false;
                return rx.test(titles);
            }
            // Notícias escritas à mão: vale a categoria principal que lhes atribuíste ou o título. As categorias
            // secundárias, o resumo e o corpo tocam em muita coisa de passagem («água», «solo», «ecossistemas»)
            // e levavam a mesma notícia para todas as páginas.
            if (categories.includes(item?.categoria_id)) return true;
            return rx.test(titles);
        },
        // Temas dos hubs: palavras do título (e categorias principais) que fazem uma notícia pertencer a cada tema.
        topics: {"agua": {"words": ["água*", "aguas", "water", "seca*", "drought*", "rio", "river", "aquífer*", "aquifer*", "hídric*", "hydro*", "inunda*", "flood*", "cheia*", "albufeira*", "reservoir*", "salinização", "salinity", "lago", "lake"], "categories": ["agua"]}, "ar": {"words": ["qualidade do ar", "air quality", "poluição", "pollution", "poluent*", "pollutant*", "emissões", "emissions", "atmosfer*", "atmospher*", "pm2*", "pm10", "ozono", "ozone", "fumo", "smoke", "incêndio*", "incendi*", "wildfire*", "fogo*", "fires", "poeira", "dust", "respirat*", "mega-incêndio*"], "categories": ["ar", "poluicao"]}, "solo": {"words": ["solo*", "soil*", "erosão", "erosion", "desertific*", "degradação", "land degradation", "land restoration", "restauro do solo", "compost*", "húmus", "humus", "pastagem*", "pasture*", "rangeland*"], "categories": ["solo"]}, "biodiversidade": {"words": ["biodivers*", "espécies ameaçadas", "threatened species", "endangered species", "invasor*", "invasive", "habitat*", "wildlife", "vida selvagem", "extinção", "extinction", "conservação", "conservation", "ecossistema*", "ecosystem*", "floresta*", "forest*", "polinizador*", "pollinator*", "orangotango*", "orangutan*", "tartaruga*", "turtle*", "aves", "birds", "gannet*", "alcatraz*"], "categories": ["biodiversidade", "conservacao"]}, "mineracao": {"words": ["mineração", "mineiro*", "mina", "minas", "mining", "mine", "minério*", "mineral*", "lítio", "lithium", "ouro", "gold", "cobre", "copper", "carvão", "coal", "níquel", "nickel", "cobalto", "cobalt", "caulino", "kaolin", "pedreira*", "quarry", "rejeitado*", "baldios"], "categories": ["mineracao"]}, "energia": {"words": ["energia", "energy", "renovável*", "renováveis", "renewable*", "solar", "eólic*", "wind", "elétric*", "eletric*", "electric*", "eficiência", "efficiency", "rede elétrica", "grid", "autoconsumo", "self-consumption", "nuclear", "hidroelétric*", "fotovolta*", "photovoltaic*", "bateria*", "battery", "armazenamento", "storage"], "categories": ["energia"]}, "impacto-digital": {"words": ["centro de dados", "centros de dados", "data cent*", "datacenter*", "inteligência artificial", "artificial intelligence", "IA", "AI", "chips", "semicondutor*", "semiconductor*", "cloud", "nuvem"], "categories": ["impacto-digital"]}, "pecuaria": {"words": ["pecuári*", "pecuaria", "livestock", "suinicultur*", "suíno*", "aviário*", "bovin*", "gado", "cattle", "pig*", "porco*", "efluente*", "estrume", "chorume", "bem-estar animal", "animal welfare", "carne", "meat", "leite", "dairy", "laticíni*"], "categories": ["pecuaria"]}, "agricultura": {"words": ["agricultur*", "agrícola*", "agroecolog*", "biológic*", "organic", "orgânic*", "vinha*", "vinho*", "vindima*", "viticultur*", "vineyard*", "wine*", "winemak*", "horta*", "hortícola*", "cultiv*", "crop*", "semente*", "seed*", "colheita*", "harvest*", "cereais", "cereal*", "alimentar*", "alimento*", "food", "fertiliz*", "fertilidade", "compost*", "pesticida*", "pesticide*", "polinizador*", "pollinator*", "produtor*", "regenerativ*", "regenerative", "rega", "irrigation"], "categories": ["agricultura"]}},
        // Selo do tipo de conteúdo (facto noticiado, estudo, comunicado, opinião…), mostrado ao leitor.
        typeLabels: {
            "noticia": ["Notícia", "News"],
            "noticia-ciencia": ["Notícia de ciência", "Science news"],
            "estudo": ["Artigo científico", "Scientific paper"],
            "relatorio": ["Relatório", "Report"],
            "comunicado": ["Comunicado", "Press release"],
            "opiniao": ["Opinião", "Opinion"],
            "opiniao-especialista": ["Opinião de especialista", "Expert opinion"],
            "explicador": ["Explicador", "Explainer"],
            "observacao-da-terra": ["Observação da Terra", "Earth observation"],
            "fonte-primaria": ["Fonte primária", "Primary source"],
            "sintese-documental": ["Síntese documental", "Documentary summary"],
            "entrevista": ["Entrevista", "Interview"],
        },
        typeLabel(item) {
            const label = this.typeLabels[item?.tipo_conteudo];
            return label ? label[window.BioCultureI18n?.isEnglish ? 1 : 0] : "";
        },
        // «Continuar no bioCulture»: páginas de leitura e de ação (técnicas, calendário) ligadas ao tema de cada notícia.
        // [href, título PT, título EN]
        relatedPages: {
            agua: { read: [["/recursos/agua.html", "Água no mundo e em Portugal", "Water in the world and in Portugal"]], act: [["/services/servicos.html#chuva", "Captar a água da chuva", "Harvest rainwater"], ["/services/servicos.html?categoria=%C3%81gua%20e%20irriga%C3%A7%C3%A3o#catalogo-tecnicas", "Técnicas de água e irrigação", "Water and irrigation techniques"]] },
            solo: { read: [["/recursos/solo.html", "Solo no mundo e em Portugal", "Soil in the world and in Portugal"]], act: [["/services/servicos.html#compostagem", "Compostagem como ciclo", "Composting as a cycle"], ["/services/servicos.html#solo", "Cobrir o solo (mulching)", "Covering the soil (mulching)"]] },
            ar: { read: [["/recursos/ar.html", "Qualidade do ar no mundo e em Portugal", "Air quality in the world and in Portugal"], ["/energia/energia.html", "Energia consciente", "Conscious energy"]], act: [] },
            biodiversidade: { read: [["/ecossistemas/biodiversidade.html", "Biodiversidade no mundo e em Portugal", "Biodiversity in the world and in Portugal"]], act: [["/services/servicos.html?categoria=Biodiversidade%20funcional#catalogo-tecnicas", "Biodiversidade funcional: técnicas", "Functional biodiversity: techniques"], ["/services/servicos.html#agrofloresta", "Agrofloresta", "Agroforestry"]] },
            agricultura: { read: [["/calendario/conhecimento-cuidar.html", "Conhecimento para cuidar", "Knowledge to care"]], act: [["/calendario/calendario.html", "Calendário de regeneração: o que fazer agora", "Regeneration calendar: what to do now"], ["/services/servicos.html?categoria=Preven%C3%A7%C3%A3o%20sem%20pesticidas#catalogo-tecnicas", "Prevenção sem pesticidas", "Prevention without pesticides"]] },
            energia: { read: [["/energia/energia.html", "Energia consciente", "Conscious energy"], ["/energia/renewables-and-territory.html", "Renováveis e território", "Renewables and territory"]], act: [["/services/servicos.html#solar", "Fotovoltaico para autoconsumo", "Solar PV for self-consumption"]] },
            mineracao: { read: [["/energia/mineracao.html", "Mineração no mundo e em Portugal", "Mining in the world and in Portugal"]], act: [] },
            "impacto-digital": { read: [["/energia/digital.html", "Impacto digital e IA", "Digital impact and AI"]], act: [] },
            pecuaria: { read: [["/energia/pecuaria.html", "Pecuária industrial no mundo e em Portugal", "Industrial livestock farming in the world and in Portugal"]], act: [] },
            terra: { read: [["/observatorio/observatorio-terra.html", "Observatório da Terra", "Earth Observatory"], ["/observatorio/pressoes-humanas.html", "Vetores de pressão", "Pressure vectors"]], act: [] },
            // Notícias de clima sem tema próprio: leitura do clima e ações de adaptação (calor, seca, fogo, cheias) ou de redução de emissões.
            clima: { read: [["/observatorio/observatorio-terra.html", "Observatório da Terra", "Earth Observatory"], ["/observatorio/limitar-ultrapassagem-1-5.html", "Depois de 1,5 °C: limitar a ultrapassagem", "After 1.5°C: limiting the overshoot"]], act: [] },
        },
        climateActions: {
            adapt: [["/services/servicos.html#solo", "Cobrir o solo (mulching): menos evaporação e calor", "Cover the soil (mulching): less evaporation and heat"], ["/services/servicos.html#agrofloresta", "Agrofloresta: sombra, microclima e solo protegido", "Agroforestry: shade, microclimate and protected soil"], ["/services/servicos.html#chuva", "Captar a água da chuva para o verão", "Harvest rainwater for the summer"]],
            mitigate: [["/services/servicos.html#solar", "Fotovoltaico para autoconsumo", "Solar PV for self-consumption"], ["/services/servicos.html#compostagem", "Compostagem: devolver carbono ao solo", "Composting: returning carbon to the soil"], ["/energia/energia.html", "Energia consciente", "Conscious energy"]],
        },
        // Calor, seca, fogo, cheias e fenómenos extremos pedem adaptação; o resto (emissões, política, gelo, mar) pede redução de emissões.
        climateKind(item) {
            const titles = [item?.pt?.titulo, item?.en?.titulo].filter(Boolean).join(" ");
            return /calor|heat|onda[s]? de|vaga[s]? de|sec[ao]\b|drought|incêndi|wildfire|\bfire|cheia|inunda|flood|el ni[ñn]o|temperatura|extrem|tufão|typhoon|ciclone|cyclone|furacão|hurricane|tempestade|storm/i.test(titles) ? "adapt" : "mitigate";
        },
        related(item) {
            const english = !!window.BioCultureI18n?.isEnglish;
            const primary = { agua: "agua", ar: "ar", solo: "solo", biodiversidade: "biodiversidade", energia: "energia", mineracao: "mineracao", "impacto-digital": "impacto-digital", agricultura: "agricultura", conhecimento: "agricultura" }[item?.categoria_id];
            const keys = [];
            const climate = ["clima", "oceanos"].includes(item?.categoria_id);
            if (primary) keys.push(primary);
            for (const [key, topic] of Object.entries(this.topics)) {
                const secondary = !item?.capturado_em && (item?.categorias || []).some((category) => (topic.categories || []).includes(category));
                // Notícias de clima: só um tema secundário assumido à mão conta; as palavras do título («poluição», «carbono») levavam tudo para o ar e a energia.
                if (!keys.includes(key) && (secondary || (!climate && this.about(item, topic.words, topic.categories || [])))) keys.push(key);
            }
            if (climate || !keys.length) keys.push(climate || !item?.categoria_id ? "clima" : "terra");
            if (climate && keys.length > 1) keys.push(keys.splice(keys.indexOf("clima"), 1)[0]);
            const seen = new Set();
            const out = [];
            const push = (kind, [href, pt, en]) => {
                if (seen.has(href) || out.length >= 6) return;
                seen.add(href);
                out.push({ kind, href, title: english ? en : pt });
            };
            const chosen = keys.slice(0, 2);
            chosen.forEach((key) => (this.relatedPages[key]?.read || []).forEach((page) => push("read", page)));
            // As ações vêm do primeiro tema que as tenha (o clima escolhe entre adaptação e redução de emissões).
            for (const key of chosen) {
                const acts = key === "clima" ? this.climateActions[this.climateKind(item)] : (this.relatedPages[key]?.act || []);
                if (acts.length) { acts.forEach((page) => push("act", page)); break; }
            }
            return out;
        },
        // Cartão de notícia no formato dos hubs (imagem, data, título, excerto, fonte). Usa as classes hub-latest-*.
        cardHtml(item) {
            const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
            const i18n = window.BioCultureI18n;
            const c = i18n?.content(item) || item?.pt || item || {};
            const fallback = "/images/noticias-sem-imagem.webp";
            const raw = item?.imagem;
            const image = typeof raw === "string" && (/^https?:\/\//i.test(raw) || raw.startsWith("/")) ? raw : fallback;
            const alt = image === fallback ? (i18n?.isEnglish ? "bioCulture editorial illustration" : "Ilustração editorial bioCulture") : "";
            const href = `/observatorio/noticia-detalhe.html?id=${encodeURIComponent(item?.id)}`;
            const summary = c.resumo_biocultura || c.resumo || "";
            return `<a href="${esc(href)}"><div class="news-media"><img class="hub-latest-thumb" src="${esc(image)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'"></div><div class="hub-latest-card-body"><small>${esc(i18n?.date(item?.data) || item?.data || item?.categoria || "")}${this.typeLabel(item) ? ` · ${esc(this.typeLabel(item))}` : ""}</small><h3>${esc(c.titulo || "")}</h3>${summary ? `<p>${esc(summary)}</p>` : ""}<span>${esc(item?.fonte || "bioCulture")} →</span></div></a>`;
        },
        rank(items) {
            const rows = Array.isArray(items) ? items : [];
            return [...rows].sort(this.compareByRelevance(rows));
        },
        categories(item) {
            return [...new Set([...(item?.categorias || []), ...(item?.tags || []), item?.categoria_id].filter(Boolean))];
        },
        scope(item) {
            return item?.ambito || (item?.paises?.includes?.("PT") ? "portugal" : "global");
        },
        visibleIn(item, context = "global") {
            const scope = this.scope(item);
            if (context === "all") return true;
            if (context === "portugal") return scope === "portugal";
            return scope !== "portugal" || item?.relevancia_global === true;
        },
        select(items, { categories = [], context = "global", limit = 6, order = "date" } = {}) {
            const wanted = new Set(categories);
            const published = (items || []).filter((item) => item?.estado !== "proposta");
            const rows = published
                .filter((item) => this.visibleIn(item, context))
                .filter((item) => !wanted.size || this.categories(item).some((category) => wanted.has(category)));
            // A idade conta-se desde a notícia mais recente de todas, não da mais recente do tema.
            return rows
                .sort(order === "relevance" ? this.compareByRelevance(published) : (a, b) => this.compare(a, b))
                .slice(0, limit);
        },
    };

    function installImageSignatures() {
        if (!document.getElementById("bioculture-image-signature-style")) {
            const style = document.createElement("style");
            style.id = "bioculture-image-signature-style";
            style.textContent = `
                .bioculture-owned-visual { position: relative !important; }
                .bioculture-image-signature-frame { display: block; overflow: hidden; }
                .bioculture-image-signature-frame > img { display: block; }
                .bioculture-owned-visual::after {
                    content: "bioCulture";
                    position: absolute;
                    z-index: 6;
                    right: .72rem;
                    bottom: .58rem;
                    color: rgba(255,255,255,.42);
                    font: 400 .62rem/1 Georgia, "Times New Roman", serif;
                    letter-spacing: -.035em;
                    text-shadow: 0 1px 3px rgba(20,38,29,.28);
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
        }

        const ownedPath = (value) => {
            try {
                const url = new URL(value, location.href);
                if (url.origin !== location.origin) return false;
                if (!/^\/(images|assets\/dicas)\//.test(url.pathname)) return false;
                return !/(logo|mark|placeholder|favicon|icon)/i.test(url.pathname);
            } catch (_) { return false; }
        };
        const excluded = "#sidebar, .bio-wordmark, .source-logo-detail, [data-no-signature]";
        const mark = (root = document) => {
            root.querySelectorAll?.("img[src]").forEach((image) => {
                if (!ownedPath(image.getAttribute("src")) || image.closest(excluded)) return;
                let frame = image.closest("picture, .hero-image, .hero-globe, .portal-mark, .dossier-visual, .vine-vignette, .hub-thumb");
                if (!frame) {
                    if (image.parentElement?.classList.contains("bioculture-image-signature-frame")) frame = image.parentElement;
                    else {
                        frame = document.createElement("span");
                        frame.className = "bioculture-image-signature-frame";
                        image.before(frame);
                        frame.appendChild(image);
                    }
                }
                if (frame && !frame.closest(excluded)) frame.classList.add("bioculture-owned-visual");
            });
            root.querySelectorAll?.("[style*='background-image'], .observatory-visual, .hub-thumb").forEach((element) => {
                if (element.closest(excluded)) return;
                const match = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
                if (match && ownedPath(match[1])) element.classList.add("bioculture-owned-visual");
            });
        };
        mark();
        new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) mark(node);
        }))).observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installImageSignatures, { once: true });
    else installImageSignatures();

    function filterNewsForPage(data, url) {
        if (!url.includes("/data/noticias.json") || !Array.isArray(data) || location.pathname.includes("noticia-detalhe")) return data;
        const pageCategories = [
            [/\/(water|agua)\.html$/, ["agua"]],
            [/\/(air|ar)\.html$/, ["ar"]],
            [/\/(soil|solo)\.html$/, ["solo"]],
            [/\/(biodiversity|biodiversidade)\.html$/, ["biodiversidade"]],
            [/\/(energy|energia)\.html$/, ["energia"]],
            [/\/(renewables-and-territory|transicao-etica)\.html$/, ["energia"]],
            [/\/(ai-data-centres|digital)\.html$/, ["impacto-digital"]],
            [/\/(mining|mineracao)\.html$/, ["mineracao"]],
            [/\/(livestock|pecuaria)\.html$/, ["pecuaria"]],
            [/\/(regeneration-calendar|calendario)\.html$/, ["agricultura"]],
            [/\/(living-vineyard|enologia)\.html$/, ["agricultura"]],
        ];
        const pageRule = pageCategories.find(([pattern]) => pattern.test(location.pathname));
        if (pageRule) {
            const wanted = new Set(pageRule[1]);
            data = data.filter((item) => window.BioCultureNews.categories(item).some((category) => wanted.has(category)));
        }
        // Estas páginas já juntam a leitura global ("No mundo") e a nacional
        // ("Portugal e ilhas") na mesma página, pelo que o widget de notícias
        // deve mostrar as duas escalas, não só a portuguesa.
        const mergedPages = /\/(agua|ar|solo|biodiversidade|energia|transicao-etica|digital|mineracao|pecuaria|calendario|enologia|observatorio-terra)\.html$/;
        if (mergedPages.test(location.pathname)) return data.filter((item) => window.BioCultureNews.visibleIn(item, "all"));
        return data;
    }

    if (!supported.has(lang)) {
        const portugueseFetch = window.fetch.bind(window);
        window.fetch = async function (...args) {
            const response = await portugueseFetch(...args);
            const url = String(args[0] instanceof Request ? args[0].url : args[0]);
            if (!url.includes("/data/noticias.json")) return response;
            const readJson = response.json.bind(response);
            Object.defineProperty(response, "json", { configurable: true, value: async () => filterNewsForPage(await readJson(), url) });
            return response;
        };
        return;
    }

    let dictionary = null;
    let structuredDictionary = null;
    /* Traduções só de apresentação: aplicam-se ao texto já desenhado na página,
       mas nunca aos dados JSON, porque o código das páginas (calendário, filtros,
       cruzamentos) lê valores em português como "março–maio" ou "fruteira". */
    let displayDictionary = {};
    let loading = null;
    const originalFetch = window.fetch.bind(window);

    function normalise(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    /* Um único carregamento partilhado: quem chega depois espera por todos os
       dicionários (automático, estruturado e de apresentação). */
    let fullLoading = null;
    async function loadDictionary() {
        if (!fullLoading) {
            const read = (url) => originalFetch(url, { cache: "no-cache" })
                .then((response) => response.ok ? response.json() : {})
                .catch(() => ({}));
            fullLoading = Promise.all([
                read(`/assets/lang/auto/${lang}.json?v=50`),
                read(`/assets/lang/${lang}.json?v=15`),
                read(`/assets/lang/display/${lang}.json?v=37`),
            ]).then(([auto, structured, display]) => {
                dictionary = auto;
                structuredDictionary = structured;
                displayDictionary = display;
            });
        }
        await fullLoading;
        return dictionary;
    }

    function nestedValue(object, path) {
        return String(path || "").split(".").reduce((value, key) => value?.[key], object);
    }

    function applyStructuredTranslations(root) {
        if (!structuredDictionary) return;
        const scope = root?.querySelectorAll ? root : document;
        const nodes = [];
        if (root?.matches?.("[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]")) nodes.push(root);
        scope.querySelectorAll?.("[data-i18n], [data-i18n-html], [data-i18n-placeholder], [data-i18n-title]").forEach((node) => nodes.push(node));
        nodes.forEach((node) => {
            const text = nestedValue(structuredDictionary, node.dataset.i18n);
            const html = nestedValue(structuredDictionary, node.dataset.i18nHtml);
            const placeholder = nestedValue(structuredDictionary, node.dataset.i18nPlaceholder);
            const title = nestedValue(structuredDictionary, node.dataset.i18nTitle);
            if (typeof text === "string") node.textContent = text;
            if (typeof html === "string") node.innerHTML = html;
            if (typeof placeholder === "string") node.setAttribute("placeholder", placeholder);
            if (typeof title === "string") {
                node.setAttribute("title", title);
                node.setAttribute("aria-label", title);
            }
        });
    }

    function translateString(value) {
        if (!dictionary || typeof value !== "string") return value;
        const key = normalise(value);
        return dictionary[key] || value;
    }

    /* Permite às páginas ordenar pelo nome já traduzido (ex.: catálogo de culturas). */
    window.BioCultureDisplayTranslate = (value) => {
        const key = normalise(value);
        return displayDictionary[key] || (dictionary && dictionary[key]) || value;
    };

    function translateData(value) {
        if (typeof value === "string") return translateString(value);
        if (Array.isArray(value)) return value.map(translateData);
        if (value && typeof value === "object") {
            Object.keys(value).forEach((key) => {
                value[key] = translateData(value[key]);
            });
        }
        return value;
    }

    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const url = String(args[0] instanceof Request ? args[0].url : args[0]);
        if (!url.includes("/data/") || !url.includes(".json")) return response;
        await loadDictionary();
        const readJson = response.json.bind(response);
        Object.defineProperty(response, "json", {
            configurable: true,
            value: async () => {
                const data = translateData(await readJson());
                return filterNewsForPage(data, url);
            },
        });
        return response;
    };

    /* Textos compostos pelas páginas ("Fonte 2", "cerca de 27 km · Tondela",
       "· Estado", "Tipo · Ano"): traduz cada parte conhecida e mantém o resto. */
    function lookupDisplay(key) {
        return dictionary[key] || displayDictionary[key] || "";
    }
    const HYMENOPTERA = { vespas: "wasps", formigas: "ants", abelhas: "bees", "vespas-oleiras": "mud-dauber wasps", "vespas verdadeiras": "true wasps" };
    const FAMILY_PT = { coccinelídeos: "Coccinellidae", crambídeos: "Crambidae", esfingídeos: "Sphingidae", ninfalídeos: "Nymphalidae", erebídeos: "Erebidae" };
    function translateTaxonSentence(key) {
        let m;
        const head = "(.+?)(?:,\\s*(?:(?:também |comummente )?conhecid[ao] (?:como|por|pelo nome comum de) |com o nome comum de )(.+?),?)?";
        const name = (a, b) => (b ? `${a}, also known as ${b},` : a);
        const family = (value) => FAMILY_PT[value.replace(/^dos /, "").toLowerCase()] || value.replace(/^dos /, "");
        const rx = (body) => new RegExp(`^${head} ${body}$`);
        if ((m = key.match(rx("é uma espécie de insetos lepidópteros, mais especificamente de (traças|borboletas)(?: conhecidas? por .+?)?,? pertenc(?:ente|endo) à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of lepidopteran insect, more specifically of ${m[3] === "traças" ? "moths" : "butterflies"}, belonging to the family ${family(m[4])}.`;
        }
        if ((m = key.match(rx("é uma espécie de insetos coleópteros(?: polífagos)? pertencente à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of beetle (coleopteran insect) belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(rx("é uma espécie de insetos himenópteros, mais especificamente de (vespas-oleiras|vespas verdadeiras|vespas|formigas|abelhas),? pertenc(?:ente|entes) à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of hymenopteran insect, more specifically of ${HYMENOPTERA[m[3]]}, belonging to the family ${family(m[4])}.`;
        }
        if ((m = key.match(rx("é uma espécie de artrópode pertencente à família (.+)\\.")))) {
            return `${name(m[1], m[2])} is a species of arthropod belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(/^(.+?) é um gênero de mariposa pertencente à família (.+)\.$/))) {
            return `${m[1]} is a genus of moths belonging to the family ${family(m[2])}.`;
        }
        if ((m = key.match(/^(.+?) é uma espécie de inseto do gênero (.+?), pertencente à família (.+)\.$/))) {
            return `${m[1]} is a species of insect of the genus ${m[2]}, belonging to the family ${family(m[3])}.`;
        }
        if ((m = key.match(/^(.+?) é uma espécie de libelinha da família (.+)\.$/))) {
            return `${m[1]} is a species of damselfly or dragonfly of the family ${family(m[2])}.`;
        }
        if ((m = key.match(/^A autoridade científica da espécie é (.+?), tendo sido descrita no ano de (\d+)\.$/))) {
            return `The scientific authority of the species is ${m[1]}, who described it in ${m[2]}.`;
        }
        return "";
    }

    function translateComposite(key) {
        const direct = lookupDisplay(key);
        if (direct) return direct;
        let match;
        if (key.endsWith(" ↗") || key.endsWith(" →")) {
            const rest = translateComposite(key.slice(0, -2));
            if (rest) return `${rest} ${key.slice(-1)}`;
        }
        if ((match = key.match(/^Fonte (\d+)$/))) return `Source ${match[1]}`;
        if ((match = key.match(/^IPMA — Boletim climatológico anual de (\d{4})$/))) return `IPMA — Annual climatological bulletin ${match[1]}`;
        if ((match = key.match(/^Localização: (.+)$/))) {
            return `Location: ${translateComposite(match[1]) || match[1]}`;
        }
        if ((match = key.match(/^cerca de (\d+) km(.*)$/))) {
            const rest = match[2] ? translateComposite(match[2]) || match[2] : "";
            return `about ${match[1]} km${rest}`;
        }
        /* Fichas de insetos: frases-modelo da Wikipédia ("X é uma espécie de … pertencente à família Y"). */
        const taxon = translateTaxonSentence(key);
        if (taxon) return taxon;
        /* Fichas de pragas: frases-modelo com nomes e listas já traduzidos. */
        if ((match = key.match(/^(.+) afeta sobretudo (.+)\. A gestão recomendada combina prevenção, observação regular, tolerância a dano ligeiro e intervenção seletiva apenas quando o crescimento da praga ou doença ameaça a cultura\.$/))) {
            const plants = match[2].split(", ").map((item) => lookupDisplay(item) || item).join(", ");
            return `${lookupDisplay(match[1]) || match[1]} mainly affects ${plants}. The recommended management combines prevention, regular observation, tolerance of slight damage and selective intervention only when the growth of the pest or disease threatens the crop.`;
        }
        if ((match = key.match(/^Conservar ou, quando permitido e tecnicamente adequado, recorrer a: (.+)\.$/))) {
            const items = match[1].split("; ").map((item) => lookupDisplay(item) || item).join("; ");
            return `Conserve or, where permitted and technically appropriate, use: ${items}.`;
        }
        if ((match = key.match(/^(Flora|Fauna) invasora \((.+)\)$/))) {
            return `Invasive ${match[1] === "Flora" ? "flora" : "fauna"} (${match[2]})`;
        }
        if ((match = key.match(/^(\d+) participações$/))) return `${match[1]} ${match[1] === "1" ? "submission" : "submissions"}`;
        if ((match = key.match(/^registos com (.+) disponível$/))) {
            return `records with ${lookupDisplay(match[1]) || match[1]} available`;
        }
        /* Vários campos juntos em frases consecutivas. */
        const sentences = key.split(/(?<=\.)\s+(?=[A-ZÀ-Ý])/);
        if (sentences.length > 1) {
            /* Procura sempre o maior grupo de frases que já exista no dicionário
               (um campo pode ter várias frases). */
            const translated = [];
            let index = 0;
            while (index < sentences.length) {
                let end = sentences.length;
                let found = "";
                for (; end > index; end--) {
                    found = lookupDisplay(sentences.slice(index, end).join(" "));
                    if (found) break;
                }
                if (found) {
                    translated.push(found);
                    index = end;
                } else {
                    translated.push(translateComposite(sentences[index]) || sentences[index]);
                    index += 1;
                }
            }
            if (translated.some((part, position) => part !== sentences[position])) return translated.join(" ");
        }
        /* "Rótulo: valor" — traduz o rótulo e o valor conhecidos, mantém o resto. */
        if ((match = key.match(/^([^:·.]{1,30}): (.+)$/))) {
            const label = lookupDisplay(match[1]);
            const rest = translateComposite(match[2]);
            if (label || rest) return `${label || match[1]}: ${rest || match[2]}`;
        }
        if (key.startsWith("· ")) {
            const rest = translateComposite(key.slice(2));
            return rest ? `· ${rest}` : "";
        }
        if (key.includes(" · ")) {
            const parts = key.split(" · ");
            const translated = parts.map((part) => translateComposite(part) || part);
            return translated.some((part, index) => part !== parts[index]) ? translated.join(" · ") : "";
        }
        if (key.includes(" — ")) {
            const parts = key.split(" — ");
            const translated = parts.map((part) => translateComposite(part) || part);
            if (translated.some((part, index) => part !== parts[index])) return translated.join(" — ");
        }
        return "";
    }

    function translateTextNode(node) {
        if (!dictionary || !node || node.nodeType !== Node.TEXT_NODE) return;
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, code, pre, [data-no-translate]")) return;
        const raw = node.nodeValue || "";
        const key = normalise(raw);
        const translated = key && translateComposite(key);
        if (!translated) return;
        const leading = raw.match(/^\s*/)?.[0] || "";
        const trailing = raw.match(/\s*$/)?.[0] || "";
        node.nodeValue = leading + translated + trailing;
    }

    function translateElement(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(translateTextNode);
        root.querySelectorAll?.("[placeholder], [title], [aria-label]").forEach((element) => {
            ["placeholder", "title", "aria-label"].forEach((attribute) => {
                if (element.hasAttribute(attribute)) {
                    element.setAttribute(attribute, translateString(element.getAttribute(attribute)));
                }
            });
        });
    }

    async function start() {
        await loadDictionary();
        document.documentElement.lang = lang;
        const translateTitle = () => {
            const translated = translateComposite(normalise(document.title)) || translateString(document.title);
            if (translated && translated !== document.title) document.title = translated;
        };
        translateTitle();
        /* Páginas de detalhe definem o título depois de carregar os dados. */
        const titleElement = document.querySelector("title");
        if (titleElement) new MutationObserver(translateTitle).observe(titleElement, { childList: true });
        applyStructuredTranslations(document);
        translateElement(document.body);
        preserveLanguageInLinks(document);
        syncLanguageSelector(document);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
                    else if (node.nodeType === Node.ELEMENT_NODE) {
                        syncLanguageSelector(node);
                        applyStructuredTranslations(node);
                        translateElement(node);
                        preserveLanguageInLinks(node);
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();

    document.addEventListener("biocultura:language-change", () => window.location.reload());
})();
