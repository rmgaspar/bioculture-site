#!/usr/bin/env python3
"""Dados da página «Aviação» (energia/aviacao.html).

  data/aviacao-portugal.json  Eurostat, contas de emissões atmosféricas (env_ac_ainah_r2): CO₂ do transporte
                              aéreo (NACE H51), da economia (TOTAL) e da economia mais famílias (TOTAL_HH), Portugal.
  data/aeroportos.json        OurAirports (domínio público): aeroportos com serviço regular e código IATA.
  data/aviacao-rotas-portugal.json
                              Eurostat (avia_par_pt): passageiros, voos e lugares por rota entre os aeroportos
                              principais de Portugal e os seus parceiros, no último ano; distância em círculo máximo
                              (coordenadas OurAirports); aquecimento das casas portuguesas (nrg_d_hhq) e número de
                              casas (lfst_hhnhtych), para as equivalências.

Os fatores por passageiro-quilómetro (DESNZ 2025) e os textos editoriais ficam em data/aviacao.json, que este
script não toca.

  python3 scripts/dados/aviacao.py [--dry-run] [--only portugal,aeroportos,rotas]
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


def haversine(a, b):
    from math import asin, cos, radians, sin, sqrt
    dlat, dlon = radians(b[0] - a[0]), radians(b[1] - a[1])
    h = sin(dlat / 2) ** 2 + cos(radians(a[0])) * cos(radians(b[0])) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(min(1, sqrt(h)))


def estat(dataset, **q):
    partes = [("format", "JSON"), ("lang", "EN")] + [(k, v) for k, vs in q.items() for v in (vs if isinstance(vs, list) else [vs])]
    return json.loads(obter("https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/" + dataset + "?" + "&".join(f"{k}={v}" for k, v in partes)))


def planas(d):
    """Linhas {dimensão: código, 'v': valor} de uma resposta JSON-stat do Eurostat."""
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    for flat, v in d["value"].items():
        flat = int(flat)
        idx = {}
        for k, sz in reversed(list(zip(ids, tam))):
            idx[k] = flat % sz
            flat //= sz
        yield {k: cats[k][i] for k, i in idx.items()} | {"v": v}


def rotas():
    ano = None
    for tentativa in (2025, 2024, 2023):
        d = estat("avia_par_pt", freq="A", time=str(tentativa), tra_meas=["PAS_CRD", "CAF_PAS", "ST_PAS"])
        if len(d.get("value", {})) > 200:
            ano = tentativa
            break
    if ano is None:
        sys.exit("avia_par_pt sem dados recentes")
    por_rota = {}
    for r in planas(d):
        por_rota.setdefault(r["airp_pr"], {})[r["tra_meas"]] = r["v"]
    nomes = d["dimension"]["airp_pr"]["category"]["label"]
    # coordenadas pelo código ICAO (OurAirports: todos os aeroportos)
    todos = {}
    for r in csv.DictReader(io.StringIO(obter(OURAIRPORTS).decode("utf-8"))):
        for chave in {r["icao_code"], r["gps_code"], r["ident"]}:
            if chave and chave not in todos:
                todos[chave] = r
    agreg = {}
    for cod, m in por_rota.items():
        pais_a, icao_a, pais_b, icao_b = cod.split("_")
        if not all(k in m for k in ("PAS_CRD", "CAF_PAS", "ST_PAS")):
            continue
        A, B = todos.get(icao_a), todos.get(icao_b)
        if not A or not B:
            continue
        chave = tuple(sorted([icao_a, icao_b])) if pais_a == "PT" and pais_b == "PT" else (icao_a, icao_b)
        agreg.setdefault(chave, []).append((A, B, pais_b, m))
    saida = []
    for chave, itens in agreg.items():
        A, B, pais_b, _ = itens[0]
        n = len(itens)  # rotas internas aparecem uma vez por aeroporto: média dos dois registos
        media = lambda k: round(sum(i[3][k] for i in itens) / n)
        km = haversine((float(A["latitude_deg"]), float(A["longitude_deg"])), (float(B["latitude_deg"]), float(B["longitude_deg"])))
        saida.append({"a": A["iata_code"] or A["ident"], "b": B["iata_code"] or B["ident"], "icao": list(chave),
                      "cidade_a": limpar(A["municipality"]), "cidade_b": limpar(B["municipality"]),
                      "pais_b": B["iso_country"], "interna": pais_b == "PT",
                      "km": round(km), "passageiros": media("PAS_CRD"), "voos": media("CAF_PAS"), "lugares": media("ST_PAS")})
    saida.sort(key=lambda x: -x["passageiros"])
    # aquecimento: consumo final das casas portuguesas em aquecimento do espaço (TJ) e número de casas (milhares)
    h = estat("nrg_d_hhq", geo="PT", nrg_bal="FC_OTH_HH_E_SH", siec="TOTAL", unit="TJ")
    aq = {r["time"]: r["v"] for r in planas(h)}
    ano_aq = max(a for a in aq if a <= str(ano))
    hh = estat("lfst_hhnhtych", geo="PT", phhcomp="TOTAL", agechild="TOTAL", n_child="TOTAL")
    casas = {r["time"]: r["v"] for r in planas(hh)}
    ano_casas = max(a for a in casas if a <= str(ano))
    return {"meta": {"fonte": "Eurostat: avia_par_pt (rotas), nrg_d_hhq (aquecimento), lfst_hhnhtych (casas); OurAirports (coordenadas)",
                     "url": "https://ec.europa.eu/eurostat/databrowser/view/avia_par_pt/default/table?lang=en", "ano": ano,
                     "obtido": date.today().isoformat(),
                     "nota": "Passageiros e voos somam os dois sentidos; as rotas entre aeroportos portugueses aparecem nos dois registos e levam a média."},
            "aquecimento": {"ano": int(ano_aq), "tj": round(aq[ano_aq], 1), "casas_milhares": casas[ano_casas], "ano_casas": int(ano_casas)},
            "rotas": saida}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="portugal,aeroportos,rotas")
    a = ap.parse_args()
    alvo = {"portugal": ("aviacao-portugal.json", portugal), "aeroportos": ("aeroportos.json", aeroportos), "rotas": ("aviacao-rotas-portugal.json", rotas)}
    for k in a.only.split(","):
        ficheiro, fn = alvo[k]
        dados = fn()
        texto = json.dumps(dados, ensure_ascii=False, separators=(",", ":") if k in ("aeroportos", "rotas") else None,
                           indent=None if k in ("aeroportos", "rotas") else 1) + "\n"
        print(k, len(texto), "bytes")
        if not a.dry_run:
            (RAIZ / "data" / ficheiro).write_text(texto, encoding="utf-8")


if __name__ == "__main__":
    main()
