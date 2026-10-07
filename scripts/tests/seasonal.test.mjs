import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

// A lógica sazonal partilhada (Calendário e «Este mês no teu território») corre no navegador; aqui carrega-se com um `window` falso.
const context = { window: {} };
vm.createContext(context);
vm.runInContext(readFileSync(new URL("../../assets/js/biocultura-seasonal.js", import.meta.url), "utf8"), context);
const S = context.window.BioCulturaSeasonal;

test("periodMatches lê intervalos, listas e janelas que atravessam o ano", () => {
    assert.equal(S.periodMatches("março–maio, em abrigo no início", 3), true);
    assert.equal(S.periodMatches("março–maio", 5), false);
    assert.equal(S.periodMatches("outubro–março", 0), true);
    assert.equal(S.periodMatches("outubro–março", 5), false);
    assert.equal(S.periodMatches("fevereiro–junho e agosto–outubro", 8), true);
    assert.equal(S.periodMatches("quase todo o ano; evitar extremos", 6), true);
    assert.equal(S.periodMatches("", 6), false);
});

test("seasonKey usa os equinócios e solstícios aproximados", () => {
    assert.equal(S.seasonKey(2, 19), "inverno");
    assert.equal(S.seasonKey(2, 20), "primavera");
    assert.equal(S.seasonKey(5, 21), "verao");
    assert.equal(S.seasonKey(8, 23), "outono");
    assert.equal(S.seasonKey(11, 21), "inverno");
});

test("cropsFor: pH compatível primeiro, janelas específicas antes de «todo o ano» e sem nomes repetidos", () => {
    const db = {
        a: { nome: "Alface", sementeira: "quase todo o ano", ph_solo: "6,0–7,0" },
        b: { nome: "Alho", sementeira: "outubro–dezembro", ph_solo: "6,0–7,0" },
        c: { nome: "Fava", sementeira: "outubro–janeiro", ph_solo: "7,5–8,0" },
        d: { nome: "Alho", sementeira: "outubro–dezembro", ph_solo: "6,0–7,0" },
        e: { nome: "Tomate", sementeira: "março–maio", ph_solo: "6,0–7,0" },
    };
    assert.deepEqual(Array.from(S.cropsFor(db, "sementeira", 9, 6.5), ([, item]) => item.nome), ["Alho", "Alface", "Fava"]);
    assert.equal(S.cropsFor(db, "sementeira", 9, 6.5, 1).length, 1);
    assert.equal(S.phMatches({ ph_solo: "5,8–7,0" }, NaN), true);
});

test("practiceIds devolve seis técnicas por estação e seasonalPests filtra pela estação", () => {
    for (let month = 0; month < 12; month++) assert.equal(S.practiceIds(month).length, 6);
    const pests = [{ id: "x", sazonalidade_portugal: "primavera e outono" }, { id: "y", sazonalidade_portugal: "verão quente" }];
    assert.deepEqual(Array.from(S.seasonalPests(pests, 9), (item) => item.id), ["x"]);
});
