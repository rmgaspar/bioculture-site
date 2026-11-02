#!/usr/bin/env python3
"""Atualiza água, solo e biodiversidade a partir da API dos Indicadores ODS da ONU (UNSD).

Ficheiros: data/{water,soil,biodiversity}-{timeseries,countries,overview,meta,sources}.json.
Séries: SH_H2O_SAFE (6.1.1), ER_H2O_STRESS (6.4.2), AG_LND_DGRD (15.3.1), ER_RSK_LST (15.5.1).

Os textos editoriais (achados contextuais, notas, definições) NÃO são tocados: só observações,
últimos valores por geografia, valores de síntese mundiais, períodos e datas.

Uso: python3 scripts/dados/ods_onu.py [--dry-run] [--only agua,solo,biodiversidade]
"""
import argparse
import json
import sys
import unicodedata
from collections import OrderedDict

import comum
from comum import ErroDados, escrever_se_mudou, hoje, ler, obter_json, verificar_perda

API = "https://unstats.un.org/SDGAPI/v1/sdg"
MUNDO = "001"

NATUREZA = {"E": "estimated", "C": "country_data", "N": "not_applicable"}
ESTADO = {"A": "normal", "E": "estimated", "I": "imputed_ccsa", "P": "provisional"}


def ordem_nome(nome):
    """Ordenação alfabética que ignora acentos e maiúsculas (Côte d'Ivoire fica junto de Cote)."""
    return unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode().lower()


def serie(codigo):
    linhas, pagina = [], 1
    while True:
        resposta = obter_json(f"{API}/Series/Data?seriesCode={codigo}&pageSize=10000&page={pagina}")
        if not isinstance(resposta, dict) or "data" not in resposta:
            raise ErroDados(f"Resposta inesperada da API ODS para {codigo}")
        linhas += resposta["data"]
        if pagina >= int(resposta.get("totalPages", 1)):
            break
        pagina += 1
    if not linhas:
        raise ErroDados(f"A série {codigo} veio vazia")
    return linhas


def numero(valor, decimal=False):
    """Converte o texto da API. Por omissão mantém inteiros como inteiros ("100" -> 100);
    com decimal=True devolve sempre número decimal (como nos ficheiros de solo e biodiversidade)."""
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        v = valor
    else:
        try:
            v = json.loads(str(valor).strip())
        except (ValueError, TypeError):
            return None
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            return None
    if v != v:
        return None  # NaN
    return float(v) if decimal else v


def m49(linha):
    return str(int(linha["geoAreaCode"])).zfill(3)


def sinalizadores(atributos):
    natureza = atributos.get("Nature")
    estado = atributos.get("Observation Status")
    return OrderedDict([
        ("nature_code", natureza),
        ("nature", NATUREZA.get(natureza, (natureza or "").lower() or None)),
        ("observation_status_code", estado),
        ("observation_status", ESTADO.get(estado, (estado or "").lower() or None) if estado else None),
        ("estimated", natureza == "E" or estado in ("E", "I")),
        ("custodian_estimate_series", estado is None),
        ("provisional", estado == "P"),
    ])


def ultimos(observacoes, ids, com_nulos=False):
    """Último valor por geografia e indicador (só numéricos, salvo com_nulos)."""
    por_geo = {}
    for o in observacoes:
        if o["value"] is None and not com_nulos:
            continue
        atual = por_geo.setdefault(o["geography"]["m49"], {"geography": o["geography"], "latest": {}})
        anterior = atual["latest"].get(o["indicator_id"])
        if anterior is None or o["year"] > anterior["year"]:
            atual["latest"][o["indicator_id"]] = o
    return por_geo


def periodo(observacoes, indicador):
    anos = [o["year"] for o in observacoes if o["indicator_id"] == indicador and o["value"] is not None]
    return f"{min(anos)}–{max(anos)}" if anos else None


# ------------------------------------------------------------------- água
AGUA = [
    ("sdg_6_1_1_safely_managed_drinking_water", "SH_H2O_SAFE", "Location", "ALLAREA", "residence"),
    ("sdg_6_4_2_water_stress", "ER_H2O_STRESS", "Activity", "TOTAL", "activity"),
]


def atualizar_agua():
    antigo = ler("water-timeseries.json")
    observacoes, excluidos = [], {indicador: 0 for indicador, *_r in reversed(AGUA)}
    for indicador, codigo, dimensao, filtro, chave in AGUA:
        for r in serie(codigo):
            if r["dimensions"].get(dimensao) != filtro:
                continue
            valor = numero(r["value"])
            if valor is None:
                excluidos[indicador] += 1
                continue
            observacoes.append(OrderedDict([
                ("indicator_id", indicador),
                ("geography", {"m49": m49(r), "name": r["geoAreaName"]}),
                ("year", int(r["timePeriodStart"])), ("value", valor), ("unit", "percent"),
                ("disaggregation", {chave: filtro}),
                ("flags", sinalizadores(r["attributes"])),
                ("source_label", r["source"]),
                ("footnotes", [n for n in (r.get("footnotes") or []) if n]),
            ]))
    ordem = {indicador: i for i, (indicador, *_r) in enumerate(AGUA)}
    observacoes.sort(key=lambda o: (ordem_nome(o["geography"]["name"]), o["geography"]["m49"], ordem[o["indicator_id"]], o["year"]))
    verificar_perda("water-timeseries", antigo["observation_count"], len(observacoes))

    arvore = obter_json(f"{API}/GeoArea/Tree")
    paises = set()
    def percorrer(no):
        if no.get("type") == "Country":
            paises.add(str(int(no["geoAreaCode"])).zfill(3))
        for filho in no.get("children") or []:
            percorrer(filho)
    for no in arvore:
        percorrer(no)
    ult = ultimos(observacoes, [i for i, *_r in AGUA])
    entidades = [
        {"geography": dados["geography"], "latest": {k: {kk: vv for kk, vv in v.items() if kk in ("year", "value", "unit", "flags")} for k, v in sorted(dados["latest"].items(), key=lambda kv: ordem[kv[0]])}}
        for codigo, dados in sorted(ult.items(), key=lambda item: (ordem_nome(item[1]["geography"]["name"]), item[0])) if codigo in paises
    ]
    visao = ler("water-overview.json")
    mundo = ult.get(MUNDO)
    if mundo is None:
        raise ErroDados("água: sem valores mundiais (001)")
    visao["headline_metrics"] = [dict(mundo["latest"][i]) for i, *_r in reversed(AGUA) if i in mundo["latest"]]
    visao["generated_at"] = hoje()
    cabecalho = {"generated_at": hoje(), "observation_count": len(observacoes),
                 "excluded_source_records_with_missing_value": excluidos, "filters": antigo["filters"]}
    mudou = [
        escrever_se_mudou("water-timeseries.json", {**cabecalho, "observations": observacoes}, False, ("generated_at",)),
        escrever_se_mudou("water-countries.json", {**{k: v for k, v in ler("water-countries.json").items() if k not in ("generated_at", "entity_count", "entities")}, "generated_at": hoje(), "entity_count": len(entidades), "entities": entidades}, False, ("generated_at",)),
        escrever_se_mudou("water-overview.json", visao, False, ("generated_at",)),
    ]
    if any(mudou):
        meta = ler("water-meta.json")
        for ind in meta["indicators"]:
            p = periodo(observacoes, ind["id"])
            if p:
                ind["period"] = p
        meta["generated_at"] = hoje()
        escrever_se_mudou("water-meta.json", meta, False, ("generated_at",))
        atualizar_datas_fontes("water-sources.json")
    return any(mudou), len(observacoes)


# ------------------------------------------------------------------- solo
def atualizar_solo():
    antigo = ler("soil-timeseries.json")
    observacoes = []
    for r in serie("AG_LND_DGRD"):
        observacoes.append(OrderedDict([
            ("indicator_id", "sdg_15_3_1_degraded_land"),
            ("geography", {"m49": m49(r), "name": r["geoAreaName"]}),
            ("year", int(r["timePeriodStart"])), ("value", numero(r["value"], True)), ("unit", "percent"),
            ("source_label", r["source"]), ("flags", {"nature_code": r["attributes"].get("Nature")}),
        ]))
    verificar_perda("soil-timeseries", antigo["observation_count"], len(observacoes))
    ult = ultimos(observacoes, ["sdg_15_3_1_degraded_land"], com_nulos=True)
    entidades = []
    for codigo, dados in sorted(ult.items(), key=lambda item: item[1]["geography"]["name"]):
        if codigo == MUNDO:
            continue
        o = dados["latest"]["sdg_15_3_1_degraded_land"]
        entidades.append({"geography": dados["geography"], "latest": {"sdg_15_3_1_degraded_land": {"year": o["year"], "value": o["value"], "unit": "percent"}}})
    visao = ler("soil-overview.json")
    mundo = [o for o in observacoes if o["geography"]["m49"] == MUNDO and o["value"] is not None]
    if not mundo:
        raise ErroDados("solo: sem valores mundiais (001)")
    visao["headline_metrics"] = [dict(o) for o in sorted(mundo, key=lambda o: o["year"])]
    visao["generated_at"] = hoje()
    mudou = [
        escrever_se_mudou("soil-timeseries.json", {"generated_at": hoje(), "observation_count": len(observacoes), "observations": observacoes}, False, ("generated_at",)),
        escrever_se_mudou("soil-countries.json", {"generated_at": hoje(), "entity_count": len(entidades), "entities": entidades}, False, ("generated_at",)),
        escrever_se_mudou("soil-overview.json", visao, False, ("generated_at",)),
    ]
    if any(mudou):
        meta = ler("soil-meta.json")
        anos = sorted({o["year"] for o in observacoes if o["value"] is not None})
        meta["indicators"][0]["period"] = ", ".join(str(a) for a in anos)
        meta["generated_at"] = hoje()
        escrever_se_mudou("soil-meta.json", meta, False, ("generated_at",))
        atualizar_datas_fontes("soil-sources.json")
    return any(mudou), len(observacoes)


# ----------------------------------------------------------- biodiversidade
def atualizar_biodiversidade():
    antigo = ler("biodiversity-timeseries.json")
    observacoes = []
    for r in serie("ER_RSK_LST"):
        valor = numero(r["value"], True)
        if valor is None:
            continue
        observacoes.append(OrderedDict([
            ("indicator_id", "sdg_15_5_1_red_list_index"),
            ("geography", {"m49": m49(r), "name": r["geoAreaName"]}),
            ("year", int(r["timePeriodStart"])), ("value", valor),
            ("lower_bound", numero(r.get("lowerBound"), True)), ("upper_bound", numero(r.get("upperBound"), True)),
            ("unit", "index"),
        ]))
    verificar_perda("biodiversity-timeseries", antigo["observation_count"], len(observacoes))
    ult = ultimos(observacoes, ["sdg_15_5_1_red_list_index"])
    entidades = []
    for codigo, dados in sorted(ult.items(), key=lambda item: item[1]["geography"]["name"]):
        if codigo == MUNDO:
            continue
        o = dados["latest"]["sdg_15_5_1_red_list_index"]
        entidades.append({"geography": dados["geography"], "latest": {"sdg_15_5_1_red_list_index": {k: o[k] for k in ("year", "value", "lower_bound", "upper_bound", "unit")}}})
    visao = ler("biodiversity-overview.json")
    mundo = {o["year"]: o for o in observacoes if o["geography"]["m49"] == MUNDO}
    if not mundo:
        raise ErroDados("biodiversidade: sem valores mundiais (001)")
    base = visao["headline_metrics"][0]["year"]  # ano de referência editorial (1993) mantém-se
    anos = [base, max(mundo)]
    visao["headline_metrics"] = [dict(mundo[a]) for a in anos if a in mundo]
    visao["generated_at"] = hoje()
    mudou = [
        escrever_se_mudou("biodiversity-timeseries.json", {"generated_at": hoje(), "observation_count": len(observacoes), "observations": observacoes}, False, ("generated_at",)),
        escrever_se_mudou("biodiversity-countries.json", {"generated_at": hoje(), "entity_count": len(entidades), "entities": entidades}, False, ("generated_at",)),
        escrever_se_mudou("biodiversity-overview.json", visao, False, ("generated_at",)),
    ]
    if any(mudou):
        meta = ler("biodiversity-meta.json")
        p = periodo(observacoes, "sdg_15_5_1_red_list_index")
        if p:
            meta["indicators"][0]["period"] = p
        meta["generated_at"] = hoje()
        escrever_se_mudou("biodiversity-meta.json", meta, False, ("generated_at",))
        atualizar_datas_fontes("biodiversity-sources.json")
    return any(mudou), len(observacoes)


def atualizar_datas_fontes(nome):
    """Só atualiza as datas de consulta; títulos, endereços e notas ficam como estão."""
    ficheiro = ler(nome)
    ficheiro["generated_at"] = hoje()
    for fonte in ficheiro.get("sources", []):
        if "retrieved_at" in fonte:
            fonte["retrieved_at"] = hoje()
    escrever_se_mudou(nome, ficheiro, False, ("generated_at", "retrieved_at"))


CONJUNTOS = {"agua": atualizar_agua, "solo": atualizar_solo, "biodiversidade": atualizar_biodiversidade}


def main():
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--dry-run", action="store_true")
    argumentos.add_argument("--only", default=",".join(CONJUNTOS))
    opcoes = argumentos.parse_args()
    comum.SECO = opcoes.dry_run
    falhas = []
    for nome in [n.strip() for n in opcoes.only.split(",") if n.strip()]:
        try:
            mudou, total = CONJUNTOS[nome]()
            print(f"{nome}: {total} observações — {'atualizado' if mudou else 'sem alterações'}", flush=True)
        except ErroDados as erro:
            print(f"{nome}: FALHOU — {erro}", file=sys.stderr, flush=True)
            falhas.append(nome)
    if falhas:
        sys.exit(2)


if __name__ == "__main__":
    main()
