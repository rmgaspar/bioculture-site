#!/usr/bin/env python3
"""Gera camadas APROXIMADAS das ZAER (PSZAER) a partir dos dois mapas públicos em JPG do portal renovaveisparticipa.pt.

Não são os polígonos oficiais (esses não estão publicados): são os mapas de solar e de eólica (A4, 1:2 000 000) recortados
por cor e alinhados ao contorno do mapa das consultas, ajustando uma transformação afim ao contorno de Portugal que vem
desenhado nos próprios JPG. Serve para ilustrar; não serve para medir áreas nem percentagens.

Saída: data/fogo/zaer-solar.png, data/fogo/zaer-eolica.png (PNG transparentes) e data/fogo/zaer-aprox.json, com a matriz
SVG (pixel do PNG -> coordenadas do mapa, largura 100) e o IoU do ajuste.

Uso:
    python3 scripts/fogo/zaer_aproximado.py [pasta_com_os_jpg]   # descarrega zaer_solar.jpg e zaer_eolica.jpg se faltarem
Precisa de numpy, scipy e Pillow.
"""
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from scipy.optimize import minimize

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "fogo"
BASE = "https://renovaveisparticipa.pt/images/"
K = 0.5  # fator de redução dos PNG de saída


def carregar(pasta, nome):
    f = pasta / f"{nome}.jpg"
    if not f.exists():
        req = urllib.request.Request(BASE + f.name, headers={"User-Agent": "bioCulture-site (dados abertos; contacto via bioculture.pt)"})
        f.write_bytes(urllib.request.urlopen(req, timeout=120).read())
    return np.asarray(Image.open(f).convert("RGB")).astype(int)


def interior(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    linha = (abs(r - g) < 14) & (abs(g - b) < 14) & (r < 160)
    linha[:10, :] = linha[-10:, :] = False
    linha[:, :10] = linha[:, -10:] = False
    return ndi.binary_fill_holes(ndi.binary_dilation(linha, iterations=2))


def ajustar(mask, contorno, altura):
    ys, xs = np.where(mask)
    u0, u1, v0, v1 = xs.min(), xs.max(), ys.min(), ys.max()
    p0 = np.array([(u1 - u0) / 100, 0, u0, 0, (v1 - v0) / altura, v0], float)

    def render(p, s, shape):
        im = Image.new("L", (shape[1], shape[0]), 0)
        pts = [((p[0] * x + p[1] * y + p[2]) / s, (p[3] * x + p[4] * y + p[5]) / s) for x, y in contorno]
        ImageDraw.Draw(im).polygon(pts, fill=255)
        return np.asarray(im) > 0

    for s in (8, 3):
        alvo = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((mask.shape[1] // s, mask.shape[0] // s), Image.BOX)) / 255.0
        alvo = ndi.gaussian_filter(alvo, 1.5)

        def perda(p):
            return float(np.mean((ndi.gaussian_filter(render(p, s, alvo.shape).astype(float), 1.5) - alvo) ** 2))

        r = minimize(perda, p0, method="Nelder-Mead", options={"xatol": 0.01, "fatol": 1e-9, "maxiter": 4000, "maxfev": 6000})
        p0 = r.x
    s = 4
    m = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((mask.shape[1] // s, mask.shape[0] // s), Image.BOX)) > 127
    t = render(p0, s, m.shape)
    return p0, float((m & t).sum() / (m | t).sum())


def camada(a, canal, mascara):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alfa = np.clip(r - b, 0, 255) if canal == "solar" else np.clip(b - r, 0, 255)
    alfa = np.where(mascara, alfa, 0)
    return alfa.astype(np.uint8)


def main(pasta):
    pasta.mkdir(parents=True, exist_ok=True)
    geo = json.loads((ROOT / "data" / "participa-geo.json").read_text(encoding="utf-8"))
    sol, eol = carregar(pasta, "zaer_solar"), carregar(pasta, "zaer_eolica")
    mask = interior(sol)
    p, iou = ajustar(mask, geo["contorno"], geo["altura"])
    print("IoU do ajuste:", round(iou, 4), "parâmetros:", np.round(p, 4))
    near = ndi.binary_dilation(mask, iterations=6)
    ys, xs = np.where(near)
    cu0, cu1, cv0, cv1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    B = np.array([[p[0], p[1]], [p[3], p[4]]])
    Bi = np.linalg.inv(B)
    c = np.array([p[2], p[5]])
    e = Bi @ (np.array([cu0, cv0]) - c)
    w, h = int((cu1 - cu0) * K), int((cv1 - cv0) * K)
    matriz = [Bi[0, 0] / K, Bi[1, 0] / K, Bi[0, 1] / K, Bi[1, 1] / K, e[0], e[1]]
    cores = {"solar": (224, 168, 0), "eolica": (47, 127, 209)}
    OUT.mkdir(parents=True, exist_ok=True)
    for nome, a, canal in (("solar", sol, "solar"), ("eolica", eol, "eolica")):
        alfa = camada(a, canal, near)[cv0:cv1, cu0:cu1]
        al = Image.fromarray(alfa).resize((w, h), Image.BOX)
        im = Image.new("RGBA", (w, h), cores[nome] + (0,))
        im.putalpha(al)
        im.save(OUT / f"zaer-{nome}.png", optimize=True)
        print(nome, (OUT / f"zaer-{nome}.png").stat().st_size // 1024, "kB", w, h)
    (OUT / "zaer-aprox.json").write_text(json.dumps({
        "nota": "Aproximação: mapas JPG de solar e eólica do portal renovaveisparticipa.pt, alinhados ao contorno. Não são os polígonos oficiais.",
        "fonte_url": "https://renovaveisparticipa.pt/zonas-aceleracao/",
        "iou_ajuste": round(iou, 4), "largura": w, "altura": h,
        "matriz": [round(v, 6) for v in matriz],
    }, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "cache-zaer")
