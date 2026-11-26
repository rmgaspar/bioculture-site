#!/usr/bin/env python3
"""Um cartão por consulta pública aberta, com os números que estão na ficha do site.

Os números são os mesmos de data/consultas-mapa.json («numeros»), para não circularem
duas versões: o que muda no site muda aqui. Cada cartão sai a 1080×1350 (4:5).

Uso:
    python3 scripts/social/cartoes_consultas.py PASTA_DESTINO [--lingua pt|en]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from molduras import ROOT, W, H, f, logo, pill, quebrar  # noqa: E402
from molduras2 import (  # noqa: E402
    M, NAVY, CARD, BRANCO, MUDO, SKY, CORAL, SAND, MINT,
    cabecalho_dados, fundo, rodape_dados,
)

# Uma cor por tema, para o cartão se reconhecer de relance.
COR_TEMA = {"Mineração": SAND, "Biometano": MINT, "Desflorestação": CORAL}
MES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
          "agosto", "setembro", "outubro", "novembro", "dezembro"]
MES_EN = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
# A Avenir não tem os índices inferiores; no site ficam bem, no cartão saíam quadrados vazios.
INDICES = str.maketrans({"₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4"})


def ficheiro(nome: str) -> str:
    base = unicodedata.normalize("NFD", nome.lower())
    base = "".join(c for c in base if unicodedata.category(c) != "Mn")
    return "".join(c if c.isalnum() else "-" for c in base).strip("-").replace("--", "-")


def prazo(fim: str, en: bool) -> str:
    data = dt.date.fromisoformat(fim)
    mes = (MES_EN if en else MES_PT)[data.month - 1]
    return f"until {data.day} {mes}" if en else f"até {data.day} de {mes}"


def cartao(destino: Path, consulta: dict, meta: dict, en: bool) -> Path:
    numeros = meta.get("numeros") or []
    if not numeros:
        raise ValueError(f"{consulta['id']}: sem «numeros» em data/consultas-mapa.json")
    tema = consulta.get("tema") or ""
    acento = COR_TEMA.get(tema, SKY)
    nome = (meta.get("nome_en") if en else meta.get("nome")) or consulta["titulo"]
    municipios = consulta.get("municipios") or []
    if len(municipios) > 3:  # listas longas não cabem numa linha e empurram o prazo para fora
        resto = len(municipios) - 2
        mais = f"and {resto} more" if en else f"e mais {resto}"
        onde = " · ".join(municipios[:2] + [mais])
    else:
        onde = " · ".join(municipios) or ", ".join(consulta.get("distritos") or [])

    im, d = fundo(NAVY)
    logo(im, M, 60, cor_texto=BRANCO, cor_sub=acento)
    etiqueta = ("Public consultation" if en else "Consulta pública").upper()
    larg = int(d.textlength(etiqueta, font=f("avenir", "heavy", 24))) + 52
    pill(d, W - M - larg, 62, etiqueta, f("avenir", "heavy", 24), acento, NAVY, pad=26, alt=56)

    # Título e, por baixo, onde é e até quando.
    y = 186
    tam = 76 if len(nome) < 46 else 64
    for linha in quebrar(d, nome, f("bodoni", "bold", tam), W - 2 * M)[:3]:
        d.text((M, y), linha, font=f("bodoni", "bold", tam), fill=BRANCO)
        y += int(tam * 1.08)
    y += 14
    sub = " · ".join(x for x in (onde, prazo(consulta["fim"], en)) if x)
    for linha in quebrar(d, sub, f("avenir", "medium", 32), W - 2 * M)[:2]:
        d.text((M, y), linha, font=f("avenir", "medium", 32), fill=acento)
        y += 44
    y += 32

    # Os números, cada um num cartão com uma barra da cor do tema.
    texto = lambda n, k: ((n.get(k + "_en") if en else n.get(k)) or n[k]).translate(INDICES)
    alturas = []
    for n in numeros:
        linhas = quebrar(d, texto(n, "t"), f("avenir", "medium", 30), W - 2 * M - 86)
        alturas.append(128 + len(linhas) * 40)
    # Espalha o que sobra entre os blocos, para o cartão não ficar vazio em baixo.
    espaco = H - 190 - y
    folga = min(90, max(24, (espaco - sum(alturas)) // (len(numeros) + 1)))
    y += folga

    for n, alt in zip(numeros, alturas):
        valor, legenda = texto(n, "v"), texto(n, "t")
        d.rounded_rectangle((M - 24, y, W - M + 24, y + alt), radius=26, fill=CARD)
        d.rectangle((M - 24, y + 26, M - 12, y + alt - 26), fill=acento)
        tv = 92 if len(valor) <= 9 else 72
        d.text((M + 6, y + 26), valor, font=f("bodoni", "bold", tv), fill=BRANCO)
        yy = y + 26 + int(tv * 1.02) + 16
        for linha in quebrar(d, legenda, f("avenir", "medium", 30), W - 2 * M - 86):
            d.text((M + 6, yy), linha, font=f("avenir", "medium", 30), fill=(196, 212, 226))
            yy += 40
        y += alt + folga

    fonte = ("Promoter's own documents on participa.pt" if en
             else "Números dos documentos do próprio promotor, no participa.pt")
    rodape_dados(d, "bioculture.pt", fonte)
    saida = destino / f"{ficheiro(meta.get('nome') or consulta['id'])}{'-en' if en else ''}.png"
    im.save(saida)
    return saida


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("destino", type=Path)
    ap.add_argument("--lingua", choices=("pt", "en"), default="pt")
    args = ap.parse_args()
    en = args.lingua == "en"

    zaer = json.loads((ROOT / "data/zaer_critico.json").read_text(encoding="utf8"))
    itens = json.loads((ROOT / "data/consultas-mapa.json").read_text(encoding="utf8"))["itens"]
    abertas = [c for c in zaer["consultas_participa"]["abertas"] if not c.get("alerta_qualidade")]

    args.destino.mkdir(parents=True, exist_ok=True)
    feitos, sem = [], []
    for consulta in sorted(abertas, key=lambda c: c["fim"]):
        meta = itens.get(consulta["id"]) or {}
        if not meta.get("numeros"):
            sem.append(consulta["titulo"])
            continue
        feitos.append(cartao(args.destino, consulta, meta, en))

    for caminho in feitos:
        print(caminho)
    if sem:
        print(f"sem «numeros», ficaram de fora: {'; '.join(sem)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
