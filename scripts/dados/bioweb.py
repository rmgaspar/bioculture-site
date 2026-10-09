#!/usr/bin/env python3
"""Reúne as séries da página «A teia» (clima, aves, espécies não nativas, pesticidas) em data/bioweb.json.

Fontes oficiais, sem interpolar nem preencher valores em falta:
- clima: temperatura média anual de Portugal (CRU TS 4.07, via Banco Mundial · Climate Knowledge Portal), 1901–2022;
- aves: índice de aves comuns da UE27 (Eurostat sdg_15_60; Pan-European Common Bird Monitoring Scheme), base 1990=100;
- pesticidas: uso agrícola em toneladas de substância ativa, por classe, e por hectare (FAOSTAT, grupo Inputs/Pesticides Use),
  vendas e indicador harmonizado de risco 1 de Portugal (Eurostat aei_fm_salpest09 e aei_hri);
- invasoras: primeiros registos de espécies não nativas em Portugal continental (FirstRecords v4.0, Zenodo, CC BY 4.0).
  Esta fonte pesa cerca de 30 MB e muda raramente: só corre com --only invasoras.

Uso: python3 scripts/dados/bioweb.py [--dry-run] [--only clima,aves,pesticidas,invasoras]
Por omissão corre clima, aves e pesticidas (leves). O bloco das invasoras mantém-se até ser pedido de novo.
"""
import argparse
import csv
import io
import sys
import urllib.parse
import urllib.request
import zipfile
from collections import Counter, defaultdict

import comum
from comum import USER_AGENT, ErroDados, escrever_se_mudou, hoje, obter_json

ARQUIVO = "bioweb.json"
CCKP = "https://cckpapi.worldbank.org/cckp/v1/cru-x0.5_timeseries_tas_timeseries_annual_1901-2022_mean_historical_cru_ts4.07_mean/PRT?_format=json"
EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{}?format=JSON&lang=EN{}"
FAOSTAT = "https://bulks-faostat.fao.org/production/Inputs_Pesticides_Use_E_All_Data_(Normalized).zip"
ZENODO = "https://zenodo.org/api/records/18759840/files/{}/content"
ANO0_PESTICIDAS = 1990


def descarregar(url, timeout=180):
    ultimo = None
    for tentativa in range(1, 4):
        try:
            pedido = urllib.request.Request(urllib.parse.quote(url, safe=":/?&=%,()_.-"), headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(pedido, timeout=timeout) as resposta:
                return resposta.read()
        except OSError as erro:
            ultimo = erro
    raise ErroDados(f"Não foi possível descarregar {url}: {ultimo}")


def jsonstat(codigo, filtros=""):
    """Lê um conjunto do Eurostat (JSON-stat) e devolve {dimensão: [categorias]}, valores por posição e tempos."""
    d = obter_json(EUROSTAT.format(codigo, filtros))
    if "error" in d:
        raise ErroDados(f"Eurostat {codigo}: {d['error']}")
    ids, tamanhos = d["id"], d["size"]
    idx = {k: list(d["dimension"][k]["category"]["index"].keys()) for k in ids}
    valores = d["value"]

    def serie(**fixos):
        saida = {}
        for i, tempo in enumerate(idx["time"]):
            pos = [i if dim == "time" else idx[dim].index(fixos[dim]) if dim in fixos else 0 for dim in ids]
            plano = 0
            for p, tam in zip(pos, tamanhos):
                plano = plano * tam + p
            v = valores.get(str(plano))
            if v is not None:
                saida[int(tempo)] = v
        return saida

    return serie, idx


def alinhar(valores, ano0, ano1, casas=2):
    """Lista de ano0..ano1; os anos sem dado ficam null (nunca preenchidos)."""
    return [None if valores.get(a) is None else round(valores[a], casas) for a in range(ano0, ano1 + 1)]


def clima():
    d = obter_json(CCKP)["data"]["PRT"]
    t = {int(k[:4]): v for k, v in d.items()}
    ano0, ano1 = min(t), max(t)
    if ano0 != 1901 or ano1 < 2022 or len(t) < 120:
        raise ErroDados(f"Temperatura de Portugal inesperada: {ano0}–{ano1}, {len(t)} anos")
    return {"a": ano0, "v": alinhar(t, ano0, ano1), "unidade": "°C", "ambito": "Portugal (média do território)",
            "fonte": "CRU TS 4.07 via Banco Mundial · Climate Knowledge Portal",
            "url": "https://climateknowledgeportal.worldbank.org/country/portugal/climate-data-historical"}


def aves():
    serie, idx = jsonstat("sdg_15_60")
    saida = {}
    for chave, codigo in (("agricolas", "CO_FARM"), ("florestais", "CO_FOR"), ("todas", "CO_ALL")):
        s = serie(comspec=codigo, unit="I90")
        if len(s) < 30:
            raise ErroDados(f"Índice de aves ({codigo}) com poucos anos: {len(s)}")
        ano0, ano1 = min(s), max(s)
        saida[chave] = {"a": ano0, "v": alinhar(s, ano0, ano1)}
    if saida["agricolas"]["a"] != 1990 or saida["agricolas"]["v"][0] != 100:
        raise ErroDados("Índice de aves: a base 1990=100 mudou")
    saida.update({"unidade": "índice, 1990 = 100", "ambito": "União Europeia (27), agregado; sem série nacional",
                  "fonte": "Eurostat sdg_15_60 · Pan-European Common Bird Monitoring Scheme (EBCC, BirdLife, RSPB, Statistics Netherlands)",
                  "url": "https://ec.europa.eu/eurostat/databrowser/view/sdg_15_60/default/table"})
    return saida


def faostat():
    zf = zipfile.ZipFile(io.BytesIO(descarregar(FAOSTAT)))
    nome = next(n for n in zf.namelist() if n.endswith("All_Data_(Normalized).csv"))
    linhas = csv.DictReader(io.TextIOWrapper(zf.open(nome), encoding="latin-1"))
    quero = {"Pesticides (total)": "total", "Insecticides": "inseticidas", "Herbicides": "herbicidas", "Fungicides and Bactericides": "fungicidas"}
    elementos = {"Agricultural Use": "t", "Use per area of cropland": "por_ha", "Use per value of agricultural production": "por_valor"}
    dados = defaultdict(dict)  # (area, chave) -> {ano: valor}
    for r in linhas:
        if r["Area"] not in ("World", "Portugal") or r["Item"] not in quero or r["Element"] not in elementos or not r["Value"]:
            continue
        if r["Element"] == "Agricultural Use":
            chave = quero[r["Item"]]
        elif r["Item"] == "Pesticides (total)":
            chave = elementos[r["Element"]]
        else:
            continue
        dados[(r["Area"], chave)][int(r["Year"])] = float(r["Value"])
    saida = {}
    for area, nome_area in (("World", "mundo"), ("Portugal", "portugal")):
        total = dados[(area, "total")]
        if len(total) < 30:
            raise ErroDados(f"FAOSTAT {area}: série total com {len(total)} anos")
        ano1 = max(total)
        bloco = {"a": ANO0_PESTICIDAS}
        for chave in ("total", "inseticidas", "herbicidas", "fungicidas"):
            bloco[chave] = alinhar(dados[(area, chave)], ANO0_PESTICIDAS, ano1, 0)
        bloco["por_ha"] = alinhar(dados[(area, "por_ha")], ANO0_PESTICIDAS, ano1, 2)
        bloco["por_valor"] = alinhar(dados[(area, "por_valor")], ANO0_PESTICIDAS, ano1, 1)
        saida[nome_area] = bloco
    return saida


def eurostat_pt():
    serie, idx = jsonstat("aei_hri", "&geo=PT")
    ano_ref = serie(subst_cat="HRI1")
    if len(ano_ref) < 10:
        raise ErroDados("Indicador harmonizado de risco: poucos anos")
    a0, a1 = min(ano_ref), max(ano_ref)
    risco = {"a": a0, "hri1": alinhar(ano_ref, a0, a1, 0)}
    serie, idx = jsonstat("aei_fm_salpest09", "&geo=PT")
    v0 = serie(pesticid="TOTAL")
    if len(v0) < 10:
        raise ErroDados("Vendas de pesticidas: poucos anos")
    b0, b1 = min(v0), max(v0)
    vendas = {"a": b0}
    for chave, codigo in (("total", "TOTAL"), ("fungicidas", "F"), ("fungicidas_inorganicos", "F01"), ("herbicidas", "H"), ("inseticidas", "I"), ("moluscicidas", "M"), ("reguladores", "PGR")):
        s = serie(pesticid=codigo)
        vendas[chave] = alinhar({a: v / 1000 for a, v in s.items()}, b0, b1, 0)  # kg -> t
    return {"risco": risco, "vendas": vendas}


def pesticidas():
    bloco = faostat()
    bloco["portugal_eurostat"] = eurostat_pt()
    bloco["unidades"] = {"total": "toneladas de substância ativa", "por_ha": "kg por hectare de terra cultivada", "por_valor": "g por dólar internacional de produção agrícola",
                         "hri1": "índice, média 2011–2013 = 100", "vendas": "toneladas de substância ativa"}
    bloco["fontes"] = [
        {"nome": "FAOSTAT · Inputs · Pesticides Use", "url": "https://www.fao.org/faostat/en/#data/RP"},
        {"nome": "Eurostat · Sales of pesticides (aei_fm_salpest09)", "url": "https://ec.europa.eu/eurostat/databrowser/view/aei_fm_salpest09/default/table"},
        {"nome": "Eurostat · Harmonised risk indicators for pesticides (aei_hri)", "url": "https://ec.europa.eu/eurostat/databrowser/view/aei_hri/default/table"},
    ]
    return bloco


GRUPOS = {"Vascular plants": "plantas", "Insects": "insetos", "Birds": "aves"}
DECADAS = list(range(1900, 2030, 10))


def invasoras():
    """Primeiros registos de espécies não nativas em Portugal continental, por década e grupo."""
    tax = {}
    texto = descarregar(ZENODO.format("FirstRecords_taxonomy_table_public_v4.0.csv"), 300).decode("utf-8", errors="replace")
    for r in csv.DictReader(io.StringIO(texto)):
        tax[r["taxonID"]] = r["taxaGroup"]
    texto = descarregar(ZENODO.format("FirstRecords_dataset_public_v4.0.csv"), 300).decode("latin-1")
    por_taxon = {}
    estado = Counter()
    mundo_por_ano = Counter()  # registos por ano em todos os países: mostra o atraso de publicação dos últimos anos
    for r in csv.DictReader(io.StringIO(texto), delimiter=";"):
        try:
            ano = int(float(r["firstRecordEvent"]))
        except ValueError:
            continue
        mundo_por_ano[ano] += 1
        if r["locationID"] != "202" or r["occurrenceStatus"] == "absent":
            continue
        estado[r["confidenceFirstRecordEvent"]] += 1
        # um registo por espécie: o primeiro
        if r["taxonID"] not in por_taxon or ano < por_taxon[r["taxonID"]]:
            por_taxon[r["taxonID"]] = ano
    if len(por_taxon) < 800:
        raise ErroDados(f"Portugal: só {len(por_taxon)} espécies com primeiro registo")
    contagem = {"plantas": Counter(), "insetos": Counter(), "aves": Counter(), "outros": Counter()}
    for taxon, ano in por_taxon.items():
        grupo = GRUPOS.get(tax.get(taxon, ""), "outros")
        contagem[grupo][(ano // 10) * 10] += 1
    pt_por_ano = Counter(por_taxon.values())
    return {
        "decadas": DECADAS,
        "por_grupo": {g: [c.get(d, 0) for d in DECADAS] for g, c in contagem.items()},
        "especies": len(por_taxon),
        "ate_1900": sum(1 for a in por_taxon.values() if a < 1900),
        "atraso": {"ultimo_ano_pt": max(por_taxon.values()), "pt_por_ano": {str(a): pt_por_ano.get(a, 0) for a in (2000, 2010, 2015, 2019)},
                   "mundo_por_ano": {str(a): mundo_por_ano.get(a, 0) for a in (2000, 2010, 2019)}},
        "ambito": "Portugal continental (Açores e Madeira ficam de fora desta versão)",
        "nota": "Contam espécies pela década do primeiro registo. Os últimos anos ficam sempre incompletos: um primeiro registo só entra na base depois de detetado, identificado e publicado, e os registos dependem do esforço de deteção.",
        "fonte": "Truong Renard & Seebens, FirstRecords v4.0 (Zenodo, CC BY 4.0)",
        "url": "https://doi.org/10.5281/zenodo.18759840",
    }


CONJUNTOS = {"clima": clima, "aves": aves, "pesticidas": pesticidas, "invasoras": invasoras}
PREDEFINIDOS = "clima,aves,pesticidas"


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--dry-run", action="store_true")
    args.add_argument("--only", default=PREDEFINIDOS)
    opcoes = args.parse_args()
    comum.SECO = opcoes.dry_run
    try:
        try:
            atual = comum.ler(ARQUIVO)
        except FileNotFoundError:
            atual = {}
        novo = dict(atual)
        for nome in [n.strip() for n in opcoes.only.split(",") if n.strip()]:
            if nome not in CONJUNTOS:
                raise ErroDados(f"Conjunto desconhecido: {nome}")
            print(f"A ler {nome}…")
            novo[nome] = CONJUNTOS[nome]()
        novo["gerado"] = hoje()
        novo["nota"] = "Séries oficiais reunidas sem interpolar nem preencher valores em falta. Séries diferentes têm âmbitos diferentes (mundo, UE27, Portugal): lê sempre o âmbito de cada uma."
        mudou = escrever_se_mudou(ARQUIVO, novo, compacto=True, campos_data=("gerado",))
        print("Atualizado." if mudou else "Já estava atualizado.")
    except ErroDados as erro:
        comum.sair_com_erro(erro)


if __name__ == "__main__":
    main()
