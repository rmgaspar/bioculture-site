
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
                    ? panel(title, `<ul class="list">${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`)
                    : "";
            }
            const english = () => window.BioCultureI18n?.isEnglish ??
                (new URLSearchParams(location.search).get("lang") === "en");
            const tr = (pt, en) => english() ? en : pt;
            const localized = (value) => value?.[english() ? "en" : "pt"] || value?.pt || "";
            function link(href) {
                const url = new URL(href, location.href);
                if (english()) url.searchParams.set("lang", "en");
                return url.pathname + url.search + url.hash;
            }
            function referencesPanel(fichas) {
                const items = arr(fichas);
                return items.length
                    ? panel(tr("Ajuda a prevenir ou controlar", "Helps prevent or control"),
                        `<ul class="list">${items.map((f) =>
                            `<li><a href="${esc(f.href)}">${esc(f.nome)} →</a></li>`
                        ).join("")}</ul>`)
                    : "";
            }
            function money(preco) {
                const amount = new Intl.NumberFormat(english() ? "en-IE" : "pt-PT",
                    { style: "currency", currency: preco.moeda || "EUR" }).format(preco.valor);
                return preco.iva_incluido === false ? `${amount} ${tr("+ IVA", "+ VAT")}` : amount;
            }
            function render(product, solucao, categoriaNome) {
                const image = valid(product.imagem)
                    ? `<img src="${esc(product.imagem)}" alt="${esc(localized(product.nome))}" onerror="this.style.display='none'">`
                    : "";
                const embalagem = product.embalagem
                    ? `${product.embalagem.quantidade} ${esc(product.embalagem.unidade || "")}`
                    : "—";
                const order = `mailto:geral@bioculture.net?subject=${
                    encodeURIComponent(tr("Encomenda — ", "Order — ") + localized(product.nome))
                }`;
                const beneficios = listPanel(tr("Benefícios", "Benefits"),
                    arr(product.beneficios).map((b) => localized(b)));
                const backLink = `<a class="back" href="${
                    esc(link("/services/produtos.html#" + (solucao?.id || "")))
                }">← ${tr("Voltar ao catálogo", "Back to the catalogue")}</a>`;
                document.getElementById("product").innerHTML = `<div class="hero"><div><span class="eyebrow">${
                    esc(categoriaNome || tr("Produto", "Product"))
                }</span><h1>${esc(localized(product.nome))}</h1>${
                    valid(product.marca) ? `<h2 class="scientific">${esc(product.marca)}</h2>` : ""
                }${
                    valid(product.descricao_curta)
                        ? `<p class="summary">${esc(localized(product.descricao_curta))}</p>`
                        : ""
                }<div class="facts"><div class="fact"><small>${
                    tr("Disponibilidade", "Availability")
                }</small><b class="${product.disponivel ? "is-available" : "is-soon"}">${
                    product.disponivel ? tr("Disponível", "Available") : tr("Brevemente disponível", "Coming soon")
                }</b></div><div class="fact"><small>${tr("Preço", "Price")}</small><b>${
                    product.disponivel && product.preco ? esc(money(product.preco)) : "—"
                }</b></div><div class="fact"><small>${tr("Embalagem", "Package")}</small><b>${
                    esc(embalagem)
                }</b></div><div class="fact"><small>${tr("Categoria", "Category")}</small><b>${
                    esc(categoriaNome || "—")
                }</b></div></div></div><div class="hero-image" data-initial="${
                    esc(String(localized(product.nome) || "?").charAt(0))
                }">${image}</div></div>${backLink}${
                    valid(product.descricao)
                        ? `<div class="section-block" id="descricao"><div class="section-head"><span class="eyebrow">${
                            tr("Sobre este produto", "About this product")
                        }</span><div><h2>${tr("O que é e para que serve", "What it is and what it does")}</h2></div></div><div class="grid">${
                            textPanel(tr("Descrição", "Description"), localized(product.descricao))
                        }${beneficios}</div></div>`
                        : ""
                }${
                    valid(product.modo_aplicacao)
                        ? `<div class="section-block" id="aplicacao"><div class="section-head"><span class="eyebrow">${
                            tr("Na prática", "In practice")
                        }</span><div><h2>${tr("Modo de aplicação", "How to apply")}</h2></div></div><div class="grid">${
                            textPanel(tr("Como aplicar", "How to apply"), localized(product.modo_aplicacao))
                        }</div></div>`
                        : ""
                }${
                    arr(solucao?.fichas).length
                        ? `<div class="section-block" id="solucoes"><div class="section-head"><span class="eyebrow">${
                            tr("Ligações", "Connections")
                        }</span><div><h2>${tr("Pragas e flora invasora relacionadas", "Related pests and invasive flora")}</h2></div></div><div class="grid">${
                            referencesPanel(solucao.fichas)
                        }</div></div>`
                        : ""
                }<div class="section-block" id="encomendar"><div class="order-box">${
                    product.disponivel
                        ? `<h3>${tr("Disponível para encomenda", "Available to order")}</h3><p>${
                            tr("Contacte-nos para confirmar disponibilidade, prazo de entrega e forma de pagamento.",
                                "Contact us to confirm availability, delivery time and payment.")
                        }</p><a class="order-cta" href="${esc(order)}">${tr("Contactar para encomendar →", "Contact to order →")}</a>`
                        : `<h3>${tr("Ainda não disponível para venda", "Not yet available to buy")}</h3>`
                }</div></div>`;
                document.title = `${localized(product.nome)} — bioCulture`;
            }
            async function load() {
                const id = new URLSearchParams(location.search).get("id");
                if (!id) {
                    document.getElementById("product").innerHTML =
                        `<div class="error">${tr("Produto não indicado.", "Product not specified.")}</div>`;
                    return;
                }
                try {
                    const data = await fetch("/data/solucoes-catalogo.json").then((r) => {
                        if (!r.ok) throw Error(`HTTP ${r.status}`);
                        return r.json();
                    });
                    const solucao = data.solucoes.find((s) => (s.produtos || []).some((p) => p.id === id));
                    const product = solucao?.produtos.find((p) => p.id === id);
                    if (!product) throw Error("not-found");
                    const categoria = data.categorias.find((c) => c.id === solucao.categoria_id);
                    render(product, solucao, categoria ? localized(categoria.nome) : "");
                } catch (e) {
                    document.getElementById("product").innerHTML =
                        `<div class="error"><strong>${
                            tr("Produto não encontrado.", "Product not found.")
                        }</strong><br><a href="${esc(link("/services/produtos.html"))}">${
                            tr("Voltar ao catálogo", "Back to the catalogue")
                        }</a></div>`;
                }
            }
            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                load();
            }).catch(() => load());
