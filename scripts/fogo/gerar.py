#!/usr/bin/env python3
"""Gera data/fogo/<ano>.json e data/fogo/indice.json: perímetros das áreas ardidas em Portugal continental.

Fonte: ICNF, «Áreas ardidas» (WFS https://si.icnf.pt/wfs/areas_ardidas, camadas BDG:ardida_<ano>), a cartografia
nacional de áreas ardidas publicada no dados.gov.pt. Cada perímetro traz a área, o concelho, a data de início e a
causa apurada pelo ICNF.

Os polígonos vão já projetados no mesmo sistema de coordenadas do mapa das consultas (data/participa-geo.json,
largura 100): x = 30.6072 * lon + 290.1481, y = -39.7062 * lat + 1673.1175. Assim o contorno é o mesmo e as camadas
podem sobrepor-se. Só se desenham os fogos com pelo menos MIN_HA hectares (só o anel exterior, simplificado); os
totais do ano contam todos.

Uso:
    python3 scripts/fogo/gerar.py [ano ...]      # sem anos: 2015 a 2025
    python3 scripts/fogo/gerar.py --cache pasta  # guarda os GeoJSON descarregados em «pasta»
"""
import json
import math
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "fogo"
WFS = ("https://si.icnf.pt/wfs/areas_ardidas?service=WFS&version=2.0.0&request=GetFeature"
       "&typeNames=BDG:ardida_{ano}&outputFormat=application/json&srsName=EPSG:4326")
MIN_HA = 25
TOL = 0.03  # tolerância da simplificação, em unidades do desenho (100 = largura do continente)
CAUSAS = {"Negligente": "N", "Intencional": "I", "Natural": "A", "Reacendimento": "R", "Desconhecida": "D"}
LAT = (36.9, 42.2)
LON = (-9.6, -6.1)


def proj(lon, lat):
    return 30.60722652 * lon + 290.14813131, -39.70622747 * lat + 1673.11751331


def simplify(pts, tol):
    """Douglas-Peucker iterativo (os perímetros grandes têm dezenas de milhares de pontos)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        n = math.hypot(dx, dy) or 1e-12
        idx, dmax = -1, 0.0
        for i in range(a + 1, b):
            d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
            if d > dmax:
                idx, dmax = i, d
        if idx >= 0 and dmax > tol:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]


def fmt(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return s if s != "-0" else "0"


def path_of(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    parts = []
    for poly in polys:
        ring = [proj(lon, lat) for lon, lat in poly[0]]
        # o anel é fechado (primeiro = último ponto): divide-se no ponto mais afastado para o Douglas-Peucker funcionar
        far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
        ring = simplify(ring[: far + 1], TOL)[:-1] + simplify(ring[far:], TOL)
        if len(ring) < 4:
            continue
        parts.append("M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in ring[:-1]) + "Z")
    return "".join(parts)


def centroid(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    pts = [p for poly in polys for p in poly[0]]
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def ano(y, cache):
    fich = cache / f"ardida_{y}.json" if cache else None
    if fich and fich.exists():
        data = json.loads(fich.read_text(encoding="utf-8"))
    else:
        req = urllib.request.Request(WFS.format(ano=y), headers={"User-Agent": "bioCulture-site (dados abertos; contacto via bioculture.pt)"})
        with urllib.request.urlopen(req, timeout=300) as r:
            raw = r.read()
        if fich:
            fich.write_bytes(raw)
        data = json.loads(raw)
    fogos, causas, n, total = [], {}, 0, 0.0
    for f in data["features"]:
        p, g = f["properties"], f["geometry"]
        if not g:
            continue
        lon, lat = centroid(g)
        if not (LAT[0] <= lat <= LAT[1] and LON[0] <= lon <= LON[1]):
            continue  # fora do continente
        a = p.get("AreaHaSIG") or 0.0
        n += 1
        total += a
        c = CAUSAS.get(p.get("Causa_Tipo"), "")
        causas[c] = causas.get(c, 0.0) + a
        if a >= MIN_HA:
            d = path_of(g)
            if d:
                fogos.append({"a": round(a), "c": (p.get("PI_Conc") or "").title().replace(" De ", " de ").replace(" Do ", " do ").replace(" Da ", " da ").replace(" Dos ", " dos ").replace(" Das ", " das ").replace(" À ", " à "),
                              "d": (p.get("DH_Inicio") or "")[:10], "t": c, "p": d})
    fogos.sort(key=lambda x: -x["a"])
    shown = sum(x["a"] for x in fogos)
    return {
        "ano": y, "n": n, "ha": round(total), "mostrados": len(fogos), "ha_mostrados": shown,
        "causas_ha": {k or "?": round(v) for k, v in sorted(causas.items(), key=lambda kv: -kv[1])},
        "fogos": fogos,
    }


def main(argv):
    cache = None
    if "--cache" in argv:
        i = argv.index("--cache")
        cache = Path(argv[i + 1])
        cache.mkdir(parents=True, exist_ok=True)
        argv = argv[:i] + argv[i + 2:]
    anos = [int(a) for a in argv] or list(range(2015, 2026))
    OUT.mkdir(parents=True, exist_ok=True)
    oficial = json.loads((ROOT / "data" / "observatorio_terra.json").read_text(encoding="utf-8"))["series_temporais"]["area_ardida_continente"]["valores"]
    indice = {}
    old = OUT / "indice.json"
    if old.exists():
        indice = json.loads(old.read_text(encoding="utf-8")).get("anos", {})
    for y in anos:
        d = ano(y, cache)
        (OUT / f"{y}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        indice[str(y)] = {"n": d["n"], "ha": d["ha"], "mostrados": d["mostrados"], "ha_mostrados": d["ha_mostrados"], "oficial_ha": oficial.get(str(y)), "causas_ha": d["causas_ha"]}
        print(y, d["n"], "fogos,", d["ha"], "ha; oficial", oficial.get(str(y)), "; desenhados", d["mostrados"], f"({(OUT / f'{y}.json').stat().st_size // 1024} kB)")
    out = {
        "fonte": "ICNF, Áreas ardidas (cartografia nacional, WFS si.icnf.pt/wfs/areas_ardidas); totais oficiais: ICNF, estatísticas de incêndios rurais.",
        "fonte_url": "https://dados.gov.pt/en/datasets/areas-ardidas-desde-1975",
        "min_ha": MIN_HA, "largura": 100,
        "anos": dict(sorted(indice.items())),
    }
    old.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])
