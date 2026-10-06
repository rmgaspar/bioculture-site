#!/usr/bin/env python3
"""Atualiza energia, renováveis/território e ar a partir da API do Banco Mundial.

Ficheiros: data/{energy,renewables-territory}-{timeseries,countries,overview}.json e
data/air-{timeseries,countries,overview}.json (+ datas em *-meta/-sources).

Uso: python3 scripts/dados/banco_mundial.py [--dry-run]
"""
import argparse
import sys
from collections import OrderedDict

import comum

from comum import ErroDados, escrever_se_mudou, hoje, ler, obter_json, sair_com_erro, verificar_perda

API = "https://api.worldbank.org/v2/country/all/indicator/{indicador}?format=json&per_page=20000&date=1960:2035&page={pagina}"


def observacoes_wb(indicador):
    """Todas as observações com valor, tal como a API as devolve (geografia, ano, valor)."""
    linhas, pagina = [], 1
    while True:
        resposta = obter_json(API.format(indicador=indicador, pagina=pagina))
        if not isinstance(resposta, list) or len(resposta) < 2 or resposta[1] is None:
            raise ErroDados(f"Resposta inesperada do Banco Mundial para {indicador}")
        meta, dados = resposta
        linhas += dados
        if pagina >= int(meta.get("pages", 1)):
            break
        pagina += 1
    saida = []
    for linha in linhas:
        if linha.get("value") is None:
            continue
        saida.append({
            "code": linha.get("countryiso3code") or "",
            "name": linha["country"]["value"],
            "year": int(linha["date"]),
            "value": linha["value"],
        })
    return saida


# ----------------------------------------------------------------- energia
ENERGIA = [
    ("7.1.1", "EG.ELC.ACCS.ZS", "electricity_access_pct", "%"),
    ("7.2.1", "EG.FEC.RNEW.ZS", "renewable_final_energy_pct", "%"),
    ("7.3.1", "EG.EGY.PRIM.PP.KD", "energy_intensity_mj_per_usd", "MJ/USD"),
]
RENOVAVEIS = [
    ("renewable_electricity_pct", "EG.ELC.RNEW.ZS"),
    ("terrestrial_protected_pct", "ER.LND.PTLD.ZS"),
    ("marine_protected_pct", "ER.MRN.PTMR.ZS"),
]
AR = [
    ("pm25_mean_annual_exposure", "EN.ATM.PM25.MC.M3"),
    ("air_pollution_mortality_rate", "SH.STA.AIRP.P5"),
]


def entidades(observacoes, chave_indicador, unidades, campo_codigo):
    """Último valor de cada indicador por geografia, ordenado por nome."""
    ultimo = {}
    for o in observacoes:
        geo = (o["geography"][campo_codigo], o["geography"]["name"])
        indicador = o[chave_indicador]
        atual = ultimo.setdefault(geo, {}).get(indicador)
        if atual is None or o["year"] > atual["year"]:
            ultimo[geo][indicador] = {"year": o["year"], "value": o["value"], **({"unit": unidades[indicador]} if unidades else {})}
    saida = []
    for (codigo, nome), valores in sorted(ultimo.items(), key=lambda item: item[0][1]):
        saida.append({"geography": {campo_codigo: codigo, "name": nome}, "latest": valores})
    return saida


def atualizar_energia():
    antigo = ler("energy-timeseries.json")["observations"]
    obs = []
    for sdg, wb, chave, unidade in ENERGIA:
        for o in observacoes_wb(wb):
            obs.append(OrderedDict([
                ("indicator", sdg), ("key", chave),
                ("geography", {"code": o["code"], "name": o["name"]}),
                ("year", o["year"]), ("value", o["value"]), ("unit", unidade),
                ("source", "World Bank / SDG 7 custodians"),
            ]))
    ordem = {sdg: i for i, (sdg, *_resto) in enumerate(ENERGIA)}
    obs.sort(key=lambda o: (ordem[o["indicator"]], o["geography"]["code"], o["year"]))
    verificar_perda("energy-timeseries", len(antigo), len(obs))
    unidades = {chave: unidade for _s, _w, chave, unidade in ENERGIA}
    ents = entidades(obs, "key", unidades, "code")
    mundo = next((e for e in ents if e["geography"]["code"] == "WLD"), None)
    if mundo is None:
        raise ErroDados("energia: o Mundo (WLD) não veio na resposta")
    visao = {
        "updated": hoje(), "geography": "World",
        "headline_metrics": {chave: mundo["latest"][chave] for _s, _w, chave, _u in ENERGIA if chave in mundo["latest"]},
        "coverage": {sdg: sum(1 for o in obs if o["indicator"] == sdg) for sdg, *_r in ENERGIA},
    }
    alterados = [
        escrever_se_mudou("energy-timeseries.json", {"observations": obs}, True),
        escrever_se_mudou("energy-countries.json", {"entities": ents}, True),
        escrever_se_mudou("energy-overview.json", visao, True, ("updated",)),
    ]
    if any(alterados):
        meta = ler("energy-meta.json"); meta["generated"] = hoje()
        escrever_se_mudou("energy-meta.json", meta)
    return any(alterados), len(obs)


def atualizar_renovaveis():
    antigo = ler("renewables-territory-timeseries.json")["observations"]
    obs = []
    for chave, wb in RENOVAVEIS:
        for o in observacoes_wb(wb):
            obs.append(OrderedDict([
                ("key", chave), ("indicator", wb),
                ("geography", {"code": o["code"], "name": o["name"]}),
                ("year", o["year"]), ("value", o["value"]), ("unit", "%"),
                ("source", "World Bank Open Data"),
            ]))
    obs.sort(key=lambda o: (o["key"], o["geography"]["code"], o["year"]))
    verificar_perda("renewables-territory-timeseries", len(antigo), len(obs))
    unidades = {chave: "%" for chave, _w in RENOVAVEIS}
    ents = entidades(obs, "key", unidades, "code")
    mundo = next((e for e in ents if e["geography"]["code"] == "WLD"), None)
    if mundo is None:
        raise ErroDados("renováveis: o Mundo (WLD) não veio na resposta")
    visao = {
        "geography": "World", "updated": hoje(),
        "headline_metrics": {chave: mundo["latest"][chave] for chave, _w in RENOVAVEIS if chave in mundo["latest"]},
        "coverage": {chave: sum(1 for o in obs if o["key"] == chave) for chave, _w in RENOVAVEIS},
    }
    alterados = [
        escrever_se_mudou("renewables-territory-timeseries.json", {"observations": obs}, True),
        escrever_se_mudou("renewables-territory-countries.json", {"entities": ents}, True),
        escrever_se_mudou("renewables-territory-overview.json", visao, True, ("updated",)),
    ]
    if any(alterados):
        meta = ler("renewables-territory-meta.json"); meta["generated"] = hoje()
        escrever_se_mudou("renewables-territory-meta.json", meta)
    return any(alterados), len(obs)


def atualizar_ar():
    antigo = ler("air-timeseries.json")
    obs = []
    for chave, wb in AR:
        try:
            linhas = observacoes_wb(wb)
        except ErroDados as erro:
            # Se um indicador estiver indisponível na API, mantém-se o que já tínhamos (dados reais
            # anteriores) e o aviso fica visível nos registos da execução.
            print(f"::warning::ar/{chave}: API indisponível, mantidos os dados anteriores ({erro})", flush=True)
            obs += [o for o in antigo["observations"] if o["indicator_id"] == chave]
            continue
        for o in linhas:
            obs.append(OrderedDict([
                ("indicator_id", chave),
                ("geography", {"iso3": o["code"], "name": o["name"]}),
                ("year", o["year"]), ("value", o["value"]),
            ]))
    # A ordem é a da API (por nome do país, do ano mais recente para o mais antigo), por indicador.
    verificar_perda("air-timeseries", antigo["observation_count"], len(obs))
    ents = entidades(
        [{"indicator_id": o["indicator_id"], "geography": o["geography"], "year": o["year"], "value": o["value"]} for o in obs],
        "indicator_id", None, "iso3",
    )
    mundo = next((e for e in ents if e["geography"]["iso3"] == "WLD"), None)
    if mundo is None:
        raise ErroDados("ar: o Mundo (WLD) não veio na resposta")
    # A lista de geografias exclui o Mundo (vai só na síntese) e os grupos de rendimento (sem código ISO3).
    ents = [e for e in ents if e["geography"]["iso3"] not in ("", "WLD")]
    visao = ler("air-overview.json")
    visao["headline_metrics"] = [
        {"indicator_id": chave, "geography": {"iso3": "WLD", "name": "World"}, **mundo["latest"][chave]}
        for chave, _w in AR if chave in mundo["latest"]
    ]
    visao["generated_at"] = hoje()
    alterados = [
        escrever_se_mudou("air-timeseries.json", {"generated_at": hoje(), "observation_count": len(obs), "observations": obs}, False, ("generated_at",)),
        escrever_se_mudou("air-countries.json", {"generated_at": hoje(), "entity_count": len(ents), "entities": ents}, False, ("generated_at",)),
        escrever_se_mudou("air-overview.json", visao, False, ("generated_at",)),
    ]
    if any(alterados):
        for nome in ("air-meta.json", "air-sources.json"):
            ficheiro = ler(nome); ficheiro["generated_at"] = hoje()
            for fonte in ficheiro.get("sources", []):
                if fonte.get("id") == "world_bank_wdi":
                    fonte["retrieved_at"] = hoje()
            escrever_se_mudou(nome, ficheiro, False, ("generated_at", "retrieved_at"))
    return any(alterados), len(obs)


CONJUNTOS = {"energia": atualizar_energia, "renovaveis": atualizar_renovaveis, "ar": atualizar_ar}


def main():
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--dry-run", action="store_true", help="não escreve; só indica o que mudaria")
    argumentos.add_argument("--only", default=",".join(CONJUNTOS), help="lista separada por vírgulas: " + ", ".join(CONJUNTOS))
    opcoes = argumentos.parse_args()
    comum.SECO = opcoes.dry_run
    falhas = []
    for nome in [n.strip() for n in opcoes.only.split(",") if n.strip()]:
        try:
            mudou, total = CONJUNTOS[nome]()
            print(f"{nome}: {total} observações — {'atualizado' if mudou else 'sem alterações'}", flush=True)
        except ErroDados as erro:
            # Um conjunto com problemas não impede os restantes de se atualizarem.
            print(f"{nome}: FALHOU — {erro}", file=sys.stderr, flush=True)
            falhas.append(nome)
    if falhas:
        sys.exit(2)


if __name__ == "__main__":
    main()
