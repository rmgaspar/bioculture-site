#!/usr/bin/env python3
"""Molduras (modelos visuais) para as publicações de Facebook e Instagram.

Cada tipo de publicação tem a sua moldura. Esta primeira versão testa três propostas para o alerta de consultas.

Uso:
    python3 scripts/social/molduras.py alerta DESTINO_PASTA
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
W, H = 1080, 1350
SYS = "/System/Library/Fonts/"


def f(familia, estilo, tam):
    ficheiro, idx = {
        ("bodoni", "bold"): ("Bodoni 72.ttc", 2), ("bodoni", "book"): ("Bodoni 72.ttc", 0), ("bodoni", "italic"): ("Bodoni 72.ttc", 1),
        ("avenir", "heavy"): ("Avenir Next.ttc", 8), ("avenir", "demi"): ("Avenir Next.ttc", 2), ("avenir", "medium"): ("Avenir Next.ttc", 5),
        ("avenir", "regular"): ("Avenir Next.ttc", 7), ("avenir", "bold"): ("Avenir Next.ttc", 0),
        ("cond", "heavy"): ("Avenir Next Condensed.ttc", 8), ("cond", "bold"): ("Avenir Next Condensed.ttc", 0),
    }[(familia, estilo)]
    return ImageFont.truetype(SYS + ficheiro, tam, index=idx)


def dados():
    return json.loads((ROOT / "data" / "zaer_critico.json").read_text(encoding="utf-8"))


MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
NOMES = {
    "vigia": ("Parque Eólico de Vigia", "Sobreequipamento · Tarouca"),
    "vilar": ("Vilar-Tabuaço", "Solar flutuante e eólico"),
    "ruiva": ("Terra Ruiva", "Central solar fotovoltaica"),
}


def consultas():
    out = []
    for r in sorted(dados()["consultas_participa"]["abertas"], key=lambda r: r["fim"]):
        k = "vigia" if "vigia" in r["url"] else "vilar" if "vilar" in r["url"] else "ruiva"
        d = dt.date.fromisoformat(r["fim"])
        out.append({"k": k, "dia": d.day, "mes": MESES[d.month - 1], "data": d, "nome": NOMES[k][0], "sub": NOMES[k][1], "n": r.get("participacoes")})
    return out


def logo(im, x, y, tam=64, cor_texto=(26, 46, 36), cor_sub=(200, 90, 40)):
    mark = Image.open(ROOT / "images" / "bioculture-mark-v3.png").convert("RGB").resize((tam, tam), Image.LANCZOS)
    m = Image.new("L", (tam, tam), 0)
    ImageDraw.Draw(m).ellipse((0, 0, tam - 1, tam - 1), fill=255)
    im.paste(mark, (x, y), m)
    d = ImageDraw.Draw(im)
    d.text((x + tam + 16, y - 4), "bioCulture", font=f("bodoni", "book", int(tam * 0.6)), fill=cor_texto)
    d.text((x + tam + 17, y + int(tam * 0.66)), "REGENERAÇÃO GLOBAL", font=f("avenir", "bold", int(tam * 0.2)), fill=cor_sub)


def pill(d, x, y, t, fonte, fundo, cor, pad=30, alt=64):
    w = int(d.textlength(t, font=fonte)) + 2 * pad
    d.rounded_rectangle((x, y, x + w, y + alt), radius=alt // 2, fill=fundo)
    d.text((x + pad, y + alt / 2 + 1), t, font=fonte, fill=cor, anchor="lm")
    return x + w


def quebrar(d, t, fonte, largura):
    linhas, atual = [], ""
    for p in t.split():
        teste = (atual + " " + p).strip()
        if d.textlength(teste, font=fonte) <= largura:
            atual = teste
        else:
            linhas.append(atual)
            atual = p
    if atual:
        linhas.append(atual)
    return linhas


# ---------- Proposta A: cartaz claro, datas gigantes ----------
def alerta_a(destino):
    C = consultas()
    im = Image.new("RGB", (W, H), (250, 245, 234))
    d = ImageDraw.Draw(im)
    M = 80
    logo(im, M, 64)
    pill(d, W - M - 330, 66, "PRAZOS A FECHAR", f("avenir", "heavy", 24), (214, 74, 44), (255, 255, 255), pad=26, alt=56)
    y = 190
    for l in ("Ainda vais a tempo", "de participar."):
        d.text((M, y), l, font=f("bodoni", "bold", 100), fill=(24, 42, 33))
        y += 112
    y += 34
    for c in C:
        d.text((M, y - 10), f"{c['dia']}", font=f("cond", "heavy", 170), fill=(214, 74, 44))
        wnum = int(d.textlength(f"{c['dia']}", font=f("cond", "heavy", 170)))
        d.text((M + wnum + 14, y + 6), c["mes"], font=f("avenir", "heavy", 52), fill=(24, 42, 33))
        x2 = M + 400
        d.text((x2, y + 30), c["nome"], font=f("bodoni", "bold", 52), fill=(24, 42, 33))
        d.text((x2, y + 100), c["sub"], font=f("avenir", "medium", 29), fill=(90, 102, 94))
        y += 205
    # barra de ligação
    h = 150
    yb = H - 80 - h
    d.rounded_rectangle((M, yb, W - M, yb + h), radius=30, fill=(24, 42, 33))
    d.text((M + 44, yb + 30), "participa.pt", font=f("avenir", "heavy", 54), fill=(255, 255, 255))
    d.text((M + 44, yb + 100), "Lê, comenta, carrega em «Seguir»", font=f("avenir", "medium", 28), fill=(184, 205, 190))
    t = "bioculture.pt/consultas"
    d.text((W - M - 44, yb + h / 2), t, font=f("avenir", "demi", 34), fill=(244, 177, 60), anchor="rm")
    im.save(destino / "alerta-A-cartaz.png")


# ---------- Proposta B: foto + faixa âmbar ----------
def alerta_b(destino):
    C = consultas()
    im = Image.new("RGB", (W, H), (250, 245, 234))
    foto = Image.open(ROOT / "images" / "renovaveis" / "zaer-norte-lisboa.webp").convert("RGB")
    alt = 700
    r = max(W / foto.width, alt / foto.height)
    foto = foto.resize((int(foto.width * r) + 1, int(foto.height * r) + 1), Image.LANCZOS)
    foto = foto.crop(((foto.width - W) // 2, int((foto.height - alt) * 0.35), (foto.width - W) // 2 + W, int((foto.height - alt) * 0.35) + alt))
    im.paste(foto, (0, 0))
    ov = Image.new("RGBA", (W, alt), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(alt):
        od.line((0, i, W, i), fill=(12, 22, 17, int(210 * (i / alt) ** 2.4)))
    im.paste(ov, (0, 0), ov)
    d = ImageDraw.Draw(im)
    M = 80
    # logo claro por cima da foto
    logo(im, M, 60, cor_texto=(255, 255, 255), cor_sub=(244, 177, 60))
    # faixa âmbar com o título
    yb = 470
    d.rectangle((0, yb, W, yb + 330), fill=(244, 177, 60))
    d.text((M, yb + 34), "3", font=f("cond", "heavy", 300), fill=(24, 42, 33))
    d.text((M + 170, yb + 48), "CONSULTAS", font=f("avenir", "heavy", 78), fill=(24, 42, 33))
    d.text((M + 170, yb + 138), "PÚBLICAS ABERTAS", font=f("avenir", "heavy", 78), fill=(24, 42, 33))
    d.text((M + 172, yb + 244), "A tua opinião conta, mas tem prazo.", font=f("bodoni", "italic", 38), fill=(24, 42, 33))
    # datas
    y = yb + 330 + 40
    x = M
    larg = (W - 2 * M - 2 * 24) // 3
    for c in C:
        d.rounded_rectangle((x, y, x + larg, y + 240), radius=26, fill=(255, 255, 255))
        d.text((x + 28, y + 14), str(c["dia"]), font=f("cond", "heavy", 120), fill=(214, 74, 44))
        wnum = int(d.textlength(str(c["dia"]), font=f("cond", "heavy", 120)))
        d.text((x + 28 + wnum + 10, y + 62), c["mes"], font=f("avenir", "heavy", 34), fill=(24, 42, 33))
        for j, linha in enumerate(quebrar(d, c["nome"], f("avenir", "demi", 28), larg - 56)[:2]):
            d.text((x + 28, y + 160 + j * 34), linha, font=f("avenir", "demi", 28), fill=(24, 42, 33))
        x += larg + 24
    d.text((M, 1128), "Regista-te grátis em participa.pt, lê o resumo e comenta.", font=f("avenir", "medium", 30), fill=(60, 74, 66))
    d.text((M, H - 100), "bioculture.pt/consultas", font=f("avenir", "heavy", 46), fill=(24, 42, 33))
    d.text((M, H - 40), "Foto: pedrik · CC BY 2.0 · Wikimedia Commons", font=f("avenir", "regular", 20), fill=(120, 128, 122))
    im.save(destino / "alerta-B-foto.png")


# ---------- Proposta C: escuro, número gigante e linha do tempo ----------
def alerta_c(destino):
    C = consultas()
    BG, AM, BR = (17, 22, 20), (244, 177, 60), (255, 255, 255)
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    M = 80
    logo(im, M, 64, cor_texto=BR, cor_sub=AM)
    pill(d, W - M - 300, 66, "CONSULTAS", f("avenir", "heavy", 24), AM, BG, pad=26, alt=56)
    d.text((M - 8, 150), "3", font=f("cond", "heavy", 620), fill=AM)
    d.text((M + 330, 300), "consultas", font=f("bodoni", "bold", 96), fill=BR)
    d.text((M + 330, 410), "abertas agora.", font=f("bodoni", "bold", 96), fill=BR)
    d.text((M + 334, 540), "Renováveis em Portugal.", font=f("avenir", "medium", 36), fill=(170, 180, 174))
    # linha do tempo
    hoje = dt.date.today()
    fim = max(c["data"] for c in C) + dt.timedelta(days=4)
    ax0, ax1, ay = M, W - M, 800
    d.line((ax0, ay, ax1, ay), fill=(70, 82, 76), width=6)

    def px(data):
        return ax0 + (ax1 - ax0) * (data - hoje).days / (fim - hoje).days

    d.ellipse((ax0 - 12, ay - 12, ax0 + 12, ay + 12), fill=BR)
    d.text((ax0, ay + 34), "HOJE", font=f("avenir", "heavy", 24), fill=(170, 180, 174), anchor="la")
    curtos = {"vigia": "Vigia", "vilar": "Vilar-Tabuaço", "ruiva": "Terra Ruiva"}
    for i, c in enumerate(C):
        x = px(c["data"])
        if i == 0:
            d.line((ax0 + 12, ay, x, ay), fill=AM, width=6)
        d.ellipse((x - 18, ay - 18, x + 18, ay + 18), fill=AM)
        up = i % 2 == 0
        ancora = "ra" if i == len(C) - 1 else "la"
        xx = x + 24 if ancora == "la" else x + 18
        if up:
            d.line((x, ay - 18, x, ay - 62), fill=(110, 124, 116), width=3)
            yy = ay - 190
        else:
            d.line((x, ay + 18, x, ay + 62), fill=(110, 124, 116), width=3)
            yy = ay + 56
        xx = x + 14 if ancora == "la" else x + 4
        d.text((xx, yy), f"{c['dia']} {c['mes']}", font=f("avenir", "heavy", 54), fill=AM, anchor=ancora)
        d.text((xx, yy + 66), curtos[c["k"]], font=f("avenir", "demi", 30), fill=BR, anchor=ancora)
    # bloco de ação
    yb = 1020
    d.rounded_rectangle((M, yb, W - M, yb + 200), radius=34, fill=AM)
    d.text((M + 48, yb + 38), "Comenta em participa.pt", font=f("bodoni", "bold", 54), fill=BG)
    d.text((M + 48, yb + 118), "Grátis. Lê o resumo e escolhe: concordo, discordo ou sugiro.", font=f("avenir", "demi", 28), fill=BG)
    d.text((W / 2, H - 70), "bioculture.pt/consultas", font=f("avenir", "heavy", 40), fill=BR, anchor="mm")
    im.save(destino / "alerta-C-escuro.png")


if __name__ == "__main__":
    destino = Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    {"alerta": lambda: (alerta_a(destino), alerta_b(destino), alerta_c(destino))}[sys.argv[1]]()
    print("ok", destino)
