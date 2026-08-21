async function loadTerritoryData() {
    try {
        const response = await fetch('/data/territory_impact.json');
        const data = await response.json();

        // 1. Preencher Contadores de Topo
        const statsGrid = document.querySelector('.stats-heavy-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card danger">
                    <small>Deslocamento Humano</small>
                    <strong>+${(data.global_counters.human_displaced / 1000000).toFixed(1)}M</strong>
                    <span>Vítimas e Refugiados</span>
                    <p>Soma global de expulsões forçadas e deslocados por conflitos ligados ao território.</p>
                </div>
                <div class="stat-card danger">
                    <small>Árvores Abatidas</small>
                    <strong>+${(data.global_counters.trees_felled / 1000000).toFixed(1)}M</strong>
                    <span>Ecocídio em curso</span>
                    <p>Rasto direto de infraestruturas turísticas e ferroviárias em selvas e pinhais.</p>
                </div>
                <div class="stat-card warning">
                    <small>Exaustão Hídrica</small>
                    <strong>1:${(data.water_comparison.luxury_tourist / data.water_comparison.local_resident).toFixed(0)}</strong>
                    <span>Rácio de Consumo</span>
                    <p>Um turista de luxo consome o equivalente a ${ (data.water_comparison.luxury_tourist / data.water_comparison.local_resident).toFixed(0) } residentes locais por dia.</p>
                </div>
                <div class="stat-card">
                    <small>Solo em Recuo</small>
                    <strong>${data.global_counters.dune_loss_percentage}%</strong>
                    <span>Dunas Deterioradas</span>
                    <p>Percentagem de sistemas dunares em erosão acelerada por artificialização da costa.</p>
                </div>
            `;
        }

        // 2. Renderizar Dossier de Conflitos
        const dossierList = document.querySelector('.dossier-list');
        if (dossierList) {
            dossierList.innerHTML = data.dossiers.map(item => `
                <article class="dossier-item">
                    <div class="dossier-meta">
                        <span class="tag-conflito">${item.region}</span>
                        <span class="impact-level">${item.impact_level}</span>
                    </div>
                    <h3>${item.project}</h3>
                    <div class="dossier-grid">
                        <div class="dossier-data">
                            <ul>
                                ${Object.entries(item.metrics).map(([key, value]) => `
                                    <li><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="dossier-analysis">
                            <p>${item.analysis}</p>
                        </div>
                    </div>
                </article>
            `).join('');
        }

    } catch (error) {
        console.error("Erro ao carregar dados do observatório:", error);
    }
}

document.addEventListener('DOMContentLoaded', loadTerritoryData);
