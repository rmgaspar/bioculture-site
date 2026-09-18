
            const esc = (v) =>
                    String(v ?? "").replace(
                        /[&<>'"]/g,
                        (c) => ({
                            "&": "&amp;",
                            "<": "&lt;",
                            ">": "&gt;",
                            "'": "&#39;",
                            '"': "&quot;",
                        }[c]),
                    ),
                valid = (v) =>
                    v !== undefined && v !== null && v !== "" && v !== "-" &&
                    !(Array.isArray(v) && (!v.length || v.every((x) => x === "-"))),
                arr = (v) => Array.isArray(v) ? v.filter(valid) : valid(v) ? [v] : [];
            function panel(title, content) {
                return valid(content)
                    ? `<article class="panel"><h3>${title}</h3>${content}</article>`
                    : "";
            }
            function textPanel(title, text) {
                return valid(text) ? panel(title, `<p>${esc(text)}</p>`) : "";
            }
            function listPanel(title, list) {
                const a = arr(list);
                return a.length
                    ? panel(
                        title,
                        `<ul class="list">${
                            a.map((x) =>
                                `<li>${
                                    esc(typeof x === "string" ? x : (x.nome || x.nome_cientifico))
                                }</li>`
                            ).join("")
                        }</ul>`,
                    )
                    : "";
            }
            const english = () => window.BioCultureI18n?.isEnglish ??
                (new URLSearchParams(location.search).get("lang") === "en");
            const tr = (pt, en) => english() ? en : pt;
            const localized = (value) => value?.[english() ? "en" : "pt"] || value?.pt || "";
            function sourcePanel(items) {
                const links = arr(items).map((x) => typeof x === "string" ? { url: x } : x)
                    .filter((x) => x && /^https?:\/\//i.test(x.url || ""));
                const unique = [...new Map(links.map((x) => [x.url, x])).values()];
                return unique.length ? panel(tr("Fontes e referências", "Sources and references"),
                    `<ul class="list">${unique.map((x) => {
                        let name = x.nome;
                        try { name ||= new URL(x.url).hostname.replace(/^www\./, "") + " · " +
                            decodeURIComponent(new URL(x.url).pathname.split("/").filter(Boolean).pop() || "").replace(/[-_]/g, " "); }
                        catch (_) { name ||= tr("Consultar referência", "Read reference"); }
                        return `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗</a></li>`;
                    }).join("")}</ul>`) : "";
            }
            function practicalSections(esp, guidance) {
                const profile = guidance?.perfis?.find((p) => p.alvos.includes(esp.id));
                if (!profile) return "";
                const options = profile.opcoes.map((option) =>
                    textPanel(esc(localized(option.nome)), localized(option.condicao))).join("");
                const hasProduct = profile.opcoes.some((option) => option.solucao_id);
                return `<div class="section-block" id="solucoes"><div class="section-head"><span class="eyebrow">${tr("Na prática", "In practice")}</span><div><h2>${tr("Soluções para este problema", "Solutions for this problem")}</h2><p>${esc(localized(profile.contexto))}</p></div></div>
                    <div class="grid">${panel(tr("Por onde começar", "Where to start"),
                        `<ol class="list">${profile.passos.map((step) => `<li>${esc(localized(step))}</li>`).join("")}</ol>`)}
                        ${textPanel(tr("Como avaliar o resultado", "How to assess results"), localized(profile.avaliacao))}
                        ${options}${sourcePanel(profile.fontes)}</div>
                    ${hasProduct ? `<div class="guidance-note"><p>${tr(
                        "As opções dependem do diagnóstico, da cultura e das condições locais. Para produtos fitofarmacêuticos, confirmar a autorização e a finalidade no SIFITO e seguir o rótulo. A aptidão para agricultura biológica é uma verificação adicional do produto concreto.",
                        "Options depend on diagnosis, crop and local conditions. For plant protection products, check the authorisation and intended use in SIFITO and follow the label. Suitability for organic farming requires a separate check of the specific product.")}</p>${sourcePanel(guidance.verificacao_produtos)}</div>` : ""}
                    <p class="source">${tr("Revisão destas orientações", "Guidance reviewed")}: ${esc(profile.data_revisao)} · ${tr("As fontes técnicas não confirmam autorizações comerciais em Portugal.", "Technical sources do not establish commercial authorisations in Portugal.")}</p></div>`;
            }
            function invasiveSections(esp) {
                if (esp.grupo !== "Flora Invasora") return "";
                return `<div class="section-block" id="prevencao"><div class="section-head"><span class="eyebrow">${tr("Prevenção", "Prevention")}</span><div><h2>${tr("Conter a expansão desde o início", "Contain spread from the start")}</h2><p>${tr("Confirmar a espécie e preparar a intervenção de acordo com o local.", "Confirm the species and plan action for the site.")}</p></div></div><div class="grid">
                    ${textPanel(tr("Deteção precoce", "Early detection"), esp.deteccao_precoce)}
                    ${textPanel(tr("Prevenir a dispersão", "Prevent spread"), esp.prevencao)}
                    ${textPanel(tr("Reprodução e dispersão", "Reproduction and spread"), esp.reproducao_e_dispersao)}
                    ${textPanel(tr("Segurança no local", "Site safety"), esp.seguranca)}</div></div>
                    <div class="section-block" id="intervencao"><div class="section-head"><span class="eyebrow">${tr("Controlo e recuperação", "Control and recovery")}</span><div><h2>${tr("Intervir e acompanhar o terreno", "Act and follow up on the site")}</h2><p>${tr("A remoção inicial deve ter continuidade: resíduos, rebentação e recuperação da vegetação.", "Initial removal needs follow-up: plant waste, regrowth and vegetation recovery.")}</p></div></div><div class="grid">
                    ${textPanel(tr("Método indicado no inventário", "Method recorded in the inventory"), esp.combate)}
                    ${textPanel(tr("Destino dos resíduos", "Plant waste management"), esp.gestao_residuos)}
                    ${textPanel(tr("Monitorização", "Monitoring"), esp.monitorizacao)}
                    ${textPanel(tr("Restaurar o coberto", "Restore vegetation cover"), esp.restauracao)}
                    ${textPanel(tr("Controlo biológico", "Biological control"), esp.controlo_biologico)}
                    ${sourcePanel([esp.fonte, ...arr(esp.fontes_complementares)])}</div></div>`;
            }
            const normalizeText = (value) =>
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
            function cropsForPest(esp, horticolas) {
                if (!horticolas) return [];
                const byNorm = {};
                for (const [cid, c] of Object.entries(horticolas)) {
                    byNorm[normalizeText(cid)] = cid;
                    byNorm[normalizeText(c.nome)] = cid;
                }
                const ids = new Set();
                for (const termo of arr(esp.plantas_afetadas)) {
                    const t = normalizeText(termo);
                    const cid = byNorm[t] || CROP_ALIASES[t];
                    if (cid && horticolas[cid]) ids.add(cid);
                }
                return [...ids].map((cid) => ({ id: cid, nome: horticolas[cid].nome }));
            }
            function affectedCropsPanel(esp, horticolas) {
                const crops = cropsForPest(esp, horticolas);
                return crops.length
                    ? panel(tr("Culturas afetadas", "Affected crops"),
                        `<ul class="list">${crops.map((c) =>
                            `<li><a href="/calendario/horticola-detalhe.html?id=${
                                encodeURIComponent(c.id)
                            }">${esc(c.nome)} →</a></li>`
                        ).join("")}</ul>`)
                    : "";
            }
            function pestSections(esp, horticolas) {
                if (esp.grupo !== "Sanidade Vegetal") return "";
                const diagnosis = esp.diagnostico || {};
                const prevention = esp.prevencao_biologica || {};
                const solution = esp.solucao_biologica || {};
                const techniques = esp.tecnicas || {};
                return `<div class="section-block" id="diagnostico"><div class="section-head"><span class="eyebrow">Diagnóstico</span><div><h2>Reconhecer antes de intervir</h2><p>Sintomas semelhantes podem ter causas diferentes. Confirme o organismo, a extensão do dano e os auxiliares já presentes.</p></div></div><div class="grid">${
                    listPanel("Plantas afetadas", esp.plantas_afetadas)
                }${textPanel("Sinais e sintomas", esp.sintomas || diagnosis.sintomas_principais)}${
                    textPanel("Quando observar", esp.sazonalidade_portugal)
                }${textPanel("Monitorização", diagnosis.monitorizacao)}${
                    textPanel("Confirmar antes de intervir", diagnosis.confirmar_antes_de_intervir)
                }${affectedCropsPanel(esp, horticolas)}</div></div><div class="section-block" id="prevencao"><div class="section-head"><span class="eyebrow">Prevenção biológica</span><div><h2>Reduzir o problema sem destruir os aliados</h2><p>Prioridade à diversidade, ao equilíbrio da cultura e a intervenções seletivas, sem pesticidas de largo espectro.</p></div></div><div class="grid">${
                    textPanel("Estratégia preventiva", prevention.estrategia || esp.prevencao)
                }${textPanel("Como aplicar", prevention.como)}${
                    listPanel("Aliados naturais", solution.agentes || esp.aliados_naturais)
                }${
                    listPanel(
                        "Plantas para auxiliares",
                        solution.plantas_atrativas || esp.plantas_para_auxiliares,
                    )
                }${
                    listPanel("Infraestrutura ecológica", esp.infraestrutura_ecologica)
                }</div></div><div class="section-block" id="intervencao"><div class="section-head"><span class="eyebrow">Intervenção</span><div><h2>Agir apenas quando necessário</h2><p>Comece pela medida menos perturbadora, registe o resultado e reavalie antes de repetir.</p></div></div><div class="grid">${
                    textPanel("Resposta recomendada", esp.combate || solution.metodo)
                }${textPanel("Intervenção seletiva", techniques.intervencao)}${
                    textPanel("Avaliação", techniques.avaliacao)
                }${listPanel("Evitar", esp.evitar)}${
                    textPanel("Segurança para a biodiversidade", esp.seguranca_biodiversidade)
                }${sourcePanel(esp.referencias || esp.fonte)}</div></div>`;
            }
            function fallbackId(x) {
                return String(x?.nome_cientifico || "").toLocaleLowerCase("pt").normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            }
            function similarPanel(items, master) {
                const a = arr(items).filter((x) => typeof x === "object" && valid(x.nome));
                if (!a.length) return "";
                const links = a.map((x) => {
                    const found = Object.entries(master).find(([, v]) =>
                        v.nome_cientifico === x.nome_cientifico || v.nome === x.nome
                    );
                    return found
                        ? `<a href="?id=${encodeURIComponent(found[0])}">${esc(x.nome)} <i>${
                            esc(x.nome_cientifico)
                        }</i></a>`
                        : `<span>${esc(x.nome)} <i>${esc(x.nome_cientifico)}</i></span>`;
                }).join("");
                return `<div class="section-block"><div class="section-head"><span class="eyebrow">Comparar</span><div><h2>Espécies semelhantes</h2><p>A semelhança visual não confirma uma identificação. Observe forma, habitat, época e caracteres distintivos.</p></div></div><div class="similar">${links}</div></div>`;
            }
            function render(esp, master, guidance, horticolas) {
                const isPest = esp.grupo === "Sanidade Vegetal";
                const isInvasive = esp.grupo === "Flora Invasora";
                const tax = arr(esp.taxonomia_completa).join(" › ");
                const conservation = [
                    valid(esp.iucn_global) ? `IUCN: ${esp.iucn_global}` : "",
                    valid(esp.conservacao_portugal) ? `Portugal: ${esp.conservacao_portugal}` : "",
                    valid(esp.protegida_portugal) ? `Proteção: ${esp.protegida_portugal}` : "",
                ].filter(Boolean);
                const image = valid(esp.imagem)
                    ? `<img src="${esc(esp.imagem.replace("/medium.", "/large."))}" alt="${
                        esc(esp.nome)
                    }" onerror="this.style.display='none'">`
                    : "";
                const ecology = textPanel("Origem", esp.origem) +
                    textPanel("Distribuição", esp.distribuicao) +
                    listPanel("Habitats", esp.habitats) +
                    textPanel("Função ecológica", esp.funcao_ecologica) +
                    (tax ? textPanel("Taxonomia", tax) : "");
                document.getElementById("species").innerHTML = `<a class="back" href="${
                    isPest ? "/calendario/calendario.html#vigilancia" : "biodiversidade.html"
                }">← ${
                    isPest ? "Voltar" : "Voltar"
                }</a><div class="hero"><div><span class="eyebrow">${
                    esc(esp.grupo || "Inventário biológico")
                }</span><h1>${esc(esp.nome)}</h1>${
                    valid(esp.nome_cientifico)
                        ? `<h2 class="scientific"><i>${esc(esp.nome_cientifico)}</i></h2>`
                        : ""
                }${
                    valid(esp.sintese)
                        ? `<p class="summary">${esc(esp.sintese)}</p>`
                        : ""
                }<div class="facts"><div class="fact"><small>Estatuto</small><b>${
                    esc(valid(esp.estatuto) ? esp.estatuto : "—")
                }</b></div><div class="fact"><small>IUCN global</small><b>${
                    esc(valid(esp.iucn_global) ? esp.iucn_global : "—")
                }</b></div><div class="fact"><small>Sazonalidade</small><b>${
                    esc(
                        valid(esp.sazonalidade)
                            ? esp.sazonalidade
                            : valid(esp.sazonalidade_portugal)
                            ? esp.sazonalidade_portugal
                            : "—",
                    )
                }</b></div><div class="fact"><small>Invasora</small><b>${
                    esp.invasora === true ? "Sim" : "Não identificada como invasora"
                }</b></div></div></div><div class="hero-image" data-initial="${
                    esc(String(esp.nome || "?").charAt(0))
                }">${image}</div></div>${
                    ecology
                        ? `<div class="section-block"><div class="section-head"><span class="eyebrow">Ecologia</span><div><h2>Onde vive e que papel desempenha</h2><p>São apresentados apenas os campos preenchidos no inventário; informação ausente não é substituída por generalizações.</p></div></div><div class="grid">${ecology}</div></div>`
                        : ""
                }${
                    conservation.length || arr(esp.ameacas).length || arr(esp.protecao_legal).length
                        ? `<div class="section-block"><div class="section-head"><span class="eyebrow">Conservação</span><div><h2>Estado, proteção e ameaças</h2><p>O estado global e a avaliação nacional não são equivalentes. Um traço significa que o inventário ainda não possui esse dado.</p></div></div><div class="grid">${
                            listPanel("Estado disponível", conservation)
                        }${listPanel("Proteção legal", esp.protecao_legal)}${
                            listPanel("Ameaças", esp.ameacas)
                        }</div></div>`
                        : ""
                }${
                    !isPest && !isInvasive && (valid(esp.prevencao) || valid(esp.combate))
                        ? `<div class="section-block"><div class="section-head"><span class="eyebrow">Gestão</span><div><h2>Prevenção e controlo responsável</h2><p>Aplicável sobretudo a invasoras e organismos de sanidade vegetal. Confirmar identificação e regras locais antes de intervir.</p></div></div><div class="grid">${
                            textPanel("Prevenção", esp.prevencao)
                        }${textPanel("Controlo", esp.combate)}</div></div>`
                        : ""
                }${managementNav(esp, guidance)}${pestSections(esp, horticolas)}${invasiveSections(esp)}${practicalSections(esp, guidance)}${similarPanel(esp.especies_semelhantes, master)}${
                    valid(esp.observacao_responsavel)
                        ? `<div class="section-block"><div class="responsible"><h3>Observar sem perturbar</h3><p>${
                            esc(esp.observacao_responsavel)
                        }</p></div>${
                            valid(esp.fonte)
                                ? `<p class="source">Fonte indicada no registo: ${esc(esp.fonte)}</p>`
                                : ""
                        }</div>`
                        : ""
                }`;
                document.title = `${esp.nome} — bioCultura`;
            }
            function managementNav(esp, guidance) {
                const pest = esp.grupo === "Sanidade Vegetal";
                if (!pest && esp.grupo !== "Flora Invasora") return "";
                const items = pest ? [["diagnostico", tr("Diagnóstico", "Diagnosis")]] : [];
                items.push(["prevencao", tr("Prevenção", "Prevention")], ["intervencao", tr("Intervenção", "Intervention")]);
                if (guidance?.perfis?.some((p) => p.alvos.includes(esp.id))) items.push(["solucoes", tr("Soluções práticas", "Practical solutions")]);
                return `<nav class="management-nav" aria-label="${tr("Nesta ficha", "On this page")}">${items.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("")}</nav>`;
            }
            function resolveSpecies(id, master, pests, invasives) {
                const base = master[id];
                // Specialised records override the general inventory, including scientific-name aliases.
                const match = (rows) => rows.find((x) => x.id === id || fallbackId(x) === id) ||
                    (base?.nome_cientifico ? rows.find((x) => x.nome_cientifico === base.nome_cientifico) : null);
                const pest = match(pests);
                if (pest) return { ...base, ...pest, nome: pest.nome_comum || pest.nome,
                    grupo: "Sanidade Vegetal", estatuto: "Praga / Doença", sintese: pest.descricao || pest.sintomas };
                const invasive = match(invasives);
                if (invasive) return { ...base, ...invasive, nome: invasive.nome_comum || invasive.nome,
                    grupo: "Flora Invasora", estatuto: "Invasora", invasora: true,
                    sintese: invasive.descricao || invasive.impacto };
                return base;
            }
            async function load() {
                const id = new URLSearchParams(location.search).get("id");
                if (!id) {
                    document.getElementById("species").innerHTML =
                        '<div class="error">Espécie não indicada.</div>';
                    return;
                }
                try {
                    const [master, pests, invasives, guidance, horticolas] = await Promise.all([
                        ...["especies_master", "pragas", "flora_invasora"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(`HTTP ${r.status}`);
                                return r.json();
                            })),
                        fetch("/data/gestao-solucoes.json").then((r) => {
                            if (!r.ok) throw Error(`HTTP ${r.status}`);
                            return r.json();
                        }).catch(() => null),
                        fetch("/data/horticolas_master.json").then((r) => r.json()).catch(() => null),
                    ]);
                    const esp = resolveSpecies(id, master, pests, invasives);
                    if (!esp) throw Error("not-found");
                    render(esp, master, guidance, horticolas);
                } catch (e) {
                    document.getElementById("species").innerHTML =
                        '<div class="error"><strong>Espécie não encontrada.</strong><br><a href="biodiversidade.html">Voltar</a></div>';
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                load();
            }).catch(() => load());
        