import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const dicas = JSON.parse(readFileSync("data/dicas.json", "utf8"));
const campo = JSON.parse(readFileSync("data/trabalhos-campo.json", "utf8")).trabalhos;
const en = JSON.parse(readFileSync("assets/lang/auto/en.json", "utf8"));
const comFontes = dicas.filter((d) => d.fontes);

test("As técnicas de poda, enxertia, azeitona e lavoura têm época, passos e fontes com ligação", () => {
  const ids = ["lavoura-e-mobilizacao", "infestantes-corte-extracao", "poda-arvores-fruto", "enxertia", "colheita-azeitona", "poda-oliveira"];
  for (const id of ids) {
    const d = dicas.find((x) => x.id === id);
    assert.ok(d, id);
    assert.ok(d.quando && d.passos.length >= 5, `${id}: época e passos`);
    assert.ok(d.fontes?.length >= 1, `${id}: fontes`);
    for (const f of d.fontes) assert.match(f.url, /^https:\/\//, `${id}: ${f.nome}`);
  }
  assert.equal(new Set(dicas.map((d) => d.id)).size, dicas.length, "ids repetidos");
  assert.ok(comFontes.length >= 6);
});

test("Os textos novos das técnicas têm tradução para inglês", () => {
  for (const d of comFontes) {
    for (const texto of [d.titulo, d.resumo, d.quando, ...d.passos]) assert.ok(en[texto], `${d.id}: sem EN para «${texto.slice(0, 50)}»`);
  }
});

test("Cada trabalho de campo tem meses válidos, texto nas duas línguas e destino que existe", () => {
  assert.ok(campo.length >= 10);
  const ids = new Set(dicas.map((d) => d.id));
  for (const t of campo) {
    assert.ok(t.meses.length && t.meses.every((m) => Number.isInteger(m) && m >= 0 && m <= 11), `${t.id}: meses`);
    for (const k of ["titulo", "curto", "titulo_en", "curto_en"]) assert.ok(t[k], `${t.id}: ${k}`);
    assert.ok(t.tecnica || t.href, `${t.id}: sem destino`);
    if (t.tecnica) assert.ok(ids.has(t.tecnica), `${t.id}: técnica ${t.tecnica} não existe`);
    if (t.href) assert.ok(existsSync(t.href.split("#")[0].replace(/^\//, "") + (t.href.includes(".html") ? "" : ".html")), `${t.id}: ${t.href}`);
  }
  const meses = new Set(campo.flatMap((t) => t.meses));
  assert.ok([0, 1, 2, 3, 8, 9, 10, 11].every((m) => meses.has(m)), "meses de poda, enxertia, vindima e azeitona cobertos");
});
