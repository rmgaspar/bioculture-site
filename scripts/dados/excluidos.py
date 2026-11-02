"""Países retirados das listas do site (config/paises-excluidos.json).

`podar(dados)` percorre um ficheiro de dados e tira as entradas desses países: chaves ISO3 (`ISR`),
entradas com `geography` (nome ou M49), linhas de aeroportos do país e elementos de listas que sejam só o
código ou o nome. Atualiza também os contadores (`entity_count`, `observation_count`). Só mexe nos
ficheiros listados em `ficheiros`; textos e agregados das fontes ficam como estão.
"""
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONFIG = json.loads((RAIZ / "config" / "paises-excluidos.json").read_text(encoding="utf-8"))
ISO3, ISO2 = set(CONFIG["iso3"]), set(CONFIG["iso2"])
M49, NOMES = set(CONFIG["m49"]), set(CONFIG["nomes"])
FICHEIROS = set(CONFIG["ficheiros"])


def _excluida(item):
    """Uma entrada de lista que descreve um dos países."""
    if isinstance(item, str):
        return item in ISO3 or item in NOMES
    if not isinstance(item, dict):
        return False
    geo = item.get("geography")
    if isinstance(geo, dict) and (geo.get("name") in NOMES or str(geo.get("m49")) in M49 or geo.get("iso3") in ISO3):
        return True
    return item.get("iso3") in ISO3


def podar(valor, linhas_aeroporto=False):
    """Devolve uma cópia sem as entradas excluídas."""
    if isinstance(valor, dict):
        saida = {}
        for chave, v in valor.items():
            if chave in ISO3:
                continue
            saida[chave] = podar(v, linhas_aeroporto or chave == "aeroportos")
        for contador, lista in (("entity_count", "entities"), ("observation_count", "observations")):
            if contador in saida and isinstance(saida.get(lista), list):
                saida[contador] = len(saida[lista])
        return saida
    if isinstance(valor, list):
        # Linhas de aeroportos: [iata, cidade, cidade_en, nome, pais_iso2, lat, lon, continente]
        if linhas_aeroporto:
            valor = [r for r in valor if not (isinstance(r, list) and len(r) > 4 and r[4] in ISO2)]
        return [podar(v) for v in valor if not _excluida(v)]
    return valor


def aplicar(nome, dados):
    """Poda `dados` se `nome` for um dos ficheiros abrangidos."""
    return podar(dados) if nome in FICHEIROS else dados
