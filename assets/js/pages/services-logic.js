const servicesData = {
    "biofossas": {
        "title": "Circuito de Depuração",
        "diagram": "/assets/images/diagrams/biofossa-panoramic.webp",
        "nodes": [
            { "label": "1. Primário", "text": "Biodigestor anaeróbio." },
            { "label": "2. Filtração", "text": "Filtro biológico ativo." }
        ]
    }
};

$(document).ready(function() {
    // Carregar Sidebar
    fetch("/sidebar-content.html").then(r => r.text()).then(html => {
        $("#sidebar").html(html);
    });

    // Injeção de componentes técnicos pode ser feita aqui
});
