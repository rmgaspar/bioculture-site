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


# ---------- Proposta B: foto + faixa âmbar (escolhida para os alertas) ----------
def alerta_b(destino, altura=1350, nome="alerta-B-foto.png"):
    C = consultas()
    Hh = altura
    extra = Hh - 1350
    im = Image.new("RGB", (W, Hh), (250, 245, 234))
    foto = Image.open(ROOT / "images" / "renovaveis" / "zaer-norte-lisboa.webp").convert("RGB")
    alt = 700 + extra // 2
    r = max(W / foto.width, alt / foto.height)
    foto = foto.resize((int(foto.width * r) + 1, int(foto.height * r) + 1), Image.LANCZOS)
    x0 = (foto.width - W) // 2
    y0 = int((foto.height - alt) * 0.35)
    foto = foto.crop((x0, y0, x0 + W, y0 + alt))
    im.paste(foto, (0, 0))
    ov = Image.new("RGBA", (W, alt), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(alt):
        base = int(210 * (i / alt) ** 2.4)
        topo = int(190 * max(0.0, 1 - i / 210) ** 1.5)
        od.line((0, i, W, i), fill=(12, 22, 17, max(base, topo)))
    im.paste(ov, (0, 0), ov)
    d = ImageDraw.Draw(im)
    M = 80
    logo(im, M, 60, cor_texto=(255, 255, 255), cor_sub=(244, 177, 60))
    yb = 470 + extra // 2
    d.rectangle((0, yb, W, yb + 330), fill=(244, 177, 60))
    d.text((M, yb + 34), "3", font=f("cond", "heavy", 300), fill=(24, 42, 33))
    d.text((M + 170, yb + 48), "CONSULTAS", font=f("avenir", "heavy", 78), fill=(24, 42, 33))
    d.text((M + 170, yb + 138), "PÚBLICAS ABERTAS", font=f("avenir", "heavy", 78), fill=(24, 42, 33))
    d.text((M + 172, yb + 244), "A tua opinião conta, mas tem prazo.", font=f("bodoni", "italic", 38), fill=(24, 42, 33))
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
    d.text((M, y + 240 + 38), "Regista-te grátis em participa.pt, lê o resumo e comenta.", font=f("avenir", "medium", 30), fill=(60, 74, 66))
    d.text((M, Hh - 100 - (60 if extra else 0)), "bioculture.pt/consultas", font=f("avenir", "heavy", 46), fill=(24, 42, 33))
    d.text((M, Hh - 40 - (60 if extra else 0)), "Foto: pedrik · CC BY 2.0 · Wikimedia Commons", font=f("avenir", "regular", 20), fill=(120, 128, 122))
    im.save(destino / nome)


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




# ---------- utilitários de fotografia ----------
def foto_commons(titulo):
    """Descarrega uma fotografia da Wikimedia Commons para social/fotos/ e devolve (caminho, crédito)."""
    import io
    import re
    import urllib.parse
    import urllib.request
    UA = {"User-Agent": "bioCulture-site/1.0 (https://www.bioculture.pt; geral@bioculture.pt)"}
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({"action": "query", "titles": titulo, "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 1800, "format": "json"})
    ii = list(json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA)))["query"]["pages"].values())[0]["imageinfo"][0]
    meta = ii["extmetadata"]
    lic = meta["LicenseShortName"]["value"]
    if not re.match(r"^(CC0|CC BY|CC BY-SA|Public domain)", lic):
        raise SystemExit(f"licença não permitida: {lic}")
    autor = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")) or "autor desconhecido").strip()
    autor = autor[:40]
    pasta = ROOT / "social" / "fotos"
    pasta.mkdir(parents=True, exist_ok=True)
    caminho = pasta / (re.sub(r"[^A-Za-z0-9]+", "-", titulo)[:60] + ".jpg")
    if not caminho.exists():
        caminho.write_bytes(urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA)).read())
    return caminho, f"Foto: {autor} · {lic} · Wikimedia Commons"


def foto_topo(im, caminho, alt, enquadra=(0.5, 0.4)):
    foto = Image.open(caminho).convert("RGB")
    r = max(W / foto.width, alt / foto.height)
    foto = foto.resize((int(foto.width * r) + 1, int(foto.height * r) + 1), Image.LANCZOS)
    x0 = int((foto.width - W) * enquadra[0])
    y0 = int((foto.height - alt) * enquadra[1])
    im.paste(foto.crop((x0, y0, x0 + W, y0 + alt)), (0, 0))
    ov = Image.new("RGBA", (W, alt), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(alt):
        od.line((0, i, W, i), fill=(12, 22, 17, max(int(200 * (i / alt) ** 2.6), int(190 * max(0.0, 1 - i / 210) ** 1.5))))
    im.paste(ov, (0, 0), ov)


def centro_texto(d, caixa, t, fonte, cor, folga=1.25):
    x0, y0, x1, y1 = caixa
    linhas = quebrar(d, t, fonte, x1 - x0)
    h = int(fonte.size * folga)
    y = y0
    for linha in linhas:
        d.text((x0, y), linha, font=fonte, fill=cor)
        y += h
    return y


# ---------- Moldura: técnica de horta ----------
def tecnica(id_, destino, passos_n=3, passos=None, titulo=None):
    dicas = {x["id"]: x for x in json.loads((ROOT / "data" / "dicas.json").read_text(encoding="utf-8"))}
    x = dicas[id_]
    foto = next(i for i in x["imagens"] if i.get("tipo") == "foto")
    caminho = ROOT / "images" / foto["ficheiro"]
    credito = f"Foto: {foto['autor']} · {foto['licenca'].replace('Public domain', 'domínio público')} · Wikimedia Commons"
    VERDE, ESC, CREME = (150, 196, 98), (24, 42, 33), (250, 245, 234)
    im = Image.new("RGB", (W, H), CREME)
    foto_topo(im, caminho, 640)
    d = ImageDraw.Draw(im)
    M = 80
    logo(im, M, 60, cor_texto=(255, 255, 255), cor_sub=(244, 177, 60))
    pill(d, W - M - 330, 62, "TÉCNICA DE HORTA", f("avenir", "heavy", 24), VERDE, ESC, pad=26, alt=56)
    yb = 440
    extra = 66 if len(quebrar(d, titulo or x["titulo"], f("bodoni", "bold", 76), W - 2 * M)) > 1 and len(quebrar(d, titulo or x["titulo"], f("bodoni", "bold", 92), W - 2 * M)) > 1 else 0
    bh = 300 + extra
    d.rectangle((0, yb, W, yb + bh), fill=VERDE)
    d.text((M, yb + 34), f"{x['nivel'].upper()} · {x['categoria'].upper()}", font=f("avenir", "heavy", 26), fill=(40, 78, 36))
    titulo = titulo or x["titulo"]
    for tam in range(92, 55, -4):
        linhas = quebrar(d, titulo, f("bodoni", "bold", tam), W - 2 * M)
        if len(linhas) == 1 or (len(linhas) == 2 and tam <= 76):
            break
    yy = yb + 84
    for l in linhas[:2]:
        d.text((M, yy), l, font=f("bodoni", "bold", tam), fill=ESC)
        yy += int(tam * 1.1)
    quando = (x.get("quando") or "").split(". ")[0].rstrip(".") + "."
    d.text((M, yb + bh - 62), quando, font=f("bodoni", "italic", 36), fill=ESC)
    # passos
    y = yb + bh + 36
    larg = (W - 2 * M - 2 * 24) // 3
    for i, p in enumerate((passos or x["passos"])[:passos_n]):
        xx = M + i * (larg + 24)
        d.rounded_rectangle((xx, y, xx + larg, y + 310), radius=26, fill=(255, 255, 255))
        d.text((xx + 28, y + 6), str(i + 1), font=f("cond", "heavy", 120), fill=(88, 150, 60))
        centro_texto(d, (xx + 28, y + 136, xx + larg - 24, y + 310), p, f("avenir", "demi", 27), ESC, 1.22)
    ev = x["erros_evitar"][0]
    d.text((M, y + 310 + 30), "EVITAR", font=f("avenir", "heavy", 26), fill=(214, 74, 44))
    d.text((M + 120, y + 310 + 27), ev, font=f("avenir", "medium", 30), fill=(60, 74, 66))
    d.text((M, H - 100), "bioculture.pt/tecnicas", font=f("avenir", "heavy", 46), fill=ESC)
    d.text((M, H - 40), credito, font=f("avenir", "regular", 20), fill=(120, 128, 122))
    im.save(destino / f"tecnica-{id_}.png")


# ---------- Moldura: problema na horta ----------
def problema(id_, destino, titulo_foto, enquadra=(0.5, 0.4), autor=None, titulo=None, resumo=None):
    pr = {x["id"]: x for x in json.loads((ROOT / "data" / "problemas-horta.json").read_text(encoding="utf-8"))["problemas"]}
    x = pr[id_]["pt"]
    caminho, credito = foto_commons(titulo_foto)
    if autor:
        credito = f"Foto: {autor} · " + credito.split(" · ", 1)[1]
    TIJOLO, ESC, CREME = (214, 74, 44), (24, 42, 33), (250, 245, 234)
    im = Image.new("RGB", (W, H), CREME)
    foto_topo(im, caminho, 600, enquadra)
    d = ImageDraw.Draw(im)
    M = 80
    logo(im, M, 60, cor_texto=(255, 255, 255), cor_sub=(244, 177, 60))
    pill(d, W - M - 360, 62, "PROBLEMA NA HORTA", f("avenir", "heavy", 24), TIJOLO, (255, 255, 255), pad=26, alt=56)
    yb = 420
    d.rectangle((0, yb, W, yb + 312), fill=TIJOLO)
    tam = 80
    t = titulo or (x["titulo"] if x["titulo"].endswith("?") else x["titulo"] + "?")
    while len(quebrar(d, t, f("bodoni", "bold", tam), W - 2 * M)) > 2 and tam > 52:
        tam -= 4
    yy = yb + 40
    for l in quebrar(d, t, f("bodoni", "bold", tam), W - 2 * M)[:2]:
        d.text((M, yy), l, font=f("bodoni", "bold", tam), fill=(255, 255, 255))
        yy += int(tam * 1.12)
    d.text((M, yb + 312 - 56), "Respostas curtas, com as causas e o que fazer primeiro.", font=f("bodoni", "italic", 32), fill=(255, 236, 226))
    # porquê
    y = yb + 312 + 30
    d.text((M, y), "PORQUÊ", font=f("avenir", "heavy", 26), fill=TIJOLO)
    y = centro_texto(d, (M, y + 40, W - M, y + 160), resumo or x["resumo"], f("avenir", "demi", 33), ESC, 1.28) + 18
    d.text((M, y), "O QUE FAZER", font=f("avenir", "heavy", 26), fill=(60, 120, 50))
    y += 44
    for i, p in enumerate(x["fazer"][:3], 1):
        d.ellipse((M, y + 2, M + 46, y + 48), fill=(150, 196, 98))
        d.text((M + 23, y + 25), str(i), font=f("avenir", "heavy", 28), fill=ESC, anchor="mm")
        y = centro_texto(d, (M + 68, y, W - M, y + 100), p, f("avenir", "medium", 30), (50, 62, 55), 1.25) + 16
    d.text((M, H - 100), "bioculture.pt/problemas", font=f("avenir", "heavy", 46), fill=ESC)
    d.text((M, H - 40), credito, font=f("avenir", "regular", 20), fill=(120, 128, 122))
    im.save(destino / f"problema-{id_}.png")


def horta(destino):
    for k in ("mulching-organico", "adubo-verde", "folhas-molde", "captacao-chuva", "no-dig", "colheita-azeitona"):
        if k == "colheita-azeitona":
            tecnica(k, destino, passos=["Limpa o chão debaixo das copas e estende panos ou mantas.", "Apanha à mão ou com pentes e reduz o varejo ao mínimo.", "Não pises a azeitona nas mantas: a maior parte do dano ao fruto vem de pessoas a pisá-lo."], titulo="Apanha da azeitona")
        else:
            tecnica(k, destino)
    problema("lesmas-e-caracois", destino, "File:Arion rufus, Tallinn Botanic Garden.jpg", (0.5, 0.55))
    problema("favas-nao-nascem", destino, "File:-2020-10-27 Young Broad bean plant (Vicia faba), Trimingham (2).JPG", (0.5, 0.35), autor="Kolforn")
    problema("ervilhas-nao-nascem", destino, "File:Pea seed germinating.jpg", (0.5, 0.2))
    problema("oliveira-olho-de-pavao", destino, "File:Spilocaea oleagina.jpg", (0.5, 0.5), autor="Eri",
             titulo="Manchas nas folhas da oliveira (olho-de-pavão)?",
             resumo="Manchas circulares escuras, por vezes com halo amarelo, e queda de folha. O fungo infeta sobretudo no outono e no inverno, com humidade.")


if __name__ == "__main__":
    destino = Path(sys.argv[2])
    destino.mkdir(parents=True, exist_ok=True)
    {"alerta": lambda: (alerta_a(destino), alerta_b(destino), alerta_c(destino)),
     "alerta-b": lambda: (alerta_b(destino), alerta_b(destino, 1920, "alerta-B-story.png")),
     "teste": lambda: (tecnica("folhas-molde", destino), problema("tomate-fundo-preto", destino, "File:Blossom end rot.JPG", (0.5, 0.5))),
     "horta": lambda: horta(destino)}[sys.argv[1]]()
    print("ok", destino)
