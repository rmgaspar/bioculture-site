import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync("config/paises-excluidos.json", "utf8"));

test("Os países excluídos não aparecem nas listas de dados (seletores, séries, aeroportos)", () => {
  assert.ok(config.ficheiros.length > 0);
  for (const nome of config.ficheiros) {
    const dados = JSON.parse(readFileSync(`data/${nome}`, "utf8"));
    const texto = JSON.stringify(dados);
    for (const iso3 of config.iso3) assert.ok(!texto.includes(`"${iso3}"`), `${nome}: ainda tem ${iso3}`);
    for (const nomePais of config.nomes) assert.ok(!texto.includes(`"${nomePais}"`), `${nome}: ainda tem ${nomePais}`);
    for (const m49 of config.m49) assert.ok(!texto.includes(`"m49":"${m49}"`), `${nome}: ainda tem o M49 ${m49}`);
    if (nome === "aeroportos.json") {
      const linhas = dados.aeroportos.filter((r) => config.iso2.includes(r[4]));
      assert.equal(linhas.length, 0, "aeroportos de países excluídos");
    }
    for (const lista of ["entities", "observations"]) {
      const contador = lista === "entities" ? "entity_count" : "observation_count";
      if (Array.isArray(dados[lista]) && dados[contador] !== undefined) assert.equal(dados[contador], dados[lista].length, `${nome}: ${contador}`);
    }
  }
});

test("Os scripts de dados aplicam o filtro ao escrever", () => {
  const comum = readFileSync("scripts/dados/comum.py", "utf8");
  assert.match(comum, /excluidos\.aplicar/);
});
