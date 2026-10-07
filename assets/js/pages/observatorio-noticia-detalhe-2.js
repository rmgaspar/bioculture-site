
            const catColors = {
                "Água": "#3498db",
                "Ar": "#95a5a6",
                "Solo": "#e67e22",
                "Impacto Digital & IA": "#7b1fa2",
                "Mineração": "#c62828",
                "Biodiversidade": "#2ecc71",
                "Energia Ética": "#f1c40f",
            };

           async function carregarNoticia() {
                const urlParams = new URLSearchParams(window.location.search);
                const noticiaId = urlParams.get("id");

                let lang = window.BioCultureLanguageStore?.read() || "pt";
                if (!lang || lang === "undefined" || lang === "null") lang = "pt";

                if (!noticiaId) {
                    window.location.href = "../index.html";
                    return;
                }

                try {
                    const previewProposal = urlParams.get("preview") === "proposal";
                    const [ativas, arquivo, propostas] = await Promise.all([
                        fetch("/data/noticias.json").then((r) => r.json()),
                        fetch("/data/noticias_arquivo.json").then((r) =>
                            r.ok ? r.json() : []
                        ),
                        previewProposal
                            ? fetch("/data/noticias_propostas.json").then((r) => r.ok ? r.json() : [])
                            : Promise.resolve([]),
                    ]);
                    const noticias = [...ativas, ...arquivo, ...propostas];
                    const n = noticias.find((item) => item.id === noticiaId);

                    if (n) {
                        const content = window.BioCultureI18n?.content(n) || n[lang] || n["pt"] || n;

                        document.getElementById("loading").style.display = "none";
                        document.getElementById("noticia-render").style.display = "block"; // <-- Este é o "show"

                        document.getElementById("titulo").innerText = content.titulo || "Sem título";
                        document.getElementById("corpo").innerHTML = content.corpo || "Conteúdo não disponível.";
                        document.title = (content.titulo || "bioCulture") + " — bioCulture";

                        // «O que importa para o território»: excerto próprio (`importa`) ou, nas notícias à mão, o resumo.
                        // Se não houver texto próprio e o corpo só repetir o resumo, a caixa esconde-se para não duplicar.
                        const plain = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                        const bioTxt = content.importa || content.resumo_biocultura || "";
                        const repeatsBody = !content.importa && plain(content.corpo).startsWith(plain(bioTxt).slice(0, 120));
                        const bioBox = document.getElementById("biocultura-box");
                        if (bioTxt && !repeatsBody) {
                            bioBox.style.display = "block";
                            document.getElementById("biocultura-txt").innerHTML = bioTxt;
                        } else {
                            bioBox.style.display = "none";
                        }

                        const image = document.getElementById("imagem");
                        const figure = document.getElementById("hero-figure");
                        const caption = document.getElementById("image-caption-source");
                        const fallbackImage = "/images/noticias-sem-imagem.webp";
                        const editorialCredit = lang === "en"
                            ? "bioCulture editorial image"
                            : "Imagem editorial bioCulture";
                        const sourceCredit = lang === "en"
                            ? (n.imagem_credito_en || n.imagem_credito_pt || "Image supplied by the source")
                            : (n.imagem_credito_pt || n.imagem_credito_en || "Imagem disponibilizada pela fonte");
                        const markEditorialImage = () => {
                            document.getElementById("hero-image-frame")?.classList.add("bioculture-owned-visual");
                            caption.innerText = editorialCredit;
                        };
                        if (n.imagem) {
                            image.src = n.imagem;
                            image.alt = content.titulo || "Imagem da notícia";
                            const isBioCultureImage = /^\/(images|assets\/dicas)\//.test(n.imagem);
                            document.getElementById("hero-image-frame")?.classList.toggle(
                                "bioculture-owned-visual",
                                isBioCultureImage
                            );
                            caption.innerText = isBioCultureImage ? editorialCredit : sourceCredit;
                            image.addEventListener("error", () => {
                                if (image.dataset.fallbackApplied === "true") {
                                    figure.hidden = true;
                                    return;
                                }
                                image.dataset.fallbackApplied = "true";
                                image.src = fallbackImage;
                                image.alt = lang === "en"
                                    ? `bioCulture editorial illustration for ${window.BioCultureI18n?.category(n.categoria) || "the article"}`
                                    : `Ilustração editorial bioCulture para ${n.categoria || "a notícia"}`;
                                markEditorialImage();
                            });
                        } else {
                            image.dataset.fallbackApplied = "true";
                            image.src = fallbackImage;
                            image.alt = lang === "en" ? "bioCulture editorial illustration" : "Ilustração editorial bioCulture";
                            markEditorialImage();
                        }

                        document.getElementById("data").innerText = window.BioCultureI18n?.date(n.data) || n.data || "";
                        // Selo do tipo de conteúdo (notícia, comunicado, artigo científico, opinião…).
                        const tipoEl = document.getElementById("tipo");
                        const tipoLabel = window.BioCultureNews?.typeLabel(n) || "";
                        tipoEl.textContent = tipoLabel;
                        tipoEl.hidden = !tipoLabel;

                        // «Continuar no bioCulture»: leitura do tema e passos práticos ligados a esta notícia.
                        const english = lang === "en";
                        const links = window.BioCultureNews?.related(n) || [];
                        const nextBox = document.getElementById("news-next");
                        if (links.length) {
                            document.getElementById("news-next-title").textContent = english ? "Continue on bioCulture" : "Continuar no bioCulture";
                            const kinds = { read: english ? "Read the territory" : "Ler o território", act: english ? "Take action" : "Passar à ação" };
                            const safe = (text) => String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
                            document.getElementById("news-next-list").innerHTML = links.map((link) =>
                                `<li><a href="${safe(link.href)}" data-kind="${link.kind}"><small>${kinds[link.kind]}</small><span>${safe(link.title)}</span></a></li>`
                            ).join("");
                            nextBox.hidden = false;
                        } else {
                            nextBox.hidden = true;
                        }

                        // Nota editorial: como o texto foi feito e canal para corrigir.
                        const writtenWithAi = !!n.capturado_em;
                        document.getElementById("editorial-note-title").textContent = english ? "How this text was made" : "Como este texto foi feito";
                        document.getElementById("editorial-note-text").textContent = english
                            ? `${writtenWithAi ? "Summary text prepared by bioCulture with the help of artificial intelligence, based on the source named here." : "Editorial text by bioCulture, based on the source named here."} Facts, figures and quotations belong to the source; we summarise and add context without adding data, and the original prevails if the two differ. Spotted an error or something out of date?`
                            : `${writtenWithAi ? "Texto de síntese elaborado pelo bioCulture, com apoio de inteligência artificial, a partir da fonte indicada." : "Texto editorial do bioCulture, a partir da fonte indicada."} Os factos, números e citações pertencem à fonte; resumimos e contextualizamos sem acrescentar dados, e o original prevalece se houver diferenças. Encontraste um erro ou algo desatualizado?`;
                        const correction = document.getElementById("editorial-note-link");
                        correction.textContent = english ? "Suggest a correction" : "Sugerir correção";
                        const subject = `${english ? "Correction" : "Correção"}: ${content.titulo || n.id}`;
                        const bodyText = `${english ? "Page" : "Página"}: ${location.origin}/observatorio/noticia-detalhe.html?id=${encodeURIComponent(n.id)}\n\n${english ? "What should be corrected (and a source, if possible):" : "O que deve ser corrigido (e uma fonte, se possível):"}\n`;
                        correction.href = `mailto:geral@bioculture.pt?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
                        document.getElementById("editorial-note").hidden = false;

                        document.getElementById("source-name-top").innerText = n.fonte || "";
                        
                        const catEl = document.getElementById("cat");
                        const translatedCategory = typeof window.BioCultureI18n?.category === "function"
                            ? window.BioCultureI18n.category(n.categoria)
                            : n.categoria;
                        const actualidadeLabel = lang === "en" ? "Current affairs" : "Atualidade";
                        catEl.innerText = `${actualidadeLabel} - ${(translatedCategory || "Geral")}`.toUpperCase();
                        if (catColors[n.categoria]) catEl.style.color = catColors[n.categoria];

                        let domain = "";
                        try { domain = new URL(n.url).hostname; } catch (e) { domain = "biocultura.net"; }
                        const forcedLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

                        ["source-logo", "footer-logo"].forEach((logoId) => {
                            const logoElement = document.getElementById(logoId);
                            logoElement.onerror = () => {
                                if (logoElement.src !== forcedLogo) logoElement.src = forcedLogo;
                            };
                            logoElement.src = n.logo || forcedLogo;
                            logoElement.alt = n.fonte
                                ? (lang === "en" ? `${n.fonte} logo` : `Logótipo ${n.fonte}`)
                                : (lang === "en" ? "Source logo" : "Logótipo da fonte");
                        });
                        document.getElementById("official-link").href = n.url || "#";
                        document.getElementById("footer-source").innerText = n.fonte || "";
                        document.getElementById("footer-date").innerText = window.BioCultureI18n?.date(n.data) || n.data || "";

                        // --- ESTA É A PARTE QUE FALTA ---
                        // Força o motor de tradução a processar as novas tags data-i18n do HTML
                        if (window.BioCultureI18n && typeof window.BioCultureI18n.updateDOM === 'function') {
                            window.BioCultureI18n.updateDOM();
                        }

                    } else {
                        document.getElementById("loading").classList.add("error-state");
                        document.getElementById("loading").innerHTML = 
                            window.BioCultureI18n?.t('news_not_found') || "<strong>Notícia não encontrada.</strong>";
                    }
                } catch (e) {
                    console.error("Erro técnico:", e);
                    document.getElementById("loading").classList.add("error-state");
                    document.getElementById("loading").innerHTML = "<strong>Erro ao carregar.</strong>";
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                carregarNoticia();
            });
