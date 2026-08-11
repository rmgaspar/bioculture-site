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
            function sourcePanel(items) {
                const links = arr(items).filter((x) => /^https?:\/\//i.test(String(x)));
                return links.length
                    ? panel(
                        "Fontes e referências",
                        `<ul class="list">${
                            links.map((url) =>
                                `<li><a href="${
                                    esc(url)
                                }" target="_blank" rel="noopener noreferrer">Consultar fonte ↗</a></li>`
                            ).join("")
                        }</ul>`,
                    )
                    : "";
            }
            function pestSections(esp) {
                if (esp.grupo !== "Sanidade Vegetal") return "";
                const diagnosis = esp.diagnostico || {};
                const prevention = esp.prevencao_biologica || {};
                const solution = esp.solucao_biologica || {};
                const techniques = esp.tecnicas || {};
                return `<div class="section-block"><div class="section-head"><span class="eyebrow">Diagnóstico</span><div><h2>Reconhecer antes de intervir</h2><p>Sintomas semelhantes podem ter causas diferentes. Confirme o organismo, a extensão do dano e os auxiliares já presentes.</p></div></div><div class="grid">${
                    listPanel("Plantas afetadas", esp.plantas_afetadas)
                }${textPanel("Sinais e sintomas", esp.sintomas || diagnosis.sintomas_principais)}${
                    textPanel("Quando observar", esp.sazonalidade_portugal)
                }${textPanel("Monitorização", diagnosis.monitorizacao)}${
                    textPanel("Confirmar antes de intervir", diagnosis.confirmar_antes_de_intervir)
                }</div></div><div class="section-block"><div class="section-head"><span class="eyebrow">Prevenção biológica</span><div><h2>Reduzir o problema sem destruir os aliados</h2><p>Prioridade à diversidade, ao equilíbrio da cultura e a intervenções seletivas, sem pesticidas de largo espectro.</p></div></div><div class="grid">${
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
                }</div></div><div class="section-block"><div class="section-head"><span class="eyebrow">Intervenção</span><div><h2>Agir apenas quando necessário</h2><p>Comece pela medida menos perturbadora, registe o resultado e reavalie antes de repetir.</p></div></div><div class="grid">${
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
            function render(esp, master) {
                const isPest = esp.grupo === "Sanidade Vegetal";
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
                    valid(esp.prevencao) || valid(esp.combate)
                        ? `<div class="section-block"><div class="section-head"><span class="eyebrow">Gestão</span><div><h2>Prevenção e controlo responsável</h2><p>Aplicável sobretudo a invasoras e organismos de sanidade vegetal. Confirmar identificação e regras locais antes de intervir.</p></div></div><div class="grid">${
                            textPanel("Prevenção", esp.prevencao)
                        }${textPanel("Controlo", esp.combate)}</div></div>`
                        : ""
                }${pestSections(esp)}${similarPanel(esp.especies_semelhantes, master)}${
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
                document.title = `${esp.nome} — bioCulture`;
            }
            async function load() {
                const id = new URLSearchParams(location.search).get("id");
                if (!id) {
                    document.getElementById("species").innerHTML =
                        '<div class="error">Espécie não indicada.</div>';
                    return;
                }
                try {
                    const [master, pests, invasives] = await Promise.all(
                        ["especies_master", "pragas", "flora_invasora"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => r.json())
                        ),
                    );
                    let esp = master[id];
                    if (!esp) {
                        const p = Array.isArray(pests)
                            ? pests.find((x) => x.id === id || fallbackId(x) === id)
                            : null;
                        if (p) {
                            esp = {
                                ...p,
                                nome: p.nome_comum || p.nome,
                                grupo: "Sanidade Vegetal",
                                estatuto: "Praga / Doença",
                                sintese: p.descricao || p.sintomas,
                            };
                        }
                    }
                    if (!esp) {
                        const f = Array.isArray(invasives)
                            ? invasives.find((x) => x.id === id || fallbackId(x) === id)
                            : null;
                        if (f) {
                            esp = {
                                ...f,
                                nome: f.nome_comum || f.nome,
                                grupo: "Flora Invasora",
                                estatuto: "Invasora",
                                invasora: true,
                                sintese: f.descricao || f.impacto,
                            };
                        }
                    }
                    if (!esp) throw Error("not-found");
                    render(esp, master);
                } catch (e) {
                    document.getElementById("species").innerHTML =
                        '<div class="error"><strong>Espécie não encontrada.</strong><br><a href="biodiversidade.html">Voltar</a></div>';
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                load();
            }).catch(() => load());
