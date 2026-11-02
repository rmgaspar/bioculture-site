#!/usr/bin/env python3
"""Gera as camadas de contexto do mapa de fogo: áreas protegidas, Rede Natura 2000 e floresta.

- data/fogo/protegidas.json: Rede Nacional de Áreas Protegidas (ICNF, WFS si.icnf.pt/wfs/rnap, CC BY) e Rede Natura 2000
  (ZEC e ZPE; DGT, servidões e restrições de utilidade pública, WFS servicos.dgterritorio.pt, CC BY), em polígonos
  projetados como os da área ardida (só o anel exterior, simplificado).
- data/fogo/floresta-{montado,eucalipto,outra}.png e data/fogo/floresta.json: classes de floresta da Carta de Ocupação do Solo
  Conjuntural 2023 (DGT, WMS geo2.dgterritorio.gov.pt/wms/COSc2023, CC BY), isoladas pela cor da legenda oficial:
  montado = «Sobreiro e Azinheira»; eucalipto = «Eucalipto»; outra = outras folhosas, pinheiro bravo, pinheiro manso e outras resinosas.

Uso: python3 scripts/fogo/contexto.py     (precisa de numpy e Pillow)
"""
import datetime
import io
import json
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar import LAT, LON, centroid, path_of, proj  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "fogo"
UA = {"User-Agent": "bioCulture-site (dados abertos; contacto via bioculture.pt)"}
GML = "{http://www.opengis.net/gml}"
BBOX = (36.9, -9.6, 42.2, -6.1)  # lat0, lon0, lat1, lon1
COS = "https://geo2.dgterritorio.gov.pt/wms/COSc2023"
K = 0.7  # redução dos PNG de floresta
CLASSES = {
    "montado": ([(159, 33, 138)], (47, 122, 92)),
    "eucalipto": ([(43, 241, 0)], (163, 196, 58)),
    "outra": ([(18, 195, 9), (12, 128, 6), (23, 78, 17), (30, 99, 111)], (110, 168, 104)),
}


def obter(url, params=None, timeout=240):
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()


def dentro(geom):
    lon, lat = centroid(geom)
    return LAT[0] <= lat <= LAT[1] and LON[0] <= lon <= LON[1]


def rnap():
    d = json.loads(obter("https://si.icnf.pt/wfs/rnap", {"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": "BDG:rnap", "outputFormat": "application/json", "srsName": "EPSG:4326"}))
    out = []
    for f in d["features"]:
        if f["geometry"] and dentro(f["geometry"]):
            p = path_of(f["geometry"])
            if p:
                out.append({"n": (f["properties"].get("nome_ap") or "").strip(), "t": (f["properties"].get("classifica") or "").strip(), "p": p})
    return out


def natura(tipo):
    raw = obter(f"https://servicos.dgterritorio.pt/SDISNITWFSSRUP_{tipo}_PT1/WFService.aspx", {"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": f"gmgml:{tipo}", "srsName": "EPSG:4326"})
    out = []
    for m in ET.fromstring(raw).iter():
        if not m.tag.endswith("}" + tipo):
            continue
        nome = next((c.text for c in m if c.tag.endswith("}DESIGNAÇÃO")), "") or ""
        polys = []
        for poly in m.iter(GML + "Polygon"):
            pos = poly.find(f"{GML}exterior/{GML}LinearRing/{GML}posList")
            if pos is not None and pos.text:
                v = [float(t) for t in pos.text.split()]
                polys.append([[v[i + 1], v[i]] for i in range(0, len(v) - 1, 2)])  # GML: lat lon -> lon lat
        if not polys:
            continue
        geom = {"type": "MultiPolygon", "coordinates": [[r] for r in polys]}
        if dentro(geom):
            p = path_of(geom)
            if p:
                out.append({"n": nome.strip().title(), "t": tipo, "p": p})
    return out


def floresta():
    lat0, lon0, lat1, lon1 = BBOX
    w, h = 1300, 2550
    png = obter(COS, {"service": "WMS", "REQUEST": "GetMap", "VERSION": "1.3.0", "LAYERS": "COSc2023", "STYLES": "", "CRS": "EPSG:4326", "BBOX": f"{lat0},{lon0},{lat1},{lon1}", "WIDTH": w, "HEIGHT": h, "FORMAT": "image/png", "TRANSPARENT": "TRUE"}, timeout=300)
    a = np.asarray(Image.open(io.BytesIO(png)).convert("RGBA")).astype(int)
    for nome, (cores, rgb) in CLASSES.items():
        m = np.zeros(a.shape[:2], bool)
        for c in cores:
            m |= (abs(a[..., 0] - c[0]) < 8) & (abs(a[..., 1] - c[1]) < 8) & (abs(a[..., 2] - c[2]) < 8) & (a[..., 3] > 0)
        al = Image.fromarray((m * 255).astype(np.uint8)).resize((int(w * K), int(h * K)), Image.BOX)
        im = Image.new("RGBA", al.size, rgb + (0,))
        im.putalpha(al)
        im.save(OUT / f"floresta-{nome}.png", optimize=True)
        print(nome, (OUT / f"floresta-{nome}.png").stat().st_size // 1024, "kB", round(float(m.mean()) * 100, 1), "% do retângulo")
    x0, y0 = proj(lon0, lat1)
    x1, y1 = proj(lon1, lat0)
    (OUT / "floresta.json").write_text(json.dumps({
        "fonte": "DGT, Carta de Ocupação do Solo Conjuntural 2023 (CC BY)", "fonte_url": "https://dados.gov.pt/datasets/carta-de-ocupacao-do-solo-conjuntural-2023",
        "x": round(x0, 3), "y": round(y0, 3), "largura": round(x1 - x0, 3), "altura": round(y1 - y0, 3),
        "cores": {k: "#%02x%02x%02x" % v[1] for k, v in CLASSES.items()},
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    areas = rnap()
    nat = natura("ZEC") + natura("ZPE")
    print("RNAP", len(areas), "Natura", len(nat))
    (OUT / "protegidas.json").write_text(json.dumps({
        "fonte": "ICNF, Rede Nacional de Áreas Protegidas; DGT/ICNF, Rede Natura 2000 (ZEC e ZPE) (CC BY)",
        "consultado": datetime.date.today().isoformat(),
        "rnap": areas, "natura": nat,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("protegidas.json", (OUT / "protegidas.json").stat().st_size // 1024, "kB")
    floresta()


if __name__ == "__main__":
    main()
