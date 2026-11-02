
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
            // Só liga a um produto/técnica quando a orientação já indica um solucao_id concreto;
            // nunca inferimos por categoria ou palavra-chave (evitaria uma recomendação errada).
            function solutionLink(option, solucoesCatalogo) {
                const solucao = solucoesCatalogo?.solucoes?.find((s) => s.id === option.solucao_id);
                if (!solucao) return null;
                if (solucao.tipo === "pratica" && valid(solucao.tecnica_id)) {
                    return { href: `/services/tecnicas.html#tecnica-${encodeURIComponent(solucao.tecnica_id)}`,
                        label: tr("Ver técnica →", "See technique →") };
                }
                const produto = arr(solucao.produtos)[0];
                return produto
                    ? { href: `/services/produto-detalhe.html?id=${encodeURIComponent(produto.id)}`,
                        label: tr("Ver produto →", "See product →") }
                    : { href: `/services/produtos.html#${encodeURIComponent(solucao.id)}`,
                        label: tr("Ver no catálogo →", "See in catalogue →") };
            }
            function optionPanel(option, solucoesCatalogo) {
                const text = localized(option.condicao);
                if (!valid(text)) return "";
                const link = option.solucao_id ? solutionLink(option, solucoesCatalogo) : null;
                return panel(esc(localized(option.nome)), `<p>${esc(text)}</p>${
                    link ? `<a class="panel-link" href="${esc(link.href)}">${esc(link.label)}</a>` : ""
                }`);
            }
            function practicalSections(esp, guidance, solucoesCatalogo) {
                const profile = guidance?.perfis?.find((p) => p.alvos.includes(esp.id));
                if (!profile) return "";
                const options = profile.opcoes.map((option) => optionPanel(option, solucoesCatalogo))
                    .join("");
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
                if (esp.grupo !== "Flora Invasora" && esp.grupo !== "Fauna Invasora") return "";
                return `<div class="section-block" id="prevencao"><div class="section-head"><span class="eyebrow">${tr("Prevenção", "Prevention")}</span><div><h2>${tr("Conter a expansão desde o início", "Contain spread from the start")}</h2><p>${tr("Confirmar a espécie e preparar a intervenção de acordo com o local.", "Confirm the species and plan action for the site.")}</p></div></div><div class="grid">
                    ${textPanel(tr("Deteção precoce", "Early detection"), esp.deteccao_precoce)}
                    ${textPanel(tr("Prevenir a dispersão", "Prevent spread"), esp.prevencao)}
                    ${textPanel(tr("Reprodução e dispersão", "Reproduction and spread"), esp.reproducao_e_dispersao)}
                    ${textPanel(tr("Segurança no local", "Site safety"), esp.seguranca)}</div></div>
                    <div class="section-block" id="intervencao"><div class="section-head"><span class="eyebrow">${tr("Controlo e recuperação", "Control and recovery")}</span><div><h2>${tr("Intervir e acompanhar o terreno", "Act and follow up on the site")}</h2><p>${tr("A remoção inicial deve ter continuidade: resíduos, rebentação ou reincidência, e recuperação do habitat.", "Initial removal needs follow-up: waste, regrowth or reoccurrence, and habitat recovery.")}</p></div></div><div class="grid">
                    ${textPanel(tr("Método indicado no inventário", "Method recorded in the inventory"), esp.combate)}
                    ${textPanel(tr("Destino dos resíduos", "Waste management"), esp.gestao_residuos)}
                    ${textPanel(tr("Monitorização", "Monitoring"), esp.monitorizacao)}
                    ${textPanel(tr("Restaurar o habitat", "Restore habitat"), esp.restauracao)}
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
            // Wikipedia-style: cada planta afetada aparece como link para a sua própria ficha
            // quando existe correspondência confirmada no calendário de culturas; caso contrário
            // fica como texto simples, sem inventar uma cultura que os dados não confirmam.
            function plantasAfetadasPanel(esp, horticolas) {
                const termos = arr(esp.plantas_afetadas);
                if (!termos.length) return "";
                const byNorm = {};
                if (horticolas) {
                    for (const [cid, c] of Object.entries(horticolas)) {
                        byNorm[normalizeText(cid)] = cid;
                        byNorm[normalizeText(c.nome)] = cid;
                    }
                }
                return panel(tr("Plantas afetadas", "Affected plants"),
                    `<ul class="list list-inline-links">${termos.map((termo) => {
                        const t = normalizeText(termo);
                        const cid = byNorm[t] || CROP_ALIASES[t];
                        return cid && horticolas && horticolas[cid]
                            ? `<li><a href="/calendario/horticola-detalhe.html?id=${
                                encodeURIComponent(cid)
                            }">${esc(termo)} →</a></li>`
                            : `<li>${esc(termo)}</li>`;
                    }).join("")}</ul>`);
            }
            function pestSections(esp, horticolas) {
                if (esp.grupo !== "Sanidade Vegetal") return "";
                const diagnosis = esp.diagnostico || {};
                const prevention = esp.prevencao_biologica || {};
                const solution = esp.solucao_biologica || {};
                const techniques = esp.tecnicas || {};
                return `<div class="section-block" id="diagnostico"><div class="section-head"><span class="eyebrow">Diagnóstico</span><div><h2>Reconhecer antes de intervir</h2><p>Sintomas semelhantes podem ter causas diferentes. Confirma o organismo, a extensão do dano e os auxiliares já presentes.</p></div></div><div class="grid">${
                    plantasAfetadasPanel(esp, horticolas)
                }${textPanel("Sinais e sintomas", esp.sintomas || diagnosis.sintomas_principais)}${
                    textPanel("Quando observar", esp.sazonalidade_portugal)
                }${textPanel("Monitorização", diagnosis.monitorizacao)}${
                    textPanel("Confirmar antes de intervir", diagnosis.confirmar_antes_de_intervir)
                }</div></div><div class="section-block" id="prevencao"><div class="section-head"><span class="eyebrow">Prevenção biológica</span><div><h2>Reduzir o problema sem destruir os aliados</h2><p>Prioridade à diversidade, ao equilíbrio da cultura e a intervenções seletivas, sem pesticidas de largo espectro.</p></div></div><div class="grid">${
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
                }</div></div><div class="section-block" id="intervencao"><div class="section-head"><span class="eyebrow">Intervenção</span><div><h2>Agir apenas quando necessário</h2><p>Começa pela medida menos perturbadora, regista o resultado e reavalia antes de repetir.</p></div></div><div class="grid">${
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
                return `<div class="section-block" id="semelhantes"><div class="section-head"><span class="eyebrow">Comparar</span><div><h2>Espécies semelhantes</h2><p>A semelhança visual não confirma uma identificação. Observa forma, habitat, época e caracteres distintivos.</p></div></div><div class="similar">${links}</div></div>`;
            }
            // «Resposta rápida»: o essencial de data/problemas-horta.json antes das secções longas da ficha.
            function quickAnswer(esp, problemas) {
                const rows = (problemas || []).filter((row) => ["pragas", "doencas"].includes(row.grupo) && (row.ver || []).some(([kind, id]) => kind === "praga" && id === esp.id)).slice(0, 2);
                if (!rows.length) return "";
                const pick = (row) => (english() ? row.en : row.pt) || row.pt;
                return rows.map((row) => {
                    const c = pick(row);
                    return `<section class="quick-answer" id="resposta-rapida-${esc(row.id)}"><span class="eyebrow">${tr("Resposta rápida", "Quick answer")}</span><h2>${esc(c.titulo)}</h2><p>${esc(c.resumo)}</p><ol>${c.fazer.slice(0, 4).map((step) => `<li>${esc(step)}</li>`).join("")}</ol><a href="/calendario/conhecimento-cuidar.html#problema-${encodeURIComponent(row.id)}">${tr("Ver a resposta completa →", "See the full answer →")}</a></section>`;
                }).join("");
            }
            // «Na teia do jardim»: quem come quem à volta deste elo, de data/teia-jardim.json (só nas fichas dos elos do mapa).
            function teiaPanel(esp, teia) {
                const fichaId = new URLSearchParams(location.search).get("id"),
                    no = fichaId && teia?.nos?.find((n) => n.ficha === fichaId || n.praga === fichaId);
                if (!no) return "";
                const L = english() ? "en" : "pt", txt = (o) => o[L] || o.pt, byId = (id) => teia.nos.find((n) => n.id === id);
                const rel = (rows, other) => rows.map((l) => `<li><b>${esc(txt(byId(l[other])).nome)}</b>: ${esc(txt(l))}</li>`).join("");
                const come = teia.ligacoes.filter((l) => l.de === no.id), comido = teia.ligacoes.filter((l) => l.para === no.id);
                const refs = [...new Set([...no.refs, ...come.flatMap((l) => l.refs), ...comido.flatMap((l) => l.refs)])].map((r) => teia.referencias[r]).filter(Boolean);
                const ver = (no.ver || []).filter((v) => v.t === "prob").map((v) => `<a href="/calendario/conhecimento-cuidar.html#problema-${encodeURIComponent(v.id)}">${tr("Ver a resposta na horta →", "See the garden answer →")}</a>`);
                const inner = panel(tr("Em resumo", "In short"), `<p>${esc(txt(no).resumo)}</p>${no.latim ? `<p class="source">${tr("Grupo", "Group")}: ${esc(txt(no).nome)} (<i>${esc(no.latim)}</i>)</p>` : ""}`) +
                    (come.length ? panel(tr("Alimenta-se de", "Feeds on"), `<ul class="list">${rel(come, "para")}</ul>`) : "") +
                    (comido.length ? panel(tr("É alimento de", "Is food for"), `<ul class="list">${rel(comido, "de")}</ul>`) : "") +
                    panel(tr("Como ajudar", "How to help"), `<ul class="list">${txt(no).ajudar.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>${ver.length ? `<p>${ver.join(" ")}</p>` : ""}`) +
                    panel(tr("Fontes da teia", "Web sources"), `<ul class="list">${refs.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.citacao)} ↗</a></li>`).join("")}</ul>`);
                return `<div class="section-block" id="teia-jardim"><div class="section-head"><span class="eyebrow">${tr("Na teia do jardim", "In the garden web")}</span><div><h2>${tr("Quem come quem à volta deste elo", "Who eats whom around this link")}</h2><p>${tr("Relações descritas na literatura, em esquema simplificado; não são medições do teu jardim.", "Relationships described in the literature, in a simplified scheme; not measurements of your garden.")}</p></div></div><div class="grid">${inner}</div></div>`;
            }
            function render(esp, master, guidance, horticolas, solucoesCatalogo, problemas, teia) {
                const isPest = esp.grupo === "Sanidade Vegetal";
                const isInvasive = esp.grupo === "Flora Invasora" || esp.grupo === "Fauna Invasora";
                const tax = arr(esp.taxonomia_completa).join(" › ");
                const conservation = [
                    valid(esp.iucn_global) ? `IUCN: ${esp.iucn_global}` : "",
                    valid(esp.conservacao_portugal) ? `Portugal: ${esp.conservacao_portugal}` : "",
                    valid(esp.protegida_portugal) ? `Proteção: ${esp.protegida_portugal}` : "",
                ].filter(Boolean);
                const image = valid(esp.imagem)
                    ? `<img src="${esc((esp.foto && esp.foto.grande) || esp.imagem.replace("/medium.", "/large."))}" alt="${
                        esc(esp.nome)
                    }" data-fallback="${esc(esp.imagem)}" onerror="if(this.dataset.fallback&&this.src!==this.dataset.fallback){this.src=this.dataset.fallback}else{this.style.display='none'}">`
                    : "";
                const credit = valid(esp.imagem) && esp.foto && esp.foto.autor
                    ? `<p class="photo-credit">${tr("Foto", "Photo")}: ${esp.foto.autor && esp.foto.autor !== "iNaturalist" ? `${esc(esp.foto.autor)} · ` : ""}<a href="${esc(esp.foto.licenca_url)}" target="_blank" rel="noopener noreferrer">${esc(esp.foto.licenca)}</a> · <a href="${esc(esp.foto.pagina)}" target="_blank" rel="noopener noreferrer">${esc(esp.foto.origem || "iNaturalist")}</a>${esp.foto.da_especie ? ` · ${tr("imagem da espécie, não da variedade", "image of the species, not the cultivar")}` : ""}</p>`
                    : "";
                const ecology = textPanel("Origem", esp.origem) +
                    textPanel("Distribuição", esp.distribuicao) +
                    listPanel("Habitats", esp.habitats) +
                    textPanel("Função ecológica", esp.funcao_ecologica) +
                    (tax ? textPanel("Taxonomia", tax) : "");
                const hub = isPest ? "/calendario/calendario.html#vigilancia" : "biodiversidade.html";
                let html = `<div class="hero"><div><span class="eyebrow">${
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
                }</b></div></div></div><div class="hero-figure"><div class="hero-image" data-initial="${
                    esc(String(esp.nome || "?").charAt(0))
                }">${image}</div>${credit}</div></div><!--ficha-nav-->${
                    quickAnswer(esp, problemas)
                }${pestSections(esp, horticolas)}${invasiveSections(esp)}${
                    practicalSections(esp, guidance, solucoesCatalogo)
                }${
                    !isPest && !isInvasive && (valid(esp.prevencao) || valid(esp.combate))
                        ? `<div class="section-block" id="gestao"><div class="section-head"><span class="eyebrow">Gestão</span><div><h2>Prevenção e controlo responsável</h2><p>Aplicável sobretudo a invasoras e organismos de sanidade vegetal. Confirmar identificação e regras locais antes de intervir.</p></div></div><div class="grid">${
                            textPanel("Prevenção", esp.prevencao)
                        }${textPanel("Controlo", esp.combate)}</div></div>`
                        : ""
                }${
                    ecology
                        ? `<div class="section-block" id="ecologia"><div class="section-head"><span class="eyebrow">Ecologia</span><div><h2>Onde vive e que papel desempenha</h2><p>São apresentados apenas os campos preenchidos no inventário; informação ausente não é substituída por generalizações.</p></div></div><div class="grid">${ecology}</div></div>`
                        : ""
                }${
                    conservation.length || arr(esp.ameacas).length || arr(esp.protecao_legal).length
                        ? `<div class="section-block" id="conservacao"><div class="section-head"><span class="eyebrow">Conservação</span><div><h2>Estado, proteção e ameaças</h2><p>O estado global e a avaliação nacional não são equivalentes. Um traço significa que o inventário ainda não possui esse dado.</p></div></div><div class="grid">${
                            listPanel("Estado disponível", conservation)
                        }${listPanel("Proteção legal", esp.protecao_legal)}${
                            listPanel("Ameaças", esp.ameacas)
                        }</div></div>`
                        : ""
                }${teiaPanel(esp, teia)}${similarPanel(esp.especies_semelhantes, master)}${
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
                document.getElementById("species").innerHTML = html.replace("<!--ficha-nav-->", fichaNav(html, hub));
                document.title = `${esp.nome} — bioCulture`;
            }
            // Barra fixa da ficha: «← Voltar» (regressa ao sítio exato, ver biocultura-voltar.js) e as secções que a ficha tem.
            function fichaNav(html, hub) {
                const secoes = [["diagnostico", tr("Diagnóstico", "Diagnosis")], ["prevencao", tr("Prevenção", "Prevention")], ["intervencao", tr("Intervenção", "Intervention")],
                    ["solucoes", tr("Soluções práticas", "Practical solutions")], ["gestao", tr("Gestão", "Management")], ["ecologia", tr("Ecologia", "Ecology")],
                    ["conservacao", tr("Conservação", "Conservation")], ["teia-jardim", tr("Na teia do jardim", "Garden web")], ["semelhantes", tr("Semelhantes", "Similar")]];
                const links = secoes.filter(([id]) => html.includes(`id="${id}"`)).map(([id, label]) => `<a href="#${id}">${label}</a>`).join("");
                return `<nav class="management-nav" aria-label="${tr("Nesta ficha", "On this page")}"><a class="hub-back" href="${hub}" onclick="if(!this.dataset.bioHub&&history.length>1&&document.referrer.startsWith(location.origin)){event.preventDefault();history.back();}">${tr("← Voltar", "← Back")}</a>${links}</nav>`;
            }
            function resolveSpecies(id, master, pests, invasives, faunas) {
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
                const fauna = match(faunas);
                if (fauna) return { ...base, ...fauna, nome: fauna.nome_comum || fauna.nome,
                    grupo: "Fauna Invasora", estatuto: "Invasora", invasora: true,
                    sintese: fauna.descricao || fauna.impacto };
                return base;
            }
            const semIndexar = () => { if (document.querySelector('meta[name="robots"]')) return; const m = document.createElement("meta"); m.name = "robots"; m.content = "noindex"; document.head.appendChild(m); };
            async function load() {
                const id = new URLSearchParams(location.search).get("id");
                if (!id) {
                    semIndexar();
                    document.getElementById("species").innerHTML =
                        '<div class="error">Espécie não indicada.</div>';
                    return;
                }
                try {
                    const [master, pests, invasives, faunas, guidance, horticolas, solucoesCatalogo, problemas, teia] = await Promise.all([
                        ...["especies-indice", "pragas", "flora_invasora", "fauna_invasora"].map((f) =>
                            fetch(`/data/${f}.json`).then((r) => {
                                if (!r.ok) throw Error(`HTTP ${r.status}`);
                                return r.json();
                            })),
                        fetch("/data/gestao-solucoes.json").then((r) => {
                            if (!r.ok) throw Error(`HTTP ${r.status}`);
                            return r.json();
                        }).catch(() => null),
                        fetch("/data/horticolas_master.json").then((r) => r.json()).catch(() => null),
                        fetch("/data/solucoes-catalogo.json").then((r) => r.json()).catch(() => null),
                        fetch("/data/problemas-horta.json").then((r) => r.json()).then((data) => data.problemas).catch(() => []),
                        fetch("/data/teia-jardim.json?v=6").then((r) => r.json()).catch(() => null),
                    ]);
                    const record = await window.BioCulturaSpecies.record(id).catch(() => undefined);
                    const esp = resolveSpecies(id, { [id]: record }, pests, invasives, faunas);
                    if (!esp) throw Error("not-found");
                    window.BioCulturaCanonica?.definir(id);
                    render(esp, master, guidance, horticolas, solucoesCatalogo, problemas, teia);
                    const stickyNav = document.createElement("script");
                    stickyNav.src = "/assets/js/biocultura-sticky-nav.js?v=20";
                    document.body.appendChild(stickyNav);
                    if (location.hash) {
                        const target = document.getElementById(location.hash.slice(1));
                        if (target) requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
                    }
                } catch (e) {
                    semIndexar();
                    // Espécie que já não existe: vai para o catálogo (evita uma página «não encontrada» com código 200, soft 404 no Google).
                    if (e && e.message === "not-found") window.location.replace("/ecossistemas/biodiversidade"+(window.BioCultureLanguageStore?.read() === "en" ? "?lang=en" : "")+"#catalogo");
                    document.getElementById("species").innerHTML =
                        '<div class="error"><strong>Espécie não encontrada.</strong><br><a href="biodiversidade.html">Voltar</a></div>';
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                load();
            }).catch(() => load());
        