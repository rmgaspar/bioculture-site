$(document).ready(function() {
    // 1. Carregar Sidebar
    fetch("/sidebar-content.html").then(r => r.text()).then(html => {
        $("#sidebar").html(html);
    });

    // 2. Carregar e Renderizar Serviços
    fetch("/data/services.json").then(r => r.json()).then(data => {
        const container = $("#services-container");
        data.services.forEach(s => {
            container.append(`
                <article class="service-card">
                    <div class="service-icon" aria-hidden="true">${s.symbol}</div>
                    <h3>${s.titulo}</h3>
                    <p>${s.descricao}</p>
                    <div class="service-highlight">
                        <p>${s.destaque}</p>
                    </div>
                    <a href="${s.href}" class="btn-solicitar">Abrir blueprint →</a>
                </article>
            `);
        });
    });
});
