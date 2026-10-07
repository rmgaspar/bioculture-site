#!/usr/bin/env python3
"""Gera data/paises-iso.json: lista de países reais (sem agregados) com ISO3, ISO2, código M49, região e grupo de rendimento.

Fontes: API do Banco Mundial (países e classificações; os agregados são excluídos); «soberano» = Estado independente na tabela ISO 3166-1 e a tabela
ISO 3166-1 do projeto datasets/country-codes (código numérico = código M49 usado pela ONU).
É uma tabela de referência: só precisa de ser regenerada se mudarem os países.
"""
import csv
import io
import urllib.request

import comum

URL_CODIGOS = "https://raw.githubusercontent.com/datasets/country-codes/main/data/country-codes.csv"


def main():
    wb = comum.obter_json("https://api.worldbank.org/v2/country?format=json&per_page=400")[1]
    pedido = urllib.request.Request(URL_CODIGOS, headers={"User-Agent": comum.USER_AGENT})
    with urllib.request.urlopen(pedido, timeout=60) as resposta:
        tabela = list(csv.DictReader(io.StringIO(resposta.read().decode("utf-8"))))
    m49 = {linha["ISO3166-1-Alpha-3"]: linha["ISO3166-1-numeric"] for linha in tabela if linha["ISO3166-1-Alpha-3"]}
    independentes = {linha["ISO3166-1-Alpha-3"] for linha in tabela if linha["is_independent"].startswith("Yes")}
    paises = {}
    for p in wb:
        if p["region"]["value"] == "Aggregates":
            continue
        codigo = m49.get(p["id"])
        paises[p["id"]] = {
            "iso2": p["iso2Code"],
            "m49": f"{int(codigo):03d}" if codigo else None,
            "nome": p["name"],
            "regiao": p["region"]["id"],
            "rendimento": p["incomeLevel"]["id"],
            "soberano": p["id"] in independentes,
        }
    saida = {"fonte": "World Bank API v2 /country (países, sem agregados); ISO 3166-1 numérico = M49 (datasets/country-codes)",
             "gerado": comum.hoje(), "paises": dict(sorted(paises.items()))}
    comum.escrever_se_mudou("paises-iso.json", saida, compacto=False, campos_data=("gerado",))
    print(f"{len(paises)} países; sem M49: {[k for k, v in paises.items() if not v['m49']]}")


if __name__ == "__main__":
    main()
