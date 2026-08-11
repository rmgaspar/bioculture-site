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
            async function carregar() {
                const id = new URLSearchParams(window.location.search).get("id");
                if (!id) {
                    window.location.href = "calendario.html";
                    return;
                }

                try {
                    const res = await fetch("/data/horticolas_master.json?v=" + Date.now());
                    const master = await res.json();
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
                    const care = textPanel("Irrigação", item.irrigacao) +
                        textPanel("Método de rega", item.metodo_rega_recomendado) +
                        textPanel("Manutenção", item.manutencao) +
                        textPanel("Fertilização orgânica", item.fertilizacao_organica);
                    const ecology = listPanel("Consociações favoráveis", item.consociacoes_favoraveis) +
                        listPanel("Evitar consociar", item.evitar_consociar) +
                        textPanel("Rotação", item.rotacao) +
                        listPanel("Culturas semelhantes", item.culturas_semelhantes);
                    const protection = textPanel("Problemas comuns", item.problemas_comuns) +
                        textPanel("Prevenção sem pesticidas", item.prevencao_sem_pesticidas) +
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
                            <a href="calendario.html" class="btn-voltar-base" style="margin:0 0 2em">← VOLTAR AO CALENDÁRIO</a>
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
                    document.title = item.nome + " - bioCulture";
                } catch (e) {
                    console.error("Erro ao carregar detalhe:", e);
                }
            }

            fetch("/sidebar-content.html").then((r) => r.text()).then((html) => {
                document.getElementById("sidebar").innerHTML = html;
                carregar();
            });
