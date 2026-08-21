async function loadTerritoryReport() {
    try {
        const res = await fetch('/data/territory_impact.json');
        const data = await res.json();

        // 1. Contadores de Topo
        document.getElementById('impact-counters').innerHTML = `
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

        // 2. Dossier de Conflitos
        document.getElementById('dossier-container').innerHTML = data.dossiers.map(item => `
            <article class="dossier-item">
                <div class="dossier-meta">
                    ${item.region}
                    <span class="alert-tag">${item.alert_level}</span>
                </div>
                <div class="dossier-main">
                    <h3>${item.project}</h3>
                    <div class="dossier-grid">
                        <div class="dossier-visual">
                            <img src="${item.image_url}" alt="${item.project}">
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

        // 3. Notícias
        document.getElementById('news-container').innerHTML = data.news.map(n => `
            <a href="${n.url}" class="news-card" target="_blank">
                <small>${n.date} · ${n.source}</small>
                <h4>${n.title}</h4>
                <span style="font-size: 0.7em; font-weight: 900; color: var(--pressure-red)">LER RELATÓRIO →</span>
            </a>
        `).join('');

    } catch (e) {
        console.error("Erro no Observatório:", e);
    }
}

document.addEventListener('DOMContentLoaded', loadTerritoryReport);
