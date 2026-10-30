#!/usr/bin/env python3
"""Gera data/fogo/minas.json: concessões mineiras e áreas de prospeção e pesquisa de Portugal continental.

Fonte: DGEG (Direção-Geral de Energia e Geologia), conjuntos «Concessões Mineiras» e «Prospeção e Pesquisa de Depósitos
Minerais» (dados.gov.pt, licença CC BY), serviços WFS em servergeo.dgeg.gov.pt. São as áreas atribuídas, requeridas ou em
publicação, em vigor; não dizem se a mina está em atividade. Os polígonos vão projetados como os da área ardida
(largura 100, igual ao mapa das consultas), só o anel exterior, simplificados.

Uso: python3 scripts/fogo/minas.py
"""
import datetime
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar import fmt, proj, simplify  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://servergeo.dgeg.gov.pt/arcgis/services/Visualizadores/{s}/MapServer/WFSServer"
CAMADAS = {
    "concessoes": ("CMDP", "CMDP:Concessao_mineira", "Concessionário"),
    "pesquisa": ("PPDP", "ProspPesquisa:Prospeção_e_pesquisa_de_depósitos_minerais", "Titular_"),
}
# Concessões com dossiê na página de Mineração (energia/mineracao.html): número de cadastro da DGEG -> (id do caso, nome curto).
# Só entram as que coincidem pelo número de concessão e pela empresa; a Mina de Alvarrões fica de fora (a empresa não coincide).
CASOS = {
    "MNC000100": ("litio-barroso", "Barroso"), "MNC000152": ("litio-romano", "Romano"), "MNC000166": ("mina-argemela", "Argemela"),
    "MNC000190": ("litio-canedo-covas", "Canedo-Covas"), "MNC000168": ("lagoa-salgada", "Lagoa Salgada"), "MNC000041": ("neves-corvo", "Neves-Corvo"),
    "MNC000009": ("aljustrel", "Aljustrel"), "MNC000018": ("panasqueira", "Panasqueira"),
}
ESTADOS = {"Concedido": "C", "Pedido": "P", "EmPublicacao": "B", "Reservada": "R"}
TOL = 0.02


def nome(v):
    t = (v or "").strip().title()
    for a, b in ((" De ", " de "), (" Do ", " do "), (" Da ", " da "), (" Dos ", " dos "), (" Das ", " das "), (" E ", " e ")):
        t = t.replace(a, b)
    return t


def descarregar(servico, tipo):
    q = urllib.parse.urlencode({"service": "WFS", "version": "2.0.0", "request": "GetFeature", "typeNames": tipo, "outputFormat": "GEOJSON", "srsName": "EPSG:4326"})
    req = urllib.request.Request(BASE.format(s=servico) + "?" + q, headers={"User-Agent": "bioCulture-site (dados abertos; contacto via bioculture.pt)"})
    return json.loads(urllib.request.urlopen(req, timeout=180).read())["features"]


def caminho(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for poly in polys:
        ring = [proj(lon, lat) for lon, lat in poly[0]]
        if len(ring) > 8:  # anel fechado: divide-se no ponto mais afastado para o Douglas-Peucker funcionar
            far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
            ring = simplify(ring[: far + 1], TOL)[:-1] + simplify(ring[far:], TOL)
        if len(ring) >= 4:
            out.append("M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in ring[:-1]) + "Z")
    return "".join(out)


def main():
    saida = {
        "fonte": "DGEG, Concessões Mineiras e Prospeção e Pesquisa de Depósitos Minerais (CC BY)",
        "fonte_url": "https://dados.gov.pt/datasets/concessoes-mineiras",
        "consultado": datetime.date.today().isoformat(),
    }
    for chave, (servico, tipo, _titular) in CAMADAS.items():
        itens = []
        for f in descarregar(servico, tipo):
            p = f["properties"]
            d = caminho(f["geometry"])
            if d:
                itens.append({"n": nome(p.get("Denominação")), "s": (p.get("Substância") or "").strip(), "e": ESTADOS.get(p.get("Situação_Atual"), "?"), "p": d})
                caso = CASOS.get(p.get("N_Cadastro"))
                if caso and chave == "concessoes":
                    itens[-1]["caso"] = caso[0]
        saida[chave] = itens
        if chave == "concessoes":
            saida["casos"] = {c[0]: c[1] for c in CASOS.values() if any(i.get("caso") == c[0] for i in itens)}
        print(chave, len(itens), {e: sum(1 for i in itens if i["e"] == e) for e in set(i["e"] for i in itens)})
    out = ROOT / "data" / "fogo" / "minas.json"
    out.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(out.stat().st_size // 1024, "kB")


if __name__ == "__main__":
    main()
