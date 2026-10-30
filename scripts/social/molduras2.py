#!/usr/bin/env python3
"""Molduras de dados, em foco e catálogo (a par das de alerta, técnica e problema, em molduras.py).

Uso:
    python3 scripts/social/molduras2.py PASTA_DESTINO
"""
from __future__ import annotations

import collections
import datetime as dt
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
from molduras import ROOT, W, H, f, logo, pill, quebrar  # noqa: E402

M = 80
# Dados: azul-ardósia profundo, azul-céu e coral
NAVY, CARD, LINE = (14, 30, 44), (24, 48, 68), (48, 78, 102)
SKY, CORAL, MINT, SAND = (104, 178, 255), (255, 133, 98), (92, 214, 170), (255, 205, 112)
BRANCO, MUDO = (255, 255, 255), (150, 172, 190)
CREME, INK = (250, 245, 234), (24, 42, 33)


def fundo(cor, altura=H):
    im = Image.new("RGB", (W, altura), cor)
    return im, ImageDraw.Draw(im)


def foto_cheia(im, ficheiro, altura, enq=(0.5, 0.5), caminho_abs=None):
    caminho = caminho_abs or (ROOT / "images" / ficheiro)
    foto = Image.open(caminho).convert("RGB")
    r = max(W / foto.width, altura / foto.height)
    foto = foto.resize((int(foto.width * r) + 1, int(foto.height * r) + 1), Image.LANCZOS)
    x0 = int((foto.width - W) * enq[0])
    y0 = int((foto.height - altura) * enq[1])
    im.paste(foto.crop((x0, y0, x0 + W, y0 + altura)), (0, 0))


def sombra(im, y0, y1, cor, a0, a1, curva=1.8):
    ov = Image.new("RGBA", (W, y1 - y0), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    n = y1 - y0
    for i in range(n):
        t = i / max(n - 1, 1)
        od.line((0, i, W, i), fill=cor + (int(a0 + (a1 - a0) * t ** curva),))
    im.paste(ov, (0, y0), ov)


# ---------- Em foco: fotografia a toda a altura ----------
def em_foco(destino, nome, pilula, titulo, sub, factos, foto, credito, link, enq=(0.5, 0.5), tam=84, acento=SAND):
    im, d = fundo(NAVY)
    foto_cheia(im, foto, H, enq)
    sombra(im, 0, 260, (8, 16, 12), 170, 0, 0.6)
    sombra(im, 200, H, (6, 12, 9), 0, 250, 1.35)
    d = ImageDraw.Draw(im)
    logo(im, M, 60, cor_texto=BRANCO, cor_sub=acento)
    pill(d, W - M - 270, 62, "EM FOCO", f("avenir", "heavy", 24), acento, INK, pad=26, alt=56)
    # bloco de texto a partir de baixo
    y_rodape = H - 150
    nfact = len(factos)
    y_f = y_rodape - 200
    for_h = 190
    # título e subtítulo acima dos factos
    linhas = quebrar(d, titulo, f("bodoni", "bold", tam), W - 2 * M)
    sub_l = quebrar(d, sub, f("avenir", "medium", 32), W - 2 * M) if sub else []
    alt_txt = len(linhas) * int(tam * 1.1) + (len(sub_l) * 42 + 24 if sub_l else 0) + 70
    y = y_f - 28 - alt_txt
    pill(d, M, y, pilula, f("avenir", "heavy", 24), BRANCO, INK, pad=24, alt=52)
    y += 52 + 26
    for l in linhas:
        d.text((M, y), l, font=f("bodoni", "bold", tam), fill=BRANCO)
        y += int(tam * 1.1)
    y += 14
    for l in sub_l:
        d.text((M, y), l, font=f("avenir", "medium", 32), fill=(225, 232, 228))
        y += 42
    gap = 22
    w = (W - 2 * M - gap * (nfact - 1)) // nfact
    for i, (v, rot) in enumerate(factos):
        x = M + i * (w + gap)
        card = Image.new("RGBA", (w, for_h), (255, 255, 255, 36))
        im.paste(card, (x, y_f), card)
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((x, y_f, x + w, y_f + for_h), radius=24, outline=(255, 255, 255, 70), width=2)
        tam_v = 54
        while d.textlength(v, font=f("avenir", "heavy", tam_v)) > w - 40 and tam_v > 28:
            tam_v -= 2
        d.text((x + 22, y_f + 20), v, font=f("avenir", "heavy", tam_v), fill=acento)
        yy = y_f + 20 + tam_v + 14
        for l in quebrar(d, rot, f("avenir", "medium", 24), w - 40)[:3]:
            d.text((x + 22, yy), l, font=f("avenir", "medium", 24), fill=(235, 240, 237))
            yy += 30
    d.text((M, H - 110), link, font=f("avenir", "heavy", 44), fill=BRANCO)
    d.text((M, H - 52), credito, font=f("avenir", "regular", 20), fill=(190, 200, 195))
    im.save(destino / nome)


# ---------- Dados: azul-ardósia, gráfico em destaque ----------
def cabecalho_dados(d, im, pilula):
    logo(im, M, 60, cor_texto=BRANCO, cor_sub=SKY)
    larg = int(d.textlength(pilula, font=f("avenir", "heavy", 24))) + 52
    pill(d, W - M - larg, 62, pilula, f("avenir", "heavy", 24), SKY, NAVY, pad=26, alt=56)


def titulo_dados(d, y, t, tam=80):
    for l in quebrar(d, t, f("bodoni", "bold", tam), W - 2 * M):
        d.text((M, y), l, font=f("bodoni", "bold", tam), fill=BRANCO)
        y += int(tam * 1.1)
    return y + 12


def rodape_dados(d, link, fonte):
    d.text((M, H - 104), link, font=f("avenir", "heavy", 44), fill=BRANCO)
    d.text((M, H - 48), fonte, font=f("avenir", "regular", 20), fill=MUDO)


def dados_barras(destino, nome, pilula, titulo, linhas, fonte, link, sub=None, nota=None, fmt=gerar.num, tam=80, hero=None):
    im, d = fundo(NAVY)
    cabecalho_dados(d, im, pilula)
    y = titulo_dados(d, 180, titulo, tam)
    if sub:
        for l in quebrar(d, sub, f("avenir", "medium", 32), W - 2 * M):
            d.text((M, y), l, font=f("avenir", "medium", 32), fill=MUDO)
            y += 42
        y += 8
    y += 14
    disponivel = H - 150 - y - (190 if nota else 40)
    linha_h = max(118, min(200, disponivel // max(len(linhas), 1)))
    espessura = 40 if linha_h < 150 else 56
    d.rounded_rectangle((M - 20, y, W - M + 20, y + 60 + len(linhas) * linha_h), radius=30, fill=CARD)
    y += 38
    mx = max(v for _, v, _ in linhas)
    for rot, v, cor in linhas:
        y0 = y
        ls = quebrar(d, rot, f("avenir", "demi", 28), W - 2 * M - 60)
        for l in ls:
            d.text((M + 10, y), l, font=f("avenir", "demi", 28), fill=BRANCO)
            y += 34
        largura = max(16, int((W - 2 * M - 20) * v / mx))
        d.rounded_rectangle((M + 10, y + 4, W - M - 10, y + 4 + espessura), radius=14, fill=(34, 64, 88))
        d.rounded_rectangle((M + 10, y + 4, M + 10 + largura, y + 4 + espessura), radius=14, fill=cor)
        et = fmt(v)
        fe = f("avenir", "heavy", 28)
        wt = d.textlength(et, font=fe)
        ty = y + 4 + (espessura - 28) // 2 - 2
        if largura > wt + 36:
            d.text((M + 10 + largura - wt - 14, ty), et, font=fe, fill=NAVY)
        else:
            d.text((M + 10 + largura + 12, ty), et, font=fe, fill=BRANCO)
        y = y0 + linha_h
    y += 30
    if nota:
        for l in quebrar(d, nota, f("avenir", "medium", 30), W - 2 * M):
            d.text((M, y), l, font=f("avenir", "medium", 30), fill=(220, 230, 238))
            y += 40
    rodape_dados(d, link, fonte)
    im.save(destino / nome)


def dados_empilhadas(destino, nome, pilula, titulo, linhas, fonte, link, nota=None, tam=72):
    im, d = fundo(NAVY)
    cabecalho_dados(d, im, pilula)
    y = titulo_dados(d, 180, titulo, tam) + 10
    cores = {"c": MINT, "d": CORAL, "o": (120, 140, 156)}
    d.rounded_rectangle((M - 20, y, W - M + 20, y + 40 + len(linhas) * 188 + 40), radius=30, fill=CARD)
    y += 30
    for rot, total, partes, txt in linhas:
        d.text((M + 10, y), rot, font=f("avenir", "heavy", 30), fill=BRANCO)
        tw = d.textlength(total, font=f("avenir", "medium", 26))
        d.text((W - M - 10 - tw, y + 3), total, font=f("avenir", "medium", 26), fill=MUDO)
        y += 46
        soma = sum(p[1] for p in partes)
        x = M + 10
        usado = W - 2 * M - 20
        for k, v, et in partes:
            w = max(8, int(usado * v / soma))
            d.rectangle((x, y, x + w, y + 50), fill=cores[k])
            if et and w > 90:
                d.text((x + w / 2, y + 25), et, font=f("avenir", "heavy", 25), fill=NAVY, anchor="mm")
            x += w + 2
        y += 50 + 10
        for l in quebrar(d, txt, f("avenir", "regular", 24), W - 2 * M - 40)[:2]:
            d.text((M + 10, y), l, font=f("avenir", "regular", 24), fill=MUDO)
            y += 30
        y += 22
    x = M + 10
    for k, et in (("c", "Concordância"), ("d", "Discordância"), ("o", "Outras")):
        d.rectangle((x, y, x + 20, y + 20), fill=cores[k])
        d.text((x + 30, y - 4), et, font=f("avenir", "regular", 24), fill=MUDO)
        x += 40 + int(d.textlength(et, font=f("avenir", "regular", 24))) + 24
    y += 66
    if nota:
        for l in quebrar(d, nota, f("avenir", "medium", 30), W - 2 * M):
            d.text((M, y), l, font=f("avenir", "medium", 30), fill=(220, 230, 238))
            y += 40
    rodape_dados(d, link, fonte)
    im.save(destino / nome)


def dados_lista(destino, nome, pilula, titulo, itens, fonte, link, tam=72, corpo=36):
    im, d = fundo(NAVY)
    cabecalho_dados(d, im, pilula)
    y = titulo_dados(d, 180, titulo, tam) + 40
    for i, (cab, txt) in enumerate(itens, 1):
        d.rounded_rectangle((M - 20, y, W - M + 20, y + 40), radius=1, fill=NAVY)
        d.ellipse((M, y + 4, M + 66, y + 70), fill=SKY)
        d.text((M + 33, y + 37), str(i), font=f("avenir", "heavy", 34), fill=NAVY, anchor="mm")
        x = M + 96
        yy = y
        d.text((x, yy), cab, font=f("avenir", "heavy", corpo + 4), fill=BRANCO)
        yy += corpo + 18
        for l in quebrar(d, txt, f("avenir", "medium", corpo), W - x - M):
            d.text((x, yy), l, font=f("avenir", "medium", corpo), fill=(190, 206, 218))
            yy += int(corpo * 1.3)
        y = yy + 52
    rodape_dados(d, link, fonte)
    im.save(destino / nome)


def dados_mapa(destino, nome, pilula, titulo, fonte, link):
    geo = gerar.dados("participa-geo.json")
    z = gerar.dados("zaer_critico.json")["consultas_participa"]
    atuais = [r for k in ("abertas", "em_analise") for r in z[k] if not r.get("alerta_qualidade")]
    por = {}
    for r in atuais:
        for m in r.get("municipios") or []:
            o = por.setdefault(gerar.norm(m), {"nome": m, "n": 0, "abertas": 0})
            o["n"] += 1
            o["abertas"] += 1 if r["estado_consulta"] == "Aberta" else 0
    im, d = fundo(NAVY)
    cabecalho_dados(d, im, pilula)
    y = titulo_dados(d, 180, titulo.format(n=len(por)), 70)
    top_y = y + 20
    alto = H - 150 - top_y
    esc = min(alto / geo["altura"], 440 / geo["largura"])

    def p(q):
        return (M + q[0] * esc, top_y + q[1] * esc)

    d.polygon([p(q) for q in geo["contorno"]], fill=CARD, outline=LINE)
    for k, o in por.items():
        q = geo["concelhos"].get(k)
        if not q:
            continue
        cx, cy = p(q)
        cor = MINT if o["abertas"] else SAND
        r = 7 + o["n"] * 4
        halo = Image.new("RGBA", (int(r * 5), int(r * 5)), (0, 0, 0, 0))
        ImageDraw.Draw(halo).ellipse((0, 0, r * 5 - 1, r * 5 - 1), fill=cor + (60,))
        im.paste(halo, (int(cx - r * 2.5), int(cy - r * 2.5)), halo)
        d = ImageDraw.Draw(im)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=cor, outline=BRANCO, width=2)
    d = ImageDraw.Draw(im)
    x0 = M + 440 + 50
    d.text((x0, top_y), "Concelhos mais visados", font=f("avenir", "heavy", 30), fill=BRANCO)
    yy = top_y + 64
    top = sorted(por.values(), key=lambda o: (-o["n"], o["nome"]))[:6]
    mx = max(o["n"] for o in top)
    for o in top:
        d.text((x0, yy), o["nome"], font=f("avenir", "medium", 28), fill=BRANCO)
        yy += 40
        w = int((W - M - x0 - 40) * o["n"] / mx)
        d.rounded_rectangle((x0, yy, x0 + w, yy + 26), radius=9, fill=MINT if o["abertas"] else SAND)
        d.text((x0 + w + 14, yy - 3), f"{o['n']}", font=f("avenir", "heavy", 28), fill=BRANCO)
        yy += 56
    yy += 10
    for cor, et in ((MINT, "Com consulta aberta"), (SAND, "Só em análise")):
        d.ellipse((x0, yy + 4, x0 + 22, yy + 26), fill=cor)
        d.text((x0 + 36, yy), et, font=f("avenir", "regular", 26), fill=MUDO)
        yy += 42
    rodape_dados(d, link, fonte)
    im.save(destino / nome)


# ---------- Catálogo e ferramentas: terra e vinho ----------
def catalogo(destino, nome, pilula, titulo, itens, link, fonte=""):
    VINHO, TERRA, AREIA = (125, 51, 80), (200, 120, 70), (247, 238, 226)
    im, d = fundo(AREIA)
    logo(im, M, 60, cor_texto=INK, cor_sub=TERRA)
    pill(d, W - M - 330, 62, pilula, f("avenir", "heavy", 24), VINHO, BRANCO, pad=26, alt=56)
    y = 190
    for l in quebrar(d, titulo, f("bodoni", "bold", 84), W - 2 * M):
        d.text((M, y), l, font=f("bodoni", "bold", 84), fill=INK)
        y += 94
    y += 24
    gap = 24
    w = (W - 2 * M - gap) // 2
    h = 380
    for i, (num, nom, desc) in enumerate(itens[:4]):
        x = M + (i % 2) * (w + gap)
        yy = y + (i // 2) * (h + gap)
        d.rounded_rectangle((x, yy, x + w, yy + h), radius=30, fill=BRANCO)
        d.text((x + 30, yy + 14), num, font=f("cond", "heavy", 140), fill=VINHO if i % 2 == 0 else TERRA)
        d.text((x + 30, yy + 180), nom, font=f("bodoni", "bold", 42), fill=INK)
        for j, l in enumerate(quebrar(d, desc, f("avenir", "medium", 28), w - 60)[:3]):
            d.text((x + 30, yy + 246 + j * 36), l, font=f("avenir", "medium", 28), fill=(80, 90, 84))
    d.text((M, H - 104), link, font=f("avenir", "heavy", 44), fill=INK)
    if fonte:
        d.text((M, H - 48), fonte, font=f("avenir", "regular", 20), fill=(120, 128, 122))
    im.save(destino / nome)


def main(destino):
    destino.mkdir(parents=True, exist_ok=True)
    z = gerar.dados("zaer_critico.json")
    ps = z["pszaer"]
    rf = ps["consulta_publica"]["relatorio_final"]
    sol = ps["areas_mapeadas"]["solar"]["proposta_menos_10km_subestacao"]
    eol = ps["areas_mapeadas"]["eolica_terrestre"]["proposta_poligonos_maiores_20ha"]
    fa = z["consultas_participa"]["factos_participacao"]
    fotos = gerar.dados("fotos-capitulos.json")["inicio"]

    def cred(k, curta):
        e = fotos[k]
        return e["ficheiro"], f"{curta} Foto: {e['autor']} · {e['licenca']} · Wikimedia Commons"

    # 01 · PSZAER
    em_foco(destino, "01-pszaer-1.png", "PSZAER · PROGRAMA NACIONAL", "Onde o Estado propõe acelerar as renováveis.",
            "Solar e eólica em terra. Proposta de maio de 2026.",
            [(f"{gerar.num(sol['area_ha'])} ha", f"de solar, em {sol['poligonos']} polígonos"), (f"{gerar.num(eol['area_ha'])} ha", f"de eólica, em {eol['poligonos']} polígonos"), (gerar.num(rf["participacoes"]), "participações na consulta")],
            "renovaveis/zaer-norte-lisboa.webp", "Foto: pedrik · CC BY 2.0 · Wikimedia Commons", "bioculture.pt/pszaer", (0.5, 0.35), tam=86)
    tip = rf["tipologia_pct"]
    dados_barras(destino, "01-pszaer-2.png", "O QUE DISSERAM AS PARTICIPAÇÕES", f"{gerar.num(rf['participacoes'])} participações, 94% de discordância.",
                 [("Discordância", tip["discordancia"], CORAL), ("Reclamação", tip["reclamacao"], SAND), ("Sugestão", tip["sugestao"], SKY), ("Concordância", tip["concordancia"], MINT), ("Comentário geral", tip["geral"], (150, 172, 190))],
                 "Fonte: Relatório de Envolvimento e Consulta Pública do PSZAER", "bioculture.pt/pszaer", fmt=lambda v: f"{v}%",
                 nota=f"{str(rf['modelo_pct']).replace('.', ',')}% eram participações-modelo, com o texto repetido. A Guarda foi o concelho mais mencionado: {rf['concelho_mais_mencionado']['mencoes']} menções.", tam=72)
    dados_barras(destino, "01-pszaer-3.png", "DE QUE FALARAM", "Biodiversidade e solos, à cabeça.",
                 [(x["pt"], x["n"], SKY) for x in rf["temas"][:5]],
                 "Fonte: Relatório de Envolvimento e Consulta Pública do PSZAER", "bioculture.pt/pszaer", nota="Cada participação pode tratar vários temas, por isso as barras não somam o total.", tam=76)
    dados_lista(destino, "01-pszaer-4.png", "COMO LER ESTES NÚMEROS", "Uma mancha no mapa não é um projeto.",
                [("Não se somam.", "As áreas solar e eólica podem sobrepor-se; nunca devem ser somadas como ocupação total."),
                 ("É potencial.", "As manchas indicam potencial após critérios nacionais; o desenho final depende do projeto e do licenciamento."),
                 ("A rede pesa.", "A ligação à rede pode exigir linhas e subestações fora da mancha, com impactos próprios.")],
                "Fonte: PSZAER, proposta de maio de 2026", "bioculture.pt/pszaer", tam=68)

    # 02 · mediana
    dados_barras(destino, "02-participacoes.png", "PARTICIPA.PT · 2026", "8 151 participações é muito?",
                 [("Mediana dos projetos de 2026", fa["participacoes_mediana"], MINT), ("Média dos projetos", fa["participacoes_media"], SAND), ("Central solar de Sophia", fa["participacoes_maxima"], CORAL)],
                 "Fonte: consultas de projetos de renováveis, 2026 · Participa.pt", "bioculture.pt/consultas",
                 sub="A Sophia teve cerca de 55 vezes mais do que o caso típico.",
                 nota=f"Sozinha pesa {round(fa['participacoes_maxima'] / fa['participacoes_total'] * 100)}% das participações dos projetos de 2026. Sem ela, a média desce de {fa['participacoes_media']} para {fa['participacoes_media_sem_maxima']}: a mediana descreve melhor o caso típico.", tam=80)

    # 03 · concordam
    dados_empilhadas(destino, "03-concordam.png", "RELATÓRIOS DA APA", "Quem concorda e quem discorda?",
                     [("Programa Setorial das ZAER", "8 381 participações", [("c", 1, ""), ("d", 94, "94%"), ("o", 5, "")], "Reclamação 3%, sugestão 1%, comentário geral 1%."),
                      ("Parque Eólico do Paiva", "590", [("c", 25, ""), ("d", 549, "cerca de 93%"), ("o", 16, "")], "25 concordam: emprego, contrapartidas e acessos."),
                      ("Central solar Planalto Branco", "69", [("d", 62, "62"), ("o", 7, "7")], "Cinco sugestões e dois comentários gerais. Nenhuma concordância."),
                      ("Alcoutim, 1.ª consulta (eólico)", "13", [("c", 2, "2"), ("d", 9, "9"), ("o", 2, "2")], "Uma geral e uma sugestão.")],
                     "Fonte: relatórios de consulta pública da APA e do PSZAER", "bioculture.pt/consultas", nota="Não são todas contra, e a divisão só se conhece quando a APA publica o relatório.", tam=70)

    # 05 · mapa
    dados_mapa(destino, "05-mapa.png", "ONDE ESTÃO AS CONSULTAS", "{n} concelhos com consultas de renováveis.", "Fonte: Participa.pt · pontos indicativos por concelho", "bioculture.pt/consultas")

    # 06 · território
    dados_lista(destino, "06-territorio.png", "PARECERES DA APA", "Por trás de cada mancha há árvores, aves e lobos.",
                [("Sophia (projeto inicial)", "1 541 sobreiros e azinheiras a cortar ou arrancar e 24 aves ameaçadas, entre elas a águia-imperial-ibérica."),
                 ("Alcoutim", "Indícios de 13 territórios de águia-de-Bonelli e de 1 a 2 de águia-imperial-ibérica num raio de 10 km."),
                 ("Paiva", "Impactes muito significativos no lobo-ibérico, dentro da área da alcateia da Lapa.")],
                "Fonte: pareceres das Comissões de Avaliação (APA)", "bioculture.pt/consultas", tam=66, corpo=36)

    # 07-09 · Em foco
    f1, c1 = cred("foco-finlandia", "Corte raso no sul da Finlândia (ilustrativa; não é um dos locais da Google).")
    em_foco(destino, "07-finlandia.png", "CENTROS DE DADOS · FINLÂNDIA", "A floresta cortada antes de avaliar.",
            "A autoridade finlandesa mandou parar as obras de dois centros de dados da Google até a avaliação de impacte estar concluída.",
            [("530 ha", "de floresta abatida, segundo a Google"), ("400 mil", "árvores (estimativa do Guardian)"), ("130 ha", "a replantar em Muhos")], f1, c1, "bioculture.pt/finlandia", (0.5, 0.5), tam=84, acento=SAND)
    f2, c2 = cred("foco-mongolia", "Estepe junto ao maciço Baga Gazaryn Chuluu, na Mongólia.")
    em_foco(destino, "08-mongolia.png", "SOLO · COP17", "O que a Mongólia revela sobre solo, clima e alimento.",
            "A crise não cabe num único número: aquecimento, aridez, pressão sobre as pastagens e o dzud de 2023–2024.",
            [("76,9%", "do território afetado por degradação"), ("+2,25 °C", "temperatura média anual em 80 anos"), ("8,1 M", "animais perdidos no dzud")], f2, c2, "bioculture.pt/mongolia", (0.5, 0.5), tam=78, acento=SAND)
    f3, c3 = cred("foco-barroso", "Capela de Santa Maria, em Covas do Barroso (Boticas).")
    em_foco(destino, "09-barroso.png", "LÍTIO · BOTICAS", "Mina do Barroso: ainda não há extração.",
            "A declaração de impacte ambiental favorável condicionada é de maio de 2023. Covas do Barroso integra o sistema agrícola do Barroso reconhecido pela FAO.",
            [("5,4 km²", "de área do projeto"), ("T4 2026", "pedido de licença (promotor)"), ("fev. 2027", "decisão prevista do regulador")], f3, c3, "bioculture.pt/barroso", (0.5, 0.4), tam=78, acento=SAND)

    # 10 · destaques
    em_foco(destino, "10-destaques-1.png", "DESTAQUE · PRESSÕES HUMANAS", "Um parque solar, 568 hectares de floresta.",
            "Em Santarém e Cartaxo, 189 MWp de potência instalada custaram mais de 200 sobreiros abatidos.",
            [("189 MWp", "de potência instalada"), ("568 ha", "de floresta"), ("200+", "sobreiros abatidos")], "destaques/solar-parque.webp",
            "Foto: Bextrel · CC BY-SA 4.0 (parque solar no Algarve, ilustrativa) · Wikimedia Commons", "bioculture.pt/sobreiros", (0.5, 0.5), tam=80)
    em_foco(destino, "10-destaques-2.png", "DESTAQUE · OBSERVATÓRIO GLOBAL", "Mesmo no cenário mais otimista, 1,8 °C.",
            "Ultrapassar 1,5 °C não torna todos os futuros iguais: cada fração de grau e cada ano acima do limite aumentam o risco.",
            [("1,8 °C", "no cenário mais otimista"), ("1,5 °C", "o limite do Acordo de Paris")], "destaques/clima-degelo.webp",
            "Foto: NASA · domínio público · Wikimedia Commons", "bioculture.pt/clima", (0.5, 0.5), tam=84)
    em_foco(destino, "10-destaques-3.png", "DESTAQUE · VETORES DE PRESSÃO", "Aviação: o peso de cada viagem.",
            "Escolhe uma rota ou dois aeroportos e vê o que um voo gasta e afeta: CO2, combustível, óxidos de azoto e ruído.",
            [("CO2", "emissões da rota"), ("NOx", "óxidos de azoto"), ("Ruído", "à volta dos aeroportos")], "aviacao/miniatura.webp",
            "Foto: NASA Earth Observatory · domínio público · Wikimedia Commons", "bioculture.pt/aviacao", (0.5, 0.5), tam=84)

    # 13 · ferramentas
    pl = gerar.dados("planeador-horta.json")
    gl = gerar.dados("glossario.json")
    n_gl = len(gl if isinstance(gl, list) else gl.get("termos", gl))
    ap = gerar.dados("apoios.json").get("apoios", [])
    catalogo(destino, "13-mais.png", "FERRAMENTAS", "Ferramentas para decidir com fontes.",
             [(str(len(pl["culturas"])), "Planeador de horta", "Épocas e rotação de 3 e 4 anos, segundo o RHS."),
              (str(n_gl), "Glossário", "Termos de ambiente, solo e energia em português claro."),
              (str(len(ap)), "Apoios agrícolas", "Apoios do IFAP no PEPAC, com ligação às regras oficiais."),
              ("8", "Sementes de conservação", "Variedades do Catálogo Nacional de 2026, com a região de origem.")],
             "bioculture.pt", "")
    print("ok", destino)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
