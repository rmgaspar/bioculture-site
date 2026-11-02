#!/usr/bin/env python3
"""Troca fotografias da Wikimedia Commons em resolução original por miniaturas de 500 px.

As fichas guardavam o ficheiro original (até 4 MB por foto) para mostrar imagens de ~200 px.
A API da Commons devolve o endereço correto da miniatura (ou o original, se for mais pequeno).
Uso: python3 scripts/imagens/miniaturas-wikimedia.py data/horticolas_master.json data/pragas.json ...
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request

WIDTH = 500
API = "https://commons.wikimedia.org/w/api.php"
URL = re.compile(r"https://upload\.wikimedia\.org/wikipedia/commons/[^\"\s]+")
UA = {"User-Agent": "bioCulture-site/1.0 (https://www.bioculture.pt; geral@bioculture.pt)"}


def filename(url: str) -> str:
    path = urllib.parse.urlsplit(url).path
    parts = path.split("/")
    name = parts[parts.index("thumb") + 3] if "thumb" in parts else parts[-1]
    return urllib.parse.unquote(name)


def thumbs(names):
    out = {}
    names = sorted(set(names))
    for i in range(0, len(names), 40):
        batch = names[i:i + 40]
        query = urllib.parse.urlencode({
            "action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|size",
            "iiurlwidth": WIDTH, "titles": "|".join("File:" + n for n in batch),
        })
        with urllib.request.urlopen(urllib.request.Request(f"{API}?{query}", headers=UA), timeout=30) as r:
            data = json.load(r)
        normal = {n["to"]: n["from"] for n in data["query"].get("normalized", [])}
        for page in data["query"]["pages"].values():
            info = (page.get("imageinfo") or [None])[0]
            if not info:
                continue
            title = normal.get(page["title"], page["title"])
            out[title.removeprefix("File:")] = (info.get("thumburl") or info["url"]).split("?")[0]
        time.sleep(0.5)
    return out


def main(paths):
    texts = {p: open(p, encoding="utf-8").read() for p in paths}
    urls = {u for t in texts.values() for u in URL.findall(t)}
    mapping = thumbs(filename(u) for u in urls)
    for path, text in texts.items():
        changed = 0
        def swap(m):
            nonlocal changed
            new = mapping.get(filename(m.group(0)))
            if new and new != m.group(0):
                changed += 1
                return new
            return m.group(0)
        text = URL.sub(swap, text)
        open(path, "w", encoding="utf-8").write(text)
        print(f"{path}: {changed} imagens trocadas")
    missing = [u for u in urls if filename(u) not in mapping]
    if missing:
        print("Sem resposta da Commons (mantidas):", *missing, sep="\n  ")


if __name__ == "__main__":
    main(sys.argv[1:])
