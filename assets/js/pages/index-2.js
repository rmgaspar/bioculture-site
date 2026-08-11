
            const el = (id) => document.getElementById(id),
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

            function showPulse(species, crops, pests, grapes) {
                const rows = [
                    ["Espécies", count(species), "registos no inventário de biodiversidade"],
                    ["Hortícolas", count(crops), "culturas com orientação prática"],
                    ["Pragas", count(pests), "problemas com soluções biológicas"],
                    ["Castas", count(grapes), "castas ligadas a solo e clima"],
                ];
                el("pulse").innerHTML = rows.map((x) =>
                    `<article class="number"><small>${x[0]}</small><strong>${
                        x[1].toLocaleString("pt-PT")
                    }</strong><span>${x[2]}</span></article>`
                ).join("");
            }

            function showToday(regions, species) {
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
                    ],
                    now = new Date();
                el("month").textContent = months[now.getMonth()];

                const saved = localStorage.getItem("biocultura_region"),
                    region = regions.find((x) => String(x.id) === String(saved));

                if (region) {
                    el("place").firstChild.textContent = `${region.titulo} · `;
                    el("place-copy").textContent =
                        `Um ponto de entrada para relacionar calendário, espécies e pressões com ${
                            region.concelho || region.regiao || "o território selecionado"
                        }.`;
                }

                const entries = Object.entries(species || {});
                if (!entries.length) return;

                const day = Math.floor(now.getTime() / 86400000),
                    [id, x] = entries[Math.abs(day) % entries.length],
                    image = x.imagem && x.imagem !== "-"
                        ? `<img class="species-image" src="${esc(x.imagem)}" alt="${esc(x.nome)}" loading="lazy" onerror="this.style.display='none'">`
                        : "";

                el("encounter").innerHTML = `<div><small>Encontro do dia</small><h3>${esc(x.nome)}</h3><em>${esc(x.nome_cientifico)}</em><p>${
                    esc(x.sintese || x.origem || "Uma espécie do inventário bioCultura.")
                }</p><a href="/ecossistemas/especie-detalhe.html?id=${
                    encodeURIComponent(id)
                }">Conhecer esta espécie →</a></div>${image}`;
            }

            function showNews(items) {
                const rows = [...items].sort((a, b) => (+b.relevancia || 0) - (+a.relevancia || 0))
                    .slice(0, 6);

                el("news").innerHTML = rows.map((n) => {
                    const c = n.pt || n;
                    return `<a href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><small>${esc(n.data)}</small><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    } →</span></a>`;
                }).join("") || '<p class="empty">Sem notícias disponíveis neste momento.</p>';
            }

            function getPortalMarkImage(title) {
                const imageMap = {
                    "Recursos vitais": "/images/recursos.jpg",
                    "Biodiversidade": "/images/biodiversidade-teia-viva.webp",
                    "Portugal em mudança": "/images/pressoes-portugal.webp",
                    "Energia e pressão": "/images/energia_pressao.jpg",
                    "Calendário de regeneração": "/images/calendario_regeneracao.jpg",
                    "Vinha viva": "/images/enologia-terroir-abstrato.webp",
                };
                const src = imageMap[title] || "/images/placeholder.jpg";
                return `<img src="${src}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`;
            }

            const atlasHtmlContent = `
                <a class="portal" href="/recursos/agua.html">
                    <span class="portal-mark">${getPortalMarkImage("Recursos vitais")}</span>
                    <div>
                        <h3>Recursos vitais</h3>
                        <p>Água, ar e solo: como funcionam, o que os pressiona e como os podemos proteger.</p>
                        <span>Abrir recursos vitais →</span>
                    </div>
                </a>

                <a class="portal" href="/ecossistemas/biodiversidade.html">
                    <span class="portal-mark">${getPortalMarkImage("Biodiversidade")}</span>
                    <div>
                        <h3>Biodiversidade</h3>
                        <p>Espécies, habitats, sazonalidade, estatuto, relações ecológicas e vida próxima.</p>
                        <span>Abrir biodiversidade →</span>
                    </div>
                </a>

                <a class="portal" href="/observatorio/observatorio-terra.html">
                    <span class="portal-mark">${getPortalMarkImage("Portugal em mudança")}</span>
                    <div>
                        <h3>Portugal em mudança</h3>
                        <p>Séries nacionais para ler clima, território, produção, mobilidade e transformação social.</p>
                        <span>Abrir observatório nacional →</span>
                    </div>
                </a>

                <a class="portal" href="/energia/energia.html">
                    <span class="portal-mark">${getPortalMarkImage("Energia e pressão")}</span>
                    <div>
                        <h3>Energia e pressão</h3>
                        <p>Uso consciente e impactos territoriais das infraestruturas que sustentam a vida moderna.</p>
                        <span>Abrir energia →</span>
                    </div>
                </a>

                <a class="portal" href="/calendario/calendario.html">
                    <span class="portal-mark">${getPortalMarkImage("Calendário de regeneração")}</span>
                    <div>
                        <h3>Calendário de regeneração</h3>
                        <p>O que observar, semear, plantar e cuidar em cada fase do ano, sem pesticidas.</p>
                        <span>Abrir calendário →</span>
                    </div>
                </a>

                <a class="portal" href="/calendario/enologia.html">
                    <span class="portal-mark">${getPortalMarkImage("Vinha viva")}</span>
                    <div>
                        <h3>Vinha viva</h3>
                        <p>Castas, solo, clima, biodiversidade e práticas biológicas para uma viticultura com identidade.</p>
                        <span>Abrir vinha viva →</span>
                    </div>
                </a>
            `;

            async function start() {
                try {
                    const names = [
                            "especies_master",
                            "horticolas_master",
                            "pragas",
                            "castas",
                            "bioregioes",
                            "noticias",
                        ],
                        data = await Promise.all(names.map((n) =>
                            fetch(`/data/${n}.json`).then((r) => {
                                if (!r.ok) throw Error(n);
                                return r.json();
                            })
                        ));

                    showPulse(data[0], data[1], data[2], data[3]);
                    showToday(data[4], data[0]);
                    showNews(data[5]);
                    el("atlas-container").innerHTML = atlasHtmlContent;
                } catch (e) {
                    console.error("Não foi possível carregar a entrada do observatório:", e);
                    el("pulse").innerHTML = '<p class="empty">—</p>';
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((h) => {
                el("sidebar").innerHTML = h;
                start();
            }).catch(() => start());
        