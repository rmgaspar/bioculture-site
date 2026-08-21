async function loadTerritoryReport() {
    try {
        console.log("bioCultura: A iniciar carga de dados...");
        const res = await fetch('/data/territory_impact.json');
        
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        
        const data = await res.json();

        // 1. Contadores de Topo
        const counters = document.getElementById('impact-counters');
        if (counters && data.global_counters) {
            counters.innerHTML = `
                <div class="impact-stat">
                    <small>Custo Humano</small>
                    <strong>${data.global_counters.human_cost.split(' ')[0]}</strong>
                    <span>${data.global_counters.human_cost.split(' ')[1]}</span>
                </div>
                <div class="impact-stat">
                    <small>Ecocídio</small>
                    <strong>${data.global_counters.eco_cost.split(' ')[0]}</strong>
                    <span>${data.global_counters.eco_cost.split(' ')[1]}</span>
                </div>
                <div class="impact-stat">
                    <small>Roubo Hídrico</small>
                    <strong>${data.global_counters.water_theft.split(' ')[0]}</strong>
                    <span>${data.global_counters.water_theft.split(' ')[1]}</span>
                </div>
                <div class="impact-stat">
                    <small>Morte do Solo</small>
                    <strong>${data.global_counters.soil_death.split(' ')[0]}</strong>
                    <span>${data.global_counters.soil_death.split(' ')[1]}</span>
                </div>
            `;
        }

        // 2. Dossier de Conflitos
        const dossier = document.getElementById('dossier-container');
        if (dossier && data.dossiers) {
            dossier.innerHTML = data.dossiers.map(item => `
                <article class="dossier-item">
                    <div class="dossier-meta">
                        ${item.region}
                        <span class="alert-tag">${item.alert_level}</span>
                    </div>
                    <div class="dossier-main">
                        <h3>${item.project}</h3>
                        <div class="dossier-grid">
                            <div class="dossier-visual">
                                <img src="${item.image_url}" alt="${item.project}" loading="lazy">
                            </div>
                            <div class="dossier-data">
                                <ul>
                                    ${item.data_points.map(dp => `
                                        <li><strong>${dp.label}</strong> <span>${dp.value}</span></li>
                                    `).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="dossier-analysis">
                            <p>${item.analysis}</p>
                        </div>
                    </div>
                </article>
            `).join('');
        }

        // 3. Notícias
        const news = document.getElementById('news-container');
        if (news && data.news) {
            news.innerHTML = data.news.map(n => `
                <a href="${n.url}" class="news-card" target="_blank">
                    <small>${n.date} · ${n.source}</small>
                    <h4>${n.title}</h4>
                    <span style="font-size: 0.7em; font-weight: 900; color: var(--pressure-red)">LER RELATÓRIO →</span>
                </a>
            `).join('');
        }

        // Remover preload se existir
        document.body.classList.remove('is-preload');

    } catch (e) {
        console.error("Erro Crítico bioCultura:", e);
        // Mostrar erro na página para saberes o que falhou
        const container = document.getElementById('main');
        if(container) container.innerHTML += `<div style="color:red; padding: 20px;">Erro ao carregar JSON: ${e.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadTerritoryReport);
