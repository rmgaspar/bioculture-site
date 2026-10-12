#!/usr/bin/env python3
"""Fotos do GBIF (inclui o Observation.org, museus e herbários) para as fichas que ainda não têm imagem.

A licença que conta é a da FOTO (media[].license), não a do registo (occurrence.license): as fotos do iNaturalist
aparecem com registo CC BY e foto CC BY-NC. Só se aceitam fotos CC0, CC BY, CC BY-SA e domínio público.

  candidatos  junta, para cada ficha sem imagem, as melhores fotos do táxon (descarrega e mede cada uma; recusa as
              pequenas, as demasiado pesadas, desenhos e fundos quase brancos/pretos) → --saida (JSON)
  aplicar     escreve em data/*.json as escolhas feitas à mão num ficheiro {ficha: índice} (--escolhas)

Uso:  python3 scripts/catalogo/fotos-gbif.py candidatos --saida cand.json
      python3 scripts/catalogo/fotos-gbif.py aplicar --saida cand.json --escolhas escolhas.json
"""
import argparse
import importlib.util
import io
import json
import re
import subprocess
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("mf", RAIZ / "scripts" / "catalogo" / "melhores-fotos.py")
mf = importlib.util.module_from_spec(spec)
sys.modules["mf"] = mf
spec.loader.exec_module(mf)
lf = mf.lf
UA = lf.UA
LIC = [
    (re.compile(r"publicdomain/zero|\bCC0\b", re.I), ("CC0", "https://creativecommons.org/publicdomain/zero/1.0/")),
    (re.compile(r"publicdomain/mark|public domain", re.I), ("Domínio público", "https://creativecommons.org/publicdomain/mark/1.0/")),
    (re.compile(r"licenses/by-sa/(\d\.\d)|CC[ _-]BY[ _-]SA[ _-](\d)[ _.](\d)", re.I), ("CC BY-SA", "https://creativecommons.org/licenses/by-sa/4.0/")),
    (re.compile(r"licenses/by/(\d\.\d)|CC[ _-]BY[ _-](\d)[ _.](\d)(?![ _-]N)", re.I), ("CC BY", "https://creativecommons.org/licenses/by/4.0/")),
]
NAO = re.compile(r"-nc|NC|nd|ND", re.I)
REINO = {"Plantae": "Plantae", "Fungi": "Fungi", "Chromista": "Chromista"}
ALVOS_EXTRA = {"pragas": ["tripes-da-cebola", "mosca-da-raiz-da-couve", "psila-da-pereira"], "flora_invasora": ["egeria-densa"]}


def curl_json(url):
    for t in range(4):
        r = subprocess.run(["curl", "-s", "-m", "60", "-A", UA, url], capture_output=True, text=True)
        try:
            return json.loads(r.stdout)
        except Exception:  # noqa: BLE001
            time.sleep(2 + 3 * t)
    return None


def licenca(texto):
    t = texto or ""
    if re.search(r"-nc|-nd|by[_ -]nc|by[_ -]nd", t, re.I):
        return None
    for rx, val in LIC:
        if rx.search(t):
            return val
    return None


def alvos():
    from_ = []
    master = json.loads((RAIZ / "data" / "especies_master.json").read_text(encoding="utf-8"))
    for k, v in master.items():
        if not v.get("imagem") and k not in mf.EXCLUIR:
            from_.append({"ficheiro": "especies_master", "chave": k, "nome": v.get("nome"), "cientifico": mf.limpa_nome(v.get("nome_cientifico")), "grupo": v.get("grupo")})
    for f, ids in ALVOS_EXTRA.items():
        d = json.loads((RAIZ / "data" / f"{f}.json").read_text(encoding="utf-8"))
        for x in d:
            if x["id"] in ids and not x.get("imagem"):
                from_.append({"ficheiro": f, "chave": x["id"], "nome": x.get("nome_comum") or x["id"], "cientifico": mf.limpa_nome(x.get("nome_cientifico")),
                              "grupo": mf.GRUPO_VIRTUAL[f]})
    return from_


def analisar(url):
    """(w, h, bytes, mau) ou None se não for imagem utilizável."""
    try:
        import numpy as np
        from PIL import Image
    except ImportError as erro:
        raise SystemExit(f"Falta numpy ou Pillow ({erro})")
    for t in range(2):
        r = subprocess.run(["curl", "-s", "-L", "-m", "60", "--max-filesize", "6000000", "-A", UA, url], capture_output=True)
        dados = r.stdout
        try:
            img = Image.open(io.BytesIO(dados)).convert("RGB")
            break
        except Exception:  # noqa: BLE001
            time.sleep(2)
            img = None
    if img is None:
        return None
    w, h = img.size
    peq = img.copy()
    peq.thumbnail((200, 200))
    a = np.asarray(peq).astype("float32") / 255
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = float(np.mean((mx - mn) / (mx + 1e-6)))
    branco = float(np.mean(mn > 0.78))
    preto = float(np.mean(mx < 0.12))
    return {"w": w, "h": h, "bytes": len(dados), "mau": bool(branco > 0.5 or (sat < 0.10 and branco > 0.28) or preto > 0.6)}


def para_alvo(a):
    reino = REINO.get(a["grupo"], "Animalia") if a["grupo"] not in ("Flora Invasora",) else "Plantae"
    m = curl_json("https://api.gbif.org/v1/species/match?strict=false&kingdom=" + urllib.parse.quote(reino) + "&name=" + urllib.parse.quote(a["cientifico"]))
    if not m or m.get("matchType") not in ("EXACT", "FUZZY") or m.get("rank") not in ("SPECIES", "SUBSPECIES", "VARIETY", "FORM", "HYBRID", "GENUS") or m.get("confidence", 0) < 90:
        return {**a, "candidatas": [], "gbif": None}
    chave = m.get("acceptedUsageKey") or m.get("usageKey")
    achadas, vistas = [], set()
    for off in range(0, 600, 300):
        d = curl_json(f"https://api.gbif.org/v1/occurrence/search?taxonKey={chave}&mediaType=StillImage&limit=300&offset={off}")
        if not d:
            break
        for r in d.get("results", []):
            for md in r.get("media", []):
                if md.get("type") != "StillImage" or not md.get("identifier", "").startswith("http"):
                    continue
                lic = licenca(md.get("license"))
                if not lic or md["identifier"] in vistas:
                    continue
                vistas.add(md["identifier"])
                base = r.get("basisOfRecord", "")
                pontos = 30 if base in ("HUMAN_OBSERVATION", "OBSERVATION", "MACHINE_OBSERVATION") else 12
                achadas.append({"url": md["identifier"], "lic": lic[0], "licurl": lic[1],
                                "autor": (md.get("creator") or md.get("rightsHolder") or r.get("recordedBy") or r.get("datasetName") or "")[:80],
                                "base": base, "dataset": (r.get("datasetName") or "")[:60], "gbifID": r.get("gbifID"), "pontos": pontos})
        if d.get("endOfRecords"):
            break
    achadas.sort(key=lambda c: -c["pontos"])
    boas = []
    for c in achadas[:14]:
        info = analisar(c["url"])
        if not info or info["mau"] or min(info["w"], info["h"]) < 600 or info["bytes"] > 5_500_000:
            continue
        c.update(info)
        boas.append(c)
        if len(boas) >= 5:
            break
    return {**a, "gbif": chave, "total_com_licenca": len(achadas), "candidatas": boas}


def candidatos(args):
    lista = alvos()
    print(len(lista), "fichas sem imagem.", flush=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        saida = list(pool.map(para_alvo, lista))
    Path(args.saida).write_text(json.dumps(saida, ensure_ascii=False), encoding="utf-8")
    com = sum(1 for s in saida if s["candidatas"])
    print(f"{com}/{len(saida)} fichas com pelo menos uma candidata.")


def aplicar(args):
    saida = {f"{s['ficheiro']}/{s['chave']}": s for s in json.loads(Path(args.saida).read_text(encoding="utf-8"))}
    escolhas = json.loads(Path(args.escolhas).read_text(encoding="utf-8"))
    ficheiros = {}
    n = 0
    for chave, idx in escolhas.items():
        s = saida[chave]
        c = s["candidatas"][idx]
        f = s["ficheiro"]
        if f not in ficheiros:
            caminho = RAIZ / "data" / f"{f}.json"
            ficheiros[f] = (caminho, json.loads(caminho.read_text(encoding="utf-8")))
        caminho, dados = ficheiros[f]
        reg = dados[s["chave"]] if isinstance(dados, dict) else next(x for x in dados if x["id"] == s["chave"])
        m = re.match(r"^(https://inaturalist-open-data\.s3\.amazonaws\.com/photos/\d+)/original\.(\w+)$", c["url"])
        reg["imagem"] = f"{m.group(1)}/medium.{m.group(2)}" if m else c["url"]
        reg["foto"] = {"autor": c["autor"] or "GBIF", "licenca": c["lic"], "licenca_url": c["licurl"],
                       "pagina": f"https://www.gbif.org/occurrence/{c['gbifID']}", "origem": "GBIF" + (f" · {c['dataset']}" if c["dataset"] else "")}
        if m:
            reg["foto"]["grande"] = f"{m.group(1)}/large.{m.group(2)}"
        n += 1
    for caminho, dados in ficheiros.values():
        caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(n, "fichas atualizadas.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("comando", choices=["candidatos", "aplicar"])
    ap.add_argument("--saida", default=str(RAIZ / "scripts" / "catalogo" / ".gbif-candidatas.json"))
    ap.add_argument("--escolhas", default="")
    a = ap.parse_args()
    {"candidatos": candidatos, "aplicar": aplicar}[a.comando](a)
