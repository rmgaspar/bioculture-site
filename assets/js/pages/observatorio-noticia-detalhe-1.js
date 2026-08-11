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

                // 1. Obter língua e garantir que é válida
                let lang = localStorage.getItem("selected_lang") || "pt";
                if (!lang || lang === "undefined" || lang === "null") lang = "pt";

                if (!noticiaId) {
                    window.location.href = "../index.html";
                    return;
                }

                try {
                    // Cache busting para garantir dados frescos
                    const [ativas, arquivo] = await Promise.all([
                        fetch("/data/noticias.json?v=" + Date.now()).then((r) => r.json()),
                        fetch("/data/noticias_arquivo.json?v=" + Date.now()).then((r) =>
                            r.ok ? r.json() : []
                        ),
                    ]);
                    const noticias = [...ativas, ...arquivo];

                    // Encontrar a notícia pelo ID
                    const n = noticias.find((item) => item.id === noticiaId);

                    if (n) {
                        // 2. Lógica de extração: Tenta a língua selecionada, falha para PT, falha para a raiz
                        const content = n[lang] || n["pt"] || n;

                        document.getElementById("loading").style.display = "none";
                        document.getElementById("noticia-render").style.display = "block";

                        // 3. Injeção de Título e Corpo com verificação de existência
                        document.getElementById("titulo").innerText = content.titulo || "Sem título";
                        document.getElementById("corpo").innerHTML = content.corpo ||
                            "Conteúdo não disponível.";
                        document.title = (content.titulo || "bioCulture") + " - bioCulture";

                        // 4. Análise bioCulture (resumo_biocultura)
                        const bioTxt = content.resumo_biocultura || "";
                        const bioBox = document.getElementById("biocultura-box");
                        if (bioTxt) {
                            bioBox.style.display = "block";
                            document.getElementById("biocultura-txt").innerHTML = bioTxt;
                        } else {
                            bioBox.style.display = "none";
                        }

                        // 5. Metadados (Estão na raiz do objeto JSON)
                        const image = document.getElementById("imagem");
                        const figure = document.getElementById("hero-figure");
                        if (n.imagem) {
                            image.src = n.imagem;
                            image.alt = content.titulo || "Imagem da notícia";
                            image.addEventListener("error", () => {
                                figure.hidden = true;
                            }, { once: true });
                        } else {
                            figure.hidden = true;
                        }
                        document.getElementById("data").innerText = n.data || "";
                        document.getElementById("source-name-top").innerText = n.fonte || "";
                        document.getElementById("image-caption-source").innerText = n.fonte
                            ? `Imagem: ${n.fonte}`
                            : "Imagem disponibilizada pela fonte";

                        const catEl = document.getElementById("cat");
                        catEl.innerText = (n.categoria || "Geral").toUpperCase();
                        if (catColors[n.categoria]) catEl.style.color = catColors[n.categoria];

                        // 6. Logos e Links
                        let domain = "";
                        try {
                            domain = new URL(n.url).hostname;
                        } catch (e) {
                            domain = "biocultura.net";
                        }
                        const forcedLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

                        document.getElementById("source-logo").src = n.logo || forcedLogo;
                        document.getElementById("footer-logo").src = n.logo || forcedLogo;
                        ["source-logo", "footer-logo"].forEach((id) => {
                            const logo = document.getElementById(id);
                            logo.alt = n.fonte ? `Símbolo de ${n.fonte}` : "";
                            logo.addEventListener("error", () => {
                                logo.hidden = true;
                            }, { once: true });
                        });
                        document.getElementById("official-link").href = n.url || "#";
                        document.getElementById("footer-source").innerText = n.fonte || "";
                        document.getElementById("footer-date").innerText = n.data || "";
                    } else {
                        document.getElementById("loading").classList.add("error-state");
                        document.getElementById("loading").innerHTML =
                            "<strong>Notícia não encontrada.</strong><br>O artigo pode ter sido arquivado ou removido.";
                    }
                } catch (e) {
                    console.error("Erro técnico:", e);
                    document.getElementById("loading").classList.add("error-state");
                    document.getElementById("loading").innerHTML =
                        "<strong>Não foi possível abrir esta notícia.</strong><br>Tente novamente dentro de alguns momentos.";
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                carregarNoticia();
            });
