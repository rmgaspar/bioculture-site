
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
                        fetch("/data/noticias.json?v=" + Date.now()).then((r) => r.json()),
                        fetch("/data/noticias_arquivo.json?v=" + Date.now()).then((r) =>
                            r.ok ? r.json() : []
                        ),
                        previewProposal
                            ? fetch("/data/noticias_propostas.json?v=" + Date.now()).then((r) => r.ok ? r.json() : [])
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
                        document.title = (content.titulo || "bioCultura") + " - bioCultura";

                        const bioTxt = content.resumo_biocultura || "";
                        const bioBox = document.getElementById("biocultura-box");
                        if (bioTxt) {
                            bioBox.style.display = "block";
                            document.getElementById("biocultura-txt").innerHTML = bioTxt;
                        } else {
                            bioBox.style.display = "none";
                        }

                        const image = document.getElementById("imagem");
                        const figure = document.getElementById("hero-figure");
                        if (n.imagem) {
                            image.src = n.imagem;
                            image.alt = content.titulo || "Imagem da notícia";
                            const isBioCultureImage = /^\/(images|assets\/dicas)\//.test(n.imagem);
                            document.getElementById("hero-image-frame")?.classList.toggle(
                                "bioculture-owned-visual",
                                isBioCultureImage
                            );
                            image.addEventListener("error", () => { figure.hidden = true; }, { once: true });
                        } else {
                            figure.hidden = true;
                        }

                        document.getElementById("data").innerText = window.BioCultureI18n?.date(n.data) || n.data || "";
                        document.getElementById("source-name-top").innerText = n.fonte || "";
                        
                        const imageCredit = lang === "en"
                            ? (n.imagem_credito_en || n.imagem_credito_pt)
                            : (n.imagem_credito_pt || n.imagem_credito_en);
                        document.getElementById("image-caption-source").innerText = imageCredit
                            || (lang === "en" ? "Image supplied by the source" : "Imagem disponibilizada pela fonte");

                        const catEl = document.getElementById("cat");
                        const translatedCategory = typeof window.BioCultureI18n?.category === "function"
                            ? window.BioCultureI18n.category(n.categoria)
                            : n.categoria;
                        catEl.innerText = (translatedCategory || "Geral").toUpperCase();
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
                            logoElement.alt = n.fonte ? `Logótipo ${n.fonte}` : "Logótipo da fonte";
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
