"""Identificação das 616 castas do catálogo mundial, lida das fichas públicas do FPS Grape Registry (UC Davis).

Lê só campos factuais de cada ficha (sinónimos, países de origem, espécie); não copia o texto
editorial dos comentários. Corre à mão (não está no fluxo semanal):

    python3 scripts/dados/castas_mundo_fps.py

Escreve data/grape-varieties-fps.json, indexado pelo id do FPS. Pausa entre pedidos para não
sobrecarregar o servidor; as fichas que falharem ficam de fora (nunca se preenche um valor em falta).
"""
import html
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
UA = "bioCultura-observatorio/1.0 (+https://www.bioculture.pt)"
URL = "https://ngr.ucdavis.edu/fgrdetails.cfm?varietyid={}&showmore=yes"
PAUSA = 0.3  # por fio; quatro fios em paralelo


def campo(texto, titulo):
    m = re.search(r"<th>\s*" + re.escape(titulo) + r"\s*</th>\s*<td[^>]*>(.*?)</td>", texto, re.S)
    if not m:
        return ""
    limpo = re.sub(r"<[^>]+>", " ", m.group(1))
    return re.sub(r"\s+", " ", html.unescape(limpo)).strip()


def lista(valor):
    return [x.strip() for x in re.split(r",\s*", valor) if x.strip()]


def ler(vid):
    ultimo = None
    for tentativa in range(3):
        try:
            pedido = urllib.request.Request(URL.format(vid), headers={"User-Agent": UA})
            with urllib.request.urlopen(pedido, timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except OSError as erro:
            ultimo = erro
            time.sleep(3 * (tentativa + 1))
    print(f"  falhou {vid}: {ultimo}", file=sys.stderr)
    return None


def ficha(v):
    texto = ler(v["id"])
    time.sleep(PAUSA)
    if texto is None:
        return v["id"], None
    item = {
        "sinonimos": lista(campo(texto, "All Synonyms")),
        "origem": lista(campo(texto, "Countries of Origin")),
        "especie": campo(texto, "Species"),
    }
    return v["id"], {k: x for k, x in item.items() if x}


def main():
    catalogo = json.load(open(RAIZ / "data/grape-varieties-global.json", encoding="utf-8"))["varieties"]
    saida = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for i, (vid, item) in enumerate(pool.map(ficha, catalogo), 1):
            if item is not None:
                saida[vid] = item
            if i % 50 == 0:
                print(f"{i}/{len(catalogo)}", flush=True)
    if len(saida) < 0.95 * len(catalogo):
        sys.exit(f"Só {len(saida)} de {len(catalogo)} fichas lidas; nada escrito.")
    destino = RAIZ / "data/grape-varieties-fps.json"
    destino.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(saida)} fichas escritas em {destino}")


if __name__ == "__main__":
    main()
