const BioCultureLanguageStore = (() => {
    const key = "selected_lang";
    const valid = new Set(["pt", "en"]);

    function cookieValue() {
        const match = document.cookie.match(/(?:^|;\s*)bioculture_lang_v2=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : "";
    }

    function read() {
        const parameter = new URLSearchParams(window.location.search).get("lang");
        if (valid.has(parameter)) {
            write(parameter);
            return parameter;
        }
        let local = "";
        try { local = window.localStorage.getItem(key) || ""; } catch (_) {}
        const cookie = cookieValue();
        const value = valid.has(cookie) ? cookie : valid.has(local) ? local : "pt";
        write(value);
        return value;
    }

    function write(value) {
        const lang = valid.has(value) ? value : "pt";
        try { window.localStorage.setItem(key, lang); } catch (_) {}
        const domain = /(^|\.)bioculture\.net$/i.test(location.hostname)
            ? "; Domain=.bioculture.net"
            : "";
        document.cookie = `bioculture_lang_v2=${encodeURIComponent(lang)}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${location.protocol === "https:" ? "; Secure" : ""}`;
        document.documentElement.lang = lang;
        return lang;
    }

    return Object.freeze({ read, write });
})();

window.BioCultureLanguageStore = BioCultureLanguageStore;

let regionsPromise;

const state = { lang: "pt" };

const clean = (s) =>
    String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const get = (id) => document.getElementById(id);

async function regions() {
    return (
        regionsPromise ||
        (regionsPromise = fetch("/data/bioregioes.json").then((r) => {
            if (!r.ok) throw Error("bioregioes");
            return r.json();
        }))
    );
}

function value(obj, path) {
    return path.split(".").reduce((o, k) => o && o[k], obj);
}

async function applyLanguage(lang) {
    const requested = lang || BioCultureLanguageStore.read();
    state.lang = requested === "en" ? "en" : "pt";

    if (requested !== state.lang) {
        BioCultureLanguageStore.write(state.lang);
    }

    try {
        const r = await fetch("/assets/lang/" + state.lang + ".json?v=7", { cache: "no-cache" });
        if (!r.ok) throw Error("lang");

        const t = await r.json();

        document.querySelectorAll("[data-i18n]").forEach((node) => {
            const v = value(t, node.dataset.i18n);
            if (v) node.textContent = v;
        });

        document.querySelectorAll("[data-i18n-html]").forEach((node) => {
            const v = value(t, node.dataset.i18nHtml);
            if (v) node.innerHTML = v;
        });

        document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
            const v = value(t, node.dataset.i18nPlaceholder);
            if (v) node.placeholder = v;
        });

        document.querySelectorAll("[data-i18n-title]").forEach((node) => {
            const v = value(t, node.dataset.i18nTitle);
            if (v) {
                node.title = v;
                node.setAttribute("aria-label", v);
            }
        });

        const select = get("lang-selector");
        if (select) select.value = state.lang;
    } catch (e) {
        console.warn("Idioma indisponível", e);
    }
}

function setLanguage(lang) {
    const selected = lang === "en" ? "en" : "pt";
    BioCultureLanguageStore.write(selected);
    const target = new URL(window.location.href);
    if (selected === "en") target.searchParams.set("lang", "en");
    else target.searchParams.delete("lang");
    window.location.assign(target.href);
}

function bindLanguageSelector() {
    const select = get("lang-selector");
    if (!select || select.dataset.biocultureLanguageBound === "true") return;
    select.dataset.biocultureLanguageBound = "true";
    select.value = BioCultureLanguageStore.read();
}

function status(text) {
    const node = get("bio-location-status");
    if (node) node.textContent = text || "";
}

function choose(item) {
    localStorage.setItem("biocultura_region", String(item.id));

    const input = get("loc-search-input");
    if (input) input.value = item.titulo;

    const dropdown = get("loc-dropdown");
    if (dropdown) dropdown.style.display = "none";

    document.dispatchEvent(
        new CustomEvent("biocultura:region-change", {
            detail: item,
        })
    );

    location.reload();
}

let timer;

function search(query) {
    clearTimeout(timer);

    timer = setTimeout(async () => {
        const dropdown = get("loc-dropdown");
        if (!dropdown) return;

        const q = clean(query);
        if (q.length < 2) {
            dropdown.style.display = "none";
            return;
        }

        try {
            const data = await regions();
            const found = data
                .filter((x) =>
                    clean(
                        [x.titulo, x.concelho, x.distrito]
                            .filter(Boolean)
                            .join(" ")
                    ).includes(q)
                )
                .slice(0, 10);

            dropdown.innerHTML = "";

            found.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "bio-res-item";
                button.setAttribute("role", "option");
                button.innerHTML = "<strong></strong><small></small>";

                button.querySelector("strong").textContent = item.titulo;
                button.querySelector("small").textContent = [
                    item.concelho,
                    item.distrito,
                ]
                    .filter(Boolean)
                    .join(" · ");

                button.onclick = () => choose(item);
                dropdown.appendChild(button);
            });

            dropdown.style.display = found.length ? "block" : "none";

            status(
                found.length
                    ? ""
                    : state.lang === "pt"
                      ? "Localidade não encontrada."
                      : "No location found."
            );
        } catch (e) {
            status(
                state.lang === "pt"
                    ? "Não foi possível carregar as localidades."
                    : "Locations could not be loaded."
            );
        }
    }, 180);
}

function coordinates(item) {
    const latitude = Number(item?.latitude ?? item?.lat);
    const longitude = Number(item?.longitude ?? item?.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
}

function distance(a, b) {
    const target = coordinates(b);
    if (!target) return Number.POSITIVE_INFINITY;

    const r = Math.PI / 180;
    const R = 6371;
    const dLat = (target.latitude - Number(a.latitude)) * r;
    const dLon = (target.longitude - Number(a.longitude)) * r;
    const q =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(Number(a.latitude) * r) *
            Math.cos(target.latitude * r) *
            Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

async function locate(button) {
    state.lang = BioCultureLanguageStore.read() === "en" ? "en" : "pt";

    if (!navigator.geolocation || !window.isSecureContext) {
        status(
            state.lang === "pt"
                ? "A localização exige HTTPS ou localhost e autorização do navegador."
                : "Location requires HTTPS or localhost and browser permission."
        );
        return;
    }

    const trigger = button || get("btn-gps-trigger");
    if (trigger) {
        trigger.disabled = true;
        trigger.setAttribute("aria-busy", "true");
    }

    status(
        state.lang === "pt"
            ? "A obter a sua localização…"
            : "Getting your location…"
    );

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const data = (await regions()).filter(coordinates);
                const point = position.coords;
                const nearest = data.reduce(
                    (best, item) =>
                        !best || distance(point, item) < distance(point, best)
                            ? item
                            : best,
                    null
                );

                if (nearest) {
                    status(
                        state.lang === "pt"
                            ? `Localização aproximada: ${nearest.titulo}`
                            : `Approximate location: ${nearest.titulo}`
                    );
                    choose(nearest);
                } else {
                    status(state.lang === "pt" ? "Sem correspondência territorial." : "No territorial match.");
                }
            } catch (e) {
                status(
                    state.lang === "pt"
                        ? "Não foi possível consultar as localidades."
                        : "Locations could not be loaded."
                );
            } finally {
                if (trigger) {
                    trigger.disabled = false;
                    trigger.removeAttribute("aria-busy");
                }
            }
        },
        (error) => {
            const messages = state.lang === "pt"
                ? {
                    1: "Autorize a localização nas definições deste site.",
                    2: "O dispositivo não conseguiu determinar a localização. Pode pesquisar a localidade manualmente.",
                    3: "A localização demorou demasiado. Tente novamente ou pesquise a localidade.",
                }
                : {
                    1: "Allow location access in this site's settings.",
                    2: "The device could not determine your location. You can search manually.",
                    3: "Location timed out. Try again or search manually.",
                };
            status(messages[error.code] || (state.lang === "pt"
                ? "Não foi possível obter a localização."
                : "Location could not be obtained."));
            if (trigger) {
                trigger.disabled = false;
                trigger.removeAttribute("aria-busy");
            }
        },
        {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 300000,
        }
    );
}

function active() {
    const path = location.pathname.replace(/\/$/, "/index.html");

    document.querySelectorAll(".bio-nav-group a").forEach((a) => {
        const match = new URL(a.href, location.origin).pathname === path;
        a.classList.toggle("active", match);

        if (match) {
            const group = a.closest("details");
            if (group) group.open = true;
        }
    });
}

function alignment() {
    if (document.querySelector("link[data-biocultura-alignment]")) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/assets/css/biocultura-alignment.css?v=4";
    link.dataset.bioculturaAlignment = "true";
    document.head.appendChild(link);
}

let interactionsBound = false;
let sidebarObserver = null;
let refreshScheduled = false;

function scheduleRefresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    window.requestAnimationFrame(async () => {
        refreshScheduled = false;
        active();
        await applyLanguage(BioCultureLanguageStore.read());
        bindLanguageSelector();

        let saved = "";
        try { saved = localStorage.getItem("biocultura_region") || ""; } catch (_) {}
        if (!saved) return;
        try {
            const item = (await regions()).find((x) => String(x.id) === String(saved));
            const input = get("loc-search-input");
            if (item && input && !input.value) input.value = item.titulo;
        } catch (_) {}
    });
}

function bindInteractions() {
    if (interactionsBound) return;
    interactionsBound = true;

    document.addEventListener("click", (event) => {
        const trigger = event.target.closest?.("#btn-gps-trigger");
        if (trigger) {
            event.preventDefault();
            event.stopImmediatePropagation();
            locate(trigger);
            return;
        }

        const dropdown = get("loc-dropdown");
        if (dropdown && !event.target.closest?.(".bio-location")) {
            dropdown.style.display = "none";
        }
    }, true);

    document.addEventListener("input", (event) => {
        if (event.target?.id !== "loc-search-input") return;
        event.stopImmediatePropagation();
        search(event.target.value);
    }, true);
}

function observeSidebar() {
    if (sidebarObserver || !document.body) return;
    sidebarObserver = new MutationObserver((mutations) => {
        if (mutations.some((mutation) =>
            Array.from(mutation.addedNodes).some((node) =>
                node.nodeType === Node.ELEMENT_NODE &&
                (node.matches?.(".bio-shell") || node.querySelector?.(".bio-shell"))
            )
        )) scheduleRefresh();
    });
    sidebarObserver.observe(document.body, { childList: true, subtree: true });
}

async function init() {
    window.BioCultureShell = {
        init,
        setLanguage,
        search,
        locate,
        choose,
    };

    alignment();
    bindInteractions();
    observeSidebar();
    scheduleRefresh();
}

window.BioCultureShell = {
    init,
    setLanguage,
    search,
    locate,
    choose,
};

export { init, setLanguage, search, locate, choose };
