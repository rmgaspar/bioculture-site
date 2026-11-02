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
  data/aviacao-tempo.json     Linha do tempo: passageiros e partidas de voos no mundo (Banco Mundial/ICAO, 1970–),
                              temperatura global (NASA GISTEMP, 1880–), quota da aviação no CO₂ (Our World in Data,
                              1940–2021) e número de rotas e de voos nos aeroportos portugueses (Eurostat, 1993–).

Os fatores por passageiro-quilómetro (DESNZ 2025) e os textos editoriais ficam em data/aviacao.json, que este
script não toca.

  python3 scripts/dados/aviacao.py [--dry-run] [--only portugal,aeroportos,rotas,tempo,recursos]
"""
import argparse
import csv
import io
import json
import re
import sys
import urllib.error
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
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
            return r.read()
    except urllib.error.URLError:
        # Alguns servidores (p. ex. a NASA) recusam o TLS do Python do sistema: o curl lê-os sem problema.
        import subprocess
        r = subprocess.run(["curl", "-sfL", "-m", "120", "-A", UA, url], capture_output=True)
        if r.returncode:
            raise
        return r.stdout


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


def tempo():
    # Banco Mundial (ICAO): passageiros transportados e partidas de companhias registadas, mundo
    def bm(ind):
        d = json.loads(obter(f"https://api.worldbank.org/v2/country/WLD/indicator/{ind}?format=json&per_page=100"))
        return {int(x["date"]): round(x["value"]) for x in d[1] if x["value"] is not None}
    pax, part = bm("IS.AIR.PSGR"), bm("IS.AIR.DPRT")
    # NASA GISTEMP v4: anomalia anual (J-D), °C face a 1951-1980
    temp = {}
    for linha in obter("https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv").decode().splitlines()[2:]:
        c = linha.split(",")
        if len(c) > 13 and c[0].isdigit():
            try:
                temp[int(c[0])] = float(c[13])
            except ValueError:
                pass
    # Our World in Data: quota da aviação no CO₂ de combustíveis fósseis e uso do solo (Lee et al., Bergero et al., GCP)
    quota = {}
    for r in csv.DictReader(io.StringIO(obter("https://ourworldindata.org/grapher/aviation-share-co2.csv?v=1&csvType=full&useColumnShortNames=false").decode())):
        if r["Entity"] == "World":
            quota[int(r["Year"])] = float(r["Fossil and land use emissions"])
    # Eurostat: rotas com passageiros e voos nos aeroportos principais de Portugal (rotas internas contadas uma vez)
    d = estat("avia_par_pt", freq="A", tra_meas=["PAS_CRD", "CAF_PAS"], unit=["PAS", "FLIGHT"])
    por_ano = {}
    for r in planas(d):
        pa, ia, pb, ib = r["airp_pr"].split("_")
        chave = tuple(sorted([ia, ib])) if pa == "PT" and pb == "PT" else (ia, ib)
        por_ano.setdefault(int(r["time"]), {}).setdefault(chave, {}).setdefault(r["tra_meas"], []).append(r["v"])
    pt = {}
    for ano, rotas_ in sorted(por_ano.items()):
        ativas = {k: v for k, v in rotas_.items() if v.get("PAS_CRD") and sum(v["PAS_CRD"]) > 0}
        voos = sum(sum(v["CAF_PAS"]) / len(v["CAF_PAS"]) for v in ativas.values() if v.get("CAF_PAS"))
        pt[ano] = {"rotas": len(ativas), "passageiros": round(sum(sum(v["PAS_CRD"]) / len(v["PAS_CRD"]) for v in ativas.values())), "voos": round(voos) if voos > 0 else None}
    if len(pax) < 40 or len(temp) < 130 or len(quota) < 70 or len(pt) < 25:
        sys.exit("linha do tempo com poucos dados")
    return {"meta": {"fontes": ["Banco Mundial (ICAO): IS.AIR.PSGR e IS.AIR.DPRT", "NASA GISS GISTEMP v4", "Our World in Data: aviation-share-co2", "Eurostat: avia_par_pt"],
                     "obtido": date.today().isoformat(),
                     "nota": "Voos com valor 0 no Eurostat são anos sem registo (null). As rotas internas aparecem nos dois aeroportos e contam uma vez."},
            "mundo": {"passageiros": dict(sorted(pax.items())), "partidas": dict(sorted(part.items()))},
            "temperatura_global": dict(sorted(temp.items())), "quota_co2_aviacao_pct": dict(sorted(quota.items())), "portugal": pt}


def recursos():
    """Combustível de aviação fornecido em Portugal (Eurostat nrg_bal_c) e NOx da aviação (env_ac_ainah_r2)."""
    base = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
    d = json.loads(obter(base + "nrg_bal_c?format=JSON&lang=EN&geo=PT&siec=O4661XR5230B&unit=TJ&nrg_bal=INTAVI&nrg_bal=FC_TRA_DAVI_E"))
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    comb = {}
    for flat, v in d["value"].items():
        flat, idx = int(flat), {}
        for k, sz in reversed(list(zip(ids, tam))):
            idx[k] = flat % sz
            flat //= sz
        comb.setdefault(cats["nrg_bal"][idx["nrg_bal"]], {})[cats["time"][idx["time"]]] = round(v, 1)
    d = json.loads(obter(base + "env_ac_ainah_r2?format=JSON&lang=EN&geo=PT&airpol=NOX&unit=THS_T&nace_r2=H51&nace_r2=TOTAL_HH"))
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    nox, notas = {}, {}
    for tabela, alvo in (("value", nox), ("status", notas)):
        for flat, v in d.get(tabela, {}).items():
            flat, idx = int(flat), {}
            for k, sz in reversed(list(zip(ids, tam))):
                idx[k] = flat % sz
                flat //= sz
            alvo.setdefault(cats["nace_r2"][idx["nace_r2"]], {})[cats["time"][idx["time"]]] = round(v, 2) if tabela == "value" else v
    if len(comb.get("INTAVI", {})) < 30 or len(nox.get("H51", {})) < 25:
        sys.exit("Eurostat devolveu poucos anos de combustível ou NOx")
    return {"meta": {"fonte": "Eurostat: nrg_bal_c (querosene de aviação, TJ) e env_ac_ainah_r2 (NOx, kt)",
                     "url": "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table?lang=en",
                     "obtido": date.today().isoformat(),
                     "nota": "INTAVI = aviação internacional (combustível fornecido em Portugal a voos para o estrangeiro); FC_TRA_DAVI_E = aviação doméstica."},
            "combustivel_tj": {"internacional": dict(sorted(comb["INTAVI"].items())), "domestica": dict(sorted(comb["FC_TRA_DAVI_E"].items()))},
            "nox_kt": {"aviacao": dict(sorted(nox["H51"].items())), "total": dict(sorted(nox["TOTAL_HH"].items()))},
            "notas_nox": notas}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default="portugal,aeroportos,rotas,tempo,recursos")
    a = ap.parse_args()
    alvo = {"portugal": ("aviacao-portugal.json", portugal), "aeroportos": ("aeroportos.json", aeroportos), "rotas": ("aviacao-rotas-portugal.json", rotas), "tempo": ("aviacao-tempo.json", tempo), "recursos": ("aviacao-recursos.json", recursos)}
    for k in a.only.split(","):
        ficheiro, fn = alvo[k]
        dados = fn()
        texto = json.dumps(dados, ensure_ascii=False, separators=(",", ":") if k in ("aeroportos", "rotas", "tempo", "recursos") else None,
                           indent=None if k in ("aeroportos", "rotas", "tempo", "recursos") else 1) + "\n"
        print(k, len(texto), "bytes")
        if not a.dry_run:
            (RAIZ / "data" / ficheiro).write_text(texto, encoding="utf-8")


if __name__ == "__main__":
    main()
