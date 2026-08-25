
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
        
           function changeCounter(id, delta) {
                const el = document.getElementById(id);
                let val = parseInt(el.value) + delta;
                if (val < 1) val = 1;
                el.value = val;
            }

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
    const presenca = parseFloat(document.getElementById('in-presenca').value);
    const backup = document.getElementById('in-backup').checked;

    if (fatura <= 0) return;

    // 1. Cálculo de Consumo e Potência
    const consumoKwh = fatura / 0.22; // Preço médio kWh em Portugal
    const hsp = 4.5; // Horas de Sol Equivalentes médias
    const potenciaKwp = ((consumoKwh / 30) / hsp) * 1.18 * (1 / presenca);
    
    // 2. Cálculo de Unidades (Baseado em painéis modernos de 550W)
    const wattsPorPainel = 550;
    const numPaineis = Math.ceil((potenciaKwp * 1000) / wattsPorPainel);
    const kwpFinal = (numPaineis * wattsPorPainel) / 1000;

    // 3. Estimativa de Preço (Baseado nos teus exemplos: ~1100€/kWp + Baterias)
    let precoBase = kwpFinal * 1050; // Média dos teus orçamentos (~1050€ por kWp)
    if (backup) precoBase += 2500; // Custo médio de bateria LiFePO4 de 5kWh + Inversor Híbrido

    // 4. Seleção de Hardware (Exemplos reais)
    let inversorModel = backup ? "Huawei SUN2000-KTL-L1 (Híbrido)" : "Growatt MIN 3600 TL-X";
    let meterModel = backup ? "Huawei DDSU666-H (100A)" : "Smart Meter Standard (100A)";

    // Injeção de Dados
    document.getElementById('res-paineis').innerText = `${numPaineis} Unidades`;
    document.getElementById('res-num-unidades').innerText = numPaineis;
    document.getElementById('res-kwp').innerText = kwpFinal.toFixed(2);
    document.getElementById('res-preco').innerText = `${precoBase.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}`;
    document.getElementById('res-inversor-model').innerText = inversorModel;
    document.getElementById('res-meter').innerText = meterModel;

    document.getElementById('res-label-tipo').innerText = backup ? "Autonomia com Backup" : "Autoconsumo Direto";

    if (backup) {
        document.getElementById('node-bateria').style.display = 'block';
        document.getElementById('res-bateria').innerText = "5.12 kWh"; // Média para sistemas residenciais base
    } else {
        document.getElementById('node-bateria').style.display = 'none';
    }

    document.getElementById('solar-results-area').style.display = 'block';
    document.getElementById('solar-results-area').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
