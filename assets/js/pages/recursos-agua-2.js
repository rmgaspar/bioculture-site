
            const $id = (id) => document.getElementById(id),
                clean = (v) => v === undefined || v === null || v === "" ? "—" : String(v),
                isEn = () => !!window.BioCultureI18n?.isEnglish;
            function sourceName(item) {
                const s = item?.fonte || item?.fontes;
                if (Array.isArray(s)) {
                    return s.map((x) => x.nome || x.entidade).filter(Boolean).join(" · ") ||
                        "Fonte indicada no conjunto de dados";
                }
                return typeof s === "string"
                    ? s
                    : (s?.nome || s?.entidade || "Fonte indicada no conjunto de dados");
            }
            function findValue(obj, key) {
                if (!obj || typeof obj !== "object") return null;
                if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
                for (const v of Object.values(obj)) {
                    const x = findValue(v, key);
                    if (x !== null) return x;
                }
                return null;
            }
            function metric(title, value, text, source) {
                return `<article class="metric"><h3>${title}</h3><strong>${value}</strong><p>${text}</p><span class="source">${source}</span></article>`;
            }
            function renderMetrics(obs, soil) {
                const desert = obs?.indicadores_territoriais?.suscetibilidade_desertificacao || {};
                const flood = obs?.indicadores_territoriais?.areas_risco_inundacao || {};
                const desertYear = (desert.periodo || "").match(/\d{4}/)?.[0] || "";
                const rain = obs?.series_temporais?.precipitacao_anual_continente || {};
                // Os dois anos mais recentes da série (atualiza-se sozinha quando o IPMA publica o boletim anual).
                const rainYears = Object.keys(rain?.valores || {}).sort().slice(-2);
                const rainMetric = (year) => metric(
                    "Precipitação anual",
                    clean(rain.valores[year]) + " mm",
                    isEn() ? `Mainland, ${year}. Isolated annual value.` : `Continente, ${year}. Valor anual isolado.`,
                    sourceName(rain),
                );
                $id("metrics").innerHTML = [
                    metric(
                        "Desertificação",
                        (isEn() ? clean(desert.valor) : clean(desert.valor).replace(".", ",")) + "%",
                        isEn()
                            ? `Mainland territory with high or very high susceptibility (ISD, ${desertYear}).`
                            : `Território continental com suscetibilidade alta ou muito elevada (ISD, ${desertYear}).`,
                        sourceName(desert),
                    ),
                    metric(
                        "Risco de inundação",
                        clean(flood.valor ?? flood.numero),
                        "Áreas de risco potencial significativo no ciclo 2022–2027.",
                        sourceName(flood),
                    ),
                    ...rainYears.map(rainMetric),
                ].join("");
            }
            /* «O teu solo e a água»: a textura do perfil (a única informação de água que o perfil local permite ler) traduzida
               em retenção, entrada e rega. Valores de água disponível por classe: FAO, Irrigation Water Management: Training Manual No. 1,
               cap. 2 (areia 25–100, franco 100–175, argila 175–250 mm por metro de solo). A passagem do nome da textura às três classes
               é uma aproximação bioCulture. */
            const tr2 = (pt, en) => (isEn() ? en : pt);
            const norm2 = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const CLASSES = {
                a: { nome: ["Arenoso", "Sandy"], min: 25, max: 100 },
                f: { nome: ["Franco", "Loam"], min: 100, max: 175 },
                c: { nome: ["Argiloso", "Clay"], min: 175, max: 250 },
            };
            const LEITURA = {
                a: { ret: ["Baixa", "Low"], inf: ["Rápida", "Fast"], rega: ["Pouca água, muitas vezes", "Little water, often"],
                    desc: ["Solo leve: a água entra depressa e escorre abaixo das raízes em poucas horas. Cobertura do solo e matéria orgânica ajudam a guardá-la.",
                        "Light soil: water enters quickly and drains below the roots within hours. Mulch and organic matter help to hold it."] },
                af: { ret: ["Baixa a média", "Low to medium"], inf: ["Rápida a média", "Fast to medium"], rega: ["Regas curtas e frequentes", "Short, frequent watering"],
                    desc: ["Drena depressa e guarda pouca água: rega pouco de cada vez e cobre o solo para a reter.",
                        "It drains quickly and holds little water: water a little at a time and mulch the soil to keep it."] },
                f: { ret: ["Média", "Medium"], inf: ["Média", "Medium"], rega: ["Regas moderadas", "Moderate watering"],
                    desc: ["Solo equilibrado: guarda água suficiente e drena bem.", "A balanced soil: it holds enough water and drains well."] },
                fc: { ret: ["Média a alta", "Medium to high"], inf: ["Média a lenta", "Medium to slow"], rega: ["Menos vezes, mais fundo", "Less often, deeper"],
                    desc: ["Guarda bem a água, mas a entrada é mais lenta e, depois de chuva forte, pode demorar a drenar. Evita regar sobre solo ainda húmido.",
                        "It holds water well, but it enters more slowly and, after heavy rain, may take a while to drain. Avoid watering soil that is still damp."] },
                c: { ret: ["Alta", "High"], inf: ["Lenta", "Slow"], rega: ["Regas espaçadas e fundas", "Widely spaced, deep watering"],
                    desc: ["Guarda muita água, mas a entrada é lenta e pode levar 2 a 3 dias a drenar: atenção ao encharcamento e à compactação.",
                        "It holds a lot of water, but it enters slowly and may take 2 to 3 days to drain: watch for waterlogging and compaction."] },
            };
            const TEXTURAS_EN = {
                "Franco-arenoso": "Sandy loam", "Franco-argiloso": "Clay loam", "Argilo-calcário": "Calcareous clay", "Franco-calcário": "Calcareous loam",
                "Arenoso": "Sandy", "Franco-argilo-arenoso": "Sandy clay loam", "Argilo-limoso": "Silty clay", "Franco-argilo-limoso": "Silty clay loam",
                "Franco-argilo-calcário": "Calcareous clay loam", "Areno-limoso": "Silty sand", "Franco-areno-argiloso": "Sandy clay loam",
                "Argilo-arenoso": "Sandy clay", "Franco-arenoso-vulcânico": "Volcanic sandy loam", "Argilo-xistoso": "Schistose clay",
                "Arenoso-limoso": "Silty sand", "Franco-areno-limoso": "Silty sandy loam", "Arenoso-vulcânico": "Volcanic sand",
                "Limoso-argiloso": "Silty clay", "Argiloso": "Clay",
            };
            function classesDaTextura(t) {
                const n = norm2(t);
                if (/^franco-arenoso|^franco-areno-limoso/.test(n)) return ["a", "f"];
                if (/^franco-areno-argiloso|^franco-argilo-arenoso|^franco-calcario/.test(n)) return ["f"];
                if (/^franco-argil/.test(n)) return ["f", "c"];
                if (/^argilo-arenoso/.test(n)) return ["f", "c"];
                if (/^(arenoso|areno)/.test(n)) return ["a"];
                if (/^(argil|limoso-argil)/.test(n)) return ["c"];
                return null;
            }
            function renderLocal(locations) {
                const saved = localStorage.getItem("biocultura_region");
                const info = locations.find((x) => String(x.id) === String(saved)) || locations[0];
                if (!info) return;
                const b = info.biomas || {};
                $id("local-name").textContent = [info.titulo, info.concelho].filter(Boolean).join(", ");
                const cls = classesDaTextura(b.textura);
                const texto = isEn() ? (TEXTURAS_EN[b.textura] || clean(b.textura)) : clean(b.textura);
                $id("local-texture").textContent = texto;
                const L = cls ? LEITURA[cls.join("") === "af" ? "af" : cls.join("") === "fc" ? "fc" : cls[0]] : null;
                if (!L) {
                    $id("local-desc").textContent = tr2("Este perfil não tem a textura do solo registada, por isso não há leitura da água.", "This profile has no recorded soil texture, so there is no reading for water.");
                    ["local-ret", "local-inf", "local-rega"].forEach((id) => ($id(id).textContent = "—"));
                    $id("local-chart").innerHTML = "";
                    return;
                }
                const i = isEn() ? 1 : 0;
                $id("local-desc").textContent = L.desc[i];
                $id("local-ret").textContent = L.ret[i];
                $id("local-inf").textContent = L.inf[i];
                $id("local-rega").textContent = L.rega[i];
                const linhas = Object.entries(CLASSES).map(([k, c]) =>
                    `<div class="lc-row${cls.includes(k) ? " ativo" : ""}"><span class="lc-nome">${c.nome[i]}</span><span class="lc-pista"><i style="left:${(c.min / 250) * 100}%;width:${((c.max - c.min) / 250) * 100}%"></i></span><span class="lc-val">${c.min}–${c.max} mm/m</span></div>`
                ).join("");
                $id("local-chart").innerHTML = `<h4>${tr2("Água disponível para as plantas, por metro de solo", "Water available to plants, per metre of soil")}</h4>${linhas}<p class="lc-nota">${
                    tr2("Destacado: a classe mais próxima do teu solo. Valores típicos da FAO; a passagem do nome da textura a estas três classes é uma aproximação bioCulture, e a leitura vale para o solo, não para a água da torneira.",
                        "Highlighted: the class closest to your soil. Typical FAO values; matching the texture name to these three classes is a bioCulture approximation, and the reading applies to the soil, not to tap water.")
                } <a href="https://www.fao.org/4/r4082e/r4082e03.htm" target="_blank" rel="noopener">${tr2("Fonte: FAO, Irrigation Water Management, cap. 2", "Source: FAO, Irrigation Water Management, ch. 2")}</a></p>`;
            }
            function renderPractices(items) {
                const wanted = [
                    "rega-gota-a-gota",
                    "rega-profunda",
                    "captacao-chuva",
                    "olla",
                    "jardim-chuva",
                    "zonas-tampao",
                ];
                const selected = wanted.map((id) => items.find((x) => x.id === id)).filter(Boolean);
                $id("practices").innerHTML = selected.map((x, i) => {
                    const title = x.titulo || x.nome || "Prática";
                    const desc = x.resumo || x.descricao || x.introducao || "";
                    const raw = x.passos || x.como_fazer || x.aplicacao || [];
                    const steps = Array.isArray(raw) ? raw : [];
                    return `<article class="practice"><span class="tag">${
                        String(i + 1).padStart(2, "0")
                    }</span><h3>${title}</h3><p>${desc}</p>${
                        steps.length
                            ? `<details><summary>Ver como aplicar</summary><ol class="steps">${
                                steps.slice(0, 5).map((s) =>
                                    `<li>${
                                        typeof s === "string" ? s : (s.descricao || s.passo || "")
                                    }</li>`
                                ).join("")
                            }</ol></details>`
                            : ""
                    }</article>`;
                }).join("") || '<p class="empty">—</p>';
            }
            function renderNews(items) {
                const words = ["água*", "aguas", "water", "seca*", "drought*", "rio", "river", "aquífer*", "aquifer*", "hídric*", "hydro*", "inunda*", "flood*", "cheia*", "albufeira*", "reservoir*", "salinização", "salinity", "lago", "lake"];
                const selected = window.BioCultureNews.rank(items)
                    .filter((n) => window.BioCultureNews.about(n, words, ["agua"]))
                    .slice(6, 12);
                $id("news").innerHTML = selected.map((n) => window.BioCultureNews.cardHtml(n)).join("") ||
                    '<p class="empty">Sem notícias de água disponíveis neste momento.</p>';
                // O bloco «Atualidade» do fim da página mostra as notícias a seguir às do bloco «em foco» (não as mesmas);
                // sem mais notícias, esconde-se com a ligação que lhe aponta.
                const section = $id("news").closest("section");
                if (section && !selected.length) {
                    section.hidden = true;
                    if (section.id) document.querySelectorAll(`a[href="#${section.id}"]`).forEach((link) => (link.hidden = true));
                }
            }
            async function start() {
                try {
                    const [loc, obs, soil, tips, news] = await Promise.all(
                        ["bioregioes", "observatorio_terra", "solo_stats", "dicas", "noticias"].map(
                            (f) =>
                                f === "bioregioes" ? window.BioCultureRegion.load() : fetch(`/data/${f}.json`).then((r) => {
                                    if (!r.ok) throw Error(f);
                                    return r.json();
                                }),
                        ),
                    );
                    renderMetrics(obs, soil);
                    renderLocal(loc);
                    renderPractices(tips);
                    renderNews(news);
                } catch (e) {
                    console.error("Não foi possível carregar os dados da página:", e);
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                $id("sidebar").innerHTML = html;
                start();
            }).catch(() => start());
        
            function calcularSAAP() {
                const A = parseFloat(document.getElementById('saap-area').value);
                const C = parseFloat(document.getElementById('saap-coeficiente').value);
                const P = parseFloat(document.getElementById('saap-precipitacao').value);

                if (!A || !P) {
                    alert(isEn() ? "Please fill in the area and rainfall." : "Por favor, preencha a área e a precipitação.");
                    return;
                }

                // Cálculo do Potencial de Recolha (Q = A * P * C)
                const Q = A * P * C; 

                // Dimensionamento do Reservatório (Método Prático - 6% do potencial anual para Portugal)
                const V = Q * 0.06;

                // Injeção de resultados
                document.getElementById('res-potencial').innerText = `${Math.round(Q).toLocaleString()} Litros/ano`;
                document.getElementById('res-cisterna').innerText = `${(V / 1000).toFixed(1)} m³`;

                // Lista de Materiais Dinâmica
                const materiais = isEn() ? [
                    "Leaf and debris filter (inlet)",
                    "'First flush' diverter (discards the first 1-2mm)",
                    `Cistern of ${(V / 1000).toFixed(1)}m³ (opaque and sealed)`,
                    "Self-priming pump with pressure switch",
                    "Marked HDPE piping (brown for non-potable use)",
                    "Check valve and sediment filter (25 micron)"
                ] : [
                    "Filtro de folhas e detritos (entrada)",
                    "Dispositivo de 'First Flush' (descarte dos primeiros 1-2mm)",
                    `Cisterna de ${(V / 1000).toFixed(1)}m³ (opaca e vedada)`,
                    "Bomba autoaspirante com pressostato",
                    "Tubagem PEAD sinalizada (cor castanha para uso não potável)",
                    "Válvula de retenção e filtro de sedimentos (25 micron)"
                ];

                const listEl = document.getElementById('res-materiais');
                listEl.innerHTML = materiais.map(m => `<li>${m}</li>`).join('');
                
                document.getElementById('saap-resultado').style.display = 'block';
                document.getElementById('saap-resultado').scrollIntoView({ behavior: 'smooth' });
            }

            /* --- Lógica de Diagnóstico de Biofossa --- */
            function analisarSoloParaFossa(textura) {
                const recomendacao = { tipo: "", alerta: "", cor: "" };
                const t = (textura || "").toLowerCase();

                const en = isEn();
                if (t.includes('arenosa')) {
                    recomendacao.tipo = en ? "Standard Infiltration Trench" : "Vala de Infiltração Standard";
                    recomendacao.alerta = en ? "High permeability. Keep a strict 30m distance from boreholes/wells." : "Elevada permeabilidade. Manter distância rigorosa de 30m de furos/poços.";
                    recomendacao.cor = "#536b57";
                } else if (t.includes('argilosa')) {
                    recomendacao.tipo = en ? "Biofilter or Filter Bed (Wetland)" : "Biofiltro ou Canteiro Filtrante (Wetland)";
                    recomendacao.alerta = en ? "Low infiltration. Soil may saturate; requires a larger evapotranspiration area." : "Baixa infiltração. O solo pode saturar; exige maior área de evapotranspiração.";
                    recomendacao.cor = "#a66f50";
                } else if (t.includes('limosa')) {
                    recomendacao.tipo = en ? "Gravel-Bed Infiltration Trench" : "Vala de Infiltração com Leito de Brita";
                    recomendacao.alerta = en ? "Moderate permeability. Requires careful trench sizing." : "Permeabilidade moderada. Requer dimensionamento cuidadoso da vala.";
                    recomendacao.cor = "#6d8992";
                } else {
                    recomendacao.tipo = en ? "Requires a Percolation Test" : "Requer Teste de Percolação";
                    recomendacao.alerta = en ? "Insufficient soil data. Carry out an on-site absorption test." : "Dados de solo insuficientes. Realize um teste de absorção no local.";
                    recomendacao.cor = "#999";
                }
                return recomendacao;
            }

            function atualizarDicaSaneamento(dadosLocal) {
                const display = document.getElementById('fossa-local-rec');
                if (!display || !dadosLocal) return;

                const rec = analisarSoloParaFossa(dadosLocal.textura);
                
                display.innerHTML = `
                    <div class="rec-box">
                        <div class="node-label">${isEn() ? "Recommendation for" : "Recomendação para"} ${dadosLocal.freguesia || (isEn() ? "the location" : "o local")}</div>
                        <span style="font-family: Georgia, serif; font-size: 1.2rem; display: block; margin: 5px 0;">${rec.tipo}</span>
                        <p style="font-size: 0.8rem; color: var(--muted); margin: 0;">${rec.alerta}</p>
                    </div>
                `;
            }