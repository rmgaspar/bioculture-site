const recursos = [
    {
        name: 'Água',
        description: 'Da precipitação aos aquíferos, da torneira às bacias hidrográficas. O ciclo da água revela o estado de um sistema vivo em permanente tensão.',
        globalUrl: '/recursos/water.html',
        ptUrl: '/recursos/agua.html',
        hasPt: true,
        image: '/recursos/water/water-global-page/images/water-global-hero.png'
    },
    {
        name: 'Ar',
        description: 'Qualidade do ar, composição atmosférica e emissões de gases com efeito de estufa. O que respiramos diz o que produzimos e o que queimamos.',
        globalUrl: '/recursos/air.html',
        ptUrl: '/recursos/ar.html',
        hasPt: true,
        image: '/images/ar-vivo.webp'
    },
    {
        name: 'Solo',
        description: 'A camada que filtra a água, sustenta a agricultura e armazena carbono. Invisível, mas essencial — a erosão tem consequências sistémicas.',
        globalUrl: '/recursos/soil.html',
        ptUrl: '/recursos/solo.html',
        hasPt: true,
        image: '/images/solo-vivo.webp'
    },
    {
        name: 'Biodiversidade',
        description: 'Espécies, habitats e redes de vida. O inventário do que existe e do que está a desaparecer. Base de toda a resiliência ecológica.',
        globalUrl: '/recursos/biodiversity.html',
        ptUrl: '/recursos/biodiversidade.html',
        hasPt: true,
        image: '/images/biodiversidade-teia-viva.webp'
    }
];

function renderRecursos() {
    const grid = document.getElementById('recursos-grid');
    if (!grid) return;

    grid.innerHTML = recursos.map(r => `
        <article class="recurso-card">
            <div class="recurso-thumb" style="background-image:url('${r.image}')"></div>
            <div class="recurso-body">
                <h3 class="recurso-name">${r.name}</h3>
                <p class="recurso-desc">${r.description}</p>
                <div class="recurso-links">
                    <a class="recurso-link" href="${r.globalUrl}">Observatório Global →</a>
                    ${r.hasPt
                        ? `<a class="recurso-link link-pt" href="${r.ptUrl}">Portugal + Ilhas →</a>`
                        : `<span class="recurso-link link-na">Portugal + Ilhas — em breve</span>`
                    }
                </div>
            </div>
        </article>
    `).join('');
}

document.addEventListener('DOMContentLoaded', renderRecursos);
