#!/usr/bin/env python3
"""Gera data/fogo/casos.json: casos para escolher no mapa de fogo (zoom e destaque).

Dois grupos, ambos com critério à vista:
- «Mineração»: os dossiês de energia/mineracao.html (data/mineracao.json), na posição aproximada que o dossiê indica;
  se a concessão tem polígono da DGEG (data/fogo/minas.json, campo «caso»), o mapa mostra o polígono.
- «Consultas com mais participações»: consultas do Participa (data/zaer_critico.json) com pelo menos MIN_PART participações
  e concelhos indicados; a posição é a média dos centros desses concelhos (indicativa, não é a localização do projeto).

Uso: python3 scripts/fogo/casos.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gerar import proj  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MIN_PART = 400


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def main():
    geo = json.loads((ROOT / "data" / "participa-geo.json").read_text(encoding="utf-8"))
    minas = json.loads((ROOT / "data" / "fogo" / "minas.json").read_text(encoding="utf-8"))
    com_poligono = {c["caso"] for c in minas["concessoes"] if c.get("caso")}

    def caixa(caso_id):
        """Caixa (x0, y0, x1, y1) dos polígonos da DGEG ligados a um dossiê."""
        v = [float(t) for c in minas["concessoes"] if c.get("caso") == caso_id for t in re.findall(r"-?\d+(?:\.\d+)?", c["p"])]
        xs, ys = v[0::2], v[1::2]
        return min(xs), min(ys), max(xs), max(ys)

    casos = []
    for m in json.loads((ROOT / "data" / "mineracao.json").read_text(encoding="utf-8")):
        x, y = proj(m["lon"], m["lat"])
        r = 9
        posicao = "Posição aproximada, indicada no dossiê: " + (m.get("precisao_coordenadas") or "").lower()
        if m["id"] in com_poligono:  # o polígono oficial manda; as coordenadas dos dossiês são aproximadas e chegam a distar uns 10 km
            x0, y0, x1, y1 = caixa(m["id"])
            x, y, r = (x0 + x1) / 2, (y0 + y1) / 2, max(6, max(x1 - x0, y1 - y0) / 2 + 3)
            posicao = "Posição pelo polígono da concessão (DGEG)."
        casos.append({
            "id": m["id"], "grupo": "min", "nome": m["nome"], "x": round(x, 2), "y": round(y, 2), "r": round(r, 1),
            "onde": f'{m["concelho"]} · {m["distrito"]}', "o_que": m["mineral"], "estado": m["status"],
            "posicao": posicao, "poligono": m["id"] in com_poligono,
            "href": f'/energia/mineracao#caso-{m["id"]}', "href_texto": "Dossiê na página de Mineração",
        })
    zc = json.loads((ROOT / "data" / "zaer_critico.json").read_text(encoding="utf-8"))["consultas_participa"]
    for k in ("abertas", "em_analise"):
        for c in zc[k]:
            nomes = [n for n in (c.get("municipios") or []) if norm(n) in geo["concelhos"]]
            if (c.get("participacoes") or 0) < MIN_PART or not nomes:
                continue
            pts = [geo["concelhos"][norm(n)] for n in nomes]
            cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
            r = max(9, max(max(abs(p[0] - cx), abs(p[1] - cy)) for p in pts) + 5)
            casos.append({
                "id": "c-" + str(c["id"]), "grupo": "cons", "nome": c["titulo"].replace(" - projeto reformulado", ""), "x": round(cx, 2), "y": round(cy, 2), "r": round(r, 1),
                "pts": [[round(p[0], 2), round(p[1], 2)] for p in pts], "onde": ", ".join(nomes), "o_que": c.get("tipologia") or "",
                "estado": f'{c["estado_consulta"]} · {c["participacoes"]:,} participações'.replace(",", " "),
                "posicao": "Indicativa: média dos centros dos concelhos, não a localização do projeto",
                "href": c["url"], "href_texto": "Consulta no Participa",
            })
    out = ROOT / "data" / "fogo" / "casos.json"
    out.write_text(json.dumps({"min_participacoes": MIN_PART, "casos": casos}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(len(casos), "casos:", [c["nome"][:28] for c in casos if c["grupo"] == "cons"])


if __name__ == "__main__":
    main()
