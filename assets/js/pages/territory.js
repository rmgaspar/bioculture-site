async function loadTerritoryData() {
    try {
        const response = await fetch('/data/territory_impact.json');
        const data = await response.json();

        // 1. Dossier com Imagens e Localizações
        const dossierList = document.querySelector('.dossier-list');
        if (dossierList) {
            dossierList.innerHTML = data.dossiers.map(item => `
                <article class="dossier-item">
                    <div class="dossier-visual">
                        <img src="${item.image}" alt="${item.project}" onerror="this.src='/images/placeholder-territory.webp'">
                    </div>
                    <div class="dossier-content">
                        <div class="dossier-meta">
                            <span class="tag-conflito">${item.region}</span>
                            <span class="impact-level">${item.impact_level}</span>
                        </div>
                        <h3>${item.project}</h3>
                        <div class="dossier-grid">
                            <div class="dossier-data">
                                <ul>
                                    ${Object.entries(item.metrics).map(([key, value]) => `
                                        <li><strong>${key}</strong> <span>${value}</span></li>
                                    `).join('')}
                                </ul>
                            </div>
                            <div class="dossier-analysis">
                                <p>${item.analysis}</p>
                            </div>
                        </div>
                    </div>
                </article>
            `).join('');
        }

        // 2. Secção de Notícias (Estilo bioCultura)
        const newsGrid = document.querySelector('.pressure-news-grid');
        if (newsGrid) {
            newsGrid.innerHTML = data.news.map(n => `
                <a href="${n.url}" target="_blank">
                    <small>${n.date} · ${n.source}</small>
                    <h3>${n.title}</h3>
                    <span>Ler notícia →</span>
                </a>
            `).join('');
        }

    } catch (error) {
        console.error("Erro bioCultura:", error);
    }
}
document.addEventListener('DOMContentLoaded', loadTerritoryData);
