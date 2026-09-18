
            const esc = (value) =>
                String(value ?? "").replace(/[&<>'"]/g, (char) =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        "'": "&#39;",
                        '"': "&quot;",
                    })[char]);
            const valid = (value) =>
                value !== undefined && value !== null && value !== "" && value !== "-" &&
                !(Array.isArray(value) && (!value.length || value.every((item) => item === "-")));
            const values = (value) =>
                Array.isArray(value) ? value.filter(valid) : valid(value) ? [value] : [];
            function textPanel(title, value) {
                return valid(value)
                    ? `<article class="detail-panel"><h3>${esc(title)}</h3><p>${
                        esc(value)
                    }</p></article>`
                    : "";
            }
            function listPanel(title, value) {
                const list = values(value);
                return list.length
                    ? `<article class="detail-panel"><h3>${esc(title)}</h3><ul>${
                        list.map((item) => `<li>${esc(item)}</li>`).join("")
                    }</ul></article>`
                    : "";
            }
            function section(label, title, note, content) {
                return content
                    ? `<div class="detail-section"><div class="section-head"><span>${
                        esc(label)
                    }</span><div><h2>${esc(title)}</h2><p>${
                        esc(note)
                    }</p></div></div><div class="detail-grid">${content}</div></div>`
                    : "";
            }
            const normalize = (value) =>
                String(value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
                    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
            const CROP_ALIASES = {
                batateira: "batata", cerejeira: "cereja", damasqueiro: "damasco",
                figueira: "figo", laranjeira: "citrinos", limoeiro: "limao",
                macieira: "maca", marmeleiro: "marmelo", nogueira: "noz",
                pereira: "pera", pessegueiro: "pessego-da-cova-da-beira",
                pessego: "pessego-da-cova-da-beira", pimenteiro: "pimento",
                tangerineira: "tangerina", tomateiro: "tomate", uva: "uvas",
                "uva de mesa": "uvas", videira: "uvas", vinha: "uvas",
                couves: "couve", faveira: "fava", nabicas: "nabica",
            };
            function cropMatchesPest(id, nome, praga) {
                const targets = new Set([normalize(id), normalize(nome)]);
                return (praga.plantas_afetadas || []).some((termo) => {
                    const t = normalize(termo);
                    return targets.has(t) || CROP_ALIASES[t] === id;
                });
            }
            const CONNECTORS = new Set(["da", "do", "de", "das", "dos", "e", "ou"]);
            function pestRoot(nomeComum) {
                const root = [];
                for (const part of String(nomeComum).split("-")) {
                    if (CONNECTORS.has(part.toLowerCase())) break;
                    root.push(part);
                }
                return root.join(" ");
            }
            // Termos coloquiais que não coincidem com o nome próprio da praga (ex.: "afídeos" é
            // o nome da família, "pulgões" é o único registo correspondente em pragas.json).
            const PEST_SYNONYMS = { "afídeo": "pulgoes" };
            function buildPestIndex(pragas) {
                // Chave = raiz sem acentos (para agrupar e desambiguar); mantém sempre a grafia
                // original, com acentos, para construir a expressão regular usada no texto real.
                const byKey = new Map();
                const addVariant = (original, pest) => {
                    const key = normalize(original);
                    if (!key) return;
                    if (!byKey.has(key)) byKey.set(key, { original, list: [] });
                    byKey.get(key).list.push(pest);
                };
                for (const p of pragas) {
                    const root = pestRoot(p.nome_comum);
                    addVariant(root, p);
                    // O nome completo ("Hérnia das crucíferas") é sempre inequívoco por construção;
                    // é preferido quando aparece por extenso no texto, em vez de só a raiz truncada.
                    const full = String(p.nome_comum).replace(/-/g, " ");
                    if (normalize(full) !== normalize(root)) addVariant(full, p);
                }
                const byId = new Map(pragas.map((p) => [p.id, p]));
                for (const [termo, pid] of Object.entries(PEST_SYNONYMS)) {
                    const pest = byId.get(pid);
                    const key = normalize(termo);
                    if (pest && !byKey.has(key)) byKey.set(key, { original: termo, list: [pest] });
                }
                // Uma raiz de uma só palavra é demasiado genérica para ligar sozinha quando a
                // mesma "família" (primeira palavra) também identifica uma praga diferente (ex.:
                // "ácaro" quando também existe "ácaro rajado", de "Ácaro-rajado"); frases de duas
                // ou mais palavras são suficientemente específicas e ficam sempre elegíveis.
                const familyPestIds = new Map();
                for (const [key, entry] of byKey) {
                    const family = key.split(" ")[0].replace(/s$/, "");
                    if (!familyPestIds.has(family)) familyPestIds.set(family, new Set());
                    for (const p of entry.list) familyPestIds.get(family).add(p.id);
                }
                for (const [key, entry] of byKey) {
                    if (key.includes(" ")) continue;
                    const family = key.split(" ")[0].replace(/s$/, "");
                    const ownIds = new Set(entry.list.map((p) => p.id));
                    entry.genericFamily = familyPestIds.get(family).size > ownIds.size;
                }
                return byKey;
            }
            const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            // Wikipedia-style: uma palavra só vira link quando (1) aparece literalmente no texto
            // e (2) pragas.json confirma que essa praga específica afeta esta cultura específica.
            // Nunca liga a partir de uma correspondência ambígua ou não confirmada pelos dados.
            function linkifyPestsHtml(html, pestIndex, cropId, cropNome) {
                const candidates = [];
                for (const { original, list, genericFamily } of pestIndex.values()) {
                    if (!original || genericFamily) continue;
                    const matches = list.filter((p) => cropMatchesPest(cropId, cropNome, p));
                    if (matches.length === 1) candidates.push({ original, pest: matches[0] });
                }
                candidates.sort((a, b) => b.original.length - a.original.length);
                const linked = new Set();
                for (const { original, pest } of candidates) {
                    // Uma praga só recebe um link por texto (evita ligar tanto a raiz como o nome
                    // completo da mesma praga quando ambos aparecem, ex.: "hérnia" e "hérnia-das-crucíferas").
                    if (linked.has(pest.id)) continue;
                    const pattern = escapeRegExp(original).replace(/ /g, "[ -]");
                    const re = new RegExp(`(${pattern}s?)(?![^<]*>)`, "i");
                    if (re.test(html)) {
                        html = html.replace(re, (m) =>
                            `<a href="/ecossistemas/especie-detalhe.html?id=${
                                encodeURIComponent(pest.id)
                            }">${m}</a>`);
                        linked.add(pest.id);
                    }
                }
                return html;
            }
            function linkifyPests(text, pestIndex, cropId, cropNome) {
                return valid(text) ? linkifyPestsHtml(esc(text), pestIndex, cropId, cropNome) : "";
            }
            // Só liga a uma técnica quando o próprio texto da ficha a nomeia; termos
            // genéricos ("solo", "água") não geram correspondência para evitar ligações forçadas.
            const TECHNIQUE_KEYWORDS = [
                { match: /gota[\s-]a[\s-]gota/i, id: "rega-gota-a-gota" },
                { match: /rega profunda/i, id: "rega-profunda" },
                { match: /\bolla\b/i, id: "olla" },
                { match: /água da chuva/i, id: "captacao-chuva" },
                { match: /solo coberto|cobertura morta/i, id: "mulching-organico" },
                { match: /composto (bem amadurecido|maduro)/i, id: "composto-superficie" },
                { match: /rotaç[a-zà-ÿ]*/i, id: "rotacao-culturas" },
                { match: /consociaç[a-zà-ÿ]*/i, id: "consociacao" },
                { match: /adubação verde/i, id: "adubo-verde" },
                { match: /rede anti-?insetos?/i, id: "rede-anti-inseto" },
                { match: /remoção manual/i, id: "remocao-manual" },
            ];
            function linkifyTechniquesHtml(html) {
                for (const { match, id } of TECHNIQUE_KEYWORDS) {
                    if (match.test(html)) {
                        html = html.replace(match, (m) =>
                            `<a href="/services/servicos.html#tecnica-${encodeURIComponent(id)}">${m}</a>`);
                    }
                }
                return html;
            }
            function linkifyTechniques(text) {
                return valid(text) ? linkifyTechniquesHtml(esc(text)) : "";
            }
            function linkifyPestsAndTechniques(text, pestIndex, cropId, cropNome) {
                return valid(text)
                    ? linkifyTechniquesHtml(linkifyPestsHtml(esc(text), pestIndex, cropId, cropNome))
                    : "";
            }
            function textPanelHtml(title, value, html) {
                return valid(value)
                    ? `<article class="detail-panel"><h3>${esc(title)}</h3><p>${html}</p></article>`
                    : "";
            }
            async function carregar() {
                const id = new URLSearchParams(window.location.search).get("id");
                if (!id) {
                    window.location.href = "calendario.html";
                    return;
                }

                try {
                    const [master, pragas] = await Promise.all([
                        fetch("/data/horticolas_master.json?v=" + Date.now()).then((r) => r.json()),
                        fetch("/data/pragas.json").then((r) => r.json()).catch(() => []),
                    ]);
                    const pestIndex = buildPestIndex(pragas);
                    const item = master[id];

                    if (!item) {
                        document.getElementById("render-horta").innerHTML =
                            "<p>Produto não encontrado.</p>";
                        return;
                    }

                    const image = valid(item.imagem)
                        ? `<img src="${esc(item.imagem)}" alt="${
                            esc(item.nome)
                        }" onerror="this.remove()">`
                        : "";
                    const facts = [
                        ["Categoria", item.categoria || item.grupo],
                        ["Ciclo", item.ciclo],
                        ["pH do solo", item.ph_solo],
                        ["Exposição", item.exposicao_solar],
                    ].filter(([, value]) => valid(value));
                    const calendar = textPanel("Sementeira", item.sementeira) +
                        textPanel("Plantação ou transplante", item.plantacao_ou_transplante) +
                        textPanel("Colheita", item.colheita) + textPanel("Propagação", item.propagacao);
                    const place = textPanel("Origem", item.origem) +
                        textPanel("Solo ideal", item.solo_ideal) +
                        textPanel("pH", item.ph_solo) + textPanel("Clima", item.clima) +
                        textPanel("Exposição solar", item.exposicao_solar);
                    const care = textPanelHtml("Irrigação", item.irrigacao, linkifyTechniques(item.irrigacao)) +
                        textPanelHtml("Método de rega", item.metodo_rega_recomendado,
                            linkifyTechniques(item.metodo_rega_recomendado)) +
                        textPanelHtml("Manutenção", item.manutencao, linkifyTechniques(item.manutencao)) +
                        textPanelHtml("Fertilização orgânica", item.fertilizacao_organica,
                            linkifyTechniques(item.fertilizacao_organica));
                    const ecology = listPanel("Consociações favoráveis", item.consociacoes_favoraveis) +
                        listPanel("Evitar consociar", item.evitar_consociar) +
                        textPanelHtml("Rotação", item.rotacao, linkifyTechniques(item.rotacao)) +
                        listPanel("Culturas semelhantes", item.culturas_semelhantes);
                    const protection = textPanelHtml("Problemas comuns", item.problemas_comuns,
                            linkifyPests(item.problemas_comuns, pestIndex, id, item.nome)) +
                        textPanelHtml("Prevenção sem pesticidas", item.prevencao_sem_pesticidas,
                            linkifyPestsAndTechniques(item.prevencao_sem_pesticidas, pestIndex, id, item.nome)) +
                        textPanel("Notas para Portugal", item.notas_portugal);
                    const related = values(item.culturas_semelhantes).map((name) => {
                        const found = Object.entries(master).find(([, value]) =>
                            String(value.nome).toLocaleLowerCase("pt") ===
                                String(name).toLocaleLowerCase("pt")
                        );
                        return found
                            ? `<a href="?id=${encodeURIComponent(found[0])}">${esc(found[1].nome)}</a>`
                            : "";
                    }).filter(Boolean).join("");
                    document.getElementById("render-horta").innerHTML = `
                    <div class="hero-split">
                        <div class="hero-text">
                            <a href="calendario.html" class="btn-voltar-base" style="margin:0 0 2em" onclick="if(window.history.length>1){event.preventDefault();history.back();}">← VOLTAR AO CALENDÁRIO</a>
                            <span class="category-label">Cultivo biológico</span>
                            <h1>${esc(item.nome)}</h1>
                            <h2>${esc(item.nome_cientifico || "")}</h2>
                            ${
                        valid(item.descricao)
                            ? `<p style="font-size:1.05em;line-height:1.7;color:#718078">${
                                esc(item.descricao)
                            }</p>`
                            : ""
                    }
                            
                            <div class="data-grid">
                                ${
                        facts.map(([title, value]) =>
                            `<div class="data-item"><b>${esc(title)}</b><p>${esc(value)}</p></div>`
                        ).join("")
                    }
                            </div>
                        </div>
                        <div class="hero-visual">
                            <div class="hero-globe" data-initial="${
                        esc(String(item.nome || "?").charAt(0))
                    }">
                                ${image}
                            </div>
                        </div>
                    </div>
                    ${
                        section(
                            "Lugar",
                            "Origem, solo e clima",
                            "Condições de referência; adapte sempre à variedade, exposição e microclima.",
                            place,
                        )
                    }
                    ${
                        section(
                            "Calendário",
                            "Do início à colheita",
                            "As épocas são orientativas e devem acompanhar a temperatura do solo e o risco de geada.",
                            calendar,
                        )
                    }
                    ${
                        section(
                            "Cuidado",
                            "Água, nutrição e manutenção",
                            "Regue segundo a humidade real do solo e favoreça matéria orgânica bem amadurecida.",
                            care,
                        )
                    }
                    ${
                        section(
                            "Ecologia",
                            "Consociações e rotação",
                            "Diversidade e rotação ajudam a reduzir desequilíbrios sem recorrer a pesticidas.",
                            ecology,
                        )
                    }
                    ${
                        section(
                            "Vigilância",
                            "Problemas e prevenção",
                            "Confirme sempre a causa dos sintomas antes de intervir.",
                            protection,
                        )
                    }
                    ${
                        related
                            ? `<div class="detail-section"><div class="section-head"><span>Explorar</span><div><h2>Culturas semelhantes</h2><p>Compare necessidades e épocas antes de escolher alternativas.</p></div></div><div class="related">${related}</div></div>`
                            : ""
                    }
                    ${
                        valid(item.url_fonte_original)
                            ? `<span class="source-footer">FONTE ORIGINAL: <a href="${
                                esc(item.url_fonte_original)
                            }" target="_blank" rel="noopener noreferrer">${
                                esc(item.fonte_original || "Consultar")
                            }</a></span>`
                            : ""
                    }
                `;
                    document.title = item.nome + " - bioCultura";
                } catch (e) {
                    console.error("Erro ao carregar detalhe:", e);
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                carregar();
            });
        