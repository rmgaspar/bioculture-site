#!/usr/bin/env python3
"""Gera data/participa-geo.json: contorno de Portugal continental e posição de cada concelho, para os mini-mapas das consultas.

O contorno vem do Natural Earth (domínio público, 1:50 milhões). A posição de um concelho é a média das coordenadas
das localidades dele em data/localidades.json: serve para pôr um ponto no mapa, não para delimitar o concelho.

Uso:
    python3 scripts/participa/gerar_mapa.py caminho/para/ne_50m_admin_0_countries.geojson
"""
import collections
import json
import math
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "participa-geo.json"
W = 100  # largura do desenho, em unidades


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm_ = math.hypot(dx, dy) or 1e-12
    idx, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / norm_
        if d > dmax:
            idx, dmax = i, d
    if dmax > tol:
        return simplify(pts[: idx + 1], tol)[:-1] + simplify(pts[idx:], tol)
    return [pts[0], pts[-1]]


def main(src):
    countries = json.loads(Path(src).read_text(encoding="utf-8"))["features"]
    prt = next(f for f in countries if f["properties"].get("ADM0_A3") == "PRT")["geometry"]["coordinates"]
    mainland = max((poly[0] for poly in prt), key=len)  # o maior polígono é o continente
    pts = [(lon, lat) for lon, lat in mainland[:-1]]
    ring = simplify(pts, 0.015)
    lon0, lon1 = min(p[0] for p in ring), max(p[0] for p in ring)
    lat0, lat1 = min(p[1] for p in ring), max(p[1] for p in ring)
    k = math.cos(math.radians((lat0 + lat1) / 2))
    scale = W / ((lon1 - lon0) * k)

    def proj(lon, lat):
        return [round((lon - lon0) * k * scale, 2), round((lat1 - lat) * scale, 2)]

    groups = collections.defaultdict(list)
    for x in json.loads((ROOT / "data" / "localidades.json").read_text(encoding="utf-8")):
        if x.get("concelho") and x.get("lat") and x.get("lon") and lat0 <= x["lat"] <= lat1 and lon0 <= x["lon"] <= lon1:
            groups[norm(x["concelho"])].append((x["lon"], x["lat"]))
    concelhos = {n: proj(sum(p[0] for p in v) / len(v), sum(p[1] for p in v) / len(v)) for n, v in sorted(groups.items())}
    data = {
        "fonte": "Contorno: Natural Earth (domínio público). Concelhos: média das localidades de data/localidades.json; posição indicativa.",
        "largura": W, "altura": round((lat1 - lat0) * scale, 2),
        "contorno": [proj(*p) for p in ring], "concelhos": concelhos,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(data['contorno'])} pontos no contorno, {len(concelhos)} concelhos, {W}x{data['altura']}")


if __name__ == "__main__":
    main(sys.argv[1])
