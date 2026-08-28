(function () {
    const byId = (id) => document.getElementById(id);
    fetch("/sidebar-content.html?v=23").then((r) => r.text()).then((html) => { byId("sidebar").innerHTML = html; });
    byId("calculate-solar")?.addEventListener("click", function () {
        const bill = Number(byId("in-fatura").value);
        const presence = Number(byId("in-presenca").value);
        const backup = byId("in-backup").checked;
        if (!bill || bill < 1) { byId("in-fatura").focus(); return; }
        const monthlyKwh = bill / 0.22;
        const rawKwp = ((monthlyKwh / 30) / 4.5) * 1.15 / presence;
        const panels = Math.max(2, Math.ceil((rawKwp * 1000) / 520));
        const kwp = panels * 0.52;
        const indicative = kwp * 1100 + (backup ? 2400 : 0);
        byId("res-label-tipo").textContent = backup ? "Autoconsumo com backup" : "Autoconsumo direto";
        byId("res-kwp").textContent = kwp.toFixed(2).replace(".", ",") + " kWp";
        byId("res-paineis").textContent = panels + " × 520 W";
        byId("res-preco").textContent = indicative.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
        byId("res-bateria").textContent = backup ? "≈ 5 kWh LiFePO4" : "Não incluído";
        byId("solar-results-area").hidden = false;
    });
})();
