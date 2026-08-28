(function () {
    const byId = (id) => document.getElementById(id);
    const isEnglish = document.documentElement.lang === "en";
    fetch("/sidebar-content.html?v=23").then((r) => r.text()).then((html) => { byId("sidebar").innerHTML = html; });

    const solarTool = document.querySelector(".solar-tool");
    if (solarTool && !document.querySelector(".solar-layout")) {
        const layout = document.createElement("div");
        layout.className = "solar-layout";
        const figure = document.createElement("figure");
        figure.className = "blueprint-figure solar-figure";
        figure.innerHTML = `<img src="/images/solar-home-battery-v1.png" alt="${isEnglish ? "Domestic photovoltaic system with hybrid inverter, battery and essential loads" : "Sistema fotovoltaico doméstico com inversor híbrido, bateria e cargas essenciais"}"><figcaption>${isEnglish ? "bioCulture concept — panels, inverter, battery and grid must be sized and protected by qualified professionals." : "Esquema conceptual bioCulture — painéis, inversor, bateria e rede devem ser dimensionados e protegidos por profissionais habilitados."}</figcaption>`;
        solarTool.before(layout);
        layout.append(figure, solarTool);
    }

    const backupInput = byId("in-backup");
    const batteryCard = backupInput?.closest(".input-check");
    if (backupInput && batteryCard) {
        const labelText = isEnglish ? "Include battery for essential loads" : "Incluir bateria para cargas essenciais";
        const state = document.createElement("span");
        state.className = "battery-state";
        state.id = "battery-state";
        const choice = backupInput.parentElement;
        choice.className = "battery-choice";
        backupInput.after(Object.assign(document.createElement("span"), { className: "battery-switch" }));
        choice.append(Object.assign(document.createElement("strong"), { textContent: labelText }));
        Array.from(choice.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        batteryCard.append(state);

        const updateBatteryState = () => {
            batteryCard.classList.toggle("is-selected", backupInput.checked);
            state.textContent = backupInput.checked
                ? (isEnglish ? "Battery included · essential-load backup" : "Bateria incluída · backup de cargas essenciais")
                : (isEnglish ? "No battery · direct self-consumption" : "Sem bateria · autoconsumo direto");
            if (!byId("solar-results-area")?.hidden) byId("calculate-solar")?.click();
        };
        backupInput.addEventListener("change", updateBatteryState);
        updateBatteryState();
    }

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
