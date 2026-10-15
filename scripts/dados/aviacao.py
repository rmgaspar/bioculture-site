#!/usr/bin/env python3
"""Dados da página «Aviação» (energia/aviacao.html).

  data/aviacao-portugal.json  Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2): CO₂ do transporte
                              aéreo (NACE H51), da economia (TOTAL) e da economia mais famílias (TOTAL_HH), Portugal.
  data/aeroportos.json        OurAirports (domínio público): aeroportos com serviço regular e código IATA.

Os fatores por passageiro-quilómetro (DESNZ 2025) e os textos editoriais ficam em data/aviacao.json, que este
script não toca.

  python3 scripts/dados/aviacao.py [--dry-run] [--only portugal,aeroportos]
"""
import argparse
import csv
import io
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
UA = "bioCulture-dados/1.0 (+https://www.bioculture.pt)"
EUROSTAT = ("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_ac_ainah_r2"
            "?format=JSON&lang=EN&geo=PT&airpol=CO2&unit=THS_T&nace_r2={nace}")
OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv"
TIPOS = {"large_airport", "medium_airport", "small_airport"}
# Nomes de cidade em português para os destinos mais pesquisados; o resto fica com o nome da fonte.
CIDADES_PT = {
    "Lisbon": "Lisboa", "London": "Londres", "New York": "Nova Iorque", "Brussels": "Bruxelas",
    "Geneva": "Genebra", "Zurich": "Zurique", "Vienna": "Viena", "Munich": "Munique", "Cologne": "Colónia",
    "Moscow": "Moscovo", "Warsaw": "Varsóvia", "Prague": "Praga", "Athens": "Atenas", "Rome": "Roma",
    "Milan": "Milão", "Venice": "Veneza", "Naples": "Nápoles", "Copenhagen": "Copenhaga", "Seville": "Sevilha",
    "Cairo": "Cairo", "Marrakesh": "Marraquexe", "Casablanca": "Casablanca", "Tokyo": "Tóquio",
    "Beijing": "Pequim", "Singapore": "Singapura", "Sao Paulo": "São Paulo", "São Paulo": "São Paulo",
    "Rio De Janeiro": "Rio de Janeiro", "Mexico City": "Cidade do México", "Havana": "Havana",
    "Dubai": "Dubai", "Frankfurt am Main": "Frankfurt", "Istanbul": "Istambul", "Saint Petersburg": "São Petersburgo",
    "Edinburgh": "Edimburgo", "Dublin": "Dublin", "Amsterdam": "Amesterdão", "Luxembourg": "Luxemburgo",
}


def obter(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
        return r.read()


def serie_eurostat(nace):
    d = json.loads(obter(EUROSTAT.format(nace=nace)))
    anos = d["dimension"]["time"]["category"]["index"]
    flags = d.get("status", {})
    valores, notas = {}, {}
    for ano, i in anos.items():
        v = d["value"].get(str(i))
        if v is not None:
            valores[ano] = round(v, 1)
        if str(i) in flags:
            notas[ano] = flags[str(i)]
    return valores, notas


def portugal():
    out = {"meta": {"fonte": "Eurostat, env_ac_ainah_r2 (Air emissions accounts by NACE Rev. 2 activity)",
                    "url": "https://ec.europa.eu/eurostat/databrowser/view/env_ac_ainah_r2/default/table?lang=en",
                    "unidade": "kt CO2", "obtido": date.today().isoformat()}, "series": {}, "notas": {}}
    for chave, nace in (("transporte_aereo", "H51"), ("economia", "TOTAL"), ("economia_familias", "TOTAL_HH")):
        v, n = serie_eurostat(nace)
        if len(v) < 25:
            sys.exit(f"Eurostat devolveu poucos anos para {nace}: {len(v)}")
        out["series"][chave] = v
        if n:
            out["notas"][chave] = n
    return out


def limpar(txt):
    return re.sub(r"\s*\(.*?\)\s*$", "", txt or "").strip()


def aeroportos():
    linhas = csv.DictReader(io.StringIO(obter(OURAIRPORTS).decode("utf-8")))
    saida = []
    for r in linhas:
        if r["scheduled_service"] != "yes" or not r["iata_code"] or r["type"] not in TIPOS:
            continue
        cidade = limpar(r["municipality"]) or r["name"]
        cidade = {"Frankfurt am Main": "Frankfurt"}.get(cidade, cidade)
        nome = r["name"].replace(" International Airport", "").replace(" Airport", "")
        saida.append([r["iata_code"], CIDADES_PT.get(cidade, cidade), cidade if cidade in CIDADES_PT else "",
                      nome, r["iso_country"], round(float(r["latitude_deg"]), 3), round(float(r["longitude_deg"]), 3),
                      r["continent"]])
    saida.sort(key=lambda x: x[0])
    if len({a[0] for a in saida}) != len(saida) or len(saida) < 3500:
        sys.exit(f"Lista de aeroportos suspeita: {len(saida)}")
    return {"meta": {"fonte": "OurAirports (domínio público)", "url": "https://ourairports.com/data/",
                     "obtido": date.today().isoformat(),
                     "campos": ["iata", "cidade", "cidade_en", "nome", "pais", "lat", "lon", "continente"]},
            "aeroportos": saida}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="portugal,aeroportos")
    a = ap.parse_args()
    alvo = {"portugal": ("aviacao-portugal.json", portugal), "aeroportos": ("aeroportos.json", aeroportos)}
    for k in a.only.split(","):
        ficheiro, fn = alvo[k]
        dados = fn()
        texto = json.dumps(dados, ensure_ascii=False, separators=(",", ":") if k == "aeroportos" else None,
                           indent=None if k == "aeroportos" else 1) + "\n"
        print(k, len(texto), "bytes")
        if not a.dry_run:
            (RAIZ / "data" / ficheiro).write_text(texto, encoding="utf-8")


if __name__ == "__main__":
    main()
