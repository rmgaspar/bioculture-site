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
    const requested = lang || localStorage.getItem("selected_lang") || "pt";
    state.lang = requested === "en" ? "en" : "pt";

    if (requested !== state.lang) {
        localStorage.setItem("selected_lang", state.lang);
    }

    try {
        const r = await fetch("/assets/lang/" + state.lang + ".json");
        if (!r.ok) throw Error("lang");

        const t = await r.json();

        document.querySelectorAll("[data-i18n]").forEach((node) => {
            const v = value(t, node.dataset.i18n);
            if (v) node.textContent = v;
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
    localStorage.setItem("selected_lang", selected);
    applyLanguage(selected);
    document.dispatchEvent(
        new CustomEvent("biocultura:language-change", {
            detail: { lang: selected },
        })
    );
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

function distance(a, b) {
    const r = Math.PI / 180;
    const R = 6371;
    const dLat = (+b.lat - +a.latitude) * r;
    const dLon = (+b.lon - +a.longitude) * r;
    const q =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(+a.latitude * r) *
            Math.cos(+b.lat * r) *
            Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
}

async function locate() {
    if (!navigator.geolocation || !window.isSecureContext) {
        status(
            state.lang === "pt"
                ? "A localização exige uma ligação segura e autorização do navegador."
                : "Location requires a secure connection and browser permission."
        );
        return;
    }

    status(
        state.lang === "pt"
            ? "A obter uma localização atual…"
            : "Getting a current location…"
    );

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                const data = (await regions()).filter((x) => {
                    const lat = Number(x.latitude ?? x.lat);
                    const lon = Number(x.longitude ?? x.lon);
                    return Number.isFinite(lat) && Number.isFinite(lon);
                });

                const point = position.coords;
                const nearest = data.reduce(
                    (a, b) => (!a || distance(point, b) < distance(point, a) ? b : a),
                    null
                );

                if (nearest) {
                    choose(nearest);
                } else {
                    status(state.lang === "pt" ? "Sem correspondência exata." : "No exact match.");
                }
            } catch (e) {
                status(
                    state.lang === "pt"
                        ? "Não foi possível consultar as localidades."
                        : "Locations could not be loaded."
                );
            }
        },
        (error) =>
            status(
                state.lang === "pt"
                    ? error.code === 1
                        ? "Autorize a localização nas definições deste site."
                        : "Não foi possível obter uma localização atual."
                    : "A current location could not be obtained."
            ),
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
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

async function init() {
    window.BioCultureShell = {
        init,
        setLanguage,
        search,
        locate,
        choose,
    };

    active();

    await applyLanguage(localStorage.getItem("selected_lang") || "pt");

    const saved = localStorage.getItem("biocultura_region");
    if (saved) {
        try {
            const item = (await regions()).find(
                (x) => String(x.id) === String(saved)
            );
            const input = get("loc-search-input");
            if (item && input) input.value = item.titulo;
        } catch (e) {}
    }

    document.addEventListener("click", (e) => {
        const drop = get("loc-dropdown");
        if (drop && !e.target.closest(".bio-location")) drop.style.display = "none";
    });
}

window.BioCultureShell = {
    init,
    setLanguage,
    search,
    locate,
    choose,
};

export { init, setLanguage, search, locate, choose };
