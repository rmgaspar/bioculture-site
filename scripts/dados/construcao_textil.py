#!/usr/bin/env python3
"""Dados das páginas «Ambiente construído» e «Moda e têxteis» (Eurostat, Portugal e UE-27).

  data/ambiente-construido-portugal.json  CO₂ da construção (NACE F) e dos produtos minerais não metálicos (C23: cimento,
                                          cerâmica, vidro...), do total (economia e famílias) e resíduos minerais da
                                          construção e demolição (W121), por pessoa.
  data/moda-texteis-portugal.json         CO₂ de têxteis, vestuário, couro e calçado (C13-C15) e resíduos têxteis (W076).

Fontes: env_ac_ainah_r2 (contas de emissões atmosféricas), env_wasgen (resíduos gerados), demo_pjan (população),
env_ac_pefa04 (energia usada por atividade), env_ac_mfa (extração de materiais), lan_lcv_art (solo artificializado, LUCAS) e NOx e partículas (também env_ac_ainah_r2).
Os fatores por tonelada de material (DESNZ 2025) e os textos editoriais ficam nos ficheiros data/ambiente-construido.json
e data/moda-texteis.json, que este script não toca.

  python3 scripts/dados/construcao_textil.py [--dry-run]
"""
import argparse
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BASE = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"
UA = "bioCulture-dados/1.0 (+https://www.bioculture.pt)"


def obter(dataset, **q):
    partes = [("format", "JSON"), ("lang", "EN")] + [(k, v) for k, vs in q.items() for v in (vs if isinstance(vs, list) else [vs])]
    url = BASE + dataset + "?" + "&".join(f"{k}={v}" for k, v in partes)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
        return json.loads(r.read())


def series(d, dim_extra):
    """Devolve {chave_da_dimensão_extra: {ano: valor}} para respostas com uma dimensão variável e o tempo."""
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    saida, notas = {}, {}
    for flat, v in d["value"].items():
        flat = int(flat)
        idx = {}
        for k, s in reversed(list(zip(ids, tam))):
            idx[k] = flat % s
            flat //= s
        chave = cats[dim_extra][idx[dim_extra]] if dim_extra else "x"
        ano = cats["time"][idx["time"]]
        saida.setdefault(chave, {})[ano] = v
    for flat, f in d.get("status", {}).items():
        flat = int(flat)
        idx = {}
        for k, s in reversed(list(zip(ids, tam))):
            idx[k] = flat % s
            flat //= s
        chave = cats[dim_extra][idx[dim_extra]] if dim_extra else "x"
        notas.setdefault(chave, {})[cats["time"][idx["time"]]] = f
    return saida, notas


def co2(naces):
    d = obter("env_ac_ainah_r2", geo="PT", airpol="CO2", unit="THS_T", nace_r2=naces)
    s, n = series(d, "nace_r2")
    for k in naces:
        if len(s.get(k, {})) < 25:
            sys.exit(f"Eurostat devolveu poucos anos para {k}")
    return {k: {a: round(v, 1) for a, v in sorted(s[k].items())} for k in naces}, n


def residuos(cod):
    d = obter("env_wasgen", geo=["PT", "EU27_2020"], unit="T", hazard="HAZ_NHAZ", nace_r2="TOTAL_HH", waste=cod)
    s, _ = series(d, "geo")
    return s


def populacao():
    d = obter("demo_pjan", geo=["PT", "EU27_2020"], age="TOTAL", sex="T", unit="NR")
    s, _ = series(d, "geo")
    return s


def quota_construcao():
    """Resíduos totais da construção (NACE F) e de todas as atividades mais famílias, no último ano com dados."""
    d = obter("env_wasgen", geo=["PT", "EU27_2020"], unit="T", hazard="HAZ_NHAZ", nace_r2=["F", "TOTAL_HH"], waste="TOTAL")
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    por = {}
    for flat, v in d["value"].items():
        flat = int(flat)
        idx = {}
        for k, sz in reversed(list(zip(ids, tam))):
            idx[k] = flat % sz
            flat //= sz
        por.setdefault(cats["geo"][idx["geo"]], {}).setdefault(cats["time"][idx["time"]], {})[cats["nace_r2"][idx["nace_r2"]]] = v
    out = {}
    for geo, anos in por.items():
        ano = max(a for a, x in anos.items() if "F" in x and "TOTAL_HH" in x)
        out[geo] = {"ano": ano, "construcao_t": anos[ano]["F"], "total_t": anos[ano]["TOTAL_HH"],
                    "quota_pct": round(anos[ano]["F"] / anos[ano]["TOTAL_HH"] * 100, 1)}
    return out


def energia(naces):
    """Uso interno líquido de energia (TJ) por atividade, Portugal."""
    d = obter("env_ac_pefa04", geo="PT", indic_pefa="NETDOM_EUSE", nace_r2=naces, unit="TJ")
    s, _ = series(d, "nace_r2")
    for k in naces:
        if len(s.get(k, {})) < 20:
            sys.exit(f"Eurostat devolveu poucos anos de energia para {k}")
    return {k: {a: round(v, 1) for a, v in sorted(s[k].items())} for k in naces}


def materiais():
    """Extração interna de minerais não metálicos (MF3), areia e gravilha (MF38) e total, em toneladas por pessoa."""
    d = obter("env_ac_mfa", geo=["PT", "EU27_2020"], indic_env="DE", unit="T_HAB", material=["MF3", "MF38", "TOTAL"])
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    out = {}
    for flat, v in d["value"].items():
        flat = int(flat)
        idx = {}
        for k, sz in reversed(list(zip(ids, tam))):
            idx[k] = flat % sz
            flat //= sz
        out.setdefault(cats["geo"][idx["geo"]], {}).setdefault(cats["material"][idx["material"]], {})[cats["time"][idx["time"]]] = round(v, 2)
    return out


def terra_artificial():
    """Solo artificializado (LUCAS): % do território, m² por pessoa e km²."""
    d = obter("lan_lcv_art", geo=["PT", "EU27_2020"], landcover="A00", unit=["PC", "M2_HAB", "KM2"])
    ids, tam = d["id"], d["size"]
    cats = {k: list(d["dimension"][k]["category"]["index"]) for k in ids}
    out = {}
    for flat, v in d["value"].items():
        flat = int(flat)
        idx = {}
        for k, sz in reversed(list(zip(ids, tam))):
            idx[k] = flat % sz
            flat //= sz
        out.setdefault(cats["geo"][idx["geo"]], {}).setdefault(cats["unit"][idx["unit"]], {})[cats["time"][idx["time"]]] = round(v, 2)
    return out


def poluentes(naces_chaves):
    """NOx e partículas (PM10, PM2,5), em kt, das atividades da página e do total (economia e famílias)."""
    chaves = dict(naces_chaves) | {"TOTAL_HH": "total_economia_familias"}
    out = {}
    for pol in ("NOX", "PM10", "PM2_5"):
        d = obter("env_ac_ainah_r2", geo="PT", airpol=pol, unit="THS_T", nace_r2=list(chaves))
        s, _ = series(d, "nace_r2")
        for k in chaves:
            if len(s.get(k, {})) < 25:
                sys.exit(f"Eurostat devolveu poucos anos de {pol} para {k}")
        out[pol] = {chaves[k]: {a: round(v, 2) for a, v in sorted(s[k].items())} for k in chaves}
    return out


def por_pessoa(res, pop):
    out = {}
    for geo, ser in res.items():
        out[geo] = {a: round(t * 1000 / pop[geo][a], 1) for a, t in sorted(ser.items()) if a in pop[geo]}
    return out


def construir(naces_chaves, cod_res, com_quota=False):
    co2s, notas = co2(list(naces_chaves) + ["TOTAL_HH"])
    en = energia(list(naces_chaves) + ["TOTAL_HH"])
    res = residuos(cod_res)
    pop = populacao()
    return {
        "meta": {"fonte": "Eurostat: env_ac_ainah_r2 (CO₂, kt), env_wasgen (resíduos, t) e demo_pjan (população)",
                 "url": "https://ec.europa.eu/eurostat/databrowser/view/env_ac_ainah_r2/default/table?lang=en",
                 "obtido": date.today().isoformat(), "codigo_residuos": cod_res},
        "co2_kt": {naces_chaves[k]: co2s[k] for k in naces_chaves} | {"total_economia_familias": co2s["TOTAL_HH"]},
        "notas_co2": {naces_chaves.get(k, k): n for k, n in notas.items()},
        "energia_tj": {naces_chaves[k]: en[k] for k in naces_chaves} | {"total_economia_familias": en["TOTAL_HH"]},
        "residuos_t": res,
        "residuos_kg_por_pessoa": por_pessoa(res, pop),
        "ar_kt": poluentes(naces_chaves),
    } | ({"residuos_totais_construcao": quota_construcao(), "materiais_t_por_pessoa": materiais(), "solo_artificial": terra_artificial()} if com_quota else {})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    trabalhos = {
        "ambiente-construido-portugal.json": ({"F": "construcao", "C23": "minerais_nao_metalicos"}, "W121", True),
        "moda-texteis-portugal.json": ({"C13-C15": "texteis_vestuario_couro"}, "W076", False),
    }
    for ficheiro, (naces, cod, quota) in trabalhos.items():
        dados = construir(naces, cod, quota)
        texto = json.dumps(dados, ensure_ascii=False, indent=1) + "\n"
        print(ficheiro, len(texto), "bytes", {k: len(v) for k, v in dados["co2_kt"].items()}, {k: len(v) for k, v in dados["residuos_t"].items()})
        if not a.dry_run:
            (RAIZ / "data" / ficheiro).write_text(texto, encoding="utf-8")


if __name__ == "__main__":
    main()
