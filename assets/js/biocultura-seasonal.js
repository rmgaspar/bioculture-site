/* Lógica sazonal partilhada pelo Calendário (calendario-calendario-2.js) e por «Este mês no teu território»
   (index-month.js): janelas de sementeira e colheita, estação, compatibilidade com o pH da localidade,
   práticas do mês e pragas da estação. Os meses são índices 0–11 (janeiro = 0). */
(function () {
    "use strict";

    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const normalizedMonths = months.map(normalize);

    // Fronteiras astronómicas aproximadas (equinócios e solstícios, hemisfério norte).
    function seasonKey(month, day = 15) {
        const md = month * 100 + day;
        if (md >= 1121 || md < 220) return "inverno";
        if (md < 521) return "primavera";
        if (md < 823) return "verao";
        return "outono";
    }

    // Texto de período («março–maio», «outubro–dezembro, por dentes», «todo o ano»…) contém o mês?
    function periodMatches(text, month) {
        const source = normalize(text).replace(/[–—]/g, "-");
        if (!source) return false;
        if (/todo o ano|durante todo o ano|sempre/.test(source)) return true;
        return source.split(/\s+e\s+|;/).some((segment) => {
            // Meses pela ordem em que aparecem no texto («outubro–março» começa em outubro e atravessa o ano).
            const found = normalizedMonths
                .map((name, index) => ({ index, at: segment.indexOf(name) }))
                .filter((entry) => entry.at >= 0)
                .sort((x, y) => x.at - y.at)
                .map((entry) => entry.index);
            if (!found.length) return false;
            if (found.includes(month)) return true;
            if (found.length >= 2) {
                const start = found[0], end = found.at(-1);
                return start <= end ? month >= start && month <= end : month >= start || month <= end;
            }
            return false;
        });
    }

    // pH da localidade dentro do intervalo da cultura (com 0,3 de folga); sem dados, considera-se compatível.
    function phMatches(item, ph) {
        if (!Number.isFinite(ph)) return true;
        const nums = String(item.ph_solo || "").replace(",", ".").match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
        return nums.length < 2 || (ph >= nums[0] - 0.3 && ph <= nums[1] + 0.3);
    }

    // Culturas cuja janela («sementeira» ou «colheita») inclui o mês: pH compatível primeiro e, a seguir,
    // as de janela específica antes das de «quase todo o ano» (pouco informativas). Sem repetir nomes.
    function cropsFor(db, field, month, ph, limit = 6) {
        const generic = (item) => Number(/todo o ano/.test(normalize(item[field])));
        const unique = new Map();
        Object.entries(db || {})
            .filter(([, item]) => periodMatches(item[field], month))
            .sort((a, b) => (Number(phMatches(b[1], ph)) - Number(phMatches(a[1], ph))) || (generic(a[1]) - generic(b[1])))
            .forEach((entry) => {
                const key = normalize(entry[1].nome || entry[0]);
                if (key && !unique.has(key)) unique.set(key, entry);
            });
        return [...unique.values()].slice(0, limit);
    }

    // Identificadores das técnicas (data/dicas.json) sugeridas para cada fase do ano.
    function practiceIds(month) {
        if ([11, 0, 1].includes(month)) return ["rotacao-culturas", "teste-germinacao", "sebe-viva", "abrigo-insetos", "higiene-ferramentas", "composto-frio"];
        if ([2, 3, 4].includes(month)) return ["sementeira-direta", "sementeira-sucessiva", "consociacao", "corredor-floral", "monitorizacao-pragas", "rega-gota-a-gota"];
        if ([5, 6, 7].includes(month)) return ["mulching-organico", "rega-profunda", "olla", "guardar-sementes", "faixa-nao-cortada", "registos-horta"];
        return ["adubo-verde", "solo-sempre-com-raiz", "folhas-molde", "captacao-chuva", "composto-superficie", "zonas-tampao"];
    }

    function seasonalPests(pests, month, day = 15) {
        const keywords = {
            inverno: ["inverno", "todo o ano", "protegidas"],
            primavera: ["primavera", "tempo ameno", "rebentos"],
            verao: ["verao", "tempo quente", "calor", "seco"],
            outono: ["outono", "humidade", "chuva"],
        }[seasonKey(month, day)].map(normalize);
        return (pests || []).filter((item) => {
            const text = normalize(`${item.sazonalidade_portugal || ""} ${item.quando || ""}`);
            return keywords.some((key) => text.includes(key)) || periodMatches(text, month);
        });
    }

    window.BioCulturaSeasonal = Object.freeze({ months, normalize, seasonKey, periodMatches, phMatches, cropsFor, practiceIds, seasonalPests });
})();
