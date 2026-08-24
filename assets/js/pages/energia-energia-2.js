
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
                    ),
                num = (v) => Number(v) || 0,
                validCoord = (x) =>
                    Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lon)) &&
                    Number(x.lat) !== 0;
            function distance(a, b) {
                const R = 6371,
                    r = Math.PI / 180,
                    dLat = (Number(b.lat) - Number(a.lat)) * r,
                    dLon = (Number(b.lon) - Number(a.lon)) * r;
                const q = Math.sin(dLat / 2) ** 2 +
                    Math.cos(Number(a.lat) * r) * Math.cos(Number(b.lat) * r) * Math.sin(dLon / 2) ** 2;
                return R * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q));
            }
            function renderStats(plants) {
                const renewable = plants.filter((x) => x.renovavel === true),
                    capacity = plants.reduce((s, x) => s + num(x.potencia_mw), 0),
                    dispatch = plants.filter((x) => x.despachavel === true).length;
                el("stats").innerHTML = [
                    ["Instalações", plants.length, "registos consolidados"],
                    [
                        "Potência registada",
                        Math.round(capacity).toLocaleString("pt-PT") + " MW",
                        "soma de potência instalada no inventário",
                    ],
                    ["Renováveis", renewable.length, "instalações marcadas como renováveis"],
                    ["Despacháveis", dispatch, "instalações capazes de ajustar produção"],
                ].map((x) =>
                    `<article class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${
                        x[2]
                    }</span></article>`
                ).join("");
                const types = {};
                for (const x of plants) types[x.tipo] = (types[x.tipo] || 0) + 1;
                el("mix").innerHTML = Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
                    `<article class="mix-item"><b>${esc(k)}</b><span>${v} instalações</span></article>`
                ).join("");
            }
            function renderLocal(locations, plants) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                el("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                if (!validCoord(info)) {
                    el("local-copy").textContent = "Este perfil não possui coordenadas utilizáveis.";
                    el("plants").innerHTML = "<p>—</p>";
                    return;
                }
                const near = plants.filter(validCoord).map((x) => ({
                    ...x,
                    distance: distance(info, x),
                })).sort((a, b) => a.distance - b.distance).slice(0, 6);
                el("local-copy").textContent =
                    `As seis instalações mais próximas entre os ${plants.length} registos do inventário.`;
                el("plants").innerHTML =
                    near.map((x) =>
                        `<article class="plant"><small>${esc(x.tipo)}</small><b>${
                            esc(x.nome)
                        }</b><span>${Math.round(x.distance)} km · ${
                            esc(x.potencia || `${x.potencia_mw} MW`)
                        }</span></article>`
                    ).join("") || "<p>—</p>";
            }
            function renderNews(items) {
                const selected = items.filter((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return /energia|renov|solar|eólic|eletric|autoconsumo|eficiên|comunidade energ/i
                        .test(
                            [n.categoria, n.categoria_id, c.categoria, c.titulo, c.resumo].filter(
                                Boolean,
                            ).join(" "),
                        );
                }).slice(0, 6);
                el("news").innerHTML = selected.map((n) => {
                    const c = window.BioCultureI18n?.content(n) || n.pt || n;
                    return `<a class="news-item" href="/observatorio/noticia-detalhe.html?id=${
                        encodeURIComponent(n.id)
                    }"><span>${esc(window.BioCultureI18n?.date(n.data) || n.data)}</span><h3>${esc(c.titulo)}</h3><span>${
                        esc(n.fonte)
                    }</span></a>`;
                }).join("") || '<p class="empty">Sem notícias desta categoria neste momento.</p>';
            }
            async function start() {
                try {
                    const [plants, locations, news] = await Promise.all(
                        ["centrais_full", "bioregioes", "noticias"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(f);
                                return r.json();
                            })
                        ),
                    );
                    renderStats(plants);
                    renderLocal(locations, plants);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados de energia:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                el("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        
           // Função para o Counter (Pessoas)
function changeCounter(id, delta) {
    const el = document.getElementById(id);
    let val = parseInt(el.value) + delta;
    if (val < 1) val = 1;
    el.value = val;
}

// Função para o Card Selecionável (Backup)
function toggleBackup() {
    const card = document.getElementById('card-backup');
    const checkbox = document.getElementById('in-backup');
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        card.classList.add('active');
    } else {
        card.classList.remove('active');
    }
}

    async function processarSolar() {
        const fatura = parseFloat(document.getElementById('in-fatura').value) || 0;
        const pessoas = parseInt(document.getElementById('in-pessoas').value);
        const presenca = parseFloat(document.getElementById('in-presenca').value);
        const backup = document.getElementById('in-backup').checked;

        if (fatura <= 0) {
            alert("Por favor, indique um valor médio de fatura.");
            return;
        }

        // Lógica de conversão: € -> kWh (Média PT ~0.22€/kWh)
        const consumoKwh = fatura / 0.22;
        
        // Dimensionamento simplificado baseado em radiação média Portugal (HSP 4.5)
        // kWp = (Consumo Diário / HSP) * Fator de Perdas * Fator de Presença
        const hsp = 4.5;
        const potenciaKwp = ((consumoKwh / 30) / hsp) * 1.15 * (1 / presenca);
        const numPaineis = Math.ceil((potenciaKwp * 1000) / 450);

        // Injeção nos resultados (Estilo Relatório)
        document.getElementById('res-paineis').innerText = `${numPaineis} Un.`;
        document.getElementById('res-kwp').innerText = potenciaKwp.toFixed(2);
        
        if (backup) {
            document.getElementById('res-label-tipo').innerText = "Sistema de Autonomia Total (Backup)";
            document.getElementById('res-inversor').innerText = "Híbrido";
            document.getElementById('res-inversor-desc').innerText = "Inversor inteligente que gere a rede e as baterias em simultâneo.";
            document.getElementById('node-bateria').style.display = 'block';
            document.getElementById('res-bateria').innerText = `${(consumoKwh / 30 * 0.8).toFixed(1)} kWh`;
        } else {
            document.getElementById('res-label-tipo').innerText = "Sistema de Autoconsumo Simples";
            document.getElementById('res-inversor').innerText = "String";
            document.getElementById('res-inversor-desc').innerText = "Inversor focado na máxima eficiência de produção direta.";
            document.getElementById('node-bateria').style.display = 'none';
        }

        const resArea = document.getElementById('solar-results-area');
        resArea.style.display = 'block';
        resArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }