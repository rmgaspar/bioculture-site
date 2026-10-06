#!/usr/bin/env python3
"""Vigia as fontes portuguesas que publicam edições anuais sem API.

Não altera dados: escreve um ficheiro JSON com os alertas (por omissão ``vigia_alertas.json``, ou o
caminho em ``VIGIA_SAIDA``) quando a edição mais recente é posterior à registada em
``config/vigia_fontes.json``. O fluxo automático transforma cada alerta numa notificação.

Uso: python3 scripts/dados/vigia_fontes.py
"""
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

import comum
from comum import RAIZ, USER_AGENT, ErroDados

CONFIG = RAIZ / "config" / "vigia_fontes.json"


def pagina(url):
    pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(pedido, timeout=60) as resposta:
            return resposta.read().decode("utf-8", errors="ignore")
    except (urllib.error.URLError, OSError) as erro:
        raise ErroDados(f"Não foi possível ler {url}: {erro}")


def edicao_apa_rea(fonte):
    """Ano da edição mais recente do REA, lido da página «Última Edição»."""
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", "", pagina(fonte["url"]), flags=re.S))))
    anos = [int(a) for a in re.findall(r"Relat[óo]rio do Estado do Ambiente (20\d\d)", t)]
    if not anos:
        raise ErroDados("REA: não encontrei o ano da última edição (a página mudou de formato?)")
    return max(anos)


VERIFICADORES = {"apa_rea": edicao_apa_rea}


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    alertas, falhas = [], []
    for fonte in config["fontes"]:
        try:
            atual = VERIFICADORES[fonte["verificacao"]](fonte)
        except ErroDados as erro:
            print(f"::warning::{fonte['id']}: {erro}")
            falhas.append(fonte["id"])
            continue
        estado = "NOVA EDIÇÃO" if atual > fonte["conhecida"] else "em dia"
        print(f"{fonte['id']}: edição publicada {atual}, incorporada {fonte['conhecida']} — {estado}")
        if atual > fonte["conhecida"]:
            alertas.append({
                "id": f"{fonte['id']}@{atual}", "fonte": fonte["nome"], "edicao": atual,
                "url": fonte["url"], "ficheiros": fonte["ficheiros"], "o_que_rever": fonte["o_que_rever"],
            })
    saida = os.environ.get("VIGIA_SAIDA", "vigia_alertas.json")
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(alertas, f, ensure_ascii=False, indent=2)
    if falhas and not alertas:
        sys.exit(2)


if __name__ == "__main__":
    main()
