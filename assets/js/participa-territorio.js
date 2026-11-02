/* Consultas públicas no território do utilizador.
   Lê a localidade escolhida em «O teu território» (BioCultureRegion, sem carregar o ficheiro
   completo de localidades) e cruza-a com as consultas de data/zaer_critico.json.
   Uso: BioCultureParticipaLocal.match(zaerData).then(({ region, concelho, distrito, nacional }) => …) */
(function () {
    "use strict";
    const norm = (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const title = (v) => String(v || "").replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
        .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (w) => w.toLowerCase());
    const ISLANDS = /acores|madeira/;

    function consultations(data) {
        const c = (data && data.consultas_participa) || {};
        return [...(c.abertas || []), ...(c.em_analise || [])].filter((x) => !x.alerta_qualidade);
    }

    window.BioCultureParticipaLocal = {
        title,
        match(data) {
            const all = consultations(data);
            const loader = window.BioCultureRegion ? window.BioCultureRegion.load({ fallback: false }) : Promise.resolve([]);
            return loader.then((rows) => {
                const region = rows && rows[0];
                if (!region || !region.concelho) return { region: null, concelho: [], distrito: [], nacional: [] };
                const mun = norm(region.concelho), dist = norm(region.distrito);
                const concelho = all.filter((x) => (x.municipios || []).some((m) => norm(m) === mun));
                const distrito = all.filter((x) => !concelho.includes(x) && (x.distritos || []).some((d) => norm(d) === dist));
                const nacional = all.filter((x) => {
                    const scope = norm(x.ambito);
                    if (!scope.startsWith("nacional")) return false;
                    return !(scope.includes("continental") && ISLANDS.test(dist));
                });
                return { region, concelho, distrito, nacional };
            }).catch(() => ({ region: null, concelho: [], distrito: [], nacional: [] }));
        },
    };
})();
